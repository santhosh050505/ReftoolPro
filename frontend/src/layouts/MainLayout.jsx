import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LogOut, Database, Save, FolderOpen, Home, Calculator, History } from "lucide-react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "../styles/layout.css";
import SettingsDrawer from "../components/SettingsDrawer/SettingsDrawer";
import ThemeToggle from "../components/ThemeToggle/ThemeToggle";
import ConfirmModal from "../components/ConfirmModal/ConfirmModal";
import { getAltitudeData } from "../api";
import { useProject } from "../context/ProjectContext";



const MainLayout = ({ userRole, userMode, onAdminPanelToggle, showCrudPanel, deviceType, isMobileAdminAvailable }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerSave, canSave, activeCalculation, activeProject } = useProject();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isGuest = userMode === 'guest';

  // Global unit state
  const [pressureUnit, setPressureUnit] = useState(() => {
    return localStorage.getItem('pressureUnit') || 'bar';
  });
  const [temperatureUnit, setTemperatureUnit] = useState(() => {
    return localStorage.getItem('temperatureUnit') || 'celsius';
  });

  // Sync units if a calculation is loaded
  useEffect(() => {
    if (activeCalculation) {
      if (activeCalculation.pressureUnit && activeCalculation.pressureUnit !== pressureUnit) {
        setPressureUnit(activeCalculation.pressureUnit);
        localStorage.setItem('pressureUnit', activeCalculation.pressureUnit);
      }
      if (activeCalculation.temperatureUnit && activeCalculation.temperatureUnit !== temperatureUnit) {
        setTemperatureUnit(activeCalculation.temperatureUnit);
        localStorage.setItem('temperatureUnit', activeCalculation.temperatureUnit);
      }
    }
  }, [activeCalculation, pressureUnit, temperatureUnit]);
  const [distanceUnit, setDistanceUnit] = useState(() => {
    return localStorage.getItem('distanceUnit') || 'meters';
  });

  // Altitude and Ambient Pressure state
  const [altitude, setAltitude] = useState(() => {
    const saved = localStorage.getItem('altitude');
    return Math.max(0, parseFloat(saved) || 0);
  });

  // Entire row data from Excel for currently selected altitude
  const [ambientPressureData, setAmbientPressureData] = useState(() => {
    const saved = localStorage.getItem('ambientPressureData');
    if (!saved || saved === 'undefined') return null;
    try {
      const data = JSON.parse(saved);
      // Ensure we don't load a row with negative altitude
      if (data && (data['Altitude (m)'] < 0 || data['Altitude (ft)'] < 0)) return null;
      return data;
    } catch (err) {
      console.warn('Failed to parse ambientPressureData from localStorage:', err);
      return null;
    }
  });

  const [altitudeRows, setAltitudeRows] = useState([]);

  // Load altitude data from API on mount
  useEffect(() => {
    const loadAltitudeData = async () => {
      try {
        const data = await getAltitudeData();
        // Filter out negative altitudes as requested
        const filteredData = data.filter(r => r['Altitude (m)'] >= 0 && r['Altitude (ft)'] >= 0);
        setAltitudeRows(filteredData);

        // If no ambient data yet, initialize with 0 altitude row
        if (!ambientPressureData && filteredData.length > 0) {
          const zeroRow = filteredData.find(r => r['Altitude (m)'] === 0) || filteredData[0];
          setAmbientPressureData(zeroRow);
          localStorage.setItem('ambientPressureData', JSON.stringify(zeroRow));
        }
      } catch (err) {
        console.error('Failed to load altitude data:', err);
      }
    };
    loadAltitudeData();
  }, [ambientPressureData]); // Added ambientPressureData to dependency array

  const [isAbsolute, setIsAbsolute] = useState(() => {
    return localStorage.getItem('isAbsolute') !== 'false'; // Default to true
  });

  const handlePressureUnitChange = useCallback((unit) => {
    if (activeProject && activeProject.lockedPressureUnit && activeProject.lockedPressureUnit !== unit) {
      alert(`Only this pressure unit is allowed for this project: ${activeProject.lockedPressureUnit}.\n\nPlease use the already selected unit.`);
      return;
    }
    setPressureUnit(unit);
    localStorage.setItem('pressureUnit', unit);
  }, [activeProject]);

  const handleIsAbsoluteChange = useCallback((isAbs) => {
    if (activeProject && activeProject.lockedIsAbsolute !== undefined && activeProject.lockedIsAbsolute !== isAbs) {
      // Enforce absolute/gauge lock if project has one
      const mode = activeProject.lockedIsAbsolute ? 'Absolute' : 'Gauge';
      alert(`This project is locked to ${mode} pressure. Please use that mode.`);
      return;
    }
    setIsAbsolute(isAbs);
    localStorage.setItem('isAbsolute', isAbs);
  }, [activeProject]);

  const handleTemperatureUnitChange = useCallback((unit) => {
    if (activeProject && activeProject.lockedTemperatureUnit && activeProject.lockedTemperatureUnit !== unit) {
      const lockedLabel = activeProject.lockedTemperatureUnit === 'fahrenheit' ? '°F' : '°C';
      alert(`Only this temperature unit is allowed for this project: ${lockedLabel}.\n\nPlease use the already selected unit.`);
      return;
    }
    setTemperatureUnit(unit);
    localStorage.setItem('temperatureUnit', unit);
  }, [activeProject]);

  const handleDistanceUnitChange = useCallback((unit) => {
    setDistanceUnit(unit);
    localStorage.setItem('distanceUnit', unit);
  }, []);

  const handleAltitudeChange = useCallback((newAltitude, row) => {
    setAltitude(newAltitude);
    setAmbientPressureData(row);
    localStorage.setItem('altitude', newAltitude);
    localStorage.setItem('ambientPressureData', JSON.stringify(row));
  }, []);

  // ✅ UPDATED: Show confirmation before logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleGoHome = () => {
    if (isGuest) {
      // For guest users, clicking Home should logout and return to login page
      confirmLogout();
    } else {
      localStorage.removeItem('userMode');
      // Using window.location.href to force a full refresh and trigger the App.jsx re-render for mode selection
      window.location.href = '/';
    }
  };

  const confirmLogout = () => {
    // Clear authentication tokens and role
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userMode');
    // Redirect to login page
    window.location.href = '/';
  };

  const handleAdminPanelClick = useCallback(() => {
    // On mobile, navigate to dedicated mobile admin page
    if (deviceType === 'mobile' && isMobileAdminAvailable) {
      navigate('/mobile-admin');
    } else if (onAdminPanelToggle) {
      // On desktop, toggle the panel
      onAdminPanelToggle();
    }
  }, [deviceType, isMobileAdminAvailable, navigate, onAdminPanelToggle]);

  const isAdmin = userRole === 'admin';

  // Dynamic title based on route
  const getPageTitle = () => {
    if (isAdmin) return 'Admin Panel';
    if (location.pathname === '/projects') {
      return userMode === 'projects' ? 'Saved Projects' : 'My Projects';
    }
    if (location.pathname === '/history') return 'Calculation History';
    if (location.pathname.startsWith('/projects/')) return 'Project Details';
    return 'Refrigerant calculator';
  };

  const title = getPageTitle();

  return (
    <div className="main-layout">
      <div className="header-bar">
        <div className="header-left-area">
          <button
            className="header-btn header-nav-home"
            onClick={handleGoHome}
            title="Go to Home Page"
          >
            <Home size={18} />
            <span>Home</span>
          </button>
        </div>
        <div className="header-title">{title}</div>
        <div className="header-actions">
          <ThemeToggle />
          {location.pathname !== '/projects' && (
            <button
              className="header-btn header-settings"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              aria-label="Open settings"
            >
              <span className="header-icon">⚙️</span>
            </button>
          )}
          {!isAdmin && !isGuest && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`header-btn header-home ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
                title="Calculator"
                style={{
                  display: (location.pathname === '/' || userMode === 'projects') ? 'none' : 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <Calculator size={18} />
                <span>Calculator</span>
              </button>

              <button
                className={`header-btn header-projects ${location.pathname.startsWith('/projects') ? 'active' : ''}`}
                onClick={() => navigate('/projects')}
                title="My Projects"
                style={{
                  display: ((userMode === 'projects' || userMode === 'new-project' || userMode === 'dashboard-project') && !location.pathname.startsWith('/projects')) ? 'flex' : 'none',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <FolderOpen size={18} />
                <span>My Projects</span>
              </button>

              <button
                className={`header-btn header-history ${location.pathname === '/history' ? 'active' : ''}`}
                onClick={() => navigate('/history')}
                title="Calculation History"
                style={{
                  display: userMode === 'dashboard' ? 'flex' : 'none',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <History size={18} />
                <span>History</span>
              </button>

              {canSave && (
                <button
                  className="header-btn header-save"
                  onClick={triggerSave}
                  title="Save Calculation"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <Save size={18} />
                  <span>Save</span>
                </button>
              )}
            </div>
          )}
          {isAdmin && handleAdminPanelClick && (
            <button
              className="header-btn header-admin-panel"
              onClick={handleAdminPanelClick}
              title={showCrudPanel ? 'Close Admin Panel' : 'Open Admin Panel'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <Database size={18} />
              <span>{showCrudPanel ? 'Hide Panel' : 'Show Panel'}</span>
            </button>
          )}
          <button
            className="header-btn header-logout"
            onClick={handleLogout}
            title="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ✅ NEW: Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <ConfirmModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={confirmLogout}
          title="Confirm Logout"
          message="Are you sure you want to log out? You will need to sign in again to access the app."
          confirmText="Yes, Logout"
          cancelText="Cancel"
          variant="warning"
        />
      )}
      <div className="main-content">
        <Outlet context={useMemo(() => ({
          userRole,
          userMode,
          deviceType,
          pressureUnit,
          temperatureUnit,
          distanceUnit,
          altitude,
          ambientPressureData,
          isAbsolute,
          onPressureUnitChange: handlePressureUnitChange,
          onTemperatureUnitChange: handleTemperatureUnitChange,
          onIsAbsoluteChange: handleIsAbsoluteChange,
          onDistanceUnitChange: handleDistanceUnitChange,
          onAltitudeChange: handleAltitudeChange
        }), [
          userRole,
          userMode,
          deviceType,
          pressureUnit,
          temperatureUnit,
          isAbsolute,
          distanceUnit,
          altitude,
          ambientPressureData,
          handlePressureUnitChange,
          handleTemperatureUnitChange,
          handleIsAbsoluteChange,
          handleDistanceUnitChange,
          handleAltitudeChange
        ])} />
      </div>
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        pressureUnit={pressureUnit}
        temperatureUnit={temperatureUnit}
        distanceUnit={distanceUnit}
        altitude={altitude}
        altitudeRows={altitudeRows}
        onPressureUnitChange={handlePressureUnitChange}
        onTemperatureUnitChange={handleTemperatureUnitChange}
        onDistanceUnitChange={handleDistanceUnitChange}
        onAltitudeChange={handleAltitudeChange}
        isAbsolute={isAbsolute}
        onIsAbsoluteChange={handleIsAbsoluteChange}
      />
    </div>
  );
};

export default MainLayout;
