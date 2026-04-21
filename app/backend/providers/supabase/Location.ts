import * as firebaseProvider from "../../rtdatabase/Location"
import { authedDataFetch } from "./http"

export * from "../../rtdatabase/Location"

type LocationRecord = Awaited<ReturnType<typeof firebaseProvider.fetchLocations>>[number]

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const normalizeLocation = (value: any): LocationRecord => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  address: String(value?.address || ""),
  city: String(value?.city || ""),
  state: String(value?.state || ""),
  zipCode: String(value?.zipCode || ""),
  country: String(value?.country || ""),
  phone: value?.phone || undefined,
  email: value?.email || undefined,
  type: value?.type || "other",
  active: value?.active !== false,
  coordinates: value?.coordinates,
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const lower = (value: unknown) => String(value || "").toLowerCase()

export const fetchLocations: typeof firebaseProvider.fetchLocations = async (basePath: string) => {
  const result = await authedDataFetch(`/location/locations${query({ basePath })}`, { method: "GET" })
  return ((result?.rows || []) as any[]).map(normalizeLocation)
}

export const createLocation: typeof firebaseProvider.createLocation = async (basePath: string, location) => {
  const result = await authedDataFetch(`/location/locations`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: location }),
  })
  return normalizeLocation(result?.row || { ...location, id: result?.id })
}

export const updateLocation: typeof firebaseProvider.updateLocation = async (
  basePath: string,
  locationId: string,
  updates,
) => {
  await authedDataFetch(`/location/locations/${encodeURIComponent(locationId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteLocation: typeof firebaseProvider.deleteLocation = async (basePath: string, locationId: string) => {
  await authedDataFetch(`/location/locations/${encodeURIComponent(locationId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const getLocationsByType: typeof firebaseProvider.getLocationsByType = async (basePath: string, type) => {
  const rows = await fetchLocations(basePath)
  return rows.filter((row) => row.type === type && row.active)
}

export const getActiveLocations: typeof firebaseProvider.getActiveLocations = async (basePath: string) => {
  const rows = await fetchLocations(basePath)
  return rows.filter((row) => row.active)
}

export const searchLocations: typeof firebaseProvider.searchLocations = async (basePath: string, searchTerm: string) => {
  const rows = await fetchLocations(basePath)
  const term = lower(searchTerm)
  return rows.filter(
    (row) =>
      lower(row.name).includes(term) || lower(row.address).includes(term) || lower(row.city).includes(term),
  )
}
