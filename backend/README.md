# Backend

Express + MongoDB API for the Task Manager app.

## What it does
- Auth: register, login, refresh, logout
- Tasks: list, create, update, delete
- SSE: live task update stream
- Seeding: admin account and demo product-team data

## Requirements
- Node.js 20+
- MongoDB connection string
- JWT secrets

## Environment
Create `backend/.env` with:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/taskmanager
JWT_ACCESS_SECRET=<random-secret>
JWT_REFRESH_SECRET=<random-secret>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
SEED_ADMIN_NAME=Admin
SEED_ADMIN_EMAIL=admin@taskmanager.com
SEED_ADMIN_PASSWORD=Admin@123
```

## Install

```bash
cd backend
npm install
```

## Run

```bash
npm run dev
```

Production:

```bash
npm start
```

## Seed data

Create the default admin:

```bash
npm run seed
```

Create the product-development demo team and tasks:

```bash
npm run seed:product
```

## API base
- Local: `http://localhost:3000/api`
- Deployed: whatever URL your host provides, with `/api` appended

## Notes
- The frontend expects refresh-token rotation.
- If you change auth env vars, restart the server.
- CORS is controlled in `src/app.js` through `ALLOWED_ORIGINS`.
