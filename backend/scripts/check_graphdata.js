const fs = require('fs');
const path = require('path');

const REFRIGERANTS = [
  { name: 'R12', file: 'r12.json' },
  { name: 'R22', file: 'r22.json' },
  { name: 'R23', file: 'r23.json' },
  { name: 'R32', file: 'r32.json' },
  { name: 'R125', file: 'r125.json' },
  { name: 'R134a', file: 'r134a.json' },
  { name: 'R141b', file: 'r141b.json' },
  { name: 'R245fa', file: 'r245fa.json' },
  { name: 'R290 (Propane)', file: 'r290(propane).json' },
  { name: 'R404A', file: 'r404a.json' },
  { name: 'R407C', file: 'r407c.json' },
  { name: 'R410A', file: 'r410a.json' },
  { name: 'R454B', file: 'r454b.json' },
  { name: 'R454C', file: 'r454c.json' },
  { name: 'R513a', file: 'r513a.json' },
  { name: 'R600a (Isobutane)', file: 'r600a (Iso-Butane).json' },
  { name: 'R601 (Pentane)', file: 'r601 (Pentane).json' },
  { name: 'R601a (Isopentane)', file: 'R601a (Isopentane).json' },
  { name: 'R717 (Ammonia)', file: 'r717(Ammonia).json' },
  { name: 'R718 (Water)', file: 'r718.json' },
  { name: 'R744 (Carbon dioxide)', file: 'r744.json' },
  { name: 'R1233zd(E)', file: 'r1233zdE.json' },
  { name: 'R1234yf', file: 'r1234yf.json' },
  { name: 'R1234ze(E)', file: 'r1234zeE.json' },
  { name: 'R1270 (Propylene)', file: 'r1270 (Propylene).json' },
  { name: '1336mzz(Z)', file: 'r1336mzz(Z).json' }
];

const GRAPH_DIR = 'd:/FINAL/ref-tools-pro/graphdata';

function checkIssues(isoline, xMax) {
  const data = isoline.data;
  if (!data || data.length < 2) return 0;

  let issues = 0;
  let reversals = 0;
  let largeJumps = 0;

  // Use a scale-aware threshold (e.g. 30% of max enthalpy)
  const threshold = Math.max(200, xMax * 0.3);

  for (let i = 1; i < data.length; i++) {
    const p1 = data[i - 1];
    const p2 = data[i];
    const dx = p2[0] - p1[0];

    // Check for large jumps
    if (Math.abs(dx) > threshold) {
      largeJumps++;
    }

    // Check for reversals
    if (i > 1) {
      const p0 = data[i - 2];
      const dx_prev = p1[0] - p0[0];
      if (Math.sign(dx) !== Math.sign(dx_prev) && Math.abs(dx) > 5 && Math.abs(dx_prev) > 5) {
        reversals++;
      }
    }
  }
  return largeJumps + reversals;
}

const results = [];

REFRIGERANTS.forEach(ref => {
  const filePath = path.join(GRAPH_DIR, ref.file);
  const status = { name: ref.name, file: ref.file, exists: false, hasDome: false, hasIsolines: false, isolineCount: 0, jumps: [] };

  if (fs.existsSync(filePath)) {
    status.exists = true;
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const xMax = content.plot_settings ? content.plot_settings.xMax : 1000;

      if (content.vaporDome && content.vaporDome.length > 0) {
        status.hasDome = true;
        status.domePoints = content.vaporDome.length;

        // Check dome jumps (ignore the bottom closure jump at the end)
        // Usually index 0 and index N-1 are the same point (closure points)
        // We want to skip detection on the segment that crosses the dome bottom.
        // My fix script puts liquid at start and vapor at end. 
        // The jump is between liquid[last] and crit, OR vapor[last] and liquid[0]?
        // In my fix: liquid (ASC), crit, vapor (DESC), closure.
        // Segment before crit and segment after crit are fine.
        // Segments within liquid/vapor are fine.
        // The jump is at index (liquid.length + 1 + vapor.length - 1) -> index 0.
        for (let i = 0; i < content.vaporDome.length - 1; i++) {
          const p1 = content.vaporDome[i];
          const p2 = content.vaporDome[i + 1];
          const dx = Math.abs(p2.x - p1.x);

          // Skip if it's the very last segment (closure to start) or if pressure is very low (bottom)
          if (i === content.vaporDome.length - 2) continue;

          if (dx > Math.max(150, xMax * 0.2)) {
            status.jumps.push(`vaporDome jump at ${i} (dx: ${dx.toFixed(1)})`);
          }
        }
      }
      if (content.TIsolines && content.TIsolines.length > 0) {
        status.hasIsolines = true;
        status.isolineCount = content.TIsolines.length;

        content.TIsolines.forEach(iso => {
          const issues = checkIssues(iso, xMax);
          if (issues > 0) {
            status.jumps.push(`${iso.name} (${issues} issues)`);
          }
        });
      }
    } catch (e) {
      status.error = e.message;
    }
  }
  results.push(status);
});

let out = '--- REPORT ---\n';
results.forEach(r => {
  const mark = r.exists && r.hasDome && r.hasIsolines && r.jumps.length === 0 ? '✅' : '❌';
  out += `${mark} ${r.name} (${r.file}):\n`;
  if (!r.exists) out += '  - FILE MISSING\n';
  else {
    if (!r.hasDome) out += '  - DOME MISSING OR EMPTY\n';
    if (!r.hasIsolines) out += '  - ISOLINES MISSING OR EMPTY\n';
    if (r.jumps.length > 0) out += '  - JUMPS FOUND: ' + r.jumps.join(', ') + '\n';
    if (r.error) out += '  - JSON ERROR: ' + r.error + '\n';
  }
});
fs.writeFileSync('backend/scripts/final_report.txt', out, 'utf8');
console.log('Report written to backend/scripts/final_report.txt');
