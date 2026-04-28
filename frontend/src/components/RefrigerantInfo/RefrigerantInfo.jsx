import React, { useState, useEffect } from "react";
import { getAllRefrigerants } from "../../api";
import CSVRefrigerantService from "../../services/csvRefrigerantService";
import PropertyUnitConverter from "../../services/propertyUnitConverter";
import { useGwp } from "../../context/GwpContext";
import "./RefrigerantInfo.css";

const RefrigerantInfo = ({ selectedRefrigerant = 'R407C', temperatureUnit = 'celsius', pressureUnit = 'bar' }) => {
  const { selectedGwp, getGwpValue } = useGwp();
  const [refrigerantData, setRefrigerantData] = useState(null);
  const [csvData, setCSVData] = useState(null);
  const [hasCSVData, setHasCSVData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load refrigerant data from available sources
    const loadRefrigerantData = async () => {
      setLoading(true);
      try {
        // FIRST: Try fetching from the public static JSON (no auth required, always available)
        try {
          const staticRes = await fetch('/refrigerant-data/refrigerant-properties.json');
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            // Data can be { refrigerants: [...] } or a flat object keyed by name
            let allRefs = [];
            if (Array.isArray(staticData.refrigerants)) {
              allRefs = staticData.refrigerants;
            } else if (typeof staticData === 'object') {
              allRefs = Object.values(staticData);
            }
            const selected = allRefs.find(
              r => r.name === selectedRefrigerant || r.rNumber === selectedRefrigerant
            );
            if (selected) {
              setRefrigerantData(selected);
              console.log('📋 Loaded refrigerant from public JSON:', selected.name);
              setLoading(false);
              return;
            }
          }
        } catch (staticErr) {
          console.warn('Public JSON not available, trying admin API:', staticErr.message);
        }

        // SECOND: Try admin API (works if user is admin)
        try {
          const response = await getAllRefrigerants();
          if (Array.isArray(response)) {
            const selected = response.find(
              r => r.name === selectedRefrigerant || r.rNumber === selectedRefrigerant
            );
            if (selected) {
              setRefrigerantData(selected);
              console.log('📋 Loaded refrigerant from admin API:', selected.name);
              setLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.warn('Admin API not available, trying CSV fallback:', apiError.message);
        }

        // THIRD: Try CSV fallback
        const chemicalProps = await CSVRefrigerantService.getChemicalProperties(selectedRefrigerant);
        if (chemicalProps) {
          const mappedCSVData = CSVRefrigerantService.mapToDisplayFormat(chemicalProps);
          setCSVData(mappedCSVData);
          setHasCSVData(true);
          console.log('📋 Loaded refrigerant from CSV fallback:', selectedRefrigerant);
        } else {
          setHasCSVData(false);
        }

        setRefrigerantData(null);
      } catch (err) {
        console.error('Error loading refrigerant data:', err);
        setRefrigerantData(null);
      }

      setLoading(false);
    };

    loadRefrigerantData();
  }, [selectedRefrigerant]);

  const dataToUse = hasCSVData ? csvData : refrigerantData;

  if (loading) {
    return (
      <div className="refrigerant-info-outer">
        <div className="refrigerant-info-scroll">
          {/* Skeleton Summary Card */}
          <div className="skeleton-summary-card">
            <div className="skeleton-pulse skeleton-title" style={{ width: '50%' }}></div>
            <div className="skeleton-pulse skeleton-row"></div>
            <div className="skeleton-pulse skeleton-row"></div>
            <div className="skeleton-pulse skeleton-row"></div>
          </div>

          {/* Skeleton Technical Section */}
          <div className="skeleton-card">
            <div className="skeleton-pulse skeleton-title" style={{ width: '40%' }}></div>
            <div className="skeleton-pulse skeleton-row"></div>
            <div className="skeleton-pulse skeleton-row"></div>
            <div className="skeleton-pulse skeleton-row"></div>
            <div className="skeleton-pulse skeleton-row"></div>
          </div>

          {/* Skeleton Safety Section */}
          <div className="skeleton-card">
            <div className="skeleton-pulse skeleton-title" style={{ width: '35%' }}></div>
            <div className="skeleton-pulse skeleton-row"></div>
            <div className="skeleton-pulse skeleton-row"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!dataToUse) {
    return (
      <div className="refrigerant-info-outer">
        <div className="refrigerant-info-scroll">
          <div className="quick-summary-card">
            <div className="summary-title">{selectedRefrigerant}</div>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Status</span>
                <span className="summary-value">No data available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="refrigerant-info-outer">
      <div className="refrigerant-info-scroll">
        {/* Section 0: Quick Summary Card (Highlighted at top) */}
        <div className="quick-summary-card">
          <div className="summary-title">{dataToUse.name || dataToUse.rNumber}</div>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Safety Group</span>
              <span className="info-value">{dataToUse.safetyGroup || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">GWP ({selectedGwp})</span>
              <span className="info-value">{getGwpValue(dataToUse, selectedGwp) || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">ODP</span>
              <span className="info-value">{dataToUse.odp || '-'}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Chemical Properties (from JSON or CSV if available) */}
        {dataToUse && (dataToUse.chemicalBlendName || dataToUse.chemicalFormula || dataToUse.casNumber) && (
          <div className="section chemical-section">
            <div className="section-title">Chemical Properties</div>
            <div className="info-grid">
              {dataToUse.chemicalBlendName && (
                <div className="info-row">
                  <span className="info-label">Chemical / Blend Name</span>
                  <span className="info-value">{dataToUse.chemicalBlendName}</span>
                </div>
              )}
              {dataToUse.chemicalFormula && (
                <div className="info-row">
                  <span className="info-label">Chemical Formula</span>
                  <span className="info-value">{dataToUse.chemicalFormula}</span>
                </div>
              )}
              {dataToUse.casNumber && (
                <div className="info-row">
                  <span className="info-label">CAS Number</span>
                  <span className="info-value">{dataToUse.casNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Technical Properties */}
        <div className="section technical-section">
          <div className="section-title">Technical Properties</div>
          <div className="info-grid">
            {dataToUse.class && dataToUse.class !== '' && (
              <div className="info-row">
                <span className="info-label">Class</span>
                <span className="info-value">{dataToUse.class}</span>
              </div>
            )}
            {dataToUse.classification && dataToUse.classification !== '' && (
              <div className="info-row">
                <span className="info-label">Classification</span>
                <span className="info-value">{dataToUse.classification}</span>
              </div>
            )}
            {/* Chemical Formula removed from here (duplicate) */}
            {dataToUse.oilType && dataToUse.oilType !== '' && (
              <div className="info-row">
                <span className="info-label">Oil Type</span>
                <span className="info-value">{dataToUse.oilType}</span>
              </div>
            )}
            {dataToUse.criticalTemperature && dataToUse.criticalTemperature !== '' && (
              <div className="info-row">
                <span className="info-label">Critical Temperature</span>
                <span className="info-value">{PropertyUnitConverter.getTemperatureValue(dataToUse.criticalTemperature, temperatureUnit)} <span className="unit">{PropertyUnitConverter.getTemperatureUnitSymbol(temperatureUnit)}</span></span>
              </div>
            )}
            {dataToUse.criticalPressure && dataToUse.criticalPressure !== '' && (
              <div className="info-row">
                <span className="info-label">Critical Pressure</span>
                <span className="info-value">{PropertyUnitConverter.getPressureValue(dataToUse.criticalPressure, pressureUnit)} <span className="unit">{PropertyUnitConverter.getPressureUnitSymbol(pressureUnit)}</span></span>
              </div>
            )}
            {dataToUse.boilingPoint && dataToUse.boilingPoint !== '' && (
              <div className="info-row">
                <span className="info-label">Boiling Point</span>
                <span className="info-value">{PropertyUnitConverter.getTemperatureValue(dataToUse.boilingPoint, temperatureUnit)} <span className="unit">{PropertyUnitConverter.getTemperatureUnitSymbol(temperatureUnit)}</span></span>
              </div>
            )}
            {dataToUse.triplePoint && dataToUse.triplePoint !== '' && (
              <div className="info-row">
                <span className="info-label">Triple Point</span>
                <span className="info-value">{PropertyUnitConverter.getTemperatureValue(dataToUse.triplePoint, temperatureUnit)} <span className="unit">{PropertyUnitConverter.getTemperatureUnitSymbol(temperatureUnit)}</span></span>
              </div>
            )}
            {dataToUse.nominalGlide && dataToUse.nominalGlide !== '' && (
              <div className="info-row">
                <span className="info-label">Nominal Glide</span>
                <span className="info-value">{PropertyUnitConverter.getNominalGlideValue(dataToUse.nominalGlide, temperatureUnit)} <span className="unit">{PropertyUnitConverter.getTemperatureUnitSymbol(temperatureUnit)}</span></span>
              </div>
            )}
            {(dataToUse.normalDensityKgm3 || dataToUse.normalDensityLbft3) && (
              <div className="info-row">
                <span className="info-label">Normal Density</span>
                <span className="info-value">
                  {dataToUse.normalDensityKgm3} <span className="unit">kg/m³</span>
                  {dataToUse.normalDensityLbft3 && (
                    <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '2px' }}>
                      ({dataToUse.normalDensityLbft3} <span className="unit" style={{ color: 'inherit', opacity: 1 }}>lb/ft³</span>)
                    </div>
                  )}
                </span>
              </div>
            )}
            {(dataToUse.molecularMass) && (dataToUse.molecularMass) !== '' && (
              <div className="info-row">
                <span className="info-label">Molecular Mass</span>
                <span className="info-value">{dataToUse.molecularMass} <span className="unit">g/mol</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Safety Info */}
        <div className="section safety-section">
          <div className="section-title">Safety Information</div>
          <div className="info-grid">
            {dataToUse.pedFluidGroup && dataToUse.pedFluidGroup !== '' && (
              <div className="info-row">
                <span className="info-label">PED Fluid Group</span>
                <span className="info-value">{dataToUse.pedFluidGroup}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Lower Flammability Limit</span>
              <span className="info-value">
                {(!dataToUse.lowerFlammabilityLimitKgm3 || dataToUse.lowerFlammabilityLimitKgm3 === '-') &&
                  (!dataToUse.lowerFlammabilityLimitLbft3 || dataToUse.lowerFlammabilityLimitLbft3 === '-') ? (
                  'N/A'
                ) : (
                  <>
                    {dataToUse.lowerFlammabilityLimitKgm3 && dataToUse.lowerFlammabilityLimitKgm3 !== '-' ? (
                      <>
                        {dataToUse.lowerFlammabilityLimitKgm3} <span className="unit">kg/m³</span>
                      </>
                    ) : null}

                    {dataToUse.lowerFlammabilityLimitLbft3 && dataToUse.lowerFlammabilityLimitLbft3 !== '-' && (
                      <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '2px' }}>
                        ({dataToUse.lowerFlammabilityLimitLbft3} <span className="unit" style={{ color: 'inherit', opacity: 1 }}>lb/ft³</span>)
                      </div>
                    )}
                  </>
                )}
              </span>
            </div>
            {dataToUse.autoIgnitionTemperature && dataToUse.autoIgnitionTemperature !== '' && dataToUse.autoIgnitionTemperature !== '-' && (
              <div className="info-row">
                <span className="info-label">Auto Ignition Temperature</span>
                <span className="info-value">{PropertyUnitConverter.getTemperatureValue(dataToUse.autoIgnitionTemperature, temperatureUnit)} <span className="unit">{PropertyUnitConverter.getTemperatureUnitSymbol(temperatureUnit)}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefrigerantInfo;
