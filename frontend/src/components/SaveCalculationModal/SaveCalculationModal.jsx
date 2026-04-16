import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { createProject } from '../../services/projectService';
import { getCalculationsByProject } from '../../services/calculationApiService';
import '../ProjectModal/ProjectModal.css';
import './SaveCalculationModal.css';

const SaveCalculationModal = ({ isOpen, onClose, onSave, calculationData }) => {
  const { projects, activeProject, refreshProjects } = useProject();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [conditions, setConditions] = useState([]);
  const [saveMode, setSaveMode] = useState('new'); // 'new' or 'overwrite'
  const [selectedConditionId, setSelectedConditionId] = useState('');
  const [conditionName, setConditionName] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [error, setError] = useState(null);
  const [actualTemperature, setActualTemperature] = useState('');

  // Load active project or first project by default
  useEffect(() => {
    if (isOpen && projects.length > 0 && !selectedProjectId) {
      const initialProjectId = activeProject?._id || projects[0]._id;
      setSelectedProjectId(initialProjectId);
    }
  }, [isOpen, projects, selectedProjectId, activeProject]);

  // Load conditions when project changes
  useEffect(() => {
    if (selectedProjectId && isOpen) {
      setLoadingConditions(true);
      getCalculationsByProject(selectedProjectId)
        .then(data => {
          setConditions(data);

          let nextMode = 'new';
          if (data.length >= 10) {
            nextMode = 'overwrite';
          }
          setSaveMode(nextMode);

          if (data.length > 0) {
            const initialCond = data[0];
            setSelectedConditionId(initialCond._id);

            if (nextMode === 'overwrite') {
              setConditionName(initialCond.name);
            } else {
              setConditionName('');
            }
          } else {
            setSelectedConditionId('');
            setConditionName('');
          }
        })
        .catch(err => {
          console.error("Failed to load project conditions:", err);
          setError("Failed to load project data");
        })
        .finally(() => setLoadingConditions(false));
    }
  }, [selectedProjectId, isOpen]);

  const handleModeChange = (mode) => {
    setSaveMode(mode);
    if (mode === 'overwrite' && conditions.length > 0) {
      const selected = conditions.find(c => c._id === selectedConditionId) || conditions[0];
      setSelectedConditionId(selected._id);
      setConditionName(selected.name);
    } else {
      setConditionName('');
    }
    setActualTemperature('');
  };

  const handleConditionSelect = (e) => {
    const id = e.target.value;
    setSelectedConditionId(id);
    const cond = conditions.find(c => c._id === id);
    if (cond) {
      setConditionName(cond.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!conditionName.trim()) {
      setError('Condition name is required');
      return;
    }

    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }

    if (saveMode === 'overwrite' && !selectedConditionId) {
      setError('Please select a row to overwrite');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        projectId: selectedProjectId,
        name: conditionName.trim(),
        actualTemperature: actualTemperature.trim() !== '' ? Number(actualTemperature) : null,
        ...calculationData
      };

      if (saveMode === 'overwrite') {
        payload._id = selectedConditionId;
      }

      await onSave(payload);

      // Close modal
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save calculation');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createProject(
        newProjectName.trim(),
        '', // description
        'Custom Project',
        '', // initial cycle state
        '', // refrigerant
        calculationData?.pressureUnit || localStorage.getItem('pressureUnit') || 'bar',
        calculationData?.temperatureUnit || localStorage.getItem('temperatureUnit') || 'celsius'
      );
      await refreshProjects();
      setSelectedProjectId(result.project._id);
      setNewProjectName('');
      setShowNewProjectForm(false);
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewProjectName('');
    setShowNewProjectForm(false);
    setError(null);
    setConditionName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content save-calculation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Save to Project Table</h2>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="project-select">1. Select Project *</label>
            {showNewProjectForm ? (
              <div className="new-project-inline">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="New project name"
                  maxLength={100}
                  disabled={loading}
                />
                <div className="new-project-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    onClick={handleCreateNewProject}
                    disabled={loading || !newProjectName.trim()}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => {
                      setShowNewProjectForm(false);
                      setNewProjectName('');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="no-projects-container">
                <div className="no-projects-message">No projects available.</div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewProjectForm(true)}
                  disabled={loading}
                  style={{ marginTop: '8px', width: '100%' }}
                >
                  + Create New Project
                </button>
              </div>
            ) : (
              <>
                <select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={loading || loadingConditions}
                >
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setShowNewProjectForm(true)}
                  disabled={loading}
                >
                  + Create New Project
                </button>
              </>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>2. Save Option *</label>
            <div className="save-mode-options">
              <label className={`mode-option ${saveMode === 'new' ? 'active' : ''} ${conditions.length >= 10 ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  name="saveMode"
                  value="new"
                  checked={saveMode === 'new'}
                  onChange={() => handleModeChange('new')}
                  disabled={loading || loadingConditions || conditions.length >= 10}
                />
                <div className="option-content">
                  <span className="option-title">Save as new</span>
                  <span className="option-desc">Create a new entry in this project ({conditions.length}/10 used)</span>
                </div>
              </label>

              <label className={`mode-option ${saveMode === 'overwrite' ? 'active' : ''} ${conditions.length === 0 ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  name="saveMode"
                  value="overwrite"
                  checked={saveMode === 'overwrite'}
                  onChange={() => handleModeChange('overwrite')}
                  disabled={loading || loadingConditions || conditions.length === 0}
                />
                <div className="option-content">
                  <span className="option-title">Update Row</span>
                  <span className="option-desc">Replace an existing row's data</span>
                </div>
              </label>
            </div>
          </div>

          {saveMode === 'overwrite' && conditions.length > 0 && (
            <div className="form-group animated fadeIn" style={{ marginTop: '16px' }}>
              <label htmlFor="condition-select">3. Select Row to Overwrite *</label>
              <select
                id="condition-select"
                value={selectedConditionId}
                onChange={handleConditionSelect}
                disabled={loading || loadingConditions}
              >
                {conditions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.refrigerant})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="actual-temperature">
              {saveMode === 'new' ? '3. Actual Temperature (Optional)' : '4. Update Actual Temperature (Optional)'}
            </label>
            <input
              id="actual-temperature"
              type="number"
              step="any"
              value={actualTemperature}
              onChange={(e) => setActualTemperature(e.target.value)}
              placeholder="Enter manual temperature reading"
              disabled={loading || loadingConditions}
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="condition-name">
              {saveMode === 'new' ? '4. operating condition' : '5. Rename operating condition (Optional)'}
            </label>
            <input
              id="condition-name"
              type="text"
              value={conditionName}
              onChange={(e) => setConditionName(e.target.value)}
              placeholder="e.g. Suction, Discharge, Condensing"
              maxLength={100}
              disabled={loading || loadingConditions}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '24px' }}>
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
              disabled={loading || loadingConditions || !conditionName.trim() || (saveMode === 'overwrite' && !selectedConditionId)}
            >
              {loading ? 'Saving...' : saveMode === 'new' ? 'Save as new' : 'Update Row'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveCalculationModal;
