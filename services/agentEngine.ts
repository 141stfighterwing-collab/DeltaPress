
import { supabase } from './supabase';
import { GoogleGenAI } from "@google/genai";

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
 * @param onStepUpdate Callback for UI updates (step text, percentage)
 * @param targetBotId Optional ID to bypass schedule and force a specific bot
 */
export const checkAndRunDueAgents = async (
  onStepUpdate?: (step: string, progress: number) => void, 
  targetBotId?: string
) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return;

  try {
    // 1. Fetch active journalists
    const { data: bots } = await supabase.from('journalists').select('*').eq('status', 'active');
    if (!bots || bots.length === 0) return;

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
      return;
    }

    const dueBot = botToRun; // Local reference for TS

    // 3. Start Deployment Sequence
    if (onStepUpdate) onStepUpdate(`Initializing ${dueBot.name}...`, 5);

    const ai = new GoogleGenAI({ apiKey });
    
    // 4. Intelligence Scoping
    if (onStepUpdate) onStepUpdate(`Scouting intelligence for ${dueBot.category}...`, 15);

    const systemInstruction = `You are ${dueBot.name}, a ${dueBot.age}-year-old professional journalist. 
    Expertise: ${dueBot.category}. 
    Editorial Beat: ${dueBot.niche}. 
    Political Stance: ${SPECTRUM_LABELS[dueBot.perspective || 0]}. 
    Narrative Style: Your age (${dueBot.age}) influences your vocabulary, depth of historical knowledge, and cynicism/optimism levels.
    ${dueBot.use_current_events ? 'CRITICAL: You MUST use Google Search to find real-time events and data for this topic before writing. Address the latest developments explicitly.' : ''}`;

    // 5. Research and Content Generation
    if (onStepUpdate) onStepUpdate(`Investigating & Drafting Article...`, 35);
    
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Write a 750-word investigative article regarding: ${dueBot.niche}. 
      Ensure your ${SPECTRUM_LABELS[dueBot.perspective || 0]} perspective is clear but well-reasoned. 
      Format: Return ONLY valid HTML (<h1>, <h2>, <p>, <blockquote>). No markdown wrappers.`,
      config: { 
        systemInstruction,
        tools: dueBot.use_current_events ? [{ googleSearch: {} }] : [] 
      }
    });
    
    let fullText = textResponse.text || '';
    fullText = fullText.replace(/^```html\n?|```$/g, '').trim();
    const title = fullText.match(/<h1>(.*?)<\/h1>/)?.[1] || `${dueBot.niche} Update`;
    const content = fullText.replace(/<h1>.*?<\/h1>/, '').trim();

    // 6. Visual Production
    if (onStepUpdate) onStepUpdate(`Capturing editorial photography...`, 70);
    
    let featuredImageUrl = null;
    try {
      const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: `A professional editorial news photo about: ${title}. High-end journalism aesthetic.` }] },
          config: { imageConfig: { aspectRatio: "16:9" } }
      });
      const imgPart = imgResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData) featuredImageUrl = `data:image/png;base64,${imgPart.inlineData.data}`;
    } catch (e) { 
      console.warn("Agent Engine: Image generation failed, proceeding without it."); 
    }

    // 7. Publishing Sequence
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
      slug
    });

    if (postError) throw postError;

    // 8. Update Last Run
    await supabase.from('journalists').update({ last_run: new Date().toISOString() }).eq('id', dueBot.id);
    
    if (onStepUpdate) onStepUpdate(`Successfully dispatched.`, 100);

  } catch (err: any) {
    console.error("Agent Engine Error:", err);
    if (onStepUpdate) onStepUpdate(`Error: ${err.message || 'Operation failed'}`, 0);
  }
};
