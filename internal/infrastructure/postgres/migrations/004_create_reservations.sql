CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'canceled', 'checked_in', 'checked_out');

CREATE TABLE reservations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    guest_id TEXT NOT NULL REFERENCES guests(id),
    room_id TEXT NOT NULL REFERENCES rooms(id),
    rate_id TEXT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    adults INT NOT NULL DEFAULT 1,
    children INT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status reservation_status NOT NULL DEFAULT 'confirmed',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX idx_reservations_guest ON reservations(tenant_id, guest_id);
CREATE INDEX idx_reservations_dates ON reservations(tenant_id, check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(tenant_id, status);
