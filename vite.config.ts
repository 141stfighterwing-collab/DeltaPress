import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ""),
        'process.env.KIMI_API_KEY': JSON.stringify(env.KIMI_API_KEY || process.env.KIMI_API_KEY || ""),
        'process.env.ZAI_API_KEY': JSON.stringify(env.ZAI_API_KEY || process.env.ZAI_API_KEY || "5b5c16c8ac6d432d9ed00a905a436579.qss0dz2gAYUgLc2J"),
        'process.env.ML_API_KEY': JSON.stringify(env.ML_API_KEY || process.env.ML_API_KEY || "1577bbafa0a54b5598fa6d1d0721a071"),
        
        // Polyfill the whole process.env object for libraries that expect it
        'process.env': JSON.stringify({
          GEMINI_API_KEY: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
          KIMI_API_KEY: env.KIMI_API_KEY || process.env.KIMI_API_KEY || "",
          ZAI_API_KEY: env.ZAI_API_KEY || process.env.ZAI_API_KEY || "5b5c16c8ac6d432d9ed00a905a436579.qss0dz2gAYUgLc2J",
          ML_API_KEY: env.ML_API_KEY || process.env.ML_API_KEY || "1577bbafa0a54b5598fa6d1d0721a071",
          NODE_ENV: mode
        })
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
