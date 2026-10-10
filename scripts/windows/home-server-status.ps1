$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$statePath = Join-Path $projectRoot ".local\runtime\home-server-state.json"
$task = Get-ScheduledTask -TaskName "AIC Scholar Home Server" -ErrorAction SilentlyContinue
$service = Get-Service -Name "Tailscale" -ErrorAction SilentlyContinue

[ordered]@{
  scheduledTask = if ($task) { $task.State.ToString() } else { "not-installed" }
  tailscaleService = if ($service) { $service.Status.ToString() } else { "not-installed" }
  port3001Listening = [bool](Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue)
  runtime = if (Test-Path -LiteralPath $statePath) { Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json } else { $null }
} | ConvertTo-Json -Depth 5
