import type * as firebaseProvider from "../../data/Content"
import type { ContentPost, PlatformSettings } from "../../interfaces/Content"
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

export const getContentSchedule: typeof firebaseProvider.getContentSchedule = async (adminId?: string) => {
  const result = await authedAdminDataFetch(`/content/posts${query({ adminId })}`, { method: "GET" })
  return (result?.rows || []) as ContentPost[]
}

export const addContentPost: typeof firebaseProvider.addContentPost = async (postData) => {
  const result = await authedAdminDataFetch(`/content/posts`, {
    method: "POST",
    body: JSON.stringify({ data: postData }),
  })
  return String(result?.id || "")
}

export const updateContentPost: typeof firebaseProvider.updateContentPost = async (postId, updates) => {
  await authedAdminDataFetch(`/content/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
  return true
}

export const publishContentPost: typeof firebaseProvider.publishContentPost = async (postId, publishedDate?: number) => {
  await authedAdminDataFetch(`/content/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      updates: {
        status: "published",
        publishedDate: publishedDate || Date.now(),
      },
    }),
  })
  return true
}

export const deleteContentPost: typeof firebaseProvider.deleteContentPost = async (postId) => {
  await authedAdminDataFetch(`/content/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  })
  return true
}

export const getPlatformSettings: typeof firebaseProvider.getPlatformSettings = async () => {
  const result = await authedAdminDataFetch(`/content/platforms`, { method: "GET" })
  return (result?.rows || []) as PlatformSettings[]
}

export const addPlatformSettings: typeof firebaseProvider.addPlatformSettings = async (settingsData) => {
  const result = await authedAdminDataFetch(`/content/platforms`, {
    method: "POST",
    body: JSON.stringify({ data: settingsData }),
  })
  return String(result?.id || "")
}

export const updatePlatformSettings: typeof firebaseProvider.updatePlatformSettings = async (settingsId, updates) => {
  await authedAdminDataFetch(`/content/platforms/${encodeURIComponent(settingsId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
  return true
}
