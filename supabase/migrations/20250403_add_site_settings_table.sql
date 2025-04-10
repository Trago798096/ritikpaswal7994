-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_name TEXT DEFAULT 'ShowTix',
    logo_url TEXT,
    theme_color TEXT DEFAULT '#1a1a1a',
    contact_email TEXT,
    overlay_opacity FLOAT DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
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

-- Insert default settings
INSERT INTO public.site_settings (site_name, theme_color, overlay_opacity)
VALUES ('ShowTix', '#1a1a1a', 0.5);
