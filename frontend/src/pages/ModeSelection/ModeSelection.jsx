import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FolderOpen, Calculator, Users, LogOut } from 'lucide-react';
import { DeviceContext } from '../../App';
import ProjectModal from '../../components/ProjectModal/ProjectModal';
import { useProject } from '../../context/ProjectContext';
import './ModeSelection.css';

const ModeSelection = ({ onSelectMode }) => {
  const navigate = useNavigate();
  const { deviceType } = useContext(DeviceContext) || { deviceType: 'desktop' };
  const { refreshProjects, selectCalculation } = useProject();
  const [showProjectModal, setShowProjectModal] = useState(false);

  const handleProjectCreated = async (newProject) => {
    await refreshProjects();

    // Check if we should go to calculator or dashboard
    if (newProject && newProject.initialCalculation) {
      // Sync units to localStorage so the calculator matches the project settings
      if (newProject.lockedPressureUnit) {
        localStorage.setItem('pressureUnit', newProject.lockedPressureUnit);
      }
      if (newProject.lockedTemperatureUnit) {
        localStorage.setItem('temperatureUnit', newProject.lockedTemperatureUnit);
      }

      // Set the calculation as active for the slider
      selectCalculation(newProject.initialCalculation);

      // Setup session storage for instant load in calculator
      sessionStorage.setItem('loadCalculationData', JSON.stringify(newProject.initialCalculation));

      // Update global mode to 'dashboard-project' (hides history button)
      onSelectMode('dashboard-project');
    } else {
      // Just go to the dashboard
      onSelectMode('projects');
    }

    setShowProjectModal(false);
  };

  const handleBackToLogin = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userMode');
    window.location.href = '/';
  };

  return (
    <div className="mode-selection-root">
      <div className="mode-selection-container">
        <div className="mode-header">
          <h1 className="mode-title">Welcome back to RefTools Pro</h1>
          <p className="mode-subtitle">What would you like to do today?</p>
        </div>

        <div className={`mode-cards-grid ${deviceType === 'mobile' ? 'mobile' : ''} three-cards`}>
          {/* New Project Card */}
          <div className="mode-card action-card new-project" onClick={() => setShowProjectModal(true)}>
            <div className="mode-card-icon-box action-icon new-project">
              <PlusCircle size={32} />
            </div>
            <div className="mode-card-content">
              <h2 className="mode-card-title">New Project</h2>
              <p className="mode-card-description">
                Start a fresh refrigeration project and save your calculations.
              </p>
            </div>
            <button className="mode-card-btn action-btn new-project">Create Project</button>
          </div>

          {/* Saved Projects Card */}
          <div className="mode-card action-card saved-projects" onClick={() => onSelectMode('projects')}>
            <div className="mode-card-icon-box action-icon saved-projects">
              <FolderOpen size={32} />
            </div>
            <div className="mode-card-content">
              <h2 className="mode-card-title">Saved Projects</h2>
              <p className="mode-card-description">
                Access and manage your previously saved refrigeration projects.
              </p>
            </div>
            <button className="mode-card-btn action-btn saved-projects">Open Dashboard</button>
          </div>

          {/* Quick Slide Card */}
          <div className="mode-card action-card quick-slide" onClick={() => onSelectMode('dashboard')}>
            <div className="mode-card-icon-box action-icon quick-slide">
              <Calculator size={32} />
            </div>
            <div className="mode-card-content">
              <h2 className="mode-card-title">Quick Slide</h2>
              <p className="mode-card-description">
                Instant calculations using the refrigerant slide tool.
              </p>
            </div>
            <button className="mode-card-btn action-btn quick-slide">Start Calculating</button>
          </div>
        </div>

        <div className="mode-selection-footer">
          <button className="back-to-login-btn" onClick={handleBackToLogin}>
            <LogOut size={18} />
            <span>Back to Login</span>
          </button>
        </div>
      </div>

      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};

export default ModeSelection;
