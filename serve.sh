#!/bin/bash
# HospitalityOS — Service Manager
# Auto-restarts backend and frontend if they crash
# Usage: ./serve.sh          (foreground)
#        ./serve.sh start    (background)
#        ./serve.sh stop     (kill all)
#        ./serve.sh status   (check status)

export PATH="/home/alexander/go/bin:/home/alexander/.nvm/versions/node/v22.22.2/bin:$PATH"
PROJECT_DIR="/home/alexander/Escritorio/hospitalityos"
BACKEND_PORT=8081
FRONTEND_PORT=3001
PIDFILE_BACKEND="/tmp/hospitality-backend.pid"
PIDFILE_FRONTEND="/tmp/hospitality-frontend.pid"
LOG_BACKEND="/tmp/hospitality-backend.log"
LOG_FRONTEND="/tmp/hospitality-frontend.log"

export DATABASE_URL="postgres://postgres:4CFqpDSBrAfOtZbNsRUi1EgF1@localhost:5432/hospitality?sslmode=disable"
export JWT_SECRET="hospitality-dev-secret-key-2026"
export SEED_SECRET="dev-seed"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }

BINARY="/tmp/hospitality-api-serve"

start_backend() {
    log "${YELLOW}Starting backend on :${BACKEND_PORT}...${NC}"
    cd "$PROJECT_DIR"
    if [ ! -f "$BINARY" ] || [ ! -x "$BINARY" ]; then
        log "${YELLOW}Building backend binary...${NC}"
        go build -o "$BINARY" ./cmd/api/ 2>&1
    fi
    nohup "$BINARY" > "$LOG_BACKEND" 2>&1 &
    echo $! > "$PIDFILE_BACKEND"
    log "Backend PID: $(cat $PIDFILE_BACKEND)"
}

start_frontend() {
    log "${YELLOW}Starting frontend on :${FRONTEND_PORT}...${NC}"
    cd "$PROJECT_DIR/web"
    nohup npx next dev -p $FRONTEND_PORT > "$LOG_FRONTEND" 2>&1 &
    echo $! > "$PIDFILE_FRONTEND"
    log "Frontend PID: $(cat $PIDFILE_FRONTEND)"
}

is_running() {
    local pidfile=$1
    local port=$2
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null && ss -tlnp | grep -q ":${port}"; then
            return 0
        fi
    fi
    return 1
}

stop_all() {
    log "${RED}Stopping services...${NC}"
    [ -f "$PIDFILE_BACKEND" ] && kill $(cat "$PIDFILE_BACKEND") 2>/dev/null
    [ -f "$PIDFILE_FRONTEND" ] && kill $(cat "$PIDFILE_FRONTEND") 2>/dev/null
    kill $(lsof -t -i:$BACKEND_PORT) 2>/dev/null
    kill $(lsof -t -i:$FRONTEND_PORT) 2>/dev/null
    rm -f "$PIDFILE_BACKEND" "$PIDFILE_FRONTEND"
    log "Stopped."
}

status() {
    echo ""
    echo "  Backend  :8081  $(is_running "$PIDFILE_BACKEND" $BACKEND_PORT && echo -e "${GREEN}RUNNING${NC}" || echo -e "${RED}DOWN${NC}")"
    echo "  Frontend :3001  $(is_running "$PIDFILE_FRONTEND" $FRONTEND_PORT && echo -e "${GREEN}RUNNING${NC}" || echo -e "${RED}DOWN${NC}")"
    echo ""
}

case "${1:-run}" in
    start)
        stop_all 2>/dev/null
        sleep 1
        start_backend
        start_frontend
        sleep 8
        status
        ;;
    rebuild)
        log "${YELLOW}Rebuilding backend binary...${NC}"
        rm -f "$BINARY"
        export PATH="/home/alexander/go/bin:$PATH"
        cd "$PROJECT_DIR" && go build -o "$BINARY" ./cmd/api/ 2>&1 && log "${GREEN}Build OK${NC}"
        stop_all 2>/dev/null
        sleep 1
        start_backend
        start_frontend
        sleep 8
        status
        ;;
    stop)
        stop_all
        ;;
    status)
        status
        ;;
    run)
        trap 'stop_all; exit 0' INT TERM
        stop_all 2>/dev/null
        sleep 1
        start_backend
        start_frontend

        log "${GREEN}Services started. Press Ctrl+C to stop.${NC}"
        status

        while true; do
            sleep 15
            if ! is_running "$PIDFILE_BACKEND" $BACKEND_PORT; then
                log "${RED}Backend crashed! Restarting...${NC}"
                start_backend
            fi
            if ! is_running "$PIDFILE_FRONTEND" $FRONTEND_PORT; then
                log "${RED}Frontend crashed! Restarting...${NC}"
                start_frontend
            fi
        done
        ;;
    *)
        echo "Usage: $0 {run|start|rebuild|stop|status}"
        ;;
esac
