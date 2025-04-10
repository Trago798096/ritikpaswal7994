import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UpiSettings {
  id?: string;
  merchant_name: string;
  upi_id: string;
  display_name?: string;
  qr_code_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useUpiSettings() {
  const [upiSettings, setUpiSettings] = useState<UpiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Helper function to check if we can safely proceed with operations
  const ensureColumnsExist = async () => {
    try {
      // Try a simple query to see if we can access the table
      const { data, error } = await supabase
        .from('upi_payment_settings')
        .select('upi_id, merchant_name')
        .limit(1);
      
      if (error) {
        console.warn('Error checking UPI table:', error);
      }
      
      return !error;
    } catch (err) {
      console.warn('Error ensuring columns exist:', err);
      return false;
    }
  };

  const fetchUpiSettings = async (skipCache = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get latest active UPI settings
      const { data, error } = await supabase
        .from('upi_payment_settings')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      console.log('Fetched UPI settings:', data);
      setUpiSettings(data);
    } catch (err) {
      console.error('Error fetching UPI settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching UPI settings'));
      
      // Create default settings if no settings found
      if ((err as any)?.code === 'PGRST116') {
        try {
          const defaultSettings: UpiSettings = {
            merchant_name: 'ShowTix',
            upi_id: 'showtix@upi',
            display_name: 'ShowTix Payments',
            is_active: true
          };
          
          const { data: newData, error: createError } = await supabase
            .from('upi_payment_settings')
            .insert(defaultSettings)
            .select()
            .single();
          
          if (createError) throw createError;
          
          setUpiSettings(newData);
          console.log('Created default UPI settings:', newData);
        } catch (createErr) {
          console.error('Error creating default UPI settings:', createErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateUpiSettings = async (settings: UpiSettings) => {
    try {
      setIsUpdating(true);
      setError(null);
      
      // First check if all required columns exist
      await ensureColumnsExist();

      // If we have existing settings, update them
      if (upiSettings?.id) {
        // Create a safe update object with only columns we know exist
        const safeUpdate: Record<string, any> = {
          upi_id: settings.upi_id,
          merchant_name: settings.merchant_name,
          updated_at: new Date().toISOString()
        };
        
        // Only include optional fields if they're provided
        if (settings.display_name !== undefined) {
          safeUpdate.display_name = settings.display_name;
        }
        
        if (settings.qr_code_url !== undefined) {
          safeUpdate.qr_code_url = settings.qr_code_url;
        }
        
        if (settings.is_active !== undefined) {
          safeUpdate.is_active = settings.is_active;
        }
        
        const { data, error } = await supabase
          .from('upi_payment_settings')
          .update(safeUpdate)
          .eq('id', upiSettings.id)
          .select()
          .single();

        if (error) throw error;
        setUpiSettings(data);
        toast.success('UPI settings updated successfully');
        console.log('Updated UPI settings:', data);
        return data;
      } else {
        // Create new settings with only the essential fields to avoid column errors
        const safeInsert: Record<string, any> = {
          upi_id: settings.upi_id,
          merchant_name: settings.merchant_name,
          is_active: true
        };
        
        // Only include optional fields if they're provided
        if (settings.display_name !== undefined) {
          safeInsert.display_name = settings.display_name;
        }
        
        if (settings.qr_code_url !== undefined) {
          safeInsert.qr_code_url = settings.qr_code_url;
        }
        
        const { data, error } = await supabase
          .from('upi_payment_settings')
          .insert(safeInsert)
          .select()
          .single();

        if (error) throw error;
        setUpiSettings(data);
        toast.success('UPI settings created successfully');
        console.log('Created UPI settings:', data);
        return data;
      }
    } catch (err) {
      console.error('Error updating UPI settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error updating UPI settings'));
      toast.error('Failed to update UPI settings');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  // Load UPI settings on component mount
  useEffect(() => {
    fetchUpiSettings();
  }, []);

  return {
    upiSettings,
    isLoading,
    isUpdating,
    error,
    fetchUpiSettings,
    updateUpiSettings
  };
}
