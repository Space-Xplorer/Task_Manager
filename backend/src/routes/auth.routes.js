import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later', code: 'RATE_LIMIT_EXCEEDED' }
});

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/refresh',  refresh);
router.post('/logout',   authenticate, logout);

export default router;
