
import { GoogleGenAI } from "@google/genai";

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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a high-quality blog post draft about: ${topic}. 
      Include a title, engaging paragraphs, and a conclusion. 
      Format with basic HTML like <h2> and <p>.`,
    });
    
    if (!response || !response.text) {
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
