import express from 'express';
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  searchRegisteredStudent,
  allocateBedToStudent,
  getLeaveRequests,
  processLeaveRequest,
} from '../controllers/tenantController.js';
import { createTenantValidator } from '../validators/tenantValidator.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTenants)
  .post(
    upload.fields([
      { name: 'idProof', maxCount: 1 },
      { name: 'photo', maxCount: 1 },
    ]),
    createTenantValidator,
    handleValidationErrors,
    createTenant
  );

// Student Allocation routes (placed above dynamic id route to avoid collision)
router.get('/search-student', searchRegisteredStudent);
router.post('/allocate-bed', allocateBedToStudent);
router.get('/leave-requests', getLeaveRequests);
router.patch('/leave-requests/:studentId', processLeaveRequest);

router.route('/:id')
  .get(getTenantById)
  .put(
    upload.fields([
      { name: 'idProof', maxCount: 1 },
      { name: 'photo', maxCount: 1 },
    ]),
    createTenantValidator,
    handleValidationErrors,
    updateTenant
  )
  .delete(deleteTenant);

export default router;
