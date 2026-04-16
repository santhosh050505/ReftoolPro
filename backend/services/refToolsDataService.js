/**
 * RefTools Data Service
 * =====================
 * Provides refrigerant data directly from local JSON files instead of relying on Danfoss API
 * This eliminates CORS issues and API dependency problems
 * 
 * Uses: /refrigerant_updated.json for saturation calculations with pressure/temperature ranges
 */

const fs = require('fs');
const path = require('path');

// Load refrigerant range data once on startup
let refrigerantData = {};

const loadRefrigerantData = () => {
  try {
    // Try multiple possible locations for the data file
    const possiblePaths = [
      path.join(__dirname, '../../refrigerant_updated.json'),
      path.join(__dirname, '../../frontend/refrigerant_updated.json'),
      path.join(__dirname, '../../frontend/public/refrigerant_updated.json'),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        refrigerantData = JSON.parse(data);
        console.log(`✅ Loaded refrigerant range data from: ${filePath}`);
        console.log(`   Found ranges for ${Object.keys(refrigerantData).length} refrigerants`);
        return refrigerantData;
      }
    }

    console.warn('⚠️  Refrigerant range data file not found in expected locations');
    return {};
  } catch (error) {
    console.error('Error loading refrigerant data:', error.message);
    return {};
  }
};

// Load data on module initialization
loadRefrigerantData();

/**
 * Get saturation pressure for a given temperature and refrigerant
 * Since we don't have exact saturation curves, we return the valid pressure range
 * The frontend will use the Danfoss API for actual point calculations
 */
const getSaturationPressure = (refrigerant, temperature, temperatureUnit, pressureUnit) => {
  try {
    const refKey = refrigerant.toUpperCase().replace(/[^A-Z0-9()]/g, '');
    const refData = refrigerantData[refKey];

    if (!refData) {
      throw new Error(`No data for ${refrigerant}. Available: ${Object.keys(refrigerantData).slice(0, 10).join(', ')}`);
    }

    // Get the temperature range for this refrigerant
    if (!refData.temperature) {
      throw new Error(`No temperature data for ${refrigerant}`);
    }

    // Map temperature unit to JSON key (C or F)
    const tempKey = temperatureUnit.toLowerCase() === 'fahrenheit' || temperatureUnit.toLowerCase() === 'f' ? 'F' : 'C';
    const tempRange = refData.temperature[tempKey];

    if (!tempRange) {
      throw new Error(`No temperature range for ${refrigerant} in ${tempKey}`);
    }

    // Validate temperature is within valid range
    const temp = parseFloat(temperature);
    if (temp < tempRange.min || temp > tempRange.max) {
      throw new Error(`Temperature ${temp}${tempKey} outside valid range [${tempRange.min}, ${tempRange.max}]${tempKey} for ${refrigerant}`);
    }

    // Get corresponding pressure range
    const pressureKey = pressureUnit.toLowerCase() === 'psi' ? 'psi' :
                       pressureUnit.toLowerCase() === 'pa' ? 'Pa' :
                       pressureUnit.toLowerCase() === 'kpa' ? 'kPa' :
                       pressureUnit.toLowerCase() === 'mpa' ? 'MPa' :
                       pressureUnit.toLowerCase() === 'atm' ? 'atm' :
                       pressureUnit.toLowerCase() === 'at' ? 'at' :
                       pressureUnit.toLowerCase() === 'mmhg' ? 'mmHg' :
                       pressureUnit.toLowerCase() === 'µmhg' ? 'µmHg' :
                       pressureUnit.toLowerCase() === 'micron' ? 'micron' :
                       pressureUnit.toLowerCase() === 'inhg' ? 'inHg' : 'bar';

    const pressureRange = refData.pressure_absolute[pressureKey];

    if (!pressureRange) {
      throw new Error(`No pressure range for ${pressureUnit}`);
    }

    // For now, return the middle of the pressure range
    // A real saturation curve would interpolate based on exact temperature
    const avgPressure = (pressureRange.min + pressureRange.max) / 2;

    return {
      success: true,
      pressure: parseFloat(avgPressure.toFixed(2)),
      unit: pressureUnit,
      temperature: temperature,
      temperatureUnit: temperatureUnit,
      refrigerant: refrigerant,
      method: 'range-estimate',
      note: 'Using midpoint of valid range. For exact saturation point, use Danfoss API.'
    };
  } catch (error) {
    console.error(`Error calculating saturation pressure for ${refrigerant}:`, error.message);
    throw error;
  }
};

/**
 * Get saturation temperature for a given pressure and refrigerant
 * Since we don't have exact saturation curves, we return the valid temperature range
 * The frontend will use the Danfoss API for actual point calculations
 */
const getSaturationTemperature = (refrigerant, pressure, pressureUnit, temperatureUnit) => {
  try {
    const refKey = refrigerant.toUpperCase().replace(/[^A-Z0-9()]/g, '');
    const refData = refrigerantData[refKey];

    if (!refData) {
      throw new Error(`No data for ${refrigerant}. Available: ${Object.keys(refrigerantData).slice(0, 10).join(', ')}`);
    }

    // Get the pressure range for this refrigerant
    if (!refData.pressure_absolute) {
      throw new Error(`No pressure data for ${refrigerant}`);
    }

    // Map pressure unit to JSON key
    const pressureKey = pressureUnit.toLowerCase() === 'psi' ? 'psi' :
                       pressureUnit.toLowerCase() === 'pa' ? 'Pa' :
                       pressureUnit.toLowerCase() === 'kpa' ? 'kPa' :
                       pressureUnit.toLowerCase() === 'mpa' ? 'MPa' :
                       pressureUnit.toLowerCase() === 'atm' ? 'atm' :
                       pressureUnit.toLowerCase() === 'at' ? 'at' :
                       pressureUnit.toLowerCase() === 'mmhg' ? 'mmHg' :
                       pressureUnit.toLowerCase() === 'µmhg' ? 'µmHg' :
                       pressureUnit.toLowerCase() === 'micron' ? 'micron' :
                       pressureUnit.toLowerCase() === 'inhg' ? 'inHg' : 'bar';

    const pressureRange = refData.pressure_absolute[pressureKey];

    if (!pressureRange) {
      throw new Error(`No pressure range for ${pressureUnit}`);
    }

    // Validate pressure is within valid range
    const press = parseFloat(pressure);
    if (press < pressureRange.min || press > pressureRange.max) {
      throw new Error(`Pressure ${press}${pressureKey} outside valid range [${pressureRange.min}, ${pressureRange.max}]${pressureKey} for ${refrigerant}`);
    }

    // Get corresponding temperature range
    const tempKey = temperatureUnit.toLowerCase() === 'fahrenheit' || temperatureUnit.toLowerCase() === 'f' ? 'F' : 'C';
    const tempRange = refData.temperature[tempKey];

    if (!tempRange) {
      throw new Error(`No temperature range for ${refrigerant} in ${tempKey}`);
    }

    // For now, return the middle of the temperature range
    // A real saturation curve would interpolate based on exact pressure
    const avgTemp = (tempRange.min + tempRange.max) / 2;

    return {
      success: true,
      temperature: parseFloat(avgTemp.toFixed(2)),
      unit: temperatureUnit,
      pressure: pressure,
      pressureUnit: pressureUnit,
      refrigerant: refrigerant,
      method: 'range-estimate',
      note: 'Using midpoint of valid range. For exact saturation point, use Danfoss API.'
    };
  } catch (error) {
    console.error(`Error calculating saturation temperature for ${refrigerant}:`, error.message);
    throw error;
  }
};

/**
 * Convert pressure from bar to other units
 */
const convertPressureFromBar = (valueBar, toUnit) => {
  const conversions = {
    'bar': 1,
    'psi': 14.5038,
    'Pa': 100000,
    'kPa': 100,
    'MPa': 0.1,
    'atm': 0.98692,
    'at': 1.01972,  // technical atmosphere
    'mmHg': 750.062,
    'µmHg': 750062,
    'micron': 750062000,
    'inHg': 29.5301
  };

  const factor = conversions[toUnit] || conversions['bar'];
  return valueBar * factor;
};

/**
 * Convert pressure to bar from other units
 */
const convertPressureToBar = (value, fromUnit) => {
  const conversions = {
    'bar': 1,
    'psi': 0.0689476,
    'Pa': 1 / 100000,
    'kPa': 0.01,
    'MPa': 10,
    'atm': 1.01325,
    'at': 0.980665,
    'mmHg': 1 / 750.062,
    'µmHg': 1 / 750062,
    'micron': 1 / 750062000,
    'inHg': 0.0338639
  };

  const factor = conversions[fromUnit] || conversions['bar'];
  return value * factor;
};

module.exports = {
  getSaturationPressure,
  getSaturationTemperature,
  convertPressureFromBar,
  convertPressureToBar,
  loadRefrigerantData,
  getRefrigerantData: () => refrigerantData
};
