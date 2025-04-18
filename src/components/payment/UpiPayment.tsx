
import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UpiPaymentProps } from './types';
import PaymentErrorState from './PaymentErrorState';
import UpiPaymentView from './UpiPaymentView';
import UtrVerification from './UtrVerification';
import PaymentLoader from './PaymentLoader';
import PaymentMethodTabs from './PaymentMethodTabs';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { db } from '@/integrations/supabase/client';

const UpiPayment = ({ amount, reference, onComplete }: UpiPaymentProps) => {
  const [isManualFetch, setIsManualFetch] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 minutes countdown
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'manual'>('upi');
  const [savedUtrNumber, setSavedUtrNumber] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const isMobile = useIsMobile();
  
  // Use the payment settings hook with retry control
  const { 
    paymentSettings, 
    isLoading, 
    error, 
    refreshPaymentSettings 
  } = usePaymentSettings();
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Handle countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      toast.error('Payment time expired. Please try again.');
      return;
    }
    
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown]);
  
  // Try to retrieve saved UTR from localStorage
  useEffect(() => {
    const savedUtr = localStorage.getItem('lastUtrNumber');
    if (savedUtr) {
      setSavedUtrNumber(savedUtr);
    }
  }, []);
  
  const refreshPaymentInfo = async () => {
    setIsManualFetch(true);
    setRetryCount(prev => prev + 1);
    toast.info('Refreshing payment information...');
    
    try {
      const success = await refreshPaymentSettings();
      
      if (!success) {
        toast.error('Failed to refresh payment information');
      } else {
        toast.success('Payment information refreshed');
      }
    } catch (error) {
      console.error('Error refreshing payment settings:', error);
      toast.error('Failed to refresh payment information. Please try again.');
    } finally {
      setIsManualFetch(false);
    }
  };
  
  const verifyUtrAndComplete = async (utrNumber: string) => {
    if (!utrNumber.trim()) {
      toast.error('Please enter a valid UTR number');
      return;
    }
    
    toast.info('Verifying payment...');
    
    try {
      // Save UTR to localStorage for future reference
      localStorage.setItem('lastUtrNumber', utrNumber);
      
      // Verify payment with Supabase
      const { data, error } = await db.payments().insert({
        utr_number: utrNumber,
        amount,
        reference,
        status: 'completed',
        payment_method: 'upi',
        created_at: new Date().toISOString()
      }).select().single();
      
      if (error) throw error;
      
      toast.success('Payment verified successfully!');
      onComplete();
    } catch (error) {
      console.error('Payment verification failed:', error);
      toast.error('Payment verification failed. Please try again.');
    }
  };
  
  if (isLoading && !isManualFetch) {
    return <PaymentLoader />;
  }
  
  // If payment settings are not properly configured, show a refresh option
  if (!paymentSettings || !paymentSettings.upi_id) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="bg-amber-50 border-b border-amber-100">
          <CardTitle className="text-amber-800">Payment Configuration Issue</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>
              The payment system configuration could not be loaded. This might be a temporary issue.
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center">
            <Button 
              onClick={refreshPaymentInfo}
              variant="outline"
              className="mt-4"
              disabled={isManualFetch}
            >
              {isManualFetch ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Payment Information
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const upiLink = `upi://pay?pa=${encodeURIComponent(paymentSettings.upi_id)}&pn=ShowTix&am=${amount}&cu=INR&tn=${reference}`;
  
  return (
    <Card className={`bg-white shadow-lg overflow-hidden border-0 ${isMobile ? 'max-w-full' : 'max-w-3xl mx-auto'}`}>
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardTitle className="text-xl">Complete Your Payment</CardTitle>
        <p className="text-white/80 mt-1">
          Time remaining: <span className="font-semibold">{formatTime(countdown)}</span>
        </p>
        <div className="bg-white/20 backdrop-blur-sm rounded-full py-1 px-3 text-white mt-2">
          <span className="text-sm">Order ID: #{reference.slice(-8)}</span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription className="flex items-center justify-between">
              <span>Error loading payment details. Please try refreshing.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshPaymentInfo}
                className="ml-2"
                disabled={isManualFetch}
              >
                {isManualFetch ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <PaymentMethodTabs
          defaultValue="upi"
          onValueChange={(value) => setPaymentMethod(value as 'upi' | 'manual')}
          upiContent={
            <UpiPaymentView 
              paymentSettings={paymentSettings}
              amount={amount}
              reference={reference}
              upiLink={upiLink}
              onContinue={() => setPaymentMethod('manual')}
            />
          }
          manualContent={
            <UtrVerification 
              amount={amount}
              upiId={paymentSettings.upi_id}
              countdown={countdown}
              onVerify={verifyUtrAndComplete}
              savedUtrNumber={savedUtrNumber}
            />
          }
        />
      </CardContent>
      
      <CardFooter className="flex flex-col gap-4">
        {paymentMethod === 'manual' ? (
          <p className="text-xs text-center text-gray-500">
            By verifying your UTR, you confirm that you've made the payment of ₹{amount.toLocaleString()} to the UPI ID {paymentSettings.upi_id}.
          </p>
        ) : (
          <Button 
            onClick={() => setPaymentMethod('manual')}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            I've Completed the Payment
          </Button>
        )}
        
        <p className="text-xs text-center text-gray-500">
          By clicking this button, you confirm that you've made the payment of ₹{amount.toLocaleString()} to the UPI ID {paymentSettings.upi_id}.
        </p>
      </CardFooter>
    </Card>
  );
};

export default UpiPayment;
