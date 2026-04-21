export interface PDQSaleRequest {
  amount: number
  currency?: string
  billId?: string
  tableName?: string
  tableNumber?: string
  provider?: "dojo" | "other"
  terminalId?: string
  paymentIntentId?: string // for refunds
  testMode?: boolean
}

export interface PDQSaleResponse {
  approved: boolean
  reference?: string
  message?: string
}

export interface HubQueueResponse {
  ok: boolean
  queuedAt?: number
}

export interface HubQueueEntry<T = unknown> {
  type: string
  payload: T
  reference?: string
  queuedAt: number
}

function withTrailingSlash(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
}

async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 6000, ...rest } = init
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Hub request failed (${res.status}): ${text || res.statusText}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export async function pingHub(baseUrl: string): Promise<boolean> {
  try {
    const url = `${withTrailingSlash(baseUrl)}health`
    const data = await fetchJson<{ ok: boolean }>(url, { method: "GET", timeoutMs: 2000 })
    return !!data?.ok
  } catch {
    return false
  }
}

export async function pdqSale(baseUrl: string, payload: PDQSaleRequest): Promise<PDQSaleResponse> {
  const url = `${withTrailingSlash(baseUrl)}pdq/sale`
  return await fetchJson<PDQSaleResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs: 15000,
  })
}

export async function pdqRefund(baseUrl: string, payload: PDQSaleRequest): Promise<PDQSaleResponse> {
  const url = `${withTrailingSlash(baseUrl)}pdq/refund`
  return await fetchJson<PDQSaleResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs: 15000,
  })
}

export interface PDQStartSaleResponse {
  ok: boolean
  provider: string
  paymentIntentId?: string
  terminalSessionId?: string
  message?: string
}

export interface PDQPollStatusResponse {
  ok: boolean
  provider: string
  paymentIntentId: string
  status?: string
  approved?: boolean
  message?: string
  paymentDetails?: any
}

export async function pdqStartSale(baseUrl: string, payload: PDQSaleRequest): Promise<PDQStartSaleResponse> {
  const url = `${withTrailingSlash(baseUrl)}pdq/start-sale`
  return await fetchJson<PDQStartSaleResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs: 15000,
  })
}

export async function pdqPollStatus(baseUrl: string, params: { provider?: string; paymentIntentId: string }): Promise<PDQPollStatusResponse> {
  const qs = new URLSearchParams()
  qs.set("provider", params.provider || "dojo")
  qs.set("paymentIntentId", params.paymentIntentId)
  const url = `${withTrailingSlash(baseUrl)}pdq/status?${qs.toString()}`
  return await fetchJson<PDQPollStatusResponse>(url, { method: "GET", timeoutMs: 8000 })
}

export async function pdqCancelSession(baseUrl: string, params: { provider?: string; terminalSessionId: string }): Promise<{ ok: boolean; message?: string }> {
  const qs = new URLSearchParams()
  qs.set("provider", params.provider || "dojo")
  qs.set("terminalSessionId", params.terminalSessionId)
  const url = `${withTrailingSlash(baseUrl)}pdq/cancel-session?${qs.toString()}`
  return await fetchJson<{ ok: boolean; message?: string }>(url, { method: "PUT", timeoutMs: 8000 })
}

export async function pdqGetSession(baseUrl: string, params: { provider?: string; terminalSessionId: string }): Promise<{ ok: boolean; session?: any; message?: string }> {
  const qs = new URLSearchParams()
  qs.set("provider", params.provider || "dojo")
  qs.set("terminalSessionId", params.terminalSessionId)
  const url = `${withTrailingSlash(baseUrl)}pdq/session?${qs.toString()}`
  return await fetchJson<{ ok: boolean; session?: any; message?: string }>(url, { method: "GET", timeoutMs: 8000 })
}

export async function pdqSubmitSignature(
  baseUrl: string,
  params: { provider?: string; terminalSessionId: string; accepted: boolean },
): Promise<{ ok: boolean; message?: string }> {
  const qs = new URLSearchParams()
  qs.set("provider", params.provider || "dojo")
  qs.set("terminalSessionId", params.terminalSessionId)
  const url = `${withTrailingSlash(baseUrl)}pdq/signature?${qs.toString()}`
  return await fetchJson<{ ok: boolean; message?: string }>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accepted: params.accepted }),
    timeoutMs: 15000,
  })
}

export async function printRaw(
  baseUrl: string,
  payload: { ip: string; port?: number; data: string },
): Promise<{ ok: boolean; message?: string }> {
  const url = `${withTrailingSlash(baseUrl)}print/raw`
  return await fetchJson<{ ok: boolean; message?: string }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs: 12000,
  })
}

export async function queueBillUpsert(baseUrl: string, bill: unknown): Promise<HubQueueResponse> {
  const url = `${withTrailingSlash(baseUrl)}queue/billUpsert`
  return await fetchJson<HubQueueResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bill),
    timeoutMs: 6000,
  })
}

export async function queuePaymentTransaction(baseUrl: string, tx: unknown): Promise<HubQueueResponse> {
  const url = `${withTrailingSlash(baseUrl)}queue/paymentTransaction`
  return await fetchJson<HubQueueResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx),
    timeoutMs: 6000,
  })
}

export async function queuePaymentTransactionUpdate(baseUrl: string, payload: unknown): Promise<HubQueueResponse> {
  const url = `${withTrailingSlash(baseUrl)}queue/paymentTransactionUpdate`
  return await fetchJson<HubQueueResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs: 6000,
  })
}

export async function getQueueTail(baseUrl: string, limit = 25): Promise<HubQueueEntry[]> {
  const url = `${withTrailingSlash(baseUrl)}queue/tail?limit=${encodeURIComponent(String(limit))}`
  return await fetchJson<HubQueueEntry[]>(url, { method: "GET", timeoutMs: 4000 })
}

export interface HubInfo {
  ok: boolean
  service: string
  hostname?: string
  ips?: string[]
  port?: number
  queueSize?: number
  status?: any
}

export async function getHubInfo(baseUrl: string): Promise<HubInfo> {
  const url = `${withTrailingSlash(baseUrl)}info`
  return await fetchJson<HubInfo>(url, { method: "GET", timeoutMs: 4000 })
}

export interface HubPdqTerminalsResponse {
  ok: boolean
  provider: string
  terminals: any[]
  message?: string
}

export async function getPdqTerminals(baseUrl: string, params: { provider?: string; status?: string } = {}): Promise<HubPdqTerminalsResponse> {
  const provider = params.provider || "dojo"
  const qs = new URLSearchParams()
  qs.set("provider", provider)
  if (params.status) qs.set("status", params.status)
  const url = `${withTrailingSlash(baseUrl)}pdq/terminals?${qs.toString()}`
  return await fetchJson<HubPdqTerminalsResponse>(url, { method: "GET", timeoutMs: 8000 })
}

export interface HubSyncStatus {
  ok: boolean
  configured: boolean
  queueSize: number
  status: null | {
    lastSyncAt?: number
    ok?: boolean
    applied?: number
    ignored?: number
    failureCount?: number
    failureReport?: string
    archived?: string
    message?: string
  }
  message?: string
}

export async function getHubSyncStatus(baseUrl: string): Promise<HubSyncStatus> {
  const url = `${withTrailingSlash(baseUrl)}sync/status`
  return await fetchJson<HubSyncStatus>(url, { method: "GET", timeoutMs: 4000 })
}

export async function runHubSync(baseUrl: string): Promise<HubSyncStatus> {
  const url = `${withTrailingSlash(baseUrl)}sync/run`
  return await fetchJson<HubSyncStatus>(url, { method: "POST", timeoutMs: 30000 })
}

