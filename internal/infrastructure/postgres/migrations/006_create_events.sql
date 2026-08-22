CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    stream_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stream_id, version)
);

CREATE INDEX idx_events_stream_id ON events(stream_id);
