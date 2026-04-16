import React, { useState, useEffect, createContext } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/Login/LoginPage';
import MainLayout from './layouts/MainLayout';
import RefrigerantCalculatorWrapper from './pages/RefrigerantSlider/RefrigerantCalculatorWrapper';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import MobileAdminPage from './pages/AdminDashboard/MobileAdminPage';
import ProjectDashboard from './pages/ProjectDashboard/ProjectDashboard';
import HistoryPage from './pages/History/HistoryPage';
import ThermoplotPage from './pages/Thermoplot/ThermoplotPage';
import { GwpProvider } from './context/GwpContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { ToastProvider } from './context/ToastContext';
import { useDeviceType } from './hooks/useDeviceType';
import { getAuthUrl } from './config/apiConfig';
import './styles/theme.css';
import './styles/light-mode.css';
import './styles/layout.css';
import './styles/controls.css';

import ModeSelection from './pages/ModeSelection/ModeSelection';

// Create Device Context
export const DeviceContext = createContext();

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showCrudPanel, setShowCrudPanel] = useState(false);
  const deviceType = useDeviceType();
  const [userMode, setUserMode] = useState(() => localStorage.getItem('userMode'));

  const handleSelectMode = (mode) => {
    localStorage.setItem('userMode', mode);
    setUserMode(mode);

    // Proper navigation based on mode
    if (mode === 'new-project') {
      navigate('/projects', { state: { openModal: true } });
    } else if (mode === 'projects') {
      navigate('/projects');
    } else if (mode === 'dashboard' || mode === 'dashboard-project') {
      navigate('/');
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');

    if (token) {
      // For guests, we don't need backend verification
      if (token === 'guest-token') {
        setIsAuthenticated(true);
        setUserRole('user');
        return;
      }

      // For admin, we just verify the token exists
      if (role === 'admin') {
        setIsAuthenticated(true);
        setUserRole('admin');
      } else {
        // For regular users, verify token with backend
        const verifyUrl = getAuthUrl('verify');
        fetch(verifyUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setIsAuthenticated(true);
              setUserRole(data.user.role || 'user');
            } else {
              localStorage.removeItem('userToken');
              localStorage.removeItem('userRole');
              localStorage.removeItem('userMode');
              setIsAuthenticated(false);
            }
          })
          .catch(() => {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userMode');
            setIsAuthenticated(false);
          });
      }
    }
  }, []);

  return (
    <ThemeProvider>
      <GwpProvider>
        <ToastProvider>
          <ProjectProvider>
            <DeviceContext.Provider value={{ deviceType }}>
              <Routes>
                {!isAuthenticated ? (
                  // Not authenticated: always show login
                  <Route path="*" element={<LoginPage />} />
                ) : userRole === 'admin' ? (
                  // Admin routes
                  <Route
                    element={
                      <MainLayout
                        userRole={userRole}
                        deviceType={deviceType}
                        onAdminPanelToggle={() => setShowCrudPanel(!showCrudPanel)}
                        showCrudPanel={showCrudPanel}
                        isMobileAdminAvailable={deviceType === 'mobile'}
                      />
                    }
                  >
                    <Route path="/mobile-admin" element={<MobileAdminPage />} />
                    <Route
                      path="*"
                      element={
                        <AdminDashboard
                          showCrudPanel={showCrudPanel}
                          onShowCrudPanelChange={setShowCrudPanel}
                          deviceType={deviceType}
                        />
                      }
                    />
                  </Route>
                ) : !userMode && userRole === 'user' ? (
                  // Authenticated user but haven't selected action yet
                  <Route path="*" element={<ModeSelection onSelectMode={handleSelectMode} />} />
                ) : (
                  // Regular user routes - once mode is selected, allow free navigation
                  <Route element={<MainLayout userRole={userRole} userMode={userMode} deviceType={deviceType} />}>
                    <Route path="/projects" element={(userMode || 'dashboard') === 'guest' ? <Navigate to="/" replace /> : <ProjectDashboard />} />
                    <Route path="/history" element={(userMode || 'dashboard') === 'guest' ? <Navigate to="/" replace /> : <HistoryPage />} />
                    <Route path="/thermoplot/:projectId" element={<ThermoplotPage />} />
                    <Route path="/" element={<RefrigerantCalculatorWrapper />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                )}
              </Routes>
            </DeviceContext.Provider>
          </ProjectProvider>
        </ToastProvider>
      </GwpProvider>
    </ThemeProvider>
  );
}

export default App;