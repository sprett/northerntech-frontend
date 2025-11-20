const STATIONS_KEY = "weather_stations";

const readStations = () => {
  const stations = localStorage.getItem(STATIONS_KEY);
  if (!stations) return [];
  try {
    const parsed = JSON.parse(stations);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse stations from localStorage:", error);
    return [];
  }
};

/**
 * Get all saved weather stations from local storage
 * @returns {Array} Array of weather stations
 */
export const getStations = () => {
  return readStations();
};

/**
 * Save a weather station to local storage
 * @param {Object} station - Station object to save
 */
export const addStation = (station) => {
  const stations = readStations();
  stations.push(station);
  localStorage.setItem(STATIONS_KEY, JSON.stringify(stations));
};

/**
 * Remove a weather station from local storage
 * @param {string} stationId - ID of station to remove
 */
export const removeStation = (stationId) => {
  const stations = readStations();
  const filtered = stations.filter((station) => station.id !== stationId);
  localStorage.setItem(STATIONS_KEY, JSON.stringify(filtered));
};
