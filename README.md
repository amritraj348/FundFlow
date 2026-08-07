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
/frontend   React (Vite) client — scaffolded in a later phase
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

## Environment variables
See [backend/.env.example](backend/.env.example) for the full list of
variables the backend expects.

## Build phases
This project is built incrementally, phase by phase. See `CLAUDE.md` at the
repo root for the full phase breakdown and working agreement.

- [x] Phase 1 — Foundations (repo structure, Express skeleton, Mongoose models)
- [ ] Phase 2 — Auth & Authorization
- [ ] Phase 3 — NGO & Campaign Management
- [ ] Phase 4 — Donations & Razorpay
- [ ] Phase 5 — Receipts & Notifications
- [ ] Phase 6 — Analytics & Admin Dashboard (backend)
- [ ] Phase 7 — Frontend Core
- [ ] Phase 8 — Frontend Campaign & Donation Flow
- [ ] Phase 9 — Frontend Dashboards
- [ ] Phase 10 — Hardening & Testing
- [ ] Phase 11 — Deployment
- [ ] Phase 12 — Docs & Enhancements
