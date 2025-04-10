import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const setupDatabaseTables = async () => {
  try {
    // Check if tables exist first
    const { data: tables, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    // If tables don't exist, show error
    if (checkError && checkError.message.includes('relation "profiles" does not exist')) {
      toast.error('Database tables not found', {
        description: 'Please run the SQL setup script in Supabase dashboard'
      });
      return false;
    }

    // If tables exist, verify all required tables
    const requiredTables = [
      'profiles',
      'events',
      'movies',
      'bookings',
      'seat_layouts',
      'seat_categories',
      'seat_locks',
      'payments',
      'ticket_types',
      'hero_slides',
      'brand_settings',
      'payment_settings',
      'payment_confirmations',
      'upi_payment_settings'
    ];

    for (const table of requiredTables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error && !error.message.includes('Results contain 0 rows')) {
        console.error(`Error verifying ${table} table:`, error);
        toast.error(`Error accessing ${table} table`, {
          description: 'Some features may not work properly'
        });
      }
    }

    // Check for essential RPC functions
    const requiredFunctions = [
      'lock_seats',
      'release_seat_lock',
      'confirm_booked_seats'
    ];

    // Create functions if they don't exist
    await setupSeatManagementFunctions();

    return true;
  } catch (error) {
    console.error('Error in database setup:', error);
    return false;
  }
};

const setupSeatManagementFunctions = async () => {
  try {
    // Create lock_seats function
    const lockSeatsSQL = `
    CREATE OR REPLACE FUNCTION lock_seats(
      p_event_id TEXT,
      p_user_id TEXT,
      p_seats TEXT[],
      p_lock_duration_minutes INTEGER DEFAULT 15
    ) RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_lock_id TEXT;
      v_expires_at TIMESTAMP;
      v_locked_seats TEXT[];
    BEGIN
      -- Generate a unique ID for this lock
      v_lock_id := gen_random_uuid()::TEXT;
      v_expires_at := NOW() + (p_lock_duration_minutes * INTERVAL '1 minute');
      
      -- Check if seats are already locked or booked
      SELECT ARRAY_AGG(seat) INTO v_locked_seats
      FROM (
        SELECT UNNEST(seats) AS seat
        FROM seat_locks
        WHERE event_id = p_event_id
          AND expires_at > NOW()
      ) AS locked_seats
      WHERE locked_seats.seat = ANY(p_seats);
      
      IF v_locked_seats IS NOT NULL AND ARRAY_LENGTH(v_locked_seats, 1) > 0 THEN
        RAISE EXCEPTION 'Seats % are already locked', v_locked_seats;
      END IF;
      
      -- Insert the lock
      INSERT INTO seat_locks (
        id,
        event_id,
        user_id,
        seats,
        expires_at,
        created_at
      ) VALUES (
        v_lock_id,
        p_event_id,
        p_user_id,
        p_seats,
        v_expires_at,
        NOW()
      );
      
      RETURN v_lock_id;
    END;
    $$;
    `;

    // Create release_seat_lock function
    const releaseLockSQL = `
    CREATE OR REPLACE FUNCTION release_seat_lock(
      p_lock_id TEXT
    ) RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      DELETE FROM seat_locks
      WHERE id = p_lock_id;
    END;
    $$;
    `;

    // Create confirm_booked_seats function
    const confirmBookedSeatsSQL = `
    CREATE OR REPLACE FUNCTION confirm_booked_seats(
      p_event_id TEXT,
      p_lock_id TEXT,
      p_user_id TEXT
    ) RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_seats TEXT[];
    BEGIN
      -- Get the seats from the lock
      SELECT seats INTO v_seats
      FROM seat_locks
      WHERE id = p_lock_id AND event_id = p_event_id;
      
      IF v_seats IS NULL THEN
        RAISE EXCEPTION 'Lock not found or expired';
      END IF;
      
      -- Insert into booked_seats (hypothetical table, create if needed)
      -- In a real app, you might have a separate table for booked seats
      -- For now, we'll just delete the lock which implies the booking is confirmed
      DELETE FROM seat_locks
      WHERE id = p_lock_id;
    END;
    $$;
    `;

    // Execute SQL to create functions (silently - don't error if they already exist)
    try {
      await supabase.rpc('lock_seats', { 
        p_event_id: 'test', 
        p_user_id: 'test', 
        p_seats: ['test'], 
        p_lock_duration_minutes: 1 
      });
    } catch (error) {
      // Function doesn't exist, create it
      const { error: createError } = await supabase.rpc('exec_sql', { sql: lockSeatsSQL });
      if (createError && !createError.message.includes('already exists')) {
        console.error('Failed to create lock_seats function:', createError);
      }
    }

    try {
      await supabase.rpc('release_seat_lock', { p_lock_id: 'test' });
    } catch (error) {
      // Function doesn't exist, create it
      const { error: createError } = await supabase.rpc('exec_sql', { sql: releaseLockSQL });
      if (createError && !createError.message.includes('already exists')) {
        console.error('Failed to create release_seat_lock function:', createError);
      }
    }

    try {
      await supabase.rpc('confirm_booked_seats', { 
        p_event_id: 'test', 
        p_lock_id: 'test', 
        p_user_id: 'test' 
      });
    } catch (error) {
      // Function doesn't exist, create it
      const { error: createError } = await supabase.rpc('exec_sql', { sql: confirmBookedSeatsSQL });
      if (createError && !createError.message.includes('already exists')) {
        console.error('Failed to create confirm_booked_seats function:', createError);
      }
    }

    return true;
  } catch (error) {
    console.error('Error setting up seat management functions:', error);
    return false;
  }
};
