import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Ticket, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  User,
  Armchair,
  QrCode,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/date';
import { Skeleton } from '@/components/ui/skeleton';
import QRCode from 'qrcode';

interface BookingDetails {
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
  event_title: string;
  event_date: string;
  event_venue: string;
  event_city: string;
  payment?: {
    id: string;
    payment_method: string;
    created_at: string;
  };
}

const TicketsPage = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  
  // Fetch booking details
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        toast.error('Invalid Booking ID');
        navigate('/');
        return;
      }
      
      if (!user) {
        toast.error('Please sign in to view your tickets');
        navigate('/login', { state: { returnUrl: `/tickets/${bookingId}` } });
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch booking with details and payment info
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            payment: payments(id, payment_method, created_at)
          `)
          .eq('id', bookingId)
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .single();
          
        if (error) {
          console.error('Error fetching booking:', error);
          throw new Error('Failed to fetch ticket details');
        }
        
        if (!data) {
          toast.error('Booking Not Found', {
            description: 'This booking does not exist or has not been confirmed.'
          });
          navigate('/');
          return;
        }
        
        setBooking(data);
        
        // Generate QR code
        setIsQrLoading(true);
        try {
          const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
            booking_id: data.id,
            event_id: data.event_id,
            user_id: data.user_id,
            seats: data.seats,
            date: data.event_date
          }));
          setQrCode(qrCodeDataUrl);
        } catch (qrError) {
          console.error('Failed to generate QR code:', qrError);
        } finally {
          setIsQrLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to fetch ticket details');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBooking();
  }, [bookingId, user, navigate]);
  
  // Download ticket
  const downloadTicket = () => {
    // In a real app, this would generate and download a PDF ticket
    toast.info('Download functionality is not implemented in this demo', {
      description: 'This would download a PDF ticket in a production environment'
    });
  };
  
  // Share ticket
  const shareTicket = async () => {
    if (!booking) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tickets for ${booking.event_title}`,
          text: `Check out my tickets for ${booking.event_title} on ${formatDate(booking.event_date)}!`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast.error('Failed to share tickets');
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      } catch (error) {
        console.error('Failed to copy:', error);
        toast.error('Failed to copy link');
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-12 w-64 mb-8" />
            <Skeleton className="h-96 w-full mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Tickets Not Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find the tickets you're looking for.</p>
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
        <div className="max-w-3xl mx-auto">
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
          
          {/* Ticket details */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              <span>Your Tickets</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Booking Confirmation: #{booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          
          <Card className="overflow-hidden mb-8">
            {/* Ticket header */}
            <div className="bg-gradient-to-r from-primary to-primary/70 p-6 text-white">
              <h2 className="text-xl font-bold">{booking.event_title}</h2>
              
              <div className="mt-3 space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{formatDate(booking.event_date)}</span>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{formatDate(booking.event_date, 'h:mm a')}</span>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{booking.event_venue}, {booking.event_city}</span>
                </div>
              </div>
            </div>
            
            {/* Ticket body */}
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Left column - Ticket info */}
                <div className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Ticket Holder</h3>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{user?.email || ''}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Ticket Type</h3>
                      <div className="font-medium">{booking.category_name}</div>
                    </div>
                    
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Seats</h3>
                      <div className="flex flex-wrap gap-2">
                        {booking.seats.map(seat => (
                          <div 
                            key={seat} 
                            className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm"
                          >
                            <Armchair className="h-3 w-3 mr-1 text-gray-500" />
                            {seat}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Payment Information</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount Paid:</span>
                          <span className="font-medium">₹{booking.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Method:</span>
                          <span>{booking.payment?.payment_method?.toUpperCase() || 'UPI'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Date:</span>
                          <span>{formatDate(booking.payment?.created_at || booking.booking_date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right column - QR code */}
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white border rounded-lg shadow-sm">
                    {isQrLoading ? (
                      <div className="w-40 h-40 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : qrCode ? (
                      <img 
                        src={qrCode} 
                        alt="Ticket QR Code" 
                        className="w-40 h-40 object-contain"
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center bg-gray-100">
                        <QrCode className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Present this QR code at the venue
                  </p>
                </div>
              </div>
              
              <div className="mt-8 border-t pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={downloadTicket}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Tickets
                  </Button>
                  <Button
                    onClick={shareTicket}
                    variant="outline"
                    className="flex-1"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Tickets
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Important information */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span>Important Information</span>
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 pl-2">
              <li>Please arrive at least 30 minutes before the event starts.</li>
              <li>Screenshot or print this ticket for faster entry.</li>
              <li>Original ID proof may be required at the venue.</li>
              <li>Outside food and beverages are not allowed inside the venue.</li>
              <li>This ticket is non-transferable and non-refundable.</li>
            </ul>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TicketsPage; 