-- First create the upi_payment_settings table
CREATE TABLE IF NOT EXISTS public.upi_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_id TEXT NOT NULL DEFAULT 'showtix@upi',
  merchant_name TEXT NOT NULL DEFAULT 'BookMyShow',
  display_name TEXT DEFAULT 'ShowTix Payments',
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_confirmations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID,
  utr_number TEXT,
  payment_method TEXT DEFAULT 'upi',
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_confirmed BOOLEAN DEFAULT false,
  admin_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create or update payment_settings table (legacy table)
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT DEFAULT 'upi',
  upi_id TEXT DEFAULT 'showtix@upi',
  qr_code_url TEXT,
  payment_instructions TEXT DEFAULT 'Please make the payment using any UPI app and enter the UTR number for verification.',
  api_key TEXT,
  webhook_secret TEXT,
  mode TEXT DEFAULT 'test',
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default values into upi_payment_settings if it's empty
INSERT INTO public.upi_payment_settings (upi_id, merchant_name, display_name)
SELECT 'showtix@upi', 'BookMyShow', 'BookMyShow Payments'
WHERE NOT EXISTS (SELECT 1 FROM public.upi_payment_settings LIMIT 1);

-- Insert default values into payment_settings if it's empty
INSERT INTO public.payment_settings (provider, upi_id, payment_instructions)
SELECT 'upi', 'showtix@upi', 'Please make the payment using any UPI app and enter the UTR number for verification.'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings LIMIT 1);

-- Create foreign key relationship if bookings table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    -- Check if the constraint already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_confirmations_booking_id_fkey') THEN
      -- Add foreign key constraint
      ALTER TABLE public.payment_confirmations
      ADD CONSTRAINT payment_confirmations_booking_id_fkey
      FOREIGN KEY (booking_id)
      REFERENCES public.bookings(id);
    END IF;
  END IF;
END
$$;
