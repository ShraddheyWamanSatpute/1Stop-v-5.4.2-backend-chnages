import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vite config for building App section (/App routes)
export default defineConfig(({ mode }) => {
  // Ensure Vite loads `.env*` so proxy targets match runtime `import.meta.env`.
  const env = loadEnv(mode, process.cwd(), "")
  const firebaseEnv = String(env.VITE_FIREBASE_ENV || "main").toLowerCase() === "test" ? "test" : "main"
  const prefix = firebaseEnv === "test" ? "VITE_FIREBASE_TEST_" : "VITE_FIREBASE_"
  const deriveProjectIdFromDatabaseUrl = (url: string | undefined): string | null => {
    const raw = String(url || "").trim()
    if (!raw) return null
    try {
      const u = new URL(raw)
      const host = (u.hostname || "").toLowerCase()
      if (host.includes("firebasedatabase.app")) {
        const prefix = host.split(".firebasedatabase.app")[0] || ""
        if (prefix.includes("-default-rtdb")) {
          return prefix.split("-default-rtdb")[0] || null
        }
      }
      if (host.endsWith(".firebaseio.com")) {
        return host.replace(".firebaseio.com", "") || null
      }
    } catch {
      // ignore
    }
    return null
  }

  const dbUrl = (env as any)[`${prefix}DATABASE_URL`] as string | undefined
  const derivedProjectId = deriveProjectIdFromDatabaseUrl(dbUrl)
  const firebaseProjectId = derivedProjectId || (env as any)[`${prefix}PROJECT_ID`] || 'stop-test-8025f'
  const firebaseFunctionsRegion = (env as any)[`${prefix}FUNCTIONS_REGION`] || 'us-central1'
  const cloudFunctionsOrigin = `https://${firebaseFunctionsRegion}-${firebaseProjectId}.cloudfunctions.net`

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/functions": {
          target: cloudFunctionsOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/functions/, ""),
        },
      },
    },
    optimizeDeps: {
      // Ensure Firebase subpath imports are pre-bundled consistently in dev
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
    },
    resolve: {
      // Prevent multiple Firebase copies across chunks
      // Also dedupe MUI/Emotion to ensure ThemeProvider + useTheme share the same context
      // (prevents falling back to default MUI blue when multiple copies are bundled in dev).
      dedupe: [
        "firebase",
        "@firebase/app",
        "@firebase/component",
        "@firebase/util",
        "@emotion/react",
        "@emotion/styled",
        "@mui/material",
        "@mui/system",
        "@mui/base",
        "@mui/utils",
        "@mui/icons-material",
        "@mui/x-data-grid",
        "@mui/x-date-pickers",
        "@mui/x-internals",
        "@mui/private-theming",
        "@mui/styled-engine",
      ],
      alias: [
        // YourStop @/ alias
        {
          find: /^@\/(.*)$/,
          replacement: path.resolve(__dirname, './yourstop/frontend/src/$1'),
        },
        // General @/ alias for main app
        { 
          find: '@', 
          replacement: path.resolve(__dirname, './app') 
        },
      ],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false, // Don't clear dist, as other sections may be there
      // This is a warning threshold only (in kB); large lazy chunks may still exist.
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        input: {
          app: path.resolve(__dirname, 'index.html'),
        },
        onwarn(warning, warn) {
          // Keep build output clean; we already control chunking intentionally.
          if (warning.code === 'CHUNK_SIZE_LIMIT' || warning.code === 'DYNAMIC_IMPORT_CONFLICT') return
          warn(warning)
        },
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined

          // Heavy, optional export libs
          if (id.includes("jspdf")) return "jspdf"
          if (id.includes("xlsx")) return "xlsx"
          if (id.includes("html2canvas")) return "html2canvas"

          // Framework / router
          if (id.includes("/react/") || id.includes("/react-dom/")) return "react"
          if (id.includes("react-router")) return "router"

          // CRITICAL: Keep ALL Firebase code in ONE chunk.
          // Splitting Firebase across chunks can lead to "Service X is not available"
          // when different chunks load different registries.
          if (id.includes("firebase") || id.includes("@firebase/")) return "firebase-all"

          // UI libraries
          if (id.includes("@mui/icons-material")) return "mui-icons"
          if (id.includes("@mui/x-date-pickers")) return "mui-x-date-pickers"
          if (id.includes("@mui/x-")) return "mui-x"
          if (id.includes("@mui/material")) return "mui-material"
          if (id.includes("@mui/system") || id.includes("@mui/base") || id.includes("@mui/utils")) return "mui-system"
          if (id.includes("@mui/")) return "mui"
          // IMPORTANT: Do NOT force emotion into a dedicated chunk (can contribute to circular deps).

          // Date libs
          if (id.includes("date-fns")) return "date-fns"
          if (id.includes("dayjs")) return "dayjs"
          if (id.includes("moment")) return "moment"

          // Charts / editors / misc heavy deps
          // IMPORTANT: Do NOT force recharts/d3 into a dedicated chunk (can contribute to circular deps).
          if (id.includes("monaco-editor")) return "monaco"

          // Other heavy UI/libs that often end up in the leftover vendor chunk
          if (id.includes("emoji-picker-react")) return "emoji-picker"
          if (id.includes("react-draggable")) return "react-draggable"
          if (id.includes("react-resizable")) return "react-resizable"
          if (id.includes("chart.js") || id.includes("/chartjs-") || id.includes("@kurkle/color")) return "chartjs"
          if (id.includes("react-color") || id.includes("react-colorful") || id.includes("tinycolor")) return "color"
          if (id.includes("@floating-ui/") || id.includes("/floating-ui/")) return "floating-ui"
          if (id.includes("@popperjs/") || id.includes("/popperjs/")) return "popper"

          // Other top-level deps
          if (id.includes("@chakra-ui/") || id.includes("/chakra-ui/")) return "chakra"
          if (id.includes("framer-motion")) return "framer"
          if (id.includes("react-big-calendar")) return "calendar"
          if (id.includes("lucide-react")) return "lucide"
          if (id.includes("@emailjs/") || id.includes("emailjs")) return "emailjs"
          if (id.includes("qrcode.react") || id.includes("qrcode")) return "qrcode"

            return "vendor"
          },
        },
      },
    },
    define: {
      'process.env.BUILD_SECTION': JSON.stringify('app'),
    },
  }
})
