CREATE TABLE IF NOT EXISTS staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    user_id         VARCHAR(255) NOT NULL DEFAULT '',
    first_name      VARCHAR(255) NOT NULL,
    last_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL DEFAULT '',
    phone           VARCHAR(50) NOT NULL DEFAULT '',
    role            VARCHAR(50) NOT NULL DEFAULT 'front_desk',
    department      VARCHAR(100) NOT NULL DEFAULT '',
    shift           VARCHAR(50) NOT NULL DEFAULT '',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    pin_hash        VARCHAR(255) NOT NULL DEFAULT '',
    hire_date       DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_tenant ON staff(tenant_id);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_active ON staff(active);
CREATE INDEX idx_staff_user ON staff(user_id);
