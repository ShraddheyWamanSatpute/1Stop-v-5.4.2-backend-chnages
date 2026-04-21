import type React from "react"

export interface Chat {
  id: string
  name: string
  type: "direct" | "group" | "company" | "site" | "department" | "role"
  participants: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  companyId: string
  siteId?: string
  departmentId?: string
  roleId?: string
  categoryId?: string
  description?: string
  avatar?: string
  isPrivate: boolean
  isArchived: boolean
  lastMessage?: {
    id: string
    text: string
    timestamp: string
    senderId: string
    senderName: string
  }
  pinnedMessages?: string[]
  settings?: {
    allowFileSharing: boolean
    allowMentions: boolean
    muteNotifications: boolean
  }
}

export interface Message {
  id: string
  chatId: string
  text: string
  timestamp: string
  date: string
  time: string
  uid: string
  senderId: string
  firstName: string
  lastName: string
  status: "sending" | "sent" | "delivered" | "read" | "failed"
  readBy: string[]
  attachments?: Attachment[]
  mentions?: string[]
  reactions?: Record<string, string[]>
  replyTo?: {
    id: string
    text: string
  }
  forwardedFrom?: {
    chatId: string
    chatName: string
    originalSenderId: string
    originalSenderName: string
  }
  isEdited?: boolean
  editHistory?: Array<{
    text: string
    timestamp: string
  }>
  isDeleted?: boolean
  isPinned?: boolean
  threadId?: string
}

export interface Attachment {
  id: string
  type: "image" | "video" | "audio" | "document" | "file"
  url: string
  name: string
  size: number
  mimeType: string
  metadata: Record<string, any>
}

export interface ChatCategory {
  id: string
  name: string
  companyId: string
  description?: string
  color?: string
  icon?: string
  order: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface UserStatus {
  uid: string
  status: "online" | "away" | "busy" | "offline"
  lastActive: string
  customStatus?: string
}

export interface UserBasicDetails {
  uid: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  companyIds: string[]
  departmentIds?: string[]
  roleIds?: string[]
  isActive: boolean
}

export interface Contact {
  id: string
  userId: string
  contactUserId: string
  type: "work" | "saved"
  status: "pending" | "accepted" | "blocked"
  nickname?: string
  notes?: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface ContactInvitation {
  id: string
  fromUserId: string
  toUserId: string
  message?: string
  status: "pending" | "accepted" | "declined"
  sentAt: string
  respondedAt?: string
}

export interface ChatNotification {
  id: string
  userId: string
  chatId: string
  messageId: string
  type: "message" | "mention" | "reaction"
  isRead: boolean
  timestamp: string
  senderName: string
  messagePreview: string
}

export interface ChatSettings {
  userId: string
  chatId: string
  isMuted: boolean
  isStarred: boolean
  isPinned: boolean
  isArchived?: boolean
  lastReadMessageId?: string
  notificationLevel: "all" | "mentions" | "none"
  customRingtone?: string
}

export interface DraftMessage {
  chatId: string
  userId: string
  text: string
  attachments?: Attachment[]
  lastUpdated: string
}

export interface MessengerState {
  chats: Chat[]
  activeChat: Chat | null
  messages: Message[]
  categories: ChatCategory[]
  userStatuses: Record<string, UserStatus>
  users: UserBasicDetails[]
  contacts: Contact[]
  contactInvitations: ContactInvitation[]
  notifications: ChatNotification[]
  chatSettings: Record<string, ChatSettings>
  drafts: Record<string, DraftMessage>
  loading: boolean
  error: string | null
  searchResults: Message[]
  isSearching: boolean
}

export type MessengerAction =
  | { type: "SET_CHATS"; payload: Chat[] }
  | { type: "ADD_CHAT"; payload: Chat }
  | { type: "UPDATE_CHAT"; payload: { chatId: string; updates: Partial<Chat> } }
  | { type: "REMOVE_CHAT"; payload: string }
  | { type: "SET_ACTIVE_CHAT"; payload: Chat | null }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGE"; payload: { messageId: string; updates: Partial<Message> } }
  | { type: "REMOVE_MESSAGE"; payload: string }
  | { type: "SET_CATEGORIES"; payload: ChatCategory[] }
  | { type: "ADD_CATEGORY"; payload: ChatCategory }
  | { type: "UPDATE_CATEGORY"; payload: { categoryId: string; updates: Partial<ChatCategory> } }
  | { type: "REMOVE_CATEGORY"; payload: string }
  | { type: "SET_USER_STATUS"; payload: { userId: string; status: UserStatus } }
  | { type: "SET_USERS"; payload: UserBasicDetails[] }
  | { type: "SET_CONTACTS"; payload: Contact[] }
  | { type: "ADD_CONTACT"; payload: Contact }
  | { type: "UPDATE_CONTACT"; payload: { contactId: string; updates: Partial<Contact> } }
  | { type: "REMOVE_CONTACT"; payload: string }
  | { type: "SET_CONTACT_INVITATIONS"; payload: ContactInvitation[] }
  | { type: "ADD_CONTACT_INVITATION"; payload: ContactInvitation }
  | { type: "UPDATE_CONTACT_INVITATION"; payload: { invitationId: string; updates: Partial<ContactInvitation> } }
  | { type: "REMOVE_CONTACT_INVITATION"; payload: string }
  | { type: "SET_NOTIFICATIONS"; payload: ChatNotification[] }
  | { type: "ADD_NOTIFICATION"; payload: ChatNotification }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "SET_CHAT_SETTINGS"; payload: { chatId: string; settings: ChatSettings } }
  | { type: "SET_DRAFT"; payload: { chatId: string; draft: DraftMessage } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SEARCH_RESULTS"; payload: Message[] }
  | { type: "SET_IS_SEARCHING"; payload: boolean }

export interface MessengerContextType {
  state: MessengerState
  dispatch: React.Dispatch<MessengerAction>

  // Chat functions
  setActiveChat: (chatId: string | null) => void
  createChat: (
    name: string,
    participants: string[],
    type: Chat["type"],
    options?: Partial<Chat>,
  ) => Promise<string | null>
  updateChatDetails: (chatId: string, updates: Partial<Chat>) => Promise<boolean>
  deleteChat: (chatId: string) => Promise<boolean>
  refreshChats: () => Promise<void>

  // Message functions
  sendMessage: (
    text: string,
    attachments?: Attachment[],
    replyToMessageId?: string,
    forwardedFrom?: Message["forwardedFrom"],
  ) => Promise<boolean>
  forwardMessage: (messageId: string, targetChatIds: string[]) => Promise<boolean>
  editMessage: (chatId: string, messageId: string, newText: string) => Promise<boolean>
  deleteMessage: (chatId: string, messageId: string) => Promise<boolean>
  pinMessage: (chatId: string, messageId: string) => Promise<boolean>
  unpinMessage: (chatId: string, messageId: string) => Promise<boolean>
  markAsRead: (chatId: string, messageId: string) => Promise<boolean>
  addReaction: (chatId: string, messageId: string, emoji: string) => Promise<boolean>
  removeReaction: (chatId: string, messageId: string, emoji: string) => Promise<boolean>
  searchMessages: (query: string, chatId?: string) => Promise<Message[]>

  // User functions
  setUserStatus: (status: UserStatus["status"], customStatus?: string) => Promise<boolean>

  // Category functions
  createCategory: (name: string, options?: Partial<ChatCategory>) => Promise<string | null>
  updateCategory: (categoryId: string, updates: Partial<ChatCategory>) => Promise<boolean>
  deleteCategory: (categoryId: string) => Promise<boolean>

  // Settings functions
  updateChatSettings: (chatId: string, settings: Partial<ChatSettings>) => Promise<boolean>
  saveDraft: (chatId: string, text: string, attachments?: Attachment[]) => Promise<boolean>
  getDraft: (chatId: string) => Promise<DraftMessage | null>

  // Contact functions
  sendContactInvitation: (toUserId: string, message?: string) => Promise<boolean>
  acceptContactInvitation: (invitationId: string) => Promise<boolean>
  declineContactInvitation: (invitationId: string) => Promise<boolean>
  removeContact: (contactId: string) => Promise<boolean>
  updateContact: (contactId: string, updates: Partial<Contact>) => Promise<boolean>
  getWorkContacts: () => UserBasicDetails[]
  getSavedContacts: () => Contact[]
}
