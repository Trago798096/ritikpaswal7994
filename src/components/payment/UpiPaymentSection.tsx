import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Copy, RefreshCw, Smartphone, CheckCircle } from 'lucide-react';

interface UpiPaymentSectionProps {
  amount: number;
  bookingId: string;
  onPaymentInitiated: () => void;
}

const UpiPaymentSection: React.FC<UpiPaymentSectionProps> = ({
  amount,
  bookingId,
  onPaymentInitiated
}) => {
  const [upiId, setUpiId] = useState('showtix@upi');
  const [merchantName, setMerchantName] = useState('ShowTix');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch the latest UPI settings directly from the database
  const fetchLatestUpiSettings = async () => {
    try {
      setIsRefreshing(true);
      console.log('Directly fetching latest UPI settings from database');
      
      const { data, error } = await supabase
        .from('upi_payment_settings')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error fetching latest UPI settings:', error);
        toast.error('Could not fetch payment settings');
        return false;
      }
      
      if (data && data.length > 0) {
        console.log('Got latest UPI settings directly from DB:', data[0]);
        // Always use the latest settings from the database
        setUpiId(data[0].upi_id || 'showtix@upi');
        setMerchantName(data[0].merchant_name || 'ShowTix');
        return true;
      } else {
        // Fallback to default settings
        console.log('No UPI settings found, using defaults');
        setUpiId('showtix@upi');
        setMerchantName('ShowTix');
        return false;
      }
    } catch (err) {
      console.error('Error in direct UPI settings fetch:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Generate QR code for UPI payment
  const generateQrCode = () => {
    try {
      setIsLoading(true);
      
      // Generate transaction reference - format similar to BookMyShow
      const txnRef = `BMST${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000)}`;
      
      // Format amount with 2 decimal places
      const formattedAmount = parseFloat(amount.toString()).toFixed(2);
      
      // Generate UPI payment string with all required parameters
      const upiPaymentString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${formattedAmount}&cu=INR&tn=Booking-${bookingId.substring(0, 8)}&tr=${txnRef}&mc=5734&url=https://bookmyshow.com`;
      
      // Generate QR code using QR Server API with error correction
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=M&data=${encodeURIComponent(upiPaymentString)}`;
      console.log('Generated QR URL:', qrUrl);
      
      // Save QR URL to state
      setQrCodeUrl(qrUrl);
      
      // Also try to save the QR URL to the database for future reference
      try {
        supabase
          .from('upi_payment_settings')
          .update({ qr_code_url: qrUrl })
          .eq('upi_id', upiId)
          .then(result => {
            if (result.error) {
              console.warn('Could not save QR URL to database:', result.error);
            }
          });
      } catch (dbErr) {
        console.warn('Error saving QR to database:', dbErr);
      }
      
      // Save transaction reference for verification
      localStorage.setItem(`txn-ref-${bookingId}`, txnRef);
      console.log('UPI Payment link generated with transaction reference:', txnRef);
      
      // Notify parent component that payment is initiated
      onPaymentInitiated();
      return true;
    } catch (err) {
      console.error('Error generating QR code:', err);
      toast.error('Failed to generate QR code. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle copy UPI ID to clipboard
  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    toast.success('UPI ID copied to clipboard');
  };
  
  // Handle refresh and generate QR code
  const handleRefreshAndGenerate = async () => {
    const settingsUpdated = await fetchLatestUpiSettings();
    if (settingsUpdated) {
      setTimeout(() => {
        generateQrCode();
      }, 500); // Small delay to ensure state is updated
    } else {
      generateQrCode();
    }
  };
  
  // Fetch UPI settings on component mount
  useEffect(() => {
    fetchLatestUpiSettings().then(success => {
      if (success) {
        generateQrCode();
      }
    });
    
    // Set up polling to keep checking for updates
    const intervalId = setInterval(() => {
      fetchLatestUpiSettings();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="border rounded-lg bg-white shadow-md">
      <div className="flex items-center p-4 border-b bg-red-50">
        <Smartphone className="h-6 w-6 mr-3 text-red-600" />
        <h3 className="font-medium text-lg">UPI Payment</h3>
        <div className="ml-auto flex space-x-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png" alt="UPI" className="h-8" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/2560px-Paytm_Logo_%28standalone%29.svg.png" alt="Paytm" className="h-8" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/2560px-Google_Pay_Logo.svg.png" alt="Google Pay" className="h-8" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" alt="PhonePe" className="h-8" />
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* QR Code */}
          <div className="flex-1 flex flex-col items-center">
            <div className="mb-3 text-center">
              <h4 className="font-semibold text-gray-700 mb-1">Scan & Pay ₹{amount.toFixed(2)}</h4>
              <p className="text-sm text-gray-500">Use any UPI app to scan</p>
            </div>
            
            {qrCodeUrl ? (
              <div className="border-2 border-red-500 rounded-lg p-3 bg-white mb-3 relative">
                <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3">
                  <div className="bg-red-600 text-white text-xs rounded-full p-1 flex items-center justify-center" style={{width: '40px', height: '40px'}}>
                    <span>UPI</span>
                  </div>
                </div>
                <img 
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="w-full max-w-[250px] h-auto"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=M&data=upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${parseFloat(amount.toString()).toFixed(2)}`;
                  }}
                />
                <div className="mt-2 flex justify-center">
                  <Button
                    onClick={handleRefreshAndGenerate}
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-500 text-red-500 hover:bg-red-50"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh QR
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 w-full max-w-[250px] mb-3">
                <QrCode className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-500 text-center mb-3">
                  QR code not available
                </p>
                <Button
                  onClick={handleRefreshAndGenerate}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                  disabled={isLoading}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>100% Secure Payments</span>
            </div>
          </div>
          
          {/* UPI ID */}
          <div className="flex-1">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="bg-red-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center mr-2 text-xs">1</span>
                Pay using UPI ID
              </h4>
              
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden mb-4 bg-white">
                <div className="flex-1 px-4 py-3 text-sm font-medium text-gray-800">
                  {upiId}
                </div>
                <button
                  onClick={handleCopyUpiId}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <Copy className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p><span className="font-medium">Amount:</span> ₹{parseFloat(amount.toString()).toFixed(2)}</p>
                <p><span className="font-medium">Merchant:</span> {merchantName}</p>
              </div>
            </div>
            
            <Button 
              onClick={handleRefreshAndGenerate} 
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={isLoading || isRefreshing}
            >
              {isLoading || isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Refresh & Generate QR
                </>
              )}
            </Button>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <h5 className="text-sm font-medium text-blue-800 mb-1">Payment Instructions:</h5>
              <ol className="text-xs text-blue-700 list-decimal pl-4 space-y-1">
                <li>Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                <li>Scan the QR code or use the UPI ID above</li>
                <li>Enter amount ₹{parseFloat(amount.toString()).toFixed(2)} if not auto-filled</li>
                <li>Complete the payment and note down UTR/Reference number</li>
                <li>Enter the UTR number for verification</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentSection;
