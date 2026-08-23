CREATE TABLE IF NOT EXISTS maintenance_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    room_id         VARCHAR(255) NOT NULL DEFAULT '',
    room_number     VARCHAR(50) NOT NULL DEFAULT '',
    title           VARCHAR(500) NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    category        VARCHAR(100) NOT NULL DEFAULT 'general',
    priority        VARCHAR(20) NOT NULL DEFAULT 'normal',
    status          VARCHAR(50) NOT NULL DEFAULT 'open',
    reported_by     VARCHAR(255) NOT NULL DEFAULT '',
    assigned_to     VARCHAR(255) NOT NULL DEFAULT '',
    cost_cents      BIGINT NOT NULL DEFAULT 0,
    notes           TEXT NOT NULL DEFAULT '',
    reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_tenant ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_room ON maintenance_requests(room_id);
CREATE INDEX idx_maintenance_priority ON maintenance_requests(priority);
