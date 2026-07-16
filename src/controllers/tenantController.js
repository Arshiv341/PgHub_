import Tenant from '../models/Tenant.js';
import Bed from '../models/Bed.js';
import Student from '../models/Student.js';
import PG from '../models/PG.js';
import { uploadToCloudinary } from '../utils/cloudinaryUploader.js';
import { createNotification } from './notificationController.js';

/**
 * Get All Tenants (with pagination, status filter & search).
 * Strictly isolated by ownerId.
 */
export const getTenants = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { search, status, pgId, page = 1, limit = 10 } = req.query;

    const query = { ownerId };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter (Active / Left)
    if (status && status !== 'All') {
      query.status = status;
    }

    // Property filter
    if (pgId) {
      query.pgId = pgId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const total = await Tenant.countDocuments(query);
    const tenants = await Tenant.find(query)
      .populate('pgId', 'name')
      .populate('roomId', 'roomNumber')
      .populate('bedId', 'bedNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      message: 'Tenants directory fetched successfully',
      data: tenants,
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
 * Get Single Tenant Profile.
 */
export const getTenantById = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  try {
    const tenant = await Tenant.findOne({ _id: id, ownerId })
      .populate('pgId', 'name address city')
      .populate('roomId', 'roomNumber sharingType rentPerBed')
      .populate('bedId', 'bedNumber');

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant profile not found' });
    }

    res.status(200).json({
      message: 'Tenant details fetched successfully',
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register/Onboard New Tenant (Admission).
 * Uploads ID Proof and photo files to Cloudinary, allocates the Bed and sets it as Occupied.
 */
export const createTenant = async (req, res, next) => {
  const ownerId = req.user.id;
  const { pgId, roomId, bedId, name, email, phone, emergencyPhone, joiningDate } = req.body;

  try {
    // 1. Verify Bed is Available
    const bed = await Bed.findOne({ _id: bedId, ownerId });
    if (!bed) {
      return res.status(404).json({ message: 'Bed record not found' });
    }

    if (bed.status !== 'Available') {
      return res.status(400).json({ message: 'The selected bed unit is already occupied or under maintenance' });
    }

    // 2. Upload photo and ID proof if files are present in multi-fields
    let idProofUrl = '';
    let photoUrl = '';

    if (req.files) {
      if (req.files.idProof && req.files.idProof[0]) {
        idProofUrl = await uploadToCloudinary(req.files.idProof[0].buffer, 'tenant_documents');
      }
      if (req.files.photo && req.files.photo[0]) {
        photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, 'tenant_photos');
      }
    }

    // 3. Create Tenant Document
    const tenant = await Tenant.create({
      ownerId,
      pgId,
      roomId,
      bedId,
      name,
      email,
      phone,
      emergencyPhone,
      idProof: idProofUrl,
      photo: photoUrl,
      joiningDate: new Date(joiningDate),
      status: 'Active',
    });

    // 4. Update Bed status to Occupied and link tenantId
    bed.status = 'Occupied';
    bed.tenantId = tenant._id;
    await bed.save();

    // Log notification
    await createNotification(ownerId, `New tenant "${tenant.name}" onboarded & assigned to Bed ${bed.bedNumber}`, 'checkin');

    res.status(201).json({
      message: 'Tenant checked-in and bed allocated successfully!',
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Tenant Details & Handle Shift Student Room Allocation.
 */
export const updateTenant = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;
  const { pgId, roomId, bedId, name, email, phone, emergencyPhone, leavingDate, status } = req.body;

  try {
    const tenant = await Tenant.findOne({ _id: id, ownerId });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant profile not found or unauthorized' });
    }

    // Upload files if updated
    if (req.files) {
      if (req.files.idProof && req.files.idProof[0]) {
        tenant.idProof = await uploadToCloudinary(req.files.idProof[0].buffer, 'tenant_documents');
      }
      if (req.files.photo && req.files.photo[0]) {
        tenant.photo = await uploadToCloudinary(req.files.photo[0].buffer, 'tenant_photos');
      }
    }

    // Handle shift request (updating bed allocation)
    if (bedId && bedId !== tenant.bedId.toString()) {
      // 1. Verify new bed is available
      const newBed = await Bed.findOne({ _id: bedId, ownerId });
      if (!newBed) {
        return res.status(404).json({ message: 'Selected new bed not found' });
      }
      if (newBed.status !== 'Available') {
        return res.status(400).json({ message: 'Selected new bed is already occupied' });
      }

      // 2. Free old bed
      await Bed.findOneAndUpdate(
        { _id: tenant.bedId, ownerId },
        { status: 'Available', tenantId: null }
      );

      // 3. Occupy new bed
      newBed.status = 'Occupied';
      newBed.tenantId = tenant._id;
      await newBed.save();

      // Log notification
      await createNotification(
        ownerId,
        `Tenant "${tenant.name}" shifted from Bed ${tenant.bedId} to new Bed ${newBed.bedNumber}`,
        'checkin'
      );

      // 4. Update tenant references
      tenant.pgId = pgId || tenant.pgId;
      tenant.roomId = roomId || tenant.roomId;
      tenant.bedId = bedId;
    }

    // Handle checkout / deactivation
    if (status === 'Left' && tenant.status !== 'Left') {
      // Free the active bed unit
      await Bed.findOneAndUpdate(
        { _id: tenant.bedId, ownerId },
        { status: 'Available', tenantId: null }
      );
      tenant.status = 'Left';
      tenant.leavingDate = leavingDate ? new Date(leavingDate) : new Date();

      if (tenant.studentId) {
        await Student.findByIdAndUpdate(tenant.studentId, {
          status: 'Checked Out',
          pgId: null,
          roomId: null,
          bedId: null,
        });
      }

      // Log notification
      await createNotification(ownerId, `Tenant "${tenant.name}" checked-out from PG accommodation`, 'checkout');
    }

    tenant.name = name || tenant.name;
    tenant.email = email || tenant.email;
    tenant.phone = phone || tenant.phone;
    tenant.emergencyPhone = emergencyPhone || tenant.emergencyPhone;

    await tenant.save();

    res.status(200).json({
      message: 'Tenant profile updated successfully!',
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Tenant (Never permanently delete: sets status to Left and frees bed).
 */
export const deleteTenant = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  try {
    const tenant = await Tenant.findOne({ _id: id, ownerId });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant profile not found or unauthorized' });
    }

    if (tenant.status === 'Active') {
      // Free the associated bed
      await Bed.findOneAndUpdate(
        { _id: tenant.bedId, ownerId },
        { status: 'Available', tenantId: null }
      );
    }

    tenant.status = 'Left';
    tenant.leavingDate = new Date();
    await tenant.save();

    if (tenant.studentId) {
      await Student.findByIdAndUpdate(tenant.studentId, {
        status: 'Checked Out',
        pgId: null,
        roomId: null,
        bedId: null,
      });
    }

    // Log notification
    await createNotification(ownerId, `Tenant "${tenant.name}" deactivated & marked as Left`, 'checkout');

    res.status(200).json({
      message: 'Tenant deactivated successfully (Marked as Left and bed released)',
    });
  } catch (error) {
    next(error);
  }
};

export const searchRegisteredStudent = async (req, res, next) => {
  const { query } = req.query; // email or phone
  try {
    if (!query) {
      return res.status(400).json({ message: 'Query parameter (email or phone) is required' });
    }

    const student = await Student.findOne({
      $or: [{ email: query.trim() }, { phone: query.trim() }],
    }).select('-password -refreshToken');

    if (!student) {
      return res.status(404).json({ message: 'Student is not registered. Ask the student to register first.' });
    }

    res.status(200).json({
      message: 'Student record found',
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const allocateBedToStudent = async (req, res, next) => {
  const { studentId, pgId, roomId, bedId, joiningDate } = req.body;
  const ownerId = req.user.id;

  try {
    // 1. Verify student exists and is not checked in
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }
    if (student.status === 'Checked In' || student.status === 'Bed Allocated') {
      return res.status(400).json({ message: 'Student is already checked into an accommodation' });
    }

    // 2. Verify Bed is available
    const bed = await Bed.findOne({ _id: bedId, ownerId, status: 'Available' });
    if (!bed) {
      return res.status(400).json({ message: 'Selected Bed is not available' });
    }

    // 3. Create Tenant document
    const tenant = await Tenant.create({
      ownerId,
      studentId,
      pgId,
      roomId,
      bedId,
      name: student.name,
      email: student.email,
      phone: student.phone,
      joiningDate: joiningDate || new Date(),
      status: 'Active',
    });

    // 4. Update Bed status to Occupied
    bed.status = 'Occupied';
    bed.tenantId = tenant._id;
    await bed.save();

    // 5. Update Student details
    student.status = 'Checked In';
    student.pgId = pgId;
    student.roomId = roomId;
    student.bedId = bedId;
    await student.save();

    // 6. Log notification
    await createNotification(
      ownerId,
      `Student "${student.name}" allocated to Room ${roomId} Bed ${bed.bedNumber} successfully`,
      'checkin'
    );

    res.status(201).json({
      message: 'Bed allocated to student successfully!',
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequests = async (req, res, next) => {
  const ownerId = req.user.id;
  try {
    const pgs = await PG.find({ ownerId });
    const pgIds = pgs.map(p => p._id);

    const students = await Student.find({
      pgId: { $in: pgIds },
      'leaveRequest.status': 'Pending',
    }).select('-password -refreshToken').populate('pgId', 'name').populate('roomId', 'roomNumber');

    res.status(200).json({
      message: 'Leave requests retrieved successfully',
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

export const processLeaveRequest = async (req, res, next) => {
  const ownerId = req.user.id;
  const { studentId } = req.params;
  const { status } = req.body; // 'Approved' or 'Rejected'

  try {
    const pgs = await PG.find({ ownerId });
    const pgIds = pgs.map(p => p._id);

    const student = await Student.findOne({ _id: studentId, pgId: { $in: pgIds } });
    if (!student) {
      return res.status(404).json({ message: 'Student leave request not found or unauthorized' });
    }

    if (status === 'Approved') {
      const { pgId, roomId, bedId } = student;

      // 1. Free Bed unit
      if (bedId) {
        await Bed.findOneAndUpdate(
          { _id: bedId, ownerId },
          { status: 'Available', tenantId: null }
        );
      }

      // 2. Update active Tenant record
      await Tenant.findOneAndUpdate(
        { studentId, status: 'Active' },
        { status: 'Left', leavingDate: student.leaveRequest.leavingDate || new Date() }
      );

      // 3. Update Student residency mappings
      student.status = 'Checked Out';
      student.pgId = null;
      student.roomId = null;
      student.bedId = null;
      student.leaveRequest.status = 'Approved';

      // 4. Log checkout notifications
      await createNotification(
        ownerId,
        `Leaving Request Approved: Resident student "${student.name}" checked out successfully.`,
        'checkout'
      );
    } else {
      student.leaveRequest.status = 'Rejected';
      
      // Log rejection notifications
      await createNotification(
        ownerId,
        `Leaving Request Rejected: Student "${student.name}" checkout request was rejected by landlord.`,
        'system'
      );
    }

    await student.save();

    res.status(200).json({
      message: `Student leave request ${status.toLowerCase()} successfully!`,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};
