import express from 'express';
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getBeds,
  updateBedStatus,
} from '../controllers/roomController.js';
import { createRoomValidator } from '../validators/roomValidator.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Bed routes (placed above dynamic room :id route to prevent collision)
router.get('/beds', getBeds);
router.patch('/beds/:id', updateBedStatus);

// Room routes
router.route('/')
  .get(getRooms)
  .post(createRoomValidator, handleValidationErrors, createRoom);

router.route('/:id')
  .get(getRoomById)
  .put(createRoomValidator, handleValidationErrors, updateRoom)
  .delete(deleteRoom);

export default router;
