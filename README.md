# FundFlow

A production-quality MERN stack app for NGOs to run fundraising campaigns,
accept online donations, manage donors, issue receipts, and view analytics.

## Tech stack
- **Frontend:** React, Vite, Tailwind CSS, Axios, React Router
- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Auth:** JWT
- **Payments:** Razorpay
- **Storage:** Cloudinary
- **Email:** Nodemailer
- **PDF:** PDFKit
- **Deploy:** Vercel (frontend), Render (backend), MongoDB Atlas (DB)

## Repo structure
```
/backend    Express API server
/frontend   React (Vite) client
```

## Backend setup
```bash
cd backend
npm install
cp .env.example .env   # fill in your own values
npm run dev
```

The API starts on `http://localhost:5000` by default. Health check:
`GET /api/health`.

## Frontend setup
```bash
cd frontend
npm install
cp .env.example .env   # fill in your own values
npm run dev
```

The app starts on `http://localhost:5173` by default (proxies API calls to
the backend above).

## Environment variables
See [backend/.env.example](backend/.env.example) and
[frontend/.env.example](frontend/.env.example) for the full list of
variables each side expects.

## Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Render/Vercel/Atlas deploy
runbook.

## Build phases
This project is built incrementally, phase by phase. See `CLAUDE.md` at the
repo root for the full phase breakdown and working agreement.

- [x] Phase 1 — Foundations (repo structure, Express skeleton, Mongoose models)
- [x] Phase 2 — Auth & Authorization
- [x] Phase 3 — NGO & Campaign Management
- [x] Phase 4 — Donations & Razorpay
- [x] Phase 5 — Receipts & Notifications
- [x] Phase 6 — Analytics & Admin Dashboard (backend)
- [x] Phase 7 — Frontend Core
- [x] Phase 8 — Frontend Campaign & Donation Flow
- [x] Phase 9 — Frontend Dashboards
- [x] Phase 10 — Hardening & Testing
- [x] Phase 11 — Deployment
- [ ] Phase 12 — Docs & Enhancements
