import RentTransaction from '../models/RentTransaction.js';
import Tenant from '../models/Tenant.js';
import Room from '../models/Room.js';
import Bed from '../models/Bed.js';
import PG from '../models/PG.js';
import { uploadToCloudinary } from '../utils/cloudinaryUploader.js';
import PaymentRequest from '../models/PaymentRequest.js';
import { createNotification } from './notificationController.js';

/**
 * Get Transactions (isolated by ownerId).
 * Supports filters by pgId and status.
 */
export const getTransactions = async (req, res, next) => {
  const ownerId = req.user.id;
  const { pgId, status, page = 1, limit = 10 } = req.query;

  try {
    const query = { ownerId };
    if (pgId) query.pgId = pgId;
    if (status && status !== 'All') query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await RentTransaction.countDocuments(query);
    
    const transactions = await RentTransaction.find(query)
      .populate('tenantId', 'name email phone')
      .populate('pgId', 'name')
      .populate('roomId', 'roomNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      message: 'Transactions ledger fetched successfully',
      data: transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Compile Financial & Occupancy statistics (Dashboard Live Integration).
 */
export const getStats = async (req, res, next) => {
  const ownerId = req.user.id;

  try {
    // 1. Core Property, Room and Bed stats
    const totalPgs = await PG.countDocuments({ ownerId });
    const totalRooms = await Room.countDocuments({ ownerId });
    const occupiedBeds = await Bed.countDocuments({ ownerId, status: 'Occupied' });
    const vacantBeds = await Bed.countDocuments({ ownerId, status: 'Available' });
    const activeStudents = await Tenant.countDocuments({ ownerId, status: 'Active' });

    // 2. Financial Metrics aggregations
    const paidSumResult = await RentTransaction.aggregate([
      { $match: { ownerId: new Object(ownerId), status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingSumResult = await RentTransaction.aggregate([
      { $match: { ownerId: new Object(ownerId), status: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalRevenue = paidSumResult[0]?.total || 0;
    const pendingPayments = pendingSumResult[0]?.total || 0;

    // 3. Occupancy Rate
    const totalBeds = occupiedBeds + vacantBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    res.status(200).json({
      message: 'Statistics compiled successfully',
      data: {
        totalPgs,
        totalRooms,
        occupiedBeds,
        vacantBeds,
        activeStudents,
        totalRevenue,
        pendingPayments,
        occupancyRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record a payment / Approve receipt.
 * Updates transaction status to Paid, logs transaction ID and Cloudinary receipt URL.
 */
export const recordPayment = async (req, res, next) => {
  const { id } = req.params;
  const { paymentMode, transactionId, remarks } = req.body;
  const ownerId = req.user.id;

  try {
    const tx = await RentTransaction.findOne({ _id: id, ownerId });
    if (!tx) {
      return res.status(404).json({ message: 'Transaction record not found or unauthorized' });
    }

    if (tx.status === 'Paid') {
      return res.status(400).json({ message: 'This transaction is already marked as Paid' });
    }

    // Process screenshot buffer upload if attached
    let receiptUrl = tx.receiptUrl;
    if (req.file) {
      receiptUrl = await uploadToCloudinary(req.file.buffer, 'rent_receipts');
    }

    tx.status = 'Paid';
    tx.paymentMode = paymentMode;
    tx.paymentDate = new Date();
    tx.transactionId = transactionId || tx.transactionId;
    tx.remarks = remarks || tx.remarks;
    tx.receiptUrl = receiptUrl;

    await tx.save();

    // Log notification
    const tenant = await Tenant.findById(tx.tenantId);
    const tenantName = tenant ? tenant.name : 'Student';
    await createNotification(
      ownerId,
      `Rent Payment of ₹${tx.amount.toLocaleString()} recorded for tenant "${tenantName}"`,
      'payment'
    );

    res.status(200).json({
      message: 'Payment recorded successfully!',
      data: tx,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate monthly batch invoices for all Active tenants.
 */
export const generateInvoices = async (req, res, next) => {
  const ownerId = req.user.id;
  const { billingPeriod } = req.body; // e.g. "July 2026"

  try {
    // 1. Fetch all active tenants
    const activeTenants = await Tenant.find({ ownerId, status: 'Active' });
    if (activeTenants.length === 0) {
      return res.status(400).json({ message: 'No active tenants found to generate bills for.' });
    }

    // 2. Generate transaction rows
    const invoices = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5); // Due in 5 days

    for (const tenant of activeTenants) {
      // Get the rent tariff directly from Room schema
      const room = await Room.findById(tenant.roomId);
      const rentAmount = room ? room.rentPerBed : 0;

      // Avoid generating duplicate invoices for the same tenant in the same billing cycle/month
      // Check if invoice already exists for this tenant on current date / period
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const existingInvoice = await RentTransaction.findOne({
        ownerId,
        tenantId: tenant._id,
        createdAt: { $gte: startOfMonth },
      });

      if (!existingInvoice) {
        invoices.push({
          ownerId,
          tenantId: tenant._id,
          pgId: tenant.pgId,
          roomId: tenant.roomId,
          amount: rentAmount,
          dueDate,
          status: 'Pending',
        });
      }
    }

    if (invoices.length === 0) {
      return res.status(200).json({ message: 'Bills already generated for all active tenants this period.' });
    }

    const createdInvoices = await RentTransaction.insertMany(invoices);

    // Log notification
    await createNotification(
      ownerId,
      `Batch monthly billing generated: Created ${createdInvoices.length} invoices.`,
      'system'
    );

    res.status(201).json({
      message: `${createdInvoices.length} monthly batch invoices generated successfully!`,
      data: createdInvoices,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentRequests = async (req, res, next) => {
  const ownerId = req.user.id;
  const { status } = req.query;

  try {
    const query = { ownerId };
    if (status && status !== 'All') {
      query.status = status;
    }

    const requests = await PaymentRequest.find(query)
      .populate('studentId', 'name email phone')
      .populate('tenantId', 'name')
      .populate('transactionId')
      .populate('pgId', 'name')
      .populate('roomId', 'roomNumber')
      .populate('bedId', 'bedNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Payment requests fetched successfully',
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentRequestStatus = async (req, res, next) => {
  const ownerId = req.user.id;
  const { id } = req.params;
  const { status, remarks } = req.body;

  try {
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Status must be Approved or Rejected' });
    }

    const request = await PaymentRequest.findOne({ _id: id, ownerId });
    if (!request) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    request.status = status;
    request.remarks = remarks || '';
    request.ownerRemark = remarks || '';
    if (status === 'Approved') {
      request.approvedAt = new Date();
    }
    await request.save();

    // If approved, update the underlying RentTransaction to Paid!
    if (status === 'Approved') {
      const tx = await RentTransaction.findById(request.transactionId);
      if (tx) {
        tx.status = 'Paid';
        tx.paymentDate = new Date();
        tx.paymentMode = request.paymentMode;
        tx.receiptUrl = request.receiptUrl;
        tx.transactionId = request.txnRef;
        tx.remarks = remarks || 'Approved via Student Payment Request';
        await tx.save();
      }
    }

    // Log notification
    await createNotification(
      ownerId,
      `Landlord ${status.toLowerCase()} rent payment request for ₹${request.amount}`,
      'payment'
    );

    res.status(200).json({
      message: `Payment request ${status.toLowerCase()} successfully!`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export default { getTransactions, getStats, recordPayment, generateInvoices, getPaymentRequests, updatePaymentRequestStatus };
