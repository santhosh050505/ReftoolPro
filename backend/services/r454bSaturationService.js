const fs = require('fs');
const path = require('path');

// Load R454B Saturation data
let saturationData = null;

function loadSaturationData() {
  if (saturationData) return saturationData;

  try {
    const dataPath = path.join(__dirname, '../data/r454b/R454B_saturation.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    saturationData = JSON.parse(rawData);
    console.log('✓ R454B Saturation data loaded successfully');
    return saturationData;
  } catch (error) {
    console.error('✗ Error loading R454B Saturation data:', error.message);
    throw error;
  }
}

/**
 * Get simple saturation pressure at a given temperature
 * Uses nearest available temperature in the table
 */
function getSaturationPressure(temperature) {
  const data = loadSaturationData();

  // Find nearest entry by temperature
  let bestEntry = null;
  let minDiff = Infinity;

  for (const entry of data.saturation_table) {
    const diff = Math.abs(entry.temperature_c - temperature);
    if (diff < minDiff) {
      minDiff = diff;
      bestEntry = entry;
    }
  }

  if (bestEntry && minDiff < 5) {
    return {
      liquid_bar: bestEntry.pressure.liquid_bar,
      vapor_bar: bestEntry.pressure.vapor_bar,
      actual_temp: bestEntry.temperature_c
    };
  }
  return null;
}

/**
 * Get saturation temperature at a given pressure
 * Uses nearest available pressure in the table
 */
function getSaturationTemperature(pressure, isDew = true) {
  const data = loadSaturationData();
  let bestEntry = null;
  let minDiff = Infinity;

  const targetP = parseFloat(pressure);

  for (const entry of data.saturation_table) {
    // Select pressure column based on Dew/Bubble
    const entryP = isDew ? (entry.pressure.vapor_bar || entry.pressure.liquid_bar) : entry.pressure.liquid_bar;
    const diff = Math.abs(entryP - targetP);
    if (diff < minDiff) {
      minDiff = diff;
      bestEntry = entry;
    }
  }

  if (bestEntry && minDiff < 10) {
    return {
      temperature_c: bestEntry.temperature_c,
      actual_pressure: isDew ? (bestEntry.pressure.vapor_bar || bestEntry.pressure.liquid_bar) : bestEntry.pressure.liquid_bar
    };
  }
  return null;
}

/**
 * Get LIQUID properties from saturation table at nearest temperature
 */
function getLiquidProperties(temperature) {
  const data = loadSaturationData();

  let bestEntry = null;
  let minDiff = Infinity;

  for (const entry of data.saturation_table) {
    const diff = Math.abs(entry.temperature_c - temperature);
    if (diff < minDiff) {
      minDiff = diff;
      bestEntry = entry;
    }
  }

  if (!bestEntry || minDiff > 2) return null;

  return {
    enthalpy_kj_per_kg: bestEntry.enthalpy.liquid_kj_per_kg,
    entropy_J_per_kgK: bestEntry.entropy.liquid_J_per_kgK,
    density_kg_per_m3: bestEntry.density.liquid_kg_per_m3,
    source: `Saturation Table (Liquid) @ T=${bestEntry.temperature_c}°C (nearest ${temperature}°C)`
  };
}

/**
 * Get AVERAGE properties from saturation table at nearest temperature
 */
function getAverageProperties(temperature) {
  const data = loadSaturationData();

  let bestEntry = null;
  let minDiff = Infinity;

  for (const entry of data.saturation_table) {
    const diff = Math.abs(entry.temperature_c - temperature);
    if (diff < minDiff) {
      minDiff = diff;
      bestEntry = entry;
    }
  }

  if (!bestEntry || minDiff > 2) return null;

  return {
    enthalpy_kj_per_kg: bestEntry.enthalpy.average_kj_per_kg,
    entropy_J_per_kgK: bestEntry.entropy.average_J_per_kgK,
    density_kg_per_m3: bestEntry.density.average_kg_per_m3,
    source: `Saturation Table (Average/Two-Phase) @ T=${bestEntry.temperature_c}°C (nearest ${temperature}°C)`
  };
}

/**
 * Get VAPOR properties from saturation table at nearest temperature
 */
function getVaporProperties(temperature) {
  const data = loadSaturationData();

  let bestEntry = null;
  let minDiff = Infinity;

  for (const entry of data.saturation_table) {
    const diff = Math.abs(entry.temperature_c - temperature);
    if (diff < minDiff) {
      minDiff = diff;
      bestEntry = entry;
    }
  }

  if (!bestEntry || minDiff > 2) return null;

  return {
    enthalpy_kj_per_kg: bestEntry.enthalpy.vapor_kj_per_kg,
    entropy_J_per_kgK: bestEntry.entropy.vapor_J_per_kgK,
    density_kg_per_m3: bestEntry.density.vapor_kg_per_m3,
    specificVolume_m3_per_kg: bestEntry.volume.vapor_m3_per_kg,
    source: `Saturation Table (Vapor) @ T=${bestEntry.temperature_c}°C (nearest ${temperature}°C)`
  };
}

module.exports = {
  getSaturationPressure,
  getSaturationTemperature,
  getLiquidProperties,
  getAverageProperties,
  getVaporProperties
};
