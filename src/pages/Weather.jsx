import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWeatherByCity, getWeatherByCoordinates, searchCities } from '../services/weatherApi'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Search, Clock, X, MapPin, Droplets, Wind, Gauge, Eye, Thermometer, Sunrise as SunriseIcon, Sunset as SunsetIcon, Sun, Navigation, AlertCircle } from 'lucide-react'
import { getWeatherIcon } from '../utils/weatherIcons'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const SEARCH_HISTORY_KEY = 'weather-search-history'
const CURRENT_WEATHER_KEY = 'weather-current-data'
const MAX_HISTORY_ITEMS = 5
const DEBOUNCE_DELAY = 300 // ms

const parseJSONSafely = (value, fallback = null) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const readHistoryFromStorage = () => parseJSONSafely(localStorage.getItem(SEARCH_HISTORY_KEY), [])
const readSavedWeather = () => parseJSONSafely(localStorage.getItem(CURRENT_WEATHER_KEY))

const chartConfig = {
  temperature: {
    label: "Temperature",
    color: "hsl(217, 91%, 60%)",
  },
}

const WeatherIcon = ({ weather, className = "w-6 h-6" }) => {
  const iconPath = getWeatherIcon(weather)

  return (
    <img 
      src={iconPath} 
      alt={weather?.description || 'weather icon'} 
      className={className}
    />
  )
}

function Weather() {
  const navigate = useNavigate()
  const [cityName, setCityName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [searchHistory, setSearchHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isActivelyTyping, setIsActivelyTyping] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const debounceTimerRef = useRef(null)

  const loadHistoryFromStorage = useCallback(() => {
    setSearchHistory(readHistoryFromStorage())
  }, [])

  const addToSearchHistory = useCallback((cityData) => {
    const cityIdentifier = `${cityData.location.name}, ${cityData.location.country}`
    
    setSearchHistory((prev) => {
      const filtered = prev.filter(item => item !== cityIdentifier)
      const newHistory = [cityIdentifier, ...filtered].slice(0, MAX_HISTORY_ITEMS)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  const applyWeatherData = useCallback((data, { persist = true, saveHistory = true } = {}) => {
    setWeatherData(data)
    setCityName(data.location.name)
    if (persist) {
      localStorage.setItem(CURRENT_WEATHER_KEY, JSON.stringify(data))
    }
    if (saveHistory) {
      addToSearchHistory(data)
    }
  }, [addToSearchHistory])

  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      const savedHistory = readHistoryFromStorage()
      if (isMounted) {
        setSearchHistory(savedHistory)
      }

      const savedWeather = readSavedWeather()
      if (savedWeather) {
        if (isMounted) {
          applyWeatherData(savedWeather, { saveHistory: false, persist: false })
        }
        return
      }

      try {
        setLoading(true)
        const data = await getWeatherByCity('New York')
        if (isMounted) {
          applyWeatherData(data)
        }
      } catch {
        if (isMounted) {
          setError('Failed to load default weather')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadInitialData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [applyWeatherData])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowHistory(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setShowHistory(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const debouncedSearchCities = useCallback((query) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!query || query.trim().length < 2) {
      setSearchSuggestions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await searchCities(query, 5)
        setSearchSuggestions(suggestions)
      } catch (error) {
        console.error('Error fetching city suggestions:', error)
        setSearchSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, DEBOUNCE_DELAY)
  }, [])

  const handleInputChange = (e) => {
    const value = e.target.value
    setCityName(value)
    setIsActivelyTyping(true)
    setHighlightedIndex(-1)
    debouncedSearchCities(value)
    setShowHistory(true)
  }

  const handleInputFocus = () => {
    loadHistoryFromStorage()
    setShowHistory(true)
    setIsActivelyTyping(false)
    setHighlightedIndex(-1)
    setSearchSuggestions([])
    if (inputRef.current && weatherData) {
      inputRef.current.select()
    }
  }

  // Keyboard navigation for dropdown
  const handleKeyDown = (e) => {
    if (!showHistory) return

    const items = isActivelyTyping && cityName.trim().length >= 2 
      ? searchSuggestions 
      : searchHistory

    const totalItems = isActivelyTyping ? items.length : items.length + 1

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      
      if (isActivelyTyping && cityName.trim().length >= 2) {
        if (highlightedIndex < searchSuggestions.length) {
          handleSuggestionClick(searchSuggestions[highlightedIndex])
        }
      } else {
        if (highlightedIndex === 0) {
          handleCurrentLocation()
        } else if (highlightedIndex <= searchHistory.length) {
          handleRecentSearchClick(searchHistory[highlightedIndex - 1])
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowHistory(false)
      setHighlightedIndex(-1)
      inputRef.current?.blur()
    }
  }

  const handleSearch = async (e, searchTerm = null) => {
    if (e) e.preventDefault()
    
    const term = searchTerm || cityName.trim()
    if (!term) {
      return
    }

    setLoading(true)
    setError(null)
    setShowHistory(false)
    setIsActivelyTyping(false)

    try {
      const data = await getWeatherByCity(term)
      applyWeatherData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecentSearchClick = (city) => {
    const cityName = city.split(',')[0].trim()
    setCityName(cityName)
    handleSearch(null, cityName)
  }

  const handleSuggestionClick = async (suggestion) => {
    setCityName(suggestion.displayName)
    setSearchSuggestions([])
    setShowHistory(false)
    setIsActivelyTyping(false)
    setLoading(true)
    setError(null)

    try {
      const data = await getWeatherByCoordinates(suggestion.lat, suggestion.lon, {
        name: suggestion.name,
        country: suggestion.country,
        state: suggestion.state
      })
      applyWeatherData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem(SEARCH_HISTORY_KEY)
    setShowHistory(false)
  }

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setGettingLocation(true)
    setShowHistory(false)
    setError(null)
    setLoading(true)

    const requestPosition = (options) =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options)
      })

    const geolocationAttempts = [
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    ]

    try {
      let position = null
      let lastError = null

      for (const options of geolocationAttempts) {
        try {
          position = await requestPosition(options)
          if (position) break
        } catch (attemptError) {
          lastError = attemptError
        }
      }

      if (!position) {
        throw lastError || new Error('Unable to determine location after multiple attempts')
      }

      const { latitude, longitude } = position.coords
      const GEO_BASE_URL = "https://api.openweathermap.org/geo/1.0"
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

      let locationInfo = {
        name: 'Current Location',
        country: '',
        state: ''
      }

      if (API_KEY) {
        try {
          const geoResponse = await fetch(
            `${GEO_BASE_URL}/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
          )
          
          if (geoResponse.ok) {
            const [location] = await geoResponse.json()
            if (location) {
              locationInfo = {
                name: location.name,
                country: location.country,
                state: location.state || ''
              }
            }
          }
        } catch (geoError) {
          console.warn('Reverse geocoding failed:', geoError)
        }
      }
      
      const data = await getWeatherByCoordinates(latitude, longitude, locationInfo)
      applyWeatherData(data)
      
    } catch (err) {
      if (err?.code === 1) {
        setError('Location access denied. Please allow location access in your browser settings and reload the page.')
      } else if (err?.code === 2) {
        setError('Unable to determine your location. Try searching for your city manually.')
      } else if (err?.code === 3) {
        setError('Location request timed out. Your device may be having trouble determining location. Try searching for your city manually.')
      } else {
        setError(err?.message || 'Failed to get current location. Please search for your city instead.')
      }
    } finally {
      setGettingLocation(false)
      setLoading(false)
    }
  }

  const hourlyForecast = useMemo(() => {
    if (!weatherData?.weather?.daily || !Array.isArray(weatherData.weather.daily)) return []
    
    const now = Date.now() / 1000
    return weatherData.weather.daily
      .filter(forecast => forecast.dt >= now)
      .slice(0, 11)
      .map(forecast => {
        const date = new Date(forecast.dt * 1000)
        const time = date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        
        return {
          time,
          temp: Math.round(forecast.main?.temp || forecast.temp || 0),
          weather: forecast.weather?.[0]
        }
      })
  }, [weatherData])

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const fiveDayForecast = useMemo(() => {
    if (!weatherData?.weather?.daily || !Array.isArray(weatherData.weather.daily)) return []

    const forecastList = weatherData.weather.daily
    const dailyData = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    forecastList.forEach((forecast) => {
      const forecastDate = new Date(forecast.dt * 1000)
      const forecastHour = forecastDate.getHours()
      forecastDate.setHours(0, 0, 0, 0)

      const dayKey = forecastDate.toISOString().split('T')[0]
      
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = {
          date: forecastDate,
          temps: [],
          pop: [],
          weather: null,
          noonTimeDiff: Infinity,
        }
      }
      
      const timeDiffFromNoon = Math.abs(forecastHour - 12)
      if (timeDiffFromNoon < dailyData[dayKey].noonTimeDiff) {
        dailyData[dayKey].noonTimeDiff = timeDiffFromNoon
        dailyData[dayKey].weather = forecast.weather?.[0]
      }
      
      const temp = forecast.main?.temp || forecast.temp
      if (temp !== undefined) {
        dailyData[dayKey].temps.push(temp)
      }
      
      if (forecast.pop !== undefined) {
        dailyData[dayKey].pop.push(forecast.pop * 100)
      }
    })

    return Object.values(dailyData)
      .sort((a, b) => a.date - b.date)
      .filter(day => day.date.getTime() >= today.getTime())
      .slice(0, 5)
      .map((day, index) => ({
        index,
        dayName: day.date.toLocaleDateString('en-US', { weekday: 'long' }),
        date: day.date,
        minTemp: day.temps.length > 0 ? Math.round(Math.min(...day.temps)) : 0,
        maxTemp: day.temps.length > 0 ? Math.round(Math.max(...day.temps)) : 0,
        pop: day.pop.length > 0 ? Math.round(day.pop.reduce((a, b) => a + b, 0) / day.pop.length) : 0,
        weather: day.weather
      }))
  }, [weatherData])

  const graphData = useMemo(() => (
    fiveDayForecast.map(day => ({
      day: day.dayName,
      dayShort: day.dayName.charAt(0),
      temperature: day.maxTemp,
      minTemp: day.minTemp
    }))
  ), [fiveDayForecast])

  const rainChance = useMemo(() => {
    if (!weatherData?.weather?.current) return 0
    
    const current = weatherData.weather.current
    
    if (weatherData.weather.daily && Array.isArray(weatherData.weather.daily)) {
      const now = Math.floor(Date.now() / 1000)
      const currentForecast = weatherData.weather.daily.reduce((closest, forecast) => {
        if (!closest) return forecast
        const closestDiff = Math.abs(closest.dt - now)
        const forecastDiff = Math.abs(forecast.dt - now)
        return forecastDiff < closestDiff ? forecast : closest
      }, null)
      
      if (currentForecast?.pop !== undefined) {
        return Math.round(currentForecast.pop * 100)
      }
    }
    
    if (current.rain) {
      return 10
    }
    
    return 0
  }, [weatherData])

  const locationName = useMemo(() => {
    if (!weatherData) return null
    const { location } = weatherData
    return `${location.name}${location.state ? `, ${location.state}` : ''}, ${location.country}`
  }, [weatherData])

  const currentWeather = weatherData?.weather?.current
  const feelsLike = useMemo(() => (
    currentWeather?.feels_like ? Math.round(currentWeather.feels_like) : null
  ), [currentWeather])

  return (
    <div className="min-h-screen">
      {/* Navbar with Navigation and Search Bar */}
      <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-8 mb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            {/* Navigation Buttons */}
            <div className="flex gap-2 shrink-0">
              <Button
                className="bg-white text-blue-600 hover:bg-gray-50 hover:cursor-pointer border-0 shadow-none"
              >
                Weather
              </Button>
              <Button
                onClick={() => navigate('/stations')}
                variant="ghost"
                className="bg-transparent hover:bg-gray-100 hover:cursor-pointer text-gray-700 border-0 shadow-none"
              >
                Stations
              </Button>
            </div>

            {/* Search Bar */}
            <div className="flex-1 relative" ref={searchRef}>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400 size-5 z-10" />
                  <Input
                    ref={inputRef}
                    type="text"
                    value={cityName}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for a city..."
                    disabled={loading}
                    className="pl-12 pr-20 h-12 text-base border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    autoComplete="off"
                  />
                  {/* Error tooltip indicator */}
                  {error && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 group">
                      <AlertCircle className="w-5 h-5 text-red-500 cursor-help" />
                      {/* Tooltip */}
                      <div className="invisible group-hover:visible absolute right-0 top-full mt-2 w-64 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                        {/* Arrow */}
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-red-50 border-l border-t border-red-200 transform rotate-45"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Keyboard shortcut indicator */}
                  {!showHistory && !cityName && !error && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded">
                        {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} K
                      </kbd>
                    </div>
                  )}
                </div>
              </form>

            {/* Search Suggestions & History Dropdown */}
            {showHistory && (searchSuggestions.length > 0 || searchHistory.length > 0 || isSearching) && (
              <div className="absolute top-full w-full bg-white border border-gray-200 rounded-lg rounded-t-none shadow-lg z-50 overflow-hidden">
                {/* Show suggestions when user is actively typing */}
                {isActivelyTyping && cityName.trim().length >= 2 ? (
                  <>
                    <div className="px-4 py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">
                        {isSearching ? 'Searching...' : 'Suggestions'}
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
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`w-full px-4 py-3 text-left hover:cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-50 last:border-b-0 ${
                            highlightedIndex === index ? 'bg-blue-100' : 'hover:bg-blue-50'
                          }`}
                        >
                          <MapPin className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-700">{suggestion.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Current Location Option */}
                    <button
                      type="button"
                      onClick={handleCurrentLocation}
                      disabled={gettingLocation}
                      className={`w-full px-4 py-3 text-left hover:cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                        highlightedIndex === 0 ? 'bg-blue-100' : 'hover:bg-blue-50'
                      }`}
                    >
                      <Navigation className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-900 font-medium">
                        {gettingLocation ? 'Getting location...' : 'Current Location'}
                      </span>
                    </button>

                    {/* Recent Searches */}
                    {searchHistory.length > 0 && (
                      <>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-700">Recent Searches</span>
                          <button
                            type="button"
                            onClick={clearSearchHistory}
                            className="text-xs text-gray-500 hover:text-red-600 cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Clear
                          </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {searchHistory.map((city, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleRecentSearchClick(city)}
                              className={`w-full px-4 py-3 text-left hover:cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-50 last:border-b-0 ${
                                highlightedIndex === index + 1 ? 'bg-blue-100' : 'hover:bg-blue-50'
                              }`}
                            >
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{city}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-8">
        <div className="max-w-6xl mx-auto">

        {weatherData && (
          <>
            {/* Hero Weather Card with Gradient */}
            <div className="mb-8 p-8 md:p-12 rounded-3xl bg-linear-to-br from-blue-600 via-blue-500 to-blue-400 text-white shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-semibold mb-4">{locationName}</h1>
                  <div className="flex items-end gap-4 mb-4">
                    <div className="text-7xl md:text-8xl font-bold leading-none">
                      {Math.round(currentWeather?.temp || 0)}°
                    </div>
                    <div className="pb-2">
                    </div>
                  </div>
                  <div className="text-lg flex items-center gap-2">
                    <span>{rainChance}% chance of rain</span>
                    <span className="text-white/60">•</span>
                    <span>{feelsLike !== null && `Feels like ${feelsLike}°`}</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-blue-200/80">
                    <WeatherIcon weather={currentWeather?.weather?.[0]} className="w-32 h-32" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Forecast */}
            {hourlyForecast.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Hourly forecast</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {hourlyForecast.map((hour, index) => (
                    <div 
                      key={index}
                      className="shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm min-w-[90px] hover:shadow-md transition-shadow"
                    >
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        {hour.time}
                      </div>
                      <div className="text-blue-500 mb-3">
                        <WeatherIcon weather={hour.weather} className="w-8 h-8" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {hour.temp}°
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weather Details */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Weather details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Humidity */}
                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-3">
                    <Droplets className="w-5 h-5" />
                    <span className="text-sm font-medium">Humidity</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentWeather?.humidity || 0}%
                  </div>
                </div>

                {/* Wind Speed */}
                <div className="p-5 rounded-2xl bg-cyan-50/70 border border-cyan-100">
                  <div className="flex items-center gap-2 text-cyan-600 mb-3">
                    <Wind className="w-5 h-5" />
                    <span className="text-sm font-medium">Wind Speed</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(currentWeather?.wind_speed || 0).toFixed(1)} m/s
                  </div>
                </div>

                {/* Pressure */}
                <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <div className="flex items-center gap-2 text-purple-600 mb-3">
                    <Gauge className="w-5 h-5" />
                    <span className="text-sm font-medium">Pressure</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentWeather?.pressure || 0} hPa
                  </div>
                </div>

                {/* UV Index */}
                <div className="p-5 rounded-2xl bg-yellow-50/70 border border-yellow-100">
                  <div className="flex items-center gap-2 text-yellow-600 mb-3">
                    <Sun className="w-5 h-5" />
                    <span className="text-sm font-medium">UV Index</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(currentWeather?.uvi || 0)} (Low)
                  </div>
                </div>

                {/* Visibility */}
                <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-100">
                  <div className="flex items-center gap-2 text-teal-600 mb-3">
                    <Eye className="w-5 h-5" />
                    <span className="text-sm font-medium">Visibility</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round((currentWeather?.visibility || 0) / 1000)} km
                  </div>
                </div>

                {/* Dew Point */}
                <div className="p-5 rounded-2xl bg-green-50/70 border border-green-100">
                  <div className="flex items-center gap-2 text-green-600 mb-3">
                    <Thermometer className="w-5 h-5" />
                    <span className="text-sm font-medium">Dew Point</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(currentWeather?.dew_point || 0)}°C
                  </div>
                </div>

                {/* Sunrise */}
                <div className="p-5 rounded-2xl bg-orange-50/70 border border-orange-100">
                  <div className="flex items-center gap-2 text-orange-600 mb-3">
                    <SunriseIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Sunrise</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatTime(currentWeather?.sunrise)}
                  </div>
                </div>

                {/* Sunset */}
                <div className="p-5 rounded-2xl bg-pink-50/70 border border-pink-100">
                  <div className="flex items-center gap-2 text-pink-600 mb-3">
                    <SunsetIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Sunset</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatTime(currentWeather?.sunset)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom section */}
            <Card className="p-4 md:p-8 border-none shadow-none">
              <div className="space-y-6">
                {/* 5 Day Forecast */}
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-gray-800">5 day forecast</h2>
                  <div className="space-y-3">
                    {fiveDayForecast.map((day, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="text-blue-500">
                          <WeatherIcon weather={day.weather} className="w-6 h-6" />
                        </div>
                        <span className="text-gray-700 flex-1">{day.dayName}</span>
                        <span className="text-gray-900 font-medium">
                          {day.maxTemp}° / {day.minTemp}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Temperature Chart */}
                <div>
                  <Card className="p-4 md:p-6 border-none shadow-none">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Temperature Trend</h3>
                    <div className="w-full h-[240px] md:h-[280px]">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                        <LineChart
                          data={graphData}
                          margin={{
                            top: 10,
                            right: 10,
                            left: -20,
                            bottom: 10,
                          }}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            strokeOpacity={0.3}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            tickFormatter={(value) => value.charAt(0)}
                            className="text-xs"
                            tick={{ fill: 'hsl(217, 91%, 60%)', fontWeight: 600 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            domain={['dataMin - 2', 'dataMax + 2']}
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <ChartTooltip
                            cursor={{ stroke: 'hsl(217, 91%, 60%)', strokeWidth: 1, strokeDasharray: '5 5' }}
                            content={
                              <ChartTooltipContent
                                indicator="line"
                                nameKey="temperature"
                                formatter={(value) => `${value}°C`}
                                className="bg-white/95 backdrop-blur-sm"
                              />
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="temperature"
                            stroke="hsl(217, 91%, 60%)"
                            strokeWidth={3}
                            dot={{
                              fill: "hsl(217, 91%, 60%)",
                              strokeWidth: 2,
                              r: 5,
                              stroke: "white",
                            }}
                            activeDot={{
                              r: 7,
                              fill: "hsl(217, 91%, 60%)",
                              stroke: "white",
                              strokeWidth: 3,
                            }}
                          />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </>
        )}

        {!weatherData && !loading && (
          <Card className="p-12 bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="text-center text-gray-500">
              Search for a city to see weather information
            </div>
          </Card>
        )}

        {loading && (
          <Card className="p-12 bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4">Loading weather data...</p>
            </div>
          </Card>
        )}
        </div>
      </div>
    </div>
  )
}

export default Weather
