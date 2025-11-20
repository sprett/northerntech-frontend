const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";
const GEO_BASE_URL = "https://api.openweathermap.org/geo/1.0";
const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";
const API_KEY_ERROR_MESSAGE = "API key is missing";
const API_401_MESSAGE = "API key error (401)";

const ensureApiKey = () => {
  if (!API_KEY) {
    throw new Error(API_KEY_ERROR_MESSAGE);
  }
};

const requestJson = async (url, label) => {
  const response = await fetch(url);

  if (response.ok) {
    return response.json();
  }

  const errorData = await response.json().catch(() => ({}));
  if (response.status === 401) {
    throw new Error(API_401_MESSAGE);
  }

  throw new Error(
    `${label} error: ${response.status} - ${
      errorData.message || response.statusText
    }`
  );
};

if (import.meta.env.DEV) {
  console.log(
    "API Key loaded:",
    API_KEY ? `${API_KEY.substring(0, 4)}...` : "NOT FOUND"
  );
}

/**
 * Search for cities matching a query
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of matching cities
 */
export const searchCities = async (query, limit = 5) => {
  ensureApiKey();

  if (!query || query.trim().length < 2) {
    return [];
  }

  const url = `${GEO_BASE_URL}/direct?q=${encodeURIComponent(
    query.trim()
  )}&limit=${limit}&appid=${API_KEY}`;

  try {
    const data = await requestJson(url, "Geocoding API");
    return (data || []).map((location) => ({
      lat: location.lat,
      lon: location.lon,
      name: location.name,
      country: location.country,
      state: location.state,
      displayName: `${location.name}${
        location.state ? `, ${location.state}` : ""
      }, ${location.country}`,
    }));
  } catch (error) {
    console.error("Error searching cities:", error);
    return [];
  }
};

/**
 * Get coordinates (lat, lon) from city name using Geocoding API
 * @param {string} cityName - Name of the city
 * @returns {Promise} Object with lat, lon, name, country
 */
export const getCoordinatesFromCity = async (cityName) => {
  ensureApiKey();

  const url = `${GEO_BASE_URL}/direct?q=${encodeURIComponent(
    cityName
  )}&limit=1&appid=${API_KEY}`;
  const data = await requestJson(url, "Geocoding API");

  if (!data || data.length === 0) {
    throw new Error(`City "${cityName}" not found`);
  }

  const location = data[0];
  return {
    lat: location.lat,
    lon: location.lon,
    name: location.name,
    country: location.country,
    state: location.state,
  };
};

/**
 * Get current weather data using Current Weather API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise} Current weather data
 */
export const getCurrentWeather = async (lat, lon) => {
  ensureApiKey();
  const url = `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  return requestJson(url, "Current Weather API");
};

/**
 * Get 5-day forecast using 5 Day Forecast API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise} Forecast data
 */
export const getForecast = async (lat, lon) => {
  ensureApiKey();
  const url = `${WEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  return requestJson(url, "Forecast API");
};

/**
 * Get weather data using APIs (Current Weather + 5 Day Forecast)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise} Weather data with current and forecast in One Call-like format
 */
export const getWeatherData = async (lat, lon) => {
  const [currentData, forecastData] = await Promise.all([
    getCurrentWeather(lat, lon),
    getForecast(lat, lon),
  ]);

  return {
    current: {
      dt: currentData.dt,
      temp: currentData.main.temp,
      feels_like: currentData.main.feels_like,
      pressure: currentData.main.pressure,
      humidity: currentData.main.humidity,
      dew_point: currentData.main.temp - (100 - currentData.main.humidity) / 5,
      uvi: 0,
      clouds: currentData.clouds?.all || 0,
      visibility: currentData.visibility || 0,
      wind_speed: currentData.wind?.speed || 0,
      wind_deg: currentData.wind?.deg || 0,
      weather: currentData.weather,
      rain: currentData.rain || null,
      sunrise: currentData.sys?.sunrise || null,
      sunset: currentData.sys?.sunset || null,
    },
    daily: forecastData.list || [],
    hourly: forecastData.list?.slice(0, 24) || [],
  };
};

/**
 * Get weather data for a city by name
 * @param {string} cityName - Name of the city
 * @returns {Promise} Object with location info and weather data
 */
export const getWeatherByCity = async (cityName) => {
  const location = await getCoordinatesFromCity(cityName);
  const weatherData = await getWeatherData(location.lat, location.lon);

  return {
    location,
    weather: weatherData,
  };
};

/**
 * Get weather data using coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {object} locationInfo - Location info
 * @returns {Promise} Object with location info and weather data
 */
export const getWeatherByCoordinates = async (lat, lon, locationInfo) => {
  const weatherData = await getWeatherData(lat, lon);

  return {
    location: {
      lat,
      lon,
      name: locationInfo.name,
      country: locationInfo.country,
      state: locationInfo.state,
    },
    weather: weatherData,
  };
};
