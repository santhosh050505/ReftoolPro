/**
 * Unit Converter Utility
 * Standardizes units to Bar (Absolute) and Celsius
 */

const PRESSURE_FACTORS = {
  bar: { toBar: 1 },
  psi: { toBar: 1 / 14.50377377 },  // BUG #14 FIXED: aligned with calculationService.js (was 14.5038)

  Pa: { toBar: 1 / 100000 },
  kPa: { toBar: 1 / 100 },
  MPa: { toBar: 10 },
  atm: { toBar: 1.01325 },
  at: { toBar: 0.980665 },
  mmHg: { toBar: 1 / 750.062 },
  µmHg: { toBar: 1 / 750062 },
  inHg: { toBar: 1 / 29.5301 },
};

/**
 * Convert pressure to Bar (Absolute)
 * @param {number} value - Raw pressure value
 * @param {string} unit - Source unit (psi, kPa, etc.)
 * @param {boolean} isAbsolute - Whether the input is absolute or gauge
 * @param {number} atmPressure - Ambient pressure in bar (for gauge conversion)
 */
const convertToBarAbs = (value, unit = 'bar', isAbsolute = true, atmPressure = 1.01325) => {
  if (value === null || value === undefined) return value;

  const factor = PRESSURE_FACTORS[unit];
  if (!factor) return value;

  // Convert to bar
  const valBar = value * factor.toBar;

  // If gauge, add atmospheric pressure
  return isAbsolute ? valBar : valBar + atmPressure;
};

/**
 * Convert temperature to Celsius
 * @param {number} value - Raw temperature value
 * @param {string} unit - Source unit ('celsius' or 'fahrenheit')
 */
const convertToCelsius = (value, unit = 'celsius') => {
  if (value === null || value === undefined) return value;

  const u = (unit || '').toLowerCase();
  if (u === 'fahrenheit') {
    return (value - 32) * 5 / 9;
  }
  return value;
};

/**
 * Convert temperature difference (Delta T) to Kelvin/Celsius difference
 * @param {number} value - Raw delta T value
 * @param {string} unit - Source unit ('celsius' or 'fahrenheit')
 */
const convertDeltaT = (value, unit = 'celsius') => {
  if (value === null || value === undefined) return value;

  const u = (unit || '').toLowerCase();
  if (u === 'fahrenheit') {
    return value * 5 / 9;
  }
  return value;
};

module.exports = {
  convertToBarAbs,
  convertToCelsius,
  convertDeltaT,
  PRESSURE_FACTORS
};
