import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import adminRoutes from './routes/admin.routes';
import geofenceRoutes from './routes/geofence.routes';
import studentRoutes from './routes/student.routes';
import notificationRoutes from './routes/notification.routes';
import fraudRoutes from './routes/fraud.routes';
import { errorHandler } from './middleware/error.middleware';

const app: Express = express();

// Middleware
// app.ts
const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, false);
      return callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-CSRF-Token'],
  })
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/geofence', geofenceRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/fraud', fraudRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to InDaZone GPS Attendance System',
    docs: '/api/v1/docs', // Or wherever your docs live
    status: 'Backend is working!',
  });
});

// Ignore favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handling for uncaught route/middleware errors
app.use(errorHandler);

export default app;
