import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  resolve: {
    alias: {
      // Maps the '@' alias to the absolute path of the 'src' directory
      "@": path.resolve(__dirname, "./src"), 
      // Allow resolving the shared package which lives outside the frontend folder
      // Point to the source so Vite/TS can compile it on-the-fly in CI/environments without `shared/dist`.
      "@project3/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
});
