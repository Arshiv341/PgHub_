import PG from '../models/PG.js';
import { uploadToCloudinary } from '../utils/cloudinaryUploader.js';

/**
 * Get All PGs (with pagination, search & filters).
 * Strictly isolated by ownerId.
 */
export const getPgs = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { search, type, city, page = 1, limit = 10 } = req.query;

    const query = { ownerId };

    // Search filter (name check)
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // PG type filter
    if (type && type !== 'All') {
      query.type = type;
    }

    // City filter
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    // Pagination variables
    const skip = (Number(page) - 1) * Number(limit);

    const total = await PG.countDocuments(query);
    const pgs = await PG.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      message: 'PGs fetched successfully',
      data: pgs,
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
 * Get Single PG by ID.
 * Strictly isolated by ownerId.
 */
export const getPgById = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  try {
    const pg = await PG.findOne({ _id: id, ownerId });
    if (!pg) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.status(200).json({
      message: 'PG fetched successfully',
      data: pg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create New PG Property.
 * Handles Cloudinary image buffer uploads.
 */
export const createPg = async (req, res, next) => {
  const { name, address, city, type, amenities } = req.body;
  const ownerId = req.user.id;

  try {
    // Process image uploads if any files are attached
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer, 'pg_properties');
        imageUrls.push(url);
      }
    }

    const pg = await PG.create({
      ownerId,
      name,
      address,
      city,
      type,
      amenities: Array.isArray(amenities) ? amenities : (amenities ? amenities.split(',').map(a => a.trim()) : []),
      images: imageUrls,
    });

    res.status(201).json({
      message: 'PG Property created successfully!',
      data: pg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update PG Property details.
 * Strictly isolated by ownerId.
 */
export const updatePg = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;
  const { name, address, city, type, amenities } = req.body;

  try {
    const pg = await PG.findOne({ _id: id, ownerId });
    if (!pg) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    // Process new images if attached
    const newImageUrls = [...pg.images];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer, 'pg_properties');
        newImageUrls.push(url);
      }
    }

    pg.name = name || pg.name;
    pg.address = address || pg.address;
    pg.city = city || pg.city;
    pg.type = type || pg.type;
    if (amenities !== undefined) {
      pg.amenities = Array.isArray(amenities) ? amenities : amenities.split(',').map(a => a.trim());
    }
    pg.images = newImageUrls;

    await pg.save();

    res.status(200).json({
      message: 'PG Property updated successfully!',
      data: pg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete PG Property.
 * Strictly isolated by ownerId.
 */
export const deletePg = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  try {
    const pg = await PG.findOneAndDelete({ _id: id, ownerId });
    if (!pg) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    res.status(200).json({
      message: 'PG Property deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
