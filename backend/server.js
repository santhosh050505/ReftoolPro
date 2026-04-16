require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Catch-all for uncaught exceptions to help debugging
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});


const app = express();

// Middleware
// CORS configuration - allows development and specified production origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow requests from whitelisted origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, log warning but allow. In production, reject.
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('CORS not allowed'));
      } else {
        console.warn(`⚠️ CORS: Request from ${origin} not in whitelist`);
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));// HTTPS enforcement - only in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request came through HTTPS or reverse proxy with HTTPS
    const isHttps = req.protocol === 'https' || 
                    req.header('x-forwarded-proto') === 'https';
    
    if (!isHttps && req.method !== 'GET') {
      // Only warn for non-GET requests in production
      console.warn(`⚠️ Non-HTTPS ${req.method} request to ${req.path}`);
    }
    
    next();
  });
}
// Routes
const authRoutes = require('./routes/authRoutes');
const refrigerantRoutes = require('./routes/refrigerantRoutes');
const pressureRoutes = require('./routes/pressureRoutes');
const projectRoutes = require('./routes/projectRoutes');
const calculationRoutes = require('./routes/calculationRoutes');
const historyRoutes = require('./routes/historyRoutes');
const r513aRoutes = require('./routes/r513aRoutes');
const r454bRoutes = require('./routes/r454bRoutes');
const pressureService = require('./services/pressureConversionService');

app.use('/api/auth', authRoutes);
app.use('/api/refrigerant', refrigerantRoutes);
app.use('/api/pressure', pressureRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/r513a', r513aRoutes);
app.use('/api/r454b', r454bRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RefTools-Pro Backend Running' });
});

// JSON 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL ERROR HANDLER:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    success: false
  });
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
    console.log(`DEBUG: process.env.PORT is "${process.env.PORT}", using PORT=${PORT}`);
    app.listen(PORT, () => {
      console.log(`RefTools-Pro Backend running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server!');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    process.exit(1);
  }
};

startServer();