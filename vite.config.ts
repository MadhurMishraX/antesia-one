import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        includeAssets: ['logo.png'],
        manifest: {
          name: 'Antesia',
          short_name: 'Antesia',
          description: 'The ultimate assignment and learning management platform',
          theme_color: '#9333ea',
          background_color: '#020617',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'logo.png',
              sizes: '192x192 512x512 any',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
