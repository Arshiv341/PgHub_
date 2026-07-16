import mongoose from 'mongoose';

/**
 * Establish connection to MongoDB Atlas.
 * Validates MONGODB_URI and exits the process immediately on any connection failure.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // 1. Validation checks on the connection URI
  if (!uri) {
    console.error('\n[DATABASE CRITICAL ERROR] MongoDB Atlas Connection Failed: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.error('\n[DATABASE CRITICAL ERROR] MongoDB Atlas Connection Failed: MONGODB_URI has an invalid format. It must start with mongodb:// or mongodb+srv://');
    process.exit(1);
  }

  if (uri.includes('xxxxx')) {
    console.error('\n[DATABASE CRITICAL ERROR] MongoDB Atlas Connection Failed: MONGODB_URI still contains the placeholder "xxxxx". Configure your actual MongoDB Atlas connection string inside backend/.env');
    process.exit(1);
  }

  try {
    console.log('\nConnecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Atlas Connected Successfully: ${conn.connection.host}\n`);
  } catch (error) {
    console.error('\nMongoDB Atlas Connection Failed.');
    console.error(`Error Details: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
