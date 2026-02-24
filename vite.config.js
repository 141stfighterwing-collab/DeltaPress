
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' allows loading variables without the VITE_ prefix.
  const localEnv = loadEnv(mode, process.cwd(), '');
  
  // Merge with system process.env (crucial for Vercel deployment)
  const env = { ...process.env, ...localEnv };
  
  // Prioritize API_KEY, then VITE_GEMINI_API_KEY
  const apiKey = env.API_KEY || env.VITE_GEMINI_API_KEY || '';
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  console.log(`[Vite Build] Injecting API_KEY length: ${apiKey.length}`);

  return {
    plugins: [react()],
    define: {
      // Direct string replacement for process.env access
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey || env.GEMINI_API_KEY || ""),
      'process.env.KIMI_API_KEY': JSON.stringify(env.KIMI_API_KEY || ""),
      'process.env.ZAI_API_KEY': JSON.stringify(env.ZAI_API_KEY || ""),
      'process.env.ML_API_KEY': JSON.stringify(env.ML_API_KEY || ""),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY': JSON.stringify(supabaseKey),
      
      // Polyfill the whole process.env object for libraries that expect it
      'process.env': JSON.stringify({
        GEMINI_API_KEY: apiKey || env.GEMINI_API_KEY || "",
        KIMI_API_KEY: env.KIMI_API_KEY || "",
        ZAI_API_KEY: env.ZAI_API_KEY || "",
        ML_API_KEY: env.ML_API_KEY || "",
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: supabaseKey,
        NODE_ENV: mode
      })
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: 'esbuild'
    }
  };
});
