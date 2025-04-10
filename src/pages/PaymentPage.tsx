import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Ticket,
  Smartphone,
  CreditCard,
  IndianRupee,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/date';

interface BookingData {
  id: string;
  user_id: string;
  event_id: string;
  booking_date: string;
  status: string;
  total_amount: number;
  seats: string[];
  ticket_count: number;
  category_id: string;
  category_name: string;
  expires_at: string;
  lock_id: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  event_city: string;
}

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: Record<string, any>;
  created_at: string;
}

interface UPIDetails {
  upiId: string;
  name: string;
}

const PaymentPage = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi');
  const [upiDetails, setUpiDetails] = useState<UPIDetails>({ upiId: '', name: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isExpired, setIsExpired] = useState(false);
  
  // Fetch booking data
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        toast.error('Invalid Booking ID');
        navigate('/');
        return;
      }
      
      if (!user) {
        toast.error('Please sign in to access your booking');
        navigate('/login', { state: { returnUrl: `/payment/${bookingId}` } });
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch booking with details
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          throw new Error('Failed to fetch booking details');
        }
        
        if (!data) {
          toast.error('Booking not found or access denied');
          navigate('/');
          return;
        }
        
        // Check if booking has already been paid for
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('status', 'completed')
          .single();
          
        if (paymentData) {
          // Booking already paid
          setIsSuccess(true);
          setBooking(data);
          return;
        }
        
        // Check if booking has expired
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          setIsExpired(true);
          // Release locked seats if booking expired
          const releaseLocks = async () => {
            try {
              const { error } = await supabase.rpc('release_seat_lock', { p_lock_id: data.lock_id });
              if (error) {
                console.error('Failed to release seat lock:', error);
              } else {
                console.log('Seat locks released successfully');
              }
            } catch (error) {
              console.error('Failed to invoke release_seat_lock:', error);
            }
          };
          
          releaseLocks();
        } else {
          // Calculate time left
          const diffMs = expiresAt.getTime() - new Date().getTime();
          const diffSecs = Math.floor(diffMs / 1000);
          setTimeLeft(diffSecs > 0 ? diffSecs : 0);
        }
        
        setBooking(data);
      } catch (error) {
        console.error('Error fetching booking:', error);
        toast.error('Failed to fetch booking details');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBooking();
  }, [bookingId, user, navigate]);
  
  // Timer for booking expiration
  useEffect(() => {
    if (!isLoading && !isExpired && !isSuccess && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 11) {
            // Play warning sound when timer is about to expire
            try {
              new Audio('/assets/beep.mp3').play().catch(() => {});
            } catch (e) {}
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isExpired && !isSuccess) {
      setIsExpired(true);
      toast.error('Payment time expired', {
        description: 'Your booking session has expired',
        icon: <Clock className="text-red-500" />
      });
      
      // Release locked seats
      if (booking?.lock_id) {
        const releaseLocks = async () => {
          try {
            const { error } = await supabase.rpc('release_seat_lock', { p_lock_id: booking.lock_id });
            if (error) {
              console.error('Failed to release seat lock:', error);
            } else {
              console.log('Seat locks released successfully');
            }
          } catch (error) {
            console.error('Failed to invoke release_seat_lock:', error);
          }
        };
        
        releaseLocks();
      }
    }
  }, [timeLeft, isLoading, isExpired, isSuccess, booking?.lock_id]);
  
  // Handle UPI input changes
  const handleUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpiDetails(prev => ({ ...prev, [name]: value }));
  };
  
  // Process UPI payment
  const processUpiPayment = async () => {
    if (!booking) return;
    
    if (!upiDetails.upiId.trim() || !upiDetails.name.trim()) {
      toast.error('Please fill in all UPI payment details');
      return;
    }
    
    // Validate UPI ID format
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiPattern.test(upiDetails.upiId)) {
      toast.error('Invalid UPI ID format', {
        description: 'Please enter a valid UPI ID (e.g., name@upi)'
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Generate a unique payment ID
      const paymentId = crypto.randomUUID();
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            id: paymentId,
            booking_id: booking.id,
            amount: booking.total_amount,
            status: 'completed',
            payment_method: 'upi',
            payment_details: {
              upi_id: upiDetails.upiId,
              name: upiDetails.name,
              transaction_id: `UPI${Date.now()}`
            },
          }
        ]);
      
      if (paymentError) {
        throw new Error('Failed to record payment');
      }
      
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);
      
      if (bookingError) {
        throw new Error('Failed to update booking status');
      }
      
      // Convert locked seats to booked seats
      const { error: seatError } = await supabase.rpc('confirm_booked_seats', {
        p_event_id: booking.event_id,
        p_lock_id: booking.lock_id,
        p_user_id: user?.id
      });
      
      if (seatError) {
        console.error('Failed to confirm booked seats:', seatError);
        // Don't throw here to continue with successful payment flow
      }
      
      toast.success('Payment successful!', {
        description: 'Your tickets have been confirmed',
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Payment Failed', {
        description: error.message || 'Please try again',
        icon: <AlertTriangle className="text-red-500" />
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Process credit card payment
  const processCreditCardPayment = async () => {
    toast.info('Credit card payments are not yet supported', {
      description: 'Please use UPI payment method',
      icon: <AlertTriangle />
    });
  };
  
  // View tickets after successful payment
  const viewTickets = () => {
    navigate(`/tickets/${booking?.id}`);
  };
  
  // Return to events if payment cancelled
  const cancelPayment = async () => {
    if (booking?.lock_id) {
      try {
        // Release seats lock
        const { error } = await supabase.rpc('release_seat_lock', { p_lock_id: booking.lock_id });
        if (error) {
          console.error('Failed to release seat lock:', error);
        }
        
        // Delete booking
        await supabase
          .from('bookings')
          .delete()
          .eq('id', booking.id);
      } catch (error) {
        console.error('Failed to cancel booking:', error);
      }
    }
    
    toast.info('Booking cancelled', {
      description: 'Your seats have been released'
    });
    
    navigate(`/event/${booking?.event_id}`);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Skeleton className="h-64 w-full mb-6" />
              </div>
              <div>
                <Skeleton className="h-60 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find the booking you're looking for.</p>
            <Button onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <div className="mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Back</span>
            </button>
          </div>
          
          {/* Page title */}
          <h1 className="text-2xl font-bold mb-8">
            {isSuccess ? 'Payment Successful' : isExpired ? 'Booking Expired' : 'Complete Your Payment'}
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left column - Payment methods or success message */}
            <div className="md:col-span-2">
              {isSuccess ? (
                <Card className="p-8 bg-white rounded-lg">
                  <div className="text-center">
                    <div className="bg-green-100 rounded-full p-4 inline-flex mb-4">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful!</h2>
                    <p className="text-gray-600 mb-8">
                      Thank you for your purchase. Your tickets have been confirmed.
                    </p>
                    
                    <div className="flex justify-center space-x-4">
                      <Button onClick={viewTickets} className="px-6">
                        <Ticket className="h-4 w-4 mr-2" />
                        View Tickets
                      </Button>
                      
                      <Button onClick={() => navigate('/')} variant="outline" className="px-6">
                        Browse More Events
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : isExpired ? (
                <Card className="p-8 bg-white rounded-lg">
                  <div className="text-center">
                    <div className="bg-red-100 rounded-full p-4 inline-flex mb-4">
                      <Clock className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Booking Expired</h2>
                    <p className="text-gray-600 mb-8">
                      Your booking session has expired. The selected seats have been released.
                    </p>
                    
                    <Button onClick={() => navigate(`/book/${booking.event_id}`)} className="px-6">
                      Try Booking Again
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 bg-white rounded-lg">
                  {/* Timer */}
                  <div className="flex items-center mb-6 text-red-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      Complete payment before: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  
                  <Tabs defaultValue="upi" onValueChange={setSelectedPaymentMethod}>
                    <TabsList className="mb-6">
                      <TabsTrigger value="upi" className="flex items-center">
                        <Smartphone className="h-4 w-4 mr-2" />
                        UPI Payment
                      </TabsTrigger>
                      <TabsTrigger value="card" className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Credit/Debit Card
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upi" className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-6">
                          UPI is a real-time payment system that enables person-to-person and person-to-merchant transactions instantly.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-1">
                              UPI ID
                            </label>
                            <Input
                              id="upiId"
                              name="upiId"
                              type="text"
                              placeholder="yourname@upi"
                              value={upiDetails.upiId}
                              onChange={handleUpiChange}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <Input
                              id="name"
                              name="name"
                              type="text"
                              placeholder="Your full name"
                              value={upiDetails.name}
                              onChange={handleUpiChange}
                              className="w-full"
                            />
                          </div>
                          
                          <Alert className="bg-blue-50 border-blue-100">
                            <AlertDescription className="text-blue-800">
                              This is a demo application. No actual payment will be processed.
                            </AlertDescription>
                          </Alert>
                          
                          <Button 
                            onClick={processUpiPayment}
                            className="w-full py-6"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                Pay ₹{booking.total_amount.toLocaleString()}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="card" className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-6">
                          Pay securely using your credit or debit card.
                        </p>
                        
                        <div className="bg-gray-50 p-8 rounded text-center">
                          <CreditCard className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600">
                            Credit and debit card processing isn't available in the demo. Please use UPI payment.
                          </p>
                        </div>
                        
                        <Button 
                          onClick={processCreditCardPayment}
                          className="w-full mt-6"
                          disabled={true}
                        >
                          Credit/Debit Card Payment
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="mt-6 border-t pt-4">
                    <Button 
                      variant="ghost" 
                      className="text-gray-500 w-full" 
                      onClick={cancelPayment}
                    >
                      Cancel Payment
                    </Button>
                  </div>
                </Card>
              )}
            </div>
            
            {/* Right column - Order summary */}
            <div>
              <Card className="p-6 bg-white rounded-lg sticky top-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 pb-4 border-b">
                    <div className="w-16 h-16 rounded-md bg-gray-200 overflow-hidden flex-shrink-0">
                      {booking.event_id && (
                        <img 
                          src={`https://source.unsplash.com/random/?event,${booking.event_id}`} 
                          alt={booking.event_title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-medium">{booking.event_title}</h3>
                      <div className="flex gap-2 text-sm text-gray-600 mt-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(booking.event_date)}</span>
                      </div>
                      <div className="flex gap-2 text-sm text-gray-600 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{booking.event_venue}, {booking.event_city}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Category</span>
                      <span>{booking.category_name}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tickets</span>
                      <span>{booking.ticket_count}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Seats</span>
                      <span>{booking.seats.join(', ')}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <div className="flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        <span>{booking.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isSuccess && (
                    <div className="mt-4 p-3 bg-green-50 rounded-md text-center">
                      <p className="text-green-700 text-sm font-medium">
                        Payment Complete
                      </p>
                    </div>
                  )}
                  
                  {isExpired && (
                    <div className="mt-4 p-3 bg-red-50 rounded-md text-center">
                      <p className="text-red-700 text-sm font-medium">
                        Booking Expired
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PaymentPage;
