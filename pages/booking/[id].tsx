import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

// Define the type for the environment variables
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const supabaseUrl = (import.meta.env as ImportMetaEnv).VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env as ImportMetaEnv).VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Booking() {
  const router = useRouter();
  const { id } = router.query;
  const [show, setShow] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchShowAndSeats() {
      try {
        // Fetch show details
        const { data: showData, error: showError } = await supabase
          .from('shows')
          .select(`
            *,
            movies (
              id,
              title
            ),
            screens (
              id,
              name,
              theaters (
                id,
                name,
                location
              )
            )
          `)
          .eq('id', id)
          .single();

        if (showError) throw showError;
        setShow(showData);

        // Fetch seats for this screen
        const { data: seatsData, error: seatsError } = await supabase
          .from('seats')
          .select(`
            *,
            seat_categories (
              id,
              name,
              price_multiplier
            )
          `)
          .eq('screen_id', showData.screens.id);

        if (seatsError) throw seatsError;
        setSeats(seatsData || []);
      } catch (error) {
        console.error('Error fetching show details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchShowAndSeats();
  }, [id]);

  const handleSeatClick = (seatId: string) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      }
      return [...prev, seatId];
    });
  };

  const calculateTotal = () => {
    return selectedSeats.reduce((total, seatId) => {
      const seat = seats.find(s => s.id === seatId);
      return total + (show.price_base * seat.seat_categories.price_multiplier);
    }, 0);
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) return;

    try {
      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Test user
          show_id: id,
          total_amount: calculateTotal(),
          status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking seats
      const bookingSeats = selectedSeats.map(seatId => ({
        booking_id: booking.id,
        seat_id: seatId,
        price: show.price_base * seats.find(s => s.id === seatId).seat_categories.price_multiplier
      }));

      const { error: seatsError } = await supabase
        .from('booking_seats')
        .insert(bookingSeats);

      if (seatsError) throw seatsError;

      router.push(`/payment/${booking.id}`);
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (!show) {
    return <div className="text-center py-10">Show not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-3xl font-bold text-gray-900">{show.movies.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {show.screens.theaters.name} - {show.screens.theaters.location}
            </p>
            <p className="mt-2 text-sm text-gray-900">
              {new Date(show.start_time).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Seats</h2>
          <div className="grid grid-cols-10 gap-2">
            {seats.map((seat) => (
              <button
                key={seat.id}
                className={`
                  p-2 rounded text-sm
                  ${selectedSeats.includes(seat.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                `}
                onClick={() => handleSeatClick(seat.id)}
              >
                {seat.row_number}{seat.seat_number}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Booking Summary</h3>
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Selected Seats: {selectedSeats.length}
              </p>
              <p className="mt-2 text-lg font-medium text-gray-900">
                Total Amount: ₹{calculateTotal()}
              </p>
            </div>
            <div className="mt-6">
              <button
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleBooking}
                disabled={selectedSeats.length === 0}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 