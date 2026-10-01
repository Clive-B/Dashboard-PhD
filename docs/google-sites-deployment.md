# Google Sites deployment

Google Sites embeds a deployed webpage; it does not run the Next.js server. Deploy AIC Scholar to Cloud Run first, then add the resulting HTTPS URL to Google Sites.

## Recommended region

Use Cloud Run region `africa-south1` (Johannesburg) to align the hosting location with the project's African data-residency requirement. This only establishes the service region; verify the location of every connected database, storage bucket, model provider and logging sink separately.

## Deploy to Cloud Run

Prerequisites:

- A Google Cloud project with billing enabled.
- Google Cloud CLI installed and authenticated.
- Required secrets stored in Google Secret Manager.

From the project folder:

```powershell
gcloud config set project YOUR_PROJECT_ID
gcloud run deploy aic-scholar-command-center --source . --region africa-south1 --allow-unauthenticated
```

Configure these runtime values in Cloud Run rather than committing them:

- `AUTH_SECRET`
- `DEMO_EMAIL` and `DEMO_PASSWORD` until database-backed identity is implemented
- `DATABASE_URL` when PostgreSQL is connected
- `ALLOW_GOOGLE_SITES_EMBED=true`
- Any approved AIC or OpenAI credentials

The container listens on Cloud Run's `PORT=8080` and uses Next.js standalone output.

## Add to Google Sites

1. Open the Google Site on a computer.
2. Use **Insert → Embed** and enter the Cloud Run HTTPS URL; or use **Pages → Add → Full page embed**.
3. Publish the site.

Google notes that some sites prevent embedding. This application allows frames from Google Sites and Google-hosted embed origins through its Content Security Policy.

## Authentication warning

Embedded authentication relies on a secure `SameSite=None` cookie when `ALLOW_GOOGLE_SITES_EMBED=true`. Browser third-party-cookie policies can still block an embedded login. For the most reliable and private experience, use Google Sites as a launch page and open the Cloud Run application in its own tab. Do not weaken authentication or place access tokens in an embed URL.

## Current persistence limitation

The interactive First Edition currently keeps dashboard data in browser-local storage. Connect the PostgreSQL APIs to the UI before relying on multiple devices or browsers.
