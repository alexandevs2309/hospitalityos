-- FIX-7: Change reservation date range from inclusive '[]' to half-open '[)'
-- This allows back-to-back bookings (checkout day = next check-in day)
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS exclude_overlapping_reservations;
ALTER TABLE reservations ADD CONSTRAINT exclude_overlapping_reservations
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out, '[)') WITH &&
    ) WHERE (status NOT IN ('canceled', 'checked_out'));

-- FIX-8: Add RLS policies to tables created after migration 010
ALTER TABLE folio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncf_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_folio ON folio_entries
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_night_audit ON night_audit_runs
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_rate_seasons ON rate_seasons
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_guest_preferences ON guest_preferences
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_guest_tags ON guest_tags
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_housekeeping ON housekeeping_tasks
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_payments ON payments
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_staff ON staff
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_maintenance ON maintenance_requests
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_whatsapp ON whatsapp_messages
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_offline ON offline_sync_queue
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_channel_config ON channel_config
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_channel_sync ON channel_sync_log
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_ncf ON ncf_sequences
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_fiscal ON fiscal_receipts
    USING (tenant_id = current_setting('app.current_tenant'));
CREATE POLICY tenant_isolation_audit ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant'));

-- FIX-10: Add CHECK constraints
ALTER TABLE rooms ADD CONSTRAINT chk_rooms_status
    CHECK (status IN ('available', 'occupied', 'out_of_order', 'cleaning', 'inspected', 'maintenance'));
ALTER TABLE payments ADD CONSTRAINT chk_payments_method
    CHECK (method IN ('cash', 'card', 'transfer', 'online', 'deposit'));
ALTER TABLE payments ADD CONSTRAINT chk_payments_status
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
ALTER TABLE folio_entries ADD CONSTRAINT chk_folio_amount_positive
    CHECK (amount_cents > 0);
ALTER TABLE reservations ADD CONSTRAINT chk_reservation_dates
    CHECK (check_out > check_in);
ALTER TABLE reservations ADD CONSTRAINT chk_reservation_adults
    CHECK (adults > 0);

-- Unique constraint for night audit idempotency (folio charges reference)
CREATE UNIQUE INDEX IF NOT EXISTS idx_folio_entries_reference_reservation
    ON folio_entries(reference, reservation_id) WHERE reference != '';

-- Unique constraint on NCF to prevent duplicate issuance at DB level
ALTER TABLE fiscal_receipts ADD CONSTRAINT uq_fiscal_ncf UNIQUE (ncf);
