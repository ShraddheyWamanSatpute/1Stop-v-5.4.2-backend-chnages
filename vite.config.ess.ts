import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// ESS-specific Vite configuration
// This config is optimized for Employee Self Service portal builds
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || import.meta.env.MODE || 'development'),
    'import.meta.env.VITE_APP_MODE': JSON.stringify('ess'),
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: [
      // More specific aliases first - for yourstop frontend @/ imports
      { 
        find: /^@\/(components|lib|hooks|app|types)\/(.*)$/, 
        replacement: path.resolve(__dirname, "./src/yourstop/frontend/src/$1/$2")
      },
      // General @/ alias for main project
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "@frontend", replacement: path.resolve(__dirname, "./src/frontend") },
      { find: "@mobile", replacement: path.resolve(__dirname, "./src/mobile") },
      { find: "@yourstop", replacement: path.resolve(__dirname, "./src/yourstop/frontend/src") },
    ],
  },
  build: {
    // Host ESS under /ESS on Firebase Hosting
    outDir: "dist/ESS",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      external: (_id) => {
        // Exclude YourStop-specific files from ESS build if they cause issues
        // But allow them if they're actually used
        return false;
      },
    },
  },
  base: "/ESS",
  server: {
    port: 5174, // Different port for ESS dev server
    open: '/ESS',
  },
})
