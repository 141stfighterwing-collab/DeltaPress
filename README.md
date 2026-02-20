<div align="center">
<img width="1200" height="475" alt="DeltaPress Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# DeltaPress

**A modern, high-performance publishing platform designed to go beyond traditional WordPress workflows.**

Build and manage blogs, newsroom content, pages, media, users, and operational tools from one React + Supabase powered system.
</div>

---

## Overview

DeltaPress is a full-stack-ready content platform inspired by classic WordPress ergonomics, but built for modern app speed, modularity, and AI-assisted workflows.

It includes:
- Public-facing blog and newsroom views
- Admin dashboard for content and system management
- Supabase-backed data access
- Gemini-powered draft generation support
- Analytics heartbeat monitoring

---

## Core Functions (WordPress-Style, Extended)

DeltaPress replaces common WordPress use cases with expanded functionality:

- **Posts & Editing**
  - Create, edit, and manage posts from a dedicated admin editor and listing pages.
- **Pages & Structured Content**
  - Manage pages, categories, projects, partners, services, and tools through reusable admin list views.
- **User & Membership Management**
  - Authentication routes (login/register) and admin user/member management.
- **Media & Comments**
  - Dedicated routes for media library and comment administration.
- **Newsroom Publishing**
  - News index and single-news detail routes for editorial/news workflows.
- **Analytics & Diagnostics**
  - Admin analytics and diagnostics sections plus a client heartbeat service.
- **AI Draft Assistance**
  - Gemini integration to generate blog post drafts from a topic prompt.

---

## Application Routes

### Public
- `/` — Blog home
- `/post/:slug` — Single post
- `/news` — Newsroom feed
- `/news/:url` — News detail
- `/contact` — Contact page
- `/meet-our-team` — Team page
- `/login` — User login
- `/register` — User registration

### Admin
- `/admin` — Admin dashboard
- `/admin/posts` — Post management
- `/admin/new-post` — New post editor
- `/admin/edit-post/:id` — Post editor (existing post)
- `/admin/pages` — Page management
- `/admin/categories` — Category management
- `/admin/media` — Media library
- `/admin/comments` — Comment management
- `/admin/users` — User management
- `/admin/members` — Member management
- `/admin/projects` — Project management
- `/admin/services` — Service management
- `/admin/partners` — Partner management
- `/admin/plugins` — Plugin management
- `/admin/tools` — Tool management
- `/admin/messages` — Contact/message management
- `/admin/rss` — RSS feed management
- `/admin/journalists` — Journalist management
- `/admin/analytics` — Analytics
- `/admin/diagnostics` — Diagnostics
- `/admin/appearance` — Appearance settings
- `/admin/settings` — General settings

---

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Routing:** React Router
- **Backend Services:** Supabase
- **AI Services:** Google Gemini (`@google/genai`)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file in the project root.

Recommended variables:

```env
# Gemini server-side keys (recommended)
API_KEY=your_primary_gemini_api_key
Gemini2_API_KEY=your_secondary_gemini_api_key
KIMI_API_KEY=your_kimi_api_key
ML_API_KEY=your_ml_api_key

# Optional provider overrides
KIMI_MODEL=moonshot-v1-8k
KIMI_BASE_URL=https://api.moonshot.cn/v1/chat/completions
ML_MODEL=gpt-4o-mini
ML_BASE_URL=https://api.mlapi.ai/v1/chat/completions

# Supabase (optional, project includes defaults)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

### 3) Run in development

```bash
npm run dev
```

### 4) Build for production

```bash
npm run build
```

### 5) Preview production build

```bash
npm run preview
```

---

## Deployment Notes

- Set all environment variables in your hosting provider before deployment.
- For production reliability, use your own Supabase instance/keys instead of defaults.
- If Gemini requests fail in-browser, validate network/CSP/ad-block settings.

---

## Project Goal

DeltaPress is intended as a **more powerful alternative to traditional WordPress patterns**:

- modern frontend performance
- modular admin workflows
- extensible service architecture
- optional AI-assisted editorial acceleration

If you are moving from WordPress, DeltaPress gives you familiar content concepts with significantly more flexibility for custom product development.
