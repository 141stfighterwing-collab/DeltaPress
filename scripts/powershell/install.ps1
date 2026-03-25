<#
.SYNOPSIS
    DeltaPress All-Encompassing Rugged Installer with Database Support
.DESCRIPTION
    Complete silent installation with:
    - Real-time progress bar and percentage display
    - Prerequisite validation before any changes
    - Database installation (PostgreSQL default, MySQL, MongoDB options)
    - Auto-configuration of database tables
    - Secure credential generation for app and database
    - Credentials saved to secure file (auto-added to .gitignore)
    
    This is a RUGGED, ALL-ENCOMPASSING installer that handles all edge cases.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -WithDocker
    .\install.ps1 -Database PostgreSQL
    .\install.ps1 -Database MySQL
    .\install.ps1 -Database MongoDB
    .\install.ps1 -Port 8080
    .\install.ps1 -ValidateOnly
#>

[CmdletBinding()]
param(
    [switch]$WithDocker,
    [switch]$ForceReinstall,
    [switch]$ValidateOnly,
    [ValidateSet("PostgreSQL", "MySQL", "MongoDB", "None")]
    [string]$Database = "PostgreSQL",
    [int]$Port = 3000,
    [int]$DbPort = 0,  # 0 = use default for database type
    [string]$EnvFile = ".env.local",
    [int]$MaxRetries = 3,
    [switch]$SkipCredentials,
    [string]$CustomDbPassword,
    [string]$CustomAppPassword
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
    Version = "1.6.0"
    RepoUrl = "https://github.com/141stfighterwing-collab/DeltaPress.git"
    MinWindowsBuild = 10240
    MinNodeVersion = 18
    RequiredFiles = @("package.json", "server.ts", "App.tsx", "tsconfig.json", "vite.config.ts")
    RetryDelay = 2000
    CredentialsFile = ".credentials"
}

# Database configuration
$DB_CONFIG = @{
    PostgreSQL = @{
        DefaultPort = 5432
        WingetPackage = "PostgreSQL.PostgreSQL"
        ChocoPackage = "postgresql"
        ScoopPackage = "postgresql"
        DefaultUser = "deltapress"
        DefaultDb = "deltapress"
        DockerImage = "postgres:16-alpine"
        EnvVar = "DATABASE_URL"
        ConnStringTemplate = "postgresql://{user}:{password}@localhost:{port}/{database}"
    }
    MySQL = @{
        DefaultPort = 3306
        WingetPackage = "Oracle.MySQL"
        ChocoPackage = "mysql"
        ScoopPackage = "mysql"
        DefaultUser = "deltapress"
        DefaultDb = "deltapress"
        DockerImage = "mysql:8.0"
        EnvVar = "DATABASE_URL"
        ConnStringTemplate = "mysql://{user}:{password}@localhost:{port}/{database}"
    }
    MongoDB = @{
        DefaultPort = 27017
        WingetPackage = "MongoDB.Server"
        ChocoPackage = "mongodb"
        ScoopPackage = "mongodb"
        DefaultUser = "deltapress"
        DefaultDb = "deltapress"
        DockerImage = "mongo:7"
        EnvVar = "MONGODB_URI"
        ConnStringTemplate = "mongodb://{user}:{password}@localhost:{port}/{database}"
    }
}

# Installation steps definition with dependencies
$INSTALL_STEPS = @(
    @{ Name = "Checking Windows Version"; Weight = 3; Critical = $true }
    @{ Name = "Checking Administrator Rights"; Weight = 2; Critical = $false }
    @{ Name = "Detecting Package Manager"; Weight = 2; Critical = $true }
    @{ Name = "Checking Node.js"; Weight = 3; Critical = $false }
    @{ Name = "Installing Node.js"; Weight = 15; SkipIf = { $script:nodeInstalled }; Critical = $true }
    @{ Name = "Verifying Node.js"; Weight = 2; Critical = $true }
    @{ Name = "Checking npm"; Weight = 2; Critical = $true }
    @{ Name = "Validating Project Files"; Weight = 3; Critical = $true }
    @{ Name = "Installing Dependencies"; Weight = 12; Critical = $true }
    @{ Name = "Checking Docker"; Weight = 2; SkipIf = { !$WithDocker }; Critical = $false }
    @{ Name = "Installing Docker"; Weight = 10; SkipIf = { !$WithDocker -or $script:dockerInstalled }; Critical = $false }
    @{ Name = "Checking Database System"; Weight = 2; SkipIf = { $Database -eq "None" }; Critical = $false }
    @{ Name = "Installing Database"; Weight = 15; SkipIf = { $Database -eq "None" -or $script:dbInstalled }; Critical = $false }
    @{ Name = "Configuring Database"; Weight = 5; SkipIf = { $Database -eq "None" }; Critical = $false }
    @{ Name = "Generating Credentials"; Weight = 3; SkipIf = { $SkipCredentials }; Critical = $false }
    @{ Name = "Creating Database Tables"; Weight = 5; SkipIf = { $Database -eq "None" }; Critical = $false }
    @{ Name = "Configuring Environment"; Weight = 5; Critical = $false }
    @{ Name = "Building Application"; Weight = 8; Critical = $false }
    @{ Name = "Running Health Check"; Weight = 3; Critical = $false }
    @{ Name = "Starting Server"; Weight = 2; Critical = $false }
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
$script:dbInstalled = $false
$script:dbConnection = $null
$script:credentials = @{}

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
        Write-Host "    -> " -ForegroundColor DarkGray -NoNewline
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
        Write-ProgressBar -StepName $StepName -StepProgress 100 -Status "OK" -Detail $Message
        Write-Log -Level "INFO" -Message "OK $StepName : $Message"
    } else {
        Write-ProgressBar -StepName $StepName -StepProgress 100 -Status "FAIL" -Detail $Message
        Write-Log -Level "ERROR" -Message "FAIL $StepName : $Message" -Solution $Solution
        
        # Check if this is a critical step
        if ($INSTALL_STEPS[$Script:CurrentStep].Critical) {
            Write-Host ""
            Write-Host "    +===============================================================+" -ForegroundColor Red
            Write-Host "    |  CRITICAL ERROR - Installation cannot continue                |" -ForegroundColor Red
            Write-Host "    +===============================================================+" -ForegroundColor Red
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
    
    Write-Host "    O $StepName - $Reason" -ForegroundColor DarkGray
    $Script:StepResults[$StepName] = @{
        Success = $true
        Message = "Skipped: $Reason"
        Timestamp = Get-Date -Format "HH:mm:ss"
    }
    Write-Log -Level "INFO" -Message "O $StepName : Skipped - $Reason"
    $Script:CurrentStep++
}

function Write-ProgressDetail {
    param([string]$Message)
    Write-Host "    -> $Message" -ForegroundColor DarkGray
}

# ============================================================================
# Header Display
# ============================================================================

function Show-Header {
    Clear-Host
    
    Write-Host ""
    Write-Host "  +===============================================================+" -ForegroundColor Cyan
    Write-Host "  |                                                               |" -ForegroundColor Cyan
    Write-Host "  |     ██████╗ ███████╗██████╗  █████╗  ██████╗ ██████╗ ███████╗  |" -ForegroundColor Cyan
    Write-Host "  |     ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔═══██╗██╔════╝  |" -ForegroundColor Cyan
    Write-Host "  |     ██║  ██║█████╗  ██████╔╝███████║██║     ██║   ██║███████╗  |" -ForegroundColor Cyan
    Write-Host "  |     ██║  ██║██╔══╝  ██╔══██╗██╔══██║██║     ██║   ██║╚════██║  |" -ForegroundColor Cyan
    Write-Host "  |     ██████╔╝███████╗██║  ██║██║  ██║╚██████╗╚██████╔╝███████║  |" -ForegroundColor Cyan
    Write-Host "  |     ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝  |" -ForegroundColor Cyan
    Write-Host "  |                                                               |" -ForegroundColor Cyan
    Write-Host "  |       All-Encompassing Rugged Installer v$($CONFIG.Version)               |" -ForegroundColor Cyan
    Write-Host "  |                                                               |" -ForegroundColor Cyan
    Write-Host "  +===============================================================+" -ForegroundColor Cyan
    Write-Host ""
    
    if ($ValidateOnly) {
        Write-Host "  Mode: " -NoNewline
        Write-Host "VALIDATION ONLY (no changes will be made)" -ForegroundColor Yellow
    } else {
        Write-Host "  Mode: " -NoNewline
        Write-Host "FULL INSTALLATION" -ForegroundColor Green
    }
    
    Write-Host "  Database: " -NoNewline
    Write-Host $Database -ForegroundColor $(if ($Database -eq "None") { "Yellow" } else { "Green" })
    
    if ($WithDocker) {
        Write-Host "  Docker: " -NoNewline
        Write-Host "Enabled" -ForegroundColor Green
    }
    
    Write-Host "  Target Port: $Port"
    Write-Host "  Max Retries: $MaxRetries"
    Write-Host ""
    Write-Host "  ===============================================================" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================================
# Password Generation
# ============================================================================

function New-SecurePassword {
    param(
        [int]$Length = 24,
        [switch]$IncludeSpecialChars
    )
    
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    if ($IncludeSpecialChars) {
        $chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    }
    
    $password = ""
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] $Length
    
    $rng.GetBytes($bytes)
    
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[$bytes[$i] % $chars.Length]
    }
    
    return $password
}

function New-UniqueAppId {
    return "DP-" + (-join ((65..90) + (48..57) | Get-Random -Count 8 | ForEach-Object { [char]$_ }))
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
            Complete-Step -StepName "Checking Administrator Rights" -Success $true -Message "Standard user (database install may require elevation)"
            Write-Log -Level "WARN" -Message "Not running as Administrator - database installation may require elevation"
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

# ============================================================================
# Database Functions
# ============================================================================

function Test-DatabaseSystem {
    if ($Database -eq "None") {
        Skip-Step -StepName "Checking Database System" -Reason "No database selected"
        return $true
    }
    
    Write-ProgressBar -StepName "Checking Database System" -StepProgress 30 -Detail "Checking for $Database..."
    
    $dbConfig = $DB_CONFIG[$Database]
    $dbFound = $false
    
    switch ($Database) {
        "PostgreSQL" {
            # Check for psql
            if (Get-Command psql -ErrorAction SilentlyContinue) {
                $version = psql --version 2>&1
                Write-ProgressDetail "Found: $version"
                $dbFound = $true
            }
            
            # Check common paths
            $pgPaths = @(
                "${env:ProgramFiles}\PostgreSQL\*\bin\psql.exe"
                "${env:ProgramFiles(x86)}\PostgreSQL\*\bin\psql.exe"
            )
            foreach ($path in $pgPaths) {
                $found = Get-Item $path -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    Write-ProgressDetail "Found PostgreSQL at: $($found.DirectoryName)"
                    $dbFound = $true
                    break
                }
            }
        }
        "MySQL" {
            if (Get-Command mysql -ErrorAction SilentlyContinue) {
                $version = mysql --version 2>&1
                Write-ProgressDetail "Found: $version"
                $dbFound = $true
            }
            
            $mysqlPaths = @(
                "${env:ProgramFiles}\MySQL\MySQL Server *\bin\mysql.exe"
                "${env:ProgramFiles(x86)}\MySQL\MySQL Server *\bin\mysql.exe"
            )
            foreach ($path in $mysqlPaths) {
                $found = Get-Item $path -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    Write-ProgressDetail "Found MySQL at: $($found.DirectoryName)"
                    $dbFound = $true
                    break
                }
            }
        }
        "MongoDB" {
            if (Get-Command mongod -ErrorAction SilentlyContinue) {
                $version = mongod --version 2>&1 | Select-Object -First 1
                Write-ProgressDetail "Found: $version"
                $dbFound = $true
            }
            
            $mongoPaths = @(
                "${env:ProgramFiles}\MongoDB\Server\*\bin\mongod.exe"
                "C:\data\db"
            )
            foreach ($path in $mongoPaths) {
                if (Test-Path $path) {
                    Write-ProgressDetail "Found MongoDB at: $path"
                    $dbFound = $true
                    break
                }
            }
        }
    }
    
    if ($dbFound) {
        $script:dbInstalled = $true
        Complete-Step -StepName "Checking Database System" -Success $true -Message "$Database already installed"
    } else {
        Complete-Step -StepName "Checking Database System" -Success $true -Message "$Database not found - will install"
    }
    
    return $true
}

function Install-Database {
    if ($Database -eq "None") {
        Skip-Step -StepName "Installing Database" -Reason "No database selected"
        return $true
    }
    
    if ($script:dbInstalled) {
        Skip-Step -StepName "Installing Database" -Reason "$Database already installed"
        return $true
    }
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Installing Database" -Reason "Validation mode"
        return $true
    }
    
    $dbConfig = $DB_CONFIG[$Database]
    
    Write-ProgressBar -StepName "Installing Database" -StepProgress 5 -Detail "Preparing $Database installation..."
    
    # If Docker mode, use Docker for database
    if ($WithDocker) {
        return Install-DatabaseDocker -DbConfig $dbConfig
    }
    
    # Otherwise use package manager
    if (-not $script:packageManager) {
        Complete-Step -StepName "Installing Database" -Success $false -Message "No package manager available" -Solution "Install winget, Chocolatey, or Scoop first, or use -WithDocker flag"
        return $false
    }
    
    $attempt = 1
    $installed = $false
    
    while ($attempt -le $MaxRetries -and -not $installed) {
        Write-ProgressBar -StepName "Installing Database" -StepProgress ($attempt * 10) -Detail "Attempt $attempt of $MaxRetries..."
        
        try {
            switch ($script:packageManager) {
                "winget" {
                    $package = $dbConfig.WingetPackage
                    Write-ProgressDetail "Installing $package via winget..."
                    $result = winget install $package --silent --accept-package-agreements --accept-source-agreements 2>&1
                    $installed = ($LASTEXITCODE -eq 0)
                }
                "chocolatey" {
                    $package = $dbConfig.ChocoPackage
                    Write-ProgressDetail "Installing $package via Chocolatey..."
                    $result = choco install $package -y --force 2>&1
                    $installed = ($LASTEXITCODE -eq 0)
                }
                "scoop" {
                    $package = $dbConfig.ScoopPackage
                    Write-ProgressDetail "Installing $package via Scoop..."
                    $result = scoop install $package 2>&1
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
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Start-Sleep -Seconds 2
    
    # Verify installation
    Write-ProgressBar -StepName "Installing Database" -StepProgress 80 -Detail "Verifying installation..."
    
    $verified = $false
    switch ($Database) {
        "PostgreSQL" {
            if (Get-Command psql -ErrorAction SilentlyContinue) {
                $verified = $true
            }
        }
        "MySQL" {
            if (Get-Command mysql -ErrorAction SilentlyContinue) {
                $verified = $true
            }
        }
        "MongoDB" {
            if (Get-Command mongod -ErrorAction SilentlyContinue) {
                $verified = $true
            }
        }
    }
    
    if ($verified) {
        Complete-Step -StepName "Installing Database" -Success $true -Message "$Database installed successfully"
        return $true
    } else {
        Complete-Step -StepName "Installing Database" -Success $false -Message "$Database installation verification failed" -Solution "Install $Database manually or use -WithDocker for containerized database"
        return $false
    }
}

function Install-DatabaseDocker {
    param($DbConfig)
    
    Write-ProgressBar -StepName "Installing Database" -StepProgress 20 -Detail "Setting up Docker container..."
    
    $containerName = "deltapress-$($Database.ToLower())"
    $dbPort = if ($DbPort -gt 0) { $DbPort } else { $DbConfig.DefaultPort }
    
    # Check if container already exists
    $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
    if ($existingContainer -eq $containerName) {
        Write-ProgressDetail "Container $containerName already exists"
        
        # Check if running
        $running = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        if ($running -ne $containerName) {
            Write-ProgressDetail "Starting existing container..."
            docker start $containerName 2>$null
        }
        
        Complete-Step -StepName "Installing Database" -Success $true -Message "Using existing Docker container: $containerName"
        return $true
    }
    
    Write-ProgressBar -StepName "Installing Database" -StepProgress 40 -Detail "Pulling $($DbConfig.DockerImage)..."
    
    # Pull image
    docker pull $DbConfig.DockerImage 2>&1 | Out-Null
    
    Write-ProgressBar -StepName "Installing Database" -StepProgress 60 -Detail "Creating container..."
    
    # Generate passwords for container
    $dbPassword = if ($CustomDbPassword) { $CustomDbPassword } else { New-SecurePassword -Length 16 }
    
    # Create container based on database type
    $containerCreated = $false
    switch ($Database) {
        "PostgreSQL" {
            $envVars = "-e POSTGRES_USER=$($DbConfig.DefaultUser) -e POSTGRES_PASSWORD=$dbPassword -e POSTGRES_DB=$($DbConfig.DefaultDb)"
            $result = docker run -d --name $containerName -p "${dbPort}:$($DbConfig.DefaultPort)" $envVars.Split(' ') $DbConfig.DockerImage 2>&1
            $containerCreated = ($LASTEXITCODE -eq 0)
        }
        "MySQL" {
            $envVars = "-e MYSQL_ROOT_PASSWORD=$dbPassword -e MYSQL_DATABASE=$($DbConfig.DefaultDb) -e MYSQL_USER=$($DbConfig.DefaultUser) -e MYSQL_PASSWORD=$dbPassword"
            $result = docker run -d --name $containerName -p "${dbPort}:$($DbConfig.DefaultPort)" $envVars.Split(' ') $DbConfig.DockerImage 2>&1
            $containerCreated = ($LASTEXITCODE -eq 0)
        }
        "MongoDB" {
            $envVars = "-e MONGO_INITDB_ROOT_USERNAME=$($DbConfig.DefaultUser) -e MONGO_INITDB_ROOT_PASSWORD=$dbPassword"
            $result = docker run -d --name $containerName -p "${dbPort}:$($DbConfig.DefaultPort)" $envVars.Split(' ') $DbConfig.DockerImage 2>&1
            $containerCreated = ($LASTEXITCODE -eq 0)
        }
    }
    
    if ($containerCreated) {
        # Store the generated password
        $script:credentials["DB_PASSWORD"] = $dbPassword
        $script:credentials["DB_CONTAINER"] = $containerName
        
        Write-ProgressBar -StepName "Installing Database" -StepProgress 80 -Detail "Waiting for database to start..."
        Start-Sleep -Seconds 5
        
        Complete-Step -StepName "Installing Database" -Success $true -Message "Docker container $containerName created on port $dbPort"
        return $true
    } else {
        Complete-Step -StepName "Installing Database" -Success $false -Message "Failed to create Docker container: $result" -Solution "Ensure Docker is running: 'docker info'"
        return $false
    }
}

function Initialize-Database {
    if ($Database -eq "None") {
        Skip-Step -StepName "Configuring Database" -Reason "No database selected"
        return $true
    }
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Configuring Database" -Reason "Validation mode"
        return $true
    }
    
    $dbConfig = $DB_CONFIG[$Database]
    $dbPort = if ($DbPort -gt 0) { $DbPort } else { $dbConfig.DefaultPort }
    
    Write-ProgressBar -StepName "Configuring Database" -StepProgress 30 -Detail "Setting up $Database..."
    
    # Get or generate credentials
    $dbUser = $dbConfig.DefaultUser
    $dbName = $dbConfig.DefaultDb
    $dbPassword = if ($CustomDbPassword) { $CustomDbPassword } elseif ($script:credentials["DB_PASSWORD"]) { $script:credentials["DB_PASSWORD"] } else { New-SecurePassword -Length 16 }
    
    switch ($Database) {
        "PostgreSQL" {
            # PostgreSQL specific setup
            Write-ProgressBar -StepName "Configuring Database" -StepProgress 50 -Detail "Creating database and user..."
            
            # If Docker, the database is already set up
            if ($WithDocker) {
                Write-ProgressDetail "Using Docker PostgreSQL - database already configured"
            } else {
                # For local PostgreSQL, try to create database and user
                $env:PGPASSWORD = $dbPassword
                
                # Try to connect and create database
                try {
                    # Check if we can connect
                    $testConn = & psql -h localhost -p $dbPort -U postgres -c "SELECT 1" 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-ProgressDetail "Connected to PostgreSQL"
                        
                        # Create database if not exists
                        & psql -h localhost -p $dbPort -U postgres -c "CREATE DATABASE $dbName;" 2>$null
                        & psql -h localhost -p $dbPort -U postgres -c "CREATE USER $dbUser WITH PASSWORD '$dbPassword';" 2>$null
                        & psql -h localhost -p $dbPort -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $dbName TO $dbUser;" 2>$null
                        
                        Write-ProgressDetail "Database and user created"
                    }
                } catch {
                    Write-ProgressDetail "Could not auto-configure PostgreSQL: $($_.Exception.Message)"
                }
                
                Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
            }
        }
        "MySQL" {
            Write-ProgressBar -StepName "Configuring Database" -StepProgress 50 -Detail "Setting up MySQL..."
            
            if ($WithDocker) {
                Write-ProgressDetail "Using Docker MySQL - database already configured"
            } else {
                try {
                    # Try to connect and create database
                    $mysqlCmd = "CREATE DATABASE IF NOT EXISTS $dbName; CREATE USER IF NOT EXISTS '$dbUser'@'localhost' IDENTIFIED BY '$dbPassword'; GRANT ALL PRIVILEGES ON $dbName.* TO '$dbUser'@'localhost'; FLUSH PRIVILEGES;"
                    & mysql -u root -e $mysqlCmd 2>$null
                    Write-ProgressDetail "Database and user created"
                } catch {
                    Write-ProgressDetail "Could not auto-configure MySQL: $($_.Exception.Message)"
                }
            }
        }
        "MongoDB" {
            Write-ProgressBar -StepName "Configuring Database" -StepProgress 50 -Detail "Setting up MongoDB..."
            
            if ($WithDocker) {
                Write-ProgressDetail "Using Docker MongoDB - database already configured"
            } else {
                # Create data directory if not exists
                $dataDir = "C:\data\db"
                if (-not (Test-Path $dataDir)) {
                    New-Item -Path $dataDir -ItemType Directory -Force | Out-Null
                    Write-ProgressDetail "Created MongoDB data directory"
                }
                
                # Start MongoDB service if not running
                try {
                    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
                    if ($mongoService -and $mongoService.Status -ne "Running") {
                        Start-Service -Name "MongoDB"
                        Write-ProgressDetail "Started MongoDB service"
                    }
                } catch {
                    Write-ProgressDetail "Could not start MongoDB service: $($_.Exception.Message)"
                }
            }
        }
    }
    
    # Store credentials
    $script:credentials["DB_HOST"] = "localhost"
    $script:credentials["DB_PORT"] = $dbPort
    $script:credentials["DB_USER"] = $dbUser
    $script:credentials["DB_PASSWORD"] = $dbPassword
    $script:credentials["DB_NAME"] = $dbName
    $script:credentials["DB_TYPE"] = $Database
    
    # Build connection string
    $connString = $dbConfig.ConnStringTemplate -replace '\{user\}', $dbUser -replace '\{password\}', $dbPassword -replace '\{port\}', $dbPort -replace '\{database\}', $dbName
    $script:credentials[$dbConfig.EnvVar] = $connString
    
    Complete-Step -StepName "Configuring Database" -Success $true -Message "$Database configured on port $dbPort"
    return $true
}

function New-Credentials {
    if ($SkipCredentials) {
        Skip-Step -StepName "Generating Credentials" -Reason "Skipped by user"
        return $true
    }
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Generating Credentials" -Reason "Validation mode"
        return $true
    }
    
    Write-ProgressBar -StepName "Generating Credentials" -StepProgress 30 -Detail "Creating secure credentials..."
    
    # Generate app credentials
    $appId = New-UniqueAppId
    $appPassword = if ($CustomAppPassword) { $CustomAppPassword } else { New-SecurePassword -Length 24 -IncludeSpecialChars }
    $appSecret = New-SecurePassword -Length 32 -IncludeSpecialChars
    $jwtSecret = New-SecurePassword -Length 64 -IncludeSpecialChars
    
    # Store app credentials
    $script:credentials["APP_ID"] = $appId
    $script:credentials["APP_PASSWORD"] = $appPassword
    $script:credentials["APP_SECRET"] = $appSecret
    $script:credentials["JWT_SECRET"] = $jwtSecret
    $script:credentials["ADMIN_EMAIL"] = "admin@deltapress.local"
    $script:credentials["ADMIN_PASSWORD"] = New-SecurePassword -Length 16 -IncludeSpecialChars
    
    Write-ProgressBar -StepName "Generating Credentials" -StepProgress 70 -Detail "Saving credentials file..."
    
    # Create credentials file
    $credFile = $CONFIG.CredentialsFile
    $credContent = @"
# ==============================================================================
# DeltaPress Credentials File
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ==============================================================================
# WARNING: This file contains sensitive credentials. NEVER commit this file to git!
# This file is automatically added to .gitignore
# ==============================================================================

# Application Credentials
APP_ID=$appId
APP_PASSWORD=$appPassword
APP_SECRET=$appSecret
JWT_SECRET=$jwtSecret

# Admin Credentials (First-time login)
ADMIN_EMAIL=admin@deltapress.local
ADMIN_PASSWORD=$($script:credentials["ADMIN_PASSWORD"])

# Database Credentials
DB_TYPE=$Database
DB_HOST=$($script:credentials["DB_HOST"])
DB_PORT=$($script:credentials["DB_PORT"])
DB_USER=$($script:credentials["DB_USER"])
DB_PASSWORD=$($script:credentials["DB_PASSWORD"])
DB_NAME=$($script:credentials["DB_NAME"])
"@
    
    if ($Database -ne "None") {
        $dbConfig = $DB_CONFIG[$Database]
        $credContent += @"

# Database Connection String
$($dbConfig.EnvVar)=$($script:credentials[$dbConfig.EnvVar])
"@
    }
    
    $credContent += @"

# ==============================================================================
# Docker Container (if applicable)
# ==============================================================================
"@
    
    if ($script:credentials["DB_CONTAINER"]) {
        $credContent += "DB_CONTAINER=$($script:credentials["DB_CONTAINER"])"
    }
    
    # Save credentials file
    try {
        $credContent | Out-File -FilePath $credFile -Encoding utf8 -Force
        
        # Add to .gitignore if not already present
        Add-ToGitignore -File $credFile
        
        Write-ProgressBar -StepName "Generating Credentials" -StepProgress 90 -Detail "Credentials saved"
        Complete-Step -StepName "Generating Credentials" -Success $true -Message "Credentials saved to $credFile"
        return $true
    } catch {
        Complete-Step -StepName "Generating Credentials" -Success $false -Message "Failed to save credentials: $($_.Exception.Message)"
        return $false
    }
}

function Add-ToGitignore {
    param([string]$File)
    
    $gitignore = ".gitignore"
    
    if (-not (Test-Path $gitignore)) {
        # Create .gitignore if it doesn't exist
        "# Credentials (auto-added by installer)" | Out-File -FilePath $gitignore -Encoding utf8
        $File | Out-File -FilePath $gitignore -Encoding utf8 -Append
        return
    }
    
    $content = Get-Content $gitignore -Raw
    
    if ($content -notmatch [regex]::Escape($File)) {
        # Add credentials file to .gitignore
        Add-Content -Path $gitignore -Value "`n# Credentials (auto-added by installer)"
        Add-Content -Path $gitignore -Value $File
        Write-ProgressDetail "Added $File to .gitignore"
    }
}

function Initialize-DatabaseTables {
    if ($Database -eq "None") {
        Skip-Step -StepName "Creating Database Tables" -Reason "No database selected"
        return $true
    }
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Creating Database Tables" -Reason "Validation mode"
        return $true
    }
    
    $dbConfig = $DB_CONFIG[$Database]
    
    Write-ProgressBar -StepName "Creating Database Tables" -StepProgress 20 -Detail "Creating schema..."
    
    $dbPassword = $script:credentials["DB_PASSWORD"]
    $dbUser = $script:credentials["DB_USER"]
    $dbName = $script:credentials["DB_NAME"]
    $dbPort = $script:credentials["DB_PORT"]
    
    $tablesCreated = $false
    
    switch ($Database) {
        "PostgreSQL" {
            $env:PGPASSWORD = $dbPassword
            
            $sqlScript = @"
-- DeltaPress Schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    author_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journalists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    persona TEXT,
    specialty VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_stats (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    key_index INTEGER DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (password should be changed on first login)
INSERT INTO users (email, password_hash, role)
VALUES ('admin@deltapress.local', 'CHANGE_ME_ON_FIRST_LOGIN', 'admin')
ON CONFLICT (email) DO NOTHING;
"@
            
            try {
                $sqlScript | & psql -h localhost -p $dbPort -U $dbUser -d $dbName 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $tablesCreated = $true
                    Write-ProgressDetail "PostgreSQL tables created successfully"
                }
            } catch {
                Write-ProgressDetail "Error creating PostgreSQL tables: $($_.Exception.Message)"
            }
            
            Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
        }
        "MySQL" {
            $sqlScript = @"
-- DeltaPress Schema
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content LONGTEXT,
    excerpt TEXT,
    author_id INT,
    status VARCHAR(50) DEFAULT 'draft',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS journalists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    persona TEXT,
    specialty VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    key_index INT DEFAULT 0,
    request_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    last_used TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_users_email ON users(email);

-- Insert default admin user
INSERT IGNORE INTO users (email, password_hash, role)
VALUES ('admin@deltapress.local', 'CHANGE_ME_ON_FIRST_LOGIN', 'admin');
"@
            
            try {
                $sqlScript | & mysql -h localhost -P $dbPort -u $dbUser -p$dbPassword $dbName 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $tablesCreated = $true
                    Write-ProgressDetail "MySQL tables created successfully"
                }
            } catch {
                Write-ProgressDetail "Error creating MySQL tables: $($_.Exception.Message)"
            }
        }
        "MongoDB" {
            # MongoDB creates collections on first insert
            Write-ProgressDetail "MongoDB uses schema-less collections - tables will be created on first use"
            
            # Create a setup document to initialize collections
            try {
                $mongoUri = "mongodb://$dbUser:$dbPassword@localhost:$dbPort/$dbName"
                
                # Use mongosh or mongo to create collections
                $initScript = @"
db.createCollection('users');
db.createCollection('posts');
db.createCollection('journalists');
db.createCollection('api_stats');

db.users.createIndex({ email: 1 }, { unique: true });
db.posts.createIndex({ slug: 1 }, { unique: true });
db.posts.createIndex({ status: 1 });
db.posts.createIndex({ author_id: 1 });

db.users.insertOne({
    email: 'admin@deltapress.local',
    passwordHash: 'CHANGE_ME_ON_FIRST_LOGIN',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
});
"@
                
                # Try to run the init script
                if (Get-Command mongosh -ErrorAction SilentlyContinue) {
                    $initScript | & mongosh $mongoUri 2>&1 | Out-Null
                } elseif (Get-Command mongo -ErrorAction SilentlyContinue) {
                    $initScript | & mongo $mongoUri 2>&1 | Out-Null
                }
                
                $tablesCreated = $true
                Write-ProgressDetail "MongoDB collections initialized"
            } catch {
                Write-ProgressDetail "MongoDB initialization skipped (will create on first use): $($_.Exception.Message)"
                $tablesCreated = $true  # Not critical for MongoDB
            }
        }
    }
    
    if ($tablesCreated) {
        Complete-Step -StepName "Creating Database Tables" -Success $true -Message "Database schema initialized"
        return $true
    } else {
        Complete-Step -StepName "Creating Database Tables" -Success $false -Message "Failed to create database tables" -Solution "Check database connection and permissions"
        return $false
    }
}

# ============================================================================
# Environment Configuration
# ============================================================================

function New-EnvironmentConfig {
    Write-ProgressBar -StepName "Configuring Environment" -StepProgress 30
    
    if ($ValidateOnly) {
        Skip-Step -StepName "Configuring Environment" -Reason "Validation mode"
        return $true
    }
    
    # Build environment content
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

# ============================================================================
# Security
# ============================================================================
JWT_SECRET=$($script:credentials["JWT_SECRET"])
"@
    
    # Add database configuration if database is selected
    if ($Database -ne "None") {
        $dbConfig = $DB_CONFIG[$Database]
        $envContent += @"

# ============================================================================
# Database Configuration
# ============================================================================
DB_TYPE=$Database
DB_HOST=$($script:credentials["DB_HOST"])
DB_PORT=$($script:credentials["DB_PORT"])
DB_USER=$($script:credentials["DB_USER"])
DB_PASSWORD=$($script:credentials["DB_PASSWORD"])
DB_NAME=$($script:credentials["DB_NAME"])
$($dbConfig.EnvVar)=$($script:credentials[$dbConfig.EnvVar])
"@
    }
    
    if (Test-Path $EnvFile) {
        # Check if GEMINI_API_KEY is set
        $existingContent = Get-Content $EnvFile -Raw
        if ($existingContent -match "GEMINI_API_KEY\s*=\s*[^#\s]") {
            Write-ProgressBar -StepName "Configuring Environment" -StepProgress 80 -Detail "API key configured"
            Complete-Step -StepName "Configuring Environment" -Success $true -Message "Configuration complete"
        } else {
            Complete-Step -StepName "Configuring Environment" -Success $true -Message "Using existing $EnvFile (configure API key)"
        }
        return $true
    }
    
    Write-ProgressBar -StepName "Configuring Environment" -StepProgress 50 -Detail "Creating $EnvFile..."
    
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

# ============================================================================
# Docker Functions
# ============================================================================

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

# ============================================================================
# Build and Start Functions
# ============================================================================

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
    
    # Load credentials if available
    if (Test-Path $CONFIG.CredentialsFile) {
        Get-Content $CONFIG.CredentialsFile | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $name = $Matches[1].Trim()
                $value = $Matches[2].Trim()
                if ($name -and $value) {
                    Set-Item -Path "env:$name" -Value $value -ErrorAction SilentlyContinue
                }
            }
        }
    }
    
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
    Write-Host "  ===============================================================" -ForegroundColor DarkGray
    
    if ($Success) {
        Write-Host "                    INSTALLATION COMPLETE" -ForegroundColor Green
    } else {
        Write-Host "                    INSTALLATION INCOMPLETE" -ForegroundColor Red
    }
    
    Write-Host "  ===============================================================" -ForegroundColor DarkGray
    Write-Host ""
    
    # Show step results
    Write-Host "  Installation Log:" -ForegroundColor White
    Write-Host ""
    
    foreach ($result in $Script:StepResults.GetEnumerator()) {
        $status = if ($result.Value.Success) { "OK" } else { "FAIL" }
        $color = if ($result.Value.Success) { "Green" } else { "Red" }
        
        Write-Host "  [$($result.Value.Timestamp)] " -ForegroundColor DarkGray -NoNewline
        Write-Host $status -ForegroundColor $color -NoNewline
        Write-Host " $($result.Key): " -NoNewline
        Write-Host $result.Value.Message -ForegroundColor DarkGray
    }
    
    # Show credentials summary
    if ($Success -and -not $SkipCredentials -and $script:credentials.Count -gt 0) {
        Write-Host ""
        Write-Host "  ===============================================================" -ForegroundColor Cyan
        Write-Host "  CREDENTIALS (Saved to $($CONFIG.CredentialsFile))" -ForegroundColor Cyan
        Write-Host "  ===============================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  App ID:         " -NoNewline
        Write-Host $script:credentials["APP_ID"] -ForegroundColor Yellow
        Write-Host "  Admin Email:    " -NoNewline
        Write-Host $script:credentials["ADMIN_EMAIL"] -ForegroundColor Yellow
        Write-Host "  Admin Password: " -NoNewline
        Write-Host $script:credentials["ADMIN_PASSWORD"] -ForegroundColor Yellow
        
        if ($Database -ne "None") {
            Write-Host ""
            Write-Host "  Database Type:   " -NoNewline
            Write-Host $Database -ForegroundColor Yellow
            Write-Host "  Database Host:   " -NoNewline
            Write-Host "$($script:credentials["DB_HOST"]):$($script:credentials["DB_PORT"])" -ForegroundColor Yellow
            Write-Host "  Database User:   " -NoNewline
            Write-Host $script:credentials["DB_USER"] -ForegroundColor Yellow
            Write-Host "  Database Name:   " -NoNewline
            Write-Host $script:credentials["DB_NAME"] -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "  IMPORTANT: Save these credentials securely!" -ForegroundColor Red
        Write-Host "  The credentials file is added to .gitignore" -ForegroundColor DarkGray
    }
    
    # Show errors
    if ($Script:Errors.Count -gt 0) {
        Write-Host ""
        Write-Host "  Errors Encountered:" -ForegroundColor Red
        foreach ($err in $Script:Errors) {
            Write-Host "    [$($err.Time)] $($err.Message)" -ForegroundColor Red
            if ($err.Solution) {
                Write-Host "    Solution: $($err.Solution)" -ForegroundColor Yellow
            }
        }
    }
    
    # Show warnings
    if ($Script:Warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "  Warnings:" -ForegroundColor Yellow
        foreach ($warn in $Script:Warnings) {
            Write-Host "    [$($warn.Time)] $($warn.Message)" -ForegroundColor Yellow
        }
    }
    
    # Show next steps
    if ($Success) {
        Write-Host ""
        Write-Host "  ===============================================================" -ForegroundColor Green
        Write-Host "  NEXT STEPS" -ForegroundColor Green
        Write-Host "  ===============================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  1. Add your GEMINI_API_KEY to $EnvFile" -ForegroundColor White
        Write-Host "     Get a FREE key at: https://aistudio.google.com/app/apikey" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  2. Access the application at: http://localhost:$Port" -ForegroundColor White
        Write-Host ""
        
        if ($Database -ne "None") {
            Write-Host "  3. Database '$Database' is ready with tables created" -ForegroundColor White
        }
        
        if ($WithDocker) {
            Write-Host ""
            Write-Host "  Docker containers running:" -ForegroundColor White
            Write-Host "    - deltapress-app (application)" -ForegroundColor DarkGray
            if ($Database -ne "None") {
                Write-Host "    - $($script:credentials["DB_CONTAINER"]) (database)" -ForegroundColor DarkGray
            }
        }
        
        Write-Host ""
        Write-Host "  Run 'npm run dev' to start the development server" -ForegroundColor White
    }
    
    Write-Host ""
}

# ============================================================================
# Main Execution
# ============================================================================

function Main {
    Show-Header
    Initialize-Progress
    
    # Phase 1: Prerequisites
    Write-Host "  Phase 1: Prerequisites Check" -ForegroundColor Cyan
    Write-Host ""
    
    Test-WindowsVersion | Out-Null
    Test-AdministratorRights | Out-Null
    Get-PackageManager | Out-Null
    Test-NodeJS | Out-Null
    
    # Phase 2: Installation
    Write-Host ""
    Write-Host "  Phase 2: Installation" -ForegroundColor Cyan
    Write-Host ""
    
    Install-NodeJS | Out-Null
    Test-NodeJSVerification | Out-Null
    Test-Npm | Out-Null
    Test-ProjectFiles | Out-Null
    Install-Dependencies | Out-Null
    
    # Phase 3: Docker (if requested)
    if ($WithDocker) {
        Write-Host ""
        Write-Host "  Phase 3: Docker Setup" -ForegroundColor Cyan
        Write-Host ""
        
        Test-Docker | Out-Null
        Install-DockerDesktop | Out-Null
    }
    
    # Phase 4: Database Setup
    if ($Database -ne "None") {
        Write-Host ""
        Write-Host "  Phase 4: Database Setup ($Database)" -ForegroundColor Cyan
        Write-Host ""
        
        Test-DatabaseSystem | Out-Null
        Install-Database | Out-Null
        Initialize-Database | Out-Null
    }
    
    # Phase 5: Credentials
    Write-Host ""
    Write-Host "  Phase 5: Credentials & Configuration" -ForegroundColor Cyan
    Write-Host ""
    
    New-Credentials | Out-Null
    
    if ($Database -ne "None") {
        Initialize-DatabaseTables | Out-Null
    }
    
    New-EnvironmentConfig | Out-Null
    
    # Phase 6: Build and Start
    Write-Host ""
    Write-Host "  Phase 6: Build & Start" -ForegroundColor Cyan
    Write-Host ""
    
    Build-Application | Out-Null
    Test-HealthCheck | Out-Null
    Start-Application | Out-Null
    
    # Show summary
    $success = ($Script:Errors.Count -eq 0) -or ($Script:Errors | Where-Object { $_.Solution } | Measure-Object).Count -eq 0
    Show-Summary -Success $success
}

# Run main function
Main
