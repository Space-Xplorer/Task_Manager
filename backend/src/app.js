import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import sseRoute   from './routes/sse.route.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Required for accurate IP detection and rate-limiting when hosted behind a
// reverse proxy (Railway, Render, Fly.io, nginx, etc.)
app.set('trust proxy', 1);

// ─── Global middleware ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*' }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sse',   sseRoute);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' });
});

// ─── Central error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
