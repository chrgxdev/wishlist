import { defineConfig, loadEnv } from 'vite';

// Vite project rooted in ./frontend.
// Build output now stays inside the frontend directory (./dist) for CDN/static hosting.
// API proxy target can be configured via env var VITE_API_TARGET (e.g., http://localhost:8000 or https://api.example.com)
export default defineConfig(({ mode }) => {
  // Load env variables from .env files for the current mode
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'https://wishlist.dd';

  return {
    root: '.',
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget, // Dev-only backend; ignored in production build
          changeOrigin: true,
          // Allow proxying to HTTPS backend with a self-signed certificate
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist', // previously ../public
      emptyOutDir: true
    }
  };
});
