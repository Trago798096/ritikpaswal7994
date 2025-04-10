import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard, RefreshCw, Save } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PaymentSettings {
  id?: string;
  provider: string;
  api_key?: string;
  webhook_secret?: string;
  mode: string;
  upi_id?: string;
  merchant_name?: string;
}

const fetchPaymentSettings = async () => {
  try {
    console.log('Fetching payment settings...');
    
    // Check if payment_settings table exists
    const { data: tableExists } = await supabase
      .from('payment_settings')
      .select('id')
      .limit(1)
      .catch(() => ({ data: null }));
    
    if (tableExists === null) {
      // Create default payment settings
      const { error: createError } = await supabase
        .from('payment_settings')
        .insert([
          {
            provider: 'upi',
            mode: 'live',
            upi_id: 'example@upi',
            merchant_name: 'Book My Show'
          }
        ]);
      
      if (createError) {
        console.error('Error creating payment settings:', createError);
        return null;
      }
    }
    
    // Fetch the settings
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .single();
    
    if (error) {
      console.error('Error fetching payment settings:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in fetchPaymentSettings:', error);
    return null;
  }
};

const PaymentSettingsManager = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PaymentSettings>({
    provider: 'upi',
    mode: 'live',
    upi_id: '',
    merchant_name: ''
  });
  
  // Fetch payment settings
  const {
    data: paymentSettings,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['paymentSettings'],
    queryFn: fetchPaymentSettings,
  });
  
  // Update settings when data is loaded
  useEffect(() => {
    if (paymentSettings) {
      setSettings(paymentSettings);
    }
  }, [paymentSettings]);
  
  // Update payment settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: PaymentSettings) => {
      if (!updatedSettings.id) {
        // Create new settings if none exist
        const { data, error } = await supabase
          .from('payment_settings')
          .insert([updatedSettings])
          .select()
          .single();
        
        if (error) {
          console.error('Error creating payment settings:', error);
          throw error;
        }
        
        return data;
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('payment_settings')
          .update({
            ...updatedSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', updatedSettings.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating payment settings:', error);
          throw error;
        }
        
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Payment settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['paymentSettings'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update payment settings: ${error.message}`);
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settings);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
        <CardDescription>
          Configure your payment settings for the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="provider">Payment Provider</Label>
                  <Select
                    value={settings.provider}
                    onValueChange={(value) => handleSelectChange('provider', value)}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="razorpay">Razorpay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="mode">Mode</Label>
                  <Select
                    value={settings.mode}
                    onValueChange={(value) => handleSelectChange('mode', value)}
                  >
                    <SelectTrigger id="mode">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                {settings.provider === 'upi' && (
                  <>
                    <div>
                      <Label htmlFor="upi_id">UPI ID</Label>
                      <Input
                        id="upi_id"
                        name="upi_id"
                        value={settings.upi_id || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. yourname@upi"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="merchant_name">Merchant Name</Label>
                      <Input
                        id="merchant_name"
                        name="merchant_name"
                        value={settings.merchant_name || ''}
                        onChange={handleInputChange}
                        placeholder="Your business name"
                      />
                    </div>
                  </>
                )}
                
                {(settings.provider === 'stripe' || settings.provider === 'razorpay') && (
                  <>
                    <div>
                      <Label htmlFor="api_key">API Key</Label>
                      <Input
                        id="api_key"
                        name="api_key"
                        value={settings.api_key || ''}
                        onChange={handleInputChange}
                        type="password"
                        placeholder="Your API key"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="webhook_secret">Webhook Secret</Label>
                      <Input
                        id="webhook_secret"
                        name="webhook_secret"
                        value={settings.webhook_secret || ''}
                        onChange={handleInputChange}
                        type="password"
                        placeholder="Your webhook secret"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="bg-[#ff2366] hover:bg-[#e01f59] text-white"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSettingsManager;
