import { getApiBaseUrl } from '../config/apiConfig';

// Get authentication token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('userToken');
};

// Create authorization headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Create new calculation
export const createCalculation = async (calculationData) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/calculations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(calculationData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save calculation');
    }

    return data;
  } catch (error) {
    console.error('Create calculation error:', error);
    throw error;
  }
};

// Get all calculations for a project
export const getCalculationsByProject = async (projectId) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/calculations/project/${projectId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch calculations');
    }

    return data.calculations || [];
  } catch (error) {
    console.error('Get calculations error:', error);
    throw error;
  }
};

// Get single calculation by ID
export const getCalculation = async (calculationId) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/calculations/${calculationId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch calculation');
    }

    return data.calculation;
  } catch (error) {
    console.error('Get calculation error:', error);
    throw error;
  }
};

// Update calculation
export const updateCalculation = async (calculationId, calculationData) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/calculations/${calculationId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(calculationData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update calculation');
    }

    return data;
  } catch (error) {
    console.error('Update calculation error:', error);
    throw error;
  }
};

// [NEW] Bulk update calculations (useful for reordering)
export const bulkUpdateCalculations = async (updates) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/calculations/bulk-update`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to bulk update calculations');
    }

    return data;
  } catch (error) {
    console.error('Bulk update calculations error:', error);
    throw error;
  }
};

// Delete calculation
export const deleteCalculation = async (calculationId) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/calculations/${calculationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete calculation');
    }

    return data;
  } catch (error) {
    console.error('Delete calculation error:', error);
    throw error;
  }
};
