CREATE TABLE IF NOT EXISTS rate_seasons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    room_type_id    VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    amount_cents    BIGINT NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'DOP',
    priority        INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_seasons_tenant ON rate_seasons(tenant_id);
CREATE INDEX idx_rate_seasons_room_type ON rate_seasons(room_type_id);
CREATE INDEX idx_rate_seasons_dates ON rate_seasons(start_date, end_date);
CREATE INDEX idx_rate_seasons_active ON rate_seasons(active);
