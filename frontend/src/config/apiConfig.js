/**
 * API Configuration
 * Dynamically detects the backend URL based on environment
 * Handles both same-host (localhost) and separate tunnel URLs (devtunnels.ms)
 */

let API_BASE_URL = 'http://localhost:5000/api';

// Check if we have an environment variable
if (process.env.REACT_APP_API_URL) {
  API_BASE_URL = process.env.REACT_APP_API_URL;
} else {
  // For production or dev tunnel scenarios, detect the backend URL
  try {
    const currentURL = new URL(window.location.href);
    const hostname = currentURL.hostname;
    const protocol = currentURL.protocol;

    // If on a dev tunnel or non-localhost domain
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Check if hostname contains port number (e.g., "5zf1snzp-3000.inc1.devtunnels.ms")
      // Replace "3000" with "5000" in the hostname to get the backend URL
      let backendHostname = hostname;

      if (hostname.includes('-3000.')) {
        backendHostname = hostname.replace('-3000.', '-5000.');
      } else if (hostname.includes(':3000')) {
        backendHostname = hostname.replace(':3000', ':5000');
      }

      // For devtunnels or similar, use HTTPS
      const backendProtocol = protocol.includes('https') ? 'https:' : 'http:';
      API_BASE_URL = `${backendProtocol}//${backendHostname}/api`;
    }
  } catch (error) {
    // API URL detection failed, using default
  }
}

export const getApiBaseUrl = () => API_BASE_URL;

export const getAuthUrl = (endpoint) => {
  return `${API_BASE_URL}/auth/${endpoint}`;
};

export const getRefrigerantUrl = (endpoint) => {
  return `${API_BASE_URL}/refrigerant/${endpoint}`;
};

export default API_BASE_URL;
