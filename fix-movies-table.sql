-- Fix for movies table - adding missing poster_url column

-- First check if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'movies') THEN
    -- Add poster_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'movies' 
                  AND column_name = 'poster_url') THEN
      ALTER TABLE public.movies
      ADD COLUMN poster_url TEXT;
    END IF;
  END IF;
END$$;
