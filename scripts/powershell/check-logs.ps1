<#
.SYNOPSIS
    DeltaPress Log Checker
.DESCRIPTION
    Check and analyze application logs with verbose output.
.VERSION
    1.1.0
.EXAMPLE
    .\check-logs.ps1
    .\check-logs.ps1 -Lines 100 -Follow
    .\check-logs.ps1 -Errors
#>

param(
    [int]$Lines = 50,
    [switch]$Follow,
    [switch]$Errors,
    [switch]$Warnings,
    [switch]$Verbose,
    [string]$LogPath = "./logs",
    [switch]$Export
)

$startTime = Get-Date

function Write-LogHeader {
    param([string]$Message)
    Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
    Write-Host "[$(Get-Date -Format 'HH:mm:ss.fff')] $Message" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
}

function Write-LogEntry {
    param(
        [string]$Level,
        [string]$Message,
        [string]$Timestamp
    )
    
    $ts = if ($Timestamp) { $Timestamp } else { Get-Date -Format "HH:mm:ss.fff" }
    
    switch ($Level) {
        "ERROR" { Write-Host "[$ts] " -NoNewline; Write-Host "✗ ERROR  " -BackgroundColor Red -NoNewline; Write-Host " $Message" }
        "WARN"  { Write-Host "[$ts] " -NoNewline; Write-Host "⚠ WARN   " -BackgroundColor Yellow -ForegroundColor Black -NoNewline; Write-Host " $Message" }
        "INFO"  { Write-Host "[$ts] " -NoNewline; Write-Host "ℹ INFO   " -BackgroundColor Blue -NoNewline; Write-Host " $Message" }
        "SUCCESS" { Write-Host "[$ts] " -NoNewline; Write-Host "✓ OK     " -BackgroundColor Green -ForegroundColor Black -NoNewline; Write-Host " $Message" }
        "VERBOSE" { if ($Verbose) { Write-Host "[$ts] " -ForegroundColor Gray -NoNewline; Write-Host "◇ VERBOSE" -BackgroundColor Gray -ForegroundColor Black -NoNewline; Write-Host " $Message" -ForegroundColor Gray } }
        default { Write-Host "[$ts] $Message" }
    }
}

function Find-LogFiles {
    $logs = @()
    
    # Check configured log path
    if (Test-Path $LogPath) {
        $logs += Get-ChildItem $LogPath -Filter "*.log" -Recurse -ErrorAction SilentlyContinue
    }
    
    # Check for common log locations
    $commonPaths = @(
        "./npm-debug.log",
        "./yarn-error.log",
        "./logs",
        "./.logs"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            if ((Get-Item $path) -is [System.IO.DirectoryInfo]) {
                $logs += Get-ChildItem $path -Filter "*.log" -ErrorAction SilentlyContinue
            } else {
                $logs += Get-Item $path
            }
        }
    }
    
    return $logs | Sort-Object LastWriteTime -Descending
}

function Analyze-LogContent {
    param(
        [string[]]$Content
    )
    
    $analysis = @{
        TotalLines = $Content.Count
        Errors = 0
        Warnings = 0
        Info = 0
        Success = 0
        ErrorPatterns = @()
        WarningPatterns = @()
    }
    
    foreach ($line in $Content) {
        if ($line -match "error|failed|exception|critical|fatal|✗") {
            $analysis.Errors++
            if ($analysis.ErrorPatterns.Count -lt 10) {
                $analysis.ErrorPatterns += $line.Substring(0, [Math]::Min(100, $line.Length))
            }
        } elseif ($line -match "warning|warn|deprecated|⚠") {
            $analysis.Warnings++
        } elseif ($line -match "success|completed|started|✓|info") {
            $analysis.Info++
        }
    }
    
    return $analysis
}

# Main execution
Write-LogHeader "DELTAPRESS LOG CHECKER v1.1.0"

Write-LogEntry "INFO" "Scanning for log files..."
Write-LogEntry "VERBOSE" "Log path: $LogPath"

$logFiles = Find-LogFiles

if ($logFiles.Count -eq 0) {
    Write-LogEntry "WARN" "No log files found"
    Write-LogEntry "INFO" "Logs will be created when the application runs"
    Write-LogEntry "INFO" "Start the server with: npm run dev"
    
    # Check if app is running and can generate logs
    Write-LogHeader "REAL-TIME LOG CAPTURE"
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
        Write-LogEntry "SUCCESS" "Application is running - capturing console output..."
        
        # In a real scenario, you could capture stdout/stderr here
        Write-LogEntry "INFO" "Console logs available in terminal running 'npm run dev'"
    } catch {
        Write-LogEntry "WARN" "Application not running"
    }
    
    exit 0
}

Write-LogEntry "SUCCESS" "Found $($logFiles.Count) log file(s)"

foreach ($logFile in $logFiles) {
    $fileSize = [Math]::Round($logFile.Length / 1KB, 2)
    Write-LogEntry "INFO" "File: $($logFile.Name) ($fileSize KB)"
}

# Analyze each log file
Write-LogHeader "LOG ANALYSIS"

$totalErrors = 0
$totalWarnings = 0

foreach ($logFile in $logFiles) {
    Write-LogEntry "INFO" "Analyzing: $($logFile.Name)"
    Write-LogEntry "VERBOSE" "Path: $($logFile.FullName)"
    Write-LogEntry "VERBOSE" "Modified: $($logFile.LastWriteTime)"
    
    $content = Get-Content $logFile.FullName -ErrorAction SilentlyContinue
    
    if ($content) {
        $analysis = Analyze-LogContent -Content $content
        
        Write-LogEntry "VERBOSE" "Total lines: $($analysis.TotalLines)"
        
        if ($analysis.Errors -gt 0) {
            Write-LogEntry "ERROR" "Found $($analysis.Errors) error(s)"
            $totalErrors += $analysis.Errors
        }
        
        if ($analysis.Warnings -gt 0) {
            Write-LogEntry "WARN" "Found $($analysis.Warnings) warning(s)"
            $totalWarnings += $analysis.Warnings
        }
        
        if ($Errors -and $analysis.ErrorPatterns.Count -gt 0) {
            Write-LogEntry "INFO" "Recent errors:"
            foreach ($err in $analysis.ErrorPatterns) {
                Write-Host "    $err" -ForegroundColor Red
            }
        }
    }
}

# Show recent log entries
Write-LogHeader "RECENT LOG ENTRIES (Last $Lines lines)"

$mostRecent = $logFiles | Select-Object -First 1
if ($mostRecent) {
    $content = Get-Content $mostRecent.FullName -Tail $Lines -ErrorAction SilentlyContinue
    
    if ($content) {
        foreach ($line in $content) {
            $ts = Get-Date -Format "HH:mm:ss.fff"
            
            if ($line -match "error|failed|exception|critical|fatal") {
                Write-LogEntry "ERROR" $line $ts
            } elseif ($line -match "warning|warn|deprecated") {
                Write-LogEntry "WARN" $line $ts
            } elseif ($line -match "success|completed|started") {
                Write-LogEntry "SUCCESS" $line $ts
            } else {
                if ($Verbose) {
                    Write-LogEntry "VERBOSE" $line $ts
                } else {
                    Write-Host "[$ts] $line"
                }
            }
        }
    }
}

# Summary
Write-LogHeader "SUMMARY"

$duration = [Math]::Round(((Get-Date) - $startTime).TotalMilliseconds, 0)

Write-Host "Duration:       " -NoNewline; Write-Host "$($duration)ms" -ForegroundColor Gray
Write-Host "Files analyzed: " -NoNewline; Write-Host "$($logFiles.Count)" -ForegroundColor Gray
Write-Host "Total errors:   " -NoNewline
if ($totalErrors -gt 0) {
    Write-Host "$totalErrors" -ForegroundColor Red
} else {
    Write-Host "$totalErrors" -ForegroundColor Green
}

Write-Host "Total warnings: " -NoNewline
if ($totalWarnings -gt 0) {
    Write-Host "$totalWarnings" -ForegroundColor Yellow
} else {
    Write-Host "$totalWarnings" -ForegroundColor Green
}

if ($Follow) {
    Write-LogHeader "FOLLOWING LOGS (Press Ctrl+C to stop)"
    $lastSize = $mostRecent.Length
    
    while ($true) {
        Start-Sleep -Seconds 1
        $currentFile = Get-Item $mostRecent.FullName
        
        if ($currentFile.Length -gt $lastSize) {
            $newContent = Get-Content $mostRecent.FullName -Tail 10
            foreach ($line in $newContent) {
                $ts = Get-Date -Format "HH:mm:ss.fff"
                Write-Host "[$ts] $line"
            }
            $lastSize = $currentFile.Length
        }
    }
}

Write-Host ""
