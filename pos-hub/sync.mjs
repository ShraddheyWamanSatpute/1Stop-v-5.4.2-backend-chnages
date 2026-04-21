import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { v4 as uuidv4 } from "uuid"
import admin from "firebase-admin"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, "data")
const QUEUE_FILE = path.join(DATA_DIR, "queue.jsonl")
const STATUS_FILE = path.join(DATA_DIR, "status.json")

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(...args)
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function initFirebaseAdmin() {
  // Use standard firebase-admin environment configuration:
  // - GOOGLE_APPLICATION_CREDENTIALS: path to service account JSON
  // - FIREBASE_DATABASE_URL: your RTDB URL (https://<project>.firebaseio.com)
  //
  // If already initialized, reuse.
  if (admin.apps.length > 0) return
  const databaseURL = process.env.FIREBASE_DATABASE_URL
  if (!databaseURL) {
    throw new Error("Missing FIREBASE_DATABASE_URL env var")
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL,
  })
}

async function loadQueueLines() {
  await ensureDataDir()
  try {
    const content = await fs.readFile(QUEUE_FILE, "utf8")
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    return lines.map((l) => JSON.parse(l))
  } catch {
    return []
  }
}

async function writeStatus(status) {
  await ensureDataDir()
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), "utf8")
}

async function archiveQueueFile() {
  await ensureDataDir()
  try {
    await fs.access(QUEUE_FILE)
  } catch {
    return null
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const archived = path.join(DATA_DIR, `queue.synced.${stamp}.jsonl`)
  await fs.rename(QUEUE_FILE, archived)
  return archived
}

async function upsertBill(basePath, bill) {
  if (!bill?.id) throw new Error("Bill missing id")
  const ref = admin.database().ref(`${basePath}/bills/${bill.id}`)
  await ref.update({ ...bill, updatedAt: Date.now() })
}

async function createPaymentTransaction(basePath, tx) {
  const txRef = admin.database().ref(`${basePath}/paymentTransactions`)
  const id = tx?.id || uuidv4()
  const ref = txRef.child(id)
  const now = Date.now()
  await ref.set({ ...tx, id, createdAt: tx?.createdAt || now, updatedAt: now })
}

async function updatePaymentTransaction(basePath, txId, updates) {
  if (!txId) throw new Error("PaymentTransactionUpdate missing txId")
  const ref = admin.database().ref(`${basePath}/paymentTransactions/${txId}`)
  await ref.update({ ...updates, updatedAt: Date.now() })
}

async function applyEntry(entry) {
  // We only sync the hub queue types we created.
  const type = entry?.type
  const payload = entry?.payload

  if (type === "pos.billUpsert") {
    const basePath = payload?.basePath
    const bill = payload?.bill
    if (!basePath || !bill) throw new Error("billUpsert payload missing basePath/bill")
    await upsertBill(basePath, bill)
    return { ok: true }
  }

  if (type === "pos.paymentTransaction") {
    const basePath = payload?.basePath
    const tx = payload?.tx
    if (!basePath || !tx) throw new Error("paymentTransaction payload missing basePath/tx")
    await createPaymentTransaction(basePath, tx)
    return { ok: true }
  }

  if (type === "pos.paymentTransactionUpdate") {
    const basePath = payload?.basePath
    const txId = payload?.txId
    const updates = payload?.updates
    if (!basePath || !txId || !updates) throw new Error("paymentTransactionUpdate payload missing basePath/txId/updates")
    await updatePaymentTransaction(basePath, txId, updates)
    return { ok: true }
  }

  // Ignore non-POS queue lines (pdq.sale/pdq.refund), they are audit-only stubs for now.
  return { ok: true, ignored: true }
}

export async function runSync() {
  initFirebaseAdmin()
  const lines = await loadQueueLines()
  if (lines.length === 0) {
    log("[pos-hub sync] queue is empty")
    await writeStatus({ lastSyncAt: Date.now(), ok: true, applied: 0, ignored: 0, message: "queue empty" })
    return
  }

  log(`[pos-hub sync] replaying ${lines.length} queued operations...`)

  let applied = 0
  let ignored = 0
  const failures = []

  for (let i = 0; i < lines.length; i++) {
    const entry = lines[i]
    try {
      const res = await applyEntry(entry)
      if (res?.ignored) ignored++
      else applied++
    } catch (e) {
      failures.push({ index: i, error: e?.message || String(e), entry })
    }
  }

  if (failures.length > 0) {
    log(`[pos-hub sync] FAILED: ${failures.length} entries could not be applied. Queue left intact.`)
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const reportPath = path.join(DATA_DIR, `sync.failures.${stamp}.json`)
    await fs.writeFile(reportPath, JSON.stringify({ failures }, null, 2), "utf8")
    log(`[pos-hub sync] wrote failure report: ${reportPath}`)
    await writeStatus({
      lastSyncAt: Date.now(),
      ok: false,
      applied,
      ignored,
      failureCount: failures.length,
      failureReport: reportPath,
    })
    process.exitCode = 1
    return
  }

  const archived = await archiveQueueFile()
  log(`[pos-hub sync] success. applied=${applied}, ignored=${ignored}`)
  if (archived) log(`[pos-hub sync] archived queue file to: ${archived}`)
  await writeStatus({ lastSyncAt: Date.now(), ok: true, applied, ignored, archived })
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runSync().catch((e) => {
    // eslint-disable-next-line no-console
    console.error("[pos-hub sync] fatal:", e)
    process.exit(1)
  })
}

