const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  name: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100
  },
  refrigerant: {
    type: String,
    trim: true,
    default: '-'
  },
  pressure: {
    type: Number,
    default: null
  },
  pressureUnit: {
    type: String,
    trim: true,
    default: 'bar'
  },
  temperature: {
    type: Number,
    default: null
  },
  temperatureUnit: {
    type: String,
    trim: true,
    default: 'celsius'
  },
  distanceUnit: {
    type: String,
    default: 'meters',
    trim: true
  },
  altitude: {
    type: Number,
    default: 0
  },
  ambientPressureData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isDew: {
    type: Boolean,
    default: true
  },
  isAbsolute: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for getting latest 10 entries efficiently
historySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('History', historySchema);
