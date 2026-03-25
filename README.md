# DeltaPress

DeltaPress is an AI-assisted newsroom/blog platform built with React, TypeScript, Vite, Express, Supabase, and Gemini.
It combines a traditional publishing UI (posts, pages, admin views) with an automated **journalist agent pipeline** that can research current events and publish generated content.

## Version

**Current Version: 1.4.0**

| Property | Value |
|----------|-------|
| Version | 1.4.0 |
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

#### v1.4.0 (2025-03-26)
- Windows PowerShell rollout script for full deployment
- Automatic dependency and Node.js installation
- Docker and Host server deployment options
- Windows Service management for production
- Environment configuration helper with API key validation
- Real-time logging with color-coded status indicators

#### v1.3.0 (2025-03-26)
- Admin API Settings view for CORS, ENV, and API visibility
- RBAC (Role-Based Access Control) system implementation
- API provider status dashboard with key count and cooldown status
- Environment variable status with secret protection
- Enhanced role permissions: Admin, Editor, Reviewer, User

#### v1.2.0 (2025-03-26)
- CORS handling with configurable origins
- API rate limiting per provider
- Model-specific configurations
- Enhanced error handling and retry logic
- PDF documentation

#### v1.1.0 (2025-03-26)
- Round Robin API cycling implementation
- Multi-key support per provider
- Automatic fallback on provider failure
- Statistics tracking for monitoring
- PowerShell diagnostic scripts
- Playwright testing framework
- Comprehensive README documentation

#### v1.0.0 (2025-03-01)
- Initial release
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
