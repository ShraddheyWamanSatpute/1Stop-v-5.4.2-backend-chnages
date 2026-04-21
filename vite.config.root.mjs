import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // Ensure Vite loads `.env*` so proxy targets match runtime `import.meta.env`.
  const env = loadEnv(mode, process.cwd(), "")
  const firebaseEnv = String(env.VITE_FIREBASE_ENV || "main").toLowerCase() === "test" ? "test" : "main"
  const prefix = firebaseEnv === "test" ? "VITE_FIREBASE_TEST_" : "VITE_FIREBASE_"
  const deriveProjectIdFromDatabaseUrl = (url) => {
    const raw = String(url || "").trim()
    if (!raw) return null
    try {
      const u = new URL(raw)
      const host = String(u.hostname || "").toLowerCase()
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

  const dbUrl = env[`${prefix}DATABASE_URL`]
  const derivedProjectId = deriveProjectIdFromDatabaseUrl(dbUrl)
  const firebaseProjectId = derivedProjectId || env[`${prefix}PROJECT_ID`] || "stop-test-8025f"
  const firebaseFunctionsRegion = env[`${prefix}FUNCTIONS_REGION`] || "us-central1"
  const cloudFunctionsOrigin = `https://${firebaseFunctionsRegion}-${firebaseProjectId}.cloudfunctions.net`

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api/functions": {
          target: cloudFunctionsOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/functions/, ""),
        },
      },
    },
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
        {
          find: /^@\/(.*)$/,
          replacement: path.resolve(__dirname, "./yourstop/frontend/src/$1"),
        },
        {
          find: "@",
          replacement: path.resolve(__dirname, "./app"),
        },
      ],
    },
    build: {
      outDir: "dist",
      emptyOutDir: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
        onwarn(warning, warn) {
          if (warning.code === "CHUNK_SIZE_LIMIT" || warning.code === "DYNAMIC_IMPORT_CONFLICT") return
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
          if (id.includes("@emotion/")) return "emotion"

          if (id.includes("date-fns")) return "date-fns"
          if (id.includes("dayjs")) return "dayjs"
          if (id.includes("moment")) return "moment"

          if (id.includes("recharts") || id.includes("d3-")) return "charts"
          if (id.includes("monaco-editor")) return "monaco"

          if (id.includes("emoji-picker-react")) return "emoji-picker"
          if (id.includes("react-draggable")) return "react-draggable"
          if (id.includes("react-resizable")) return "react-resizable"
          if (id.includes("chart.js") || id.includes("/chartjs-") || id.includes("@kurkle/color")) return "chartjs"
          if (id.includes("react-color") || id.includes("react-colorful") || id.includes("tinycolor")) return "color"
          if (id.includes("@floating-ui/") || id.includes("/floating-ui/")) return "floating-ui"
          if (id.includes("@popperjs/") || id.includes("/popperjs/")) return "popper"

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
      "process.env.BUILD_SECTION": JSON.stringify("root"),
    },
  }
})
