-- Complete fix for all missing columns in upi_payment_settings

-- Step 1: Add all potentially missing columns
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

-- Step 2: Insert default data (safely with all columns)
DELETE FROM public.upi_payment_settings WHERE upi_id = 'showtix@upi';

INSERT INTO public.upi_payment_settings (upi_id, merchant_name, display_name, qr_code_url, is_active)
VALUES ('showtix@upi', 'BookMyShow', 'ShowTix Payments', NULL, true);
