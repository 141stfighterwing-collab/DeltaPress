<#
.SYNOPSIS
    DeltaPress Windows Rollout Script
.DESCRIPTION
    Comprehensive deployment script for DeltaPress on Windows.
    Handles dependencies, Node.js installation, Docker/Host deployment options.
    Features real-time logging, error checking, and validation.

.VERSION
    1.0.0

.EXAMPLE
    .\rollout.ps1 -Mode Docker
    .\rollout.ps1 -Mode Host -InstallNodeJS
    .\rollout.ps1 -Mode Host -Port 8080
    .\rollout.ps1 -CheckOnly
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Docker", "Host", "CheckOnly")]
    [string]$Mode = "Host",

    [Parameter(Mandatory=$false)]
    [switch]$InstallNodeJS,

    [Parameter(Mandatory=$false)]
    [switch]$InstallDocker,

    [Parameter(Mandatory=$false)]
    [int]$Port = 3000,

    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env.local",

    [Parameter(Mandatory=$false)]
    [switch]$SkipDependencies,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose,

    [Parameter(Mandatory=$false)]
    [string]$LogPath = ".\rollout-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

# ============================================================================
# Configuration
# ============================================================================

$CONFIG = @{
    AppName = "DeltaPress"
    Version = "1.3.0"
    RequiredNodeVersion = "18.0.0"
    RequiredNpmVersion = "9.0.0"
    RepoUrl = "https://github.com/141stfighterwing-collab/DeltaPress.git"
    DockerImage = "deltapress"
    DockerContainer = "deltapress-app"
}

# Color scheme for output
$COLORS = @{
    Header = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "White"
    Dim = "DarkGray"
}

# ============================================================================
# Logging Functions
# ============================================================================

$Script:LogFile = $null

function Initialize-LogFile {
    param([string]$Path)
    
    try {
        $dir = Split-Path -Parent $Path
        if ($dir -and !(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        $Script:LogFile = [System.IO.File]::CreateText($Path)
        Write-Log "Log file initialized: $Path" -Level Info
    } catch {
        Write-Warning "Could not create log file: $($_.Exception.Message)"
    }
}

function Write-Log {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [ValidateSet("Header", "Success", "Warning", "Error", "Info", "Dim")]
        [string]$Level = "Info"
    )

    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    $prefix = switch ($Level) {
        "Header"  { "════════" }
        "Success" { "✓ PASS  " }
        "Warning" { "⚠ WARN  " }
        "Error"   { "✗ FAIL  " }
        "Info"    { "► INFO  " }
        "Dim"     { "  ·     " }
    }

    $logMessage = "[$timestamp] $prefix $Message"
    
    # Write to console with color
    if ($Host.UI.RawUI) {
        Write-Host $logMessage -ForegroundColor $COLORS[$Level]
    } else {
        Write-Output $logMessage
    }
    
    # Write to log file
    if ($Script:LogFile) {
        $Script:LogFile.WriteLine($logMessage)
        $Script:LogFile.Flush()
    }
}

function Write-Header {
    param([string]$Title)
    
    $line = "═" * 70
    Write-Log $line -Level Header
    Write-Log "  $Title" -Level Header
    Write-Log $line -Level Header
}

function Close-LogFile {
    if ($Script:LogFile) {
        $Script:LogFile.Close()
    }
}

# ============================================================================
# Error Handling
# ============================================================================

$Script:Errors = @()
$Script:Warnings = @()

function Register-Error {
    param([string]$Message, [Exception]$Exception = $null)
    
    $errorRecord = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Message = $Message
        Exception = $Exception
    }
    $Script:Errors += $errorRecord
    Write-Log $Message -Level Error
    if ($Exception) {
        Write-Log "Exception: $($Exception.Message)" -Level Dim
    }
}

function Register-Warning {
    param([string]$Message)
    
    $Script:Warnings += @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Message = $Message
    }
    Write-Log $Message -Level Warning
}

function Test-ContinueOnError {
    param([string]$Message)
    
    Write-Log $Message -Level Warning
    Write-Log "Continue anyway? (Y/N): " -Level Info -NoNewline
    
    $response = Read-Host
    return $response -eq 'Y' -or $response -eq 'y'
}

# ============================================================================
# System Checks
# ============================================================================

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-WindowsVersion {
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem
        return @{
            Name = $os.Caption
            Version = $os.Version
            Build = $os.BuildNumber
            Architecture = $os.OSArchitecture
        }
    } catch {
        return $null
    }
}

function Test-WindowsVersion {
    Write-Header "Windows Version Check"
    
    $winVer = Get-WindowsVersion
    if ($winVer) {
        Write-Log "Operating System: $($winVer.Name)" -Level Info
        Write-Log "Version: $($winVer.Version) (Build $($winVer.Build))" -Level Info
        Write-Log "Architecture: $($winVer.Architecture)" -Level Info
        
        # Check minimum Windows 10
        if ([int]$winVer.Build -lt 10240) {
            Register-Warning "Windows 10 or later is recommended for best compatibility"
        }
        
        return $true
    } else {
        Register-Error "Could not determine Windows version"
        return $false
    }
}

function Test-AdminPrivileges {
    Write-Header "Administrator Privileges Check"
    
    if (Test-Administrator) {
        Write-Log "Running with Administrator privileges" -Level Success
        return $true
    } else {
        Write-Log "NOT running as Administrator" -Level Warning
        Write-Log "Some operations may require elevated privileges" -Level Dim
        return $false
    }
}

# ============================================================================
# Package Manager Detection
# ============================================================================

function Get-PackageManager {
    $managers = @()
    
    # Check winget
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        $managers += @{
            Name = "winget"
            Command = "winget"
            Available = $true
        }
    }
    
    # Check Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        $managers += @{
            Name = "chocolatey"
            Command = "choco"
            Available = $true
        }
    }
    
    # Check Scoop
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        $managers += @{
            Name = "scoop"
            Command = "scoop"
            Available = $true
        }
    }
    
    return $managers
}

function Test-PackageManagers {
    Write-Header "Package Manager Detection"
    
    $managers = Get-PackageManager
    
    if ($managers.Count -eq 0) {
        Write-Log "No package managers found" -Level Warning
        Write-Log "Consider installing winget, Chocolatey, or Scoop" -Level Dim
        return $null
    }
    
    foreach ($mgr in $managers) {
        Write-Log "Found: $($mgr.Name)" -Level Success
    }
    
    return $managers[0]  # Return first available
}

# ============================================================================
# Node.js Installation
# ============================================================================

function Get-NodeVersion {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            return $nodeVersion -replace 'v', ''
        }
    } catch {}
    return $null
}

function Get-NpmVersion {
    try {
        return npm --version 2>$null
    } catch {}
    return $null
}

function Compare-Version {
    param([string]$Version1, [string]$Version2)
    
    $v1 = $Version1 -split '\.' | ForEach-Object { [int]$_ }
    $v2 = $Version2 -split '\.' | ForEach-Object { [int]$_ }
    
    for ($i = 0; $i -lt [Math]::Max($v1.Count, $v2.Count); $i++) {
        $n1 = if ($i -lt $v1.Count) { $v1[$i] } else { 0 }
        $n2 = if ($i -lt $v2.Count) { $v2[$i] } else { 0 }
        
        if ($n1 -gt $n2) { return 1 }
        if ($n1 -lt $n2) { return -1 }
    }
    return 0
}

function Install-NodeJS {
    Write-Header "Node.js Installation"
    
    $packageManager = Get-PackageManager
    
    if ($packageManager) {
        Write-Log "Installing Node.js via $($packageManager.Name)..." -Level Info
        
        switch ($packageManager.Name) {
            "winget" {
                & winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
            }
            "chocolatey" {
                & choco install nodejs-lts -y
            }
            "scoop" {
                & scoop install nodejs-lts
            }
        }
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Log "Node.js installation completed" -Level Success
        return $true
    } else {
        Write-Log "No package manager available for automatic installation" -Level Error
        Write-Log "Please install Node.js manually from: https://nodejs.org/" -Level Info
        Write-Log "Download the LTS version (18.x or higher)" -Level Dim
        
        # Offer to open download page
        $openBrowser = Read-Host "Open Node.js download page? (Y/N)"
        if ($openBrowser -eq 'Y' -or $openBrowser -eq 'y') {
            Start-Process "https://nodejs.org/en/download/"
        }
        
        return $false
    }
}

function Test-NodeJS {
    Write-Header "Node.js Check"
    
    $nodeVersion = Get-NodeVersion
    
    if ($nodeVersion) {
        Write-Log "Node.js installed: v$nodeVersion" -Level Success
        
        # Check version requirement
        if ((Compare-Version $nodeVersion $CONFIG.RequiredNodeVersion) -ge 0) {
            Write-Log "Version meets requirement (>= $($CONFIG.RequiredNodeVersion))" -Level Success
            
            # Check npm
            $npmVersion = Get-NpmVersion
            if ($npmVersion) {
                Write-Log "npm installed: v$npmVersion" -Level Success
                return $true
            } else {
                Register-Error "npm not found. Node.js installation may be corrupted."
                return $false
            }
        } else {
            Register-Warning "Node.js version $nodeVersion is below recommended $($CONFIG.RequiredNodeVersion)"
            
            if ($InstallNodeJS -or (Test-ContinueOnError "Upgrade Node.js?")) {
                return Install-NodeJS
            }
            return $false
        }
    } else {
        Write-Log "Node.js not found" -Level Warning
        
        if ($InstallNodeJS) {
            return Install-NodeJS
        } else {
            Write-Log "Use -InstallNodeJS switch to install automatically" -Level Info
            return $false
        }
    }
}

# ============================================================================
# Docker Functions
# ============================================================================

function Test-Docker {
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            return $true
        }
    } catch {}
    return $false
}

function Test-DockerRunning {
    try {
        $info = docker info 2>&1
        return $info -notmatch "error"
    } catch {
        return $false
    }
}

function Install-Docker {
    Write-Header "Docker Installation"
    
    if (Test-Docker) {
        Write-Log "Docker is already installed" -Level Success
        return $true
    }
    
    Write-Log "Docker Desktop is required for containerized deployment" -Level Info
    Write-Log "Downloading Docker Desktop..." -Level Info
    
    $dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
    
    try {
        # Download installer
        Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
        Write-Log "Docker Desktop installer downloaded" -Level Success
        
        # Run installer
        Write-Log "Starting Docker Desktop installation..." -Level Info
        Write-Log "This may take several minutes..." -Level Dim
        
        $process = Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Log "Docker Desktop installed successfully" -Level Success
            Write-Log "Please restart your computer and run this script again" -Level Warning
            return $true
        } else {
            Register-Error "Docker installation failed with exit code: $($process.ExitCode)"
            return $false
        }
    } catch {
        Register-Error "Failed to install Docker Desktop" -Exception $_.Exception
        return $false
    }
}

function New-Dockerfile {
    $dockerfileContent = @'
# DeltaPress Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]
'@
    
    return $dockerfileContent
}

function New-DockerCompose {
    param([int]$Port)
    
    $composeContent = @"
# DeltaPress Docker Compose
version: '3.8'

services:
  deltapress:
    build: .
    container_name: deltapress-app
    ports:
      - "${Port}:3000"
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=`${GEMINI_API_KEY}
      - ZAI_API_KEY=`${ZAI_API_KEY}
      - ML_API_KEY=`${ML_API_KEY}
      - KIMI_API_KEY=`${KIMI_API_KEY}
      - SUPABASE_URL=`${SUPABASE_URL}
      - SUPABASE_ANON_KEY=`${SUPABASE_ANON_KEY}
      - CORS_ORIGINS=`${CORS_ORIGINS:-*}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
"@
    
    return $composeContent
}

function Deploy-Docker {
    Write-Header "Docker Deployment"
    
    # Check Docker
    if (!(Test-Docker)) {
        Write-Log "Docker not found" -Level Warning
        
        if ($InstallDocker -or (Test-ContinueOnError "Install Docker Desktop?")) {
            if (!(Install-Docker)) {
                return $false
            }
        } else {
            return $false
        }
    }
    
    # Check Docker is running
    if (!(Test-DockerRunning)) {
        Write-Log "Docker daemon is not running" -Level Error
        Write-Log "Please start Docker Desktop and try again" -Level Info
        
        # Try to start Docker Desktop
        $dockerDesktop = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktop) {
            Write-Log "Attempting to start Docker Desktop..." -Level Info
            Start-Process $dockerDesktop
            Start-Sleep -Seconds 30
            
            if (Test-DockerRunning) {
                Write-Log "Docker Desktop started" -Level Success
            } else {
                return $false
            }
        } else {
            return $false
        }
    }
    
    Write-Log "Docker is running" -Level Success
    
    # Create Dockerfile if not exists
    if (!(Test-Path "Dockerfile")) {
        Write-Log "Creating Dockerfile..." -Level Info
        New-Dockerfile | Out-File -FilePath "Dockerfile" -Encoding utf8
    }
    
    # Create docker-compose.yml
    Write-Log "Creating docker-compose.yml..." -Level Info
    New-DockerCompose -Port $Port | Out-File -FilePath "docker-compose.yml" -Encoding utf8
    
    # Check for .env file
    if (!(Test-Path $EnvFile)) {
        Write-Log "Environment file not found: $EnvFile" -Level Warning
        Write-Log "Creating template environment file..." -Level Info
        
        $envTemplate = @"
# DeltaPress Environment Configuration
# Copy this file and fill in your values

# Required - Primary AI Provider
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - Research provider fallbacks
ZAI_API_KEY=
ML_API_KEY=
KIMI_API_KEY=

# Supabase configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=

# CORS Configuration
CORS_ORIGINS=*
"@
        $envTemplate | Out-File -FilePath $EnvFile -Encoding utf8
        
        Register-Warning "Please edit $EnvFile with your API keys before deployment"
        Write-Log "Press any key after configuring environment variables..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    
    # Build Docker image
    Write-Log "Building Docker image..." -Level Info
    $buildResult = docker build -t "$($CONFIG.DockerImage):latest" . 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Register-Error "Docker build failed"
        Write-Log $buildResult -Level Dim
        return $false
    }
    
    Write-Log "Docker image built successfully" -Level Success
    
    # Stop existing container if running
    $existingContainer = docker ps -a --filter "name=$($CONFIG.DockerContainer)" --format "{{.Names}}" 2>$null
    if ($existingContainer) {
        Write-Log "Stopping existing container..." -Level Info
        docker stop $CONFIG.DockerContainer 2>$null
        docker rm $CONFIG.DockerContainer 2>$null
    }
    
    # Run container
    Write-Log "Starting DeltaPress container..." -Level Info
    
    # Load environment variables
    $envVars = @()
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $envVars += "-e"
                $envVars += "`$($Matches[1])=$($Matches[2])"
            }
        }
    }
    
    $runArgs = @(
        "-d",
        "--name", $CONFIG.DockerContainer,
        "-p", "${Port}:3000",
        "--restart", "unless-stopped"
    ) + $envVars + @($CONFIG.DockerImage)
    
    $containerId = docker run @runArgs 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Register-Error "Failed to start container"
        Write-Log $containerId -Level Dim
        return $false
    }
    
    Write-Log "Container started: $containerId" -Level Success
    
    # Wait for health check
    Write-Log "Waiting for application to start..." -Level Info
    Start-Sleep -Seconds 10
    
    # Verify deployment
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
    
    if ($healthCheck -and $healthCheck.StatusCode -eq 200) {
        Write-Log "DeltaPress is running on http://localhost:$Port" -Level Success
        return $true
    } else {
        Register-Warning "Application may not be ready. Check logs: docker logs $($CONFIG.DockerContainer)"
        return $true
    }
}

# ============================================================================
# Host Deployment Functions
# ============================================================================

function Install-Dependencies {
    Write-Header "Installing Dependencies"
    
    if ($SkipDependencies) {
        Write-Log "Skipping dependency installation" -Level Warning
        return $true
    }
    
    # Check for package.json
    if (!(Test-Path "package.json")) {
        Register-Error "package.json not found. Are you in the project directory?"
        return $false
    }
    
    Write-Log "Installing npm packages..." -Level Info
    Write-Log "This may take a few minutes..." -Level Dim
    
    $installStart = Get-Date
    
    # Run npm install
    $npmProcess = Start-Process -FilePath "npm" -ArgumentList "install" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\npm-install.log" -RedirectStandardError "$env:TEMP\npm-install-error.log"
    
    $installDuration = (Get-Date) - $installStart
    
    if ($npmProcess.ExitCode -eq 0) {
        Write-Log "Dependencies installed successfully" -Level Success
        Write-Log "Installation duration: $($installDuration.TotalSeconds.ToString('F1')) seconds" -Level Dim
        
        # Show package count
        $packageCount = (Get-Content "package-lock.json" | Select-String '"version"' | Measure-Object).Count
        Write-Log "Packages installed: ~$packageCount" -Level Dim
        
        return $true
    } else {
        Register-Error "npm install failed with exit code: $($npmProcess.ExitCode)"
        
        # Show error details
        if (Test-Path "$env:TEMP\npm-install-error.log") {
            $errors = Get-Content "$env:TEMP\npm-install-error.log" -Tail 20
            Write-Log "Error details:" -Level Dim
            $errors | ForEach-Object { Write-Log "  $_" -Level Dim }
        }
        
        return $false
    }
}

function New-EnvFile {
    Write-Log "Creating environment configuration..." -Level Info
    
    if (Test-Path $EnvFile) {
        Write-Log "Environment file exists: $EnvFile" -Level Success
        return $true
    }
    
    Write-Log "Creating template environment file: $EnvFile" -Level Warning
    
    $envTemplate = @"
# DeltaPress Environment Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# ============================================================================
# REQUIRED - Primary AI Provider
# ============================================================================
GEMINI_API_KEY=

# ============================================================================
# OPTIONAL - Research Provider Fallbacks
# Supports multiple keys separated by commas
# ============================================================================
ZAI_API_KEY=
ML_API_KEY=
KIMI_API_KEY=

# ============================================================================
# Supabase Configuration
# ============================================================================
SUPABASE_URL=
SUPABASE_ANON_KEY=

# ============================================================================
# Server Configuration
# ============================================================================
PORT=$Port
NODE_ENV=development

# ============================================================================
# CORS Configuration
# Comma-separated list of allowed origins
# ============================================================================
CORS_ORIGINS=http://localhost:$Port,http://localhost:5173
"@
    
    $envTemplate | Out-File -FilePath $EnvFile -Encoding utf8
    
    Write-Log "Template created. Please configure your API keys!" -Level Warning
    return $true
}

function Start-HostServer {
    Write-Header "Starting Host Server"
    
    # Check for environment file
    if (!(Test-Path $EnvFile)) {
        New-EnvFile
    }
    
    # Load environment variables
    Write-Log "Loading environment variables..." -Level Info
    
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Log "Set: $name" -Level Dim
        }
    }
    
    # Check if port is available
    $portInUse = netstat -ano | Select-String ":$Port\s" | Select-Object -First 1
    
    if ($portInUse) {
        Register-Warning "Port $Port may already be in use"
        Write-Log $portInUse -Level Dim
        
        if (!(Test-ContinueOnError "Port $Port may be in use. Continue?")) {
            return $false
        }
    }
    
    # Start the server
    Write-Log "Starting DeltaPress on port $Port..." -Level Info
    Write-Log "Press Ctrl+C to stop the server" -Level Dim
    Write-Log ""
    
    # Set PORT environment variable
    $env:PORT = $Port
    
    # Start server in new window or background
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "npm"
    $startInfo.Arguments = "run dev"
    $startInfo.UseShellExecute = $true
    $startInfo.CreateNoWindow = $false
    $startInfo.WindowStyle = "Normal"
    
    $process = [System.Diagnostics.Process]::Start($startInfo)
    
    Write-Log "Server started (PID: $($process.Id))" -Level Success
    
    # Wait and check health
    Start-Sleep -Seconds 5
    
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
    
    if ($healthCheck -and $healthCheck.StatusCode -eq 200) {
        Write-Log "DeltaPress is running at: http://localhost:$Port" -Level Success
        Write-Log "Health check passed" -Level Success
        
        # Open browser
        Write-Log "Opening browser..." -Level Info
        Start-Process "http://localhost:$Port"
        
        return $true
    } else {
        Write-Log "Server may still be starting. Check console output." -Level Warning
        return $true
    }
}

# ============================================================================
# Validation Functions
# ============================================================================

function Test-ProjectFiles {
    Write-Header "Project File Validation"
    
    $requiredFiles = @(
        "package.json",
        "server.ts",
        "App.tsx",
        "index.html",
        "tsconfig.json",
        "vite.config.ts"
    )
    
    $allPresent = $true
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Log "Found: $file" -Level Success
        } else {
            Register-Error "Missing: $file"
            $allPresent = $false
        }
    }
    
    return $allPresent
}

function Test-Configuration {
    Write-Header "Configuration Validation"
    
    # Check environment file
    if (Test-Path $EnvFile) {
        Write-Log "Environment file: $EnvFile" -Level Success
        
        # Check for required variables
        $envContent = Get-Content $EnvFile
        
        $requiredVars = @("GEMINI_API_KEY")
        $optionalVars = @("SUPABASE_URL", "SUPABASE_ANON_KEY", "ZAI_API_KEY", "ML_API_KEY", "KIMI_API_KEY")
        
        foreach ($var in $requiredVars) {
            $line = $envContent | Select-String "^$var=(.+)$"
            if ($line -and $line.Matches.Groups[1].Value -and $line.Matches.Groups[1].Value -ne "") {
                Write-Log "$var is configured" -Level Success
            } else {
                Register-Error "Required variable not set: $var"
            }
        }
        
        foreach ($var in $optionalVars) {
            $line = $envContent | Select-String "^$var=(.+)$"
            if ($line -and $line.Matches.Groups[1].Value -and $line.Matches.Groups[1].Value -ne "") {
                Write-Log "$var is configured" -Level Success
            } else {
                Write-Log "$var not set (optional)" -Level Dim
            }
        }
    } else {
        Register-Warning "Environment file not found: $EnvFile"
    }
    
    return $true
}

function Invoke-HealthCheck {
    param([int]$Port)
    
    Write-Header "Health Check"
    
    $url = "http://localhost:$Port/api/health"
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            
            Write-Log "Status: $($data.status)" -Level Success
            Write-Log "Version: $($data.version)" -Level Info
            Write-Log "Uptime: $([math]::Round($data.uptime, 1)) seconds" -Level Info
            
            return $true
        }
    } catch {
        Register-Error "Health check failed: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# Report Generation
# ============================================================================

function New-DeploymentReport {
    param([bool]$Success)
    
    Write-Header "Deployment Report"
    
    $report = @"

╔══════════════════════════════════════════════════════════════════════╗
║                    DeltaPress Deployment Report                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  Timestamp:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
║  Mode:         $Mode
║  Port:         $Port
║  Success:      $Success
╠══════════════════════════════════════════════════════════════════════╣
║  Errors:       $($Script:Errors.Count)
║  Warnings:     $($Script:Warnings.Count)
╚══════════════════════════════════════════════════════════════════════╝

"@

    Write-Log $report -Level Info
    
    if ($Script:Errors.Count -gt 0) {
        Write-Log "Errors:" -Level Error
        foreach ($err in $Script:Errors) {
            Write-Log "  [$($err.Timestamp)] $($err.Message)" -Level Error
        }
    }
    
    if ($Script:Warnings.Count -gt 0) {
        Write-Log "Warnings:" -Level Warning
        foreach ($warn in $Script:Warnings) {
            Write-Log "  [$($warn.Timestamp)] $($warn.Message)" -Level Warning
        }
    }
    
    # Save report to file
    $reportPath = ".\deployment-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $report | Out-File -FilePath $reportPath -Encoding utf8
    Write-Log "Report saved to: $reportPath" -Level Info
}

# ============================================================================
# Main Execution
# ============================================================================

function Main {
    $startTime = Get-Date
    
    # Initialize logging
    Initialize-LogFile -Path $LogPath
    
    Write-Header "DeltaPress Windows Rollout v$($CONFIG.Version)"
    Write-Log "Deployment Mode: $Mode" -Level Info
    Write-Log "Log File: $LogPath" -Level Dim
    Write-Log ""
    
    # System checks
    Test-WindowsVersion | Out-Null
    $isAdmin = Test-AdminPrivileges
    Test-PackageManagers | Out-Null
    
    # Check Node.js
    $nodeReady = Test-NodeJS
    
    if ($Mode -eq "CheckOnly") {
        Write-Header "Check-Only Mode Complete"
        Test-ProjectFiles | Out-Null
        Test-Configuration | Out-Null
        
        New-DeploymentReport -Success $nodeReady
        Close-LogFile
        return
    }
    
    if (!$nodeReady) {
        Register-Error "Node.js is required but not available"
        New-DeploymentReport -Success $false
        Close-LogFile
        return
    }
    
    # Validate project
    if (!(Test-ProjectFiles)) {
        Register-Error "Project validation failed"
        New-DeploymentReport -Success $false
        Close-LogFile
        return
    }
    
    # Mode-specific deployment
    $success = $false
    
    switch ($Mode) {
        "Docker" {
            $success = Deploy-Docker
        }
        "Host" {
            # Install dependencies
            if (!(Install-Dependencies)) {
                New-DeploymentReport -Success $false
                Close-LogFile
                return
            }
            
            # Validate configuration
            Test-Configuration | Out-Null
            
            # Start server
            $success = Start-HostServer
        }
    }
    
    # Calculate duration
    $duration = (Get-Date) - $startTime
    
    # Generate report
    New-DeploymentReport -Success $success
    
    Write-Log ""
    Write-Log "Total deployment time: $($duration.TotalMinutes.ToString('F1')) minutes" -Level Info
    
    # Close log
    Close-LogFile
    
    # Exit code
    if ($success) {
        exit 0
    } else {
        exit 1
    }
}

# ============================================================================
# Script Entry Point
# ============================================================================

try {
    Main
} catch {
    Write-Log "Fatal error: $($_.Exception.Message)" -Level Error
    Write-Log $_.ScriptStackTrace -Level Dim
    Close-LogFile
    exit 1
}
