require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const indriveRoutes = require('./routes/indrive');
const eggsRoutes = require('./routes/eggs');
const loansRoutes = require('./routes/loans');
const auditRoutes = require('./routes/auditLog');
const dashboardRoutes = require('./routes/dashboard');

const authMiddleware = require('./middleware/authMiddleware');
const { seedUsers } = require('./utils/seedUsers');

const app = express();

// Connect to MongoDB, then seed default users
connectDB().then(() => seedUsers()).catch(() => {});

// Middleware
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Public routes (no auth) ───────────────────────────────────
app.use('/api/auth', authRoutes);

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Protected routes (JWT required) ──────────────────────────
app.use('/api/indrive',   authMiddleware, indriveRoutes);
app.use('/api/eggs',      authMiddleware, eggsRoutes);
app.use('/api/loans',     authMiddleware, loansRoutes);
app.use('/api/audit',     authMiddleware, auditRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 BizTrack server running on port ${PORT}`);
});
