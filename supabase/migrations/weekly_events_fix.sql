-- Fix weekly_events table by adding missing year column
ALTER TABLE weekly_events ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Fix movies table poster_url issue
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- Create or update payment_confirmations table
CREATE TABLE IF NOT EXISTS payment_confirmations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  utr_number TEXT,
  payment_method TEXT NOT NULL DEFAULT 'upi',
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_confirmed BOOLEAN DEFAULT FALSE,
  admin_confirmed_by UUID REFERENCES profiles(id),
  admin_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_booking_id ON payment_confirmations(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_status ON payment_confirmations(status);
