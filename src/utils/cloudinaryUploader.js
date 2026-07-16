import { cloudinary } from '../config/cloudinary.js';

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - File buffer from Multer memoryStorage
 * @param {string} folderName - Cloudinary folder destination
 * @returns {Promise<string>} secure image URL from Cloudinary
 */
export const uploadToCloudinary = (fileBuffer, folderName = 'pghub') => {
  return new Promise((resolve, reject) => {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn('Cloudinary not configured. Returning mock upload URL.');
      return resolve(`https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80`);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Stream Upload Error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};
