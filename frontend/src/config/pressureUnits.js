/**
 * Pressure Units Configuration
 * All conversions use "bar" as the canonical internal unit
 * Each unit has toBar and fromBar conversion factors
 * Optimized with memoized conversion factors
 */

// Memoized conversion factors for ultra-fast lookups
const CONVERSION_FACTORS = {
  bar: { toBar: 1, fromBar: 1 },
  psi: { toBar: 1 / 14.5038, fromBar: 14.5038 },
  Pa: { toBar: 1 / 100000, fromBar: 100000 },
  kPa: { toBar: 1 / 100, fromBar: 100 },
  MPa: { toBar: 10, fromBar: 1 / 10 },
  atm: { toBar: 1.01325, fromBar: 1 / 1.01325 },
  at: { toBar: 0.980665, fromBar: 1 / 0.980665 },
  mmHg: { toBar: 1 / 750.062, fromBar: 750.062 },
  µmHg: { toBar: 1 / 750062, fromBar: 750062 },
  inHg: { toBar: 1 / 29.5301, fromBar: 29.5301 },
};

export const PRESSURE_UNITS = {
  bar: {
    label: 'bar',
    key: 'bar',
    toBar: (value) => value,
    fromBar: (value) => value,
  },
  psi: {
    label: 'psi',
    key: 'psi',
    toBar: (value) => value * CONVERSION_FACTORS.psi.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.psi.fromBar,
  },
  Pa: {
    label: 'Pa',
    key: 'Pa',
    toBar: (value) => value * CONVERSION_FACTORS.Pa.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.Pa.fromBar,
  },
  kPa: {
    label: 'kPa',
    key: 'kPa',
    toBar: (value) => value * CONVERSION_FACTORS.kPa.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.kPa.fromBar,
  },
  MPa: {
    label: 'MPa',
    key: 'MPa',
    toBar: (value) => value * CONVERSION_FACTORS.MPa.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.MPa.fromBar,
  },
  atm: {
    label: 'atm',
    key: 'atm',
    toBar: (value) => value * CONVERSION_FACTORS.atm.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.atm.fromBar,
  },
  at: {
    label: 'at (kgf/cm²)',
    key: 'at',
    toBar: (value) => value * CONVERSION_FACTORS.at.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.at.fromBar,
  },
  mmHg: {
    label: 'mmHg (Torr)',
    key: 'mmHg',
    toBar: (value) => value * CONVERSION_FACTORS.mmHg.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.mmHg.fromBar,
  },
  µmHg: {
    label: 'µmHg (Micron)',
    key: 'µmHg',
    toBar: (value) => value * CONVERSION_FACTORS.µmHg.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.µmHg.fromBar,
  },
  inHg: {
    label: 'inHg',
    key: 'inHg',
    toBar: (value) => value * CONVERSION_FACTORS.inHg.toBar,
    fromBar: (value) => value * CONVERSION_FACTORS.inHg.fromBar,
  },
};

/**
 * Get pressure unit configuration
 * @param {string} unitKey - The unit key (e.g., 'bar', 'psi', 'kPa')
 * @returns {object} The unit configuration
 */
export const getPressureUnit = (unitKey) => {
  return PRESSURE_UNITS[unitKey] || PRESSURE_UNITS.bar;
};

/**
 * Convert pressure value between units (OPTIMIZED)
 * @param {number} value - The value to convert
 * @param {string} fromUnit - The source unit
 * @param {string} toUnit - The target unit
 * @returns {number} The converted value with defensive rounding
 */
export const convertPressure = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit || !value) return value;
  
  const fromFactor = CONVERSION_FACTORS[fromUnit];
  const toFactor = CONVERSION_FACTORS[toUnit];
  
  if (!fromFactor || !toFactor) return value;
  
  // Direct conversion: value * (fromUnit to bar) * (bar to toUnit)
  const convertedValue = value * fromFactor.toBar * (1 / toFactor.toBar);
  
  // Defensive rounding to avoid floating-point noise (4 decimals)
  return Math.round(convertedValue * 10000) / 10000;
};

/**
 * Get all pressure units as array for dropdowns
 * @returns {array} Array of {value, label} objects
 */
export const getPressureUnitsArray = () => {
  return Object.entries(PRESSURE_UNITS).map(([key, config]) => ({
    value: key,
    label: config.label,
  }));
};

/**
 * Convert limits from bar to display unit
 * Used to show min/max in the currently selected pressure unit
 * @param {number} minBar - Minimum pressure in bar
 * @param {number} maxBar - Maximum pressure in bar
 * @param {string} displayUnit - The unit to convert to
 * @returns {object} {min, max} in displayUnit
 */
export const convertLimitsToUnit = (minBar, maxBar, displayUnit) => {
  if (!displayUnit || displayUnit === 'bar') {
    return { min: minBar, max: maxBar };
  }
  
  return {
    min: convertPressure(minBar, 'bar', displayUnit),
    max: convertPressure(maxBar, 'bar', displayUnit)
  };
};

