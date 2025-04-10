import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Download, ArrowLeft, Eye, Ticket, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase, db } from '@/integrations/supabase/client';

interface BookingData {
  id: string;
  user_id: string;
  event_id: string;
  booking_date: string;
  status: string;
  total_amount: number;
  seats: string[];
  ticket_count: number;
  category: string;
}

interface EventData {
  id: string;
  title: string;
  venue: string;
  date: string;
  city: string;
  image_url?: string;
  category?: string;
  description?: string;
}

const BookingConfirmation = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Generate a unique booking reference
  const bookingRef = booking?.id.slice(0, 8).toUpperCase() || '';
  const bookingDate = booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString() : '';

  // Add a console log to track component mounting
  useEffect(() => {
    console.log('BookingConfirmation component mounted with bookingId:', bookingId);
    
    // If no booking ID is provided, redirect to home
    if (!bookingId) {
      navigate('/');
      return;
    }
  }, [bookingId, navigate]);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) {
        console.error('No booking ID provided');
        setError('No booking ID provided');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // First try to get booking from Supabase
        let bookingData: BookingData | null = null;
        
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
          
          if (!error && data) {
            bookingData = data as BookingData;
          }
        } catch (e) {
          console.warn('Could not fetch booking from Supabase:', e);
        }
        
        // If not found in Supabase, try localStorage
        if (!bookingData) {
          const localBooking = localStorage.getItem(`booking-${bookingId}`);
          if (localBooking) {
            bookingData = JSON.parse(localBooking);
          }
        }
        
        // If still no booking data, redirect to home
        if (!bookingData) {
          setError('Booking not found');
          setIsLoading(false);
          navigate('/');
          return;
        }
        
        setBooking(bookingData);
        
        // Fetch event details
        let eventData: EventData | null = null;
        
        try {
          const { data, error } = await db.events()
            .select('*')
            .eq('id', bookingData.event_id)
            .single();
          
          if (!error && data) {
            eventData = data as EventData;
          }
        } catch (e) {
          console.warn('Could not fetch event from Supabase:', e);
        }
        
        // If event not found, create a fallback
        if (!eventData) {
          eventData = {
            id: bookingData.event_id,
            title: 'Event Details Not Available',
            venue: 'Venue Not Available',
            date: new Date().toISOString(),
            city: 'City Not Available'
          };
        }
        
        setEvent(eventData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load booking details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [bookingId, navigate]);
  
  const handleDownloadTicket = () => {
    try {
      // Create ticket HTML content
      const ticketHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${bookingRef}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .ticket { max-width: 800px; margin: 0 auto; border: 1px solid #ccc; border-radius: 10px; overflow: hidden; }
            .ticket-header { background: #f44336; color: white; padding: 20px; text-align: center; }
            .ticket-body { padding: 20px; }
            .ticket-info { display: flex; margin-bottom: 20px; }
            .ticket-info-item { flex: 1; padding: 10px; }
            .ticket-footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
            .label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .value { font-weight: bold; }
            .qr-code { text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="ticket-header">
              <h1>BookMyShow</h1>
              <p>E-Ticket</p>
            </div>
            <div class="ticket-body">
              <h2>${event?.title || 'Event'}</h2>
              <div class="ticket-info">
                <div class="ticket-info-item">
                  <div class="label">Booking Reference</div>
                  <div class="value">${bookingRef}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="label">Date</div>
                  <div class="value">${event?.date ? new Date(event.date).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="label">Venue</div>
                  <div class="value">${event?.venue || 'N/A'}, ${event?.city || 'N/A'}</div>
                </div>
              </div>
              <div class="ticket-info">
                <div class="ticket-info-item">
                  <div class="label">Category</div>
                  <div class="value">${booking?.category?.toUpperCase() || 'N/A'}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="label">Seats</div>
                  <div class="value">${booking?.seats?.join(', ') || 'N/A'}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="label">Amount Paid</div>
                  <div class="value">₹${booking?.total_amount?.toLocaleString() || 'N/A'}</div>
                </div>
              </div>
              <div class="qr-code">
                <!-- QR Code would be here in a real implementation -->
                <div style="width: 150px; height: 150px; background: #eee; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                  QR Code
                </div>
                <p>Scan this QR code at the venue</p>
              </div>
            </div>
            <div class="ticket-footer">
              <p>Booking Date: ${bookingDate}</p>
              <p>This is a digital ticket. Please show this at the venue entrance.</p>
              <p>For any assistance, contact support@bookmyshow.com</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Create a blob and download
      const blob = new Blob([ticketHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${bookingRef}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Ticket downloaded successfully');
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error('Failed to download ticket');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg">Loading booking details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!booking || !event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
            <p className="text-gray-600 mb-6">The booking details could not be found.</p>
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
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Home</span>
          </button>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">Your booking has been confirmed. You can download your ticket below.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-primary text-white p-6">
                <h2 className="text-2xl font-bold">E-Ticket</h2>
                <p className="text-sm opacity-80">Booking Reference: {bookingRef}</p>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">{event.title}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-gray-600 text-sm">Date</p>
                      <p className="font-medium">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-gray-600 text-sm">Time</p>
                      <p className="font-medium">
                        {new Date(event.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-gray-600 text-sm">Venue</p>
                      <p className="font-medium">{event.venue}, {event.city}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-b py-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Category</p>
                      <p className="font-medium capitalize">{booking.category}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 text-sm">Seats</p>
                      <p className="font-medium">{booking.seats.join(', ')}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 text-sm">Amount Paid</p>
                      <p className="font-medium text-primary">₹{booking.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center mb-6">
                  <div className="text-center">
                    <div className="bg-white p-2 border rounded-lg inline-block mb-2">
                      <QRCodeSVG 
                        value={`BOOKING:${bookingRef}|EVENT:${event.id}|SEATS:${booking.seats.join(',')}`}
                        size={150}
                        level="H"
                      />
                    </div>
                    <p className="text-sm text-gray-600">Scan this QR code at the venue</p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    onClick={handleDownloadTicket}
                    className="flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Ticket
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Booking Information</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-sm">Booking Reference</p>
                  <p className="font-medium">{bookingRef}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Booking Date</p>
                  <p className="font-medium">{bookingDate}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <p className="font-medium text-green-600">Confirmed</p>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Important Information</h3>
                  <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
                    <li>Please arrive at least 30 minutes before the event.</li>
                    <li>Carry a valid ID proof along with your e-ticket.</li>
                    <li>Outside food and beverages are not allowed.</li>
                    <li>Photography and videography may be restricted.</li>
                  </ul>
                </div>
                
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/my-bookings')}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View All Bookings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BookingConfirmation;
