
import { supabase } from './supabase';
import { 
  journalistResearch, 
  generateArticleDraft, 
  getAvailableProviders, 
  getProviderStatus,
  ResearchResponse 
} from './aiProviders';

const SPECTRUM_LABELS: Record<number, string> = {
  [-3]: 'Far Left (Anarchism)',
  [-2]: 'Left (Communist)',
  [-1]: 'Center Left (Socialist)',
  [0]: 'Center (Moderate)',
  [1]: 'Center Right (Liberal)',
  [2]: 'Right (Conservative)',
  [3]: 'Far Right (Full Fascism)'
};

const FREQUENCIES = [
  { id: '6h', hours: 6 },
  { id: '24h', hours: 24 },
  { id: '2w', hours: 84 },
  { id: '1w', hours: 168 },
  { id: '2m', hours: 360 },
  { id: '1m', hours: 720 }
];

/**
 * Checks for due agents or forces a specific agent to run.
 * Uses round-robin across multiple AI providers for research.
 * 
 * @param onStepUpdate Callback for UI updates (step text, percentage)
 * @param targetBotId Optional ID to bypass schedule and force a specific bot
 */
export const checkAndRunDueAgents = async (
  onStepUpdate?: (step: string, progress: number) => void, 
  targetBotId?: string
) => {
  // Check for available AI providers
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    const errMsg = 'No AI providers configured. Please set at least one API key: VITE_CLAUDE_API_KEY, VITE_OPENAI_API_KEY, VITE_GEMINI_API_KEY, or VITE_KIMI_API_KEY.';
    console.error(`Agent Engine Error: ${errMsg}`);
    if (onStepUpdate) onStepUpdate(`Error: ${errMsg}`, 0);
    return;
  }

  console.log(`[Agent Engine] Available AI providers: ${availableProviders.join(', ')}`);

  try {
    // 1. Fetch active journalists
    const { data: bots } = await supabase.from('journalists').select('*').eq('status', 'active');
    if (!bots || bots.length === 0) {
      if (onStepUpdate) onStepUpdate('No active journalists found.', 100);
      return;
    }

    const now = new Date();

    // 2. Determine which bot to run
    let botToRun = null;
    if (targetBotId) {
      botToRun = bots.find(b => b.id === targetBotId);
    } else {
      botToRun = bots.find(bot => {
        if (!bot.last_run) return true;
        const freq = FREQUENCIES.find(f => f.id === bot.schedule) || { hours: 24 };
        const nextRun = new Date(new Date(bot.last_run).getTime() + freq.hours * 60 * 60 * 1000);
        return nextRun <= now;
      });
    }

    if (!botToRun) {
      console.log("Agent Engine: No due agents and no force target found.");
      if (onStepUpdate) onStepUpdate('No agents due for execution.', 100);
      return;
    }

    const dueBot = botToRun; // Local reference for TS

    // 3. Start Deployment Sequence
    if (onStepUpdate) onStepUpdate(`Initializing ${dueBot.name}...`, 5);

    // 4. Intelligence Scoping
    if (onStepUpdate) onStepUpdate(`Scouting intelligence for ${dueBot.category}...`, 15);

    const perspective = SPECTRUM_LABELS[dueBot.perspective || 0];
    const systemInstruction = `You are ${dueBot.name}, a ${dueBot.age}-year-old professional journalist. 
Expertise: ${dueBot.category}. 
Editorial Beat: ${dueBot.niche}. 
Political Stance: ${perspective}. 
Narrative Style: Your age (${dueBot.age}) influences your vocabulary, depth of historical knowledge, and cynicism/optimism levels.
${dueBot.use_current_events ? 'CRITICAL: You MUST incorporate real-time events and data for this topic. Address the latest developments explicitly.' : ''}`;

    // 5. Research Phase (using round-robin)
    if (onStepUpdate) onStepUpdate(`Researching topic: ${dueBot.niche}...`, 30);
    
    let researchResult: ResearchResponse;
    try {
      researchResult = await journalistResearch({
        journalistName: dueBot.name,
        category: dueBot.category,
        niche: dueBot.niche,
        perspective,
        topic: dueBot.niche,
        useCurrentEvents: dueBot.use_current_events
      });

      if (!researchResult.success) {
        console.warn(`[Agent Engine] Research phase warning: ${researchResult.error}`);
      } else {
        console.log(`[Agent Engine] Research completed using ${researchResult.provider} (${researchResult.model})`);
      }
    } catch (researchError: any) {
      console.warn('[Agent Engine] Research phase failed, proceeding with draft generation:', researchError.message);
      researchResult = { content: '', provider: 'gemini', model: '', success: false, error: researchError.message };
    }

    // 6. Content Generation (using round-robin)
    if (onStepUpdate) onStepUpdate(`Drafting article with AI...`, 50);

    const draftResponse = await generateArticleDraft({
      topic: dueBot.niche,
      style: `Investigative journalism from a ${perspective} perspective. Incorporate age-appropriate vocabulary and historical references for a ${dueBot.age}-year-old writer.`,
      wordCount: 750,
      systemPrompt: systemInstruction
    });

    if (!draftResponse.success) {
      throw new Error(`Content generation failed: ${draftResponse.error}`);
    }

    console.log(`[Agent Engine] Article drafted using ${draftResponse.provider} (${draftResponse.model})`);

    let fullText = draftResponse.content;
    fullText = fullText.replace(/^```html\n?|```$/g, '').trim();
    
    const title = fullText.match(/<h1>(.*?)<\/h1>/)?.[1] || `${dueBot.niche} Update`;
    const content = fullText.replace(/<h1>.*?<\/h1>/, '').trim();

    // 7. Visual Production
    if (onStepUpdate) onStepUpdate(`Capturing editorial photography...`, 70);
    
    let featuredImageUrl = null;
    
    // Note: Image generation still uses Gemini (most reliable for inline images)
    // This can be extended to other providers with image generation support
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const { geminiGenerateContent, extractGeminiInlineImageData } = await import('./geminiClient');
        const imgResponse = await geminiGenerateContent(geminiApiKey, {
          contents: [{ role: 'user', parts: [{ text: `A professional editorial news photo about: ${title}. High-end journalism aesthetic.` }] }],
          imageConfig: { aspectRatio: '16:9' }
        }, ['gemini-2.5-flash-image', 'gemini-2.0-flash-preview-image-generation']);
        const imageData = extractGeminiInlineImageData(imgResponse);
        if (imageData) featuredImageUrl = `data:image/png;base64,${imageData}`;
      } catch (e) { 
        console.warn("Agent Engine: Image generation failed, proceeding without it."); 
      }
    }

    // 8. Publishing Sequence
    if (onStepUpdate) onStepUpdate(`Finalizing publication to registry...`, 90);
    
    const { data: { session } } = await supabase.auth.getSession();
    const slug = title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

    const { error: postError } = await supabase.from('posts').insert({
      title, 
      content, 
      status: 'publish', 
      author_id: session?.user?.id, 
      journalist_id: dueBot.id, 
      type: 'post',
      category_id: dueBot.category_id,
      featured_image: featuredImageUrl,
      slug,
      // Store AI provider metadata for analytics
      metadata: {
        ai_provider: draftResponse.provider,
        ai_model: draftResponse.model,
        research_provider: researchResult.success ? researchResult.provider : null,
        research_model: researchResult.success ? researchResult.model : null
      }
    });

    if (postError) throw postError;

    // 9. Update Last Run
    await supabase.from('journalists').update({ last_run: new Date().toISOString() }).eq('id', dueBot.id);
    
    if (onStepUpdate) onStepUpdate(`Successfully dispatched via ${draftResponse.provider}.`, 100);

    // Log summary
    console.log(`[Agent Engine] Article published successfully:
      - Title: ${title}
      - Research: ${researchResult.success ? `${researchResult.provider}/${researchResult.model}` : 'skipped'}
      - Draft: ${draftResponse.provider}/${draftResponse.model}
    `);

  } catch (err: any) {
    console.error("Agent Engine Error:", err);
    if (onStepUpdate) onStepUpdate(`Error: ${err.message || 'Operation failed'}`, 0);
  }
};

/**
 * Get current status of all AI providers
 */
export const getAIProviderStatus = () => {
  return getProviderStatus();
};

/**
 * Research a topic without generating an article
 * Useful for preliminary research or fact-checking
 */
export const researchTopic = async (
  topic: string,
  options?: {
    category?: string;
    perspective?: string;
    useCurrentEvents?: boolean;
  }
): Promise<ResearchResponse> => {
  return journalistResearch({
    journalistName: 'Research Assistant',
    category: options?.category || 'General',
    niche: topic,
    perspective: options?.perspective || SPECTRUM_LABELS[0],
    topic,
    useCurrentEvents: options?.useCurrentEvents
  });
};

/**
 * Generate a blog post draft on a given topic
 * Uses round-robin AI provider selection
 */
export const generateBlogDraft = async (
  topic: string,
  options?: {
    style?: string;
    wordCount?: number;
    systemPrompt?: string;
  }
): Promise<ResearchResponse> => {
  return generateArticleDraft({
    topic,
    style: options?.style,
    wordCount: options?.wordCount || 750,
    systemPrompt: options?.systemPrompt
  });
};
