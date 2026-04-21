import { DATA_MODULES, type DataModuleName, type DataProviderMap, type DataProviderName } from "./providerTypes"

const BASE_PROVIDER_STORAGE_KEY = "onestop:data-provider"
const OVERRIDE_STORAGE_KEY = "onestop:data-provider-overrides"

const isProviderName = (value: unknown): value is DataProviderName =>
  value === "firebase" || value === "supabase"

const parseProvider = (value: unknown, fallback: DataProviderName): DataProviderName => {
  const normalized = String(value || "").trim().toLowerCase()
  return isProviderName(normalized) ? normalized : fallback
}

const emptyProviderMap = (provider: DataProviderName): DataProviderMap =>
  DATA_MODULES.reduce((acc, moduleName) => {
    acc[moduleName] = provider
    return acc
  }, {} as DataProviderMap)

const parseOverrideString = (raw: string): Partial<DataProviderMap> => {
  const overrides: Partial<DataProviderMap> = {}
  const trimmed = raw.trim()
  if (!trimmed) return overrides

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      for (const moduleName of DATA_MODULES) {
        const value = parsed[moduleName]
        if (isProviderName(value)) overrides[moduleName] = value
      }
      return overrides
    } catch {
      return overrides
    }
  }

  for (const pair of trimmed.split(",")) {
    const [moduleNameRaw, providerRaw] = pair.split(":")
    const moduleName = String(moduleNameRaw || "").trim() as DataModuleName
    if (!DATA_MODULES.includes(moduleName)) continue
    const provider = parseProvider(providerRaw, "firebase")
    overrides[moduleName] = provider
  }

  return overrides
}

const readStorageValue = (key: string): string => {
  if (typeof window === "undefined") return ""
  try {
    return window.localStorage.getItem(key) || ""
  } catch {
    return ""
  }
}

const env = ((import.meta as any)?.env || {}) as Record<string, unknown>

export const getBaseDataProvider = (): DataProviderName => {
  const envProvider = parseProvider(env.VITE_DATA_PROVIDER, "firebase")
  const storedProvider = parseProvider(readStorageValue(BASE_PROVIDER_STORAGE_KEY), envProvider)
  return storedProvider
}

export const getDataProviderOverrides = (): Partial<DataProviderMap> => {
  const envOverrides = parseOverrideString(String(env.VITE_DATA_PROVIDER_OVERRIDES || ""))
  const storedOverrides = parseOverrideString(readStorageValue(OVERRIDE_STORAGE_KEY))
  return {
    ...envOverrides,
    ...storedOverrides,
  }
}

export const getEffectiveDataProviderMap = (): DataProviderMap => {
  const baseProvider = getBaseDataProvider()
  const providerMap = emptyProviderMap(baseProvider)
  const overrides = getDataProviderOverrides()

  for (const moduleName of DATA_MODULES) {
    const override = overrides[moduleName]
    if (override) providerMap[moduleName] = override
  }

  return providerMap
}

export const getModuleProvider = (moduleName: DataModuleName): DataProviderName =>
  getEffectiveDataProviderMap()[moduleName]
