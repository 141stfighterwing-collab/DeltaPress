<#
.SYNOPSIS
    DeltaPress Environment Configuration Helper
.DESCRIPTION
    Interactive script to configure environment variables for DeltaPress.
    Validates API keys and creates proper .env.local file.

.EXAMPLE
    .\configure-env.ps1
    .\configure-env.ps1 -NonInteractive -GEMINI_API_KEY "your-key"
#>

[CmdletBinding()]
param(
    [switch]$NonInteractive,
    [string]$GEMINI_API_KEY,
    [string]$ZAI_API_KEY,
    [string]$ML_API_KEY,
    [string]$KIMI_API_KEY,
    [string]$SUPABASE_URL,
    [string]$SUPABASE_ANON_KEY,
    [string]$CORS_ORIGINS,
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Title)
    Write-Host "`n$Title" -ForegroundColor Cyan
    Write-Host ("─" * 50) -ForegroundColor DarkGray
}

function Read-MaskedInput {
    param([string]$Prompt)
    
    Write-Host "$Prompt : " -NoNewline
    
    $input = ""
    $key = $null
    
    while ($key -ne [ConsoleKey]::Enter) {
        $keyInfo = [Console]::ReadKey($true)
        $key = $keyInfo.Key
        
        if ($key -ne [ConsoleKey]::Enter) {
            $input += $keyInfo.KeyChar
            Write-Host "*" -NoNewline
        }
    }
    
    Write-Host ""
    return $input
}

function Test-ApiKey {
    param([string]$Key, [string]$Provider)
    
    if (!$Key) { return $false }
    
    # Basic validation - keys should be at least 10 chars
    if ($Key.Length -lt 10) {
        Write-Host "  ⚠ Key too short for $Provider" -ForegroundColor Yellow
        return $false
    }
    
    # Provider-specific validation
    switch ($Provider) {
        "Gemini" {
            if ($Key -match "^AIza") {
                Write-Host "  ✓ Valid Gemini API key format" -ForegroundColor Green
                return $true
            }
        }
        "Zhipu" {
            if ($Key -match "^\d+\.[a-zA-Z0-9]+$") {
                Write-Host "  ✓ Valid Zhipu API key format" -ForegroundColor Green
                return $true
            }
        }
    }
    
    # Generic validation
    Write-Host "  ? Key provided for $Provider (format not validated)" -ForegroundColor DarkYellow
    return $true
}

function Get-EnvTemplate {
    param([hashtable]$Values)
    
    return @"
# ============================================================================
# DeltaPress Environment Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ============================================================================

# ============================================================================
# REQUIRED - Primary AI Provider
# Get your API key from: https://aistudio.google.com/app/apikey
# ============================================================================
GEMINI_API_KEY=$($Values.GEMINI_API_KEY)

# ============================================================================
# OPTIONAL - Research Provider Fallbacks
# Multiple keys supported (comma-separated) for load balancing
# ============================================================================
ZAI_API_KEY=$($Values.ZAI_API_KEY)
ML_API_KEY=$($Values.ML_API_KEY)
KIMI_API_KEY=$($Values.KIMI_API_KEY)

# ============================================================================
# Supabase Configuration (Optional)
# Required if using Supabase for authentication and database
# ============================================================================
SUPABASE_URL=$($Values.SUPABASE_URL)
SUPABASE_ANON_KEY=$($Values.SUPABASE_ANON_KEY)

# ============================================================================
# Server Configuration
# ============================================================================
PORT=$($Values.Port)
NODE_ENV=development

# ============================================================================
# CORS Configuration
# Comma-separated list of allowed origins for cross-origin requests
# ============================================================================
CORS_ORIGINS=$($Values.CORS_ORIGINS)
"@
}

# Main
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║         DeltaPress Environment Configuration                  ║
╚═══════════════════════════════════════════════════════════════╝

"@

$values = @{
    GEMINI_API_KEY = $GEMINI_API_KEY
    ZAI_API_KEY = $ZAI_API_KEY
    ML_API_KEY = $ML_API_KEY
    KIMI_API_KEY = $KIMI_API_KEY
    SUPABASE_URL = $SUPABASE_URL
    SUPABASE_ANON_KEY = $SUPABASE_ANON_KEY
    CORS_ORIGINS = $CORS_ORIGINS
    Port = $Port
}

# Check for existing config
$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "Found existing .env.local file" -ForegroundColor Yellow
    
    if (!$NonInteractive) {
        $overwrite = Read-Host "Overwrite existing configuration? (Y/N)"
        if ($overwrite -ne "Y" -and $overwrite -ne "y") {
            Write-Host "Loading existing values as defaults..." -ForegroundColor DarkGray
            
            # Load existing values
            Get-Content $envFile | ForEach-Object {
                if ($_ -match "^([^#][^=]+)=(.*)$") {
                    $name = $Matches[1].Trim()
                    $value = $Matches[2].Trim()
                    
                    if ($value -and !$values[$name]) {
                        $values[$name] = $value
                    }
                }
            }
        }
    }
}

# Interactive configuration
if (!$NonInteractive) {
    Write-Header "Required Configuration"
    
    Write-Host @"

The Gemini API key is required for DeltaPress to function.
Get your free API key at: https://aistudio.google.com/app/apikey

"@ -ForegroundColor DarkGray

    if (!$values.GEMINI_API_KEY) {
        $values.GEMINI_API_KEY = Read-MaskedInput "GEMINI_API_KEY"
    } else {
        Write-Host "GEMINI_API_KEY: (already set)" -ForegroundColor DarkGray
    }
    
    Test-ApiKey -Key $values.GEMINI_API_KEY -Provider "Gemini"
    
    Write-Header "Optional AI Providers"
    
    Write-Host @"

Additional AI providers can be configured for redundancy.
The system will automatically cycle through available providers.

"@ -ForegroundColor DarkGray

    $configureOptional = Read-Host "Configure optional providers? (Y/N)"
    
    if ($configureOptional -eq "Y" -or $configureOptional -eq "y") {
        # Zhipu AI
        Write-Host "`nZhipu AI (Chinese AI provider):" -ForegroundColor DarkGray
        if (!$values.ZAI_API_KEY) {
            $values.ZAI_API_KEY = Read-Host "  ZAI_API_KEY (leave empty to skip)"
        }
        
        # AI/ML API
        Write-Host "`nAI/ML API (OpenAI-compatible):" -ForegroundColor DarkGray
        if (!$values.ML_API_KEY) {
            $values.ML_API_KEY = Read-Host "  ML_API_KEY (leave empty to skip)"
        }
        
        # Kimi
        Write-Host "`nMoonshot Kimi (Chinese AI):" -ForegroundColor DarkGray
        if (!$values.KIMI_API_KEY) {
            $values.KIMI_API_KEY = Read-Host "  KIMI_API_KEY (leave empty to skip)"
        }
    }
    
    Write-Header "Supabase Configuration"
    
    Write-Host @"

Supabase provides authentication and database features.
Skip this section if not using Supabase.

"@ -ForegroundColor DarkGray

    $configureSupabase = Read-Host "Configure Supabase? (Y/N)"
    
    if ($configureSupabase -eq "Y" -or $configureSupabase -eq "y") {
        if (!$values.SUPABASE_URL) {
            $values.SUPABASE_URL = Read-Host "  SUPABASE_URL"
        }
        if (!$values.SUPABASE_ANON_KEY) {
            $values.SUPABASE_ANON_KEY = Read-MaskedInput "  SUPABASE_ANON_KEY"
        }
    }
    
    Write-Header "Server Configuration"
    
    Write-Host "`nPort number for the application (default: 3000):" -ForegroundColor DarkGray
    $portInput = Read-Host "  PORT"
    if ($portInput) {
        $values.Port = [int]$portInput
    }
    
    Write-Host "`nCORS origins (comma-separated, default: localhost):" -ForegroundColor DarkGray
    Write-Host "  Example: https://example.com,https://admin.example.com" -ForegroundColor DarkGray
    $corsInput = Read-Host "  CORS_ORIGINS"
    if ($corsInput) {
        $values.CORS_ORIGINS = $corsInput
    }
}

# Set defaults
if (!$values.CORS_ORIGINS) {
    $values.CORS_ORIGINS = "http://localhost:$($values.Port),http://localhost:5173"
}

# Generate config
Write-Header "Generating Configuration"

$config = Get-EnvTemplate -Values $values
$config | Out-File -FilePath $envFile -Encoding utf8

Write-Host "Configuration saved to: $envFile" -ForegroundColor Green

# Summary
Write-Header "Configuration Summary"

$providers = @()
if ($values.GEMINI_API_KEY) { $providers += "Gemini" }
if ($values.ZAI_API_KEY) { $providers += "Zhipu AI" }
if ($values.ML_API_KEY) { $providers += "AI/ML API" }
if ($values.KIMI_API_KEY) { $providers += "Moonshot Kimi" }

Write-Host "Configured Providers: $($providers -join ', ')" -ForegroundColor Cyan
Write-Host "Server Port:          $($values.Port)" -ForegroundColor Cyan
Write-Host "CORS Origins:         $($values.CORS_ORIGINS)" -ForegroundColor Cyan

if ($values.SUPABASE_URL) {
    Write-Host "Supabase:             Configured" -ForegroundColor Green
} else {
    Write-Host "Supabase:             Not configured" -ForegroundColor DarkGray
}

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║              Configuration Complete!                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Next steps:                                                  ║
║  1. Run: npm run dev                                          ║
║  2. Open: http://localhost:$($values.Port)                            ║
║  3. Admin: http://localhost:$($values.Port)/#/admin                   ║
╚═══════════════════════════════════════════════════════════════╝

"@
