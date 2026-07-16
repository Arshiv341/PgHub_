import mongoose from 'mongoose';

const rentTransactionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant reference is required'],
      index: true,
    },
    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PG',
      required: [true, 'PG property reference is required'],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Please specify billing rent amount'],
      min: [0, 'Amount cannot be negative'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Please specify rent due date'],
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Pending', 'Paid', 'Overdue'],
        message: 'Status must be Pending, Paid, or Overdue',
      },
      default: 'Pending',
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'NetBanking', null],
      default: null,
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    transactionId: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

rentTransactionSchema.index({ ownerId: 1, status: 1 });

const RentTransaction = mongoose.model('RentTransaction', rentTransactionSchema);
export default RentTransaction;
