# DeltaPress

DeltaPress is an AI-assisted newsroom/blog platform built with React, TypeScript, Vite, Express, Supabase, and Gemini.
It combines a traditional publishing UI (posts, pages, admin views) with an automated **journalist agent pipeline** that can research current events and publish generated content.

## What this project includes

- A React frontend with public pages and admin tooling.
- A lightweight Express server used for local dev and proxying research-provider requests.
- AI generation services for article drafting and image generation.
- Agent orchestration for scheduled journalist bots.
- Supabase integration for auth, content persistence, and admin data.

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
GEMINI_API_KEY=your_key_here

# Optional research-provider fallbacks used by researchService.ts
KIMI_API_KEY=your_key_here
ZAI_API_KEY=your_key_here
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
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite config (TypeScript)
├── vite.config.js             # Vite config (JavaScript variant)
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
└── services/
    ├── supabase.ts            # Supabase client initialization
    ├── security.ts            # Security helpers and validation checks
    ├── analytics.ts           # Analytics tracking/helper service
    ├── gemini.ts              # Gemini utility wrappers for generation
    ├── researchService.ts     # Multi-provider research rotation + fallback logic
    └── agentEngine.ts         # Journalist-agent scheduler and auto-publishing pipeline
```

## AI + agent architecture

These are the key files for the automated AI newsroom workflow:

- `services/agentEngine.ts`
  - Selects due journalist agents based on schedule.
  - Builds persona/system instructions from journalist profile data.
  - Optionally runs current-events research.
  - Generates HTML article content and optional featured image.
  - Publishes generated posts via Supabase.

- `services/researchService.ts`
  - Rotates through providers (`GEMINI`, `ZAI`, `ML`, `KIMI`).
  - Uses Gemini directly when selected.
  - Uses a server proxy endpoint for OpenAI-compatible providers.
  - Falls back to Gemini if provider requests fail.

- `server.ts`
  - Hosts `/api/proxy-research` to avoid CORS and hide direct browser calls to external research endpoints.
  - Runs Vite middleware in development and static serving in production.

- `metadata.json`
  - Stores project-level metadata used by AI Studio packaging/workflow.

## Deployment notes

1. Build frontend assets:

```bash
npm run build
```

2. Run the server in production mode (`NODE_ENV=production`) so `server.ts` serves `dist/`.

3. Ensure all runtime environment variables are set in your deployment target.

## AI Studio reference

Original AI Studio app link:

- https://ai.studio/apps/e0a2f310-b9a6-42c0-8ce4-36f5eb7543b6
