
import { extractGeminiText, geminiGenerateContent } from "./geminiClient";

const MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];

export async function generateBlogPostDraft(topic: string) {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === '') {
    const msg = "Gemini API key is missing or empty. Verify Vercel Env Variables.";
    console.error(msg);
    return msg;
  }

  // Debug: Log key format (not value)
  console.debug(`Gemini Request starting with key length: ${apiKey.length}`);

  try {
    const response = await geminiGenerateContent(
      apiKey,
      {
        contents: [{ role: 'user', parts: [{ text: `Write a high-quality blog post draft about: ${topic}. 
          Include a title, engaging paragraphs, and a conclusion. 
          Format with basic HTML like <h2> and <p>.` }] }]
      },
      MODEL_CANDIDATES
    );

    const text = extractGeminiText(response);
    if (!text) throw new Error('Received empty response from Gemini API.');

    return text;
  } catch (error: any) {
    console.error("Gemini SDK Exception:", error);
    
    if (error.message?.includes('Failed to fetch')) {
      return "Network Error: The request to Google Gemini was blocked by the browser. Please disable AdBlockers or check your Content Security Policy.";
    }
    
    return `Gemini AI error: ${error.message || "Unknown error occurred"}`;
  }
}
