import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, updateProject } from '../../services/projectService';
import { getAllRefrigerants } from '../../api';
import { getPressureUnitsArray } from '../../config/pressureUnits';
import { useToast } from '../../context/ToastContext';
import './ProjectModal.css';

const DEFAULT_REFRIGERANTS = [
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
  'R515B', 'R516A', 'R600 (Butane)', 'R600a (Isobutane)', 'R601 (Pentane)',
  'R601a (Isopentane)', 'R702 (Hydrogen)', 'R717 (Ammonia)',
  'R718 (Water)', 'R723', 'R728 (Nitrogen)', 'R729 (Air)', 'R732 (Oxygen)',
  'R744 (Carbon dioxide)', 'R744A (Nitrous oxide)', 'RE170 (Dimethyl ether)'
];

// Standardize default options similar to DEFAULT_REFRIGERANTS
const DEFAULT_PRESSURE_UNITS = getPressureUnitsArray();

const DEFAULT_TEMPERATURE_UNITS = [
  { value: 'celsius', label: 'Celsius (°C)' },
  { value: 'fahrenheit', label: 'Fahrenheit (°F)' }
];

const ProjectModal = ({ isOpen, onClose, onProjectCreated, onProjectUpdated, editingProject = null }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [productType, setProductType] = useState('');
  const [refrigerant, setRefrigerant] = useState('');
  const [refrigerantList, setRefrigerantList] = useState(DEFAULT_REFRIGERANTS);
  const [pressureUnit, setPressureUnit] = useState('');
  const [temperatureUnit, setTemperatureUnit] = useState('');
  const [isAbsolute, setIsAbsolute] = useState(true);
  const [stateCycle, setStateCycle] = useState('Select your option');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name || '');
      setProductType(editingProject.productType || '');
      setStateCycle(editingProject.stateCycle || 'Select your option');
      setRefrigerant(editingProject.lockedRefrigerant || '');
      setPressureUnit(editingProject.lockedPressureUnit || '');
      setTemperatureUnit(editingProject.lockedTemperatureUnit || '');
      setIsAbsolute(editingProject.lockedIsAbsolute !== undefined ? editingProject.lockedIsAbsolute : true);
    } else {
      setName('');
      setProductType('');
      setStateCycle('Select your option');
      setRefrigerant('');
      setPressureUnit(localStorage.getItem('pressureUnit') || 'bar');
      setTemperatureUnit(localStorage.getItem('temperatureUnit') || 'celsius');
      setIsAbsolute(true);
    }
  }, [editingProject, isOpen]);

  useEffect(() => {
    const loadRefrigerants = async () => {
      try {
        const response = await getAllRefrigerants();
        if (Array.isArray(response) && response.length > 0) {
          const apiNames = response.map(r => r.name || r.rNumber).filter(Boolean);
          const combined = Array.from(new Set([...apiNames, ...DEFAULT_REFRIGERANTS])).sort();
          setRefrigerantList(combined);
        }
      } catch (err) {
        console.warn('Error loading refrigerants from API, using defaults:', err);
      }
    };
    if (isOpen && !editingProject) {
      loadRefrigerants();
    }
  }, [isOpen, editingProject]);

  // Reset unit selections to clean slate when modal opens
  useEffect(() => {
    if (isOpen && !editingProject) {
      setPressureUnit(localStorage.getItem('pressureUnit') || 'bar');
      setTemperatureUnit(localStorage.getItem('temperatureUnit') || 'celsius');
      setIsAbsolute(true);
    }
  }, [isOpen, editingProject]);

  // Reset stateCycle if refrigerant is R454B or R513A and it's set to Pressure level
  useEffect(() => {
    const refUpper = (refrigerant || '').toUpperCase();
    if ((refUpper === 'R454B' || refUpper === 'R513A') && stateCycle === 'Pressure level(Evap./Cond.)') {
      setStateCycle('Select your option');
    }
  }, [refrigerant, stateCycle]);



  const productTypes = [
    'Heat Pump',
    'Air Handling Unit',
    'Chiller',
    'Custom Project'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!productType) {
      setError('Product Type is required');
      return;
    }

    if (!editingProject) {
      if (!refrigerant) {
        setError('Refrigerant is required');
        return;
      }

      if (!pressureUnit) {
        setError('Please select a pressure unit');
        return;
      }

      if (!temperatureUnit) {
        setError('Please select a temperature unit');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (editingProject) {
        const result = await updateProject(
          editingProject._id,
          name.trim(),
          productType,
          stateCycle,
          editingProject.compressorEfficiency || 1.0,
          pressureUnit,
          temperatureUnit,
          isAbsolute
        );
        addToast('Project updated successfully!', 'success');
        if (onProjectUpdated) {
          onProjectUpdated(result.project);
        }
      } else {
        const result = await createProject(
          name.trim(),
          '',
          productType,
          '',
          refrigerant,
          pressureUnit,
          temperatureUnit,
          stateCycle,
          1.0,
          isAbsolute
        );

        addToast('Project created successfully!', 'success');
        alert("only using absoult value for pressure we can able to plot the graph");

        setName('');
        setProductType('');
        setRefrigerant('');
        setPressureUnit(localStorage.getItem('pressureUnit') || '');
        setTemperatureUnit(localStorage.getItem('temperatureUnit') || '');

        if (onProjectCreated) {
          onProjectCreated(result.project);
        }

        // Redirect to dashboard
        navigate('/projects');
      }

      onClose();
    } catch (err) {
      setError(err.message || (editingProject ? 'Failed to update project' : 'Failed to create project'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!editingProject) {
      setName('');
      setProductType('');
      setRefrigerant('');
      setStateCycle('Select your option');
      setPressureUnit(localStorage.getItem('pressureUnit') || '');
      setTemperatureUnit(localStorage.getItem('temperatureUnit') || '');
      setIsAbsolute(true);
    }
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content project-modal-enhanced" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="project-name">Project Name *</label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              maxLength={100}
              autoFocus
              disabled={loading}
            />
          </div>

          {!editingProject && (
            <div className="form-group">
              <label htmlFor="refrigerant-select">Refrigerant *</label>
              <select
                id="refrigerant-select"
                value={refrigerant}
                onChange={(e) => setRefrigerant(e.target.value)}
                disabled={loading}
                className="form-select"
              >
                <option value="">Select Refrigerant</option>
                {refrigerantList.map(ref => (
                  <option key={ref} value={ref}>{ref}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="product-type">Product Type *</label>
              <select
                id="product-type"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                disabled={loading}
                className="form-select"
              >
                <option value="">Select Product Type</option>
                {productTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {!editingProject && (
              <div className="form-group flex-1">
                <label htmlFor="state-cycle">Define state cycle *</label>
                <select
                  id="state-cycle"
                  value={stateCycle}
                  onChange={(e) => setStateCycle(e.target.value)}
                  disabled={loading}
                  className="form-select"
                >
                  <option value="Select your option">Select your option</option>
                  {(refrigerant?.toUpperCase() !== 'R454B' && refrigerant?.toUpperCase() !== 'R513A') && (
                    <option value="Pressure level(Evap./Cond.)">Pressure level(Evap./Cond.)</option>
                  )}
                  <option value="Temperature level(Evap./Cond.)">Temperature level(Evap./Cond.)</option>
                  {(refrigerant?.toUpperCase() === 'R454B' || refrigerant?.toUpperCase() === 'R513A') && (
                    <option value="Custom State point">Custom State point</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {!editingProject && (
            <>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="pressure-unit-select">Pressure Unit *</label>
                  <select
                    id="pressure-unit-select"
                    value={pressureUnit}
                    onChange={(e) => setPressureUnit(e.target.value)}
                    disabled={loading}
                    className="form-select"
                  >
                    <option value="">Select Pressure Unit</option>
                    {DEFAULT_PRESSURE_UNITS.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="temperature-unit-select">Temp Unit *</label>
                  <select
                    id="temperature-unit-select"
                    value={temperatureUnit}
                    onChange={(e) => setTemperatureUnit(e.target.value)}
                    disabled={loading}
                    className="form-select"
                  >
                    <option value="">Select Temperature Unit</option>
                    {DEFAULT_TEMPERATURE_UNITS.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="pressure-mode-select">Pressure Mode *</label>
                  <select
                    id="pressure-mode-select"
                    value="absolute"
                    disabled={true}
                    className="form-select"
                  >
                    <option value="absolute">Absolute (a)</option>
                  </select>
                </div>
              </div>
            </>
          )}


          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim() || !productType || (!editingProject && (!refrigerant || !pressureUnit || !temperatureUnit))}
            >
              {loading ? (editingProject ? 'Updating...' : 'Creating...') : (editingProject ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
