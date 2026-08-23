CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    room_id         VARCHAR(255) NOT NULL,
    room_number     VARCHAR(50) NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'cleaning',
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority        VARCHAR(20) NOT NULL DEFAULT 'normal',
    assigned_to     VARCHAR(255) NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hk_tasks_tenant ON housekeeping_tasks(tenant_id);
CREATE INDEX idx_hk_tasks_status ON housekeeping_tasks(status);
CREATE INDEX idx_hk_tasks_room ON housekeeping_tasks(room_id);
CREATE INDEX idx_hk_tasks_assigned ON housekeeping_tasks(assigned_to);
