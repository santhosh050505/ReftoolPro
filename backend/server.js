require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const pressureService = require('./services/pressureConversionService');

process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const startServer = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is missing or too short. Set a strong value in .env');
  }

  try {
    // Verify Supabase connection
    await connectDB();

    // Initialize Pressure Service
    pressureService.init();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ RefTools-Pro Backend running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();