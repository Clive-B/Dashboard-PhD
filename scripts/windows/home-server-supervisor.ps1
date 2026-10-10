[CmdletBinding()]
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
  [int]$RestartDelaySeconds = 5
)

$ErrorActionPreference = "Stop"
$runtimeRoot = Join-Path $ProjectRoot ".local\runtime"
$logRoot = Join-Path $ProjectRoot ".local\logs"
$envFile = Join-Path $ProjectRoot ".local\home-server.env"

New-Item -ItemType Directory -Force -Path $runtimeRoot, $logRoot | Out-Null

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Missing $envFile. Copy scripts\windows\home-server.env.example there and replace every placeholder."
}

foreach ($line in Get-Content -LiteralPath $envFile) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
  $separator = $trimmed.IndexOf("=")
  if ($separator -lt 1) { throw "Invalid environment entry in $envFile" }
  $name = $trimmed.Substring(0, $separator).Trim()
  $value = $trimmed.Substring($separator + 1)
  if ($name -notmatch '^[A-Z][A-Z0-9_]*$') { throw "Invalid environment variable name: $name" }
  [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

if (-not $env:AUTH_SECRET -or $env:AUTH_SECRET.Length -lt 32) {
  throw "AUTH_SECRET must contain at least 32 characters."
}

$env:NODE_ENV = "production"
$env:AIC_HOME_SERVER_MODE = "true"

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot ".next\standalone\server.js"))) {
  throw "Standalone production build is missing. Run npm.cmd run build:home before starting the home server."
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class AicDesktopState {
  [DllImport("user32.dll", SetLastError=true)]
  private static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
  [DllImport("user32.dll", SetLastError=true)]
  private static extern bool SwitchDesktop(IntPtr desktop);
  [DllImport("user32.dll", SetLastError=true)]
  private static extern bool CloseDesktop(IntPtr desktop);
  public static bool IsUnlocked() {
    IntPtr desktop = OpenInputDesktop(0, false, 0x0100);
    if (desktop == IntPtr.Zero) return false;
    try { return SwitchDesktop(desktop); }
    finally { CloseDesktop(desktop); }
  }
}
"@

function Write-RuntimeState([string]$serverState, [int]$processId) {
  $sessionState = if ([AicDesktopState]::IsUnlocked()) { "unlocked" } else { "locked" }
  $state = [ordered]@{
    server = $serverState
    desktopSession = $sessionState
    secureDesktopAccess = "denied"
    credentialReplay = "denied"
    interactiveAutomation = if ($sessionState -eq "unlocked") { "eligible-for-future-policy-check" } else { "deferred" }
    processId = $processId
    observedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  $state | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeRoot "home-server-state.json") -Encoding utf8
}

while ($true) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $stdout = Join-Path $logRoot "home-server-$stamp.out.log"
  $stderr = Join-Path $logRoot "home-server-$stamp.err.log"
  $server = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:home" -WorkingDirectory $ProjectRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
  try {
    while (-not $server.HasExited) {
      Write-RuntimeState "running" $server.Id
      Start-Sleep -Seconds 5
      $server.Refresh()
    }
    Write-RuntimeState "restarting" 0
  } finally {
    if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force }
  }
  Start-Sleep -Seconds $RestartDelaySeconds
}
