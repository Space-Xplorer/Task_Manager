import { z } from 'zod';
import {
  registerUser,
  loginUser,
  rotateRefreshToken,
  logoutUser,
} from '../services/auth.service.js';

// ─── Validation schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(1, 'Name is required').trim(),
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

export const register = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' });
    }
    const result = await registerUser(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' });
    }
    const result = await loginUser(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required', code: 'VALIDATION_ERROR' });
    }
    const tokens = await rotateRefreshToken(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required', code: 'VALIDATION_ERROR' });
    }
    await logoutUser(req.user.id, refreshToken);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};
