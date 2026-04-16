import { useState, useEffect } from 'react';

/**
 * Custom hook to detect device type (mobile or desktop)
 * Returns 'mobile' or 'desktop' based on screen width and touch capabilities
 */
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState(() => {
    // Initial detection
    return detectDeviceType();
  });

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(detectDeviceType());
    };

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceType;
};

/**
 * Detects device type based on screen width and touch capabilities
 */
function detectDeviceType() {
  // Check screen width
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;

  // Mobile detection: Any screen up to 1024px is treated as mobile 
  // to support split-screen views on desktop and tablets
  if (screenWidth <= 1024) {
    return 'mobile';
  }

  return 'desktop';
}

export default useDeviceType;
