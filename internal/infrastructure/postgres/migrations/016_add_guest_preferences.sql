CREATE TABLE IF NOT EXISTS guest_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    guest_id        VARCHAR(255) NOT NULL,
    key             VARCHAR(255) NOT NULL,
    value           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_pref_tenant ON guest_preferences(tenant_id);
CREATE INDEX idx_guest_pref_guest ON guest_preferences(guest_id);
CREATE UNIQUE INDEX idx_guest_pref_key ON guest_preferences(tenant_id, guest_id, key);

CREATE TABLE IF NOT EXISTS guest_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    guest_id        VARCHAR(255) NOT NULL,
    tag             VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_tags_tenant ON guest_tags(tenant_id);
CREATE INDEX idx_guest_tags_guest ON guest_tags(guest_id);
CREATE UNIQUE INDEX idx_guest_tags_unique ON guest_tags(tenant_id, guest_id, tag);
