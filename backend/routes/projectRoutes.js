const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const projectController = require('../controllers/projectController');

// All routes require authentication
router.use(auth.verifyUser);

// Create new project
router.post('/', projectController.createProject);

// Duplicate project
router.post('/:id/duplicate', projectController.duplicateProject);

// Get all projects for authenticated user
router.get('/', projectController.getProjects);

// Get single project by ID
router.get('/:id', projectController.getProject);

// Update project
router.put('/:id', projectController.updateProject);

// Delete project (and all its calculations)
router.delete('/:id', projectController.deleteProject);

module.exports = router;
