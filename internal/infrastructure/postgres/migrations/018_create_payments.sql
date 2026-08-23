CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    reservation_id  VARCHAR(255) NOT NULL,
    guest_id        VARCHAR(255) NOT NULL DEFAULT '',
    method          VARCHAR(50) NOT NULL,
    amount_cents    BIGINT NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'DOP',
    reference       VARCHAR(255) NOT NULL DEFAULT '',
    status          VARCHAR(50) NOT NULL DEFAULT 'completed',
    notes           TEXT NOT NULL DEFAULT '',
    created_by      VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_created ON payments(created_at);
