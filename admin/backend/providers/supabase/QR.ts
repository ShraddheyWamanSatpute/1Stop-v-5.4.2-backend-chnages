import type * as firebaseProvider from "../../data/QR"
import type { GenericQR, Lead, PersonalQR } from "../../interfaces/QR"
import { authedAdminDataFetch } from "./http"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

export const addPersonalQR: typeof firebaseProvider.addPersonalQR = async (qrData) => {
  const result = await authedAdminDataFetch(`/qr/personal`, {
    method: "POST",
    body: JSON.stringify({ data: qrData }),
  })
  return String(result?.id || "")
}

export const getPersonalQRs: typeof firebaseProvider.getPersonalQRs = async (adminId: string) => {
  const result = await authedAdminDataFetch(`/qr/personal${query({ adminId })}`, { method: "GET" })
  return (result?.rows || []) as PersonalQR[]
}

export const getPersonalQRByUrl: typeof firebaseProvider.getPersonalQRByUrl = async (url: string) => {
  const result = await authedAdminDataFetch(`/qr/personal`, { method: "GET" })
  const rows = (result?.rows || []) as PersonalQR[]
  const baseUrl = url.split("?")[0]
  return rows.find((row) => row.landingPageUrl === url || row.landingPageUrl === baseUrl) || null
}

export const updatePersonalQR: typeof firebaseProvider.updatePersonalQR = async (qrId, updates) => {
  await authedAdminDataFetch(`/qr/personal/${encodeURIComponent(qrId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
  return true
}

export const incrementQRScans: typeof firebaseProvider.incrementQRScans = async (qrId, isPersonal = true) => {
  const entity = isPersonal ? "personal" : "generic"
  const result = await authedAdminDataFetch(`/qr/${entity}/${encodeURIComponent(qrId)}`, { method: "GET" })
  const current = result?.row || null
  if (!current) return false
  await authedAdminDataFetch(`/qr/${entity}/${encodeURIComponent(qrId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates: { scans: Number(current.scans || 0) + 1 } }),
  })
  return true
}

export const addGenericQR: typeof firebaseProvider.addGenericQR = async (qrData) => {
  const result = await authedAdminDataFetch(`/qr/generic`, {
    method: "POST",
    body: JSON.stringify({ data: qrData }),
  })
  return String(result?.id || "")
}

export const getGenericQRs: typeof firebaseProvider.getGenericQRs = async (adminId: string) => {
  const result = await authedAdminDataFetch(`/qr/generic${query({ adminId })}`, { method: "GET" })
  return (result?.rows || []) as GenericQR[]
}

export const addLead: typeof firebaseProvider.addLead = async (leadData) => {
  const result = await authedAdminDataFetch(`/qr/leads`, {
    method: "POST",
    body: JSON.stringify({ data: leadData }),
  })
  return String(result?.id || "")
}

export const getLeads: typeof firebaseProvider.getLeads = async (adminId?: string) => {
  const result = await authedAdminDataFetch(`/qr/leads${query({ adminId })}`, { method: "GET" })
  return (result?.rows || []) as Lead[]
}
