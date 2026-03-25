<#
.SYNOPSIS
    Quick setup script for DeltaPress on Windows
.DESCRIPTION
    Simplified one-click setup that handles common deployment scenarios.
    Automatically detects requirements and installs missing components.

.EXAMPLE
    .\quick-setup.ps1
    .\quick-setup.ps1 -WithDocker
#>

[CmdletBinding()]
param(
    [switch]$WithDocker,
    [switch]$ForceInstall
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Step { param($Message) Write-Host "`n► $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Fail { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "  $Message" -ForegroundColor DarkGray }

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║              DeltaPress Quick Setup v1.0                      ║
║         AI-Powered Newsroom Platform Deployment               ║
╚═══════════════════════════════════════════════════════════════╝

"@

# Step 1: Check Administrator
Write-Step "Checking privileges..."
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Success "Running as Administrator"
} else {
    Write-Info "Not running as Administrator (some features may require elevation)"
}

# Step 2: Check/Install Node.js
Write-Step "Checking Node.js..."
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Success "Node.js $nodeVersion installed"
    } else {
        throw "Not found"
    }
} catch {
    Write-Info "Node.js not found. Installing..."
    
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Info "Installing via winget..."
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        Write-Success "Node.js installed. Please restart terminal and run again."
        exit 0
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Info "Installing via Chocolatey..."
        choco install nodejs-lts -y
        Write-Success "Node.js installed. Please restart terminal and run again."
        exit 0
    } else {
        Write-Fail "No package manager found. Please install Node.js manually:"
        Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
}

# Step 3: Check npm
Write-Step "Checking npm..."
try {
    $npmVersion = npm --version 2>$null
    Write-Success "npm $npmVersion installed"
} catch {
    Write-Fail "npm not found. Reinstall Node.js."
    exit 1
}

# Step 4: Install dependencies
Write-Step "Installing dependencies..."
if (Test-Path "package.json") {
    if ((Test-Path "node_modules") -and !$ForceInstall) {
        Write-Info "node_modules exists. Use -ForceInstall to reinstall."
        Write-Success "Dependencies already installed"
    } else {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dependencies installed"
        } else {
            Write-Fail "npm install failed"
            exit 1
        }
    }
} else {
    Write-Fail "package.json not found. Run this script in the project directory."
    exit 1
}

# Step 5: Environment setup
Write-Step "Setting up environment..."
if (!(Test-Path ".env.local")) {
    Write-Info "Creating .env.local template..."
    @"
# DeltaPress Environment Configuration

# Required - Get your key from: https://aistudio.google.com/
GEMINI_API_KEY=your_key_here

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
    Write-Success "Created .env.local template"
    Write-Host "`n  ⚠ Please edit .env.local and add your GEMINI_API_KEY!" -ForegroundColor Yellow
} else {
    Write-Success ".env.local exists"
    
    # Check if API key is set
    $envContent = Get-Content ".env.local"
    $hasKey = $envContent | Select-String "GEMINI_API_KEY=[^\s]+$" | Where-Object { $_ -notmatch "your_key" }
    if (!$hasKey) {
        Write-Host "`n  ⚠ GEMINI_API_KEY not configured in .env.local!" -ForegroundColor Yellow
    }
}

# Step 6: Docker setup (if requested)
if ($WithDocker) {
    Write-Step "Checking Docker..."
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            Write-Success "Docker installed: $dockerVersion"
            
            # Check if running
            $dockerInfo = docker info 2>&1
            if ($dockerInfo -match "error") {
                Write-Info "Docker not running. Starting Docker Desktop..."
                Start-Process "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
                Start-Sleep -Seconds 30
            }
            Write-Success "Docker is ready"
        } else {
            throw "Not found"
        }
    } catch {
        Write-Fail "Docker not installed"
        Write-Host "  Download Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        Write-Info "Continuing without Docker..."
        $WithDocker = $false
    }
}

# Step 7: Start server
Write-Step "Starting DeltaPress..."
Write-Host ""

if ($WithDocker) {
    Write-Info "Building and starting Docker container..."
    
    # Create Dockerfile if needed
    if (!(Test-Path "Dockerfile")) {
        @"
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 `
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["npm", "start"]
"@ | Out-File -FilePath "Dockerfile" -Encoding utf8
    }
    
    docker build -t deltapress:latest .
    docker run -d -p 3000:3000 --name deltapress-app --env-file .env.local deltapress:latest
    
    Write-Success "DeltaPress running in Docker"
    Write-Host "`n  Access at: http://localhost:3000" -ForegroundColor Cyan
    
} else {
    Write-Info "Starting development server..."
    Write-Host "`n  Starting DeltaPress..." -ForegroundColor Cyan
    Write-Host "  Access at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to stop`n" -ForegroundColor DarkGray
    
    npm run dev
}

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                    Setup Complete!                            ║
╠═══════════════════════════════════════════════════════════════╣
║  Application:  http://localhost:3000                          ║
║  Admin Panel:  http://localhost:3000/#/admin                  ║
║  Health Check: http://localhost:3000/api/health               ║
╚═══════════════════════════════════════════════════════════════╝

"@ 
