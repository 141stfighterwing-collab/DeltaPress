<#
.SYNOPSIS
    DeltaPress Windows Service Management
.DESCRIPTION
    Create and manage DeltaPress as a Windows Service for production deployment.
    Uses NSSM (Non-Sucking Service Manager) for reliable service management.

.EXAMPLE
    .\service-manager.ps1 -Action Install
    .\service-manager.ps1 -Action Start
    .\service-manager.ps1 -Action Stop
    .\service-manager.ps1 -Action Uninstall
    .\service-manager.ps1 -Action Status
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Install", "Start", "Stop", "Restart", "Uninstall", "Status")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "DeltaPress",

    [Parameter(Mandatory=$false)]
    [int]$Port = 3000,

    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env.local",

    [Parameter(Mandatory=$false)]
    [string]$NSSMPath = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$CONFIG = @{
    AppPath = $PWD.Path
    NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    NPMPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
}

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($user)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-NSSM {
    Write-Log "Checking for NSSM..."
    
    # Check if already in PATH
    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssm) {
        Write-Log "NSSM found: $($nssm.Source)" -Level Success
        return $nssm.Source
    }
    
    # Check specified path
    if ($NSSMPath -and (Test-Path $NSSMPath)) {
        Write-Log "NSSM found at specified path" -Level Success
        return $NSSMPath
    }
    
    # Download NSSM
    Write-Log "NSSM not found. Downloading..."
    
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $downloadPath = "$env:TEMP\nssm.zip"
    $extractPath = "$env:TEMP\nssm"
    
    try {
        # Download
        Invoke-WebRequest -Uri $nssmUrl -OutFile $downloadPath -UseBasicParsing
        
        # Extract
        Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
        
        # Find architecture
        $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
        $nssmExe = Get-ChildItem -Path $extractPath -Filter "nssm.exe" -Recurse | 
                   Where-Object { $_.FullName -like "*$arch*" } | 
                   Select-Object -First 1
        
        if ($nssmExe) {
            # Copy to a permanent location
            $installPath = "$env:ProgramFiles\NSSM"
            if (!(Test-Path $installPath)) {
                New-Item -ItemType Directory -Path $installPath -Force | Out-Null
            }
            
            Copy-Item $nssmExe.FullName -Destination $installPath -Force
            $nssmPath = Join-Path $installPath "nssm.exe"
            
            # Add to PATH
            $path = [Environment]::GetEnvironmentVariable("PATH", "Machine")
            if ($path -notlike "*$installPath*") {
                [Environment]::SetEnvironmentVariable("PATH", "$path;$installPath", "Machine")
            }
            
            Write-Log "NSSM installed to: $nssmPath" -Level Success
            return $nssmPath
        }
    } catch {
        Write-Log "Failed to download NSSM: $($_.Exception.Message)" -Level Error
        return $null
    }
    
    return $null
}

function Install-Service {
    Write-Log "Installing DeltaPress as Windows Service..."
    
    # Check admin
    if (!(Test-Administrator)) {
        Write-Log "Administrator privileges required for service installation" -Level Error
        Write-Log "Please run PowerShell as Administrator" -Level Warning
        return $false
    }
    
    # Check Node.js
    if (!$CONFIG.NodePath) {
        Write-Log "Node.js not found" -Level Error
        return $false
    }
    
    # Get NSSM
    $nssm = Get-NSSM
    if (!$nssm) {
        Write-Log "Could not obtain NSSM" -Level Error
        return $false
    }
    
    # Check if service already exists
    $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Log "Service '$ServiceName' already exists" -Level Warning
        return $false
    }
    
    # Check environment file
    $envPath = Join-Path $CONFIG.AppPath $EnvFile
    if (!(Test-Path $envPath)) {
        Write-Log "Environment file not found: $envPath" -Level Warning
        Write-Log "Service may not start correctly without proper configuration"
    }
    
    # Create startup script
    $startScript = Join-Path $CONFIG.AppPath "start-service.cmd"
    @"
@echo off
cd /d "$($CONFIG.AppPath)"
set PORT=$Port
set NODE_ENV=production
"$($CONFIG.NodePath)" "$($CONFIG.NPMPath)" start
"@ | Out-File -FilePath $startScript -Encoding ASCII
    
    Write-Log "Created startup script: $startScript"
    
    # Install service using NSSM
    & $nssm install $ServiceName "$startScript"
    
    # Configure service
    & $nssm set $ServiceName AppDirectory $CONFIG.AppPath
    & $nssm set $ServiceName DisplayName "DeltaPress Web Application"
    & $nssm set $ServiceName Description "DeltaPress AI-powered newsroom platform"
    & $nssm set $ServiceName Start SERVICE_AUTO_START
    & $nssm set $ServiceName AppStdout (Join-Path $CONFIG.AppPath "logs\service-stdout.log")
    & $nssm set $ServiceName AppStderr (Join-Path $CONFIG.AppPath "logs\service-stderr.log")
    & $nssm set $ServiceName AppRotateFiles 1
    & $nssm set $ServiceName AppRotateBytes 1048576
    
    # Set environment variables from .env file
    if (Test-Path $envPath) {
        Write-Log "Loading environment variables..."
        Get-Content $envPath | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $name = $Matches[1].Trim()
                $value = $Matches[2].Trim()
                if ($name -and $value) {
                    & $nssm set $ServiceName AppEnvironmentExtra "$name=$value" 2>$null
                    Write-Log "  Set: $name" -Level Success
                }
            }
        }
    }
    
    Write-Log "Service '$ServiceName' installed successfully" -Level Success
    
    # Create log directory
    $logDir = Join-Path $CONFIG.AppPath "logs"
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    return $true
}

function Start-ServiceCustom {
    Write-Log "Starting service '$ServiceName'..."
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (!$service) {
        Write-Log "Service '$ServiceName' not found" -Level Error
        return $false
    }
    
    Start-Service -Name $ServiceName
    
    # Wait for service to start
    $timeout = 30
    $elapsed = 0
    
    while ($elapsed -lt $timeout) {
        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq "Running") {
            Write-Log "Service started successfully" -Level Success
            
            # Health check
            Start-Sleep -Seconds 5
            try {
                $health = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 5
                if ($health.StatusCode -eq 200) {
                    Write-Log "Application health check passed" -Level Success
                    Write-Log "DeltaPress is running at http://localhost:$Port" -Level Success
                }
            } catch {
                Write-Log "Health check failed - application may still be starting" -Level Warning
            }
            
            return $true
        }
        
        Start-Sleep -Seconds 1
        $elapsed++
    }
    
    Write-Log "Service failed to start within $timeout seconds" -Level Error
    return $false
}

function Stop-ServiceCustom {
    Write-Log "Stopping service '$ServiceName'..."
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (!$service) {
        Write-Log "Service '$ServiceName' not found" -Level Error
        return $false
    }
    
    Stop-Service -Name $ServiceName -Force
    
    # Wait for service to stop
    $timeout = 30
    $elapsed = 0
    
    while ($elapsed -lt $timeout) {
        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq "Stopped") {
            Write-Log "Service stopped successfully" -Level Success
            return $true
        }
        
        Start-Sleep -Seconds 1
        $elapsed++
    }
    
    Write-Log "Service failed to stop within $timeout seconds" -Level Error
    return $false
}

function Restart-ServiceCustom {
    Write-Log "Restarting service '$ServiceName'..."
    
    if (Stop-ServiceCustom) {
        Start-Sleep -Seconds 2
        return Start-ServiceCustom
    }
    
    return $false
}

function Uninstall-Service {
    Write-Log "Uninstalling service '$ServiceName'..."
    
    # Check admin
    if (!(Test-Administrator)) {
        Write-Log "Administrator privileges required for service uninstallation" -Level Error
        return $false
    }
    
    $nssm = Get-NSSM
    if (!$nssm) {
        Write-Log "NSSM not found" -Level Error
        return $false
    }
    
    # Stop service first
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Stop-ServiceCustom
    }
    
    # Remove service
    & $nssm remove $ServiceName confirm
    
    # Remove startup script
    $startScript = Join-Path $CONFIG.AppPath "start-service.cmd"
    if (Test-Path $startScript) {
        Remove-Item $startScript -Force
        Write-Log "Removed startup script"
    }
    
    Write-Log "Service '$ServiceName' uninstalled successfully" -Level Success
    return $true
}

function Get-ServiceStatus {
    Write-Log "Service Status for '$ServiceName'"
    Write-Host ""
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    
    if (!$service) {
        Write-Log "Service not installed" -Level Warning
        return
    }
    
    # Display service info
    Write-Host "  Name:       $($service.Name)"
    Write-Host "  Status:     $($service.Status)"
    Write-Host "  Start Type: $($service.StartType)"
    Write-Host ""
    
    # Check application health
    if ($service.Status -eq "Running") {
        try {
            $health = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 5
            if ($health.StatusCode -eq 200) {
                $data = $health.Content | ConvertFrom-Json
                Write-Host "  App Status: Healthy" -ForegroundColor Green
                Write-Host "  Version:    $($data.version)"
                Write-Host "  Uptime:     $([math]::Round($data.uptime, 1)) seconds"
            }
        } catch {
            Write-Host "  App Status: Unhealthy" -ForegroundColor Red
            Write-Host "  Error:      $($_.Exception.Message)"
        }
    }
    
    # Show recent logs
    $logPath = Join-Path $CONFIG.AppPath "logs\service-stdout.log"
    if (Test-Path $logPath) {
        Write-Host ""
        Write-Log "Recent Log Entries:" -Level Info
        Get-Content $logPath -Tail 10 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor DarkGray
        }
    }
}

# Main execution
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║           DeltaPress Service Manager                          ║
╚═══════════════════════════════════════════════════════════════╝

"@

try {
    switch ($Action) {
        "Install"   { Install-Service }
        "Start"     { Start-ServiceCustom }
        "Stop"      { Stop-ServiceCustom }
        "Restart"   { Restart-ServiceCustom }
        "Uninstall" { Uninstall-Service }
        "Status"    { Get-ServiceStatus }
    }
} catch {
    Write-Log "Error: $($_.Exception.Message)" -Level Error
    exit 1
}
