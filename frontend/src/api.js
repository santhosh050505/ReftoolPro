import API_BASE_URL from './config/apiConfig';

// Calculate pressure from temperature
export const calculatePressure = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/pressure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Calculate temperature from pressure
export const calculateTemperature = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/temperature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Get slider data
export const getSliderData = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/slider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Get list of refrigerants
export const getRefrigerantList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/list`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Get range data for a specific refrigerant
export const getRefrigerantRanges = async (refrigerant) => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/ranges/${encodeURIComponent(refrigerant)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error in getRefrigerantRanges:', error);
    throw error;
  }
};

// Backward compatibility
export const fetchRefrigerantData = getRefrigerantList;

// ==================== ADMIN CRUD OPERATIONS ====================

/**
 * Get all refrigerants (Admin)
 */
export const getAllRefrigerants = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/admin/all`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // The backend returns { success, count, refrigerants }
    // Extract the refrigerants array
    if (data.refrigerants && Array.isArray(data.refrigerants)) {
      return data.refrigerants;
    } else if (Array.isArray(data)) {
      // Fallback if response is already an array
      return data;
    } else {
      console.warn('Unexpected response format from getAllRefrigerants:', data);
      return [];
    }
  } catch (error) {
    console.error('API Error in getAllRefrigerants:', error);
    throw error;
  }
};

/**
 * Add new refrigerant (Admin)
 */
export const addNewRefrigerant = async (refrigerantData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/admin/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refrigerantData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Update existing refrigerant (Admin)
 */
export const updateExistingRefrigerant = async (name, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/admin/update/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Delete refrigerant (Admin)
 */
export const deleteExistingRefrigerant = async (name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/refrigerant/admin/delete/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ==================== PRESSURE CONVERSION (ALTITUDE) ====================

/**
 * Get all altitude data rows from Excel
 */
export const getAltitudeData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/pressure/altitudes`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('API Error in getAltitudeData:', error);
    throw error;
  }
};

/**
 * Convert pressure based on altitude
 */
export const convertPressureAtAltitude = async (params) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pressure/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('API Error in convertPressureAtAltitude:', error);
    throw error;
  }
};