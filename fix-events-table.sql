-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'upcoming',
  category TEXT,
  duration TEXT,
  language TEXT,
  price_range TEXT,
  interested INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS events_city_idx ON public.events(city);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events(status);
CREATE INDEX IF NOT EXISTS events_date_idx ON public.events(date);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for events table
CREATE POLICY "Enable read access for all users" ON public.events
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on email" ON public.events
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample events if the table is empty
INSERT INTO public.events (
  title,
  description,
  date,
  venue,
  city,
  image_url,
  status,
  category,
  duration,
  language,
  price_range
) VALUES
(
  'Sample Event 1',
  'This is a sample event description.',
  NOW() + INTERVAL '7 days',
  'Sample Venue',
  'Sample City',
  'https://example.com/image1.jpg',
  'upcoming',
  'Concert',
  '2 hours',
  'English',
  '₹500 - ₹2000'
),
(
  'Sample Event 2',
  'Another sample event description.',
  NOW() + INTERVAL '14 days',
  'Another Venue',
  'Another City',
  'https://example.com/image2.jpg',
  'upcoming',
  'Theater',
  '3 hours',
  'Hindi',
  '₹300 - ₹1500'
)
ON CONFLICT DO NOTHING; 