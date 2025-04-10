import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Star, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Event } from '@/types/events';
import { Input } from '@/components/ui/input';

interface WeeklyEvent {
  id?: string;
  event_id: string;
  featured: boolean;
  week_number: number;
  event_name?: string;
  event_date?: string;
  event_venue?: string;
  event_city?: string;
  event_image?: string;
  event_price?: number;
}

// Define the type for the raw response data from Supabase
interface RawWeeklyEventResponse {
  id: string;
  event_id: string;
  featured: boolean;
  week_number: number;
  events: {
    id: string;
    title: string;
    date: string;
    venue: string;
    city: string;
    image: string;
    price: number;
  } | null;
}

const fetchWeeklyEvents = async () => {
  try {
    console.log('Fetching weekly events...');
    
    const { data, error } = await supabase
      .from('weekly_events')
      .select('*, events!inner(*)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching weekly events:', error);
      throw error;
    }
    
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      event_id: item.event_id,
      featured: item.featured,
      week_number: item.week_number || 1,
      event_name: item.events?.title,
      event_date: item.events?.date,
      event_venue: item.events?.venue,
      event_city: item.events?.city,
      event_image: item.events?.image_url,
      event_price: item.events?.price_range ? parseFloat(item.events.price_range.split('-')[0]) : 0
    }));
    
    return transformedData;
  } catch (e) {
    console.error('Error in fetchWeeklyEvents:', e);
    return [];
  }
};

const fetchAvailableEvents = async () => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, date, venue, city, image_url, price_range')
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching available events:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchAvailableEvents:', error);
    return [];
  }
};

const WeeklyEventsManager = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  
  // Fetch weekly events
  const {
    data: weeklyEvents = [],
    isLoading: isLoadingWeeklyEvents,
    refetch: refetchWeeklyEvents,
  } = useQuery({
    queryKey: ['weeklyEvents'],
    queryFn: fetchWeeklyEvents,
  });
  
  // Fetch available events
  const {
    data: availableEvents = [],
    isLoading: isLoadingAvailableEvents,
  } = useQuery({
    queryKey: ['availableEvents'],
    queryFn: fetchAvailableEvents,
  });
  
  // Add event to weekly events
  const addWeeklyEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!eventId) {
        throw new Error('No event selected');
      }
      
      // Check if event already exists in weekly events
      const { data: existingEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('event_id', eventId)
        .single();
      
      if (existingEvent) {
        throw new Error('Event already added to weekly events');
      }
      
      const { data, error } = await supabase
        .from('weekly_events')
        .insert([
          { 
            event_id: eventId,
            featured: false,
            week_number: weekNumber
          }
        ])
        .select();
      
      if (error) {
        console.error('Error adding event to weekly events:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Event added to weekly events');
      queryClient.invalidateQueries(['weeklyEvents']);
      setSelectedEventId('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
  
  // Remove event from weekly events
  const removeWeeklyEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('weekly_events')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error removing event from weekly events:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Event removed from weekly events');
      queryClient.invalidateQueries(['weeklyEvents']);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove event: ${error.message}`);
    }
  });
  
  // Toggle featured status
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from('weekly_events')
        .update({ featured }) 
        .eq('id', id);
      
      if (error) {
        console.error('Error updating featured status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Featured status updated');
      queryClient.invalidateQueries(['weeklyEvents']);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update featured status: ${error.message}`);
    }
  });
  
  const handleAddEvent = () => {
    if (selectedEventId) {
      addWeeklyEventMutation.mutate(selectedEventId);
    } else {
      toast.error('Please select an event to add');
    }
  };
  
  const handleRemoveEvent = (id: string) => {
    removeWeeklyEventMutation.mutate(id);
  };
  
  const handleToggleFeatured = (id: string, currentStatus: boolean) => {
    toggleFeaturedMutation.mutate({ id, featured: !currentStatus });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Events Manager</CardTitle>
        <CardDescription>
          Manage events that appear in the weekly events section
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
            <div className="w-full sm:w-2/3">
              <Label htmlFor="event-select">Add Event to Weekly Events</Label>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger id="event-select" className="w-full">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map((event: any) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {new Date(event.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-1/3">
              <Label htmlFor="week-number">Week Number</Label>
              <Input
                id="week-number"
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                min={1}
                max={52}
                className="w-full"
              />
            </div>
            
            <Button 
              onClick={handleAddEvent} 
              disabled={!selectedEventId || addWeeklyEventMutation.isPending}
              className="w-full sm:w-auto"
            >
              {addWeeklyEventMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Weekly Events'
              )}
            </Button>
          </div>
          
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Current Weekly Events</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchWeeklyEvents()}
              disabled={isLoadingWeeklyEvents}
            >
              {isLoadingWeeklyEvents ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {isLoadingWeeklyEvents ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : weeklyEvents.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No weekly events added yet
            </div>
          ) : (
            <div className="space-y-2">
              {weeklyEvents.map((event: WeeklyEvent) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{event.event_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.event_date && new Date(event.event_date).toLocaleDateString()} • {event.event_venue}, {event.event_city}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Week #{event.week_number}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Label htmlFor={`featured-${event.id}`} className="mr-2 text-sm">
                        Featured
                      </Label>
                      <Switch
                        id={`featured-${event.id}`}
                        checked={event.featured}
                        onCheckedChange={() => handleToggleFeatured(event.id!, event.featured)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEvent(event.id!)}
                      disabled={removeWeeklyEventMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyEventsManager;
