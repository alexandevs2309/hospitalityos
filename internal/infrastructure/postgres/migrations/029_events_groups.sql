CREATE TABLE IF NOT EXISTS group_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id),
    name VARCHAR(200) NOT NULL,
    event_type VARCHAR(50) NOT NULL DEFAULT 'conference',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    guest_count INT NOT NULL DEFAULT 0,
    room_type_ids TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id),
    room_id VARCHAR(255) NOT NULL,
    blocked_date DATE NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, room_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_group_events_tenant ON group_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_events_dates ON group_events(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_room_blocked_tenant ON room_blocked_dates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_room_blocked_room ON room_blocked_dates(room_id, blocked_date);

ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY group_events_tenant ON group_events USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY room_blocked_tenant ON room_blocked_dates USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY group_events_svc ON group_events USING (current_setting('app.current_tenant', true) IS NOT NULL);
CREATE POLICY room_blocked_svc ON room_blocked_dates USING (current_setting('app.current_tenant', true) IS NOT NULL);
