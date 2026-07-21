import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { version } from './package.json';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_UPDATED_AT__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
