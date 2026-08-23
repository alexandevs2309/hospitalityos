CREATE TABLE IF NOT EXISTS channel_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    channel_name    VARCHAR(100) NOT NULL,
    api_key         VARCHAR(500) NOT NULL DEFAULT '',
    api_secret      VARCHAR(500) NOT NULL DEFAULT '',
    property_id     VARCHAR(255) NOT NULL DEFAULT '',
    sync_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    sync_rates      BOOLEAN NOT NULL DEFAULT TRUE,
    sync_availability BOOLEAN NOT NULL DEFAULT TRUE,
    sync_reservations BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_channel_config_tenant ON channel_config(tenant_id);
CREATE INDEX idx_channel_config_channel ON channel_config(channel_name);
CREATE UNIQUE INDEX idx_channel_config_unique ON channel_config(tenant_id, channel_name);

CREATE TABLE IF NOT EXISTS channel_sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    channel_name    VARCHAR(100) NOT NULL,
    sync_type       VARCHAR(50) NOT NULL,
    direction       VARCHAR(10) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       VARCHAR(255) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message   TEXT NOT NULL DEFAULT '',
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sync_log_tenant ON channel_sync_log(tenant_id);
CREATE INDEX idx_sync_log_channel ON channel_sync_log(channel_name);
CREATE INDEX idx_sync_log_status ON channel_sync_log(status);
