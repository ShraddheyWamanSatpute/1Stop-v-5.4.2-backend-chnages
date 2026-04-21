import { db, push, ref, set, update } from "../../backend/services/Firebase"
import type { Activity, CalendarEvent, EntityType, ProviderKey } from "./models"

export function nowMs(): number {
  return Date.now()
}

/**
 * Multi-path update at the RTDB root.
 * Prefer this for atomic writes (record + indexes + activityBy fanout).
 */
export async function rootUpdate(updates: Record<string, any>) {
  return update(ref(db), updates)
}

export function activityByPath(entityType: EntityType, entityId: string, activityId: string) {
  return `admin/activityBy/${entityType}/${entityId}/${activityId}`
}

export function calendarLinkPath(entityType: EntityType, entityId: string, provider: ProviderKey) {
  return `admin/calendar/links/${entityType}/${entityId}/${provider}`
}

export function calendarLinkEventPath(entityType: EntityType, entityId: string, provider: ProviderKey, eventId: string) {
  return `admin/calendar/links/${entityType}/${entityId}/${provider}/${eventId}`
}

export function indexPath(name: string, key: string, id: string) {
  return `admin/index/${name}/${key}/${id}`
}

export type EntityLinkRef = { entityType: EntityType; entityId: string }

export function linksToEntityRefs(links: Record<string, any> | undefined | null): EntityLinkRef[] {
  if (!links || typeof links !== "object") return []
  const out: EntityLinkRef[] = []
  const pushIf = (entityType: EntityType, id: any) => {
    const v = String(id || "").trim()
    if (v) out.push({ entityType, entityId: v })
  }
  pushIf("client", (links as any).clientId)
  pushIf("contact", (links as any).contactId)
  pushIf("company", (links as any).companyId)
  pushIf("lead", (links as any).leadId)
  pushIf("opportunity", (links as any).opportunityId)
  pushIf("project", (links as any).projectId)
  pushIf("task", (links as any).taskId)
  pushIf("calendarEvent", (links as any).calendarEventId)
  return out
}

export async function createActivity(
  activity: Omit<Activity, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: number
    updatedAt?: number
  },
) {
  const now = nowMs()
  const aRef = push(ref(db, "admin/activities"))
  const id = aRef.key || ""
  if (!id) throw new Error("Failed to create activity id")

  const payload: Activity = {
    id,
    type: activity.type,
    title: activity.title,
    body: activity.body,
    meta: activity.meta || {},
    ...(activity as any),
    createdAt: activity.createdAt || now,
    updatedAt: activity.updatedAt || now,
  }

  const updates: Record<string, any> = {
    [`admin/activities/${id}`]: payload,
  }

  // Fan-out references for fast timelines
  for (const r of linksToEntityRefs(payload)) {
    updates[activityByPath(r.entityType, r.entityId, id)] = true
  }

  await rootUpdate(updates)
  return payload
}

export async function createUserNotifications(params: {
  userIds: string[]
  type: string
  title: string
  body?: string
  links?: Record<string, any>
}) {
  const uniqueUserIds = Array.from(new Set((params.userIds || []).map((id) => String(id || "").trim()).filter(Boolean)))
  if (!uniqueUserIds.length) return []
  const now = nowMs()
  const notifications: any[] = []
  const updates: Record<string, any> = {}

  for (const userId of uniqueUserIds) {
    const notificationId = push(ref(db, `admin/notifications/${userId}`)).key || ""
    if (!notificationId) continue
    const payload = {
      id: notificationId,
      userId,
      type: String(params.type || "system"),
      title: String(params.title || "").trim() || "Notification",
      body: String(params.body || "").trim(),
      read: false,
      createdAt: now,
      updatedAt: now,
      ...(params.links || {}),
    }
    updates[`admin/notifications/${userId}/${notificationId}`] = payload
    notifications.push(payload)
  }

  if (Object.keys(updates).length) await rootUpdate(updates)
  return notifications
}

export async function upsertInternalCalendarEvent(
  event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt" | "provider"> & {
    id?: string
    createdAt?: number
    updatedAt?: number
  },
) {
  const now = nowMs()
  const id = event.id || push(ref(db, "admin/calendar/events")).key || ""
  if (!id) throw new Error("Failed to create calendar event id")

  const payload: CalendarEvent = {
    id,
    title: String(event.title || "").trim() || "(no title)",
    description: String(event.description || ""),
    type: (event as any).type,
    startAt: Number((event as any).startAt || now),
    endAt: Number((event as any).endAt || now),
    allDay: Boolean((event as any).allDay),
    organizerUserId: (event as any).organizerUserId,
    attendeeUserIds: Array.isArray((event as any).attendeeUserIds) ? (event as any).attendeeUserIds : [],
    externalAttendees: Array.isArray((event as any).externalAttendees) ? (event as any).externalAttendees : [],
    ...(event as any),
    provider: "internal",
    createdAt: event.createdAt || now,
    updatedAt: event.updatedAt || now,
  }

  // Write event + best-effort internal link fanout for fast entity → event lookup.
  // Note: we do NOT remove stale links here (cleanup can be done via maintenance/backfill).
  const updates: Record<string, any> = {
    [`admin/calendar/events/${id}`]: payload,
  }
  for (const r of linksToEntityRefs(payload)) {
    updates[calendarLinkEventPath(r.entityType, r.entityId, "internal", id)] = {
      eventId: id,
      updatedAt: payload.updatedAt,
    }
  }
  await rootUpdate(updates)
  return payload
}

export async function upsertProviderLink(params: {
  entityType: EntityType
  entityId: string
  provider: Exclude<ProviderKey, "internal">
  calendarId: string
  eventId: string
  title?: string
  start?: string
  end?: string
  allDay?: boolean
  location?: string
  meetingType?: string
  meetingUrl?: string
  reminderMinutes?: number
  responseStatus?: "needs_action" | "accepted" | "tentative" | "declined"
  conferenceProvider?: "google_meet" | "teams" | "zoom" | "custom" | ""
}) {
  const { entityType, entityId, provider, calendarId, eventId, title, start, end, allDay, location, meetingType, meetingUrl, reminderMinutes, responseStatus, conferenceProvider } = params
  if (!entityId) return
  await set(ref(db, calendarLinkEventPath(entityType, entityId, provider, eventId)), {
    calendarId,
    eventId,
    title: String(title || "").trim(),
    start: String(start || "").trim(),
    end: String(end || "").trim(),
    allDay: Boolean(allDay),
    location: String(location || "").trim(),
    meetingType: String(meetingType || "").trim(),
    meetingUrl: String(meetingUrl || "").trim(),
    reminderMinutes: Math.max(0, Number(reminderMinutes || 0) || 0),
    responseStatus: String(responseStatus || "").trim(),
    conferenceProvider: String(conferenceProvider || "").trim(),
    updatedAt: nowMs(),
  })
}

