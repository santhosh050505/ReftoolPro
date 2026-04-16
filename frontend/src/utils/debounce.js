/**
 * Debounce utility for optimizing calculation requests
 * Prevents excessive API calls during rapid input changes
 */

/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds (default 500ms)
 * @returns {Function} Debounced function with cancel method
 */
export const debounce = (func, delay = 500) => {
  let timeoutId = null;
  
  const debounced = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
  
  // Add cancel method to clear pending calls
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
};

/**
 * Create a throttled function (executes immediately then waits)
 * @param {Function} func - Function to throttle
 * @param {number} delay - Minimum delay between calls (default 300ms)
 * @returns {Function} Throttled function with cancel method
 */
export const throttle = (func, delay = 300) => {
  let lastCallTime = 0;
  let timeoutId = null;
  
  const throttled = (...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall >= delay) {
      // Enough time has passed, call immediately
      func(...args);
      lastCallTime = now;
    } else {
      // Schedule for later
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastCallTime = Date.now();
      }, delay - timeSinceLastCall);
    }
  };
  
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return throttled;
};
