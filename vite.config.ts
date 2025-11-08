import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // Important for GitHub Pages project sites
    // https://leotsio.github.io/DocBook-Editor/
    base: '/DocBook-Editor/',

    server: {
      host: '0.0.0.0',
      port: 3000,
    },

    plugins: [react()],

    define: {
      // Inject your key at build-time from .env
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // If your source lives in /src, prefer this:
        // '@': path.resolve(__dirname, 'src'),
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
