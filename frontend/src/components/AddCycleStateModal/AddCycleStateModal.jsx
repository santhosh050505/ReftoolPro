import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import './AddCycleStateModal.css';

const AddCycleStateModal = ({ isOpen, onClose, project, existingCalculations = [], pressureUnit, temperatureUnit, isAbsolute, onSuccess }) => {
  const navigate = useNavigate();
  const { selectCalculation, refreshProjects } = useProject();
  const [name, setName] = useState('');
  const [defineStateCycle, setDefineStateCycle] = useState('Select your option');
  const [error, setError] = useState('');

  // Check if this is a R513A or R454B custom state point project
  const isCustomStatePointProject = (project?.stateCycle === 'Custom State point') &&
    (project?.lockedRefrigerant?.toUpperCase() === 'R513A' ||
      project?.lockedRefrigerant?.toUpperCase() === 'R454B');



  const currentTempUnit = (project?.lockedTemperatureUnit || temperatureUnit || 'celsius').toLowerCase();
  const tempLabel = currentTempUnit === 'fahrenheit' ? 'F' : 'C';

  const PRESSURE_LEVEL_OPTIONS = [
    'Saturated Condensation Pressure (SCP)',
    'Saturated Evaporation Pressure (SEP)',
    'Evaporator Superheat(K)',
    'Condenser Subcooling(K)',
    `Compressor Superheat(${tempLabel})`,
    `Liquid temperature(${tempLabel})`
  ];

  const TEMPERATURE_LEVEL_OPTIONS = [
    'Saturated Condensation Temperature (SCT)',
    'Saturated Evaporator Temperature (SET)',
    'Evaporator Superheat(K)',
    'Condenser Subcooling(K)',
    `Compressor Superheat(${tempLabel})`,
    `Liquid temperature(${tempLabel})`
  ];

  const CUSTOM_STATE_OPTIONS = [
    'Compressor Discharge(SCT)',
    'Condenser Inlet(SCT)',
    'Condenser Outlet(SCT)',
    'Expansion Device Inlet(SCT)',
    'Evaporator Outlet(SET)',
    'Compressor Suction(SET)',
    'Evaporator Superheat',
    'Condenser Subcooling',
    'Compressor Superheat'
  ];

  let options = [];
  if (isCustomStatePointProject) {
    options = CUSTOM_STATE_OPTIONS;
  } else if (project?.stateCycle === 'Pressure level(Evap./Cond.)') {
    options = PRESSURE_LEVEL_OPTIONS;
  } else {
    options = TEMPERATURE_LEVEL_OPTIONS;
  }

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDefineStateCycle(isCustomStatePointProject ? 'Select your option' : 'Select your option');
      setError('');
    }
  }, [isOpen]);

  // Reset selection if the current one becomes disabled
  useEffect(() => {
    if (defineStateCycle !== 'Select your option' && existingCalculations.some(c => c.defineStateCycle === defineStateCycle)) {
      setDefineStateCycle('Select your option');
    }
  }, [existingCalculations, defineStateCycle]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Operating condition name is required');
      return;
    }

    if (!defineStateCycle || defineStateCycle === 'Select your option') {
      setError('Please select a cycle state type');
      return;
    }

    const defaultRef = project.lockedRefrigerant || 'R407C';

    // Options that skip the refslider
    const skipRefSliderOptions = [
      'Evaporator Superheat(K)',
      'Condenser Subcooling(K)',
      'Compressor Superheat(K)',
      'Evaporator Superheat',
      'Condenser Subcooling',
      'Compressor Superheat'
    ];

    const isDirectSave = skipRefSliderOptions.includes(defineStateCycle);

    // For custom state point, isDew is not used, set to null
    let isDew = true;
    if ([
      'Saturated Evaporation Pressure (SEP)',
      'Saturated Evaporator Temperature (SET)',
      'Evaporator Superheat',
      'Condenser Subcooling',
      'Liquid temperature',
      'Evaporator Outlet(SET)',
      'Compressor Suction(SET)',
      'Evaporator Superheat(K)',
      'Condenser Subcooling(K)'
    ].includes(defineStateCycle)) {
      isDew = false;
    }

    const partialData = {
      refrigerant: defaultRef,
      name: name.trim(),
      defineStateCycle: defineStateCycle,
      pressure: null,
      temperature: null,
      actualTemperature: null,
      isAbsolute: project?.lockedIsAbsolute !== undefined ? project.lockedIsAbsolute : isAbsolute,
      isDew: isDew,
      isManual: true,
      projectId: project._id,
      pressureUnit: project.lockedPressureUnit || pressureUnit,
      temperatureUnit: project.lockedTemperatureUnit || temperatureUnit,
      sequence: null,
      liquidTemperature: null
    };

    try {
      const { createCalculation } = await import('../../services/calculationApiService');

      // For custom state point, always save directly
      if (isDirectSave) {
        // Save directly and stay on dashboard
        await createCalculation({
          ...partialData,
          inputValue: 0
        });

        if (onSuccess) {
          onSuccess(project._id);
        } else {
          await refreshProjects();
        }

        onClose();
      } else {
        // Create the calculation record FIRST so it has an _id
        // and we can "Update" it from the calculator
        const result = await createCalculation({
          ...partialData,
          inputValue: 0
        });

        // Update ProjectContext so the calculator knows we are editing this row
        if (result && result.calculation) {
          selectCalculation(result.calculation);
          sessionStorage.setItem('loadCalculationData', JSON.stringify(result.calculation));
        } else {
          sessionStorage.setItem('loadCalculationData', JSON.stringify(partialData));
        }

        await refreshProjects();
        onClose();
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to handle cycle state submission:', err);
      setError(err.message || 'Failed to process request');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content add-cycle-modal">
        <div className="modal-header">
          <h2>{isCustomStatePointProject ? 'Add Operating Condition' : 'Add Cycle State'}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form className="project-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="cycle-state-name">operating condition *</label>
            <input
              id="cycle-state-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Condenser Hub"
              maxLength={100}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="define-state-cycle">Define state cycle *</label>
            <select
              id="define-state-cycle"
              className="form-select"
              value={defineStateCycle}
              onChange={(e) => setDefineStateCycle(e.target.value)}
              required
            >
              <option value="Select your option">Select your option</option>
              {options.map(opt => {
                const baseOpt = opt.split('(')[0];
                const isUsed = (existingCalculations || []).some(c =>
                  c.defineStateCycle === opt || (c.defineStateCycle && c.defineStateCycle.startsWith(baseOpt))
                );
                return (
                  <option key={opt} value={opt} disabled={isUsed}>
                    {opt} {isUsed ? '(Already added)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCycleStateModal;
