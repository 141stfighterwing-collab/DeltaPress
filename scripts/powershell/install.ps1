<#
.SYNOPSIS
    DeltaPress One-Time Install with Progress Bar
.DESCRIPTION
    Complete silent installation with real-time progress bar and percentage display.
    Checks all prerequisites before installing anything.
    
    This is a RUGGED, ALL-ENCOMPASSING installer that handles all edge cases.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -WithDocker
    .\install.ps1 -Port 8080
    .\install.ps1 -ValidateOnly
#>

[CmdletBinding()]
param(
    [switch]$WithDocker,
    [switch]$ForceReinstall,
    [switch]$ValidateOnly,
    [int]$Port = 3000,
    [string]$EnvFile = ".env.local",
    [int]$MaxRetries = 3
)

# ============================================================================
# Error Handling Configuration
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ============================================================================
# Configuration
# ============================================================================

$CONFIG = @{
    AppName = "DeltaPress"
    Version = "1.4.0"
    RepoUrl = "https://github.com/141stfighterwing-collab/DeltaPress.git"
    MinWindowsBuild = 10240
    MinNodeVersion = 18
    RequiredFiles = @("package.json", "server.ts", "App.tsx", "tsconfig.json", "vite.config.ts")
    RetryDelay = 2000
}

# Installation steps definition with dependencies
$INSTALL_STEPS = @(
    @{ Name = "Checking Windows Version"; Weight = 5; Critical = $true }
    @{ Name = "Checking Administrator Rights"; Weight = 3; Critical = $false }
    @{ Name = "Detecting Package Manager"; Weight = 3; Critical = $true }
    @{ Name = "Checking Node.js"; Weight = 5; Critical = $false }
    @{ Name = "Installing Node.js"; Weight = 25; SkipIf = { $script:nodeInstalled }; Critical = $true }
    @{ Name = "Verifying Node.js"; Weight = 3; Critical = $true }
    @{ Name = "Checking npm"; Weight = 3; Critical = $true }
    @{ Name = "Validating Project Files"; Weight = 5; Critical = $true }
    @{ Name = "Installing Dependencies"; Weight = 20; Critical = $true }
    @{ Name = "Configuring Environment"; Weight = 10; Critical = $false }
    @{ Name = "Checking Docker"; Weight = 5; SkipIf = { !$WithDocker }; Critical = $false }
    @{ Name = "Installing Docker"; Weight = 15; SkipIf = { !$WithDocker -or $script:dockerInstalled }; Critical = $false }
    @{ Name = "Building Application"; Weight = 10; Critical = $false }
    @{ Name = "Running Health Check"; Weight = 5; Critical = $false }
    @{ Name = "Starting Server"; Weight = 4; Critical = $false }
)

# ============================================================================
# State Variables
# ============================================================================

$Script:CurrentStep = 0
$Script:TotalWeight = 0
$Script:CompletedWeight = 0
$Script:CurrentProgress = 0
$Script:StepResults = @{}
$Script:Errors = @()
$Script:Warnings = @()

$script:nodeInstalled = $false
$script:nodeVersion = $null
$script:dockerInstalled = $false
$script:packageManager = $null
$script:isAdmin = $false
$script:windowsBuild = 0

# ============================================================================
# Logging Functions
# ============================================================================

function Write-Log {
    param(
        [string]$Level = "INFO",
        [string]$Message,
        [string]$Solution = ""
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    $entry = "[$timestamp] [$Level] $Message"
    
    if ($Level -eq "ERROR") {
        $Script:Errors += @{ Time = $timestamp; Message = $Message; Solution = $Solution }
    } elseif ($Level -eq "WARN") {
        $Script:Warnings += @{ Time = $timestamp; Message = $Message }
    }
    
    # Write to log file
    $logFile = ".\install-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $entry -ErrorAction SilentlyContinue
}

# ============================================================================
# Progress Bar Functions
# ============================================================================

function Initialize-Progress {
    $Script:TotalWeight = ($INSTALL_STEPS | Where-Object { 
        $skip = $_.SkipIf
        if ($skip) { 
            try {
                $result = & $skip
                -not $result
            } catch { $true }
        } else { $true }
    } | Measure-Object -Property Weight -Sum).Sum
    
    $Script:CurrentStep = 0
    $Script:CompletedWeight = 0
    $Script:StepResults = @{}
}

function Write-ProgressBar {
    param(
        [string]$StepName,
        [int]$StepProgress = 100,
        [string]$Status = "",
        [string]$Detail = ""
    )
    
    if ($Script:CurrentStep -ge $INSTALL_STEPS.Count) { return }
    
    $stepWeight = $INSTALL_STEPS[$Script:CurrentStep].Weight
    $stepContribution = ($stepWeight * $StepProgress / 100)
    $totalProgress = [math]::Round((($Script:CompletedWeight + $stepContribution) / $Script:TotalWeight) * 100)
    $totalProgress = [math]::Min(100, [math]::Max(0, $totalProgress))
    
    # Build progress bar
    $barWidth = 40
    $filledWidth = [math]::Floor($barWidth * $totalProgress / 100)
    $emptyWidth = $barWidth - $filledWidth
    
    $filledBar = "█" * $filledWidth
    $emptyBar = "░" * $emptyWidth
    $progressBar = "[$filledBar$emptyBar] $totalProgress%"
    
    # Write progress line (overwrite previous)
    $consoleWidth = if ([Console]::WindowWidth) { [Console]::WindowWidth } else { 80 }
    
    Write-Host "`r" -NoNewline
    Write-Host $progressBar -ForegroundColor Cyan -NoNewline
    Write-Host " $StepName" -ForegroundColor White -NoNewline
    
    if ($StepProgress -lt 100 -and $StepProgress -gt 0) {
        Write-Host " ($StepProgress%)" -ForegroundColor DarkGray -NoNewline
    }
    
    Write-Host ""
    
    if ($Detail) {
        Write-Host "    → " -ForegroundColor DarkGray -NoNewline
        Write-Host $Detail -ForegroundColor DarkYellow
    }
    
    $Script:CurrentProgress = $totalProgress
}

function Complete-Step {
    param(
        [string]$StepName,
        [bool]$Success = $true,
        [string]$Message = "",
        [string]$Solution = ""
    )
    
    $stepWeight = $INSTALL_STEPS[$Script:CurrentStep].Weight
    $Script:CompletedWeight += $stepWeight
    $Script:StepResults[$StepName] = @{
        Success = $Success
        Message = $Message
        Timestamp = Get-Date -Format "HH:mm:ss"
    }
    
    if ($Success) {
        Write-ProgressBar -StepName $StepName -StepProgress 100 -Status "✓" -Detail $Message
        Write-Log -Level "INFO" -Message "✓ $StepName : $Message"
    } else {
        Write-ProgressBar -StepName $StepName -StepProgress 100 -Status "✗" -Detail $Message
        Write-Log -Level "ERROR" -Message "✗ $StepName : $Message" -Solution $Solution
        
        # Check if this is a critical step
        if ($INSTALL_STEPS[$Script:CurrentStep].Critical) {
            Write-Host ""
            Write-Host "    ╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Red
            Write-Host "    ║  CRITICAL ERROR - Installation cannot continue            ║" -ForegroundColor Red
            Write-Host "    ╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Red
            Write-Host ""
            
            if ($Solution) {
                Write-Host "    Solution: $Solution" -ForegroundColor Yellow
            }
            
            Show-Summary -Success $false
            exit 1
        }
    }
    
    $Script:CurrentStep++
}

function Skip-Step {
    param([string]$StepName, [string]$Reason = "Already installed")
    
    Write-Host "    ⊘ $StepName - $Reason" -ForegroundColor DarkGray
    $Script:StepResults[$StepName] = @{
        Success = $true
        Message = "Skipped: $Reason"
        Timestamp = Get-Date -Format "HH:mm:ss"
    }
    Write-Log -Level "INFO" -Message "⊘ $StepName : Skipped - $Reason"
    $Script:CurrentStep++
}

function Write-ProgressDetail {
    param([string]$Message)
    Write-Host "    → $Message" -ForegroundColor DarkGray
}

# ============================================================================
# Header Display
# ============================================================================

function Show-Header {
    Clear-Host
    
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                                 ║" -ForegroundColor Cyan
    Write-Host "  ║     ██████╗ ███████╗██████╗  █████╗  ██████╗ ██████╗ ███████╗  ║" -ForegroundColor Cyan
    Write-Host "  ║     ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔═══██╗██╔════╝  ║" -ForegroundColor Cyan
    Write-Host "  ║     ██║  ██║█████╗  ██████╔╝███████║██║     ██║   ██║███████╗  ║" -ForegroundColor Cyan
    Write-Host "  ║     ██║  ██║██╔══╝  ██╔══██╗██╔══██║██║     ██║   ██║╚════██║  ║" -ForegroundColor Cyan
    Write-Host "  ║     ██████╔╝███████╗██║  ██║██║  ██║╚██████╗╚██████╔╝███████║  ║" -ForegroundColor Cyan
    Write-Host "  ║     ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝  ║" -ForegroundColor Cyan
    Write-Host "  ║                                                                 ║" -ForegroundColor Cyan
    Write-Host "  ║           Windows One-Time Installer v$($CONFIG.Version)                ║" -ForegroundColor Cyan
    Write-Host "  ║                                                                 ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    if ($ValidateOnly) {
        Write-Host "  Mode: " -NoNewline
        Write-Host "VALIDATION ONLY (no changes will be made)" -ForegroundColor Yellow
    } else {
        Write-Host "  Mode: " -NoNewline
        Write-Host "FULL INSTALLATION" -ForegroundColor Green
    }
    
    if ($WithDocker) {
        Write-Host "  Docker: " -NoNewline
        Write-Host "Enabled" -ForegroundColor Green
    }
    
    Write-Host "  Target Port: $Port"
    Write-Host "  Max Retries: $MaxRetries"
    Write-Host ""
    Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================================
# Validation Functions
# ============================================================================

function Test-WindowsVersion {
    Write-ProgressBar -StepName "Checking Windows Version" -StepProgress 50
    
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
        $script:windowsBuild = [int]$os.BuildNumber
        
        Write-ProgressDetail "Detected: $($os.Caption) Build $script:windowsBuild"
        
        if ($script:windowsBuild -ge $CONFIG.MinWindowsBuild) {
            Complete-Step -StepName "Checking Windows Version" -Success $true -Message "Build $script:windowsBuild (Windows 10+)"
            return $true
        } else {
            Complete-Step -StepName "Checking Windows Version" -Success $false -Message "Build $script:windowsBuild is too old" -Solution "Upgrade to Windows 10 or later (Build 10240+)"
            return $false
        }
    } catch {
        Complete-Step -StepName "Checking Windows Version" -Success $false -Message $_.Exception.Message -Solution "Ensure WMI service is running: 'winmgmt /verifyrepository'"
        return $false
    }
}

function Test-AdministratorRights {
    Write-ProgressBar -StepName "Checking Administrator Rights" -StepProgress 50
    
    try {
        $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
        $script:isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        
        if ($script:isAdmin) {
            Complete-Step -StepName "Checking Administrator Rights" -Success $true -Message "Running as Administrator"
        } else {
            Complete-Step -StepName "Checking Administrator Rights" -Success $true -Message "Standard user (Node.js install may require elevation)"
            Write-Log -Level "WARN" -Message "Not running as Administrator - some operations may require elevation"
        }
        
        return $true
    } catch {
        Complete-Step -StepName "Checking Administrator Rights" -Success $false -Message $_.Exception.Message
        return $false
    }
}

function Get-PackageManager {
    Write-ProgressBar -StepName "Detecting Package Manager" -StepProgress 30
    
    # Check winget (preferred)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-ProgressBar -StepName "Detecting Package Manager" -StepProgress 60 -Detail "Found winget..."
        
        try {
            $version = winget --version 2>&1
            $script:packageManager = "winget"
            Complete-Step -StepName "Detecting Package Manager" -Success $true -Message "winget ($version)"
            return $true
        } catch {
            Write-ProgressDetail "winget found but error getting version"
        }
    }
    
    # Check Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-ProgressBar -StepName "Detecting Package Manager" -StepProgress 70 -Detail "Found Chocolatey..."
        
        try {
            $version = choco --version 2>&1
            $script:packageManager = "chocolatey"
            Complete-Step -StepName "Detecting Package Manager" -Success $true -Message "Chocolatey v$version"
            return $true
        } catch {}
    }
    
    # Check Scoop
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-ProgressBar -StepName "Detecting Package Manager" -StepProgress 80 -Detail "Found Scoop..."
        
        $script:packageManager = "scoop"
        Complete-Step -StepName "Detecting Package Manager" -Success $true -Message "Scoop"
        return $true
    }
    
    # No package manager - offer to install winget
    Write-ProgressBar -StepName "Detecting Package Manager" -StepProgress 90 -Detail "None found, checking options..."
    
    Complete-Step -StepName "Detecting Package Manager" -Success $false -Message "No package manager detected" -Solution @"

    OPTIONS:
    1. Install winget from Microsoft Store (search 'App Installer')
    2. Install Chocolatey: Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    3. Install Scoop: irm get.scoop.sh | iex
"@
    return $false
}

function Test-NodeJS {
    Write-ProgressBar -StepName "Checking Node.js" -StepProgress 30
    
    # Try multiple methods to detect Node.js
    $nodePath = $null
    
    # Method 1: Direct command
    try {
        $nodePath = (Get-Command node -ErrorAction Stop).Source
    } catch {}
    
    # Method 2: Check common paths
    if (-not $nodePath) {
        $commonPaths = @(
            "${env:ProgramFiles}\nodejs\node.exe"
            "${env:ProgramFiles(x86)}\nodejs\node.exe"
            "$env:APPDATA\nvm\*\node.exe"
            "$env:LOCALAPPDATA\scoop\apps\nodejs\current\node.exe"
        )
        
        foreach ($path in $commonPaths) {
            $expanded = $ExecutionContext.InvokeCommand.ExpandString($path)
            $found = Get-Item $expanded -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $nodePath = $found.FullName
                break
            }
        }
    }
    
    if ($nodePath) {
        Write-ProgressBar -StepName "Checking Node.js" -StepProgress 60 -Detail "Found at $nodePath"
        
        try {
            $nodeVersion = & $nodePath --version 2>&1
            $version = $nodeVersion -replace 'v', ''
            $major = [int]($version -split '\.')[0]
            
            if ($major -ge $CONFIG.MinNodeVersion) {
                $script:nodeInstalled = $true
                $script:nodeVersion = $version
                Complete-Step -StepName "Checking Node.js" -Success $true -Message "v$version installed"
                return $true
            } else {
                Write-ProgressDetail "Version $version below minimum $($CONFIG.MinNodeVersion).x"
                Complete-Step -StepName "Checking Node.js" -Success $true -Message "v$version found (will upgrade)"
                return $false
            }
        } catch {
            Write-ProgressDetail "Error checking version: $($_.Exception.Message)"
        }
    }
    
    Complete-Step -StepName "Checking Node.js" -Success $true -Message "Not installed - will install"
    return $false
}

function Install-NodeJS {
    if ($script:nodeInstalled) {
        Skip-Step -StepName "Installing Node.js" -Reason "Already installed v$script:nodeVersion"
        return $true
    }
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Installing Node.js" -Reason "Validation mode"
        return $true
    }
    
    if (-not $script:packageManager) {
        Complete-Step -StepName "Installing Node.js" -Success $false -Message "No package manager" -Solution "Install winget, Chocolatey, or Scoop first"
        return $false
    }
    
    Write-ProgressBar -StepName "Installing Node.js" -StepProgress 5 -Detail "Preparing..."
    
    $attempt = 1
    $installed = $false
    
    while ($attempt -le $MaxRetries -and -not $installed) {
        Write-ProgressBar -StepName "Installing Node.js" -StepProgress ($attempt * 10) -Detail "Attempt $attempt of $MaxRetries..."
        
        try {
            switch ($script:packageManager) {
                "winget" {
                    Write-ProgressDetail "Installing Node.js LTS via winget..."
                    $result = winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements 2>&1
                    $installed = ($LASTEXITCODE -eq 0)
                    
                    if (-not $installed) {
                        Write-ProgressDetail "winget exit code: $LASTEXITCODE"
                        Write-ProgressDetail "Output: $result"
                    }
                }
                "chocolatey" {
                    Write-ProgressDetail "Installing Node.js LTS via Chocolatey..."
                    $result = choco install nodejs-lts -y --force 2>&1
                    $installed = ($LASTEXITCODE -eq 0)
                }
                "scoop" {
                    Write-ProgressDetail "Installing Node.js LTS via Scoop..."
                    $result = scoop install nodejs-lts 2>&1
                    $installed = $?
                }
            }
            
            if (-not $installed) {
                Write-ProgressDetail "Attempt $attempt failed, retrying..."
                Start-Sleep -Milliseconds $CONFIG.RetryDelay
            }
            
        } catch {
            Write-ProgressDetail "Error: $($_.Exception.Message)"
            Start-Sleep -Milliseconds $CONFIG.RetryDelay
        }
        
        $attempt++
    }
    
    Write-ProgressBar -StepName "Installing Node.js" -StepProgress 70 -Detail "Refreshing environment..."
    
    # Force environment refresh
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
    
    # Refresh current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Small delay for environment propagation
    Start-Sleep -Seconds 2
    
    # Re-verify
    $nodePath = $null
    try {
        $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    } catch {}
    
    if ($nodePath) {
        $newVersion = node --version 2>&1
        Complete-Step -StepName "Installing Node.js" -Success $true -Message "Installed $newVersion"
        return $true
    } else {
        Complete-Step -StepName "Installing Node.js" -Success $false -Message "Installation completed but node not found in PATH" -Solution "Restart your terminal/PowerShell and run the installer again, or add Node.js to PATH manually"
        return $false
    }
}

function Test-NodeJSVerification {
    Write-ProgressBar -StepName "Verifying Node.js" -StepProgress 50
    
    try {
        # Force refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        $nodeVersion = node --version 2>$null
        $npmVersion = npm --version 2>$null
        
        if ($nodeVersion -and $npmVersion) {
            Complete-Step -StepName "Verifying Node.js" -Success $true -Message "Node $nodeVersion, npm $npmVersion"
            return $true
        }
    } catch {}
    
    Complete-Step -StepName "Verifying Node.js" -Success $false -Message "Node.js not accessible" -Solution "Restart PowerShell and run the installer again. Node.js may need a new session to be detected."
    return $false
}

function Test-Npm {
    Write-ProgressBar -StepName "Checking npm" -StepProgress 50
    
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            $npmPath = (Get-Command npm).Source
            Complete-Step -StepName "Checking npm" -Success $true -Message "v$npmVersion at $npmPath"
            return $true
        }
    } catch {}
    
    Complete-Step -StepName "Checking npm" -Success $false -Message "npm not found" -Solution "Reinstall Node.js - npm should be included automatically"
    return $false
}

function Test-ProjectFiles {
    Write-ProgressBar -StepName "Validating Project Files" -StepProgress 10
    
    $missingFiles = @()
    $foundFiles = @()
    
    for ($i = 0; $i -lt $CONFIG.RequiredFiles.Count; $i++) {
        $file = $CONFIG.RequiredFiles[$i]
        $progress = 10 + (($i / $CONFIG.RequiredFiles.Count) * 80)
        Write-ProgressBar -StepName "Validating Project Files" -StepProgress ([int]$progress) -Detail "Checking $file..."
        
        if (Test-Path $file) {
            $foundFiles += $file
        } else {
            $missingFiles += $file
        }
    }
    
    if ($missingFiles.Count -eq 0) {
        Complete-Step -StepName "Validating Project Files" -Success $true -Message "All $($foundFiles.Count) files present"
        return $true
    } else {
        Complete-Step -StepName "Validating Project Files" -Success $false -Message "Missing: $($missingFiles -join ', ')" -Solution "Run this installer from the DeltaPress project directory, or clone the repository first: git clone $($CONFIG.RepoUrl)"
        return $false
    }
}

function Install-Dependencies {
    Write-ProgressBar -StepName "Installing Dependencies" -StepProgress 5 -Detail "Reading package.json..."
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Installing Dependencies" -Reason "Validation mode"
        return $true
    }
    
    if (-not (Test-Path "package.json")) {
        Complete-Step -StepName "Installing Dependencies" -Success $false -Message "package.json not found"
        return $false
    }
    
    # Check existing node_modules
    if ((Test-Path "node_modules") -and -not $ForceReinstall) {
        $existingCount = (Get-ChildItem "node_modules" -Directory -ErrorAction SilentlyContinue).Count
        if ($existingCount -gt 50) {
            Write-ProgressBar -StepName "Installing Dependencies" -StepProgress 80 -Detail "Found $existingCount packages"
            Complete-Step -StepName "Installing Dependencies" -Success $true -Message "$existingCount packages already installed"
            return $true
        }
    }
    
    # Clean install if forced or corrupted
    if ($ForceReinstall -and (Test-Path "node_modules")) {
        Write-ProgressBar -StepName "Installing Dependencies" -StepProgress 10 -Detail "Cleaning node_modules..."
        Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-ProgressBar -StepName "Installing Dependencies" -StepProgress 15 -Detail "Running npm install..."
    
    $attempt = 1
    $installed = $false
    
    while ($attempt -le $MaxRetries -and -not $installed) {
        Write-ProgressBar -StepName "Installing Dependencies" -StepProgress (15 + $attempt * 5) -Detail "Attempt $attempt of $MaxRetries..."
        
        try {
            $npmProcess = Start-Process -FilePath "npm" -ArgumentList "install", "--loglevel=error" -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\npm-out.log" -RedirectStandardError "$env:TEMP\npm-err.log"
            
            $progress = 20
            while (-not $npmProcess.HasExited) {
                Start-Sleep -Milliseconds 500
                $progress = [math]::Min(75, $progress + 3)
                Write-ProgressBar -StepName "Installing Dependencies" -StepProgress $progress -Detail "Installing packages..."
            }
            
            if ($npmProcess.ExitCode -eq 0) {
                $installed = $true
            } else {
                Write-ProgressDetail "npm exited with code $($npmProcess.ExitCode)"
                if (Test-Path "$env:TEMP\npm-err.log") {
                    $errors = Get-Content "$env:TEMP\npm-err.log" -Tail 5
                    Write-ProgressDetail "Errors: $($errors -join ' ')"
                }
                Start-Sleep -Milliseconds $CONFIG.RetryDelay
            }
        } catch {
            Write-ProgressDetail "Error: $($_.Exception.Message)"
            Start-Sleep -Milliseconds $CONFIG.RetryDelay
        }
        
        $attempt++
    }
    
    if ($installed) {
        $packageCount = (Get-ChildItem "node_modules" -Directory -ErrorAction SilentlyContinue).Count
        Complete-Step -StepName "Installing Dependencies" -Success $true -Message "$packageCount packages installed"
        return $true
    } else {
        Complete-Step -StepName "Installing Dependencies" -Success $false -Message "npm install failed after $MaxRetries attempts" -Solution "Try: 1) Delete node_modules folder, 2) Run 'npm cache clean --force', 3) Run installer again"
        return $false
    }
}

function New-EnvironmentConfig {
    Write-ProgressBar -StepName "Configuring Environment" -StepProgress 30
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Configuring Environment" -Reason "Validation mode"
        return $true
    }
    
    if (Test-Path $EnvFile) {
        # Check if GEMINI_API_KEY is set
        $envContent = Get-Content $EnvFile -Raw
        if ($envContent -match "GEMINI_API_KEY\s*=\s*[^#\s]") {
            Write-ProgressBar -StepName "Configuring Environment" -StepProgress 80 -Detail "API key configured"
            Complete-Step -StepName "Configuring Environment" -Success $true -Message "Configuration complete"
        } else {
            Complete-Step -StepName "Configuring Environment" -Success $true -Message "Using existing $EnvFile (configure API key)"
        }
        return $true
    }
    
    Write-ProgressBar -StepName "Configuring Environment" -StepProgress 50 -Detail "Creating $EnvFile..."
    
    $envContent = @"
# DeltaPress Environment Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# ============================================================================
# REQUIRED - Primary AI Provider
# Get your FREE API key from: https://aistudio.google.com/app/apikey
# ============================================================================
GEMINI_API_KEY=

# ============================================================================
# OPTIONAL - Additional AI Providers (for redundancy)
# ============================================================================
ZAI_API_KEY=
ML_API_KEY=
KIMI_API_KEY=

# ============================================================================
# Supabase Configuration (for authentication/database)
# ============================================================================
SUPABASE_URL=
SUPABASE_ANON_KEY=

# ============================================================================
# Server Configuration
# ============================================================================
PORT=$Port
NODE_ENV=development

# ============================================================================
# CORS Origins (comma-separated)
# ============================================================================
CORS_ORIGINS=http://localhost:$Port,http://localhost:5173
"@
    
    try {
        $envContent | Out-File -FilePath $EnvFile -Encoding utf8 -Force
        Write-ProgressBar -StepName "Configuring Environment" -StepProgress 90 -Detail "Configuration created"
        Complete-Step -StepName "Configuring Environment" -Success $true -Message "Created $EnvFile - ADD YOUR GEMINI_API_KEY!"
        return $true
    } catch {
        Complete-Step -StepName "Configuring Environment" -Success $false -Message $_.Exception.Message
        return $false
    }
}

function Test-Docker {
    if (-not $WithDocker) {
        Skip-Step -StepName "Checking Docker" -Reason "Docker mode disabled"
        return $true
    }
    
    Write-ProgressBar -StepName "Checking Docker" -StepProgress 40
    
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            # Check if Docker daemon is running
            $dockerInfo = docker info 2>&1
            if ($dockerInfo -notmatch "error") {
                $script:dockerInstalled = $true
                Complete-Step -StepName "Checking Docker" -Success $true -Message "$dockerVersion (running)"
                return $true
            } else {
                Complete-Step -StepName "Checking Docker" -Success $true -Message "Docker installed but not running"
                return $false
            }
        }
    } catch {}
    
    Complete-Step -StepName "Checking Docker" -Success $true -Message "Docker not installed"
    return $false
}

function Install-DockerDesktop {
    if (-not $WithDocker) {
        Skip-Step -StepName "Installing Docker" -Reason "Docker mode disabled"
        return $true
    }
    
    if ($script:dockerInstalled) {
        Skip-Step -StepName "Installing Docker" -Reason "Already installed and running"
        return $true
    }
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Installing Docker" -Reason "Validation mode"
        return $true
    }
    
    Write-ProgressBar -StepName "Installing Docker" -StepProgress 10 -Detail "Preparing..."
    
    # Check if already installed but not running
    $dockerDesktopPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopPath) {
        Write-ProgressBar -StepName "Installing Docker" -StepProgress 50 -Detail "Docker Desktop installed, starting..."
        Start-Process $dockerDesktopPath
        Start-Sleep -Seconds 30
        
        # Verify it's running
        try {
            $dockerInfo = docker info 2>&1
            if ($dockerInfo -notmatch "error") {
                Complete-Step -StepName "Installing Docker" -Success $true -Message "Docker Desktop started"
                return $true
            }
        } catch {}
    }
    
    Write-ProgressBar -StepName "Installing Docker" -StepProgress 20 -Detail "Downloading Docker Desktop..."
    
    $dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
    
    try {
        # Download
        $webClient = New-Object System.Net.WebClient
        
        Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -SourceIdentifier "DockerDownload" -Action {
            $progress = [math]::Round($EventArgs.ProgressPercentage * 0.4) # 0-40%
            Write-ProgressBar -StepName "Installing Docker" -StepProgress $progress -Detail "Downloading... ($($EventArgs.ProgressPercentage)%)"
        } | Out-Null
        
        $webClient.DownloadFileAsync($dockerUrl, $installerPath)
        
        while ($webClient.IsBusy) {
            Start-Sleep -Milliseconds 100
        }
        
        Unregister-Event -SourceIdentifier "DockerDownload" -ErrorAction SilentlyContinue
        
        Write-ProgressBar -StepName "Installing Docker" -StepProgress 50 -Detail "Installing (this takes several minutes)..."
        
        $process = Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Complete-Step -StepName "Installing Docker" -Success $true -Message "Docker Desktop installed - RESTART REQUIRED"
            return $true
        } else {
            Complete-Step -StepName "Installing Docker" -Success $false -Message "Installation failed (exit $($process.ExitCode))" -Solution "Install Docker Desktop manually from https://www.docker.com/products/docker-desktop"
            return $false
        }
    } catch {
        Complete-Step -StepName "Installing Docker" -Success $false -Message $_.Exception.Message -Solution "Download and install Docker Desktop manually from https://www.docker.com/products/docker-desktop"
        return $false
    }
}

function Build-Application {
    Write-ProgressBar -StepName "Building Application" -StepProgress 20
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Building Application" -Reason "Validation mode"
        return $true
    }
    
    if (Test-Path "dist" -and -not $ForceReinstall) {
        $distFiles = (Get-ChildItem "dist" -File -ErrorAction SilentlyContinue).Count
        if ($distFiles -gt 5) {
            Complete-Step -StepName "Building Application" -Success $true -Message "Build exists ($distFiles files)"
            return $true
        }
    }
    
    Write-ProgressBar -StepName "Building Application" -StepProgress 40 -Detail "Running vite build..."
    
    try {
        $buildProcess = Start-Process -FilePath "npm" -ArgumentList "run", "build" -NoNewWindow -PassThru
        
        $progress = 40
        while (-not $buildProcess.HasExited) {
            Start-Sleep -Milliseconds 300
            $progress = [math]::Min(80, $progress + 5)
            Write-ProgressBar -StepName "Building Application" -StepProgress $progress -Detail "Building frontend..."
        }
        
        if ($buildProcess.ExitCode -eq 0) {
            $distFiles = (Get-ChildItem "dist" -File -ErrorAction SilentlyContinue).Count
            Complete-Step -StepName "Building Application" -Success $true -Message "Build complete ($distFiles files)"
            return $true
        } else {
            Complete-Step -StepName "Building Application" -Success $false -Message "Build failed (exit $($buildProcess.ExitCode))" -Solution "Run 'npm run build' manually to see detailed errors"
            return $false
        }
    } catch {
        Complete-Step -StepName "Building Application" -Success $false -Message $_.Exception.Message
        return $false
    }
}

function Test-HealthCheck {
    Write-ProgressBar -StepName "Running Health Check" -StepProgress 50
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            Complete-Step -StepName "Running Health Check" -Success $true -Message "Status: $($data.status), Version: $($data.version)"
            return $true
        }
    } catch {
        # Server not running - OK for fresh install
        Complete-Step -StepName "Running Health Check" -Success $true -Message "Server not running (ready for first start)"
        return $true
    }
    
    Complete-Step -StepName "Running Health Check" -Success $true -Message "Ready"
    return $true
}

function Start-Application {
    if ($ValidateOnly) {
        Skip-Step -StepName "Starting Server" -Reason "Validation mode"
        return $true
    }
    
    Write-ProgressBar -StepName "Starting Server" -StepProgress 30 -Detail "Configuring..."
    
    # Set environment
    $env:PORT = $Port
    $env:NODE_ENV = "development"
    
    # Load .env file if exists
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $name = $Matches[1].Trim()
                $value = $Matches[2].Trim()
                if ($name -and $value) {
                    Set-Item -Path "env:$name" -Value $value -ErrorAction SilentlyContinue
                }
            }
        }
    }
    
    Write-ProgressBar -StepName "Starting Server" -StepProgress 60 -Detail "Launching..."
    
    try {
        $startInfo = New-Object System.Diagnostics.ProcessStartInfo
        $startInfo.FileName = "npm"
        $startInfo.Arguments = "run dev"
        $startInfo.UseShellExecute = $true
        $startInfo.CreateNoWindow = $false
        $startInfo.WindowStyle = "Normal"
        
        $process = [System.Diagnostics.Process]::Start($startInfo)
        
        Write-ProgressBar -StepName "Starting Server" -StepProgress 90 -Detail "Server started (PID: $($process.Id))"
        
        Complete-Step -StepName "Starting Server" -Success $true -Message "Running at http://localhost:$Port (PID: $($process.Id))"
        
        # Wait and open browser
        Start-Sleep -Seconds 3
        
        try {
            Start-Process "http://localhost:$Port"
        } catch {}
        
        return $true
    } catch {
        Complete-Step -StepName "Starting Server" -Success $false -Message $_.Exception.Message -Solution "Run 'npm run dev' manually to start the server"
        return $false
    }
}

# ============================================================================
# Installation Summary
# ============================================================================

function Show-Summary {
    param([bool]$Success)
    
    Write-Host ""
    Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    
    if ($Success) {
        Write-Host "                    ✓ INSTALLATION COMPLETE" -ForegroundColor Green
    } else {
        Write-Host "                    ✗ INSTALLATION INCOMPLETE" -ForegroundColor Red
    }
    
    Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    
    # Show step results
    Write-Host "  Installation Log:" -ForegroundColor White
    Write-Host ""
    
    foreach ($result in $Script:StepResults.GetEnumerator()) {
        $status = if ($result.Value.Success) { "✓" } else { "✗" }
        $color = if ($result.Value.Success) { "Green" } else { "Red" }
        
        Write-Host "  [$($result.Value.Timestamp)] " -ForegroundColor DarkGray -NoNewline
        Write-Host $status -ForegroundColor $color -NoNewline
        Write-Host " $($result.Key): " -NoNewline
        Write-Host $result.Value.Message -ForegroundColor DarkGray
    }
    
    # Show errors
    if ($Script:Errors.Count -gt 0) {
        Write-Host ""
        Write-Host "  Errors Encountered:" -ForegroundColor Red
        foreach ($err in $Script:Errors) {
            Write-Host "    ✗ [$($err.Time)] $($err.Message)" -ForegroundColor Red
            if ($err.Solution) {
                Write-Host "      Solution: $($err.Solution)" -ForegroundColor Yellow
            }
        }
    }
    
    # Show warnings
    if ($Script:Warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "  Warnings:" -ForegroundColor Yellow
        foreach ($warn in $Script:Warnings) {
            Write-Host "    ⚠ [$($warn.Time)] $($warn.Message)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    
    if ($Success) {
        Write-Host ""
        Write-Host "  🌐 Application: " -NoNewline
        Write-Host "http://localhost:$Port" -ForegroundColor Cyan
        Write-Host "  🔧 Admin Panel: " -NoNewline
        Write-Host "http://localhost:$Port/#/admin" -ForegroundColor Cyan
        Write-Host "  📋 Environment: " -NoNewline
        Write-Host $EnvFile -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  ⚠️  ACTION REQUIRED:" -ForegroundColor Yellow
        Write-Host "  1. Edit $EnvFile" -ForegroundColor White
        Write-Host "  2. Add your GEMINI_API_KEY (get FREE key: https://aistudio.google.com/app/apikey)" -ForegroundColor White
        Write-Host "  3. Restart the server: npm run dev" -ForegroundColor White
        Write-Host ""
        Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    }
    
    # Save log
    $logFile = ".\install-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $report = @"
DeltaPress Installation Report
Generated: $(Get-Date)
Status: $(if ($Success) { "SUCCESS" } else { "FAILED" })

Steps Completed:
$($Script:StepResults.GetEnumerator() | ForEach-Object { "[$($_.Value.Timestamp)] $($_.Key): $($_.Value.Message)" } | Out-String)

Errors:
$($Script:Errors | ForEach-Object { "[$($_.Time)] $($_.Message)" } | Out-String)

Warnings:
$($Script:Warnings | ForEach-Object { "[$($_.Time)] $($_.Message)" } | Out-String)
"@
    
    $report | Out-File -FilePath $logFile -Encoding utf8
    Write-Host "  Log saved to: $logFile" -ForegroundColor DarkGray
}

# ============================================================================
# Main Execution
# ============================================================================

function Main {
    Show-Header
    Initialize-Progress
    
    $success = $true
    
    Write-Log -Level "INFO" -Message "Installation started"
    
    # Phase 1: System Checks
    if (-not (Test-WindowsVersion)) { $success = $false }
    if (-not (Test-AdministratorRights)) { }
    if (-not (Get-PackageManager)) { $success = $false }
    
    # Phase 2: Node.js Setup
    if ($success) {
        Test-NodeJS | Out-Null
        
        if (-not (Install-NodeJS)) { 
            if (-not $script:nodeInstalled) { $success = $false } 
        }
        
        if ($success) {
            if (-not (Test-NodeJSVerification)) { $success = $false }
        }
    }
    
    # Phase 3: Project Setup
    if ($success) {
        if (-not (Test-Npm)) { $success = $false }
        if (-not (Test-ProjectFiles)) { $success = $false }
        if (-not (Install-Dependencies)) { $success = $false }
        if (-not (New-EnvironmentConfig)) { }
    }
    
    # Phase 4: Docker (Optional)
    Test-Docker | Out-Null
    Install-DockerDesktop | Out-Null
    
    # Phase 5: Build and Run
    if ($success) {
        if (-not (Build-Application)) { }
        if (-not (Test-HealthCheck)) { }
        if (-not (Start-Application)) { }
    }
    
    Show-Summary -Success $success
    
    Write-Log -Level "INFO" -Message "Installation completed with status: $(if ($success) { 'SUCCESS' } else { 'FAILED' })"
    
    if ($success) {
        exit 0
    } else {
        exit 1
    }
}

# ============================================================================
# Entry Point
# ============================================================================

try {
    Main
} catch {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "  ║  FATAL ERROR                                                   ║" -ForegroundColor Red
    Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Location: $($_.ScriptStackTrace)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Please report this issue at:" -ForegroundColor Yellow
    Write-Host "  https://github.com/141stfighterwing-collab/DeltaPress/issues" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Log -Level "ERROR" -Message "FATAL: $($_.Exception.Message)"
    exit 1
}
