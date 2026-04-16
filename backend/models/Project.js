const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
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
    minlength: 1,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lockedRefrigerant: {
    type: String,
    trim: true,
    default: null
  },
  lockedPressureUnit: {
    type: String,
    trim: true,
    default: null
  },
  lockedTemperatureUnit: {
    type: String,
    trim: true,
    default: null
  },
  lockedIsAbsolute: {
    type: Boolean,
    default: true
  },
  productType: {
    type: String,
    enum: ['Heat Pump', 'Air Handling Unit', 'Chiller', 'Custom Project'],
    default: 'Custom Project'
  },
  stateCycle: {
    type: String,
    default: 'Select your option'
  },
  compressorEfficiency: {
    type: Number,
    default: 1.0
  }
});

// Update the updatedAt timestamp before saving
projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
projectSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
