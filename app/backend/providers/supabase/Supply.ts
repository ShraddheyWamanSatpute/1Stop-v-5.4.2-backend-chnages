// Manual Supabase implementation for the Supply module.
import type { SupplyClient, SupplyClientInvite, SupplyDelivery, SupplyOrder } from "../../interfaces/Supply"
import { authedDataFetch, createPollingSubscription } from "./http"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

export const subscribeClients = (
  supplyPath: string,
  onData: (rows: SupplyClient[]) => void,
  onError?: (message: string) => void,
): (() => void) =>
  createPollingSubscription(() => fetchClients(supplyPath), onData, onError)

export const subscribeOrders = (
  supplyPath: string,
  onData: (rows: SupplyOrder[]) => void,
  onError?: (message: string) => void,
): (() => void) =>
  createPollingSubscription(() => fetchOrders(supplyPath), onData, onError)

export const subscribeDeliveries = (
  supplyPath: string,
  onData: (rows: SupplyDelivery[]) => void,
  onError?: (message: string) => void,
): (() => void) =>
  createPollingSubscription(() => fetchDeliveries(supplyPath), onData, onError)

export const fetchClients = async (supplyPath: string): Promise<SupplyClient[]> => {
  const data = await authedDataFetch(`/supply/clients${query({ supplyPath })}`, { method: "GET" })
  return (data?.rows || []) as SupplyClient[]
}

export const fetchOrders = async (supplyPath: string): Promise<SupplyOrder[]> => {
  const data = await authedDataFetch(`/supply/orders${query({ supplyPath })}`, { method: "GET" })
  return (data?.rows || []) as SupplyOrder[]
}

export const fetchDeliveries = async (supplyPath: string): Promise<SupplyDelivery[]> => {
  const data = await authedDataFetch(`/supply/deliveries${query({ supplyPath })}`, { method: "GET" })
  return (data?.rows || []) as SupplyDelivery[]
}

export const createClient = async (supplyPath: string, data: Omit<SupplyClient, "id">): Promise<string> => {
  const result = await authedDataFetch(`/supply/clients`, {
    method: "POST",
    body: JSON.stringify({ supplyPath, data }),
  })
  return String(result?.id || "")
}

export const updateClient = async (
  supplyPath: string,
  id: string,
  updates: Partial<Omit<SupplyClient, "id">>,
): Promise<void> => {
  await authedDataFetch(`/supply/clients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ supplyPath, updates }),
  })
}

export const deleteClient = async (supplyPath: string, id: string): Promise<void> => {
  await authedDataFetch(`/supply/clients/${encodeURIComponent(id)}${query({ supplyPath })}`, {
    method: "DELETE",
  })
}

export const createOrder = async (supplyPath: string, data: Omit<SupplyOrder, "id">): Promise<string> => {
  const result = await authedDataFetch(`/supply/orders`, {
    method: "POST",
    body: JSON.stringify({ supplyPath, data }),
  })
  return String(result?.id || "")
}

export const updateOrder = async (
  supplyPath: string,
  id: string,
  updates: Partial<Omit<SupplyOrder, "id">>,
): Promise<void> => {
  await authedDataFetch(`/supply/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ supplyPath, updates }),
  })
}

export const deleteOrder = async (supplyPath: string, id: string): Promise<void> => {
  await authedDataFetch(`/supply/orders/${encodeURIComponent(id)}${query({ supplyPath })}`, {
    method: "DELETE",
  })
}

export const createDelivery = async (supplyPath: string, data: Omit<SupplyDelivery, "id">): Promise<string> => {
  const result = await authedDataFetch(`/supply/deliveries`, {
    method: "POST",
    body: JSON.stringify({ supplyPath, data }),
  })
  return String(result?.id || "")
}

export const updateDelivery = async (
  supplyPath: string,
  id: string,
  updates: Partial<Omit<SupplyDelivery, "id">>,
): Promise<void> => {
  await authedDataFetch(`/supply/deliveries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ supplyPath, updates }),
  })
}

export const deleteDelivery = async (supplyPath: string, id: string): Promise<void> => {
  await authedDataFetch(`/supply/deliveries/${encodeURIComponent(id)}${query({ supplyPath })}`, {
    method: "DELETE",
  })
}

export const createClientInvite = async (
  supplyPath: string,
  invite: Omit<SupplyClientInvite, "id">,
): Promise<string> => {
  const result = await authedDataFetch(`/supply/clientInvites`, {
    method: "POST",
    body: JSON.stringify({ supplyPath, invite }),
  })
  return String(result?.id || "")
}

export const getClientInviteByCode = async (
  supplyPath: string,
  code: string,
): Promise<SupplyClientInvite | null> => {
  const result = await authedDataFetch(
    `/supply/clientInvites/${encodeURIComponent(code)}${query({ supplyPath })}`,
    { method: "GET" },
  )
  return (result?.row || null) as SupplyClientInvite | null
}

export const updateClientInvite = async (
  supplyPath: string,
  code: string,
  updates: Partial<Omit<SupplyClientInvite, "id" | "code">>,
): Promise<void> => {
  await authedDataFetch(`/supply/clientInvites/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify({ supplyPath, updates }),
  })
}

export const revokeClientInvite = async (supplyPath: string, code: string): Promise<void> => {
  await authedDataFetch(
    `/supply/clientInvites/${encodeURIComponent(code)}${query({ supplyPath })}`,
    { method: "DELETE" },
  )
}

export const getGlobalClientInviteByCode = async (code: string): Promise<SupplyClientInvite | null> => {
  const result = await authedDataFetch(`/supply/globalInvites/${encodeURIComponent(code)}`, { method: "GET" })
  return (result?.row || null) as SupplyClientInvite | null
}

export const updateGlobalClientInvite = async (
  code: string,
  updates: Partial<Omit<SupplyClientInvite, "id" | "code">>,
): Promise<void> => {
  await authedDataFetch(`/supply/globalInvites/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
}

export const getSupplierConnection = async (params: {
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
> => {
  const result = await authedDataFetch(
    `/supply/supplierConnection${query(params as Record<string, string>)}`,
    { method: "GET" },
  )
  return (result?.row || null) as any
}

export const saveSupplierConnection = async (params: {
  customerCompanyId: string
  supplierCompanyId: string
  supplierCompanyName?: string
  supplierSupplyPath?: string
  stockSupplierId: string
  inviteCode: string
}): Promise<void> => {
  await authedDataFetch(`/supply/supplierConnection`, {
    method: "POST",
    body: JSON.stringify({ params }),
  })
}

export const fetchSupplySettingsSection = async (basePath: string, section: string): Promise<any | null> => {
  const data = await authedDataFetch(`/supply/settings${query({ basePath, section })}`, { method: "GET" })
  return data?.value || null
}

export const saveSupplySettingsSection = async (basePath: string, section: string, data: Record<string, any>): Promise<void> => {
  const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== undefined))
  await authedDataFetch(`/supply/settings`, {
    method: "POST",
    body: JSON.stringify({ basePath, section, data: { ...clean, updatedAt: Date.now() } }),
  })
}
