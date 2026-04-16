const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('📡 Attempting MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reftools-pro', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB Connected Successfully');

    // Only create default admin if explicitly enabled via environment variable
    if (process.env.INITIALIZE_DEFAULT_ADMIN === 'true') {
      const Admin = require('../models/Admin');
      const adminExists = await Admin.findOne({ 
        username: process.env.DEFAULT_ADMIN_USER || 'admin' 
      });
      
      if (!adminExists && process.env.DEFAULT_ADMIN_PASSWORD) {
        const defaultAdmin = new Admin({
          username: process.env.DEFAULT_ADMIN_USER || 'admin',
          password: process.env.DEFAULT_ADMIN_PASSWORD
        });
        await defaultAdmin.save();
        console.log('✅ Default Admin Created');
      }
    }

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;