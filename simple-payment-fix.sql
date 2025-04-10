-- Simple fix for UPI payment settings table

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.upi_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_id TEXT NOT NULL DEFAULT 'forgcd@ybi',
  merchant_name TEXT NOT NULL DEFAULT 'BookMyShow',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add missing columns if needed
DO $$
BEGIN
  -- Add display_name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'display_name') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN display_name TEXT DEFAULT 'ShowTix Payments';
  END IF;
  
  -- Add qr_code_url column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'qr_code_url') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN qr_code_url TEXT;
  END IF;
END$$;

-- Step 3: Insert default data if table is empty
INSERT INTO public.upi_payment_settings (upi_id, merchant_name, display_name, is_active)
SELECT 'forgcd@ybi', 'BookMyShow', 'ShowTix Payments', true
WHERE NOT EXISTS (SELECT 1 FROM public.upi_payment_settings LIMIT 1);

-- Step 4: Update legacy payment_settings table for backward compatibility
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT DEFAULT 'upi',
  upi_id TEXT DEFAULT 'forgcd@ybi',
  qr_code_url TEXT,
  payment_instructions TEXT DEFAULT 'Please make the payment using any UPI app and enter the UTR number for verification.',
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Sync UPI ID between tables
DO $$
BEGIN
  -- Get latest UPI ID from upi_payment_settings
  DECLARE latest_upi_id TEXT;
  SELECT upi_id INTO latest_upi_id FROM public.upi_payment_settings ORDER BY updated_at DESC LIMIT 1;
  
  -- Update payment_settings with the latest UPI ID
  IF latest_upi_id IS NOT NULL THEN
    UPDATE public.payment_settings SET upi_id = latest_upi_id;
  END IF;
END$$;
