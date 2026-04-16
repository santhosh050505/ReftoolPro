/**
 * R513A Data Cache and Loader
 * Optimized for instant access by pre-loading and avoiding bundler parsing delays.
 */

let r513aDataPromise = null;
let r513aData = null;

export const loadR513AData = () => {
  if (r513aDataPromise) return r513aDataPromise;

  r513aDataPromise = (async () => {
    try {
      console.time('R513A_Load_And_Index');
      const [sat, superheat] = await Promise.all([
        import('../graphdata/R513A_Saturation_full.json'),
        import('../graphdata/R513A_Superheat_full.json')
      ]);

      const satRaw = sat.default || sat;
      const superRaw = superheat.default || superheat;

      // START INDEXING FOR INSTANT LOOKUP
      const satTable = satRaw.saturation_table || [];
      const superData = superRaw.data || [];

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

        if (pData.temperature_data) {
          Object.entries(pData.temperature_data).forEach(([tStr, tData]) => {
            superMap.get(pKey).push({
              pressure_bar: parseFloat(pStr),
              temperature_c: parseFloat(tStr),
              enthalpy_kj_per_kg: tData.H,
              entropy_j_per_kgk: tData.S,
              density_kg_per_m3: tData.D
            });
          });
        }
      });

      r513aData = {
        sat: satRaw,
        superheat: superRaw,
        indices: {
          satMap,
          superMap
        }
      };

      // Also attach to window for absolute fastest access across modules
      window.__R513A_INDICES__ = r513aData.indices;
      window.__R513A_RAW__ = { sat: satRaw, superheat: superRaw };

      console.timeEnd('R513A_Load_And_Index');
      return r513aData;
    } catch (err) {
      console.error('Failed to load R513A local JSON files:', err);
      r513aDataPromise = null;
      throw err;
    }
  })();

  return r513aDataPromise;
};

// Start loading immediately when the service is imported
loadR513AData();

export const getCachedR513AData = () => r513aData;
