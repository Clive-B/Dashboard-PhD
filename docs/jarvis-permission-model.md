# Jarvis permission and approval foundation

Jarvis is **not an autonomous executor** in this milestone. The application records permissions and human decisions, but `executionEnabled` remains `false` and no external tool adapter is attached.

## Safety model

- Unknown capabilities are denied.
- Permissions are scoped, expirable and revocable.
- Only an authenticated database-backed owner may grant or revoke permissions.
- Calendar writes, notifications, integrations, exports, deletions and permission changes require a fresh human approval record.
- Action payloads are size-limited and SHA-256 hashed so later execution can verify that the approved payload was not replaced.
- Approval requests expire after 15 minutes.
- Permission changes and action decisions create audit records.

## Activation sequence

1. Provision the approved PostgreSQL deployment in an African region.
2. Run `npm run db:migrate` and seed or create the owner account with a bcrypt password hash.
3. Sign in again so the session contains the database user ID and role.
4. Present permission grants and pending actions in a human-controlled UI.
5. Add one tool adapter at a time. Each adapter must re-check the permission, approval, expiry and payload hash immediately before execution.

The schema and API foundation do not establish VPF runtime enforcement, African residency, PADCA/Omnis connectivity, or an authorised AIC machine-to-machine connection.
