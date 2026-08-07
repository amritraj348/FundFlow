# FundFlow — Project Context for Claude Code

## What this is
FundFlow is a production-quality MERN stack app for NGOs to run fundraising
campaigns, accept online donations, manage donors, issue receipts, and view
analytics. It's built to demonstrate real backend engineering: auth, payment
gateway integration, webhook verification, idempotency, secure APIs,
aggregation pipelines, cloud storage, and deployment.

## Users
- Guest visitors
- Donors (registered or guest)
- NGO Admins
- Platform Super Admin

## Tech stack
- **Frontend:** React, Vite, Tailwind CSS, Axios, React Router
- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Auth:** JWT
- **Payments:** Razorpay
- **Storage:** Cloudinary
- **Email:** Nodemailer
- **PDF:** PDFKit
- **Deploy:** Vercel (frontend), Render (backend), MongoDB Atlas (DB)

## Working agreement for Claude Code
- Work one phase at a time (see below). Don't jump ahead.
- After implementing a phase: run/test it, show me the result, then commit
  before moving to the next phase.
- Keep commits scoped to one phase each, with a clear message
  (e.g. `feat: donation + razorpay order creation`).
- Ask before adding dependencies not listed in the stack above.
- Prefer clear, documented code over clever code — this is a learning +
  portfolio project, so explain non-obvious decisions in comments.

---

## Build Phases

### Phase 1 — Foundations
- Repo structure (`/backend`, `/frontend`), README, `.env.example`, `.gitignore`
- Express app skeleton: config loading, MongoDB connection, centralized
  error handler, request logger, health-check route
- Mongoose models: `User`, `NGO`, `Campaign`, `Donation` (schema only, no logic yet)

### Phase 2 — Auth & Authorization
- Register/login (donor + NGO admin roles), JWT issue/verify, refresh strategy
- Role-based middleware (donor / ngo_admin / super_admin)
- Password hashing, input validation, rate limiting on auth routes

### Phase 3 — NGO & Campaign Management
- NGO profile CRUD (admin-owned)
- Campaign CRUD (create/edit/close), image upload via Cloudinary
- Public campaign endpoints: list, detail, search, filter, pagination

### Phase 4 — Donations & Razorpay
- Donation model + create-order flow (Razorpay order API)
- Client-side checkout handoff
- Payment verification (signature check), webhook endpoint
- Idempotency handling so retried webhooks don't double-count donations

### Phase 5 — Receipts & Notifications
- PDF receipt generation (PDFKit) on successful donation
- Email delivery (Nodemailer) — receipt to donor, notification to NGO
- Donation history endpoint (per donor, per campaign)

### Phase 6 — Analytics & Admin Dashboard (backend)
- Aggregation pipelines: totals by campaign/NGO/time range, donor counts,
  trends
- Super admin endpoints: platform-wide stats, NGO approval/moderation

### Phase 7 — Frontend Core
- Vite + Tailwind setup, routing, Axios client with interceptors
- Auth UI (login/register), protected routes, role-based nav

### Phase 8 — Frontend Campaign & Donation Flow
- Campaign browsing (search/filter/pagination UI), campaign detail page
- Donation flow UI incl. Razorpay checkout widget integration

### Phase 9 — Frontend Dashboards
- NGO admin dashboard (campaign management, donation stats)
- Super admin dashboard
- Donor dashboard (donation history, receipts)

### Phase 10 — Hardening & Testing
- Security pass: helmet, CORS policy, input sanitization, secrets audit
- Performance pass: indexes, query review, caching where relevant
- Test suite: unit tests for critical logic (payment verification,
  idempotency), integration tests for key API routes

### Phase 11 — Deployment
- Backend → Render, Frontend → Vercel, DB → MongoDB Atlas
- Environment configs, CI-friendly build scripts, production checklist

### Phase 12 — Docs & Enhancements (optional/stretch)
- README + API docs, architecture diagram, interview-prep notes
- Stretch: Redis caching, Docker, CI/CD pipeline, audit logs

---

## How to use this with Claude Code
Work through one phase per session:
1. Say which phase you're on (e.g. "Let's do Phase 2").
2. Claude Code implements it against this context.
3. Test it together, fix issues.
4. Commit, then move to the next phase.
