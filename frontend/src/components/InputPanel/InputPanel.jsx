// frontend/src/components/InputPanel/InputPanel.jsx
import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { calculatePressure, calculateTemperature } from '../../api';
import RefrigerantDataService from '../../services/refrigerantDataService';
import refrigerantRangeService from '../../services/refrigerantRangeService';
import unitConversionService from '../../services/unitConversionService';
import {
  clampPressureToLimits,
  clampTemperatureToLimits,
  clearConversionCache
} from '../../utils/conversionOptimizer';
import { debounce } from '../../utils/debounce';
import WelcomeCard from '../WelcomeCard/WelcomeCard';
import { createHistory } from '../../services/historyApiService';
import { Info } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import './InputPanel.css';

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

const TEMPERATURE_UNITS = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' }
];

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const InputPanel = forwardRef(({
  initialRefrigerant = 'R407C',
  onRefrigerantChange = null,
  onOpenDrawer = null,
  pressureUnit = 'bar',
  temperatureUnit = 'celsius',
  distanceUnit = 'meters',
  altitude = 0,
  ambientPressureData = null,
  userMode = 'dashboard',
  isAbsolute = true,
  onIsAbsoluteChange = null
}, ref) => {
  const { selectCalculation } = useProject();
  const [selectedRefrigerant, setSelectedRefrigerant] = useState(initialRefrigerant);
  const [showRefrigerantList, setShowRefrigerantList] = useState(false);
  const [pressure, setPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [defineStateCycle, setDefineStateCycle] = useState(null);

  // Dew/Bubble toggle - enabled for R4xx series only
  const [isDew, setIsDew] = useState(true);

  // UI state for help modals and feedback
  const [showDewBubbleHelp, setShowDewBubbleHelp] = useState(false);
  const [showAbsoluteGaugeHelp, setShowAbsoluteGaugeHelp] = useState(false);
  const [showRangeHelp, setShowRangeHelp] = useState(false);
  const [rangeHelpData, setRangeHelpData] = useState({ title: '', min: '', max: '', unit: '' });
  const [calculationStatus, setCalculationStatus] = useState(null);

  // Load refrigerants from service (dynamic list that updates on CRUD changes)
  const [refrigerants, setRefrigerants] = useState(DEFAULT_REFRIGERANTS);
  const [lastEditedField, setLastEditedField] = useState('pressure');

  // Real-time validation status
  const [pressureStatus, setPressureStatus] = useState('neutral'); // 'valid' | 'invalid' | 'neutral'
  const [temperatureStatus, setTemperatureStatus] = useState('neutral'); // 'valid' | 'invalid' | 'neutral'

  // ✅ SOURCE OF TRUTH: Absolute Pressure in Bar
  const [absPressureBar, setAbsPressureBar] = useState(null);
  const [atmOffsetBar, setAtmOffsetBar] = useState(1.01325);
  const isSyncingRef = useRef(false);

  // Welcome card for first-time users
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('hasVisitedRefToolsPro');
  });

  // Ref to track if we are currently loading a calculation from session storage
  // This prevents the "refrigerant change" effect from clearing fields during the load process
  const isLoadingFromStorageRef = useRef(false);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    exportCalculationState: () => {
      // Return absolute pressure value if we have it, converting back to display unit if needed
      // Actually, returns whatever is in the field and the current mode - but with our sync, 
      // these are derived from the same source of truth.
      return {
        refrigerant: selectedRefrigerant,
        pressure: parseFloat(pressure) || 0,
        temperature: parseFloat(temperature) || 0,
        isDew,
        isAbsolute
      };
    }
  }));

  // Load calculation from session storage (when double-clicked in ProjectDashboard or restored from draft)
  useEffect(() => {
    const loadData = sessionStorage.getItem('loadCalculationData');
    const draftData = sessionStorage.getItem('activeCalculatorDraft');

    // Priority 1: Explicit load from project dashboard
    // Priority 2: Restore previous work (draft) from current session
    const rawData = loadData || draftData;

    if (rawData) {
      try {
        const calc = JSON.parse(rawData);
        isLoadingFromStorageRef.current = true;

        // Set all calculation state
        if (calc.refrigerant) {
          setSelectedRefrigerant(calc.refrigerant);
          if (onRefrigerantChange) {
            onRefrigerantChange(calc.refrigerant);
          }
        }
        if (calc.pressure !== undefined) {
          setPressure(calc.pressure.toString());
          const val = parseFloat(calc.pressure);

          if (!isNaN(val)) {
            // Initialize source of truth ref
            const targetIsAbs = calc.isAbsolute !== undefined ? calc.isAbsolute : isAbsolute;
            unitConversionService.convertPressure(val, mapPressureUnitToJsonKey(pressureUnit), 'bar')
              .then(barVal => {
                setAbsPressureBar(targetIsAbs ? barVal : barVal + atmOffsetBar);
              });
          } else {
            setAbsPressureBar(null);
          }
        }
        if (calc.temperature !== undefined) {
          setTemperature(calc.temperature.toString());
        }
        if (calc.isDew !== undefined) {
          setIsDew(calc.isDew);
        }
        if (calc.isAbsolute !== undefined) {
          if (onIsAbsoluteChange) onIsAbsoluteChange(calc.isAbsolute);
        }
        if (calc.defineStateCycle) {
          setDefineStateCycle(calc.defineStateCycle);
        }

        // Sync with ProjectContext if it has an ID
        if (calc._id) {
          selectCalculation(calc);
        }

        // If it was an explicit load, clear it so it doesn't re-trigger on reload
        if (loadData) {
          sessionStorage.removeItem('loadCalculationData');
          console.log('✅ Calculation loaded from project:', calc.name || 'Unnamed');
        } else {
          console.log('🔄 Calculator state restored from draft');
        }

        // Reset the loading flag after a short delay to allow effects to finish
        setTimeout(() => {
          isLoadingFromStorageRef.current = false;
        }, 300);
      } catch (error) {
        console.error('Failed to load calculation:', error);
        sessionStorage.removeItem('loadCalculationData');
        isLoadingFromStorageRef.current = false;
      }
    }
  }, [onRefrigerantChange, selectCalculation]);

  // Persist current state as a "draft" whenever any key field changes
  // This ensures data is not lost when navigating to projects page and back
  useEffect(() => {
    // Don't save if we are currently loading (would be redundant or catch partial state)
    if (isLoadingFromStorageRef.current) return;

    const draft = {
      refrigerant: selectedRefrigerant,
      pressure,
      temperature,
      isDew,
      isAbsolute,
      defineStateCycle,
      timestamp: Date.now()
    };
    sessionStorage.setItem('activeCalculatorDraft', JSON.stringify(draft));
  }, [selectedRefrigerant, pressure, temperature, isDew, isAbsolute, defineStateCycle]);

  // Sync selectedRefrigerant when initialRefrigerant prop changes (from drawer selection)
  useEffect(() => {
    if (initialRefrigerant && initialRefrigerant !== selectedRefrigerant) {
      setSelectedRefrigerant(initialRefrigerant);
    }
  }, [initialRefrigerant, selectedRefrigerant]);

  // Helper function to check if refrigerant is R4xx series
  const isR4Series = (refrigerantName) => {
    if (!refrigerantName) return false;
    // Extract the number part from refrigerant name (e.g., "R407C" -> "407")
    const match = refrigerantName.match(/R(\d+)/i);
    if (!match) return false;
    const number = parseInt(match[1]);
    // R4xx series: R400-R499
    return number >= 400 && number < 500;
  };

  // Helper function to check if pressure unit disables absolute/gauge toggle
  const isPressureUnitRestricted = (unit) => {
    const restrictedUnits = ['Pa', 'µmHg', 'atm'];
    return restrictedUnits.includes(unit);
  };

  // Determine if toggles should be enabled based on refrigerant and pressure unit
  const dewBubbleEnabled = isR4Series(selectedRefrigerant);
  const absoluteGaugeEnabled = !isPressureUnitRestricted(pressureUnit);

  // State for atmospheric pressure offset in current unit
  const [atmOffset, setAtmOffset] = useState(1.01325); // Default to sea level bar

  // Calculate ATM offset whenever pressure unit or ambient data changes
  useEffect(() => {
    const updateOffset = async () => {
      // Map display units to Excel column names in newdata.xlsx
      const unitMapping = {
        'bar': 'bar', 'psi': 'psi', 'Pa': 'Pa', 'kPa': 'kPa', 'MPa': 'mpa',
        'atm': 'atm', 'at': 'at', 'mmHg': 'mm Hg', 'µmHg': 'µm Hg', 'inHg': 'In Hg'
      };

      const colName = unitMapping[pressureUnit] || pressureUnit;

      // 1. Get Offset in Bar first (for internal calculations)
      let offsetBar = 1.01325;
      if (ambientPressureData && ambientPressureData['bar'] !== undefined) {
        offsetBar = parseFloat(ambientPressureData['bar']);
      }
      setAtmOffsetBar(offsetBar);

      // 2. Get Offset in display unit
      if (ambientPressureData && ambientPressureData[colName] !== undefined) {
        setAtmOffset(parseFloat(ambientPressureData[colName]));
      } else {
        try {
          const jsonUnit = mapPressureUnitToJsonKey(pressureUnit);
          let offset = offsetBar;
          if (jsonUnit !== 'bar') {
            offset = await unitConversionService.convertPressure(offsetBar, 'bar', jsonUnit);
          }
          setAtmOffset(offset);
        } catch (e) {
          console.error("Error calculating fallback ATM offset:", e);
        }
      }
    };
    updateOffset();
  }, [pressureUnit, ambientPressureData]);

  // Handle Display Update when Mode, Unit or Source of Truth Changes
  useEffect(() => {
    // DO NOT overwrite if user is currently typing in the pressure box
    if (isLoadingFromStorageRef.current || isSyncingRef.current) return;
    if (absPressureBar === null) return;

    // Check if pressure input is currently focused
    const isPressureFocused = document.activeElement?.closest('.input-group')?.querySelector('input[placeholder*="Pressure"]');
    if (isPressureFocused) return;

    const updateDisplay = async () => {
      try {
        const jsonPressureUnit = mapPressureUnitToJsonKey(pressureUnit);

        // Convert Abs Bar to display pressure
        let displayValue = await unitConversionService.convertPressure(absPressureBar, 'bar', jsonPressureUnit);

        if (!isAbsolute) {
          // Absolute Bar -> Gauge in target unit
          displayValue = displayValue - atmOffset;
        }

        const currentDisplayValue = parseFloat(pressure);
        if (isNaN(currentDisplayValue) || Math.abs(currentDisplayValue - displayValue) > 0.001) {
          setPressure(displayValue.toFixed(2));
        }
      } catch (e) {
        console.error("Sync error:", e);
      }
    };
    updateDisplay();
  }, [isAbsolute, atmOffset, pressureUnit, absPressureBar]);

  // Auto-reset toggles when they become disabled
  useEffect(() => {
    if (!dewBubbleEnabled && !isDew) {
      setIsDew(true);
    }
  }, [dewBubbleEnabled, isDew]);

  useEffect(() => {
    if (!absoluteGaugeEnabled && !isAbsolute) {
      if (onIsAbsoluteChange) onIsAbsoluteChange(true);
    }
  }, [absoluteGaugeEnabled, isAbsolute]);

  // Available modes based on refrigerant
  const [absoluteEnabled, setAbsoluteEnabled] = useState(true);
  const [gaugeEnabled, setGaugeEnabled] = useState(true);

  // Limits for current refrigerant and units
  const [limits, setLimits] = useState({
    minPressure: 0,
    maxPressure: 1000,
    minTemperature: -100,
    maxTemperature: 200
  });

  const pressureInputRef = useRef(null);
  const temperatureInputRef = useRef(null);
  const lastCalculatedRef = useRef({ pressure: '', temperature: '' });
  const previousPressureUnitRef = useRef(pressureUnit);
  const previousTemperatureUnitRef = useRef(temperatureUnit);

  // Create debounced calculation functions
  const debouncedCalculateTemperature = useRef(null);
  const debouncedCalculatePressure = useRef(null);

  const mapTemperatureUnitToJsonKey = (unit) => {
    if (unit === 'celsius' || unit === 'C') return 'C';
    if (unit === 'fahrenheit' || unit === 'F') return 'F';
    return unit; // fallback
  };

  const mapPressureUnitToJsonKey = (unit) => {
    // Map display unit names to JSON file keys
    const unitMap = {
      'bar': 'bar',
      'psi': 'psi',
      'Pa': 'Pa',
      'kPa': 'kPa',
      'MPa': 'MPa',
      'atm': 'atm',
      'mmHg': 'mmHg',
      'µmHg': 'micron',  // µmHg symbol maps to 'micron' in JSON formulas
      'inHg': 'inHg',
      'at': 'at'
    };
    return unitMap[unit] || unit; // Default to unit itself if not in map
  };

  // Convert refrigerant display name to API format
  const convertRefrigerantToApiFormat = (refName) => {
    if (!refName) return '';

    const lowerName = refName.trim().toLowerCase();

    // Preserve (E) and (Z) suffixes for isomers
    if (lowerName.endsWith('(e)') || lowerName.endsWith('(z)')) {
      return lowerName;
    }

    // Extract part before parenthesis and normalize (e.g., "R1150 (Ethylene)" -> "r1150")
    const shortName = refName.split('(')[0].trim();
    return shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Calculate temperature from pressure with specific units
  // ✅ Flow: Display unit → Range validation → API (with display units) → Convert result to display unit
  const calculateTemperatureWithUnits = async (pressureValue, pUnit, tUnit) => {
    // Skip if pressure is empty
    if (!pressureValue || pressureValue === '') {
      setError(null);
      return;
    }

    const numValue = parseFloat(pressureValue);
    if (isNaN(numValue)) {
      setError('Invalid pressure value');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const jsonPressureUnit = mapPressureUnitToJsonKey(pUnit);

      // ✅ FIX: Convert gauge to absolute before validation
      // Range validation expects ABSOLUTE pressure, but user might input GAUGE
      let pressureForValidation = numValue;
      if (!isAbsolute) {
        // Gauge mode: convert to absolute for validation
        // Absolute = Gauge + Atmospheric
        pressureForValidation = numValue + atmOffset;
      }

      const validation = await refrigerantRangeService.validatePressure(
        selectedRefrigerant,
        pressureForValidation,  // Use absolute pressure for validation
        jsonPressureUnit
      );
      if (!validation.valid) {
        setError(validation.message);
        setPressure('');
        setTemperature('');
        setLoading(false);
        return;
      }

      const apiRefrigerant = convertRefrigerantToApiFormat(selectedRefrigerant);

      const result = await calculateTemperature({
        pressure: numValue,
        pressureUnit: pUnit,
        temperatureUnit: tUnit,
        refrigerant: apiRefrigerant,
        isDew: isDew,
        isAbsolute: isAbsolute,
        atmOffset: atmOffsetBar // Send offset in BAR
      });

      if (result.success) {
        const calculatedTemp = result.temperature.toFixed(2);
        setTemperature(calculatedTemp);

        // Sync absolute pressure (Source of Truth)
        const resPressBar = await unitConversionService.convertPressure(result.pressure, mapPressureUnitToJsonKey(pUnit), 'bar');
        setAbsPressureBar(isAbsolute ? resPressBar : resPressBar + atmOffsetBar);

        lastCalculatedRef.current = { pressure: numValue.toString(), temperature: calculatedTemp };

        // Save to History automatically ONLY in Quick Slide mode
        if (userMode === 'dashboard') {
          createHistory({
            refrigerant: selectedRefrigerant,
            pressure: numValue,
            pressureUnit: pUnit,
            temperature: result.temperature,
            temperatureUnit: tUnit,
            distanceUnit,
            altitude,
            ambientPressureData,
            isDew,
            isAbsolute,
            name: `Calc: ${selectedRefrigerant}`
          }).catch(err => console.error('Failed to auto-save history:', err));
        }
      } else {
        setError('Failed to calculate temperature');
      }
    } catch (err) {
      console.error('API Error:', err);
      setError('Error connecting to API. Please ensure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const calculatePressureWithUnits = async (tempValue, tUnit, pUnit) => {
    // Skip if temperature is empty
    if (!tempValue || tempValue === '') {
      setError(null);
      return;
    }

    const numValue = parseFloat(tempValue);
    if (isNaN(numValue)) {
      setError('Invalid temperature value');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const jsonTemperatureUnit = mapTemperatureUnitToJsonKey(tUnit);

      const validation = await refrigerantRangeService.validateTemperature(selectedRefrigerant, numValue, jsonTemperatureUnit);
      if (!validation.valid) {
        setError(validation.message);
        setPressure('');
        setTemperature('');
        setLoading(false);
        return;
      }

      const apiRefrigerant = convertRefrigerantToApiFormat(selectedRefrigerant);

      const result = await calculatePressure({
        temperature: numValue,
        temperatureUnit: tUnit,
        pressureUnit: pUnit,
        refrigerant: apiRefrigerant,
        isDew: isDew,
        isAbsolute: isAbsolute,
        atmOffset: atmOffsetBar // Send offset in BAR
      });

      if (result.success) {
        const calculatedPressure = result.pressure.toFixed(2);
        setPressure(calculatedPressure);

        // Sync absolute pressure (Source of Truth)
        const resPressBar = await unitConversionService.convertPressure(result.pressure, mapPressureUnitToJsonKey(pUnit), 'bar');
        setAbsPressureBar(isAbsolute ? resPressBar : resPressBar + atmOffsetBar);

        lastCalculatedRef.current = { pressure: calculatedPressure, temperature: numValue.toString() };

        // Save to History automatically ONLY in Quick Slide mode
        if (userMode === 'dashboard') {
          createHistory({
            refrigerant: selectedRefrigerant,
            pressure: result.pressure,
            pressureUnit: pUnit,
            temperature: numValue,
            temperatureUnit: tUnit,
            distanceUnit,
            altitude,
            ambientPressureData,
            isDew,
            isAbsolute,
            name: `Calc: ${selectedRefrigerant}`
          }).catch(err => console.error('Failed to auto-save history:', err));
        }
      } else {
        setError('Failed to calculate pressure');
      }
    } catch (err) {
      console.error('API Error:', err);
      setError('Error connecting to API. Please ensure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Use refs to store the latest calculation functions
  // This prevents stale closures in debounced calls where the function might 
  // be captured from an older render with a different selectedRefrigerant.
  const calculateTemperatureRef = useRef(null);
  const calculatePressureRef = useRef(null);

  useEffect(() => {
    calculateTemperatureRef.current = calculateTemperatureWithUnits;
  }, [calculateTemperatureWithUnits]);

  useEffect(() => {
    calculatePressureRef.current = calculatePressureWithUnits;
  }, [calculatePressureWithUnits]);


  // Load refrigerants from service on mount and whenever localStorage changes
  useEffect(() => {
    const loadRefrigerants = () => {
      try {
        const allRefrigerants = RefrigerantDataService.getAllRefrigerants();
        if (allRefrigerants && allRefrigerants.length > 0) {
          // Extract refrigerant names from service and combine with defaults
          const serviceNames = allRefrigerants.map(r => r.name || r.rNumber).filter(Boolean);
          const combined = Array.from(new Set([...serviceNames, ...DEFAULT_REFRIGERANTS])).sort();
          setRefrigerants(combined);
        } else {
          setRefrigerants(DEFAULT_REFRIGERANTS);
        }
      } catch (err) {
        console.warn('Error loading refrigerants from service, using defaults:', err);
        setRefrigerants(DEFAULT_REFRIGERANTS);
      }
    };

    loadRefrigerants();

    // Listen for localStorage changes (from admin CRUD operations)
    const handleStorageChange = (e) => {
      if (e.key === 'mainRefrigerantDatabase' || e.key === 'userRefrigerants') {
        loadRefrigerants();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  // Fetch metadata for current refrigerant and units
  const fetchMetadata = async (pUnit = pressureUnit, tUnit = temperatureUnit) => {
    try {
      const jsonPressureUnit = mapPressureUnitToJsonKey(pUnit);
      const jsonTemperatureUnit = mapTemperatureUnitToJsonKey(tUnit);
      // Ranges are fetched via API through the service
      const pressureRange = await refrigerantRangeService.getPressureRange(selectedRefrigerant, jsonPressureUnit);
      const temperatureRange = await refrigerantRangeService.getTemperatureRange(selectedRefrigerant, jsonTemperatureUnit);

      if (!pressureRange) {
        console.warn(`⚠️ Pressure range not found for ${selectedRefrigerant} in ${jsonPressureUnit}`);
      }
      if (!temperatureRange) {
        console.warn(`⚠️ Temperature range not found for ${selectedRefrigerant} in ${jsonTemperatureUnit}`);
      }

      if (!pressureRange || !temperatureRange) {
        console.warn(`⚠️ Range data not found for ${selectedRefrigerant}`);
        return {
          pressureMin: 0,
          pressureMax: 1000,
          temperatureMin: -100,
          temperatureMax: 200
        };
      }

      const newLimits = {
        minPressure: pressureRange.min,
        maxPressure: pressureRange.max,
        minTemperature: temperatureRange.min,
        maxTemperature: temperatureRange.max
      };

      setLimits(newLimits);

      // Set available modes (assuming all are supported for now)
      setAbsoluteEnabled(true);
      setGaugeEnabled(true);
      return newLimits;
    } catch (err) {
      console.error('Range fetch error:', err);
      return {
        minPressure: 0,
        maxPressure: 1000,
        minTemperature: -100,
        maxTemperature: 200
      };
    }
  };

  // Fetch metadata when refrigerant changes (not units - handled separately)
  useEffect(() => {
    // If we are currently loading a calculation from storage, DO NOT clear the fields
    // This fixed the race condition where loading a calculation would immediately
    // be overwritten by these clear calls.
    if (isLoadingFromStorageRef.current) {
      fetchMetadata();
      return;
    }

    // Clear input fields when refrigerant changes manually
    setPressure('');
    setTemperature('');
    setPressureStatus('neutral');
    setTemperatureStatus('neutral');
    setAbsPressureBar(null);
    lastCalculatedRef.current = { pressure: '', temperature: '' };
    setError(null);

    // ✅ Cancel any pending debounced calculations
    if (debouncedCalculateTemperature.current) {
      debouncedCalculateTemperature.current.cancel();
    }
    if (debouncedCalculatePressure.current) {
      debouncedCalculatePressure.current.cancel();
    }

    fetchMetadata();
  }, [selectedRefrigerant]);

  // Handle pressure unit tracking for other components that might need it
  useEffect(() => {
    previousPressureUnitRef.current = pressureUnit;
  }, [pressureUnit]);

  useEffect(() => {
    if (pressure === '') {
      setPressureStatus('neutral');
    }
  }, [pressure]);

  useEffect(() => {
    if (temperature === '') {
      setTemperatureStatus('neutral');
    }
  }, [temperature]);

  useEffect(() => {
    // Handle temperature unit changes - convert existing temperature value FAST
    if (isLoadingFromStorageRef.current) {
      previousTemperatureUnitRef.current = temperatureUnit;
      return;
    }

    if (temperatureUnit !== previousTemperatureUnitRef.current && temperature && temperature !== '') {
      const numTemp = parseFloat(temperature);
      if (!isNaN(numTemp)) {
        const tempUnitFrom = previousTemperatureUnitRef.current === 'celsius' ? 'C' : 'F';
        const tempUnitTo = temperatureUnit === 'celsius' ? 'C' : 'F';

        (async () => {
          const convertedTemp = await unitConversionService.convertTemperature(numTemp, tempUnitFrom, tempUnitTo);
          setTemperature(convertedTemp.toFixed(2));
          lastCalculatedRef.current = { pressure: '', temperature: '' };
        })();
      }
    }
    previousTemperatureUnitRef.current = temperatureUnit;
  }, [temperatureUnit, temperature]);

  // Handle unit changes - recalculate and update limits when units change
  useEffect(() => {
    if (selectedRefrigerant) {
      fetchMetadata();
    }
  }, [pressureUnit, temperatureUnit]);

  // Recalculate when isDew changes (for zeotropic blends like R407C)
  // Dew and Bubble points have DIFFERENT temperatures at same pressure (temperature glide)
  // BUT: isAbsolute changes do NOT need recalculation (only display format changes)
  useEffect(() => {
    if (lastEditedField === 'pressure' && pressure && pressure !== '') {
      // Silently recalculate - Dew/Bubble affects actual temperature value
      lastCalculatedRef.current = { pressure: '', temperature: '' };
      calculateTemperatureWithUnits(pressure, pressureUnit, temperatureUnit);
    } else if (lastEditedField === 'temperature' && temperature && temperature !== '') {
      // Silently recalculate - Dew/Bubble affects actual pressure value
      lastCalculatedRef.current = { pressure: '', temperature: '' };
      calculatePressureWithUnits(temperature, temperatureUnit, pressureUnit);
    }
  }, [isDew]);  // ✅ Only isDew, NOT isAbsolute!

  // Validate value against limits
  const validateValue = (value, min, max) => {
    const num = parseFloat(value);
    if (isNaN(num)) return min;
    if (num < min) return min;
    if (num > max) return max;
    return num;
  };



  const handleShowRange = (type) => {
    if (type === 'pressure') {
      setRangeHelpData({
        title: `Pressure (${pressureUnit} (${isAbsolute ? 'a' : 'g'}))`,
        min: effectiveMin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        max: effectiveMax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        unit: `${pressureUnit} (${isAbsolute ? 'a' : 'g'})`
      });
    } else {
      setRangeHelpData({
        title: `Temperature (${temperatureUnit === 'celsius' ? '°C' : '°F'})`,
        min: limits.minTemperature.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        max: limits.maxTemperature.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        unit: temperatureUnit === 'celsius' ? '°C' : '°F'
      });
    }
    setShowRangeHelp(true);
  };



  // Derived limits for display and input validation
  const effectiveMin = limits.minPressure - (isAbsolute ? 0 : atmOffset);
  const effectiveMax = limits.maxPressure - (isAbsolute ? 0 : atmOffset);

  // Calculate temperature from pressure (OPTIMIZED - on blur with debounce)
  // ✅ Uses refrigerantRangeService for validation (NOT API)
  const handlePressureBlur = useCallback(async () => {
    if (!pressure || pressure === '' || pressure === lastCalculatedRef.current.pressure) {
      return;
    }

    const numValue = parseFloat(pressure);
    if (isNaN(numValue)) {
      setError('Invalid pressure value - please enter a number');
      return;
    }

    // ✅ Use refrigerantRangeService to get and validate against actual range
    const jsonPressureUnit = mapPressureUnitToJsonKey(pressureUnit);
    const range = await refrigerantRangeService.getPressureRange(selectedRefrigerant, jsonPressureUnit);

    if (!range) {
      setError(`Range data not available for ${selectedRefrigerant} in ${jsonPressureUnit}`);
      return;
    }

    // Adjust range for Gauge mode if needed
    let min = range.min;
    let max = range.max;

    if (!isAbsolute) {
      min -= atmOffset;
      max -= atmOffset;
    }

    // Check if value is within effective range
    const TOLERANCE = 0.0001;
    if (numValue < min - TOLERANCE || numValue > max + TOLERANCE) {
      setError(`Pressure ${numValue} ${pressureUnit} is outside valid range [${min.toFixed(2)}, ${max.toFixed(2)}]`);
      setPressure('');
      setTemperature(''); // Clear both fields as requested
      setPressureStatus('neutral');
      setTemperatureStatus('neutral');
      return;
    }

    setError(null);

    // Cancel any pending calculation
    if (debouncedCalculateTemperature.current) {
      debouncedCalculateTemperature.current.cancel();
    }

    // Use debounced API call (300ms delay to batch inputs)
    if (!debouncedCalculateTemperature.current) {
      debouncedCalculateTemperature.current = debounce(async (pressureValue, pUnit, tUnit) => {
        // ALWAYS use the latest ref to the calculation function
        calculateTemperatureRef.current?.(pressureValue, pUnit, tUnit);
      }, 300);
    }

    debouncedCalculateTemperature.current(numValue, pressureUnit, temperatureUnit);
  }, [pressure, pressureUnit, temperatureUnit, selectedRefrigerant, isAbsolute, atmOffset]);

  // Calculate pressure from temperature (OPTIMIZED - on blur with debounce)
  // ✅ Uses refrigerantRangeService for validation (NOT API)
  const handleTemperatureBlur = useCallback(async () => {
    if (!temperature || temperature === '' || temperature === lastCalculatedRef.current.temperature) {
      return;
    }

    const numValue = parseFloat(temperature);
    if (isNaN(numValue)) {
      setError('Invalid temperature value');
      return;
    }

    // ✅ Use refrigerantRangeService to get and validate against actual range
    const jsonTemperatureUnit = mapTemperatureUnitToJsonKey(temperatureUnit);
    const range = await refrigerantRangeService.getTemperatureRange(selectedRefrigerant, jsonTemperatureUnit);

    if (!range) {
      setError(`Range data not available for ${selectedRefrigerant} in ${jsonTemperatureUnit}`);
      return;
    }

    // Check if value is within range
    const TOLERANCE = 0.0001;
    if (numValue < range.min - TOLERANCE || numValue > range.max + TOLERANCE) {
      const unitSymbol = jsonTemperatureUnit === 'C' ? '°C' : '°F';
      setError(`Please enter the value within the range: ${range.min.toFixed(2)} - ${range.max.toFixed(2)} ${unitSymbol}`);
      setTemperature('');
      setPressure(''); // Clear both fields as requested
      setPressureStatus('neutral');
      setTemperatureStatus('neutral');
      return;
    }

    setError(null);

    // Cancel any pending calculation
    if (debouncedCalculatePressure.current) {
      debouncedCalculatePressure.current.cancel();
    }

    // Use debounced API call (300ms delay to avoid rapid recalculation)
    if (!debouncedCalculatePressure.current) {
      debouncedCalculatePressure.current = debounce(async (temp, tUnit, pUnit) => {
        // ALWAYS use the latest ref to the calculation function
        calculatePressureRef.current?.(temp, tUnit, pUnit);
      }, 300);
    }

    debouncedCalculatePressure.current(numValue, temperatureUnit, pressureUnit);
  }, [temperature, temperatureUnit, pressureUnit, selectedRefrigerant]);

  // Redundant effect removed

  // Clear cache and reset when refrigerant changes (no validation needed)
  useEffect(() => {
    if (!selectedRefrigerant || !limits) return;

    // Simply clear the calculation cache when refrigerant changes
    // Validation will only happen when user enters values via handlers
    lastCalculatedRef.current = { pressure: '', temperature: '' };
    clearConversionCache();
  }, [selectedRefrigerant, limits]);

  const handleRefrigerantChange = (ref) => {
    setSelectedRefrigerant(ref);
    setShowRefrigerantList(false);
    setError(null);  // Clear any existing error when refrigerant changes

    // Notify parent component if callback provided
    if (onRefrigerantChange) {
      onRefrigerantChange(ref);
    }
    // The useEffect above will handle clearing fields and fetching metadata
  };

  // Handle Absolute/Gauge toggle
  const handleAbsoluteToggle = (e) => {
    if (onIsAbsoluteChange) {
      onIsAbsoluteChange(!e.target.checked);
    }
  };

  return (
    <div className="input-panel">
      {/* Refrigerant Selector */}
      <div className="refrigerant-selector">
        <div className="refrigerant-display" onClick={() => onOpenDrawer && onOpenDrawer()}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>{selectedRefrigerant}</span>
          </div>
          <button className="menu-btn">☰</button>
        </div>
      </div>

      {/* Mode Toggles - Redesigned */}
      <div className="mode-toggles-redesigned">
        {/* Dew/Bubble toggle - enabled for R4xx series only */}
        <div className={`toggle-card ${!dewBubbleEnabled ? 'disabled' : ''}`}>
          <div className="toggle-card-header">
            <div className="toggle-card-title-row">
              <span className={`toggle-option-header ${isDew ? 'active' : 'inactive'} ${!dewBubbleEnabled ? 'locked' : ''}`}>
                Dew
              </span>

              {dewBubbleEnabled && (
                <>
                  <span className="toggle-separator-header">/</span>
                  <span className={`toggle-option-header ${!isDew ? 'active' : 'inactive'}`}>
                    Bubble
                  </span>
                </>
              )}

              {dewBubbleEnabled && (
                <button
                  className="help-icon-btn-inline"
                  onClick={() => setShowDewBubbleHelp(true)}
                  title="Learn about Dew vs Bubble Point"
                >
                  ⓘ
                </button>
              )}

              <label className={`switch-modern ${!dewBubbleEnabled ? 'locked' : ''}`}>
                <input
                  type="checkbox"
                  checked={!isDew} // Inverted: Left = Dew, Right = Bubble
                  onChange={(e) => setIsDew(!e.target.checked)}
                  disabled={!dewBubbleEnabled}
                />
                <span className="slider-modern"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Absolute/Gauge toggle */}
        <div className={`toggle-card ${!absoluteGaugeEnabled ? 'disabled' : ''}`}>
          <div className="toggle-card-header">
            <div className="toggle-card-title-row">
              <span className={`toggle-option-header ${isAbsolute ? 'active' : 'inactive'} ${!absoluteGaugeEnabled ? 'locked' : ''}`}>
                Absolute
              </span>

              {absoluteGaugeEnabled && (
                <>
                  <span className="toggle-separator-header">/</span>
                  <span className={`toggle-option-header ${!isAbsolute ? 'active' : 'inactive'}`}>
                    Gauge {!isAbsolute && (
                      <span className="ambient-pressure-badge">
                        ({distanceUnit === 'feet'
                          ? `${ambientPressureData?.['Altitude (ft)'] || 0} ft`
                          : `${ambientPressureData?.['Altitude (m)'] || 0} m`})
                      </span>
                    )}
                  </span>

                  <button
                    className="help-icon-btn-inline"
                    onClick={() => setShowAbsoluteGaugeHelp(true)}
                    title="Learn about Absolute vs Gauge Pressure"
                  >
                    ⓘ
                  </button>
                </>
              )}

              <label className={`switch-modern ${!absoluteGaugeEnabled ? 'locked' : ''}`}>
                <input
                  type="checkbox"
                  checked={!isAbsolute} // Inverted: Left = Absolute, Right = Gauge
                  onChange={handleAbsoluteToggle}
                  disabled={!absoluteGaugeEnabled}
                />
                <span className="slider-modern"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Calculation Status */}
        {calculationStatus && (
          <div className={`calculation-status-badge ${calculationStatus.includes('✓') ? 'success' : 'loading'}`}>
            {calculationStatus}
          </div>
        )}
      </div>

      {/* Dew/Bubble Help Modal */}
      {showDewBubbleHelp && (
        <div className="help-modal-overlay" onClick={() => setShowDewBubbleHelp(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h3>🌡️ Dew Point vs Bubble Point</h3>
              <button className="help-modal-close" onClick={() => setShowDewBubbleHelp(false)}>×</button>
            </div>
            <div className="help-modal-content">
              <div className="help-section">
                <h4>What are they?</h4>
                <p><strong>Dew Point:</strong> Temperature at which refrigerant vapor <u>begins to condense</u> into liquid (cooling phase).</p>
                <p><strong>Bubble Point:</strong> Temperature at which refrigerant liquid <u>begins to evaporate</u> into vapor (heating phase).</p>
              </div>

              <div className="help-section">
                <h4>When do they differ?</h4>
                <p>Only for <strong>zeotropic blends</strong> (R4xx series) like R407C, R410A, R404A. These refrigerants change composition during phase change, creating a "temperature glide" between dew and bubble points.</p>
                <p><em>Example:</em> R407C at 10 bar has dew point ~43°C and bubble point ~37°C (~6°C glide).</p>
              </div>

              <div className="help-section">
                <h4>Which should I use?</h4>
                <p>📊 <strong>Dew Point:</strong> For condenser design (high-side equipment)</p>
                <p>❄️ <strong>Bubble Point:</strong> For evaporator design (low-side equipment)</p>
              </div>

              <div className="help-note">
                <strong>Note:</strong> For pure refrigerants (R22, R134a, etc.) and azeotropic blends (R500, R502), dew and bubble points are equal - toggle is disabled.
              </div>
            </div>
            <button className="help-modal-btn" onClick={() => setShowDewBubbleHelp(false)}>Got it!</button>
          </div>
        </div>
      )
      }

      {/* Absolute/Gauge Help Modal */}
      {showAbsoluteGaugeHelp && (
        <div className="help-modal-overlay" onClick={() => setShowAbsoluteGaugeHelp(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h3>📏 Absolute vs Gauge Pressure</h3>
              <button className="help-modal-close" onClick={() => setShowAbsoluteGaugeHelp(false)}>×</button>
            </div>
            <div className="help-modal-content">
              <div className="help-section">
                <h4>What's the difference?</h4>
                <p><strong>Absolute Pressure:</strong> Total pressure including atmospheric pressure. Zero = perfect vacuum.</p>
                <p><strong>Gauge Pressure:</strong> Pressure relative to local atmosphere. Zero = atmospheric pressure.</p>
              </div>

              <div className="help-section">
                <h4>The Relationship</h4>
                <p className="formula-box">
                  <code>Absolute = Gauge + Atmospheric Pressure</code>
                </p>
                <p>At sea level: Atmospheric pressure ≈ 1.01 bar (14.7 psi)</p>
                <p><em>Example:</em> 5 bar gauge = 6.01 bar absolute</p>
              </div>

              <div className="help-section">
                <h4>When to use each?</h4>
                <p>🔬 <strong>Absolute:</strong> Thermodynamic calculations, saturation properties, system design</p>
                <p>🔧 <strong>Gauge:</strong> Field measurements, pressure gauges, service work</p>
              </div>

              <div className="help-note">
                <strong>Vacuum Note:</strong> Gauge pressure can be negative (below atmospheric). Example: -0.5 bar gauge means 0.5 bar below atmosphere.
              </div>
            </div>
            <button className="help-modal-btn" onClick={() => setShowAbsoluteGaugeHelp(false)}>Got it!</button>
          </div>
        </div>
      )}

      {/* Pressure Input with Limits Display */}
      <div className="input-group">
        <div className="field-header">
          <label>Pressure ({pressureUnit} ({isAbsolute ? 'a' : 'g'}))</label>
          <button
            className="help-icon-btn-inline"
            onClick={() => handleShowRange('pressure')}
            title="View allowed range"
            type="button"
          >
            <Info size={14} />
          </button>
        </div>

        {pressureStatus !== 'neutral' && (
          <div
            className="status-indicator-mini"
            style={{
              color: pressureStatus === 'valid' ? '#10b981' : '#ef4444'
            }}
          >
            {pressureStatus === 'valid' ? '✓ Valid' : '⚠ Outside Range'}
          </div>
        )}

        <input
          ref={pressureInputRef}
          type="number"
          inputMode="decimal"
          placeholder="e.g., 10.5"
          value={pressure}
          onChange={(e) => {
            const value = e.target.value;
            setPressure(value);
            setLastEditedField('pressure');

            // Real-time status update
            if (value === '') {
              setPressureStatus('neutral');
            } else {
              const num = parseFloat(value);
              if (!isNaN(num)) {
                const TOLERANCE = 0.0001;
                if (num >= (effectiveMin - TOLERANCE) && num <= (effectiveMax + TOLERANCE)) {
                  setPressureStatus('valid');
                } else {
                  setPressureStatus('invalid');
                }
              } else {
                setPressureStatus('neutral');
              }
            }
          }}
          onBlur={handlePressureBlur}
          disabled={loading}
          className={`field-input ${loading ? 'loading' : ''}`}
          style={{
            borderColor: pressureStatus === 'valid' ? '#10b981' :
              pressureStatus === 'invalid' ? '#ef4444' : undefined
          }}
          min={effectiveMin.toFixed(2)}
          max={effectiveMax.toFixed(2)}
          step="0.01"
        />
      </div>

      {/* Temperature Input with Limits Display */}
      <div className="input-group">
        <div className="field-header">
          <label>Temperature ({temperatureUnit === 'celsius' ? '°C' : '°F'})</label>
          <button
            className="help-icon-btn-inline"
            onClick={() => handleShowRange('temperature')}
            title="View allowed range"
            type="button"
          >
            <Info size={14} />
          </button>
        </div>

        {temperatureStatus !== 'neutral' && (
          <div
            className="status-indicator-mini"
            style={{
              color: temperatureStatus === 'valid' ? '#10b981' : '#ef4444'
            }}
          >
            {temperatureStatus === 'valid' ? '✓ Valid' : '⚠ Outside Range'}
          </div>
        )}

        <input
          ref={temperatureInputRef}
          type="number"
          inputMode="decimal"
          value={temperature}
          onChange={(e) => {
            const value = e.target.value;
            setTemperature(value);
            setLastEditedField('temperature');

            // Real-time status update
            if (value === '') {
              setTemperatureStatus('neutral');
            } else {
              const num = parseFloat(value);
              if (!isNaN(num)) {
                const TOLERANCE = 0.0001;
                if (num >= (limits.minTemperature - TOLERANCE) && num <= (limits.maxTemperature + TOLERANCE)) {
                  setTemperatureStatus('valid');
                } else {
                  setTemperatureStatus('invalid');
                }
              } else {
                setTemperatureStatus('neutral');
              }
            }
          }}
          onBlur={handleTemperatureBlur}
          placeholder={temperatureUnit === 'celsius' ? 'e.g., 25.0' : 'e.g., 77.0'}
          disabled={loading}
          className={`field-input ${loading ? 'loading' : ''}`}
          style={{
            borderColor: temperatureStatus === 'valid' ? '#10b981' :
              temperatureStatus === 'invalid' ? '#ef4444' : undefined
          }}
          min={limits.minTemperature}
          max={limits.maxTemperature}
          step="0.01"
        />
      </div>

      {/* Loading Indicator */}
      {
        loading && (
          <div className="loading-indicator">
            <span>🔄 Calculating...</span>
          </div>
        )
      }

      {/* Error Message */}
      {
        error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
            <button
              className="error-close-btn"
              onClick={() => setError(null)}
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        )
      }

      {/* Range Info Modal */}
      {showRangeHelp && (
        <div className="help-modal-overlay" onClick={() => setShowRangeHelp(false)}>
          <div className="help-modal range-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h3>📏 Allowed Input Range</h3>
              <button className="help-modal-close" onClick={() => setShowRangeHelp(false)}>×</button>
            </div>
            <div className="help-modal-content">
              <div className="range-display-container">
                <div className="range-type-title">{rangeHelpData.title}</div>
                <div className="range-values">
                  <div className="range-val-box">
                    <span className="range-val-label">Minimum</span>
                    <span className="range-val-number">{rangeHelpData.min} {rangeHelpData.unit}</span>
                  </div>
                  <div className="range-val-box">
                    <span className="range-val-label">Maximum</span>
                    <span className="range-val-number">{rangeHelpData.max} {rangeHelpData.unit}</span>
                  </div>
                </div>
              </div>
              <p className="range-note" style={{ marginTop: '16px', fontSize: '13px', opacity: 0.8, textAlign: 'center' }}>
                Please enter a value within this range for accurate {rangeHelpData.title.toLowerCase()} calculation for <strong>{selectedRefrigerant}</strong>.
              </p>
            </div>
            <button className="help-modal-btn" onClick={() => setShowRangeHelp(false)}>OK</button>
          </div>
        </div>
      )}

      {/* Welcome Card for First-Time Users */}
      {
        showWelcome && (
          <WelcomeCard
            onClose={() => setShowWelcome(false)}
          />
        )
      }
    </div >
  );
});

InputPanel.displayName = 'InputPanel';

export default InputPanel;
