-- BookMyShow Database Setup Script
-- This script sets up all necessary tables, functions, and indexes for the BookMyShow application

----------------------------------------
-- Create Extensions (if not already created)
----------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

----------------------------------------
-- Set up Row Level Security and Helper Functions
----------------------------------------

-- Create a function to handle timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

----------------------------------------
-- User Profiles Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for profiles
DROP TRIGGER IF EXISTS set_timestamp_profiles ON profiles;
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow admins to view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Events Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('movie', 'concert', 'sports', 'theatre', 'other')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  price_range TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'upcoming', 'completed', 'cancelled')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for events
DROP TRIGGER IF EXISTS set_timestamp_events ON events;
CREATE TRIGGER set_timestamp_events
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view active events"
  ON public.events FOR SELECT
  USING (status = 'active' OR status = 'upcoming');

CREATE POLICY "Allow admins to update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to insert events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Movies Table (for movie-specific details)
----------------------------------------
CREATE TABLE IF NOT EXISTS public.movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  director TEXT,
  cast TEXT[],
  duration INTEGER, -- in minutes
  genre TEXT[],
  language TEXT,
  rating TEXT,
  release_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for movies
DROP TRIGGER IF EXISTS set_timestamp_movies ON movies;
CREATE TRIGGER set_timestamp_movies
BEFORE UPDATE ON movies
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for movies
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view movies"
  ON public.movies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = movies.event_id AND (status = 'active' OR status = 'upcoming')
    )
  );

CREATE POLICY "Allow admins to update movies"
  ON public.movies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to insert movies"
  ON public.movies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete movies"
  ON public.movies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Seat Categories Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.seat_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#808080',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for seat_categories
DROP TRIGGER IF EXISTS set_timestamp_seat_categories ON seat_categories;
CREATE TRIGGER set_timestamp_seat_categories
BEFORE UPDATE ON seat_categories
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for seat_categories
ALTER TABLE public.seat_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view seat categories"
  ON public.seat_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = seat_categories.event_id AND (status = 'active' OR status = 'upcoming')
    )
  );

CREATE POLICY "Allow admins to update seat categories"
  ON public.seat_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to insert seat categories"
  ON public.seat_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete seat categories"
  ON public.seat_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Seat Layouts Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.seat_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.seat_categories(id) ON DELETE CASCADE,
  layout JSONB NOT NULL, -- Store seat arrangements in JSON format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for seat_layouts
DROP TRIGGER IF EXISTS set_timestamp_seat_layouts ON seat_layouts;
CREATE TRIGGER set_timestamp_seat_layouts
BEFORE UPDATE ON seat_layouts
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for seat_layouts
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view seat layouts"
  ON public.seat_layouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = seat_layouts.event_id AND (status = 'active' OR status = 'upcoming')
    )
  );

CREATE POLICY "Allow admins to update seat layouts"
  ON public.seat_layouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to insert seat layouts"
  ON public.seat_layouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete seat layouts"
  ON public.seat_layouts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Seat Locks Table (for temporary seat reservation)
----------------------------------------
CREATE TABLE IF NOT EXISTS public.seat_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seats TEXT[] NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Set up RLS for seat_locks
ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own seat locks"
  ON public.seat_locks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow admins to view all seat locks"
  ON public.seat_locks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow anyone to insert seat locks via function"
  ON public.seat_locks FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Allow users to delete their own seat locks"
  ON public.seat_locks FOR DELETE
  USING (auth.uid() = user_id);

----------------------------------------
-- Bookings Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_amount NUMERIC NOT NULL,
  seats TEXT[] NOT NULL,
  ticket_count INTEGER NOT NULL,
  category_id UUID REFERENCES public.seat_categories(id),
  category_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  lock_id UUID,
  event_title TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  event_venue TEXT,
  event_city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for bookings
DROP TRIGGER IF EXISTS set_timestamp_bookings ON bookings;
CREATE TRIGGER set_timestamp_bookings
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own pending bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Allow users to insert their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow admins to view all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update all bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Payments Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT NOT NULL,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for payments
DROP TRIGGER IF EXISTS set_timestamp_payments ON payments;
CREATE TRIGGER set_timestamp_payments
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = payments.booking_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to insert their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = NEW.booking_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update all payments"
  ON public.payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Hero Slides Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for hero_slides
DROP TRIGGER IF EXISTS set_timestamp_hero_slides ON hero_slides;
CREATE TRIGGER set_timestamp_hero_slides
BEFORE UPDATE ON hero_slides
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for hero_slides
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view active hero slides"
  ON public.hero_slides FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Allow admins to manage hero slides"
  ON public.hero_slides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Brand Settings Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#E21221',
  secondary_color TEXT DEFAULT '#333333',
  footer_text TEXT,
  social_links JSONB,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for brand_settings
DROP TRIGGER IF EXISTS set_timestamp_brand_settings ON brand_settings;
CREATE TRIGGER set_timestamp_brand_settings
BEFORE UPDATE ON brand_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for brand_settings
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view brand settings"
  ON public.brand_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Allow admins to update brand settings"
  ON public.brand_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Payment Settings Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_gateway TEXT NOT NULL,
  api_key TEXT,
  secret_key TEXT,
  is_live BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for payment_settings
DROP TRIGGER IF EXISTS set_timestamp_payment_settings ON payment_settings;
CREATE TRIGGER set_timestamp_payment_settings
BEFORE UPDATE ON payment_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for payment_settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view and manage payment settings"
  ON public.payment_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- UPI Payment Settings Table
----------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create timestamp trigger for upi_payment_settings
DROP TRIGGER IF EXISTS set_timestamp_upi_payment_settings ON upi_payment_settings;
CREATE TRIGGER set_timestamp_upi_payment_settings
BEFORE UPDATE ON upi_payment_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Set up RLS for upi_payment_settings
ALTER TABLE public.upi_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view active UPI settings"
  ON public.upi_payment_settings FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Allow admins to manage UPI settings"
  ON public.upi_payment_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

----------------------------------------
-- Functions for Seat Management
----------------------------------------

-- Function to lock seats for a specified time
CREATE OR REPLACE FUNCTION lock_seats(
  p_event_id TEXT,
  p_user_id TEXT,
  p_seats TEXT[],
  p_lock_duration_minutes INTEGER DEFAULT 15
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_id TEXT;
  v_expires_at TIMESTAMP;
  v_locked_seats TEXT[];
BEGIN
  -- Generate a unique ID for this lock
  v_lock_id := gen_random_uuid()::TEXT;
  v_expires_at := NOW() + (p_lock_duration_minutes * INTERVAL '1 minute');
  
  -- Check if seats are already locked or booked
  SELECT ARRAY_AGG(seat) INTO v_locked_seats
  FROM (
    SELECT UNNEST(seats) AS seat
    FROM seat_locks
    WHERE event_id = p_event_id
      AND expires_at > NOW()
  ) AS locked_seats
  WHERE locked_seats.seat = ANY(p_seats);
  
  IF v_locked_seats IS NOT NULL AND ARRAY_LENGTH(v_locked_seats, 1) > 0 THEN
    RAISE EXCEPTION 'Seats % are already locked', v_locked_seats;
  END IF;
  
  -- Insert the lock
  INSERT INTO seat_locks (
    id,
    event_id,
    user_id,
    seats,
    expires_at,
    created_at
  ) VALUES (
    v_lock_id,
    p_event_id,
    p_user_id,
    p_seats,
    v_expires_at,
    NOW()
  );
  
  RETURN v_lock_id;
END;
$$;

-- Function to release a seat lock
CREATE OR REPLACE FUNCTION release_seat_lock(
  p_lock_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM seat_locks
  WHERE id = p_lock_id;
END;
$$;

-- Function to confirm booked seats
CREATE OR REPLACE FUNCTION confirm_booked_seats(
  p_event_id TEXT,
  p_lock_id TEXT,
  p_user_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seats TEXT[];
BEGIN
  -- Get the seats from the lock
  SELECT seats INTO v_seats
  FROM seat_locks
  WHERE id = p_lock_id AND event_id = p_event_id;
  
  IF v_seats IS NULL THEN
    RAISE EXCEPTION 'Lock not found or expired';
  END IF;
  
  -- Delete the lock (which implies the booking is confirmed)
  DELETE FROM seat_locks
  WHERE id = p_lock_id;
END;
$$;

----------------------------------------
-- Scheduled Job to Clean Up Expired Locks
----------------------------------------

-- Function to clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM seat_locks
  WHERE expires_at < NOW();
END;
$$;

-- Set up a cron job to clean up expired locks (every 5 minutes)
SELECT cron.schedule(
  'cleanup-expired-locks',
  '*/5 * * * *',
  'SELECT cleanup_expired_locks()'
);

----------------------------------------
-- Default Data Population
----------------------------------------

-- Insert default brand settings if none exist
INSERT INTO public.brand_settings (site_name, logo_url, primary_color, secondary_color, footer_text, contact_email)
SELECT 'BookMyShow', '/logo.png', '#E21221', '#333333', '© 2023 BookMyShow. All rights reserved.', 'contact@bookmyshow.com'
WHERE NOT EXISTS (SELECT 1 FROM public.brand_settings LIMIT 1);

-- Insert default UPI payment settings if none exist
INSERT INTO public.upi_payment_settings (upi_id, merchant_name, is_default, active)
SELECT 'merchant@upi', 'BookMyShow', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.upi_payment_settings LIMIT 1);

-- Create admin user for dev/testing (you should change this in production)
INSERT INTO public.profiles (id, first_name, last_name, email, role)
SELECT auth.uid(), 'Admin', 'User', auth.email(), 'admin'
FROM auth.users
WHERE email = 'admin@example.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'admin@example.com'
); 