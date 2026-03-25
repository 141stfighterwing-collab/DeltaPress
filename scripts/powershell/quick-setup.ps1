<#
.SYNOPSIS
    DeltaPress Quick Setup with Progress Bar
.DESCRIPTION
    One-click setup with visual progress bar and silent installation.

.EXAMPLE
    .\quick-setup.ps1
    .\quick-setup.ps1 -WithDocker
#>

[CmdletBinding()]
param(
    [switch]$WithDocker,
    [switch]$ForceReinstall
)

# ============================================================================
# Progress Bar Function
# ============================================================================

function Show-Progress {
    param(
        [int]$Percent,
        [string]$Message,
        [string]$Detail = ""
    )
    
    $barWidth = 30
    $filled = [math]::Floor($barWidth * $Percent / 100)
    $empty = $barWidth - $filled
    
    $bar = "█" * $filled + "░" * $empty
    $percentStr = "{0,3}" -f $Percent
    
    Write-Host "`r  " -NoNewline
    Write-Host "[$bar]" -ForegroundColor Cyan -NoNewline
    Write-Host " $percentStr% " -NoNewline
    Write-Host $Message -NoNewline
    
    if ($Detail) {
        Write-Host " → $Detail" -ForegroundColor DarkGray
    } else {
        Write-Host ""
    }
}

function Show-Step {
    param([string]$Message, [string]$Status = "info")
    
    $icon = switch ($Status) {
        "ok" { "✓"; $color = "Green" }
        "warn" { "⚠"; $color = "Yellow" }
        "error" { "✗"; $color = "Red" }
        "skip" { "⊘"; $color = "DarkGray" }
        default { "→"; $color = "DarkGray" }
    }
    
    Write-Host "    $icon " -ForegroundColor $color -NoNewline
    Write-Host $Message
}

# ============================================================================
# Header
# ============================================================================

Clear-Host

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║              DeltaPress Quick Setup v1.4                      ║" -ForegroundColor Cyan
Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Step 1: Windows Check (5%)
# ============================================================================

Show-Progress -Percent 5 -Message "Checking system..." -Detail "Windows version"

$os = Get-CimInstance Win32_OperatingSystem
$build = [int]$os.BuildNumber

if ($build -ge 10240) {
    Show-Step "Windows Build $build compatible" -Status "ok"
} else {
    Show-Step "Windows 10+ recommended (Build $build)" -Status "warn"
}

# ============================================================================
# Step 2: Admin Check (10%)
# ============================================================================

Show-Progress -Percent 10 -Message "Checking privileges..."

$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Show-Step "Running as Administrator" -Status "ok"
} else {
    Show-Step "Standard user (some features limited)" -Status "info"
}

# ============================================================================
# Step 3: Package Manager (15%)
# ============================================================================

Show-Progress -Percent 15 -Message "Detecting package manager..."

$pkgManager = $null
if (Get-Command winget -ErrorAction SilentlyContinue) {
    $pkgManager = "winget"
    Show-Step "Found: winget" -Status "ok"
} elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    $pkgManager = "chocolatey"
    Show-Step "Found: Chocolatey" -Status "ok"
} elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
    $pkgManager = "scoop"
    Show-Step "Found: Scoop" -Status "ok"
} else {
    Show-Step "No package manager found" -Status "warn"
}

# ============================================================================
# Step 4: Node.js Check (20%)
# ============================================================================

Show-Progress -Percent 20 -Message "Checking Node.js..."

$nodeInstalled = $false
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        $version = $nodeVersion -replace 'v', ''
        $major = [int]($version -split '\.')[0]
        
        if ($major -ge 18) {
            $nodeInstalled = $true
            Show-Step "Node.js v$version installed" -Status "ok"
        } else {
            Show-Step "Node.js v$version (upgrade recommended)" -Status "warn"
            $nodeInstalled = $true
        }
    }
} catch {}

# ============================================================================
# Step 5: Install Node.js (20-50%)
# ============================================================================

if (-not $nodeInstalled) {
    Show-Progress -Percent 25 -Message "Installing Node.js..." -Detail "Downloading"
    
    if ($pkgManager) {
        switch ($pkgManager) {
            "winget" {
                Show-Progress -Percent 30 -Message "Installing Node.js..." -Detail "Using winget"
                winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements | Out-Null
            }
            "chocolatey" {
                Show-Progress -Percent 30 -Message "Installing Node.js..." -Detail "Using Chocolatey"
                choco install nodejs-lts -y | Out-Null
            }
            "scoop" {
                Show-Progress -Percent 30 -Message "Installing Node.js..." -Detail "Using Scoop"
                scoop install nodejs-lts | Out-Null
            }
        }
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Start-Sleep -Seconds 2
        
        Show-Progress -Percent 50 -Message "Installing Node.js..." -Detail "Complete"
        Show-Step "Node.js LTS installed" -Status "ok"
    } else {
        Show-Step "Cannot install Node.js - no package manager" -Status "error"
        Write-Host ""
        Write-Host "    Please install Node.js manually from: " -NoNewline
        Write-Host "https://nodejs.org/" -ForegroundColor Cyan
        exit 1
    }
} else {
    Show-Progress -Percent 50 -Message "Node.js ready" -Detail "Skipping install"
    Show-Step "Node.js already installed" -Status "skip"
}

# ============================================================================
# Step 6: npm Check (55%)
# ============================================================================

Show-Progress -Percent 55 -Message "Checking npm..."

try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Show-Step "npm v$npmVersion available" -Status "ok"
    }
} catch {
    Show-Step "npm not found" -Status "error"
    exit 1
}

# ============================================================================
# Step 7: Project Files (60%)
# ============================================================================

Show-Progress -Percent 60 -Message "Validating project..."

if (-not (Test-Path "package.json")) {
    Show-Step "package.json not found" -Status "error"
    Write-Host ""
    Write-Host "    Please run this script in the DeltaPress project directory" -ForegroundColor Yellow
    exit 1
}

Show-Step "Project files validated" -Status "ok"

# ============================================================================
# Step 8: Dependencies (65-85%)
# ============================================================================

Show-Progress -Percent 65 -Message "Installing dependencies..."

if ((Test-Path "node_modules") -and -not $ForceReinstall) {
    $count = (Get-ChildItem "node_modules" -Directory -ErrorAction SilentlyContinue).Count
    if ($count -gt 10) {
        Show-Progress -Percent 85 -Message "Dependencies already installed" -Detail "$count packages"
        Show-Step "Found $count packages in node_modules" -Status "skip"
    } else {
        $needInstall = $true
    }
} else {
    $needInstall = $true
}

if ($needInstall) {
    Show-Progress -Percent 70 -Message "Installing dependencies..." -Detail "npm install"
    
    $npmProcess = Start-Process -FilePath "npm" -ArgumentList "install", "--silent" -NoNewWindow -PassThru
    
    $pct = 70
    while (-not $npmProcess.HasExited) {
        Start-Sleep -Milliseconds 300
        $pct = [math]::Min(84, $pct + 1)
        Show-Progress -Percent $pct -Message "Installing dependencies..." -Detail "Please wait"
    }
    
    if ($npmProcess.ExitCode -eq 0) {
        $count = (Get-ChildItem "node_modules" -Directory -ErrorAction SilentlyContinue).Count
        Show-Progress -Percent 85 -Message "Dependencies installed" -Detail "$count packages"
        Show-Step "$count packages installed" -Status "ok"
    } else {
        Show-Step "npm install failed" -Status "error"
        exit 1
    }
}

# ============================================================================
# Step 9: Environment (90%)
# ============================================================================

Show-Progress -Percent 90 -Message "Configuring environment..."

if (Test-Path ".env.local") {
    Show-Step ".env.local exists" -Status "ok"
} else {
    @"
# DeltaPress Environment Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# REQUIRED - Get your key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=

# Optional - Additional AI Providers
ZAI_API_KEY=
ML_API_KEY=
KIMI_API_KEY=

# Supabase (if using)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Server
PORT=3000
NODE_ENV=development
"@ | Out-File -FilePath ".env.local" -Encoding utf8
    
    Show-Step "Created .env.local template" -Status "ok"
}

# ============================================================================
# Step 10: Docker (Optional, 95%)
# ============================================================================

if ($WithDocker) {
    Show-Progress -Percent 93 -Message "Checking Docker..."
    
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            Show-Progress -Percent 95 -Message "Docker ready"
            Show-Step $dockerVersion -Status "ok"
        } else {
            throw "Not installed"
        }
    } catch {
        Show-Step "Docker not installed - skipping" -Status "warn"
    }
} else {
    Show-Progress -Percent 95 -Message "Skipping Docker..."
}

# ============================================================================
# Step 11: Start Server (100%)
# ============================================================================

Show-Progress -Percent 98 -Message "Starting DeltaPress..."

$env:PORT = 3000

# Start server
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "npm"
$startInfo.Arguments = "run dev"
$startInfo.UseShellExecute = $true
$startInfo.CreateNoWindow = $false

$process = [System.Diagnostics.Process]::Start($startInfo)

Show-Progress -Percent 100 -Message "Complete!"
Show-Step "Server started (PID: $($process.Id))" -Status "ok"

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║              ✓ Setup Complete!                                ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Application: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "  🔧 Admin Panel: " -NoNewline
Write-Host "http://localhost:3000/#/admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ⚠️  Edit .env.local and add your GEMINI_API_KEY!" -ForegroundColor Yellow
Write-Host ""
