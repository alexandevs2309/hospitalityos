CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    user_id         VARCHAR(255) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       VARCHAR(255) NOT NULL DEFAULT '',
    payload         JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    synced_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_tenant ON offline_sync_queue(tenant_id);
CREATE INDEX idx_sync_queue_status ON offline_sync_queue(status);
CREATE INDEX idx_sync_queue_user ON offline_sync_queue(user_id);
