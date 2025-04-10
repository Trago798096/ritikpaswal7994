import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import EventCard, { EventProps } from '@/components/EventCard';
import { toast } from 'sonner';

interface EventDetails {
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
}

interface WeeklyEvent {
  id: string;
  event_id: string;
  featured: boolean;
  week_number: number;
  events: EventDetails | null;
}

const WeeklyEvents = () => {
  const [weeklyEvents, setWeeklyEvents] = useState<EventProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks, setTotalWeeks] = useState<number>(1);

  useEffect(() => {
    fetchWeeklyEvents();
  }, [currentWeek]);

  const fetchWeeklyEvents = async () => {
    try {
      setIsLoading(true);
      let eventsData: EventProps[] = []; // Initialize eventsData array
      let fetchError = null;
      
      // Try fetching actual data
      try {
        const { data: weeksData, error: weeksError } = await supabase
          .from('weekly_events') // Assuming 'weekly_events' table exists
          .select('week_number')
          .order('week_number', { ascending: true });
          
        if (weeksError) throw weeksError;
          
        if (weeksData && weeksData.length > 0) {
          const weeks = [...new Set(weeksData.map(item => item.week_number))];
          setTotalWeeks(weeks.length);
          if (!weeks.includes(currentWeek)) {
            setCurrentWeek(weeks[0]);
          }

          const { data: weeklyEventData, error: eventsError } = await supabase
            .from('weekly_events')
            .select(`
              *,
              events:event_id (*)
            `)
            .eq('week_number', currentWeek)
            .order('created_at', { ascending: false });
            
          if (eventsError) throw eventsError;
          
          if (weeklyEventData && weeklyEventData.length > 0) {
            eventsData = weeklyEventData.map((item: any) => {
              if (!item.events) return null;
              return {
                ...item.events, // Spread the nested event details
                id: item.event_id, // Ensure correct id is used
                featured: item.featured || false
              };
            }).filter(Boolean) as EventProps[];
          } 
        }
      } catch (error) {
        console.warn('Failed to fetch real weekly events:', error);
        fetchError = error; // Store fetch error
      }
      
      // If fetching real data failed or returned no events, use fallback demo data
      if (eventsData.length === 0) {
        console.log('Using demo weekly events data');
        toast.info('Showing Demo Events', { description: 'Could not load live weekly events.' });
        eventsData = [
          // --- Add your demo events here ---
          {
            id: 'demo-event-1',
            title: 'Arijit Singh Live Concert',
            description: 'Experience the magic of Arijit Singh live in concert',
            image_url: '/lovable-uploads/0717f399-6c25-40d2-ab0c-e8dce44e2e91.png',
            date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
            venue: 'National Stadium',
            city: 'New Delhi',
            category: 'Concert',
            price_range: '₹1500 - ₹5000',
            status: 'upcoming',
            interested: 15800,
            featured: true
          },
          {
            id: 'demo-event-2',
            title: 'KKR vs RCB - IPL Match',
            description: 'Watch the exciting T20 match between KKR and RCB',
            image_url: '/lovable-uploads/933af9b9-e587-4f31-9e71-7474b68aa224.png',
            date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
            venue: 'Eden Gardens',
            city: 'Kolkata',
            category: 'Sports',
            price_range: '₹800 - ₹2500',
            status: 'upcoming',
            interested: 20900,
            featured: false
          },
           {
            id: 'demo-event-3',
            title: 'Vir Das Comedy Night',
            description: 'Laugh out loud with Vir Das in this comedy special',
            image_url: '/lovable-uploads/16d0f852-d124-40f8-9ce8-998d21e53155.png',
            date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
            venue: 'Comedy Club Arena',
            city: 'Mumbai',
            category: 'Comedy',
            price_range: '₹800 - ₹1500',
            status: 'upcoming',
            interested: 8500,
            featured: false
          },
          {
            id: 'demo-event-4',
            title: 'Diljit Dosanjh Concert Tour',
            description: 'Diljit Dosanjh brings his electrifying performance to your city',
            image_url: '/lovable-uploads/c3f1d2a2-5d6e-4f7b-8c9a-1b2d3e4f5g6h.png',
            date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
            venue: 'City Amphitheater Hall',
            city: 'Bangalore',
            category: 'Concert',
            price_range: '₹1200 - ₹4000',
            status: 'upcoming',
            interested: 12600,
            featured: true
          }
          // --- End of demo events ---
        ];
        setTotalWeeks(1); // Reset weeks if using demo data
        setCurrentWeek(1);
      }

      setWeeklyEvents(eventsData);

    } catch (e) {
      // Catch any unexpected errors during the process
      console.error('Critical Error in fetchWeeklyEvents:', e);
      toast.error('Failed to load events', { description: 'An unexpected error occurred.' });
      // Optionally set empty events or demo data here as well
      setWeeklyEvents([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeekChange = (week: number) => {
    setCurrentWeek(week);
  };

  // If there are no weekly events, don't render the component
  if (!isLoading && weeklyEvents.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">Weekly Events</h2>
        
        {totalWeeks > 1 && (
          <div className="flex space-x-2">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <button
                key={week}
                onClick={() => handleWeekChange(week)}
                className={`px-3 py-1 rounded-full text-sm ${
                  currentWeek === week
                    ? 'bg-book-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-book-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {weeklyEvents.map(event => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      )}
      
      <div className="text-center mt-8">
        <Link to="/live-events" className="btn-secondary">
          View All Events
        </Link>
      </div>
    </section>
  );
};

export default WeeklyEvents;
