/**
 * Distance unit configuration
 * Meters: 0 - 5500 m
 * Feet: 0 - 18000 ft (approx 5500m)
 */
export const DISTANCE_UNITS = {
  METERS: 'meters',
  FEET: 'feet'
};

export const DISTANCE_UNIT_OPTIONS = [
  { value: DISTANCE_UNITS.METERS, label: 'm' },
  { value: DISTANCE_UNITS.FEET, label: 'ft' }
];

export const ALTITUDE_LIMITS = {
  [DISTANCE_UNITS.METERS]: {
    min: 0,
    max: 30510,
    step: 153, // Estimated step based on user example (0, 153, 305...)
    label: 'm'
  },
  [DISTANCE_UNITS.FEET]: {
    min: 0,
    max: 100000,
    step: 500, // Estimated step
    label: 'ft'
  }
};
