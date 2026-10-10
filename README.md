# AIC Scholar Command Center — First Edition

A personal, human-led command center for balancing PhD learning, revision, professional delivery and realistic capacity. The interface follows the supplied AIC Scholar brand and keeps academic and professional data visibly distinct.

## What works in First Edition

- Dedicated Course Manager for building the course hierarchy from modules and lectures through topics and concepts; new concepts automatically enter Mastery.
- Protected Otter Pro/Zapier transcript inbox with duplicate prevention, explicit course matching, immediate early access and a three-calendar-day guided lesson schedule.
- Secure local sign-in with an HTTP-only signed session cookie.
- Command Center with a transparent “What should I do now?” priority score.
- Knowledge Vault for pasted notes and provider-neutral transcripts, metadata, search, preview and deletion.
- Quick Recall, Test Me and Teach AIC revision modes with the 0–5 self-score.
- Study Podcast episodes generated from selected Knowledge Vault sources, with local voice playback, dual-voice presentation, speed control and visible provenance.
- Modular spaced-revision scheduling and concept mastery updates.
- Academic task planning and a separate professional Work Watchdog.
- Explainable risk, remaining-effort and capacity-deficit calculations.
- Combined weekly calendar with academic, work and revision categories.
- Local evidence retrieval assistant with source-grounded labels and a no-invention fallback.
- Connected OpenAI assistant for open-ended general questions when `OPENAI_API_KEY` is configured.
- Continuous conversation mode with voice interruption, an always-visible control and compact browser-local context memory.
- Printable daily shorthand brief and an organised, browser-local sticky-note board.
- Configurable capacity utilization and removable demo data.
- PostgreSQL/pgvector schema, seed data, APIs, source chunks, evidence references and audit foundations.
- Replaceable object-storage interface with a safe local adapter.

Browser-local mode is enabled when `DATABASE_URL` is not configured. It keeps changes in this browser using `localStorage`, allowing the First Edition to run immediately. PostgreSQL APIs become active when the database is configured.

## Run locally

1. Install Node.js 22 or later.
2. Copy `.env.example` to `.env.local` and change `AUTH_SECRET` and the demo credentials.
3. Install and run:

```powershell
npm install
npm run dev
```

Open `http://localhost:3001` and use the credentials configured in `.env.local`. Without an env file, local defaults are:

- Email: `clive@example.com`
- Password: `AicScholar!2026`

The local server uses Node's trusted system certificate store so configured AI providers continue to use verified TLS on managed networks.

## PostgreSQL mode

Install PostgreSQL with the `pgvector` and `pgcrypto` extensions, create a database, then set `DATABASE_URL`.

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

The migration creates the full course → module → lecture → topic → concept hierarchy, sources/chunks, revision/mastery, academic and work planning, calendar/capacity, watchdog, assistant evidence and audit entities.

## Optional services

- `NEXT_PUBLIC_CONNECTED_AI_ENABLED=true` and `OPENAI_API_KEY` together enable the connected OpenAI Responses API adapter; `OPENAI_MODEL` defaults to `gpt-5-mini`. Leave the public flag false for a browser-local pilot so assistant prompts and dashboard context are not sent to the hosted API. This provides online model access but does not enable live web search. First Edition remains usable with governed local fallbacks when the provider is unavailable.
- Study Podcast playback prefers installed British English (`en-GB`) voices for both presenters and does not require an API key. If the device has no British voice, the browser supplies an available fallback. Downloadable MP3 rendering is a later connected-service feature.
- `S3_*` variables are reserved for an S3-compatible storage adapter. First Edition uses local storage through the same interface.
- Google and Microsoft calendar integrations are not required for First Edition; the internal calendar is active.
- Otter Pro connects through Zapier after PostgreSQL and the public HTTPS deployment are configured. See `docs/otter-zapier-setup.md`.

## AIC connection and Google Sites

- The AIC Assistant includes a document-linked, consent-based handoff to Dr. David King Boison's official ChatGPT-created AIC. It is not labelled as an API connection because the supplied documentation provides no endpoint or authentication contract. See `docs/aic-connection-requirements.md`.
- Google Sites cannot run this Next.js application directly. A Cloud Run-ready `Dockerfile` and embedding guidance are provided in `docs/google-sites-deployment.md`.

## Security and governance notes

- Change the development credentials and `AUTH_SECRET` before deployment.
- Professional content is excluded from academic retrieval by default.
- AI interactions store result status and evidence references, not hidden chain-of-thought.
- File validation, malware scanning, production object storage, database-backed login and rate limiting are deployment-stage requirements.
- The VPF-informed design applies human authority, provenance, dignity, data minimization and African data-residency considerations conceptually. No external VPF runtime, ledger, signature, certificate or residency enforcement is claimed.
