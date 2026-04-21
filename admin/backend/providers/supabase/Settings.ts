import type * as firebaseProvider from "../../data/Settings"
import type { AppSettings } from "../../interfaces/Settings"
import { authedAdminDataFetch } from "./http"

export const getSettings: typeof firebaseProvider.getSettings = async () => {
  const result = await authedAdminDataFetch(`/settings`, { method: "GET" })
  return (result?.row || null) as AppSettings | null
}
