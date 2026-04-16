const express = require('express');
const router = express.Router();
const pressureController = require('../controllers/pressureController');

// Route for pressure conversion
router.post('/convert', pressureController.convertPressure);

// Route to check service status (e.g. if Excel is loaded)
router.get('/status', pressureController.getServiceStatus);

// Route to get altitude data for the slider
router.get('/altitudes', pressureController.getAltitudeData);

module.exports = router;
