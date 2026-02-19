
import { GoogleGenAI } from "@google/genai";

const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.5-pro'];

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
    const ai = new GoogleGenAI({ apiKey });
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastModelError: unknown = null;

    for (const model of MODEL_CANDIDATES) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: `Write a high-quality blog post draft about: ${topic}. 
          Include a title, engaging paragraphs, and a conclusion. 
          Format with basic HTML like <h2> and <p>.`,
        });
        break;
      } catch (error) {
        lastModelError = error;
        console.warn(`Gemini model ${model} failed, trying fallback...`, error);
      }
    }

    if (!response) {
      throw lastModelError instanceof Error
        ? lastModelError
        : new Error('No Gemini model produced a response.');
    }
    
    if (!response.text) {
      throw new Error("Received empty response from Gemini API.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini SDK Exception:", error);
    
    if (error.message?.includes('Failed to fetch')) {
      return "Network Error: The request to Google Gemini was blocked by the browser. Please disable AdBlockers or check your Content Security Policy.";
    }
    
    return `Gemini AI error: ${error.message || "Unknown error occurred"}`;
  }
}
