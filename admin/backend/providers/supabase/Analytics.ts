import type * as firebaseProvider from "../../data/Analytics"
import type { AnalyticsData } from "../../interfaces/Analytics"
import { authedAdminDataFetch } from "./http"

export const getAnalyticsData: typeof firebaseProvider.getAnalyticsData = async () => {
  const result = await authedAdminDataFetch(`/analytics`, { method: "GET" })
  return (result?.row || result || null) as AnalyticsData
}
