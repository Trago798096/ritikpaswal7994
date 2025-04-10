-- Add event_id column to bookings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN event_id UUID;
  END IF;
END
$$;

-- Add foreign key constraint between bookings and events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_event_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES public.events(id);
  END IF;
END
$$;

-- Add missing columns to bookings table
DO $$
BEGIN
  -- Add expires_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add lock_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'lock_id'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN lock_id UUID;
  END IF;

  -- Add event_title if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'event_title'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN event_title TEXT;
  END IF;

  -- Add event_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'event_date'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN event_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add event_venue if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'event_venue'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN event_venue TEXT;
  END IF;

  -- Add event_city if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'event_city'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN event_city TEXT;
  END IF;
END
$$;

-- Create seat_locks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.seat_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  seats TEXT[] NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (event_id) REFERENCES public.events(id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_seat_locks_event_id ON public.seat_locks(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_user_id ON public.seat_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expires_at ON public.seat_locks(expires_at);

-- Enable RLS
ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own seat locks"
  ON public.seat_locks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seat locks"
  ON public.seat_locks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seat locks"
  ON public.seat_locks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to clean up expired seat locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_seat_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.seat_locks
  WHERE expires_at < NOW();
END;
$$; 