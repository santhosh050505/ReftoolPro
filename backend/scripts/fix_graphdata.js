const fs = require('fs');
const path = require('path');

const REFRIGERANTS = [
  'r12.json', 'r22.json', 'r23.json', 'r32.json', 'r125.json', 'r134a.json', 'r141b.json', 'r245fa.json',
  'r290(propane).json', 'r404a.json', 'r407c.json', 'r410a.json', 'r454b.json', 'r454c.json', 'r513a.json',
  'r600a (Iso-Butane).json', 'r601 (Pentane).json', 'R601a (Isopentane).json', 'r717(Ammonia).json',
  'r718.json', 'r744.json', 'r1233zdE.json', 'r1234yf.json', 'r1234zeE.json', 'r1270 (Propylene).json',
  'r1336mzz(Z).json'
];

const GRAPH_DIR = 'd:/FINAL/ref-tools-pro/graphdata';

REFRIGERANTS.forEach(file => {
  const filePath = path.join(GRAPH_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${file}`);
    return;
  }

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // 1. Fix TIsolines (Sort by p DESC, then h ASC, and Extend)
    if (content.TIsolines) {
      const yMax = content.plot_settings ? content.plot_settings.yMax : 90;
      const yMin = content.plot_settings ? content.plot_settings.yMin : 0.5;

      content.TIsolines.forEach(iso => {
        // Sort by Pressure DESC, then Enthalpy ASC
        iso.data.sort((a, b) => {
          if (Math.abs(b[1] - a[1]) > 0.0001) return b[1] - a[1];
          return a[0] - b[0];
        });

        // Remove duplicates
        iso.data = iso.data.filter((p, i, arr) => {
          if (i === 0) return true;
          const prev = arr[i - 1];
          return Math.abs(p[0] - prev[0]) > 0.001 || Math.abs(p[1] - prev[1]) > 0.001;
        });

        if (iso.data.length > 1) {
          // Determine critical enthalpy for heuristic
          let critH = 300;
          if (content.vaporDome) {
            const crit = content.vaporDome.reduce((prev, current) => (prev.y > current.y) ? prev : current);
            critH = crit.x;
          }

          // CLEAN: Remove any existing vertical drop points on the vapor side from previous runs
          // If the last point is at yMin and it was a large pressure jump from the previous point
          // and it's on the vapor side, remove it.
          let last = iso.data[iso.data.length - 1];
          let prev = iso.data[iso.data.length - 2];
          if (Math.abs(last[1] - yMin) < 0.1 && prev[1] > yMin + 2 && last[0] > critH - 50) {
            iso.data.pop();
          }

          const first = iso.data[0];
          const currentLast = iso.data[iso.data.length - 1];

          // Extension to Top (Max Pressure) - Only for Liquid Side
          if (first[1] < yMax - 0.1 && first[0] < critH) {
            iso.data.unshift([first[0], yMax]);
          }

          // Extension to Bottom (Min Pressure) - Only for Liquid Side
          // Vapor side lines will now stop naturally wherever the data ends.
          if (currentLast[1] > yMin + 0.1 && currentLast[0] < critH - 50) {
            iso.data.push([currentLast[0], yMin]);
          }
        }
        modified = true;
      });
      console.log(`Processed ${file}: yMax=${yMax}, yMin=${yMin}`);
    }

    // 2. Fix vaporDome
    if (content.vaporDome && content.vaporDome.length > 0) {
      // Find critical point (max pressure)
      let maxP = -Infinity;
      let criticalIdx = 0;
      content.vaporDome.forEach((p, i) => {
        if (p.y > maxP) {
          maxP = p.y;
          criticalIdx = i;
        }
      });

      // Split into liquid side (bubble line) and vapor side (dew line)
      // But wait, the original dome might be a mess.
      // Let's just group points by whether they have d (density) high or low?
      // Usually, liquid side has high density.
      // A better way: points before critical in a sorted-by-T sequence are liquid, after are vapor?
      // Actually, let's just use the max-P point as the tip.

      const points = [...content.vaporDome];
      const liquid = [];
      const vapor = [];

      // Critical point
      const crit = points[criticalIdx];

      points.forEach((p, i) => {
        if (i === criticalIdx) return;
        // Use density (d) or rhoRatio to distinguish liquid and vapor
        // Liquid side has much higher density.
        // We can use the rhoRatio (liquid density / vapor density) or just absolute density.
        // Critical point density is approx 500. Liquid is > 500, Vapor is < 500.
        if (p.d > crit.d) liquid.push(p);
        else vapor.push(p);
      });

      // Sort liquid side by pressure (y) ASC (bottom to top)
      liquid.sort((a, b) => a.y - b.y);
      // Sort vapor side by pressure (y) DESC (top to bottom)
      vapor.sort((a, b) => b.y - a.y);

      // Special handling for the bottom: ensure we have a consistent direction.
      // Liquid goes from min P to max P.
      // Vapor goes from max P to min P.
      const newDome = [...liquid, crit, ...vapor];

      // Add loop closure if needed (first point again)
      // Wait, the original had a loop closure.
      const first = newDome[0];
      newDome.push({ ...first, id: 1 }); // Ensure last point has ID 1 if that's the convention

      // Update IDs
      newDome.forEach((p, i) => {
        if (i < newDome.length - 1) p.id = i + 1;
        else p.id = 1;
      });

      content.vaporDome = newDome;
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf8');
      console.log(`Fixed ${file}`);
    }

  } catch (e) {
    console.error(`Error fixing ${file}: ${e.message}`);
  }
});
