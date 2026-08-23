CREATE TABLE IF NOT EXISTS night_audit_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    run_date        DATE NOT NULL,
    reservations_processed INT NOT NULL DEFAULT 0,
    charges_posted  BIGINT NOT NULL DEFAULT 0,
    total_revenue   BIGINT NOT NULL DEFAULT 0,
    status          VARCHAR(50) NOT NULL DEFAULT 'completed',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    metadata        JSONB,
    created_by      VARCHAR(255) NOT NULL DEFAULT 'system'
);

CREATE INDEX idx_night_audit_tenant ON night_audit_runs(tenant_id);
CREATE INDEX idx_night_audit_date ON night_audit_runs(run_date);
CREATE UNIQUE INDEX idx_night_audit_tenant_date ON night_audit_runs(tenant_id, run_date);
