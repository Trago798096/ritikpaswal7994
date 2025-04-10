-- Database Optimizations for BookMyShow

-- Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON public.bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_event_id ON public.seat_locks(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expires_at ON public.seat_locks(expires_at);

-- Add missing constraints
ALTER TABLE public.events
ADD CONSTRAINT check_event_date CHECK (date > NOW());

ALTER TABLE public.seat_categories
ADD CONSTRAINT check_seat_price CHECK (price >= 0);

ALTER TABLE public.bookings
ADD CONSTRAINT check_booking_amount CHECK (amount >= 0);

-- Add missing columns
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS max_tickets_per_user INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Optimize RLS policies
DROP POLICY IF EXISTS "Allow anyone to view active events" ON public.events;
CREATE POLICY "Allow anyone to view active events"
ON public.events FOR SELECT
USING (
  status IN ('active', 'upcoming')
  AND date > NOW()
);

-- Add storage policies
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to view their own avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create function to automatically update last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_login
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_login();

-- Add function to check seat availability
CREATE OR REPLACE FUNCTION check_seat_availability(
  p_event_id UUID,
  p_seat_numbers TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_available BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1
    FROM seat_locks sl
    WHERE sl.event_id = p_event_id
    AND sl.seat_number = ANY(p_seat_numbers)
    AND sl.expires_at > NOW()
  ) INTO v_available;
  
  RETURN v_available;
END;
$$ LANGUAGE plpgsql;

-- Add function to get event statistics
CREATE OR REPLACE FUNCTION get_event_statistics(p_event_id UUID)
RETURNS TABLE (
  total_seats INTEGER,
  booked_seats INTEGER,
  available_seats INTEGER,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT sl.seat_number) as total_seats,
    COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN sl.seat_number END) as booked_seats,
    COUNT(DISTINCT CASE WHEN b.id IS NULL AND sl.expires_at > NOW() THEN sl.seat_number END) as available_seats,
    COALESCE(SUM(b.amount), 0) as revenue
  FROM seat_layouts sl
  LEFT JOIN bookings b ON b.event_id = sl.event_id AND b.seat_numbers && ARRAY[sl.seat_number]
  WHERE sl.event_id = p_event_id;
END;
$$ LANGUAGE plpgsql; 