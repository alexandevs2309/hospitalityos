#!/bin/bash
# HospitalityOS — Service Manager
# Auto-restarts backend and frontend if they crash
# Usage: ./serve.sh          (foreground with watchdog)
#        ./serve.sh start    (background)
#        ./serve.sh stop     (kill all)
#        ./serve.sh status   (check status)
#        ./serve.sh rebuild  (rebuild backend + restart)

export PATH="/home/alexander/go/bin:/home/alexander/.nvm/versions/node/v22.22.2/bin:$PATH"
PROJECT_DIR="/home/alexander/Escritorio/hospitalityos"
BACKEND_PORT=8081
FRONTEND_PORT=3001
PIDFILE_BACKEND="/tmp/hospitality-backend.pid"
PIDFILE_FRONTEND="/tmp/hospitality-frontend.pid"
LOG_BACKEND="/tmp/hospitality-backend.log"
LOG_FRONTEND="/tmp/hospitality-frontend.log"
BINARY="/tmp/hospitality-api-serve"

export DATABASE_URL="postgres://postgres:4CFqpDSBrAfOtZbNsRUi1EgF1@localhost:5432/hospitality?sslmode=disable"
export JWT_SECRET="hospitality-dev-secret-key-2026"
export SEED_SECRET="dev-seed"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }

kill_port() {
    local port=$1
    local pids=$(lsof -t -i:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
    fi
}

kill_process_tree() {
    local pid=$1
    if [ -n "$pid" ]; then
        pkill -9 -P "$pid" 2>/dev/null
        kill -9 "$pid" 2>/dev/null
    fi
}

start_backend() {
    log "${YELLOW}Starting backend on :${BACKEND_PORT}...${NC}"
    kill_port $BACKEND_PORT
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
    kill_port $FRONTEND_PORT
    cd "$PROJECT_DIR/web"
    nohup ./node_modules/.bin/next dev -p $FRONTEND_PORT > "$LOG_FRONTEND" 2>&1 &
    echo $! > "$PIDFILE_FRONTEND"
    log "Frontend PID: $(cat $PIDFILE_FRONTEND)"
}

is_running() {
    local port=$1
    ss -tlnp | grep -q ":${port}" 2>/dev/null
}

stop_all() {
    log "${RED}Stopping services...${NC}"
    [ -f "$PIDFILE_BACKEND" ] && kill_process_tree $(cat "$PIDFILE_BACKEND")
    [ -f "$PIDFILE_FRONTEND" ] && kill_process_tree $(cat "$PIDFILE_FRONTEND")
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    rm -f "$PIDFILE_BACKEND" "$PIDFILE_FRONTEND"
    log "Stopped."
}

status() {
    echo ""
    echo "  Backend  :8081  $(is_running $BACKEND_PORT && echo -e "${GREEN}RUNNING${NC}" || echo -e "${RED}DOWN${NC}")"
    echo "  Frontend :3001  $(is_running $FRONTEND_PORT && echo -e "${GREEN}RUNNING${NC}" || echo -e "${RED}DOWN${NC}")"
    echo ""
}

case "${1:-run}" in
    start)
        stop_all 2>/dev/null
        sleep 2
        start_backend
        start_frontend
        log "${GREEN}Services starting. Waiting 25s for compilation...${NC}"
        sleep 25
        status
        ;;
    rebuild)
        log "${YELLOW}Rebuilding backend binary...${NC}"
        rm -f "$BINARY"
        cd "$PROJECT_DIR" && go build -o "$BINARY" ./cmd/api/ 2>&1 && log "${GREEN}Build OK${NC}"
        stop_all 2>/dev/null
        sleep 2
        start_backend
        start_frontend
        log "${GREEN}Services starting. Waiting 25s for compilation...${NC}"
        sleep 25
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
        sleep 2
        start_backend
        start_frontend

        log "${GREEN}Services started. Press Ctrl+C to stop.${NC}"
        sleep 20
        status

        while true; do
            sleep 20
            if ! is_running $BACKEND_PORT; then
                log "${RED}Backend crashed! Restarting...${NC}"
                start_backend
            fi
            if ! is_running $FRONTEND_PORT; then
                log "${RED}Frontend crashed! Restarting...${NC}"
                start_frontend
            fi
        done
        ;;
    *)
        echo "Usage: $0 {run|start|rebuild|stop|status}"
        ;;
esac
