/**
 * R513A Specific High-Precision Calculations
 * Implements EXACT logic requested by the user.
 */

export const getSatRow = (temp, satData) => {
  if (!satData || !satData.saturation_table) return null;
  const target = Math.round(temp * 10) / 10;

  // High-Speed Index Lookup
  const indices = window.__R513A_INDICES__ || satData.indices;
  if (indices && indices.satMap) {
    const indexedRow = indices.satMap.get(target);
    if (indexedRow) return indexedRow;
  }

  // Fallback to Search
  const table = satData.saturation_table;
  let closest = table[0];
  let minDiff = Math.abs(table[0].temperature_c - target);
  for (const row of table) {
    const diff = Math.abs(row.temperature_c - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = row;
    }
  }
  return closest;
};

export const getSaturationTemp = (p, isDew, satData) => {
  if (!satData || !satData.saturation_table) return null;
  const targetP = parseFloat(p);

  const table = satData.saturation_table;
  let closest = table[0];
  const firstP = isDew ? (table[0].pressure.vapor_bar || table[0].pressure.liquid_bar) : table[0].pressure.liquid_bar;
  let minDiff = Math.abs(firstP - targetP);

  for (const row of table) {
    const rowP = isDew ? (row.pressure.vapor_bar || row.pressure.liquid_bar) : row.pressure.liquid_bar;
    const diff = Math.abs(rowP - targetP);
    if (diff < minDiff) {
      minDiff = diff;
      closest = row;
    }
  }
  return closest.temperature_c;
};

export const getLiquidProps = (temp, satData) => {
  const row = getSatRow(temp, satData);
  if (!row) return { h: 0, s: 0, d: 0 };
  return {
    h: row.enthalpy.liquid_kj_per_kg,
    s: row.entropy.liquid_J_per_kgK,
    d: row.density.liquid_kg_per_m3
  };
};

export const getAverageProps = (temp, satData) => {
  const row = getSatRow(temp, satData);
  if (!row) return { h: 0, s: 0, d: 0 };
  return {
    h: row.enthalpy.average_kj_per_kg,
    s: row.entropy.average_J_per_kgK,
    d: row.density.average_kg_per_m3
  };
};

/**
 * Robust Superheat Lookup (Double Nearest Neighbor with Data Availability Check)
 * Logic: 
 * 1. Calculate the distance to each pressure key.
 * 2. Pick the pressure key that is CLOSEST to targetP AND HAS data for targetT.
 * 3. Inside that pressure block, pick the temperature key closest to targetT.
 */
export const getSuperheatProps = (p, t, superData) => {
  if (!superData || !superData.data) return { h: 0, s: 0, d: 0 };

  const targetP = parseFloat(p);
  const targetT = parseFloat(t);

  const rawData = superData.data || {};
  const pKeys = Object.keys(rawData).map(k => parseFloat(k)).sort((a, b) => a - b);

  let bestP = null;
  let minPDiff = Infinity;
  let bestData = null;

  // Search for the pressure key that is closest and HAS the temperature
  for (const pKey of pKeys) {
    const pStr = pKey.toFixed(1);
    let pObj = rawData[pStr] || rawData[pKey.toString()];

    if (pObj && pObj.temperature_data) {
      const tKeys = Object.keys(pObj.temperature_data).map(k => parseFloat(k));
      // Find closest T in this block
      let localBestT = null;
      let minTDiff = Infinity;
      for (const tk of tKeys) {
        const diff = Math.abs(tk - targetT);
        if (diff < minTDiff) {
          // Only consider if data is valid
          const tData = pObj.temperature_data[tk.toString()];
          if (tData && tData.H !== '-') {
            minTDiff = diff;
            localBestT = tk;
          }
        }
      }

      if (localBestT !== null) {
        const pDiff = Math.abs(pKey - targetP);
        if (pDiff < minPDiff) {
          minPDiff = pDiff;
          bestP = pKey;
          bestData = pObj.temperature_data[localBestT.toString()];
        }
      }
    }
  }

  if (bestData) {
    return {
      h: parseFloat(bestData.H),
      s: parseFloat(bestData.S),
      d: parseFloat(bestData.D)
    };
  }

  return { h: 0, s: 0, d: 0 };
};

const parseVal = (row, key) => {
  if (!row) return null;
  let val = row[key];
  if (val === undefined) {
    const lower = key.toLowerCase();
    const realKey = Object.keys(row).find(k => k.toLowerCase() === lower);
    if (realKey) val = row[realKey];
  }
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

export const calculateR513ACycle = (calculations, stateCycle, satData, superheatData) => {
  if (!calculations || !satData || !superheatData) return null;

  const findRow = (label, keyword) => {
    let found = calculations.find(c => c.defineStateCycle === label);
    if (found) return found;
    return calculations.find(c => (c.name || '').toLowerCase().includes(keyword.toLowerCase()));
  };

  const sctRow = findRow('Saturated Condensation Temperature (SCT)', 'sct');
  const setRow = findRow('Saturated Evaporator Temperature (SET)', 'set');
  const disRow = findRow('Condenser Inlet', 'discharge');
  const sucRow = findRow('Evaporator Outlet', 'suction');
  const liqRow = findRow('Liquid temperature', 'liquid');
  const subRow = findRow('Condenser Subcooling(K)', 'subcool');
  const supRow = findRow('Evaporator Superheat(K)', 'superheat');

  if (!sctRow || !setRow) return { state_points: [], cycle_info: { COP: 'N/A' } };

  const sct_sat = parseVal(sctRow, 'temperature') ?? 50;
  const set_sat = parseVal(setRow, 'temperature') ?? 20;

  const satRowSCT = getSatRow(sct_sat, satData);
  const satRowSET = getSatRow(set_sat, satData);

  if (!satRowSCT || !satRowSET) return { state_points: [], cycle_info: { COP: 'N/A' } };

  const pCond = satRowSCT.pressure.liquid_bar;
  const pEvap = satRowSET.pressure.liquid_bar;

  // Actual plotting temperatures (ordinates)
  const tDischarge = parseVal(disRow, 'actualTemperature') ?? parseVal(sctRow, 'actualTemperature') ?? (sct_sat + 20);
  const dtSc = parseVal(subRow, 'inputValue') ?? 0;
  const tLiq = parseVal(liqRow, 'actualTemperature') ?? parseVal(liqRow, 'temperature') ?? (sct_sat - dtSc);
  const tEvapIn = set_sat;
  const dtSh = parseVal(supRow, 'inputValue') ?? 0;
  const tSuction = parseVal(sucRow, 'actualTemperature') ?? parseVal(setRow, 'actualTemperature') ?? (set_sat + dtSh);

  // --- STRICT DATA LOOKUP PER USER PLAN ---

  // Point 1: Properties @ SCT (Sat Temp) in Superheat. Plot @ tDischarge.
  const props1 = getSuperheatProps(pCond, sct_sat, superheatData);
  const point1 = { id: 1, name: 'Condenser Inlet', t: tDischarge, p: pCond, h: props1.h, s: props1.s, d: props1.d };

  // Point 2: Properties @ SCT (Sat Temp) in Saturation (Liquid). Plot @ tLiq.
  const point2 = { id: 2, name: 'Condenser Outlet', t: tLiq, p: pCond, h: satRowSCT.enthalpy.liquid_kj_per_kg, s: satRowSCT.entropy.liquid_J_per_kgK, d: satRowSCT.density.liquid_kg_per_m3 };

  // Point 3: Properties @ SET (Sat Temp) in Saturation (Average). Plot @ SET.
  const point3 = { id: 3, name: 'Evaporator Inlet', t: tEvapIn, p: pEvap, h: satRowSET.enthalpy.average_kj_per_kg, s: satRowSET.entropy.average_J_per_kgK, d: satRowSET.density.average_kg_per_m3 };

  // Point 4: Properties @ SET (Sat Temp) in Superheat. Plot @ tSuction.
  const props4 = getSuperheatProps(pEvap, set_sat, superheatData);
  const point4 = { id: 4, name: 'Evaporator Outlet', t: tSuction, p: pEvap, h: props4.h, s: props4.s, d: props4.d };

  // Performance
  const work = Math.abs(point1.h - point4.h);
  const cooling = Math.abs(point4.h - point3.h);
  const copVal = work > 0 ? (cooling / work) : 0;

  return {
    state_points: [point1, point2, point3, point4],
    cycle_info: {
      COP: copVal.toFixed(2),
      EER: (copVal * 3.412).toFixed(2)
    }
  };
};

export const getSinglePointPropertiesR513A = (p, t, isDew, satData = null, superheatData = null, stateLabel = '') => {
  let sMeta = satData;
  let sSuper = superheatData;

  if (!sMeta || !sSuper) {
    const raw = window.__R513A_RAW__;
    if (raw) {
      sMeta = raw.sat;
      sSuper = raw.superheat;
    }
  }

  if (!sMeta || !sSuper) return null;

  const label = (stateLabel || '').toUpperCase();

  // 1. CONDENSER OUTLET (Liquid Properties from Saturation)
  if (label.includes('LIQUID') || label.includes('SUBCOOLING')) {
    const props = getLiquidProps(t, sMeta);
    return { ...props, p, t };
  }

  // 2. EVAPORATOR INLET (Average/Two-Phase Properties from Saturation)
  // Match SET, SEP, or explicit Evaporator Inlet/Flash Mix
  const isEvapInlet = label.includes('SET') || label.includes('SEP') ||
    (label.includes('EVAPORATOR') && label.includes('INLET')) ||
    label.includes('FLASH') || label.includes('AVERAGE');

  if (isEvapInlet) {
    const props = getAverageProps(t, sMeta);
    return { ...props, p, t };
  }

  // 3. GAS LOOKUPS (Discharge/Suction/Superheat from Superheat Table)
  // Includes Condenser Inlet (Discharge) and Evaporator Outlet (Suction)
  const props = getSuperheatProps(p, t, sSuper);

  // Fallback: if superheat lookup fails (likely near saturation), try saturated vapor
  if (!props || props.h === 0) {
    const sat = getSatRow(t, sMeta);
    if (sat) {
      return {
        h: sat.enthalpy.vapor_kj_per_kg,
        s: sat.entropy.vapor_J_per_kgK,
        d: sat.density.vapor_kg_per_m3,
        p, t
      };
    }
  }

  return { ...props, p, t };
};

// ── Bidirectional Formula Helpers ──────────────────────────────────────────
// Based on:
// 1. Evaporator Superheat = Suction Gas Temperature - SET
// 2. Condenser Subcooling = SCT - Liquid Temperature
// 3. Compressor Superheat = Discharge Gas Temperature - SCT

export const calculateSuctionGasTemp = (set, superheat) => set + superheat;
export const calculateEvapSuperheat = (set, suctionGasTemp) => suctionGasTemp - set;

export const calculateDischargeGasTemp = (sct, superheat) => sct + superheat;
export const calculateCompSuperheat = (sct, dischargeGasTemp) => dischargeGasTemp - sct;

export const calculateLiquidTemp = (sct, subcooling) => sct - subcooling;
export const calculateCondSubcooling = (sct, liquidTemp) => sct - liquidTemp;
