-- Add notification settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false;

-- Update existing profiles to have default notification settings
UPDATE public.profiles
SET 
  email_notifications = false,
  push_notifications = false,
  sms_notifications = false
WHERE email_notifications IS NULL
  OR push_notifications IS NULL
  OR sms_notifications IS NULL;

-- Add missing columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lock_id UUID,
ADD COLUMN IF NOT EXISTS event_title TEXT,
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_venue TEXT,
ADD COLUMN IF NOT EXISTS event_city TEXT;

-- Create or update the seat_locks table
CREATE TABLE IF NOT EXISTS public.seat_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  seats TEXT[] NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_event
    FOREIGN KEY(event_id) 
    REFERENCES public.events(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Create index for faster seat lock queries
CREATE INDEX IF NOT EXISTS idx_seat_locks_event_id ON public.seat_locks(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expires_at ON public.seat_locks(expires_at);

-- Add RLS policies for seat_locks
ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seat locks"
  ON public.seat_locks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seat locks"
  ON public.seat_locks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seat locks"
  ON public.seat_locks FOR DELETE
  USING (auth.uid() = user_id);

-- Add function to clean up expired seat locks
CREATE OR REPLACE FUNCTION cleanup_expired_seat_locks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.seat_locks
  WHERE expires_at < NOW();
END;
$$; 