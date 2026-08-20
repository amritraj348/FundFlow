# Deployment Guide

Backend → Render, Frontend → Vercel, Database → MongoDB Atlas. This doc is a
manual runbook — nothing here deploys anything by itself; every step below
is something you do in the Render/Vercel/Atlas/Razorpay dashboards yourself.

The repo already has everything code-side ready for this:
- `backend/render.yaml` — Render Blueprint (optional one-click provisioning)
- `frontend/vercel.json` — Vercel build config + security headers
- `backend/package.json` has `"start": "node src/server.js"` and reads
  `PORT` from the environment (Render sets this automatically)
- CORS (`backend/src/config/env.js`) already accepts `CLIENT_URL` as either
  a single origin or a comma-separated list — no code change needed for a
  single production origin

## 0. Before you start: MongoDB Atlas network access

Render's free tier has no static outbound IP, so Atlas can't be locked down
to a specific IP range for it. In Atlas → **Network Access**, add
`0.0.0.0/0` (allow from anywhere) and rely on the database username/password
for access control instead. If you'd rather run production against a fresh
database instead of the one you've been developing against (which has test
NGOs/campaigns/donations in it from Phases 1-10), create a new database
inside the same Atlas cluster now and grab its connection string — either
is fine for a portfolio project, this is your call.

## 1. Deploy order

**Backend first, then frontend.** The frontend's build needs to know the
backend's real URL (`VITE_API_BASE_URL` / `VITE_API_ORIGIN` are baked in at
build time by Vite, not read at runtime), so there's nothing to point it at
until the backend has a live Render URL.

```
1. Deploy backend to Render        -> get https://<your-app>.onrender.com
2. Deploy frontend to Vercel        -> point it at that URL, get the Vercel URL
3. Go back to Render, set CLIENT_URL to the real Vercel URL, redeploy
4. Update the Razorpay webhook URL to the real backend URL
```

## 2. Backend — Render

**Option A: Blueprint.** Render dashboard → **New +** → **Blueprint** →
connect this repo. It reads `backend/render.yaml` and creates the service
with the build/start commands and env var list pre-filled (secrets marked
`sync: false` will prompt you to type them in).

**Option B: Manual web service.** Render dashboard → **New +** →
**Web Service** → connect this repo, then set:
| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

### Required environment variables (Render dashboard)

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Leave as a placeholder (e.g. `http://localhost:5173`) for the first deploy — you don't know the Vercel URL yet. Update after step 3 below. |
| `MONGO_URI` | Your Atlas connection string (see step 0) |
| `JWT_SECRET` | Render can auto-generate this (the blueprint does) — otherwise use a long random string, don't reuse your local dev one |
| `JWT_REFRESH_SECRET` | Same as above, must differ from `JWT_SECRET` |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `RAZORPAY_KEY_ID` | Test-mode key is fine — this is a portfolio project, not a live payments deployment. Reuse your existing `rzp_test_...` credentials from `backend/.env`. |
| `RAZORPAY_KEY_SECRET` | Paired secret for the key above |
| `RAZORPAY_WEBHOOK_SECRET` | Will change once you register a new webhook against the real URL (step 4) — set a placeholder now, update then |
| `CLOUDINARY_CLOUD_NAME` | From your existing Cloudinary account |
| `CLOUDINARY_API_KEY` | Same |
| `CLOUDINARY_API_SECRET` | Same |
| `SMTP_HOST` | e.g. Ethereal for a demo inbox, or a real SMTP provider |
| `SMTP_PORT` | e.g. `587` |
| `SMTP_USER` | |
| `SMTP_PASS` | |
| `EMAIL_FROM` | e.g. `FundFlow <no-reply@yourdomain.com>` |

`PORT` is injected by Render automatically — don't set it.

Once deployed, confirm `https://<your-app>.onrender.com/api/health` returns
`200 OK`. Render's free tier spins the service down after ~15 minutes of no
traffic and takes 30-60s to cold-start the next request — expected
behavior, not a bug, worth knowing before you assume something's broken.

## 3. Frontend — Vercel

Vercel dashboard → **Add New** → **Project** → import this repo, then set:
| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite (auto-detected; `frontend/vercel.json` also declares this) |

### Required environment variables (Vercel dashboard)

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-render-app>.onrender.com/api` |
| `VITE_API_ORIGIN` | `https://<your-render-app>.onrender.com` (origin only, no `/api` — used for the CSP `connect-src` in `index.html`) |

Both are consumed at **build time**, so if you add or change them after the
first deploy you need to trigger a redeploy for them to take effect.

`frontend/vercel.json` also sets `frame-ancestors` as a real HTTP response
header — the one CSP directive a `<meta>` tag can never deliver (see the
comment in `frontend/index.html`). Everything else in the policy stays in
the meta tag, since that's what gets the `%VITE_API_ORIGIN%` substitution
from the Vite build; a static `vercel.json` can't template in a value it
doesn't know yet. The two together give the full policy — browsers enforce
the intersection of every CSP delivered by any mechanism, so this isn't a
weaker policy than having it all in one place, just split across the one
place each part can actually take effect.

`frontend/vercel.json` also adds a SPA rewrite (`/* -> /index.html`) —
without it, refreshing or deep-linking to a client-side route like
`/campaigns/some-slug` would 404 on Vercel's static file server.

## 4. Post-deploy steps

**Update `CLIENT_URL` on Render.** Now that you have the real Vercel URL,
go back to the Render service's environment variables and set `CLIENT_URL`
to it (e.g. `https://fundflow.vercel.app`). Saving triggers an automatic
redeploy. If you also kept a Vercel preview URL you want to allow, use a
comma-separated list: `https://fundflow.vercel.app,https://fundflow-git-preview.vercel.app`.

**Update the Razorpay webhook URL.** Razorpay dashboard → **Webhooks** →
edit (or create) the webhook:
- URL: `https://<your-render-app>.onrender.com/api/donations/webhook`
- Copy the webhook secret Razorpay shows you into Render's
  `RAZORPAY_WEBHOOK_SECRET` env var (this replaces the placeholder from
  step 2), which triggers another redeploy.

**Smoke test.** Once both are live: load the Vercel URL, browse campaigns
(confirms the frontend can reach the backend), register/log in, and run one
end-to-end test donation to confirm the Razorpay webhook is reaching the
real backend URL and a receipt email goes out.
