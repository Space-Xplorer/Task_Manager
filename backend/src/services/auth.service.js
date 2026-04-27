import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

// Helper to hash refresh tokens
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ─── Token generation ─────────────────────────────────────────────────────────

const generateTokens = (user) => {
  const payload = { id: String(user._id), email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
};

const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token: hashToken(token), userId, expiresAt });
};

// ─── Public service methods ───────────────────────────────────────────────────

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  // Role is always 'user' — admin is seeded separately
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'user' });
  const tokens = generateTokens(user);
  await saveRefreshToken(user._id, tokens.refreshToken);
  return {
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    ...tokens,
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' });

  const valid = await user.comparePassword(password);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' });

  const tokens = generateTokens(user);
  await saveRefreshToken(user._id, tokens.refreshToken);
  return {
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    ...tokens,
  };
};

export const rotateRefreshToken = async (oldToken) => {
  const doc = await RefreshToken.findOne({ token: hashToken(oldToken) });
  if (!doc) throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401, code: 'INVALID_REFRESH_TOKEN' });

  if (doc.expiresAt < new Date()) {
    // Token already expired — wipe all sessions for this user (replay protection)
    await RefreshToken.deleteMany({ userId: doc.userId });
    throw Object.assign(new Error('Session expired — please log in again'), { status: 401, code: 'SESSION_EXPIRED' });
  }

  const user = await User.findById(doc.userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 401, code: 'USER_NOT_FOUND' });

  const tokens = generateTokens(user);
  // Atomic rotation: delete old, save new
  await RefreshToken.deleteOne({ _id: doc._id });
  await saveRefreshToken(user._id, tokens.refreshToken);
  return {
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    ...tokens,
  };
};

export const logoutUser = async (userId, refreshToken) => {
  await RefreshToken.deleteOne({ userId, token: hashToken(refreshToken) });
};
