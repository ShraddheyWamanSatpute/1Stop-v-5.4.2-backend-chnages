"use client"

import React, { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback, useMemo } from "react"
import type { 
  Chat, Message, Contact, ChatCategory, UserBasicDetails, ChatNotification,
  ChatSettings, DraftMessage, Attachment, ContactInvitation, UserStatus
} from "../interfaces/Messenger"
import { useCompany } from "./CompanyContext"
import { useSettings } from "./SettingsContext"
import { createNotification } from "../functions/Notifications"
import * as MessengerAPI from "../functions/Messenger"
import { performanceTimer } from "../utils/PerformanceTimer"
import { createCachedFetcher } from "../utils/CachedFetcher"
import { dataCache } from "../utils/DataCache"
import { debugLog, debugWarn } from "../utils/debugLog"

interface MessengerState {
  chats: Chat[]
  messages: { [chatId: string]: Message[] }
  contacts: Contact[]
  activeChat: Chat | null
  categories: ChatCategory[]
  users: UserBasicDetails[]
  userStatuses: { [userId: string]: UserStatus }
  contactInvitations: ContactInvitation[]
  notifications: ChatNotification[]
  chatSettings: { [chatId: string]: ChatSettings }
  drafts: { [chatId: string]: DraftMessage }
  searchResults: Message[]
  isLoading: boolean
  isSearching: boolean
  error: string | null
  basePath: string
}

type MessengerAction =
  | { type: "SET_CHATS"; payload: Chat[] }
  | { type: "ADD_CHAT"; payload: Chat }
  | { type: "UPDATE_CHAT"; payload: { chatId: string; updates: Partial<Chat> } }
  | { type: "DELETE_CHAT"; payload: string }
  | { type: "SET_MESSAGES"; payload: { chatId: string; messages: Message[] } }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_ACTIVE_CHAT"; payload: Chat | null }
  | { type: "SET_CONTACTS"; payload: Contact[] }
  | { type: "SET_CONTACT_INVITATIONS"; payload: ContactInvitation[] }
  | { type: "SET_CATEGORIES"; payload: ChatCategory[] }
  | { type: "SET_USERS"; payload: UserBasicDetails[] }
  | { type: "SET_USER_STATUS"; payload: { userId: string; status: UserStatus } }
  | { type: "SET_CHAT_SETTINGS"; payload: { chatId: string; settings: ChatSettings } }
  | { type: "SET_DRAFT"; payload: { chatId: string; draft: DraftMessage | null } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_BASE_PATH"; payload: string }

interface MessengerContextType {
  state: MessengerState
  dispatch: React.Dispatch<MessengerAction>
  // Permission functions
  canViewMessenger: () => boolean
  canEditMessenger: () => boolean
  canDeleteMessenger: () => boolean
  isOwner: () => boolean
  
  // Core Functions
  setActiveChat: (chatId: string | null) => void
  createChat: (name: string, participants: string[], type: Chat["type"], options?: Partial<Chat>) => Promise<string | null>
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<boolean>
  refreshChats: (forceRefresh?: boolean) => Promise<void>
  
  // Extended Functions (placeholder implementations)
  updateChatDetails: (chatId: string, updates: Partial<Chat>) => Promise<boolean>
  deleteChat: (chatId: string) => Promise<boolean>
  forwardMessage: (messageId: string, targetChatIds: string[]) => Promise<boolean>
  editMessage: (messageId: string, newText: string) => Promise<boolean>
  deleteMessage: (messageId: string) => Promise<boolean>
  pinMessage: (messageId: string) => Promise<boolean>
  unpinMessage: (messageId: string) => Promise<boolean>
  markAsRead: (messageId: string) => Promise<boolean>
  addReaction: (messageId: string, emoji: string) => Promise<boolean>
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>
  searchMessages: (query: string, chatId?: string) => Promise<Message[]>
  setUserStatus: (status: UserStatus["status"], customStatus?: string) => Promise<boolean>
  getWorkContacts: () => UserBasicDetails[]
  getSavedContacts: () => Contact[]
  sendContactInvitation: (toUserId: string, message?: string) => Promise<boolean>
  acceptContactInvitation: (invitationId: string) => Promise<boolean>
  declineContactInvitation: (invitationId: string) => Promise<boolean>
  removeContact: (contactId: string) => Promise<boolean>
  updateContact: (contactId: string, updates: Partial<Contact>) => Promise<boolean>
  createCategory: (name: string, options?: Partial<ChatCategory>) => Promise<string | null>
  updateCategory: (categoryId: string, updates: Partial<ChatCategory>) => Promise<boolean>
  deleteCategory: (categoryId: string) => Promise<boolean>
  updateChatSettings: (chatId: string, settings: Partial<ChatSettings>) => Promise<boolean>
  saveDraft: (chatId: string, text: string, attachments?: Attachment[]) => Promise<boolean>
  getDraft: (chatId: string) => Promise<DraftMessage | null>
  uploadAttachment: (file: File) => Promise<Attachment | null>
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined)

const initialState: MessengerState = {
  chats: [], messages: {}, contacts: [], activeChat: null, categories: [], users: [],
  userStatuses: {}, contactInvitations: [], notifications: [], chatSettings: {},
  drafts: {}, searchResults: [], isLoading: false, isSearching: false, error: null, basePath: ""
}

const messengerReducer = (state: MessengerState, action: MessengerAction): MessengerState => {
  switch (action.type) {
    case "SET_CHATS": return { ...state, chats: action.payload }
    case "ADD_CHAT": return { ...state, chats: [...state.chats, action.payload] }
    case "UPDATE_CHAT": return {
      ...state, chats: state.chats.map(chat => 
        chat.id === action.payload.chatId ? { ...chat, ...action.payload.updates } : chat)
    }
    case "DELETE_CHAT": return { ...state, chats: state.chats.filter(chat => chat.id !== action.payload) }
    case "SET_MESSAGES": return { ...state, messages: { ...state.messages, [action.payload.chatId]: action.payload.messages } }
    case "ADD_MESSAGE": return {
      ...state, messages: { ...state.messages, [action.payload.chatId]: [...(state.messages[action.payload.chatId] || []), action.payload] }
    }
    case "SET_ACTIVE_CHAT": return { ...state, activeChat: action.payload }
    case "SET_CONTACTS": return { ...state, contacts: action.payload }
    case "SET_CONTACT_INVITATIONS": return { ...state, contactInvitations: action.payload }
    case "SET_CATEGORIES": return { ...state, categories: action.payload }
    case "SET_USERS": return { ...state, users: action.payload }
    case "SET_USER_STATUS":
      return { ...state, userStatuses: { ...state.userStatuses, [action.payload.userId]: action.payload.status } }
    case "SET_CHAT_SETTINGS":
      return { ...state, chatSettings: { ...state.chatSettings, [action.payload.chatId]: action.payload.settings } }
    case "SET_DRAFT": {
      const nextDrafts = { ...state.drafts }
      if (action.payload.draft) {
        nextDrafts[action.payload.chatId] = action.payload.draft
      } else {
        delete nextDrafts[action.payload.chatId]
      }
      return { ...state, drafts: nextDrafts }
    }
    case "SET_LOADING": return { ...state, isLoading: action.payload }
    case "SET_ERROR": return { ...state, error: action.payload }
    case "SET_BASE_PATH": return { ...state, basePath: action.payload }
    default: return state
  }
}

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(messengerReducer, initialState)
  const { getBasePath, state: companyState, autoSelectSiteIfOnlyOne, isOwner, hasPermission, isFullyLoaded: companyFullyLoaded } = useCompany()
  const { state: settingsState } = useSettings()

  // Timer refs for performance tracking
  const messengerTimersRef = useRef<{
    basePath: string | null
    coreTimerId: string | null
    allTimerId: string | null
    coreLogged: boolean
    allLogged: boolean
    cacheLogged: boolean
  }>({ basePath: null, coreTimerId: null, allTimerId: null, coreLogged: false, allLogged: false, cacheLogged: false })

  // Prevent duplicate / concurrent loads (separate from UI isLoading which we may clear after cache hydrate)
  const isLoadingRef = useRef(false)

  // Create cached fetchers - wrap functions to work with basePath pattern
  const fetchChatsCached = useMemo(() => createCachedFetcher(
    async (_basePath: string) => MessengerAPI.fetchUserChats(), 
    'chats'
  ), [])
  const fetchContactsCached = useMemo(() => createCachedFetcher(
    async (_basePath: string) => MessengerAPI.fetchUserContacts(), 
    'contacts'
  ), [])
  const fetchCategoriesCached = useMemo(() => createCachedFetcher(
    async (_basePath: string) => {
      const companyId = companyState.companyID || localStorage.getItem("companyId") || ""
      return MessengerAPI.fetchCategories(companyId)
    }, 
    'categories'
  ), [companyState.companyID])
  const fetchUsersCached = useMemo(() => createCachedFetcher(
    async (_basePath: string) => {
      const companyId = companyState.companyID || localStorage.getItem("companyId") || ""
      return MessengerAPI.fetchCompanyUsers(companyId)
    }, 
    'users'
  ), [companyState.companyID])

  useEffect(() => {
    // If messenger data level is site/subsite and no site selected, try to auto-select one
    const messengerLevel = companyState.dataManagement?.messenger
    if ((messengerLevel === "site" || messengerLevel === "subsite") && !companyState.selectedSiteID) {
      // Fire and forget; basePath will recompute on selection change
      autoSelectSiteIfOnlyOne().catch(() => {})
    }

    let newBasePath = getBasePath("messenger")
    
    dispatch({ type: "SET_BASE_PATH", payload: newBasePath })
    // Ensure functions layer (which reads localStorage) has the active companyId
    if (companyState.companyID) {
      try {
        localStorage.setItem("companyId", companyState.companyID)
        if (companyState.selectedSiteID) localStorage.setItem("siteId", companyState.selectedSiteID)
        if (companyState.selectedSubsiteID) localStorage.setItem("subsiteId", companyState.selectedSubsiteID)
      } catch (_) {
        // no-op for environments without localStorage
      }
    }
  }, [getBasePath, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, companyState.dataManagement?.messenger, autoSelectSiteIfOnlyOne])

  // IMPORTANT: define refreshAll BEFORE any useEffect dependency arrays that reference it.
  // Otherwise we hit "Cannot access 'refreshAll' before initialization" (TDZ) during render.
  const refreshAll = useCallback(async (forceRefresh: boolean = false) => {
    if (!state.basePath) return
    if (!companyFullyLoaded) return // Wait for Company core

    // Prevent concurrent loads (e.g. listener fires during initial refresh)
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    
    // Persist companyId so functions/Messenger.tsx resolves correct basePath
    if (companyState.companyID) {
      try { localStorage.setItem("companyId", companyState.companyID) } catch (_) {}
    }

    // Reset timers when switching scope
    if (messengerTimersRef.current.basePath !== state.basePath) {
      messengerTimersRef.current = {
        basePath: state.basePath,
        coreTimerId: performanceTimer.start("MessengerContext", "coreLoad"),
        allTimerId: performanceTimer.start("MessengerContext", "allLoad"),
        coreLogged: false,
        allLogged: false,
        cacheLogged: false,
      }
    } else {
      if (!messengerTimersRef.current.coreTimerId) messengerTimersRef.current.coreTimerId = performanceTimer.start("MessengerContext", "coreLoad")
      if (!messengerTimersRef.current.allTimerId) messengerTimersRef.current.allTimerId = performanceTimer.start("MessengerContext", "allLoad")
    }

    debugLog("⏳ MessengerContext: Starting load", { basePath: state.basePath })

    dispatch({ type: "SET_LOADING", payload: true })
    
    try {
      // FAST UI: hydrate from cache immediately if available
      try {
        const [chatsCached, contactsCached, categoriesCached, usersCached] = await Promise.all([
          dataCache.peek<Chat[]>(`${state.basePath}/chats`),
          dataCache.peek<Contact[]>(`${state.basePath}/contacts`),
          dataCache.peek<ChatCategory[]>(`${state.basePath}/categories`),
          dataCache.peek<UserBasicDetails[]>(`${state.basePath}/users`),
        ])

        if (chatsCached || contactsCached || categoriesCached || usersCached) {
          const payload: any = {}
          if (chatsCached !== null) payload.chats = chatsCached || []
          if (contactsCached !== null) payload.contacts = contactsCached || []
          if (categoriesCached !== null) payload.categories = categoriesCached || []
          if (usersCached !== null) payload.users = usersCached || []

          if (Object.keys(payload).length > 0) {
            if (payload.chats) dispatch({ type: "SET_CHATS", payload: payload.chats })
            if (payload.contacts) dispatch({ type: "SET_CONTACTS", payload: payload.contacts })
            if (payload.categories) dispatch({ type: "SET_CATEGORIES", payload: payload.categories })
            if (payload.users) dispatch({ type: "SET_USERS", payload: payload.users })
          }
          
          if (!messengerTimersRef.current.cacheLogged) {
            messengerTimersRef.current.cacheLogged = true
            debugLog("✅ MessengerContext: Cache hydrated")
          }
          // Set loading to false immediately after cache hydration for instant UI
          dispatch({ type: "SET_LOADING", payload: false })
        }
      } catch {
        // ignore
      }

      // PROGRESSIVE LOADING: Critical data first (chats for immediate UI)
      // IMPORTANT: allow force refresh so post-create/delete shows up immediately.
      const chats = await fetchChatsCached(state.basePath, forceRefresh).catch(() => MessengerAPI.fetchUserChats())
      
      // Persist to cache
      try { dataCache.set(`${state.basePath}/chats`, chats || []) } catch {}
      
      // Update critical data immediately
      dispatch({ type: "SET_CHATS", payload: chats || [] })

      // Core loaded timing (chats)
      if (!messengerTimersRef.current.coreLogged && messengerTimersRef.current.coreTimerId) {
        const chatsLoaded = chats !== undefined
        
        if (chatsLoaded) {
          messengerTimersRef.current.coreLogged = true
          const duration = performanceTimer.end(messengerTimersRef.current.coreTimerId, {
            chats: (chats || []).length || state.chats.length,
          })
          debugLog(`✅ MessengerContext: Core loaded (${duration.toFixed(2)}ms)`)
        }
      }

      // Load management page data (needed by all messenger pages)
      // These are required for contacts, categories, users
      const [contacts, categories, users, invitations] = await Promise.all([
        fetchContactsCached(state.basePath, forceRefresh).catch(() => MessengerAPI.fetchUserContacts()).catch(() => []),
        fetchCategoriesCached(state.basePath, forceRefresh).catch(() => {
          const companyId = companyState.companyID || localStorage.getItem("companyId") || ""
          return MessengerAPI.fetchCategories(companyId)
        }).catch(() => []),
        fetchUsersCached(state.basePath, forceRefresh).catch(() => {
          const companyId = companyState.companyID || localStorage.getItem("companyId") || ""
          return MessengerAPI.fetchCompanyUsers(companyId)
        }).catch(() => []),
        MessengerAPI.fetchContactInvitations().catch(() => []),
      ])

      const chatSettingsEntries = await Promise.all(
        (chats || []).map(async (chat) => {
          const settings = await MessengerAPI.fetchChatSettings(chat.id).catch(() => null)
          return [chat.id, settings] as const
        }),
      )
      const chatSettings = chatSettingsEntries.reduce<Record<string, ChatSettings>>((acc, [chatId, settings]) => {
        if (settings) {
          acc[chatId] = settings
        }
        return acc
      }, {})

      // Persist to cache
      try { dataCache.set(`${state.basePath}/contacts`, contacts || []) } catch {}
      try { dataCache.set(`${state.basePath}/categories`, categories || []) } catch {}
      try { dataCache.set(`${state.basePath}/users`, users || []) } catch {}
      try { dataCache.set(`${state.basePath}/contactInvitations`, invitations || []) } catch {}
      try { dataCache.set(`${state.basePath}/chatSettings`, chatSettings || {}) } catch {}

      // Update management data
      if (contacts !== undefined) dispatch({ type: "SET_CONTACTS", payload: contacts || [] })
      if (categories !== undefined) dispatch({ type: "SET_CATEGORIES", payload: categories || [] })
      if (users !== undefined) dispatch({ type: "SET_USERS", payload: users || [] })
      if (invitations !== undefined) dispatch({ type: "SET_CONTACT_INVITATIONS", payload: invitations || [] })
      Object.entries(chatSettings).forEach(([chatId, settings]) => {
        dispatch({ type: "SET_CHAT_SETTINGS", payload: { chatId, settings } })
      })

      // All data loaded timing - fires when core + management data is complete
      if (!messengerTimersRef.current.allLogged && messengerTimersRef.current.allTimerId && messengerTimersRef.current.coreLogged) {
        const allDataLoaded = (chats !== undefined) && (contacts !== undefined) && 
                              (categories !== undefined) && (users !== undefined)
        
        if (allDataLoaded) {
          messengerTimersRef.current.allLogged = true
          const duration = performanceTimer.end(messengerTimersRef.current.allTimerId, {
            chats: (chats || []).length || state.chats.length,
            contacts: (contacts || []).length,
            categories: (categories || []).length,
            users: (users || []).length,
            invitations: (invitations || []).length,
          })
          debugLog(`✅ MessengerContext: All data loaded (${duration.toFixed(2)}ms)`)
        }
      }
    } catch (error) {
      debugWarn("Error loading messenger data:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to load messenger data" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
      isLoadingRef.current = false
    }
  }, [
    state.basePath,
    companyFullyLoaded,
    companyState.companyID,
    fetchChatsCached,
    fetchContactsCached,
    fetchCategoriesCached,
    fetchUsersCached,
    state.chats,
  ])

  // Auto-load chats when base path is set and Company core is loaded
  const [lastRefreshKey, setLastRefreshKey] = useState<string>("")
  
  useEffect(() => {
    // Wait for Company core to be loaded before starting Messenger
    if (!companyFullyLoaded) return
    
    const refreshKey = `${state.basePath}-${settingsState.auth?.uid}`
    
    if (state.basePath && settingsState.auth?.uid && !state.isLoading && refreshKey !== lastRefreshKey) {
      setLastRefreshKey(refreshKey)
      refreshAll()
    }
  }, [state.basePath, settingsState.auth?.uid, state.isLoading, lastRefreshKey, companyFullyLoaded, refreshAll])

  // Real-time: refresh chats when user's chat index or chats collection changes
  useEffect(() => {
    if (!state.basePath || !settingsState.auth?.uid) return
    const unsubscribe = MessengerAPI.listenToChatList(() => {
      // Lightweight refresh to keep list current
      if (!isLoadingRef.current) refreshAll()
    })
    return () => {
      try { unsubscribe && unsubscribe() } catch {}
    }
    // basePath/auth changes re-subscribe
  }, [state.basePath, settingsState.auth?.uid, refreshAll])

  const refreshChats = async (forceRefresh?: boolean) => {
    await refreshAll(Boolean(forceRefresh))
  }

  const setActiveChat = (chatId: string | null) => {
    const chat = chatId ? state.chats.find(c => c.id === chatId) || null : null
    dispatch({ type: "SET_ACTIVE_CHAT", payload: chat })
  }

  const createChat = async (name: string, participants: string[], type: Chat["type"], options?: Partial<Chat>): Promise<string | null> => {
    try {
      // For company chats, force the name to the selected company name
      const effectiveName = type === "company" && (companyState.companyName || name)
        ? (companyState.companyName || name)
        : name
      const createdId = await MessengerAPI.createChat(
        effectiveName,
        participants,
        type,
        {
          companyId: companyState.companyID || undefined,
          siteId: companyState.selectedSiteID || undefined,
          createdBy: settingsState.auth.uid || undefined,
          isPrivate: false,
          isArchived: false,
          ...(options || {}),
        }
      )
      if (createdId) {
        // Add notification
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'created',
            'Chat Created',
            `Chat "${effectiveName}" was created`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'success',
              details: {
                entityId: createdId,
                entityName: effectiveName,
                newValue: { id: createdId, name: effectiveName, type, participants },
                changes: {
                  chat: { from: {}, to: { id: createdId, name: effectiveName, type, participants } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
        
        // Refresh to include the new chat in state (force to bypass cached chat list)
        await refreshChats(true)
      }
      return createdId
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to create chat" })
      return null
    }
  }

  const sendMessage = async (text: string, attachments?: Attachment[]): Promise<boolean> => {
    if (!state.activeChat) return false
    try {
      const messageId = await MessengerAPI.sendMessage(
        state.activeChat.id,
        text,
        undefined,
        undefined,
        attachments
      )
      if (messageId) {
        // Add notification (only for important messages or if configured)
        // Note: We don't notify for every message to avoid spam, but we track it
        try {
          // Only create notification if message is important or has attachments
          if (attachments && attachments.length > 0) {
            await createNotification(
              companyState.companyID,
              settingsState.auth?.uid || 'system',
              'messenger',
              'created',
              'Message Sent',
              `Message with ${attachments.length} attachment(s) sent in "${state.activeChat.name || 'chat'}"`,
              {
                siteId: companyState.selectedSiteID || undefined,
                subsiteId: companyState.selectedSubsiteID || undefined,
                priority: 'low',
                category: 'info',
                details: {
                  entityId: messageId,
                  entityName: `Message in ${state.activeChat.name || 'chat'}`,
                  newValue: { id: messageId, text, attachments },
                  changes: {
                    message: { from: {}, to: { id: messageId, text, attachments } }
                  }
                }
              }
            )
          }
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
        
        // Optionally fetch latest messages or optimistically update
        return true
      }
      return false
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to send message" })
      return false
    }
  }

  // Extended functions with notifications
  const updateChatDetails = async (chatId: string, updates: Partial<Chat>): Promise<boolean> => {
    try {
      const originalChat = state.chats.find(c => c.id === chatId)
      const result = await MessengerAPI.updateChatDetails(chatId, updates)
      
      // Add notification
      if (result && originalChat) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'updated',
            'Chat Updated',
            `Chat "${updates.name || originalChat.name || 'Chat'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: chatId,
                entityName: updates.name || originalChat.name || 'Chat',
                oldValue: originalChat,
                newValue: { ...originalChat, ...updates },
                changes: {
                  chat: { from: originalChat, to: { ...originalChat, ...updates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      if (result) {
        // Force refresh so list reflects changes immediately.
        await refreshChats(true)
      }
      return result
    } catch (error) {
      debugWarn("Error updating chat details:", error)
      return false
    }
  }
  
  const deleteChat = async (chatId: string): Promise<boolean> => {
    try {
      const chatToDelete = state.chats.find(c => c.id === chatId)
      const result = await MessengerAPI.deleteChat(chatId)
      
      // Add notification
      if (result && chatToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'deleted',
            'Chat Deleted',
            `Chat "${chatToDelete.name || 'Chat'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: chatId,
                entityName: chatToDelete.name || 'Chat',
                oldValue: chatToDelete,
                changes: {
                  chat: { from: chatToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      if (result) {
        // Force refresh so list reflects deletion immediately.
        await refreshChats(true)
      }
      return result
    } catch (error) {
      debugWarn("Error deleting chat:", error)
      return false
    }
  }
  
  const forwardMessage = async (messageId: string, targetChatIds: string[]) => {
    if (!state.activeChat) return false
    try {
      const sourceMessage = state.messages[state.activeChat.id]?.find((message) => message.id === messageId)
      if (!sourceMessage) return false

      const originalSenderName = `${sourceMessage.firstName || ""} ${sourceMessage.lastName || ""}`.trim() || "Unknown"
      const forwardedFrom = {
        chatId: state.activeChat.id,
        chatName: state.activeChat.name,
        originalSenderId: sourceMessage.senderId,
        originalSenderName,
      }

      const results = await Promise.all(
        targetChatIds.map((targetChatId) =>
          MessengerAPI.sendMessage(
            targetChatId,
            sourceMessage.text,
            undefined,
            undefined,
            sourceMessage.attachments,
            sourceMessage.mentions,
            forwardedFrom,
          ),
        ),
      )

      return results.every(Boolean)
    } catch (error) {
      debugWarn("Error forwarding message:", error)
      return false
    }
  }
  
  const editMessage = async (messageId: string, newText: string): Promise<boolean> => {
    if (!state.activeChat) return false
    try {
      const originalMessage = state.messages[state.activeChat.id]?.find(m => m.id === messageId)
      const result = await MessengerAPI.editMessage(state.activeChat.id, messageId, newText)
      
      // Add notification
      if (result && originalMessage) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'updated',
            'Message Edited',
            `Message was edited in "${state.activeChat.name || 'chat'}"`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'low',
              category: 'info',
              details: {
                entityId: messageId,
                entityName: `Message in ${state.activeChat.name || 'chat'}`,
                oldValue: originalMessage,
                newValue: { ...originalMessage, text: newText },
                changes: {
                  message: { from: originalMessage, to: { ...originalMessage, text: newText } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      return result
    } catch (error) {
      debugWarn("Error editing message:", error)
      return false
    }
  }
  
  const deleteMessage = async (messageId: string): Promise<boolean> => {
    if (!state.activeChat) return false
    try {
      const messageToDelete = state.messages[state.activeChat.id]?.find(m => m.id === messageId)
      const result = await MessengerAPI.deleteMessage(state.activeChat.id, messageId)
      
      // Add notification
      if (result && messageToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'deleted',
            'Message Deleted',
            `Message was deleted from "${state.activeChat.name || 'chat'}"`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'low',
              category: 'warning',
              details: {
                entityId: messageId,
                entityName: `Message in ${state.activeChat.name || 'chat'}`,
                oldValue: messageToDelete,
                changes: {
                  message: { from: messageToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      return result
    } catch (error) {
      debugWarn("Error deleting message:", error)
      return false
    }
  }
  const pinMessage = async (messageId: string) => {
    if (!state.activeChat) return false
    try {
      return await MessengerAPI.pinMessage(state.activeChat.id, messageId)
    } catch (error) {
      debugWarn("Error pinning message:", error)
      return false
    }
  }
  const unpinMessage = async (messageId: string) => {
    if (!state.activeChat) return false
    try {
      return await MessengerAPI.unpinMessage(state.activeChat.id, messageId)
    } catch (error) {
      debugWarn("Error unpinning message:", error)
      return false
    }
  }
  const markAsRead = async (messageId: string) => {
    if (!state.activeChat) return false
    try {
      return await MessengerAPI.markAsRead(state.activeChat.id, messageId)
    } catch (error) {
      debugWarn("Error marking message as read:", error)
      return false
    }
  }
  const addReaction = async (messageId: string, emoji: string) => {
    if (!state.activeChat) return false
    try {
      return await MessengerAPI.addReaction(state.activeChat.id, messageId, emoji)
    } catch (error) {
      debugWarn("Error adding reaction:", error)
      return false
    }
  }
  const removeReaction = async (messageId: string, emoji: string) => {
    if (!state.activeChat) return false
    try {
      return await MessengerAPI.removeReaction(state.activeChat.id, messageId, emoji)
    } catch (error) {
      debugWarn("Error removing reaction:", error)
      return false
    }
  }
  const searchMessages = async (query: string, chatId?: string) => {
    try {
      return await MessengerAPI.searchMessages(query, chatId)
    } catch (error) {
      debugWarn("Error searching messages:", error)
      return []
    }
  }
  const setUserStatus = async (status: UserStatus["status"], customStatus?: string) => {
    try {
      const result = await MessengerAPI.setUserStatus(status, customStatus)
      if (result && settingsState.auth?.uid) {
        dispatch({
          type: "SET_USER_STATUS",
          payload: {
            userId: settingsState.auth.uid,
            status: {
              uid: settingsState.auth.uid,
              status,
              customStatus,
              lastActive: new Date().toISOString(),
            },
          },
        })
      }
      return result
    } catch (error) {
      debugWarn("Error updating user status:", error)
      return false
    }
  }
  const getWorkContacts = () => state.users.filter(u => u.companyIds.includes(companyState.companyID || "") && u.uid !== settingsState.auth.uid)
  const getSavedContacts = () => state.contacts.filter(c => c.type === "saved")
  const sendContactInvitation = async (toUserId: string, message?: string) => {
    try {
      const result = await MessengerAPI.sendContactInvitation(toUserId, message)
      if (result) {
        const invitations = await MessengerAPI.fetchContactInvitations().catch(() => state.contactInvitations)
        dispatch({ type: "SET_CONTACT_INVITATIONS", payload: invitations || [] })
      }
      return result
    } catch (error) {
      debugWarn("Error sending contact invitation:", error)
      return false
    }
  }
  const acceptContactInvitation = async (invitationId: string) => {
    try {
      const result = await MessengerAPI.acceptContactInvitation(invitationId)
      if (result) {
        await refreshChats(true)
      }
      return result
    } catch (error) {
      debugWarn("Error accepting contact invitation:", error)
      return false
    }
  }
  const declineContactInvitation = async (invitationId: string) => {
    try {
      const result = await MessengerAPI.declineContactInvitation(invitationId)
      if (result) {
        const invitations = await MessengerAPI.fetchContactInvitations().catch(() => state.contactInvitations)
        dispatch({ type: "SET_CONTACT_INVITATIONS", payload: invitations || [] })
      }
      return result
    } catch (error) {
      debugWarn("Error declining contact invitation:", error)
      return false
    }
  }
  const removeContact = async (contactId: string): Promise<boolean> => {
    try {
      const contactToDelete = state.contacts.find(c => c.id === contactId)
      const result = await MessengerAPI.removeContact(contactId)
      
      // Add notification
      if (result && contactToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'deleted',
            'Contact Removed',
            `Contact was removed`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: contactId,
                entityName: 'Contact',
                oldValue: contactToDelete,
                changes: {
                  contact: { from: contactToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      return result
    } catch (error) {
      debugWarn("Error removing contact:", error)
      return false
    }
  }
  
  const updateContact = async (contactId: string, updates: Partial<Contact>): Promise<boolean> => {
    try {
      const originalContact = state.contacts.find(c => c.id === contactId)
      const result = await MessengerAPI.updateContact(contactId, updates)
      
      // Add notification
      if (result && originalContact) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'updated',
            'Contact Updated',
            `Contact was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: contactId,
                entityName: 'Contact',
                oldValue: originalContact,
                newValue: { ...originalContact, ...updates },
                changes: {
                  contact: { from: originalContact, to: { ...originalContact, ...updates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      return result
    } catch (error) {
      debugWarn("Error updating contact:", error)
      return false
    }
  }
  const createCategory = async (name: string, options?: Partial<ChatCategory>): Promise<string | null> => {
    try {
      const categoryId = await MessengerAPI.createCategory(name, options)
      
      // Add notification
      if (categoryId) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'created',
            'Category Created',
            `Category "${name}" was created`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'success',
              details: {
                entityId: categoryId,
                entityName: name,
                newValue: { id: categoryId, name, ...options },
                changes: {
                  category: { from: {}, to: { id: categoryId, name, ...options } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      return categoryId
    } catch (error) {
      debugWarn("Error creating category:", error)
      return null
    }
  }
  
  const updateCategory = async (categoryId: string, updates: Partial<ChatCategory>): Promise<boolean> => {
    try {
      const originalCategory = state.categories.find(c => c.id === categoryId)
      const result = await MessengerAPI.updateCategoryDetails(categoryId, updates)
      
      // Add notification
      if (result && originalCategory) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'updated',
            'Category Updated',
            `Category "${updates.name || originalCategory.name || 'Category'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: categoryId,
                entityName: updates.name || originalCategory.name || 'Category',
                oldValue: originalCategory,
                newValue: { ...originalCategory, ...updates },
                changes: {
                  category: { from: originalCategory, to: { ...originalCategory, ...updates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      return result
    } catch (error) {
      debugWarn("Error updating category:", error)
      return false
    }
  }
  
  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    try {
      const categoryToDelete = state.categories.find(c => c.id === categoryId)
      const result = await MessengerAPI.deleteCategory(categoryId)
      
      // Add notification
      if (result && categoryToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'messenger',
            'deleted',
            'Category Deleted',
            `Category "${categoryToDelete.name || 'Category'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: categoryId,
                entityName: categoryToDelete.name || 'Category',
                oldValue: categoryToDelete,
                changes: {
                  category: { from: categoryToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      return result
    } catch (error) {
      debugWarn("Error deleting category:", error)
      return false
    }
  }
  const updateChatSettings = async (chatId: string, settings: Partial<ChatSettings>) => {
    try {
      const result = await MessengerAPI.updateChatSettings(chatId, settings)
      if (result && settingsState.auth?.uid) {
        const existing = state.chatSettings?.[chatId]
        dispatch({
          type: "SET_CHAT_SETTINGS",
          payload: {
            chatId,
            settings: {
              userId: settingsState.auth.uid,
              chatId,
              isMuted: false,
              isStarred: false,
              isPinned: false,
              notificationLevel: "all",
              ...(existing || {}),
              ...(settings || {}),
            },
          },
        })
      }
      return result
    } catch (error) {
      debugWarn("Error updating chat settings:", error)
      return false
    }
  }
  const saveDraft = async (chatId: string, text: string, attachments?: Attachment[]) => {
    try {
      const result = await MessengerAPI.saveDraft(chatId, text, attachments)
      if (result && settingsState.auth?.uid) {
        dispatch({
          type: "SET_DRAFT",
          payload: {
            chatId,
            draft: {
              chatId,
              userId: settingsState.auth.uid,
              text,
              attachments,
              lastUpdated: new Date().toISOString(),
            },
          },
        })
      }
      return result
    } catch (error) {
      debugWarn("Error saving draft:", error)
      return false
    }
  }
  const getDraft = async (chatId: string) => {
    try {
      const draft = await MessengerAPI.getDraft(chatId)
      dispatch({ type: "SET_DRAFT", payload: { chatId, draft } })
      return draft
    } catch (error) {
      debugWarn("Error loading draft:", error)
      return null
    }
  }
  const uploadAttachment = async (file: File) => {
    if (!state.activeChat) return null
    try {
      return await MessengerAPI.uploadAttachment(file, state.activeChat.id)
    } catch (error) {
      debugWarn("Error uploading attachment:", error)
      return null
    }
  }

  // Prefetch and listen to messages of the active chat
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    const activeId = state.activeChat?.id
    if (activeId) {
      try {
        // Prefetch recent messages so the window is populated immediately
        MessengerAPI.fetchMessages(activeId, 50)
          .then((msgs) => dispatch({ type: "SET_MESSAGES", payload: { chatId: activeId, messages: msgs } }))
          .catch(() => {})
        unsubscribe = MessengerAPI.listenToMessages(activeId, (msgs) => {
          dispatch({ type: "SET_MESSAGES", payload: { chatId: activeId, messages: msgs } })
        })
      } catch (e) {
        debugWarn("Failed to subscribe to messages", e)
      }
    }
    return () => {
      try { if (unsubscribe) unsubscribe() } catch {}
    }
  }, [state.activeChat?.id])

  const contextValue: MessengerContextType = {
    state, dispatch, setActiveChat, createChat, sendMessage, refreshChats,
    updateChatDetails, deleteChat, forwardMessage, editMessage, deleteMessage,
    pinMessage, unpinMessage, markAsRead, addReaction, removeReaction, searchMessages,
    setUserStatus, getWorkContacts, getSavedContacts, sendContactInvitation,
    acceptContactInvitation, declineContactInvitation, removeContact, updateContact,
    createCategory, updateCategory, deleteCategory, updateChatSettings, saveDraft, getDraft, uploadAttachment,
    // Permission functions - Owner has full access
    canViewMessenger: () => isOwner() || hasPermission("messenger", "chat", "view"),
    canEditMessenger: () => isOwner() || hasPermission("messenger", "chat", "edit"),
    canDeleteMessenger: () => isOwner() || hasPermission("messenger", "chat", "delete"),
    isOwner: () => isOwner()
  }

  return <MessengerContext.Provider value={contextValue}>{children}</MessengerContext.Provider>
}

export const useMessenger = (): MessengerContextType => {
  const context = useContext(MessengerContext)
  if (!context) {
    // Return a safe default context instead of throwing error
    // Only warn in development mode to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      debugWarn("useMessenger called outside MessengerProvider - returning empty context")
    }
    
    const emptyState: MessengerState = {
      chats: [],
      messages: {},
      contacts: [],
      activeChat: null,
      categories: [],
      users: [],
      userStatuses: {},
      contactInvitations: [],
      notifications: [],
      chatSettings: {},
      drafts: {},
      searchResults: [],
      isLoading: false,
      isSearching: false,
      error: null,
      basePath: "",
    }
    
    const emptyContext: MessengerContextType = {
      state: emptyState,
      dispatch: () => {},
      canViewMessenger: () => false,
      canEditMessenger: () => false,
      canDeleteMessenger: () => false,
      isOwner: () => false,
      setActiveChat: () => {},
      createChat: async () => null,
      sendMessage: async () => false,
      refreshChats: async () => {},
      updateChatDetails: async () => false,
      deleteChat: async () => false,
      forwardMessage: async () => false,
      editMessage: async () => false,
      deleteMessage: async () => false,
      pinMessage: async () => false,
      unpinMessage: async () => false,
      markAsRead: async () => false,
      addReaction: async () => false,
      removeReaction: async () => false,
      searchMessages: async () => [],
      setUserStatus: async () => false,
      getWorkContacts: () => [],
      getSavedContacts: () => [],
      sendContactInvitation: async () => false,
      acceptContactInvitation: async () => false,
      declineContactInvitation: async () => false,
      removeContact: async () => false,
      updateContact: async () => false,
      createCategory: async () => null,
      updateCategory: async () => false,
      deleteCategory: async () => false,
      updateChatSettings: async () => false,
      saveDraft: async () => false,
      getDraft: async () => null,
      uploadAttachment: async () => null,
    }
    
    return emptyContext
  }
  return context
}

// Export types for frontend consumption
export type { 
  Chat, 
  Message, 
  Contact, 
  ChatCategory, 
  UserBasicDetails, 
  ChatNotification,
  ChatSettings, 
  DraftMessage, 
  Attachment, 
  ContactInvitation, 
  UserStatus
} from "../interfaces/Messenger"
