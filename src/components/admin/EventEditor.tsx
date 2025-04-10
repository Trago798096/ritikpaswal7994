import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Edit, Save } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SeatLayoutEditor from './SeatLayoutEditor';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface EventEditorProps {
  eventId?: string;
}

interface SeatCategory {
  id: string;
  name: string;
  price: number;
  description: string;
  color: string;
  available: boolean;
}

const EventEditor = ({ eventId }: EventEditorProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialEvent, setInitialEvent] = useState({
    title: '',
    category: 'concert',
    date: new Date().toISOString(),
    venue: '',
    city: 'Mumbai',
    price_range: '',
    image_url: '',
    status: 'available',
    description: ''
  });
  
  // Seat category management
  const [seatCategories, setSeatCategories] = useState<SeatCategory[]>([
    {
      id: 'platinum',
      name: 'Platinum',
      price: 5000,
      description: 'Premium seating with the best view',
      color: '#f59e0b',
      available: true
    },
    {
      id: 'gold',
      name: 'Gold',
      price: 3500,
      description: 'Great seating with excellent view',
      color: '#ca8a04',
      available: true
    },
    {
      id: 'silver',
      name: 'Silver',
      price: 2000,
      description: 'Good seating with nice view',
      color: '#9ca3af',
      available: true
    },
    {
      id: 'general',
      name: 'General',
      price: 1000,
      description: 'Standard seating',
      color: '#1d4ed8',
      available: true
    }
  ]);
  
  const [editingCategory, setEditingCategory] = useState<SeatCategory | null>(null);
  
  // Fetch cities for dropdown
  const [cities, setCities] = useState<{id: number, name: string}[]>([]);
  
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data, error } = await db.cities().select('*');
        if (error) throw error;
        
        if (!data || data.length === 0) {
          // Fallback cities in case the DB doesn't have them
          setCities([
            { id: 1, name: 'Mumbai' },
            { id: 2, name: 'Delhi' },
            { id: 3, name: 'Bangalore' },
            { id: 4, name: 'Chennai' },
            { id: 5, name: 'Kolkata' },
            { id: 6, name: 'Hyderabad' }
          ]);
        } else {
          setCities(data);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
        toast.error('Failed to load cities, using defaults');
        
        // Fallback cities
        setCities([
          { id: 1, name: 'Mumbai' },
          { id: 2, name: 'Delhi' },
          { id: 3, name: 'Bangalore' },
          { id: 4, name: 'Chennai' },
          { id: 5, name: 'Kolkata' },
          { id: 6, name: 'Hyderabad' }
        ]);
      }
    };
    
    fetchCities();
  }, []);
  
  // If eventId is provided, fetch event details
  useEffect(() => {
    if (!eventId) return;
    
    const fetchEvent = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await db.events()
          .select('*')
          .eq('id', eventId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setInitialEvent(data);
          
          // Try to fetch seat categories if available
          try {
            const { data: seatData, error: seatError } = await db
              .from('seat_categories')
              .select('*')
              .eq('event_id', eventId);
              
            if (!seatError && seatData && seatData.length > 0) {
              setSeatCategories(seatData);
            }
          } catch (e) {
            console.warn('Could not fetch seat categories:', e);
          }
        } else {
          toast.error('Event not found');
          navigate('/admin/events');
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
        navigate('/admin/events');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId, navigate]);
  
  const [event, setEvent] = useState(initialEvent);
  
  // Update event state when initialEvent changes
  useEffect(() => {
    setEvent(initialEvent);
  }, [initialEvent]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setEvent(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setEvent(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event.title || !event.date || !event.venue || !event.city || !event.image_url) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSaving(true);
    try {
      let savedEventId = eventId;
      
      if (eventId) {
        // Update existing event
        const { error } = await db.events()
          .update(event)
          .eq('id', eventId);
          
        if (error) throw error;
        
        toast.success('Event updated successfully');
      } else {
        // Create new event
        const { data, error } = await db.events()
          .insert(event)
          .select()
          .single();
          
        if (error) throw error;
        
        if (data) {
          savedEventId = data.id;
          toast.success('Event created successfully');
          // Go to event edit page with newly created event
          navigate(`/admin/events?edit=${data.id}`);
        } else {
          throw new Error('Failed to create event - no data returned');
        }
      }
      
      // Save seat categories if we have an event ID
      if (savedEventId) {
        try {
          // First delete existing categories
          const { error: deleteError } = await db.from('seat_categories')
            .delete()
            .eq('event_id', savedEventId);
            
          if (deleteError) {
            console.error('Error deleting existing seat categories:', deleteError);
            toast.error('Failed to update seat categories');
            return;
          }
          
          // Then insert new ones with the event_id
          const categoriesWithEventId = seatCategories.map(category => ({
            ...category,
            event_id: savedEventId
          }));
          
          const { data: insertedCategories, error: insertError } = await db.from('seat_categories')
            .insert(categoriesWithEventId)
            .select();
            
          if (insertError) {
            console.error('Error inserting seat categories:', insertError);
            toast.error('Failed to save seat categories');
            return;
          }
          
          toast.success('Seat categories saved successfully');
          
          // Now create default seat layouts for each category if none exist
          const { data: existingLayouts, error: layoutCheckError } = await db.from('seat_layouts')
            .select('id')
            .eq('event_id', savedEventId)
            .limit(1);
            
          if (layoutCheckError) {
            console.error('Error checking existing layouts:', layoutCheckError);
          } else if (!existingLayouts || existingLayouts.length === 0) {
            // Generate default layouts for each category
            const layouts = [];
            const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
            
            for (const category of insertedCategories || categoriesWithEventId) {
              for (let i = 0; i < rows.length; i++) {
                const rowLetter = rows[i];
                const seatCount = 12 + (i * 2); // Increasing seats per row
                
                for (let j = 1; j <= seatCount; j++) {
                  layouts.push({
                    event_id: savedEventId,
                    category_id: category.id,
                    row_number: i + 1,
                    row_label: rowLetter,
                    seat_number: j,
                    status: 'available',
                    metadata: {
                      price: category.price,
                      color: category.color
                    }
                  });
                }
              }
            }
            
            if (layouts.length > 0) {
              // Insert in batches of 100 to avoid request size limits
              const batchSize = 100;
              let success = true;
              
              for (let i = 0; i < layouts.length; i += batchSize) {
                const batch = layouts.slice(i, i + batchSize);
                const { error: layoutError } = await db.from('seat_layouts')
                  .insert(batch);
                  
                if (layoutError) {
                  console.error(`Error inserting layout batch ${i/batchSize + 1}:`, layoutError);
                  success = false;
                  break;
                }
              }
              
              if (success) {
                toast.success('Default seat layouts created');
              } else {
                toast.error('Error creating some seat layouts');
              }
            }
          }
        } catch (e) {
          console.error('Error in seat category/layout operations:', e);
          toast.error('Failed to save seat categories or layouts');
        }
      }
      
      // Go back to events list if not already redirected and not in edit mode
      if (!savedEventId && !eventId) {
        navigate('/admin/events');
      }
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle seat category changes
  const handleCategoryChange = (id: string, field: keyof SeatCategory, value: any) => {
    setSeatCategories(prev => 
      prev.map(cat => 
        cat.id === id ? { ...cat, [field]: value } : cat
      )
    );
  };
  
  const handleAddCategory = () => {
    const newId = `category-${Date.now()}`;
    setSeatCategories(prev => [
      ...prev,
      {
        id: newId,
        name: 'New Category',
        price: 1000,
        description: 'Description',
        color: '#3b82f6',
        available: true
      }
    ]);
    
    // Start editing the new category
    setEditingCategory({
      id: newId,
      name: 'New Category',
      price: 1000,
      description: 'Description',
      color: '#3b82f6',
      available: true
    });
  };
  
  const handleDeleteCategory = (id: string) => {
    setSeatCategories(prev => prev.filter(cat => cat.id !== id));
    if (editingCategory?.id === id) {
      setEditingCategory(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-2">Loading event details...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="p-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="details">Event Details</TabsTrigger>
          <TabsTrigger value="seating">Seat Categories</TabsTrigger>
          <TabsTrigger value="layout">Seating Layout</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    value={event.title} 
                    onChange={handleChange}
                    placeholder="Enter event title"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={event.category} 
                    onValueChange={(value) => handleSelectChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="theater">Theater</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="exhibition">Exhibition</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="date">Date & Time</Label>
                  <Input 
                    id="date" 
                    name="date" 
                    type="datetime-local" 
                    value={event.date.slice(0, 16)} 
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="venue">Venue</Label>
                  <Input 
                    id="venue" 
                    name="venue" 
                    value={event.venue} 
                    onChange={handleChange}
                    placeholder="Enter venue name"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Select 
                    value={event.city} 
                    onValueChange={(value) => handleSelectChange('city', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city.id} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="price_range">Price Range</Label>
                  <Input 
                    id="price_range" 
                    name="price_range" 
                    value={event.price_range} 
                    onChange={handleChange}
                    placeholder="e.g. ₹1000 - ₹5000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input 
                    id="image_url" 
                    name="image_url" 
                    value={event.image_url} 
                    onChange={handleChange}
                    placeholder="Enter image URL"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={event.status} 
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold_out">Sold Out</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="postponed">Postponed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={event.description} 
                onChange={(e) => setEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter event description"
                rows={5}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                className="mr-2"
                onClick={() => navigate('/admin/events')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Event</>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
        
        <TabsContent value="seating">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Seat Categories</h3>
              <Button onClick={handleAddCategory} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seatCategories.map(category => (
                <div 
                  key={category.id}
                  className={`border rounded-lg p-4 ${editingCategory?.id === category.id ? 'border-primary' : ''}`}
                >
                  {editingCategory?.id === category.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`name-${category.id}`}>Name</Label>
                        <Input 
                          id={`name-${category.id}`}
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`price-${category.id}`}>Price (₹)</Label>
                        <Input 
                          id={`price-${category.id}`}
                          type="number"
                          value={editingCategory.price}
                          onChange={(e) => setEditingCategory({...editingCategory, price: parseInt(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`desc-${category.id}`}>Description</Label>
                        <Input 
                          id={`desc-${category.id}`}
                          value={editingCategory.description}
                          onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`color-${category.id}`}>Color</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id={`color-${category.id}`}
                            type="color"
                            value={editingCategory.color}
                            onChange={(e) => setEditingCategory({...editingCategory, color: e.target.value})}
                            className="w-12 h-10 p-1"
                          />
                          <Input 
                            value={editingCategory.color}
                            onChange={(e) => setEditingCategory({...editingCategory, color: e.target.value})}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id={`available-${category.id}`}
                          checked={editingCategory.available}
                          onCheckedChange={(checked) => setEditingCategory({...editingCategory, available: checked})}
                        />
                        <Label htmlFor={`available-${category.id}`}>Available</Label>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingCategory(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            handleCategoryChange(category.id, 'name', editingCategory.name);
                            handleCategoryChange(category.id, 'price', editingCategory.price);
                            handleCategoryChange(category.id, 'description', editingCategory.description);
                            handleCategoryChange(category.id, 'color', editingCategory.color);
                            handleCategoryChange(category.id, 'available', editingCategory.available);
                            setEditingCategory(null);
                          }}
                        >
                          <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <h4 className="font-semibold">{category.name}</h4>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setEditingCategory(category)}
                            className="p-1 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        {category.description}
                      </div>
                      
                      <div className="mt-2 flex justify-between">
                        <span className="text-sm font-medium">₹{category.price.toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${category.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {category.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                className="mr-2"
                onClick={() => navigate('/admin/events')}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Categories</>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="layout">
          {eventId ? (
            <SeatLayoutEditor eventId={eventId} />
          ) : (
            <div className="py-12 text-center">
              <h3 className="text-lg font-medium mb-4">Save the event first to edit seating layout</h3>
              <p className="text-gray-600 mb-8">You need to save the event before you can edit the seating layout.</p>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Event and Continue</>
                )}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default EventEditor;
