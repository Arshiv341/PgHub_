import PG from '../models/PG.js';
import Room from '../models/Room.js';
import Bed from '../models/Bed.js';
import Tenant from '../models/Tenant.js';
import Student from '../models/Student.js';
import RentTransaction from '../models/RentTransaction.js';
import PaymentRequest from '../models/PaymentRequest.js';
import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary } from '../utils/cloudinaryUploader.js';

// Calculate distance via Haversine
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getNearbyPGs = async (req, res, next) => {
  const { search, latitude, longitude, radius = 10, type, minRent, maxRent, wifi, ac, food, laundry, parking } = req.query;

  try {
    const query = {};
    if (type && type !== 'All') query.type = type;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { city: searchRegex },
        { address: searchRegex },
        { name: searchRegex },
      ];
    }

    if (minRent || maxRent) {
      query.startingRent = {};
      if (minRent) query.startingRent.$gte = Number(minRent);
      if (maxRent) query.startingRent.$lte = Number(maxRent);
    }

    const matchingAmenities = [];
    if (wifi === 'true') matchingAmenities.push('WiFi');
    if (ac === 'true') matchingAmenities.push('AC');
    if (food === 'true') matchingAmenities.push('Food');
    if (laundry === 'true') matchingAmenities.push('Laundry');
    if (parking === 'true') matchingAmenities.push('Parking');

    if (matchingAmenities.length > 0) {
      query.amenities = { $all: matchingAmenities };
    }

    const pgs = await PG.find(query).populate('ownerId', 'name email phone businessName');

    const results = [];
    const userLat = latitude ? Number(latitude) : null;
    const userLng = longitude ? Number(longitude) : null;

    for (const pg of pgs) {
      const dist = (userLat && userLng)
        ? calculateDistance(userLat, userLng, pg.latitude || 28.6139, pg.longitude || 77.2090)
        : 0;

      if (!latitude || !longitude || dist <= Number(radius)) {
        const totalRooms = await Room.countDocuments({ pgId: pg._id });
        const totalBeds = await Bed.countDocuments({ pgId: pg._id });
        const availableBeds = await Bed.countDocuments({ pgId: pg._id, status: 'Available' });

        const rooms = await Room.find({ pgId: pg._id });
        let availableRooms = 0;
        let minRent = Infinity;
        for (const room of rooms) {
          const roomBedsCount = await Bed.countDocuments({ roomId: room._id, status: 'Available' });
          if (roomBedsCount > 0) {
            availableRooms++;
            if (room.rentPerBed < minRent) {
              minRent = room.rentPerBed;
            }
          }
        }
        if (minRent === Infinity) {
          for (const room of rooms) {
            if (room.rentPerBed < minRent) {
              minRent = room.rentPerBed;
            }
          }
        }
        const finalStartingRent = minRent === Infinity ? pg.startingRent || 0 : minRent;

        results.push({
          ...pg.toObject(),
          startingRent: finalStartingRent,
          distance: Math.round(dist * 10) / 10,
          totalRooms,
          availableRooms,
          totalBeds,
          availableBeds,
        });
      }
    }

    results.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      message: 'PGs fetched successfully',
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const getPGDetails = async (req, res, next) => {
  const { id } = req.params;

  try {
    const pg = await PG.findById(id).populate('ownerId', 'name email phone businessName');
    if (!pg) {
      return res.status(404).json({ message: 'PG property not found' });
    }

    const rooms = await Room.find({ pgId: id });
    const totalRooms = rooms.length;
    const totalBeds = await Bed.countDocuments({ pgId: id });
    const availableBeds = await Bed.find({ pgId: id, status: 'Available' });

    let availableRooms = 0;
    let minRent = Infinity;
    for (const room of rooms) {
      const roomBedsCount = await Bed.countDocuments({ roomId: room._id, status: 'Available' });
      if (roomBedsCount > 0) {
        availableRooms++;
        if (room.rentPerBed < minRent) {
          minRent = room.rentPerBed;
        }
      }
    }
    if (minRent === Infinity) {
      for (const room of rooms) {
        if (room.rentPerBed < minRent) {
          minRent = room.rentPerBed;
        }
      }
    }
    const finalStartingRent = minRent === Infinity ? pg.startingRent || 0 : minRent;

    res.status(200).json({
      message: 'PG details retrieved',
      data: {
        pg: {
          ...pg.toObject(),
          startingRent: finalStartingRent,
        },
        rooms,
        totalRooms,
        availableRooms,
        totalBeds,
        availableBedsCount: availableBeds.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentDashboard = async (req, res, next) => {
  const studentId = req.user.id;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student account not found' });
    }

    // Check if allocated
    if (!student.pgId || student.status === 'Registered' || student.status === 'Waiting For Allocation') {
      return res.status(200).json({
        message: 'Student is registered but has no active accommodation allocation.',
        data: {
          allocated: false,
          status: student.status,
        },
      });
    }

    // Fetches allocated tenancy mapping
    const tenant = await Tenant.findOne({ studentId, status: 'Active' });
    if (!tenant) {
      return res.status(200).json({
        message: 'Student allocation mapped but no active Tenant record found.',
        data: {
          allocated: false,
          status: student.status,
        },
      });
    }

    // Fetch details
    const pg = await PG.findById(student.pgId).populate('ownerId', 'name email phone businessName');
    const room = await Room.findById(student.roomId);
    const bed = await Bed.findById(student.bedId);

    // Latest pending rent transaction (the bill)
    const latestBill = await RentTransaction.findOne({ tenantId: tenant._id, status: { $ne: 'Paid' } }).sort({ dueDate: 1 });
    const billingHistory = await RentTransaction.find({ tenantId: tenant._id }).sort({ dueDate: -1 });

    // Submitted payment requests list
    const paymentRequests = await PaymentRequest.find({ studentId }).populate('transactionId').sort({ createdAt: -1 });

    // Complaints logs
    const complaints = await Complaint.find({ studentId }).sort({ createdAt: -1 });

    // Unread Notifications for this student (we will deliver general broadcast or direct alerts)
    const alerts = await Notification.find({ ownerId: pg?.ownerId?._id }).sort({ createdAt: -1 }).limit(10);

    res.status(200).json({
      message: 'Dashboard loaded successfully',
      data: {
        allocated: true,
        status: student.status,
        residency: {
          pg,
          room,
          bed,
          joiningDate: tenant.joiningDate,
        },
        latestBill,
        billingHistory,
        paymentRequests,
        complaints,
        alerts,
        leaveRequest: student.leaveRequest,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const submitPaymentRequest = async (req, res, next) => {
  const studentId = req.user.id;
  const { transactionId, amount, paymentMode, txnRef, notes } = req.body;

  try {
    const student = await Student.findById(studentId);
    if (!student || !student.pgId) {
      return res.status(400).json({ message: 'Only checked-in students can submit rent payments' });
    }

    const tenant = await Tenant.findOne({ studentId, status: 'Active' });
    if (!tenant) {
      return res.status(404).json({ message: 'No active resident account mapping found' });
    }

    // Find the rent bill
    const bill = await RentTransaction.findById(transactionId);
    if (!bill) {
      return res.status(404).json({ message: 'Rent bill transaction not found' });
    }

    let receiptUrl = 'CASH_PAYMENT';
    if (paymentMode !== 'Cash') {
      if (!req.file) {
        return res.status(400).json({ message: 'Please attach your payment receipt screenshot image' });
      }
      // Upload receipt to Cloudinary
      receiptUrl = await uploadToCloudinary(req.file.buffer, 'pghub_receipts');
    }

    // Create PaymentRequest
    const request = await PaymentRequest.create({
      ownerId: bill.ownerId,
      studentId,
      tenantId: tenant._id,
      transactionId,
      pgId: student.pgId,
      roomId: student.roomId,
      bedId: student.bedId,
      month: new Date(bill.dueDate).toLocaleString('default', { month: 'long', year: 'numeric' }),
      amount: Number(amount || bill.amount),
      paymentMode,
      paymentMethod: paymentMode,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      txnRef: txnRef || 'CASH',
      receiptUrl,
      notes: notes || '',
      status: 'Pending',
    });

    // Post System Notification
    await Notification.create({
      ownerId: bill.ownerId,
      message: `Rent payment submission of ₹${request.amount} from student ${student.name} is pending review.`,
      type: 'payment',
      isRead: false,
    });

    res.status(201).json({
      message: 'Payment request submitted successfully! Your landlord will review it.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const submitComplaint = async (req, res, next) => {
  const studentId = req.user.id;
  const { title, description } = req.body;

  try {
    const student = await Student.findById(studentId);
    if (!student || !student.pgId) {
      return res.status(400).json({ message: 'Complaints can only be logged by active residents' });
    }

    const complaint = await Complaint.create({
      studentId,
      pgId: student.pgId,
      title,
      description,
      status: 'Pending',
    });

    // Notify landlord
    const pg = await PG.findById(student.pgId);
    if (pg) {
      await Notification.create({
        ownerId: pg.ownerId,
        message: `New Resident Complaint raised: "${title}" by student ${student.name}.`,
        type: 'maintenance',
        isRead: false,
      });
    }

    res.status(201).json({
      message: 'Complaint logged successfully! Landlord notified.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

export const submitLeaveRequest = async (req, res, next) => {
  const studentId = req.user.id;
  const { leavingDate, noticePeriod, reason } = req.body;

  try {
    const student = await Student.findById(studentId);
    if (!student || !student.pgId || student.status !== 'Checked In') {
      return res.status(400).json({ message: 'Only active Checked In residents can submit leave requests' });
    }

    const pg = await PG.findById(student.pgId);
    if (!pg) {
      return res.status(404).json({ message: 'PG accommodation details not found' });
    }

    student.leaveRequest = {
      status: 'Pending',
      leavingDate: new Date(leavingDate),
      noticePeriod,
      reason,
      createdAt: new Date(),
    };

    await student.save();

    // Create Notification alert for Owner
    await Notification.create({
      ownerId: pg.ownerId,
      message: `Tenant Leaving Request: Student ${student.name} submitted a notice of intent to checkout on ${new Date(leavingDate).toLocaleDateString()}.`,
      type: 'system',
      isRead: false,
    });

    res.status(200).json({
      message: 'Leave request notice submitted successfully! Awaiting landlord checkout approval.',
      data: student.leaveRequest,
    });
  } catch (error) {
    next(error);
  }
};
