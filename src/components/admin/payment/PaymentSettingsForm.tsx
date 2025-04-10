
import { useState, useEffect } from 'react';
import { uploadFile } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UpiSettingsTab from './UpiSettingsTab';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { usePaymentSettings, PaymentSettings } from '@/hooks/usePaymentSettings';
import { useUpiSettings, UpiSettings } from '@/hooks/useUpiSettings';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PaymentSettingsForm = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upi');

  // Use our updated payment settings hook for backward compatibility
  const { 
    paymentSettings, 
    isLoading: isLoadingPaymentSettings, 
    error: paymentSettingsError,
    isUpdating: isUpdatingPaymentSettings, 
    updateSettings: updateGeneralSettings, 
    refreshPaymentSettings 
  } = usePaymentSettings();
  
  // Use our new UPI settings hook for enhanced UPI functionality
  const {
    upiSettings,
    isLoading: isLoadingUpiSettings,
    isUpdating: isUpdatingUpiSettings,
    error: upiSettingsError,
    updateUpiSettings,
    fetchUpiSettings
  } = useUpiSettings();
  
  // Combined loading and error states
  const isLoading = isLoadingPaymentSettings || isLoadingUpiSettings;
  const isUpdating = isUpdatingPaymentSettings || isUpdatingUpiSettings;
  const error = paymentSettingsError || upiSettingsError;
  
  // Payment settings state
  const [upiId, setUpiId] = useState('showtix@upi');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [merchantName, setMerchantName] = useState('ShowTix');
  const [displayName, setDisplayName] = useState('ShowTix Payments');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Please make the payment using any UPI app and enter the UTR number for verification.'
  );
  
  // Update local state when payment settings change
  useEffect(() => {
    // First priority: use dedicated UPI settings if available
    if (upiSettings) {
      console.log("Setting UPI ID from dedicated UPI settings:", upiSettings.upi_id);
      setUpiId(upiSettings.upi_id || 'showtix@upi');
      setQrCodeUrl(upiSettings.qr_code_url || '');
      setMerchantName(upiSettings.merchant_name || 'ShowTix');
      setDisplayName(upiSettings.display_name || 'ShowTix Payments');
    }
    // Fallback to legacy payment settings if no UPI settings available
    else if (paymentSettings) {
      console.log("Setting UPI ID from legacy payment settings:", paymentSettings.upi_id);
      setUpiId(paymentSettings.upi_id || 'showtix@upi');
      setQrCodeUrl(paymentSettings.qr_code_url || '');
      setPaymentInstructions(paymentSettings.payment_instructions || 'Please make the payment using any UPI app and enter the UTR number for verification.');
    }
  }, [paymentSettings, upiSettings]);
  
  const handleGenerateQR = async () => {
    try {
      if (!upiId.trim()) {
        toast.error('Please enter a UPI ID first');
        return '';
      }
      
      // Generate QR code URL for the UPI ID
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(
        upiId
      )}&pn=ShowTix&mc=0000&tn=Payment&am=0`;
      
      setQrCodeUrl(qrCodeApiUrl);
      toast.success('QR code generated');
      
      return qrCodeApiUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
      return '';
    }
  };
  
  const handleQrUpload = async (file: File) => {
    try {
      toast.info('Uploading QR code...');
      
      // Upload QR code image to Supabase Storage
      console.log('Uploading QR code image...');
      const result = await uploadFile(file, 'payment_assets', 'qr_codes');
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.url) {
        setQrCodeUrl(result.url);
        toast.success('QR code uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading QR code:', error);
      toast.error(error.message || 'Failed to upload QR code');
    }
  };
  
  const handleSaveSettings = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save settings');
      return;
    }
    
    if (!upiId.trim()) {
      toast.error('UPI ID cannot be empty');
      return;
    }
    
    if (!merchantName.trim()) {
      toast.error('Merchant name cannot be empty');
      return;
    }
    
    console.log("Saving UPI settings with ID:", upiId);
    
    try {
      toast.info('Saving payment settings...');
      
      // First, save to the dedicated UPI settings table
      const upiSettingsToSave: UpiSettings = {
        upi_id: upiId,
        merchant_name: merchantName,
        display_name: displayName,
        qr_code_url: qrCodeUrl,
        is_active: true
      };
      
      // Save to the new UPI settings table
      const upiResult = await updateUpiSettings(upiSettingsToSave);
      console.log('UPI settings update result:', upiResult);
      
      // Also save to the legacy payment settings for backward compatibility
      const legacySettingsToSave: PaymentSettings = {
        upi_id: upiId,
        qr_code_url: qrCodeUrl,
        payment_instructions: paymentInstructions,
        updated_by: user.id,
      };
      
      // Use our mutation from the general settings hook
      const legacyResult = await updateGeneralSettings(legacySettingsToSave);
      console.log('Legacy settings update result:', legacyResult);
      
      toast.success('Payment settings saved successfully');
      
      // Force refresh after updating to ensure we have the latest data
      setTimeout(() => {
        fetchUpiSettings();
        refreshPaymentSettings();
      }, 1000);
    } catch (error) {
      console.error('Error in handleSaveSettings:', error);
      toast.error('Failed to save payment settings');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {paymentSettingsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading payment settings. This may be due to database permissions. Please ensure you have the correct permissions.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="upi">UPI Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upi">
          <UpiSettingsTab
            upiId={upiId}
            qrCodeUrl={qrCodeUrl}
            merchantName={merchantName}
            displayName={displayName}
            onUpiIdChange={(value) => {
              console.log("UPI ID changed to:", value);
              setUpiId(value);
            }}
            onQrCodeUrlChange={setQrCodeUrl}
            onMerchantNameChange={setMerchantName}
            onDisplayNameChange={setDisplayName}
            onGenerateQR={handleGenerateQR}
            onQrUpload={handleQrUpload}
          />
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          onClick={handleSaveSettings}
          disabled={isUpdating || !upiId.trim()}
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              Saving...
            </>
          ) : (
            'Save Payment Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentSettingsForm;
