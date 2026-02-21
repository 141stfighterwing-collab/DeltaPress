import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), '');
  const env = { ...process.env, ...localEnv };

  const apiKey = env.API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
  const gemini2Key = env.GEMINI2_API_KEY || env.Gemini2_API_KEY || '';
  const kimiKey = env.KIMI_API_KEY || '';
  const aimlKey = env.ML_API_KEY || '';
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  console.log(`[Vite Build] Injecting Gemini key length: ${apiKey.length}`);

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || apiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      'process.env.Gemini2_API_KEY': JSON.stringify(gemini2Key),
      'process.env.GEMINI2_API_KEY': JSON.stringify(gemini2Key),
      'process.env.KIMI_API_KEY': JSON.stringify(kimiKey),
      'process.env.ML_API_KEY': JSON.stringify(aimlKey),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY': JSON.stringify(supabaseKey),
      'process.env': JSON.stringify({
        API_KEY: apiKey,
        GEMINI_API_KEY: env.GEMINI_API_KEY || apiKey,
        VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || '',
        GEMINI2_API_KEY: gemini2Key,
        Gemini2_API_KEY: gemini2Key,
        KIMI_API_KEY: kimiKey,
        ML_API_KEY: aimlKey,
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
