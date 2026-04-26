import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import app from './src/app.js';

const start = async () => {
  await connectDB();
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${env.PORT}`);
    console.log(`📡 SSE endpoint: http://0.0.0.0:${env.PORT}/api/sse`);
  });
};

start();
