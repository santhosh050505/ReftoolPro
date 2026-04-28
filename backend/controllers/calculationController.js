const Calculation = require('../models/Calculation');
const Project = require('../models/Project');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const r454bSaturationService = require('../services/r454bSaturationService');
const r454bSuperheatService = require('../services/r454bSuperheatService');
// BUG #7 FIXED: require() moved to top of file (was mid-file at line 540)
const { convertToBarAbs, convertToCelsius, convertDeltaT } = require('../utils/unitConverter');

// Create new calculation
exports.createCalculation = async (req, res) => {
  try {
    const {
      projectId,
      name,
      refrigerant,
      pressure,
      pressureUnit,
      temperature,
      temperatureUnit,
      distanceUnit,
      altitude,
      ambientPressureData,
      isAbsolute,
      actualTemperature,
      defineStateCycle,
      inputValue,
      isDew,
      isManual,
      liquidTemperature
    } = req.body;

    const userId = req.user.userId;

    // Validate required fields
    if (!projectId || !name || !refrigerant || pressure === undefined || temperature === undefined) {
      return res.status(400).json({ error: 'Missing required calculation fields' });
    }

    // Verify project exists and belongs to user
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check row limit (Max 10 per project)
    const existingCount = await Calculation.count({ projectId, userId });
    if (existingCount >= 10) {
      return res.status(400).json({
        error: 'Project limit reached (10 calculations maximum). Please delete an existing row to add a new one.'
      });
    }

    // Determine order (last + 1)
    const lastCalc = await Calculation.findLast({ projectId, userId });
    const nextOrder = lastCalc ? (lastCalc.order || 0) + 1 : 0;

    // Project Constraints: Ensure settings are locked and enforced
    if (!project.lockedRefrigerant || project.lockedRefrigerant === '-') {
      // Check if there are any existing calculations WITH A VALID REFRIGERANT to derive the lock from
      const firstExisting = await Calculation.findOne({
        projectId,
        userId,
        refrigerant: { $ne: '-' },
        isManual: { $ne: true }
      });

      if (firstExisting) {
        await Project.findByIdAndUpdate(projectId, userId, {
          locked_refrigerant: firstExisting.refrigerant,
          locked_pressure_unit: firstExisting.pressure_unit,
          locked_temperature_unit: firstExisting.temperature_unit
        });
        project.locked_refrigerant = firstExisting.refrigerant;
        project.locked_pressure_unit = firstExisting.pressure_unit;
        project.locked_temperature_unit = firstExisting.temperature_unit;
      } else if (refrigerant && refrigerant !== '-') {
        await Project.findByIdAndUpdate(projectId, userId, {
          locked_refrigerant: refrigerant.trim(),
          locked_pressure_unit: pressureUnit,
          locked_temperature_unit: temperatureUnit
        });
        project.locked_refrigerant = refrigerant.trim();
        project.locked_pressure_unit = pressureUnit;
        project.locked_temperature_unit = temperatureUnit;
      }
    }

    // Now enforce the lock ONLY IF it's set to something valid
    if (project.locked_refrigerant && project.locked_refrigerant !== '-') {
      const reqRef = refrigerant.trim().toUpperCase();
      const lockRef = project.locked_refrigerant.toUpperCase();
      const mismatch = [];
      if (lockRef !== reqRef) mismatch.push('refrigerant');
      if (project.locked_pressure_unit !== pressureUnit) mismatch.push('pressure unit');
      if (project.locked_temperature_unit !== temperatureUnit) mismatch.push('temperature unit');
      if (mismatch.length > 0) {
        const tempDisplay = project.locked_temperature_unit === 'celsius' ? 'C' : 'F';
        return res.status(400).json({
          error: `Only this refrigerant and these units are allowed: ${project.locked_refrigerant}, ${project.locked_pressure_unit} and °${tempDisplay}`
        });
      }
    }

    const calculation = await Calculation.create({
      project_id: projectId,
      user_id: userId,
      name: name.trim(),
      refrigerant: refrigerant.trim(),
      pressure,
      pressure_unit: pressureUnit,
      temperature,
      temperature_unit: temperatureUnit,
      distance_unit: distanceUnit || 'meters',
      altitude: altitude || 0,
      ambient_pressure_data: ambientPressureData || null,
      is_dew: isDew !== undefined ? isDew : true,
      is_absolute: isAbsolute !== undefined ? isAbsolute : true,
      actual_temperature: actualTemperature !== undefined ? actualTemperature : null,
      define_state_cycle: defineStateCycle || null,
      input_value: inputValue !== undefined ? inputValue : null,
      is_manual: isManual !== undefined ? isManual : false,
      liquid_temperature: liquidTemperature !== undefined ? liquidTemperature : null,
      order: nextOrder
    });

    res.status(201).json({ success: true, message: 'Calculation saved successfully', calculation });
  } catch (error) {
    console.error('Create calculation error:', error);
    res.status(500).json({ error: 'Failed to save calculation' });
  }
};

// Get all calculations for a project
exports.getCalculationsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify project exists and belongs to user
    const project = await Project.findOne({ id: projectId, userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const calculations = await Calculation.find({ projectId, userId });

    res.json({
      success: true,
      calculations
    });
  } catch (error) {
    console.error('Get calculations error:', error);
    res.status(500).json({ error: 'Failed to fetch calculations' });
  }
};

// Get single calculation by ID
exports.getCalculation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const calculation = await Calculation.findOne({ id, userId });
    if (!calculation) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.json({
      success: true,
      calculation
    });
  } catch (error) {
    console.error('Get calculation error:', error);
    res.status(500).json({ error: 'Failed to fetch calculation' });
  }
};

// Update calculation
exports.updateCalculation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      refrigerant,
      pressure,
      pressureUnit,
      temperature,
      temperatureUnit,
      distanceUnit,
      altitude,
      ambientPressureData,
      isDew,
      isAbsolute,
      actualTemperature,
      defineStateCycle,
      inputValue,
      isManual,
      liquidTemperature
    } = req.body;

    const userId = req.user.userId;

    const existingCalc = await Calculation.findOne({ id, userId });
    if (!existingCalc) return res.status(404).json({ error: 'Calculation not found' });

    const project = await Project.findOne({ id: existingCalc.project_id, userId });
    if (project) {
      if (!project.locked_refrigerant || project.locked_refrigerant === '-') {
        const firstExisting = await Calculation.findOne({
          projectId: existingCalc.project_id,
          userId,
          refrigerant: { $ne: '-' },
          isManual: { $ne: true }
        });

        if (firstExisting) {
          await Project.findByIdAndUpdate(existingCalc.project_id, userId, {
            locked_refrigerant: firstExisting.refrigerant,
            locked_pressure_unit: firstExisting.pressure_unit,
            locked_temperature_unit: firstExisting.temperature_unit
          });
          project.locked_refrigerant = firstExisting.refrigerant;
        }
      }

      if (project.locked_refrigerant && project.locked_refrigerant !== '-') {
        const checkRef = (refrigerant !== undefined && refrigerant !== '-') ? refrigerant.trim().toUpperCase() : null;
        const lockRef = project.locked_refrigerant.toUpperCase();
        const mismatch = [];
        if (checkRef && lockRef !== checkRef) mismatch.push('refrigerant');
        if (pressureUnit && project.locked_pressure_unit !== pressureUnit) mismatch.push('pressure unit');
        if (temperatureUnit && project.locked_temperature_unit !== temperatureUnit) mismatch.push('temperature unit');
        if (mismatch.length > 0) {
          const tempDisplay = project.locked_temperature_unit === 'celsius' ? 'C' : 'F';
          return res.status(400).json({
            error: `Only this refrigerant and these units are allowed: ${project.locked_refrigerant}, ${project.locked_pressure_unit} and °${tempDisplay}`
          });
        }
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (refrigerant !== undefined) updateData.refrigerant = refrigerant.trim();
    if (pressure !== undefined) updateData.pressure = pressure;
    if (pressureUnit !== undefined) updateData.pressure_unit = pressureUnit;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (temperatureUnit !== undefined) updateData.temperature_unit = temperatureUnit;
    if (distanceUnit !== undefined) updateData.distance_unit = distanceUnit;
    if (altitude !== undefined) updateData.altitude = altitude;
    if (ambientPressureData !== undefined) updateData.ambient_pressure_data = ambientPressureData;
    if (isDew !== undefined) updateData.is_dew = isDew;
    if (isAbsolute !== undefined) updateData.is_absolute = isAbsolute;
    if (actualTemperature !== undefined) updateData.actual_temperature = actualTemperature;
    if (defineStateCycle !== undefined) updateData.define_state_cycle = defineStateCycle;
    if (inputValue !== undefined) updateData.input_value = inputValue;
    if (isManual !== undefined) updateData.is_manual = isManual;
    if (liquidTemperature !== undefined) updateData.liquid_temperature = liquidTemperature;

    const calculation = await Calculation.findByIdAndUpdate(id, userId, updateData);

    if (!calculation) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.json({
      success: true,
      message: 'Calculation updated successfully',
      calculation
    });
  } catch (error) {
    console.error('Update calculation error:', error);
    res.status(500).json({ error: 'Failed to update calculation' });
  }
};

// Bulk update calculations (for reordering or batch renaming)
exports.bulkUpdateCalculations = async (req, res) => {
  try {
    const { updates } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    await Calculation.bulkUpdate(updates, userId);

    res.json({
      success: true,
      message: 'Calculations updated successfully'
    });
  } catch (error) {
    console.error('Bulk update calculations error:', error);
    res.status(500).json({ error: 'Failed to bulk update calculations' });
  }
};

// Delete calculation
exports.deleteCalculation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const calculation = await Calculation.findByIdAndDelete(id, userId);
    if (!calculation) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.json({
      success: true,
      message: 'Calculation deleted successfully'
    });
  } catch (error) {
    console.error('Delete calculation error:', error);
    res.status(500).json({ error: 'Failed to delete calculation' });
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TLK ENERGY API PROXY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Forwards refrigeration cycle calculation requests to TLK Energy's API
 * to bypass CORS restrictions.
 * 
 * Route: GET /api/calculations/tlk-proxy
 * 
 * Query Parameters:
 *   - refrigerant    : Refrigerant name (e.g., "R134a", "R407C", "R410A")
 *   - calc_type      : Calculation mode ("p_levels" or "T_levels")
 *   
 *   For p_levels mode:
 *     - p_cond       : Condensation pressure (bar)
 *     - p_evap       : Evaporation pressure (bar)
 *   
 *   For T_levels mode:
 *     - T_cond       : Condensation temperature (°C)
 *     - T_evap       : Evaporation temperature (°C)
 *   
 *   Common parameters:
 *     - dT_sh        : Superheating (K)
 *     - dT_sc        : Subcooling (K)
 *     - eta_is       : Isentropic compressor efficiency (0-1)
 *     - eta_exp      : Expansion efficiency (0-1, typically 1.0)
 * 
 * TLK Energy API Documentation:
 *   https://tlk-energy.de/en/phase-diagrams/pressure-enthalpy
 * 
 * Response Format:
 *   {
 *     "cycle_info": {
 *       "dh_evap": number,     // Evaporator heat transfer (J/kg)
 *       "dh_cond": number,     // Condenser heat transfer (J/kg)
 *       "p_el": number,        // Electrical power (W)
 *       "COP": number,         // Coefficient of Performance
 *       "EER": number,         // Energy Efficiency Ratio
 *       "eta_ORC": number|null
 *     },
 *     "state_points": [
 *       {
 *         "name": string,      // e.g., "Evaporator inlet"
 *         "x": number,         // Specific enthalpy (kJ/kg)
 *         "y": number,         // Pressure (bar)
 *         "T": number,         // Temperature (°C)
 *         "d": number,         // Density (kg/m³)
 *         "s": number,         // Specific entropy (J/kg·K)
 *         "id": number         // State point ID
 *       },
 *       ...
 *     ]
 * ═══════════════════════════════════════════════════════════════════════════
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET SINGLE POINT PROPERTIES
 * ═══════════════════════════════════════════════════════════════════════════
 * Uses CoolProp to calculate h, s, d for given p, t.
 */
exports.getPointProperties = async (req, res) => {
  try {
    let { refrigerant, p, t, q, pressureUnit = 'bar', temperatureUnit = 'celsius', isAbsolute = true } = req.query;

    if (!refrigerant || (!p && !t)) {
      return res.status(400).json({ error: 'Missing refrigerant or p/t' });
    }

    // Standardize units before passing to CoolProp script
    if (p) p = convertToBarAbs(parseFloat(p), pressureUnit, isAbsolute);
    if (t) t = convertToCelsius(parseFloat(t), temperatureUnit);

    // SPECIAL CASE: R513A & R454B - Bypass CoolProp as requested
    const refUpper = refrigerant.toUpperCase();
    if (['R513A', '513A'].includes(refUpper)) {
      return res.status(200).json({
        bypass: true,
        message: 'R513A handled locally'
      });
    }

    if (['R454B', '454B'].includes(refUpper)) {
      // For R454B, we provide exact data from JSON instead of a generic bypass
      let result = null;
      if (p && t) {
        // Superheat lookup (Nearest Neighbor to match R513A pattern)
        const lookup = r454bSuperheatService.getSuperheatPropertiesNearest(p, t);
        if (lookup && lookup.properties) {
          result = {
            h: lookup.properties.H,
            s: lookup.properties.S,
            d: lookup.properties.D,
            v: lookup.properties.V,
            t: lookup.actual_temp,
            p: lookup.pressure
          };
        }
      } else if (t) {
        // Saturation lookup by T (Nearest Neighbor) — t must be defined
        const props = isDew ? r454bSaturationService.getVaporProperties(t) : r454bSaturationService.getLiquidProperties(t);
        if (props) {
          const satPress = r454bSaturationService.getSaturationPressure(t);
          result = {
            h: props.enthalpy_kj_per_kg,
            s: props.entropy_J_per_kgK,
            d: props.density_kg_per_m3,
            p: isDew ? satPress?.vapor_bar : satPress?.liquid_bar,
            t: satPress?.actual_temp || t
          };
        }
      } else {
        // BUG #13 FIXED: p-only with no t is not supported for R454B lookup
        return res.status(400).json({ error: 'R454B point properties require temperature (t) parameter' });
      }

      if (result) return res.json(result);
      return res.status(404).json({ error: 'R454B data out of range' });
    }

    const scriptPath = path.join(__dirname, '..', 'scripts', 'coolprop_props.py');
    const inputData = JSON.stringify({ refrigerant, p, t, q });

    const pythonProcess = spawn('python', [scriptPath]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Props calc failed', details: errorData });
      }

      try {
        const result = JSON.parse(resultData);
        if (result.error) return res.status(400).json({ error: result.error });
        res.json(result);
      } catch (parseError) {
        res.status(500).json({ error: 'Parse error', details: parseError.message });
      }
    });

    pythonProcess.stdin.write(inputData);
    pythonProcess.stdin.end();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COOLPROP CALCULATION ENGINE (Replacement for TLK Energy API)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Performs refrigeration cycle calculations using CoolProp (Python).
 * 
 * Route: GET /api/calculations/tlk-proxy
 * (Kept the original route name to avoid frontend changes)
 */
// BUG #7: require() previously placed here mid-file.
// It has been moved to the top of the file with all other requires.

exports.proxyTlkCalculation = async (req, res) => {
  try {
    let {
      refrigerant,
      calc_type,
      p_cond,
      p_evap,
      T_cond,
      T_evap,
      dT_sh,
      dT_sc,
      eta_is,
      pressureUnit = 'bar',
      temperatureUnit = 'celsius',
      isAbsolute = true
    } = req.query;

    // ─── Normalization ────────────────────────────────────────────────────────
    if (calc_type === 'p_levels') {
      p_cond = convertToBarAbs(parseFloat(p_cond), pressureUnit, isAbsolute);
      p_evap = convertToBarAbs(parseFloat(p_evap), pressureUnit, isAbsolute);
    } else if (calc_type === 'T_levels') {
      T_cond = convertToCelsius(parseFloat(T_cond), temperatureUnit);
      T_evap = convertToCelsius(parseFloat(T_evap), temperatureUnit);
    }

    // Standardize Superheating and Subcooling (using 5/9 if Fahrenheit)
    dT_sh = convertDeltaT(parseFloat(dT_sh || 0), temperatureUnit);
    dT_sc = convertDeltaT(parseFloat(dT_sc || 0), temperatureUnit);

    // ─── Validation ──────────────────────────────────────────────────────────
    if (!refrigerant) {
      return res.status(400).json({ error: 'Missing required parameter: refrigerant' });
    }

    // SPECIAL CASE: R513A & R454B - Bypass CoolProp as requested
    const refUpper = refrigerant.toUpperCase();
    // BUG #6 FIXED: '454B' (short form without R prefix) was missing; 'R454B_SUPERHEAT.JSON' was a filename not a refrigerant ID
    if (['R513A', '513A', 'R454B', '454B'].includes(refUpper)) {
      return res.status(200).json({
        bypass: true,
        message: `${refUpper} handled locally via derivation formula/lookup`,
        state_points: [],
        cycle_info: {}
      });
    }

    if (!calc_type || !['p_levels', 'T_levels'].includes(calc_type)) {
      return res.status(400).json({ error: 'Invalid calc_type. Must be either "p_levels" or "T_levels"' });
    }

    // Check mode-specific required parameters
    if (calc_type === 'p_levels') {
      if (!p_cond || !p_evap) {
        return res.status(400).json({ error: 'For p_levels mode, p_cond and p_evap are required' });
      }
    } else if (calc_type === 'T_levels') {
      if (!T_cond || !T_evap) {
        return res.status(400).json({ error: 'For T_levels mode, T_cond and T_evap are required' });
      }
    }

    // ─── CoolProp Bridge ─────────────────────────────────────────────────────
    const scriptPath = path.join(__dirname, '..', 'scripts', 'coolprop_cycle.py');
    const inputData = JSON.stringify({
      refrigerant,
      calc_type,
      p_cond,
      p_evap,
      T_cond,
      T_evap,
      dT_sh,
      dT_sc,
      eta_is
    });

    console.log('[CoolProp] Starting calculation for:', refrigerant);

    const pythonProcess = spawn('python', [scriptPath]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('[CoolProp] Process exited with code', code, 'Error:', errorData);
        return res.status(500).json({
          error: 'CoolProp calculation failed',
          details: errorData
        });
      }

      try {
        const result = JSON.parse(resultData);
        if (result.error) {
          console.error('[CoolProp] Calculation error:', result.error);
          return res.status(400).json({
            error: 'CoolProp engine error',
            details: result.error
          });
        }

        console.log('[CoolProp] Success! Points:', result.state_points?.length);
        res.json(result);
      } catch (parseError) {
        console.error('[CoolProp] Parse error:', parseError.message, 'Output:', resultData);
        res.status(500).json({
          error: 'Failed to parse CoolProp output',
          details: parseError.message
        });
      }
    });

    // Write input to stdin and end
    pythonProcess.stdin.write(inputData);
    pythonProcess.stdin.end();

  } catch (error) {
    console.error('[CoolProp Wrapper] Unexpected error:', error.message);
    res.status(500).json({
      error: 'Unexpected error in CoolProp wrapper',
      details: error.message
    });
  }
};
