import {
  createNotificationInDb,
  fetchNotificationsFromDb,
  fetchFilteredNotificationsFromDb,
  markNotificationAsReadInDb,
  markAllNotificationsAsReadInDb,
  deleteNotificationFromDb,
  deleteAllNotificationsFromDb,
  fetchNotificationSettingsFromDb,
  saveNotificationSettingsToDb,
  getUnreadNotificationCountFromDb,
  cleanupOldNotificationsFromDb,
  markNotificationAsReadForUserInDb,
  getUnreadCountForUserFromDb,
  getUserNotificationHistoryFromDb
} from "../data/Notifications"
import {
  Notification,
  NotificationFilter,
  NotificationSettings,
  NotificationType,
  NotificationAction,
  NotificationPriority,
  NotificationCategory,
  NotificationDetails,
  NotificationStats
} from "../interfaces/Notifications"
import { db, ref, get } from "../services/Firebase"

// Firebase Realtime Database key constraints: keys can't contain ".", "#", "$", "/", "[", or "]"
const INVALID_FIREBASE_KEY_CHARS = /[.#$/\[\]]/

// Sanitize notification payloads so React events / DOM objects / circular refs can't break writes.
function sanitizeForFirebase(value: any, visited: WeakSet<object> = new WeakSet()): any {
  if (value === null || value === undefined) return value
  if (typeof value !== "object") return value
  if (value instanceof Date) return value.toISOString()

  // Avoid common React/event/DOM objects that are not serializable and can contain invalid keys.
  // Also guard against getters that throw.
  const isPlainObject = (obj: any): obj is Record<string, any> => {
    if (obj === null || typeof obj !== "object") return false
    const proto = Object.getPrototypeOf(obj)
    return proto === Object.prototype || proto === null
  }

  if (visited.has(value)) return null
  visited.add(value)

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForFirebase(v, visited))
  }

  if (!isPlainObject(value)) {
    return null
  }

  const out: any = {}
  for (const key of Object.keys(value)) {
    // Drop React internals and invalid firebase keys
    if (!key || key.startsWith("__react") || INVALID_FIREBASE_KEY_CHARS.test(key)) continue

    let v: any
    try {
      v = (value as any)[key]
    } catch {
      continue
    }

    if (v === undefined) continue
    if (typeof v === "function") continue
    // Drop React elements
    if (v && typeof v === "object" && (v as any).$$typeof) continue

    try {
      out[key] = sanitizeForFirebase(v, visited)
    } catch {
      continue
    }
  }
  return out
}

// Helper function to get base path for notifications
const getNotificationBasePath = (companyId: string, siteId?: string, subsiteId?: string): string => {
  if (subsiteId && siteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}`
  } else if (siteId) {
    return `companies/${companyId}/sites/${siteId}`
  } else {
    return `companies/${companyId}`
  }
}

// Best-effort employeeId lookup (cached) so notifications can include employeeId automatically.
const employeeIdCache = new Map<string, { employeeId?: string; fetchedAt: number }>()
const EMPLOYEE_ID_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const notificationPreferencesCache = new Map<string, { preferences: any; fetchedAt: number }>()
const companyUsersCache = new Map<string, { users: Array<{ uid: string; siteId?: string | null; subsiteId?: string | null }>; fetchedAt: number }>()
const NOTIFICATION_CACHE_TTL_MS = 5 * 60 * 1000

const DIRECT_NOTIFICATION_TYPES = new Set<NotificationType>(["user"])
const DIRECT_NOTIFICATION_ACTIONS = new Set<NotificationAction>(["assigned", "invited", "joined", "left"])
const SECTION_PREFERENCE_BY_TYPE: Partial<Record<NotificationType, string>> = {
  hr: "hr",
  stock: "stock",
  finance: "finance",
  booking: "booking",
  system: "system",
}

async function getEmployeeIdForUser(companyId: string, userId: string): Promise<string | undefined> {
  const key = `${companyId}|${userId}`
  const cached = employeeIdCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < EMPLOYEE_ID_CACHE_TTL_MS) return cached.employeeId

  // Primary: companies/{companyId}/users/{uid}/employeeId (mirrored for fast lookups)
  try {
    const snap = await get(ref(db, `companies/${companyId}/users/${userId}`))
    if (snap.exists()) {
      const data: any = snap.val() || {}
      const employeeId = data.employeeId ?? data.employeeID ?? data.employee ?? data.employeeRecordId
      const normalized = typeof employeeId === "string" && employeeId.trim() ? employeeId.trim() : undefined
      employeeIdCache.set(key, { employeeId: normalized, fetchedAt: Date.now() })
      return normalized
    }
  } catch {
    // ignore and try fallback
  }

  // Fallback: users/{uid}/companies/{companyId}/employeeId (older / alternative shape)
  try {
    const snap = await get(ref(db, `users/${userId}/companies/${companyId}`))
    if (snap.exists()) {
      const data: any = snap.val() || {}
      const employeeId = data.employeeId ?? data.employeeID ?? data.employee ?? data.employeeRecordId
      const normalized = typeof employeeId === "string" && employeeId.trim() ? employeeId.trim() : undefined
      employeeIdCache.set(key, { employeeId: normalized, fetchedAt: Date.now() })
      return normalized
    }
  } catch {
    // ignore
  }

  employeeIdCache.set(key, { employeeId: undefined, fetchedAt: Date.now() })
  return undefined
}

async function getScopedCompanyUsers(
  companyId: string,
  siteId?: string,
  subsiteId?: string,
): Promise<Array<{ uid: string; siteId?: string | null; subsiteId?: string | null }>> {
  const cacheKey = `${companyId}|${siteId || "all"}|${subsiteId || "all"}`
  const cached = companyUsersCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < NOTIFICATION_CACHE_TTL_MS) return cached.users

  try {
    const snap = await get(ref(db, `companies/${companyId}/users`))
    if (!snap.exists()) {
      companyUsersCache.set(cacheKey, { users: [], fetchedAt: Date.now() })
      return []
    }

    const users = Object.entries(snap.val() || {})
      .map(([uid, value]) => {
        const record = (value || {}) as Record<string, any>
        return {
          uid,
          siteId: typeof record.siteId === "string" ? record.siteId : null,
          subsiteId: typeof record.subsiteId === "string" ? record.subsiteId : null,
        }
      })
      .filter((user) => {
        if (subsiteId) return user.siteId === siteId && user.subsiteId === subsiteId
        if (siteId) return user.siteId === siteId
        return true
      })

    companyUsersCache.set(cacheKey, { users, fetchedAt: Date.now() })
    return users
  } catch {
    return []
  }
}

async function getUserPreferences(userId: string): Promise<any | null> {
  const cached = notificationPreferencesCache.get(userId)
  if (cached && Date.now() - cached.fetchedAt < NOTIFICATION_CACHE_TTL_MS) return cached.preferences

  try {
    const [prefSnap, legacySnap] = await Promise.all([
      get(ref(db, `users/${userId}/settings/preferences`)),
      get(ref(db, `users/${userId}/settings`)),
    ])
    const preferences = prefSnap.exists() ? prefSnap.val() : legacySnap.exists() ? legacySnap.val() : null
    notificationPreferencesCache.set(userId, { preferences, fetchedAt: Date.now() })
    return preferences
  } catch {
    return null
  }
}

function hasEnabledChannel(config: any): boolean {
  if (!config || typeof config !== "object") return false
  return Boolean(config.email || config.push || config.sms)
}

function resolvePreferenceEventKey(
  sectionKey: string | null,
  type: NotificationType,
  action: NotificationAction,
  title: string,
  message: string,
  metadata?: Record<string, any>,
): string | null {
  const explicitKey = typeof metadata?.notificationPreferenceKey === "string" ? metadata.notificationPreferenceKey.trim() : ""
  if (explicitKey) return explicitKey

  const haystack = `${title} ${message} ${metadata?.section || ""}`.toLowerCase()
  switch (sectionKey) {
    case "hr":
      if (action === "created") return "newEmployee"
      if (action === "updated") return "employeeUpdate"
      if (haystack.includes("leave")) return "leaveRequest"
      if (haystack.includes("shift") || haystack.includes("rota")) return "shiftChange"
      if (haystack.includes("payroll")) return "payrollUpdate"
      return null
    case "stock":
      if (action === "low_stock") return "lowStock"
      if (haystack.includes("order") || haystack.includes("purchase") || haystack.includes("delivery")) return "orderReceived"
      if (action === "approved" || action === "rejected" || action === "reminder") return "stockAlert"
      return "stockUpdate"
    case "finance":
      if (haystack.includes("report")) return "financialReport"
      if (haystack.includes("due") || action === "overdue" || action === "reminder") return "paymentDue"
      if (haystack.includes("payment") || action === "completed" || action === "approved") return "paymentReceived"
      return "invoiceCreated"
    case "booking":
      if (action === "created") return "newBooking"
      if (action === "deleted" || action === "rejected") return "bookingCancelled"
      return "bookingUpdate"
    case "system":
      if (haystack.includes("security")) return "securityAlerts"
      if (haystack.includes("maintenance")) return "maintenance"
      return "systemNotifications"
    default:
      return type === "system" ? "systemNotifications" : null
  }
}

async function isNotificationEnabledForUser(
  userId: string,
  type: NotificationType,
  action: NotificationAction,
  title: string,
  message: string,
  metadata?: Record<string, any>,
): Promise<boolean> {
  const preferences = await getUserPreferences(userId)
  if (!preferences) return true

  if (preferences.notifications && !hasEnabledChannel(preferences.notifications)) return false

  const sectionKey = typeof metadata?.preferenceSection === "string"
    ? metadata.preferenceSection
    : SECTION_PREFERENCE_BY_TYPE[type] || null

  if (!sectionKey) return true

  const sectionPreferences = preferences.notificationPreferences?.[sectionKey]
  if (!sectionPreferences || typeof sectionPreferences !== "object") return true

  const eventKey = resolvePreferenceEventKey(sectionKey, type, action, title, message, metadata)
  if (!eventKey) {
    return Object.values(sectionPreferences).some((config) => hasEnabledChannel(config))
  }

  return sectionPreferences[eventKey] ? hasEnabledChannel(sectionPreferences[eventKey]) : true
}

async function resolveRecipientUserIds(
  companyId: string,
  actorUserId: string,
  type: NotificationType,
  action: NotificationAction,
  options?: {
    siteId?: string
    subsiteId?: string
    priority?: NotificationPriority
    category?: NotificationCategory
    details?: NotificationDetails
    metadata?: Record<string, any>
  }
): Promise<string[]> {
  const explicitRecipients = Array.isArray(options?.metadata?.recipientUserIds)
    ? options.metadata.recipientUserIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
    : []
  if (explicitRecipients.length > 0) return Array.from(new Set(explicitRecipients))

  if (DIRECT_NOTIFICATION_TYPES.has(type) || DIRECT_NOTIFICATION_ACTIONS.has(action) || options?.metadata?.audience === "self") {
    return [actorUserId]
  }

  const scopedUsers = await getScopedCompanyUsers(companyId, options?.siteId, options?.subsiteId)
  const recipientIds = scopedUsers
    .map((user) => user.uid)
    .filter((uid) => typeof uid === "string" && uid.trim().length > 0)

  return recipientIds.length > 0 ? Array.from(new Set(recipientIds)) : [actorUserId]
}

// Create a notification
export const createNotification = async (
  companyId: string,
  userId: string,
  type: NotificationType,
  action: NotificationAction,
  title: string,
  message: string,
  options?: {
    siteId?: string
    subsiteId?: string
    priority?: NotificationPriority
    category?: NotificationCategory
    details?: NotificationDetails
    metadata?: Record<string, any>
  }
): Promise<string> => {
  try {
    const basePath = getNotificationBasePath(companyId, options?.siteId, options?.subsiteId)
    const recipientUserIds = await resolveRecipientUserIds(companyId, userId, type, action, options)

    // Normalize before/after fields so CRUD notifications always have both.
    const normalizedDetails: NotificationDetails | undefined = options?.details
      ? {
          ...options.details,
          ...(options.details.oldValue === undefined ? { oldValue: null } : {}),
          ...(options.details.newValue === undefined ? { newValue: null } : {}),
        }
      : undefined

    const section =
      typeof options?.metadata?.section === "string" && options.metadata.section.trim()
        ? options.metadata.section
        : type

    const actorEmployeeId =
      typeof options?.metadata?.employeeId === "string" && options.metadata.employeeId.trim()
        ? options.metadata.employeeId.trim()
        : await getEmployeeIdForUser(companyId, userId)

    const safeDetails = normalizedDetails ? sanitizeForFirebase(normalizedDetails) : undefined
    let primaryNotificationId = ""

    for (const recipientUserId of recipientUserIds) {
      const isEnabled = await isNotificationEnabledForUser(
        recipientUserId,
        type,
        action,
        title,
        message,
        options?.metadata,
      )
      if (!isEnabled) continue

      const mergedMetadata: Record<string, any> = {
        uid: userId,
        actorUid: userId,
        recipientUid: recipientUserId,
        companyId,
        ...(options?.siteId ? { siteId: options.siteId } : {}),
        ...(options?.subsiteId ? { subsiteId: options.subsiteId } : {}),
        ...(actorEmployeeId ? { employeeId: actorEmployeeId } : {}),
        section,
        type,
        action,
        ...(options?.metadata || {}),
      }

      const safeMetadata = sanitizeForFirebase(mergedMetadata)
      const notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
        timestamp: Date.now(),
        userId: recipientUserId,
        companyId,
        type,
        action,
        title,
        message,
        read: false,
        priority: options?.priority || 'medium',
        category: options?.category || 'info',
        ...(options?.siteId && { siteId: options.siteId }),
        ...(options?.subsiteId && { subsiteId: options.subsiteId }),
        ...(safeDetails !== undefined && { details: safeDetails }),
        ...(safeMetadata !== undefined && { metadata: safeMetadata })
      }

      const createdNotificationId = await createNotificationInDb(basePath, notification)
      if (!primaryNotificationId || recipientUserId === userId) {
        primaryNotificationId = createdNotificationId
      }
    }

    return primaryNotificationId || "suppressed"
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

// Get notifications for a user
export const getNotifications = async (
  companyId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string,
  limit?: number
): Promise<Notification[]> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    return await fetchNotificationsFromDb(basePath, userId, limit)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    throw error
  }
}

// Get filtered notifications
export const getFilteredNotifications = async (
  companyId: string,
  userId: string,
  filter: NotificationFilter,
  siteId?: string,
  subsiteId?: string
): Promise<Notification[]> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    return await fetchFilteredNotificationsFromDb(basePath, {
      ...filter,
      userId,
    })
  } catch (error) {
    console.error("Error fetching filtered notifications:", error)
    throw error
  }
}

// Mark notification as read
export const markNotificationAsRead = async (
  companyId: string,
  notificationId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<void> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    await markNotificationAsReadInDb(basePath, notificationId, userId)
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

// Mark notification as read for specific user
export const markNotificationAsReadForUser = async (
  companyId: string,
  notificationId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<void> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    await markNotificationAsReadForUserInDb(basePath, notificationId, userId)
  } catch (error) {
    console.error("Error marking notification as read for user:", error)
    throw error
  }
}

// Get unread count for specific user
export const getUnreadCountForUser = async (
  companyId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<number> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    return await getUnreadCountForUserFromDb(basePath, userId)
  } catch (error) {
    console.error("Error getting unread count for user:", error)
    return 0
  }
}

// Get user notification history with read status
export const getUserNotificationHistory = async (
  companyId: string,
  userId: string,
  filter?: NotificationFilter,
  siteId?: string,
  subsiteId?: string
): Promise<Notification[]> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    return await getUserNotificationHistoryFromDb(basePath, userId, filter)
  } catch (error) {
    console.error("Error getting user notification history:", error)
    throw error
  }
}

// Mark all notifications as read
export const markAllNotificationsAsRead = async (
  companyId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<void> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    await markAllNotificationsAsReadInDb(basePath, userId)
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

// Delete notification
export const deleteNotification = async (
  companyId: string,
  notificationId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<void> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    await deleteNotificationFromDb(basePath, notificationId, userId)
  } catch (error) {
    console.error("Error deleting notification:", error)
    throw error
  }
}

// Delete all notifications for a user
export const deleteAllNotifications = async (
  companyId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<void> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    await deleteAllNotificationsFromDb(basePath, userId)
  } catch (error) {
    console.error("Error deleting all notifications:", error)
    throw error
  }
}

// Get notification settings
export const getNotificationSettings = async (
  companyId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<NotificationSettings | null> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    return await fetchNotificationSettingsFromDb(basePath, userId)
  } catch (error) {
    console.error("Error fetching notification settings:", error)
    throw error
  }
}

// Save notification settings
export const saveNotificationSettings = async (
  companyId: string,
  settings: NotificationSettings,
  siteId?: string,
  subsiteId?: string
): Promise<void> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    await saveNotificationSettingsToDb(basePath, settings)
  } catch (error) {
    console.error("Error saving notification settings:", error)
    throw error
  }
}

// Get unread notification count
export const getUnreadNotificationCount = async (
  companyId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<number> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    return await getUnreadNotificationCountFromDb(basePath, userId)
  } catch (error) {
    console.error("Error getting unread notification count:", error)
    throw error
  }
}

// Get notification statistics
export const getNotificationStats = async (
  companyId: string,
  userId: string,
  siteId?: string,
  subsiteId?: string
): Promise<NotificationStats> => {
  try {
    const notifications = await getNotifications(companyId, userId, siteId, subsiteId)
    
    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
      byCategory: {} as Record<NotificationCategory, number>
    }
    
    // Initialize counters
    const types: NotificationType[] = ['company', 'site', 'subsite', 'checklist', 'stock', 'finance', 'hr', 'booking', 'messenger', 'user', 'system']
    const priorities: NotificationPriority[] = ['low', 'medium', 'high', 'urgent']
    const categories: NotificationCategory[] = ['info', 'warning', 'error', 'success', 'alert']
    
    types.forEach(type => stats.byType[type] = 0)
    priorities.forEach(priority => stats.byPriority[priority] = 0)
    categories.forEach(category => stats.byCategory[category] = 0)
    
    // Count notifications
    notifications.forEach(notification => {
      stats.byType[notification.type]++
      stats.byPriority[notification.priority]++
      stats.byCategory[notification.category]++
    })
    
    return stats
  } catch (error) {
    console.error("Error getting notification stats:", error)
    throw error
  }
}

// Clean up old notifications
export const cleanupOldNotifications = async (
  companyId: string,
  daysOld: number = 30,
  siteId?: string,
  subsiteId?: string
): Promise<void> => {
  try {
    const basePath = getNotificationBasePath(companyId, siteId, subsiteId)
    await cleanupOldNotificationsFromDb(basePath, daysOld)
  } catch (error) {
    console.error("Error cleaning up old notifications:", error)
    throw error
  }
}

// Helper functions for creating specific types of notifications

export const createCompanyNotification = async (
  companyId: string,
  userId: string,
  action: NotificationAction,
  entityName: string,
  details?: NotificationDetails
): Promise<string> => {
  const actionMessages = {
    created: `Company "${entityName}" was created`,
    updated: `Company "${entityName}" was updated`,
    deleted: `Company "${entityName}" was deleted`,
    invited: `You were invited to join "${entityName}"`,
    joined: `User joined "${entityName}"`,
    left: `User left "${entityName}"`
  }
  
  return await createNotification(
    companyId,
    userId,
    'company',
    action,
    'Company Update',
    actionMessages[action as keyof typeof actionMessages] || `Company action: ${action}`,
    {
      category: action === 'deleted' ? 'warning' : 'info',
      details
    }
  )
}

export const createSiteNotification = async (
  companyId: string,
  siteId: string,
  userId: string,
  action: NotificationAction,
  entityName: string,
  details?: NotificationDetails
): Promise<string> => {
  const actionMessages = {
    created: `Site "${entityName}" was created`,
    updated: `Site "${entityName}" was updated`,
    deleted: `Site "${entityName}" was deleted`,
    assigned: `You were assigned to site "${entityName}"`
  }
  
  return await createNotification(
    companyId,
    userId,
    'site',
    action,
    'Site Update',
    actionMessages[action as keyof typeof actionMessages] || `Site action: ${action}`,
    {
      siteId,
      category: action === 'deleted' ? 'warning' : 'info',
      details
    }
  )
}

export const createChecklistNotification = async (
  companyId: string,
  userId: string,
  action: NotificationAction,
  checklistName: string,
  options?: {
    siteId?: string
    subsiteId?: string
    priority?: NotificationPriority
    details?: NotificationDetails
  }
): Promise<string> => {
  const actionMessages = {
    created: `Checklist "${checklistName}" was created`,
    updated: `Checklist "${checklistName}" was updated`,
    completed: `Checklist "${checklistName}" was completed`,
    assigned: `You were assigned checklist "${checklistName}"`,
    overdue: `Checklist "${checklistName}" is overdue`
  }
  
  return await createNotification(
    companyId,
    userId,
    'checklist',
    action,
    'Checklist Update',
    actionMessages[action as keyof typeof actionMessages] || `Checklist action: ${action}`,
    {
      siteId: options?.siteId,
      subsiteId: options?.subsiteId,
      priority: options?.priority || (action === 'overdue' ? 'high' : 'medium'),
      category: action === 'overdue' ? 'warning' : action === 'completed' ? 'success' : 'info',
      details: options?.details
    }
  )
}

export const createStockNotification = async (
  companyId: string,
  siteId: string,
  userId: string,
  action: NotificationAction,
  itemName: string,
  options?: {
    subsiteId?: string
    priority?: NotificationPriority
    details?: NotificationDetails
  }
): Promise<string> => {
  const actionMessages = {
    low_stock: `${itemName} is running low on stock`,
    created: `Stock item "${itemName}" was added`,
    updated: `Stock item "${itemName}" was updated`,
    deleted: `Stock item "${itemName}" was removed`
  }
  
  return await createNotification(
    companyId,
    userId,
    'stock',
    action,
    'Stock Update',
    actionMessages[action as keyof typeof actionMessages] || `Stock action: ${action}`,
    {
      siteId,
      subsiteId: options?.subsiteId,
      priority: options?.priority || (action === 'low_stock' ? 'high' : 'medium'),
      category: action === 'low_stock' ? 'warning' : 'info',
      details: options?.details
    }
  )
}
