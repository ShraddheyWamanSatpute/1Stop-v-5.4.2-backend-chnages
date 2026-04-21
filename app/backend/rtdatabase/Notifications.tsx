import { ref, push, get, set, update, remove, query, orderByChild, equalTo, limitToLast } from "firebase/database"
import { db } from "../services/Firebase"
import { Notification, NotificationFilter, NotificationSettings } from "../interfaces/Notifications"

const stripUndefinedDeep = <T,>(value: T, seen = new WeakSet<object>()): T => {
  if (value === undefined) return undefined as any
  if (value === null) return value
  if (typeof value !== "object") return value

  const obj = value as any
  if (seen.has(obj)) return value
  seen.add(obj)

  if (Array.isArray(obj)) {
    const cleaned = obj
      .map((v) => stripUndefinedDeep(v, seen))
      .filter((v) => v !== undefined)
    return cleaned as any
  }

  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    const cleaned = stripUndefinedDeep(v as any, seen)
    if (cleaned !== undefined) out[k] = cleaned
  }
  return out as any
}

const getUserNotificationsQuery = (basePath: string, userId: string, limit?: number) => {
  const baseQuery = query(ref(db, `${basePath}/notifications`), orderByChild("userId"), equalTo(userId))
  return typeof limit === "number" ? query(baseQuery, limitToLast(limit)) : baseQuery
}

const getUserNotificationsEntries = async (
  basePath: string,
  userId: string,
  limit?: number,
): Promise<Array<[string, any]>> => {
  try {
    const snapshot = await get(getUserNotificationsQuery(basePath, userId, limit))

    if (!snapshot.exists()) {
      return []
    }

    return Object.entries(snapshot.val() || {}) as Array<[string, any]>
  } catch (error: any) {
    // If rules are missing the required `.indexOn: "userId"` for this path,
    // the RTDB will throw "Index not defined..." and break the whole app.
    // Fallback: fetch all notifications and filter in-memory.
    const msg = String(error?.message || error || "")
    const isMissingIndex = msg.toLowerCase().includes("index not defined") && msg.includes("userId")
    if (!isMissingIndex) {
      throw error
    }

    const allSnap = await get(ref(db, `${basePath}/notifications`))
    if (!allSnap.exists()) return []

    const allEntries = Object.entries(allSnap.val() || {}) as Array<[string, any]>
    const filtered = allEntries.filter(([, n]) => (n as any)?.userId === userId)

    if (typeof limit === "number") {
      // Maintain same semantics as limitToLast() by sorting by timestamp.
      filtered.sort((a, b) => Number((a[1] as any)?.timestamp || 0) - Number((b[1] as any)?.timestamp || 0))
      return filtered.slice(Math.max(0, filtered.length - limit))
    }

    return filtered
  }
}

// Create a new notification
export const createNotificationInDb = async (basePath: string, notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const notificationsRef = ref(db, `${basePath}/notifications`)
    const newNotificationRef = push(notificationsRef)
    
    const notificationData: Notification = {
      ...notification,
      id: newNotificationRef.key!,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    await set(newNotificationRef, stripUndefinedDeep(notificationData))
    return newNotificationRef.key!
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

// Get all notifications for a user
export const fetchNotificationsFromDb = async (basePath: string, userId: string, limit?: number): Promise<Notification[]> => {
  try {
    const entries = await getUserNotificationsEntries(basePath, userId, limit)

    return entries
      .map(([, notification]) => notification as Notification)
      .sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    throw error
  }
}

// Get notifications with filters
export const fetchFilteredNotificationsFromDb = async (basePath: string, filter: NotificationFilter): Promise<Notification[]> => {
  try {
    const notificationsRef = ref(db, `${basePath}/notifications`)
    const snapshot = await get(notificationsRef)
    
    if (!snapshot.exists()) {
      return []
    }
    
    const notificationsData = snapshot.val()
    let notifications: Notification[] = Object.values(notificationsData)
    
    // Apply filters
    if (filter.userId) {
      notifications = notifications.filter(n => n.userId === filter.userId)
    }
    
    if (filter.companyId) {
      notifications = notifications.filter(n => n.companyId === filter.companyId)
    }
    
    if (filter.siteId) {
      notifications = notifications.filter(n => n.siteId === filter.siteId)
    }
    
    if (filter.subsiteId) {
      notifications = notifications.filter(n => n.subsiteId === filter.subsiteId)
    }
    
    if (filter.type && filter.type.length > 0) {
      notifications = notifications.filter(n => filter.type!.includes(n.type))
    }
    
    if (filter.action && filter.action.length > 0) {
      notifications = notifications.filter(n => filter.action!.includes(n.action))
    }
    
    if (filter.priority && filter.priority.length > 0) {
      notifications = notifications.filter(n => filter.priority!.includes(n.priority))
    }
    
    if (filter.category && filter.category.length > 0) {
      notifications = notifications.filter(n => filter.category!.includes(n.category))
    }
    
    if (filter.read !== undefined) {
      notifications = notifications.filter(n => n.read === filter.read)
    }
    
    if (filter.dateFrom) {
      notifications = notifications.filter(n => n.timestamp >= filter.dateFrom!)
    }
    
    if (filter.dateTo) {
      notifications = notifications.filter(n => n.timestamp <= filter.dateTo!)
    }
    
    return notifications.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error fetching filtered notifications:", error)
    throw error
  }
}

const assertNotificationOwnership = async (basePath: string, notificationId: string, userId?: string): Promise<void> => {
  if (!userId) return

  const notificationRef = ref(db, `${basePath}/notifications/${notificationId}`)
  const snapshot = await get(notificationRef)
  if (!snapshot.exists()) {
    throw new Error("Notification not found")
  }

  const notification = snapshot.val() as Notification
  if (notification.userId !== userId) {
    throw new Error("Notification does not belong to the current user")
  }
}

// Mark notification as read
export const markNotificationAsReadInDb = async (basePath: string, notificationId: string, userId?: string): Promise<void> => {
  try {
    await assertNotificationOwnership(basePath, notificationId, userId)
    const notificationRef = ref(db, `${basePath}/notifications/${notificationId}`)
    await update(notificationRef, {
      read: true,
      updatedAt: Date.now()
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

// Mark all notifications as read for a user
export const markAllNotificationsAsReadInDb = async (basePath: string, userId: string): Promise<void> => {
  try {
    const notificationsRef = ref(db, `${basePath}/notifications`)
    const notificationsEntries = await getUserNotificationsEntries(basePath, userId)
    const updates: Record<string, any> = {}
    
    notificationsEntries.forEach(([id, notification]) => {
      if (!notification.read) {
        updates[`${id}/read`] = true
        updates[`${id}/updatedAt`] = Date.now()
      }
    })
    
    if (Object.keys(updates).length > 0) {
      await update(notificationsRef, updates)
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

// Delete notification
export const deleteNotificationFromDb = async (basePath: string, notificationId: string, userId?: string): Promise<void> => {
  try {
    await assertNotificationOwnership(basePath, notificationId, userId)
    const notificationRef = ref(db, `${basePath}/notifications/${notificationId}`)
    await remove(notificationRef)
  } catch (error) {
    console.error("Error deleting notification:", error)
    throw error
  }
}

// Delete all notifications for a user
export const deleteAllNotificationsFromDb = async (basePath: string, userId: string): Promise<void> => {
  try {
    const notificationsRef = ref(db, `${basePath}/notifications`)
    const notificationsEntries = await getUserNotificationsEntries(basePath, userId)
    const updates: Record<string, any> = {}
    
    notificationsEntries.forEach(([id]) => {
      updates[id] = null
    })
    
    if (Object.keys(updates).length > 0) {
      await update(notificationsRef, updates)
    }
  } catch (error) {
    console.error("Error deleting all notifications:", error)
    throw error
  }
}

// Get notification settings for a user
export const fetchNotificationSettingsFromDb = async (basePath: string, userId: string): Promise<NotificationSettings | null> => {
  try {
    const settingsRef = ref(db, `${basePath}/notificationSettings/${userId}`)
    const snapshot = await get(settingsRef)
    
    if (snapshot.exists()) {
      return snapshot.val()
    }
    return null
  } catch (error) {
    console.error("Error fetching notification settings:", error)
    throw error
  }
}

// Save notification settings for a user
export const saveNotificationSettingsToDb = async (basePath: string, settings: NotificationSettings): Promise<void> => {
  try {
    const settingsRef = ref(db, `${basePath}/notificationSettings/${settings.userId}`)
    await set(settingsRef, settings)
  } catch (error) {
    console.error("Error saving notification settings:", error)
    throw error
  }
}

// Mark notification as read for specific user
export const markNotificationAsReadForUserInDb = async (basePath: string, notificationId: string, userId: string): Promise<void> => {
  try {
    const readByRef = ref(db, `${basePath}/notifications/${notificationId}/readBy/${userId}`)
    await set(readByRef, {
      readAt: Date.now(),
      seen: true
    })
  } catch (error) {
    console.error("Error marking notification as read for user:", error)
    throw error
  }
}

// Get unread count for specific user
export const getUnreadCountForUserFromDb = async (basePath: string, userId: string): Promise<number> => {
  try {
    const entries = await getUserNotificationsEntries(basePath, userId)

    return entries.reduce((count, [, notification]) => (notification.read ? count : count + 1), 0)
  } catch (error) {
    console.error("Error getting unread count for user:", error)
    throw error
  }
}

// Get user notification history with read status
export const getUserNotificationHistoryFromDb = async (basePath: string, userId: string, filter?: any): Promise<any[]> => {
  try {
    const entries = await getUserNotificationsEntries(basePath, userId)
    let notifications = entries.map(([id, data]) => ({
      id,
      ...data,
      isReadByUser: Boolean(data.read),
      readAtByUser: data.read ? data.updatedAt ?? data.timestamp ?? null : null,
    }))

    if (filter) {
      if (filter.read !== undefined) {
        notifications = notifications.filter((notification) => notification.isReadByUser === filter.read)
      }
      if (filter.type && filter.type.length > 0) {
        notifications = notifications.filter((notification) => filter.type.includes(notification.type))
      }
      if (filter.dateFrom) {
        notifications = notifications.filter((notification) => notification.timestamp >= filter.dateFrom)
      }
      if (filter.dateTo) {
        notifications = notifications.filter((notification) => notification.timestamp <= filter.dateTo)
      }
    }

    notifications.sort((a, b) => b.timestamp - a.timestamp)

    return notifications
  } catch (error) {
    console.error("Error getting user notification history:", error)
    throw error
  }
}

// Get unread notification count for a user (legacy function)
export const getUnreadNotificationCountFromDb = async (basePath: string, userId: string): Promise<number> => {
  return await getUnreadCountForUserFromDb(basePath, userId)
}

// Clean up old notifications (older than specified days)
export const cleanupOldNotificationsFromDb = async (basePath: string, daysOld: number = 30): Promise<void> => {
  try {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
    const notificationsRef = ref(db, `${basePath}/notifications`)
    const snapshot = await get(notificationsRef)
    
    if (snapshot.exists()) {
      const notificationsData = snapshot.val()
      const updates: Record<string, any> = {}
      
      Object.entries(notificationsData).forEach(([id, notification]: [string, any]) => {
        if (notification.timestamp < cutoffTime) {
          updates[id] = null
        }
      })
      
      if (Object.keys(updates).length > 0) {
        await update(notificationsRef, updates)
      }
    }
  } catch (error) {
    console.error("Error cleaning up old notifications:", error)
    throw error
  }
}
