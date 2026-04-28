/**
 * RefrigerantRangeService
 * 
 * Handles refrigerant-specific pressure and temperature range validation.
 * Fetches ranges through API call alone (refrigerant/ranges/:name).
 * 
 * Each refrigerant has valid pressure and temperature ranges in multiple units.
 */
import { getRefrigerantRanges } from '../api';

class RefrigerantRangeService {
  constructor() {
    // Cache for range data per refrigerant
    this.cache = {};
    // Track pending requests to avoid duplicate calls
    this.pendingRequests = {};
  }

  /**
   * Normalize refrigerant name for consistent cache keys and API calls
   */
  normalizeRefrigerantName(name) {
    if (!name) return '';

    const lowerName = name.trim().toLowerCase();

    // Preserve (E) and (Z) suffixes for isomers
    if (lowerName.endsWith('(e)') || lowerName.endsWith('(z)')) {
      return lowerName;
    }

    // Extract part before parenthesis and normalize (e.g., "R1150 (Ethylene)" -> "r1150")
    const shortName = name.split('(')[0].trim();
    return shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Fetch and cache range data for a specific refrigerant
   * 
   * @param {string} refrigerant - Refrigerant name
   * @returns {object|null} Range data or null
   */
  async fetchRangeForRefrigerant(refrigerant) {
    if (!refrigerant) return null;

    const normalizedName = this.normalizeRefrigerantName(refrigerant);

    // Check cache first
    if (this.cache[normalizedName]) {
      return this.cache[normalizedName];
    }

    // Check if there's a pending request
    if (this.pendingRequests[normalizedName]) {
      return this.pendingRequests[normalizedName];
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        console.log(`🔍 Fetching range data via API for ${normalizedName} (originally ${refrigerant})...`);
        const response = await getRefrigerantRanges(normalizedName);

        if (response && response.success && response.ranges) {
          this.cache[normalizedName] = response.ranges;
          return response.ranges;
        }
        return null;
      } catch (error) {
        console.error(`❌ Error fetching range data for ${normalizedName}:`, error);
        return null;
      } finally {
        delete this.pendingRequests[normalizedName];
      }
    })();

    this.pendingRequests[normalizedName] = fetchPromise;
    return fetchPromise;
  }

  /**
   * Get pressure range for a specific refrigerant and unit
   */
  async getPressureRange(refrigerant, pressureUnit) {
    const refData = await this.fetchRangeForRefrigerant(refrigerant);

    if (!refData) {
      console.warn(`⚠️ Range data not available for '${refrigerant}'`);
      return null;
    }

    if (!refData.pressure_absolute || !refData.pressure_absolute[pressureUnit]) {
      console.warn(`⚠️ Pressure unit '${pressureUnit}' not found for '${refrigerant}'`);
      return null;
    }

    return refData.pressure_absolute[pressureUnit];
  }

  /**
   * Get temperature range for a specific refrigerant and unit
   */
  async getTemperatureRange(refrigerant, temperatureUnit) {
    const refData = await this.fetchRangeForRefrigerant(refrigerant);

    if (!refData) {
      console.warn(`⚠️ Range data not available for '${refrigerant}'`);
      return null;
    }

    if (!refData.temperature || !refData.temperature[temperatureUnit]) {
      console.warn(`⚠️ Temperature unit '${temperatureUnit}' not found for '${refrigerant}'`);
      return null;
    }

    return refData.temperature[temperatureUnit];
  }

  /**
   * Validate if pressure is within valid range for refrigerant
   */
  async validatePressure(refrigerant, pressure, pressureUnit) {
    const range = await this.getPressureRange(refrigerant, pressureUnit);

    if (!range) {
      // If we can't get range data, don't block the user — Danfoss API will
      // validate the actual calculation anyway.
      console.warn(`⚠️ Range data not available for '${refrigerant}' in '${pressureUnit}' — skipping range check`);
      return {
        valid: true,
        message: `Range check skipped for ${refrigerant} (data unavailable)`,
        min: null,
        max: null
      };
    }

    const numPressure = parseFloat(pressure);
    if (isNaN(numPressure)) {
      return {
        valid: false,
        message: 'Pressure value is not a number',
        min: range.min,
        max: range.max
      };
    }

    const TOLERANCE = 0.0001;
    const valid = numPressure >= (range.min - TOLERANCE) && numPressure <= (range.max + TOLERANCE);

    return {
      valid,
      min: range.min,
      max: range.max,
      message: valid
        ? `✅ Pressure ${numPressure} ${pressureUnit} is valid`
        : `❌ Pressure ${numPressure} ${pressureUnit} is outside valid range [${range.min.toFixed(2)}, ${range.max.toFixed(2)}]`
    };
  }

  /**
   * Validate if temperature is within valid range for refrigerant
   */
  async validateTemperature(refrigerant, temperature, temperatureUnit) {
    const range = await this.getTemperatureRange(refrigerant, temperatureUnit);

    if (!range) {
      // If we can't get range data, don't block the user — Danfoss API will
      // validate the actual calculation anyway.
      console.warn(`⚠️ Range data not available for '${refrigerant}' in '${temperatureUnit}' — skipping range check`);
      return {
        valid: true,
        message: `Range check skipped for ${refrigerant} (data unavailable)`,
        min: null,
        max: null
      };
    }

    const numTemperature = parseFloat(temperature);
    if (isNaN(numTemperature)) {
      return {
        valid: false,
        message: 'Temperature value is not a number',
        min: range.min,
        max: range.max
      };
    }

    const TOLERANCE = 0.0001;
    const valid = numTemperature >= (range.min - TOLERANCE) && numTemperature <= (range.max + TOLERANCE);

    return {
      valid,
      min: range.min,
      max: range.max,
      message: valid
        ? `✅ Temperature ${numTemperature}° ${temperatureUnit} is valid`
        : `❌ Temperature ${numTemperature}° ${temperatureUnit} is outside valid range [${range.min.toFixed(2)}, ${range.max.toFixed(2)}]`
    };
  }

  /**
   * Clamp a pressure value to valid range
   */
  async clampPressure(refrigerant, pressure, pressureUnit) {
    const range = await this.getPressureRange(refrigerant, pressureUnit);
    if (!range) return parseFloat(pressure);

    const numPressure = parseFloat(pressure);
    if (isNaN(numPressure)) return range.min;

    return Math.max(range.min, Math.min(range.max, numPressure));
  }

  /**
   * Clamp a temperature value to valid range
   */
  async clampTemperature(refrigerant, temperature, temperatureUnit) {
    const range = await this.getTemperatureRange(refrigerant, temperatureUnit);
    if (!range) return parseFloat(temperature);

    const numTemperature = parseFloat(temperature);
    if (isNaN(numTemperature)) return range.min;

    return Math.max(range.min, Math.min(range.max, numTemperature));
  }

  async getMinPressure(refrigerant, pressureUnit) {
    const range = await this.getPressureRange(refrigerant, pressureUnit);
    return range ? range.min : null;
  }

  async getMaxPressure(refrigerant, pressureUnit) {
    const range = await this.getPressureRange(refrigerant, pressureUnit);
    return range ? range.max : null;
  }

  async getMinTemperature(refrigerant, temperatureUnit) {
    const range = await this.getTemperatureRange(refrigerant, temperatureUnit);
    return range ? range.min : null;
  }

  async getMaxTemperature(refrigerant, temperatureUnit) {
    const range = await this.getTemperatureRange(refrigerant, temperatureUnit);
    return range ? range.max : null;
  }

  /**
   * Get all range data for a refrigerant
   */
  async getRefrigerantRanges(refrigerant) {
    return await this.fetchRangeForRefrigerant(refrigerant);
  }
}

// Export singleton instance
const refrigerantRangeService = new RefrigerantRangeService();
export default refrigerantRangeService;
