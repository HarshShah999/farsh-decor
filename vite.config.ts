import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three.js lives only in the lazily-loaded 3D visualizer chunk
    chunkSizeWarningLimit: 1200,
  },
});
