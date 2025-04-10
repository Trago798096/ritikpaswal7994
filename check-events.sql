-- Check if events table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'events'
) AS table_exists;

-- Check events table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
ORDER BY ordinal_position;

-- Check if there are any events in the table
SELECT COUNT(*) AS event_count FROM public.events;

-- List all events
SELECT 
  id,
  title,
  date,
  status,
  city,
  created_at
FROM public.events
ORDER BY date DESC;

-- Check RLS policies
SELECT *
FROM pg_policies
WHERE tablename = 'events';

-- Check indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'events'; 