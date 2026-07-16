import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Student from './models/Student.js';
import Owner from './models/Owner.js';

async function getOTP() {
  const email = process.argv[2];
  if (!email) {
    console.error('Specify email.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);

  let user = await Student.findOne({ email });
  if (!user) {
    user = await Owner.findOne({ email });
  }

  if (user) {
    console.log(`OTP_CODE:${user.verificationOtp}`);
  } else {
    console.log('USER_NOT_FOUND');
  }

  await mongoose.connection.close();
}

getOTP();
