import React, { createContext, useState, useCallback, useEffect } from 'react';

/**
 * GWP Context
 * Manages the global selected GWP standard (AR4, AR5, AR6)
 * Shared across SettingsDrawer, RefrigerantInfo, and QuickSummary
 */
export const GwpContext = createContext();

export const GwpProvider = ({ children }) => {
  const [selectedGwp, setSelectedGwp] = useState(() => {
    // Initialize from localStorage or default to AR4
    const saved = localStorage.getItem('selectedGwpStandard');
    return saved || 'AR4';
  });

  // Update localStorage whenever GWP changes
  useEffect(() => {
    localStorage.setItem('selectedGwpStandard', selectedGwp);
  }, [selectedGwp]);

  /**
   * Get GWP value for a refrigerant based on selected standard
   */
  const getGwpValue = useCallback((refrigerant, standard = selectedGwp) => {
    if (!refrigerant) return null;

    switch (standard) {
      case 'AR4':
        // Try camelCase first (current standard), then snake_case (legacy)
        return refrigerant.gwpAR4 || refrigerant.gwp_ar4 || refrigerant['GWP (AR4)'];
      case 'AR5':
        return refrigerant.gwpAR5 || refrigerant.gwp_ar5 || refrigerant['GWP (AR5)'];
      case 'AR6':
        return refrigerant.gwpAR6 || refrigerant.gwp_ar6 || refrigerant['GWP (AR6)'];
      default:
        return refrigerant.gwpAR4 || refrigerant.gwp_ar4 || refrigerant['GWP (AR4)'];
    }
  }, [selectedGwp]);

  const value = {
    selectedGwp,
    setSelectedGwp,
    getGwpValue,
  };

  return (
    <GwpContext.Provider value={value}>
      {children}
    </GwpContext.Provider>
  );
};

/**
 * Custom hook to use GWP context
 */
export const useGwp = () => {
  const context = React.useContext(GwpContext);
  if (!context) {
    throw new Error('useGwp must be used within GwpProvider');
  }
  return context;
};
