-- Create seat_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.seat_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#000000',
  icon TEXT DEFAULT 'chair',
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seat_layouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.seat_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  category_id UUID NOT NULL,
  row_number INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES public.seat_categories(id) ON DELETE CASCADE
);

-- Insert default seat categories if they don't exist
INSERT INTO public.seat_categories (name, price, description, color, icon)
VALUES 
  ('Premium', 1000.00, 'Best seats in the house', '#FFD700', 'crown'),
  ('Standard', 500.00, 'Regular seating', '#4CAF50', 'chair'),
  ('Economy', 300.00, 'Budget-friendly seats', '#2196F3', 'chair')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on seat_categories
ALTER TABLE public.seat_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for seat_categories
CREATE POLICY "Enable read access for all users" ON public.seat_categories
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.seat_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.seat_categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable RLS on seat_layouts
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;

-- Create policies for seat_layouts
CREATE POLICY "Enable read access for all users" ON public.seat_layouts
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.seat_layouts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.seat_layouts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS seat_layouts_event_id_idx ON public.seat_layouts(event_id);
CREATE INDEX IF NOT EXISTS seat_layouts_category_id_idx ON public.seat_layouts(category_id);
CREATE INDEX IF NOT EXISTS seat_layouts_status_idx ON public.seat_layouts(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_seat_categories_updated_at
  BEFORE UPDATE ON public.seat_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seat_layouts_updated_at
  BEFORE UPDATE ON public.seat_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 