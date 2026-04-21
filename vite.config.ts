import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Map process.env.NODE_ENV for backward compatibility
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || import.meta.env.MODE || 'development'),
  },
  esbuild: {
    // Avoid emitting preserved license comments into minified chunks.
    // This prevents occasional parse failures in downstream build analysis.
    legalComments: "none",
  },
  plugins: [
    react(),
    // Plugin to prevent serving .tsx files directly (they should be processed by Vite)
    {
      name: 'prevent-tsx-direct-serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // If trying to access a .tsx file directly, return 404
          if (req.url?.endsWith('.tsx') && !req.url.includes('node_modules')) {
            res.statusCode = 404
            res.end('TypeScript files should be imported, not accessed directly')
            return
          }
          next()
        })
      }
    },
    // Plugin to handle @/ imports from yourstop frontend
    {
      name: 'yourstop-alias-resolver',
      resolveId(id, importer) {
        // If importing from yourstop frontend and using @/ alias
        if (id.startsWith('@/') && importer?.includes('yourstop/frontend/src')) {
          const actualPath = id.replace('@/', '')
          const resolved = path.resolve(__dirname, './src/yourstop/frontend/src', actualPath)
          return resolved
        }
        return null
      }
    },
    // Plugin to transform process.env.NEXT_PUBLIC_* to import.meta.env.VITE_*
    {
      name: 'transform-process-env',
      transform(code, id) {
        // Only transform files from yourstop frontend
        if (id.includes('yourstop/frontend/src')) {
          // Transform process.env.NEXT_PUBLIC_* to import.meta.env.VITE_* or import.meta.env.NEXT_PUBLIC_*
          code = code.replace(
            /process\.env\.NEXT_PUBLIC_(\w+)/g,
            '(import.meta.env.VITE_$1 || import.meta.env.NEXT_PUBLIC_$1)'
          )
          // Transform process.env.NODE_ENV to import.meta.env.MODE
          code = code.replace(
            /process\.env\.NODE_ENV/g,
            'import.meta.env.MODE'
          )
          return { code, map: null }
        }
        return null
      }
    }
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    // CRITICAL: Force a single Firebase SDK copy.
    // Without this, Vite can resolve multiple @firebase/* instances and you get
    // "Service firestore/database/storage/functions is not available".
    dedupe: [
      "firebase",
      "@firebase/app",
      "@firebase/auth",
      "@firebase/firestore",
      "@firebase/database",
      "@firebase/storage",
      "@firebase/functions",
      "@firebase/ai",
      "@firebase/component",
      "@firebase/util",
    ],
    alias: [
      // Force Firebase subpath imports to resolve from workspace root node_modules
      { find: 'firebase/app', replacement: path.resolve(__dirname, '../node_modules/firebase/app') },
      { find: 'firebase/auth', replacement: path.resolve(__dirname, '../node_modules/firebase/auth') },
      { find: 'firebase/firestore', replacement: path.resolve(__dirname, '../node_modules/firebase/firestore') },
      { find: 'firebase/database', replacement: path.resolve(__dirname, '../node_modules/firebase/database') },
      { find: 'firebase/storage', replacement: path.resolve(__dirname, '../node_modules/firebase/storage') },
      { find: 'firebase/functions', replacement: path.resolve(__dirname, '../node_modules/firebase/functions') },
      { find: 'firebase/analytics', replacement: path.resolve(__dirname, '../node_modules/firebase/analytics') },
      { find: 'firebase/ai', replacement: path.resolve(__dirname, '../node_modules/firebase/ai') },

      // More specific aliases first - for yourstop frontend @/ imports
      { 
        find: /^@\/(lib|components|hooks|app|types)\/(.*)$/, 
        replacement: path.resolve(__dirname, "./src/yourstop/frontend/src/$1/$2")
      },
      // General @/ alias for main project
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "@frontend", replacement: path.resolve(__dirname, "./src/frontend") },
      { find: "@yourstop", replacement: path.resolve(__dirname, "./src/yourstop/frontend/src") },
    ],
  },
  build: {
    // NOTE: This repo bundles a very large dependency graph; minified output has
    // been intermittently causing Rollup/Vite import-analysis parse failures on Windows.
    // Disabling minification keeps builds reliable (you can re-enable later).
    minify: false,
    // Host the app under /App (PascalCase) on Firebase Hosting
    outDir: "dist/App",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      external: (id) => {
        // Exclude yourstop frontend files from build - they're a separate Next.js project
        if (id.includes('yourstop/frontend/src') && !id.includes('node_modules')) {
          return false; // Don't externalize, but we'll handle it differently
        }
        return false;
      },
    },
  },
  optimizeDeps: {
    // CRITICAL: Prebundle Firebase consistently to avoid duplicate copies in dev.
    include: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/database",
      "firebase/storage",
      "firebase/functions",
      "firebase/analytics",
      "firebase/ai",
    ],
    exclude: [],
  },
  // Important: asset URLs + router basename expect /App
  base: "/App",
  server: {
    // YourStop proxy removed - now integrated into main Vite app
    // IMPORTANT: ignore legacy/standalone YourStop Next.js artifacts so Vite's
    // dep optimizer doesn't try to crawl them (can cause "Outdated Optimize Dep").
    watch: {
      ignored: [
        '**/src/oldyourstop/**',
        // Standalone YourStop app workspace (has its own package.json)
        '**/src/yourstop/frontend/node_modules/**',
        '**/src/yourstop/frontend/.next/**',
      ],
    },
  },
})
