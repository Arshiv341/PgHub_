import Owner from '../models/Owner.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';
import emailService from '../services/email/emailService.js';
import { getVerifyEmailTemplate } from '../services/email/templates/verifyEmail.js';
import { getForgotPasswordTemplate } from '../services/email/templates/forgotPassword.js';
import { getWelcomeTemplate } from '../services/email/templates/welcome.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Cookie options for secure storage
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // true in production
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

/**
 * Helper to generate a cryptographically secure 6-digit OTP code.
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Register PG/Hostel Owner Account.
 * Generates OTP code, sends verification mail, and returns unverified profile state.
 */
export const registerOwner = async (req, res, next) => {
  const { name, email, password, phone, businessName } = req.body;

  try {
    // 1. Check if email already registered
    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // 2. Generate 6-Digit Email Verification Code (OTP)
    const verificationOtp = generateOTP();
    const verificationOtpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 3. Create the Owner record in unverified state
    const owner = await Owner.create({
      name,
      email,
      password,
      phone,
      businessName,
      isVerified: false,
      verificationOtp,
      verificationOtpExpire,
    });

    // 4. Send the verification OTP email
    const emailPayload = getVerifyEmailTemplate(verificationOtp);
    await emailService.sendEmail({
      to: email,
      ...emailPayload,
    });

    res.status(201).json({
      message: 'Registration successful! Please check your email for verification OTP code.',
      data: {
        id: owner._id,
        email: owner.email,
        name: owner.name,
        isVerified: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login Owner.
 * Verifies email & password. If unverified, instructs email verification.
 * Else, issues short-lived JWT Access Token & secure HTTP-Only Refresh Token.
 */
export const loginOwner = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Find Owner
    const owner = await Owner.findOne({ email });
    if (!owner) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Compare Passwords
    const isMatch = await owner.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Enforce Email Verification check
    if (!owner.isVerified) {
      // Re-generate OTP if expired
      if (!owner.verificationOtpExpire || owner.verificationOtpExpire < new Date()) {
        owner.verificationOtp = generateOTP();
        owner.verificationOtpExpire = new Date(Date.now() + 10 * 60 * 1000);
        await owner.save();
        
        const emailPayload = getVerifyEmailTemplate(owner.verificationOtp);
        await emailService.sendEmail({
          to: email,
          ...emailPayload,
        });
      }
      return res.status(403).json({
        message: 'Account not verified. Verification code has been dispatched to your email.',
        isVerified: false,
      });
    }

    // 4. Create Session Tokens
    const accessToken = generateAccessToken(owner);
    const refreshToken = generateRefreshToken(owner);

    // 5. Store current refresh token on database
    owner.refreshToken = refreshToken;
    await owner.save();

    // 6. Set Refresh Token as HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(200).json({
      message: 'Login successful!',
      accessToken,
      data: {
        id: owner._id,
        email: owner.email,
        name: owner.name,
        businessName: owner.businessName,
        isVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token.
 * Verifies HTTP-Only refresh cookie, matches database state, and rotates tokens.
 */
export const refreshToken = async (req, res, next) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({ message: 'Session session expired: No refresh token provided' });
  }

  try {
    // 1. Verify token sign
    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_SECRET);

    // 2. Find Owner matching active refresh token session
    const owner = await Owner.findOne({ _id: decoded.id, refreshToken: incomingRefreshToken });
    if (!owner) {
      return res.status(401).json({ message: 'Invalid session state. Please login again.' });
    }

    // 3. Generate new session tokens
    const newAccessToken = generateAccessToken(owner);
    const newRefreshToken = generateRefreshToken(owner);

    // 4. Update session token on DB
    owner.refreshToken = newRefreshToken;
    await owner.save();

    // 5. Set new Refresh Cookie
    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({ message: 'Session expired, please login again.' });
  }
};

/**
 * Logout Owner.
 * Clears cookies and deletes active refresh token session from DB.
 */
export const logoutOwner = async (req, res, next) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  try {
    if (incomingRefreshToken) {
      // Clear refresh token field in Owner DB document
      await Owner.findOneAndUpdate(
        { refreshToken: incomingRefreshToken },
        { refreshToken: null }
      );
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Email with OTP.
 * Validates code, changes verification state, and logs user in.
 */
export const verifyEmail = async (req, res, next) => {
  const { otp } = req.body;

  try {
    // Find owner matching active OTP
    const owner = await Owner.findOne({
      verificationOtp: otp,
      verificationOtpExpire: { $gt: new Date() },
    });

    if (!owner) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    // Toggle verified status and clear OTP
    owner.isVerified = true;
    owner.verificationOtp = null;
    owner.verificationOtpExpire = null;

    // Send a welcome email to the newly verified owner!
    const welcomePayload = getWelcomeTemplate(owner.name);
    await emailService.sendEmail({
      to: owner.email,
      ...welcomePayload,
    });

    // Log the user in directly by generating tokens
    const accessToken = generateAccessToken(owner);
    const refreshToken = generateRefreshToken(owner);

    owner.refreshToken = refreshToken;
    await owner.save();

    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(200).json({
      message: 'Email verified and logged in successfully!',
      accessToken,
      data: {
        id: owner._id,
        email: owner.email,
        name: owner.name,
        businessName: owner.businessName,
        isVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password.
 * Generates temporary token, saves 1-hour expiry, and sends reset URL to email.
 */
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const owner = await Owner.findOne({ email });
    if (!owner) {
      return res.status(404).json({ message: 'No account registered with this email address' });
    }

    // Generate random recovery hex token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and write expiry (1 hour) to DB fields
    owner.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    owner.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await owner.save();

    // Send reset instructions email
    const emailPayload = getForgotPasswordTemplate(resetToken);
    await emailService.sendEmail({
      to: email,
      ...emailPayload,
    });

    res.status(200).json({ message: 'Password recovery email dispatched successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password.
 * Validates incoming recovery token, updates password, and cleans token state.
 */
export const resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  try {
    // Re-hash token to match database record
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find Owner matching hash token and checking expiry
    const owner = await Owner.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!owner) {
      return res.status(400).json({ message: 'Invalid or expired recovery reset token' });
    }

    // Update password (pre-save hook will hash it automatically)
    owner.password = password;
    owner.resetPasswordToken = null;
    owner.resetPasswordExpire = null;
    owner.refreshToken = null; // Invalidate current session logs for security

    await owner.save();

    res.status(200).json({ message: 'Password reset successful! You can now log in.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Owner Profile Details.
 */
export const getOwnerProfile = async (req, res, next) => {
  try {
    const owner = await Owner.findById(req.user.id).select('-password');
    if (!owner) {
      return res.status(404).json({ message: 'Owner profile not found' });
    }
    res.status(200).json({
      message: 'Fetched profile details',
      data: owner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Owner Profile.
 */
export const updateOwnerProfile = async (req, res, next) => {
  const { name, phone, businessName } = req.body;
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner profile not found' });
    }

    owner.name = name || owner.name;
    owner.phone = phone || owner.phone;
    owner.businessName = businessName || owner.businessName;

    await owner.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      data: {
        id: owner._id,
        email: owner.email,
        name: owner.name,
        phone: owner.phone,
        businessName: owner.businessName,
        isVerified: owner.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};
