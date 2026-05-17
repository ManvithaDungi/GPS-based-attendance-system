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
import supportRoutes from './routes/support.routes';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';

const app: Express = express();

// Middleware
const normalizeOrigin = (value: string): string => value.replace(/\/+$/, '');
const envOrigins = `${process.env.FRONTEND_URL ?? ''},${process.env.CORS_ORIGIN ?? ''}`
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

// Keep local development working even if env variables were not loaded.
const fallbackDevOrigins = ['http://localhost:8081', 'http://localhost:5173'];
const allowedOrigins = Array.from(new Set([...envOrigins, ...fallbackDevOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      return callback(null, allowedOrigins.includes(normalizedOrigin));
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
// Support (feedback) endpoint — mount under /api/v1 to match frontend baseURL (/api/v1)
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many support requests from this IP, please try again later.' },
});
app.use('/api/v1/support', supportLimiter, supportRoutes);

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
