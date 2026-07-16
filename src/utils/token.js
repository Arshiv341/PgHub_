import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generates an Access Token valid for 15 minutes.
 * @param {Object} owner - Owner details (id, email)
 * @returns {string} jwt token string
 */
export const generateAccessToken = (owner) => {
  return jwt.sign(
    { id: owner._id || owner.id, email: owner.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generates a Refresh Token valid for 7 days.
 * @param {Object} owner - Owner details (id, email)
 * @returns {string} jwt token string
 */
export const generateRefreshToken = (owner) => {
  return jwt.sign(
    { id: owner._id || owner.id, email: owner.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};
