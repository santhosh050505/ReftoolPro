const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
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
  actualTemperature: {
    type: Number,
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  defineStateCycle: {
    type: String,
    trim: true,
    default: null
  },
  inputValue: {
    type: Number,
    default: null
  },
  isManual: {
    type: Boolean,
    default: false
  },
  sequence: {
    type: Number,
    default: null
  },
  liquidTemperature: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
calculationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
calculationSchema.index({ projectId: 1, createdAt: -1 });
calculationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Calculation', calculationSchema);
