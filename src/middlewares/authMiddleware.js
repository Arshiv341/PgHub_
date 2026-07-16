import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware to protect routes and verify owner tokens.
 * Decodes the token, extracts the owner metadata, and binds to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Bind owner credentials to req.user (Strict tenancy context)
      req.user = {
        id: decoded.id,
        email: decoded.email,
      };

      next();
    } catch (error) {
      res.status(401).json({ message: 'Authentication failed: Invalid session token' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Access Denied: Session token not provided' });
  }
};
