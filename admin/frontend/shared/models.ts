export type EntityType =
  | "contact"
  | "client"
  | "company"
  | "lead"
  | "opportunity"
  | "project"
  | "task"
  | "note"
  | "calendarEvent"

export type ProviderKey = "google" | "outlook" | "internal"

export type Links = {
  clientId?: string
  contactId?: string
  companyId?: string
  leadId?: string
  opportunityId?: string
  projectId?: string
  taskId?: string
  calendarEventId?: string
}

export type AuditFields = {
  createdAt: number
  updatedAt: number
  createdBy?: string
  updatedBy?: string
  isArchived?: boolean
  archivedAt?: number
  archivedBy?: string
}

export type CRMOpportunityStatus = "open" | "won" | "lost"

export type CRMStage = {
  id: string
  name: string
  order?: number
  probability?: number // 0-100
  requireNextAction?: boolean
  createdAt: number
  updatedAt: number
}

export type CRMPipeline = {
  id: string
  name: string
  stageOrder?: string[]
  createdAt: number
  updatedAt: number
}

export type CRMOpportunityValue = {
  amount: number
  currency: string
}

export type CRMOpportunity = Links &
  AuditFields & {
    id: string
    title: string
    pipelineId: string
    stageId: string
    status: CRMOpportunityStatus
    ownerUserId?: string
    value?: CRMOpportunityValue
    probability?: number // 0-100
    expectedCloseAt?: number
    wonAt?: number
    lostAt?: number
    lostReason?: string
    convertedProjectId?: string
    convertedKickoffEventId?: string
    convertedTaskIds?: string[]
    nextAction?: { title: string; dueAt: number; assignedToUserId?: string }
    notes?: string
    tags?: string[]
  }

export type ActivityType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "status_change"
  | "task_created"
  | "task_updated"
  | "project_created"
  | "project_updated"
  | "opportunity_created"
  | "opportunity_updated"
  | "file_added"
  | "system"

export type Activity = Links &
  AuditFields & {
    id: string
    type: ActivityType
    title?: string
    body?: string
    meta?: Record<string, any>
  }

export type CalendarEventType =
  | "call"
  | "meeting"
  | "site_visit"
  | "kickoff"
  | "review"
  | "deadline"
  | "internal"

export type CalendarEvent = Links &
  AuditFields & {
    id: string
    title: string
    description?: string
    type?: CalendarEventType
    startAt: number
    endAt: number
    allDay?: boolean
    organizerUserId?: string
    attendeeUserIds?: string[]
    externalAttendees?: Array<{ name?: string; email?: string }>
    provider?: ProviderKey
    providerCalendarId?: string
    providerEventId?: string
    syncStatus?: "linked" | "pending" | "error"
    lastSyncedAt?: number
  }

export type StaffProfile = {
  uid: string
  email?: string
  displayName?: string
  timezone?: string
  active?: boolean
  workingHours?: Partial<
    Record<
      "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
      { start: string; end: string }
    >
  >
  skills?: string[]
}

