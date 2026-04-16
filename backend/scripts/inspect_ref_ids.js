const axios = require('axios');
const fs = require('fs');

const API = 'https://reftools.danfoss.com/api/ref-slider';

// --- MOCKING THE UPDATED LOGIC FROM calculationService.js ---
// Ideally we would require the file, but it has other deps.
// We copy the EXACT function we just patched.
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

async function check(refName) {
  let log = `\n--- Testing ${refName} ---\n`;
  const newLogicId = normalizeRefId(refName);
  log += `New Logic ID: "${newLogicId}"\n`;

  const getPayload = (id) => ({
    refId: id,
    temperatureUnit: 'celsius',
    pressureUnit: 'bar',
    includeMetadata: true,
    pressureCalculationUnit: 'abs',
    pressureReferenceUnit: 'absolute',
    probeUnit: 'bar',
    refType: 'dew',
    temperatureProbeUnit: 'celsius'
  });

  try {
    const res = await apiClient.post(`${API}/slider?refId=${newLogicId}&includeMetadata=true`, getPayload(newLogicId));
    log += `[SUCCESS] New Logic ID working. MinPres: ${res.data.minPressure}\n`;
  } catch (e) {
    log += `[FAILURE] New Logic ID failed: ${e.response?.status || e.message}\n`;
  }

  fs.appendFileSync('backend/scripts/inspect_result.txt', log);
}

const refs = ['R1336mzz(Z)', 'R1233zd(E)', 'R1150 (Ethylene)', 'R1234ze(E)'];

(async () => {
  // Clear previous log
  if (fs.existsSync('backend/scripts/inspect_result.txt')) {
    fs.unlinkSync('backend/scripts/inspect_result.txt');
  }
  for (const r of refs) {
    await check(r);
  }
})();
