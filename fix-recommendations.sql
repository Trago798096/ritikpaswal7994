-- Fix for recommendations table and related issues

-- Step 1: Create recommendations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'recommended',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create a stored procedure to create the recommendations table
CREATE OR REPLACE FUNCTION public.create_recommendations_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create the table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    type TEXT NOT NULL DEFAULT 'recommended',
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
END;
$$;

-- Step 3: Add foreign key if events table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'events' AND table_schema = 'public'
  ) THEN
    -- Check if constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'recommendations_event_id_fkey' 
      AND table_name = 'recommendations'
    ) THEN
      ALTER TABLE public.recommendations
      ADD CONSTRAINT recommendations_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;
