CREATE TABLE IF NOT EXISTS ncf_sequences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    rnc             VARCHAR(20) NOT NULL,
    ncf_type        VARCHAR(10) NOT NULL,
    prefix          VARCHAR(10) NOT NULL DEFAULT '',
    current_number  INT NOT NULL DEFAULT 1,
    max_number      INT NOT NULL DEFAULT 99999999,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ncf_tenant ON ncf_sequences(tenant_id);
CREATE INDEX idx_ncf_type ON ncf_sequences(ncf_type);
CREATE UNIQUE INDEX idx_ncf_unique ON ncf_sequences(tenant_id, ncf_type);

CREATE TABLE IF NOT EXISTS fiscal_receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    reservation_id  VARCHAR(255) NOT NULL DEFAULT '',
    payment_id      VARCHAR(255) NOT NULL DEFAULT '',
    ncf             VARCHAR(20) NOT NULL,
    ncf_type        VARCHAR(10) NOT NULL,
    rnc             VARCHAR(20) NOT NULL DEFAULT '',
    rnc_name        VARCHAR(255) NOT NULL DEFAULT '',
    subtotal_cents  BIGINT NOT NULL DEFAULT 0,
    itbis_cents     BIGINT NOT NULL DEFAULT 0,
    propina_cents   BIGINT NOT NULL DEFAULT 0,
    total_cents     BIGINT NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'DOP',
    status          VARCHAR(50) NOT NULL DEFAULT 'issued',
    dgii_status     VARCHAR(50) NOT NULL DEFAULT 'pending',
    dgii_track_id   VARCHAR(255) NOT NULL DEFAULT '',
    xml_url         VARCHAR(500) NOT NULL DEFAULT '',
    pdf_url         VARCHAR(500) NOT NULL DEFAULT '',
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fiscal_tenant ON fiscal_receipts(tenant_id);
CREATE INDEX idx_fiscal_ncf ON fiscal_receipts(ncf);
CREATE INDEX idx_fiscal_rnc ON fiscal_receipts(rnc);
CREATE INDEX idx_fiscal_status ON fiscal_receipts(status);
CREATE INDEX idx_fiscal_issued ON fiscal_receipts(issued_at);
