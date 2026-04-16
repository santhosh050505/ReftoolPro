import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { getCalculationsByProject, bulkUpdateCalculations, updateCalculation } from '../../services/calculationApiService';
import { deleteProject, duplicateProject, updateProject } from '../../services/projectService';
import { getPointProperties } from '../../services/thermoApiService';
import ProjectModal from '../../components/ProjectModal/ProjectModal';
import AddCycleStateModal from '../../components/AddCycleStateModal/AddCycleStateModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { Trash2, ArrowLeft, ArrowUp, ArrowDown, Edit2, Copy, Clipboard, CheckSquare, Square, FolderOpen, Plus } from 'lucide-react';
import { convertPressure } from '../../config/pressureUnits';
import {
  calculateSuctionGasTemp,
  calculateEvapSuperheat,
  calculateDischargeGasTemp,
  calculateCompSuperheat,
  calculateLiquidTemp,
  calculateCondSubcooling
} from '../../utils/thermoR454B';

import {
  calculateSuctionGasTemp as calcSuctionTempR513A,
  calculateEvapSuperheat as calcEvapSHR513A,
  calculateDischargeGasTemp as calcDischargeTempR513A,
  calculateCompSuperheat as calcCompSHR513A,
  calculateLiquidTemp as calcLiquidTempR513A,
  calculateCondSubcooling as calcCondSubcoolingR513A
} from '../../utils/thermoR513A';
import './ProjectDashboard.css';

const isCustomStatePointProject = (project) => {
  return project?.stateCycle === 'Custom State point' &&
    (project?.lockedRefrigerant?.toUpperCase() === 'R513A' ||
      project?.lockedRefrigerant?.toUpperCase() === 'R454B');
};

const getAutomatedCustomValue = (calc, allCalculations, project, field, globalTempUnit) => {
  if (!isCustomStatePointProject(project)) return null;

  const type = calc.defineStateCycle;
  const unit = (project?.lockedTemperatureUnit || globalTempUnit || 'celsius').toLowerCase();
  const kFactor = unit === 'fahrenheit' ? 1.8 : 1.0;

  // Find the master relative values in this project
  const subcoolingRow = allCalculations.find(c => c.defineStateCycle.includes('Condenser Subcooling'));
  const evapSuperheatRow = allCalculations.find(c => c.defineStateCycle.includes('Evaporator Superheat'));
  const compSuperheatRow = allCalculations.find(c => c.defineStateCycle.includes('Compressor Superheat'));

  const scVal = subcoolingRow?.inputValue;
  const evapSHVal = evapSuperheatRow?.inputValue;
  const compSHVal = compSuperheatRow?.inputValue;

  const hasSC = scVal !== null && scVal !== undefined && scVal !== '';
  const hasEvapSH = evapSHVal !== null && evapSHVal !== undefined && evapSHVal !== '';
  const hasCompSH = compSHVal !== null && compSHVal !== undefined && compSHVal !== '';

  const sc = hasSC ? parseFloat(scVal) : NaN;
  const evapSH = hasEvapSH ? parseFloat(evapSHVal) : NaN;
  const compSH = hasCompSH ? parseFloat(compSHVal) : NaN;

  // Saturation temperature from the calculation (already in display unit)
  const satTemp = parseFloat(calc.temperature);
  if (isNaN(satTemp)) return null;

  // 1. Liquid Temperature Formulas
  if (field === 'liquidTemperature') {
    if ([
      'Saturated Condensation Temperature (SCT)',
      'Saturated Condensation Pressure (SCP)',
      'Compressor Discharge(SCT)',
      'Condenser Inlet(SCT)',
      'Condenser Outlet(SCT)',
      'Expansion Device Inlet(SCT)'
    ].includes(type)) {
      if (!hasSC) return null;
      return satTemp - (kFactor * sc);
    }
  }

  // 2. Actual Temperature (Discharge/Suction Gas) Formulas
  if (field === 'actualTemperature') {
    // Discharge Gas group
    if ([
      'Saturated Condensation Temperature (SCT)',
      'Saturated Condensation Pressure (SCP)',
      'Compressor Discharge(SCT)',
      'Condenser Inlet(SCT)',
      'Condenser Outlet(SCT)',
      'Expansion Device Inlet(SCT)'
    ].includes(type)) {
      if (!hasCompSH) return null;
      return satTemp + compSH; // Comp SH is handled in native units (C or F)
    }

    // Suction Gas group
    if ([
      'Saturated Evaporator Temperature (SET)',
      'Saturated Evaporation Pressure (SEP)',
      'Evaporator Outlet(SET)',
      'Compressor Suction(SET)'
    ].includes(type)) {
      if (!hasEvapSH) return null;
      return satTemp + (kFactor * evapSH);
    }
  }

  return null;
};

const EnthalpyCell = ({ calc, isAbsolute, ambientPressureData }) => {
  const [val, setVal] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProps = async () => {
      // Don't calculate for rows without a real physical state
      if (!calc.refrigerant || calc.refrigerant === '-') return;

      const pRaw = parseFloat(calc.pressure);
      const tRaw = parseFloat(calc.actualTemperature !== null ? calc.actualTemperature : calc.temperature);
      if (isNaN(pRaw) || isNaN(tRaw)) return;

      setLoading(true);
      try {
        const res = await getPointProperties({
          refrigerant: calc.refrigerant.split(' ')[0],
          p: calc.pressure,
          t: calc.actualTemperature !== null ? calc.actualTemperature : calc.temperature,
          isDew: calc.isDew,
          stateLabel: calc.defineStateCycle
        });
        if (res.h) setVal(res.h);
        else setVal(null);
      } catch (err) {
        console.error('Enthalpy fetch failed', err);
        setVal(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProps();
  }, [calc.pressure, calc.temperature, calc.actualTemperature, calc.refrigerant]);

  if (loading) return <span style={{ opacity: 0.5, fontSize: '11px', color: '#64748b' }}>...</span>;
  return <span>{val !== null ? val.toFixed(1) : '-'}</span>;
};

const ProjectDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useOutletContext() || {};
  const {
    pressureUnit,
    temperatureUnit,
    onPressureUnitChange,
    onTemperatureUnitChange,
    isAbsolute,
    onIsAbsoluteChange,
    ambientPressureData,
    distanceUnit
  } = context;
  const { projects, refreshProjects, selectCalculation, selectProject } = useProject();
  const { addToast } = useToast();

  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [projectCalculations, setProjectCalculations] = useState({});
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [addCycleProject, setAddCycleProject] = useState(null);

  // Selection & Copy state
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [copiedProjects, setCopiedProjects] = useState([]);

  // Renaming state
  const [renamingId, setRenamingId] = useState(null);
  const [renamingType, setRenamingType] = useState(null); // 'project' or 'calculation'
  const [tempRenameValue, setTempRenameValue] = useState('');

  // Thermoplot state
  const [thermoplotActive, setThermoplotActive] = useState({}); // { projectId: boolean }
  const [projectSequences, setProjectSequences] = useState({}); // { projectId: { calcId: sequenceNumber } }

  // Actual Temperature Editing state
  const [editingActualTempId, setEditingActualTempId] = useState(null);
  const [tempActualTempValue, setTempActualTempValue] = useState('');


  useEffect(() => {
    refreshProjects();
  }, []);

  // Handle auto-expansion or auto-modal from navigation state
  useEffect(() => {
    if (location.state?.expandProjectId) {
      const projId = location.state.expandProjectId;
      // We need to wait for projects to be loaded or just try to expand if we have the ID
      toggleProjectExpand(projId);

      // Clear the state so it doesn't expand again on refresh
      window.history.replaceState({}, document.title);
    }

    // Check for openModal trigger from Landing Page
    if (location.state?.openModal) {
      setShowProjectModal(true);
      // Clear the state to avoid re-opening on manual refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, projects]);


  const handleFetchCalculations = async (projectId) => {
    try {
      setLoading(true);
      const calculations = await getCalculationsByProject(projectId);
      const sorted = [...calculations].sort((a, b) => (a.order || 0) - (b.order || 0));
      setProjectCalculations(prev => ({
        ...prev,
        [projectId]: sorted
      }));
    } catch (error) {
      console.error('Failed to load calculations:', error);
      addToast('Failed to refresh calculations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleProjectExpand = async (projectId) => {
    const newExpanded = new Set(expandedProjects);

    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);

      // Load calculations if not already loaded
      if (!projectCalculations[projectId]) {
        await handleFetchCalculations(projectId);
      }
    }

    setExpandedProjects(newExpanded);
  };

  const handleFetchCondition = (calculation) => {
    // Set the calculation as active
    selectCalculation(calculation);

    // Sync active project if found
    const project = projects.find(p => p._id === calculation.projectId);
    if (project) {
      selectProject(project);
    }

    // Sync units
    if (calculation.pressureUnit && calculation.pressureUnit !== pressureUnit) {
      if (onPressureUnitChange) onPressureUnitChange(calculation.pressureUnit);
    }
    if (calculation.temperatureUnit && calculation.temperatureUnit !== temperatureUnit) {
      if (onTemperatureUnitChange) onTemperatureUnitChange(calculation.temperatureUnit);
    }

    // Set storage for instant loading in slider
    sessionStorage.setItem('loadCalculationData', JSON.stringify(calculation));

    addToast(`Loading ${calculation.name} into calculator...`, 'success');
    navigate('/');
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleStartProjectRename = (project) => {
    setRenamingId(project._id);
    setRenamingType('project');
    setTempRenameValue(project.name);
  };

  const handleStartRename = (calculation) => {
    setRenamingId(calculation._id);
    setRenamingType('calculation');
    setTempRenameValue(calculation.name);
  };

  const handleRenameSubmit = async (item) => {
    const newName = tempRenameValue.trim();
    if (!newName || newName === item.name) {
      setRenamingId(null);
      setRenamingType(null);
      return;
    }

    try {
      if (renamingType === 'project') {
        await updateProject(item._id, newName, item.description);
        await refreshProjects();
      } else {
        await updateCalculation(item._id, { name: newName });
        // Update local state
        const projId = item.projectId;
        setProjectCalculations(prev => ({
          ...prev,
          [projId]: prev[projId].map(c =>
            c._id === item._id ? { ...c, name: newName } : c
          )
        }));
      }

      addToast('Name updated successfully', 'success');
    } catch (error) {
      console.error('Rename error:', error);
      addToast('Failed to rename: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setRenamingId(null);
      setRenamingType(null);
    }
  };

  const handleInputValueChange = async (calcId, value) => {
    try {
      const numValue = value === '' ? null : parseFloat(value);
      await updateCalculation(calcId, { inputValue: numValue });

      setProjectCalculations(prev => {
        const next = { ...prev };
        let targetProjId = null;
        for (const pid in next) {
          if (next[pid].find(c => c._id === calcId)) {
            targetProjId = pid;
            break;
          }
        }

        if (targetProjId) {
          const currentProject = projects.find(p => p._id === targetProjId);
          const projectCalcs = [...next[targetProjId]];

          // Identify target calculation
          const targetIdx = projectCalcs.findIndex(c => c._id === calcId);
          const targetCalc = { ...projectCalcs[targetIdx], inputValue: numValue };
          projectCalcs[targetIdx] = targetCalc;

          const isSpecialRef = targetCalc.refrigerant?.toUpperCase().match(/513A|454B/);
          const isTempMode = currentProject?.stateCycle?.startsWith('Temperature');
          const isPressureMode = currentProject?.stateCycle?.startsWith('Pressure');
          const isModeValid = isTempMode || isPressureMode;

          console.log('[DEBUG] InputValueChange:', { isSpecialRef, isTempMode, isPressureMode, stateCycle: currentProject?.stateCycle, type: targetCalc.defineStateCycle, val: numValue });

          if (isSpecialRef && isModeValid && numValue !== null) {
            const currentTempUnit = (currentProject?.lockedTemperatureUnit || temperatureUnit || 'celsius').toLowerCase();
            const isFahrenheit = currentTempUnit === 'fahrenheit';

            const findIdx = (type) => projectCalcs.findIndex(c => c.defineStateCycle.includes(type));
            const sctIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Saturated Condensation Temperature (SCT)') ||
              c.defineStateCycle.includes('Saturated Condensation Pressure (SCP)')
            );
            const setIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Saturated Evaporator Temperature (SET)') ||
              c.defineStateCycle.includes('Saturated Evaporation Pressure (SEP)')
            );
            const liqIdx = findIdx('Liquid temperature');
            const subIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Condenser Subcooling')
            );

            const sct = sctIdx !== -1 ? parseFloat(projectCalcs[sctIdx].temperature) : NaN;
            const set = setIdx !== -1 ? parseFloat(projectCalcs[setIdx].temperature) : NaN;

            if (targetCalc.defineStateCycle.includes('Compressor Superheat') && sctIdx !== -1 && !isNaN(sct)) {
              // Formula 6: Discharge Gas Temperature = SCT + Compressor Superheat (Direct unit)
              const dischargeTemp = numValue === null ? null : sct + numValue;
              projectCalcs[sctIdx] = { ...projectCalcs[sctIdx], actualTemperature: dischargeTemp };
              updateCalculation(projectCalcs[sctIdx]._id, { actualTemperature: dischargeTemp });
            } else if (targetCalc.defineStateCycle.includes('Evaporator Superheat') && setIdx !== -1 && !isNaN(set)) {
              // Formula 4: Suction Gas Temperature = (1.8* Evaporator Superheat) + SET
              const deltaT = isFahrenheit ? (numValue === null ? null : numValue * 1.8) : numValue;
              const suctionTemp = (numValue === null || isNaN(set)) ? null : set + deltaT;
              projectCalcs[setIdx] = { ...projectCalcs[setIdx], actualTemperature: suctionTemp };
              updateCalculation(projectCalcs[setIdx]._id, { actualTemperature: suctionTemp });
            } else if (targetCalc.defineStateCycle.includes('Condenser Subcooling') && sctIdx !== -1 && !isNaN(sct) && liqIdx !== -1) {
              // Formula 5: Liquid Temperature = SCT - (1.8 * Condenser Subcooling)
              const deltaT = isFahrenheit ? (numValue === null ? null : numValue * 1.8) : numValue;
              const lTemp = (numValue === null || isNaN(sct)) ? null : sct - deltaT;
              projectCalcs[liqIdx] = { ...projectCalcs[liqIdx], inputValue: lTemp };
              updateCalculation(projectCalcs[liqIdx]._id, { inputValue: lTemp });
            } else if (targetCalc.defineStateCycle.includes('Liquid temperature') && sctIdx !== -1 && !isNaN(sct) && subIdx !== -1) {
              // Formula 2: Condenser Subcooling = 1.0 (or 5/9 if F) * (SCT - Liquid Temperature)
              let subVal = numValue === null ? null : sct - numValue; // difference in display unit
              const subValK = (subVal === null || isNaN(subVal)) ? null : (isFahrenheit ? subVal * 5 / 9 : subVal);
              projectCalcs[subIdx] = { ...projectCalcs[subIdx], inputValue: subValK };
              updateCalculation(projectCalcs[subIdx]._id, { inputValue: subValK });
            }
          }
          next[targetProjId] = projectCalcs;
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to update input value:', err);
    }
  };

  const handleActualTemperatureChange = async (calcId, value) => {
    try {
      const numValue = value === '' ? null : parseFloat(value);
      await updateCalculation(calcId, { actualTemperature: numValue });

      setProjectCalculations(prev => {
        const next = { ...prev };
        let targetProjId = null;
        for (const pid in next) {
          if (next[pid].find(c => c._id === calcId)) {
            targetProjId = pid;
            break;
          }
        }

        if (targetProjId) {
          const currentProject = projects.find(p => p._id === targetProjId);
          const projectCalcs = [...next[targetProjId]];

          const targetIdx = projectCalcs.findIndex(c => c._id === calcId);
          const targetCalc = { ...projectCalcs[targetIdx], actualTemperature: numValue };
          projectCalcs[targetIdx] = targetCalc;

          const isSpecialRef = targetCalc.refrigerant?.toUpperCase().match(/513A|454B/);
          const isTempMode = currentProject?.stateCycle?.startsWith('Temperature');
          const isPressureMode = currentProject?.stateCycle?.startsWith('Pressure');
          const isModeValid = isTempMode || isPressureMode;

          if (isSpecialRef && isModeValid) {
            const currentTempUnit = (currentProject?.lockedTemperatureUnit || temperatureUnit || 'celsius').toLowerCase();
            const isFahrenheit = currentTempUnit === 'fahrenheit';

            const sctIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Saturated Condensation Temperature (SCT)') ||
              c.defineStateCycle.includes('Saturated Condensation Pressure (SCP)')
            );
            const setIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Saturated Evaporator Temperature (SET)') ||
              c.defineStateCycle.includes('Saturated Evaporation Pressure (SEP)')
            );
            const csupIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Compressor Superheat')
            );
            const supIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Evaporator Superheat')
            );

            const sct = sctIdx !== -1 ? parseFloat(projectCalcs[sctIdx].temperature) : NaN;
            const set = setIdx !== -1 ? parseFloat(projectCalcs[setIdx].temperature) : NaN;

            if ((targetCalc.defineStateCycle.includes('Saturated Condensation Temperature') || targetCalc.defineStateCycle.includes('Saturated Condensation Pressure')) && csupIdx !== -1 && !isNaN(sct)) {
              // Formula 3: Compressor Superheat = Discharge Gas Temperature - SCT
              let csupValue = numValue === null ? null : numValue - sct; // difference in display unit
              projectCalcs[csupIdx] = { ...projectCalcs[csupIdx], inputValue: csupValue };
              updateCalculation(projectCalcs[csupIdx]._id, { inputValue: csupValue });
            } else if ((targetCalc.defineStateCycle.includes('Saturated Evaporator Temperature') || targetCalc.defineStateCycle.includes('Saturated Evaporation Pressure')) && supIdx !== -1 && !isNaN(set)) {
              // Formula 1: Evaporator Superheat = 5/9 * (Suction Gas Temperature - SET)
              let deltaT = numValue === null ? null : numValue - set; // difference in display unit
              let supValue = (deltaT === null || isNaN(deltaT)) ? null : (isFahrenheit ? deltaT * 5 / 9 : deltaT);
              projectCalcs[supIdx] = { ...projectCalcs[supIdx], inputValue: supValue };
              updateCalculation(projectCalcs[supIdx]._id, { inputValue: supValue });
            }
          }
          next[targetProjId] = projectCalcs;
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to update actual temperature:', err);
    }
  };

  const handleLiquidTemperatureChange = async (calcId, value) => {
    try {
      const numValue = value === '' ? null : parseFloat(value);
      await updateCalculation(calcId, { liquidTemperature: numValue });

      setProjectCalculations(prev => {
        const next = { ...prev };
        let targetProjId = null;
        for (const pid in next) {
          if (next[pid].find(c => c._id === calcId)) {
            targetProjId = pid;
            break;
          }
        }

        if (targetProjId) {
          const currentProject = projects.find(p => p._id === targetProjId);
          const projectCalcs = [...next[targetProjId]];

          const targetIdx = projectCalcs.findIndex(c => c._id === calcId);
          const targetCalc = { ...projectCalcs[targetIdx], liquidTemperature: numValue };
          projectCalcs[targetIdx] = targetCalc;

          const isSpecialRef = targetCalc.refrigerant?.toUpperCase().match(/513A|454B/);
          const isTempMode = currentProject?.stateCycle?.startsWith('Temperature');
          const isPressureMode = currentProject?.stateCycle?.startsWith('Pressure');
          const isModeValid = isTempMode || isPressureMode;

          if (isSpecialRef && isModeValid) {
            const currentTempUnit = (currentProject?.lockedTemperatureUnit || temperatureUnit || 'celsius').toLowerCase();
            const isFahrenheit = currentTempUnit === 'fahrenheit';

            const sctIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Saturated Condensation Temperature (SCT)') ||
              c.defineStateCycle.includes('Saturated Condensation Pressure (SCP)')
            );
            const subIdx = projectCalcs.findIndex(c =>
              c.defineStateCycle.includes('Condenser Subcooling')
            );

            const sct = sctIdx !== -1 ? parseFloat(projectCalcs[sctIdx].temperature) : NaN;

            if ((targetCalc.defineStateCycle.includes('Saturated Condensation Temperature') || targetCalc.defineStateCycle.includes('Saturated Condensation Pressure')) && subIdx !== -1 && !isNaN(sct)) {
              // Formula 2: Condenser Subcooling = 1.0 (or 5/9 if F) * (SCT - Liquid Temperature)
              let subVal = numValue === null ? null : sct - numValue; // difference in display unit
              const subValK = (subVal === null || isNaN(subVal)) ? null : (isFahrenheit ? subVal * 5 / 9 : subVal);
              projectCalcs[subIdx] = { ...projectCalcs[subIdx], inputValue: subValK };
              updateCalculation(projectCalcs[subIdx]._id, { inputValue: subValK });
            }
          }
          next[targetProjId] = projectCalcs;
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to update liquid temperature:', err);
    }
  };

  const calculateAutoValue = (calc, projectCalcs) => {
    // No automatic calculation needed for the four inputs.
    // Superheating and Subcooling are now manual inputs.
    return null;
  };

  const isInputEnabled = (type) => {
    return [
      'Evaporator Superheat',
      'Condenser Subcooling',
      'Compressor Superheat',
      'Liquid temperature',
      'Isentropic Efficiency'
    ].some(t => type.includes(t));
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenamingType(null);
    setTempRenameValue('');
  };

  // Selection Logic
  const handleSelectProject = (projectId) => {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    } else {
      setSelectedProjectId(projectId);
    }
  };

  const handleCopy = () => {
    if (!selectedProjectId) return;
    setCopiedProjects([selectedProjectId]);
    addToast(`Project copied to clipboard`, 'success');
  };

  const handlePaste = async () => {
    if (copiedProjects.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let lastError = null;
    try {
      for (const projectId of copiedProjects) {
        try {
          await duplicateProject(projectId);
          successCount++;
        } catch (err) {
          console.error(`Failed to duplicate project ${projectId}:`, err);
          lastError = err.message || 'Unknown error';
        }
      }

      if (successCount > 0) {
        addToast(`Successfully duplicated ${successCount} project(s)`, 'success');
        await refreshProjects();
        setSelectedProjectId(null);
      } else {
        addToast(`Project duplication failed: ${lastError}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartActualTempEdit = (calculation) => {
    setEditingActualTempId(calculation._id);
    const val = calculation.actualTemperature;
    setTempActualTempValue(val !== null && val !== undefined ? val.toString() : '');
  };

  const handleActualTempSubmit = async (calculation) => {
    const newVal = tempActualTempValue.trim();
    const numericVal = newVal === '' ? null : Number(newVal);

    if (numericVal === calculation.actualTemperature) {
      setEditingActualTempId(null);
      return;
    }

    if (newVal !== '' && isNaN(numericVal)) {
      addToast('Please enter a valid number', 'error');
      return;
    }

    try {
      await updateCalculation(calculation._id, { actualTemperature: numericVal });

      // Update local state
      const projId = calculation.projectId;
      setProjectCalculations(prev => ({
        ...prev,
        [projId]: prev[projId].map(c =>
          c._id === calculation._id ? { ...c, actualTemperature: numericVal } : c
        )
      }));

      addToast('Actual temperature updated', 'success');
    } catch (error) {
      console.error('Actual Temp update error:', error);
      addToast('Failed to update: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setEditingActualTempId(null);
    }
  };

  const handleActualTempCancel = () => {
    setEditingActualTempId(null);
    setTempActualTempValue('');
  };

  const moveRow = async (projectId, currentIndex, direction) => {
    const list = [...projectCalculations[projectId]];
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= list.length) return;

    // Swap items
    const temp = list[currentIndex];
    list[currentIndex] = list[newIndex];
    list[newIndex] = temp;

    // Update local state immediately for snappy UI
    setProjectCalculations(prev => ({
      ...prev,
      [projectId]: list
    }));

    // Prepare batch update for database
    const updates = list.map((item, index) => ({
      id: item._id,
      data: { order: index }
    }));

    try {
      await bulkUpdateCalculations(updates);
    } catch (error) {
      console.error('Failed to sync order with database:', error);
      addToast('Failed to save preferred order', 'error');
    }
  };

  const handleDeleteProject = (project) => {
    setDeleteTarget({ type: 'project', data: project });
    setShowConfirmDelete(true);
  };

  const handleDeleteCalculation = (calculation) => {
    setDeleteTarget({ type: 'calculation', data: calculation });
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      if (deleteTarget.type === 'project') {
        await deleteProject(deleteTarget.data._id);

        const newExpanded = new Set(expandedProjects);
        newExpanded.delete(deleteTarget.data._id);
        setExpandedProjects(newExpanded);

        const newCalculations = { ...projectCalculations };
        delete newCalculations[deleteTarget.data._id];
        setProjectCalculations(newCalculations);

        await refreshProjects();
        addToast('Project deleted successfully', 'success');
      } else {
        const { deleteCalculation } = await import('../../services/calculationApiService');
        await deleteCalculation(deleteTarget.data._id);

        // Update local state
        const projId = deleteTarget.data.projectId;
        setProjectCalculations(prev => ({
          ...prev,
          [projId]: prev[projId].filter(c => c._id !== deleteTarget.data._id)
        }));

        addToast('Calculation deleted successfully', 'success');
      }
    } catch (error) {
      addToast('Failed to delete: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleThermoplot = (projectId) => {
    const isTurningOn = !thermoplotActive[projectId];

    if (isTurningOn && !isAbsolute) {
      alert("only using absoult value for pressure we can able to plot the graph");
    }

    setThermoplotActive(prev => {
      const updatedState = { ...prev };

      if (isTurningOn) {
        // Turn off thermoplot for all other projects when turning on for this one
        Object.keys(updatedState).forEach(id => {
          updatedState[id] = false;
        });
        // Turn on for the selected project
        updatedState[projectId] = true;
      } else {
        // Just turn off the toggle for this project
        updatedState[projectId] = false;
      }

      return updatedState;
    });

  };





  const handleGeneratePlot = (projectId) => {
    const calculations = projectCalculations[projectId] || [];

    // Sort calculations by standard cycle order
    const cycleOrder = [
      'Saturated Condensation Pressure (SCP)',
      'Saturated Condensation Temperature (SCT)',
      'Saturated Evaporation Pressure (SEP)',
      'Saturated Evaporator Temperature (SET)',
      'Evaporator Superheat',
      'Evaporator Superheat(K)',
      'Condenser Subcooling',
      'Condenser Subcooling(K)',
      'Compressor Superheat',
      'Compressor Superheat(K)',
      'Liquid temperature'
    ];

    const sortedCalcs = [...calculations].sort((a, b) => {
      const indexA = cycleOrder.findIndex(t => a.defineStateCycle?.includes(t));
      const indexB = cycleOrder.findIndex(t => b.defineStateCycle?.includes(t));

      // If one is not in the list, put it at the end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    if (sortedCalcs.length === 0) {
      addToast('No cycle states found for this project.', 'error');
      return;
    }

    // Normalize values to Bar (Absolute) and Celsius for plotting
    // The graph and thermodynamic engines expect Bar (Absolute) and Celsius.
    const normalizedCalcs = sortedCalcs.map(calc => {
      const sourcePressureUnit = calc.pressureUnit || 'bar';
      const sourceTempUnit = (calc.temperatureUnit || 'celsius').toLowerCase();
      const isAbs = calc.isAbsolute !== undefined ? calc.isAbsolute : true;

      const pRaw = parseFloat(calc.pressure);
      const tRaw = parseFloat(calc.temperature);
      const actualTRaw = calc.actualTemperature !== null ? parseFloat(calc.actualTemperature) : null;

      let pAbsBar = pRaw;
      if (!isNaN(pRaw)) {
        const pBar = convertPressure(pRaw, sourcePressureUnit, 'bar');
        const atmOffsetBar = getAtmOffsetForUnit('bar', calc.ambientPressureData);
        pAbsBar = isAbs ? pBar : pBar + atmOffsetBar;
      }

      let tCelsius = tRaw;
      if (!isNaN(tRaw)) {
        if (sourceTempUnit === 'fahrenheit') {
          tCelsius = (tRaw - 32) * 5 / 9;
        } else {
          tCelsius = tRaw;
        }
      }

      let actualTCelsius = actualTRaw;
      if (actualTRaw !== null && !isNaN(actualTRaw)) {
        if (sourceTempUnit === 'fahrenheit') {
          actualTCelsius = (actualTRaw - 32) * 5 / 9;
        } else {
          actualTCelsius = actualTRaw;
        }
      }

      // Handle liquidTemperature normalization
      let liquidTemperatureC = calc.liquidTemperature !== null ? parseFloat(calc.liquidTemperature) : null;
      if (liquidTemperatureC !== null && !isNaN(liquidTemperatureC)) {
        if (sourceTempUnit === 'fahrenheit') {
          liquidTemperatureC = (liquidTemperatureC - 32) * 5 / 9;
        }
      }

      // Handle inputValue normalization
      let normalizedInputValue = calc.inputValue;
      if (normalizedInputValue !== null && !isNaN(parseFloat(normalizedInputValue))) {
        const val = parseFloat(normalizedInputValue);
        const isDeltaT = [
          'Evaporator Superheat',
          'Evaporator Superheat(K)',
          'Condenser Subcooling',
          'Condenser Subcooling(K)',
          'Compressor Superheat',
          'Compressor Superheat(K)'
        ].includes(calc.defineStateCycle);

        if (sourceTempUnit === 'fahrenheit') {
          if (isDeltaT) {
            // Temperature difference conversion (1 delta °F = 5/9 delta °C/K)
            normalizedInputValue = val * 5 / 9;
          } else if (calc.defineStateCycle === 'Liquid temperature') {
            // Absolute temperature conversion
            normalizedInputValue = (val - 32) * 5 / 9;
          }
        }
      }

      return {
        ...calc,
        pressure: pAbsBar,
        temperature: tCelsius,
        actualTemperature: actualTCelsius,
        liquidTemperature: liquidTemperatureC,
        inputValue: normalizedInputValue,
        pressureUnit: 'bar',
        temperatureUnit: 'celsius',
        isAbsolute: true
      };
    });

    // Save to session storage for the plot page to pick up
    const currentProject = projects.find(p => p._id === projectId);
    sessionStorage.setItem('currentPlotData', JSON.stringify({
      projectId,
      projectName: currentProject?.name,
      stateCycle: currentProject?.stateCycle,
      calculations: normalizedCalcs
    }));

    navigate(`/thermoplot/${projectId}`);
  };

  const getAtmOffsetForUnit = useCallback((unit, data) => {
    if (!data) return 1.01325;
    const unitMapping = {
      'bar': 'bar', 'psi': 'psi', 'Pa': 'Pa', 'kPa': 'kPa', 'MPa': 'mpa',
      'atm': 'atm', 'at': 'at', 'mmHg': 'mm Hg', 'µmHg': 'µm Hg', 'inHg': 'In Hg'
    };
    const colName = unitMapping[unit] || unit;
    return parseFloat(data[colName]) || 1.01325;
  }, []);

  const displayPressureValue = (calc, project = null) => {
    try {
      if (calc.pressure === undefined || calc.pressure === null) return '-';

      const sourceUnit = calc.pressureUnit || 'bar';
      const sourceIsAbs = calc.isAbsolute !== undefined ? calc.isAbsolute : true;
      const sourceVal = parseFloat(calc.pressure);

      // 1. Convert to Absolute Bar (Source of Truth)
      const sourceAtmOffsetBar = getAtmOffsetForUnit('bar', calc.ambientPressureData);
      const sourceValBar = convertPressure(sourceVal, sourceUnit, 'bar');
      const absoluteBarVal = sourceIsAbs ? sourceValBar : sourceValBar + sourceAtmOffsetBar;

      // 2. Convert to Target Display Unit and Mode
      // Use project-specific units if available, fallback to global
      const targetUnit = project?.lockedPressureUnit || pressureUnit || 'bar';
      const targetIsAbs = project?.lockedIsAbsolute !== undefined ? project.lockedIsAbsolute : (isAbsolute !== undefined ? isAbsolute : true);
      const targetAtmOffsetDisplay = getAtmOffsetForUnit(targetUnit, ambientPressureData);

      const targetValDisplayAbs = convertPressure(absoluteBarVal, 'bar', targetUnit);
      const finalDisplayVal = targetIsAbs ? targetValDisplayAbs : targetValDisplayAbs - targetAtmOffsetDisplay;

      return finalDisplayVal.toFixed(2);
    } catch (e) {
      console.error("Display pressure error:", e);
      return calc.pressure;
    }
  };

  const displayTemperatureValue = (calc, project = null) => {
    if (calc.temperature === undefined || calc.temperature === null) return '-';
    let val = parseFloat(calc.temperature);
    const sourceUnit = (calc.temperatureUnit || 'celsius').toLowerCase();

    // Use project-specific units if available, fallback to global
    const targetUnit = (project?.lockedTemperatureUnit || temperatureUnit || 'celsius').toLowerCase();

    if (sourceUnit !== targetUnit) {
      if (targetUnit === 'fahrenheit') {
        val = (val * 9 / 5) + 32;
      } else {
        val = (val - 32) * 5 / 9;
      }
    }
    return val.toFixed(2);
  };

  const displayStateCycle = (type, project = null) => {
    if (!type) return '-';

    // Determine the correct unit label for the project
    const currentTempUnit = (project?.lockedTemperatureUnit || temperatureUnit || 'celsius').toLowerCase();
    const tempLabel = currentTempUnit === 'fahrenheit' ? 'F' : 'C';

    if (type.includes('Compressor Superheat')) {
      return `Compressor Superheat(${tempLabel})`;
    }

    if (type.includes('Liquid temperature')) {
      return `Liquid temperature(${tempLabel})`;
    }

    const targetTypes = ['Evaporator Superheat', 'Condenser Subcooling', 'Compressor Superheat'];
    if (targetTypes.includes(type) && !type.includes('(K)')) {
      return `${type}(K)`;
    }
    return type;
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="project-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          {context.userMode !== 'projects' && (
            <button className="dashboard-back-btn" onClick={() => navigate('/')}>
              <ArrowLeft size={16} />
              <span>Back to Calculator</span>
            </button>
          )}
        </div>
        <div className="dashboard-actions">
          <button
            className={`btn btn-secondary ${!selectedProjectId ? 'disabled' : ''}`}
            onClick={handleCopy}
            disabled={!selectedProjectId}
          >
            <Copy size={18} />
            <span>Copy</span>
          </button>
          <button
            className={`btn btn-secondary ${copiedProjects.length === 0 ? 'disabled' : ''}`}
            onClick={handlePaste}
            disabled={copiedProjects.length === 0 || loading}
          >
            <Clipboard size={18} />
            <span>Paste</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
            <Plus size={18} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
          <h2>No Projects Found</h2>
          <p>Create a project to start managing your refrigerant conditions in table format.</p>
        </div>
      ) : (
        <div className="projects-list">
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project._id);
            const calculations = projectCalculations[project._id] || [];

            return (
              <div key={project._id} className="project-card">
                <div
                  className="project-card-header"
                  onClick={() => toggleProjectExpand(project._id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="project-selection">
                    <button
                      className="selection-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(project._id);
                      }}
                    >
                      {selectedProjectId === project._id ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </div>
                  <div className="project-info-simple">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      {renamingId === project._id && renamingType === 'project' ? (
                        <input
                          type="text"
                          className="inline-rename-input project-title-input"
                          value={tempRenameValue}
                          onChange={(e) => setTempRenameValue(e.target.value)}
                          onBlur={() => handleRenameSubmit(project)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(project);
                            if (e.key === 'Escape') handleRenameCancel();
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartProjectRename(project);
                        }} title="Double click to rename">
                          {project.name}
                        </h3>
                      )}
                      <span className="project-type-badge">{project.productType || 'Custom Project'}</span>
                    </div>
                    <p>{project.description || 'No description'} • Created {formatDate(project.createdAt)}</p>
                  </div>
                  <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                    <label className="thermoplot-control" title="Enable State Cycle ordering">
                      <span className="toggle-label">Thermoplot</span>
                      <div className="switch">
                        <input
                          type="checkbox"
                          checked={!!thermoplotActive[project._id]}
                          onChange={() => handleToggleThermoplot(project._id)}
                        />
                        <span className="slider round"></span>
                      </div>
                    </label>


                    <button
                      className="btn btn-small btn-primary add-cycle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddCycleProject(project);
                        setShowAddCycleModal(true);
                      }}
                      title="Add a new operating condition to this project"
                    >
                      <Plus size={16} />
                      <span>Add operating condition</span>
                    </button>
                    <button
                      className={`btn btn-small btn-premium plot-diagram-btn ${!thermoplotActive[project._id] ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (thermoplotActive[project._id]) {
                          handleGeneratePlot(project._id);
                        } else {
                          addToast('Enable "Thermoplot" switch first to order your state cycles.', 'info');
                        }
                      }}
                      title={thermoplotActive[project._id] ? "Plot the log P-h diagram for the state cycles" : "Enable Thermoplot switch to plot"}
                    >
                      <ArrowUp size={16} style={{ transform: 'rotate(45deg)' }} />
                      <span>Plot Diagram</span>
                    </button>
                    <button
                      className="edit-project-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                      title="Edit project details"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      className="delete-project-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="conditions-table-container">
                    <table className="conditions-table">
                      <thead>
                        <tr>
                          {thermoplotActive[project._id] && !isCustomStatePointProject(project) && <th style={{ width: '150px' }}>State Cycle</th>}
                          {thermoplotActive[project._id] && isCustomStatePointProject(project) && <th style={{ width: '180px' }}>Custom Cycle</th>}

                          <th>Cycle name</th>

                          {thermoplotActive[project._id] && <th style={{ width: '160px' }} className="input-value-cell-header">Input Value</th>}

                          {!isCustomStatePointProject(project) && (
                            <th>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>Refrigerant</span>
                                <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                  ({project.lockedRefrigerant || calculations[0]?.refrigerant || '-'})
                                </span>
                              </div>
                            </th>
                          )}

                          <th
                            className="unit-header-static"
                            title={`Pressure mode for ${project.name}: ${(project.lockedIsAbsolute !== undefined ? project.lockedIsAbsolute : isAbsolute) ? 'Absolute' : 'Gauge'}`}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span>Sat Pressure</span>
                              <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                ({project.lockedPressureUnit || pressureUnit} ({(project.lockedIsAbsolute !== undefined ? project.lockedIsAbsolute : isAbsolute) ? 'a' : 'g'}))
                              </span>
                            </div>
                          </th>
                          <th>Sat Temperature ({(project.lockedTemperatureUnit || temperatureUnit) === 'fahrenheit' ? '°F' : (project.lockedTemperatureUnit || temperatureUnit) === 'celsius' ? '°C' : ''})</th>
                          <th>Actual Temperature ({(project.lockedTemperatureUnit || temperatureUnit) === 'fahrenheit' ? '°F' : (project.lockedTemperatureUnit || temperatureUnit) === 'celsius' ? '°C' : ''})</th>
                          {isCustomStatePointProject(project) && <th>Liquid Temperature ({(project.lockedTemperatureUnit || temperatureUnit) === 'fahrenheit' ? '°F' : (project.lockedTemperatureUnit || temperatureUnit) === 'celsius' ? '°C' : ''})</th>}
                          <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculations.map((calc, idx) => {
                          const isCustomProject = isCustomStatePointProject(project);
                          return (
                            <tr key={calc._id}>
                              {thermoplotActive[project._id] && (
                                <td className="sequence-cell">
                                  <span className="sequence-label">
                                    {displayStateCycle(calc.defineStateCycle, project)}
                                  </span>
                                </td>
                              )}

                              <td
                                className="condition-name-cell"
                                onDoubleClick={() => handleStartRename(calc)}
                                title="Double click to rename"
                              >
                                {renamingId === calc._id ? (
                                  <input
                                    type="text"
                                    className="inline-rename-input"
                                    value={tempRenameValue}
                                    onChange={(e) => setTempRenameValue(e.target.value)}
                                    onBlur={() => handleRenameSubmit(calc)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRenameSubmit(calc);
                                      if (e.key === 'Escape') handleRenameCancel();
                                    }}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  calc.name
                                )}
                              </td>

                              {thermoplotActive[project._id] && (
                                <td className="input-value-cell">
                                  {(() => {
                                    const type = calc.defineStateCycle;
                                    const noInputNeeded = [
                                      'Saturated Condensation Pressure (SCP)',
                                      'Saturated Condensation Temperature (SCT)',
                                      'Saturated Evaporation Pressure (SEP)',
                                      'Saturated Evaporator Temperature (SET)',
                                      'Compressor Discharge(SCT)',
                                      'Condenser Inlet(SCT)',
                                      'Condenser Outlet(SCT)',
                                      'Expansion Device Inlet(SCT)',
                                      'Evaporator Outlet(SET)',
                                      'Compressor Suction(SET)'
                                    ].includes(type);

                                    if (noInputNeeded) return null;

                                    const autoVal = calculateAutoValue(calc, calculations);
                                    if (autoVal !== null) {
                                      return (
                                        <div className="read-only-auto-val" style={{ textAlign: 'center', color: '#0056b3', fontWeight: 'bold' }}>
                                          {autoVal.toFixed(2)}
                                        </div>
                                      );
                                    }

                                    const currentTempUnit = (project?.lockedTemperatureUnit || temperatureUnit || 'celsius').toLowerCase();
                                    const isFahrenheit = currentTempUnit === 'fahrenheit';
                                    const isCompSH = type.includes('Compressor Superheat');

                                    return (
                                      <input
                                        type="number"
                                        className="inline-rename-input"
                                        value={calc.inputValue ?? ''}
                                        placeholder={
                                          ['Evaporator Superheat', 'Condenser Subcooling', 'Compressor Superheat', 'Evaporator Superheat(K)', 'Condenser Subcooling(K)', 'Compressor Superheat(K)'].some(t => type.includes(t))
                                            ? `Value (${isCompSH ? (isFahrenheit ? 'F' : 'C') : 'K'})...`
                                            : (isInputEnabled(calc.defineStateCycle) ? "Value..." : "Formula")
                                        }
                                        disabled={!isInputEnabled(calc.defineStateCycle)}
                                        onChange={(e) => handleInputValueChange(calc._id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: '100%', opacity: !isInputEnabled(calc.defineStateCycle) ? 0.6 : 1 }}
                                        title={
                                          ['Evaporator Superheat', 'Condenser Subcooling', 'Compressor Superheat', 'Evaporator Superheat(K)', 'Condenser Subcooling(K)', 'Compressor Superheat(K)'].some(t => type.includes(t))
                                            ? `the value is in ${isCompSH ? (isFahrenheit ? '°F' : '°C') : 'Kelvin'}`
                                            : ""
                                        }
                                      />
                                    );
                                  })()}
                                </td>
                              )}

                              {!isCustomProject && (
                                <td className="refrigerant-cell">
                                  {calc.refrigerant || calculations[0]?.refrigerant || 'R407C'}
                                </td>
                              )}

                              <td>
                                {displayPressureValue(calc, project)}
                              </td>
                              <td>
                                {displayTemperatureValue(calc, project)}
                              </td>
                              <td
                                className={`actual-temp-cell ${[
                                  'Evaporator Superheat',
                                  'Condenser Subcooling',
                                  'Compressor Superheat',
                                  'Evaporator Superheat(K)',
                                  'Condenser Subcooling(K)',
                                  'Compressor Superheat(K)',
                                  'Liquid temperature'
                                ].some(t => calc.defineStateCycle.includes(t)) ? 'disabled-cell' : ''}`}
                                title={(() => {
                                  const type = calc.defineStateCycle;
                                  if ([
                                    'Saturated Condensation Temperature (SCT)',
                                    'Saturated Condensation Pressure (SCP)',
                                    'Compressor Discharge(SCT)',
                                    'Condenser Inlet(SCT)',
                                    'Condenser Outlet(SCT)',
                                    'Expansion Device Inlet(SCT)'
                                  ].includes(type)) {
                                    return 'Enter Discharge Gas Temperature Value';
                                  }
                                  if ([
                                    'Saturated Evaporator Temperature (SET)',
                                    'Saturated Evaporation Pressure (SEP)',
                                    'Evaporator Outlet(SET)',
                                    'Compressor Suction(SET)'
                                  ].includes(type)) {
                                    return 'Enter Suction Gas Temperature value';
                                  }
                                  if ([
                                    'Evaporator Superheat',
                                    'Condenser Subcooling',
                                    'Compressor Superheat',
                                    'Evaporator Superheat(K)',
                                    'Condenser Subcooling(K)',
                                    'Compressor Superheat(K)',
                                    'Liquid temperature'
                                  ].some(t => type.includes(t))) {
                                    return 'Field disabled for this state';
                                  }
                                  return '';
                                })()}
                              >
                                {(() => {
                                  const autoActual = getAutomatedCustomValue(calc, calculations, project, 'actualTemperature', temperatureUnit);
                                  const isAutomationRow = autoActual !== null;

                                  // R513A/R454B Custom State Points: liquid-phase points don't need Discharge Gas input
                                  if (isCustomProject && [
                                    'Condenser Outlet(SCT)',
                                    'Expansion Device Inlet(SCT)'
                                  ].includes(calc.defineStateCycle)) {
                                    return '-';
                                  }

                                  if (isAutomationRow) {
                                    return (
                                      <input
                                        key={`auto-actual-${calc._id}-${autoActual.toFixed(2)}`}
                                        type="number"
                                        className="inline-rename-input"
                                        defaultValue={autoActual.toFixed(2)}
                                        onChange={(e) => handleActualTemperatureChange(calc._id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ textAlign: 'center', color: '#0056b3', fontWeight: 'bold', width: '100%' }}
                                      />
                                    );
                                  }

                                  if (![
                                    'Evaporator Superheat',
                                    'Condenser Subcooling',
                                    'Compressor Superheat',
                                    'Evaporator Superheat(K)',
                                    'Condenser Subcooling(K)',
                                    'Compressor Superheat(K)',
                                    'Liquid temperature'
                                  ].some(t => calc.defineStateCycle.includes(t))) {
                                    return (
                                      <input
                                        type="number"
                                        className="inline-rename-input"
                                        value={calc.actualTemperature ?? ''}
                                        onChange={(e) => handleActualTemperatureChange(calc._id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder={(() => {
                                          const type = calc.defineStateCycle;
                                          if ([
                                            'Saturated Condensation Temperature (SCT)',
                                            'Saturated Condensation Pressure (SCP)',
                                            'Compressor Discharge(SCT)',
                                            'Condenser Inlet(SCT)',
                                            'Condenser Outlet(SCT)',
                                            'Expansion Device Inlet(SCT)'
                                          ].includes(type)) return "Discharge Gas...";
                                          if ([
                                            'Saturated Evaporator Temperature (SET)',
                                            'Saturated Evaporation Pressure (SEP)',
                                            'Evaporator Outlet(SET)',
                                            'Compressor Suction(SET)'
                                          ].includes(type)) return "Suction Gas...";
                                          return "Value...";
                                        })()}
                                        style={{ width: '100%' }}
                                      />
                                    );
                                  }
                                  return '-';
                                })()}
                              </td>
                              {isCustomProject && (
                                <td className="actual-temp-cell">
                                  {(() => {
                                    const autoLiquid = getAutomatedCustomValue(calc, calculations, project, 'liquidTemperature', temperatureUnit);

                                    // R513A/R454B Custom State Points: superheat-phase points don't need Liquid Temperature input
                                    if (isCustomProject && [
                                      'Compressor Discharge(SCT)',
                                      'Condenser Inlet(SCT)',
                                      'Evaporator Outlet(SET)',
                                      'Compressor Suction(SET)'
                                    ].includes(calc.defineStateCycle)) {
                                      return '-';
                                    }

                                    if (autoLiquid !== null) {
                                      return (
                                        <input
                                          key={`auto-liquid-${calc._id}-${autoLiquid.toFixed(2)}`}
                                          type="number"
                                          className="inline-rename-input"
                                          defaultValue={autoLiquid.toFixed(2)}
                                          onChange={(e) => handleLiquidTemperatureChange(calc._id, e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ textAlign: 'center', color: '#0056b3', fontWeight: 'bold', width: '100%', maxWidth: '100px' }}
                                        />
                                      );
                                    }

                                    if (![
                                      'Evaporator Superheat',
                                      'Condenser Subcooling',
                                      'Compressor Superheat',
                                      'Evaporator Superheat(K)',
                                      'Condenser Subcooling(K)',
                                      'Compressor Superheat(K)'
                                    ].some(t => calc.defineStateCycle.includes(t))) {
                                      return (
                                        <input
                                          type="number"
                                          className="inline-rename-input"
                                          value={calc.liquidTemperature ?? ''}
                                          onChange={(e) => handleLiquidTemperatureChange(calc._id, e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="Value..."
                                          style={{ width: '100vw', maxWidth: '100px' }}
                                        />
                                      );
                                    }
                                    return '-';
                                  })()}
                                </td>
                              )}
                              <td>
                                <div className="row-actions">
                                  <button
                                    className={`action-btn edit-btn ${['Evaporator Superheat', 'Condenser Subcooling', 'Compressor Superheat', 'Liquid temperature'].some(t => calc.defineStateCycle.includes(t)) ? 'disabled' : ''}`}
                                    onClick={() => handleFetchCondition(calc)}
                                    title={['Evaporator Superheat', 'Condenser Subcooling', 'Compressor Superheat', 'Liquid temperature'].some(t => calc.defineStateCycle.includes(t)) ? "This state is managed in the table" : "Edit / Load into calculator"}
                                    disabled={['Evaporator Superheat', 'Condenser Subcooling', 'Compressor Superheat', 'Liquid temperature'].some(t => calc.defineStateCycle.includes(t))}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteCalculation(calc)}
                                    title="Delete row"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ProjectModal
        isOpen={showProjectModal}
        editingProject={editingProject}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        onProjectCreated={async (newProject) => {
          await refreshProjects();
          if (newProject && newProject.initialCalculation) {
            handleFetchCondition(newProject.initialCalculation);
          }
        }}
        onProjectUpdated={async () => {
          await refreshProjects();
          setEditingProject(null);
        }}
      />

      {
        showConfirmDelete && (
          <ConfirmModal
            isOpen={showConfirmDelete}
            onClose={() => setShowConfirmDelete(false)}
            onConfirm={confirmDelete}
            title="Delete Project"
            message={`Are you sure you want to delete "${deleteTarget?.data?.name}"? All conditions will be lost.`}
            variant="danger"
          />
        )
      }

      <AddCycleStateModal
        isOpen={showAddCycleModal}
        onClose={() => {
          setShowAddCycleModal(false);
          setAddCycleProject(null);
        }}
        project={addCycleProject}
        existingCalculations={projectCalculations[addCycleProject?._id] || []}
        pressureUnit={pressureUnit}
        temperatureUnit={temperatureUnit}
        isAbsolute={isAbsolute}
        onSuccess={handleFetchCalculations}
      />
    </div >
  );
};

export default ProjectDashboard;
