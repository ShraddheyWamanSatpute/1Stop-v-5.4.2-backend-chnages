import type * as firebaseProvider from "../../data/Notes"
import type { Note } from "../../interfaces/Notes"
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

export const getNotes: typeof firebaseProvider.getNotes = async (adminId?: string) => {
  const result = await authedAdminDataFetch(`/notes${query({ adminId })}`, { method: "GET" })
  return (result?.rows || []) as Note[]
}

export const addNote: typeof firebaseProvider.addNote = async (noteData) => {
  const result = await authedAdminDataFetch(`/notes`, {
    method: "POST",
    body: JSON.stringify({ data: noteData }),
  })
  return String(result?.id || "")
}

export const updateNote: typeof firebaseProvider.updateNote = async (noteId, updates) => {
  await authedAdminDataFetch(`/notes/${encodeURIComponent(noteId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
  return true
}

export const deleteNote: typeof firebaseProvider.deleteNote = async (noteId) => {
  await authedAdminDataFetch(`/notes/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
  })
  return true
}
