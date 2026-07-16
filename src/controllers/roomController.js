import Room from '../models/Room.js';
import Bed from '../models/Bed.js';

/**
 * Get All Rooms (isolated by ownerId).
 * Supports filter by pgId.
 */
export const getRooms = async (req, res, next) => {
  const ownerId = req.user.id;
  const { pgId } = req.query;

  try {
    const query = { ownerId };
    if (pgId) {
      query.pgId = pgId;
    }

    const rooms = await Room.find(query).sort({ roomNumber: 1 });
    
    // Fetch associated beds for each room to send back as details
    const roomsWithBeds = [];
    for (const room of rooms) {
      const beds = await Bed.find({ roomId: room._id });
      roomsWithBeds.push({
        ...room.toObject(),
        beds,
      });
    }

    res.status(200).json({
      message: 'Rooms fetched successfully',
      data: roomsWithBeds,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Room by ID (isolated by ownerId).
 */
export const getRoomById = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  try {
    const room = await Room.findOne({ _id: id, ownerId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const beds = await Bed.find({ roomId: room._id });

    res.status(200).json({
      message: 'Room fetched successfully',
      data: {
        ...room.toObject(),
        beds,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create New Room.
 * Automatically generates Bed documents inside a loop up to sharing capacity.
 */
export const createRoom = async (req, res, next) => {
  const { pgId, roomNumber, sharingType, rentPerBed } = req.body;
  const ownerId = req.user.id;

  try {
    // 1. Check if room number already exists in this specific PG
    const roomExists = await Room.findOne({ ownerId, pgId, roomNumber });
    if (roomExists) {
      return res.status(400).json({ message: `Room ${roomNumber} already exists in this PG` });
    }

    // 2. Create the Room
    const room = await Room.create({
      ownerId,
      pgId,
      roomNumber,
      sharingType: Number(sharingType),
      rentPerBed: Number(rentPerBed),
    });

    // 3. Auto-generate Bed documents
    const beds = [];
    for (let i = 0; i < Number(sharingType); i++) {
      const bedNumber = String.fromCharCode(65 + i); // Bed A, B, C...
      beds.push({
        ownerId,
        pgId,
        roomId: room._id,
        bedNumber,
        status: 'Available',
        tenantId: null,
      });
    }
    const createdBeds = await Bed.insertMany(beds);

    res.status(201).json({
      message: 'Room created and beds generated successfully!',
      data: {
        ...room.toObject(),
        beds: createdBeds,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Room.
 * Note: If sharingType decreases, verify if any beds are occupied before dropping!
 */
export const updateRoom = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;
  const { roomNumber, sharingType, rentPerBed } = req.body;

  try {
    const room = await Room.findOne({ _id: id, ownerId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found or unauthorized' });
    }

    room.roomNumber = roomNumber || room.roomNumber;
    room.rentPerBed = rentPerBed !== undefined ? Number(rentPerBed) : room.rentPerBed;

    // Handle capacity adjustments
    if (sharingType !== undefined && Number(sharingType) !== room.sharingType) {
      const targetCapacity = Number(sharingType);
      const currentBeds = await Bed.find({ roomId: room._id }).sort({ bedNumber: 1 });

      if (targetCapacity > room.sharingType) {
        // Adding beds
        const additionalBeds = [];
        for (let i = room.sharingType; i < targetCapacity; i++) {
          const bedNumber = String.fromCharCode(65 + i);
          additionalBeds.push({
            ownerId,
            pgId: room.pgId,
            roomId: room._id,
            bedNumber,
            status: 'Available',
            tenantId: null,
          });
        }
        await Bed.insertMany(additionalBeds);
      } else {
        // Reducing capacity: verify if any beds to be removed are occupied!
        const bedsToRemove = currentBeds.slice(targetCapacity);
        const hasOccupied = bedsToRemove.some(b => b.status === 'Occupied');
        
        if (hasOccupied) {
          return res.status(400).json({
            message: 'Cannot reduce room capacity: Some of the beds scheduled for removal are currently occupied.',
          });
        }

        // Delete the extra beds
        const idsToRemove = bedsToRemove.map(b => b._id);
        await Bed.deleteMany({ _id: { $in: idsToRemove } });
      }

      room.sharingType = targetCapacity;
    }

    await room.save();
    const updatedBeds = await Bed.find({ roomId: room._id });

    res.status(200).json({
      message: 'Room updated successfully!',
      data: {
        ...room.toObject(),
        beds: updatedBeds,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Room (cascades and deletes all associated beds).
 */
export const deleteRoom = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  try {
    const room = await Room.findOne({ _id: id, ownerId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found or unauthorized' });
    }

    // Verify if any beds are occupied before deletion
    const occupiedBeds = await Bed.countDocuments({ roomId: room._id, status: 'Occupied' });
    if (occupiedBeds > 0) {
      return res.status(400).json({
        message: 'Cannot delete room: Some beds are currently occupied by active tenants.',
      });
    }

    // Delete room and cascade delete beds
    await Bed.deleteMany({ roomId: room._id });
    await Room.deleteOne({ _id: room._id });

    res.status(200).json({
      message: 'Room and its associated beds deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Beds list (filtered by pgId or roomId).
 */
export const getBeds = async (req, res, next) => {
  const ownerId = req.user.id;
  const { pgId, roomId, status } = req.query;

  try {
    const query = { ownerId };
    if (pgId) query.pgId = pgId;
    if (roomId) query.roomId = roomId;
    if (status) query.status = status;

    const beds = await Bed.find(query).populate('tenantId', 'name email phone');

    res.status(200).json({
      message: 'Beds list fetched successfully',
      data: beds,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update individual Bed status (Available, Occupied, Maintenance).
 */
export const updateBedStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const ownerId = req.user.id;

  try {
    const bed = await Bed.findOne({ _id: id, ownerId });
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found or unauthorized' });
    }

    if (status === 'Available' && bed.status === 'Occupied') {
      return res.status(400).json({
        message: 'Cannot set bed to Available: You must check out the tenant first using Student Management.',
      });
    }

    bed.status = status;
    await bed.save();

    res.status(200).json({
      message: 'Bed status updated successfully',
      data: bed,
    });
  } catch (error) {
    next(error);
  }
};
