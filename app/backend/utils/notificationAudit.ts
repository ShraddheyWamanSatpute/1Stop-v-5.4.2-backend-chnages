import type { NotificationType } from "../interfaces/Notifications"

/**
 * Best-effort helper to find the current user's employeeId.
 * Data can live in CompanyContext state, SettingsContext user companies, etc.
 */
export function getCurrentEmployeeId(
  companyState: any,
  settingsState: any,
): string | undefined {
  const direct =
    companyState?.user?.employeeId ??
    companyState?.user?.employeeID ??
    companyState?.employeeId ??
    companyState?.employeeID ??
    settingsState?.user?.employeeId ??
    settingsState?.user?.employeeID

  if (typeof direct === "string" && direct.trim()) return direct.trim()

  // Settings user companies often holds employeeId for the selected company.
  const companyId = companyState?.companyID ?? companyState?.companyId
  const companies = settingsState?.user?.companies
  if (typeof companyId === "string" && Array.isArray(companies)) {
    const entry = companies.find((c: any) => c?.companyID === companyId || c?.companyId === companyId)
    const fromCompanies =
      entry?.employeeId ?? entry?.employeeID ?? entry?.employee ?? entry?.employeeRecordId
    if (typeof fromCompanies === "string" && fromCompanies.trim()) return fromCompanies.trim()
  }

  return undefined
}

export type AuditAction = "created" | "updated" | "deleted" | "joined"

export function buildAuditMetadata(params: {
  type: NotificationType
  action: AuditAction
  section: string
  companyId?: string
  siteId?: string
  subsiteId?: string
  uid?: string
  employeeId?: string
  entityId?: string
  entityName?: string
}): Record<string, any> {
  const {
    type,
    action,
    section,
    companyId,
    siteId,
    subsiteId,
    uid,
    employeeId,
    entityId,
    entityName,
  } = params

  return {
    section,
    type,
    action,
    ...(companyId ? { companyId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(subsiteId ? { subsiteId } : {}),
    ...(uid ? { uid } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(entityId ? { entityId } : {}),
    ...(entityName ? { entityName } : {}),
  }
}

