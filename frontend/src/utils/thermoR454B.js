/**
 * R454B Specific High-Precision Calculations
 * Implements EXACT logic parity with R513A.
 */

export const getSatRow = (temp, satData) => {
  if (!satData || !satData.saturation_table) return null;
  const target = Math.round(temp * 10) / 10;

  // High-Speed Index Lookup
  const indices = window.__R454B_INDICES__ || satData.indices;
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
  const pKeys = Object.keys(rawData).map(k => parseFloat(k.replace('pressure_', ''))).sort((a, b) => a - b);

  let bestP = null;
  let minPDiff = Infinity;
  let bestData = null;

  for (const pKey of pKeys) {
    const pStr = `pressure_${pKey}`;
    let pObj = rawData[pStr];

    if (pObj) {
      // Keys in R454B superheat are temperature_T_P
      const tKeys = Object.keys(pObj).filter(k => k.startsWith('temperature_')).map(k => {
        const parts = k.split('_');
        return parseFloat(parts[parts.length - 1]);
      });

      // Find closest T in this block
      let localBestT = null;
      let minTDiff = Infinity;
      for (const tk of tKeys) {
        const diff = Math.abs(tk - targetT);
        if (diff < minTDiff) {
          // Find the actual key
          const tKeyPrefix = `temperature_`;
          // We need to match the specific key for this T
          const actualKey = Object.keys(pObj).find(k => {
            const parts = k.split('_');
            return parseFloat(parts[parts.length - 1]) === tk;
          });

          const tData = pObj[actualKey];
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
          const actualKey = Object.keys(pObj).find(k => {
            const parts = k.split('_');
            return parseFloat(parts[parts.length - 1]) === localBestT;
          });
          bestData = pObj[actualKey];
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

export const getSinglePointPropertiesR454B = (p, t, isDew, satData = null, superheatData = null, stateLabel = '') => {
  let sMeta = satData;
  let sSuper = superheatData;

  if (!sMeta || !sSuper) {
    const raw = window.__R454B_RAW__;
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
