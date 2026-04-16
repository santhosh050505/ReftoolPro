const express = require('express');
const router = express.Router();
const r454bCycleController = require('../controllers/r454bCycleController');

router.post('/cycle/plot', r454bCycleController.calculateCyclePlottingPoints);
router.post('/cycle/validate', r454bCycleController.validateCycleInputs);

/**
 * POST /api/r454b/point-props
 * CoolProp batch property lookup for Custom State Point graphs
 * Body: { points: [{p: <bar>, t: <°C>}, ...] }
 */
router.post('/point-props', r454bCycleController.calculateBatchPointProps);

module.exports = router;

