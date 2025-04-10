-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    overlay_opacity FLOAT DEFAULT 0.5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
ON public.site_settings FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable write access for admin users only"
ON public.site_settings FOR ALL
TO authenticated
USING (auth.email() IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com'));
