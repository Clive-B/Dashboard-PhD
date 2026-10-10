# AIC Scholar laptop home server

This milestone keeps Windows locked while AIC Scholar's background server continues to run. It does not implement automatic Windows sign-in, secure-desktop control, or operating-system password replay.

## Implemented boundary

- Next.js binds to `127.0.0.1:3001`, not the public LAN.
- A login-triggered Windows task supervises and restarts the server.
- The task continues while the owner session is locked.
- A guardian writes coarse lock state to `.local/runtime/home-server-state.json`.
- Secure-desktop access and operating-system credential use are permanently denied in the Jarvis capability layer.
- Interactive desktop actions are deferred while the session is locked or unknown.

The state file is local evidence for future executors. No GUI executor is currently enabled.

## One-time owner setup

Open a normal PowerShell window in the project directory and run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\windows\configure-home-server.ps1
npm.cmd run build:home
powershell -ExecutionPolicy Bypass -File scripts\windows\install-home-server-task.ps1
Start-ScheduledTask -TaskName "AIC Scholar Home Server"
powershell -ExecutionPolicy Bypass -File scripts\windows\home-server-status.ps1
```

The configuration script asks for an AIC-specific email and password using a masked prompt. It generates the session secret locally and restricts the environment file to the owner and Windows SYSTEM. Do not reuse the Windows password.

## Tailscale prerequisite

Tailscale requires an elevated Windows installation. The signature-verified installer is staged locally at:

```text
.local\installers\tailscale-setup-1.104.1-amd64.msi
```

Install it from an administrator-approved Windows prompt, then sign in using the owner's chosen identity provider. Enable **Run Unattended** so the network remains available at the lock screen. Do not enable an exit node, public Funnel, or subnet routing for this milestone.

Tailscale HTTPS serving and the Vercel-to-home browser sync path remain separate milestones. Until authenticated cross-origin sync is implemented, the local server must remain loopback-only.

## Availability semantics

- Locking Windows: server continues.
- Turning off the display: server continues.
- Sleeping or hibernating: server becomes unavailable.
- Signing out: the current scheduled task stops.
- Restarting: one manual owner login is required before the task starts.

A pre-login Windows service can be considered later using a dedicated service account and a reviewed secret store. Automatic login is explicitly excluded.
