-- Fix event seating relationships
-- This comprehensive fix addresses issues with seat categories, layouts, and their relationships to events

-- First, ensure the event_id column exists in seat_categories and is a foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seat_categories' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE public.seat_categories
    ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;

  -- Make sure we have the right indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'seat_categories_event_id_idx'
  ) THEN
    CREATE INDEX seat_categories_event_id_idx ON public.seat_categories(event_id);
  END IF;
END $$;

-- Create a more robust seat_layouts table with proper constraints
DROP TABLE IF EXISTS public.seat_layouts;
CREATE TABLE IF NOT EXISTS public.seat_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.seat_categories(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  status TEXT DEFAULT 'available',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, row_label, seat_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS seat_layouts_event_id_idx ON public.seat_layouts(event_id);
CREATE INDEX IF NOT EXISTS seat_layouts_category_id_idx ON public.seat_layouts(category_id);
CREATE INDEX IF NOT EXISTS seat_layouts_status_idx ON public.seat_layouts(status);

-- Enable RLS
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;

-- Create policies for seat_layouts
CREATE POLICY "Enable read access for all users" ON public.seat_layouts
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.seat_layouts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.seat_layouts
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.seat_layouts
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix seat_locks table 
CREATE TABLE IF NOT EXISTS public.seat_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seats TEXT[] NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS seat_locks_event_id_idx ON public.seat_locks(event_id);
CREATE INDEX IF NOT EXISTS seat_locks_user_id_idx ON public.seat_locks(user_id);
CREATE INDEX IF NOT EXISTS seat_locks_expires_at_idx ON public.seat_locks(expires_at);

-- Enable RLS
ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;

-- Create policies for seat_locks
CREATE POLICY "Enable read access for all users" ON public.seat_locks
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.seat_locks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.seat_locks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users only" ON public.seat_locks
  FOR DELETE USING (auth.uid() = user_id);

-- Create functions to manage seat locks

-- Function to clean up expired seat locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_seat_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update seat layouts to make seats available again
  UPDATE public.seat_layouts sl
  SET status = 'available'
  FROM public.seat_locks locks
  WHERE 
    locks.expires_at < NOW() AND
    sl.event_id = locks.event_id AND
    sl.status = 'pending';
    
  -- Delete the expired locks
  DELETE FROM public.seat_locks
  WHERE expires_at < NOW();
END;
$$;

-- Function to lock seats for a booking
CREATE OR REPLACE FUNCTION public.lock_seats(
  p_event_id UUID,
  p_user_id UUID,
  p_seats TEXT[],
  p_lock_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_id UUID := uuid_generate_v4();
  v_expires_at TIMESTAMP WITH TIME ZONE := NOW() + (p_lock_duration_minutes * INTERVAL '1 minute');
  v_conflict_count INTEGER;
BEGIN
  -- Check if any seats are already locked or booked
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM public.seat_layouts sl
  WHERE 
    sl.event_id = p_event_id AND
    sl.status IN ('booked', 'pending') AND
    (sl.row_label || sl.seat_number::text) = ANY(p_seats);
  
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Some seats are already locked or booked';
  END IF;
  
  -- Create the lock
  INSERT INTO public.seat_locks (
    id, event_id, user_id, seats, expires_at
  ) VALUES (
    v_lock_id, p_event_id, p_user_id, p_seats, v_expires_at
  );
  
  -- Mark seats as pending in the layout
  UPDATE public.seat_layouts
  SET status = 'pending'
  WHERE 
    event_id = p_event_id AND
    (row_label || seat_number::text) = ANY(p_seats);
  
  RETURN v_lock_id;
EXCEPTION
  WHEN others THEN
    RAISE;
END;
$$;

-- Function to release seat locks
CREATE OR REPLACE FUNCTION public.release_seat_lock(p_lock_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_seats TEXT[];
BEGIN
  -- Get the event_id and seats from the lock
  SELECT event_id, seats
  INTO v_event_id, v_seats
  FROM public.seat_locks
  WHERE id = p_lock_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update seat layouts to make seats available again
  UPDATE public.seat_layouts
  SET status = 'available'
  WHERE 
    event_id = v_event_id AND
    (row_label || seat_number::text) = ANY(v_seats) AND
    status = 'pending';
  
  -- Delete the lock
  DELETE FROM public.seat_locks
  WHERE id = p_lock_id;
  
  RETURN true;
END;
$$;

-- Create trigger to update updated_at in all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
  -- For seat_categories table
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_seat_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_seat_categories_updated_at
      BEFORE UPDATE ON public.seat_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- For seat_layouts table
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_seat_layouts_updated_at'
  ) THEN
    CREATE TRIGGER update_seat_layouts_updated_at
      BEFORE UPDATE ON public.seat_layouts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- For seat_locks table
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_seat_locks_updated_at'
  ) THEN
    CREATE TRIGGER update_seat_locks_updated_at
      BEFORE UPDATE ON public.seat_locks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create function to get available seats for an event
CREATE OR REPLACE FUNCTION public.get_available_seats(event_id_param UUID)
RETURNS TABLE (
  row_number INTEGER,
  seat_number INTEGER,
  category_name TEXT,
  price DECIMAL(10,2),
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.row_number,
    sl.seat_number,
    sc.name as category_name,
    sc.price,
    sl.status
  FROM public.seat_layouts sl
  JOIN public.seat_categories sc ON sl.category_id = sc.id
  WHERE sl.event_id = event_id_param
  AND sl.status = 'available'
  ORDER BY sl.row_number, sl.seat_number;
END;
$$ LANGUAGE plpgsql;

-- Update existing seat categories to be event-specific
DO $$
DECLARE
  event_id UUID;
BEGIN
  -- Get the first event ID
  SELECT id INTO event_id FROM public.events LIMIT 1;
  
  IF event_id IS NOT NULL THEN
    -- Update existing categories to be associated with the event
    UPDATE public.seat_categories
    SET event_id = event_id
    WHERE event_id IS NULL;
    
    -- Create new categories for the second event
    INSERT INTO public.seat_categories (
      name, price, description, color, icon, event_id
    )
    SELECT 
      name, 
      price * 1.2, -- 20% higher price for second event
      description, 
      color, 
      icon,
      (SELECT id FROM public.events ORDER BY id DESC LIMIT 1)
    FROM public.seat_categories
    WHERE event_id = event_id;
  END IF;
END
$$;

-- Create seat layouts for events
DO $$
DECLARE
  event_record RECORD;
  category_record RECORD;
  row_letter TEXT;
  seat_count INTEGER;
BEGIN
  -- Loop through each event
  FOR event_record IN SELECT id FROM public.events LOOP
    -- Loop through each category for the event
    FOR category_record IN 
      SELECT id, name FROM public.seat_categories 
      WHERE event_id = event_record.id 
    LOOP
      -- Create 6 rows (A-F) for each category
      FOR i IN 0..5 LOOP
        row_letter := CHR(65 + i); -- A-F
        seat_count := 12 + (i * 2); -- Increasing seats per row
        
        -- Insert seats for this row
        FOR j IN 1..seat_count LOOP
          INSERT INTO public.seat_layouts (
            event_id,
            category_id,
            row_number,
            seat_number,
            status
          ) VALUES (
            event_record.id,
            category_record.id,
            i + 1,
            j,
            'available'
          );
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END
$$; 