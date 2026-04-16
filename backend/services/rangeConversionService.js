// backend/services/rangeConversionService.js
/**
 * Range Conversion Service
 * Converts pressure (bar/°C) to all other units and stores in refrigerant_updated.json
 */

const fs = require('fs');
const path = require('path');

class RangeConversionService {
  constructor() {
    this.conversionFormulas = this.loadConversionFormulas();
  }

  /**
   * Load conversion formulas from JSON
   */
  loadConversionFormulas() {
    try {
      const formulasPath = path.join(__dirname, '../../unit_conversion_formulas.json');
      const data = fs.readFileSync(formulasPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading conversion formulas:', error.message);
      return {};
    }
  }

  /**
   * Convert pressure from bar to all units
   * @param {number} minBar - Minimum pressure in bar
   * @param {number} maxBar - Maximum pressure in bar
   * @returns {object} Pressure ranges in all units
   */
  convertPressure(minBar, maxBar) {
    const result = {};

    // Define conversion factors from bar to other units
    const factors = {
      bar: 1,
      Pa: 100000,
      kPa: 100,
      MPa: 0.1,
      psi: 14.5038,
      atm: 0.986923,
      at: 1.01972,
      mmHg: 750.062,
      inHg: 29.5299
    };

    // Convert to all standard units first
    for (const [unit, factor] of Object.entries(factors)) {
      result[unit] = {
        min: parseFloat((minBar * factor).toFixed(2)),
        max: parseFloat((maxBar * factor).toFixed(2))
      };
    }

    // Micron must be calculated from mmHg (1 mmHg = 1000 microns) not directly from bar
    const mmHgMin = result.mmHg.min;
    const mmHgMax = result.mmHg.max;
    result.micron = {
      min: parseFloat((mmHgMin * 1000).toFixed(2)),
      max: parseFloat((mmHgMax * 1000).toFixed(2))
    };

    return result;
  }

  /**
   * Convert temperature from Celsius to Fahrenheit
   * @param {number} minCelsius - Minimum temperature in °C
   * @param {number} maxCelsius - Maximum temperature in °C
   * @returns {object} Temperature ranges in C and F
   */
  convertTemperature(minCelsius, maxCelsius) {
    const celsiusToFahrenheit = (c) => (c * 9 / 5) + 32;

    return {
      C: {
        min: parseFloat(minCelsius.toFixed(2)),
        max: parseFloat(maxCelsius.toFixed(2))
      },
      F: {
        min: parseFloat(celsiusToFahrenheit(minCelsius).toFixed(2)),
        max: parseFloat(celsiusToFahrenheit(maxCelsius).toFixed(2))
      }
    };
  }

  /**
   * Build complete range object for a refrigerant
   * @param {number} minPressure - Minimum pressure in bar
   * @param {number} maxPressure - Maximum pressure in bar
   * @param {number} minTemperature - Minimum temperature in °C
   * @param {number} maxTemperature - Maximum temperature in °C
   * @returns {object} Complete range object with pressure_absolute and temperature
   */
  buildRangeObject(minPressure, maxPressure, minTemperature, maxTemperature) {
    return {
      pressure_absolute: this.convertPressure(minPressure, maxPressure),
      temperature: this.convertTemperature(minTemperature, maxTemperature)
    };
  }

  /**
   * Store range data in refrigerant_updated.json
   * @param {string} refrigerantName - Name of the refrigerant
   * @param {object} rangeData - Range object from buildRangeObject
   */
  storeRangeData(refrigerantName, rangeData) {
    try {
      const filePath = path.join(__dirname, '../../refrigerant_updated.json');

      let data = {};
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(fileData);
      }

      // Update or create refrigerant entry with range data
      if (!data[refrigerantName]) {
        data[refrigerantName] = {};
      }

      data[refrigerantName].pressure_absolute = rangeData.pressure_absolute;
      data[refrigerantName].temperature = rangeData.temperature;

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      console.log(`✅ Range data stored for ${refrigerantName}`);
      return true;
    } catch (error) {
      console.error('Error storing range data:', error.message);
      return false;
    }
  }

  /**
   * Process and store range from user input
   * @param {string} refrigerantName - Refrigerant name
   * @param {number} pressureMin - Pressure minimum in bar
   * @param {number} pressureMax - Pressure maximum in bar
   * @param {number} temperatureMin - Temperature minimum in °C
   * @param {number} temperatureMax - Temperature maximum in °C
   * @returns {object} Result with success flag and data
   */
  processAndStore(refrigerantName, pressureMin, pressureMax, temperatureMin, temperatureMax) {
    try {
      // Validate inputs
      if (!minPressure || !maxPressure || !minTemperature || !maxTemperature) {
        return {
          success: false,
          error: 'All range values (minPressure, maxPressure, minTemperature, maxTemperature) are required'
        };
      }

      // Convert to numbers
      const pMin = parseFloat(pressureMin);
      const pMax = parseFloat(pressureMax);
      const tMin = parseFloat(temperatureMin);
      const tMax = parseFloat(temperatureMax);

      // Validate ranges
      if (pMin >= pMax) {
        return { success: false, error: 'Pressure minimum must be less than maximum' };
      }
      if (tMin >= tMax) {
        return { success: false, error: 'Temperature minimum must be less than maximum' };
      }

      // Build and store
      const rangeData = this.buildRangeObject(pMin, pMax, tMin, tMax);
      const stored = this.storeRangeData(refrigerantName, rangeData);

      if (stored) {
        return {
          success: true,
          data: rangeData,
          message: `Range data successfully stored for ${refrigerantName}`
        };
      } else {
        return { success: false, error: 'Failed to store range data' };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new RangeConversionService();
