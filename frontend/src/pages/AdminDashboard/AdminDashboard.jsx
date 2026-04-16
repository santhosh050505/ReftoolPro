import React, { useState, useEffect, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Edit2, Trash2, Save, X, AlertCircle, RefreshCw } from 'lucide-react';
import Sidebar from '../../components/Sidebar/Sidebar';
import RefrigerantInfo from '../../components/RefrigerantInfo/RefrigerantInfo';
import InputPanel from '../../components/InputPanel/InputPanel';
import RefrigerantDrawer from '../../components/RefrigerantDrawer/RefrigerantDrawer';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EmptyState from '../../components/EmptyState/EmptyState';
import RefrigerantDataService from '../../services/refrigerantDataService';
import { getAllRefrigerants, addNewRefrigerant, updateExistingRefrigerant, deleteExistingRefrigerant } from '../../api';
import { DeviceContext } from '../../App';
import './AdminDashboard.css';

// Default fallback list if service is not available
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

const AdminDashboard = ({ showCrudPanel, onShowCrudPanelChange }) => {
  const {
    pressureUnit,
    temperatureUnit,
    altitude,
    ambientPressureData,
    deviceType
  } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // NEW: Search state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Delete confirmation state
  const [isRefreshing, setIsRefreshing] = useState(false); // Loading state
  const [isDirty, setIsDirty] = useState(false); // Track unsaved changes
  const [showDirtyWarning, setShowDirtyWarning] = useState(false); // Dirty form warning modal
  const [lastAction, setLastAction] = useState(null); // Track last action for persistent message
  // Initialize from sessionStorage if page was just reloaded, otherwise use default
  const [selectedRefrigerant, setSelectedRefrigerant] = useState(() => {
    const saved = sessionStorage.getItem('lastSelectedRefrigerant');
    const initial = saved || 'R407C';
    // Clear sessionStorage after reading
    if (saved) {
      sessionStorage.removeItem('lastSelectedRefrigerant');
    }
    return initial;
  });

  // Missing state variables restoring
  const [refrigerants, setRefrigerants] = useState([]);
  const [refrigerantList, setRefrigerantList] = useState(DEFAULT_REFRIGERANTS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const initialFormState = {
    id: null,
    name: '',
    rNumber: '',
    classification: '',
    gwpAR4: '',
    gwpAR5: '',
    gwpAR6: '',
    odp: '',
    class: '',
    chemicalFormula: '',
    chemicalBlendName: '',
    casNumber: '',
    criticalTemperature: '',
    criticalPressure: '',
    boilingPoint: '',
    triplePoint: '',
    nominalGlide: '',
    normalDensity: '',
    normalDensityKgm3: '',
    normalDensityLbft3: '',
    molecularMass: '',
    safetyGroup: '',
    pedFluidGroup: '',
    lowerFlammabilityLimit: '',
    lowerFlammabilityLimitKgm3: '',
    lowerFlammabilityLimitLbft3: '',
    autoIgnitionTemperature: '',
    oilType: '',
    minPressure: '',
    maxPressure: '',
    minTemperature: '',
    maxTemperature: ''
  };

  const [formData, setFormData] = useState(initialFormState);








  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Validation functions
  const validateGwpOdpField = (value) => {
    if (value === '' || value === null || value === undefined) {
      return null;  // Optional field
    }

    // Pattern: number, "-", or "<1"
    const validPattern = /^(-|<1|\d+(\.\d+)?)$/;

    if (!validPattern.test(value)) {
      return 'Must be a number, "-" (unknown), or "<1" (negligible)';
    }

    // If numeric, validate range
    if (!isNaN(value)) {
      const num = parseFloat(value);
      if (num < 0) return 'Cannot be negative';
      if (num > 50000) return 'Value unrealistic (max 50,000)';
    }

    return null;  // Valid
  };

  const validateNumericField = (value, min = -Infinity, max = Infinity, fieldLabel = 'Value') => {
    if (value === '' || value === null || value === undefined) {
      return null;  // Optional field
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return 'Must be a valid number';
    }

    if (num < min) {
      return `Must be at least ${min}`;
    }

    if (num > max) {
      return `Must be at most ${max}`;
    }

    return null;  // Valid
  };

  // NEW: Filter refrigerants based on search query
  const filteredRefrigerants = refrigerants.filter(ref => {
    const searchLower = searchQuery.toLowerCase();
    return (
      ref.name.toLowerCase().includes(searchLower) ||
      (ref.chemicalFormula && ref.chemicalFormula.toLowerCase().includes(searchLower)) ||
      (ref.class && ref.class.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    loadRefrigerants();
    loadRefrigerantList();
  }, []);

  // Load refrigerant list for drawer from backend API
  const loadRefrigerantList = async () => {
    try {
      const response = await getAllRefrigerants();
      // getAllRefrigerants now returns the array directly
      if (Array.isArray(response) && response.length > 0) {
        // Extract refrigerant names from API and combine with defaults
        const apiNames = response.map(r => r.name || r.rNumber).filter(Boolean);
        const combined = Array.from(new Set([...apiNames, ...DEFAULT_REFRIGERANTS])).sort();
        setRefrigerantList(combined);
        console.log('✅ Refrigerants loaded from API:', combined.length);
      } else {
        setRefrigerantList(DEFAULT_REFRIGERANTS);
      }
    } catch (err) {
      console.warn('Error loading refrigerants from API, using defaults:', err);
      setRefrigerantList(DEFAULT_REFRIGERANTS);
    }
  };

  // Listen for localStorage changes (from admin CRUD operations)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'mainRefrigerantDatabase' || e.key === 'userRefrigerants') {
        loadRefrigerantList();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load refrigerants from backend API
  const loadRefrigerants = async () => {
    try {
      const response = await getAllRefrigerants();
      // getAllRefrigerants now returns the array directly
      if (Array.isArray(response) && response.length > 0) {
        // Ensure each refrigerant has a unique ID
        const refrigerantsWithIds = response.map((ref, index) => ({
          ...ref,
          id: ref.id || ref.name || `ref_${index}` // Use name as ID if not exists
        }));

        setRefrigerants(refrigerantsWithIds);
        setError('');
        console.log('📋 Loaded', refrigerantsWithIds.length, 'refrigerants from backend');
        console.log('📊 Refrigerants with IDs:', refrigerantsWithIds.map(r => ({ id: r.id, name: r.name })));
      } else if (Array.isArray(response)) {
        setRefrigerants([]);
        setError('');
      } else {
        setError('Failed to load refrigerants from backend');
      }
    } catch (err) {
      console.error('Error loading refrigerants:', err);
      setError('Failed to load refrigerants: ' + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Mark form as dirty
    setIsDirty(true);

    // Real-time validation
    let error = null;

    // GWP and ODP fields - allow "-" and "<1"
    if (['gwpAR4', 'gwpAR5', 'gwpAR6', 'odp'].includes(name)) {
      error = validateGwpOdpField(value);
    }
    // Pure numeric fields with specific ranges
    else if (name === 'molecularMass') {
      error = validateNumericField(value, 1, 1000);
    }
    else if (name === 'criticalTemperature' || name === 'criticalTemperatureK') {
      error = validateNumericField(value, 0, 1000);
    }
    else if (name === 'criticalPressure' || name === 'criticalPressureMPa' || name === 'criticalPressureBar') {
      error = validateNumericField(value, 0, 200);
    }
    else if (name === 'boilingPoint' || name === 'boilingPointC') {
      error = validateNumericField(value, -273.15, 200);
    }
    else if (name === 'triplePoint' || name === 'triplePointK') {
      error = validateNumericField(value, -273.15, 500);
    }
    else if (name === 'lowerFlammabilityLimitKgm3' || name === 'lowerFlammabilityLimitLbft3' || name === 'lowerFlammabilityLimit') {
      error = validateNumericField(value, 0, 100);
    }
    else if (name === 'autoIgnitionTemperature' || name === 'autoIgnitionTemperatureC' || name === 'autoIgnitionTemperatureK') {
      error = validateNumericField(value, 0, 2000);
    }
    else if (name === 'normalDensityKgm3' || name === 'normalDensityLbft3' || name === 'normalDensity') {
      error = validateNumericField(value, 0, 10000);
    }
    else if (name === 'nominalGlide') {
      error = validateNumericField(value, 0, 50);
    }
    else if (name === 'minPressure' || name === 'maxPressure') {
      error = validateNumericField(value, 0, 10000);
    }
    else if (name === 'minTemperature' || name === 'maxTemperature') {
      error = validateNumericField(value, -273.15, 500);
    }

    // Update errors state
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = (skipWarning = false) => {
    // Warn if form is dirty
    if (isDirty && !skipWarning) {
      setShowDirtyWarning(true);
      return;
    }

    setFormData({
      id: null,
      name: '',
      rNumber: '',
      classification: '',
      gwpAR4: '',
      gwpAR5: '',
      gwpAR6: '',
      odp: '',
      class: '',
      chemicalFormula: '',
      chemicalBlendName: '',
      casNumber: '',
      criticalTemperature: '',
      criticalPressure: '',
      boilingPoint: '',
      triplePoint: '',
      nominalGlide: '',
      normalDensity: '',
      normalDensityKgm3: '',
      normalDensityLbft3: '',
      molecularMass: '',
      safetyGroup: '',
      pedFluidGroup: '',
      lowerFlammabilityLimit: '',
      lowerFlammabilityLimitKgm3: '',
      lowerFlammabilityLimitLbft3: '',
      autoIgnitionTemperature: '',
      oilType: '',
      minPressure: '',
      maxPressure: '',
      minTemperature: '',
      maxTemperature: ''
    });
    setFieldErrors({});  // Clear validation errors
    setEditingId(null);
    setIsDirty(false);  // Reset dirty flag
    setShowDirtyWarning(false);  // Close warning
  };

  const handleAddRefrigerant = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate ONLY required field: name (Refrigerant name/number)
    if (!formData.name || formData.name.trim() === '') {
      setError('Refrigerant name/number is required');
      return;
    }

    // Trim the name but keep original case
    const trimmedName = formData.name.trim();

    // Validate that refrigerant name starts with R (case-insensitive)
    if (!trimmedName.toUpperCase().startsWith('R')) {
      setError('The refrigerant name should start with capital R');
      return;
    }

    // GWP values are now OPTIONAL - only validate if they are provided
    // Removed strict number validation to allow symbolic values like "< 1", "> 1000", "-", etc.
    // The backend will handle storage of whatever format is provided

    // Validate pressure range values
    const minPressureValue = formData.minPressure ? parseFloat(formData.minPressure) : null;
    const maxPressureValue = formData.maxPressure ? parseFloat(formData.maxPressure) : null;
    const minTemperatureValue = formData.minTemperature ? parseFloat(formData.minTemperature) : null;
    const maxTemperatureValue = formData.maxTemperature ? parseFloat(formData.maxTemperature) : null;

    // Validate that min is not greater than max for pressure
    if (minPressureValue !== null && maxPressureValue !== null) {
      if (minPressureValue > maxPressureValue) {
        setError('Pressure minimum value cannot be greater than maximum value');
        return;
      }
    }

    // Validate that min is not greater than max for temperature
    if (minTemperatureValue !== null && maxTemperatureValue !== null) {
      if (minTemperatureValue > maxTemperatureValue) {
        setError('Temperature minimum value cannot be greater than maximum value');
        return;
      }
    }

    try {
      let result;

      // Keep original case for the refrigerant name
      const updatedFormData = { ...formData, name: trimmedName };

      if (editingId) {
        // Update existing refrigerant via API
        result = await updateExistingRefrigerant(updatedFormData.name, updatedFormData);
        setMessage('✅ Refrigerant updated successfully!');
      } else {
        // Add new refrigerant via API
        result = await addNewRefrigerant(updatedFormData);
        setMessage('✅ Refrigerant added successfully!');
      }

      // Reload refrigerants from backend (with small delay to ensure DB is updated)
      setTimeout(async () => {
        await loadRefrigerants();
        await loadRefrigerantList();
      }, 500);

      resetForm();
      setShowForm(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Error saving refrigerant: ' + err.message);
      console.error('Error:', err);
    }
  };

  const handleEditRefrigerant = (refrigerant) => {
    // Map all fields including GWP fields with both naming conventions
    const formattedData = {
      ...refrigerant,
      gwpAR4: refrigerant.gwpAR4 || refrigerant.gwp_ar4 || '',
      gwpAR5: refrigerant.gwpAR5 || refrigerant.gwp_ar5 || '',
      gwpAR6: refrigerant.gwpAR6 || refrigerant.gwp_ar6 || '',
      // Map casNumber field
      casNumber: refrigerant.casNumber || '',
      // Map range values from possible field names and ensure they're strings
      minPressure: refrigerant.minPressure !== undefined && refrigerant.minPressure !== null ? String(refrigerant.minPressure) : (refrigerant.pressure_min || ''),
      maxPressure: refrigerant.maxPressure !== undefined && refrigerant.maxPressure !== null ? String(refrigerant.maxPressure) : (refrigerant.pressure_max || ''),
      minTemperature: refrigerant.minTemperature !== undefined && refrigerant.minTemperature !== null ? String(refrigerant.minTemperature) : (refrigerant.temperature_min || ''),
      maxTemperature: refrigerant.maxTemperature !== undefined && refrigerant.maxTemperature !== null ? String(refrigerant.maxTemperature) : (refrigerant.temperature_max || ''),
      // Map density fields - use existing separate fields or the old combined field
      normalDensityKgm3: refrigerant.normalDensityKgm3 || refrigerant.normal_density_kgm3 || refrigerant.normalDensity || '',
      normalDensityLbft3: refrigerant.normalDensityLbft3 || refrigerant.normal_density_lbft3 || '',
      // Map flammability limit fields - use existing separate fields or the old combined field
      lowerFlammabilityLimitKgm3: refrigerant.lowerFlammabilityLimitKgm3 || refrigerant.lower_flammability_limit_kgm3 || refrigerant.lowerFlammabilityLimit || '',
      lowerFlammabilityLimitLbft3: refrigerant.lowerFlammabilityLimitLbft3 || refrigerant.lower_flammability_limit_lbft3 || ''
    };
    setFormData(formattedData);
    setEditingId(refrigerant.id);
    setShowForm(true);
  };

  const handleDeleteRefrigerant = async (id) => {
    // Find refrigerant for confirmation
    const refrigerant = refrigerants.find(r => r.id === id);
    if (!refrigerant) {
      setError('Refrigerant not found');
      return;
    }
    // Set confirmation state to show modal
    setDeleteConfirm({ id, name: refrigerant.name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setError('');
      setMessage('');

      console.log('🗑️ Deleting refrigerant with ID:', deleteConfirm.id);
      console.log('📊 Current refrigerants:', refrigerants.map(r => ({ id: r.id, name: r.name })));

      // Find refrigerant by ID
      const refrigerant = refrigerants.find(r => r.id === deleteConfirm.id);

      if (!refrigerant) {
        console.error('❌ Refrigerant not found with ID:', deleteConfirm.id);
        setError('Refrigerant not found');
        return;
      }

      console.log('✅ Found refrigerant:', refrigerant.name);

      // Delete via API using name
      const result = await deleteExistingRefrigerant(refrigerant.name);

      console.log('🔄 Delete result:', result);

      // Reload both refrigerants and list from backend (with small delay)
      setTimeout(async () => {
        await loadRefrigerants();
        await loadRefrigerantList();
      }, 500);

      // Set persistent success message (don't auto-dismiss)
      setLastAction({
        type: 'delete',
        item: refrigerant.name,
        timestamp: Date.now()
      });
      setDeleteConfirm(null);  // Close modal
    } catch (err) {
      console.error('❌ Error deleting refrigerant:', err);
      setError('Error deleting refrigerant: ' + err.message);
    }
  };

  return (
    <div className={`admin-dashboard-main ${deviceType === 'mobile' ? 'mobile-layout' : 'desktop-layout'}`}>
      {/* Persistent Success Banner */}
      {lastAction && (
        <div className="page-alert page-alert-success">
          <span>✅ {lastAction.item} {lastAction.type}d successfully!</span>
          <button onClick={() => setLastAction(null)} className="alert-close" aria-label="Dismiss message">×</button>
        </div>
      )}

      {/* Page-Level Error Alert */}
      {error && (
        <div className="page-alert page-alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="alert-close" aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Left Side - Calculator Area (Always Visible) */}
      <div className="admin-calculator-section">
        <div className="refrigerant-slider-grid">
          {/* Sidebar removed as per request */}
          <div />
          <RefrigerantInfo
            selectedRefrigerant={selectedRefrigerant}
            temperatureUnit={temperatureUnit}
            pressureUnit={pressureUnit}
          />
          <InputPanel
            initialRefrigerant={selectedRefrigerant}
            onRefrigerantChange={setSelectedRefrigerant}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            pressureUnit={pressureUnit}
            temperatureUnit={temperatureUnit}
            altitude={altitude}
            ambientPressureData={ambientPressureData}
          />
          <RefrigerantDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            refrigerants={refrigerantList}
            onSelect={setSelectedRefrigerant}
            selected={selectedRefrigerant}
          />
        </div>
      </div>

      {/* Right Side - CRUD Panel */}
      <div className={`admin-panel-redesigned ${showCrudPanel ? 'open' : ''}`}>

        {/* Admin Panel Header - Outside scrollable content */}
        {showCrudPanel && (
          <div className="admin-panel-header">
            <h1>Admin Control Panel</h1>
            <p>Manage Refrigerant Database</p>
          </div>
        )}

        {/* Admin Panel Content */}
        {showCrudPanel && (
          <div className="admin-panel-content">
            {message && (
              <div className="alert alert-success">
                <span>{message}</span>
                <button onClick={() => setMessage('')} className="alert-close" aria-label="Dismiss message">×</button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="admin-action-buttons">
              <button
                className={showForm ? 'admin-btn admin-btn-cancel' : 'admin-btn admin-btn-add'}
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
              >
                {showForm ? (
                  <>
                    <X size={18} />
                    Hide Form
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Refrigerant
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  await loadRefrigerants();
                  setIsRefreshing(false);
                }}
                className="admin-btn admin-btn-refresh"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw size={18} className="rotating" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Refresh
                  </>
                )}
              </button>
              <button
                onClick={() => onShowCrudPanelChange(false)}
                className="admin-btn admin-btn-close"
                title="Close Admin Panel"
              >
                <X size={18} />
                Close
              </button>
            </div>

            {/* Form Section */}
            {showForm && (
              <div className="admin-form-section">
                <h3>{editingId ? '✏️ Edit Refrigerant' : '➕ Add New Refrigerant'}</h3>
                <form onSubmit={handleAddRefrigerant} className="admin-form-grid-extended">
                  {/* Basic Information */}
                  <div className="form-section-title">Basic Information</div>

                  <div className="form-group">
                    <label className="required" style={{ fontSize: '12px' }}>Refrigerant Name/Number *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., R404A"
                      className="admin-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>R Number</label>
                    <input
                      type="text"
                      name="rNumber"
                      value={formData.rNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., R-404A"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Classification</label>
                    <input
                      type="text"
                      name="classification"
                      value={formData.classification}
                      onChange={handleInputChange}
                      placeholder="e.g., Zeotropic"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Class</label>
                    <select
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      className="admin-input"
                    >
                      <option value="">Select Class</option>
                      <option value="CFC">CFC</option>
                      <option value="HFC">HFC</option>
                      <option value="HO">HO</option>
                      <option value="PFC">PFC</option>
                      <option value="HFO">HFO</option>
                      <option value="HCFC">HCFC</option>
                      <option value="HC">HC</option>
                      <option value="HFC/HFO">HFC/HFO</option>
                      <option value="HFC/CO2">HFC/CO2</option>
                      <option value="HFO/HFC/CO2">HFO/HFC/CO2</option>
                      <option value="Natural refrigerant">Natural refrigerant</option>
                    </select>
                  </div>

                  {/* Chemical Information */}
                  <div className="form-section-title">Chemical Information</div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Chemical Formula / Composition</label>
                    <input
                      type="text"
                      name="chemicalFormula"
                      value={formData.chemicalFormula}
                      onChange={handleInputChange}
                      placeholder="e.g., R-125/143a/134a (44/52/4)"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Chemical Blend Name</label>
                    <input
                      type="text"
                      name="chemicalBlendName"
                      value={formData.chemicalBlendName}
                      onChange={handleInputChange}
                      placeholder="e.g., HRC188C"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>CAS Number</label>
                    <input
                      type="text"
                      name="casNumber"
                      value={formData.casNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., 354-33-6 or - for unknown"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Oil Type</label>
                    <input
                      type="text"
                      name="oilType"
                      value={formData.oilType}
                      onChange={handleInputChange}
                      placeholder="e.g., POE, MO/AB"
                      className="admin-input"
                    />
                  </div>

                  {/* Environmental Impact */}
                  <div className="form-section-title">Environmental Impact (Optional)</div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>GWP (AR4)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="gwpAR4"
                      value={formData.gwpAR4}
                      onChange={handleInputChange}
                      placeholder='e.g., 3921, "-", or "<1"'
                      className="admin-input"
                    />
                    {fieldErrors.gwpAR4 && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.gwpAR4}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>GWP (AR5)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="gwpAR5"
                      value={formData.gwpAR5}
                      onChange={handleInputChange}
                      placeholder='e.g., 3921, "-", or "<1"'
                      className="admin-input"
                    />
                    {fieldErrors.gwpAR5 && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.gwpAR5}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>GWP (AR6)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="gwpAR6"
                      value={formData.gwpAR6}
                      onChange={handleInputChange}
                      placeholder='e.g., 3921, "-", or "<1"'
                      className="admin-input"
                    />
                    {fieldErrors.gwpAR6 && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.gwpAR6}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>ODP (Ozone Depletion Potential)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="odp"
                      value={formData.odp}
                      onChange={handleInputChange}
                      placeholder='e.g., 0.055, "-", or "<1"'
                      className="admin-input"
                    />
                    {fieldErrors.odp && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.odp}
                      </small>
                    )}
                  </div>


                  {/* Safety Information */}
                  <div className="form-section-title">Safety Information</div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Safety Group</label>
                    <select
                      name="safetyGroup"
                      value={formData.safetyGroup}
                      onChange={handleInputChange}
                      className="admin-input"
                    >
                      <option value="">Select Safety Group</option>
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="A2L">A2L</option>
                      <option value="A3">A3</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                      <option value="B2L">B2L</option>
                      <option value="B3">B3</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>PED Fluid Group</label>
                    <input
                      type="text"
                      name="pedFluidGroup"
                      value={formData.pedFluidGroup}
                      onChange={handleInputChange}
                      placeholder="e.g., 1, 2, 3"
                      className="admin-input"
                    />
                  </div>

                  <div className="dual-input-group">
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Lower Flammability Limit (kg/m³)</label>
                      <input
                        type="text"
                        name="lowerFlammabilityLimitKgm3"
                        value={formData.lowerFlammabilityLimitKgm3}
                        onChange={handleInputChange}
                        placeholder="kg/m³"
                        className="admin-input"
                      />
                      {fieldErrors.lowerFlammabilityLimitKgm3 && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.lowerFlammabilityLimitKgm3}
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Lower Flammability Limit (lb/ft³)</label>
                      <input
                        type="text"
                        name="lowerFlammabilityLimitLbft3"
                        value={formData.lowerFlammabilityLimitLbft3}
                        onChange={handleInputChange}
                        placeholder="lb/ft³"
                        className="admin-input"
                      />
                      {fieldErrors.lowerFlammabilityLimitLbft3 && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.lowerFlammabilityLimitLbft3}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Auto Ignition Temperature (°C)</label>
                    <input
                      type="text"
                      name="autoIgnitionTemperature"
                      value={formData.autoIgnitionTemperature}
                      onChange={handleInputChange}
                      placeholder="e.g., 1342"
                      className="admin-input"
                    />
                    {fieldErrors.autoIgnitionTemperature && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.autoIgnitionTemperature}
                      </small>
                    )}
                  </div>

                  {/* Critical Properties */}
                  <div className="form-section-title">Critical Properties</div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Critical Temperature (°C)</label>
                    <input
                      type="text"
                      name="criticalTemperature"
                      value={formData.criticalTemperature}
                      onChange={handleInputChange}
                      placeholder="e.g., 161.8"
                      className="admin-input"
                    />
                    {fieldErrors.criticalTemperature && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.criticalTemperature}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Critical Pressure (bar)</label>
                    <input
                      type="text"
                      name="criticalPressure"
                      value={formData.criticalPressure}
                      onChange={handleInputChange}
                      placeholder="e.g., 541.7"
                      className="admin-input"
                    />
                    {fieldErrors.criticalPressure && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.criticalPressure}
                      </small>
                    )}
                  </div>

                  {/* Thermodynamic Properties */}
                  <div className="form-section-title">Thermodynamic Properties</div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Boiling Point (°C)</label>
                    <input
                      type="text"
                      name="boilingPoint"
                      value={formData.boilingPoint}
                      onChange={handleInputChange}
                      placeholder="e.g., -51.2"
                      className="admin-input"
                    />
                    {fieldErrors.boilingPoint && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.boilingPoint}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Triple Point (°C)</label>
                    <input
                      type="text"
                      name="triplePoint"
                      value={formData.triplePoint}
                      onChange={handleInputChange}
                      placeholder="e.g., -56.6 (Optional)"
                      className="admin-input"
                    />
                    {fieldErrors.triplePoint && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.triplePoint}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Nominal Glide (°C)</label>
                    <input
                      type="text"
                      name="nominalGlide"
                      value={formData.nominalGlide}
                      onChange={handleInputChange}
                      placeholder="e.g., 1.35"
                      className="admin-input"
                    />
                    {fieldErrors.nominalGlide && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.nominalGlide}
                      </small>
                    )}
                  </div>

                  <div className="dual-input-group">
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Normal Density (kg/m³)</label>
                      <input
                        type="text"
                        name="normalDensityKgm3"
                        value={formData.normalDensityKgm3}
                        onChange={handleInputChange}
                        placeholder="kg/m³"
                        className="admin-input"
                      />
                      {fieldErrors.normalDensityKgm3 && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.normalDensityKgm3}
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Normal Density (lb/ft³)</label>
                      <input
                        type="text"
                        name="normalDensityLbft3"
                        value={formData.normalDensityLbft3}
                        onChange={handleInputChange}
                        placeholder="lb/ft³"
                        className="admin-input"
                      />
                      {fieldErrors.normalDensityLbft3 && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.normalDensityLbft3}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px' }}>Molecular Mass (g/mol)</label>
                    <input
                      type="text"
                      name="molecularMass"
                      value={formData.molecularMass}
                      onChange={handleInputChange}
                      placeholder="e.g., 97.6"
                      className="admin-input"
                    />
                    {fieldErrors.molecularMass && (
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                        ⚠ {fieldErrors.molecularMass}
                      </small>
                    )}
                  </div>

                  {/* Range Section Title */}
                  <div className="form-section-title">Pressure & Temperature Range</div>

                  <div className="dual-input-group">
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Pressure Min (bar)</label>
                      <input
                        type="text"
                        name="minPressure"
                        value={formData.minPressure}
                        onChange={handleInputChange}
                        placeholder="e.g., 0.6"
                        className="admin-input"
                      />
                      {fieldErrors.minPressure && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.minPressure}
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Pressure Max (bar)</label>
                      <input
                        type="text"
                        name="maxPressure"
                        value={formData.maxPressure}
                        onChange={handleInputChange}
                        placeholder="e.g., 46.0"
                        className="admin-input"
                      />
                      {fieldErrors.maxPressure && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.maxPressure}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="dual-input-group">
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Temperature Min (°C)</label>
                      <input
                        type="text"
                        name="minTemperature"
                        value={formData.minTemperature}
                        onChange={handleInputChange}
                        placeholder="e.g., -35"
                        className="admin-input"
                      />
                      {fieldErrors.minTemperature && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.minTemperature}
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '12px' }}>Temperature Max (°C)</label>
                      <input
                        type="text"
                        name="maxTemperature"
                        value={formData.maxTemperature}
                        onChange={handleInputChange}
                        placeholder="e.g., 70"
                        className="admin-input"
                      />
                      {fieldErrors.maxTemperature && (
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                          ⚠ {fieldErrors.maxTemperature}
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn-save-admin"
                      disabled={!formData.name || Object.values(fieldErrors).some(error => error !== null)}
                      title={
                        !formData.name
                          ? 'Refrigerant name is required'
                          : Object.values(fieldErrors).some(error => error !== null)
                            ? 'Please fix validation errors before saving'
                            : (editingId ? 'Update refrigerant' : 'Add new refrigerant')
                      }
                    >
                      <Save size={16} />
                      {editingId ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="btn-cancel-admin"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Refrigerants List */}
            {!showForm && (
              <div className="admin-list-section">
                <h3>Database ({refrigerants.length})</h3>

                {/* NEW: Search Bar */}
                <div className="admin-search-container">
                  <input
                    type="text"
                    placeholder="🔍 Search by name, formula, or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-search-input"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="admin-search-clear"
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                {refrigerants.length === 0 ? (
                  <EmptyState
                    icon="🗃️"
                    title="Database is Empty"
                    description="No refrigerants in the database yet."
                    actions={[
                      {
                        label: "➕ Add Your First Refrigerant",
                        onClick: () => setShowForm(true),
                        variant: "primary",
                        icon: "➕"
                      }
                    ]}
                    tips={{
                      title: "Getting Started",
                      items: [
                        "Add common refrigerants like R407C, R410A, R134a",
                        "Include pressure-temperature data for calculations",
                        "Set GWP, ODP, and safety classifications"
                      ]
                    }}
                  />
                ) : filteredRefrigerants.length === 0 ? (
                  <EmptyState
                    icon="🔍"
                    title="No matches found"
                    description={<>No refrigerants match "<strong>{searchQuery}</strong>"</>}
                    variant="search"
                    actions={[
                      {
                        label: "Clear search",
                        onClick: () => setSearchQuery(''),
                        variant: "secondary"
                      },
                      {
                        label: `Add "${searchQuery}" as new`,
                        onClick: () => {
                          setFormData(prev => ({ ...prev, name: searchQuery }));
                          setShowForm(true);
                        },
                        variant: "primary"
                      }
                    ]}
                  />
                ) : (
                  <div className="admin-table">
                    <div className="admin-table-header">
                      <div className="col-name">Name</div>
                      <div className="col-formula">Formula</div>
                      <div className="col-actions">Actions</div>
                    </div>
                    {filteredRefrigerants.map(ref => (
                      <div key={ref.id} className="admin-table-row">
                        <div className="col-name">
                          <strong>{ref.name}</strong>
                          <small>{ref.class}</small>
                        </div>
                        <div className="col-formula">{ref.chemicalFormula || '-'}</div>
                        <div className="col-actions">
                          <button
                            onClick={() => handleEditRefrigerant(ref)}
                            className="admin-btn-small edit"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRefrigerant(ref.id)}
                            className="admin-btn-small delete"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calculator Area */}

      {/* Enhanced Delete Confirmation Modal  */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="⚠️ Delete Refrigerant?"
        message="You are about to permanently delete:"
        itemName={deleteConfirm?.name}
        itemId={deleteConfirm?.id}
        confirmLabel={`Delete ${deleteConfirm?.name || ''}`}
        confirmVariant="danger"
        warningText="⚠️ This action CANNOT be undone."
        impactWarning="All associated pressure-temperature data, GWP values, and properties will be permanently lost."
      />

      {/* Dirty Form Warning Modal */}
      <ConfirmModal
        isOpen={showDirtyWarning}
        onClose={() => setShowDirtyWarning(false)}
        onConfirm={() => resetForm(true)}
        title="⚠️ Unsaved Changes"
        message="You have unsaved changes. What would you like to do?"
        confirmLabel="Discard Changes"
        confirmVariant="warning"
        warningText=""
      />
    </div>
  );
};




export default AdminDashboard;
