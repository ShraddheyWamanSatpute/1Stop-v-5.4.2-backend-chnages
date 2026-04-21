import type * as firebaseProvider from "../../data/Marketing"
import type { MarketingEvent } from "../../interfaces/Marketing"
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

export const getMarketingEvents: typeof firebaseProvider.getMarketingEvents = async (adminId?: string) => {
  const result = await authedAdminDataFetch(`/marketing/events${query({ adminId })}`, { method: "GET" })
  return (result?.rows || []) as MarketingEvent[]
}

export const addMarketingEvent: typeof firebaseProvider.addMarketingEvent = async (eventData) => {
  const result = await authedAdminDataFetch(`/marketing/events`, {
    method: "POST",
    body: JSON.stringify({ data: eventData }),
  })
  return String(result?.id || "")
}

export const updateMarketingEvent: typeof firebaseProvider.updateMarketingEvent = async (eventId, updates) => {
  await authedAdminDataFetch(`/marketing/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
  return true
}

export const deleteMarketingEvent: typeof firebaseProvider.deleteMarketingEvent = async (eventId) => {
  await authedAdminDataFetch(`/marketing/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  })
  return true
}
