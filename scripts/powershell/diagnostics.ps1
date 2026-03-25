<#
.SYNOPSIS
    DeltaPress Diagnostic Script
.DESCRIPTION
    Comprehensive diagnostic tool for checking DeltaPress application health,
    database connectivity, API status, and log analysis.
.VERSION
    1.1.0
.AUTHOR
    DeltaPress Team
.EXAMPLE
    .\diagnostics.ps1 -All
    .\diagnostics.ps1 -Database -AppHealth
    .\diagnostics.ps1 -Logs -Lines 100
#>

param(
    [switch]$All,
    [switch]$Diag,
    [switch]$Database,
    [switch]$AppHealth,
    [switch]$Logs,
    [int]$Lines = 50,
    [string]$LogPath = "./logs",
    [string]$ConfigPath = "./.env.local",
    [switch]$Verbose,
    [switch]$ExportReport,
    [string]$ReportPath = "./diagnostic-report.json"
)

# Version information
$ScriptVersion = "1.1.0"
$ScriptStartTime = Get-Date

# Color output functions
function Write-Header {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Write-Host "`n" -NoNewline
    Write-Host "=" * 70 -ForegroundColor Cyan
    Write-Host "[$timestamp] $Message" -ForegroundColor Cyan
    Write-Host "=" * 70 -ForegroundColor Cyan
}

function Write-SubHeader {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Write-Host "`n[$timestamp] --- $Message ---" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Write-Host "[$timestamp] ✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Error {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Write-Host "[$timestamp] ✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Warning {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Write-Host "[$timestamp] ⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Info {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Write-Host "[$timestamp] ℹ " -ForegroundColor Blue -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Verbose {
    param([string]$Message)
    if ($Verbose) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
        Write-Host "[$timestamp] [VERBOSE] $Message" -ForegroundColor Gray
    }
}

# Diagnostic results object
$DiagnosticResults = @{
    Timestamp = $ScriptStartTime.ToString("yyyy-MM-dd HH:mm:ss")
    Version = $ScriptVersion
    Duration = ""
    Checks = @()
    Summary = @{
        Passed = 0
        Failed = 0
        Warnings = 0
    }
}

function Add-CheckResult {
    param(
        [string]$Category,
        [string]$Check,
        [string]$Status,
        [string]$Message,
        [hashtable]$Details = @{}
    )
    
    $result = @{
        Category = $Category
        Check = $Check
        Status = $Status
        Message = $Message
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
        Details = $Details
    }
    
    $DiagnosticResults.Checks += $result
    
    switch ($Status) {
        "PASS" { $DiagnosticResults.Summary.Passed++ }
        "FAIL" { $DiagnosticResults.Summary.Failed++ }
        "WARN" { $DiagnosticResults.Summary.Warnings++ }
    }
}

<#
.SYNOPSIS
    Check general diagnostics and environment
#>
function Invoke-Diagnostics {
    Write-Header "DIAGNOSTICS CHECK"
    $startTime = Get-Date
    
    Write-SubHeader "Environment Information"
    
    # Check Node.js
    Write-Verbose "Checking Node.js installation..."
    try {
        $nodeVersion = node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Node.js installed: $nodeVersion"
            Add-CheckResult -Category "Environment" -Check "Node.js" -Status "PASS" -Message "Version: $nodeVersion"
        } else {
            Write-Error "Node.js not found"
            Add-CheckResult -Category "Environment" -Check "Node.js" -Status "FAIL" -Message "Node.js not installed"
        }
    } catch {
        Write-Error "Node.js check failed: $_"
        Add-CheckResult -Category "Environment" -Check "Node.js" -Status "FAIL" -Message $_.Exception.Message
    }
    
    # Check npm
    Write-Verbose "Checking npm installation..."
    try {
        $npmVersion = npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "npm installed: v$npmVersion"
            Add-CheckResult -Category "Environment" -Check "npm" -Status "PASS" -Message "Version: v$npmVersion"
        } else {
            Write-Error "npm not found"
            Add-CheckResult -Category "Environment" -Check "npm" -Status "FAIL" -Message "npm not installed"
        }
    } catch {
        Write-Error "npm check failed: $_"
        Add-CheckResult -Category "Environment" -Check "npm" -Status "FAIL" -Message $_.Exception.Message
    }
    
    # Check TypeScript
    Write-Verbose "Checking TypeScript installation..."
    try {
        $tsVersion = npx tsc --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "TypeScript: $tsVersion"
            Add-CheckResult -Category "Environment" -Check "TypeScript" -Status "PASS" -Message $tsVersion
        } else {
            Write-Warning "TypeScript not found (may be dev dependency)"
            Add-CheckResult -Category "Environment" -Check "TypeScript" -Status "WARN" -Message "Not globally installed"
        }
    } catch {
        Write-Warning "TypeScript check skipped"
        Add-CheckResult -Category "Environment" -Check "TypeScript" -Status "WARN" -Message "Check skipped"
    }
    
    Write-SubHeader "Configuration Files"
    
    # Check package.json
    Write-Verbose "Checking package.json..."
    if (Test-Path "./package.json") {
        $packageJson = Get-Content "./package.json" | ConvertFrom-Json
        Write-Success "package.json found - Version: $($packageJson.version)"
        Add-CheckResult -Category "Config" -Check "package.json" -Status "PASS" -Message "Version: $($packageJson.version)" -Details @{ Version = $packageJson.version }
    } else {
        Write-Error "package.json not found"
        Add-CheckResult -Category "Config" -Check "package.json" -Status "FAIL" -Message "File not found"
    }
    
    # Check version.json
    Write-Verbose "Checking version.json..."
    if (Test-Path "./version.json") {
        $versionJson = Get-Content "./version.json" | ConvertFrom-Json
        Write-Success "version.json found - Version: $($versionJson.version)"
        Add-CheckResult -Category "Config" -Check "version.json" -Status "PASS" -Message "Version: $($versionJson.version)" -Details @{ Version = $versionJson.version; ReleaseDate = $versionJson.releaseDate }
    } else {
        Write-Warning "version.json not found"
        Add-CheckResult -Category "Config" -Check "version.json" -Status "WARN" -Message "File not found"
    }
    
    # Check environment file
    Write-Verbose "Checking environment configuration..."
    if (Test-Path $ConfigPath) {
        Write-Success "Environment file found: $ConfigPath"
        $envContent = Get-Content $ConfigPath
        $apiKeys = $envContent | Where-Object { $_ -match "API_KEY" }
        $keyCount = ($apiKeys | Where-Object { $_ -notmatch "^\s*#" -and $_ -match "=" }).Count
        Write-Info "Found $keyCount API key(s) configured"
        Add-CheckResult -Category "Config" -Check "Environment" -Status "PASS" -Message "Configured with $keyCount API key(s)"
    } else {
        Write-Warning "Environment file not found at: $ConfigPath"
        Add-CheckResult -Category "Config" -Check "Environment" -Status "WARN" -Message "File not found"
    }
    
    # Check node_modules
    Write-Verbose "Checking dependencies..."
    if (Test-Path "./node_modules") {
        $moduleCount = (Get-ChildItem "./node_modules" -Directory).Count
        Write-Success "node_modules exists with $moduleCount packages"
        Add-CheckResult -Category "Dependencies" -Check "node_modules" -Status "PASS" -Message "$moduleCount packages installed"
    } else {
        Write-Error "node_modules not found - run 'npm install'"
        Add-CheckResult -Category "Dependencies" -Check "node_modules" -Status "FAIL" -Message "Run 'npm install'"
    }
    
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    Write-Info "Diagnostics completed in $($duration)ms"
}

<#
.SYNOPSIS
    Check database health and connectivity
#>
function Invoke-DatabaseHealthCheck {
    Write-Header "DATABASE HEALTH CHECK"
    $startTime = Get-Date
    
    Write-SubHeader "Supabase Configuration"
    
    # Parse environment file for Supabase settings
    $supabaseUrl = $null
    $supabaseKey = $null
    
    if (Test-Path $ConfigPath) {
        $envContent = Get-Content $ConfigPath
        $supabaseUrl = ($envContent | Where-Object { $_ -match "SUPABASE_URL" }) -replace "SUPABASE_URL\s*=\s*", ""
        $supabaseKey = ($envContent | Where-Object { $_ -match "SUPABASE.*KEY" }) -replace "SUPABASE.*KEY\s*=\s*", ""
    }
    
    if ($supabaseUrl) {
        Write-Success "Supabase URL configured: $supabaseUrl"
        Add-CheckResult -Category "Database" -Check "Supabase URL" -Status "PASS" -Message $supabaseUrl
        
        # Test connectivity
        Write-Verbose "Testing Supabase connectivity..."
        try {
            $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
                Write-Success "Supabase endpoint reachable (HTTP $($response.StatusCode))"
                Add-CheckResult -Category "Database" -Check "Connectivity" -Status "PASS" -Message "HTTP $($response.StatusCode)"
            } else {
                Write-Warning "Supabase returned HTTP $($response.StatusCode)"
                Add-CheckResult -Category "Database" -Check "Connectivity" -Status "WARN" -Message "HTTP $($response.StatusCode)"
            }
        } catch {
            Write-Warning "Could not reach Supabase: $($_.Exception.Message)"
            Add-CheckResult -Category "Database" -Check "Connectivity" -Status "WARN" -Message $_.Exception.Message
        }
    } else {
        Write-Error "Supabase URL not configured"
        Add-CheckResult -Category "Database" -Check "Supabase URL" -Status "FAIL" -Message "Not configured"
    }
    
    if ($supabaseKey) {
        $keyLength = $supabaseKey.Length
        $keyPreview = $supabaseKey.Substring(0, [Math]::Min(10, $keyLength)) + "..."
        Write-Success "Supabase key configured (length: $keyLength chars)"
        Add-CheckResult -Category "Database" -Check "Supabase Key" -Status "PASS" -Message "Key length: $keyLength"
    } else {
        Write-Warning "Supabase key not configured"
        Add-CheckResult -Category "Database" -Check "Supabase Key" -Status "WARN" -Message "Not configured"
    }
    
    Write-SubHeader "Database Tables Check"
    
    # Check if we can query Supabase
    if ($supabaseUrl -and $supabaseKey) {
        Write-Verbose "Attempting to query database tables..."
        try {
            $headers = @{
                "apikey" = $supabaseKey
                "Authorization" = "Bearer $supabaseKey"
            }
            
            # Check posts table
            $postsResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/posts?select=count" -Headers $headers -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
            if ($postsResponse.StatusCode -eq 200) {
                Write-Success "Posts table accessible"
                Add-CheckResult -Category "Database" -Check "Posts Table" -Status "PASS" -Message "Accessible"
            }
            
            # Check journalists table
            $journalistsResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/journalists?select=count" -Headers $headers -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
            if ($journalistsResponse.StatusCode -eq 200) {
                Write-Success "Journalists table accessible"
                Add-CheckResult -Category "Database" -Check "Journalists Table" -Status "PASS" -Message "Accessible"
            }
        } catch {
            Write-Warning "Database query failed: $($_.Exception.Message)"
            Add-CheckResult -Category "Database" -Check "Table Access" -Status "WARN" -Message $_.Exception.Message
        }
    }
    
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    Write-Info "Database health check completed in $($duration)ms"
}

<#
.SYNOPSIS
    Check application health and API status
#>
function Invoke-AppHealthCheck {
    Write-Header "APPLICATION HEALTH CHECK"
    $startTime = Get-Date
    
    $appUrl = "http://localhost:3000"
    
    Write-SubHeader "Server Status"
    
    # Check if server is running
    Write-Verbose "Checking if application server is running..."
    try {
        $response = Invoke-WebRequest -Uri $appUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "Application server is running on $appUrl"
            Add-CheckResult -Category "App" -Check "Server Status" -Status "PASS" -Message "Running on $appUrl"
            
            # Check response time
            $responseTime = $response.Headers["X-Response-Time"]
            if ($responseTime) {
                Write-Info "Response time: $responseTime"
            }
        }
    } catch {
        Write-Warning "Application server not reachable at $appUrl"
        Write-Info "Start the server with: npm run dev"
        Add-CheckResult -Category "App" -Check "Server Status" -Status "WARN" -Message "Not running"
    }
    
    Write-SubHeader "API Endpoints"
    
    # Check proxy endpoints
    $endpoints = @(
        "/api/proxy-research",
        "/api/proxy-gemini-research"
    )
    
    foreach ($endpoint in $endpoints) {
        Write-Verbose "Checking endpoint: $endpoint"
        try {
            $response = Invoke-WebRequest -Uri "$appUrl$endpoint" -Method POST -Body (@{} | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 400) {
                # 400 is expected without proper body
                Write-Success "Endpoint $endpoint is responding"
                Add-CheckResult -Category "App" -Check "Endpoint $endpoint" -Status "PASS" -Message "Responding"
            }
        } catch {
            if ($_.Exception.Response.StatusCode -eq 400) {
                Write-Success "Endpoint $endpoint is responding"
                Add-CheckResult -Category "App" -Check "Endpoint $endpoint" -Status "PASS" -Message "Responding"
            } else {
                Write-Warning "Endpoint $endpoint check failed"
                Add-CheckResult -Category "App" -Check "Endpoint $endpoint" -Status "WARN" -Message "Not accessible"
            }
        }
    }
    
    Write-SubHeader "Build Status"
    
    # Check if build exists
    Write-Verbose "Checking build output..."
    if (Test-Path "./dist") {
        $distSize = (Get-ChildItem "./dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Success "Build output exists (Size: $([Math]::Round($distSize, 2)) MB)"
        Add-CheckResult -Category "Build" -Check "Dist Folder" -Status "PASS" -Message "Size: $([Math]::Round($distSize, 2)) MB"
    } else {
        Write-Info "No build output found (run 'npm run build' for production)"
        Add-CheckResult -Category "Build" -Check "Dist Folder" -Status "WARN" -Message "Not built"
    }
    
    Write-SubHeader "Process Information"
    
    # Check for running Node processes
    Write-Verbose "Checking Node.js processes..."
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            Write-Success "Found $($nodeProcesses.Count) Node.js process(es) running"
            foreach ($proc in $nodeProcesses) {
                Write-Info "  PID: $($proc.Id), Memory: $([Math]::Round($proc.WorkingSet64 / 1MB, 2)) MB"
            }
            Add-CheckResult -Category "App" -Check "Node Processes" -Status "PASS" -Message "$($nodeProcesses.Count) running"
        } else {
            Write-Info "No Node.js processes found"
            Add-CheckResult -Category "App" -Check "Node Processes" -Status "WARN" -Message "None running"
        }
    } catch {
        Write-Warning "Could not check processes"
        Add-CheckResult -Category "App" -Check "Node Processes" -Status "WARN" -Message "Could not check"
    }
    
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    Write-Info "Application health check completed in $($duration)ms"
}

<#
.SYNOPSIS
    Check and analyze application logs
#>
function Invoke-LogsCheck {
    Write-Header "LOGS CHECK"
    $startTime = Get-Date
    
    Write-SubHeader "Log Files"
    
    # Check for log files
    Write-Verbose "Searching for log files..."
    $logFiles = @()
    
    if (Test-Path $LogPath) {
        $logFiles = Get-ChildItem $LogPath -Filter "*.log" -ErrorAction SilentlyContinue
    }
    
    # Also check for npm-debug.log
    if (Test-Path "./npm-debug.log") {
        $logFiles += Get-Item "./npm-debug.log"
    }
    
    if ($logFiles.Count -gt 0) {
        Write-Success "Found $($logFiles.Count) log file(s)"
        Add-CheckResult -Category "Logs" -Check "Log Files" -Status "PASS" -Message "$($logFiles.Count) files found"
        
        foreach ($logFile in $logFiles) {
            $fileSize = [Math]::Round($logFile.Length / 1KB, 2)
            Write-Info "  $($logFile.Name) - $fileSize KB"
        }
    } else {
        Write-Info "No log files found in $LogPath"
        Add-CheckResult -Category "Logs" -Check "Log Files" -Status "WARN" -Message "No log files"
    }
    
    Write-SubHeader "Console Logs Analysis"
    
    # Check for recent logs in console output
    Write-Verbose "Analyzing log patterns..."
    
    # Check for error patterns
    $errorPatterns = @(
        "error",
        "failed",
        "exception",
        "critical",
        "fatal"
    )
    
    $warningPatterns = @(
        "warning",
        "warn",
        "deprecated"
    )
    
    $infoPatterns = @(
        "info",
        "success",
        "started",
        "completed"
    )
    
    Write-Info "Log Pattern Definitions:"
    Write-Host "  Error patterns: " -NoNewline; Write-Host ($errorPatterns -join ", ") -ForegroundColor Red
    Write-Host "  Warning patterns: " -NoNewline; Write-Host ($warningPatterns -join ", ") -ForegroundColor Yellow
    Write-Host "  Info patterns: " -NoNewline; Write-Host ($infoPatterns -join ", ") -ForegroundColor Green
    
    Write-SubHeader "Recent Log Entries"
    
    # Show recent logs if files exist
    if ($logFiles.Count -gt 0) {
        $mostRecent = $logFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        Write-Info "Last $Lines lines from $($mostRecent.Name):"
        
        $content = Get-Content $mostRecent.FullName -Tail $Lines -ErrorAction SilentlyContinue
        if ($content) {
            foreach ($line in $content) {
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
                if ($line -match "error|failed|exception|critical|fatal") {
                    Write-Host "[$timestamp] " -NoNewline; Write-Host $line -ForegroundColor Red
                } elseif ($line -match "warning|warn|deprecated") {
                    Write-Host "[$timestamp] " -NoNewline; Write-Host $line -ForegroundColor Yellow
                } elseif ($line -match "success|completed|started") {
                    Write-Host "[$timestamp] " -NoNewline; Write-Host $line -ForegroundColor Green
                } else {
                    Write-Host "[$timestamp] " -NoNewline; Write-Host $line -ForegroundColor White
                }
            }
        }
    } else {
        Write-Info "No log content to display"
        Write-Info "Logs will be created when the application runs"
    }
    
    Write-SubHeader "Log Recommendations"
    Write-Info "• Consider implementing structured logging (JSON format)"
    Write-Info "• Set up log rotation for production"
    Write-Info "• Monitor error rates and alerting thresholds"
    Write-Info "• Use centralized logging (e.g., LogDNA, Papertrail) for production"
    
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    Write-Info "Logs check completed in $($duration)ms"
}

<#
.SYNOPSIS
    Generate and display summary report
#>
function Invoke-SummaryReport {
    Write-Header "DIAGNOSTIC SUMMARY"
    
    $totalDuration = ((Get-Date) - $ScriptStartTime).TotalMilliseconds
    $DiagnosticResults.Duration = "$([Math]::Round($totalDuration, 2))ms"
    
    Write-Host "`nOverall Results:" -ForegroundColor White
    Write-Host "  Passed:    " -NoNewline; Write-Host "$($DiagnosticResults.Summary.Passed)" -ForegroundColor Green
    Write-Host "  Failed:    " -NoNewline; Write-Host "$($DiagnosticResults.Summary.Failed)" -ForegroundColor Red
    Write-Host "  Warnings:  " -NoNewline; Write-Host "$($DiagnosticResults.Summary.Warnings)" -ForegroundColor Yellow
    Write-Host "`nTotal Duration: " -NoNewline; Write-Host "$($DiagnosticResults.Duration)" -ForegroundColor Cyan
    
    # Health score
    $totalChecks = $DiagnosticResults.Summary.Passed + $DiagnosticResults.Summary.Failed + $DiagnosticResults.Summary.Warnings
    if ($totalChecks -gt 0) {
        $healthScore = [Math]::Round(($DiagnosticResults.Summary.Passed / $totalChecks) * 100, 1)
        Write-Host "`nHealth Score: " -NoNewline
        
        if ($healthScore -ge 90) {
            Write-Host "$healthScore%" -ForegroundColor Green
        } elseif ($healthScore -ge 70) {
            Write-Host "$healthScore%" -ForegroundColor Yellow
        } else {
            Write-Host "$healthScore%" -ForegroundColor Red
        }
    }
    
    # Export report if requested
    if ($ExportReport) {
        $DiagnosticResults | ConvertTo-Json -Depth 10 | Out-File $ReportPath -Encoding UTF8
        Write-Success "Report exported to: $ReportPath"
    }
    
    Write-Header "DIAGNOSTICS COMPLETE"
}

# Main execution
Write-Header "DELTAPRESS DIAGNOSTIC TOOL v$ScriptVersion"
Write-Info "Started at: $($ScriptStartTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Info "Script path: $PSScriptRoot"

if ($All) {
    $Diag = $true
    $Database = $true
    $AppHealth = $true
    $Logs = $true
}

# If no specific check is selected, run all
if (-not ($Diag -or $Database -or $AppHealth -or $Logs)) {
    Write-Info "No specific check selected. Running all checks..."
    $Diag = $true
    $Database = $true
    $AppHealth = $true
    $Logs = $true
}

# Run selected checks
if ($Diag) { Invoke-Diagnostics }
if ($Database) { Invoke-DatabaseHealthCheck }
if ($AppHealth) { Invoke-AppHealthCheck }
if ($Logs) { Invoke-LogsCheck }

# Show summary
Invoke-SummaryReport
