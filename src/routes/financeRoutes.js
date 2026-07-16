import express from 'express';
import {
  getTransactions,
  getStats,
  recordPayment,
  generateInvoices,
  getPaymentRequests,
  updatePaymentRequestStatus,
} from '../controllers/financeController.js';
import { recordPaymentValidator } from '../validators/financeValidator.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

import { upload } from '../config/cloudinary.js';

router.get('/transactions', getTransactions);
router.get('/stats', getStats);
router.post('/transactions/:id/pay', upload.single('receipt'), recordPaymentValidator, handleValidationErrors, recordPayment);
router.post('/invoices/generate', generateInvoices);

router.get('/payment-requests', getPaymentRequests);
router.patch('/payment-requests/:id', updatePaymentRequestStatus);

export default router;
