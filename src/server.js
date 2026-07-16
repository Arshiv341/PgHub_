import app from './app.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Establish MongoDB connection
  await connectDB();

  // 2. Start listening on network port
  app.listen(PORT, () => {
    console.log(`PGHub Server running in development mode on port ${PORT}`);
  });
};

startServer();
