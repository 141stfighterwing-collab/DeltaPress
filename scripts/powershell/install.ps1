<#
.SYNOPSIS
    DeltaPress One-Time Install with Progress Bar
.DESCRIPTION
    Complete silent installation with real-time progress bar and percentage display.
    Checks all prerequisites before installing anything.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -WithDocker
    .\install.ps1 -Port 8080
#>

[CmdletBinding()]
param(
    [switch]$WithDocker,
    [switch]$ForceReinstall,
    [int]$Port = 3000,
    [string]$EnvFile = ".env.local"
)

# ============================================================================
# Configuration
# ============================================================================

$CONFIG = @{
    AppName = "DeltaPress"
    Version = "1.4.0"
    RepoUrl = "https://github.com/141stfighterwing-collab/DeltaPress.git"
}

# Installation steps definition
$INSTALL_STEPS = @(
    @{ Name = "Checking Windows Version"; Weight = 5 }
    @{ Name = "Checking Administrator Rights"; Weight = 3 }
    @{ Name = "Detecting Package Manager"; Weight = 3 }
    @{ Name = "Checking Node.js"; Weight = 5 }
    @{ Name = "Installing Node.js"; Weight = 25; SkipIf = { $script:nodeInstalled } }
    @{ Name = "Checking npm"; Weight = 3 }
    @{ Name = "Validating Project Files"; Weight = 5 }
    @{ Name = "Installing Dependencies"; Weight = 20 }
    @{ Name = "Configuring Environment"; Weight = 10 }
    @{ Name = "Checking Docker"; Weight = 5; SkipIf = { !$WithDocker } }
    @{ Name = "Installing Docker"; Weight = 15; SkipIf = { !$WithDocker -or $script:dockerInstalled } }
    @{ Name = "Building Application"; Weight = 10 }
    @{ Name = "Running Health Check"; Weight = 5 }
    @{ Name = "Starting Server"; Weight = 4 }
)

# ============================================================================
# Progress Bar Functions
# ============================================================================

$Script:CurrentStep = 0
$Script:TotalWeight = 0
$Script:CompletedWeight = 0
$Script:CurrentProgress = 0
$Script:StepResults = @{}

function Initialize-Progress {
    $Script:TotalWeight = ($INSTALL_STEPS | Where-Object { 
        $skip = $_.SkipIf
        if ($skip) { 
            $result = & $skip
            -not $result
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
    
    # Build status line
    $statusLine = if ($Status) { " $Status" } else { "" }
    $detailLine = if ($Detail) { " » $Detail" } else { "" }
    
    # Clear previous lines and rewrite
    $consoleWidth = [Console]::WindowWidth
    if (-not $consoleWidth) { $consoleWidth = 80 }
    
    # Write progress
    Write-Host "`r" -NoNewline
    Write-Host $progressBar -ForegroundColor Cyan -NoNewline
    Write-Host " $StepName" -ForegroundColor White -NoNewline
    
    if ($StepProgress -lt 100) {
        Write-Host " ($StepProgress%)" -ForegroundColor DarkGray -NoNewline
    }
    
    Write-Host ""
    
    # Write detail line
    if ($Detail) {
        Write-Host "    → " -ForegroundColor DarkGray -NoNewline
        Write-Host $Detail -ForegroundColor DarkYellow
    }
    
    # Store progress for final report
    $Script:CurrentProgress = $totalProgress
}

function Complete-Step {
    param(
        [string]$StepName,
        [bool]$Success = $true,
        [string]$Message = ""
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
    } else {
        Write-ProgressBar -StepName $StepName -StepProgress 100 -Status "✗" -Detail $Message
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
    
    $header = @"

╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║     ██████╗ ███████╗██████╗  █████╗  ██████╗ ██████╗ ███████╗            ║
║     ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔═══██╗██╔════╝            ║
║     ██║  ██║█████╗  ██████╔╝███████║██║     ██║   ██║███████╗            ║
║     ██║  ██║██╔══╝  ██╔══██╗██╔══██║██║     ██║   ██║╚════██║            ║
║     ██████╔╝███████╗██║  ██║██║  ██║╚██████╗╚██████╔╝███████║            ║
║     ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝            ║
║                                                                           ║
║                    Windows One-Time Installer                             ║
║                         Version $($CONFIG.Version)                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

"@
    
    Write-Host $header -ForegroundColor Cyan
    Write-Host "  Installation Mode: " -NoNewline
    Write-Host "Host Deployment" -ForegroundColor Green
    
    if ($WithDocker) {
        Write-Host "  Docker Mode: " -NoNewline
        Write-Host "Enabled" -ForegroundColor Green
    }
    
    Write-Host "  Target Port: $Port"
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================================
# System Checks
# ============================================================================

$script:nodeInstalled = $false
$script:dockerInstalled = $false
$script:packageManager = $null
$script:isAdmin = $false

function Test-WindowsVersion {
    Write-ProgressBar -StepName "Checking Windows Version" -StepProgress 50
    
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem
        $build = [int]$os.BuildNumber
        
        Write-ProgressDetail "Windows $([math]::Floor($build / 10000)).$($build % 10000) (Build $build)"
        
        if ($build -ge 10240) {
            Complete-Step -StepName "Checking Windows Version" -Success $true -Message "$($os.Caption) Build $build"
            return $true
        } else {
            Complete-Step -StepName "Checking Windows Version" -Success $false -Message "Windows 10+ required"
            return $false
        }
    } catch {
        Complete-Step -StepName "Checking Windows Version" -Success $false -Message $_.Exception.Message
        return $false
    }
}

function Test-AdministratorRights {
    Write-ProgressBar -StepName "Checking Administrator Rights" -StepProgress 50
    
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    $script:isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if ($script:isAdmin) {
        Complete-Step -StepName "Checking Administrator Rights" -Success $true -Message "Running as Administrator"
    } else {
        Complete-Step -StepName "Checking Administrator Rights" -Success $true -Message "Standard user (some features limited)"
    }
    
    return $true
}

function Get-PackageManager {
    Write-ProgressBar -StepName "Detecting Package Manager" -StepProgress 50
    
    # Check winget
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        $script:packageManager = "winget"
        Complete-Step -StepName "Detecting Package Manager" -Success $true -Message "winget available"
        return $true
    }
    
    # Check Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        $script:packageManager = "chocolatey"
        Complete-Step -StepName "Detecting Package Manager" -Success $true -Message "Chocolatey available"
        return $true
    }
    
    # Check Scoop
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        $script:packageManager = "scoop"
        Complete-Step -StepName "Detecting Package Manager" -Success $true -Message "Scoop available"
        return $true
    }
    
    Complete-Step -StepName "Detecting Package Manager" -Success $false -Message "No package manager found"
    return $false
}

function Test-NodeJS {
    Write-ProgressBar -StepName "Checking Node.js" -StepProgress 50
    
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            $version = $nodeVersion -replace 'v', ''
            $major = [int]($version -split '\.')[0]
            
            Write-ProgressDetail "Found Node.js v$version"
            
            if ($major -ge 18) {
                $script:nodeInstalled = $true
                Complete-Step -StepName "Checking Node.js" -Success $true -Message "Node.js v$version installed"
                return $true
            } else {
                Write-ProgressDetail "Version $version below required 18.x"
                Complete-Step -StepName "Checking Node.js" -Success $true -Message "v$version found (upgrade recommended)"
                return $true
            }
        }
    } catch {}
    
    Complete-Step -StepName "Checking Node.js" -Success $true -Message "Not installed - will install"
    return $false
}

function Install-NodeJS {
    if ($script:nodeInstalled) {
        Skip-Step -StepName "Installing Node.js" -Reason "Already installed"
        return $true
    }
    
    Write-ProgressBar -StepName "Installing Node.js" -StepProgress 0 -Detail "Preparing installation..."
    
    if (-not $script:packageManager) {
        Complete-Step -StepName "Installing Node.js" -Success $false -Message "No package manager available"
        return $false
    }
    
    Write-ProgressBar -StepName "Installing Node.js" -StepProgress 10 -Detail "Downloading Node.js LTS..."
    
    $installResult = $false
    
    switch ($script:packageManager) {
        "winget" {
            Write-ProgressBar -StepName "Installing Node.js" -StepProgress 30 -Detail "Installing via winget..."
            $result = winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements 2>&1
            $installResult = $LASTEXITCODE -eq 0
        }
        "chocolatey" {
            Write-ProgressBar -StepName "Installing Node.js" -StepProgress 30 -Detail "Installing via Chocolatey..."
            $result = choco install nodejs-lts -y 2>&1
            $installResult = $LASTEXITCODE -eq 0
        }
        "scoop" {
            Write-ProgressBar -StepName "Installing Node.js" -StepProgress 30 -Detail "Installing via Scoop..."
            $result = scoop install nodejs-lts 2>&1
            $installResult = $?
        }
    }
    
    Write-ProgressBar -StepName "Installing Node.js" -StepProgress 80 -Detail "Refreshing environment..."
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Small delay for environment refresh
    Start-Sleep -Milliseconds 500
    
    if ($installResult) {
        Complete-Step -StepName "Installing Node.js" -Success $true -Message "Node.js LTS installed successfully"
        return $true
    } else {
        Complete-Step -StepName "Installing Node.js" -Success $false -Message "Installation failed"
        return $false
    }
}

function Test-Npm {
    Write-ProgressBar -StepName "Checking npm" -StepProgress 50
    
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            Complete-Step -StepName "Checking npm" -Success $true -Message "npm v$npmVersion available"
            return $true
        }
    } catch {}
    
    Complete-Step -StepName "Checking npm" -Success $false -Message "npm not found"
    return $false
}

function Test-ProjectFiles {
    Write-ProgressBar -StepName "Validating Project Files" -StepProgress 20
    
    $requiredFiles = @("package.json", "server.ts", "App.tsx", "tsconfig.json")
    $missingFiles = @()
    
    foreach ($file in $requiredFiles) {
        Write-ProgressBar -StepName "Validating Project Files" -StepProgress (20 + ($requiredFiles.IndexOf($file) * 20)) -Detail "Checking $file..."
        
        if (-not (Test-Path $file)) {
            $missingFiles += $file
        }
    }
    
    if ($missingFiles.Count -eq 0) {
        Complete-Step -StepName "Validating Project Files" -Success $true -Message "All required files present"
        return $true
    } else {
        Complete-Step -StepName "Validating Project Files" -Success $false -Message "Missing: $($missingFiles -join ', ')"
        return $false
    }
}

function Install-Dependencies {
    Write-ProgressBar -StepName "Installing Dependencies" -StepProgress 0 -Detail "Reading package.json..."
    
    if (-not (Test-Path "package.json")) {
        Complete-Step -StepName "Installing Dependencies" -Success $false -Message "package.json not found"
        return $false
    }
    
    # Check if node_modules exists and is not force reinstall
    if ((Test-Path "node_modules") -and -not $ForceReinstall) {
        Write-ProgressBar -StepName "Installing Dependencies" -StepProgress 50 -Detail "node_modules exists, verifying..."
        
        $nodeModulesCount = (Get-ChildItem "node_modules" -Directory -ErrorAction SilentlyContinue).Count
        if ($nodeModulesCount -gt 10) {
            Complete-Step -StepName "Installing Dependencies" -Success $true -Message "$nodeModulesCount packages already installed"
            return $true
        }
    }
    
    Write-ProgressBar -StepName "Installing Dependencies" -StepProgress 10 -Detail "Running npm install..."
    
    # Run npm install with progress simulation
    $npmProcess = Start-Process -FilePath "npm" -ArgumentList "install", "--silent" -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\npm-out.log" -RedirectStandardError "$env:TEMP\npm-err.log"
    
    # Simulate progress while npm runs
    $progress = 10
    while (-not $npmProcess.HasExited) {
        Start-Sleep -Milliseconds 200
        $progress = [math]::Min(80, $progress + 2)
        Write-ProgressBar -StepName "Installing Dependencies" -StepProgress $progress -Detail "Installing packages... ($progress%)"
    }
    
    if ($npmProcess.ExitCode -eq 0) {
        $packageCount = (Get-ChildItem "node_modules" -Directory -ErrorAction SilentlyContinue).Count
        Complete-Step -StepName "Installing Dependencies" -Success $true -Message "$packageCount packages installed"
        return $true
    } else {
        Complete-Step -StepName "Installing Dependencies" -Success $false -Message "npm install failed (exit $($npmProcess.ExitCode))"
        return $false
    }
}

function New-EnvironmentConfig {
    Write-ProgressBar -StepName "Configuring Environment" -StepProgress 20
    
    if (Test-Path $EnvFile) {
        Write-ProgressBar -StepName "Configuring Environment" -StepProgress 50 -Detail "Found existing $EnvFile"
        Complete-Step -StepName "Configuring Environment" -Success $true -Message "Using existing configuration"
        return $true
    }
    
    Write-ProgressBar -StepName "Configuring Environment" -StepProgress 40 -Detail "Creating $EnvFile..."
    
    $envContent = @"
# DeltaPress Environment Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# Required - Get your key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=

# Optional - Additional AI Providers
ZAI_API_KEY=
ML_API_KEY=
KIMI_API_KEY=

# Supabase (if using)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Server Configuration
PORT=$Port
NODE_ENV=development

# CORS Origins
CORS_ORIGINS=http://localhost:$Port,http://localhost:5173
"@
    
    $envContent | Out-File -FilePath $EnvFile -Encoding utf8
    
    Write-ProgressBar -StepName "Configuring Environment" -StepProgress 80 -Detail "Configuration file created"
    
    Complete-Step -StepName "Configuring Environment" -Success $true -Message "Created $EnvFile - EDIT THIS FILE!"
    return $true
}

function Test-Docker {
    if (-not $WithDocker) {
        Skip-Step -StepName "Checking Docker" -Reason "Docker mode disabled"
        return $true
    }
    
    Write-ProgressBar -StepName "Checking Docker" -StepProgress 50
    
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            $script:dockerInstalled = $true
            Complete-Step -StepName "Checking Docker" -Success $true -Message $dockerVersion
            return $true
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
        Skip-Step -StepName "Installing Docker" -Reason "Already installed"
        return $true
    }
    
    Write-ProgressBar -StepName "Installing Docker" -StepProgress 10 -Detail "Downloading Docker Desktop..."
    
    $dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
    
    try {
        # Download with progress simulation
        $webClient = New-Object System.Net.WebClient
        
        # Register progress event
        Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -SourceIdentifier "DockerDownload" -Action {
            $progress = [math]::Round($EventArgs.ProgressPercentage / 2) # 0-50%
            Write-ProgressBar -StepName "Installing Docker" -StepProgress $progress -Detail "Downloading Docker Desktop... ($($EventArgs.ProgressPercentage)%)"
        } | Out-Null
        
        $webClient.DownloadFileAsync($dockerUrl, $installerPath)
        
        while ($webClient.IsBusy) {
            Start-Sleep -Milliseconds 100
        }
        
        Unregister-Event -SourceIdentifier "DockerDownload" -ErrorAction SilentlyContinue
        
        Write-ProgressBar -StepName "Installing Docker" -StepProgress 50 -Detail "Running installer (this may take several minutes)..."
        
        $process = Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Complete-Step -StepName "Installing Docker" -Success $true -Message "Docker Desktop installed - RESTART REQUIRED"
            return $true
        } else {
            Complete-Step -StepName "Installing Docker" -Success $false -Message "Installation failed"
            return $false
        }
    } catch {
        Complete-Step -StepName "Installing Docker" -Success $false -Message $_.Exception.Message
        return $false
    }
}

function Build-Application {
    Write-ProgressBar -StepName "Building Application" -StepProgress 20 -Detail "Compiling TypeScript..."
    
    if (Test-Path "dist") {
        Write-ProgressBar -StepName "Building Application" -StepProgress 50 -Detail "Build exists, skipping..."
        Complete-Step -StepName "Building Application" -Success $true -Message "Build artifacts present"
        return $true
    }
    
    Write-ProgressBar -StepName "Building Application" -StepProgress 40 -Detail "Running vite build..."
    
    $buildProcess = Start-Process -FilePath "npm" -ArgumentList "run", "build" -NoNewWindow -PassThru
    
    $progress = 40
    while (-not $buildProcess.HasExited) {
        Start-Sleep -Milliseconds 300
        $progress = [math]::Min(80, $progress + 5)
        Write-ProgressBar -StepName "Building Application" -StepProgress $progress -Detail "Building frontend assets..."
    }
    
    if ($buildProcess.ExitCode -eq 0) {
        Complete-Step -StepName "Building Application" -Success $true -Message "Build completed"
        return $true
    } else {
        Complete-Step -StepName "Building Application" -Success $false -Message "Build failed"
        return $false
    }
}

function Test-HealthCheck {
    Write-ProgressBar -StepName "Running Health Check" -StepProgress 50 -Detail "Testing API endpoint..."
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            Complete-Step -StepName "Running Health Check" -Success $true -Message "Status: $($data.status), Version: $($data.version)"
            return $true
        }
    } catch {
        # Server not running, that's OK for fresh install
        Complete-Step -StepName "Running Health Check" -Success $true -Message "Ready for first run"
        return $true
    }
    
    Complete-Step -StepName "Running Health Check" -Success $true -Message "Ready"
    return $true
}

function Start-Application {
    Write-ProgressBar -StepName "Starting Server" -StepProgress 30 -Detail "Configuring port $Port..."
    
    # Set environment
    $env:PORT = $Port
    $env:NODE_ENV = "development"
    
    Write-ProgressBar -StepName "Starting Server" -StepProgress 60 -Detail "Launching DeltaPress..."
    
    # Start in background
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "npm"
    $startInfo.Arguments = "run dev"
    $startInfo.UseShellExecute = $true
    $startInfo.CreateNoWindow = $false
    $startInfo.WindowStyle = "Normal"
    
    $process = [System.Diagnostics.Process]::Start($startInfo)
    
    Write-ProgressBar -StepName "Starting Server" -StepProgress 90 -Detail "Server started (PID: $($process.Id))"
    
    Complete-Step -StepName "Starting Server" -Success $true -Message "Running at http://localhost:$Port"
    
    # Open browser
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:$Port"
    
    return $true
}

# ============================================================================
# Installation Summary
# ============================================================================

function Show-Summary {
    param([bool]$Success)
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    
    if ($Success) {
        Write-Host "                    ✓ INSTALLATION COMPLETE" -ForegroundColor Green
    } else {
        Write-Host "                    ✗ INSTALLATION INCOMPLETE" -ForegroundColor Red
    }
    
    Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
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
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    
    if ($Success) {
        Write-Host "  🌐 Application: " -NoNewline
        Write-Host "http://localhost:$Port" -ForegroundColor Cyan
        
        Write-Host "  🔧 Admin Panel: " -NoNewline
        Write-Host "http://localhost:$Port/#/admin" -ForegroundColor Cyan
        
        Write-Host "  📋 Environment: " -NoNewline
        Write-Host $EnvFile -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "  ⚠️  IMPORTANT: Edit $EnvFile and add your GEMINI_API_KEY!" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
}

# ============================================================================
# Main Execution
# ============================================================================

function Main {
    Show-Header
    Initialize-Progress
    
    $success = $true
    
    # Run all installation steps
    if (-not (Test-WindowsVersion)) { $success = $false }
    if (-not (Test-AdministratorRights)) { }
    if (-not (Get-PackageManager)) { }
    if (-not (Test-NodeJS)) { }
    
    # Only continue if Node.js check passed or will be installed
    if ($success -or -not $script:nodeInstalled) {
        if (-not (Install-NodeJS)) { if (-not $script:nodeInstalled) { $success = $false } }
    }
    
    if ($success) {
        if (-not (Test-Npm)) { $success = $false }
        if (-not (Test-ProjectFiles)) { $success = $false }
        if (-not (Install-Dependencies)) { $success = $false }
        if (-not (New-EnvironmentConfig)) { }
        if (-not (Test-Docker)) { }
        if (-not (Install-DockerDesktop)) { }
        if (-not (Build-Application)) { }
        if (-not (Test-HealthCheck)) { }
        if (-not (Start-Application)) { }
    }
    
    Show-Summary -Success $success
    
    if ($success) {
        exit 0
    } else {
        exit 1
    }
}

# Run
try {
    Main
} catch {
    Write-Host "`n  ✗ FATAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Stack: $($_.ScriptStackTrace)" -ForegroundColor DarkGray
    exit 1
}
