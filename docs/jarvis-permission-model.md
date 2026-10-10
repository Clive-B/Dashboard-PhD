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
- Operating-system credential capture/replay and secure-desktop unlocking are permanently denied.
- Interactive desktop work is deferred whenever the owner session is locked or its state cannot be verified.
- Background database, sync and network services do not require an unlocked desktop.

## Activation sequence

1. Provision the approved PostgreSQL deployment in an African region.
2. Run `npm run db:migrate` and seed or create the owner account with a bcrypt password hash.
3. Sign in again so the session contains the database user ID and role.
4. Present permission grants and pending actions in a human-controlled UI.
5. Add one tool adapter at a time. Each adapter must re-check the permission, approval, expiry and payload hash immediately before execution.

The schema and API foundation do not establish VPF runtime enforcement, African residency, PADCA/Omnis connectivity, or an authorised AIC machine-to-machine connection.

## Windows home-server boundary

The scripts in `scripts/windows/` provide a login-triggered supervisor. It binds Next.js to loopback, continues running while Windows is locked, records only the coarse session state (`locked`, `unlocked`, or unavailable), and restarts the server after a crash. It does not bypass the Windows secure desktop.

This scheduled-task milestone requires one manual Windows login after a restart. Moving the application into a pre-login Windows service requires a separately reviewed service account and secret store; it must not be achieved through automatic login or password replay.
