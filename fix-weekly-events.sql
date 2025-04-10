-- Fix for weekly_events table - adding missing year column

-- First check if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_events') THEN
    -- Add year column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'weekly_events' 
                  AND column_name = 'year') THEN
      ALTER TABLE public.weekly_events
      ADD COLUMN year INTEGER NOT NULL DEFAULT extract(year from CURRENT_DATE);
    END IF;
    
    -- Update any existing records with NULL year
    UPDATE public.weekly_events
    SET year = extract(year from CURRENT_DATE)
    WHERE year IS NULL;
  END IF;
END$$;
