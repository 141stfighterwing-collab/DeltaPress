# AI Studio Personal Blog

A fully functional, AI-powered personal blog built with React, Express, and integrated with multiple AI providers.

**Category Tags:** `#Socialist` `#AI` `#PersonalBlog` `#React` `#Express`

## Full Functionality

This project features a robust modern web architecture:

*   **Frontend:** React application utilizing `BrowserRouter` for SEO-friendly routing, Vite for fast development and building, and `react-helmet-async` for dynamic metadata management.
*   **Backend Proxy:** An Express backend (`server.ts`) that handles API requests, masking external AI provider keys and formatting responses.
*   **AI Integration & Fallback:** A multi-provider fallback strategy routing requests to Gemini (`gemini-2.0-flash`), Zhipu AI (`glm-4`), AI/ML (`gpt-4o`), and Moonshot Kimi (`moonshot-v1-8k`) for high availability.
*   **Security:** Uses DOMPurify for rigorous HTML sanitization, protecting against XSS vulnerabilities when rendering AI-generated content.
*   **Database:** Integrated with Supabase for data storage.
*   **SEO Optimized:** Pre-configured with target keywords ('Socialist', 'AI'), static assets (`robots.txt`, `sitemap.xml`) served from public, and dynamic meta tags via a reusable `<SEO />` component.
*   **Vercel Ready:** The `api/` directory contains serverless functions mirroring the local Express proxy for seamless Vercel deployment.

## Status Updates

*   **Initial Setup:** Completed setup of the React frontend and Vite build system.
*   **Backend Proxy:** Implemented Express backend (`server.ts`) for secure API key management and request proxying.
*   **AI Fallback:** Configured multi-provider fallback strategy in `services/researchService.ts`.
*   **Security:** Integrated DOMPurify for secure rendering of AI content.
*   **Vercel Deployment:** Added serverless functions in the `api/` directory for production deployment.

## Docs

### Prerequisites

*   [Bun](https://bun.sh/) (Required for package management and running scripts)

### Running Locally

1.  **Install dependencies:**
    ```bash
    bun install
    ```
2.  **Environment Variables:**
    Create a `.env.local` file (or copy `.env.example` if available) and set your API keys:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    # Add other provider keys as needed
    ```
3.  **Run the application:**
    ```bash
    bun run dev
    ```
    This uses `concurrently` to start both the Vite frontend server and the Express backend proxy on port 3001.

### Running Tests

Unit tests are written using the `bun:test` framework. To run tests:
```bash
bun test
```

### Deployment

This project is configured for deployment on Vercel.
1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Import the project into Vercel.
3. Ensure you configure all required Environment Variables in the Vercel project settings.
4. Vercel will automatically detect the Vite frontend and use the `api/` directory for backend serverless functions.

## AGENTS.md

For developers and AI assistants working on this repository, please refer to [AGENTS.md](AGENTS.md) for detailed architecture guidelines, coding standards, and tooling rules.

## Author and Creator

Built and maintained by Jules.
