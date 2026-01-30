
import { createClient } from '@supabase/supabase-js';

// Defensive check for the browser environment
const getEnv = (key: string, fallback: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Check window.process if the polyfill has run
  if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
    return (window as any).process.env[key];
  }
  return fallback;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://cngpbsjleyvcdscdffjg.supabase.co');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'sb_publishable_iD9T5v51aNb8ZujsRrhiyg_CA5l2cXl');

export const supabase = createClient(supabaseUrl, supabaseKey);
