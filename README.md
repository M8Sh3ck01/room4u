# Room4U

Student hostel room marketplace around Mzuzu University (Mwazulu). Phase 8 — vertical-slice build.

See `docs/` for the design docs (stack locked in Phase 7: React + Vite · Express · MongoDB Atlas M0 · Cloudflare R2 · Google OAuth · PayChangu).

## Structure

```
client/   React + Vite SPA (port 5173, proxies /api → 4000)
server/   Express API (port 4000) — function-based modular monolith
docs/     Design docs (v6)
```

## Run locally

```
# server (http://localhost:4000)
cd server
npm install
cp .env.example .env
npm run dev

# client (http://localhost:5173)
cd client
npm install
npm run dev
```

## Test

```
cd server
npm test
```
