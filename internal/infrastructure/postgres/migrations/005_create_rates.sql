CREATE TABLE rates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rates_tenant ON rates(tenant_id);
CREATE INDEX idx_rates_dates ON rates(tenant_id, start_date, end_date);
