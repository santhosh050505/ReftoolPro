const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const createHistory = async (historyData) => {
  try {
    const response = await fetch(`${API_URL}/history`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(historyData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save history');
    }

    return await response.json();
  } catch (error) {
    console.error('Create history API error:', error);
    throw error;
  }
};

export const getHistory = async () => {
  try {
    const response = await fetch(`${API_URL}/history`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch history');
    }

    return await response.json();
  } catch (error) {
    console.error('Get history API error:', error);
    throw error;
  }
};

export const deleteHistoryEntry = async (id) => {
  try {
    const response = await fetch(`${API_URL}/history/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete history entry');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete history entry API error:', error);
    throw error;
  }
};

export const clearHistory = async () => {
  try {
    const response = await fetch(`${API_URL}/history/all`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clear history');
    }

    return await response.json();
  } catch (error) {
    console.error('Clear history API error:', error);
    throw error;
  }
};
