-- Fix database tables for the booking system

-- Create or update the bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    event_id UUID REFERENCES events(id),
    event_title TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    event_venue TEXT,
    event_city TEXT,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    seats JSONB,
    ticket_count INTEGER,
    category TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    lock_id UUID,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method TEXT,
    payment_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create or update the payment_confirmations table
CREATE TABLE IF NOT EXISTS payment_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    utr_number TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    amount DECIMAL(10,2),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create or update the upi_payment_settings table
CREATE TABLE IF NOT EXISTS upi_payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upi_id TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default UPI settings if not exists
INSERT INTO upi_payment_settings (upi_id, merchant_name)
SELECT 'showtix@upi', 'ShowTix'
WHERE NOT EXISTS (
    SELECT 1 FROM upi_payment_settings WHERE is_active = true
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_booking_id ON payment_confirmations(booking_id);

-- Update function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at
DO $$ BEGIN
    CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_payment_confirmations_updated_at
        BEFORE UPDATE ON payment_confirmations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_upi_settings_updated_at
        BEFORE UPDATE ON upi_payment_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN others THEN null;
END $$;
