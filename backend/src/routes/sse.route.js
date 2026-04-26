import { Router } from 'express';
import crypto from 'crypto';
import { sseManager } from '../services/sse.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// In-memory ticket store (For production, use Redis)
// Maps ticket -> { id, role, expiresAt }
const tickets = new Map();

// POST /api/sse/ticket - Generates short-lived token to open SSE securely
router.post('/ticket', authenticate, (req, res) => {
  const ticket = crypto.randomBytes(32).toString('hex');
  tickets.set(ticket, {
    id: req.user.id,
    role: req.user.role,
    expiresAt: Date.now() + 10000 // 10 seconds TTL
  });
  res.json({ ticket });
});

// GET /api/sse?ticket=<ticket>
router.get('/', (req, res) => {
  const { ticket } = req.query;
  if (!ticket) return res.status(401).end();

  const user = tickets.get(ticket);
  if (!user || user.expiresAt < Date.now()) {
    if (user) tickets.delete(ticket);
    return res.status(401).end();
  }
  
  // Single use ticket
  tickets.delete(ticket);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: {"userId":"${user.id}"}\n\n`);

  sseManager.register(user.id, user.role, res);
});

export default router;
