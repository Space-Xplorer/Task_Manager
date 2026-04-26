/**
 * Admin Seed Script
 * Run: npm run seed
 *
 * Creates the admin account if it doesn't already exist.
 * Credentials are read from .env SEED_ADMIN_* variables.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

const seed = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
    if (existing) {
      console.log(`ℹ️  Admin already exists: ${env.SEED_ADMIN_EMAIL}`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);
    await User.create({
      name:  env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      passwordHash,
      role:  'admin',
    });

    console.log('✅ Admin seeded successfully!');
    console.log('──────────────────────────────');
    console.log(`   Email:    ${env.SEED_ADMIN_EMAIL}`);
    console.log(`   Password: ${env.SEED_ADMIN_PASSWORD}`);
    console.log('──────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
