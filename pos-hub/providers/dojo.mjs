const DOJO_BASE_URL = "https://api.dojo.tech"

function requiredEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} env var`)
  return v
}

function dojoHeaders({ includeTerminalHeaders }) {
  const version = process.env.DOJO_VERSION || "2025-09-10"
  const secretKey = requiredEnv("DOJO_SECRET_KEY") // Basic auth value, e.g. sk_sandbox_... or sk_prod_...

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${secretKey}`,
    version,
  }

  if (includeTerminalHeaders) {
    headers["reseller-id"] = requiredEnv("DOJO_RESELLER_ID")
    headers["software-house-id"] = requiredEnv("DOJO_SOFTWARE_HOUSE_ID")
  }

  return headers
}

function toMinorUnits(amount, currencyCode) {
  // Dojo examples use minor units. GBP/EUR are 2dp.
  // Extend later for other currencies if needed.
  const decimals = currencyCode === "JPY" ? 0 : 2
  const factor = 10 ** decimals
  return Math.round(Number(amount) * factor)
}

async function fetchJson(url, { method = "GET", headers, body } = {}) {
  const res = await fetch(url, { method, headers, body })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Dojo API error (${res.status}): ${text || res.statusText}`)
  }
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) return null
  return await res.json()
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

export async function dojoGetPaymentIntent(paymentIntentId) {
  return await fetchJson(`${DOJO_BASE_URL}/payment-intents/${encodeURIComponent(paymentIntentId)}`, {
    method: "GET",
    headers: dojoHeaders({ includeTerminalHeaders: false }),
  })
}

export async function dojoCancelTerminalSession(terminalSessionId) {
  if (!terminalSessionId) throw new Error("Missing terminalSessionId")
  return await fetchJson(`${DOJO_BASE_URL}/terminal-sessions/${encodeURIComponent(terminalSessionId)}/cancel`, {
    method: "PUT",
    headers: dojoHeaders({ includeTerminalHeaders: true }),
  })
}

export async function dojoGetTerminalSession(terminalSessionId) {
  if (!terminalSessionId) throw new Error("Missing terminalSessionId")
  return await fetchJson(`${DOJO_BASE_URL}/terminal-sessions/${encodeURIComponent(terminalSessionId)}`, {
    method: "GET",
    headers: dojoHeaders({ includeTerminalHeaders: true }),
  })
}

export async function dojoSubmitSignatureDecision(terminalSessionId, accepted) {
  if (!terminalSessionId) throw new Error("Missing terminalSessionId")
  return await fetchJson(`${DOJO_BASE_URL}/terminal-sessions/${encodeURIComponent(terminalSessionId)}/signature`, {
    method: "PUT",
    headers: dojoHeaders({ includeTerminalHeaders: true }),
    body: JSON.stringify({ accepted: !!accepted }),
  })
}

export async function dojoStartSale(payload) {
  const currencyCode = (payload?.currency || "GBP").toUpperCase()
  const value = toMinorUnits(payload?.amount, currencyCode)
  if (!value || value <= 0) throw new Error("Invalid amount")

  const terminalId = payload?.terminalId || process.env.DOJO_TERMINAL_ID
  if (!terminalId) throw new Error("Missing Dojo terminalId")

  const reference = String(payload?.billId || `Bill-${Date.now()}`).slice(0, 60)
  const intent = await fetchJson(`${DOJO_BASE_URL}/payment-intents`, {
    method: "POST",
    headers: dojoHeaders({ includeTerminalHeaders: false }),
    body: JSON.stringify({
      amount: { value, currencyCode },
      reference,
      description: `POS sale ${reference}`,
      captureMode: "Auto",
    }),
  })
  const paymentIntentId = intent?.id
  if (!paymentIntentId) throw new Error("Dojo did not return payment intent id")

  const session = await fetchJson(`${DOJO_BASE_URL}/terminal-sessions`, {
    method: "POST",
    headers: dojoHeaders({ includeTerminalHeaders: true }),
    body: JSON.stringify({
      terminalId,
      details: {
        sale: { paymentIntentId },
        sessionType: "Sale",
      },
    }),
  })
  const terminalSessionId = session?.id
  return { paymentIntentId, terminalSessionId }
}

export async function dojoSale(payload) {
  const currencyCode = (payload?.currency || "GBP").toUpperCase()
  const value = toMinorUnits(payload?.amount, currencyCode)
  if (!value || value <= 0) return { approved: false, message: "Invalid amount" }

  const terminalId = payload?.terminalId || process.env.DOJO_TERMINAL_ID
  if (!terminalId) return { approved: false, message: "Missing Dojo terminalId" }

  // 1) Create a payment intent
  const reference = String(payload?.billId || `Bill-${Date.now()}`).slice(0, 60)
  const intent = await fetchJson(`${DOJO_BASE_URL}/payment-intents`, {
    method: "POST",
    headers: dojoHeaders({ includeTerminalHeaders: false }),
    body: JSON.stringify({
      amount: { value, currencyCode },
      reference,
      description: `POS sale ${reference}`,
      captureMode: "Auto",
    }),
  })
  const paymentIntentId = intent?.id
  if (!paymentIntentId) return { approved: false, message: "Dojo did not return payment intent id" }

  // 2) Create a terminal session (Sale)
  await fetchJson(`${DOJO_BASE_URL}/terminal-sessions`, {
    method: "POST",
    headers: dojoHeaders({ includeTerminalHeaders: true }),
    body: JSON.stringify({
      terminalId,
      details: {
        sale: { paymentIntentId },
        sessionType: "Sale",
      },
    }),
  })

  // 3) Poll payment intent status until finalized
  const timeoutMs = Number(payload?.timeoutMs || 60000)
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const pi = await dojoGetPaymentIntent(paymentIntentId)
    const status = pi?.status
    if (status === "Captured" || status === "Authorized") {
      // Use paymentIntentId as the reference so refunds can be linked later.
      return { approved: true, reference: paymentIntentId, message: status }
    }
    if (status === "Reversed" || status === "Canceled") {
      return { approved: false, reference: paymentIntentId, message: status }
    }
    await sleep(1200)
  }

  return { approved: false, reference: paymentIntentId, message: "Timed out waiting for terminal" }
}

export async function dojoRefund(payload) {
  const currencyCode = (payload?.currency || "GBP").toUpperCase()
  const amount = toMinorUnits(payload?.amount, currencyCode)
  if (!amount || amount <= 0) return { approved: false, message: "Invalid amount" }

  const paymentIntentId = payload?.paymentIntentId
  if (!paymentIntentId) return { approved: false, message: "Missing paymentIntentId for Dojo refund" }

  // API-based refund (does not require terminal session)
  const idempotencyKey =
    (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
  const res = await fetchJson(`${DOJO_BASE_URL}/payment-intents/${encodeURIComponent(paymentIntentId)}/refunds`, {
    method: "POST",
    headers: {
      ...dojoHeaders({ includeTerminalHeaders: false }),
      idempotencyKey,
    },
    body: JSON.stringify({ amount, refundReason: "POS refund" }),
  })

  return { approved: true, reference: res?.refundId || undefined, message: "Refund created" }
}

export async function dojoListTerminals() {
  // Terminal API requires reseller-id + software-house-id
  const terminals = await fetchJson(`${DOJO_BASE_URL}/terminals`, {
    method: "GET",
    headers: dojoHeaders({ includeTerminalHeaders: true }),
  })
  return terminals
}

