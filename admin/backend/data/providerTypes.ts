export const DATA_MODULES = [
  "AdminProfile",
  "Analytics",
  "Content",
  "Marketing",
  "Notes",
  "QR",
  "Settings",
] as const

export type DataModuleName = (typeof DATA_MODULES)[number]
export type DataProviderName = "firebase" | "supabase"
export type DataProviderMap = Record<DataModuleName, DataProviderName>
