import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getProjects } from '../services/projectService';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeCalculation, setActiveCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load projects on mount
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only load if user is authenticated
    const token = localStorage.getItem('userToken');
    if (token) {
      loadProjects();
    }
  }, []);

  const refreshProjects = useCallback(() => {
    loadProjects();
  }, [loadProjects]);

  const selectProject = useCallback((project) => {
    setActiveProject(project);
  }, []);

  const clearProject = useCallback(() => {
    setActiveProject(null);
  }, []);

  const selectCalculation = useCallback((calculation) => {
    setActiveCalculation(calculation);
  }, []);

  const clearCalculation = useCallback(() => {
    setActiveCalculation(null);
  }, []);

  const [saveHandler, setSaveHandler] = useState(null);

  const registerSaveHandler = useCallback((handler) => {
    setSaveHandler(() => handler);
    return () => setSaveHandler(null);
  }, []);

  const triggerSave = useCallback(() => {
    if (saveHandler) {
      saveHandler();
    }
  }, [saveHandler]);

  const value = useMemo(() => ({
    projects,
    activeProject,
    activeCalculation,
    loading,
    error,
    refreshProjects,
    selectProject,
    clearProject,
    selectCalculation,
    clearCalculation,
    registerSaveHandler,
    triggerSave,
    canSave: !!saveHandler
  }), [
    projects,
    activeProject,
    activeCalculation,
    loading,
    error,
    refreshProjects,
    selectProject,
    clearProject,
    selectCalculation,
    clearCalculation,
    registerSaveHandler,
    triggerSave,
    saveHandler
  ]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
