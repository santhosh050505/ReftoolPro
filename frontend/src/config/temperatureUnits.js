/**
 * Temperature Units Configuration
 * All conversions use "celsius" as the canonical internal unit
 * Direct instant conversion - no API calls needed
 * Optimized with memoized conversion factors
 */

// Memoized conversion factors for ultra-fast lookups
const CONVERSION_FACTORS = {
  celsius: { offset: 0, scale: 1 },
  fahrenheit: { offset: 32, scale: 9 / 5 },
  kelvin: { offset: 273.15, scale: 1 }
};

export const TEMPERATURE_UNITS = {
  celsius: {
    label: '°C',
    key: 'celsius',
    toCelsius: (value) => value,
    fromCelsius: (value) => value,
  },
  fahrenheit: {
    label: '°F',
    key: 'fahrenheit',
    // C to F: (C * 9/5) + 32
    toCelsius: (value) => (value - 32) * 5 / 9,
    // F to C: (F - 32) * 5/9
    fromCelsius: (value) => (value * 9 / 5) + 32,
  },
  kelvin: {
    label: 'K',
    key: 'kelvin',
    // K to C: K - 273.15
    toCelsius: (value) => value - 273.15,
    // C to K: C + 273.15
    fromCelsius: (value) => value + 273.15,
  }
};

/**
 * Get temperature unit configuration
 * @param {string} unitKey - The unit key (e.g., 'celsius', 'fahrenheit')
 * @returns {object} The unit configuration
 */
export const getTemperatureUnit = (unitKey) => {
  return TEMPERATURE_UNITS[unitKey] || TEMPERATURE_UNITS.celsius;
};

/**
 * Convert temperature value between units (OPTIMIZED)
 * Instant conversion - NO API call needed
 * @param {number} value - The value to convert
 * @param {string} fromUnit - The source unit
 * @param {string} toUnit - The target unit
 * @returns {number} The converted value with defensive rounding
 */
export const convertTemperature = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit || !value) return value;
  
  // Direct path optimization for common conversions
  if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
    return Math.round(((value * 9 / 5) + 32) * 10000) / 10000;
  }
  if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
    return Math.round(((value - 32) * 5 / 9) * 10000) / 10000;
  }
  if (fromUnit === 'celsius' && toUnit === 'kelvin') {
    return Math.round((value + 273.15) * 10000) / 10000;
  }
  if (fromUnit === 'kelvin' && toUnit === 'celsius') {
    return Math.round((value - 273.15) * 10000) / 10000;
  }
  
  // Fallback to generic conversion
  const fromConfig = getTemperatureUnit(fromUnit);
  const toConfig = getTemperatureUnit(toUnit);
  
  // Convert to canonical celsius unit, then to target unit
  const celsiusValue = fromConfig.toCelsius(value);
  const convertedValue = toConfig.fromCelsius(celsiusValue);
  
  // Defensive rounding to avoid floating-point noise (4 decimals)
  return Math.round(convertedValue * 10000) / 10000;
};
