"use client"

import { db, get, onValue, push, ref, remove, set, update } from "../services/Firebase"
import type { SupplyClient, SupplyClientInvite, SupplyDelivery, SupplyOrder } from "../interfaces/Supply"

type AnyObj = Record<string, any>

const toArray = <T extends { id: string }>(val: unknown): T[] => {
  if (!val || typeof val !== "object") return []
  return Object.entries(val as AnyObj).map(([id, v]) => ({ id, ...(v as AnyObj) })) as T[]
}

// =========================
// Realtime subscriptions
// =========================

export function subscribeClients(
  supplyPath: string,
  onData: (rows: SupplyClient[]) => void,
  onError?: (message: string) => void,
): () => void {
  const r = ref(db, `${supplyPath}/clients`)
  return onValue(
    r,
    (snap) => onData(toArray<SupplyClient>(snap.val())),
    (err) => onError?.(err?.message || "Failed to load clients"),
  )
}

export function subscribeOrders(
  supplyPath: string,
  onData: (rows: SupplyOrder[]) => void,
  onError?: (message: string) => void,
): () => void {
  const r = ref(db, `${supplyPath}/orders`)
  return onValue(
    r,
    (snap) => onData(toArray<SupplyOrder>(snap.val())),
    (err) => onError?.(err?.message || "Failed to load orders"),
  )
}

export function subscribeDeliveries(
  supplyPath: string,
  onData: (rows: SupplyDelivery[]) => void,
  onError?: (message: string) => void,
): () => void {
  const r = ref(db, `${supplyPath}/deliveries`)
  return onValue(
    r,
    (snap) => onData(toArray<SupplyDelivery>(snap.val())),
    (err) => onError?.(err?.message || "Failed to load deliveries"),
  )
}

// =========================
// Fetch helpers
// =========================

export async function fetchClients(supplyPath: string): Promise<SupplyClient[]> {
  const snap = await get(ref(db, `${supplyPath}/clients`))
  return toArray<SupplyClient>(snap.val())
}

export async function fetchOrders(supplyPath: string): Promise<SupplyOrder[]> {
  const snap = await get(ref(db, `${supplyPath}/orders`))
  return toArray<SupplyOrder>(snap.val())
}

export async function fetchDeliveries(supplyPath: string): Promise<SupplyDelivery[]> {
  const snap = await get(ref(db, `${supplyPath}/deliveries`))
  return toArray<SupplyDelivery>(snap.val())
}

// =========================
// CRUD: Clients
// =========================

export async function createClient(supplyPath: string, data: Omit<SupplyClient, "id">): Promise<string> {
  const key = push(ref(db, `${supplyPath}/clients`)).key
  if (!key) throw new Error("Failed to generate client ID")
  await set(ref(db, `${supplyPath}/clients/${key}`), data as any)
  return key
}

export async function updateClient(
  supplyPath: string,
  id: string,
  updates: Partial<Omit<SupplyClient, "id">>,
): Promise<void> {
  await update(ref(db, `${supplyPath}/clients/${id}`), updates as any)
}

export async function deleteClient(supplyPath: string, id: string): Promise<void> {
  await remove(ref(db, `${supplyPath}/clients/${id}`))
}

// =========================
// CRUD: Orders
// =========================

export async function createOrder(supplyPath: string, data: Omit<SupplyOrder, "id">): Promise<string> {
  const key = push(ref(db, `${supplyPath}/orders`)).key
  if (!key) throw new Error("Failed to generate order ID")
  await set(ref(db, `${supplyPath}/orders/${key}`), data as any)
  return key
}

export async function updateOrder(
  supplyPath: string,
  id: string,
  updates: Partial<Omit<SupplyOrder, "id">>,
): Promise<void> {
  await update(ref(db, `${supplyPath}/orders/${id}`), updates as any)
}

export async function deleteOrder(supplyPath: string, id: string): Promise<void> {
  await remove(ref(db, `${supplyPath}/orders/${id}`))
}

// =========================
// CRUD: Deliveries
// =========================

export async function createDelivery(supplyPath: string, data: Omit<SupplyDelivery, "id">): Promise<string> {
  const key = push(ref(db, `${supplyPath}/deliveries`)).key
  if (!key) throw new Error("Failed to generate delivery ID")
  await set(ref(db, `${supplyPath}/deliveries/${key}`), data as any)
  return key
}

export async function updateDelivery(
  supplyPath: string,
  id: string,
  updates: Partial<Omit<SupplyDelivery, "id">>,
): Promise<void> {
  await update(ref(db, `${supplyPath}/deliveries/${id}`), updates as any)
}

export async function deleteDelivery(supplyPath: string, id: string): Promise<void> {
  await remove(ref(db, `${supplyPath}/deliveries/${id}`))
}

// =========================
// Client invites (future accept flow)
// =========================

export async function createClientInvite(
  supplyPath: string,
  invite: Omit<SupplyClientInvite, "id">,
): Promise<string> {
  // Use code as the key so accept page can fetch by code in O(1).
  const id = invite.code
  const payload = { ...invite, id }

  // Supplier side
  await set(ref(db, `${supplyPath}/clientInvites/${id}`), payload as any)

  // Global index so the recipient can look up by code without knowing supplier path.
  await set(ref(db, `supplyInvites/${id}`), payload as any)
  return id
}

export async function getClientInviteByCode(supplyPath: string, code: string): Promise<SupplyClientInvite | null> {
  const snap = await get(ref(db, `${supplyPath}/clientInvites/${code}`))
  if (!snap.exists()) return null
  const raw = snap.val() as AnyObj
  return { id: code, ...(raw || {}), code } as SupplyClientInvite
}

export async function updateClientInvite(
  supplyPath: string,
  code: string,
  updates: Partial<Omit<SupplyClientInvite, "id" | "code">>,
): Promise<void> {
  await Promise.all([
    update(ref(db, `${supplyPath}/clientInvites/${code}`), updates as any),
    update(ref(db, `supplyInvites/${code}`), updates as any),
  ])
}

export async function revokeClientInvite(supplyPath: string, code: string): Promise<void> {
  await Promise.all([
    update(ref(db, `${supplyPath}/clientInvites/${code}`), { status: "cancelled" } as any),
    update(ref(db, `supplyInvites/${code}`), { status: "cancelled" } as any),
  ])
}

export async function getGlobalClientInviteByCode(code: string): Promise<SupplyClientInvite | null> {
  const snap = await get(ref(db, `supplyInvites/${code}`))
  if (!snap.exists()) return null
  const raw = snap.val() as AnyObj
  return { id: code, ...(raw || {}), code } as SupplyClientInvite
}

export async function updateGlobalClientInvite(
  code: string,
  updates: Partial<Omit<SupplyClientInvite, "id" | "code">>,
): Promise<void> {
  await update(ref(db, `supplyInvites/${code}`), updates as any)
}

export async function getSupplierConnection(params: {
  customerCompanyId: string
  supplierCompanyId: string
}): Promise<
  | null
  | {
      supplierCompanyId: string
      supplierCompanyName?: string
      supplierSupplyPath?: string
      stockSupplierId: string
      inviteCode?: string
      linkedAt?: number
      updatedAt?: number
    }
> {
  const path = `companies/${params.customerCompanyId}/integrations/supply/suppliers/${params.supplierCompanyId}`
  const snap = await get(ref(db, path))
  if (!snap.exists()) return null
  return snap.val() as any
}

export async function saveSupplierConnection(params: {
  customerCompanyId: string
  supplierCompanyId: string
  supplierCompanyName?: string
  supplierSupplyPath?: string
  stockSupplierId: string
  inviteCode: string
}): Promise<void> {
  const now = Date.now()
  const path = `companies/${params.customerCompanyId}/integrations/supply/suppliers/${params.supplierCompanyId}`
  await set(ref(db, path), {
    supplierCompanyId: params.supplierCompanyId,
    supplierCompanyName: params.supplierCompanyName || "",
    supplierSupplyPath: params.supplierSupplyPath || "",
    stockSupplierId: params.stockSupplierId,
    inviteCode: params.inviteCode,
    linkedAt: now,
    updatedAt: now,
  })
}

// ===== SUPPLY SETTINGS =====

export async function fetchSupplySettingsSection(basePath: string, section: string): Promise<any | null> {
  try {
    const snap = await get(ref(db, `${basePath}/${section}`))
    return snap.exists() ? (snap.val() || {}) : null
  } catch (error) {
    console.error("Error fetching supply settings section:", error)
    return null
  }
}

export async function saveSupplySettingsSection(basePath: string, section: string, data: Record<string, any>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== undefined))
  await update(ref(db, `${basePath}/${section}`), { ...clean, updatedAt: Date.now() })
}

