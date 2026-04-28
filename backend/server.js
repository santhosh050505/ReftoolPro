require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const pressureService = require('./services/pressureConversionService');

// Catch-all for uncaught exceptions to help debugging
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const startServer = async () => {
  // Validate critical environment variables
  const validateSecrets = () => {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.warn('⚠️ WARNING: JWT_SECRET not set, using default');
      console.warn('⚠️ This is OK for development, NOT safe for production');
      return true;
    }
    
    if (jwtSecret.length < 32) {
      console.warn('⚠️ WARNING: JWT_SECRET is short (less than 32 chars)');
      console.warn('⚠️ For production, use at least 32 characters');
    }
    
    return true;
  };

  validateSecrets();

  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Pressure Service
    pressureService.init();

    const PORT = process.env.PORT || 5000;
    console.log(`RefTools-Pro Backend running on port ${PORT}`);
    app.listen(PORT, () => {
      console.log(`API available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server!');
    console.error('Error:', error.message);
    process.exit(1);
  }
};

startServer();