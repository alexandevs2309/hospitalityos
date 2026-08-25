CREATE TABLE IF NOT EXISTS guest_portal_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    reservation_id  TEXT NOT NULL,
    guest_id        TEXT NOT NULL,
    token           VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gpt_tenant ON guest_portal_tokens(tenant_id);
CREATE INDEX idx_gpt_token ON guest_portal_tokens(token);
CREATE INDEX idx_gpt_reservation ON guest_portal_tokens(reservation_id);

ALTER TABLE guest_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_guest_portal_tokens ON guest_portal_tokens
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE TABLE IF NOT EXISTS guest_service_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    reservation_id  TEXT NOT NULL,
    guest_id        TEXT NOT NULL,
    request_type    VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gsr_tenant ON guest_service_requests(tenant_id);
CREATE INDEX idx_gsr_reservation ON guest_service_requests(reservation_id);
CREATE INDEX idx_gsr_status ON guest_service_requests(status);

ALTER TABLE guest_service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_guest_service_requests ON guest_service_requests
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE TABLE IF NOT EXISTS guest_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    reservation_id  TEXT NOT NULL,
    guest_id        TEXT NOT NULL,
    rating          SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category        VARCHAR(50) NOT NULL DEFAULT 'overall',
    comment         TEXT NOT NULL DEFAULT '',
    response        TEXT,
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gr_tenant ON guest_reviews(tenant_id);
CREATE INDEX idx_gr_reservation ON guest_reviews(reservation_id);

ALTER TABLE guest_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_guest_reviews ON guest_reviews
    USING (tenant_id = current_setting('app.current_tenant', true));
