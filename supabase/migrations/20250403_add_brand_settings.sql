-- Create brand_settings table
CREATE TABLE IF NOT EXISTS public.brand_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name TEXT NOT NULL DEFAULT 'ShowTix',
  logo_url TEXT,
  theme_color TEXT DEFAULT '#FF0000',
  contact_email TEXT,
  overlay_opacity FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access"
  ON public.brand_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin update"
  ON public.brand_settings
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com'));

-- Insert default settings
INSERT INTO public.brand_settings (site_name, theme_color, overlay_opacity)
VALUES ('ShowTix', '#FF0000', 0.5)
ON CONFLICT (id) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to call the function before update
CREATE TRIGGER update_brand_settings_updated_at
  BEFORE UPDATE ON public.brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
