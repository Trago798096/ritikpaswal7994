import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SeatMap from '@/components/SeatMap';
import UserInfoForm from '@/components/booking/UserInfoForm';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Ticket, 
  ShoppingCart, 
  Loader2, 
  Clock, 
  MapPin, 
  Calendar 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/utils/date';

interface SeatCategory {
  id: string;
  name: string;
  price: number;
  description: string;
  color: string;
  available: boolean;
}

interface Event {
  id: string;
  title: string;
  category: string;
  date: string;
  venue: string;
  city: string;
  price_range: string;
  status: string;
  image_url: string;
  description?: string;
  seat_categories?: SeatCategory[];
}

interface UserInfoFormData {
  fullName: string;
  email: string;
  phone: string;
}

const BookingPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isProcessing, setIsProcessing] = useState(false);
  const [categories, setCategories] = useState<SeatCategory[]>([]);
  const [showUserInfoForm, setShowUserInfoForm] = useState(false);
  const [lockedSeatsInfo, setLockedSeatsInfo] = useState<{ lockId: string; seats: string[] } | null>(null);

  // Enhanced timer with visual and audio feedback
  useEffect(() => {
    if (!isLoading && timeLeft > 0) {
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
    } else if (timeLeft === 0) {
      toast.error("Session expired! Please start again.", {
        icon: <Clock className="text-red-500" />,
        duration: 3000
      });
      navigate(`/event/${eventId}`);
    }
  }, [timeLeft, navigate, eventId, isLoading]);

  // Fetch event details with more robust error handling
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        toast.error('Invalid Event ID', {
          description: 'No event identifier was provided.',
          icon: <AlertTriangle className="text-red-500" />
        });
        navigate('/');
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch event with seat categories
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            seat_categories(*)
          `)
          .eq('id', eventId)
          .single();
        
        if (error) {
          console.error('Event Fetch Error:', error);
          throw new Error(error.message || 'Failed to fetch event details');
        }
        
        if (!data) {
          toast.error('Event Not Found', {
            description: 'The requested event does not exist or has been removed.',
            icon: <AlertTriangle className="text-red-500" />
          });
          navigate('/');
          return;
        }
        
        // Set event data
        setEvent(data);
        
        // Set seat categories
        if (data.seat_categories && data.seat_categories.length > 0) {
          setCategories(data.seat_categories);
          setSelectedCategory(data.seat_categories[0].id);
        } else {
          toast.error('No Seat Categories', {
            description: 'This event does not have any seat categories defined.',
            icon: <AlertTriangle className="text-red-500" />
          });
        }
      } catch (error: any) {
        console.error('Comprehensive Event Fetch Error:', error);
        toast.error('Event Load Failed', {
          description: error.message || 'Unable to retrieve event details',
          icon: <AlertTriangle className="text-red-500" />
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId, navigate]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSeats([]);
    const categoryInfo = categories.find(c => c.id === categoryId);
    if (categoryInfo) {
      toast.info(`Selected ${categoryInfo.name} Category`, {
        description: `Price: ₹${categoryInfo.price.toLocaleString()}`
      });
    }
  };
  
  const handleTicketCountChange = (count: number) => {
    setTicketCount(count);
    if (selectedSeats.length > count) {
      // Unselect seats if ticket count is reduced
      setSelectedSeats(prev => prev.slice(0, count));
    }
    toast.info(`Ticket Count: ${count}`, {
      description: `You can select up to ${count} ${count === 1 ? 'seat' : 'seats'}`
    });
  };
  
  const handleSelectedSeatsChange = (seats: string[], totalPrice: number) => {
    setSelectedSeats(seats);
    setTotalAmount(totalPrice);
    
    if (seats.length > 0) {
      toast.info('Seats Selected', {
        description: `${seats.length} seat(s) selected. Total: ₹${totalPrice.toLocaleString()}`
      });
    }
  };
  
  // Handle seat locking using Supabase
  const lockSeats = async (seats: string[]) => {
    try {
      if (!user) {
        toast.error('Authentication Required', {
          description: 'Please sign in to continue with the booking'
        });
        return { success: false, error: new Error('User not authenticated') };
      }

      if (!eventId) {
        toast.error('Invalid Event', {
          description: 'Event information is missing'
        });
        return { success: false, error: new Error('Event ID missing') };
      }

      // Create a unique lock ID
      const lockId = crypto.randomUUID();
      
      try {
        // Call the server-side function to lock seats
        const { data, error } = await supabase.rpc('lock_seats', {
          p_event_id: eventId,
          p_user_id: user.id,
          p_seats: seats,
          p_lock_duration_minutes: 15
        });
        
        if (error) {
          if (error.message.includes('already locked') || error.message.includes('already booked')) {
            toast.error('Seats no longer available', {
              description: 'Some seats have been taken. Please choose different seats.'
            });
          } else {
            toast.error('Failed to lock seats', {
              description: error.message || 'Please try again'
            });
          }
          return { success: false, error };
        }
        
        return { success: true, lockId: data };
      } catch (error: any) {
        console.error('RPC error:', error);
        
        // Fallback to manual locking if RPC fails
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiry

        // Check for existing locks in the database
        const { data: existingLocks, error: checkError } = await supabase
          .from('seat_locks')
          .select('*')
          .eq('event_id', eventId)
          .gt('expires_at', new Date().toISOString());

        if (checkError) {
          throw new Error('Failed to check seat availability');
        }

        // Check if any of the seats are already locked
        const lockedSeats = existingLocks
          ?.filter(lock => lock.seats.some((s: string) => seats.includes(s)))
          .flatMap(lock => lock.seats) || [];

        if (lockedSeats.length > 0) {
          toast.error('Seats no longer available', {
            description: 'Some seats have been taken. Please choose different seats.'
          });
          return { success: false, error: new Error('Seats are locked') };
        }

        // Create the seat lock in the database
        const { error: insertError } = await supabase
          .from('seat_locks')
          .insert([
            {
              id: lockId,
              event_id: eventId,
              user_id: user.id,
              seats,
              expires_at: expiresAt
            }
          ]);

        if (insertError) {
          throw new Error('Failed to lock seats');
        }

        return { success: true, lockId };
      }
    } catch (error: any) {
      console.error('Seat locking failed:', error);
      toast.error('Failed to lock seats', {
        description: error.message || 'Please try again'
      });
      return { success: false, error };
    }
  };

  // Function to handle showing the user info form
  const handleShowUserInfoForm = () => {
    if (selectedSeats.length === 0) {
      toast.warning('No Seats Selected', {
        description: 'Please select your seats before proceeding.',
      });
      return;
    }
    if (selectedSeats.length !== ticketCount) {
       toast.warning('Seat Count Mismatch', {
         description: `Please select exactly ${ticketCount} ${ticketCount === 1 ? 'seat' : 'seats'}.`,
       });
       return;
     }
    setShowUserInfoForm(true);
  };

  // Function to handle submission of user info, lock seats, create booking, and navigate
  const handleUserInfoSubmit = async (userInfo: UserInfoFormData) => {
    if (!user) {
      toast.error('Authentication Required', {
        description: 'Please sign in to complete the booking.'
      });
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (!event || selectedSeats.length === 0 || !selectedCategory) {
      toast.error('Booking Error', {
        description: 'Missing event details, selected seats, or category.'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Lock Seats (using the existing lockSeats function)
      // For simplicity, we'll attempt to lock here. A more robust flow might lock earlier.
      const lockResult = await lockSeats(selectedSeats);
      if (!lockResult.success || !lockResult.lockId) {
        // lockSeats function already shows toasts on failure
        setShowUserInfoForm(false); // Hide form if locking fails
        setSelectedSeats([]); // Clear selection as seats might be gone
        setTotalAmount(0);
        toast.info('Please re-select your seats.');
        return; 
      }
      setLockedSeatsInfo({ lockId: lockResult.lockId, seats: selectedSeats }); // Store lock info
      
      // 2. Create Booking Record
      const bookingData = {
        event_id: eventId,
        user_id: user.id,
        seats: selectedSeats,
        total_amount: totalAmount,
        status: 'pending', // Initial status
        category_id: selectedCategory,
        num_tickets: ticketCount,
        user_full_name: userInfo.fullName,
        user_email: userInfo.email,
        user_phone: userInfo.phone,
        seat_lock_id: lockResult.lockId, // Associate lock with booking
      };

      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('Booking Creation Error:', bookingError);
        // Attempt to release locked seats if booking fails
        try {
          await supabase.rpc('release_lock', { p_lock_id: lockResult.lockId });
        } catch (releaseError) {
          console.error('Failed to release seat lock after booking failure:', releaseError);
        }
        toast.error('Booking Failed', {
          description: bookingError.message || 'Could not create your booking. Please try again.'
        });
        setLockedSeatsInfo(null);
        return;
      }

      // 3. Navigate to Payment Page
      toast.success('Booking details confirmed!', {
         description: 'Proceeding to payment...'
      });
      navigate(`/payment/${newBooking.id}`);

    } catch (error: any) {
      console.error('Booking Process Error:', error);
      toast.error('An Unexpected Error Occurred', {
        description: error.message || 'Please try again or contact support.'
      });
      // Attempt to release lock if it exists and booking failed unexpectedly
      if (lockedSeatsInfo?.lockId) {
         try {
           await supabase.rpc('release_lock', { p_lock_id: lockedSeatsInfo.lockId });
         } catch (releaseError) {
           console.error('Failed to release seat lock after unexpected error:', releaseError);
         }
         setLockedSeatsInfo(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Calculate minutes and seconds for timer display
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Memoized event details component for performance
  const EventSummary = useMemo(() => {
    if (!event) return null;
    return (
      <Card className="mb-6 p-4 bg-gray-50 border">
        <h2 className="text-xl font-semibold mb-3">{event.title}</h2>
        <div className="flex items-center text-sm text-gray-600 mb-1">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{event.venue}, {event.city}</span>
        </div>
      </Card>
    );
  }, [event]);

  // Main render logic
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4">
          <Skeleton className="h-12 w-1/4 mb-4" />
          <Skeleton className="h-8 w-1/2 mb-6" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    // Error handled in useEffect, this is a fallback
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Event Not Found</h2>
        <p className="text-gray-600 mb-4">Could not load event details.</p>
        <Button onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4"/> Go Home</Button>
      </div>
    );
  }

  // Content to show when the user info form is visible
  if (showUserInfoForm) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4 flex justify-center items-start">
          <div className="w-full max-w-md">
            {/* Back Button */}
             <Button 
               variant="outline" 
               onClick={() => setShowUserInfoForm(false)} 
               className="mb-4"
               disabled={isProcessing}
             >
               <ArrowLeft className="mr-2 h-4 w-4" /> Back to Seat Selection
             </Button>
             {EventSummary} 
             {/* User Info Form */}
            <UserInfoForm onSubmit={handleUserInfoSubmit} isProcessing={isProcessing} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Main booking page content (Seat Map, etc.)
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <Button variant="outline" onClick={() => navigate(`/event/${eventId}`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
        </Button>
        
        {EventSummary}
        
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left Side: Seat Map & Categories */}
          <div className="lg:col-span-2">
             {/* Timer Display */}
            <div className={`mb-4 text-center font-semibold p-2 rounded ${timeLeft <= 60 ? 'text-red-600 bg-red-100 animate-pulse' : 'text-blue-600 bg-blue-100'}`}>
              <Clock className="inline w-4 h-4 mr-1" /> Time Left: {minutes}:{seconds < 10 ? '0' : ''}{seconds}
            </div>
          
             {/* Category Selection */}
            {categories.length > 1 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Select Category</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      onClick={() => handleCategorySelect(cat.id)}
                      style={selectedCategory === cat.id ? { backgroundColor: cat.color, color: 'white' } : { borderColor: cat.color, color: cat.color }}
                      className="transition-all duration-150"
                    >
                      {cat.name} (₹{cat.price})
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ticket Count Selector - Simple for now */}
            <div className="mb-6">
               <label htmlFor="ticket-count" className="block text-lg font-semibold mb-3">Number of Tickets</label>
               <select 
                 id="ticket-count"
                 name="ticket-count"
                 value={ticketCount} 
                 onChange={(e) => handleTicketCountChange(parseInt(e.target.value, 10))} 
                 className="p-2 border rounded"
               >
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                   <option key={n} value={n}>{n}</option>
                 ))}
               </select>
            </div>

            {/* Seat Map */}
            {selectedCategory && (
              <SeatMap 
                eventId={eventId!} 
                categoryId={selectedCategory}
                maxSeats={ticketCount}
                onSelectedSeatsChange={handleSelectedSeatsChange}
                categoryColor={categories.find(c => c.id === selectedCategory)?.color || '#cccccc'}
                categoryPrice={categories.find(c => c.id === selectedCategory)?.price || 0}
              />
            )}
          </div>
          
          {/* Right Side: Booking Summary */}
          <div className="lg:col-span-1 sticky top-24">
            <Card className="p-6 shadow-md">
              <h2 className="text-2xl font-bold mb-6 border-b pb-3">Booking Summary</h2>
              
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{categories.find(c => c.id === selectedCategory)?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tickets:</span>
                  <span className="font-medium">{ticketCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selected Seats:</span>
                  <span className="font-medium text-right break-all">{selectedSeats.length > 0 ? selectedSeats.join(', ') : '-'}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-gray-600">Price per Ticket:</span>
                   <span className="font-medium">₹{categories.find(c => c.id === selectedCategory)?.price.toLocaleString() || '0'}</span>
                 </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-xl font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handleShowUserInfoForm} // Changed to show form
                  disabled={selectedSeats.length !== ticketCount || selectedSeats.length === 0 || isProcessing}
                >
                  {isProcessing ? 
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  }
                  {isProcessing ? 'Processing...' : 'Proceed to Enter Details'}
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                You have {minutes}:{seconds < 10 ? '0' : ''}{seconds} to complete your booking.
              </p>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookingPage;
