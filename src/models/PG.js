import mongoose from 'mongoose';

const pgSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: [true, 'Owner ID reference is required for tenancy isolation'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a property name'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please add an address'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Please add a city'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Please specify PG type'],
      enum: {
        values: ['Boys', 'Girls', 'Unisex'],
        message: 'Type must be Boys, Girls, or Unisex',
      },
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String], // Array of Cloudinary URLs
      default: [],
    },
    latitude: {
      type: Number,
      default: 28.6139,
    },
    longitude: {
      type: Number,
      default: 77.2090,
    },
    startingRent: {
      type: Number,
      default: 5000,
    },
    rules: {
      type: String,
      default: 'Curfew: 10 PM. No outside guests after 8 PM.',
    },
  },
  {
    timestamps: true,
  }
);

// Composite Indexing to speed up owner-scoped queries
pgSchema.index({ ownerId: 1, name: 1 });

const PG = mongoose.model('PG', pgSchema);
export default PG;
