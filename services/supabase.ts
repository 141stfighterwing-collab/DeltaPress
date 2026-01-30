
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cngpbsjleyvcdscdffjg.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_iD9T5v51aNb8ZujsRrhiyg_CA5l2cXl';

// Using a fallback for development if keys aren't injected properly
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Note: In a real production app, we would have tables for:
 * - posts
 * - categories
 * - comments
 * - profiles
 * - site_options
 */
