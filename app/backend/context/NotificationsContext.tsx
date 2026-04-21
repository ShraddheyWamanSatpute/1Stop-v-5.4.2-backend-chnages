import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react"
import {
  Notification,
  NotificationFilter,
  NotificationSettings,
  NotificationStats,
  NotificationType,
  NotificationAction,
  NotificationPriority,
  NotificationCategory,
  NotificationDetails
} from "../interfaces/Notifications"
import {
  createNotification,
  getNotifications,
  getFilteredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  getUnreadNotificationCount,
  getNotificationStats,
  cleanupOldNotifications,
  createCompanyNotification,
  createSiteNotification,
  createChecklistNotification,
  createStockNotification
} from "../functions/Notifications"
import { debugWarn } from "../utils/debugLog"
import { useSettings } from "./SettingsContext"
import { useCompany } from "./CompanyContext"
import { dataCache } from "../utils/DataCache"

// State interface
interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  stats: NotificationStats | null
  settings: NotificationSettings | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  basePath: string
}

// Action types
type NotificationsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "UPDATE_NOTIFICATION"; payload: { id: string; updates: Partial<Notification> } }
  | { type: "REMOVE_NOTIFICATION"; payload: string }
  | { type: "SET_UNREAD_COUNT"; payload: number }
  | { type: "SET_STATS"; payload: NotificationStats }
  | { type: "SET_SETTINGS"; payload: NotificationSettings }
  | { type: "SET_LAST_FETCHED"; payload: number }
  | { type: "SET_BASE_PATH"; payload: string }
  | { type: "CLEAR_ALL" }

// Context interface
interface NotificationsContextType {
  state: NotificationsState
  
  // Permission functions
  canViewNotifications: () => boolean
  canEditNotifications: () => boolean
  canDeleteNotifications: () => boolean
  isOwner: () => boolean
  
  // Core notification functions
  createNotification: (
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
  ) => Promise<string>
  
  // Fetch functions
  refreshNotifications: (limit?: number) => Promise<void>
  getFilteredNotifications: (filter: NotificationFilter) => Promise<Notification[]>
  
  // Read/unread functions
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  
  // Delete functions
  deleteNotification: (notificationId: string) => Promise<void>
  deleteAllNotifications: () => Promise<void>
  
  // Settings functions
  getSettings: () => Promise<NotificationSettings | null>
  updateSettings: (settings: NotificationSettings) => Promise<void>
  
  // Stats functions
  refreshStats: () => Promise<void>
  refreshUnreadCount: () => Promise<void>
  
  // Cleanup functions
  cleanupOldNotifications: (daysOld?: number) => Promise<void>
  
  // Helper functions for specific notification types
  notifyCompanyChange: (action: NotificationAction, entityName: string, details?: NotificationDetails) => Promise<string>
  notifySiteChange: (siteId: string, action: NotificationAction, entityName: string, details?: NotificationDetails) => Promise<string>
  notifyChecklistChange: (action: NotificationAction, checklistName: string, options?: {
    siteId?: string
    subsiteId?: string
    priority?: NotificationPriority
    details?: NotificationDetails
  }) => Promise<string>
  notifyStockChange: (siteId: string, action: NotificationAction, itemName: string, options?: {
    subsiteId?: string
    priority?: NotificationPriority
    details?: NotificationDetails
  }) => Promise<string>
}

// Initial state
const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  stats: null,
  settings: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  basePath: ""
}

// Reducer
const notificationsReducer = (state: NotificationsState, action: NotificationsAction): NotificationsState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false }
    
    case "SET_NOTIFICATIONS":
      return { 
        ...state, 
        notifications: action.payload, 
        isLoading: false, 
        error: null 
      }
    
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + (action.payload.read ? 0 : 1)
      }
    
    case "UPDATE_NOTIFICATION":
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === action.payload.id
          ? { ...notification, ...action.payload.updates }
          : notification
      )
      
      // Recalculate unread count if read status changed
      const unreadCount = action.payload.updates.read !== undefined
        ? updatedNotifications.filter(n => !n.read).length
        : state.unreadCount
      
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount
      }
    
    case "REMOVE_NOTIFICATION":
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload)
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.read).length
      }
    
    case "SET_UNREAD_COUNT":
      return { ...state, unreadCount: action.payload }
    
    case "SET_STATS":
      return { ...state, stats: action.payload }
    
    case "SET_SETTINGS":
      return { ...state, settings: action.payload }
    
    case "SET_LAST_FETCHED":
      return { ...state, lastFetched: action.payload }
    
    case "SET_BASE_PATH":
      return { ...state, basePath: action.payload }
    
    case "CLEAR_ALL":
      return initialState
    
    default:
      return state
  }
}

// Create context
const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

// Provider component
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationsReducer, initialState)
  // SettingsProvider wraps LazyProviders in main.tsx, so useSettings() should always be available
  const { state: settingsState } = useSettings()
  const { state: companyState, getBasePath, isOwner, hasPermission } = useCompany()

  // Update base path when company context changes
  useEffect(() => {
    let basePath = getBasePath()
    
    
    dispatch({ type: "SET_BASE_PATH", payload: basePath })
  }, [getBasePath, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Auto-refresh notifications when user or company changes
  useEffect(() => {
    if (settingsState.auth.uid && companyState.companyID) {
      refreshNotifications()
      refreshUnreadCount()
    }
  }, [settingsState.auth.uid, companyState.companyID])

  // Auto-refresh unread count every 30 seconds
  useEffect(() => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    const interval = setInterval(() => {
      refreshUnreadCount()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [settingsState.auth.uid, companyState.companyID])

  const getScopeKey = useCallback(() => (
    `${companyState.companyID}/${settingsState.auth.uid}/${companyState.selectedSiteID || "all"}/${companyState.selectedSubsiteID || "all"}`
  ), [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth.uid])

  const syncNotificationCaches = useCallback((notifications: Notification[], limit?: number): void => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    try {
      const scopeKey = getScopeKey()
      const unreadCount = notifications.filter((notification) => !notification.read).length

      dataCache.set(`notifications/${scopeKey}/list/all`, notifications || [])
      if (typeof limit === "number") {
        dataCache.set(`notifications/${scopeKey}/list/${String(limit)}`, (notifications || []).slice(0, limit))
      }
      dataCache.set(`notifications/${scopeKey}/unreadCount`, unreadCount)
    } catch {
      // ignore cache errors
    }
  }, [companyState.companyID, getScopeKey, settingsState.auth.uid])

  const syncUnreadCache = useCallback((count: number): void => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    try {
      dataCache.set(`notifications/${getScopeKey()}/unreadCount`, count)
    } catch {
      // ignore cache errors
    }
  }, [companyState.companyID, getScopeKey, settingsState.auth.uid])

  // Core notification functions
  const createNotificationFn = useCallback(async (
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
    if (!settingsState.auth.uid || !companyState.companyID) {
      throw new Error("User not authenticated or company not selected")
    }

    try {
      const notificationId = await createNotification(
        companyState.companyID,
        settingsState.auth.uid,
        type,
        action,
        title,
        message,
        options
      )
      
      // Refresh notifications to show the new one
      await refreshNotifications()
      return notificationId
    } catch (error) {
      debugWarn("Error creating notification:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID])

  // Fetch functions
  const refreshNotifications = useCallback(async (limit?: number): Promise<void> => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    try {
      // Cache key includes scope + limit to avoid mixing different result sizes.
      const scopeKey = getScopeKey()
      const listCacheKey = `notifications/${scopeKey}/list/${typeof limit === "number" ? String(limit) : "all"}`
      const unreadCacheKey = `notifications/${scopeKey}/unreadCount`

      // FAST UI: hydrate from cache immediately if available.
      let hadCache = false
      try {
        const cached = await dataCache.peek<Notification[]>(listCacheKey)
        if (cached !== null) {
          hadCache = true
          dispatch({ type: "SET_NOTIFICATIONS", payload: cached })
          dispatch({ type: "SET_LAST_FETCHED", payload: Date.now() })
          // Best-effort keep unreadCount in sync without extra network call.
          dispatch({ type: "SET_UNREAD_COUNT", payload: cached.filter((n) => !n.read).length })
        } else {
          const cachedUnread = await dataCache.peek<number>(unreadCacheKey)
          if (typeof cachedUnread === "number") {
            dispatch({ type: "SET_UNREAD_COUNT", payload: cachedUnread })
          }
        }
      } catch {
        // ignore cache errors
      }

      // Only show loading spinner if we don't have cached data to render.
      if (!hadCache) {
        dispatch({ type: "SET_LOADING", payload: true })
      }
      
      const notifications = await getNotifications(
        companyState.companyID,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined,
        limit
      )
      
      dispatch({ type: "SET_NOTIFICATIONS", payload: notifications })
      dispatch({ type: "SET_LAST_FETCHED", payload: Date.now() })

      syncNotificationCaches(notifications, limit)
    } catch (error) {
      debugWarn("Error refreshing notifications:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to load notifications" })
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, getScopeKey, syncNotificationCaches])

  const getFilteredNotificationsFn = useCallback(async (filter: NotificationFilter): Promise<Notification[]> => {
    if (!companyState.companyID || !settingsState.auth.uid) return []

    try {
      return await getFilteredNotifications(
        companyState.companyID,
        settingsState.auth.uid,
        filter,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
    } catch (error) {
      debugWarn("Error getting filtered notifications:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Read/unread functions
  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    if (!companyState.companyID || !settingsState.auth.uid) return

    try {
      await markNotificationAsRead(
        companyState.companyID,
        notificationId,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true, updatedAt: Date.now() }
          : notification
      )

      dispatch({
        type: "UPDATE_NOTIFICATION",
        payload: { id: notificationId, updates: { read: true, updatedAt: Date.now() } }
      })
      syncNotificationCaches(updatedNotifications)
    } catch (error) {
      debugWarn("Error marking notification as read:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, state.notifications, syncNotificationCaches])

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    try {
      await markAllNotificationsAsRead(
        companyState.companyID,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      // Update all notifications to read
      const updatedNotifications = state.notifications.map(n => ({ ...n, read: true, updatedAt: Date.now() }))
      dispatch({ type: "SET_NOTIFICATIONS", payload: updatedNotifications })
      dispatch({ type: "SET_UNREAD_COUNT", payload: 0 })
      syncNotificationCaches(updatedNotifications)
    } catch (error) {
      debugWarn("Error marking all notifications as read:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, state.notifications, syncNotificationCaches])

  // Delete functions
  const deleteNotificationFn = useCallback(async (notificationId: string): Promise<void> => {
    if (!companyState.companyID || !settingsState.auth.uid) return

    try {
      await deleteNotification(
        companyState.companyID,
        notificationId,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      dispatch({ type: "REMOVE_NOTIFICATION", payload: notificationId })
      syncNotificationCaches(state.notifications.filter((notification) => notification.id !== notificationId))
    } catch (error) {
      debugWarn("Error deleting notification:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, state.notifications, syncNotificationCaches])

  const deleteAllNotificationsFn = useCallback(async (): Promise<void> => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    try {
      await deleteAllNotifications(
        companyState.companyID,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      dispatch({ type: "SET_NOTIFICATIONS", payload: [] })
      dispatch({ type: "SET_UNREAD_COUNT", payload: 0 })
      syncNotificationCaches([])
    } catch (error) {
      debugWarn("Error deleting all notifications:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, syncNotificationCaches])

  // Settings functions
  const getSettingsFn = useCallback(async (): Promise<NotificationSettings | null> => {
    if (!settingsState.auth.uid || !companyState.companyID) return null

    try {
      const settings = await getNotificationSettings(
        companyState.companyID,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      if (settings) {
        dispatch({ type: "SET_SETTINGS", payload: settings })
      }
      
      return settings
    } catch (error) {
      debugWarn("Error getting notification settings:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const updateSettings = useCallback(async (settings: NotificationSettings): Promise<void> => {
    if (!companyState.companyID) return

    try {
      await saveNotificationSettings(
        companyState.companyID,
        settings,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      dispatch({ type: "SET_SETTINGS", payload: settings })
    } catch (error) {
      debugWarn("Error updating notification settings:", error)
      throw error
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Stats functions
  const refreshStats = useCallback(async (): Promise<void> => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    try {
      const stats = await getNotificationStats(
        companyState.companyID,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      dispatch({ type: "SET_STATS", payload: stats })
    } catch (error) {
      debugWarn("Error refreshing notification stats:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    if (!settingsState.auth.uid || !companyState.companyID) return

    try {
      const scopeKey = getScopeKey()
      const unreadCacheKey = `notifications/${scopeKey}/unreadCount`
      // Cache-first hydrate
      try {
        const cachedUnread = await dataCache.peek<number>(unreadCacheKey)
        if (typeof cachedUnread === "number") {
          dispatch({ type: "SET_UNREAD_COUNT", payload: cachedUnread })
        }
      } catch {
        // ignore
      }

      const count = await getUnreadNotificationCount(
        companyState.companyID,
        settingsState.auth.uid,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      dispatch({ type: "SET_UNREAD_COUNT", payload: count })
      syncUnreadCache(count)
    } catch (error) {
      debugWarn("Error refreshing unread count:", error)
    }
  }, [settingsState.auth.uid, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, getScopeKey, syncUnreadCache])

  // Cleanup functions
  const cleanupOldNotificationsFn = useCallback(async (daysOld: number = 30): Promise<void> => {
    if (!companyState.companyID) return

    try {
      await cleanupOldNotifications(
        companyState.companyID,
        daysOld,
        companyState.selectedSiteID || undefined,
        companyState.selectedSubsiteID || undefined
      )
      
      // Refresh notifications after cleanup
      await refreshNotifications()
    } catch (error) {
      debugWarn("Error cleaning up old notifications:", error)
      throw error
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, refreshNotifications])

  // Helper functions for specific notification types
  const notifyCompanyChange = useCallback(async (
    action: NotificationAction,
    entityName: string,
    details?: NotificationDetails
  ): Promise<string> => {
    if (!settingsState.auth.uid || !companyState.companyID) {
      throw new Error("User not authenticated or company not selected")
    }

    try {
      const notificationId = await createCompanyNotification(
        companyState.companyID,
        settingsState.auth.uid,
        action,
        entityName,
        details
      )
      
      await refreshNotifications()
      return notificationId
    } catch (error) {
      debugWarn("Error creating company notification:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, refreshNotifications])

  const notifySiteChange = useCallback(async (
    siteId: string,
    action: NotificationAction,
    entityName: string,
    details?: NotificationDetails
  ): Promise<string> => {
    if (!settingsState.auth.uid || !companyState.companyID) {
      throw new Error("User not authenticated or company not selected")
    }

    try {
      const notificationId = await createSiteNotification(
        companyState.companyID,
        siteId,
        settingsState.auth.uid,
        action,
        entityName,
        details
      )
      
      await refreshNotifications()
      return notificationId
    } catch (error) {
      debugWarn("Error creating site notification:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, refreshNotifications])

  const notifyChecklistChange = useCallback(async (
    action: NotificationAction,
    checklistName: string,
    options?: {
      siteId?: string
      subsiteId?: string
      priority?: NotificationPriority
      details?: NotificationDetails
    }
  ): Promise<string> => {
    if (!settingsState.auth.uid || !companyState.companyID) {
      throw new Error("User not authenticated or company not selected")
    }

    try {
      const notificationId = await createChecklistNotification(
        companyState.companyID,
        settingsState.auth.uid,
        action,
        checklistName,
        options
      )
      
      await refreshNotifications()
      return notificationId
    } catch (error) {
      debugWarn("Error creating checklist notification:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, refreshNotifications])

  const notifyStockChange = useCallback(async (
    siteId: string,
    action: NotificationAction,
    itemName: string,
    options?: {
      subsiteId?: string
      priority?: NotificationPriority
      details?: NotificationDetails
    }
  ): Promise<string> => {
    if (!settingsState.auth.uid || !companyState.companyID) {
      throw new Error("User not authenticated or company not selected")
    }

    try {
      const notificationId = await createStockNotification(
        companyState.companyID,
        siteId,
        settingsState.auth.uid,
        action,
        itemName,
        options
      )
      
      await refreshNotifications()
      return notificationId
    } catch (error) {
      debugWarn("Error creating stock notification:", error)
      throw error
    }
  }, [settingsState.auth.uid, companyState.companyID, refreshNotifications])

  const contextValue: NotificationsContextType = {
    state,
    createNotification: createNotificationFn,
    refreshNotifications,
    getFilteredNotifications: getFilteredNotificationsFn,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationFn,
    deleteAllNotifications: deleteAllNotificationsFn,
    getSettings: getSettingsFn,
    updateSettings,
    refreshStats,
    refreshUnreadCount,
    cleanupOldNotifications: cleanupOldNotificationsFn,
    notifyCompanyChange,
    notifySiteChange,
    notifyChecklistChange,
    notifyStockChange,
    // Permission functions - Owner has full access
    canViewNotifications: () => isOwner() || hasPermission("notifications", "alerts", "view"),
    canEditNotifications: () => isOwner() || hasPermission("notifications", "alerts", "edit"),
    canDeleteNotifications: () => isOwner() || hasPermission("notifications", "alerts", "delete"),
    isOwner: () => isOwner()
  }

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  )
}

// Hook to use notifications context
export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}

// Export types for frontend consumption
export type { 
  Notification, 
  NotificationFilter, 
  NotificationSettings, 
  NotificationStats, 
  NotificationType, 
  NotificationAction, 
  NotificationPriority, 
  NotificationCategory, 
  NotificationDetails
} from "../interfaces/Notifications"
