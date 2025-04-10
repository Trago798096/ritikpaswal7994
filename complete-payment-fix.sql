-- Complete fix for all payment-related tables

-- Step 1: Create or update the upi_payment_settings table
CREATE TABLE IF NOT EXISTS public.upi_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_id TEXT NOT NULL DEFAULT 'showtix@upi',
  merchant_name TEXT NOT NULL DEFAULT 'ShowTix',
  display_name TEXT DEFAULT 'ShowTix Payments',
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create or update payment_confirmations table
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

-- Step 3: Create or update payment_settings table (legacy table)
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

-- Step 4: Insert or update default UPI settings
DO $$
BEGIN
  -- Check if we have any UPI settings
  IF NOT EXISTS (SELECT 1 FROM public.upi_payment_settings LIMIT 1) THEN
    -- Insert default UPI settings
    INSERT INTO public.upi_payment_settings (upi_id, merchant_name, display_name, is_active)
    VALUES ('forgcd@ybi', 'BookMyShow', 'ShowTix Payments', true);
  ELSE
    -- Update existing UPI settings to ensure they're active
    UPDATE public.upi_payment_settings
    SET is_active = true
    WHERE id = (SELECT id FROM public.upi_payment_settings ORDER BY updated_at DESC LIMIT 1);
  END IF;
  
  -- Also update legacy payment_settings for backward compatibility
  IF NOT EXISTS (SELECT 1 FROM public.payment_settings LIMIT 1) THEN
    -- Insert default payment settings
    INSERT INTO public.payment_settings (provider, upi_id, payment_instructions)
    VALUES ('upi', 'forgcd@ybi', 'Please make the payment using any UPI app and enter the UTR number for verification.');
  ELSE
    -- Update existing payment settings with latest UPI ID
    UPDATE public.payment_settings
    SET upi_id = (SELECT upi_id FROM public.upi_payment_settings ORDER BY updated_at DESC LIMIT 1)
    WHERE id = (SELECT id FROM public.payment_settings ORDER BY updated_at DESC LIMIT 1);
  END IF;
END$$;

-- Step 5: Add foreign key if bookings table exists
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
END$$;
