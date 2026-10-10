[CmdletBinding()]
param([string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")))

$ErrorActionPreference = "Stop"
$localRoot = Join-Path $ProjectRoot ".local"
$envFile = Join-Path $localRoot "home-server.env"
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null

$email = (Read-Host "AIC Scholar email").Trim()
if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { throw "Enter a valid email address." }

$first = Read-Host "Create a unique AIC Scholar password" -AsSecureString
$second = Read-Host "Confirm the AIC Scholar password" -AsSecureString
$firstPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
$secondPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPointer)
  $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPointer)
  if ($password -ne $confirmation) { throw "Passwords do not match." }
  if ($password.Length -lt 12) { throw "Use at least 12 characters." }
  if ($password -match '[\r\n]') { throw "The password cannot contain a line break." }

  $secretBytes = New-Object byte[] 48
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($secretBytes) }
  finally { $generator.Dispose() }
  $authSecret = [Convert]::ToBase64String($secretBytes)

  @(
    "AUTH_SECRET=$authSecret"
    "DEMO_EMAIL=$email"
    "DEMO_PASSWORD=$password"
    "DATABASE_REGION=ghana-owner-laptop"
    "GENERAL_AI_ENABLED=false"
    "ALLOW_GOOGLE_SITES_EMBED=false"
    "AIC_GOVERNANCE_MODE=disconnected"
  ) | Set-Content -LiteralPath $envFile -Encoding utf8

  & icacls.exe $envFile /inheritance:r /grant:r "$($env:USERNAME):(R,W)" "SYSTEM:(F)" | Out-Null
  Write-Output "Home-server credentials configured without displaying the password."
  Write-Output "Protected file: $envFile"
} finally {
  if ($firstPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPointer) }
  if ($secondPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPointer) }
  Remove-Variable password, confirmation, authSecret -ErrorAction SilentlyContinue
}
