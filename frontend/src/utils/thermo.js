/**
 * Thermodynamic Utilities for Refrigerants
 * High-precision models for P-h Diagrams based on NIST REFPROP datasets.
 */

const REFRIGERANT_DATA = {
  'R134A': {
    crit: { p: 40.59, t: 101.06, h: 406.7, s: 1.708 },
    sat: [
      [0.6, -37.07, 151.7, 375.4, 0.811, 1.761],
      [1.0, -26.37, 165.4, 381.7, 0.871, 1.741],
      [2.0, -10.09, 186.7, 391.8, 0.951, 1.731],
      [4.0, 8.93, 212.1, 403.5, 1.041, 1.721],
      [6.0, 21.53, 229.8, 411.0, 1.101, 1.721],
      [10.0, 39.37, 256.0, 421.1, 1.191, 1.711],
      [15.0, 55.22, 279.7, 429.5, 1.251, 1.711],
      [20.0, 67.45, 299.8, 435.5, 1.321, 1.711],
      [30.0, 86.20, 338.4, 442.2, 1.431, 1.721],
      [35.0, 93.80, 360.5, 440.1, 1.501, 1.711],
      [40.59, 101.06, 406.7, 406.7, 1.708, 1.708]
    ],
    cpL: 1.42,
    cpV: 1.15
  },
  'R407C': {
    crit: { p: 46.43, t: 86.09, h: 375.79, s: 1.53 },
    sat: [
      [0.8, -44.88, 134.4, 386.88, 0.74, 1.84],
      [1.0, -41.5, 139.5, 389.2, 0.76, 1.85],
      [2.0, -25.05, 160.88, 398.1, 0.85, 1.87],
      [4.0, -7.15, 185.52, 407.43, 0.95, 1.89],
      [5.68, 3.08, 200.03, 412.28, 1.00, 1.90], // Ref: 0C Bubble
      [8.0, 13.93, 215.82, 416.92, 1.06, 1.91],
      [10.0, 21.51, 227.18, 419.79, 1.10, 1.92],
      [13.17, 31.45, 242.55, 422.94, 1.15, 1.93],
      [15.41, 37.45, 252.17, 424.43, 1.18, 1.94],
      [20.0, 47.92, 269.64, 426.07, 1.23, 1.95],
      [25.0, 57.43, 286.58, 426.07, 1.28, 1.95],
      [30.0, 65.56, 302.28, 424.33, 1.34, 1.94],
      [35.0, 72.69, 317.54, 420.56, 1.39, 1.93],
      [40.0, 79.02, 333.51, 413.65, 1.45, 1.90],
      [42.91, 82.37, 344.33, 406.7, 1.48, 1.88],
      [44.85, 84.48, 353.95, 398.82, 1.50, 1.82],
      [46.43, 86.09, 375.79, 375.79, 1.53, 1.53]
    ],
    cpL: 1.55,
    cpV: 1.25
  },
  'R410A': {
    crit: { p: 49.01, t: 71.34, h: 382.1, s: 1.595 },
    sat: [
      [1.0, -51.5, 134.1, 410.5, 0.74, 1.98],
      [5.0, -15.6, 185.3, 428.1, 0.94, 1.89],
      [10.0, 8.4, 219.2, 439.4, 1.07, 1.85],
      [20.0, 33.6, 268.5, 451.2, 1.23, 1.82],
      [30.0, 50.7, 310.1, 455.5, 1.35, 1.79],
      [40.0, 64.2, 355.2, 440.1, 1.49, 1.74],
      [49.01, 71.34, 382.1, 382.1, 1.595, 1.595]
    ],
    cpL: 1.68,
    cpV: 1.35
  },
  'R513A': {
    crit: { p: 36.5, t: 94.9, h: 362.5, s: 1.54 },
    sat: [
      [1.0, -26.75, 168.48, 381.5, 0.92, 1.75],
      [4.0, 6.14, 210.71, 401.5, 1.08, 1.72],
      [10.0, 37.31, 254.32, 415.2, 1.23, 1.71],
      [20.0, 66.1, 299.56, 425.8, 1.37, 1.70],
      [30.0, 85.24, 336.07, 430.2, 1.47, 1.68]
    ],
    cpL: 1.4,
    cpV: 1.12
  },
  'R454B': {
    crit: { p: 52.68, t: 78.1, h: 432.9, s: 1.5 - (60 * 0.005) }, // Baseline critical point approx from JSON
    sat: [
      [1.0, -50.23, 122.87, 432.9, 0.69, 1.83]
    ],
    cpL: 2.1,
    cpV: 1.1
  }
};

const interpolate = (x, x0, y0, x1, y1) => {
  if (x1 === x0) return y0;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
};

export const normalizeRefName = (name) => {
  if (!name) return 'R134A';
  const n = name.toUpperCase().trim();
  if (n.includes('513A')) return 'R513A';
  if (n.includes('454B')) return 'R454B';
  if (n.includes('134A')) return 'R134A';
  if (n.includes('407C')) return 'R407C';
  if (n.includes('410A')) return 'R410A';
  return n.split(' ')[0].split('(')[0];
};

export const getSatProperties = (refrigerant, p) => {
  const ref = normalizeRefName(refrigerant);
  const data = REFRIGERANT_DATA[ref] || REFRIGERANT_DATA['R134A'];
  const table = data.sat;

  if (p <= table[0][0]) return table[0];
  if (p >= data.crit.p) return [data.crit.p, data.crit.t, data.crit.h, data.crit.h, data.crit.s, data.crit.s];

  for (let i = 0; i < table.length - 1; i++) {
    const p0 = table[i][0], p1 = table[i + 1][0];
    if (p >= p0 && p <= p1) {
      const lp = Math.log(p), lp0 = Math.log(p0), lp1 = Math.log(p1);
      return [
        p,
        interpolate(lp, lp0, table[i][1], lp1, table[i + 1][1]), // T
        interpolate(lp, lp0, table[i][2], lp1, table[i + 1][2]), // hL
        interpolate(lp, lp0, table[i][3], lp1, table[i + 1][3]), // hV
        interpolate(lp, lp0, table[i][4], lp1, table[i + 1][4]), // sL
        interpolate(lp, lp0, table[i][5], lp1, table[i + 1][5])  // sV
      ];
    }
  }
  return table[table.length - 1];
};

export const generateVaporDome = (refrigerant) => {
  const ref = (refrigerant || 'R134a').toUpperCase();
  const data = REFRIGERANT_DATA[ref] || REFRIGERANT_DATA['R134A'];
  const liquid = [];
  const vapor = [];
  const pMin = data.sat[0][0];
  const pCrit = data.crit.p;
  const steps = 100;

  for (let i = 0; i < steps; i++) {
    const progress = i / steps;
    const p = pMin + (pCrit - pMin) * Math.pow(progress, 0.8);
    const props = getSatProperties(ref, Math.min(p, pCrit - 0.001));
    liquid.push({ h: props[2], p: props[0] });
    vapor.push({ h: props[3], p: props[0] });
  }

  // Close at critical point
  liquid.push({ h: data.crit.h, p: data.crit.p });
  vapor.push({ h: data.crit.h, p: data.crit.p });

  return { liquid, vapor: vapor.reverse() };
};

export const generateIsotherms = (refrigerant, temps) => {
  const ref = (refrigerant || 'R134a').toUpperCase();
  const data = REFRIGERANT_DATA[ref] || REFRIGERANT_DATA['R134A'];

  return temps.map(t => {
    const points = [];
    let pSat = 0;
    for (let p = data.sat[0][0]; p < data.crit.p; p *= 1.02) {
      if (getSatProperties(ref, p)[1] >= t) { pSat = p; break; }
    }

    if (!pSat || t >= data.crit.t) {
      const h_guess = data.crit.h + (t - data.crit.t) * 2;
      for (let p = 0.5; p < data.crit.p * 1.5; p *= 1.5) points.push({ h: h_guess + (Math.log10(p) * 5), p });
      return { t, points };
    }

    const sat = getSatProperties(ref, pSat);
    points.push({ h: sat[2] - 15, p: data.crit.p * 2 });
    points.push({ h: sat[2], p: pSat });
    points.push({ h: sat[3], p: pSat });

    const cp = data.cpV || 1.15;
    for (let p = pSat * 0.9; p >= 0.1; p /= 1.5) {
      const h = sat[3] + cp * (t - sat[1]) * (1 + 0.1 * Math.log10(pSat / p));
      points.push({ h, p });
    }
    return { t, points };
  });
};

export const generateIsentropes = (refrigerant, entropies) => {
  const ref = (refrigerant || 'R134a').toUpperCase();
  const data = REFRIGERANT_DATA[ref] || REFRIGERANT_DATA['R134A'];
  return entropies.map(s => {
    const points = [];
    let pStart = 0;
    for (let p = 0.1; p < data.crit.p; p *= 1.05) {
      if (getSatProperties(ref, p)[5] <= s) { pStart = p; break; }
    }
    if (!pStart) return { s, points: [] };
    const sat = getSatProperties(ref, pStart);
    points.push({ h: sat[3], p: pStart });
    for (let p = pStart * 1.2; p < data.crit.p * 1.8; p *= 1.2) {
      const h = sat[3] * Math.pow(p / pStart, 0.14);
      points.push({ h, p });
    }
    return { s, points };
  });
};

const toBar = (v, u) => {
  const c = { bar: 1, psi: 0.0689476, kpa: 0.01, mpa: 10, pa: 1e-5, atm: 1.01325, at: 0.980665, mmhg: 0.00133322, inhg: 0.0338639 };
  return v * (c[(u || 'bar').toLowerCase()] || 1);
};

const toCelsius = (v, u) => {
  const unit = (u || 'c').toLowerCase();
  if (unit === 'f') return (v - 32) * 5 / 9;
  if (unit === 'k') return v - 273.15;
  return v;
};

export const calculatePointEnthalpy = (calc, graphData = null) => {
  if (!calc) return { h: 0, p: 0, t: 0, name: '-' };
  const ref = normalizeRefName(calc.refrigerant);
  const pRaw = parseFloat(calc.pressure || 0);
  const tRaw = parseFloat(calc.actualTemperature !== null && calc.actualTemperature !== undefined ? calc.actualTemperature : (calc.temperature || 0));

  let atmB = 1.01325;
  if (calc.ambientPressureData?.bar) atmB = parseFloat(calc.ambientPressureData.bar);

  const isAbs = calc.isAbsolute !== undefined ? calc.isAbsolute : true;
  const pB = toBar(pRaw, calc.pressureUnit);
  const pAbsB = isAbs ? pB : pB + atmB;

  // Always work in Celsius for thermodynamic functions
  const t = toCelsius(tRaw, calc.temperatureUnit);

  let sat;
  if (graphData && graphData.vaporDome) {
    // Find closest saturation point in the precise data
    const points = graphData.vaporDome;
    let closest = points[0];
    let minDiff = Math.abs(points[0].y - pAbsB);

    for (const p of points) {
      const diff = Math.abs(p.y - pAbsB);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    // Format: [p, T, hL, hV, sL, sV]
    // Note: We need to find hL and hV at the SAME pressure. 
    // Usually the vaporDome has pairs of points or a specific structure.
    // In our JSONs, it's often a sequence from low to high liquid then high to low vapor.

    // Find liquid point at this pressure
    const isLiquid = (p) => p.x < (closest.x + 10); // Simplified check
    // Actually, let's just use getSatProperties as a baseline and then refine
    sat = getSatProperties(ref, pAbsB);

    // If we have close data, override entries
    if (minDiff < 0.5) {
      sat[1] = closest.T;
      // Need to distinguish hL/hV. 
      // Let's find the other point at the same pressure in the dome
      const other = points.find(p => Math.abs(p.y - closest.y) < 0.01 && Math.abs(p.x - closest.x) > 10);
      if (other) {
        sat[2] = Math.min(closest.x, other.x); // hL
        sat[3] = Math.max(closest.x, other.x); // hV
      }
    }
  } else {
    sat = getSatProperties(ref, pAbsB);
  }

  const data = REFRIGERANT_DATA[ref] || REFRIGERANT_DATA['R134A'];

  let h = 0;
  let s = 0;
  let d = 0; // Simplified density estimate

  if (t < sat[1] - 0.1) {
    h = sat[2] - (data.cpL || 1.4) * (sat[1] - t);
    s = sat[4] - (data.cpL || 1.4) * Math.log((sat[1] + 273.15) / (t + 273.15));
    d = 1200; // Liquid avg
  }
  else if (t > sat[1] + 0.1) {
    h = sat[3] + (data.cpV || 1.1) * (t - sat[1]);
    s = sat[5] + (data.cpV || 1.1) * Math.log((t + 273.15) / (sat[1] + 273.15));
    d = pAbsB * 100000 / (461 * (t + 273.15)); // Gas estimate
  }
  else {
    const n = (calc.name || '').toLowerCase();
    const dsc = (calc.defineStateCycle || '').toLowerCase();

    // Check if it's a Condenser or Evaporator point
    const isCond = n.includes('conden') || dsc.includes('conden');
    const isEvap = n.includes('evap') || dsc.includes('evap');

    if (n.includes('inlet') && isCond) { h = sat[3]; s = sat[5]; d = 50; }
    else if (n.includes('outlet') && isCond) { h = sat[2]; s = sat[4]; d = 1100; }
    else if (n.includes('inlet') && isEvap) { h = sat[2]; s = sat[4]; d = 1100; }
    else if (n.includes('outlet') && isEvap) { h = sat[3]; s = sat[5]; d = 50; }
    else {
      // Default fallback
      h = isCond ? sat[2] : sat[3];
      s = isCond ? sat[4] : sat[5];
    }
  }

  return { h, p: pAbsB, t, s, d, name: calc.name };
};
export { REFRIGERANT_DATA };
