/**
 * Conversion Optimizer - Instant conversions with caching and range validation
 * Handles pressure and temperature conversions with bounds checking
 */

import { convertPressure, getPressureUnit } from '../config/pressureUnits';
import { convertTemperature, getTemperatureUnit } from '../config/temperatureUnits';

// Cache for last conversion values to avoid redundant calculations
const conversionCache = {
  pressure: {},
  temperature: {}
};

/**
 * Fast pressure conversion with caching
 * @param {number} value - The value to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number} Converted value
 */
export const convertPressureFast = (value, fromUnit, toUnit) => {
  const cacheKey = `${value}|${fromUnit}|${toUnit}`;
  
  if (conversionCache.pressure[cacheKey] !== undefined) {
    return conversionCache.pressure[cacheKey];
  }
  
  const result = convertPressure(value, fromUnit, toUnit);
  conversionCache.pressure[cacheKey] = result;
  
  return result;
};

/**
 * Fast temperature conversion with caching
 * @param {number} value - The value to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number} Converted value
 */
export const convertTemperatureFast = (value, fromUnit, toUnit) => {
  const cacheKey = `${value}|${fromUnit}|${toUnit}`;
  
  if (conversionCache.temperature[cacheKey] !== undefined) {
    return conversionCache.temperature[cacheKey];
  }
  
  const result = convertTemperature(value, fromUnit, toUnit);
  conversionCache.temperature[cacheKey] = result;
  
  return result;
};

/**
 * Clear conversion cache (call when switching refrigerants)
 */
export const clearConversionCache = () => {
  conversionCache.pressure = {};
  conversionCache.temperature = {};
};

/**
 * Validate and clamp pressure to refrigerant limits
 * @param {number} pressure - Pressure value
 * @param {number} min - Minimum allowed pressure
 * @param {number} max - Maximum allowed pressure
 * @returns {object} { value: clamped value, isValid: boolean, message: string }
 */
export const validatePressure = (pressure, min, max) => {
  const num = parseFloat(pressure);
  
  if (isNaN(num)) {
    return { value: min, isValid: false, message: 'Invalid pressure value' };
  }
  
  if (num < min) {
    return { 
      value: min, 
      isValid: false, 
      message: `Pressure below minimum (${min.toFixed(2)})` 
    };
  }
  
  if (num > max) {
    return { 
      value: max, 
      isValid: false, 
      message: `Pressure above maximum (${max.toFixed(2)})` 
    };
  }
  
  return { value: num, isValid: true, message: '' };
};

/**
 * Validate and clamp temperature to refrigerant limits
 * @param {number} temp - Temperature value
 * @param {number} min - Minimum allowed temperature
 * @param {number} max - Maximum allowed temperature
 * @returns {object} { value: clamped value, isValid: boolean, message: string }
 */
export const validateTemperature = (temp, min, max) => {
  const num = parseFloat(temp);
  
  if (isNaN(num)) {
    return { value: min, isValid: false, message: 'Invalid temperature value' };
  }
  
  if (num < min) {
    return { 
      value: min, 
      isValid: false, 
      message: `Temperature below minimum (${min.toFixed(2)})` 
    };
  }
  
  if (num > max) {
    return { 
      value: max, 
      isValid: false, 
      message: `Temperature above maximum (${max.toFixed(2)})` 
    };
  }
  
  return { value: num, isValid: true, message: '' };
};

/**
 * Validate pressure is within limits and return validation result
 * @param {number} value - Value to validate
 * @param {number} min - Minimum limit
 * @param {number} max - Maximum limit
 * @returns {object} Validation result with clamped value
 */
export const clampPressureToLimits = (value, min, max) => {
  const num = parseFloat(value);
  if (isNaN(num)) return { clamped: min, adjusted: true, original: value };
  
  if (num < min) return { clamped: min, adjusted: true, original: num };
  if (num > max) return { clamped: max, adjusted: true, original: num };
  
  return { clamped: num, adjusted: false, original: num };
};

/**
 * Validate temperature is within limits and return validation result
 * @param {number} value - Value to validate
 * @param {number} min - Minimum limit
 * @param {number} max - Maximum limit
 * @returns {object} Validation result with clamped value
 */
export const clampTemperatureToLimits = (value, min, max) => {
  const num = parseFloat(value);
  if (isNaN(num)) return { clamped: min, adjusted: true, original: value };
  
  if (num < min) return { clamped: min, adjusted: true, original: num };
  if (num > max) return { clamped: max, adjusted: true, original: num };
  
  return { clamped: num, adjusted: false, original: num };
};
