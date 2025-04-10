-- Create seat_locks table
CREATE TABLE seat_locks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  seat_id TEXT NOT NULL,
  category TEXT NOT NULL,
  lock_expiry TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id),
  
  UNIQUE(event_id, seat_id)
);

-- Create index for performance
CREATE INDEX idx_seat_locks_event_category ON seat_locks(event_id, category);
CREATE INDEX idx_seat_locks_expiry ON seat_locks(lock_expiry);
