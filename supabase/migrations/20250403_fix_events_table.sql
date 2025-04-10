-- Drop existing events table and its dependencies
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.seat_layouts;
DROP TABLE IF EXISTS public.events;

-- Recreate events table with correct columns
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    venue TEXT,
    city TEXT,
    category TEXT,
    price_range TEXT,
    event_status TEXT DEFAULT 'active',
    interested_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Recreate bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    booking_status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    seats JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Recreate seat_layouts table
CREATE TABLE IF NOT EXISTS public.seat_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;

-- Create policies for events
CREATE POLICY "Enable read access for all users"
ON public.events FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable write access for admin users only"
ON public.events FOR ALL
TO authenticated
USING (auth.email() IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com'));

-- Create policies for bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for seat_layouts
CREATE POLICY "Enable read access for all users"
ON public.seat_layouts FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable write access for admin users only"
ON public.seat_layouts FOR ALL
TO authenticated
USING (auth.email() IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com'));

-- Insert sample events
INSERT INTO public.events (title, description, image_url, event_date, venue, city, category, price_range, event_status)
VALUES 
('Arijit Singh Live in Concert', 
'Experience the magic of Arijit Singh live in concert!', 
'https://example.com/arijit.jpg',
NOW() + interval '30 days',
'JLN Stadium',
'New Delhi',
'Concert',
'₹1000 - ₹5000',
'active'),

('Sunburn Festival 2025',
'The biggest EDM festival is back!',
'https://example.com/sunburn.jpg',
NOW() + interval '45 days',
'Candolim Beach',
'Goa',
'Music Festival',
'₹2000 - ₹8000',
'active'),

('Stand-up Comedy Night',
'A hilarious evening with top comedians',
'https://example.com/comedy.jpg',
NOW() + interval '15 days',
'The Comedy Club',
'Mumbai',
'Comedy',
'₹500 - ₹1500',
'active');
