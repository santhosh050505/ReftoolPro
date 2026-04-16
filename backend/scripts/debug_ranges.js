const axios = require('axios');
const fs = require('fs');

const API = 'https://reftools.danfoss.com/api/ref-slider';

// --- MOCKING THE UPDATED LOGIC FROM calculationService.js ---
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
// -----------------------------------------------------------

const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://reftools.danfoss.com',
    'Referer': 'https://reftools.danfoss.com/spa/tools/ref-slider'
  }
});

const targets = ['R1336mzz(Z)', 'R1233zd(E)', 'R1234ze(E)'];

async function debugRanges() {
  let log = '';

  for (const refName of targets) {
    const id = normalizeRefId(refName);
    console.log(`\nFetching ranges for ${refName} (ID: ${id})...`);
    log += `\n--- ${refName} (ID: ${id}) ---\n`;

    try {
      const payload = {
        refId: id,
        temperatureUnit: 'celsius',
        pressureUnit: 'bar',
        includeMetadata: true,
        pressureCalculationUnit: 'abs',
        pressureReferenceUnit: 'absolute',
        probeUnit: 'bar',
        refType: 'dew',
        temperatureProbeUnit: 'celsius'
      };

      const res = await apiClient.post(`${API}/slider?refId=${id}&includeMetadata=true`, payload);

      if (res.data) {
        const minP = res.data.minPressure;
        const maxP = res.data.maxPressure;
        const minT = res.data.minTemperature;
        const maxT = res.data.maxTemperature;

        console.log(`Min Pressure: ${minP}`);
        console.log(`Max Pressure: ${maxP}`);

        log += `Min Pressure: ${minP}\n`;
        log += `Max Pressure: ${maxP}\n`;
        log += `Min Temp: ${minT}\n`;
        log += `Max Temp: ${maxT}\n`;
        log += `Raw Data Keys: ${Object.keys(res.data).join(', ')}\n`;
      } else {
        console.log('No data returned');
        log += `FAIL - No data\n`;
      }

    } catch (e) {
      const errMsg = e.response ? `HTTP ${e.response.status}` : e.message;
      console.log(`Error: ${errMsg}`);
      log += `FAIL - ${errMsg}\n`;
    }
  }

  fs.writeFileSync('backend/scripts/debug_ranges_result.txt', log);
}

debugRanges();
