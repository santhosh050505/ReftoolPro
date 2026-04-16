// backend/routes/refrigerantRoutes.js
const express = require('express');
const router = express.Router();
const refrigerantController = require('../controllers/refrigerantController');

// Get refrigerant metadata (limits, available modes)
router.get('/metadata', refrigerantController.getMetadata);

// Calculate pressure from temperature
router.post('/pressure', refrigerantController.calculatePressure);

// Calculate temperature from pressure
router.post('/temperature', refrigerantController.calculateTemperature);

// Get slider data
router.post('/slider', refrigerantController.getSliderData);

// Get list of refrigerants
router.get('/list', refrigerantController.list);

// Get range data for a specific refrigerant
router.get('/ranges/:refrigerant', refrigerantController.getRanges);

// Admin: Get all refrigerants from CSV
router.get('/admin/all', refrigerantController.getAllRefrigerants);

// Admin: Add new refrigerant to CSV
router.post('/admin/add', refrigerantController.addRefrigerant);

// Admin: Update refrigerant in CSV
router.put('/admin/update/:id', refrigerantController.updateRefrigerant);

// Admin: Delete refrigerant from CSV
router.delete('/admin/delete/:id', refrigerantController.deleteRefrigerant);

module.exports = router;