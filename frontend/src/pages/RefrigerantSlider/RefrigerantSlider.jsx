import React, { useState, useEffect, useContext, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import RefrigerantInfo from "../../components/RefrigerantInfo/RefrigerantInfo";
import InputPanel from "../../components/InputPanel/InputPanel";
import RefrigerantDrawer from "../../components/RefrigerantDrawer/RefrigerantDrawer";
import { getAllRefrigerants } from "../../api";
import { DeviceContext } from "../../App";
import { useProject } from "../../context/ProjectContext";
import { useToast } from "../../context/ToastContext";
// import StatePanel from "../../components/StatePanel/StatePanel";
import "./RefrigerantSlider.css";

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

const RefrigerantSlider = forwardRef(({ userRole, userMode, pressureUnit, temperatureUnit, distanceUnit, altitude, ambientPressureData, isAbsolute, onIsAbsoluteChange }, ref) => {
	const inputPanelRef = useRef(null);

	useImperativeHandle(ref, () => ({
		exportCalculationState: () => inputPanelRef.current?.exportCalculationState?.()
	}));

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
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [refrigerants, setRefrigerants] = useState(DEFAULT_REFRIGERANTS);
	const { deviceType } = useContext(DeviceContext) || { deviceType: 'desktop' };

	const { activeProject } = useProject();
	const { addToast } = useToast();

	// Enforce project locks proactively
	const handleRefrigerantChange = useCallback((newRef) => {
		if (activeProject && activeProject.lockedRefrigerant && activeProject.lockedRefrigerant !== '-') {
			const locked = activeProject.lockedRefrigerant.split('(')[0].trim().toUpperCase();
			const selected = newRef.split('(')[0].trim().toUpperCase();

			if (locked !== selected) {
				alert(`Only this refrigerant and these units are allowed for this project: ${activeProject.lockedRefrigerant}, ${activeProject.lockedPressureUnit} and °${activeProject.lockedTemperatureUnit === 'fahrenheit' ? 'F' : 'C'}.\n\nPlease use the already selected refrigerant: ${activeProject.lockedRefrigerant}`);
				return;
			}
		}
		setSelectedRefrigerant(newRef);
	}, [activeProject]);

	// Load refrigerants from API on mount and poll for updates
	useEffect(() => {
		const loadRefrigerants = async () => {
			try {
				const response = await getAllRefrigerants();
				// getAllRefrigerants now returns the array directly
				if (Array.isArray(response) && response.length > 0) {
					// Extract refrigerant names from API and combine with defaults
					const apiNames = response.map(r => r.name || r.rNumber).filter(Boolean);
					const combined = Array.from(new Set([...apiNames, ...DEFAULT_REFRIGERANTS])).sort();
					setRefrigerants(combined);
					console.log('✅ Refrigerants loaded from API:', combined.length);
				} else {
					setRefrigerants(DEFAULT_REFRIGERANTS);
				}
			} catch (err) {
				console.warn('Error loading refrigerants from API, using defaults:', err);
				setRefrigerants(DEFAULT_REFRIGERANTS);
			}
		};

		// Load immediately on mount
		loadRefrigerants();
	}, []);

	// Disable copy and paste for user dashboard
	useEffect(() => {
		const handleCopy = (e) => {
			if (userRole !== 'admin') {
				e.preventDefault();
				alert('Copy is disabled in user dashboard');
			}
		};

		const handlePaste = (e) => {
			if (userRole !== 'admin') {
				e.preventDefault();
				alert('Paste is disabled in user dashboard');
			}
		};

		const handleContextMenu = (e) => {
			if (userRole !== 'admin') {
				e.preventDefault();
				alert('Right-click is disabled in user dashboard');
			}
		};

		document.addEventListener('copy', handleCopy);
		document.addEventListener('paste', handlePaste);
		document.addEventListener('contextmenu', handleContextMenu);

		return () => {
			document.removeEventListener('copy', handleCopy);
			document.removeEventListener('paste', handlePaste);
			document.removeEventListener('contextmenu', handleContextMenu);
		};
	}, [userRole]);

	return (
		<div className={`refrigerant-slider-grid ${deviceType === 'mobile' ? 'mobile-layout' : 'desktop-layout'}`}>
			{/* Sidebar removed as per request */}
			<div />
			<RefrigerantInfo
				selectedRefrigerant={selectedRefrigerant}
				temperatureUnit={temperatureUnit}
				pressureUnit={pressureUnit}
			/>
			<InputPanel
				ref={inputPanelRef}
				initialRefrigerant={selectedRefrigerant}
				userMode={userMode}
				onRefrigerantChange={handleRefrigerantChange}
				onOpenDrawer={() => setIsDrawerOpen(true)}
				pressureUnit={pressureUnit}
				temperatureUnit={temperatureUnit}
				distanceUnit={distanceUnit}
				altitude={altitude}
				ambientPressureData={ambientPressureData}
				isAbsolute={isAbsolute}
				onIsAbsoluteChange={onIsAbsoluteChange}
			/>
			<RefrigerantDrawer
				open={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				refrigerants={refrigerants}
				onSelect={handleRefrigerantChange}
				selected={selectedRefrigerant}
			/>
		</div>
	);
});

RefrigerantSlider.displayName = 'RefrigerantSlider';

export default RefrigerantSlider;
