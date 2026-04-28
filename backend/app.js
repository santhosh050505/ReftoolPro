require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/authRoutes');
const refrigerantRoutes = require('./routes/refrigerantRoutes');
const pressureRoutes = require('./routes/pressureRoutes');
const projectRoutes = require('./routes/projectRoutes');
const calculationRoutes = require('./routes/calculationRoutes');
const historyRoutes = require('./routes/historyRoutes');
const r513aRoutes = require('./routes/r513aRoutes');
const r454bRoutes = require('./routes/r454bRoutes');

const app = express();

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Always allow localhost in development
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// HTTPS enforcement - only in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const isHttps = req.protocol === 'https' || req.header('x-forwarded-proto') === 'https';
    if (!isHttps && req.method !== 'GET') {
      console.warn(`⚠️ Non-HTTPS ${req.method} request to ${req.path}`);
    }
    next();
  });
}

// Route mapping
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
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    success: false
  });
});

module.exports = app;
