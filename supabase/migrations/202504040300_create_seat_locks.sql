CREATE TABLE seat_locks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('platinum', 'gold', 'silver', 'general')),
  lock_expiry TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(event_id, seat_id)
);

CREATE INDEX idx_seat_locks_event_seat ON seat_locks(event_id, seat_id);
CREATE INDEX idx_seat_locks_expiry ON seat_locks(lock_expiry);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for seat_locks
CREATE TRIGGER update_seat_locks_modtime 
BEFORE UPDATE ON seat_locks 
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
