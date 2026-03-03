with open('README.md', 'r') as f:
    content = f.read()

# Add a section specifically for managing agents if not present, checking adds and removals
AGENT_SECTION = """
### Managing Agents

Journalist agents run via the `services/agentEngine.ts` orchestration pipeline. To add or remove an agent:
1. **Add**: Insert a new journalist record into the `journalists` Supabase table. Ensure the schema aligns with what the Admin "JournalistsView" expects (`name`, `niche`, `schedule`, `prompt/perspective`). The agent will be picked up automatically by `agentEngine.ts` based on its schedule.
2. **Remove**: Either set the journalist `status` to 'paused', or delete the record from the database. The agent engine only selects `status = 'active'` bots.

"""

if "### Managing Agents" not in content:
    content = content.replace("## Deployment notes", AGENT_SECTION + "## Deployment notes")

with open('README.md', 'w') as f:
    f.write(content)
