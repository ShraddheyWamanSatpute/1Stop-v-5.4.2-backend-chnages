export type CompanyType = "hospitality" | "supplier" | "other"

export type ModuleKey =
  | "dashboard"
  | "stock"
  | "hr"
  | "bookings"
  | "pos"
  | "finance"
  | "messenger"
  | "company"

export type LayoutFeatureKey = "supply"

export interface CompanyLayoutConfig {
  key: CompanyType
  /**
   * Modules that should be hidden/disabled for this company type.
   * This is used to drive sidebar visibility, route registration, and module provider warm-loading.
   */
  disabledModules: ReadonlySet<ModuleKey>
  /**
   * Feature flags for company-type-specific UI sections.
   * This is intentionally separate from permissions and from existing module keys,
   * so we can add future layouts/features without reshaping core permissions.
   */
  enabledFeatures: ReadonlySet<LayoutFeatureKey>
}

export function normalizeCompanyType(raw: unknown): CompanyType {
  // Requirement: if no company type, treat as hospitality (current setup).
  if (typeof raw !== "string") return "hospitality"
  const v = raw.trim().toLowerCase()
  if (!v) return "hospitality"
  if (v === "hospitality" || v === "supplier" || v === "other") return v
  // Unknown future values default to hospitality until explicitly supported.
  return "hospitality"
}

const COMPANY_LAYOUTS: Record<CompanyType, CompanyLayoutConfig> = {
  hospitality: {
    key: "hospitality",
    disabledModules: new Set(),
    enabledFeatures: new Set(),
  },
  supplier: {
    key: "supplier",
    // Supplier: remove bookings and POS sections
    disabledModules: new Set<ModuleKey>(["bookings", "pos"]),
    enabledFeatures: new Set<LayoutFeatureKey>(["supply"]),
  },
  other: {
    key: "other",
    disabledModules: new Set(),
    enabledFeatures: new Set(),
  },
}

export function getCompanyLayout(companyType: unknown): CompanyLayoutConfig {
  const key = normalizeCompanyType(companyType)
  return COMPANY_LAYOUTS[key]
}

