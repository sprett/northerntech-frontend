import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MapPin, Plus, X, CloudRain, Search, Trash2 } from 'lucide-react';
import { searchCities, getWeatherData } from '../services/weatherApi';
import { 
  getFavoriteCities, 
  addFavoriteCity, 
  removeFavoriteCity 
} from '../services/favoriteCitiesService';
import { getWeatherIconPath } from '../utils/weatherIcons';

const DEBOUNCE_DELAY = 300;

function Stations() {
  const navigate = useNavigate();
  const [favoriteCities, setFavoriteCities] = useState([]);
  const [cityWeatherData, setCityWeatherData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const fetchCityWeather = useCallback(async (city) => {
    try {
      const data = await getWeatherData(city.lat, city.lon);
      

      const todayForecasts = data.daily.slice(0, 8);
      
      const dailyMin = Math.min(...todayForecasts.map(f => f.main.temp_min));
      const dailyMax = Math.max(...todayForecasts.map(f => f.main.temp_max));
      
      return {
        main: {
          temp: data.current.temp,
          temp_min: dailyMin,
          temp_max: dailyMax,
        },
        weather: data.current.weather,
      };
    } catch (err) {
      console.error(`Error fetching weather for ${city.name}:`, err);
      return null;
    }
  }, []);

  const loadFavoriteCities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const favorites = getFavoriteCities();
      setFavoriteCities(favorites);
      
      if (!favorites.length) {
        setCityWeatherData({});
        return;
      }

      const entries = await Promise.all(
        favorites.map(async (city) => [city.id, await fetchCityWeather(city)])
      );

      setCityWeatherData(Object.fromEntries(entries));
    } catch (err) {
      console.error('Error loading favorite cities:', err);
      setError(err.message || 'Failed to load favorite cities');
    } finally {
      setLoading(false);
    }
  }, [fetchCityWeather]);

  useEffect(() => {
    loadFavoriteCities();
  }, [loadFavoriteCities]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);


  const debouncedSearchCities = useCallback((query) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await searchCities(query, 8);
        setSearchSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching city suggestions:', error);
        setSearchSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_DELAY);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearchCities(value);
    setShowSuggestions(true);
  };

  const handleAddCity = async (cityData) => {
    try {
      setError(null);
      const addedCity = addFavoriteCity(cityData);
      
      setFavoriteCities((prev) => [...prev, addedCity]);
      const weather = await fetchCityWeather(addedCity);
      setCityWeatherData((prev) => ({ ...prev, [addedCity.id]: weather }));
      
      setSearchQuery('');
      setSearchSuggestions([]);
      setShowSuggestions(false);
    } catch (err) {
      console.error('Error adding city:', err);
      setError(err.message || 'Failed to add city');
    }
  };

  const handleRemoveCity = (cityId) => {
    try {
      setError(null);
      removeFavoriteCity(cityId);
      setFavoriteCities(prev => prev.filter(city => city.id !== cityId));
      setCityWeatherData(prev => {
        const newData = { ...prev };
        delete newData[cityId];
        return newData;
      });
    } catch (err) {
      console.error('Error removing city:', err);
      setError(err.message || 'Failed to remove city');
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Navbar with Navigation and Search Bar */}
      <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-8 mb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            {/* Navigation Buttons */}
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                className="bg-transparent hover:bg-gray-100 hover:cursor-pointer text-gray-700 border-0 shadow-none"
              >
                Weather
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-gray-50 hover:cursor-pointer border-0 shadow-none"
              >
                Stations
              </Button>
            </div>

            {/* Search Bar */}
            <div className="flex-1 relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400 size-5 z-10" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search for a city to add..."
                  className="pl-12 pr-4 h-12 text-base border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  autoComplete="off"
                />
              </div>

              {/* Search Suggestions Dropdown */}
              {showSuggestions && (searchSuggestions.length > 0 || isSearching) && searchQuery.length >= 2 && (
                <div className="absolute top-full w-full bg-white border border-gray-200 rounded-lg rounded-t-none shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">
                      {isSearching ? 'Searching...' : 'Add to Stations'}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {isSearching && (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        Loading suggestions...
                      </div>
                    )}
                    {!isSearching && searchSuggestions.length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No cities found
                      </div>
                    )}
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAddCity(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 hover:cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-50 last:border-b-0"
                      >
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-700">{suggestion.displayName}</span>
                        <Plus className="w-4 h-4 text-blue-600 ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="px-4 mb-8 md:px-8"
      >
        <div className="max-w-6xl mx-auto">
          {/* Error Alert */}
          {error && (
            <Card className="mb-6 p-4 bg-red-50/80 shadow-none border-red-200">
              <div className="flex items-center gap-2 text-red-800">
                <span className="font-semibold">Error:</span>
                <span>{error}</span>
              </div>
            </Card>
          )}

          {/* Favorite Cities Grid */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              My Weather Stations {favoriteCities.length > 0 && `(${favoriteCities.length})`}
            </h2>
          </div>

          {loading ? (
            <Card className="p-12 bg-white/80 backdrop-blur-sm border-blue-200">
              <div className="text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
                <p>Loading stations...</p>
              </div>
            </Card>
          ) : favoriteCities.length === 0 ? (
            <Card className="p-12 bg-white/80 backdrop-blur-sm border-blue-200">
              <div className="text-center">
                <CloudRain className="size-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl text-gray-500 mb-2">No saved cities yet</h3>
                <p className="text-gray-400">
                  Search for a city above to add it to your weather stations
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteCities.map((city) => {
                const weather = cityWeatherData[city.id];
                
                return (
                  <Card key={city.id} className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="size-4 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{city.name}</h3>
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div>{city.state ? `${city.state}, ` : ''}{city.country}</div>
                          <div className="text-xs text-gray-400">
                            Added: {formatDate(city.addedAt)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCity(city.id)}
                        className="hover:bg-red-50 hover:text-red-600  hover:cursor-pointer -mt-2 -mr-2"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {weather ? (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          <div className="text-4xl font-light text-gray-900 mb-1">
                            {Math.round(weather.main.temp)}°
                          </div>
                          <div className="text-sm text-gray-600 capitalize mb-2">
                            {weather.weather[0]?.description || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            <span>H: {Math.round(weather.main.temp_max)}°</span>
                            <span className="mx-2">•</span>
                            <span>L: {Math.round(weather.main.temp_min)}°</span>
                          </div>
                        </div>
                        <div>
                          <img 
                            src={getWeatherIconPath(weather.weather[0]?.icon || '01d')}
                            alt={weather.weather[0]?.description || 'weather'}
                            className="w-16 h-16"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-gray-400 border-t border-gray-200 mt-4">
                        Loading weather...
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Stations;
