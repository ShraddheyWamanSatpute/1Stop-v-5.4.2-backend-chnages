#!/usr/bin/env node

/**
 * Syncs the root `dist/` folder into `app/dist/` so `app/firebase.json`
 * can use a local `public: "dist"` directory (required by newer firebase-tools).
 *
 * This avoids changing Vite output paths while keeping hosting config scoped to /app.
 */

const fs = require("fs")
const path = require("path")

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function main() {
  // __dirname = <repo>/app/backend/scripts
  // repoRoot should be <repo>
  const repoRoot = path.resolve(__dirname, "..", "..", "..")
  const src = path.join(repoRoot, "dist")
  const dest = path.join(repoRoot, "app", "dist")

  if (!fs.existsSync(src)) {
    console.error(`✗ Source dist not found: ${src}`)
    process.exitCode = 1
    return
  }

  // Clean destination first to avoid stale files.
  try {
    fs.rmSync(dest, { recursive: true, force: true })
  } catch {
    // ignore
  }
  ensureDir(dest)

  fs.cpSync(src, dest, { recursive: true })
  console.log(`✓ Synced ${path.relative(repoRoot, src)} -> ${path.relative(repoRoot, dest)}`)
}

main()

