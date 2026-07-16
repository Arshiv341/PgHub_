import express from 'express';
import {
  getPgs,
  getPgById,
  createPg,
  updatePg,
  deletePg,
} from '../controllers/pgController.js';
import { createPgValidator } from '../validators/pgValidator.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// Require protection across all PG routes
router.use(protect);

router.route('/')
  .get(getPgs)
  // Optional support for image file array upload via Multer ('images')
  .post(upload.array('images', 5), createPgValidator, handleValidationErrors, createPg);

router.route('/:id')
  .get(getPgById)
  .put(upload.array('images', 5), createPgValidator, handleValidationErrors, updatePg)
  .delete(deletePg);

export default router;
