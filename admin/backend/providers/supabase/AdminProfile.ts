import type * as firebaseProvider from "../../data/AdminProfile"
import type { AdminProfile } from "../../interfaces/AdminProfile"
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

export const getAdminProfile: typeof firebaseProvider.getAdminProfile = async (uid: string) => {
  const result = await authedAdminDataFetch(`/profile${query({ uid })}`, { method: "GET" })
  return (result?.row || null) as AdminProfile | null
}

export const setAdminProfile: typeof firebaseProvider.setAdminProfile = async (profile: AdminProfile) => {
  await authedAdminDataFetch(`/profile/${encodeURIComponent(profile.uid)}`, {
    method: "PUT",
    body: JSON.stringify({ profile }),
  })
  return true
}

export const updateAdminProfile: typeof firebaseProvider.updateAdminProfile = async (
  uid: string,
  updates: Partial<AdminProfile>,
) => {
  await authedAdminDataFetch(`/profile/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
  return true
}

export const deleteAdminProfile: typeof firebaseProvider.deleteAdminProfile = async (uid: string) => {
  await authedAdminDataFetch(`/profile/${encodeURIComponent(uid)}`, {
    method: "DELETE",
  })
  return true
}
