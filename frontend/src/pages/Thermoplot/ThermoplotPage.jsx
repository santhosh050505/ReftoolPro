import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import {
  calculateSuctionGasTemp,
  calculateDischargeGasTemp,
  calculateLiquidTemp
} from '../../utils/thermoR454B';

import {
  calculateSuctionGasTemp as calcSuctionTempR513A,
  calculateDischargeGasTemp as calcDischargeTempR513A,
  calculateLiquidTemp as calcLiquidTempR513A
} from '../../utils/thermoR513A';
import { ArrowLeft, RefreshCw, Settings, Layers, Info, ArrowDown } from 'lucide-react';
import {
  generateVaporDome,
  generateIsotherms,
  calculatePointEnthalpy
} from '../../utils/thermo';
import API_BASE_URL from '../../config/apiConfig';
import './ThermoplotPage.css';

const REF_FILE_MAP = {
  'R12': 'r12.json',
  'R22': 'r22.json',
  'R23': 'r23.json',
  'R32': 'r32.json',
  'R125': 'r125.json',
  'R134A': 'r134a.json',
  'R141B': 'r141b.json',
  'R245FA': 'r245fa.json',
  'R290': 'r290(propane).json',
  'R290 (PROPANE)': 'r290(propane).json',
  'PROPANE': 'r290(propane).json',
  'R404A': 'r404a.json',
  'R407C': 'r407c.json',
  'R410A': 'r410a.json',
  'R454B': 'r454b.json',
  'R454C': 'r454c.json',
  'R513A': 'r513a.json',
  'R600A': 'r600a (Iso-Butane).json',
  'R600A (ISOBUTANE)': 'r600a (Iso-Butane).json',
  'R601': 'r601 (Pentane).json',
  'R601A': 'R601a (Isopentane).json',
  'R717': 'r717(Ammonia).json',
  'R717 (AMMONIA)': 'r717(Ammonia).json',
  'R718': 'r718.json',
  'R718 (WATER)': 'r718.json',
  'R744': 'r744.json',
  'R744 (CARBON DIOXIDE)': 'r744.json',
  'R1233ZD(E)': 'r1233zdE.json',
  'R1234YF': 'r1234yf.json',
  'R1234ZE(E)': 'r1234zeE.json',
  'R1270': 'r1270 (Propylene).json',
  'R1270 (PROPYLENE)': 'r1270 (Propylene).json',
  '1336MZZ(Z)': 'r1336mzz(Z).json',
  'R1336MZZ(Z)': 'r1336mzz(Z).json'
};

const ThermoplotPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [plotData, setPlotData] = useState(null);
  const [refrigerant, setRefrigerant] = useState('R407C');
  const [loading, setLoading] = useState(true);
  const [showIsolines, setShowIsolines] = useState(true);
  const [preciseGraphData, setPreciseGraphData] = useState(null);

  // Load project initial data
  useEffect(() => {
    const savedData = sessionStorage.getItem('currentPlotData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.projectId === projectId) {
        setPlotData(parsed);
        if (parsed.calculations.length > 0) {
          setRefrigerant(parsed.calculations[0].refrigerant.toUpperCase());
        }
        setLoading(false);
        return;
      }
    }
    navigate('/projects');
  }, [projectId, navigate]);

  // Fetch precise graph data (Vapor Dome, etc.) from local JSONs
  useEffect(() => {
    const loadPreciseData = async () => {
      const refKey = refrigerant.toUpperCase();
      const fileName = REF_FILE_MAP[refKey];

      if (fileName) {
        try {
          // Dynamic import from src/graphdata
          const data = await import(`../../graphdata/${fileName}`);
          setPreciseGraphData(data.default || data);
          console.log(`Loaded precise data for ${refrigerant}`);
        } catch (error) {
          console.error(`Failed to load precise data for ${refrigerant}:`, error);
          setPreciseGraphData(null);
        }
      } else {
        setPreciseGraphData(null);
      }
    };

    if (refrigerant) {
      loadPreciseData();
    }
  }, [refrigerant]);

  // Fetch accurate cycle data from API if only basic calculations are present
  useEffect(() => {
    if (plotData && plotData.calculations && !plotData.state_points && !loading) {
      setLoading(true);

      const fetchData = async () => {
        try {
          const { fetchDiagramData } = await import('../../services/thermoApiService');
          const currentRef = plotData.calculations[0]?.refrigerant?.toUpperCase() || refrigerant;
          const isCustomCycle = plotData.stateCycle === 'Custom State point';

          // ── CASE 1: R513A / R454B CUSTOM STATE POINTS ──
          if (isCustomCycle && (currentRef?.includes('513A') || currentRef?.includes('454B'))) {
            const isR454B = currentRef?.includes('454B');
            const endpoint = isR454B ? 'r454b' : 'r513a';

            const sctCalc = plotData.calculations.find(c =>
              c.defineStateCycle?.includes('Saturated Condensation') ||
              c.defineStateCycle?.includes('SCT')
            );
            const setCalc = plotData.calculations.find(c =>
              c.defineStateCycle?.includes('Saturated Evaporat') ||
              c.defineStateCycle?.includes('SET')
            );

            const sctPlotTemp = parseFloat(
              sctCalc?.temperature ?? sctCalc?.satTemperature ?? sctCalc?.actualTemperature ?? sctCalc?.inputValue
            ) || null;
            const setPlotTemp = parseFloat(
              setCalc?.temperature ?? setCalc?.satTemperature ?? setCalc?.actualTemperature ?? setCalc?.inputValue
            ) || null;

            const SCT_POINTS = ['Compressor Discharge(SCT)', 'Condenser Inlet(SCT)', 'Condenser Outlet(SCT)', 'Expansion Device Inlet(SCT)'];
            const SET_POINTS = ['Evaporator Outlet(SET)', 'Compressor Suction(SET)'];

            const sequence = [
              'Compressor Discharge(SCT)',
              'Condenser Inlet(SCT)',
              'Condenser Outlet(SCT)',
              'Expansion Device Inlet(SCT)',
              'Evaporator Outlet(SET)',
              'Compressor Suction(SET)'
            ];
            const pointsToFetch = sequence.map(name => {
              const calc = plotData.calculations.find(c => c.defineStateCycle === name);
              if (!calc) return null;
              // Prioritize user's actual/input temperature over the generic 'temperature' field
              // Discharge/Suction uses actualTemperature; Liquid points use liquidTemperature or inputValue
              const actualT = parseFloat(
                calc.actualTemperature ?? calc.liquidTemperature ?? calc.inputValue ?? calc.temperature
              );

              return {
                name,
                p: parseFloat(calc.pressure),
                t: actualT,
                is_dew: !!calc.isDew,
                quality: calc.quality != null ? parseFloat(calc.quality) : null
              };
            }).filter(p => p !== null && !isNaN(p.p) && !isNaN(p.t));

            if (pointsToFetch.length > 0) {
              const response = await fetch(`${API_BASE_URL}/${endpoint}/point-props`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: pointsToFetch.map(p => ({ p: p.p, t: p.t, is_dew: p.is_dew, quality: p.quality })) })
              });

              if (response.ok) {
                const apiResult = await response.json();
                if (apiResult.status === 'success' && apiResult.results) {
                  let state_points = pointsToFetch.map((pt, idx) => {
                    const res = apiResult.results[idx];
                    // plotT is used for the graph coordinate (y-axis)
                    const plotT = SCT_POINTS.includes(pt.name) ? (sctPlotTemp ?? pt.t) : (SET_POINTS.includes(pt.name) ? (setPlotTemp ?? pt.t) : pt.t);
                    return {
                      id: pt.name,
                      name: pt.name,
                      p: pt.p,
                      t: plotT,           // SAT temperature for graph
                      actualT: pt.t,      // ACTUAL user temperature for display/tooltip
                      h: res.h || 0,
                      s: res.s || 0,
                      d: res.d || 0,
                      status: res.status,
                      label: (idx + 1).toString()
                    };
                  });

                  setPlotData(prev => ({ ...prev, state_points, cycle_info: { COP: 'N/A', EER: 'N/A' } }));
                  setLoading(false);
                  return;
                }
              }
            }
          }

          // ── CASE 2: R513A / R454B STANDARD CYCLE ──
          if (!isCustomCycle && (currentRef?.includes('513A') || currentRef?.includes('454B'))) {
            const findRow = (...labels) => {
              let found = plotData.calculations.find(c => labels.includes(c.defineStateCycle));
              if (found) return found;
              for (const label of labels) {
                const baseLabel = label.split('(')[0].trim();
                const partialMatch = plotData.calculations.find(c => c.defineStateCycle?.includes(baseLabel));
                if (partialMatch) return partialMatch;
              }
              return null;
            };

            const sctRow = findRow('Saturated Condensation Temperature (SCT)', 'Saturated Condensation Pressure (SCP)');
            const setRow = findRow('Saturated Evaporator Temperature (SET)', 'Saturated Evaporation Pressure (SEP)');
            if (sctRow && setRow) {
              const sct = parseFloat(sctRow.temperature || sctRow.satTemperature || sctRow.actualTemperature || sctRow.inputValue || 45);
              const set = parseFloat(setRow.temperature || setRow.satTemperature || setRow.actualTemperature || setRow.inputValue || 7);
              const compSuperRow = findRow('Compressor Superheat', 'Compressor Superheat(K)');
              const superRow = findRow('Evaporator Superheat', 'Evaporator Superheat(K)');
              const subcoolRow = findRow('Condenser Subcooling', 'Condenser Subcooling(K)');

              const isR454B = currentRef.includes('454B');
              const { calculateSuctionGasTemp: st, calculateDischargeGasTemp: dt, calculateLiquidTemp: lt } = isR454B
                ? await import('../../utils/thermoR454B')
                : await import('../../utils/thermoR513A');

              const dischargeTempRef = dt(sct, parseFloat(compSuperRow?.inputValue) || 20);
              const suctionTempRef = st(set, parseFloat(superRow?.inputValue) || 5);
              const liquidTempRef = lt(sct, parseFloat(subcoolRow?.inputValue) || 0);

              const endpoint = isR454B ? 'r454b' : 'r513a';
              const response = await fetch(`${API_BASE_URL}/${endpoint}/cycle/plot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sct, set, dischargeTempRef, suctionTempRef, liquidTempRef,
                  pressureUnit: plotData.calculations[0]?.pressureUnit || 'bar',
                  temperatureUnit: plotData.calculations[0]?.temperatureUnit || 'celsius',
                  isAbsolute: plotData.calculations[0]?.isAbsolute !== undefined ? plotData.calculations[0].isAbsolute : true
                })
              });

              if (response.ok) {
                const result = await response.json();
                if (result.status === 'success' && result.cyclePoints) {
                  const state_points = result.cyclePoints.map(pt => ({
                    id: pt.name, name: pt.name,
                    h: pt.properties?.enthalpy_kj_per_kg || 0,
                    p: pt.pressure || 0, t: pt.temperature || 0,
                    s: pt.properties?.entropy_J_per_kgK || 0,
                    d: pt.properties?.density_kg_per_m3 || 0
                  }));
                  setPlotData(prev => ({ ...prev, state_points, cycle_info: { COP: result.cycleProperties?.COP || 'N/A', EER: result.cycleProperties?.COP ? (result.cycleProperties.COP * 3.412).toFixed(2) : 'N/A' } }));
                  setLoading(false);
                  return;
                }
              }
            }
          }

          // ── CASE 3: FALLBACK ──
          const result = await fetchDiagramData(plotData.calculations, plotData.stateCycle);
          if (result && result.state_points) {
            setPlotData(prev => ({ ...prev, cycle_info: result.cycle_info, state_points: result.state_points }));
          }
        } catch (error) {
          console.error('[ThermoplotPage] Error fetching diagram data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [plotData?.calculations, plotData?.stateCycle, refrigerant]);

const chartData = useMemo(() => {
  if (!plotData || plotData.calculations.length === 0) return null;

  const ref = refrigerant.toUpperCase();

  let dome, isotherms, qualities;

  if (preciseGraphData) {
    // Use Precise JSON Data
    const domePoints = preciseGraphData.vaporDome || [];
    // Find critical point index (point with max pressure)
    let critIdx = 0;
    let maxP = -Infinity;
    domePoints.forEach((p, i) => {
      if (p.y > maxP) {
        maxP = p.y;
        critIdx = i;
      }
    });

    dome = {
      liquid: domePoints.slice(0, critIdx + 1),
      vapor: domePoints.slice(critIdx).reverse()
    };

    isotherms = (preciseGraphData.TIsolines || []).map(iso => ({
      t: iso.name,
      points: iso.data.map(p => ({ h: p[0], p: p[1] }))
    }));

    // Find the temperature isoline that matches current refrigerant state temperature if possible
    // Or just take all provided ones. The user said "a temperature line", 
    // but usually showing a few is better.

    qualities = (preciseGraphData.xIsolines || []).map(iso =>
      iso.data.map(p => ({ h: p[0], p: p[1] }))
    );

  } else {
    // Fallback to heuristic generation
    dome = generateVaporDome(ref);
    isotherms = generateIsotherms(ref, [-40, -20, 0, 20, 40, 60, 80]);
    qualities = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(x => {
      const qLine = [];
      const len = dome.liquid.length;
      for (let i = 0; i < len; i++) {
        const lp = dome.liquid[i];
        const vp = dome.vapor[len - 1 - i];
        if (vp) {
          qLine.push({ h: lp.h + x * (vp.h - lp.h), p: lp.p });
        }
      }
      return qLine;
    });
  }

  // Use high-precision state points from API if available, 
  // otherwise calculate from raw calculations.
  // Use high-precision state points from API or Local Calc.
  // If no state_points exist yet (e.g. still loading), return empty array
  // instead of falling back to heuristic point calculations which can be misleading.
  const points = plotData.state_points && plotData.state_points.length > 0
    ? plotData.state_points
    : [];

  console.log('[ChartData] Using data source:', plotData.state_points && plotData.state_points.length > 0 ? 'API state_points' : 'Local calculations');
  console.log('[ChartData] Points for plotting:', points);

  return {
    dome,
    isotherms,
    qualities,
    points
  };
}, [plotData, refrigerant, preciseGraphData]);

if (loading || !chartData) {
  return (
    <div className="thermoplot-loading">
      <RefreshCw className="spinner" />
      <p>Loading thermodynamic data...</p>
    </div>
  );
}

const plotTraces = [];

// 1. VAPOUR DOME
if (preciseGraphData) {
  plotTraces.push({
    x: preciseGraphData.vaporDome.map(p => p.x),
    y: preciseGraphData.vaporDome.map(p => p.y),
    fill: 'toself',
    fillcolor: 'rgba(48, 74, 57, 0.1)',
    line: { color: '#304A39', width: 2.5 },
    name: 'Saturation Curve',
    hoverinfo: 'text',
    text: preciseGraphData.vaporDome.map(p =>
      `spec. Enthalpie: ${parseFloat(p.x).toFixed(1)} kJ/kg<br>` +
      `Pressure: ${parseFloat(p.y).toFixed(2)} bar<br>` +
      `Temperature: ${parseFloat(p.T).toFixed(1)} °C<br>` +
      `Density: ${parseFloat(p.d).toFixed(2)} kg/m³<br>` +
      `spec. Entropy: ${parseFloat(p.s).toFixed(1)} J/kg*K`
    ),
    type: 'scatter'
  });
} else {
  const domeX = [...chartData.dome.liquid.map(p => p.h), ...chartData.dome.vapor.map(p => p.h)];
  const domeY = [...chartData.dome.liquid.map(p => p.p), ...chartData.dome.vapor.map(p => p.p)];
  plotTraces.push({
    x: domeX,
    y: domeY,
    fill: 'toself',
    fillcolor: 'rgba(48, 74, 57, 0.1)',
    line: { color: '#304A39', width: 2 },
    name: 'Saturation Curve',
    hoverinfo: 'none',
    type: 'scatter'
  });
}

// 2. QUALITY LINES
chartData.qualities.forEach((q, i) => {
  plotTraces.push({
    x: q.map(p => p.h),
    y: q.map(p => p.p),
    type: 'scatter',
    mode: 'lines',
    line: { color: 'rgba(182, 160, 120, 0.4)', width: 1.5, dash: 'dash' },
    name: `x = 0.${i + 1}`,
    hoverinfo: 'none',
    showlegend: false
  });
});

// 3. ISOTHERMS
if (showIsolines) {
  chartData.isotherms.forEach(iso => {
    plotTraces.push({
      x: iso.points.map(p => p.h),
      y: iso.points.map(p => p.p),
      type: 'scatter',
      mode: 'lines',
      name: iso.t,
      line: { color: 'rgba(190, 24, 93, 0.35)', width: 1.2 },
      hoverinfo: 'name',
      showlegend: false
    });
  });
}

// 4. THE REFRIGERATION CYCLE
const cycleX = [];
const cycleY = [];
chartData.points.forEach(p => {
  cycleX.push(p.h);
  cycleY.push(p.p);
});
if (cycleX.length > 1) {
  const isClosed = Math.abs(cycleX[0] - cycleX[cycleX.length - 1]) < 0.1 &&
    Math.abs(cycleY[0] - cycleY[cycleY.length - 1]) < 0.01;
  if (!isClosed) {
    cycleX.push(cycleX[0]);
    cycleY.push(cycleY[0]);
  }

  const cycleText = chartData.points.map(p =>
    `<b>${p.name || 'Point'}</b><br>` +
    `spec. Enthalpie: ${parseFloat(p.h).toFixed(1)} kJ/kg<br>` +
    `Pressure: ${parseFloat(p.p).toFixed(2)} bar<br>` +
    `Temperature: ${parseFloat(p.t).toFixed(1)} °C<br>` +
    `Density: ${parseFloat(p.d || 0).toFixed(2)} kg/m³<br>` +
    `spec. Entropy: ${parseFloat(p.s || 0).toFixed(1)} J/kg*K`
  );

  if (cycleX.length > chartData.points.length) {
    cycleText.push(cycleText[0]);
  }

  plotTraces.push({
    x: cycleX,
    y: cycleY,
    type: 'scatter',
    mode: 'lines+markers+text',
    textposition: 'top center',
    textfont: { size: 12, color: '#304A39', weight: 'bold' },
    line: { color: '#B6A078', width: 4 },
    marker: { 
      size: 12, 
      color: '#304A39', 
      line: { color: 'white', width: 2 },
      symbol: 'circle'
    },
    name: 'Refrigeration Cycle',
    hoverinfo: 'text',
    hovertext: cycleX.map((_, i) => {
      const p = chartData.points[i % chartData.points.length];
      if (!p) return '';
      return (
        `<b>${p.name}</b><br>` +
        `Enthalpy: ${parseFloat(p.h).toFixed(1)} kJ/kg<br>` +
        `Pressure: ${parseFloat(p.p).toFixed(2)} bar<br>` +
        `Temperature: ${parseFloat(p.actualT || p.t).toFixed(1)} °C` +
        (p.s !== 'N/A' ? `<br>Entropy: ${parseFloat(p.s).toFixed(1)} J/kg*K` : '')
      );
    }),
    text: (() => {
      // Group points by coordinate to handle overlapping labels (e.g., "1,2")
      const groups = [];
      const thresholdH = 5.0; // kJ/kg
      const thresholdP = 0.5; // bar

      chartData.points.forEach((p, idx) => {
        let label = p.label || '';
        if (p.isSynthetic) label = ''; // Synthetic points have no label

        let found = groups.find(g => 
          Math.abs(g.h - p.h) < thresholdH && 
          Math.abs(Math.log10(g.p) - Math.log10(p.p)) < 0.02
        );
        if (found) {
          if (label && !found.labels.includes(label)) found.labels.push(label);
        } else {
          groups.push({ h: p.h, p: p.p, labels: label ? [label] : [], indices: [idx] });
        }
      });

      // Map back to cycle points
      return cycleX.map((_, i) => {
        const idx = i % chartData.points.length;
        const pt = chartData.points[idx];
        const group = groups.find(g => g.indices.includes(idx));
        // Only show label for the first point in a group to avoid redundancy
        if (group && group.indices[0] === idx) {
          return group.labels.sort().join(',');
        }
        return '';
      });
    })()
  });
}

return (
  <div className="thermoplot-page">
    <header className="thermoplot-nav">
      <button className="nav-back" onClick={() => navigate('/projects')}>
        <ArrowLeft size={20} />
        <span>Dashboard</span>
      </button>
      <div className="nav-title">
        <h1>log(p)-h chart {refrigerant}</h1>
        <p>{plotData.projectName} • Thermodynamic Analysis</p>
      </div>
      <div className="nav-actions">
        <button
          className={`btn-icon ${showIsolines ? 'active' : ''}`}
          onClick={() => setShowIsolines(!showIsolines)}
          title="Toggle Isolines"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>

    <main className="thermoplot-content">
      <section className="chart-container">
        <Plot
          data={plotTraces}
          layout={{
            autosize: true,
            margin: { l: 60, r: 20, t: 40, b: 60 },
            plot_bgcolor: 'transparent',
            paper_bgcolor: 'transparent',
            xaxis: {
              title: 'Specific Enthalpy [kJ/kg]',
              gridcolor: '#f1f5f9',
              zerolinecolor: '#cbd5e1',
              tickfont: { size: 11, color: '#64748b' },
              titlefont: { size: 13, color: '#475569' },
              autorange: !preciseGraphData,
              range: preciseGraphData ? [preciseGraphData.plot_settings.xMin, preciseGraphData.plot_settings.xMax] : undefined
            },
            yaxis: {
              title: 'Pressure [bar]',
              type: 'log',
              gridcolor: '#f1f5f9',
              zerolinecolor: '#cbd5e1',
              tickfont: { size: 11, color: '#64748b' },
              titlefont: { size: 13, color: '#475569' },
              autorange: !preciseGraphData,
              range: preciseGraphData ? [Math.log10(preciseGraphData.plot_settings.yMin), Math.log10(preciseGraphData.plot_settings.yMax)] : undefined,
              tickvals: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
              ticktext: ['0.1', '0.2', '0.5', '1', '2', '5', '10', '20', '50', '100', '200', '500', '1000']
            },
            legend: {
              orientation: 'h',
              y: 1.05,
              x: 0,
              font: { size: 11, color: '#475569' }
            },
            hovermode: 'closest',
            dragmode: 'zoom',
            showlegend: true
          }}
          config={{
            responsive: true,
            displayModeBar: true,
            toImageButtonOptions: {
              format: 'png',
              filename: `ph_diagram_${refrigerant}`,
              height: 800,
              width: 1200,
              scale: 2
            }
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </section>

      <aside className="analysis-sidebar">
        <div className="sidebar-section">
          <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 className="section-title" style={{ margin: 0 }}><Layers size={18} /> Cycle Summary</h3>
            {plotData.state_points?.length > 0 && (
              <span className="status-badge live" style={{
                fontSize: '0.65rem',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}>
                {refrigerant?.includes('513A') ? 'PRECISE' : 'LIVE'}
              </span>
            )}
          </div>
          <div className="cycle-steps">
            {chartData.points && chartData.points.length > 0 ? (
              chartData.points
                .filter(p => !p.isSynthetic) // Hide the expansion-drop point from sidebar
                .map((p, i) => (
                <div key={i} className="step-card">
                  <div className="step-num">{p.label || i + 1}</div>
                  <div className="step-details">
                    <span className="step-name">{p.name || `Point ${i + 1}`}</span>
                    <div className="step-metrics">
                      <span title="Pressure">{parseFloat(p.p || 0).toFixed(2)} bar</span>
                      <span title="Temperature">{parseFloat(p.t || 0).toFixed(1)} °C</span>
                      <span title="Enthalpy">{parseFloat(p.h || 0).toFixed(1)} kJ/kg</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ opacity: 0.5, fontSize: '0.8rem', textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                <Info size={24} style={{ marginBottom: '8px', color: '#94a3b8' }} />
                <p>{loading ? 'Processing thermodynamics...' : 'No calculation data available.'}</p>
              </div>
            )}
          </div>
        </div>

        {plotData?.cycle_info && (
          <>
            <div className="sidebar-separator" />
            <div className="sidebar-section stats-section">
              <h3 className="section-title"><RefreshCw size={18} /> Performance</h3>
              <div className="performance-metrics">
                <div className="metrics-group">
                  {plotData.cycle_info.COP && plotData.cycle_info.COP !== "N/A" && (
                    <div className="metric-row">
                      <span>COP (Heating/Cooling)</span>
                      <span className="metric-value">{(parseFloat(plotData.cycle_info.COP) || 0).toFixed(3)}</span>
                    </div>
                  )}
                  {plotData.cycle_info.EER && plotData.cycle_info.EER !== "N/A" && (
                    <div className="metric-row">
                      <span>EER (BTU/Wh)</span>
                      <span className="metric-value">{(parseFloat(plotData.cycle_info.EER) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {plotData.cycle_info.p_el !== undefined && (
                    <div className="metric-row">
                      <span>Power {parseFloat(plotData.cycle_info.p_el) < 0 ? 'Generation' : 'Consumption'}</span>
                      <span className="metric-value">{Math.abs(parseFloat(plotData.cycle_info.p_el)).toLocaleString()} W</span>
                    </div>
                  )}
                  {plotData.cycle_info.dh_evap && (
                    <div className="metric-row">
                      <span>Evaporator Δh</span>
                      <span className="metric-value">{(parseFloat(plotData.cycle_info.dh_evap) / 1000).toFixed(2)} kJ/kg</span>
                    </div>
                  )}
                </div>
                <div className="cop-formula">
                  {plotData.cycle_info.eta_ORC ? 'η = |W_net| / |Q_in|' : 'COP = (h₁ - h₄) / (h₂ - h₁)'}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </main>
  </div>
);
};

export default ThermoplotPage;
