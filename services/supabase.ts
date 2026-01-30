
import { createClient } from '@supabase/supabase-js';

/**
 * ENVIRONMENT VARIABLE RESOLUTION:
 * Prioritizes standard Vercel/Supabase naming, then falls back to project-specific keys
 * as seen in the user's deployment screenshot.
 */
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  'https://cngpbsjleyvcdscdffjg.supabase.co';

const supabaseKey = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_iD9T5v51aNb8ZujsRrhiyg_CA5l2cXl';

export const supabase = createClient(supabaseUrl, supabaseKey);
