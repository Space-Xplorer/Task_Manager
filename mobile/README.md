# Mobile

Expo Router app for Task Manager.

## What it does
- Login, register, logout
- Task list, detail screen, status updates
- Admin task creation/edit/delete
- Profile screen with task stats
- Web + mobile support

## Requirements
- Node.js 20+
- Expo CLI / npm
- A backend API URL

## Environment
Create `mobile/.env`:

```env
# Local development on mobile
# EXPO_PUBLIC_API_URL=http://192.168.1.12:3000/api

# Production / web build
EXPO_PUBLIC_API_URL=https://task-manager-rho-swart-48.vercel.app/api
```

## Install

```bash
cd mobile
npm install
```

## Run

Local dev:

```bash
npm start
```

Web:

```bash
npm run web
```

Tunnel (optional, useful on phones outside LAN):

```bash
npm run tunnel
```

## Deployment

For a shareable browser link, deploy the web build to Vercel and point `EXPO_PUBLIC_API_URL` at the deployed backend.

Suggested Vercel settings:
- Build command: `npx expo export --platform web`
- Output directory: `dist`
- Root directory: `mobile`

## Notes
- Expo Go can auto-detect LAN host when `EXPO_PUBLIC_API_URL` is unset.
- The app uses token storage and refresh hydration, so clear old browser storage if auth gets stuck after major changes.
