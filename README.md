# Task Manager — Setup & Run Guide

## Quick Start Checklist

1. **Fill in backend `.env`** with your MongoDB URI and JWT secrets
2. **Run the seed script** to create the admin account
3. **Start the backend**
4. **Set `EXPO_PUBLIC_API_URL`** in `mobile/.env`
5. **Start Expo**

---

## Backend Setup

### 1. Configure Environment Variables

Edit `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/taskmanager   # or your Atlas URI
JWT_ACCESS_SECRET=<generate with command below>
JWT_REFRESH_SECRET=<generate with command below>
```

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice — once for each secret.

### 2. Seed the Admin Account

```bash
cd backend
npm run seed
```

This creates:
- Email: `admin@taskmanager.com`
- Password: `Admin@123`

Change these in `.env` before running: `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

### 3. Start the Backend

```bash
cd backend
npm run dev      # development (auto-restarts on change)
# or
npm start        # production
```

Server runs on `http://localhost:3000`

---

## Mobile Setup

### 1. Configure API URL

Edit `mobile/.env`:

```env
# Android emulator (default):
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api

# iOS simulator or same-network device:
EXPO_PUBLIC_API_URL=http://<your-mac-local-ip>:3000/api

# Physical Android device on same WiFi:
EXPO_PUBLIC_API_URL=http://<your-pc-local-ip>:3000/api
```

### 2. Start Expo

```bash
cd mobile
npm start
```

Scan the QR code with **Expo Go** on your phone.

---

## Default Credentials

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@taskmanager.com    | Admin@123  |
| User  | Register via the app     | Your choice|

---

## Architecture

```
backend/                   Node.js + Express + Mongoose
├── src/config/            env validation (Zod) + DB connect
├── src/models/            User, Task, RefreshToken
├── src/middleware/        authenticate, authorize, errorHandler
├── src/services/          auth, task (business logic), SSE manager
├── src/controllers/       auth, task (thin — Zod validation only)
├── src/routes/            auth, task, sse
├── scripts/seed.js        Admin seeder (idempotent)
└── server.js              Entry point

mobile/                    Expo (SDK 54) + Expo Router
├── app/_layout.tsx         Root layout + QueryClient + hydration
├── app/(auth)/             Login + Register screens
├── app/(app)/_layout.tsx   Tab nav + auth guard + SSE start
├── app/(app)/index.tsx     Task list (user view)
├── app/(app)/admin.tsx     Admin panel + create/delete tasks
├── app/(app)/task/[id].tsx Task detail + status update
└── src/
    ├── api/                Axios client + typed endpoints
    ├── stores/             Zustand (auth + SSE state)
    ├── hooks/              React Query hooks + fetch-based SSE hook
    ├── components/         TaskCard, StatusBadge, RoleGate, EmptyState
    └── lib/                SecureStore helpers + QueryClient
```

## SSE Note (Expo Go)

Since Expo Go doesn't support `react-native-sse` (a native module), we use a custom
**fetch-based streaming reader** that is pure JavaScript and works natively in Expo Go.
It auto-reconnects on drops with a 5-second delay.
