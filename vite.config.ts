import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // Listen on all network interfaces
    port: 3000, // Fixed port
    strictPort: true, // Don't try other ports if 3000 is in use
    // open: true, // Disable auto-open for server environments
    fs: {
      // Keep strict fs if needed, otherwise default might be fine
      strict: true,
      allow: ['..']
    },
    hmr: {
      overlay: true
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Consider disabling sourcemaps for production builds to reduce size
    chunkSizeWarningLimit: 1500 // Adjust if needed
  },
  // Remove optimizeDeps, Vite handles this well by default
  // Remove manualChunks, Vite's default splitting is often sufficient
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // You can keep other aliases if they are actively used
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/styles": path.resolve(__dirname, "./src/styles"),
      "@/contexts": path.resolve(__dirname, "./src/contexts"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/hooks": path.resolve(__dirname, "./src/hooks")
    },
    dedupe: ['react', 'react-dom'] // Keep dedupe
  }
});
