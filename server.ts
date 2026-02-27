import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/proxy-research', async (req, res) => {
    const { provider, query, model, endpoint } = req.body;

    console.log(`[Proxy] Request for provider: ${provider}, model: ${model}, endpoint: ${endpoint}`);

    try {
        if (provider === 'GEMINI') {
            const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                console.error('[Proxy] Gemini API key not configured');
                return res.status(500).json({ error: 'Gemini API key not configured on server' });
            }

            console.log(`[Proxy] Using Gemini model: ${model || 'gemini-2.0-flash'}`);

            const ai = new GoogleGenAI({ apiKey });
            // Using the model ID directly
            // Note: The structure might vary based on the SDK version, this matches the user's service file usage
            const response = await ai.models.generateContent({
                model: model || 'gemini-2.0-flash',
                contents: `Fetch and summarize 5 major news topics or articles regarding: "${query}". Return as a JSON array of objects with "title" and "summary" fields.`,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json"
                }
            });

            // The SDK returns text directly via a getter in the latest version
            const text = response.text || '[]';

            res.json({
                choices: [{
                    message: {
                        content: text
                    }
                }]
            });

        } else {
            // Handle OpenAI compatible providers (Kimi, Zhipu, AI/ML)
            let targetEndpoint = endpoint;
            let targetKey = '';

            let defaultModel = '';

            if (provider === 'KIMI') {
                targetEndpoint = 'https://api.moonshot.cn/v1/chat/completions';
                targetKey = process.env.KIMI_API_KEY || process.env.VITE_KIMI_API_KEY || '';
                defaultModel = 'moonshot-v1-8k';
            } else if (provider === 'ZAI') {
                targetEndpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                targetKey = process.env.ZAI_API_KEY || process.env.VITE_ZAI_API_KEY || '';
                defaultModel = 'glm-4';
            } else if (provider === 'ML') {
                targetEndpoint = 'https://api.aimlapi.com/chat/completions';
                targetKey = process.env.ML_API_KEY || process.env.VITE_ML_API_KEY || '';
                defaultModel = 'gpt-4o';
            } else if (provider === 'CHATGPT') {
                targetEndpoint = 'https://api.openai.com/v1/chat/completions';
                targetKey = process.env.CHATGPT_API || process.env.VITE_CHATGPT_API || '';
                defaultModel = 'gpt-4o-mini';
            }

            if (!targetEndpoint) {
                 return res.status(400).json({ error: `Unknown provider endpoint: ${provider}` });
            }

            if (!targetKey) {
                console.error(`[Proxy] Key missing for ${provider}`);
                return res.status(500).json({ error: `Configuration missing for provider: ${provider}` });
            }

            console.log(`[Proxy] Forwarding to ${targetEndpoint}`);

            const response = await fetch(targetEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${targetKey}`
                },
                body: JSON.stringify({
                    model: model || defaultModel,
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
                const errorText = await response.text();
                console.error(`[Proxy] Provider API error: ${response.status} ${errorText}`);
                return res.status(response.status).json({ error: `Provider API error: ${response.status} ${errorText}` });
            }

            const data = await response.json();
            res.json(data);
        }
    } catch (error: any) {
        console.error('[Proxy] Internal Server Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
