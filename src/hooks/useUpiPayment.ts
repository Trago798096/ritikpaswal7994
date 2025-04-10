import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UpiPaymentInfo {
  upiId: string;
  merchantName: string;
  displayName?: string;
  qrCodeUrl?: string;
  transactionReference?: string;
  upiLink?: string;
}

interface UpiSettings {
  upi_id: string;
  merchant_name: string;
  is_active: boolean;
  display_name?: string;
  qr_code_url?: string;
}

export function useUpiPayment(bookingAmount: number) {
  const [paymentInfo, setPaymentInfo] = useState<UpiPaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchUpiSettings = async (isPolling = false) => {
      if (!bookingAmount || bookingAmount <= 0) {
        setError(new Error('Invalid booking amount'));
        setIsLoading(false);
        return;
      }

      try {
        if (!isPolling) {
          setIsLoading(true);
          setError(null);
        }

        // Get UPI settings
        const { data, error: upiError } = await supabase
          .from('upi_payment_settings')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (upiError) {
          throw new Error('Failed to fetch UPI settings: ' + upiError.message);
        }

        if (isMounted) {
          // Generate transaction reference
          const txnRef = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          // Use settings from DB or fallback to defaults
          const upiSettings = data?.[0] as UpiSettings;
          
          if (!upiSettings) {
            // Fallback to defaults if no settings found
            setPaymentInfo({
              upiId: 'showtix@upi',
              merchantName: 'ShowTix',
              transactionReference: txnRef
            });
          } else {
            // Use settings from DB with fallbacks for optional fields
            setPaymentInfo({
              upiId: upiSettings.upi_id,
              merchantName: upiSettings.merchant_name,
              displayName: upiSettings.display_name || 'ShowTix Payments',
              qrCodeUrl: upiSettings.qr_code_url,
              transactionReference: txnRef
            });
          }
        }
      } catch (err) {
        console.error('Error in UPI payment setup:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to setup UPI payment'));
          
          // Set default values in case of error
          const txnRef = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
          setPaymentInfo({
            upiId: 'showtix@upi',
            merchantName: 'ShowTix',
            transactionReference: txnRef
          });
        }
      } finally {
        if (isMounted && !isPolling) {
          setIsLoading(false);
        }
      }
    };

    fetchUpiSettings();

    // Set up real-time listener for UPI settings changes
    const subscription = supabase
      .channel('upi_payment_settings_changes')
      .on('postgres_changes', { 
        event: '*',
        schema: 'public', 
        table: 'upi_payment_settings' 
      }, () => {
        if (isMounted) {
          fetchUpiSettings(true);
        }
      })
      .subscribe();

    // Polling fallback
    const pollingInterval = setInterval(() => {
      if (isMounted) {
        fetchUpiSettings(true);
      }
    }, 10000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, [bookingAmount]);

  const generateQrCode = async () => {
    if (!paymentInfo || !bookingAmount) {
      throw new Error('Payment info or amount not available');
    }

    try {
      // Generate UPI deep link
      const upiLink = `upi://pay?pa=${paymentInfo.upiId}&pn=${encodeURIComponent(paymentInfo.merchantName)}&am=${bookingAmount}&tr=${paymentInfo.transactionReference}&cu=INR`;

      // Generate QR code URL using a QR code service
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

      return {
        qrCodeUrl,
        upiLink,
        ...paymentInfo
      } as UpiPaymentInfo & { qrCodeUrl: string; upiLink: string };
    } catch (err) {
      console.error('Error generating QR code:', err);
      throw new Error('Failed to generate QR code');
    }
  };

  return {
    paymentInfo,
    isLoading,
    error,
    generateQrCode
  };
}

