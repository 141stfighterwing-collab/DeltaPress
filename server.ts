
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint for research providers (KIMI, ZAI, ML)
  // This avoids CORS and browser-level protocol errors
  app.post("/api/proxy-research", async (req, res) => {
    const { endpoint, apiKey, model, query, providerName } = req.body;

    if (!endpoint || !apiKey || !model || !query) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log(`[Server Proxy] 📡 Forwarding research request for ${providerName} (${model})`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a research assistant. Provide a list of 5 current news topics or facts about the requested subject. Return ONLY a JSON array of objects with "title" and "summary" fields. No markdown wrappers.' 
            },
            { 
              role: 'user', 
              content: `Research: ${query}` 
            }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Server Proxy] ${providerName} Error: ${response.status} ${errText}`);
        return res.status(response.status).send(errText);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`[Server Proxy] Critical Error:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
