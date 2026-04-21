#!/usr/bin/env node

/**
 * Writes a non-sensitive build metadata file to Firebase Hosting output.
 *
 * Output: <dist>/version.json  (served at /version.json)
 *
 * Safe defaults:
 * - If git isn't available, gitSha becomes "unknown"
 * - If dist doesn't exist yet, it will be created
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch {
    return undefined
  }
}

function tryGitSha() {
  try {
    // Works when the repo is a git repo; otherwise throws.
    const out = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
    return String(out).trim() || "unknown"
  } catch {
    return "unknown"
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function main() {
  const distArgIdx = process.argv.indexOf("--dist")
  const distDir =
    (distArgIdx >= 0 && process.argv[distArgIdx + 1]) ||
    process.env.DIST_DIR ||
    "dist"

  const distPath = path.resolve(process.cwd(), distDir)
  ensureDir(distPath)

  const pkg =
    readJson(path.resolve(process.cwd(), "package.json")) ||
    readJson(path.resolve(__dirname, "../../package.json")) ||
    {}

  const nowIso = new Date().toISOString()
  const gitSha = process.env.GIT_SHA || tryGitSha()

  const payload = {
    app: "1stop",
    service: process.env.APP_SERVICE || "frontend",
    environment: process.env.APP_ENV || process.env.NODE_ENV || "unknown",
    version: process.env.APP_VERSION || pkg.version || "unknown",
    gitSha,
    buildTime: process.env.BUILD_TIME || nowIso,
  }

  const outFile = path.join(distPath, "version.json")
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8")
  console.log(`✓ Wrote ${path.relative(process.cwd(), outFile)}`)
}

main()

