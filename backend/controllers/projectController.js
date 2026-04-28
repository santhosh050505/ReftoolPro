// backend/controllers/projectController.js — Supabase version
const Project = require('../models/Project');
const Calculation = require('../models/Calculation');

// Create new project
exports.createProject = async (req, res) => {
  try {
    const { name, description, productType, initialCycleStateName, refrigerant } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim().length === 0)
      return res.status(400).json({ error: 'Project name is required' });

    const project = await Project.create({
      user_id: userId,
      name: name.trim(),
      description: description ? description.trim() : '',
      product_type: productType || 'Custom Project',
      locked_refrigerant: (refrigerant && refrigerant.trim()) ? refrigerant.trim() : null,
      locked_pressure_unit: req.body.pressureUnit || null,
      locked_temperature_unit: req.body.temperatureUnit || null,
      locked_is_absolute: req.body.isAbsolute !== undefined ? req.body.isAbsolute : true,
      state_cycle: req.body.stateCycle || 'Select your option',
      compressor_efficiency: req.body.compressorEfficiency || 1.0
    });

    let initialCalculation = null;
    if (initialCycleStateName && initialCycleStateName.trim()) {
      initialCalculation = await Calculation.create({
        project_id: project.id,
        user_id: userId,
        name: initialCycleStateName.trim(),
        refrigerant: (refrigerant && refrigerant.trim()) ? refrigerant.trim() : '-',
        pressure_unit: req.body.pressureUnit || 'bar',
        temperature_unit: req.body.temperatureUnit || 'celsius',
        order: 0
      });
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: { ...project, initialCalculation }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Get all projects for authenticated user
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.userId });
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get single project by ID
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id, userId: req.user.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { name, description, productType } = req.body;
    if (!name || name.trim().length === 0)
      return res.status(400).json({ error: 'Project name is required' });

    const updateFields = {
      name: name.trim(),
      description: description ? description.trim() : '',
      state_cycle: req.body.stateCycle,
      compressor_efficiency: req.body.compressorEfficiency,
      locked_pressure_unit: req.body.lockedPressureUnit,
      locked_temperature_unit: req.body.lockedTemperatureUnit,
      locked_is_absolute: req.body.lockedIsAbsolute
    };
    if (productType) updateFields.product_type = productType;

    const project = await Project.findByIdAndUpdate(req.params.id, req.user.userId, updateFields);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, message: 'Project updated successfully', project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete project and its calculations
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const project = await Project.findOne({ id, userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await Calculation.deleteMany({ projectId: id, userId });
    await Project.deleteOne(id, userId);
    res.json({ success: true, message: 'Project and all its calculations deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// Duplicate project and its calculations
exports.duplicateProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user || !req.user.userId)
      return res.status(401).json({ error: 'User session expired or invalid. Please log in again.' });

    const userId = req.user.userId;
    const sourceProject = await Project.findOne({ id, userId });
    if (!sourceProject) return res.status(404).json({ error: 'Source project not found or access denied' });

    // Determine next suffix number
    const baseName = sourceProject.name.replace(/\s*\(\d+\)$/, '').trim();
    const similar = await Project.findByNamePattern(userId, `${baseName}%`);
    let maxNum = 0;
    similar.forEach(p => {
      const match = p.name.match(/\((\d+)\)$/);
      if (match) { const n = parseInt(match[1]); if (n > maxNum) maxNum = n; }
    });
    const newName = `${baseName}(${maxNum + 1})`;

    const newProject = await Project.create({
      user_id: userId,
      name: newName,
      description: sourceProject.description,
      product_type: sourceProject.product_type || 'Custom Project',
      locked_refrigerant: sourceProject.locked_refrigerant,
      locked_pressure_unit: sourceProject.locked_pressure_unit,
      locked_temperature_unit: sourceProject.locked_temperature_unit,
      locked_is_absolute: sourceProject.locked_is_absolute,
      state_cycle: sourceProject.state_cycle,
      compressor_efficiency: sourceProject.compressor_efficiency
    });

    const sourceCalcs = await Calculation.find({ projectId: id, userId });
    if (sourceCalcs.length > 0) {
      const newCalcs = sourceCalcs.map(c => {
        const { id: _id, created_at, updated_at, ...rest } = c;
        return { ...rest, project_id: newProject.id, user_id: userId };
      });
      try { await Calculation.insertMany(newCalcs); } catch (e) { console.error('Calc copy error:', e); }
    }

    res.status(201).json({ success: true, message: 'Project duplicated successfully', project: newProject });
  } catch (error) {
    console.error('Duplicate project error:', error);
    res.status(500).json({ error: 'Server error: ' + (error.message || 'Unknown') });
  }
};
