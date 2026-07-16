import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
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
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: [true, 'Bed reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add tenant name'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Please add tenant contact phone number'],
      trim: true,
    },
    emergencyPhone: {
      type: String,
      trim: true,
    },
    idProof: {
      type: String, // Cloudinary image URL representing government proof
      default: '',
    },
    joiningDate: {
      type: Date,
      required: [true, 'Please specify joining date'],
    },
    leavingDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['Active', 'Left'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ ownerId: 1, name: 1 });

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
