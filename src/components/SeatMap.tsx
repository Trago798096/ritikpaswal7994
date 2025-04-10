import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Loader2, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Seat {
  id: string;
  row: string;
  number: number;
  category: string;
  status: 'available' | 'booked' | 'selected' | 'unavailable' | 'pending';
  price: number;
  lockExpiry?: number;
  padding?: number;
  color?: string;
}

interface SeatMapProps {
  eventId: string;
  selectedCategory: string;
  onSeatSelect: (seatIds: string[], totalPrice: number) => void;
  maxSeats: number;
}

const SeatMap: React.FC<SeatMapProps> = ({ 
  eventId, 
  selectedCategory, 
  onSeatSelect, 
  maxSeats 
}) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const [categories, setCategories] = useState<{id: string, name: string, price: number, color: string}[]>([]);

  // Fetch seat categories from database
  const fetchCategories = useCallback(async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('seat_categories')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCategories(data);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  }, [eventId]);
  
  // Fetch seat layouts from database
  const fetchSeatLayouts = useCallback(async () => {
    if (!eventId || !selectedCategory) return [];
    
    try {
      const { data, error } = await supabase
        .from('seat_layouts')
        .select('*')
        .eq('event_id', eventId)
        .eq('category_id', selectedCategory)
        .order('row_number', { ascending: true })
        .order('seat_number', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (e) {
      console.error('Error fetching seat layouts:', e);
      return [];
    }
  }, [eventId, selectedCategory]);

  // Convert database seat layouts to Seat objects
  const convertLayoutsToSeats = useCallback((layouts: any[], category: any): Seat[] => {
    if (!layouts || layouts.length === 0 || !category) return [];
    
    return layouts.map(layout => ({
      id: `${layout.row_label}${layout.seat_number}`,
      row: layout.row_label,
      number: layout.seat_number,
      category: layout.category_id,
      status: layout.status,
      price: category.price,
      padding: (layout.row_number - 1) * 0.5, // Increase padding for rows further back
      color: category.color || '#4b5563'
    }));
  }, []);

  // Fetch seat locks from database
  const fetchSeatLocks = useCallback(async () => {
    if (!eventId) return [];
    
    try {
      const { data, error } = await supabase
        .from('seat_locks')
        .select('*')
        .eq('event_id', eventId)
        .gt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      
      return data || [];
    } catch (e) {
      console.error('Error fetching seat locks:', e);
      return [];
    }
  }, [eventId]);

  // Load seats and apply locks when category changes
  useEffect(() => {
    const loadSeats = async () => {
      if (!selectedCategory || !eventId) return;
      
      setIsLoading(true);
      setError(null);
      setSelectedSeats([]);
      
      try {
        // Fetch categories if not already loaded
        if (categories.length === 0) {
          await fetchCategories();
        }
        
        // Fetch seat layouts from database
        const layouts = await fetchSeatLayouts();
        
        if (layouts.length === 0) {
          setError('No seats available for this category');
          setSeats([]);
          setIsLoading(false);
          return;
        }
        
        // Find the current category object
        const category = categories.find(c => c.id === selectedCategory);
        if (!category) {
          setError('Category not found');
          setSeats([]);
          setIsLoading(false);
          return;
        }
        
        // Convert layouts to seat objects
        const layoutSeats = convertLayoutsToSeats(layouts, category);
        
        // Fetch and apply seat locks
        const locks = await fetchSeatLocks();
        
        if (locks.length > 0) {
          // Create a map of all locked seats
          const lockedSeats = new Map();
          locks.forEach(lock => {
            lock.seats.forEach((seatId: string) => {
              lockedSeats.set(seatId, 'pending');
            });
          });
          
          // Apply locks to seats
          layoutSeats.forEach(seat => {
            if (lockedSeats.has(seat.id)) {
              seat.status = 'pending';
            }
          });
        }
        
        setSeats(layoutSeats);
      } catch (error) {
        console.error('Error loading seats:', error);
        setError('Failed to load seat map. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSeats();
  }, [selectedCategory, eventId, categories, fetchCategories, fetchSeatLayouts, convertLayoutsToSeats, fetchSeatLocks]);

  // Handle seat selection
  const handleSeatClick = useCallback((seat: Seat) => {
    if (seat.status === 'booked' || seat.status === 'unavailable' || seat.status === 'pending') {
      // Check if we've shown a notification recently to avoid spam
      const now = Date.now();
      if (now - lastNotificationTime > 1000) { // Only show notification once per second
        toast.error('Seat Unavailable', {
          description: `Seat ${seat.id} is already booked or unavailable.`,
          duration: 2000
        });
        setLastNotificationTime(now);
      }
      return;
    }
    
    setSelectedSeats(prev => {
      const seatIndex = prev.indexOf(seat.id);
      if (seatIndex !== -1) {
        // Deselect the seat
        const newSelectedSeats = [...prev];
        newSelectedSeats.splice(seatIndex, 1);
        
        // Update total price and notify parent
        const totalPrice = calculateTotalPrice(newSelectedSeats);
        onSeatSelect(newSelectedSeats, totalPrice);
        
        return newSelectedSeats;
      } else {
        // Check if we've reached the max seats limit
        if (prev.length >= maxSeats) {
          toast.error(`Maximum Seats Reached`, {
            description: `You can select up to ${maxSeats} seats.`,
            duration: 3000
          });
          return prev;
        }
        
        // Select the seat
        const newSelectedSeats = [...prev, seat.id];
        
        // Update total price and notify parent
        const totalPrice = calculateTotalPrice(newSelectedSeats);
        onSeatSelect(newSelectedSeats, totalPrice);
        
        return newSelectedSeats;
      }
    });
  }, [lastNotificationTime, maxSeats, onSeatSelect]);

  // Calculate total price based on selected seats
  const calculateTotalPrice = useCallback((selectedSeatIds: string[]): number => {
    return selectedSeatIds.reduce((total, seatId) => {
      const seat = seats.find(s => s.id === seatId);
      return total + (seat?.price || 0);
    }, 0);
  }, [seats]);

  // Group seats by row for rendering
  const seatsByRow = useMemo(() => {
    const result: { [key: string]: Seat[] } = {};
    
    seats.forEach(seat => {
      if (!result[seat.row]) {
        result[seat.row] = [];
      }
      result[seat.row].push(seat);
    });
    
    // Sort rows alphabetically
    return Object.keys(result)
      .sort()
      .reduce((obj, key) => {
        obj[key] = result[key];
        return obj;
      }, {} as { [key: string]: Seat[] });
  }, [seats]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-gray-500">Loading seat map...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // If no seats are available for this category
  if (seats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-4" />
        <p className="text-sm text-amber-500">No seats available for this category</p>
      </div>
    );
  }

  // Render the seat map
  return (
    <div className="flex flex-col items-center">
      {/* Screen */}
      <div className="w-full max-w-3xl mb-8">
        <div className="h-6 bg-gray-300 rounded-t-lg flex items-center justify-center">
          <span className="text-xs text-gray-600">SCREEN</span>
        </div>
        <div className="h-1 bg-gray-400 w-full"></div>
      </div>
      
      {/* Seat map */}
      <div className="mb-8">
        {Object.keys(seatsByRow).map(row => (
          <div key={row} className="flex justify-center mb-2">
            {/* Row label */}
            <div className="w-6 flex items-center justify-center mr-2">
              <span className="text-sm font-medium">{row}</span>
            </div>
            
            {/* Seats */}
            <div className="flex">
              {seatsByRow[row].map(seat => {
                const isSelected = selectedSeats.includes(seat.id);
                let seatClass = "w-7 h-7 m-1 flex items-center justify-center text-xs rounded cursor-pointer transition-colors";
                
                // Apply padding for stadium effect (more seats in back rows)
                if (seat.padding && seat.padding > 0) {
                  // Use margin-left to create space before the first seat
                  if (seat.number === 1) {
                    seatClass += ` ml-${Math.ceil(seat.padding * 4)}`;
                  }
                }
                
                // Apply status-based styling
                if (isSelected) {
                  seatClass += " bg-green-500 text-white";
                } else if (seat.status === 'booked' || seat.status === 'unavailable') {
                  seatClass += " bg-gray-300 text-gray-500 cursor-not-allowed";
                } else if (seat.status === 'pending') {
                  seatClass += " bg-yellow-200 text-yellow-800 cursor-not-allowed";
                } else {
                  // Available seats
                  const color = seat.color?.replace('#', '') || '4b5563';
                  seatClass += ` bg-gray-100 text-gray-800 hover:bg-gray-200`;
                  if (seat.color) {
                    seatClass += ` border-2 border-${color}`;
                  }
                }
                
                return (
                  <div 
                    key={seat.id} 
                    className={seatClass}
                    onClick={() => handleSeatClick(seat)}
                    title={`${seat.row}${seat.number} - ₹${seat.price}`}
                    style={{
                      ...(seat.color && seat.status === 'available' && !isSelected ? 
                        { borderColor: seat.color, backgroundColor: `${seat.color}20` } : {}),
                    }}
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3" />
                    ) : seat.status === 'booked' || seat.status === 'unavailable' ? (
                      <X className="h-3 w-3" />
                    ) : (
                      seat.number
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center flex-wrap gap-4 text-xs">
        {categories.filter(c => c.id === selectedCategory).map(category => (
          <div key={category.id} className="flex items-center">
            <div 
              className="w-4 h-4 rounded mr-1" 
              style={{ backgroundColor: `${category.color}40`, borderColor: category.color, borderWidth: '1px' }}
            ></div>
            <span>{category.name}</span>
          </div>
        ))}
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-1"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-200 rounded mr-1"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-300 rounded mr-1"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
};

export default SeatMap;
