
import { useState, useEffect } from 'react';
import { getPaymentSettings, updatePaymentSettings } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface PaymentSettings {
  id?: string;
  upi_id: string;
  qr_code_url?: string;
  payment_instructions?: string;
  updated_at?: string;
  updated_by?: string;
}

export const usePaymentSettings = () => {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch payment settings with better error handling
  const { 
    data: queryData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['paymentSettings'],
    queryFn: async () => {
      try {
        console.log('Fetching payment settings');
        const result = await getPaymentSettings(false);
        console.log('Payment settings fetch result:', result);
        if (result.error) throw result.error;
        return result.data;
      } catch (err) {
        console.error('Error in payment settings query function:', err);
        throw err;
      }
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Update local state when query data changes
  useEffect(() => {
    if (queryData) {
      setPaymentSettings(queryData);
    }
  }, [queryData]);
  
  // Mutation with better error handling
  const mutation = useMutation({
    mutationFn: async (newSettings: PaymentSettings) => {
      console.log('Mutation running with settings:', newSettings);
      const result = await updatePaymentSettings(newSettings);
      if (result.error) {
        console.error('Error from updatePaymentSettings:', result.error);
        throw result.error;
      }
      return result.data;
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['paymentSettings'] });
      
      // Save the previous value
      const previousSettings = queryClient.getQueryData(['paymentSettings']);
      
      // Optimistically update the cache
      queryClient.setQueryData(['paymentSettings'], newSettings);
      setPaymentSettings(newSettings);
      
      return { previousSettings };
    },
    onError: (err, newSettings, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['paymentSettings'], context.previousSettings);
      setPaymentSettings(context.previousSettings);
      toast.error(`Failed to update payment settings: ${err.message}`);
    },
    onSuccess: (data) => {
      // Update with the actual server data
      queryClient.setQueryData(['paymentSettings'], data);
      setPaymentSettings(data);
      toast.success('Payment settings updated successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['paymentSettings'] });
    }
  });
  
  useEffect(() => {
    if (queryData) {
      setPaymentSettings(queryData);
      console.log('Loaded payment settings from database:', queryData);
    } else if (error) {
      console.error('Error fetching payment settings:', error);
      // Set fallback values on error
      setPaymentSettings({
        upi_id: 'showtix@upi',
        qr_code_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg',
        payment_instructions: 'Please make the payment using any UPI app and enter the UTR number for verification.'
      });
      
      toast.error('Unable to load payment settings. Using defaults.');
    }
  }, [queryData, error]);
  
  const refreshPaymentSettings = async () => {
    try {
      toast.info('Refreshing payment information...');
      const result = await refetch();
      
      if (result.error) {
        throw result.error;
      }
      
      return true;
    } catch (error) {
      console.error('Error refreshing payment settings:', error);
      return false;
    }
  };
  
  const updateSettings = async (newSettings: PaymentSettings) => {
    try {
      console.log('Updating payment settings:', newSettings);
      // Make a deep copy to avoid mutation issues
      const settingsCopy = {
        ...newSettings,
        upi_id: newSettings.upi_id.trim() || 'showtix@upi'
      };
      
      return await mutation.mutateAsync(settingsCopy);
    } catch (error) {
      console.error('Error in updateSettings:', error);
      throw error;
    }
  };
  
  return { 
    paymentSettings, 
    isLoading, 
    error, 
    isUpdating: mutation.isPending,
    refreshPaymentSettings,
    updateSettings
  };
};
