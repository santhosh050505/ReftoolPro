const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const calculationController = require('../controllers/calculationController');

// Proxy TLK Energy API (no auth required for public API)
// MUST be before auth middleware to avoid being caught by /:id route
router.get('/tlk-proxy', calculationController.proxyTlkCalculation);
router.get('/point-properties', calculationController.getPointProperties);

// All routes below require authentication
router.use(auth.verifyUser);

// Create new calculation
router.post('/', calculationController.createCalculation);

// Bulk update calculations
router.post('/bulk-update', calculationController.bulkUpdateCalculations);

// Get all calculations for a specific project
router.get('/project/:projectId', calculationController.getCalculationsByProject);

// Get single calculation by ID
router.get('/:id', calculationController.getCalculation);

// Update calculation
router.put('/:id', calculationController.updateCalculation);

// Delete calculation
router.delete('/:id', calculationController.deleteCalculation);

module.exports = router;
