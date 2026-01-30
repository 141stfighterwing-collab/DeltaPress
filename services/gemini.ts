
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.API_KEY || (process.env as any).GEMINI_KEY || (process.env as any).VITE_GEMINI_API_KEY;
  }
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    const env = (window as any).process.env;
    return env.API_KEY || env.GEMINI_KEY || env.VITE_GEMINI_API_KEY;
  }
  return null;
};

export async function generateBlogPostDraft(topic: string) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("Gemini API key is missing. Ensure API_KEY or GEMINI_KEY is set in Vercel.");
    return "Error: Gemini API key is not configured.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a high-quality blog post draft about: ${topic}. 
      Include a title, engaging paragraphs, and a conclusion. 
      Format with basic HTML like <h2> and <p>.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Error generating content. Please try again.";
  }
}
