/**
 * API Configuration
 * -----------------
 * Production : REACT_APP_API_URL is set in Vercel environment variables
 *              to the Render backend URL (e.g. https://reftools-pro-api.onrender.com/api)
 * Development: Falls back to http://localhost:5000/api
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const getApiBaseUrl = () => API_BASE_URL;

export const getAuthUrl = (endpoint) => `${API_BASE_URL}/auth/${endpoint}`;

export const getRefrigerantUrl = (endpoint) => `${API_BASE_URL}/refrigerant/${endpoint}`;

export default API_BASE_URL;
