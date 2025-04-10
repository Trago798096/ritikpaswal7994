-- Simple fix for the missing display_name column

-- Step 1: First check if the column exists and add it if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'display_name') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN display_name TEXT DEFAULT 'ShowTix Payments';
  END IF;
END$$;

-- Step 2: Insert default data (safely without using display_name in case it's still creating)
DELETE FROM public.upi_payment_settings WHERE upi_id = 'showtix@upi';

INSERT INTO public.upi_payment_settings (upi_id, merchant_name, is_active)
VALUES ('showtix@upi', 'BookMyShow', true);
