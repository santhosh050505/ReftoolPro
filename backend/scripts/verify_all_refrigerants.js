const axios = require('axios');
const fs = require('fs');

const API = 'https://reftools.danfoss.com/api/ref-slider';

// --- COPIED LIST FROM refrigerantController.js ---
const REFRIGERANTS = [
  'R11', 'R12', 'R13', 'R13B1', 'R14', 'R22', 'R23', 'R32', 'R41', 'R114',
  'R123', 'R1150 (Ethylene)', 'R1233zd(E)', 'R1234yf', 'R1234ze(E)', 'R124', 'R125',
  'R1270 (Propylene)', 'R1336mzz(Z)', 'R134a', 'R141b', 'R142b', 'R152a', 'R170 (Ethane)',
  'R227ea', 'R236ea', 'R236fa', 'R245fa', 'R290 (Propane)', 'R401A', 'R401B',
  'R402A', 'R402B', 'R403B', 'R404A', 'R406A', 'R407A', 'R407B', 'R407C',
  'R407F', 'R407H', 'R408A', 'R409A', 'R409B', 'R410A', 'R413A', 'R414B',
  'R416A', 'R417A', 'R417C', 'R420A', 'R421A', 'R422A', 'R422B', 'R422C',
  'R422D', 'R424A', 'R426A', 'R427A', 'R428A', 'R434A', 'R436A', 'R436B',
  'R436C', 'R437A', 'R438A', 'R441A', 'R442A', 'R443A', 'R444A', 'R444B',
  'R445A', 'R448A', 'R449A', 'R449B', 'R450A', 'R452A', 'R452B', 'R453A',
  'R454A', 'R454B', 'R454C', 'R455A', 'R458A', 'R466A', 'R469A', 'R470A',
  'R470B', 'R471A', 'R472A', 'R472B', 'R473A', 'R50 (Methane)', 'R500', 'R502',
  'R503', 'R507', 'R508B', 'R511A', 'R513A', 'R513B', 'R514A', 'R515A',
  'R515B', 'R516A', 'R600 (Butane)', 'R600a', 'R601 (Pentane)',
  'R601a (Isopentane)', 'R702 (Hydrogen)', 'R717 (Ammonia)',
  'R718 (Water)', 'R723', 'R728 (Nitrogen)', 'R729 (Air)', 'R732 (Oxygen)',
  'R744 (Carbon dioxide)', 'R744A (Nitrous oxide)', 'RE170 (Dimethyl ether)'
];

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

async function verifyAll() {
  let log = '';
  const results = {
    passed: 0,
    failed: 0,
    failures: []
  };

  console.log(`Verifying ${REFRIGERANTS.length} refrigerants...`);

  // Batch process to avoid overwhelming but still fast
  for (const refName of REFRIGERANTS) {
    const id = normalizeRefId(refName);
    let status = 'PENDING';

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

      if (res.data && res.data.minPressure !== undefined) {
        status = 'PASS';
        results.passed++;
        // log += `[PASS] ${refName} (id: ${id}) - MinP: ${res.data.minPressure}\n`;
      } else {
        status = 'FAIL_DATA';
        results.failed++;
        results.failures.push({ name: refName, id: id, error: 'No data returned' });
        log += `[FAIL] ${refName} (id: ${id}) - No valid data in response\n`;
      }

    } catch (e) {
      status = 'FAIL_ERR';
      results.failed++;
      const errMsg = e.response ? `HTTP ${e.response.status}` : e.message;
      results.failures.push({ name: refName, id: id, error: errMsg });
      log += `[FAIL] ${refName} (id: ${id}) - ${errMsg}\n`;
    }

    // Console progress
    process.stdout.write(status === 'PASS' ? '.' : 'F');
  }

  console.log('\n\n--- Verification Complete ---');
  console.log(`Total: ${REFRIGERANTS.length}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\nFailures:');
    results.failures.forEach(f => console.log(`- ${f.name} (id: "${f.id}"): ${f.error}`));
  }

  fs.writeFileSync('backend/scripts/verify_all_result.txt', log + `\nSummary: Passed ${results.passed}, Failed ${results.failed}`);
}

verifyAll();
