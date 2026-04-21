import type { CompanyChecklist, ChecklistCompletion, ItemResponse } from "../interfaces/Company"

export interface ChecklistBlackoutDate {
  date?: string
  startDate?: string
  endDate?: string
  reason?: string
  createdAt?: number
  updatedAt?: number
}

const pad2 = (n: number) => String(Math.trunc(n)).padStart(2, "0")

const formatLocalYmd = (d: Date): string => {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const parseYmdToLocalDate = (ymd: string): Date | null => {
  const s = String(ymd || "").trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const da = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null
  const d = new Date(y, mo - 1, da)
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null
  d.setHours(0, 0, 0, 0)
  return d
}

const normalizeId = (v: unknown): string => String(v ?? "").trim()

const idsEqual = (a: unknown, b: unknown): boolean => {
  const aa = normalizeId(a)
  const bb = normalizeId(b)
  if (!aa || !bb) return false
  return aa === bb || aa.toLowerCase() === bb.toLowerCase()
}

/** Use when matching `completion.checklistId` to `checklist.id` in UI (trim + case-insensitive). */
export const checklistIdsEqual = (a: unknown, b: unknown): boolean => idsEqual(a, b)

const parseTime = (time?: string): { h: number; m: number } => {
  if (!time) return { h: 23, m: 59 }
  const [h, m] = String(time)
    .split(":")
    .map((n) => Number(n) || 0)
  return { h, m }
}

const computeNextOpeningAt = (checklist: CompanyChecklist, now: Date): Date => {
  const schedule: any = checklist.schedule || {}
  const opening = new Date(now)
  const timeToUse = schedule.openingTime || schedule.closingTime

  switch (schedule.type) {
    case "once": {
      // If a specific start date is set, treat it as the single opening date.
      if (typeof schedule.startDate === "number" && Number.isFinite(schedule.startDate)) {
        const d = new Date(schedule.startDate)
        const { h, m } = parseTime(timeToUse)
        d.setHours(h, m, 0, 0)
        return d
      }
      const { h, m } = parseTime(timeToUse)
      opening.setHours(h, m, 0, 0)
      return opening
    }
    case "daily": {
      // If repeatDays is provided, pick the next enabled day (including today if time not passed).
      const repeatDays = schedule.repeatDays as
        | { monday?: boolean; tuesday?: boolean; wednesday?: boolean; thursday?: boolean; friday?: boolean; saturday?: boolean; sunday?: boolean }
        | undefined
      const enabled = repeatDays && typeof repeatDays === "object" ? repeatDays : null
      const { h, m } = parseTime(timeToUse)

      // Try today first.
      const candidate = new Date(opening)
      candidate.setHours(h, m, 0, 0)
      if (!enabled) {
        if (candidate < now) candidate.setDate(candidate.getDate() + 1)
        return candidate
      }

      const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
      // Search up to 14 days to avoid infinite loops on bad configs.
      for (let i = 0; i < 14; i++) {
        const d = new Date(opening)
        d.setDate(d.getDate() + i)
        d.setHours(h, m, 0, 0)
        const key = dayKeys[d.getDay()]
        const isEnabled = Boolean((enabled as any)[key])
        if (!isEnabled) continue
        if (i === 0 && d < now) continue
        return d
      }

      // Fallback if repeatDays is empty/invalid: tomorrow.
      candidate.setDate(candidate.getDate() + 1)
      return candidate
    }
    case "weekly": {
      const openingDay = String(schedule.openingDay || "monday").toLowerCase()
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      }
      const target = dayMap[openingDay] ?? 1
      const current = opening.getDay()
      const diff = (target - current + 7) % 7
      opening.setDate(opening.getDate() + diff)
      const { h, m } = parseTime(timeToUse)
      opening.setHours(h, m, 0, 0)
      if (opening < now) opening.setDate(opening.getDate() + 7)
      return opening
    }
    case "monthly": {
      const openingDate = Number(schedule.openingDate || 1) || 1
      opening.setDate(openingDate)
      const { h, m } = parseTime(timeToUse)
      opening.setHours(h, m, 0, 0)
      if (opening < now) opening.setMonth(opening.getMonth() + 1)
      return opening
    }
    case "yearly": {
      const anchor =
        typeof schedule.startDate === "number" && Number.isFinite(schedule.startDate)
          ? new Date(schedule.startDate)
          : new Date(now)
      const month = anchor.getMonth()
      const dom = Number(schedule.openingDate) || anchor.getDate()
      opening.setFullYear(now.getFullYear(), month, dom)
      const { h, m } = parseTime(timeToUse)
      opening.setHours(h, m, 0, 0)
      if (opening < now) opening.setFullYear(opening.getFullYear() + 1)
      return opening
    }
    case "4week": {
      const start = typeof schedule.startDate === "number" ? new Date(schedule.startDate) : now
      const msInDay = 24 * 60 * 60 * 1000
      const daysSince = Math.floor((now.getTime() - start.getTime()) / msInDay)
      const daysToNext = 28 - (daysSince % 28)
      opening.setDate(opening.getDate() + (daysToNext % 28))
      const { h, m } = parseTime(timeToUse)
      opening.setHours(h, m, 0, 0)
      return opening
    }
    case "continuous": {
      return opening
    }
    default: {
      const { h, m } = parseTime(timeToUse)
      opening.setHours(h, m, 0, 0)
      return opening
    }
  }
}

const computeWindow = (
  checklist: CompanyChecklist,
  now: Date,
): { openingAt: Date; closingAt: Date; expireAt: Date | null } => {
  const schedule: any = checklist.schedule || {}
  const openingAt = computeNextOpeningAt(checklist, now)

  // Default closing date is the same date as opening.
  // For one-time schedules, allow a separate closing date via legacy `dueTime` (epoch ms).
  const closingAt =
    schedule.type === "once" && typeof schedule.dueTime === "number" && Number.isFinite(schedule.dueTime)
      ? new Date(schedule.dueTime)
      : new Date(openingAt)

  const closingTimeStr = schedule.closingTime || schedule.openingTime
  if (closingTimeStr) {
    const { h, m } = parseTime(closingTimeStr)
    closingAt.setHours(h, m, 0, 0)
    // If closing is earlier than opening on the same calendar date, treat as next day.
    if (closingAt.getTime() < openingAt.getTime()) closingAt.setDate(closingAt.getDate() + 1)
  } else {
    closingAt.setTime(openingAt.getTime() + 24 * 60 * 60 * 1000)
  }

  const expireHours = schedule.expireTime
  const expireAt =
    typeof expireHours === "number" && Number.isFinite(expireHours) && expireHours > 0
      ? new Date(closingAt.getTime() + expireHours * 60 * 60 * 1000)
      : null

  return { openingAt, closingAt, expireAt }
}

export const getNextDueDateForChecklist = (checklist: CompanyChecklist, now: Date = new Date()): Date => {
  return computeNextOpeningAt(checklist, now)
}

export const getChecklistWindowForChecklist = (
  checklist: CompanyChecklist,
  opts?: { now?: Date; instanceDate?: number | null },
): { openingAt: Date; closingAt: Date; expireAt: Date | null } => {
  const now = opts?.now ?? new Date()
  const instanceDate = opts?.instanceDate ?? null

  // If instanceDate is provided, anchor the window to that day/time (used for completing a specific instance).
  if (typeof instanceDate === "number" && Number.isFinite(instanceDate)) {
    const schedule: any = checklist.schedule || {}
    const base = new Date(instanceDate)
    const openingAt = new Date(base)
    const openingTimeStr = schedule.openingTime || schedule.closingTime
    const { h: oh, m: om } = parseTime(openingTimeStr)
    openingAt.setHours(oh, om, 0, 0)

    const closingAt = new Date(openingAt)
    const closingTimeStr = schedule.closingTime || schedule.openingTime
    if (closingTimeStr) {
      const { h, m } = parseTime(closingTimeStr)
      closingAt.setHours(h, m, 0, 0)
      if (closingAt < openingAt) closingAt.setDate(closingAt.getDate() + 1)
    } else {
      closingAt.setTime(openingAt.getTime() + 24 * 60 * 60 * 1000)
    }

    const expireHours = schedule.expireTime
    const expireAt =
      typeof expireHours === "number" && Number.isFinite(expireHours) && expireHours > 0
        ? new Date(closingAt.getTime() + expireHours * 60 * 60 * 1000)
        : null

    return { openingAt, closingAt, expireAt }
  }

  return computeWindow(checklist, now)
}

const startOfLocalDay = (d: Date): Date => {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

const isDailyRepeatDayAllowed = (schedule: any, dayStart: Date): boolean => {
  const repeatDays = schedule?.repeatDays
  const hasDayRules =
    repeatDays &&
    typeof repeatDays === "object" &&
    Object.values(repeatDays).some((v) => v === true)
  if (!hasDayRules) return true
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
  const key = dayKeys[dayStart.getDay()]
  return Boolean((repeatDays as Record<string, boolean>)[key])
}

const closingDeadlineForInstanceDay = (checklist: CompanyChecklist, instanceDay: Date): Date => {
  const anchor = startOfLocalDay(instanceDay).getTime()
  return getChecklistWindowForChecklist(checklist, { instanceDate: anchor }).closingAt
}

const startOfWeekMonday = (d: Date): Date => {
  const x = startOfLocalDay(d)
  const dow = x.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  x.setDate(x.getDate() + offset)
  return x
}

const startOfMonthLocal = (d: Date): Date => {
  const x = startOfLocalDay(d)
  return new Date(x.getFullYear(), x.getMonth(), 1)
}

/**
 * All due-instance closing deadlines for an active checklist that fall inside a local date range
 * (inclusive). Anchors each instance with `getChecklistWindowForChecklist(..., instanceDate)` so
 * overnight windows and times match My Checklist / completion flows.
 *
 * Used by ChecklistDashboard so daily/monthly/yearly aggregation matches backend schedule rules.
 */
export const listChecklistDueDeadlinesInLocalRange = (
  checklist: CompanyChecklist,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] => {
  if (!checklist.schedule || checklist.status !== "active") return []

  const schedule: any = checklist.schedule
  const type = String(schedule.type || "").toLowerCase()
  const rangeDayStart = startOfLocalDay(rangeStart).getTime()
  const rangeDayEnd = startOfLocalDay(rangeEnd).getTime()
  const out: Date[] = []

  if (type === "continuous") {
    out.push(closingDeadlineForInstanceDay(checklist, rangeStart))
    return out
  }

  if (type === "once") {
    const ca = checklist.createdAt
    if (typeof ca !== "number" || !Number.isFinite(ca)) return []
    if (ca < rangeStart.getTime() || ca > rangeEnd.getTime()) return []
    out.push(getChecklistWindowForChecklist(checklist, { instanceDate: ca }).closingAt)
    return out
  }

  if (type === "daily") {
    const d = startOfLocalDay(rangeStart)
    while (d.getTime() <= rangeDayEnd) {
      if (isDailyRepeatDayAllowed(schedule, d)) {
        out.push(closingDeadlineForInstanceDay(checklist, d))
      }
      d.setDate(d.getDate() + 1)
    }
    return out
  }

  if (type === "weekly") {
    const openingDay = String(schedule.openingDay || "monday").toLowerCase()
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    }
    const targetDow = dayMap[openingDay] ?? 1
    let weekStart = startOfWeekMonday(startOfLocalDay(rangeStart))
    const guardEnd = rangeDayEnd + 8 * 24 * 60 * 60 * 1000
    while (weekStart.getTime() <= guardEnd) {
      const openD = new Date(weekStart)
      openD.setDate(weekStart.getDate() + (targetDow === 0 ? 6 : targetDow - 1))
      const openDayTs = startOfLocalDay(openD).getTime()
      if (openDayTs >= rangeDayStart && openDayTs <= rangeDayEnd) {
        out.push(closingDeadlineForInstanceDay(checklist, openD))
      }
      weekStart.setDate(weekStart.getDate() + 7)
    }
    return out
  }

  if (type === "monthly") {
    const dom = Number(schedule.openingDate) || 1
    let m = startOfMonthLocal(rangeStart)
    const endMonth = startOfMonthLocal(rangeEnd)
    while (m.getTime() <= endMonth.getTime()) {
      const od = new Date(m.getFullYear(), m.getMonth(), dom)
      const odDayTs = startOfLocalDay(od).getTime()
      if (odDayTs >= rangeDayStart && odDayTs <= rangeDayEnd) {
        out.push(closingDeadlineForInstanceDay(checklist, od))
      }
      m.setMonth(m.getMonth() + 1)
    }
    return out
  }

  if (type === "yearly") {
    const anchor = new Date(
      typeof schedule.startDate === "number" && Number.isFinite(schedule.startDate)
        ? schedule.startDate
        : checklist.createdAt || Date.now(),
    )
    const month = anchor.getMonth()
    const dom = Number(schedule.openingDate) || anchor.getDate()
    const y0 = startOfLocalDay(rangeStart).getFullYear()
    const y1 = startOfLocalDay(rangeEnd).getFullYear()
    for (let y = y0; y <= y1; y++) {
      const od = new Date(y, month, dom)
      const odDayTs = startOfLocalDay(od).getTime()
      if (odDayTs >= rangeDayStart && odDayTs <= rangeDayEnd) {
        out.push(closingDeadlineForInstanceDay(checklist, od))
      }
    }
    return out
  }

  if (type === "4week") {
    const scheduleStart =
      typeof schedule.startDate === "number" && Number.isFinite(schedule.startDate) ? schedule.startDate : null
    const created = Number(checklist.createdAt) || 0
    const effectiveStartMs = scheduleStart != null ? Math.max(scheduleStart, created) : created
    const origin = startOfLocalDay(new Date(effectiveStartMs))
    const d = startOfLocalDay(rangeStart)
    const msDay = 24 * 60 * 60 * 1000
    while (d.getTime() <= rangeDayEnd) {
      const daysSince = Math.floor((d.getTime() - origin.getTime()) / msDay)
      if (daysSince >= 0 && daysSince % 28 === 0) {
        out.push(closingDeadlineForInstanceDay(checklist, d))
      }
      d.setDate(d.getDate() + 1)
    }
    return out
  }

  return out
}

const MS_WEEK = 7 * 24 * 60 * 60 * 1000
const MS_4WEEK = 28 * 24 * 60 * 60 * 1000

const isSameLocalCalendarDay = (aMs: number, bMs: number): boolean => {
  const a = new Date(aMs)
  const b = new Date(bMs)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const isSameCalendarMonth = (aMs: number, bMs: number): boolean => {
  const a = new Date(aMs)
  const b = new Date(bMs)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

const isSameCalendarYear = (aMs: number, bMs: number): boolean => {
  const a = new Date(aMs)
  const b = new Date(bMs)
  return a.getFullYear() === b.getFullYear()
}

const statusFromLatestCompletion = (latest: any): "completed" | "overdue" | "due" | "upcoming" | "late" | "expired" => {
  const raw = String(latest?.status || "").trim().toLowerCase()
  if (raw === "completed" || raw === "late" || raw === "expired" || raw === "overdue" || raw === "due" || raw === "upcoming") {
    return raw as any
  }
  return "completed"
}

/**
 * User-facing status for My Checklist / filters.
 * For recurring schedules, a past completion only "locks" status until that period elapses
 * (e.g. daily can be due again the next calendar day). One-time checklists stay done from the latest record.
 */
export const getChecklistStatusForUser = (
  checklist: CompanyChecklist,
  completions: ChecklistCompletion[],
  userId: string,
  now: Date = new Date(),
): "completed" | "overdue" | "due" | "upcoming" | "late" | "expired" => {
  const checklistId = (checklist as any)?.id

  const userCompletions = (completions || []).filter((c: any) => {
    return idsEqual(c?.checklistId, checklistId) && normalizeId(c?.completedBy) === normalizeId(userId)
  })

  if (userCompletions.length > 0) {
    const latest = [...userCompletions].sort((a: any, b: any) => Number(b?.completedAt || 0) - Number(a?.completedAt || 0))[0]
    const lastAt = Number((latest as any)?.completedAt || 0)
    const schedule: any = (checklist as any)?.schedule || {}
    const st = String(schedule.type || "").toLowerCase()

    if (st === "once") {
      return statusFromLatestCompletion(latest)
    }

    if (st === "continuous") {
      // Always-on checklists: re-evaluate from the current window, not the last submission.
    } else if (st === "daily") {
      if (isSameLocalCalendarDay(lastAt, now.getTime())) {
        return statusFromLatestCompletion(latest)
      }
    } else if (st === "weekly") {
      if (now.getTime() - lastAt < MS_WEEK) {
        return statusFromLatestCompletion(latest)
      }
    } else if (st === "monthly") {
      if (isSameCalendarMonth(lastAt, now.getTime())) {
        return statusFromLatestCompletion(latest)
      }
    } else if (st === "4week") {
      if (now.getTime() - lastAt < MS_4WEEK) {
        return statusFromLatestCompletion(latest)
      }
    } else if (st === "yearly") {
      if (isSameCalendarYear(lastAt, now.getTime())) {
        return statusFromLatestCompletion(latest)
      }
    } else {
      // Unknown schedule shape: preserve legacy sticky behavior.
      return statusFromLatestCompletion(latest)
    }
  }

  const { openingAt, closingAt, expireAt } = computeWindow(checklist, now)
  const t = now.getTime()

  if (expireAt && t > expireAt.getTime()) return "expired"
  if (t >= closingAt.getTime()) return "overdue"
  if (t >= openingAt.getTime()) return "due"
  return "upcoming"
}

export const buildBlackoutDateKeySet = (
  entries: ChecklistBlackoutDate[] | undefined | null,
): Set<string> => {
  const set = new Set<string>()
  if (!entries || entries.length === 0) return set

  for (const raw of entries) {
    const startStr = (raw?.startDate || raw?.date || "").trim()
    const endStr = (raw?.endDate || "").trim()

    const start = parseYmdToLocalDate(startStr)
    if (!start) continue

    const end = endStr ? parseYmdToLocalDate(endStr) : null
    const finalEnd = end && end.getTime() >= start.getTime() ? end : start

    const cursor = new Date(start.getTime())
    const maxDays = 366 * 5
    let days = 0
    while (cursor.getTime() <= finalEnd.getTime() && days < maxDays) {
      set.add(formatLocalYmd(cursor))
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(0, 0, 0, 0)
      days++
    }
  }

  return set
}

export const isBlackoutDayStart = (
  dayStartTs: number,
  blackoutKeySet: Set<string> | undefined | null,
): boolean => {
  if (!blackoutKeySet || blackoutKeySet.size === 0) return false
  if (typeof dayStartTs !== "number" || !Number.isFinite(dayStartTs)) return false
  return blackoutKeySet.has(formatLocalYmd(new Date(dayStartTs)))
}

// Define ChecklistMetrics interface for dashboard
export interface ChecklistMetrics {
  totalChecklists: number
  completedOnTime: number
  completedLate: number
  overdue: number
  completionRate: number
  averageScore: number
  streakCount: number
}

// Date and time utilities
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString()
}

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString()
}

export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

export const isToday = (timestamp: number): boolean => {
  const today = new Date()
  const date = new Date(timestamp)
  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()
  )
}

// Update the function to handle the correct schedule types and property names
export const isOverdue = (checklist: CompanyChecklist, lastCompletion?: ChecklistCompletion): boolean => {
  if (!checklist.schedule) return false
  
  const scheduleType = checklist.schedule.type
  
  // Continuous checklists are never overdue, they're always available
  if (scheduleType === "continuous") {
    return false
  }
  
  if (!lastCompletion) return true

  const now = Date.now()
  const lastCompletedAt = lastCompletion.completedAt

  switch (scheduleType) {
    case "daily":
      return now - lastCompletedAt > 24 * 60 * 60 * 1000 // 24 hours
    case "weekly":
      return now - lastCompletedAt > 7 * 24 * 60 * 60 * 1000 // 7 days
    case "monthly":
      return now - lastCompletedAt > 30 * 24 * 60 * 60 * 1000 // 30 days
    case "yearly":
      return now - lastCompletedAt > 365 * 24 * 60 * 60 * 1000 // 365 days
    case "4week":
      return now - lastCompletedAt > 28 * 24 * 60 * 60 * 1000 // 28 days (4 weeks)
    default:
      return false
  }
}

// Calculate completion score based on responses, excluding log section items
export const calculateCompletionScore = (
  responses: Record<string, ItemResponse>,
  checklist?: CompanyChecklist
): number => {
  if (!responses || Object.keys(responses).length === 0) return 0
  
  // Filter out log section items if checklist is provided
  const filteredResponses = checklist ? 
    Object.entries(responses).filter(([itemId]) => {
      // Check if this item belongs to a logs section
      const isLogSectionItem = checklist.sections
        .filter(section => section.sectionType === 'logs')
        .some(section => 
          section.items.some(item => item.id.replace(/[.#$\[\]/]/g, '_') === itemId)
        )
      return !isLogSectionItem
    }).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, ItemResponse>) : 
    responses
  
  // If all items were log section items, return 100% (perfect score)
  if (Object.keys(filteredResponses).length === 0) return 100
  
  const totalItems = Object.keys(filteredResponses).length
  const passedItems = Object.values(filteredResponses).filter(r => r.completed).length
  
  return Math.round((passedItems / totalItems) * 100)
}

// Check if completion is late
export const isCompletionLate = (completion: ChecklistCompletion, checklist: CompanyChecklist): boolean => {
  if (!completion.scheduledFor || !checklist.schedule) return false
  
  // Get the due time based on closing time if available
  let dueTime = completion.scheduledFor;
  if (checklist.schedule?.closingTime) {
    const [hours, minutes] = checklist.schedule.closingTime.split(':').map(Number);
    const dueDate = new Date(completion.scheduledFor);
    dueDate.setHours(hours || 0, minutes || 0, 0, 0);
    dueTime = dueDate.getTime();
  }
  
  return completion.completedAt > dueTime;
}

// Count how many completions were submitted late
export const getLateCompletionsCount = (completions: ChecklistCompletion[], checklists: CompanyChecklist[]): number => {
  if (!completions || completions.length === 0) return 0
  return completions.filter(completion => {
    // A completion is late if it's overdue or if the computed status is late/expired
    if (completion.status === 'overdue') return true
    const checklist = checklists.find(c => idsEqual((c as any)?.id, (completion as any)?.checklistId))
    if (checklist) {
      const computedStatus = getChecklistStatus(checklist, [completion])
      return computedStatus === 'late' || computedStatus === 'expired'
    }
    return false
  }).length
}

// Check if checklist is open for completion
export const isChecklistOpen = (checklist: CompanyChecklist): boolean => {
  if (!checklist.schedule) return true
  
  const now = Date.now();
  
  // If the checklist has an opening time and closing time
  if (checklist.schedule.openingTime && checklist.schedule.closingTime) {
    // Convert opening and closing times to timestamps for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse opening time (HH:MM format)
    const [openHours, openMinutes] = checklist.schedule.openingTime.split(':').map(Number);
    const openingTimestamp = new Date(today);
    openingTimestamp.setHours(openHours, openMinutes, 0, 0);
    
    // Parse closing time (HH:MM format)
    const [closeHours, closeMinutes] = checklist.schedule.closingTime.split(':').map(Number);
    const closingTimestamp = new Date(today);
    closingTimestamp.setHours(closeHours, closeMinutes, 0, 0);
    
    // Handle case where closing time is earlier than opening time (next day)
    if (closingTimestamp.getTime() < openingTimestamp.getTime()) {
      closingTimestamp.setDate(closingTimestamp.getDate() + 1); // Move to next day
    }
    
    // Calculate expire time (if set, otherwise use closing time)
    let expireTimestamp;
    if (checklist.schedule.expireTime) {
      // expireTime is in hours after closing time
      expireTimestamp = new Date(closingTimestamp.getTime() + (checklist.schedule.expireTime * 60 * 60 * 1000));
    } else {
      expireTimestamp = closingTimestamp;
    }
    
    // Checklist is open if current time is between opening time and expire time
    return now >= openingTimestamp.getTime() && now <= expireTimestamp.getTime();
  }
  
  return true;
}

// Check if checklist is overdue
export const isChecklistOverdue = (checklist: CompanyChecklist, lastCompletion?: ChecklistCompletion): boolean => {
  return isOverdue(checklist, lastCompletion)
}

// Get schedule timestamps for a checklist
export const getScheduleTimestamps = (): { next: number, deadline: number } => {
  const now = Date.now()
  const nextDay = now + 24 * 60 * 60 * 1000
  
  return {
    next: now,
    deadline: nextDay
  }
}

// Calculate metrics for dashboard
export const getChecklistMetrics = (checklists: CompanyChecklist[], completions: ChecklistCompletion[]): ChecklistMetrics => {
  const totalChecklists = checklists.length
  let completedOnTime = 0
  let completedLate = 0
  let overdue = 0
  let totalScore = 0
  let scoreCount = 0
  
  // Process completions
  completions.forEach(completion => {
    if (completion.status === 'completed') {
      // Calculate if completion is late
      const checklist = checklists.find(c => idsEqual((c as any)?.id, (completion as any)?.checklistId))
      const isLate = checklist ? isCompletionLate(completion, checklist) : false
      
      if (isLate) {
        completedLate++
      } else {
        completedOnTime++
      }
      
      // Calculate completion score
      const score = calculateCompletionScore(completion.responses)
      if (score !== undefined) {
        totalScore += score
        scoreCount++
      }
    }
  })
  
  // Count overdue checklists
  checklists.forEach(checklist => {
    const lastCompletion = completions.find(c => idsEqual((c as any)?.checklistId, (checklist as any)?.id))
    if (isOverdue(checklist, lastCompletion)) {
      overdue++
    }
  })
  
  return {
    totalChecklists,
    completedOnTime,
    completedLate,
    overdue,
    completionRate: totalChecklists > 0 ? ((completedOnTime + completedLate) / totalChecklists) * 100 : 0,
    averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
    streakCount: 7 // Placeholder value
  }
}

export const getNextDueDate = (checklist: CompanyChecklist, lastCompletion?: ChecklistCompletion): number => {
  if (!checklist.schedule) return Date.now()
  const scheduleType = checklist.schedule.type
  const now = Date.now()
  
  // For continuous checklists, they're always due now
  if (scheduleType === "continuous") {
    return now
  }
  
  const baseTime = lastCompletion?.completedAt || now

  switch (scheduleType) {
    case "daily":
      return baseTime + 24 * 60 * 60 * 1000
    case "weekly": {
      // For weekly checklists, calculate the next week occurrence
      const nextWeek = baseTime + 7 * 24 * 60 * 60 * 1000
      // If no completion or completion is old, start from current week
      if (!lastCompletion || (now - lastCompletion.completedAt) > 7 * 24 * 60 * 60 * 1000) {
        // Calculate start of current week (Monday)
        const currentDate = new Date(now)
        const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert Sunday to 6, others to dayOfWeek - 1
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - daysToMonday)
        startOfWeek.setHours(0, 0, 0, 0)
        return startOfWeek.getTime()
      }
      return nextWeek
    }
    case "4week": {
      // For 4-week cycles, use the startDate if available, otherwise calculate from last completion
      const schedule = checklist.schedule
      const startDate = schedule && 'startDate' in schedule && typeof schedule.startDate === 'number' ? schedule.startDate : undefined
      if (startDate) {
        // Calculate how many 4-week cycles have passed since start date
        const cycleLength = 28 * 24 * 60 * 60 * 1000 // 28 days in milliseconds
        const timeSinceStart = now - startDate
        const cyclesPassed = Math.floor(timeSinceStart / cycleLength)
        const nextCycleStart = startDate + ((cyclesPassed + 1) * cycleLength)
        
        // If we're still in the current cycle and no completion, return current cycle start
        if (!lastCompletion || lastCompletion.completedAt < (startDate + (cyclesPassed * cycleLength))) {
          return startDate + (cyclesPassed * cycleLength)
        }
        
        return nextCycleStart
      }
      // Fallback to adding 28 days to base time if no start date
      return baseTime + 28 * 24 * 60 * 60 * 1000
    }
    case "monthly":
      return baseTime + 30 * 24 * 60 * 60 * 1000
    case "yearly":
      return baseTime + 365 * 24 * 60 * 60 * 1000
    default:
      return baseTime + 24 * 60 * 60 * 1000
  }
}

// Check if a checklist is expired based on expire time
export const isExpired = (checklist: CompanyChecklist, lastCompletion?: ChecklistCompletion): boolean => {
  if (!checklist.schedule?.expireTime || !checklist.schedule?.closingTime) return false
  
  const dueDate = getNextDueDate(checklist, lastCompletion)
  
  // Get the opening time if available
  let openingTimestamp = null;
  if (checklist.schedule.openingTime) {
    const [openHours, openMinutes] = checklist.schedule.openingTime.split(':').map(Number);
    const openingDate = new Date(dueDate);
    openingDate.setHours(openHours, openMinutes, 0, 0);
    openingTimestamp = openingDate.getTime();
  }
  
  // Parse closing time (HH:MM format)
  const [closeHours, closeMinutes] = checklist.schedule.closingTime.split(':').map(Number);
  const closingDate = new Date(dueDate);
  closingDate.setHours(closeHours, closeMinutes, 0, 0);
  let closingTimestamp = closingDate.getTime();
  
  // Handle case where closing time is earlier than opening time (next day)
  if (openingTimestamp && closingTimestamp < openingTimestamp) {
    closingDate.setDate(closingDate.getDate() + 1); // Move to next day
    closingTimestamp = closingDate.getTime();
  }
  
  // Calculate expire time based on closing time
  const expireDate = closingTimestamp + (checklist.schedule.expireTime * 60 * 60 * 1000) // Convert hours to milliseconds
  const now = Date.now()
  
  return now > expireDate
}

export const getChecklistStatus = (
  checklist: CompanyChecklist,
  completions: ChecklistCompletion[],
  instanceDate?: number // Optional parameter to check status for a specific instance date
): "completed" | "overdue" | "due" | "upcoming" | "late" | "expired" => {
  const userCompletions = completions.filter((c) => idsEqual((c as any)?.checklistId, (checklist as any)?.id))
  const lastCompletion = userCompletions.sort((a, b) => b.completedAt - a.completedAt)[0]

  if (!checklist.schedule) {
    return "upcoming"
  }

  // Continuous: same window model as getChecklistStatusForUser (no arbitrary 1h "completed" stickiness)
  if (checklist.schedule.type === "continuous") {
    const w = getChecklistWindowForChecklist(checklist)
    const t = Date.now()
    if (w.expireAt && t > w.expireAt.getTime()) return "expired"
    if (t >= w.closingAt.getTime()) return "overdue"
    if (t >= w.openingAt.getTime()) return "due"
    return "upcoming"
  }

  // If we're checking a specific instance date
  if (instanceDate) {
    // Find completion for this specific instance
    const instanceCompletion = userCompletions.find(c => {
      // For daily checklists, match by the day of scheduledFor
      if (checklist.schedule?.type === "daily") {
        if (!c.scheduledFor) return false
        const scheduledDate = new Date(c.scheduledFor)
        const targetDate = new Date(instanceDate)
        return scheduledDate.getFullYear() === targetDate.getFullYear() &&
               scheduledDate.getMonth() === targetDate.getMonth() &&
               scheduledDate.getDate() === targetDate.getDate()
      }
      // For other schedule types, use exact scheduledFor match
      return c.scheduledFor === instanceDate
    })
    
    // If we have a completion for this instance
    if (instanceCompletion) {
      // Ensure we return a valid status type
      if (instanceCompletion.status === "in_progress") {
        return "due" // Map in_progress to due for consistency
      }
      
      // Return the stored status - this ensures that completed late items stay marked as "late"
      // and expired items stay marked as "expired" even after completion
      return instanceCompletion.status as "completed" | "overdue" | "due" | "upcoming" | "late" | "expired"
    }
    
    const now = Date.now()
    
    // Get the closing time for this instance
    let closingTimestamp = instanceDate;
    
    // If the checklist has a closing time, use it
    if (checklist.schedule.closingTime) {
      // Get opening time if available
      let openingTimestamp = null;
      if (checklist.schedule.openingTime) {
        const [openHours, openMinutes] = checklist.schedule.openingTime.split(':').map(Number);
        const openingDate = new Date(instanceDate);
        openingDate.setHours(openHours, openMinutes, 0, 0);
        openingTimestamp = openingDate.getTime();
      }
      
      // Parse closing time (HH:MM format)
      const [closeHours, closeMinutes] = checklist.schedule.closingTime.split(':').map(Number);
      const closingDate = new Date(instanceDate);
      closingDate.setHours(closeHours, closeMinutes, 0, 0);
      closingTimestamp = closingDate.getTime();
      
      // Handle case where closing time is earlier than opening time (next day)
      if (openingTimestamp && closingTimestamp < openingTimestamp) {
        closingDate.setDate(closingDate.getDate() + 1); // Move to next day
        closingTimestamp = closingDate.getTime();
      }
      
      const instanceDate24HoursAgo = closingTimestamp - (24 * 60 * 60 * 1000); // 24 hours before closing time
      
      // If current time is before opening time, it's upcoming
      if (openingTimestamp && now < openingTimestamp) {
        return "upcoming";
      }
      
      // If current time is more than 24 hours before closing time, it's upcoming
      if (now < instanceDate24HoursAgo) {
        return "upcoming";
      }
      
      // If current time is between 24 hours before closing and closing time, it's due
      if (now >= instanceDate24HoursAgo && now <= closingTimestamp) {
        return "due";
      }
      
      // If we've passed closing time but haven't checked expire time yet, it's overdue by default
      // This ensures we don't default to "upcoming" when the status should be "overdue"
      if (now > closingTimestamp) {
        return "overdue";
      }
    }
    
    // Calculate expire time if set
    if (checklist.schedule.expireTime) {
      const expireTimestamp = closingTimestamp + (checklist.schedule.expireTime * 60 * 60 * 1000);
      
      // If current time is between closing time and expire time, it's overdue
      if (now > closingTimestamp && now <= expireTimestamp) {
        return "overdue";
      }
      
      // If current time is past expire time, it's expired
      if (now > expireTimestamp) {
        return "expired";
      }
    } else {
      // If no expire time and past closing time, it's overdue
      if (now > closingTimestamp) {
        return "overdue";
      }
    }
    
    // Default for instances without specific time handling
    if (instanceDate > now) {
      return "upcoming";
    } else if (isToday(instanceDate)) {
      return "due";
    } else {
      return "overdue";
    }
  }
  
  // Original logic for getting current status (not for a specific instance)
  // Check if checklist is expired
  if (isExpired(checklist, lastCompletion)) {
    return "expired";
  }

  // Check if there's a recent completion
  if (lastCompletion) {
    const dueDate = getNextDueDate(checklist, lastCompletion);
    
    // If completed recently and not yet time for next occurrence
    if (lastCompletion.completedAt > dueDate - getScheduleInterval(checklist.schedule.type)) {
      // Check if completion was late by comparing completedAt to dueDate
      const wasLate = lastCompletion.completedAt > dueDate
      return wasLate ? "late" : "completed";
    }
  }

  const now = Date.now();
  const nextDueDate = getNextDueDate(checklist, lastCompletion);
  
  // Get the closing time for the next due date
  let closingTimestamp = nextDueDate;
  
  // If the checklist has a closing time, use it
  if (checklist.schedule.closingTime) {
    // Parse closing time (HH:MM format)
    const nextDueDate24HoursAgo = nextDueDate - (24 * 60 * 60 * 1000); // 24 hours before due date
    const [closeHours, closeMinutes] = checklist.schedule.closingTime.split(':').map(Number);
    const closingDate = new Date(nextDueDate);
    closingDate.setHours(closeHours, closeMinutes, 0, 0);
    closingTimestamp = closingDate.getTime();
    
    // If current time is more than 24 hours before closing time, it's upcoming
    if (now < nextDueDate24HoursAgo) {
      return "upcoming";
    }
    
    // If current time is between 24 hours before closing and closing time, it's due
    if (now >= nextDueDate24HoursAgo && now <= closingTimestamp) {
      return "due";
    }
    
    // If current time is past closing time, check if it's expired
    if (now > closingTimestamp) {
      // Calculate expire time if set
      if (checklist.schedule.expireTime) {
        const expireTimestamp = closingTimestamp + (checklist.schedule.expireTime * 60 * 60 * 1000);
        
        // If current time is between closing time and expire time, it's overdue
        if (now <= expireTimestamp) {
          return "overdue";
        } else {
          return "expired";
        }
      } else {
        return "overdue";
      }
    }
  }

  // Default fallback logic
  if (isToday(nextDueDate)) {
    return "due";
  }

  return "upcoming";
}

export const filterChecklistsByStatus = (
  checklists: CompanyChecklist[],
  completions: ChecklistCompletion[],
  status: "completed" | "overdue" | "due" | "upcoming" | "late" | "expired" | "all",
): CompanyChecklist[] => {
  if (status === "all") return checklists
  return checklists.filter((checklist) => getChecklistStatus(checklist, completions) === status)
}

// Generate instances for repeating checklists
export interface ChecklistInstance {
  checklist: CompanyChecklist
  instanceDate: number
  status: "completed" | "overdue" | "due" | "upcoming" | "late" | "expired"
}

// Generate instances for a repeating checklist
export const generateChecklistInstances = (
  checklist: CompanyChecklist,
  completions: ChecklistCompletion[],
  daysToShow: number = 7 // Default to showing a week's worth of instances
): ChecklistInstance[] => {
  // Get checklist creation date - only generate instances after this date
  const checklistCreatedAt = checklist.createdAt || 0
  const creationDate = new Date(checklistCreatedAt)
  creationDate.setHours(0, 0, 0, 0) // Start of creation day
  
  if (!checklist.schedule) {
    // Non-repeating checklist, just return a single instance if it's after creation
    const instanceDate = Math.max(Date.now(), checklistCreatedAt)
    return [{
      checklist,
      instanceDate,
      status: getChecklistStatus(checklist, completions)
    }]
  }
  
  const instances: ChecklistInstance[] = []
  const now = Date.now()
  const userCompletions = completions.filter((c) => idsEqual((c as any)?.checklistId, (checklist as any)?.id))
  const lastCompletion = userCompletions.sort((a, b) => b.completedAt - a.completedAt)[0]
  
  // Start from the last completion or current time - no longer used directly
  // Keeping track of last completion for reference
  
  // For daily checklists, start from today and go back to find any overdue instances
  if (checklist.schedule.type === "daily") {
    // Start from today at midnight, but not before creation date
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    
    // Find the most recent completion for today
    // Match by scheduledFor to find the completion for today's instance
    const todayCompletion = userCompletions.find(c => {
      if (!c.scheduledFor) return false
      const scheduledDate = new Date(c.scheduledFor)
      return scheduledDate.getFullYear() === today.getFullYear() &&
             scheduledDate.getMonth() === today.getMonth() &&
             scheduledDate.getDate() === today.getDate()
    })
    
    // If no completion today, add today's instance
    if (!todayCompletion) {
      // Force recalculation of status for today
      const todayStatus = getChecklistStatus(checklist, completions, today.getTime())
      
      instances.push({
        checklist,
        instanceDate: today.getTime(),
        status: todayStatus
      })
    } else {
      // Today is completed - use the actual completion status (could be "completed", "late", or "expired")
      const completionStatus = todayCompletion.status as "completed" | "overdue" | "due" | "upcoming" | "late" | "expired"
      instances.push({
        checklist,
        instanceDate: today.getTime(),
        status: completionStatus
      })
    }
    
    // Add past instances that might be overdue (up to 7 days back)
    // But don't go back before the creation date
    for (let i = 1; i <= daysToShow; i++) {
      const pastDate = new Date(today)
      pastDate.setDate(pastDate.getDate() - i)
      pastDate.setHours(0, 0, 0, 0)
      
      // Skip if this date is before the checklist creation date
      if (pastDate.getTime() < checklistCreatedAt) {
        break
      }
      
      const pastCompletion = userCompletions.find(c => {
        if (!c.scheduledFor) return false
        const scheduledDate = new Date(c.scheduledFor)
        return scheduledDate.getFullYear() === pastDate.getFullYear() &&
               scheduledDate.getMonth() === pastDate.getMonth() &&
               scheduledDate.getDate() === pastDate.getDate()
      })
      
      if (pastCompletion) {
        // Add completed instance with its actual status
        const completionStatus = pastCompletion.status as "completed" | "overdue" | "due" | "upcoming" | "late" | "expired"
        instances.push({
          checklist,
          instanceDate: pastDate.getTime(),
          status: completionStatus
        })
      } else {
        // Add uncompleted past instance
        const status = getChecklistStatus(checklist, completions, pastDate.getTime())
        // Only add if it's not expired
        if (status !== "expired") {
          instances.push({
            checklist,
            instanceDate: pastDate.getTime(),
            status
          })
        }
      }
    }
    
    // Add future instances
    for (let i = 1; i <= daysToShow; i++) {
      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + i)
      futureDate.setHours(0, 0, 0, 0)
      
      instances.push({
        checklist,
        instanceDate: futureDate.getTime(),
        status: "upcoming"
      })
    }
  } else if (checklist.schedule.type === "continuous") {
    // For continuous checklists, just return a single always-available instance
    instances.push({
      checklist,
      instanceDate: now,
      status: getChecklistStatus(checklist, completions)
    })
  } else if (checklist.schedule.type === "4week") {
    // For 4-week cycles, generate instances based on the start date
    const cycleLength = 28 * 24 * 60 * 60 * 1000 // 28 days in milliseconds
    
    // Check if there's a start date - if not, use old logic for legacy checklists
    const schedule = checklist.schedule
    const scheduleStartDate = schedule && 'startDate' in schedule && typeof schedule.startDate === 'number' ? schedule.startDate : undefined
    if (scheduleStartDate) {
      // Use the later of startDate or creation date
      const effectiveStartDate = Math.max(scheduleStartDate, checklistCreatedAt)
      
      // Calculate current cycle
      const timeSinceStart = now - effectiveStartDate
      const currentCycle = Math.floor(timeSinceStart / cycleLength)
      const currentCycleStart = effectiveStartDate + (currentCycle * cycleLength)
      
      // Add current cycle if not completed
      const currentCycleCompletion = userCompletions.find(c => 
        c.completedAt >= currentCycleStart && c.completedAt < (currentCycleStart + cycleLength)
      )
      
      if (!currentCycleCompletion && currentCycleStart <= now) {
        instances.push({
          checklist,
          instanceDate: currentCycleStart,
          status: getChecklistStatus(checklist, completions, currentCycleStart)
        })
      } else if (currentCycleCompletion) {
        instances.push({
          checklist,
          instanceDate: currentCycleStart,
          status: "completed"
        })
      }
      
      // Add next cycle if current is completed
      if (currentCycleCompletion) {
        const nextCycleStart = effectiveStartDate + ((currentCycle + 1) * cycleLength)
        instances.push({
          checklist,
          instanceDate: nextCycleStart,
          status: nextCycleStart <= now ? "due" : "upcoming"
        })
      }
    } else {
      // Legacy checklists without start date - use old logic
      const baseTime = lastCompletion?.completedAt || Math.max(now, checklistCreatedAt)
      const nextDue = baseTime + cycleLength
      
      instances.push({
        checklist,
        instanceDate: nextDue,
        status: getChecklistStatus(checklist, completions)
      })
    }
  } else {
    // For weekly, monthly, yearly checklists, use the original logic
    instances.push({
      checklist,
      instanceDate: getNextDueDate(checklist, lastCompletion),
      status: getChecklistStatus(checklist, completions)
    })
  }
  
  return instances
}

export const sortChecklistsByPriority = (
  checklists: CompanyChecklist[],
  completions: ChecklistCompletion[],
): CompanyChecklist[] => {
  return checklists.sort((a, b) => {
    const statusA = getChecklistStatus(a, completions)
    const statusB = getChecklistStatus(b, completions)

    // Priority order: expired > overdue > due > upcoming > late > completed
    const priorityOrder = { expired: 0, overdue: 1, due: 2, upcoming: 3, late: 4, completed: 5 }
    return priorityOrder[statusA] - priorityOrder[statusB]
  })
}

export const getCompletionRate = (checklist: CompanyChecklist, completions: ChecklistCompletion[]): number => {
  const checklistCompletions = completions.filter((c) => idsEqual((c as any)?.checklistId, (checklist as any)?.id))
  if (checklistCompletions.length === 0) return 0

  const completedCount = checklistCompletions.filter((c) => c.status === "completed").length
  return Math.round((completedCount / checklistCompletions.length) * 100)
}

const weekStartMondayMs = (t: number): number => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + offset)
  return d.getTime()
}

/**
 * Consecutive schedule periods with at least one completed submission, counting backward from `now`.
 * When `userId` is omitted, counts completions from any user for that checklist.
 */
export const getConsecutiveCompletionStreakForUser = (
  checklist: CompanyChecklist,
  completions: ChecklistCompletion[],
  userId?: string,
  now: Date = new Date(),
): number => {
  const uid = userId != null ? normalizeId(userId) : ""
  const mine = completions
    .filter((c) => {
      if (!idsEqual((c as any)?.checklistId, (checklist as any)?.id)) return false
      if (uid && normalizeId((c as any)?.completedBy) !== uid) return false
      return String((c as any)?.status || "").toLowerCase() === "completed"
    })
    .map((c) => Number(c.completedAt))
    .filter((t) => Number.isFinite(t))

  if (mine.length === 0) return 0

  const st = String(checklist.schedule?.type || "").toLowerCase()
  const MS_DAY = 24 * 60 * 60 * 1000

  if (st === "daily" || st === "continuous" || !checklist.schedule) {
    const days = new Set(mine.map((t) => formatLocalYmd(new Date(t))))
    let streak = 0
    const cursor = startOfLocalDay(now)
    while (days.has(formatLocalYmd(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  if (st === "weekly") {
    const weeks = new Set(mine.map((t) => weekStartMondayMs(t)))
    let streak = 0
    let ws = weekStartMondayMs(now.getTime())
    while (weeks.has(ws)) {
      streak++
      ws -= 7 * MS_DAY
    }
    return streak
  }

  if (st === "monthly") {
    const months = new Set(mine.map((t) => `${new Date(t).getFullYear()}-${new Date(t).getMonth()}`))
    let streak = 0
    const cursor = new Date(startOfLocalDay(now))
    cursor.setDate(1)
    const key = () => `${cursor.getFullYear()}-${cursor.getMonth()}`
    while (months.has(key())) {
      streak++
      cursor.setMonth(cursor.getMonth() - 1)
    }
    return streak
  }

  if (st === "yearly") {
    const years = new Set(mine.map((t) => new Date(t).getFullYear()))
    let streak = 0
    let y = now.getFullYear()
    while (years.has(y)) {
      streak++
      y--
    }
    return streak
  }

  if (st === "4week") {
    const schedule: any = checklist.schedule || {}
    const scheduleStart =
      typeof schedule.startDate === "number" && Number.isFinite(schedule.startDate) ? schedule.startDate : null
    const created = Number(checklist.createdAt) || 0
    const effectiveStartMs = scheduleStart != null ? Math.max(scheduleStart, created) : created
    const origin = startOfLocalDay(new Date(effectiveStartMs)).getTime()
    const cycleKeys = new Set(
      mine.map((t) => String(Math.floor((startOfLocalDay(new Date(t)).getTime() - origin) / (28 * MS_DAY)))),
    )
    const nowKey = Math.floor((startOfLocalDay(now).getTime() - origin) / (28 * MS_DAY))
    let streak = 0
    let k = nowKey
    while (k >= 0 && cycleKeys.has(String(k))) {
      streak++
      k--
    }
    return streak
  }

  if (st === "once") {
    return mine.length > 0 ? 1 : 0
  }

  return mine.length
}

/** @deprecated Prefer getConsecutiveCompletionStreakForUser with explicit userId for My Checklist. */
export const getStreakCount = (checklist: CompanyChecklist, completions: ChecklistCompletion[]): number => {
  return getConsecutiveCompletionStreakForUser(checklist, completions, undefined, new Date())
}

const getScheduleInterval = (scheduleType: string): number => {
  switch (scheduleType) {
    case "daily":
      return 24 * 60 * 60 * 1000
    case "weekly":
      return 7 * 24 * 60 * 60 * 1000
    case "monthly":
      return 30 * 24 * 60 * 60 * 1000
    case "yearly":
      return 365 * 24 * 60 * 60 * 1000
    case "4week":
      return 28 * 24 * 60 * 60 * 1000 // 28 days (4 weeks)
    case "continuous":
      return 0 // Continuous checklists don't have intervals
    default:
      return 24 * 60 * 60 * 1000
  }
}

export const calculateProgress = (checklist: CompanyChecklist, completion: ChecklistCompletion): number => {
  if (!checklist.items || checklist.items.length === 0) return 0

  const completedItems = Object.values(completion.responses).filter((response: ItemResponse) => {
    const item = checklist.items?.find((i) => i.id === response.itemId)
    if (!item) return false

    switch (item.type) {
      case "yesno":
      case "checkbox":
        return response.value === "yes"
      case "number":
        return response.value !== null && response.value !== undefined
      case "text":
        return response.value && response.value.toString().trim().length > 0
      case "photo":
      case "file":
        return response.photos && response.photos.length > 0
      default:
        return false
    }
  })

  return Math.round((completedItems.length / checklist.items.length) * 100)
}

// Fix the validation function to use 'title' instead of 'text'
export const validateChecklistCompletion = (
  checklist: CompanyChecklist,
  completion: Partial<ChecklistCompletion>,
): string[] => {
  const errors: string[] = []

  if (!completion.responses || Object.keys(completion.responses).length === 0) {
    errors.push("At least one response is required")
    return errors
  }

  checklist.items?.forEach((item) => {
    const response = completion.responses?.[item.id]

    if (item.required && !response) {
      errors.push(`Response required for: ${item.title}`) // Changed from item.text to item.title
      return
    }

    if (response) {
      switch (item.type) {
        case "yesno":
        case "checkbox":
          if (!["yes", "no"].includes(response.value as string)) {
            errors.push(`Invalid yes/no response for: ${item.title}`) // Changed from item.text to item.title
          }
          break
        case "number":
          if (typeof response.value !== "number") {
            errors.push(`Number required for: ${item.title}`) // Changed from item.text to item.title
          }
          break
        case "text":
          if (!response.value || response.value.toString().trim().length === 0) {
            errors.push(`Text required for: ${item.title}`) // Changed from item.text to item.title
          }
          break
        case "photo":
        case "file":
          if (!response.photos || response.photos.length === 0) {
            errors.push(`Photo required for: ${item.title}`) // Changed from item.text to item.title
          }
          break
      }
    }
  })

  return errors
}
