const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const historyController = require('../controllers/historyController');

// All routes require authentication
router.use(auth.verifyUser);

// Create new history entry
router.post('/', historyController.createHistory);

// Get all history entries for current user
router.get('/', historyController.getHistoryByUser);

// Clear all history
router.delete('/all', historyController.clearAllHistory);

// Delete single history entry
router.delete('/:id', historyController.deleteHistoryEntry);

module.exports = router;
