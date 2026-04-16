const express = require('express');
const router = express.Router();
const r513aCycleController = require('../controllers/r513aCycleController');
const r513aSaturationController = require('../controllers/r513aSaturationController');

/**
 * R513A Saturation & Cycle Routes
 * Base URL: /api/r513a
 */

/**
 * SATURATION ENDPOINTS
 */

/**
 * GET /api/r513a/saturation/temp-range
 * Get available temperature range in saturation table
 */
router.get('/saturation/temp-range', r513aSaturationController.getTemperatureRange);

/**
 * GET /api/r513a/saturation/properties?temperature=50
 * Get saturation properties at specific temperature
 */
router.get('/saturation/properties', r513aSaturationController.getSaturationProperties);

/**
 * GET /api/r513a/saturation/table
 * Get complete saturation table
 */
router.get('/saturation/table', r513aSaturationController.getSaturationTable);

/**
 * CYCLE ENDPOINTS
 */

/**
 * POST /api/r513a/cycle/plot
 * Calculate 4-point cycle for plotting
 * Body: {
 *   sct: 5.0,           // Subcooling Temperature (°C)
 *   set: 10.0,          // Superheating Temperature (°C)
 *   dischargeTempRef: 50,  // Discharge gas temp (optional)
 *   suctionTempRef: 15     // Suction gas temp (optional)
 * }
 */
router.post('/cycle/plot', r513aCycleController.calculateCyclePlottingPoints);

/**
 * POST /api/r513a/point-props
 * CoolProp batch property lookup for Custom State Point graphs
 * Body: { points: [{p: <bar>, t: <°C>}, ...] }
 */
router.post('/point-props', r513aCycleController.calculateBatchPointProps);

/**
 * POST /api/r513a/cycle/validate
 * Validate cycle input parameters
 * Body: { sct, set }
 */
router.post('/cycle/validate', r513aCycleController.validateCycleInputs);

module.exports = router;
