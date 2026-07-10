import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/UpperStructureChordApp/',
  resolve: {
    alias: {
      tone: path.resolve(__dirname, 'node_modules/tone'),
    },
    dedupe: ['tone'],
  },
  optimizeDeps: {
    include: ['tone', '@magenta/music/esm/core/soundfont.js'],
  },
});
