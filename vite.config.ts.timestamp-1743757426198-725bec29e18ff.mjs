// vite.config.ts
import { defineConfig } from "file:///C:/Users/suman%20jaiswal/Desktop/book%20my%20show/bookmyshow-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/suman%20jaiswal/Desktop/book%20my%20show/bookmyshow-main/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import { componentTagger } from "file:///C:/Users/suman%20jaiswal/Desktop/book%20my%20show/bookmyshow-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\suman jaiswal\\Desktop\\book my show\\bookmyshow-main";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3e3,
    strictPort: true,
    fs: {
      strict: true,
      allow: [".."]
    },
    hmr: {
      overlay: true
    }
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "supabase": ["@supabase/supabase-js"],
          "ui": ["@radix-ui/react-tooltip", "lucide-react", "sonner"]
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@radix-ui/react-tooltip",
      "lucide-react",
      "sonner",
      "@supabase/supabase-js",
      "@tanstack/react-query"
    ],
    exclude: ["@supabase/supabase-js"],
    force: true,
    esbuildOptions: {
      target: "es2020"
    }
  },
  plugins: [
    react({
      babel: {
        plugins: ["@emotion/babel-plugin"]
      }
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzdW1hbiBqYWlzd2FsXFxcXERlc2t0b3BcXFxcYm9vayBteSBzaG93XFxcXGJvb2tteXNob3ctbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcc3VtYW4gamFpc3dhbFxcXFxEZXNrdG9wXFxcXGJvb2sgbXkgc2hvd1xcXFxib29rbXlzaG93LW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3N1bWFuJTIwamFpc3dhbC9EZXNrdG9wL2Jvb2slMjBteSUyMHNob3cvYm9va215c2hvdy1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiAzMDAwLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgZnM6IHtcbiAgICAgIHN0cmljdDogdHJ1ZSxcbiAgICAgIGFsbG93OiBbJy4uJ11cbiAgICB9LFxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogdHJ1ZVxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICdzdXBhYmFzZSc6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXG4gICAgICAgICAgJ3VpJzogWydAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcCcsICdsdWNpZGUtcmVhY3QnLCAnc29ubmVyJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICdyZWFjdCcsIFxuICAgICAgJ3JlYWN0LWRvbScsIFxuICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b29sdGlwJyxcbiAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgICAgJ3Nvbm5lcicsXG4gICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknXG4gICAgXSxcbiAgICBleGNsdWRlOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxuICAgIGZvcmNlOiB0cnVlLFxuICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCh7XG4gICAgICBiYWJlbDoge1xuICAgICAgICBwbHVnaW5zOiBbJ0BlbW90aW9uL2JhYmVsLXBsdWdpbiddXG4gICAgICB9XG4gICAgfSksXG4gICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJlxuICAgIGNvbXBvbmVudFRhZ2dlcigpLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICAgIGRlZHVwZTogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBcVgsU0FBUyxvQkFBb0I7QUFDbFosT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUhoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLElBQUk7QUFBQSxNQUNGLFFBQVE7QUFBQSxNQUNSLE9BQU8sQ0FBQyxJQUFJO0FBQUEsSUFDZDtBQUFBLElBQ0EsS0FBSztBQUFBLE1BQ0gsU0FBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUEsSUFDWCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDekQsWUFBWSxDQUFDLHVCQUF1QjtBQUFBLFVBQ3BDLE1BQU0sQ0FBQywyQkFBMkIsZ0JBQWdCLFFBQVE7QUFBQSxRQUM1RDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLHVCQUF1QjtBQUFBLElBQ2pDLE9BQU87QUFBQSxJQUNQLGdCQUFnQjtBQUFBLE1BQ2QsUUFBUTtBQUFBLElBQ1Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsTUFDSixPQUFPO0FBQUEsUUFDTCxTQUFTLENBQUMsdUJBQXVCO0FBQUEsTUFDbkM7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELFNBQVMsaUJBQ1QsZ0JBQWdCO0FBQUEsRUFDbEIsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxJQUNBLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxFQUMvQjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
