# DeltaPress AI Agent Architecture

This document describes the design and operation of DeltaPress Journalist Agents.

## Overview
DeltaPress utilizes autonomous AI "Journalists" to research, draft, and publish news content to the platform.
These agents run on a defined schedule (`agentEngine.ts`).

## The Agent Engine (`services/agentEngine.ts`)
The `agentEngine` is the core scheduling and execution mechanism.
- It queries the `journalists` Supabase table for active bots where the `last_run` time is older than their defined `schedule` (e.g., 'every 6 hours', 'once daily').
- If a bot is due, it triggers a research and generation pipeline.

## Managing Agents (Adds & Removals)
- **Adding an Agent:** An agent is added by creating a new record in the `journalists` table via the Admin Dashboard (`views/Admin/JournalistsView.tsx`). The agent engine automatically picks up newly added agents on its next run loop.
- **Removing an Agent:** To stop an agent from generating content, you can either delete the record from the database or set its status to `'paused'`. The agent engine only processes rows where `status = 'active'`.

## Research Capabilities (`services/researchService.ts`)
Agents perform preliminary research on current events using a rotating roster of AI providers.
Currently supported proxy endpoints include:
- Moonshot Kimi (`https://api.moonshot.cn/v1/chat/completions`)
- Zhipu AI / Z.AI (`https://open.bigmodel.cn/api/paas/v4/chat/completions`)
- AI/ML API (`https://api.aimlapi.com/chat/completions`)

## Content Generation
Once research is gathered, the bot constructs a detailed prompt combining:
1. The Bot's specific niche.
2. The Bot's perspective (ideology/spectrum value).
3. The returned research topics.

This payload is then sent to Gemini to generate the final HTML post content.
