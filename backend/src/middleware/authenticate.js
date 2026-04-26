import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
};
