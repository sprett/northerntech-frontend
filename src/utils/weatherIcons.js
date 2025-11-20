/**
 * Utility functions for weather icons
 * Maps OpenWeatherMap icon codes to local SVG files
 */

// Weather codes that don't have day/night variants
const NO_DAY_NIGHT_VARIANTS = [
  "04",
  "09",
  "10",
  "11",
  "13",
  "15",
  "22",
  "30",
  "31",
  "32",
  "33",
  "34",
  "46",
  "47",
  "48",
  "49",
  "50",
];

/**
 * Get the weather icon path based on OpenWeatherMap icon code
 * @param {string} iconCode - OpenWeatherMap icon code
 * @param {string} fallback - Fallback icon code if the requested one doesn't exist
 * @returns {string} Path to the SVG icon
 */
export const getWeatherIconPath = (iconCode, fallback = "01d") => {
  if (!iconCode) {
    return `/src/assets/weather-icons/${fallback}.svg`;
  }

  const baseCode = iconCode.slice(0, -1);
  const suffix = iconCode.slice(-1);

  if (
    NO_DAY_NIGHT_VARIANTS.includes(baseCode) &&
    (suffix === "d" || suffix === "n")
  ) {
    return `/src/assets/weather-icons/${baseCode}.svg`;
  }

  return `/src/assets/weather-icons/${iconCode}.svg`;
};

/**
 * Get weather icon from weather object
 * @param {object} weatherObj - Weather object from API
 * @param {string} fallback - Fallback icon code
 * @returns {string} Path to the SVG icon
 */
export const getWeatherIcon = (weatherObj, fallback = "01d") => {
  const iconCode = weatherObj?.icon || fallback;
  return getWeatherIconPath(iconCode, fallback);
};

/**
 * Map weather condition codes to approximate icon codes
 * @param {string} condition - Weather condition
 * @param {boolean} isDay - Whether it's day
 * @returns {string} Icon code
 */
export const getIconCodeFromCondition = (condition, isDay = true) => {
  const suffix = isDay ? "d" : "n";
  const conditionLower = condition?.toLowerCase() || "";

  if (conditionLower.includes("clear")) return `01${suffix}`;
  if (conditionLower.includes("cloud")) {
    if (conditionLower.includes("few")) return `02${suffix}`;
    if (conditionLower.includes("scattered")) return `03${suffix}`;
    if (
      conditionLower.includes("broken") ||
      conditionLower.includes("overcast")
    )
      return `04`;
    return `03${suffix}`; // Default clouds
  }
  if (conditionLower.includes("rain")) {
    if (conditionLower.includes("shower")) return `09`;
    return `10${suffix}`;
  }
  if (conditionLower.includes("drizzle")) return `09`;
  if (conditionLower.includes("thunderstorm")) return `11`;
  if (conditionLower.includes("snow")) return `13`;
  if (
    conditionLower.includes("mist") ||
    conditionLower.includes("fog") ||
    conditionLower.includes("haze")
  )
    return `50`;

  return `01${suffix}`; // Default to clear sky
};
