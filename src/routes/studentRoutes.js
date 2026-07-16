import express from 'express';
import {
  getNearbyPGs,
  getPGDetails,
  getStudentDashboard,
  submitPaymentRequest,
  submitComplaint,
  submitLeaveRequest,
} from '../controllers/studentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.use(protect);

router.get('/pgs', getNearbyPGs);
router.get('/pgs/:id', getPGDetails);
router.get('/dashboard', getStudentDashboard);
router.post('/payments', upload.single('receipt'), submitPaymentRequest);
router.post('/complaints', submitComplaint);
router.post('/leave', submitLeaveRequest);

export default router;
