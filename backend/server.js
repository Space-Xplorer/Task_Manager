import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import app from './src/app.js';

let dbReady = false;

const ensureDB = async () => {
  if (!dbReady) {
    await connectDB();
    dbReady = true;
  }
};

// ─── Long-running server (local dev, Render, Railway) ──────────────────────────
if (!process.env.VERCEL) {
  ensureDB()
    .then(() => {
      app.listen(env.PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${env.PORT}`);
        console.log(`📡 SSE endpoint: http://0.0.0.0:${env.PORT}/api/sse`);
      });
    })
    .catch((err) => {
      console.error('❌ Startup failed:', err.message);
      process.exit(1);
    });
}

// ─── Vercel serverless export ──────────────────────────────────────────────────
// Each invocation connects (or reuses cached) DB, then delegates to Express.
// Note: SSE (/api/sse) won't work on Vercel due to 10s function timeout.
//       All REST APIs (auth, tasks) work normally.
export default async (req, res) => {
  try {
    await ensureDB();
  } catch (err) {
    console.error('DB connect error:', err.message);
    res.status(503).json({ error: 'Database unavailable', code: 'DB_ERROR' });
    return;
  }
  app(req, res);
};
