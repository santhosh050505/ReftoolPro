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

// Create new project
export const createProject = async (name, description = '', productType = 'Custom Project', initialCycleStateName = '', refrigerant = '', pressureUnit = '', temperatureUnit = '', stateCycle = 'Select your option', compressorEfficiency = 1.0) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        description,
        productType,
        initialCycleStateName,
        refrigerant,
        pressureUnit,
        temperatureUnit,
        stateCycle: stateCycle || 'Select your option',
        compressorEfficiency: compressorEfficiency || 1.0
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create project');
    }

    return data;
  } catch (error) {
    console.error('Create project error:', error);
    throw error;
  }
};

// Get all projects for current user
export const getProjects = async () => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/projects`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch projects');
    }

    return data.projects || [];
  } catch (error) {
    console.error('Get projects error:', error);
    throw error;
  }
};

// Get single project by ID
export const getProject = async (projectId) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/projects/${projectId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch project');
    }

    return data.project;
  } catch (error) {
    console.error('Get project error:', error);
    throw error;
  }
};

// Update project
export const updateProject = async (projectId, name, productType = '', stateCycle = 'Select your option', compressorEfficiency = 1.0, lockedPressureUnit = null, lockedTemperatureUnit = null, lockedIsAbsolute = true) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/projects/${projectId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        productType,
        stateCycle,
        compressorEfficiency,
        lockedPressureUnit,
        lockedTemperatureUnit,
        lockedIsAbsolute
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update project');
    }

    return data;
  } catch (error) {
    console.error('Update project error:', error);
    throw error;
  }
};

// Delete project
export const deleteProject = async (projectId) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete project');
    }

    return data;
  } catch (error) {
    console.error('Delete project error:', error);
    throw error;
  }
};

// Duplicate project
export const duplicateProject = async (projectId) => {
  try {
    const id = projectId.toString().trim();
    const response = await fetch(`${getApiBaseUrl()}/projects/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const htmlText = await response.text();
      console.error('Server returned HTML instead of JSON:', htmlText);
      throw new Error(`Server Error: The request failed with status ${response.status}. Please check backend logs.`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to duplicate project');
    }

    return data;
  } catch (error) {
    console.error('Duplicate project service error:', error);
    throw error;
  }
};
