# DeltaPress

DeltaPress is an AI-assisted newsroom/blog platform built with React, TypeScript, Vite, Express, Supabase, and Gemini.
It combines a traditional publishing UI (posts, pages, admin views) with an automated **journalist agent pipeline** that can research current events and publish generated content.

## Version

**Current Version: 1.6.0**

| Property | Value |
|----------|-------|
| Version | 1.6.0 |
| Release Date | 2025-03-26 |
| Status | Stable |

See [Version History](#version-history) for changelog.

## 📸 Screenshots

### Application Screenshots

| Screenshot | Description |
|------------|-------------|
| ![Homepage](screenshots/screenshot-1.png) | **Homepage** - Blog landing with category explorer |
| ![Newsroom](screenshots/screenshot-2.png) | **Newsroom** - News listing and filtering |
| ![Admin Dashboard](screenshots/screenshot-3.png) | **Admin Dashboard** - System overview and statistics |
| ![Journalists View](screenshots/screenshot-4.png) | **AI Agents** - Journalist agent management |
| ![Agent Configuration](screenshots/screenshot-5.png) | **Agent Config** - Agent persona setup modal |
| ![Diagnostics](screenshots/screenshot-6.png) | **Diagnostics** - System health monitoring |
| ![Post Editor](screenshots/screenshot-7.png) | **Post Editor** - Content creation interface |

### Test Results Screenshots

| Screenshot | Description |
|------------|-------------|
| ![Round Robin Test](screenshots/screenshot-8.png) | **Round Robin Logic** - Provider rotation validation |
| ![Key Rotation Test](screenshots/screenshot-9.png) | **Key Rotation** - Multi-key cycling test |
| ![Fallback Test](screenshots/screenshot-10.png) | **Fallback Logic** - Provider failover test |
| ![Health Check](screenshots/screenshot-11.png) | **Health Check** - Application health status |
| ![Performance Test](screenshots/screenshot-12.png) | **Performance** - Load time validation |

## 📄 Documentation

| Document | Description |
|----------|-------------|
| [Technical Documentation](docs/DeltaPress_Technical_Documentation.pdf) | CORS, Rate Limiting, Model Configurations |
| [Architecture Analysis](docs/DeltaPress_Architecture_Analysis_Report.pdf) | Layered architecture, ERD, API contracts |

## 📦 Dependencies

### Production Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| `@google/genai` | ^1.38.0 | Google Gemini AI SDK for content generation |
| `@supabase/supabase-js` | ^2.93.3 | Supabase client for authentication and database |
| `@vitejs/plugin-react` | ^5.1.2 | Vite plugin for React support |
| `express` | ^5.2.1 | Web server framework |
| `react` | ^19.2.4 | React UI library |
| `react-dom` | ^19.2.4 | React DOM rendering |
| `react-router-dom` | ^7.13.0 | React routing library |
| `tsx` | ^4.21.0 | TypeScript execution engine |
| `vite` | ^7.3.1 | Build tool and dev server |

### Development Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| `@playwright/test` | ^1.42.0 | End-to-end testing framework |
| `@types/node` | ^22.14.0 | TypeScript Node.js type definitions |
| `typescript` | ^5.9.3 | TypeScript compiler |
| `vitest` | ^1.3.0 | Unit testing framework |

### System Requirements

| Requirement | Minimum Version | Recommended |
|-------------|-----------------|-------------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Windows | 10 (Build 10240) | Windows 11 |
| PowerShell | 5.1 | 7.x |
| Docker (optional) | 20.x | 24.x |

### Database Support

| Database | Version | Docker Image | Default Port |
|----------|---------|--------------|--------------|
| PostgreSQL | 16.x | postgres:16-alpine | 5432 |
| MySQL | 8.0.x | mysql:8.0 | 3306 |
| MongoDB | 7.x | mongo:7 | 27017 |

## ✅ Validation & Testing Results

### Installer Validation (v1.6.0)

**Status: ALL TESTS PASSED ✓**

| Phase | Tests | Status | Coverage |
|-------|-------|--------|----------|
| Prerequisites Check | 2 | ✓ PASS | 100% |
| Script Syntax | 4 | ✓ PASS | 100% |
| Function Definitions | 31 | ✓ PASS | 100% |
| Database Functions | 6 | ✓ PASS | 100% |
| Credential Functions | 5 | ✓ PASS | 100% |
| Environment Functions | 3 | ✓ PASS | 100% |
| Error Handling | 6 | ✓ PASS | 100% |
| Logging | 4 | ✓ PASS | 100% |
| Progress Reporting | 7 | ✓ PASS | 100% |
| Installation Steps | 20 | ✓ PASS | 100% |
| **Total** | **90** | **✓ PASS** | **100%** |

### Validation Metrics

| Metric | Value |
|--------|-------|
| Total Lines of Code | 2,001 |
| Try-Catch Coverage | 82.4% (28 blocks) |
| Functions Defined | 31 |
| Installation Steps | 20 |
| Database Support | 3 (PostgreSQL, MySQL, MongoDB) |
| Security Features | Cryptographic RNG, JWT secrets |

### Test Commands

```powershell
# Run validation suite (Python - cross-platform)
python3 scripts/powershell/validate-installer.py --detailed

# Run validation suite (PowerShell - Windows)
.\scripts\powershell\validate-installer.ps1 -Detailed -GenerateReport

# Run end-to-end tests
npm run test

# Run unit tests
npm run test:unit

# Type checking
npm run lint
```

## 🚀 Installation

### One-Click Install (Windows)

The fastest way to get DeltaPress running on Windows with visual progress bar:

```powershell
# Clone and run one-click installer with progress bar
git clone https://github.com/141stfighterwing-collab/DeltaPress.git; cd DeltaPress; .\scripts\powershell\install.ps1
```

**The installer will:**
- ✓ Show real-time progress bar with percentages
- ✓ Check all prerequisites before installing
- ✓ Install Node.js silently (if needed)
- ✓ Install all dependencies
- ✓ Configure environment
- ✓ Start the server automatically

```powershell
# Quick setup (simpler version)
.\scripts\powershell\quick-setup.ps1

# One-click with Docker
.\scripts\powershell\install.ps1 -WithDocker

# Force reinstall dependencies
.\scripts\powershell\install.ps1 -ForceReinstall

# Custom port
.\scripts\powershell\install.ps1 -Port 8080

# With PostgreSQL (default)
.\scripts\powershell\install.ps1 -Database PostgreSQL

# With MySQL
.\scripts\powershell\install.ps1 -Database MySQL

# With MongoDB
.\scripts\powershell\install.ps1 -Database MongoDB

# No database (use Supabase only)
.\scripts\powershell\install.ps1 -Database None

# Docker + PostgreSQL container
.\scripts\powershell\install.ps1 -WithDocker -Database PostgreSQL
```

### Database Installation Options

DeltaPress supports multiple database backends. The installer automatically:

- Installs and configures your chosen database
- Creates database tables and schema
- Generates secure credentials for both app and database
- Saves credentials to `.credentials` file (auto-added to `.gitignore`)

| Database | Default Port | Recommended For | Docker Support |
|----------|-------------|-----------------|----------------|
| **PostgreSQL** (default) | 5432 | Production, scalability | Yes |
| **MySQL** | 3306 | Traditional setups | Yes |
| **MongoDB** | 27017 | Flexible schema | Yes |
| **None** | - | Supabase only | - |

**Database Features:**
- Auto-created users, databases, and tables
- Secure credential generation with unique passwords
- Connection string auto-configuration
- Admin user auto-created in database
- Docker container option for each database type

### Installation Progress Display

The installer shows real-time progress like this:

```
[████████████████░░░░░░░░░░░░░░░░░░░░░░░░] 35% Installing Dependencies → Installing packages... (65%)

    ✓ Node.js v20.10.0 installed
    → Running npm install...
```

### Full Automated Install (Windows)

For complete automated deployment with all checks:

```powershell
# Full rollout with automatic Node.js installation
.\scripts\powershell\rollout.ps1 -Mode Host -InstallNodeJS

# Full rollout with Docker (auto-install Docker if needed)
.\scripts\powershell\rollout.ps1 -Mode Docker -InstallDocker

# Just check system requirements
.\scripts\powershell\rollout.ps1 -Mode CheckOnly
```

### Manual Install (All Platforms)

<details>
<summary>Click to expand manual installation steps</summary>

#### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Git ([Download](https://git-scm.com/))
- API key for Google Gemini ([Get free key](https://aistudio.google.com/app/apikey))

#### Steps

```bash
# 1. Clone the repository
git clone https://github.com/141stfighterwing-collab/DeltaPress.git
cd DeltaPress

# 2. Install dependencies
npm install

# 3. Create environment file
# Windows
copy NUL .env.local
# Linux/macOS
touch .env.local

# 4. Edit .env.local with your API keys
# Minimum required:
# GEMINI_API_KEY=your_key_here

# 5. Start development server
npm run dev
```

</details>

### Install via Docker

```bash
# Build and run with Docker
docker build -t deltapress .
docker run -d -p 3000:3000 --env-file .env.local deltapress

# Or with Docker Compose
docker-compose up -d
```

### Install as Windows Service (Production)

```powershell
# Install as a Windows Service (requires Administrator)
.\scripts\powershell\service-manager.ps1 -Action Install
.\scripts\powershell\service-manager.ps1 -Action Start

# Check status
.\scripts\powershell\service-manager.ps1 -Action Status
```

### Verify Installation

After installation, verify everything is working:

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Or open in browser
start http://localhost:3000/api/health  # Windows
open http://localhost:3000/api/health   # macOS
xdg-open http://localhost:3000/api/health  # Linux
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.4.0",
  "uptime": 10.5
}
```

## What this project includes

- A React frontend with public pages and admin tooling.
- A lightweight Express server used for local dev and proxying research-provider requests.
- AI generation services for article drafting and image generation.
- Agent orchestration for scheduled journalist bots.
- Supabase integration for auth, content persistence, and admin data.
- PowerShell diagnostic scripts for monitoring and health checks.
- **CORS handling** with configurable origin whitelisting.
- **API rate limiting** with per-provider configuration.
- **Model-specific configurations** for optimal API performance.
- **RBAC (Role-Based Access Control)** for secure admin access.
- **Admin API Settings view** for CORS, ENV, and API visibility.

## Quick start

### Prerequisites

- Node.js 18+
- npm
- API keys for at least Gemini (`GEMINI_API_KEY`)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file in the project root (or otherwise provide env vars) with:

```bash
# Required - Primary AI Provider
GEMINI_API_KEY=your_key_here

# Optional - Research provider fallbacks (supports multiple keys with comma separation)
KIMI_API_KEY=your_key_here
ZAI_API_KEY=your_key_here,key2_here,key3_here  # Multiple keys supported
ML_API_KEY=your_key_here

# Supabase client settings (if not hardcoded elsewhere)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# CORS Configuration (optional)
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

### 3) Run in development

```bash
npm run dev
```

The app runs at:

- Frontend + middleware server: `http://localhost:3000`

## Scripts

- `npm run dev` — Starts `server.ts` with `tsx` for local development.
- `npm run build` — Builds the frontend with Vite.
- `npm run preview` — Serves the Vite production preview.
- `npm run lint` — Type-checks the codebase (`tsc --noEmit`).
- `npm run test` — Runs Playwright tests.
- `npm run test:ui` — Runs Playwright tests with UI.
- `npm run test:unit` — Runs unit tests with Vitest.

## CORS Handling

DeltaPress implements configurable CORS (Cross-Origin Resource Sharing) to securely handle cross-origin requests.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `CORS_ORIGINS` | string[] | `localhost:3000, localhost:5173` | Allowed origin URLs |
| Methods | string[] | `GET, POST, PUT, DELETE, OPTIONS` | Allowed HTTP methods |
| Credentials | boolean | `true` | Allow cookies/auth headers |
| Max Age | number | `86400` | Preflight cache duration (seconds) |

### Environment Setup

```bash
# Multiple origins (comma-separated)
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# Wildcard (not recommended for production)
CORS_ORIGINS=*
```

### Preflight Handling

The server automatically handles OPTIONS preflight requests with appropriate headers:
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Credentials`
- `Access-Control-Max-Age`

## API Rate Limiting

Rate limiting protects both the application and external API providers from excessive requests.

### Provider Limits

| Provider | Requests/Min | Cooldown | Notes |
|----------|--------------|----------|-------|
| Google Gemini | 60 | 60 seconds | Higher limits for paid tier |
| Zhipu AI | 30 | 120 seconds | Chinese AI provider |
| AI/ML API | 60 | 60 seconds | OpenAI-compatible |
| Moonshot Kimi | 30 | 120 seconds | Chinese language optimized |

### Rate Limit Headers

All API responses include monitoring headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in window |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds until retry (on 429) |

### Cooldown Mechanism

When a rate limit is exceeded:
1. Provider enters cooldown period
2. Requests automatically route to fallback providers
3. Cooldown clears after specified duration or on success

## Model Configurations

Each AI model has unique characteristics. DeltaPress maintains model-specific configurations for optimal performance.

### Model Parameters

| Parameter | Description |
|-----------|-------------|
| `maxTokens` | Maximum output tokens |
| `temperature` | Randomness control (0-1) |
| `supportsJson` | JSON response format support |
| `supportsSearch` | Search grounding capability |
| `timeout` | Request timeout (ms) |
| `retryCount` | Auto-retry attempts |

### Gemini Models

| Model | Max Tokens | JSON | Search | Timeout |
|-------|------------|------|--------|---------|
| gemini-2.0-flash | 8192 | ✓ | ✓ | 30s |
| gemini-1.5-flash | 8192 | ✓ | ✓ | 30s |

### Zhipu AI Models

| Model | Max Tokens | JSON | Timeout | Notes |
|-------|------------|------|---------|-------|
| glm-4-flash | 4096 | ✓ | 25s | Fast response |
| glm-4 | 8192 | ✓ | 45s | Full featured |
| glm-3-turbo | 4096 | ✗ | 30s | Legacy model |

### Other Models

| Provider | Model | Max Tokens | JSON | Timeout |
|----------|-------|------------|------|---------|
| AI/ML API | gpt-4o | 4096 | ✓ | 30s |
| Moonshot Kimi | moonshot-v1-8k | 8192 | ✓ | 30s |

### Model-Specific Handling

The system adapts request format per model:

```typescript
// Gemini: Uses tools for search grounding
{
  tools: [{ google_search: {} }],
  generationConfig: { responseMimeType: "application/json" }
}

// Zhipu AI: Uses max_new_tokens instead of max_tokens
{
  max_new_tokens: 4096,
  temperature: 0.3
}

// OpenAI-compatible: Standard format
{
  max_tokens: 4096,
  response_format: { type: "json_object" }
}
```

## Role-Based Access Control (RBAC)

DeltaPress implements a comprehensive RBAC system for secure admin access management.

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **Admin** | 100 | Full system access including user management, API configuration, and site settings |
| **Editor** | 75 | Can create, edit, and publish content. Can manage journalists and media |
| **Reviewer** | 50 | Read-only access to admin panel. Can view analytics and diagnostics |
| **User** | 25 | Standard user with no administrative privileges |

### Permission Matrix

| Permission | Admin | Editor | Reviewer | User |
|------------|:-----:|:------:|:--------:|:----:|
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| Manage Posts | ✓ | ✓ | ✗ | ✗ |
| Publish Posts | ✓ | ✓ | ✗ | ✗ |
| Delete Posts | ✓ | ✓ | ✗ | ✗ |
| Manage Settings | ✓ | ✗ | ✗ | ✗ |
| View API Keys | ✓ | ✗ | ✗ | ✗ |
| Manage Journalists | ✓ | ✓ | ✗ | ✗ |
| View Diagnostics | ✓ | ✓ | ✓ | ✗ |
| View Analytics | ✓ | ✓ | ✓ | ✗ |
| Manage Media | ✓ | ✓ | ✗ | ✗ |
| Manage SEO | ✓ | ✓ | ✗ | ✗ |

### Endpoint Access Control

| Endpoint | Minimum Role |
|----------|-------------|
| `/admin` | Reviewer |
| `/admin/posts` | Editor |
| `/admin/users` | Admin |
| `/admin/settings` | Admin |
| `/admin/api-settings` | Admin |
| `/admin/analytics` | Reviewer |
| `/admin/diagnostics` | Reviewer |
| `/admin/journalists` | Editor |

### Usage in Code

```typescript
import { hasPermission, canAccessEndpoint, getRolePermissions } from './services/rbac';

// Check if user has specific permission
if (hasPermission(userRole, 'canManageUsers')) {
  // Allow user management
}

// Check endpoint access
if (canAccessEndpoint(userRole, '/admin/api-settings')) {
  // Show API Settings menu item
}

// Get all permissions for a role
const permissions = getRolePermissions('editor');
```

## Admin API Settings View

The Admin API Settings view provides administrators with visibility into CORS configuration, environment variables status, and AI provider health.

### Features

- **AI Providers Tab**: View provider status, API key count, models, and rate limits
- **CORS Tab**: Display allowed origins, methods, headers, and settings
- **Environment Tab**: Show configuration status for all environment variables (secrets are masked)
- **Models Tab**: Display model-specific configurations and parameters

### Access

Navigate to **Admin → API Settings** (Admin role required).

### Security

- Secret values are never exposed in the admin panel
- Only configuration status is shown (configured/missing)
- RBAC ensures only administrators can access this view

## PowerShell Diagnostic Scripts

DeltaPress includes comprehensive PowerShell diagnostic scripts for monitoring application health, database connectivity, and log analysis.

### Available Scripts

| Script | Description |
|--------|-------------|
| `diagnostics.ps1` | Full diagnostic suite with all health checks |
| `quick-health.ps1` | Fast health check for monitoring |
| `check-logs.ps1` | Log analysis and monitoring |
| `version-manager.ps1` | Version management and patching |

### Running Diagnostics

```powershell
# Run all diagnostic checks
.\scripts\powershell\diagnostics.ps1 -All

# Run specific checks
.\scripts\powershell\diagnostics.ps1 -Database
.\scripts\powershell\diagnostics.ps1 -AppHealth
.\scripts\powershell\diagnostics.ps1 -Logs -Lines 100

# Export diagnostic report
.\scripts\powershell\diagnostics.ps1 -All -ExportReport -ReportPath "./report.json"
```

### Diagnostic Categories

#### 1. Diagnostics Check (`-Diag`)
- Node.js and npm installation verification
- TypeScript configuration check
- package.json and version.json validation
- Environment file configuration
- Dependencies installation status

#### 2. Database Health Check (`-Database`)
- Supabase URL configuration validation
- API key verification
- Database connectivity test
- Table accessibility check (posts, journalists)

#### 3. Application Health Check (`-AppHealth`)
- Server running status
- API endpoint responsiveness
- Build output verification
- Node.js process monitoring

#### 4. Logs Check (`-Logs`)
- Log file discovery
- Error pattern analysis
- Warning detection
- Recent log display with color coding

### Diagnostic Output Features

All diagnostic scripts include:
- **Timestamped output**: Every log entry includes precise timestamps (`HH:mm:ss.fff`)
- **Color-coded status**: ✓ Green (pass), ⚠ Yellow (warning), ✗ Red (fail)
- **Duration tracking**: Measures execution time for each check
- **Health score**: Calculates overall system health percentage
- **Exportable reports**: JSON format reports for CI/CD integration

## Versioning and Patching

DeltaPress uses semantic versioning (SemVer) with automated version management.

### Version Format

`MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Version Management

```powershell
# Show current version
.\scripts\powershell\version-manager.ps1 -Show

# Increment patch version (1.2.0 → 1.2.1)
.\scripts\powershell\version-manager.ps1 -Patch

# Increment minor version (1.2.0 → 1.3.0)
.\scripts\powershell\version-manager.ps1 -Minor

# Increment major version (1.2.0 → 2.0.0)
.\scripts\powershell\version-manager.ps1 -Major

# Set specific version
.\scripts\powershell\version-manager.ps1 -SetVersion "2.0.0"

# With changelog entry
.\scripts\powershell\version-manager.ps1 -Patch -ChangelogEntry "Fixed API cycling bug"

# View version history
.\scripts\powershell\version-manager.ps1 -History
```

### Version Files

| File | Purpose |
|------|---------|
| `version.json` | Detailed version info, release date, changelog |
| `package.json` | npm package version |

### Version History

<details>
<summary>Click to expand version history</summary>

#### v1.6.0 (2025-03-26)

**Major Features:**
- Database installation support (PostgreSQL default, MySQL, MongoDB)
- Automatic database table creation and schema initialization
- Secure credential generation with unique passwords
- Credentials file with automatic .gitignore protection

**New Installer Parameters:**
- `-Database PostgreSQL|MySQL|MongoDB|None` - Database selection
- `-DbPort <number>` - Custom database port
- `-CustomDbPassword <string>` - Custom database password
- `-CustomAppPassword <string>` - Custom app password
- `-SkipCredentials` - Skip credential generation

**Patches:**
- `1.6.0-p1`: Initial database support with PostgreSQL
- `1.6.0-p2`: Added MySQL and MongoDB support
- `1.6.0-p3`: Docker container support for all databases
- `1.6.0-p4`: Credential file auto-generation with .gitignore protection
- `1.6.0-p5`: Validation suite (PowerShell + Python)
- `1.6.0-p6`: Comprehensive FAQ for database and credentials

**Files Changed:**
- `scripts/powershell/install.ps1` - 2,001 lines (new)
- `scripts/powershell/validate-installer.ps1` - PowerShell validation
- `scripts/powershell/validate-installer.py` - Python validation
- `.gitignore` - Added credential protection
- `version.json` - Updated to 1.6.0

#### v1.5.0 (2025-03-26)

**Major Features:**
- Rugged one-click installer with visual progress bar (0-100%)
- Real-time percentage display during installation
- Prerequisite validation before any changes

**Patches:**
- `1.5.0-p1`: Visual progress bar with █░ characters
- `1.5.0-p2`: Weighted installation steps
- `1.5.0-p3`: Critical step detection with halt
- `1.5.0-p4`: Validation mode (-ValidateOnly)
- `1.5.0-p5`: Retry logic (configurable, default 3)
- `1.5.0-p6`: Installation log generation

#### v1.4.0 (2025-03-26)

**Major Features:**
- Windows PowerShell rollout script for full deployment
- Automatic dependency and Node.js installation
- Docker and Host server deployment options

**Patches:**
- `1.4.0-p1`: winget/Chocolatey/Scoop package manager support
- `1.4.0-p2`: Docker Desktop auto-installation
- `1.4.0-p3`: Windows Service management (NSSM)
- `1.4.0-p4`: Environment configuration helper
- `1.4.0-p5`: Real-time logging with timestamps

#### v1.3.0 (2025-03-26)

**Major Features:**
- Admin API Settings view for CORS, ENV, and API visibility
- RBAC (Role-Based Access Control) system implementation

**Patches:**
- `1.3.0-p1`: Role hierarchy (Admin, Editor, Reviewer, User)
- `1.3.0-p2`: Permission matrix implementation
- `1.3.0-p3`: Endpoint access control
- `1.3.0-p4`: API provider status dashboard

#### v1.2.0 (2025-03-26)

**Major Features:**
- CORS handling with configurable origins
- API rate limiting per provider

**Patches:**
- `1.2.0-p1`: Preflight OPTIONS handling
- `1.2.0-p2`: Rate limit headers
- `1.2.0-p3`: Cooldown mechanism
- `1.2.0-p4`: Model-specific configurations

#### v1.1.0 (2025-03-26)

**Major Features:**
- Round Robin API cycling implementation
- Multi-key support per provider

**Patches:**
- `1.1.0-p1`: Provider rotation algorithm
- `1.1.0-p2`: Key cycling per provider
- `1.1.0-p3`: Automatic fallback
- `1.1.0-p4`: Statistics tracking

#### v1.0.0 (2025-03-01)

**Initial Release:**
- AI-assisted newsroom platform
- Journalist agent orchestration
- Supabase integration

</details>

## Round Robin API Cycling

DeltaPress implements a robust **Round Robin API cycling system** for fair distribution of API requests across multiple providers and keys. This ensures optimal resource utilization, prevents rate limiting, and provides automatic failover capabilities.

### How It Works

The research service (`services/researchService.ts`) implements a sophisticated rotation algorithm:

1. **Provider Rotation**: Each research request cycles to the next available provider
2. **Key Rotation**: Multiple API keys per provider are cycled through independently
3. **Automatic Failover**: If a provider fails, the system automatically tries the next available provider
4. **Statistics Tracking**: Success/failure rates are tracked for monitoring

### Supported Providers

| Provider | API Key Env Var | Models | Features |
|----------|-----------------|--------|----------|
| Google Gemini | `GEMINI_API_KEY` | gemini-2.0-flash, gemini-1.5-flash | Google Search grounding |
| Zhipu AI | `ZAI_API_KEY` | glm-4-flash, glm-4, glm-3-turbo | Fast Chinese AI |
| AI/ML API | `ML_API_KEY` | gpt-4o | OpenAI-compatible |
| Moonshot Kimi | `KIMI_API_KEY` | moonshot-v1-8k | Chinese AI |

### Multiple API Keys

You can configure multiple API keys per provider using comma separation:

```bash
# Single key
GEMINI_API_KEY=key1

# Multiple keys for load balancing
ZAI_API_KEY=key1,key2,key3
```

When multiple keys are configured, the system will cycle through them in round-robin fashion, distributing load evenly across all keys.

### Monitoring API Usage

```typescript
import { getRoundRobinStats, getAllProvidersStatus } from './services/researchService';

const stats = getRoundRobinStats();
const providers = getAllProvidersStatus();

console.log(stats.totalRotations);      // Total rotations
console.log(stats.providerStats);        // Per-provider success/failure
console.log(providers.filter(p => p.inCooldown)); // Providers in cooldown
```

## API Reference

### Health Check

```
GET /api/health
```

Returns server status, version, uptime, and rate limit configuration.

### Models

```
GET /api/models
```

Returns all configured models with their parameters.

### Research Proxy

```
POST /api/proxy-research
POST /api/proxy-gemini-research
```

Proxies requests to AI providers with CORS protection and rate limiting.

### API Settings

```
GET /api/api-settings
```

Returns CORS configuration, provider status, environment variable status, and model configurations. Admin role required.

**Response includes:**
- `cors`: Allowed origins, methods, headers, credentials setting
- `providers`: AI provider status with key counts and models
- `envStatus`: Environment variable configuration status (secrets masked)
- `rateLimits`: Per-provider rate limit configuration
- `modelConfigs`: Model-specific parameters

## Testing

DeltaPress uses Playwright for end-to-end testing and Vitest for unit tests.

### Run Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run unit tests
npm run test:unit

# View test report
npx playwright show-report
```

## Windows Deployment (PowerShell)

DeltaPress includes comprehensive PowerShell scripts for Windows deployment with automatic dependency installation, Docker/Host deployment options, and Windows Service management.

### Quick Setup (Recommended)

For a one-click setup experience:

```powershell
# Download and run quick setup
.\scripts\powershell\quick-setup.ps1

# With Docker deployment
.\scripts\powershell\quick-setup.ps1 -WithDocker

# Force reinstall dependencies
.\scripts\powershell\quick-setup.ps1 -ForceInstall
```

### Full Rollout Script

The `rollout.ps1` script provides comprehensive deployment with real-time logging:

```powershell
# Host deployment (default)
.\scripts\powershell\rollout.ps1 -Mode Host

# Docker deployment
.\scripts\powershell\rollout.ps1 -Mode Docker

# Check system requirements only
.\scripts\powershell\rollout.ps1 -Mode CheckOnly

# With automatic Node.js installation
.\scripts\powershell\rollout.ps1 -Mode Host -InstallNodeJS

# With automatic Docker installation
.\scripts\powershell\rollout.ps1 -Mode Docker -InstallDocker

# Custom port and environment file
.\scripts\powershell\rollout.ps1 -Mode Host -Port 8080 -EnvFile ".env.production"

# Verbose logging
.\scripts\powershell\rollout.ps1 -Mode Host -Verbose -LogPath ".\deploy.log"
```

### Environment Configuration

Interactive environment configuration:

```powershell
# Interactive configuration
.\scripts\powershell\configure-env.ps1

# Non-interactive with parameters
.\scripts\powershell\configure-env.ps1 -NonInteractive `
    -GEMINI_API_KEY "your-key" `
    -Port 3000 `
    -CORS_ORIGINS "https://example.com"
```

### Windows Service Management

Deploy DeltaPress as a Windows Service for production:

```powershell
# Install as Windows Service (requires Administrator)
.\scripts\powershell\service-manager.ps1 -Action Install

# Start service
.\scripts\powershell\service-manager.ps1 -Action Start

# Check status
.\scripts\powershell\service-manager.ps1 -Action Status

# Stop service
.\scripts\powershell\service-manager.ps1 -Action Stop

# Restart service
.\scripts\powershell\service-manager.ps1 -Action Restart

# Remove service
.\scripts\powershell\service-manager.ps1 -Action Uninstall
```

### Rollout Script Features

| Feature | Description |
|---------|-------------|
| **Prerequisites Check** | Validates Windows version, admin rights, package managers |
| **Node.js Installation** | Auto-installs via winget, Chocolatey, or Scoop |
| **Docker Support** | Auto-installs Docker Desktop, builds images, runs containers |
| **Host Deployment** | Local server deployment with dependency management |
| **Real-time Logging** | Timestamped logs with color-coded status indicators |
| **Error Handling** | Comprehensive error capture and recovery suggestions |
| **Health Checks** | Automatic application health verification |
| **Report Generation** | Detailed deployment reports in JSON and text formats |

### Rollout Script Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-Mode` | Deployment mode: Docker, Host, CheckOnly | Host |
| `-InstallNodeJS` | Automatically install Node.js if missing | false |
| `-InstallDocker` | Automatically install Docker if missing | false |
| `-Port` | Server port number | 3000 |
| `-EnvFile` | Environment file path | .env.local |
| `-SkipDependencies` | Skip npm install step | false |
| `-Verbose` | Enable verbose output | false |
| `-LogPath` | Custom log file path | ./rollout-{timestamp}.log |

### Deployment Modes

#### Host Mode
- Installs npm dependencies
- Validates configuration
- Starts development/production server
- Opens browser automatically

#### Docker Mode
- Checks/installs Docker Desktop
- Creates Dockerfile if missing
- Builds Docker image
- Runs container with environment variables
- Configures health checks and logging

#### CheckOnly Mode
- Validates system requirements
- Checks Node.js version
- Verifies project files
- Validates configuration
- No deployment performed

### Logging Format

```
[HH:mm:ss.fff] ════════ Section Header
[HH:mm:ss.fff] ✓ PASS   Success message
[HH:mm:ss.fff] ⚠ WARN   Warning message
[HH:mm:ss.fff] ✗ FAIL   Error message
[HH:mm:ss.fff] ► INFO   Informational message
[HH:mm:ss.fff]   ·      Detail message
```

## Deployment notes

1. Build frontend assets: `npm run build`
2. Run the server in production mode (`NODE_ENV=production`)
3. Ensure all runtime environment variables are set
4. Configure CORS origins for your domain
5. Use PowerShell diagnostic scripts for monitoring

## ❓ FAQ (Frequently Asked Questions)

### Installation Issues

#### Q: The installer says "No package manager found"
**A:** You need a Windows package manager. Install one of these:
```powershell
# Option 1: winget (Windows 11 / Windows 10 1709+)
# Install from Microsoft Store: Search "App Installer"

# Option 2: Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Option 3: Scoop
irm get.scoop.sh | iex
```

#### Q: Node.js installation failed
**A:** Try these solutions:
1. Run PowerShell as Administrator
2. Install Node.js manually from https://nodejs.org/ (LTS version)
3. Restart PowerShell after installation
4. Run `node --version` to verify

#### Q: "npm not found" after Node.js install
**A:** This happens when PATH isn't refreshed:
1. Close all PowerShell windows
2. Open a new PowerShell window
3. Run `npm --version` to verify
4. If still failing, restart your computer

#### Q: npm install fails with errors
**A:** Common solutions:
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Use different registry if corporate firewall blocks
npm install --registry https://registry.npmmirror.com
```

#### Q: PowerShell execution policy blocks scripts
**A:** Run this command first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Runtime Issues

#### Q: Server won't start - "Port 3000 in use"
**A:** Either change the port or kill the existing process:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
.\scripts\powershell\install.ps1 -Port 8080
```

#### Q: "GEMINI_API_KEY not configured" error
**A:** You must configure your API key:
1. Edit `.env.local` file
2. Add your Gemini API key: `GEMINI_API_KEY=your_key_here`
3. Get a FREE key at https://aistudio.google.com/app/apikey
4. Restart the server: `npm run dev`

#### Q: CORS errors in browser
**A:** Update CORS settings in `.env.local`:
```bash
# For development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# For production
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Allow all (not recommended for production)
CORS_ORIGINS=*
```

#### Q: API rate limit errors
**A:** DeltaPress handles rate limits automatically, but you can:
1. Add multiple API keys per provider: `ZAI_API_KEY=key1,key2,key3`
2. The system will cycle through keys automatically
3. Wait for cooldown period (1-2 minutes)

### Docker Issues

#### Q: Docker Desktop won't start
**A:** Common solutions:
1. Ensure WSL2 is installed: `wsl --install`
2. Enable virtualization in BIOS
3. Restart Docker Desktop service
4. Check Windows Hyper-V is enabled

#### Q: Docker container fails health check
**A:** Debug with these steps:
```powershell
# Check container logs
docker logs deltapress-app

# Check if container is running
docker ps -a

# Restart container
docker restart deltapress-app

# Rebuild and run fresh
docker build -t deltapress:latest .
docker run -d -p 3000:3000 --name deltapress-new deltapress:latest
```

### Database Issues

#### Q: Which database should I choose?
**A:** Database recommendations by use case:
| Use Case | Recommended Database | Why |
|----------|---------------------|-----|
| Production deployment | PostgreSQL | Best performance, scalability, and reliability |
| Development/testing | PostgreSQL or MySQL | Easy setup, widely supported |
| Flexible schema needs | MongoDB | Schema-less, JSON-native |
| Using Supabase only | None | Skip local database entirely |

#### Q: PostgreSQL installation failed
**A:** Common solutions:
```powershell
# Option 1: Use Docker instead (recommended)
.\scripts\powershell\install.ps1 -WithDocker -Database PostgreSQL

# Option 2: Install manually from https://www.postgresql.org/download/windows/
# During setup, remember the superuser password you set

# Option 3: Use Chocolatey
choco install postgresql -y

# After manual install, update .env.local with:
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/deltapress
```

#### Q: MySQL installation failed
**A:** Try these solutions:
```powershell
# Option 1: Use Docker
.\scripts\powershell\install.ps1 -WithDocker -Database MySQL

# Option 2: Manual installation
# Download from https://dev.mysql.com/downloads/installer/
# Run the installer and set root password

# Verify MySQL is running
mysql -u root -p

# Create database manually
CREATE DATABASE deltapress;
```

#### Q: MongoDB installation failed
**A:** MongoDB installation steps:
```powershell
# Option 1: Use Docker
.\scripts\powershell\install.ps1 -WithDocker -Database MongoDB

# Option 2: Manual installation
# Download from https://www.mongodb.com/try/download/community

# Create data directory (required)
New-Item -Path "C:\data\db" -ItemType Directory -Force

# Start MongoDB manually
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"

# Test connection
mongosh
```

#### Q: Database connection refused
**A:** Check database service status:
```powershell
# PostgreSQL
Get-Service -Name "postgresql*" | Start-Service

# MySQL
Get-Service -Name "MySQL*" | Start-Service

# MongoDB
Get-Service -Name "MongoDB" | Start-Service

# Check ports are listening
netstat -an | findstr "5432"  # PostgreSQL
netstat -an | findstr "3306"  # MySQL
netstat -an | findstr "27017" # MongoDB
```

#### Q: Docker database container won't start
**A:** Debug Docker database:
```powershell
# List all containers
docker ps -a

# Check logs for specific database
docker logs deltapress-postgresql
docker logs deltapress-mysql
docker logs deltapress-mongodb

# Restart container
docker restart deltapress-postgresql

# Remove and recreate (WARNING: loses data)
docker rm -f deltapress-postgresql
.\scripts\powershell\install.ps1 -WithDocker -Database PostgreSQL
```

#### Q: Supabase connection fails
**A:** Verify your Supabase configuration:
1. Check `SUPABASE_URL` is correct (https://xxx.supabase.co)
2. Verify `SUPABASE_ANON_KEY` is valid
3. Test connection in browser: `https://your-project.supabase.co/rest/v1/`
4. Ensure Row Level Security (RLS) policies allow access

#### Q: "relation does not exist" database error
**A:** The table might not exist:
1. Go to Supabase Dashboard → SQL Editor
2. Run the schema creation scripts
3. Check the Diagnostics page in Admin panel

### Credentials Issues

#### Q: Where are my credentials stored?
**A:** Credentials are saved to `.credentials` file in the project root:
```
.credentials  <- Contains all generated passwords
```
This file is automatically added to `.gitignore` to prevent accidental uploads.

#### Q: I forgot my database password
**A:** Check the `.credentials` file or reset it:
```powershell
# Read credentials file
Get-Content .credentials

# If using Docker, you can reset by recreating:
docker rm -f deltapress-postgresql
.\scripts\powershell\install.ps1 -WithDocker -Database PostgreSQL

# For local PostgreSQL, reset password:
psql -U postgres
ALTER USER deltapress WITH PASSWORD 'new_password';
```

#### Q: I accidentally committed credentials!
**A:** Immediate action required:
```powershell
# 1. Remove the file from git history
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch .credentials" `
  --prune-empty --tag-name-filter cat -- --all

# 2. Force push (if already pushed)
git push origin --force --all

# 3. Rotate ALL credentials immediately:
# - Change database passwords
# - Regenerate API keys
# - Update JWT secret in .env.local

# 4. Ensure file is in .gitignore
Add-Content .gitignore ".credentials"
```

#### Q: Can I use my own passwords?
**A:** Yes, use these parameters:
```powershell
# Set custom passwords
.\scripts\powershell\install.ps1 `
    -Database PostgreSQL `
    -CustomDbPassword "YourDbPassword123!" `
    -CustomAppPassword "YourAppPassword456!"
```

#### Q: How do I regenerate credentials?
**A:** Run the installer with force reinstall:
```powershell
# This will regenerate credentials
.\scripts\powershell\install.ps1 -ForceReinstall -Database PostgreSQL

# Or manually delete and re-run
Remove-Item .credentials
.\scripts\powershell\install.ps1 -Database PostgreSQL
```

#### Q: Are credentials encrypted?
**A:** The credentials file is stored in plain text. For production:
1. Use environment variables instead of `.credentials` file
2. Use a secrets manager (Azure Key Vault, AWS Secrets Manager)
3. Set file permissions: only your user can read it
```powershell
# Restrict file access (Windows)
icacls .credentials /inheritance:r
icacls .credentials /grant:r "$env:USERNAME:F"
```

### Admin Panel Issues

#### Q: Can't access admin panel
**A:** Check your user role:
1. Login to the application
2. In Supabase, check `profiles` table
3. Ensure your role is `admin`, `editor`, or `reviewer`
4. Clear browser cache and re-login

#### Q: API Settings shows "No keys configured"
**A:** Environment variables not loaded:
1. Verify `.env.local` exists
2. Check keys are not empty
3. Restart the server after editing
4. Use `.\scripts\powershell\configure-env.ps1` to reconfigure

### Performance Issues

#### Q: Application is slow
**A:** Try these optimizations:
```powershell
# Build for production
npm run build

# Run in production mode
NODE_ENV=production npm run dev

# Use Docker for consistent performance
.\scripts\powershell\install.ps1 -WithDocker
```

#### Q: High memory usage
**A:** Node.js memory management:
```powershell
# Increase Node memory limit (4GB)
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

### Windows Service Issues

#### Q: Service fails to start
**A:** Check service configuration:
```powershell
# Check service status
.\scripts\powershell\service-manager.ps1 -Action Status

# View service logs
Get-Content .\logs\service-stdout.log -Tail 50

# Reinstall service
.\scripts\powershell\service-manager.ps1 -Action Uninstall
.\scripts\powershell\service-manager.ps1 -Action Install
```

#### Q: Service stops unexpectedly
**A:** Check for crashes:
1. Look in `logs\service-stderr.log`
2. Verify environment variables are set
3. Check disk space
4. Ensure API keys are valid

### Validation Mode

#### Q: How to test without installing?
**A:** Use validation mode:
```powershell
# Validates everything without making changes
.\scripts\powershell\install.ps1 -ValidateOnly

# This checks:
# - Windows version
# - Administrator rights
# - Package manager
# - Node.js
# - Project files
# - Docker (if -WithDocker)
```

### Getting Help

If these solutions don't resolve your issue:

1. **Check logs**: Look at `install-*.log` files
2. **Run diagnostics**: `.\scripts\powershell\diagnostics.ps1 -All`
3. **GitHub Issues**: https://github.com/141stfighterwing-collab/DeltaPress/issues
4. **Include in your report**:
   - Windows version (`winver`)
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Full error message
   - Log file content

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and update version if needed
4. Run tests: `npm run test`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License.

## AI Studio reference

Original AI Studio app link: https://ai.studio/apps/e0a2f310-b9a6-42c0-8ce4-36f5eb7543b6
