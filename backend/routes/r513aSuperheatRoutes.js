const express = require('express');
const router = express.Router();
const r513aSuperheatController = require('../controllers/r513aSuperheatController');

/**
 * R513A Superheat Routes
 * Base URL: /api/r513a/superheat
 */

/**
 * GET /api/r513a/superheat/properties
 * Get exact superheat properties for given pressure and temperature
 * Query: pressure (bar), temperature (°C)
 * Example: /api/r513a/superheat/properties?pressure=13&temperature=50
 */
router.get('/properties', r513aSuperheatController.getSuperheatProperties);

/**
 * GET /api/r513a/superheat/interpolated
 * Get interpolated superheat properties for given pressure and temperature
 * Query: pressure (bar), temperature (°C)
 * Example: /api/r513a/superheat/interpolated?pressure=13&temperature=52
 */
router.get('/interpolated', r513aSuperheatController.getSuperheatPropertiesInterpolated);

/**
 * GET /api/r513a/superheat/pressures
 * Get all available pressure levels
 */
router.get('/pressures', r513aSuperheatController.getAvailablePressures);

/**
 * GET /api/r513a/superheat/temperatures
 * Get all available temperatures for a specific pressure
 * Query: pressure (bar)
 * Example: /api/r513a/superheat/temperatures?pressure=13
 */
router.get('/temperatures', r513aSuperheatController.getAvailableTemperatures);

/**
 * GET /api/r513a/superheat/table
 * Get complete superheat property table for a specific pressure
 * Query: pressure (bar)
 * Example: /api/r513a/superheat/table?pressure=13
 */
router.get('/table', r513aSuperheatController.getSuperheatTable);

module.exports = router;
