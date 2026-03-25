<#
.SYNOPSIS
    DeltaPress Version Manager
.DESCRIPTION
    Manage versioning and patching for DeltaPress application.
.VERSION
    1.1.0
.EXAMPLE
    .\version-manager.ps1 -Show
    .\version-manager.ps1 -Patch
    .\version-manager.ps1 -Minor
    .\version-manager.ps1 -Major
    .\version-manager.ps1 -SetVersion "2.0.0"
#>

param(
    [switch]$Show,
    [switch]$Patch,
    [switch]$Minor,
    [switch]$Major,
    [string]$SetVersion,
    [string]$ChangelogEntry,
    [switch]$History
)

$versionFile = "./version.json"
$packageFile = "./package.json"

function Write-Header {
    param([string]$Message)
    Write-Host "`n" + "=" * 50 -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
}

function Get-CurrentVersion {
    if (Test-Path $versionFile) {
        $version = Get-Content $versionFile | ConvertFrom-Json
        return $version.version
    }
    return "0.0.0"
}

function Update-Version {
    param(
        [string]$NewVersion,
        [string]$ChangeDescription
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Update version.json
    if (Test-Path $versionFile) {
        $versionData = Get-Content $versionFile | ConvertFrom-Json
    } else {
        $versionData = @{
            version = "0.0.0"
            name = "DeltaPress"
            releaseDate = $timestamp
            changes = @()
            patches = @()
        }
    }
    
    $oldVersion = $versionData.version
    $versionData.version = $NewVersion
    $versionData.releaseDate = (Get-Date -Format "yyyy-MM-dd")
    
    if ($ChangeDescription) {
        $versionData.changes = @($ChangeDescription)
    }
    
    # Add to patches history
    $newPatch = @{
        version = $NewVersion
        date = (Get-Date -Format "yyyy-MM-dd")
        changes = @($ChangeDescription)
    }
    
    $patches = @($newPatch)
    foreach ($p in $versionData.patches) {
        $patches += $p
    }
    $versionData.patches = $patches
    
    $versionData | ConvertTo-Json -Depth 10 | Out-File $versionFile -Encoding UTF8
    
    # Update package.json
    if (Test-Path $packageFile) {
        $packageData = Get-Content $packageFile | ConvertFrom-Json
        $packageData.version = $NewVersion
        $packageData | ConvertTo-Json -Depth 10 | Out-File $packageFile -Encoding UTF8
    }
    
    Write-Host "✓ Version updated: " -ForegroundColor Green -NoNewline
    Write-Host "$oldVersion → $NewVersion" -ForegroundColor Yellow
    Write-Host "✓ Files updated: " -ForegroundColor Green -NoNewline
    Write-Host "version.json, package.json" -ForegroundColor Gray
}

function Increment-Version {
    param(
        [string]$Type,
        [string]$Description
    )
    
    $current = Get-CurrentVersion
    $parts = $current.Split(".")
    
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
    
    switch ($Type) {
        "major" {
            $major++
            $minor = 0
            $patch = 0
        }
        "minor" {
            $minor++
            $patch = 0
        }
        "patch" {
            $patch++
        }
    }
    
    $newVersion = "$major.$minor.$patch"
    
    if (-not $Description) {
        $Description = "$($Type.Substring(0,1).ToUpper() + $Type.Substring(1)) version bump"
    }
    
    Update-Version -NewVersion $newVersion -ChangeDescription $Description
}

function Show-Version {
    Write-Header "DeltaPress Version Information"
    
    if (Test-Path $versionFile) {
        $version = Get-Content $versionFile | ConvertFrom-Json
        
        Write-Host "`nApplication: " -NoNewline
        Write-Host $version.name -ForegroundColor Cyan
        
        Write-Host "Version:     " -NoNewline
        Write-Host $version.version -ForegroundColor Green
        
        Write-Host "Released:    " -NoNewline
        Write-Host $version.releaseDate -ForegroundColor Gray
        
        if ($version.changes) {
            Write-Host "`nLatest Changes:" -ForegroundColor Yellow
            foreach ($change in $version.changes) {
                Write-Host "  • $change" -ForegroundColor White
            }
        }
    } else {
        Write-Host "`n⚠ version.json not found" -ForegroundColor Yellow
    }
    
    if (Test-Path $packageFile) {
        $package = Get-Content $packageFile | ConvertFrom-Json
        Write-Host "`npackage.json version: " -NoNewline
        Write-Host $package.version -ForegroundColor Gray
    }
    
    Write-Host ""
}

function Show-History {
    Write-Header "Version History"
    
    if (Test-Path $versionFile) {
        $version = Get-Content $versionFile | ConvertFrom-Json
        
        Write-Host ""
        foreach ($patch in $version.patches) {
            Write-Host "v$($patch.version) " -ForegroundColor Green -NoNewline
            Write-Host "($($patch.date))" -ForegroundColor Gray
            
            if ($patch.changes) {
                foreach ($change in $patch.changes) {
                    Write-Host "  • $change" -ForegroundColor White
                }
            }
            Write-Host ""
        }
    } else {
        Write-Host "`n⚠ No version history found" -ForegroundColor Yellow
    }
}

# Main execution
if ($Show) {
    Show-Version
    exit 0
}

if ($History) {
    Show-History
    exit 0
}

if ($SetVersion) {
    $description = if ($ChangelogEntry) { $ChangelogEntry } else { "Version set to $SetVersion" }
    Update-Version -NewVersion $SetVersion -ChangeDescription $description
    Show-Version
    exit 0
}

if ($Patch) {
    Increment-Version -Type "patch" -Description $ChangelogEntry
    Show-Version
    exit 0
}

if ($Minor) {
    Increment-Version -Type "minor" -Description $ChangelogEntry
    Show-Version
    exit 0
}

if ($Major) {
    Increment-Version -Type "major" -Description $ChangelogEntry
    Show-Version
    exit 0
}

# Default: show version
Show-Version

Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  .\version-manager.ps1 -Show           Show current version"
Write-Host "  .\version-manager.ps1 -Patch          Increment patch version (x.x.+1)"
Write-Host "  .\version-manager.ps1 -Minor          Increment minor version (x.+1.0)"
Write-Host "  .\version-manager.ps1 -Major          Increment major version (+1.0.0)"
Write-Host "  .\version-manager.ps1 -SetVersion `"2.0.0`"  Set specific version"
Write-Host "  .\version-manager.ps1 -History        Show version history"
Write-Host ""
