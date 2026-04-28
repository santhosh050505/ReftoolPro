const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Validate password format for user registration
const validatePassword = (password) => {
  if (password.length !== 12) {
    return 'Password must be exactly 12 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least 1 uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least 1 number';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least 1 special character';
  }
  return null;
};

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate username (3-15 characters, alphanumeric only)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (username.length < 3 || username.length > 15) {
      return res.status(400).json({ error: 'Username must be between 3 and 15 characters' });
    }
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Username must contain only letters and numbers' });
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Create new user
      const user = new User({ username, password });
      await user.save();

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        username: user.username
      });
    } catch (dbError) {
      // ✅ SECURITY FIX: Fail securely instead of accepting unverified registrations
      console.error('Database error during registration:', dbError.message);

      return res.status(503).json({
        error: 'Service temporarily unavailable. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      // Try to find user in database
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, username: user.username, role: 'user' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        username: user.username,
        role: 'user'
      });
    } catch (dbError) {
      // ✅ SECURITY FIX: Fail securely instead of bypassing authentication
      console.error('Database error during login:', dbError.message);

      return res.status(503).json({
        error: 'Service temporarily unavailable. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Admin Login
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find admin
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin._id, username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      username: admin.username,
      role: 'admin'
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ error: 'Server error during admin login' });
  }
});

// Verify Token (Middleware)
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      user: {
        username: decoded.username,
        role: decoded.role
      }
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
