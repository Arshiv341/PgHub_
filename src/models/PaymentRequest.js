import mongoose from 'mongoose';

const paymentRequestSchema = new mongoose.Schema(
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
      required: [true, 'Student reference is required'],
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant reference is required'],
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentTransaction',
      required: [true, 'Rent transaction bill reference is required'],
    },
    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PG',
      default: null,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      default: null,
    },
    month: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    paymentMode: {
      type: String,
      required: [true, 'Payment method/mode is required'],
    },
    paymentMethod: {
      type: String,
      default: '',
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    txnRef: {
      type: String,
      required: [true, 'Transaction reference/ID is required'],
      trim: true,
    },
    receiptUrl: {
      type: String,
      required: [true, 'Screenshot upload is required'],
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    remarks: {
      type: String,
      default: '',
    },
    ownerRemark: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);
export default PaymentRequest;
