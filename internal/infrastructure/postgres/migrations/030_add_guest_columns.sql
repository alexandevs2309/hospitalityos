-- 030: Add missing columns to guests table
-- Fixes guestprofile_handler, report_handler runtime errors

ALTER TABLE guests ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_type VARCHAR(50) DEFAULT '';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_number VARCHAR(100) DEFAULT '';
