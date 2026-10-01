# AIC Scholar Command Center — Project Handoff

Last updated: 1 October 2026

Repository: `https://github.com/Clive-B/Dashboard-PhD`

Branch: `main`

## Current state

The AIC Scholar Command Center is a working Next.js 16 application for PhD learning, revision, professional planning, knowledge management, podcasts, and governed AI assistance.

The local development server runs on port `3001`:

```powershell
npm install
npm run dev
```

Open `http://localhost:3001` and sign in with the development credentials configured in `.env.local`. If no environment overrides are supplied, the local First Edition credentials shown on the login page are used.

## AI Tutor

- The tutor calls the OpenAI Responses API when `OPENAI_API_KEY` is configured.
- The default model is `gpt-5-mini`, overridable with `OPENAI_MODEL`.
- General mode answers open-ended questions without forcing them into academic context.
- Academic modes can use selected dashboard and Knowledge Vault context.
- Planning queries can use relevant academic and work-task context while leaving decisions with the user.
- Recent dialogue is sent with each request to preserve conversational continuity.
- The tutor is connected to an online model, but it does **not** currently perform live web searches. Time-sensitive information must be independently verified.
- Provider requests use `store: false`. If the provider fails, the application falls back safely and reports the limitation.

This connected OpenAI assistant is distinct from the official AIC custom GPT. The official AIC section remains a manual, consent-based handoff because no authorised machine-to-machine AIC endpoint has been supplied. See `docs/aic-connection-requirements.md`.

## Conversation mode

- Conversation Mode is started once and continues listening between answers.
- Browser speech recognition uses British English where supported.
- While AIC is speaking, speech recognition is fully stopped so AIC cannot transcribe its own voice as a user message.
- A local microphone-level monitor requests echo cancellation, noise suppression, and automatic gain control.
- Speaking while AIC is thinking or speaking interrupts the current response, stops playback, and then starts recognition.
- A fixed bottom-right Conversation Mode control is always visible, including while the mode is off and during long conversations.
- Chrome or Edge is recommended because browser speech-recognition support varies.
- Microphone permission must be granted by the user; the browser displays its normal microphone-use indicator.

## Compact conversation memory

Conversation context survives a page refresh or browser restart on the same device.

- Storage location: browser `localStorage` only.
- Maximum retained history: 12 recent messages.
- Maximum retained text per message: 2,000 characters.
- Approximate total cap: 24,000 stored characters.
- Stored representation: compact role/text tuples; labels, source metadata, audio, and redundant response objects are omitted.
- The API uses the most recent eight retained messages as request context.
- The **Clear memory** control deletes the saved conversation immediately.
- Memory is not currently synchronised across browsers or devices.

## Daily brief and sticky notes

- The assistant page produces a concise daily shorthand brief from open dashboard priorities.
- The brief has an A4 print layout and includes focus, next actions, due dates, time estimates, and the current watch list.
- The sticky-note board is organised into **Do today**, **Remember**, and **Ideas**.
- AIC can generate stickies deterministically from current tasks and due concept reviews.
- Notes can be added, edited, moved, and deleted.
- Sticky notes are stored only in the current browser.

## Authentication and data modes

- Local authentication uses a signed, HTTP-only session cookie.
- Change `AUTH_SECRET`, `DEMO_EMAIL`, and `DEMO_PASSWORD` before any shared or public deployment.
- Without `DATABASE_URL`, the application uses browser-local demo data.
- With PostgreSQL 16, `pgcrypto`, and `pgvector`, run:

```powershell
npm run db:migrate
npm run db:seed
```

- Professional content is excluded from academic retrieval unless the user explicitly asks a work or planning question.
- Do not commit `.env.local`, provider keys, database credentials, webhook secrets, or local data stores.

## Main feature areas

- Command Center and explainable priority recommendation
- Course → module → lecture → topic → concept hierarchy
- Knowledge Vault with academic source metadata
- Quick Recall, Test Me, and Teach AIC revision modes
- Spaced revision and concept mastery tracking
- Academic task planning and Work Watchdog
- Combined academic, work, and revision calendar
- Source-based Study Podcast generation and browser speech playback
- Otter Pro → Zapier transcript ingestion scaffolding
- Official AIC governed handoff workflow
- PostgreSQL schema, source chunks, evidence references, and audit foundations
- Cloud Run-ready container configuration and Google Sites embedding guidance

## Configuration

Copy `.env.example` to `.env.local` and configure only the services required for the deployment:

- `AUTH_SECRET`, `DEMO_EMAIL`, `DEMO_PASSWORD`
- `OPENAI_API_KEY`, optionally `OPENAI_MODEL`
- `DATABASE_URL`
- `ALLOW_GOOGLE_SITES_EMBED`
- `OTTER_ZAPIER_WEBHOOK_SECRET`, `OTTER_INGEST_USER_EMAIL`
- Optional `S3_*` object-storage variables
- Reserved AIC governance endpoint and authorisation variables

## Verification completed

The current implementation has passed:

```powershell
npm run lint
npm test
npm run build
```

Results at handoff:

- TypeScript check: passed
- Automated tests: 10 passed
- Next.js production build: passed
- Authentication request: passed
- `/api/health`: healthy
- Authenticated `/aic-assistant` page: passed
- Connected AI diagnostic: returned `connected-ai`

## Known limitations and next work

1. Add an explicit live-web-search tool if current news, regulations, prices, or newly published research must be retrieved.
2. Browser speech recognition is not uniformly supported; retain typed input as the universal fallback.
3. Voice-activity interruption depends on microphone quality, speaker leakage, and browser echo cancellation. Test on the target device and tune thresholds if necessary.
4. Browser-local conversation memory and stickies are not cross-device. Account-backed encrypted synchronisation would require an explicit retention and deletion policy.
5. Replace development credentials and complete production rate limiting, malware scanning, object storage, and database-backed user administration before public deployment.
6. Do not describe the official AIC custom GPT as API-connected until its custodian supplies and authorises a verified integration contract.

## Governance boundary

The interface applies human authority, source provenance, consent, data minimisation, and separation of academic and professional contexts. These are application behaviours. No external VPF runtime, residency enforcement service, ledger, signature, certificate, or scheduled governance audit is claimed to be operational.
