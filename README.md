# Ticker Research (Market Pulse)

Next.js front end for **DeLorean Partners · Ticker Research**: request Grok-generated equity research on Indian NSE/BSE tickers, track report status, and view structured Market Pulse reports (or sandboxed HTML from the research bot).

GitHub repo: [jprasham/grok-equity](https://github.com/jprasham/grok-equity).

## What it does

1. User submits a ticker on the home page (`/`).
2. App `POST`s a job to the research bot webhook (`RESEARCH_WEBHOOK_URL`).
3. Bot posts results to a per-request callback (`/api/reports/[id]`).
4. Browser opens `/reports/[id]` — structured `report_json` when present, otherwise HTML/URL from the bot.

There is no application database. In-flight rows live in an in-memory map (`lib/reports.ts`). On `done`, the last report is also written to Vercel Blob (`ticker-research/last-report.json`) when Blob is configured, so other instances can read it.

## Docs

| Doc | Purpose |
| --- | --- |
| [docs/BOT_CONTRACT.md](docs/BOT_CONTRACT.md) | Webhook + callback payload contract for the research bot |
| [docs/DESIGN.md](docs/DESIGN.md) | Market Pulse design tokens (colour, type, motion) |
| [data/README.md](data/README.md) | How to refresh NSE/BSE symbol dumps → `lib/symbols-data.json` |

## Setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local — at minimum APP_URL, RESEARCH_WEBHOOK_URL, REPORT_CALLBACK_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `APP_URL` | Yes (for research) | Public base URL of this app; used to build `callbackUrl` |
| `RESEARCH_WEBHOOK_URL` | Yes (for research) | Bot endpoint that accepts research jobs |
| `RESEARCH_WEBHOOK_TOKEN` | Optional | Sent as `Authorization: Bearer …` on the outbound webhook |
| `REPORT_CALLBACK_SECRET` | Yes (for callbacks) | Bearer secret the bot must send on callbacks; callbacks fail if unset |
| `BLOB_READ_WRITE_TOKEN` | Optional | Set automatically when a private Vercel Blob store is connected; shares the last completed report across instances |

Copy from [`.env.local.example`](.env.local.example). Do not commit `.env` / `.env.local`.

### Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| Dev | `npm run dev` | Local Next.js server |
| Build | `npm run build` | Production build |
| Start | `npm start` | Serve the production build |
| Lint | `npm run lint` | ESLint |
| Symbols | `npm run symbols:build` | Regenerate `lib/symbols-data.json` from CSVs in `data/` (see [data/README.md](data/README.md)) |

Raw exchange CSVs under `data/` are gitignored; the shipped JSON is what the app uses at runtime. Do not delete `lib/symbols-data.json`.

## Report storage

- **With Blob:** create a free Blob store with **private** access and connect it to the Vercel project so `BLOB_READ_WRITE_TOKEN` is set, then redeploy (Dashboard → Storage → Create → Blob).
- **Without the token:** the app still runs, but reports stay per-instance until that instance goes away. Callbacks upsert, so a callback on an instance that never saw the request still creates the row.
- Have the bot echo `ticker` and `exchange`, or the row may show `Unknown` / `NSE`.
- After a report finishes, the report page can download a client-side HTML copy that does not depend on the server once loaded.

## Deploy (Vercel)

1. Import [jprasham/grok-equity](https://github.com/jprasham/grok-equity) (or connect this repo in the Vercel dashboard).
2. Set the env vars above for Production / Preview as needed. `APP_URL` should be the deployment URL (no trailing slash).
3. Connect a private Blob store if you want cross-instance last-report sharing.
4. Deploy. Framework preset: Next.js (default).

`.vercelignore` excludes local `.data/` and env files from uploads. Local `.vercel/` is gitignored.

## Layout (repo)

```
app/           Next.js App Router pages + API routes
components/    UI (Market Pulse shell, report views, shadcn primitives)
docs/          Bot contract + design tokens
lib/           Reports store, ticker helpers, symbols JSON
scripts/       symbols:build (+ optional smoke)
data/          Symbol CSV dumps (gitignored) + README
public/        Static assets (favicon lives under app/)
```
