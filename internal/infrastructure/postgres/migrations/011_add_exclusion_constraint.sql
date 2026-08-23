CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations ADD CONSTRAINT exclude_overlapping_reservations
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out, '[]') WITH &&
    ) WHERE (status NOT IN ('canceled', 'checked_out'));
