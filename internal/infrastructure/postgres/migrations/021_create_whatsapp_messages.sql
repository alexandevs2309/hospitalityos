CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    reservation_id  VARCHAR(255) NOT NULL DEFAULT '',
    guest_id        VARCHAR(255) NOT NULL DEFAULT '',
    direction       VARCHAR(10) NOT NULL,
    from_number     VARCHAR(50) NOT NULL,
    to_number       VARCHAR(50) NOT NULL,
    message_type    VARCHAR(50) NOT NULL DEFAULT 'text',
    content         TEXT NOT NULL DEFAULT '',
    media_url       VARCHAR(500) NOT NULL DEFAULT '',
    status          VARCHAR(50) NOT NULL DEFAULT 'sent',
    external_id     VARCHAR(255) NOT NULL DEFAULT '',
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ
);

CREATE INDEX idx_wa_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX idx_wa_messages_reservation ON whatsapp_messages(reservation_id);
CREATE INDEX idx_wa_messages_guest ON whatsapp_messages(guest_id);
CREATE INDEX idx_wa_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_wa_messages_created ON whatsapp_messages(created_at);
CREATE INDEX idx_wa_messages_external ON whatsapp_messages(external_id);
