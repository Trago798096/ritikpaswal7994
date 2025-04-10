import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Define the type for the environment variables
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

// Initialize Supabase client
const supabase = createClient(
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_URL,
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_ANON_KEY
);

interface Movie {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  release_date: string;
  language: string;
  duration: number;
}

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setMovies(data || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Now Showing</h1>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <div key={movie.id} className="bg-card rounded-lg shadow-lg overflow-hidden">
              <div className="relative aspect-[2/3]">
                <img
                  src={movie.poster_url || '/placeholder-movie.jpg'}
                  alt={movie.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{movie.title}</h2>
                <p className="text-muted-foreground text-sm mb-2">
                  {movie.language} • {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
                </p>
                <p className="text-sm line-clamp-2">{movie.description}</p>
                <button className="mt-4 w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-opacity">
                  Book Tickets
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 