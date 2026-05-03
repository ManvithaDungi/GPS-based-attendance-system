import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import adminRoutes from './routes/admin.routes';
import geofenceRoutes from './routes/geofence.routes';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/geofence', geofenceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
