// Factory — returns a middleware that checks req.user.role
// Usage: router.post('/', authenticate, authorize('admin'), controller)
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
  }
  next();
};
