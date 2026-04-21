import * as firebaseProvider from "../../rtdatabase/Notifications"
import type { Notification, NotificationFilter, NotificationSettings } from "../../interfaces/Notifications"
import { authedDataFetch } from "./http"

export * from "../../rtdatabase/Notifications"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

export const createNotificationInDb: typeof firebaseProvider.createNotificationInDb = async (basePath: string, notification) => {
  const result = await authedDataFetch(`/notifications/notifications`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: notification }),
  })
  return String(result?.id || "")
}

export const fetchNotificationsFromDb: typeof firebaseProvider.fetchNotificationsFromDb = async (
  basePath: string,
  userId: string,
  limit?: number,
) => {
  const result = await authedDataFetch(`/notifications/notifications${query({ basePath, userId, limit })}`, {
    method: "GET",
  })
  return (result?.rows || []) as Notification[]
}

export const fetchFilteredNotificationsFromDb: typeof firebaseProvider.fetchFilteredNotificationsFromDb = async (
  basePath: string,
  filter: NotificationFilter,
) => {
  const result = await authedDataFetch(`/notifications/notifications/filter`, {
    method: "POST",
    body: JSON.stringify({ basePath, filter }),
  })
  return (result?.rows || []) as Notification[]
}

export const markNotificationAsReadInDb: typeof firebaseProvider.markNotificationAsReadInDb = async (
  basePath: string,
  notificationId: string,
  userId?: string,
) => {
  await authedDataFetch(`/notifications/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, userId }),
  })
}

export const markAllNotificationsAsReadInDb: typeof firebaseProvider.markAllNotificationsAsReadInDb = async (
  basePath: string,
  userId: string,
) => {
  await authedDataFetch(`/notifications/notifications/readAll`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, userId }),
  })
}

export const deleteNotificationFromDb: typeof firebaseProvider.deleteNotificationFromDb = async (
  basePath: string,
  notificationId: string,
  userId?: string,
) => {
  await authedDataFetch(`/notifications/notifications/${encodeURIComponent(notificationId)}${query({ basePath, userId })}`, {
    method: "DELETE",
  })
}

export const deleteAllNotificationsFromDb: typeof firebaseProvider.deleteAllNotificationsFromDb = async (
  basePath: string,
  userId: string,
) => {
  await authedDataFetch(`/notifications/notifications${query({ basePath, userId })}`, {
    method: "DELETE",
  })
}

export const fetchNotificationSettingsFromDb: typeof firebaseProvider.fetchNotificationSettingsFromDb = async (
  basePath: string,
  userId: string,
) => {
  const result = await authedDataFetch(`/notifications/settings${query({ basePath, userId })}`, {
    method: "GET",
  })
  return (result?.row || null) as NotificationSettings | null
}

export const saveNotificationSettingsToDb: typeof firebaseProvider.saveNotificationSettingsToDb = async (
  basePath: string,
  settings: NotificationSettings,
) => {
  await authedDataFetch(`/notifications/settings`, {
    method: "PUT",
    body: JSON.stringify({ basePath, settings }),
  })
}

export const markNotificationAsReadForUserInDb: typeof firebaseProvider.markNotificationAsReadForUserInDb = async (
  basePath: string,
  notificationId: string,
  userId: string,
) => {
  await authedDataFetch(
    `/notifications/notifications/${encodeURIComponent(notificationId)}/readBy/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ basePath }),
    },
  )
}

export const getUnreadCountForUserFromDb: typeof firebaseProvider.getUnreadCountForUserFromDb = async (
  basePath: string,
  userId: string,
) => {
  const result = await authedDataFetch(`/notifications/unreadCount${query({ basePath, userId })}`, {
    method: "GET",
  })
  return Number(result?.count || 0)
}

export const getUserNotificationHistoryFromDb: typeof firebaseProvider.getUserNotificationHistoryFromDb = async (
  basePath: string,
  userId: string,
  filter?: any,
) => {
  const result = await authedDataFetch(`/notifications/history`, {
    method: "POST",
    body: JSON.stringify({ basePath, userId, filter }),
  })
  return (result?.rows || []) as any[]
}

export const getUnreadNotificationCountFromDb: typeof firebaseProvider.getUnreadNotificationCountFromDb = async (
  basePath: string,
  userId: string,
) => getUnreadCountForUserFromDb(basePath, userId)

export const cleanupOldNotificationsFromDb: typeof firebaseProvider.cleanupOldNotificationsFromDb = async (
  basePath: string,
  daysOld = 30,
) => {
  await authedDataFetch(`/notifications/cleanup`, {
    method: "POST",
    body: JSON.stringify({ basePath, daysOld }),
  })
}
