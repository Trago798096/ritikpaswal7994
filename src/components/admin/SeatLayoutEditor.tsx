import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Minus, Info, Upload, Image, Loader2, SaveIcon, PencilIcon } from 'lucide-react';
import SeatMap from '@/components/SeatMap';

interface SeatLayoutEditorProps {
  eventId?: string;
}

interface SeatCategory {
  id: string;
  name: string;
  price: number;
  color: string;
  description?: string;
}

interface SeatLayout {
  id: string;
  event_id: string;
  category_id: string;
  row_number: number;
  row_label: string;
  seat_number: number;
  status: 'available' | 'unavailable' | 'booked' | 'pending';
  metadata?: any;
}

const SeatLayoutEditor = ({ eventId }: SeatLayoutEditorProps) => {
  const [editMode, setEditMode] = useState<'single' | 'row'>('single');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<SeatCategory[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutIsReady, setLayoutIsReady] = useState(false);
  const [layoutImageUrl, setLayoutImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rows, setRows] = useState<string[]>(['A', 'B', 'C', 'D', 'E', 'F']); 
  const [selectedRow, setSelectedRow] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'available' | 'unavailable'>('unavailable');

  // Fetch seat categories and check if layout exists on component mount
  useEffect(() => {
    if (!eventId) {
      console.warn('No eventId provided to SeatLayoutEditor');
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      await fetchCategories();
      await checkLayoutStatus();
      setIsLoading(false);
    };
    
    fetchData();
  }, [eventId]);

  const fetchCategories = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('seat_categories')
        .select('*')
        .eq('event_id', eventId)
        .order('price', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCategories(data);
        setSelectedCategory(data[0].id);
      } else {
        console.warn("No seat categories found for event. Please create categories first.");
        toast.warning("No seat categories found", {
          description: "Please create seat categories before editing layout."
        });
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load seat categories');
    }
  };

  const checkLayoutStatus = async () => {
    if (!eventId) return;
    
    try {
      const { count, error } = await supabase
        .from('seat_layouts')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (error) throw error;
      
      setLayoutIsReady(count !== null && count > 0);
    } catch (error) {
      console.error('Error checking layout:', error);
    }
  };

  const handleSeatSelect = (seatIds: string[]) => {
    setSelectedSeats(seatIds);
  };

  const handleCreateLayout = async () => {
    if (!eventId || categories.length === 0) {
      toast.error('Cannot create layout. Event ID or categories missing.');
      return;
    }
    
    setIsSaving(true);
    try {
      let success = true;
      const layouts: any[] = [];
      
      // Generate a complete layout for all categories
      for (const category of categories) {
        for (let i = 0; i < rows.length; i++) {
          const rowLetter = rows[i];
          const seatCount = 12 + (i * 2); // More seats in rows further back
          
          for (let j = 1; j <= seatCount; j++) {
            layouts.push({
              event_id: eventId,
              category_id: category.id,
              row_number: i + 1,
              row_label: rowLetter,
              seat_number: j,
              status: 'available',
              metadata: {
                price: category.price,
                color: category.color || '#4b5563'
              }
            });
          }
        }
      }
      
      // Insert in batches to avoid request size issues
      const batchSize = 100;
      for (let i = 0; i < layouts.length; i += batchSize) {
        const batch = layouts.slice(i, i + batchSize);
        const { error } = await supabase
          .from('seat_layouts')
          .insert(batch);
          
        if (error) {
          console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
          success = false;
          toast.error(`Error creating layout batch ${Math.floor(i/batchSize) + 1}`);
          break;
        }
      }
      
      if (success) {
        toast.success('Seat layout created successfully');
        setLayoutIsReady(true);
      }
    } catch (error: any) {
      console.error('Error creating layout:', error);
      toast.error('Failed to create seat layout: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetRowStatus = async () => {
    if (!eventId || !selectedRow || !selectedCategory) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('seat_layouts')
        .update({ status: editStatus })
        .eq('event_id', eventId)
        .eq('row_label', selectedRow)
        .eq('category_id', selectedCategory);
        
      if (error) throw error;
      
      toast.success(`Row ${selectedRow} updated successfully`);
    } catch (error) {
      console.error('Error updating row:', error);
      toast.error('Failed to update row status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    setUploadingImage(true);
    try {
      // Upload the image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-layout-${Date.now()}.${fileExt}`;
      const filePath = `event-layouts/${fileName}`;

      const { data, error } = await supabase.storage
        .from('event-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('event-assets')
        .getPublicUrl(filePath);

      setLayoutImageUrl(publicUrlData.publicUrl);
      
      // Store the image URL with the event
      const { error: updateError } = await supabase
        .from('events')
        .update({ seat_layout_image: publicUrlData.publicUrl })
        .eq('id', eventId);
        
      if (updateError) throw updateError;
      
      toast.success('Layout image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!eventId ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Event Selected</AlertTitle>
          <AlertDescription>
            Please select an event to edit its seat layout.
          </AlertDescription>
        </Alert>
      ) : categories.length === 0 ? (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>No Seat Categories</AlertTitle>
          <AlertDescription>
            Please create seat categories for this event before editing the layout.
            Go to the "Seat Categories" tab to create categories.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Seat Layout Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {!layoutIsReady ? (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Create Seat Layout</AlertTitle>
                    <AlertDescription>
                      This event doesn't have a seat layout yet. Click the button below to generate a default stadium-style layout.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleCreateLayout} 
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Layout...
                        </>
                      ) : (
                        <>
                          <PencilIcon className="mr-2 h-4 w-4" />
                          Create Default Layout
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>About Seat Layout</AlertTitle>
                    <AlertDescription>
                      Select a category to view and edit its seating layout.
                      You can mark rows or individual seats as available or unavailable.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="layout-image">Layout Image (Optional)</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('layout-image-input')?.click()}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Image
                            </>
                          )}
                        </Button>
                        <input
                          id="layout-image-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        {layoutImageUrl && (
                          <span className="text-sm text-gray-500">Image uploaded</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Seat Categories</Label>
                      <div className="mt-2">
                        <Select 
                          value={selectedCategory} 
                          onValueChange={setSelectedCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name} - ₹{category.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border p-4 rounded-lg bg-slate-50">
                    <Label className="mb-2 block">Row Editor</Label>
                    <div className="flex items-end gap-4">
                      <div className="w-1/3">
                        <Label htmlFor="row-select" className="text-sm">Select Row</Label>
                        <Select 
                          value={selectedRow} 
                          onValueChange={setSelectedRow}
                        >
                          <SelectTrigger id="row-select">
                            <SelectValue placeholder="Select row" />
                          </SelectTrigger>
                          <SelectContent>
                            {rows.map(row => (
                              <SelectItem key={row} value={row}>Row {row}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-1/3">
                        <Label htmlFor="status-select" className="text-sm">Set Status</Label>
                        <Select 
                          value={editStatus} 
                          onValueChange={(val) => setEditStatus(val as 'available' | 'unavailable')}
                        >
                          <SelectTrigger id="status-select">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        variant="secondary"
                        onClick={handleSetRowStatus}
                        disabled={!selectedRow || isSaving}
                      >
                        Update Row
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="mb-4">
                      <h3 className="font-medium">Preview</h3>
                      <p className="text-sm text-gray-500">
                        This is how your seating layout will appear to customers.
                      </p>
                    </div>
                    
                    {/* Use the SeatMap component for preview */}
                    {selectedCategory && (
                      <SeatMap 
                        eventId={eventId}
                        selectedCategory={selectedCategory}
                        onSeatSelect={handleSeatSelect}
                        maxSeats={10}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SeatLayoutEditor;
