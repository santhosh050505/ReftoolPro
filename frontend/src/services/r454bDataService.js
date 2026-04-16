/**
 * R454B Data Cache and Loader
 * Optimized for instant access by pre-loading and avoiding bundler parsing delays.
 * Mirrors R513A implementation for complete parity.
 */

let r454bDataPromise = null;
let r454bData = null;

export const loadR454BData = () => {
  if (r454bDataPromise) return r454bDataPromise;

  r454bDataPromise = (async () => {
    try {
      console.time('R454B_Load_And_Index');
      const [sat, superheat] = await Promise.all([
        import('../graphdata/R454B_Saturation_full.json'),
        import('../graphdata/R454B_Superheat_full.json')
      ]);

      const satRaw = sat.default || sat;
      const superRaw = superheat.default || superheat;

      // START INDEXING FOR INSTANT LOOKUP
      const satTable = satRaw.saturation_table || [];

      // Index Saturation by Temperature (rounded)
      const satMap = new Map();
      satTable.forEach(row => {
        satMap.set(Math.round(row.temperature_c * 10) / 10, row);
      });

      // Index Superheat by Pressure
      const superMap = new Map();
      const rawSuperData = superRaw.data || {};

      Object.entries(rawSuperData).forEach(([pStr, pData]) => {
        const pKey = Math.round(parseFloat(pStr) * 10) / 10;
        if (!superMap.has(pKey)) superMap.set(pKey, []);

        // R454B superheat JSON structure has temperature keys at pData level
        // format: "pressure_X": { "temperature_X_Y": { ... } }
        Object.entries(pData).forEach(([tKey, tData]) => {
          if (tKey.startsWith('temperature_')) {
            const parts = tKey.split('_');
            const tVal = parseFloat(parts[parts.length - 1]);
            superMap.get(pKey).push({
              pressure_bar: parseFloat(pStr),
              temperature_c: tVal,
              enthalpy_kj_per_kg: tData.H,
              entropy_j_per_kgk: tData.S,
              density_kg_per_m3: tData.D
            });
          }
        });
      });

      r454bData = {
        sat: satRaw,
        superheat: superRaw,
        indices: {
          satMap,
          superMap
        }
      };

      // Attach to window for absolute fastest access across modules
      window.__R454B_INDICES__ = r454bData.indices;
      window.__R454B_RAW__ = { sat: satRaw, superheat: superRaw };

      console.timeEnd('R454B_Load_And_Index');
      return r454bData;
    } catch (err) {
      console.error('Failed to load R454B local JSON files:', err);
      r454bDataPromise = null;
      throw err;
    }
  })();

  return r454bDataPromise;
};

// Start loading immediately when the service is imported
loadR454BData();

export const getCachedR454BData = () => r454bData;
