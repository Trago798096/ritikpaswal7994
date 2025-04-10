import { Link } from 'react-router-dom';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { EventStatus } from '@/types/events';

export interface EventProps {
  id: string;
  title: string;
  description?: string; // Added description property
  image_url?: string;
  date: string;
  venue: string;
  city: string;
  category: string;
  price_range?: string;
  status?: string;
  interested?: number;
  featured?: boolean; // Added featured property
  onClick?: () => void;
}

const EventCard = ({ 
  id, 
  title, 
  image_url, 
  date, 
  venue, 
  city, 
  category, 
  price_range, 
  status = 'upcoming',
  interested = 0,
  onClick
}: EventProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Link to={`/events/${id}`} className="event-card block" onClick={handleClick}>
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden group bg-gray-100">
        <img 
          className="w-full h-full object-cover group-hover:opacity-75 transition-opacity duration-300"
          src={image_url || '/placeholder.svg'}
          alt={title}
          loading="lazy"
          onError={(e) => e.currentTarget.src = '/placeholder.svg'}
        />
        
        {status === 'fast-filling' && (
          <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
            Fast Filling
          </span>
        )}
        
        {status === 'sold_out' && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Sold Out
          </span>
        )}
        
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-12 px-4 pb-4">
          <h3 className="text-white font-bold text-lg truncate">{title}</h3>
          <p className="text-gray-300 text-sm">{category}</p>
        </div>
      </div>
      
      <div className="mt-3 space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <Clock className="inline-block w-4 h-4 mr-1" />
          {new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
        
        <div className="flex items-center text-gray-600 text-sm">
          <Calendar className="h-4 w-4 mr-2 text-book-primary" />
          <span>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        
        <div className="flex items-center text-gray-600 text-sm">
          <MapPin className="h-4 w-4 mr-2 text-book-primary" />
          <span className="truncate">{venue}, {city}</span>
        </div>
        
        <div className="flex items-center text-gray-600 text-sm">
          <div className="font-bold text-book-primary">
            {price_range || 'Price TBA'}
          </div>
          {interested > 0 && (
            <div className="text-sm text-gray-500">
              {interested.toLocaleString()} interested
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
