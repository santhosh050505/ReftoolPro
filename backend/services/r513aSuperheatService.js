const fs = require('fs');
const path = require('path');

// Load R513A Superheat data
let superheatData = null;

function loadSuperheatData() {
    if (superheatData) return superheatData;

    try {
        const dataPath = path.join(__dirname, '../../513a/R513A Superheat.json');
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        superheatData = JSON.parse(rawData);
        console.log('✓ R513A Superheat data loaded successfully');
        return superheatData;
    } catch (error) {
        console.error('✗ Error loading R513A Superheat data:', error.message);
        throw error;
    }
}

/**
 * Helper to look up properties at a specific pressure and temp
 * Handles format: "pressure_X": { "temperature_X_Y": { ... } }
 * Now supports finding the nearest temperature if exact match missing
 */
function lookupAtPressure(data, pressure, temperature) {
    const pressureKey = `pressure_${pressure}`;
    let pressureNode = data.data[pressureKey];

    // If direct construction fails (e.g. 19 vs 19.0), search for it
    if (!pressureNode) {
        if (Number.isInteger(pressure)) {
            const keyWithDecimal = `pressure_${pressure}.0`;
            pressureNode = data.data[keyWithDecimal];
            if (pressureNode) pressure = pressure + '.0';
        }
    }

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
        const secondUnderscore = k.indexOf('_', k.indexOf('_') + 1);
        if (secondUnderscore === -1) continue;

        const tStr = k.substring(secondUnderscore + 1);
        const tVal = parseFloat(tStr);
        const diff = Math.abs(tVal - temperature);

        if (diff < minDiff) {
            minDiff = diff;
            bestKey = k;
            actualT = tVal;
        }
    }

    if (!bestKey || minDiff > 4.9) return null; // data usually 5C apart, so allow 4.9C max diff

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
 * 
 * @param {number} targetPressure - Pressure in bar
 * @param {number} targetTemp - Temperature in °C
 * @returns {object|null} Properties {V, D, H, S} or null if not available
 */
function getSuperheatPropertiesNearest(targetPressure, targetTemp) {
    const data = loadSuperheatData();
    const rawKeys = Object.keys(data.data);

    const availablePressures = [];
    const pressureMap = {};

    rawKeys.forEach(key => {
        if (key.startsWith('pressure_')) {
            const val = parseFloat(key.substring(9));
            if (!isNaN(val)) {
                availablePressures.push(val);
                pressureMap[val] = key;
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
