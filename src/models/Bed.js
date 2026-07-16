import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PG',
      required: [true, 'PG reference is required'],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
      index: true,
    },
    bedNumber: {
      type: String, // e.g. A, B, C, or 1, 2
      required: [true, 'Please add a bed number/letter label'],
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Please specify bed status'],
      enum: {
        values: ['Available', 'Occupied', 'Maintenance'],
        message: 'Status must be Available, Occupied, or Maintenance',
      },
      default: 'Available',
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ ownerId: 1, status: 1 });

const Bed = mongoose.model('Bed', bedSchema);
export default Bed;
