CREATE TABLE IF NOT EXISTS folio_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    reservation_id  VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    description     VARCHAR(500) NOT NULL DEFAULT '',
    amount_cents    BIGINT NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'DOP',
    reference       VARCHAR(255) NOT NULL DEFAULT '',
    metadata        JSONB,
    created_by      VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folio_entries_tenant ON folio_entries(tenant_id);
CREATE INDEX idx_folio_entries_reservation ON folio_entries(reservation_id);
CREATE INDEX idx_folio_entries_type ON folio_entries(type);
CREATE INDEX idx_folio_entries_created ON folio_entries(created_at);
