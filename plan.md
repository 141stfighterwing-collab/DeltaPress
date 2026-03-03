1. **Add Documentation**
   - Create/update a `CHANGELOG.md` to document the changes made for this feature. We will add a note about the new API Provider Selector dropdown on the Diagnostics page, which allows selecting from presets like Z.AI, ChatGPT, GROK, Claude, etc., to auto-fill the test endpoint URL and model.
2. **Add API Provider Selector to Diagnostics View**
   - In `views/Admin/DiagnosticsView.tsx`, add a dropdown component to select predefined AI providers.
   - When a provider is selected from the dropdown, it will automatically populate the `testEndpoint` and `testModel` state variables with the appropriate values for that provider.
   - Predefined providers should include: Z.AI (Zhipu), ChatGPT, GROK, Claude, Moonshot Kimi, AI/ML API.
3. **Verify `AGENTS.md` and README modifications**
   - Since the prompt mentioned "Look at the readme and check for adds or removals on agents also", I need to review if `AGENTS.md` exists (it didn't in my check), but the `README.md` contains a section on AI + agent architecture.
   - I'll ensure any modifications or requirements stated by the user regarding agents in README or an `AGENTS.md` are documented or handled. Given `AGENTS.md` doesn't exist, I'll document the AI + agent architecture and how to work with it in a new `AGENTS.md` as requested in the system prompt.
4. **Complete Pre-Commit Steps**
   - Run verification, test code, ensure proper testing, reviews, and reflections are done.
5. **Submit Changes**
   - Submit the branch with descriptive title and commit message.
