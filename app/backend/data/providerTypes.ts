export const DATA_MODULES = [
  "Accounting",
  "Bookings",
  "Company",
  "Finance",
  "FinanceAccounting",
  "FinanceJournals",
  "HRs",
  "Location",
  "Messenger",
  "Notifications",
  "POS",
  "Product",
  "Settings",
  "Stock",
  "Supply",
] as const

export type DataModuleName = (typeof DATA_MODULES)[number]
export type DataProviderName = "firebase" | "supabase"
export type DataProviderMap = Record<DataModuleName, DataProviderName>
