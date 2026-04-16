import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, X } from 'lucide-react';
import { addNewRefrigerant, updateExistingRefrigerant } from '../../api';
import './MobileRefrigerantFormPage.css';

const MobileRefrigerantFormPage = ({
  onClose,
  editingData = null,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    rNumber: '',
    classification: '',
    class: '',
    chemicalFormula: '',
    chemicalBlendName: '',
    casNumber: '',
    oilType: '',
    gwpAR4: '',
    gwpAR5: '',
    gwpAR6: '',
    odp: '',
    safetyGroup: '',
    pedFluidGroup: '',
    lowerFlammabilityLimitKgm3: '',
    lowerFlammabilityLimitLbft3: '',
    autoIgnitionTemperature: '',
    criticalTemperature: '',
    criticalPressure: '',
    boilingPoint: '',
    triplePoint: '',
    nominalGlide: '',
    normalDensityKgm3: '',
    normalDensityLbft3: '',
    molecularMass: '',
    pressureMin: '',
    pressureMax: '',
    temperatureMin: '',
    temperatureMax: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with editing data if provided
  useEffect(() => {
    if (editingData) {
      setFormData(editingData);
    }
  }, [editingData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      rNumber: '',
      classification: '',
      class: '',
      chemicalFormula: '',
      chemicalBlendName: '',
      casNumber: '',
      oilType: '',
      gwpAR4: '',
      gwpAR5: '',
      gwpAR6: '',
      odp: '',
      safetyGroup: '',
      pedFluidGroup: '',
      lowerFlammabilityLimitKgm3: '',
      lowerFlammabilityLimitLbft3: '',
      autoIgnitionTemperature: '',
      criticalTemperature: '',
      criticalPressure: '',
      boilingPoint: '',
      triplePoint: '',
      nominalGlide: '',
      normalDensityKgm3: '',
      normalDensityLbft3: '',
      molecularMass: '',
      pressureMin: '',
      pressureMax: '',
      temperatureMin: '',
      temperatureMax: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      setError('Refrigerant name/number is required');
      return;
    }

    const upperName = formData.name.toUpperCase().trim();

    try {
      setIsLoading(true);
      const updatedFormData = { ...formData, name: upperName };

      if (editingData) {
        // Update existing refrigerant
        await updateExistingRefrigerant(upperName, updatedFormData);
        setMessage('✅ Refrigerant updated successfully!');
      } else {
        // Add new refrigerant
        await addNewRefrigerant(updatedFormData);
        setMessage('✅ Refrigerant added successfully!');
      }

      // Reset form and close after success
      resetForm();
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError('Error saving refrigerant: ' + (err.message || err));
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-form-page">
      {/* Header with back button */}
      <div className="mobile-form-header">
        <button
          className="mobile-form-back-btn"
          onClick={onClose}
          title="Go back"
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
        <h2 className="mobile-form-title">
          {editingData ? '✏️ Edit Refrigerant' : '➕ Add New Refrigerant'}
        </h2>
      </div>

      {/* Messages */}
      {message && (
        <div className="mobile-form-message success-message">
          {message}
        </div>
      )}
      {error && (
        <div className="mobile-form-message error-message">
          {error}
        </div>
      )}

      {/* Form Content */}
      <div className="mobile-form-content">
        <form onSubmit={handleSubmit} className="mobile-form">

          {/* Basic Information Section */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>

            <div className="form-group">
              <label>Refrigerant Name/Number *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., R404A"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>R Number</label>
              <input
                type="text"
                name="rNumber"
                value={formData.rNumber}
                onChange={handleInputChange}
                placeholder="e.g., R-404A"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Classification</label>
              <input
                type="text"
                name="classification"
                value={formData.classification}
                onChange={handleInputChange}
                placeholder="e.g., Zeotropic"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Class</label>
              <select
                name="class"
                value={formData.class}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="">Select Class</option>
                <option value="CFC">CFC</option>
                <option value="HFC">HFC</option>
                <option value="HFO">HFO</option>
                <option value="HCFC">HCFC</option>
                <option value="HC">HC</option>
                <option value="HFC/HFO">HFC/HFO</option>
                <option value="HFC/CO2">HFC/CO2</option>
                <option value="HFO/HFC/CO2">HFO/HFC/CO2</option>
              </select>
            </div>
          </div>

          {/* Chemical Information Section */}
          <div className="form-section">
            <h3 className="form-section-title">Chemical Information</h3>

            <div className="form-group">
              <label>Chemical Formula / Composition</label>
              <input
                type="text"
                name="chemicalFormula"
                value={formData.chemicalFormula}
                onChange={handleInputChange}
                placeholder="e.g., R-125/143a/134a (44/52/4)"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Chemical Blend Name</label>
              <input
                type="text"
                name="chemicalBlendName"
                value={formData.chemicalBlendName}
                onChange={handleInputChange}
                placeholder="e.g., HRC188C"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>CAS Number</label>
              <input
                type="text"
                name="casNumber"
                value={formData.casNumber}
                onChange={handleInputChange}
                placeholder="e.g., 354-33-6 or - for unknown"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Oil Type</label>
              <input
                type="text"
                name="oilType"
                value={formData.oilType}
                onChange={handleInputChange}
                placeholder="e.g., POE, MO/AB"
                className="form-input"
              />
            </div>
          </div>

          {/* Environmental Impact Section */}
          <div className="form-section">
            <h3 className="form-section-title">Environmental Impact (Optional)</h3>

            <div className="form-group">
              <label>GWP (AR4)</label>
              <input
                type="text"
                name="gwpAR4"
                value={formData.gwpAR4}
                onChange={handleInputChange}
                placeholder="Optional"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>GWP (AR5)</label>
              <input
                type="text"
                name="gwpAR5"
                value={formData.gwpAR5}
                onChange={handleInputChange}
                placeholder="Optional"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>GWP (AR6)</label>
              <input
                type="text"
                name="gwpAR6"
                value={formData.gwpAR6}
                onChange={handleInputChange}
                placeholder="Optional"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>ODP (Ozone Depletion Potential)</label>
              <input
                type="text"
                name="odp"
                value={formData.odp}
                onChange={handleInputChange}
                placeholder="Optional"
                className="form-input"
              />
            </div>

          </div>

          {/* Safety Information Section */}
          <div className="form-section">
            <h3 className="form-section-title">Safety Information</h3>

            <div className="form-group">
              <label>Safety Group</label>
              <select
                name="safetyGroup"
                value={formData.safetyGroup}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="">Select Safety Group</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="A2L">A2L</option>
                <option value="A3">A3</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="B3">B3</option>
              </select>
            </div>

            <div className="form-group">
              <label>PED Fluid Group</label>
              <input
                type="text"
                name="pedFluidGroup"
                value={formData.pedFluidGroup}
                onChange={handleInputChange}
                placeholder="e.g., 1, 2, 3"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Lower Flammability Limit (kg/m³)</label>
              <input
                type="text"
                name="lowerFlammabilityLimitKgm3"
                value={formData.lowerFlammabilityLimitKgm3}
                onChange={handleInputChange}
                placeholder="kg/m³"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Lower Flammability Limit (lb/ft³)</label>
              <input
                type="text"
                name="lowerFlammabilityLimitLbft3"
                value={formData.lowerFlammabilityLimitLbft3}
                onChange={handleInputChange}
                placeholder="lb/ft³"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Auto Ignition Temperature (°C)</label>
              <input
                type="text"
                name="autoIgnitionTemperature"
                value={formData.autoIgnitionTemperature}
                onChange={handleInputChange}
                placeholder="e.g., 1342"
                className="form-input"
              />
            </div>
          </div>

          {/* Critical Properties Section */}
          <div className="form-section">
            <h3 className="form-section-title">Critical Properties</h3>

            <div className="form-group">
              <label>Critical Temperature (°C)</label>
              <input
                type="text"
                name="criticalTemperature"
                value={formData.criticalTemperature}
                onChange={handleInputChange}
                placeholder="e.g., 161.8"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Critical Pressure (bar)</label>
              <input
                type="text"
                name="criticalPressure"
                value={formData.criticalPressure}
                onChange={handleInputChange}
                placeholder="e.g., 541.7"
                className="form-input"
              />
            </div>
          </div>

          {/* Thermodynamic Properties Section */}
          <div className="form-section">
            <h3 className="form-section-title">Thermodynamic Properties</h3>

            <div className="form-group">
              <label>Boiling Point (°C)</label>
              <input
                type="text"
                name="boilingPoint"
                value={formData.boilingPoint}
                onChange={handleInputChange}
                placeholder="e.g., -51.2"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Triple Point (°C)</label>
              <input
                type="text"
                name="triplePoint"
                value={formData.triplePoint}
                onChange={handleInputChange}
                placeholder="Optional"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Nominal Glide (°C)</label>
              <input
                type="text"
                name="nominalGlide"
                value={formData.nominalGlide}
                onChange={handleInputChange}
                placeholder="e.g., 1.35"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Normal Density (kg/m³)</label>
              <input
                type="text"
                name="normalDensityKgm3"
                value={formData.normalDensityKgm3}
                onChange={handleInputChange}
                placeholder="kg/m³"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Normal Density (lb/ft³)</label>
              <input
                type="text"
                name="normalDensityLbft3"
                value={formData.normalDensityLbft3}
                onChange={handleInputChange}
                placeholder="lb/ft³"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Molecular Mass (g/mol)</label>
              <input
                type="text"
                name="molecularMass"
                value={formData.molecularMass}
                onChange={handleInputChange}
                placeholder="e.g., 97.6"
                className="form-input"
              />
            </div>
          </div>

          {/* Pressure & Temperature Range Section */}
          <div className="form-section">
            <h3 className="form-section-title">Pressure & Temperature Range</h3>

            <div className="form-group">
              <label>Pressure Min (bar)</label>
              <input
                type="text"
                name="pressureMin"
                value={formData.pressureMin}
                onChange={handleInputChange}
                placeholder="e.g., 0.6"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Pressure Max (bar)</label>
              <input
                type="text"
                name="pressureMax"
                value={formData.pressureMax}
                onChange={handleInputChange}
                placeholder="e.g., 46.0"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Temperature Min (°C)</label>
              <input
                type="text"
                name="temperatureMin"
                value={formData.temperatureMin}
                onChange={handleInputChange}
                placeholder="e.g., -35"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Temperature Max (°C)</label>
              <input
                type="text"
                name="temperatureMax"
                value={formData.temperatureMax}
                onChange={handleInputChange}
                placeholder="e.g., 135"
                className="form-input"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="mobile-form-actions">
            <button
              type="submit"
              className="form-btn form-btn-save"
              disabled={isLoading}
            >
              <Save size={20} />
              {isLoading ? 'Saving...' : 'Save Refrigerant'}
            </button>
            <button
              type="button"
              className="form-btn form-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              <X size={20} />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MobileRefrigerantFormPage;
