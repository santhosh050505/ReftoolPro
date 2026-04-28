// BUG #1 FIXED: imports must come before any const/let declarations
import { getSinglePointPropertiesR513A } from '../utils/thermoR513A';
import { getSinglePointPropertiesR454B } from '../utils/thermoR454B';
import { getCachedR513AData } from './r513aDataService';
import { getCachedR454BData } from './r454bDataService';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Refrigerant name normalizer ───────────────────────────────────────────────
// hi

const REFRIGERANT_MAP = {
  'R12': 'R12', '12': 'R12',
  'R22': 'R22', '22': 'R22',
  'R23': 'R23', '23': 'R23',
  'R32': 'R32', '32': 'R32',
  'R125': 'R125', '125': 'R125',
  'R134A': 'R134a', 'R134': 'R134a', '134A': 'R134a', '134': 'R134a',
  'R141B': 'R141b', '141B': 'R141b',
  'R245FA': 'R245fa', '245FA': 'R245fa',
  'R290': 'R290', '290': 'R290', 'R290 (PROPANE)': 'R290', 'PROPANE': 'R290',
  'R404A': 'R404A', '404A': 'R404A', '404': 'R404A',
  'R407C': 'R407C', '407C': 'R407C', 'R407A': 'R407A', 'R407F': 'R407F', 'R407H': 'R407H',
  'R410A': 'R410A', '410A': 'R410A', '410': 'R410A',
  'R454B': 'R454B', '454B': 'R454B', 'R454C': 'R454C', '454C': 'R454C',
  'R513A': 'R513A', '513A': 'R513A',
  'R600A': 'R600a', '600A': 'R600a', 'R600A (ISOBUTANE)': 'R600a', 'ISOBUTANE': 'R600a',
  'R600': 'R600', '600': 'R600',
  'R601': 'R601', '601': 'R601', 'R601 (PENTANE)': 'R601', 'PENTANE': 'R601',
  'R601A': 'R601a', '601A': 'R601a', 'R601A (ISOPENTANE)': 'R601a', 'ISOPENTANE': 'R601a',
  'R717': 'R717', 'R717 (AMMONIA)': 'R717', 'AMMONIA': 'R717', '717': 'R717',
  'R718': 'R718', 'R718 (WATER)': 'R718', 'WATER': 'R718', '718': 'R718',
  'R744': 'R744', 'R744 (CARBON DIOXIDE)': 'R744', 'CARBON DIOXIDE': 'R744', '744': 'R744',
  'R1233ZD(E)': 'R1233zd(E)', 'R1233ZDE': 'R1233zd(E)', '1233ZD': 'R1233zd(E)',
  'R1234YF': 'R1234yf', '1234YF': 'R1234yf',
  'R1234ZE(E)': 'R1234ze(E)', 'R1234ZEE': 'R1234ze(E)', '1234ZE': 'R1234ze(E)',
  'R1270': 'R1270', '1270': 'R1270', 'R1270 (PROPYLENE)': 'R1270', 'PROPYLENE': 'R1270',
  'R1336MZZ(Z)': 'R1336mzz(Z)', '1336MZZ(Z)': 'R1336mzz(Z)', '1336MZZ': 'R1336mzz(Z)',
  'R507A': 'R507A', '507A': 'R507A',
};

const normRefrigerant = (raw) => {
  if (!raw) return 'R134a';
  const upper = raw.trim().toUpperCase();
  if (REFRIGERANT_MAP[upper]) return REFRIGERANT_MAP[upper];
  const stripped = upper.split('(')[0].trim();
  if (REFRIGERANT_MAP[stripped]) return REFRIGERANT_MAP[stripped];
  const noDash = stripped.replace('R-', 'R');
  if (REFRIGERANT_MAP[noDash]) return REFRIGERANT_MAP[noDash];
  console.warn(`[TLK] Unknown refrigerant "${raw}", passing as-is`);
  return raw.trim();
};

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * @param {Array}  calculations  - project calculation rows from DB
 * @param {string} stateCycle    - "Pressure level(Evap./Cond.)" or "Temperature level(Evap./Cond.)"
 * @returns {Promise<{ cycle_info: object, state_points: Array }>}
 */
export const fetchDiagramData = async (calculations, stateCycle) => {
  if (!calculations || calculations.length === 0) {
    return { cycle_info: {}, state_points: [] };
  }

  // SPECIAL CASE: R513A & R454B - Skip remote/CoolProp API as requested.
  // We handle these locally in ThermoplotPage using the provided formula/lookup.
  // BUG #2 FIXED: single rawRef declaration (was duplicated at line 64 and 100)
  const rawRef = calculations.find(c => c.refrigerant)?.refrigerant || 'R134a';
  const refUpper = rawRef.toUpperCase();
  if (['R513A', '513A', 'R454B', '454B'].includes(refUpper)) {
    console.log(`[TLK] ${refUpper} detected, skipping remote API call as requested.`);
    return { cycle_info: {}, state_points: [] };
  }

  try {
    // ── 1. Helper to find row by defineStateCycle label ─────────────────────
    const findRow = (...labels) =>
      calculations.find(c => labels.includes(c.defineStateCycle));

    // ── 2. Detect mode ───────────────────────────────────────────────────────
    const isPressureMode = (stateCycle || '').toLowerCase().includes('pressure');

    console.log(`[TLK] Mode      : ${isPressureMode ? 'PRESSURE (p_levels)' : 'TEMPERATURE (T_levels)'}`);
    console.log(`[TLK] stateCycle: "${stateCycle}"`);

    // ─── 3. Pick correct rows from the project table ──────────────────────────
    const condRow = isPressureMode
      ? findRow('Saturated Condensation Pressure (SCP)')
      : findRow('Saturated Condensation Temperature (SCT)');

    const evapRow = isPressureMode
      ? findRow('Saturated Evaporation Pressure (SEP)')
      : findRow('Saturated Evaporator Temperature (SET)');

    const superRow = findRow('Evaporator Superheat', 'Evaporator Superheat(K)');
    const compSuperRow = findRow('Compressor Superheat', 'Compressor Superheat(K)');
    const subRow = findRow('Condenser Subcooling', 'Condenser Subcooling(K)');
    const effRow = findRow('Isentropic Efficiency');

    // ─── 4. Extract values ───────────────────────────────────────────────────
    // RULE: Use Sat Temperature and Sat Pressure DIRECTLY from the table rows.
    // "Input Value" is strictly for Superheating/Subcooling only.
    const refrigerant = normRefrigerant(rawRef);

    // Extract units from rows for backend normalization
    const pressureUnit = condRow?.pressureUnit || calculations[0]?.pressureUnit || 'bar';
    const temperatureUnit = (condRow?.temperatureUnit || calculations[0]?.temperatureUnit || 'celsius').toLowerCase();
    const isAbsolute = condRow?.isAbsolute !== undefined ? condRow.isAbsolute : true;

    const params = {
      refrigerant,
      calc_type: isPressureMode ? 'p_levels' : 'T_levels',
      pressureUnit,
      temperatureUnit,
      isAbsolute
    };

    if (isPressureMode) {
      params.p_cond = (parseFloat(condRow?.pressure) || 12).toFixed(4);
      params.p_evap = (parseFloat(evapRow?.pressure) || 3).toFixed(4);

      // Basic validation
      if (parseFloat(params.p_evap) >= parseFloat(params.p_cond)) {
        console.warn('[TLK] p_evap >= p_cond — swapping');
        const tmp = params.p_cond;
        params.p_cond = params.p_evap;
        params.p_evap = tmp;
      }
    } else {
      params.T_cond = (parseFloat(condRow?.temperature) || 45).toFixed(2);
      params.T_evap = (parseFloat(evapRow?.temperature) || 0).toFixed(2);

      if (parseFloat(params.T_evap) >= parseFloat(params.T_cond)) {
        console.warn('[TLK] T_evap >= T_cond — swapping');
        const tmp = params.T_cond;
        params.T_cond = params.T_evap;
        params.T_evap = tmp;
      }
    }

    // BUG #15 FIXED: dT_sh must be EVAPORATOR superheat (determines compressor inlet).
    // Compressor superheat is a result, not an input to the cycle thermodynamics.
    // Priority: Evaporator Superheat → Compressor Superheat → 0
    const tSh = parseFloat(superRow?.inputValue ?? compSuperRow?.inputValue ?? 0);
    params.dT_sh = tSh.toFixed(2);

    // Subcooling K — direct from project inputValue
    params.dT_sc = parseFloat(subRow?.inputValue ?? 0).toFixed(2);

    // Compressor isentropic efficiency — normalise % → fraction if > 1
    let eta = parseFloat(effRow?.inputValue ?? 0.7);
    if (isNaN(eta) || eta === 0) eta = 0.7;
    if (eta > 1) eta = eta / 100;
    eta = Math.min(Math.max(eta, 0.01), 1.0);
    params.eta_is = eta.toFixed(2);

    console.log(`[TLK] dT_sh = ${params.dT_sh} K  |  dT_sc = ${params.dT_sc} K  |  eta_is = ${params.eta_is}`);

    // ── 6. Call backend proxy ────────────────────────────────────────────────
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/calculations/tlk-proxy?${qs}`;

    console.log(`[TLK] → GET ${url}`);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('userToken')
          ? { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
          : {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Proxy ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log('[TLK] ← state_points count:', data.state_points?.length ?? 0);

    if (!data.state_points || data.state_points.length === 0) {
      throw new Error('TLK returned empty state_points');
    }

    // ── 7. Normalise response fields ─────────────────────────────────────────
    //   CoolProp returns: x = enthalpy (kJ/kg), y = pressure (bar), T = temp (°C)
    //   ThermoplotPage expects: h, p, t
    const state_points = data.state_points.map((pt, i) => ({
      ...pt,
      h: parseFloat(pt.x !== undefined ? pt.x : (pt.h ?? 0)),
      p: Math.max(parseFloat(pt.y !== undefined ? pt.y : (pt.p ?? 0.0001)), 0.0001),
      t: parseFloat(pt.T !== undefined ? pt.T : (pt.t ?? 0)),
      name: pt.name || `State ${i + 1}`,
      id: pt.id ?? i + 1,
    }));

    const cycle_info = {
      ...data.cycle_info,
      COP: data.cycle_info?.COP ?? data.cycle_info?.eta_ORC ?? 'N/A',
      EER: data.cycle_info?.EER ?? 'N/A',
    };

    console.log('[TLK] ✓ Done. state_points:', state_points);
    return { cycle_info, state_points };

  } catch (error) {
    console.error('[TLK] fetchDiagramData failed:', error.message);
    return { cycle_info: {}, state_points: [] };
  }
};

/**
 * Fetches thermodynamic properties for a single point
 * @param {object} params - { refrigerant, p, t, q }
 */

export const getPointProperties = async (params) => {
  const refUpper = params?.refrigerant?.toUpperCase();

  // SPECIAL CASE: R513A - Use local indexed lookup for absolute parity/speed
  if (['R513A', '513A'].includes(refUpper)) {
    const cached = getCachedR513AData();
    return getSinglePointPropertiesR513A(parseFloat(params.p), parseFloat(params.t), params.isDew, cached?.sat, cached?.superheat, params.stateLabel);
  }

  // SPECIAL CASE: R454B - Use local indexed lookup for absolute parity/speed
  if (['R454B', '454B'].includes(refUpper)) {
    const cached = getCachedR454BData();
    return getSinglePointPropertiesR454B(parseFloat(params.p), parseFloat(params.t), params.isDew, cached?.sat, cached?.superheat, params.stateLabel);
  }

  try {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/calculations/point-properties?${qs}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('userToken')
          ? { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
          : {}),
      },
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('[Thermo] getPointProperties failed:', error.message);
    return { error: error.message };
  }
};