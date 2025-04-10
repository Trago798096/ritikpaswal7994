
export type EventStatus = 'available' | 'sold_out' | 'cancelled' | 'postponed' | 'ongoing' | 'fast-filling';

export interface Event {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  date: string;
  venue: string;
  city: string;
  category: string;
  price_range?: string;
  status: string;
  interested: number;
  created_at: string;
  updated_at: string;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'unavailable' | 'booked';
  price: number;
  category: string;
}
