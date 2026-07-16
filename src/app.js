import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { apiLimiter } from './config/rateLimiter.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import studentAuthRoutes from './routes/studentAuthRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import pgRoutes from './routes/pgRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Request logging via Morgan in development mode
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Standard Production Middlewares
app.use(cors({
  origin: true, // Allow client origin mapping
  credentials: true, // Allow cookies to pass back and forth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting (Applied to all API endpoints)
app.use('/api', apiLimiter);

// Welcome test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PGHub API Service (Boilerplate)' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/student/auth', studentAuthRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/pgs', pgRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling (Must be registered last)
app.use(errorHandler);

export default app;
