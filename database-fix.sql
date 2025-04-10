-- Add display_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'upi_payment_settings' 
                AND column_name = 'display_name') THEN
    ALTER TABLE public.upi_payment_settings
    ADD COLUMN display_name TEXT DEFAULT 'ShowTix Payments';
  END IF;
END
$$;

-- Fix previous insert statement to check for display_name column first
DELETE FROM public.upi_payment_settings WHERE upi_id = 'showtix@upi';

-- Insert with safer approach that checks column existence
INSERT INTO public.upi_payment_settings (upi_id, merchant_name)
SELECT 'showtix@upi', 'BookMyShow'
WHERE NOT EXISTS (SELECT 1 FROM public.upi_payment_settings LIMIT 1);

-- Update the display_name if the column exists for existing rows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'upi_payment_settings' 
             AND column_name = 'display_name') THEN
    UPDATE public.upi_payment_settings 
    SET display_name = 'BookMyShow Payments' 
    WHERE display_name IS NULL;
  END IF;
END
$$;
