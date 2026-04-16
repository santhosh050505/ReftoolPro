import React, { useState, useEffect, useContext } from 'react';
import { Plus, Edit2, Trash2, Save, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RefrigerantDataService from '../../services/refrigerantDataService';
import { getAllRefrigerants, addNewRefrigerant, updateExistingRefrigerant, deleteExistingRefrigerant } from '../../api';
import { DeviceContext } from '../../App';
import './AdminDashboard.css';
import './MobileAdminPage.css';

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

const MobileAdminPage = () => {
	const navigate = useNavigate();
	const [refrigerants, setRefrigerants] = useState([]);
	const [refrigerantList, setRefrigerantList] = useState(DEFAULT_REFRIGERANTS);
	const { deviceType } = useContext(DeviceContext) || { deviceType: 'desktop' };
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [searchQuery, setSearchQuery] = useState('');

	const [formData, setFormData] = useState({
		id: null,
		name: '',
		rNumber: '',
		classification: '',
		class: '',
		chemicalBlendName: '',
		chemicalFormula: '',
		casNumber: '',
		oilType: '',
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
		gwpAr4: '',
		gwpAr5: '',
		gwpAr6: '',
		odp: '',
		color: '',
		pressureMin: '',
		pressureMax: '',
		temperatureMin: '',
		temperatureMax: ''
	});

	// Load refrigerants on component mount
	useEffect(() => {
		loadRefrigerants();

		// Listen for storage changes (from other operations)
		const handleStorageChange = () => {
			loadRefrigerants();
		};
		window.addEventListener('storage', handleStorageChange);
		return () => window.removeEventListener('storage', handleStorageChange);
	}, []);

	// Prevent body scroll when component is mounted
	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	}, []);

	const loadRefrigerants = async () => {
		try {
			console.log('Loading refrigerants...');
			const data = await getAllRefrigerants();
			console.log('Received data:', data);
			
			if (data && Array.isArray(data)) {
				setRefrigerants(data);
				setError('');
			} else if (data && data.length === 0) {
				setRefrigerants([]);
				setError('');
			} else {
				console.warn('Unexpected data format:', data);
				setError('Failed to load refrigerants. Invalid data format.');
			}
		} catch (err) {
			console.error('Failed to load refrigerants:', err);
			setError(`Failed to load refrigerants: ${err.message}`);
			setRefrigerants([]);
		}
	};

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
			chemicalBlendName: '',
			chemicalFormula: '',
			casNumber: '',
			oilType: '',
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
			gwpAr4: '',
			gwpAr5: '',
			gwpAr6: '',
			odp: '',
			color: '',
			pressureMin: '',
			pressureMax: '',
			temperatureMin: '',
			temperatureMax: ''
		});
		setEditingId(null);
	};

	const handleAddRefrigerant = async (e) => {
		e.preventDefault();
		setError('');
		setMessage('');

		if (!formData.name.trim()) {
			setError('Refrigerant name is required');
			return;
		}

		// Trim the name but keep original case
		const trimmedName = formData.name.trim();

		// Validate that refrigerant name starts with R (case-insensitive)
		if (!trimmedName.toUpperCase().startsWith('R')) {
			setError('The refrigerant name should start with capital R');
			return;
		}

		// Validate pressure range values
		const pressureMin = formData.pressureMin ? parseFloat(formData.pressureMin) : null;
		const pressureMax = formData.pressureMax ? parseFloat(formData.pressureMax) : null;
		const temperatureMin = formData.temperatureMin ? parseFloat(formData.temperatureMin) : null;
		const temperatureMax = formData.temperatureMax ? parseFloat(formData.temperatureMax) : null;

		// Validate that min is not greater than max for pressure
		if (pressureMin !== null && pressureMax !== null) {
			if (pressureMin > pressureMax) {
				setError('Pressure minimum value cannot be greater than maximum value');
				return;
			}
		}

		// Validate that min is not greater than max for temperature
		if (temperatureMin !== null && temperatureMax !== null) {
			if (temperatureMin > temperatureMax) {
				setError('Temperature minimum value cannot be greater than maximum value');
				return;
			}
		}

		try {
			// Keep original case for the refrigerant name
			const updatedFormData = { ...formData, name: trimmedName };
			
			if (editingId) {
				// Update existing refrigerant via API using NAME (not ID)
				console.log('🔄 Updating refrigerant:', updatedFormData.name);
				await updateExistingRefrigerant(updatedFormData.name, updatedFormData);
				setMessage('Refrigerant updated successfully');
			} else {
				// Add new refrigerant via API
				console.log('➕ Adding new refrigerant:', updatedFormData.name);
				await addNewRefrigerant(updatedFormData);
				setMessage('Refrigerant added successfully');
			}
			resetForm();
			setShowForm(false);
			await loadRefrigerants();
		} catch (err) {
			console.error('Error saving refrigerant:', err);
			setError(err.message || 'Failed to save refrigerant');
		}
	};

	const handleEdit = (refrigerant) => {
		// Map all fields including GWP fields with both naming conventions
		// Ensure all fields are mapped properly for display
		const formattedData = {
			// Spread all existing fields first
			...refrigerant,
			
			// Explicitly map all form fields from formData state
			id: refrigerant.id || null,
			name: refrigerant.name || '',
			rNumber: refrigerant.rNumber || '',
			classification: refrigerant.classification || '',
			class: refrigerant.class || '',
			chemicalBlendName: refrigerant.chemicalBlendName || '',
			chemicalFormula: refrigerant.chemicalFormula || '',
			casNumber: refrigerant.casNumber || '',
			oilType: refrigerant.oilType || '',
			criticalTemperature: refrigerant.criticalTemperature || '',
			criticalPressure: refrigerant.criticalPressure || '',
			boilingPoint: refrigerant.boilingPoint || '',
			triplePoint: refrigerant.triplePoint || '',
			nominalGlide: refrigerant.nominalGlide || '',
			
			// Density fields
			normalDensity: refrigerant.normalDensity || '',
			normalDensityKgm3: refrigerant.normalDensityKgm3 || refrigerant.normal_density_kgm3 || '',
			normalDensityLbft3: refrigerant.normalDensityLbft3 || refrigerant.normal_density_lbft3 || '',
			molecularMass: refrigerant.molecularMass || '',
			
			// Safety fields
			safetyGroup: refrigerant.safetyGroup || '',
			pedFluidGroup: refrigerant.pedFluidGroup || '',
			
			// Flammability fields
			lowerFlammabilityLimit: refrigerant.lowerFlammabilityLimit || '',
			lowerFlammabilityLimitKgm3: refrigerant.lowerFlammabilityLimitKgm3 || refrigerant.lower_flammability_limit_kgm3 || '',
			lowerFlammabilityLimitLbft3: refrigerant.lowerFlammabilityLimitLbft3 || refrigerant.lower_flammability_limit_lbft3 || '',
			autoIgnitionTemperature: refrigerant.autoIgnitionTemperature || '',
			
			// GWP fields - handle both naming conventions
			gwpAr4: refrigerant.gwpAr4 || refrigerant.gwpAR4 || refrigerant.gwp_ar4 || '',
			gwpAr5: refrigerant.gwpAr5 || refrigerant.gwpAR5 || refrigerant.gwp_ar5 || '',
			gwpAr6: refrigerant.gwpAr6 || refrigerant.gwpAR6 || refrigerant.gwp_ar6 || '',
			odp: refrigerant.odp || '',
			color: refrigerant.color || '',
			
			// Range values - map from possible field names and ensure they're strings
			pressureMin: refrigerant.pressureMin !== undefined && refrigerant.pressureMin !== null ? String(refrigerant.pressureMin) : (refrigerant.pressure_min || ''),
			pressureMax: refrigerant.pressureMax !== undefined && refrigerant.pressureMax !== null ? String(refrigerant.pressureMax) : (refrigerant.pressure_max || ''),
			temperatureMin: refrigerant.temperatureMin !== undefined && refrigerant.temperatureMin !== null ? String(refrigerant.temperatureMin) : (refrigerant.temperature_min || ''),
			temperatureMax: refrigerant.temperatureMax !== undefined && refrigerant.temperatureMax !== null ? String(refrigerant.temperatureMax) : (refrigerant.temperature_max || '')
		};
		
		console.log('📋 Loading refrigerant for edit:', formattedData.name);
		console.log('📊 Formatted data:', formattedData);
		
		setFormData(formattedData);
		setEditingId(refrigerant.id);
		setShowForm(true);
		window.scrollTo(0, 0);
	};

	const handleDelete = async (id) => {
		if (window.confirm('Are you sure you want to delete this refrigerant?')) {
			try {
				setError('');
				setMessage('');
				
				// Find refrigerant by ID
				const refrigerant = refrigerants.find(r => r.id === id);
				
				if (!refrigerant) {
					setError('Refrigerant not found');
					return;
				}
				
				console.log('🗑️ Deleting refrigerant:', refrigerant.name);
				
				// Delete via API using name (not ID)
				await deleteExistingRefrigerant(refrigerant.name);
				setMessage('Refrigerant deleted successfully');
				await loadRefrigerants();
			} catch (err) {
				console.error('Delete error:', err);
				setError(err.message || 'Failed to delete refrigerant');
			}
		}
	};

	const handleGoBack = () => {
		navigate('/');
	};

	const filteredRefrigerants = refrigerants.filter(ref =>
		ref.name?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="mobile-admin-page">
			{/* Header */}
			<div className="mobile-admin-header">
				<button className="mobile-back-btn" onClick={handleGoBack}>
					<ArrowLeft size={24} />
				</button>
				<div className="mobile-header-content">
					<h1>Admin Control Panel</h1>
					<p>Manage Refrigerant Database</p>
				</div>
			</div>

			{/* Main Content */}
			<div className="mobile-admin-container">
				{/* Alert Messages */}
				{message && (
					<div className="alert alert-success">
						<span>{message}</span>
						<button onClick={() => setMessage('')} className="alert-close">×</button>
					</div>
				)}

				{error && (
					<div className="alert alert-error">
						<span>{error}</span>
						<button onClick={() => setError('')} className="alert-close">×</button>
					</div>
				)}

				{/* Action Buttons */}
				<div className="mobile-action-buttons">
					<button
						onClick={() => {
							resetForm();
							setShowForm(!showForm);
						}}
						className="mobile-btn mobile-btn-primary"
					>
						<Plus size={20} />
						{showForm ? 'Cancel' : 'Add Refrigerant'}
					</button>
					<button
						onClick={() => loadRefrigerants()}
						className="mobile-btn mobile-btn-secondary"
					>
						🔄 Refresh
					</button>
				</div>

				{/* Form Section */}
				{showForm && (
					<div className="mobile-form-section">
						<h3>{editingId ? '✏️ Edit Refrigerant' : '➕ Add New Refrigerant'}</h3>
						<form onSubmit={handleAddRefrigerant} className="mobile-admin-form">
							{/* Basic Information */}
							<div className="form-section-title">Basic Information</div>
							
							<div className="form-group">
								<label>Refrigerant Name/Number *</label>
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
								<label>R Number</label>
								<input
									type="text"
									name="rNumber"
									value={formData.rNumber}
									onChange={handleInputChange}
									placeholder="e.g., R-404A"
									className="admin-input"
								/>
							</div>

							<div className="form-row">
								<div className="form-group">
									<label>Classification</label>
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
									<label>Class</label>
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
							</div>

							<div className="form-group">
								<label>Chemical Formula / Composition</label>
								<input
									type="text"
									name="chemicalFormula"
									value={formData.chemicalFormula}
									onChange={handleInputChange}
									placeholder="e.g., HFC-125/143a/134a"
									className="admin-input"
								/>
							</div>

							<div className="form-group">
								<label>CAS Number</label>
								<input
									type="text"
									name="casNumber"
									value={formData.casNumber}
									onChange={handleInputChange}
									placeholder="e.g., 50-00-0"
									className="admin-input"
								/>
							</div>

							<div className="form-group">
								<label>Oil Type</label>
								<input
									type="text"
									name="oilType"
									value={formData.oilType}
									onChange={handleInputChange}
									placeholder="e.g., POE"
									className="admin-input"
								/>
							</div>

							{/* Thermodynamic Properties */}
							<div className="form-section-title">Thermodynamic Properties</div>

							<div className="form-row">
								<div className="form-group">
									<label>Critical Temperature (°F)</label>
									<input
										type="number"
										name="criticalTemperature"
										value={formData.criticalTemperature}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>Critical Pressure (Psi)</label>
									<input
										type="number"
										name="criticalPressure"
										value={formData.criticalPressure}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							<div className="form-row">
								<div className="form-group">
									<label>Boiling Point (°F)</label>
									<input
										type="number"
										name="boilingPoint"
										value={formData.boilingPoint}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>Triple Point (°F)</label>
									<input
										type="number"
										name="triplePoint"
										value={formData.triplePoint}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							<div className="form-group">
								<label>Nominal Glide (K)</label>
								<input
									type="number"
									name="nominalGlide"
									value={formData.nominalGlide}
									onChange={handleInputChange}
									className="admin-input"
									step="0.01"
								/>
							</div>

							{/* Density */}
							<div className="form-section-title">Density</div>

							<div className="form-row">
								<div className="form-group">
									<label>Normal Density (kg/m³)</label>
									<input
										type="number"
										name="normalDensityKgm3"
										value={formData.normalDensityKgm3}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>Normal Density (lb/ft³)</label>
									<input
										type="number"
										name="normalDensityLbft3"
										value={formData.normalDensityLbft3}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							<div className="form-group">
								<label>Molecular Mass (g/mol)</label>
								<input
									type="number"
									name="molecularMass"
									value={formData.molecularMass}
									onChange={handleInputChange}
									className="admin-input"
									step="0.01"
								/>
							</div>

							{/* Safety Information */}
							<div className="form-section-title">Safety Information</div>

							<div className="form-group">
								<label>Safety Group</label>
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
								<label>PED Fluid Group</label>
								<input
									type="text"
									name="pedFluidGroup"
									value={formData.pedFluidGroup}
									onChange={handleInputChange}
									className="admin-input"
								/>
							</div>

							<div className="form-row">
								<div className="form-group">
									<label>Lower Flammability Limit (kg/m³)</label>
									<input
										type="number"
										name="lowerFlammabilityLimitKgm3"
										value={formData.lowerFlammabilityLimitKgm3}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>Lower Flammability Limit (lb/ft³)</label>
									<input
										type="number"
										name="lowerFlammabilityLimitLbft3"
										value={formData.lowerFlammabilityLimitLbft3}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							<div className="form-group">
								<label>Auto Ignition Temperature (°F)</label>
								<input
									type="number"
									name="autoIgnitionTemperature"
									value={formData.autoIgnitionTemperature}
									onChange={handleInputChange}
									className="admin-input"
									step="0.01"
								/>
							</div>

							{/* Environmental Impact */}
							<div className="form-section-title">Environmental Impact</div>

							<div className="form-row">
								<div className="form-group">
									<label>GWP (AR4)</label>
									<input
										type="number"
										name="gwpAr4"
										value={formData.gwpAr4}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>GWP (AR5)</label>
									<input
										type="number"
										name="gwpAr5"
										value={formData.gwpAr5}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							<div className="form-row">
								<div className="form-group">
									<label>GWP (AR6)</label>
									<input
										type="number"
										name="gwpAr6"
										value={formData.gwpAr6}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>ODP</label>
									<input
										type="number"
										name="odp"
										value={formData.odp}
										onChange={handleInputChange}
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							<div className="form-group">
								<label>Color</label>
								<input
									type="text"
									name="color"
									value={formData.color}
									onChange={handleInputChange}
									placeholder="e.g., Colorless"
									className="admin-input"
								/>
							</div>

							{/* Pressure & Temperature Range */}
							<div className="form-section-title">Pressure & Temperature Range</div>

							<div className="form-row">
								<div className="form-group">
									<label>Pressure Min (bar)</label>
									<input
										type="number"
										name="pressureMin"
										value={formData.pressureMin}
										onChange={handleInputChange}
										placeholder="e.g., 0.6"
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>Pressure Max (bar)</label>
									<input
										type="number"
										name="pressureMax"
										value={formData.pressureMax}
										onChange={handleInputChange}
										placeholder="e.g., 46.0"
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							<div className="form-row">
								<div className="form-group">
									<label>Temperature Min (°C)</label>
									<input
										type="number"
										name="temperatureMin"
										value={formData.temperatureMin}
										onChange={handleInputChange}
										placeholder="e.g., -35"
										className="admin-input"
										step="0.01"
									/>
								</div>
								<div className="form-group">
									<label>Temperature Max (°C)</label>
									<input
										type="number"
										name="temperatureMax"
										value={formData.temperatureMax}
										onChange={handleInputChange}
										placeholder="e.g., 135"
										className="admin-input"
										step="0.01"
									/>
								</div>
							</div>

							{/* Form Actions */}
							<div className="form-actions">
								<button type="submit" className="admin-btn admin-btn-save">
									<Save size={18} />
									{editingId ? 'Update' : 'Add'} Refrigerant
								</button>
								<button type="button" onClick={resetForm} className="admin-btn admin-btn-cancel">
									<X size={18} />
									Cancel
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Search Bar */}
				{!showForm && refrigerants.length > 0 && (
					<div className="mobile-search-section">
						<input
							type="text"
							placeholder="Search refrigerants..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="mobile-search-input"
						/>
					</div>
				)}

				{/* Refrigerant List */}
				{!showForm && (
					<div className="mobile-refrigerant-list">
						{filteredRefrigerants.length > 0 ? (
							<div className="list-items">
								{filteredRefrigerants.map((refrigerant) => (
									<div key={refrigerant.id} className="list-item">
										<div className="item-info">
											<h4>{refrigerant.name}</h4>
											<p>{refrigerant.classification && `${refrigerant.classification} - `}{refrigerant.class}</p>
										</div>
										<div className="item-actions">
											<button
												onClick={() => handleEdit(refrigerant)}
												className="item-btn edit-btn"
												title="Edit"
											>
												<Edit2 size={18} />
											</button>
											<button
												onClick={() => handleDelete(refrigerant.id)}
												className="item-btn delete-btn"
												title="Delete"
											>
												<Trash2 size={18} />
											</button>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="empty-state">
								<p>No refrigerants found</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default MobileAdminPage;
