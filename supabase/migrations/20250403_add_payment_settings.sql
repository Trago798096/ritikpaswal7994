-- Create payment_settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_id TEXT NOT NULL DEFAULT 'showtix@upi',
  qr_code_url TEXT,
  payment_instructions TEXT DEFAULT 'Please make the payment using any UPI app and enter the UTR number for verification.',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable Row Level Security
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access"
  ON public.payment_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin update"
  ON public.payment_settings
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com'));

-- Insert default settings
INSERT INTO public.payment_settings (upi_id, payment_instructions)
VALUES ('showtix@upi', 'Please make the payment using any UPI app and enter the UTR number for verification.')
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
CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
