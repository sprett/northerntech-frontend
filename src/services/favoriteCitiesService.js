const FAVORITES_STORAGE_KEY = "favorite-cities";

/**
 * Get all favorite cities from localStorage
 * @returns {Array} Array of favorite city objects
 */
export const getFavoriteCities = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading favorite cities from localStorage:", error);
    return [];
  }
};

/**
 * Save favorite cities to localStorage
 * @param {Array} cities - Array of city objects
 */
const saveFavoriteCities = (cities) => {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(cities));
  } catch (error) {
    console.error("Error saving favorite cities to localStorage:", error);
    throw new Error("Failed to save favorite cities");
  }
};

/**
 * Add a city to favorites
 * @param {object} cityData - City data
 * @param {number} cityData.lat - Latitude
 * @param {number} cityData.lon - Longitude
 * @param {string} cityData.name - City name
 * @param {string} cityData.country - Country code
 * @param {string} cityData.state - State (optional)
 * @returns {object} Added city with ID
 */
export const addFavoriteCity = (cityData) => {
  const favorites = getFavoriteCities();

  // Check if city already exists
  const exists = favorites.some(
    (city) => city.lat === cityData.lat && city.lon === cityData.lon
  );

  if (exists) {
    throw new Error("This city is already in your favorites");
  }

  const newCity = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...cityData,
    addedAt: new Date().toISOString(),
  };

  favorites.push(newCity);
  saveFavoriteCities(favorites);

  return newCity;
};

/**
 * Remove a city from favorites
 * @param {string} cityId - City ID to remove
 */
export const removeFavoriteCity = (cityId) => {
  const favorites = getFavoriteCities();
  const filtered = favorites.filter((city) => city.id !== cityId);

  if (filtered.length === favorites.length) {
    throw new Error("City not found in favorites");
  }

  saveFavoriteCities(filtered);
};

/**
 * Check if a city is already in favorites
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if city is favorited
 */
export const isCityFavorited = (lat, lon) => {
  const favorites = getFavoriteCities();
  return favorites.some((city) => city.lat === lat && city.lon === lon);
};

/**
 * Clear all favorite cities
 */
export const clearAllFavorites = () => {
  localStorage.removeItem(FAVORITES_STORAGE_KEY);
};
