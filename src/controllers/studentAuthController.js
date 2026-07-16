import Student from '../models/Student.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';
import emailService from '../services/email/emailService.js';
import { getVerifyEmailTemplate } from '../services/email/templates/verifyEmail.js';
import jwt from 'jsonwebtoken';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerStudent = async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingStudent = await Student.findOne({ $or: [{ email }, { phone }] });
    if (existingStudent) {
      return res.status(400).json({ message: 'A student account with this email or phone already exists' });
    }

    const verificationOtp = generateOTP();
    const verificationOtpExpire = new Date(Date.now() + 10 * 60 * 1000);

    const student = await Student.create({
      name,
      email,
      password,
      phone,
      isVerified: false,
      verificationOtp,
      verificationOtpExpire,
    });

    // Send verification email
    const emailPayload = getVerifyEmailTemplate(verificationOtp);
    await emailService.sendEmail({
      to: email,
      ...emailPayload,
    });

    res.status(201).json({
      message: 'Student registration successful! Check your email for verification OTP code.',
      data: {
        id: student._id,
        email: student.email,
        name: student.name,
        isVerified: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyStudentEmail = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: 'Student account not found' });
    }

    if (student.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    if (student.verificationOtp !== otp || student.verificationOtpExpire < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    student.isVerified = true;
    student.verificationOtp = null;
    student.verificationOtpExpire = null;
    await student.save();

    res.status(200).json({
      message: 'Email verification successful! You can now log in.',
      data: {
        email: student.email,
        isVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginStudent = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await student.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!student.isVerified) {
      if (!student.verificationOtpExpire || student.verificationOtpExpire < new Date()) {
        student.verificationOtp = generateOTP();
        student.verificationOtpExpire = new Date(Date.now() + 10 * 60 * 1000);
        await student.save();

        const emailPayload = getVerifyEmailTemplate(student.verificationOtp);
        await emailService.sendEmail({
          to: email,
          ...emailPayload,
        });
      }
      return res.status(403).json({
        message: 'Account not verified. Verification code has been sent to your email.',
        isVerified: false,
      });
    }

    const accessToken = generateAccessToken(student);
    const refreshToken = generateRefreshToken(student);

    student.refreshToken = refreshToken;
    await student.save();

    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(200).json({
      message: 'Login successful!',
      accessToken,
      data: {
        id: student._id,
        email: student.email,
        name: student.name,
        phone: student.phone,
        status: student.status,
        pgId: student.pgId,
        roomId: student.roomId,
        bedId: student.bedId,
        isVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshStudentToken = async (req, res, next) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({ message: 'Session expired: No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_SECRET);
    const student = await Student.findOne({ _id: decoded.id, refreshToken: incomingRefreshToken });
    if (!student) {
      return res.status(401).json({ message: 'Invalid session state. Please login again.' });
    }

    const newAccessToken = generateAccessToken(student);
    const newRefreshToken = generateRefreshToken(student);

    student.refreshToken = newRefreshToken;
    await student.save();

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({ message: 'Session expired, please login again.' });
  }
};

export const logoutStudent = async (req, res, next) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  try {
    if (incomingRefreshToken) {
      await Student.findOneAndUpdate(
        { refreshToken: incomingRefreshToken },
        { $set: { refreshToken: null } }
      );
    }

    res.clearCookie('refreshToken', cookieOptions);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id).select('-password -refreshToken');
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    res.status(200).json({ data: student });
  } catch (error) {
    next(error);
  }
};

export const updateStudentProfile = async (req, res, next) => {
  const { name, phone } = req.body;

  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    if (name) student.name = name;
    if (phone) student.phone = phone;

    const updated = await student.save();
    res.status(200).json({
      message: 'Profile updated successfully!',
      data: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};
