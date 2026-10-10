# Azure PostgreSQL — Johannesburg deployment runbook

This runbook provisions the AIC Scholar database in Azure **South Africa North** (`southafricanorth`), physically located in Johannesburg. It prepares an African-region database; it does not by itself prove end-to-end residency for application traffic or external AI processing.

## Guardrails

- Use a new Azure Free account only when the portal labels the selected PostgreSQL configuration as covered by the free 12-month allowance.
- Region: **South Africa North** only.
- PostgreSQL: version 16, Burstable `Standard_B1ms`, 32 GiB storage.
- Disable high availability and geo-redundant backup for the free pilot.
- Keep `require_secure_transport` enabled and use `sslmode=verify-full`.
- Do not paste database passwords, URLs, or access tokens into GitHub, documentation, chat, screenshots, or source files.
- Do not migrate governed records while the application remains on compute whose African residency has not been verified.

## Current prerequisite

The signed-in Azure identity is tenant-only and has no usable subscription. Activate an Azure Free subscription at <https://azure.microsoft.com/free/> and confirm that it appears under **Subscriptions** in the Azure portal. Resource creation cannot proceed before that activation.

## Portal configuration

Create **Azure Database for PostgreSQL flexible server** with:

| Setting | Value |
| --- | --- |
| Resource group | `aic-scholar-jhb-rg` |
| Server name | A globally unique name beginning `aic-scholar-jhb-` |
| Region | `South Africa North` |
| PostgreSQL version | `16` |
| Workload type | Development |
| Compute tier | Burstable |
| Compute size | `Standard_B1ms` |
| Storage | `32 GiB` |
| High availability | Disabled |
| Backup retention | 7 days |
| Geo-redundancy | Disabled |
| Authentication | PostgreSQL authentication |

Generate and save the administrator password in a password manager. Do not reuse the AIC Scholar login password.

## Networking boundary

Initially allow only the administrator's current public IP so migrations and verification can run. Vercel does not provide stable outbound IPs on the current free setup, so widening the database firewall for Vercel would weaken least privilege. Keep production application connectivity disabled until either:

1. the application compute is moved into an approved African Azure network, or
2. a reviewed, affordable static-egress/private-network design is approved.

This means the Johannesburg database can be provisioned and validated now without prematurely transferring governed data across an unverified path.

## Required extension allowlist

In the server's **Server parameters**, set `azure.extensions` to include:

- `PGCRYPTO`
- `VECTOR`

Save and wait for the server update to complete. Azure names the pgvector extension `vector`.

## Local migration and verification

Create a local `.env.local` entry or set the variables only for the terminal session:

```text
DATABASE_URL=postgresql://<admin-user>:<encoded-password>@<server>.postgres.database.azure.com:5432/aic_scholar?sslmode=verify-full
DATABASE_REGION=azure-southafricanorth-johannesburg
```

Create the `aic_scholar` database in the Azure portal or with an administrative SQL connection, then run:

```powershell
npm run db:migrate
npm run db:verify
```

Run `npm run db:seed` only if the owner explicitly wants demonstration records. The verification output intentionally omits passwords and the full connection URL.

## Vercel activation (deferred)

Do not add `DATABASE_URL` to Vercel yet. Once the network/residency boundary is approved, add `DATABASE_URL` and `DATABASE_REGION` as encrypted environment variables and redeploy. Confirm `/api/health` reports `database: connected`; this proves connectivity, not geographic residency.

## Cost stop condition

Before the free allowance expires, export or retain the database only after the owner approves paid service. Configure Azure Cost Management alerts immediately after subscription activation. The free allowance and portal estimate shown on the account are the billing authority.
