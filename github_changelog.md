## Description

This PR resolves an issue where the Diagnostics view only checked for the existence of an API key locally via environment variables. This approach failed to identify when the application was successfully connected but actively rate-limited or out of quota with the AI providers.

We've modified the proxy servers and the diagnostic UI to run actual connection tests using a generic string payload, capturing and displaying `429` statuses effectively.

### Changes Made

1. **Proxy Servers (`server.ts` & `api/proxy-research.ts`)**:
   - Updated the `POST /api/proxy-research` endpoints to accept an optional `message` property.
   - When `message` is present, the proxy bypasses the strict `system/user` JSON-formatting constraints of the research logic, simply passing the message along to the respective LLM.

2. **Diagnostics View (`views/Admin/DiagnosticsView.tsx`)**:
   - Reworked the `runDiagnostics()` logic.
   - Removed direct `process.env` checks on the frontend.
   - Introduced a `fetch` loop to hit `/api/proxy-research` with `message: "Hi AI it's me wwordpress like app saying hi to test functionality."` for all configured AI providers.
   - Added logic to catch HTTP `429` status codes or error messages containing "429", "quota", or "rate limit", mapping these to a new UI state: `"API Limited"`.
   - Updated the status indicators in the view to display `"API Limited"` in yellow, offering a clear visual distinction from a standard `"error"` (red).

3. **Documentation**:
   - Updated `README.md` to note the new active diagnostics capability.

### Testing Instructions

1. Navigate to the Admin Diagnostics view (`/admin/diagnostics`).
2. Watch the logs. Instead of merely checking for the key's existence, the app will now actively test `GEMINI`, `KIMI`, `ZAI`, `ML`, and `CHATGPT`.
3. If any provider responds with a rate limit or quota exceeded message, the corresponding box should display "API LIMITED" in yellow.
4. If the key works perfectly, it will display "OK" in green. If the server cannot connect or the key is invalid, it will display "ERROR" in red.