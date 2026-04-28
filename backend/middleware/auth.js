const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify User Token
const verifyUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn('⚠️  Auth Failed: No Authorization header provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.warn('⚠️  Auth Failed: Token format invalid (expected Bearer <token>)');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ User Auth Verification Failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify Admin Token
const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn('⚠️  Admin Auth Failed: No Authorization header provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      console.warn(`⚠️  Access Denied: User "${decoded.username}" is not an admin`);
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Admin Auth Verification Failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { verifyUser, verifyAdmin };