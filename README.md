# DeltaPress

DeltaPress is an AI-assisted newsroom/blog platform built with React, TypeScript, Vite, Express, Supabase, and Gemini.
It combines a traditional publishing UI (posts, pages, admin views) with an automated **journalist agent pipeline** that can research current events and publish generated content.

## Version

**Current Version: 1.1.0**

| Property | Value |
|----------|-------|
| Version | 1.1.0 |
| Release Date | 2025-03-26 |
| Status | Stable |

See [Version History](#version-history) for changelog.

## What this project includes

- A React frontend with public pages and admin tooling.
- A lightweight Express server used for local dev and proxying research-provider requests.
- AI generation services for article drafting and image generation.
- Agent orchestration for scheduled journalist bots.
- Supabase integration for auth, content persistence, and admin data.
- PowerShell diagnostic scripts for monitoring and health checks.

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

### Quick Health Check

```powershell
# Fast health check
.\scripts\powershell\quick-health.ps1

# Output example:
# ✓ Node.js: v18.17.0
# ✓ npm: v9.6.7
# ✓ Server: Running (HTTP 200)
# ✓ Dependencies: 295 packages
# ✓ Config: .env.local found
# ⚠ Build: Not built
```

### Log Analysis

```powershell
# Check logs
.\scripts\powershell\check-logs.ps1

# Show more lines
.\scripts\powershell\check-logs.ps1 -Lines 100

# Show only errors
.\scripts\powershell\check-logs.ps1 -Errors

# Follow logs in real-time
.\scripts\powershell\check-logs.ps1 -Follow

# Verbose output
.\scripts\powershell\check-logs.ps1 -Verbose
```

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

# Increment patch version (1.1.0 → 1.1.1)
.\scripts\powershell\version-manager.ps1 -Patch

# Increment minor version (1.1.0 → 1.2.0)
.\scripts\powershell\version-manager.ps1 -Minor

# Increment major version (1.1.0 → 2.0.0)
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

### API Cycling Example

```
Request 1 → Gemini (Key 1)
Request 2 → Zhipu AI (Key 1)
Request 3 → AI/ML API (Key 1)
Request 4 → Moonshot Kimi (Key 1)
Request 5 → Gemini (Key 1)  [Cycle repeats]
```

With multiple keys per provider:
```
Request 1 → Gemini (Key 1)
Request 2 → Zhipu AI (Key 1)
Request 3 → Zhipu AI (Key 2)  [Key rotation within provider]
Request 4 → Zhipu AI (Key 3)
Request 5 → AI/ML API (Key 1)
```

### Monitoring API Usage

The system provides statistics through the `getRoundRobinStats()` function:

```typescript
import { getRoundRobinStats } from './services/researchService';

const stats = getRoundRobinStats();
console.log(stats);
// {
//   totalRotations: 42,
//   lastRotationTime: 1711459200000,
//   providerStats: [
//     { providerId: 'GEMINI', success: 10, failure: 2 },
//     { providerId: 'ZAI', success: 8, failure: 0 }
//   ],
//   availableProviders: [
//     { id: 'GEMINI', name: 'Google Gemini', keyCount: 1 },
//     { id: 'ZAI', name: 'Zhipu AI', keyCount: 3 }
//   ]
// }
```

## Project layout (thorough)

> Note: This tree intentionally focuses on app code and configuration, not `node_modules`.

```text
.
├── App.tsx                    # Main app shell and route composition
├── index.tsx                  # React entry point
├── index.html                 # HTML template for Vite
├── server.ts                  # Express server + Vite middleware + research proxy
├── metadata.json              # App metadata used by AI Studio/export tooling
├── package.json               # Scripts and dependencies
├── version.json               # Version management and changelog
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite config (TypeScript)
├── types.ts                   # Shared app-level TypeScript types
│
├── components/
│   ├── Layout.tsx             # Shared page layout wrapper
│   ├── Sidebar.tsx            # Frontend sidebar navigation
│   ├── AdminSidebar.tsx       # Admin-specific sidebar
│   ├── PostCard.tsx           # Post summary/list card component
│   └── CategoryIcon.tsx       # Category icon rendering helper
│
├── views/
│   ├── BlogHome.tsx           # Public blog landing
│   ├── Newsroom.tsx           # News listing view
│   ├── NewsDetail.tsx         # News detail page
│   ├── SinglePost.tsx         # Blog post detail page
│   ├── MeetTeam.tsx           # Team/about page
│   ├── ContactView.tsx        # Contact page
│   ├── Auth/
│   │   ├── Login.tsx          # Authentication login form
│   │   └── Register.tsx       # Authentication register form
│   └── Admin/
│       ├── AdminDashboard.tsx # Admin home/dashboard
│       ├── PostsList.tsx      # Post management
│       ├── PostEditor.tsx     # Post editing and publishing
│       ├── PagesListView.tsx  # Page management
│       ├── UsersList.tsx      # User management
│       ├── JournalistsView.tsx# Journalist-agent management
│       ├── RssFeedsView.tsx   # RSS feed configuration/monitoring
│       ├── AnalyticsView.tsx  # Site/admin analytics panels
│       ├── SeoView.tsx        # SEO controls
│       ├── AppearanceView.tsx # Theming/appearance controls
│       ├── SettingsView.tsx   # Global settings
│       ├── DiagnosticsView.tsx# Health/debug diagnostics
│       └── GenericListView.tsx# Reusable admin list view abstraction
│
├── services/
│   ├── supabase.ts            # Supabase client initialization
│   ├── security.ts            # Security helpers and validation checks
│   ├── analytics.ts           # Analytics tracking/helper service
│   ├── gemini.ts              # Gemini utility wrappers for generation
│   ├── researchService.ts     # Multi-provider research rotation + fallback logic
│   └── agentEngine.ts         # Journalist-agent scheduler and auto-publishing pipeline
│
├── scripts/
│   ├── powershell/
│   │   ├── diagnostics.ps1    # Full diagnostic suite
│   │   ├── quick-health.ps1   # Fast health check
│   │   ├── check-logs.ps1     # Log analysis tool
│   │   └── version-manager.ps1# Version management
│   └── validate-round-robin.ts# Round robin validation script
│
├── tests/
│   ├── research-round-robin.spec.ts  # Playwright tests for API cycling
│   └── unit/
│       └── round-robin-unit.test.ts  # Unit tests for round robin
│
└── playwright-report/                # Test reports and screenshots
```

## AI + agent architecture

These are the key files for the automated AI newsroom workflow:

### `services/agentEngine.ts`
- Selects due journalist agents based on schedule.
- Builds persona/system instructions from journalist profile data.
- Optionally runs current-events research via round-robin API cycling.
- Generates HTML article content and optional featured image.
- Publishes generated posts via Supabase.

### `services/researchService.ts`
- **Round Robin Rotation**: Cycles through all available providers with valid API keys.
- **Multi-Key Support**: Supports multiple API keys per provider for load balancing.
- **Automatic Fallback**: Falls back to next provider on failure.
- **Statistics Tracking**: Monitors success/failure rates per provider.
- **Provider Management**: Dynamically detects available providers based on configured keys.

### `server.ts`
- Hosts `/api/proxy-research` to avoid CORS and hide direct browser calls to external research endpoints.
- Hosts `/api/proxy-gemini-research` for Gemini-specific research with search grounding.
- Runs Vite middleware in development and static serving in production.

## Managing Agents

Journalist agents run via the `services/agentEngine.ts` orchestration pipeline. To add or remove an agent:

1. **Add**: Insert a new journalist record into the `journalists` Supabase table.
2. **Remove**: Either set the journalist `status` to 'paused', or delete the record.

### Agent Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name for byline |
| `title` | string | Professional title |
| `niche` | string | Editorial beat / focus area |
| `category_id` | UUID | Reference to content category |
| `schedule` | enum | Publication frequency (6h, 24h, 1w, 2w, 1m, 2m) |
| `perspective` | int | Editorial stance (-3 to +3 scale) |
| `use_current_events` | boolean | Enable real-time research integration |
| `status` | enum | Agent status (active, paused) |

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

## Deployment notes

1. Build frontend assets: `npm run build`
2. Run the server in production mode (`NODE_ENV=production`)
3. Ensure all runtime environment variables are set
4. Use PowerShell diagnostic scripts for monitoring

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
