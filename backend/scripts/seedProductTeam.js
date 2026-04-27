/**
 * Product Team Seed Script
 * Run: npm run seed:product
 *
 * Creates/updates a realistic product dev team and seeds sample sprint tasks.
 * Safe to run multiple times (users are upserted; seeded task titles are replaced).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Task } from '../src/models/Task.js';

const TEAM_PASSWORD = 'DevTeam@123';

const teamUsers = [
  { name: env.SEED_ADMIN_NAME, email: env.SEED_ADMIN_EMAIL, role: 'admin', password: env.SEED_ADMIN_PASSWORD },
  { name: 'Priya Nair', email: 'priya@productteam.dev', role: 'user', password: TEAM_PASSWORD },
  { name: 'Arjun Mehta', email: 'arjun@productteam.dev', role: 'user', password: TEAM_PASSWORD },
  { name: 'Neha Sharma', email: 'neha@productteam.dev', role: 'user', password: TEAM_PASSWORD },
  { name: 'Sana Khan', email: 'sana@productteam.dev', role: 'user', password: TEAM_PASSWORD },
  { name: 'Vivek Rao', email: 'vivek@productteam.dev', role: 'user', password: TEAM_PASSWORD },
];

const makeDateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(18, 0, 0, 0);
  return d;
};

const tasksBlueprint = [
  {
    title: 'Finalize v2 onboarding PRD',
    description: 'Lock acceptance criteria, analytics events, and open questions for sprint planning.',
    status: 'pending',
    assignedToEmails: ['priya@productteam.dev', 'sana@productteam.dev'],
    deadline: makeDateOffset(2),
  },
  {
    title: 'Implement auth-session hydration hardening',
    description: 'Ensure refresh flow always hydrates user data and routes correctly after browser reload.',
    status: 'in_progress',
    assignedToEmails: ['arjun@productteam.dev', 'neha@productteam.dev'],
    deadline: makeDateOffset(1),
  },
  {
    title: 'Build task analytics aggregation endpoint',
    description: 'Add API aggregation for completion velocity and pending-by-owner dashboard cards.',
    status: 'pending',
    assignedToEmails: ['neha@productteam.dev'],
    deadline: makeDateOffset(3),
  },
  {
    title: 'Polish profile and tab navigation interactions',
    description: 'Refine spacing, feedback states, and keyboard/focus UX for web and mobile parity.',
    status: 'pending',
    assignedToEmails: ['sana@productteam.dev', 'arjun@productteam.dev'],
    deadline: makeDateOffset(4),
  },
  {
    title: 'Create regression suite for auth + signout flows',
    description: 'Cover login/register/signout/session-reload regressions and verify role-based UI behavior.',
    status: 'in_progress',
    assignedToEmails: ['vivek@productteam.dev'],
    deadline: makeDateOffset(2),
  },
  {
    title: 'Deploy staging web build and smoke test links',
    description: 'Publish shareable URL for stakeholders and verify CORS/auth behavior in production mode.',
    status: 'completed',
    assignedToEmails: ['arjun@productteam.dev', env.SEED_ADMIN_EMAIL],
    deadline: makeDateOffset(-1),
  },
  {
    title: 'Add backend structured error telemetry',
    description: 'Capture route-level error metrics for 401/409/5xx and expose actionable operational logs.',
    status: 'pending',
    assignedToEmails: ['neha@productteam.dev', env.SEED_ADMIN_EMAIL],
    deadline: makeDateOffset(5),
  },
  {
    title: 'QA pass for task lifecycle transitions',
    description: 'Validate pending -> in progress -> completed transitions with assignment and deadline edge cases.',
    status: 'pending',
    assignedToEmails: ['vivek@productteam.dev', 'priya@productteam.dev'],
    deadline: makeDateOffset(3),
  },
];

const upsertUser = async ({ name, email, role, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        name,
        email: normalizedEmail,
        role,
        passwordHash,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return user;
};

const seed = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB');

    const usersByEmail = new Map();
    for (const userDef of teamUsers) {
      const user = await upsertUser(userDef);
      usersByEmail.set(user.email, user);
    }

    const adminUser = usersByEmail.get(env.SEED_ADMIN_EMAIL.trim().toLowerCase());
    if (!adminUser) {
      throw new Error('Admin user could not be created/resolved from SEED_ADMIN_EMAIL');
    }

    // Replace this script's seeded tasks by exact title for idempotency.
    await Task.deleteMany({ title: { $in: tasksBlueprint.map((t) => t.title) } });

    const taskDocs = tasksBlueprint.map((t) => {
      const assignees = t.assignedToEmails
        .map((email) => usersByEmail.get(email.trim().toLowerCase()))
        .filter(Boolean)
        .map((u) => u._id);

      if (assignees.length === 0) {
        throw new Error(`Task "${t.title}" has no valid assignees`);
      }

      return {
        title: t.title,
        description: t.description,
        status: t.status,
        assignedTo: assignees,
        createdBy: adminUser._id,
        deadline: t.deadline,
      };
    });

    const inserted = await Task.insertMany(taskDocs);

    console.log('Product team seed complete');
    console.log(`Users upserted: ${teamUsers.length}`);
    console.log(`Tasks inserted: ${inserted.length}`);
    console.log('Demo credentials:');
    console.log(`Admin -> ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
    console.log(`Team users -> any @productteam.dev / ${TEAM_PASSWORD}`);

    process.exit(0);
  } catch (err) {
    console.error('Product team seed failed:', err.message);
    process.exit(1);
  }
};

seed();
