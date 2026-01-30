
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateBlogPostDraft(topic: string) {
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
