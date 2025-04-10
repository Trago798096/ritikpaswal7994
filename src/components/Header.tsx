import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthState } from '@/hooks/useAuthState';
import MainNavigation from '@/components/MainNavigation';
import CitySelector from '@/components/CitySelector';

interface HeaderProps {
  transparent?: boolean;
}

export const Header = ({
  transparent = false
}: HeaderProps) => {
  const {
    user,
    signOut,
    isAdmin
  } = useAuth();
  const { profile } = useAuthState();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [currentCity, setCurrentCity] = useState('Kolkata');
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const storedCity = localStorage.getItem('selectedCity');
    if (storedCity) {
      setCurrentCity(storedCity);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate('/login');
  };

  const handleCityChange = (city: string) => {
    const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
    setCurrentCity(formattedCity);
    setShowCitySelector(false);
    localStorage.setItem('selectedCity', formattedCity);
  };

  return <>
      <header className={`sticky top-0 z-40 w-full 
        ${transparent && !isScrolled ? 'bg-transparent text-white' : 'bg-white border-b'} transition-colors duration-200`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 mr-4">
                <span className={`font-bold text-xl ${transparent && !isScrolled ? 'text-white' : 'text-red-600'}`}>ShowTix</span>
              </Link>
              <button 
                className={`text-sm flex items-center ${transparent && !isScrolled ? 'text-gray-200 hover:text-white' : 'text-gray-600 hover:text-black'}`}
                onClick={() => setShowCitySelector(true)}
              >
                {currentCity} 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className={`h-5 w-5 ${transparent && !isScrolled ? 'text-gray-300' : 'text-gray-400'}`} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search movies, events..." 
                  className={`pl-10 pr-4 py-2 border rounded-lg w-60 md:w-80 lg:w-96 transition-colors duration-200 ${transparent && !isScrolled ? 'bg-white/20 text-white placeholder-gray-300 border-gray-400 focus:bg-white/30' : 'bg-white text-black placeholder-gray-500 border-gray-300 focus:border-red-500 focus:ring-red-500'}`}
                  id="desktop-search"
                  name="desktop-search"
                  autoComplete="off"
                />
              </div>
              
              {user ? (
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transparent && !isScrolled ? 'bg-white/20' : 'bg-gray-200'}`}>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="User profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className={`w-4 h-4 ${transparent && !isScrolled ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </div>
                  </button>
                  
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>
                        Profile
                      </Link>
                      <Link to="/my-bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>
                        My Bookings
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="block px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Panel
                          </div>
                        </Link>
                      )}
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100">
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link 
                    to="/login" 
                    className={`btn-primary ${transparent && !isScrolled ? 'bg-white text-red-600 hover:bg-gray-200' : 'bg-red-600 text-white hover:bg-red-700'} transition-colors duration-200`}
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
            
            <div className="flex md:hidden items-center space-x-2">
              <button 
                onClick={() => navigate('/search')}
                className={`p-2 rounded-full ${transparent && !isScrolled ? 'hover:bg-white/20' : 'hover:bg-gray-100'}`}
                aria-label="Search"
              >
                <Search className={`w-5 h-5 ${transparent && !isScrolled ? 'text-white' : 'text-gray-700'}`} />
              </button>
              
              {user ? (
                <button 
                  onClick={() => navigate('/profile')} 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${transparent && !isScrolled ? 'bg-white/20' : 'bg-gray-200'}`}
                  aria-label="Profile"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="User profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className={`w-4 h-4 ${transparent && !isScrolled ? 'text-white' : 'text-gray-500'}`} />
                  )}
                </button>
              ) : (
                <Link 
                  to="/login" 
                  className={`btn-primary text-sm py-1 px-3 ${transparent && !isScrolled ? 'bg-white text-red-600 hover:bg-gray-200' : 'bg-red-600 text-white hover:bg-red-700'} transition-colors duration-200`}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <CitySelector 
        isOpen={showCitySelector} 
        onClose={() => setShowCitySelector(false)} 
        onSelectCity={handleCityChange} 
        currentCity={currentCity} 
      />
      
      <div className="block md:hidden">
        <MainNavigation />
      </div>
    </>;
};