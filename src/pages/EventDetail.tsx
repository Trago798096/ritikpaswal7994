import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { handleError } from '@/utils/error-handler';
import { performanceMonitor } from '@/utils/performance';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/date';
import { Calendar, Clock, MapPin, Users, Heart, Share2, ChevronRight, Info, Ticket } from 'lucide-react';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string;
  date: string;
  venue: string;
  city: string;
  category: string;
  price_range: string;
  status: string;
  interested: number;
  seat_categories: {
    id: string;
    name: string;
    description: string;
    price: number;
    color: string;
    available: boolean;
  }[];
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isInterested, setIsInterested] = useState(false);

  useEffect(() => {
    const endMeasure = performanceMonitor.startMeasure('eventDetail');
    
    const fetchEvent = async () => {
      try {
        if (!id) {
          throw new Error('Event ID is required');
        }

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Event not found');

        setEvent(data);
      } catch (error) {
        handleError(error, 'Failed to load event');
        navigate('/');
      } finally {
        setLoading(false);
        endMeasure();
      }
    };

    fetchEvent();
  }, [id, navigate]);

  const handleBookNow = () => {
    if (!user) {
      toast.error('Please login to book tickets');
      navigate('/login', { state: { from: `/event/${id}` } });
      return;
    }
    navigate(`/book/${id}`);
  };

  const handleInterested = async () => {
    if (!event || updating) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ interested: event.interested + 1 })
        .eq('id', event.id);

      if (error) throw error;

      setEvent(prev => prev ? {
        ...prev,
        interested: prev.interested + 1
      } : null);

      setIsInterested(true);
      toast.success('Added to your interests!');
    } catch (error) {
      handleError(error, 'Failed to update interest');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleInterest = () => {
    setIsInterested(!isInterested);
    toast.success(`${isInterested ? 'Removed from' : 'Added to'} your interests`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.title,
        text: 'Check out this event!',
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <Skeleton className="h-[400px] w-full mb-8" />
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Event not found</h1>
              <Button onClick={() => navigate('/')}>Back to Home</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const eventStatus = event?.status || 'upcoming';
  const eventDate = event?.date ? formatDate(event.date) : '';
  const eventTime = event?.date ? formatDate(event.date, 'h:mm a') : '';
  const interestedCount = event?.interested || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="py-8">
        <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto px-4">
          {/* Event Image */}
          <div className="w-full md:w-2/3">
            <img 
              src={event?.image_url || '/placeholder-event.jpg'} 
              alt={event?.title} 
              className="w-full aspect-video object-cover rounded-lg shadow-lg" 
            />
          </div>

          {/* Event Details */}
          <div className="w-full md:w-1/3 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{event?.title}</h1>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className="w-5 h-5 mr-2" />
              <span>{eventDate}</span>
            </div>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="w-5 h-5 mr-2" />
              <span>{eventTime}</span>
            </div>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <MapPin className="w-5 h-5 mr-2" />
              <span>{event?.venue}, {event?.city}</span>
            </div>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Users className="w-5 h-5 mr-2" />
              <span>{interestedCount} people interested</span>
            </div>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Ticket className="w-5 h-5 mr-2" />
              <span>Starting from ₹{Math.min(...(event?.seat_categories?.map(c => c.price) || [0]))}</span>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mt-4">{event?.description || 'No description available.'}</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleBookNow}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                size="lg"
                disabled={eventStatus !== 'upcoming'}
              >
                {eventStatus === 'upcoming' ? 'Book Tickets' : 'Booking Closed'}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handleToggleInterest}
                  variant={isInterested ? "secondary" : "outline"}
                  size="lg"
                  className="flex-1"
                >
                  <Heart className={`w-5 h-5 mr-2 ${isInterested ? 'fill-current' : ''}`} />
                  {isInterested ? 'Interested' : 'Show Interest'}
                </Button>
                
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="lg"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Seat Categories */}
            {event?.seat_categories && event.seat_categories.length > 0 && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mt-6">
                <h3 className="text-lg font-semibold mb-4">Seat Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {event.seat_categories.map((category) => (
                    <div 
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <div>
                          <h4 className="font-medium">{category.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{category.price}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {category.available ? 'Available' : 'Sold Out'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Event Information */}
            <div className="mt-8 space-y-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Event Information</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Category:</span> {event?.category}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Duration:</span> {event?.duration || 'Not specified'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Language:</span> {event?.language || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Terms & Conditions</h3>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Please arrive at least 30 minutes before the event</li>
                  <li>Entry only with valid tickets</li>
                  <li>No refunds or exchanges</li>
                  <li>Right of admission reserved</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
