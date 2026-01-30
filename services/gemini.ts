
import { GoogleGenAI } from "@google/genai";

/**
 * Resolve the API key from multiple possible environment variable aliases.
 */
const apiKey = process.env.API_KEY || (process.env as any).GEMINI_KEY || (process.env as any).VITE_GEMINI_API_KEY;

export async function generateBlogPostDraft(topic: string) {
  if (!apiKey) {
    console.error("Gemini API key is missing. Check your Vercel Environment Variables.");
    return "Error: Gemini API key is not configured in the environment.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a high-quality blog post draft about: ${topic}. 
      Include a title, some engaging paragraphs, and a brief conclusion. 
      Format with basic HTML like <h2> and <p>.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Error generating content. Please try again.";
  }
}
