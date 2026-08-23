ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_rooms ON rooms
    USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_room_types ON room_types
    USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_reservations ON reservations
    USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_guests ON guests
    USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_rates ON rates
    USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_refresh_tokens ON refresh_tokens
    USING (user_id IN (SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant')));
