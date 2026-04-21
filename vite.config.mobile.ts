import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vite config for building Mobile/ESS section (/Mobile routes)
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        mobile: path.resolve(__dirname, 'index.html'),
      },
      onwarn(warning, warn) {
        // Keep build output clean; we already control chunking intentionally.
        if (warning.code === 'CHUNK_SIZE_LIMIT' || warning.code === 'DYNAMIC_IMPORT_CONFLICT') return
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined

          if (id.includes("jspdf")) return "jspdf"
          if (id.includes("xlsx")) return "xlsx"
          if (id.includes("html2canvas")) return "html2canvas"

          if (id.includes("/react/") || id.includes("/react-dom/")) return "react"
          if (id.includes("react-router")) return "router"

          if (id.includes("firebase") || id.includes("@firebase/")) return "firebase-all"

          if (id.includes("@mui/icons-material")) return "mui-icons"
          if (id.includes("@mui/x-date-pickers")) return "mui-x-date-pickers"
          if (id.includes("@mui/x-")) return "mui-x"
          if (id.includes("@mui/material")) return "mui-material"
          if (id.includes("@mui/system") || id.includes("@mui/base") || id.includes("@mui/utils")) return "mui-system"
          if (id.includes("@mui/")) return "mui"
          // IMPORTANT: Do NOT force emotion into a dedicated chunk (can contribute to circular deps).

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
    'process.env.BUILD_SECTION': JSON.stringify('mobile'),
  },
})
