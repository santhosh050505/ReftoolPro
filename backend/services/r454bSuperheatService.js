const fs = require('fs');
const path = require('path');

// Load R454B Superheat data
let superheatData = null;

function loadSuperheatData() {
  if (superheatData) return superheatData;

  try {
    const dataPath = path.join(__dirname, '../../R454b/R454B_superheat.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    superheatData = JSON.parse(rawData);
    console.log('✓ R454B Superheat data loaded successfully');
    return superheatData;
  } catch (error) {
    console.error('✗ Error loading R454B Superheat data:', error.message);
    throw error;
  }
}

/**
 * Helper to look up properties at a specific pressure and temp
 * Handles format: "pressure_X": { "temperature_X_Y": { ... } }
 */
function lookupAtPressure(data, pressure, temperature) {
  const pressureKey = `pressure_${pressure}`;
  let pressureNode = data.data[pressureKey];

  // Search for key if direct access fails
  if (!pressureNode) {
    const pKeys = Object.keys(data.data);
    for (const k of pKeys) {
      const val = parseFloat(k.replace('pressure_', ''));
      if (Math.abs(val - parseFloat(pressure)) < 0.0001) {
        pressureNode = data.data[k];
        pressure = val;
        break;
      }
    }
  }

  if (!pressureNode) return null;

  // FIND NEAREST TEMPERATURE in this pressure node
  const tKeys = Object.keys(pressureNode);
  let bestKey = null;
  let minDiff = Infinity;
  let actualT = null;

  for (const k of tKeys) {
    // key format: "temperature_P_T"
    const parts = k.split('_');
    const tVal = parseFloat(parts[parts.length - 1]);
    const diff = Math.abs(tVal - temperature);

    if (diff < minDiff) {
      minDiff = diff;
      bestKey = k;
      actualT = tVal;
    }
  }

  if (!bestKey || minDiff > 4.9) return null;

  const props = pressureNode[bestKey];

  // Check validity
  if (!props || props.H === '-' || props.H === undefined) return null;

  return {
    V: props.V,
    D: props.D,
    H: props.H,
    S: props.S,
    actualT: actualT
  };
}

/**
 * Get superheat properties using nearest pressure AND nearest temperature lookup logic
 */
function getSuperheatPropertiesNearest(targetPressure, targetTemp) {
  const data = loadSuperheatData();
  const rawKeys = Object.keys(data.data);

  const availablePressures = [];
  rawKeys.forEach(key => {
    if (key.startsWith('pressure_')) {
      const val = parseFloat(key.substring(9));
      if (!isNaN(val)) {
        availablePressures.push(val);
      }
    }
  });

  availablePressures.sort((a, b) => a - b);

  const pressureDiffs = availablePressures.map(p => ({
    pressure: p,
    diff: Math.abs(p - targetPressure)
  }));

  pressureDiffs.sort((a, b) => a.diff - b.diff);

  // Try the nearest pressure first
  if (pressureDiffs.length > 0) {
    const firstChoice = pressureDiffs[0];
    const firstResult = lookupAtPressure(data, firstChoice.pressure, targetTemp);

    if (firstResult) {
      return {
        status: 'success',
        pressure: firstChoice.pressure,
        temperature: targetTemp,
        actual_temp: firstResult.actualT,
        properties: firstResult
      };
    }
  }

  // Try second nearest if available
  if (pressureDiffs.length > 1) {
    const secondChoice = pressureDiffs[1];
    const secondResult = lookupAtPressure(data, secondChoice.pressure, targetTemp);

    if (secondResult) {
      return {
        status: 'success',
        pressure: secondChoice.pressure,
        temperature: targetTemp,
        actual_temp: secondResult.actualT,
        properties: secondResult
      };
    }
  }

  return null;
}

module.exports = {
  getSuperheatPropertiesNearest
};
