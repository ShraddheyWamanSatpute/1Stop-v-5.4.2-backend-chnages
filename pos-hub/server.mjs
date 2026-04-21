import http from "node:http"
import { promises as fs } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import os from "node:os"
import net from "node:net"
import {
  dojoCancelTerminalSession,
  dojoGetPaymentIntent,
  dojoGetTerminalSession,
  dojoListTerminals,
  dojoRefund,
  dojoSale,
  dojoStartSale,
  dojoSubmitSignatureDecision,
} from "./providers/dojo.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT || 8787)
const DATA_DIR = path.join(__dirname, "data")
const QUEUE_FILE = path.join(DATA_DIR, "queue.jsonl")
const STATUS_FILE = path.join(DATA_DIR, "status.json")

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function json(res, statusCode, body) {
  const payload = JSON.stringify(body)
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (chunk) => {
      data += chunk
      if (data.length > 2_000_000) reject(new Error("Payload too large"))
    })
    req.on("end", () => resolve(data))
    req.on("error", reject)
  })
}

async function appendQueue(entry) {
  await ensureDataDir()
  const line = JSON.stringify({ ...entry, queuedAt: Date.now() }) + "\n"
  await fs.appendFile(QUEUE_FILE, line, "utf8")
}

async function sendRawToPrinter({ ip, port = 9100, data }) {
  if (!ip) throw new Error("Missing printer ip")
  if (!data) throw new Error("Missing print data")
  const p = Number(port || 9100)
  return await new Promise((resolve, reject) => {
    const socket = new net.Socket()
    const timeout = setTimeout(() => {
      socket.destroy(new Error("Printer connection timeout"))
    }, 8000)
    socket.once("error", (err) => {
      clearTimeout(timeout)
      reject(err)
    })
    socket.connect(p, ip, () => {
      try {
        socket.write(data, "utf8", () => {
          socket.end()
          clearTimeout(timeout)
          resolve(true)
        })
      } catch (e) {
        clearTimeout(timeout)
        reject(e)
      }
    })
  })
}

async function readQueueTail(limit) {
  await ensureDataDir()
  try {
    const content = await fs.readFile(QUEUE_FILE, "utf8")
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    const tail = lines.slice(Math.max(0, lines.length - limit))
    return tail.map((l) => JSON.parse(l))
  } catch (e) {
    return []
  }
}

async function readQueueSize() {
  await ensureDataDir()
  try {
    const content = await fs.readFile(QUEUE_FILE, "utf8")
    return content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean).length
  } catch {
    return 0
  }
}

async function readStatus() {
  await ensureDataDir()
  try {
    const raw = await fs.readFile(STATUS_FILE, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function runSyncIfConfigured() {
  const databaseURL = process.env.FIREBASE_DATABASE_URL
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!databaseURL || !gac) {
    throw new Error("Hub sync not configured (set FIREBASE_DATABASE_URL + GOOGLE_APPLICATION_CREDENTIALS)")
  }
  const mod = await import("./sync.mjs")
  if (typeof mod.runSync !== "function") throw new Error("sync.mjs missing runSync()")
  await mod.runSync()
  return true
}

async function handlePdqSale(payload) {
  const provider = payload?.provider || "dojo"
  if (provider === "dojo") {
    const result = await dojoSale(payload)
    await appendQueue({ type: "pdq.sale", payload: { ...payload, provider }, reference: result?.reference })
    return result
  }
  return { approved: false, message: `Unsupported PDQ provider: ${provider}` }
}

async function handlePdqRefund(payload) {
  const provider = payload?.provider || "dojo"
  if (provider === "dojo") {
    const result = await dojoRefund(payload)
    await appendQueue({ type: "pdq.refund", payload: { ...payload, provider }, reference: result?.reference })
    return result
  }
  return { approved: false, message: `Unsupported PDQ provider: ${provider}` }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) return json(res, 404, { ok: false })
    if (req.method === "OPTIONS") return json(res, 200, { ok: true })

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, service: "pos-hub", time: Date.now() })
    }

    if (req.method === "GET" && url.pathname === "/info") {
      const hostname = os.hostname()
      const interfaces = os.networkInterfaces()
      const ips = Object.values(interfaces || {})
        .flat()
        .filter(Boolean)
        .filter((i) => i.family === "IPv4" && !i.internal)
        .map((i) => i.address)
      const [queueSize, status] = await Promise.all([readQueueSize(), readStatus()])
      return json(res, 200, { ok: true, service: "pos-hub", hostname, ips, port: PORT, queueSize, status })
    }

    if (req.method === "GET" && url.pathname === "/sync/status") {
      const [queueSize, status] = await Promise.all([readQueueSize(), readStatus()])
      const configured = !!(process.env.FIREBASE_DATABASE_URL && process.env.GOOGLE_APPLICATION_CREDENTIALS)
      return json(res, 200, { ok: true, configured, queueSize, status })
    }

    if (req.method === "POST" && url.pathname === "/sync/run") {
      try {
        await runSyncIfConfigured()
        const [queueSize, status] = await Promise.all([readQueueSize(), readStatus()])
        return json(res, 200, { ok: true, queueSize, status })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Sync failed" })
      }
    }

    if (req.method === "POST" && url.pathname === "/queue/billUpsert") {
      const raw = await readBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      await appendQueue({ type: "pos.billUpsert", payload })
      return json(res, 200, { ok: true })
    }

    if (req.method === "POST" && url.pathname === "/queue/paymentTransaction") {
      const raw = await readBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      await appendQueue({ type: "pos.paymentTransaction", payload })
      return json(res, 200, { ok: true })
    }

    if (req.method === "POST" && url.pathname === "/queue/paymentTransactionUpdate") {
      const raw = await readBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      await appendQueue({ type: "pos.paymentTransactionUpdate", payload })
      return json(res, 200, { ok: true })
    }

    if (req.method === "GET" && url.pathname === "/queue/tail") {
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 25)))
      const tail = await readQueueTail(limit)
      return json(res, 200, tail)
    }

    if (req.method === "POST" && url.pathname === "/pdq/sale") {
      const raw = await readBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      const result = await handlePdqSale(payload)
      return json(res, 200, result)
    }

    if (req.method === "POST" && url.pathname === "/pdq/refund") {
      const raw = await readBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      const result = await handlePdqRefund(payload)
      return json(res, 200, result)
    }

    // Async PDQ flow for better UX (start -> poll -> cancel)
    if (req.method === "POST" && url.pathname === "/pdq/start-sale") {
      const raw = await readBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      const provider = payload?.provider || "dojo"
      if (provider !== "dojo") return json(res, 400, { ok: false, message: `Unsupported PDQ provider: ${provider}` })
      try {
        const { paymentIntentId, terminalSessionId } = await dojoStartSale(payload)
        await appendQueue({ type: "pdq.sale.started", payload: { ...payload, provider }, reference: paymentIntentId })
        return json(res, 200, { ok: true, provider, paymentIntentId, terminalSessionId })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Failed to start sale" })
      }
    }

    if (req.method === "GET" && url.pathname === "/pdq/status") {
      const provider = url.searchParams.get("provider") || "dojo"
      const paymentIntentId = url.searchParams.get("paymentIntentId")
      if (!paymentIntentId) return json(res, 400, { ok: false, message: "Missing paymentIntentId" })
      if (provider !== "dojo") return json(res, 400, { ok: false, message: `Unsupported PDQ provider: ${provider}` })
      try {
        const pi = await dojoGetPaymentIntent(paymentIntentId)
        const status = pi?.status
        const approved = status === "Captured" || status === "Authorized"
        const declined = status === "Reversed" || status === "Canceled"
        // Return a small subset of payment details for audit/UI.
        const paymentDetails = pi?.paymentDetails || null
        return json(res, 200, {
          ok: true,
          provider,
          paymentIntentId,
          status,
          approved: approved ? true : declined ? false : undefined,
          paymentDetails,
        })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Failed to fetch status" })
      }
    }

    if (req.method === "PUT" && url.pathname === "/pdq/cancel-session") {
      const provider = url.searchParams.get("provider") || "dojo"
      const terminalSessionId = url.searchParams.get("terminalSessionId")
      if (!terminalSessionId) return json(res, 400, { ok: false, message: "Missing terminalSessionId" })
      if (provider !== "dojo") return json(res, 400, { ok: false, message: `Unsupported PDQ provider: ${provider}` })
      try {
        await dojoCancelTerminalSession(terminalSessionId)
        await appendQueue({ type: "pdq.sale.cancelled", payload: { provider, terminalSessionId } })
        return json(res, 200, { ok: true })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Failed to cancel session" })
      }
    }

    if (req.method === "GET" && url.pathname === "/pdq/session") {
      const provider = url.searchParams.get("provider") || "dojo"
      const terminalSessionId = url.searchParams.get("terminalSessionId")
      if (!terminalSessionId) return json(res, 400, { ok: false, message: "Missing terminalSessionId" })
      if (provider !== "dojo") return json(res, 400, { ok: false, message: `Unsupported PDQ provider: ${provider}` })
      try {
        const session = await dojoGetTerminalSession(terminalSessionId)
        return json(res, 200, { ok: true, provider, terminalSessionId, session })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Failed to retrieve terminal session" })
      }
    }

    if (req.method === "PUT" && url.pathname === "/pdq/signature") {
      const provider = url.searchParams.get("provider") || "dojo"
      const terminalSessionId = url.searchParams.get("terminalSessionId")
      if (!terminalSessionId) return json(res, 400, { ok: false, message: "Missing terminalSessionId" })
      if (provider !== "dojo") return json(res, 400, { ok: false, message: `Unsupported PDQ provider: ${provider}` })
      const raw = await readBody(req)
      const body = raw ? JSON.parse(raw) : {}
      try {
        const result = await dojoSubmitSignatureDecision(terminalSessionId, !!body.accepted)
        await appendQueue({ type: "pdq.signature", payload: { provider, terminalSessionId, accepted: !!body.accepted } })
        return json(res, 200, { ok: true, result })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Failed to submit signature decision" })
      }
    }

    if (req.method === "GET" && url.pathname === "/pdq/terminals") {
      const provider = url.searchParams.get("provider") || "dojo"
      const desiredStatus = url.searchParams.get("status") // e.g. Available
      if (provider !== "dojo") {
        return json(res, 400, { ok: false, message: `Unsupported PDQ provider: ${provider}` })
      }
      try {
        const data = await dojoListTerminals()
        const list = Array.isArray(data) ? data : data?.data || data?.terminals || []
        const filtered = desiredStatus
          ? (list || []).filter((t) => String(t?.status || "").toLowerCase() === String(desiredStatus).toLowerCase())
          : list
        return json(res, 200, { ok: true, provider, terminals: filtered })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Failed to list terminals" })
      }
    }

    if (req.method === "POST" && url.pathname === "/print/raw") {
      const raw = await readBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      try {
        await sendRawToPrinter({ ip: payload.ip, port: payload.port, data: payload.data })
        await appendQueue({ type: "print.raw", payload: { ip: payload.ip, port: payload.port, bytes: String(payload.data || "").length } })
        return json(res, 200, { ok: true })
      } catch (e) {
        return json(res, 400, { ok: false, message: e?.message || "Failed to print" })
      }
    }

    return json(res, 404, { ok: false, message: "Not found" })
  } catch (err) {
    return json(res, 500, { ok: false, message: err?.message || "Server error" })
  }
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[pos-hub] listening on port ${PORT}`)
})

