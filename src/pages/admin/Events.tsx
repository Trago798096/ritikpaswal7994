import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/supabase/client';
import EventEditor from '@/components/admin/EventEditor';
import CreateEventForm from '@/components/admin/CreateEventForm';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical, 
  FilmIcon, 
  Calendar,
  Loader2,
  X,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  title: string;
  category: string;
  date: string;
  venue: string;
  city: string;
  price_range?: string;
  status: string;
  image_url: string;
  description?: string;
  created_at: string;
}

interface Movie {
  id: string;
  title: string;
  language: string;
  genre: string;
  rating: number | null;
  format: string | null;
  image: string;
  created_at: string;
}

const AdminEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const editMode = searchParams.get('edit');
  const addMode = searchParams.get('add');
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await db.events()
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMovies = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await db.movies()
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setMovies(data || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
      toast.error('Failed to load movies');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);
  
  useEffect(() => {
    if (user) {
      if (activeTab === 'events') {
        fetchEvents();
      } else {
        fetchMovies();
      }
    }
  }, [user, activeTab, fetchEvents, fetchMovies]);
  
  const filteredEvents = events.filter(event => 
    event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredMovies = movies.filter(movie => 
    movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movie.genre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movie.language?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      const { error } = await db.events()
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setEvents(events.filter(event => event.id !== id));
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };
  
  const handleDeleteMovie = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this movie?')) {
      return;
    }
    
    try {
      const { error } = await db.movies()
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setMovies(movies.filter(movie => movie.id !== id));
      toast.success('Movie deleted successfully');
    } catch (error) {
      console.error('Error deleting movie:', error);
      toast.error('Failed to delete movie');
    }
  };

  const handleEditEvent = (eventId: string) => {
    setSearchParams({ edit: eventId });
  };

  const handleAddEvent = () => {
    setSearchParams({ add: 'true' });
  };

  const closeEditor = () => {
    setSearchParams({});
    // Refresh the events list
    if (activeTab === 'events') {
      fetchEvents();
    } else {
      fetchMovies();
    }
  };
  
  // If we're in edit mode or add mode, show the editor
  if (editMode || addMode) {
    return (
      <AdminLayout title={editMode ? "Edit Event" : "Add New Event"}>
        <div className="mb-4">
          <Button 
            onClick={closeEditor}
            variant="ghost"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Events
          </Button>
        </div>
        <EventEditor eventId={editMode || undefined} />
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout title="Events Management">
      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setActiveTab('events')}
              variant={activeTab === 'events' ? 'default' : 'outline'}
              className="flex-1 sm:flex-none"
            >
              Events
            </Button>
            <Button
              onClick={() => setActiveTab('movies')}
              variant={activeTab === 'movies' ? 'default' : 'outline'}
              className="flex-1 sm:flex-none"
            >
              Movies
            </Button>
            <Button
              onClick={handleAddEvent}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {/* Events/Movies Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-4 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'events' ? (
              filteredEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <MapPin className="h-4 w-4 mr-2" />
                      {event.venue}, {event.city}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        event.status === 'active' ? 'bg-green-100 text-green-800' :
                        event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {event.status}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEvent(event.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              filteredMovies.map((movie) => (
                <Card key={movie.id} className="overflow-hidden">
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{movie.title}</h3>
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <FilmIcon className="h-4 w-4 mr-2" />
                      {movie.language} • {movie.format}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      {movie.genre}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1">{movie.rating || 'N/A'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEvent(movie.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMovie(movie.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
