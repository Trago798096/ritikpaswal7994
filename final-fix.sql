-- FINAL FIX: Complete solution for UPI payment settings table

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.upi_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_id TEXT NOT NULL DEFAULT 'showtix@upi',
  merchant_name TEXT NOT NULL DEFAULT 'BookMyShow'
);

-- Step 2: Add all potentially missing columns
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
  
  -- Add is_active column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'is_active') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'created_at') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Add updated_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'updated_at') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END$$;

-- Step 3: Insert default data if table is empty
INSERT INTO public.upi_payment_settings (upi_id, merchant_name, display_name, is_active)
SELECT 'showtix@upi', 'BookMyShow', 'ShowTix Payments', true
WHERE NOT EXISTS (SELECT 1 FROM public.upi_payment_settings LIMIT 1);

-- Step 4: Create a stored procedure to ensure columns exist (for future use)
CREATE OR REPLACE FUNCTION public.ensure_upi_columns_exist()
RETURNS void
LANGUAGE plpgsql
AS $$
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
  
  -- Add is_active column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'is_active') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'created_at') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Add updated_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'updated_at') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END;
$$;
