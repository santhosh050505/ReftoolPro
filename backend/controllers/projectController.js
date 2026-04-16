const Project = require('../models/Project');
const Calculation = require('../models/Calculation');
const mongoose = require('mongoose');

// Create new project
exports.createProject = async (req, res) => {
  try {
    const { name, description, productType, initialCycleStateName, refrigerant } = req.body;
    const userId = req.user.userId; // From auth middleware

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = new Project({
      userId,
      name: name.trim(),
      description: description ? description.trim() : '',
      productType: productType || 'Custom Project',
      lockedRefrigerant: (refrigerant && refrigerant.trim()) ? refrigerant.trim() : null,
      lockedPressureUnit: req.body.pressureUnit || null,
      lockedTemperatureUnit: req.body.temperatureUnit || null,
      lockedIsAbsolute: req.body.isAbsolute !== undefined ? req.body.isAbsolute : true,
      stateCycle: req.body.stateCycle || 'Select your option',
      compressorEfficiency: req.body.compressorEfficiency || 1.0
    });

    await project.save();

    // If an initial cycle state name is provided, create a placeholder calculation
    let initialCalculation = null;
    if (initialCycleStateName && initialCycleStateName.trim()) {
      initialCalculation = new Calculation({
        projectId: project._id,
        userId,
        name: initialCycleStateName.trim(),
        refrigerant: (refrigerant && refrigerant.trim()) ? refrigerant.trim() : '-',
        pressureUnit: req.body.pressureUnit || 'bar',
        temperatureUnit: req.body.temperatureUnit || 'celsius',
        order: 0
        // Other fields will be default null/blank
      });
      await initialCalculation.save();
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        productType: project.productType,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        initialCalculation: initialCalculation
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Get all projects for the authenticated user
exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.userId;

    const projects = await Project.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get single project by ID
exports.getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await Project.findOne({ _id: id, userId }).lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, productType } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const updateFields = {
      name: name.trim(),
      description: description ? description.trim() : '',
      updatedAt: Date.now(),
      stateCycle: req.body.stateCycle,
      compressorEfficiency: req.body.compressorEfficiency,
      lockedPressureUnit: req.body.lockedPressureUnit,
      lockedTemperatureUnit: req.body.lockedTemperatureUnit,
      lockedIsAbsolute: req.body.lockedIsAbsolute
    };

    if (productType) {
      updateFields.productType = productType;
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, userId },
      updateFields,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete project and all its calculations
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if project exists and belongs to user
    const project = await Project.findOne({ _id: id, userId });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete all calculations in this project
    await Calculation.deleteMany({ projectId: id, userId });

    // Delete the project
    await Project.deleteOne({ _id: id, userId });

    res.json({
      success: true,
      message: 'Project and all its calculations deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
// Duplicate project and all its calculations
exports.duplicateProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Safety check for user authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'User session expired or invalid. Please log in again.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID provided' });
    }

    const userId = req.user.userId;

    // 1. Fetch source project
    const sourceProject = await Project.findOne({ _id: id, userId });
    if (!sourceProject) {
      return res.status(404).json({ error: 'Source project not found or access denied' });
    }

    // 2. Determine new name
    // Strip existing (n) patterns to find the base name
    const nameWithoutSuffix = sourceProject.name.replace(/\s*\(\d+\)$/, '').trim();
    const baseNameEscaped = nameWithoutSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find projects with similar names to calculate the next sequence number
    const existingProjects = await Project.find({
      userId,
      name: { $regex: new RegExp(`^${baseNameEscaped}(\\s*\\(\\d+\\))?$`, 'i') }
    });

    let maxNum = 0;
    existingProjects.forEach(p => {
      // Look for (n) at the very end
      const match = p.name.match(/\((\d+)\)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });

    // Generate new name like project(1)
    const newName = `${nameWithoutSuffix}(${maxNum + 1})`;

    // 3. Create new project
    const newProject = new Project({
      userId,
      name: newName,
      description: sourceProject.description,
      productType: sourceProject.productType || 'Custom Project',
      lockedRefrigerant: sourceProject.lockedRefrigerant,
      lockedPressureUnit: sourceProject.lockedPressureUnit,
      lockedTemperatureUnit: sourceProject.lockedTemperatureUnit,
      lockedIsAbsolute: sourceProject.lockedIsAbsolute,
      stateCycle: sourceProject.stateCycle,
      compressorEfficiency: sourceProject.compressorEfficiency
    });

    await newProject.save();

    // 4. Copy all calculations
    const sourceCalculations = await Calculation.find({ projectId: id, userId });

    if (sourceCalculations && sourceCalculations.length > 0) {
      const newCalculations = sourceCalculations.map(calc => {
        const calcObj = calc.toObject();
        delete calcObj._id;
        delete calcObj.createdAt;
        delete calcObj.updatedAt;
        return {
          ...calcObj,
          projectId: new mongoose.Types.ObjectId(newProject._id),
          userId: new mongoose.Types.ObjectId(userId)
        };
      });

      try {
        await Calculation.insertMany(newCalculations);
      } catch (insertError) {
        console.error('Error inserting calculations during duplication:', insertError);
        // We still keep the project even if calculations failed, or we could delete it?
        // Let's at least log it.
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project duplicated successfully',
      project: newProject
    });
  } catch (error) {
    console.error('Duplicate project final error:', error);
    res.status(500).json({ error: 'Server error: ' + (error.message || 'Unknown error occurred') });
  }
};
