-- Create the payment_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upi_id TEXT,
    qr_code_url TEXT,
    payment_instructions TEXT,
    provider TEXT,
    api_key TEXT,
    webhook_secret TEXT,
    mode TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create the seat_layouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.seat_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id),
    layout_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Grant necessary permissions to authenticated users
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read payment settings
CREATE POLICY "Allow authenticated users to read payment settings"
ON public.payment_settings FOR SELECT
TO authenticated
USING (true);

-- Allow admin users to update payment settings
CREATE POLICY "Allow admin users to update payment settings"
ON public.payment_settings FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE email IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com')
))
WITH CHECK (auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE email IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com')
));

-- Allow authenticated users to read seat layouts
CREATE POLICY "Allow authenticated users to read seat layouts"
ON public.seat_layouts FOR SELECT
TO authenticated
USING (true);

-- Allow admin users to manage seat layouts
CREATE POLICY "Allow admin users to manage seat layouts"
ON public.seat_layouts FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE email IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com')
))
WITH CHECK (auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE email IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com')
));
