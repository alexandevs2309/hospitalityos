CREATE TABLE room_types (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    amenities JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    room_type_id TEXT NOT NULL REFERENCES room_types(id),
    number VARCHAR(20) NOT NULL,
    floor VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    UNIQUE(tenant_id, number)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rooms_tenant ON rooms(tenant_id);
CREATE INDEX idx_rooms_status ON rooms(tenant_id, status);
