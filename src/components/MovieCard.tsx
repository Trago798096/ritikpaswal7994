import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

export interface MovieProps {
  id: string;
  title: string;
  image: string;
  rating?: number;
  language: string;
  genre: string;
  format?: string;
}

const MovieCard = ({ 
  id, 
  title, 
  image, 
  rating, 
  language, 
  genre,
  format 
}: MovieProps) => {
  return (
    <Link to={`/movies/${id}`} className="event-card block">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
        />
        <img 
          src={image || '/placeholder.svg'}
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          onError={(e) => e.currentTarget.src = '/placeholder.svg'}
        />
        
        {/* Rating badge */}
        {rating && (
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center">
            <Star className="w-3 h-3 text-yellow-400 mr-1" />
            <span>{rating}/10</span>
          </div>
        )}
        
        {/* Format badge */}
        {format && (
          <div className="absolute top-2 left-2 bg-book-primary text-white px-2 py-1 rounded-md text-xs">
            {format}
          </div>
        )}
      </div>
      
      <div className="mt-2">
        <h3 className="font-medium text-base line-clamp-1">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{language} • {genre}</p>
      </div>
    </Link>
  );
};

export default MovieCard;
