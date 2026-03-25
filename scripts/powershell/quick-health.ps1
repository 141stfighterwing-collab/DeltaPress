<#
.SYNOPSIS
    DeltaPress Quick Health Check
.DESCRIPTION
    Fast health check script for monitoring DeltaPress status.
.VERSION
    1.1.0
.EXAMPLE
    .\quick-health.ps1
#>

param(
    [string]$AppUrl = "http://localhost:3000"
)

$startTime = Get-Date

function Write-Status {
    param([string]$Message, [string]$Status)
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Status) {
        "OK" { Write-Host "[$timestamp] ✓ " -ForegroundColor Green -NoNewline; Write-Host $Message }
        "WARN" { Write-Host "[$timestamp] ⚠ " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
        "FAIL" { Write-Host "[$timestamp] ✗ " -ForegroundColor Red -NoNewline; Write-Host $Message }
    }
}

Write-Host "`n" + "=" * 50 -ForegroundColor Cyan
Write-Host "DeltaPress Quick Health Check" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$node = node --version 2>$null
if ($node) { Write-Status "Node.js: $node" "OK" } else { Write-Status "Node.js: Not found" "FAIL" }

# Check npm
$npm = npm --version 2>$null
if ($npm) { Write-Status "npm: v$npm" "OK" } else { Write-Status "npm: Not found" "FAIL" }

# Check server
try {
    $response = Invoke-WebRequest -Uri $AppUrl -TimeoutSec 2 -ErrorAction Stop
    Write-Status "Server: Running (HTTP $($response.StatusCode))" "OK"
} catch {
    Write-Status "Server: Not running" "WARN"
}

# Check dependencies
if (Test-Path "./node_modules") {
    $count = (Get-ChildItem "./node_modules" -Directory).Count
    Write-Status "Dependencies: $count packages" "OK"
} else {
    Write-Status "Dependencies: Not installed" "FAIL"
}

# Check config
if (Test-Path "./.env.local") {
    Write-Status "Config: .env.local found" "OK"
} else {
    Write-Status "Config: .env.local missing" "WARN"
}

# Check build
if (Test-Path "./dist") {
    $size = [Math]::Round((Get-ChildItem "./dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Status "Build: $size MB" "OK"
} else {
    Write-Status "Build: Not built" "WARN"
}

$duration = [Math]::Round(((Get-Date) - $startTime).TotalMilliseconds, 0)
Write-Host ""
Write-Host "Completed in ${duration}ms" -ForegroundColor Gray
Write-Host ""
