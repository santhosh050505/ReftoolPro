// backend/services/calculationService.js
// Direct API calls to Danfoss for refrigerant calculations

const axios = require('axios');

// DANFOSS API BASE URL
const DANFOSS_API_BASE = 'https://reftools.danfoss.com/api/ref-slider';

// Create axios instance with proper configuration
const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://reftools.danfoss.com',
    'Referer': 'https://reftools.danfoss.com/spa/tools/ref-slider'
  }
});

const r454bSaturationService = require('./r454bSaturationService');
const r513aSaturationService = require('./r513aSaturationService');

// Temperature unit mapping
const TEMP_UNIT_MAP = {
  'celsius': 'celsius',
  'fahrenheit': 'fahrenheit'
};

const PRESSURE_UNIT_MAP = {
  'psi': 'psi',
  'bar': 'bar',
  'pa': 'Pa',
  'kpa': 'kPa',
  'mpa': 'MPa',
  'atm': 'atm',
  'at': 'at',
  'mmhg': 'mmHg',
  'µmhg': 'µmHg',
  'inhg': 'inHg',
  'micron': 'µmHg'
};

const ATM_PRESSURE_BAR = 1.01325;

/**
 * Normalize refrigerant name to Danfoss RefID
 * Extracts the R-number (e.g., "R1150 (Ethylene)" -> "r1150")
 */
const normalizeRefId = (refrigerant) => {
  if (!refrigerant) return '';

  const lowerRef = refrigerant.trim().toLowerCase();

  // Preserve (E) and (Z) suffixes for isomers
  if (lowerRef.endsWith('(e)') || lowerRef.endsWith('(z)')) {
    return lowerRef;
  }

  // Extract R-number part before any parentheses (e.g., R1150 (Ethylene) -> R1150)
  let id = refrigerant.split('(')[0].trim();
  // Strip non-alphanumeric and lowercase
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Convert pressure to bar
 */
const convertPressureToBar = (value, fromUnit) => {
  if (value === undefined || value === null || isNaN(value)) return 0;

  // Normalized unit keys (matches conversions keys)
  const unit = fromUnit === 'micron' ? 'µmHg' : fromUnit;

  const conversions = {
    'psi': 1 / 14.50377377,
    'bar': 1,
    'Pa': 1 / 100000,
    'kPa': 1 / 100,
    'MPa': 10,
    'atm': 1.01325,
    'at': 0.980665,
    'mmHg': 1 / 750.06168,
    'µmHg': 1 / 750061.68,
    'inHg': 1 / 29.52998
  };

  const factor = conversions[unit] || conversions[fromUnit];
  if (!factor) {
    console.warn(`Unknown pressure unit for conversion to bar: ${fromUnit}, assuming bar`);
    return value;
  }
  return value * factor;
};

/**
 * Convert pressure from bar
 */
const convertPressureFromBar = (value, toUnit) => {
  if (value === undefined || value === null || isNaN(value)) return 0;

  // Normalized unit keys
  const unit = toUnit === 'micron' ? 'µmHg' : toUnit;

  const conversions = {
    'psi': 14.50377377,
    'bar': 1,
    'Pa': 100000,
    'kPa': 100,
    'MPa': 0.1,
    'atm': 1 / 1.01325,
    'at': 1 / 0.980665,
    'mmHg': 750.06168,
    'µmHg': 750061.68,
    'inHg': 29.52998
  };

  const factor = conversions[unit] || conversions[toUnit];
  if (!factor) {
    console.warn(`Unknown pressure unit for conversion from bar: ${toUnit}, assuming bar`);
    return value;
  }
  return value * factor;
};

/**
 * Get refrigerant metadata
 */
const getRefrigerantMetadata = async (refrigerant, pressureUnit = 'psi', temperatureUnit = 'celsius') => {
  try {
    let refId = normalizeRefId(refrigerant);
    if (!refId) {
      throw new Error(`Invalid refrigerant: ${refrigerant}`);
    }

    const normalizedTempUnit = TEMP_UNIT_MAP[temperatureUnit.toLowerCase()] || 'celsius';
    const normalizedPressureUnit = PRESSURE_UNIT_MAP[pressureUnit.toLowerCase()] || 'psi';

    const payload = {
      refId: refId,
      temperatureUnit: normalizedTempUnit,
      pressureUnit: normalizedPressureUnit,
      includeMetadata: true,
      pressureCalculationUnit: 'abs',
      pressureReferenceUnit: 'absolute',
      pressureReferencePoint: 'absolute',
      refType: 'dew',
      pressureCalculationPoint: 'dew',
      probeUnit: normalizedPressureUnit,
      temperatureProbeUnit: normalizedTempUnit
    };

    const response = await apiClient.post(
      `${DANFOSS_API_BASE}/slider?refId=${refId}&includeMetadata=true`,
      payload
    );

    // Log bubble capabilities
    if (response.data.hasBubbleCalculation) {
    }

    const data_lower = response.data;

    let pressureMin = 0.1;
    let pressureMax = 1000;
    let temperatureMin = -100;
    let temperatureMax = 200;

    // Extract ranges from the data array (saturation curve)
    if (data_lower.data && Array.isArray(data_lower.data) && data_lower.data.length > 0) {
      const pressures = data_lower.data.map(d => d.p);
      pressureMin = Math.min(...pressures);
      pressureMax = Math.max(...pressures);
    }

    // Try to get temperature limits from metadata
    if (data_lower.metadata) {
      if (data_lower.metadata.triplePointCelsius) {
        temperatureMin = parseFloat(data_lower.metadata.triplePointCelsius.toString().split(',')[0]);
      }
    }

    const hasBubbleCalculation = data_lower.hasBubbleCalculation === true;
    // BUG #9 FIXED: supportsDew was always true because !false === true.
    // A refrigerant supports dew-point if the API explicitly says so OR if hasBubble is not explicitly false.
    const supportsDew = data_lower.supportsDew !== false;
    const supportsBubble = hasBubbleCalculation === true;
    const supportsAbsolute = data_lower.supportsAbsolute !== false;
    const supportsGauge = data_lower.supportsGauge !== false;

    const metadata = {
      minPressure: pressureMin,
      maxPressure: pressureMax,
      minTemperature: temperatureMin,
      maxTemperature: temperatureMax,
      supportsDew: supportsDew,
      supportsBubble: supportsBubble,
      supportsAbsolute: supportsAbsolute,
      supportsGauge: supportsGauge,
      hasGlide: data_lower.hasGlide || false,
      glideValue: data_lower.glide || 0,
      pressureUnit: pressureUnit,
      temperatureUnit: temperatureUnit
    };

    return {
      success: true,
      refrigerant: refrigerant,
      metadata: metadata
    };

  } catch (error) {
    console.error('Metadata Fetch Error:', error.message);

    // Return safe defaults
    return {
      success: true,
      refrigerant: refrigerant,
      metadata: {
        minPressure: 0.1,
        maxPressure: 1000,
        minTemperature: -100,
        maxTemperature: 200,
        supportsDew: true,
        supportsBubble: true,
        supportsAbsolute: true,
        supportsGauge: true,
        hasGlide: false,
        glideValue: 0,
        pressureUnit: pressureUnit,
        temperatureUnit: temperatureUnit
      }
    };
  }
};

/**
 * Calculate pressure from temperature
 */
const calculatePressureFromTemp = async (data) => {
  const {
    temperature,
    temperatureUnit = 'celsius',
    pressureUnit = 'psi',
    refrigerant = 'r407c',
    isDew = true,
    isAbsolute = true,
    atmOffset = ATM_PRESSURE_BAR
  } = data;
  try {
    const tempNum = parseFloat(temperature);
    if (isNaN(tempNum)) {
      throw new Error('Temperature must be a valid number');
    }

    let refId = normalizeRefId(refrigerant);
    if (!refId) {
      throw new Error(`Invalid refrigerant: ${refrigerant}`);
    }

    const normalizedTempUnit = TEMP_UNIT_MAP[temperatureUnit.toLowerCase()] || 'celsius';
    const normalizedPressureUnit = PRESSURE_UNIT_MAP[pressureUnit.toLowerCase()] || 'psi';

    // Send request to API (Always request ABSOLUTE from API to ensure consistency)
    const payload = {
      temperature: tempNum.toString(),
      refId: refId,
      temperatureUnit: normalizedTempUnit,
      pressureUnit: 'bar',
      includeMetadata: false,
      pressureCalculationUnit: 'abs',
      pressureReferenceUnit: 'absolute',    // Variant 1
      pressureReferencePoint: 'absolute',   // Variant 2
      refType: isDew ? 'dew' : 'bubble',    // Variant 3
      pressureCalculationPoint: isDew ? 'dew' : 'bubble', // Variant 4
      temperatureProbeUnit: normalizedTempUnit
    };

    const response = await apiClient.post(
      `${DANFOSS_API_BASE}/pressure?refId=${refId}`,
      payload
    );

    let calculatedPressureBar;
    if (typeof response.data === 'object' && response.data !== null) {
      calculatedPressureBar = parseFloat(response.data.pressure || response.data.value || response.data);
    } else {
      calculatedPressureBar = parseFloat(response.data);
    }

    if (isNaN(calculatedPressureBar)) {
      throw new Error(`API returned invalid pressure: ${response.data}`);
    }

    // --- HANDLE GAUGE CONVERSION MANUALLY ---
    // API returns Absolute Pressure in Bar
    let finalPressureBar = calculatedPressureBar;

    if (!isAbsolute) {
      // Convert Absolute to Gauge: P_gauge = P_abs - P_atm
      finalPressureBar = calculatedPressureBar - atmOffset;
    }

    // --- CONVERT TO TARGET UNIT ---
    let finalPressure = finalPressureBar;
    if (normalizedPressureUnit !== 'bar') {
      finalPressure = convertPressureFromBar(finalPressureBar, normalizedPressureUnit);
    }

    if (!isFinite(finalPressure)) {
      throw new Error(`Calculated pressure is invalid: ${finalPressure}`);
    }

    return {
      success: true,
      pressure: parseFloat(finalPressure.toFixed(2)),
      unit: pressureUnit,
      temperature: tempNum,
      temperatureUnit: temperatureUnit,
      refrigerant: refrigerant,
      isDew: isDew,
      isAbsolute: isAbsolute
    };

  } catch (error) {
    console.error('Pressure Calculation Error:', error.message);
    const errorMsg = error.response?.data?.message || error.message;
    throw new Error(`Failed to calculate pressure: ${errorMsg}`);
  }
};

/**
 * Calculate temperature from pressure
 */
const calculateTempFromPressure = async (data) => {
  const {
    pressure,
    pressureUnit = 'psi',
    temperatureUnit = 'celsius',
    refrigerant = 'r407c',
    isDew = true,
    isAbsolute = true,
    atmOffset = ATM_PRESSURE_BAR
  } = data;

  try {
    const pressureNum = parseFloat(pressure);
    if (isNaN(pressureNum)) { // Allow 0 or negative for Gauge
      throw new Error('Pressure must be a valid number');
    }

    let refId = normalizeRefId(refrigerant);
    if (!refId) {
      throw new Error(`Invalid refrigerant: ${refrigerant}`);
    }

    const normalizedTempUnit = TEMP_UNIT_MAP[temperatureUnit.toLowerCase()] || 'celsius';
    let normalizedPressureUnit = PRESSURE_UNIT_MAP[pressureUnit.toLowerCase()] || 'psi';

    if (!normalizedPressureUnit) {
      throw new Error(`Unknown pressure unit: ${pressureUnit}`);
    }

    // --- HANDLE GAUGE CONVERSION MANUALLY ---
    // We need to send Absolute Pressure in Bar to API

    // 1. Convert input unit to Bar
    let pressureBar = pressureNum;
    if (normalizedPressureUnit !== 'bar') {
      pressureBar = convertPressureToBar(pressureNum, normalizedPressureUnit);
    }

    // 2. Convert Gauge to Absolute if needed: P_abs = P_gauge + P_atm
    let pressureAbsBar = pressureBar;
    if (!isAbsolute) {
      pressureAbsBar = pressureBar + atmOffset;
    }

    // Validate Absolute Pressure (cannot be negative physically, though math works)
    if (pressureAbsBar <= 0) {
      // Warning: Very low pressure (vacuum)
      console.warn(`   Warning: Low absolute pressure: ${pressureAbsBar} bar`);
    }

    const payload = {
      pressure: pressureAbsBar.toString(),
      refId: refId,
      temperatureUnit: normalizedTempUnit,
      pressureUnit: 'bar',
      includeMetadata: false,
      pressureCalculationUnit: 'abs',
      pressureReferenceUnit: 'absolute',    // Variant 1
      pressureReferencePoint: 'absolute',   // Variant 2
      refType: isDew ? 'dew' : 'bubble',    // Variant 3
      pressureCalculationPoint: isDew ? 'dew' : 'bubble', // Variant 4
      temperatureProbeUnit: normalizedTempUnit
    };

    const response = await apiClient.post(
      `${DANFOSS_API_BASE}/temperature?refId=${refId}`,
      payload
    );

    let calculatedTemp;
    if (typeof response.data === 'object' && response.data !== null) {
      calculatedTemp = parseFloat(response.data.temperature || response.data.value || response.data);
    } else {
      calculatedTemp = parseFloat(response.data);
    }

    if (isNaN(calculatedTemp)) {
      throw new Error(`API returned invalid temperature: ${response.data}`);
    }

    if (!isFinite(calculatedTemp)) {
      throw new Error(`Calculated temperature is not finite: ${calculatedTemp}`);
    }

    return {
      success: true,
      temperature: parseFloat(calculatedTemp.toFixed(2)),
      unit: temperatureUnit,
      pressure: pressureNum,
      pressureUnit: pressureUnit,
      refrigerant: refrigerant,
      isDew: isDew,
      isAbsolute: isAbsolute
    };

  } catch (error) {
    console.error('Temperature Calculation Error:', error.message);
    const errorMsg = error.response?.data?.message || error.message;
    throw new Error(`Failed to calculate temperature: ${errorMsg}`);
  }
};

/**
 * Get slider data
 */
const getSliderData = async (data) => {
  const {
    refrigerant = 'r407c',
    pressureUnit = 'psi',
    temperatureUnit = 'celsius',
    includeMetadata = true,
    isDew = true,
    isAbsolute = true
  } = data;

  try {
    const refId = normalizeRefId(refrigerant);
    const normalizedTempUnit = TEMP_UNIT_MAP[temperatureUnit.toLowerCase()] || 'celsius';
    const normalizedPressureUnit = PRESSURE_UNIT_MAP[pressureUnit.toLowerCase()] || 'psi';

    const payload = {
      refId: refId,
      temperatureUnit: normalizedTempUnit,
      pressureUnit: normalizedPressureUnit,
      includeMetadata: includeMetadata,
      pressureCalculationUnit: 'abs',
      pressureReferenceUnit: 'absolute',
      probeUnit: normalizedPressureUnit,
      refType: isDew ? 'dew' : 'bubble',
      temperatureProbeUnit: normalizedTempUnit
    };

    const response = await apiClient.post(
      `${DANFOSS_API_BASE}/slider?refId=${refId}&includeMetadata=${includeMetadata}`,
      payload
    );

    return {
      success: true,
      data: response.data,
      refrigerant: refrigerant
    };

  } catch (error) {
    console.error('❌ Slider Data Error:', error.message);
    throw new Error(`Failed to get slider data: ${error.message}`);
  }
};

/**
 * Get full refrigerant range data from Danfoss API
 */
const getFullRefrigerantRanges = async (refrigerant) => {
  try {
    const refId = normalizeRefId(refrigerant);

    // Units to fetch ranges for
    const pressureUnits = ['bar', 'Pa', 'kPa', 'MPa', 'psi', 'atm', 'at', 'mmHg', 'inHg'];
    const tempUnits = ['celsius', 'fahrenheit'];

    const ranges = {
      pressure_absolute: {},
      temperature: {}
    };

    // Use a single metadata call to get the base data (saturation curve)
    // The Danfoss API slider endpoint returns a 'data' array with {p, t} points
    const payload = {
      refId: refId,
      temperatureUnit: 'celsius',
      pressureUnit: 'bar',
      includeMetadata: true,
      pressureCalculationUnit: 'abs',
      pressureReferenceUnit: 'absolute',
      probeUnit: 'bar',
      refType: 'dew',
      temperatureProbeUnit: 'celsius'
    };

    const response = await apiClient.post(
      `${DANFOSS_API_BASE}/slider?refId=${refId}&includeMetadata=true`,
      payload
    );

    if (!response.data) {
      throw new Error('Invalid response from Danfoss API');
    }

    // --- Extract pressure range ---
    // Try root-level fields first (some refrigerants return them directly)
    let minBar = response.data.minPressure !== undefined ? parseFloat(response.data.minPressure) : null;
    let maxBar = response.data.maxPressure !== undefined ? parseFloat(response.data.maxPressure) : null;

    // Fall back to deriving range from the saturation curve data array
    // (Most blends like R403B, R404A, etc. only provide data[] with {p, t} points)
    if ((minBar === null || maxBar === null || minBar === 0.1) &&
        response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const pressures = response.data.data
        .map(d => parseFloat(d.p))
        .filter(p => !isNaN(p) && p > 0);
      if (pressures.length > 0) {
        minBar = Math.min(...pressures);
        maxBar = Math.max(...pressures);
      }
    }

    // Final safety fallback (should rarely be hit)
    if (minBar === null || isNaN(minBar)) minBar = 0.1;
    if (maxBar === null || isNaN(maxBar)) maxBar = 100;

    // --- Extract temperature range ---
    let minC = response.data.minTemperature !== undefined ? parseFloat(response.data.minTemperature) : null;
    let maxC = response.data.maxTemperature !== undefined ? parseFloat(response.data.maxTemperature) : null;

    // Fall back to deriving temperature range from the saturation curve
    if ((minC === null || maxC === null) &&
        response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const temps = response.data.data
        .map(d => parseFloat(d.t))
        .filter(t => !isNaN(t));
      if (temps.length > 0) {
        minC = Math.min(...temps);
        maxC = Math.max(...temps);
      }
    }

    if (minC === null || isNaN(minC)) minC = -100;
    if (maxC === null || isNaN(maxC)) maxC = 200;

    // Convert pressure ranges to all supported units
    pressureUnits.forEach(unit => {
      const displayUnit = unit === 'micron' ? 'µmHg' : unit;
      ranges.pressure_absolute[unit] = {
        min: parseFloat(convertPressureFromBar(minBar, displayUnit).toFixed(4)),
        max: parseFloat(convertPressureFromBar(maxBar, displayUnit).toFixed(4))
      };
    });

    // Add micron (accurate conversion: 1 mmHg = 1000 microns)
    const mmHgMin = ranges.pressure_absolute['mmHg'].min;
    const mmHgMax = ranges.pressure_absolute['mmHg'].max;
    ranges.pressure_absolute['micron'] = {
      min: Math.round(mmHgMin * 1000),
      max: Math.round(mmHgMax * 1000)
    };

    // Convert temperature ranges
    ranges.temperature['C'] = {
      min: parseFloat(minC.toFixed(2)),
      max: parseFloat(maxC.toFixed(2))
    };

    const cToF = (c) => (c * 9 / 5) + 32;
    ranges.temperature['F'] = {
      min: parseFloat(cToF(minC).toFixed(2)),
      max: parseFloat(cToF(maxC).toFixed(2))
    };

    return {
      success: true,
      refrigerant: refrigerant,
      ranges: ranges
    };
  } catch (error) {
    console.error('Danfoss Range Fetch Error:', error.message);
    throw error;
  }
};

module.exports = {
  calculatePressureFromTemp,
  calculateTempFromPressure,
  getSliderData,
  getRefrigerantMetadata,
  getFullRefrigerantRanges
};
