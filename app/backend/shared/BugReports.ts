export const BUG_REPORTS_ADMIN_PATH = "admin/bugReports"

export type BugReportSeverity = "low" | "medium" | "high" | "critical"
export type BugReportStatus = "new" | "reviewing" | "resolved"

export interface BugReportRecord {
  id: string
  title: string
  area?: string
  severity: BugReportSeverity
  description: string
  stepsToReproduce?: string
  expectedResult?: string
  actualResult?: string
  status: BugReportStatus
  createdAt: number
  updatedAt: number
  source: "app"
  pagePath?: string
  companyId?: string
  companyName?: string
  siteId?: string
  siteName?: string
  subsiteId?: string
  subsiteName?: string
  reportedByUid?: string
  reportedByName?: string
  reportedByEmail?: string
  userAgent?: string
}
