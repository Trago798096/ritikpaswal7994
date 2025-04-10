import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Star, Trash2, ExternalLink, RefreshCw, Film, Ticket } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Recommendation {
  id?: string;
  item_id: string;
  item_type: 'movie' | 'event';
  is_featured: boolean;
  position: number;
  item_name?: string;
  item_image?: string;
}

const fetchRecommendations = async () => {
  try {
    console.log('Fetching recommendations...');
    
    // Check if the table exists and create it if it doesn't
    const { data: tableExists } = await supabase
      .from('recommendations')
      .select('id')
      .limit(1)
      .catch(() => ({ data: null }));
    
    if (tableExists === null) {
      // Table doesn't exist or error occurred, try to create it
      await supabase
        .from('recommendations')
        .create({
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true },
            { name: 'item_id', type: 'uuid' },
            { name: 'item_type', type: 'text' },
            { name: 'is_featured', type: 'boolean', defaultValue: false },
            { name: 'position', type: 'integer' },
            { name: 'created_at', type: 'timestamp with time zone', defaultValue: 'now()' }
          ],
          data: []
        })
        .catch(error => {
          console.error('Error creating recommendations table:', error);
        });
    }
    
    // Now fetch the data
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        id, 
        item_id, 
        item_type, 
        is_featured, 
        position,
        movies!left (id, title, poster_url),
        events!left (id, title, image_url)
      `)
      .order('position', { ascending: true });
    
    if (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
    
    // Transform the data to include item_name and item_image
    const transformedData = (data || []).map((item: any) => {
      let recommendation: Recommendation = {
        id: item.id,
        item_id: item.item_id,
        item_type: item.item_type,
        is_featured: item.is_featured,
        position: item.position
      };
      
      if (item.item_type === 'movie' && item.movies) {
        recommendation.item_name = item.movies.title;
        recommendation.item_image = item.movies.poster_url;
      } else if (item.item_type === 'event' && item.events) {
        recommendation.item_name = item.events.title;
        recommendation.item_image = item.events.image_url;
      }
      
      return recommendation;
    });
    
    return transformedData;
  } catch (error) {
    console.error('Error in fetchRecommendations:', error);
    return [];
  }
};

const fetchMovies = async () => {
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, poster_url')
      .order('title', { ascending: true });
    
    if (error) {
      console.error('Error fetching movies:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchMovies:', error);
    return [];
  }
};

const fetchEvents = async () => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, image_url')
      .order('title', { ascending: true });
    
    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchEvents:', error);
    return [];
  }
};

const RecommendationsManager = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('movies');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [isFeatured, setIsFeatured] = useState(false);
  
  // Fetch recommendations
  const {
    data: recommendations = [],
    isLoading: isLoadingRecommendations,
    refetch: refetchRecommendations,
  } = useQuery({
    queryKey: ['recommendations'],
    queryFn: fetchRecommendations,
  });
  
  // Fetch movies
  const {
    data: movies = [],
    isLoading: isLoadingMovies,
  } = useQuery({
    queryKey: ['movies'],
    queryFn: fetchMovies,
  });
  
  // Fetch events
  const {
    data: events = [],
    isLoading: isLoadingEvents,
  } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });
  
  // Calculate next position
  const getNextPosition = () => {
    if (recommendations.length === 0) return 1;
    const maxPosition = Math.max(...recommendations.map((rec: Recommendation) => rec.position));
    return maxPosition + 1;
  };
  
  // Add recommendation
  const addRecommendationMutation = useMutation({
    mutationFn: async (recommendation: Omit<Recommendation, 'id' | 'item_name' | 'item_image'>) => {
      const { data, error } = await supabase
        .from('recommendations')
        .insert([recommendation])
        .select();
      
      if (error) {
        console.error('Error adding recommendation:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Recommendation added');
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      setSelectedItemId('');
      setIsFeatured(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to add recommendation: ${error.message}`);
    }
  });
  
  // Remove recommendation
  const removeRecommendationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error removing recommendation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Recommendation removed');
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to remove recommendation: ${error.message}`);
    }
  });
  
  // Toggle featured status
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from('recommendations')
        .update({ is_featured })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating featured status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Featured status updated');
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update featured status: ${error.message}`);
    }
  });
  
  // Update position
  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await supabase
        .from('recommendations')
        .update({ position })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating position:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update position: ${error.message}`);
    }
  });
  
  const handleAddRecommendation = () => {
    if (!selectedItemId) {
      toast.error('Please select an item');
      return;
    }
    
    addRecommendationMutation.mutate({
      item_id: selectedItemId,
      item_type: selectedTab as 'movie' | 'event',
      is_featured: isFeatured,
      position: getNextPosition()
    });
  };
  
  const handleRemoveRecommendation = (id: string) => {
    removeRecommendationMutation.mutate(id);
  };
  
  const handleToggleFeatured = (id: string, currentStatus: boolean) => {
    toggleFeaturedMutation.mutate({ id, is_featured: !currentStatus });
  };
  
  const handleMoveUp = (recommendation: Recommendation, index: number) => {
    if (index === 0) return; // Already at the top
    
    const prevItem = recommendations[index - 1];
    const prevPosition = prevItem.position;
    
    updatePositionMutation.mutate({ id: recommendation.id!, position: prevPosition });
    updatePositionMutation.mutate({ id: prevItem.id!, position: recommendation.position });
  };
  
  const handleMoveDown = (recommendation: Recommendation, index: number) => {
    if (index === recommendations.length - 1) return; // Already at the bottom
    
    const nextItem = recommendations[index + 1];
    const nextPosition = nextItem.position;
    
    updatePositionMutation.mutate({ id: recommendation.id!, position: nextPosition });
    updatePositionMutation.mutate({ id: nextItem.id!, position: recommendation.position });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations Manager</CardTitle>
        <CardDescription>
          Manage movie and event recommendations that appear on the homepage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="movies" className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Movies
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Events
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="movies" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                <div className="w-full sm:w-2/3">
                  <Label htmlFor="movie-select">Select Movie</Label>
                  <Select
                    value={selectedItemId}
                    onValueChange={setSelectedItemId}
                  >
                    <SelectTrigger id="movie-select" className="w-full">
                      <SelectValue placeholder="Select a movie" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingMovies ? (
                        <div className="flex justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : movies.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No movies found
                        </div>
                      ) : (
                        movies.map((movie: any) => (
                          <SelectItem key={movie.id} value={movie.id}>
                            {movie.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="featured-switch-movie"
                      checked={isFeatured}
                      onCheckedChange={setIsFeatured}
                    />
                    <Label htmlFor="featured-switch-movie" className="text-sm">
                      Featured
                    </Label>
                  </div>
                  <Button
                    onClick={handleAddRecommendation}
                    disabled={!selectedItemId || addRecommendationMutation.isPending}
                  >
                    {addRecommendationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="events" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                <div className="w-full sm:w-2/3">
                  <Label htmlFor="event-select">Select Event</Label>
                  <Select
                    value={selectedItemId}
                    onValueChange={setSelectedItemId}
                  >
                    <SelectTrigger id="event-select" className="w-full">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingEvents ? (
                        <div className="flex justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : events.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No events found
                        </div>
                      ) : (
                        events.map((event: any) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="featured-switch-event"
                      checked={isFeatured}
                      onCheckedChange={setIsFeatured}
                    />
                    <Label htmlFor="featured-switch-event" className="text-sm">
                      Featured
                    </Label>
                  </div>
                  <Button
                    onClick={handleAddRecommendation}
                    disabled={!selectedItemId || addRecommendationMutation.isPending}
                  >
                    {addRecommendationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Current Recommendations</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchRecommendations()}
              disabled={isLoadingRecommendations}
            >
              {isLoadingRecommendations ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {isLoadingRecommendations ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recommendations added yet
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((recommendation: Recommendation, index: number) => (
                <div 
                  key={recommendation.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded overflow-hidden">
                      {recommendation.item_image ? (
                        <img 
                          src={recommendation.item_image} 
                          alt={recommendation.item_name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {recommendation.item_type === 'movie' ? (
                            <Film className="h-5 w-5" />
                          ) : (
                            <Ticket className="h-5 w-5" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{recommendation.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {recommendation.item_type === 'movie' ? 'Movie' : 'Event'} • Position: {recommendation.position}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveUp(recommendation, index)}
                      disabled={index === 0}
                      className="h-8 w-8"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up">
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveDown(recommendation, index)}
                      disabled={index === recommendations.length - 1}
                      className="h-8 w-8"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </Button>
                    <div className="flex items-center">
                      <Switch
                        id={`featured-${recommendation.id}`}
                        checked={recommendation.is_featured}
                        onCheckedChange={() => handleToggleFeatured(recommendation.id!, recommendation.is_featured)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRecommendation(recommendation.id!)}
                      disabled={removeRecommendationMutation.isPending}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
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

export default RecommendationsManager;
