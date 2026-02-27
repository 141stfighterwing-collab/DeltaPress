# AGENTS.md

This file contains important context, architecture guidelines, and coding standards for this project. All AI agents working on this project must adhere to these guidelines.

## 1. Development Environment & Tooling
* **Package Manager & Execution:** The development environment strictly relies on `bun` for package management (`bun install`), running tests (`bun test`), and executing scripts (e.g., `bun run dev`). Avoid using `npm` due to potential network issues.
* **Running Locally:** Use `bun install` followed by `bun run dev`. The `dev` script uses `concurrently` to start both the Vite server and the Express backend.
* **Unit Tests:** Unit tests are implemented using the `bun:test` framework. Test files must follow the `[filename].test.ts` naming convention.

## 2. Architecture & Deployment
* **Project Structure:** The architecture consists of a React frontend and an Express backend (`server.ts`), integrated with Supabase and Google GenAI.
* **Vercel Serverless Deployment:** The project supports Vercel deployment. The `/api` directory contains serverless functions (like `api/proxy-research.ts`), which mirror the local proxy logic found in `server.ts`.
* **Frontend Routing:** The application uses `BrowserRouter` for client-side routing to ensure SEO-friendly URLs. Do not use `HashRouter`.
* **API Proxy:** Vite is configured in `vite.config.ts` to proxy requests starting with `/api` to the backend server running on `http://localhost:3001`.

## 3. AI Providers & Integration
* **API Endpoints:** External AI API requests must be proxied through the `/api/proxy-research` endpoint (implemented in `server.ts` for local, and `api/proxy-research.ts` for Vercel).
* **Provider Fallback Strategy:** Research logic in `services/researchService.ts` routes requests to the local proxy and uses a rotated fallback strategy across providers: Gemini, Zhipu, AI/ML, and Kimi.
* **Default Models:**
  - Gemini: `gemini-2.0-flash`
  - Moonshot Kimi: `moonshot-v1-8k`
  - Zhipu AI/ZAI: `glm-4`
  - AI/ML: `gpt-4o`
* **Response Normalization:** The backend proxy normalizes responses from different providers into a standard format (`choices[0].message.content`) for the frontend.
* **API Keys:** Backend logic retrieves API keys by checking standard environment variables (e.g., `GEMINI_API_KEY`) and falling back to Vite-prefixed variables (e.g., `VITE_GEMINI_API_KEY`) for broad compatibility.
* **Google Gemini SDK:** Always use the newer `@google/genai` SDK rather than the legacy `@google/generative-ai` package.

## 4. Frontend & Security
* **HTML Sanitization:** Always use `dompurify` for HTML sanitization instead of custom regexes. This is crucial for preventing XSS vulnerabilities, particularly when using `dangerouslySetInnerHTML`.
* **ESM Imports:** The project uses an import map in `index.html` to load certain frontend dependencies (like `dompurify`) from `esm.sh`.

## 5. SEO & Metadata
* **SEO Management:** The React frontend uses `react-helmet-async` alongside a reusable `<SEO />` component (`components/SEO.tsx`) for dynamic document head and meta tag management.
* **Target Keywords:** The website's primary SEO target keywords are **'Socialist'** and **'AI'**. Proactively incorporate these into default metadata and content where applicable.
* **Static Assets:** Static SEO assets, such as `robots.txt` and `sitemap.xml`, are located in the `public/` directory so Vite serves them directly from the root.
