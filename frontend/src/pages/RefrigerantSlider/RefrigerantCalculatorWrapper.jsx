// RefrigerantCalculatorWrapper.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { createCalculation, updateCalculation } from '../../services/calculationApiService';
import RefrigerantSlider from './RefrigerantSlider';
import SaveCalculationModal from '../../components/SaveCalculationModal/SaveCalculationModal';
import SaveOptionsModal from '../../components/SaveOptionsModal/SaveOptionsModal';
import { useToast } from '../../context/ToastContext';

const RefrigerantCalculatorWrapper = () => {
  const {
    userRole,
    userMode,
    pressureUnit,
    temperatureUnit,
    distanceUnit,
    altitude,
    ambientPressureData,
    isAbsolute,
    onIsAbsoluteChange
  } = useOutletContext();
  const navigate = useNavigate();
  const { activeCalculation, activeProject, selectCalculation, refreshProjects, registerSaveHandler } = useProject();
  const { addToast } = useToast();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSaveOptionsModal, setShowSaveOptionsModal] = useState(false);
  const [calculationState, setCalculationState] = useState(null);
  const refrigerantSliderRef = useRef(null);

  const handleSaveCalculation = useCallback(() => {
    const currentState = refrigerantSliderRef.current?.exportCalculationState?.();

    if (!currentState || !currentState.refrigerant) {
      addToast('No calculation data to save. Please enter values first.', 'error');
      return;
    }

    // Capture state for modal usage if needed
    setCalculationState(currentState);

    if (activeCalculation?._id) {
      // Direct update for existing rows - bypass modal
      handleQuickUpdate(currentState);
    } else if (activeProject?._id) {
      setShowSaveOptionsModal(true);
    } else {
      setShowSaveModal(true);
    }
  }, [activeCalculation, activeProject, addToast]);

  useEffect(() => {
    const unregister = registerSaveHandler(handleSaveCalculation);
    return unregister;
  }, [registerSaveHandler, handleSaveCalculation]);

  const handlePerformSave = async (data) => {
    try {
      let result;
      // In the new Table format, we usually update a pre-existing slot (_id)
      if (data._id) {
        result = await updateCalculation(data._id, {
          ...data,
          pressureUnit,
          temperatureUnit,
          distanceUnit,
          altitude,
          ambientPressureData
        });
      } else {
        // Fallback for creating new ones if any edge case exists
        result = await createCalculation({
          ...data,
          pressureUnit,
          temperatureUnit,
          distanceUnit,
          altitude,
          ambientPressureData
        });
      }

      await refreshProjects();
      addToast('Project table updated successfully!', 'success');

      if (result && result.calculation) {
        selectCalculation(result.calculation);
      }

      setCalculationState(null);
      setShowSaveModal(false);

      // Redirect to dashboard and expand project
      navigate('/projects', { state: { expandProjectId: data.projectId } });
    } catch (error) {
      console.error('Failed to save calculation:', error);
      addToast('Failed to save: ' + error.message, 'error');
      throw error;
    }
  };

  const handleQuickUpdate = async (providedState = null) => {
    const state = providedState || calculationState;
    if (!activeCalculation?._id || !state) return;

    try {
      const result = await updateCalculation(activeCalculation._id, {
        refrigerant: state.refrigerant,
        pressure: state.pressure,
        temperature: state.temperature,
        isDew: state.isDew,
        isAbsolute: state.isAbsolute,
        pressureUnit,
        temperatureUnit,
        distanceUnit,
        altitude,
        ambientPressureData
      });

      await refreshProjects();
      addToast('Condition row updated!', 'success');

      if (result && result.calculation) {
        selectCalculation(result.calculation);
      }

      setCalculationState(null);
      setShowSaveOptionsModal(false);

      // Redirect to dashboard and expand project
      navigate('/projects', { state: { expandProjectId: activeCalculation.projectId } });
    } catch (error) {
      console.error('Failed to update calculation:', error);
      addToast('Update failed: ' + error.message, 'error');
      throw error;
    }
  };

  const handleSaveAsDifferentSlot = () => {
    setShowSaveOptionsModal(false);
    setShowSaveModal(true);
  };

  return (
    <>
      <RefrigerantSlider
        ref={refrigerantSliderRef}
        userRole={userRole}
        userMode={userMode}
        pressureUnit={pressureUnit}
        temperatureUnit={temperatureUnit}
        distanceUnit={distanceUnit}
        altitude={altitude}
        ambientPressureData={ambientPressureData}
        isAbsolute={isAbsolute}
        onIsAbsoluteChange={onIsAbsoluteChange}
        onSaveCalculation={handleSaveCalculation}
      />

      <SaveCalculationModal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setCalculationState(null);
        }}
        onSave={handlePerformSave}
        calculationData={calculationState}
      />

      <SaveOptionsModal
        isOpen={showSaveOptionsModal}
        onClose={() => setShowSaveOptionsModal(false)}
        onSave={handleQuickUpdate}
        onSaveAsNew={handleSaveAsDifferentSlot}
        showUpdate={!!activeCalculation?._id}
        showSaveAsNew={!activeCalculation?._id || activeProject?._id}
      />
    </>
  );
};

export default RefrigerantCalculatorWrapper;
