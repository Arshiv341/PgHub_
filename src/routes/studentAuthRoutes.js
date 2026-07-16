import express from 'express';
import {
  registerStudent,
  verifyStudentEmail,
  loginStudent,
  refreshStudentToken,
  logoutStudent,
  getStudentProfile,
  updateStudentProfile,
} from '../controllers/studentAuthController.js';
import {
  registerStudentValidator,
  loginStudentValidator,
  verifyOtpValidator,
} from '../validators/studentValidator.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerStudentValidator, handleValidationErrors, registerStudent);
router.post('/verify-email', verifyOtpValidator, handleValidationErrors, verifyStudentEmail);
router.post('/login', loginStudentValidator, handleValidationErrors, loginStudent);
router.post('/refresh', refreshStudentToken);
router.post('/logout', logoutStudent);

router.route('/profile')
  .get(protect, getStudentProfile)
  .put(protect, updateStudentProfile);

export default router;
