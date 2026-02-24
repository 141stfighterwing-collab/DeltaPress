
import { generateArticleDraft, getAvailableProviders, ResearchResponse } from "./aiProviders";

/**
 * Generate a blog post draft using round-robin AI providers
 * This function now supports multiple AI providers (Gemini, Moonshot KIMI, AI/ML API)
 * and automatically rotates between them for load balancing.
 */
export async function generateBlogPostDraft(topic: string): Promise<string> {
  // Check for available providers
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    const msg = "No AI providers configured. Please set at least one API key:\n" +
      "- VITE_GEMINI_API_KEY (Google Gemini)\n" +
      "- VITE_MOONSHOT_API_KEY (Moonshot KIMI)\n" +
      "- VITE_AIML_API_KEY (AI/ML API)";
    console.error(msg);
    return msg;
  }

  console.debug(`[Blog Draft] Available AI providers: ${availableProviders.join(', ')}`);

  try {
    const response: ResearchResponse = await generateArticleDraft({
      topic,
      style: 'Engaging blog post with professional tone',
      wordCount: 1000
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate content');
    }

    console.log(`[Blog Draft] Generated using ${response.provider} (${response.model})`);
    
    if (response.usage) {
      console.log(`[Blog Draft] Token usage - Prompt: ${response.usage.promptTokens}, Completion: ${response.usage.completionTokens}`);
    }

    return response.content;
    
  } catch (error: any) {
    console.error("AI Generation Exception:", error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      return "Network Error: The request was blocked. Please check your network connection, disable AdBlockers, or verify Content Security Policy settings.";
    }
    
    return `AI Generation error: ${error.message || "Unknown error occurred"}`;
  }
}

/**
 * Generate a blog post draft with custom options
 */
export async function generateBlogPostDraftWithOptions(options: {
  topic: string;
  style?: string;
  wordCount?: number;
  systemPrompt?: string;
}): Promise<ResearchResponse> {
  return generateArticleDraft({
    topic: options.topic,
    style: options.style,
    wordCount: options.wordCount || 1000,
    systemPrompt: options.systemPrompt
  });
}
