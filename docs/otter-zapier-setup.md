# Otter Pro and Zapier setup

The dashboard accepts Otter transcripts through a protected Zapier webhook. PostgreSQL and a deployed HTTPS URL are required; browser-local storage cannot receive an external webhook.

## 1. Configure the deployed dashboard

Set these server environment variables without committing their real values:

```text
DATABASE_URL=...
OTTER_ZAPIER_WEBHOOK_SECRET=<long random secret>
OTTER_INGEST_USER_EMAIL=<the dashboard account email>
```

Run `npm run db:migrate` against the production database. Migration `002_otter_ingestion.sql` creates the duplicate-safe Otter inbox and scheduling records.

Open **Otter Inbox** in the dashboard. All three connection-readiness checks must show as configured. Copy the HTTPS receiver URL displayed there.

## 2. Connect Otter to Zapier

1. In Zapier, create a Zap.
2. Choose **Otter.ai** as the trigger app.
3. Choose **New Recording** as the trigger event.
4. Connect Otter using the API key generated under Otter account settings > Developer.
5. Test the trigger using a short, non-sensitive recording.
6. Add **Webhooks by Zapier** as the action.
7. Choose **Custom Request** or **POST**, depending on the Zapier interface offered to the account.
8. Use the Otter Inbox receiver URL as the destination.
9. Set the payload type to JSON.
10. Add the custom header `x-aic-webhook-secret` with the deployed `OTTER_ZAPIER_WEBHOOK_SECRET` value.

## 3. Map the fields

Map the available Otter trigger fields to this JSON contract:

```json
{
  "recordingId": "<Otter conversation or recording ID>",
  "title": "<recording title>",
  "recordedAt": "<ISO date and time>",
  "transcript": "<full transcript text>",
  "summary": "<optional Otter summary>",
  "speakerNames": "<optional comma-separated names>",
  "courseHint": "<optional course code or name>",
  "sourceUrl": "<optional Otter conversation URL>"
}
```

`title` and `recordedAt` are required. If the Pro trigger does not expose transcript text in the test payload, the dashboard will retain the recording in **Awaiting transcript** status. Export the transcript from Otter and add it through the Knowledge Vault while the Zap mapping is refined.

## 4. Verify the flow

1. Publish the Zap.
2. Complete a test recording in Otter.
3. Refresh **Otter Inbox**.
4. Match the recording to a course, module and lecture.
5. Select **Process lesson**.
6. Confirm that a transcript appears in PostgreSQL-backed Knowledge Vault data and a guided lesson appears three calendar days later.
7. Select **Start lesson early** and confirm that the Day 3 event changes to a retention checkpoint.

## Security and governance

- Never place the Otter API key or webhook secret in GitHub, browser storage, screenshots or Zap payload fields.
- Rotate the webhook secret if it is disclosed.
- Record lectures only with the permissions required by the institution and participants.
- The receiver stores academic transcript content and selected metadata; it does not ingest professional task data.
- Otter processing does not establish African data residency. The dashboard must not claim that VPF residency controls are technically enforced for Otter-originated data.
