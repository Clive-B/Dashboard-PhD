[CmdletBinding()]
param([string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")))

$ErrorActionPreference = "Stop"
$taskName = "AIC Scholar Home Server"
$runner = Join-Path $ProjectRoot "scripts\windows\home-server-supervisor.ps1"
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path -LiteralPath $runner)) { throw "Supervisor script not found: $runner" }

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runner`" -ProjectRoot `"$ProjectRoot`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Runs AIC Scholar locally while Windows is unlocked or locked; never unlocks Windows." -Force | Out-Null
Write-Output "Installed scheduled task: $taskName"
Write-Output "The task starts after an owner login and continues while the screen is locked."
