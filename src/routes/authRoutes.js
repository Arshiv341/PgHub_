import express from 'express';
import {
  registerOwner,
  loginOwner,
  refreshToken,
  logoutOwner,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getOwnerProfile,
  updateOwnerProfile,
} from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../validators/authValidator.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../config/rateLimiter.js';

const router = express.Router();

// Public Authentication endpoints with Rate Limiting
router.post('/register', authLimiter, registerValidator, handleValidationErrors, registerOwner);
router.post('/login', authLimiter, loginValidator, handleValidationErrors, loginOwner);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Session endpoints
router.post('/refresh', refreshToken);
router.post('/logout', logoutOwner);

// Protected Owner profile endpoints
router.route('/profile')
  .get(protect, getOwnerProfile)
  .put(protect, registerValidator, handleValidationErrors, updateOwnerProfile);

export default router;
