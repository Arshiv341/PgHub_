import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
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
      required: [true, 'PG property reference is required'],
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Please add a room number'],
      trim: true,
    },
    sharingType: {
      type: Number,
      required: [true, 'Please specify bed sharing capacity count (e.g. 1, 2, 3)'],
      min: [1, 'Room sharing must support at least 1 bed'],
    },
    rentPerBed: {
      type: Number,
      required: [true, 'Please specify rental rate per bed unit'],
      min: [0, 'Rent cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Strict owner + PG isolation composite index
roomSchema.index({ ownerId: 1, pgId: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model('Room', roomSchema);
export default Room;
