
import { GoogleGenAI } from "@google/genai";

export async function generateBlogPostDraft(topic: string) {
  // The SDK requires the key to be in process.env.API_KEY
  // Our vite.config.js handles the injection of this value.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API key is missing from process.env.API_KEY");
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
    return "Error generating content. Please check your API key quotas and project billing.";
  }
}
