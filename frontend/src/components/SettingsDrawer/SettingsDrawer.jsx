import React, { useState, useEffect } from "react";
import { getPressureUnitsArray } from "../../config/pressureUnits";
import { useGwp } from "../../context/GwpContext";
import { DISTANCE_UNIT_OPTIONS, ALTITUDE_LIMITS } from "../../config/distanceUnits";
import "./SettingsDrawer.css";

/**
 * Reusable settings row component with label and control
 * Handles consistent layout and alignment
 */
const SettingsRow = ({ label, control, showDivider = true }) => (
  <>
    {showDivider && <div className="settings-divider" />}
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-control">
        {control}
      </div>
    </div>
  </>
);

/**
 * Reusable segmented control component with smooth transitions
 * Used for temperature and GWP selections
 * Styled as a pill-shaped switch with accent highlighting
 */
const SegmentedControl = ({ options, value, onChange, ariaLabel = "Select option" }) => (
  <div className="segmented-control" role="group" aria-label={ariaLabel}>
    {options.map((option) => (
      <button
        key={option.value}
        className={`segmented-button ${value === option.value ? "active" : ""}`}
        onClick={() => onChange(option.value)}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        aria-label={option.label}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/**
 * Pressure dropdown component - styled dropdown for all pressure units
 */
const PressureDropdown = ({ value, options, onChange }) => {
  return (
    <div className="pressure-dropdown-wrapper">
      <select
        className="pressure-dropdown-select"
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        aria-label="Pressure unit"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg className="pressure-dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  );
};

/**
 * Expandable settings row component
 */
const ExpandableRow = ({ label, expanded, onToggle, children }) => (
  <>
    <div className="settings-divider" />
    <div className="settings-row expandable" onClick={onToggle}>
      <span className="settings-label">{label}</span>
      <span className="expand-arrow">{expanded ? "▼" : "▶"}</span>
    </div>
    {expanded && <div className="expanded-content">{children}</div>}
  </>
);

const SettingsDrawer = ({
  open,
  onClose,
  pressureUnit = "bar",
  temperatureUnit = "celsius",
  distanceUnit = "meters",
  altitude = 0,
  altitudeRows = [],
  onPressureUnitChange,
  onTemperatureUnitChange,
  onDistanceUnitChange,
  onAltitudeChange,
  isAbsolute = true,
  onIsAbsoluteChange
}) => {
  // Use global GWP context
  const { selectedGwp, setSelectedGwp } = useGwp();

  // Local UI state
  const [showAmbientPopup, setShowAmbientPopup] = useState(false);

  const [showGwpHelp, setShowGwpHelp] = useState(false);
  const [toast, setToast] = useState(null);
  const [changeHistory, setChangeHistory] = useState([]);

  // Track original values for change indicators
  const [originalSettings, setOriginalSettings] = useState({
    pressureUnit,
    temperatureUnit,
    distanceUnit,
    selectedGwp
  });

  // All pressure unit options from config
  const pressureOptions = getPressureUnitsArray().map(unit => ({
    value: unit.value,
    label: unit.label
  }));

  // Temperature options for segmented control
  const temperatureOptions = [
    { value: 'celsius', label: '°C' },
    { value: 'fahrenheit', label: '°F' }
  ];

  // GWP options with descriptions
  const gwpOptions = [
    { value: 'AR4', label: 'AR4', description: '2007 - EPA Standard', recommended: true },
    { value: 'AR5', label: 'AR5', description: '2014 - Updated' },
    { value: 'AR6', label: 'AR6', description: '2021 - Latest' }
  ];

  // Show success toast
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Record change in history
  const recordChange = (setting, oldValue, newValue) => {
    setChangeHistory(prev => [
      { setting, oldValue, newValue, timestamp: Date.now() },
      ...prev.slice(0, 4) // Keep last 5
    ]);
  };

  // Handle temperature change with feedback
  const handleTemperatureChange = (unit) => {
    const old = temperatureUnit;
    onTemperatureUnitChange(unit);
    showToast(`Temperature changed to ${unit === 'celsius' ? '°C' : '°F'}`);
    recordChange('Temperature', old === 'celsius' ? '°C' : '°F', unit === 'celsius' ? '°C' : '°F');
  };

  // Handle distance change with feedback
  const handleDistanceChange = (unit) => {
    const old = distanceUnit;
    onDistanceUnitChange(unit);

    // Sync altitude value to the new unit so physical height stays roughly same
    if (altitudeRows.length > 0) {
      const oldAltKey = old === 'meters' ? 'Altitude (m)' : 'Altitude (ft)';
      const newAltKey = unit === 'meters' ? 'Altitude (m)' : 'Altitude (ft)';

      // Find row closest to current altitude numerical value in old unit
      let closestRow = altitudeRows[0];
      let minDiff = Infinity;

      altitudeRows.forEach(row => {
        const diff = Math.abs((row[oldAltKey] || 0) - altitude);
        if (diff < minDiff) {
          minDiff = diff;
          closestRow = row;
        }
      });

      // Update altitude to the value in the NEW unit from that same row
      if (closestRow) {
        onAltitudeChange(closestRow[newAltKey], closestRow);
      }
    }

    showToast(`Distance unit changed to ${unit === 'meters' ? 'm' : 'ft'}`);
    recordChange('Distance Unit', old === 'meters' ? 'm' : 'ft', unit === 'meters' ? 'm' : 'ft');
  };

  // Handle pressure change with feedback
  const handlePressureChange = (unit) => {
    const old = pressureUnit;
    onPressureUnitChange(unit);
    showToast(`Pressure unit changed to ${unit}`);
    recordChange('Pressure', old, unit);
  };

  // Handle GWP change with feedback
  const handleGwpChange = (gwp) => {
    const old = selectedGwp;
    setSelectedGwp(gwp);
    showToast(`GWP standard changed to ${gwp}`);
    recordChange('GWP', old, gwp);
  };

  // Undo last change
  const undoLastChange = () => {
    if (changeHistory.length === 0) return;

    const lastChange = changeHistory[0];

    if (lastChange.setting === 'Temperature') {
      const unit = lastChange.oldValue === '°C' ? 'celsius' : 'fahrenheit';
      onTemperatureUnitChange(unit);
    } else if (lastChange.setting === 'Pressure') {
      onPressureUnitChange(lastChange.oldValue);
    } else if (lastChange.setting === 'GWP') {
      setSelectedGwp(lastChange.oldValue);
    } else if (lastChange.setting === 'Distance Unit') {
      const unit = lastChange.oldValue === 'm' ? 'meters' : 'feet';
      onDistanceUnitChange(unit);
    }

    setChangeHistory(prev => prev.slice(1));
    showToast(`✓ Undone: ${lastChange.setting} restored to ${lastChange.oldValue}`);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    onPressureUnitChange('bar');
    onTemperatureUnitChange('celsius');
    onDistanceUnitChange('meters');
    setSelectedGwp('AR4');
    setChangeHistory([]);
    showToast('✓ Settings reset to defaults');
  };

  // Keyboard support - Esc to close
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Update original settings when drawer opens
  useEffect(() => {
    if (open) {
      setOriginalSettings({
        pressureUnit,
        temperatureUnit,
        distanceUnit,
        selectedGwp
      });
    }
  }, [open]);

  // Check if setting has changed
  const hasChanged = (setting, value) => {
    return originalSettings[setting] !== value;
  };

  return (
    <>
      {open && <div className="settings-overlay" onClick={onClose} />}
      <div className={`settings-drawer${open ? " open" : ""}`}>
        {/* Header */}
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
            title="Close (changes saved automatically)"
          >
            ×
          </button>
        </div>

        {/* Toast Notifications */}
        {toast && (
          <div className="settings-toast">
            <span className="toast-icon">✓</span>
            <span className="toast-message">{toast}</span>
          </div>
        )}

        {/* Content */}
        <div className="settings-content">
          {/* Measurement Units Section */}
          <div className="settings-section">
            <div className="section-title">Measurement Units</div>

            <SettingsRow
              label={
                <div className="label-with-indicator">
                  Pressure
                  {hasChanged('pressureUnit', pressureUnit) && <span className="changed-indicator">●</span>}
                </div>
              }
              showDivider={false}
              control={
                <PressureDropdown
                  value={pressureUnit}
                  options={pressureOptions}
                  onChange={handlePressureChange}
                />
              }
            />


            <SettingsRow
              label={
                <div className="label-with-indicator">
                  Temperature
                  {hasChanged('temperatureUnit', temperatureUnit) && <span className="changed-indicator">●</span>}
                </div>
              }
              control={
                <SegmentedControl
                  options={temperatureOptions}
                  value={temperatureUnit}
                  onChange={handleTemperatureChange}
                  ariaLabel="Temperature unit selector"
                />
              }
            />

            <SettingsRow
              label={
                <div className="label-with-indicator">
                  Distance unit
                  {hasChanged('distanceUnit', distanceUnit) && <span className="changed-indicator">●</span>}
                </div>
              }
              control={
                <SegmentedControl
                  options={DISTANCE_UNIT_OPTIONS}
                  value={distanceUnit}
                  onChange={handleDistanceChange}
                  ariaLabel="Distance unit selector"
                />
              }
            />
          </div>

          {/* Refrigerant Slider Settings Section */}
          <div className="settings-section">
            <div className="section-title">Refrigerant Slider</div>

            <SettingsRow
              label={
                <div className="label-with-indicator">
                  GWP
                  {hasChanged('selectedGwp', selectedGwp) && <span className="changed-indicator">●</span>}
                  <button
                    className="help-icon-small"
                    onClick={() => setShowGwpHelp(true)}
                    title="What is GWP?"
                    aria-label="GWP help"
                  >
                    ?
                  </button>
                </div>
              }
              showDivider={false}
              control={
                <SegmentedControl
                  options={gwpOptions.map(o => ({ value: o.value, label: o.label }))}
                  value={selectedGwp}
                  onChange={handleGwpChange}
                  ariaLabel="GWP standard selector"
                />
              }
            />

            {/* GWP descriptions */}
            <div className="gwp-description">
              {gwpOptions.find(o => o.value === selectedGwp)?.description}
              {gwpOptions.find(o => o.value === selectedGwp)?.recommended && (
                <span className="recommended-badge">★ Recommended</span>
              )}
            </div>

            <div className="settings-divider" />
            <div className="settings-row clickable" onClick={() => setShowAmbientPopup(true)}>
              <span className="settings-label">Ambient Pressure and Gauge</span>
              <div className="settings-control">
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 22h20L12 2z" />
                </svg>
              </div>
            </div>
            <div className="expandable-note">(Future options...)</div>
          </div>

          {/* App Actions Section */}
          <div className="settings-section">
            <div className="section-title">App</div>

            <div className="settings-divider" />
            <div className="action-row">
              <span className="action-label">Share Your Settings</span>
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </div>

            <div className="action-row">
              <span className="action-label">Tips & Tricks</span>
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </div>

            <div className="action-row">
              <span className="action-label">Feedback</span>
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
          </div>

          {/* Undo and Reset Section */}
          {changeHistory.length > 0 && (
            <div className="settings-section">
              <div className="settings-divider" />
              <div className="settings-actions">
                <button className="action-button" onClick={undoLastChange}>
                  <span className="action-button-icon">↶</span>
                  <span>Undo Last Change</span>
                </button>
                <button className="action-button secondary" onClick={resetToDefaults}>
                  <span className="action-button-icon">⟲</span>
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GWP Help Modal */}
      {showGwpHelp && (
        <div className="help-modal-overlay" onClick={() => setShowGwpHelp(false)}>
          <div className="help-modal-settings" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h3>Global Warming Potential (GWP)</h3>
              <button className="help-modal-close" onClick={() => setShowGwpHelp(false)}>×</button>
            </div>
            <div className="help-modal-content">
              <div className="help-section">
                <h4>What is GWP?</h4>
                <p>GWP measures a refrigerant's climate impact compared to CO₂ over 100 years. Higher numbers mean greater warming potential.</p>
              </div>

              <div className="help-section">
                <h4>Which standard should I use?</h4>
                <div className="gwp-option-detail">
                  <div className="gwp-option-header">
                    <strong>AR4 (2007)</strong>
                    <span className="recommended-pill">★ Recommended</span>
                  </div>
                  <p>Most widely used standard. Required by EPA and EU F-Gas regulations. Best for regulatory compliance.</p>
                </div>

                <div className="gwp-option-detail">
                  <strong>AR5 (2014)</strong>
                  <p>Updated IPCC values. Used in some regional building codes and newer regulations.</p>
                </div>

                <div className="gwp-option-detail">
                  <strong>AR6 (2021)</strong>
                  <p>Latest scientific assessment. Limited regulatory adoption. Use for research or future planning.</p>
                </div>
              </div>

              <div className="help-note">
                <strong>Tip:</strong> Unless you have specific regulatory requirements, use AR4 for maximum compatibility.
              </div>
            </div>
            <button className="help-modal-btn" onClick={() => setShowGwpHelp(false)}>Got it!</button>
          </div>
        </div>
      )}

      {/* Ambient Pressure Popup */}
      {showAmbientPopup && (
        <div className="help-modal-overlay" onClick={() => setShowAmbientPopup(false)}>
          <div className="ambient-popup" onClick={(e) => e.stopPropagation()}>
            <div className="ambient-popup-header">
              <h3>Ambient Pressure</h3>
            </div>

            <div className="popup-divider" />

            <div className="popup-section altitude-section">
              <div className="altitude-label-row">
                <span className="popup-label">Altitude</span>
                <div className="altitude-input-wrapper">
                  <input
                    type="number"
                    className="altitude-number-input"
                    value={altitude === null ? '' : altitude}
                    min={0}
                    max={ALTITUDE_LIMITS[distanceUnit].max}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        onAltitudeChange(null, null);
                      } else {
                        const numVal = Math.max(0, Number(val)); // Force non-negative
                        // Find closest row in data
                        const altKey = distanceUnit === 'feet' ? 'Altitude (ft)' : 'Altitude (m)';
                        let closestRow = altitudeRows[0];
                        let minDiff = Infinity;

                        altitudeRows.forEach(row => {
                          const diff = Math.abs(row[altKey] - numVal);
                          if (diff < minDiff) {
                            minDiff = diff;
                            closestRow = row;
                          }
                        });

                        onAltitudeChange(numVal, closestRow);
                      }
                    }}
                  />
                  <span className="altitude-unit-label">{ALTITUDE_LIMITS[distanceUnit].label}</span>
                </div>
              </div>

              <div className="altitude-slider-container">
                <input
                  type="range"
                  className="altitude-slider"
                  min={0}
                  max={altitudeRows.length > 0 ? altitudeRows.length - 1 : 100}
                  step={1}
                  value={(() => {
                    const altKey = distanceUnit === 'feet' ? 'Altitude (ft)' : 'Altitude (m)';
                    const index = altitudeRows.findIndex(r => r[altKey] === altitude);
                    return index !== -1 ? index : 0;
                  })()}
                  onChange={(e) => {
                    const index = Number(e.target.value);
                    const row = altitudeRows[index];
                    const altKey = distanceUnit === 'feet' ? 'Altitude (ft)' : 'Altitude (m)';
                    if (row) {
                      onAltitudeChange(row[altKey], row);
                    }
                  }}
                />
                <div className="slider-labels">
                  <span>{ALTITUDE_LIMITS[distanceUnit].min} {ALTITUDE_LIMITS[distanceUnit].label}</span>
                  <span>{ALTITUDE_LIMITS[distanceUnit].max} {ALTITUDE_LIMITS[distanceUnit].label}</span>
                </div>
              </div>
            </div>

            <div className="popup-actions">
              <button
                className="popup-btn-reset"
                onClick={() => {
                  const zeroRow = altitudeRows.find(r => r['Altitude (m)'] === 0) || altitudeRows[0];
                  const altKey = distanceUnit === 'feet' ? 'Altitude (ft)' : 'Altitude (m)';
                  onAltitudeChange(0, zeroRow);
                }}
              >
                RESET
              </button>
              <button
                className="popup-btn-done"
                onClick={() => setShowAmbientPopup(false)}
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsDrawer;

