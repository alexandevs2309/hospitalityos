CREATE TABLE IF NOT EXISTS pos_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS pos_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id),
    category_id UUID NOT NULL REFERENCES pos_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price_cents BIGINT NOT NULL DEFAULT 0,
    cost_cents BIGINT NOT NULL DEFAULT 0,
    sku VARCHAR(50),
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS pos_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id),
    reservation_id VARCHAR(255) REFERENCES reservations(id),
    room_number VARCHAR(20),
    guest_name VARCHAR(200),
    order_type VARCHAR(20) NOT NULL DEFAULT 'dine_in',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    subtotal_cents BIGINT NOT NULL DEFAULT 0,
    tax_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'DOP',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id),
    order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES pos_items(id),
    item_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_orders_tenant ON pos_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_reservation ON pos_orders(reservation_id);
CREATE INDEX IF NOT EXISTS idx_pos_items_tenant ON pos_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_items_category ON pos_items(category_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_order ON pos_order_items(order_id);

ALTER TABLE pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pos_categories_tenant ON pos_categories USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY pos_items_tenant ON pos_items USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY pos_orders_tenant ON pos_orders USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY pos_order_items_tenant ON pos_order_items USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY pos_categories_svc ON pos_categories USING (current_setting('app.current_tenant', true) IS NOT NULL);
CREATE POLICY pos_items_svc ON pos_items USING (current_setting('app.current_tenant', true) IS NOT NULL);
CREATE POLICY pos_orders_svc ON pos_orders USING (current_setting('app.current_tenant', true) IS NOT NULL);
CREATE POLICY pos_order_items_svc ON pos_order_items USING (current_setting('app.current_tenant', true) IS NOT NULL);
