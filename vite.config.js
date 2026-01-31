
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load local .env files
  const localEnv = loadEnv(mode, process.cwd(), '');
  
  // Merge with process.env (Vercel dashboard variables)
  const env = { ...process.env, ...localEnv };
  
  const apiKey = env.API_KEY || env.VITE_GEMINI_API_KEY || '';
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY': JSON.stringify(supabaseKey),
      // Polyfill process for libraries that expect it
      'process.env': JSON.stringify({
        API_KEY: apiKey,
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: supabaseKey
      })
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});
