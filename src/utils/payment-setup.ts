import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export async function setupPaymentTables() {
  try {
    // Create payment_confirmations table if it doesn't exist
    const { error: paymentConfError } = await supabase.rpc('create_payment_confirmations_table');
    if (paymentConfError && !paymentConfError.message.includes('already exists')) {
      console.error('Error creating payment_confirmations table:', paymentConfError);
    }

    // Create upi_payment_settings table if it doesn't exist
    const { error: upiSettingsError } = await supabase.rpc('create_upi_payment_settings_table');
    if (upiSettingsError && !upiSettingsError.message.includes('already exists')) {
      console.error('Error creating upi_payment_settings table:', upiSettingsError);
    }

    // Insert default UPI settings if not exists
    const { data: existingSettings } = await supabase
      .from('upi_payment_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (!existingSettings || existingSettings.length === 0) {
      const { error: insertError } = await supabase
        .from('upi_payment_settings')
        .insert([
          {
            upi_id: 'showtix@upi',
            merchant_name: 'ShowTix',
            is_active: true
          }
        ]);

      if (insertError) {
        console.error('Error inserting default UPI settings:', insertError);
      }
    }

    // Add expires_at column to bookings table if it doesn't exist
    const { error: alterBookingsError } = await supabase.rpc('add_expires_at_to_bookings');
    if (alterBookingsError && !alterBookingsError.message.includes('already exists')) {
      console.error('Error adding expires_at to bookings:', alterBookingsError);
    }

    return true;
  } catch (error) {
    console.error('Error in setupPaymentTables:', error);
    toast.error('Failed to setup payment system');
    return false;
  }
}
