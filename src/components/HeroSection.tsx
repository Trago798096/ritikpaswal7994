import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
  sort_order: number;
  is_active: boolean;
}

const DEFAULT_SLIDES = [
  {
    id: '1',
    title: "Kolkata Knight Riders vs Royal Challengers Bengaluru",
    subtitle: "The Champions are back! The IPL 2025 season opener",
    image_url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1905&q=80",
    link: "/events/kkr-vs-rcb",
    sort_order: 1,
    is_active: true
  },
  {
    id: '2',
    title: "Latest Movies & Exclusive Premieres",
    subtitle: "Book tickets for the hottest new releases",
    image_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1959&q=80",
    link: "/movies",
    sort_order: 2,
    is_active: true
  },
  {
    id: '3',
    title: "Live Concert Experiences",
    subtitle: "Don't miss out on your favorite artists",
    image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1950&q=80",
    link: "/events/concerts",
    sort_order: 3,
    is_active: true
  }
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.6); // Default to 60%

  // Fetch hero overlay opacity from site settings
  useEffect(() => {
    const fetchOverlayOpacity = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'hero_overlay_opacity')
          .single();

        if (error) {
          console.error('Error fetching overlay opacity:', error);
          return;
        }

        if (data?.value) {
          setOverlayOpacity(parseFloat(data.value));
        }
      } catch (error) {
        console.error('Error fetching overlay opacity:', error);
      }
    };

    fetchOverlayOpacity();
  }, []);
  
  // Fetch hero slides from database with error handling
  const { data: heroSlidesData, isLoading, error } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('hero_slides')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
          
        if (error) {
          console.error('Error fetching hero slides:', error);
          return DEFAULT_SLIDES;
        }
        
        if (!data || data.length === 0) {
          console.log('No hero slides found, using defaults');
          return DEFAULT_SLIDES;
        }
        
        console.log('Fetched hero slides:', data);
        return data as HeroSlide[];
      } catch (error) {
        console.error('Exception fetching hero slides:', error);
        return DEFAULT_SLIDES;
      }
    },
    refetchOnMount: true,
    staleTime: 60000, // 1 minute
    retry: 2,
  });
  
  const slides = heroSlidesData || DEFAULT_SLIDES;
  
  // Set default overlay opacity
  useEffect(() => {
    setOverlayOpacity(0.5); // Using a default value of 0.5 (50%)
  }, []);
  
  useEffect(() => {
    if (slides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [slides.length]);
  
  if (slides.length === 0) {
    return null; // Don't render if there are no slides
  }
  
  return (
    <section className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Hero Slider */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <div 
              className="absolute inset-0 z-10" 
              style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
            />
            <img
              src={slide.image_url || '/placeholder.svg'}
              alt={slide.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 h-full flex flex-col justify-center relative z-20">
        <div className="max-w-3xl animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {slides[currentSlide]?.title}
          </h1>
          <p className="text-xl text-white/90 mb-8">
            {slides[currentSlide]?.subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="search"
                className="w-full pl-10 py-3 px-4 bg-white/90 backdrop-blur-sm text-book-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-book-primary"
                placeholder="Search for movies, events, plays..."
              />
            </div>
            
            <Link
              to={slides[currentSlide]?.link || '/'}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>Book Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {/* Indicators */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? "w-8 bg-book-primary" : "bg-white/60"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
