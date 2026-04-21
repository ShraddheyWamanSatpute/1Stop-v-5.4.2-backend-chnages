import * as firebaseProvider from "../../rtdatabase/Messenger"
import type {
  Chat,
  ChatCategory,
  ChatNotification,
  ChatSettings,
  Contact,
  DraftMessage,
  Message,
} from "../../interfaces/Messenger"
import { authedDataFetch, createPollingSubscription } from "./http"

export * from "../../rtdatabase/Messenger"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const fetchRows = async <T>(path: string): Promise<T[]> => {
  const result = await authedDataFetch(path, { method: "GET" })
  return (result?.rows || []) as T[]
}

const fetchRow = async <T>(path: string): Promise<T | null> => {
  const result = await authedDataFetch(path, { method: "GET" })
  return (result?.row || null) as T | null
}

export const createChat: typeof firebaseProvider.createChat = async (basePath: string, chat) => {
  const result = await authedDataFetch(`/messenger/chats`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: chat }),
  })
  return (result?.row || { ...chat, id: result?.id }) as Chat
}

export const getChat: typeof firebaseProvider.getChat = async (basePath: string, chatId: string) =>
  fetchRow<Chat>(`/messenger/chats${query({ basePath, chatId })}`)

export const getUserChats: typeof firebaseProvider.getUserChats = async (basePath: string, userId: string) =>
  fetchRows<Chat>(`/messenger/chats/user${query({ basePath, userId })}`)

export const getCompanyChats: typeof firebaseProvider.getCompanyChats = async (basePath: string) =>
  fetchRows<Chat>(`/messenger/chats/company${query({ basePath })}`)

export const getSiteChats: typeof firebaseProvider.getSiteChats = async (basePath: string, siteId: string) =>
  fetchRows<Chat>(`/messenger/chats/site${query({ basePath, siteId })}`)

export const getDepartmentChats: typeof firebaseProvider.getDepartmentChats = async (
  basePath: string,
  departmentId: string,
) => fetchRows<Chat>(`/messenger/chats/department${query({ basePath, departmentId })}`)

export const getRoleChats: typeof firebaseProvider.getRoleChats = async (basePath: string, roleId: string) =>
  fetchRows<Chat>(`/messenger/chats/role${query({ basePath, roleId })}`)

export const updateChat: typeof firebaseProvider.updateChat = async (
  basePath: string,
  chatId: string,
  updates,
) => {
  await authedDataFetch(`/messenger/chats/${encodeURIComponent(chatId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteChat: typeof firebaseProvider.deleteChat = async (basePath: string, chatId: string) => {
  await authedDataFetch(`/messenger/chats/${encodeURIComponent(chatId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const sendMessage: typeof firebaseProvider.sendMessage = async (basePath: string, message) => {
  const result = await authedDataFetch(`/messenger/messages`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: message }),
  })
  return (result?.row || { ...message, id: result?.id }) as Message
}

export const getMessages: typeof firebaseProvider.getMessages = async (
  basePath: string,
  chatId: string,
  limit = 50,
) => fetchRows<Message>(`/messenger/messages${query({ basePath, chatId, limit })}`)

export const subscribeToMessages: typeof firebaseProvider.subscribeToMessages = (
  basePath: string,
  chatId: string,
  callback,
) =>
  createPollingSubscription(
    () => getMessages(basePath, chatId, 200),
    callback,
    undefined,
    5000,
  )

export const markMessageAsRead: typeof firebaseProvider.markMessageAsRead = async (
  basePath: string,
  chatId: string,
  messageId: string,
  userId: string,
) => {
  await authedDataFetch(`/messenger/messages/${encodeURIComponent(messageId)}/read`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, chatId, userId }),
  })
}

export const addReactionToMessage: typeof firebaseProvider.addReactionToMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string,
) => {
  await authedDataFetch(`/messenger/messages/${encodeURIComponent(messageId)}/reactions`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, chatId, emoji, userId, add: true }),
  })
}

export const removeReactionFromMessage: typeof firebaseProvider.removeReactionFromMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string,
) => {
  await authedDataFetch(`/messenger/messages/${encodeURIComponent(messageId)}/reactions`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, chatId, emoji, userId, add: false }),
  })
}

export const editMessage: typeof firebaseProvider.editMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
  newText: string,
  userId: string,
) => {
  await authedDataFetch(`/messenger/messages/${encodeURIComponent(messageId)}/edit`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, chatId, userId, newText }),
  })
}

export const deleteMessage: typeof firebaseProvider.deleteMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
  userId: string,
) => {
  await authedDataFetch(`/messenger/messages/${encodeURIComponent(messageId)}/delete`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, chatId, userId }),
  })
}

export const pinMessage: typeof firebaseProvider.pinMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
) => {
  await authedDataFetch(`/messenger/messages/${encodeURIComponent(messageId)}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, chatId }),
  })
}

export const unpinMessage: typeof firebaseProvider.unpinMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
) => {
  await authedDataFetch(`/messenger/messages/${encodeURIComponent(messageId)}/unpin`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, chatId }),
  })
}

export const searchMessages: typeof firebaseProvider.searchMessages = async (
  basePath: string,
  searchQuery: string,
  userId: string,
  chatId?: string,
) => {
  const result = await authedDataFetch(`/messenger/messages/search`, {
    method: "POST",
    body: JSON.stringify({ basePath, query: searchQuery, userId, chatId }),
  })
  return (result?.rows || []) as Message[]
}

export const createCategory: typeof firebaseProvider.createCategory = async (category) => {
  const result = await authedDataFetch(`/messenger/categories`, {
    method: "POST",
    body: JSON.stringify({ companyId: category.companyId, data: category }),
  })
  return String(result?.id || result?.row?.id || "")
}

export const getCategories: typeof firebaseProvider.getCategories = async (companyId: string) =>
  fetchRows<ChatCategory>(`/messenger/categories${query({ companyId })}`)

export const updateCategory: typeof firebaseProvider.updateCategory = async (
  categoryId: string,
  companyId: string,
  updates,
) => {
  await authedDataFetch(`/messenger/categories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    body: JSON.stringify({ companyId, updates }),
  })
}

export const deleteCategory: typeof firebaseProvider.deleteCategory = async (
  categoryId: string,
  companyId: string,
) => {
  await authedDataFetch(`/messenger/categories/${encodeURIComponent(categoryId)}${query({ companyId })}`, {
    method: "DELETE",
  })
}

export const updateUserStatus: typeof firebaseProvider.updateUserStatus = async (
  basePath: string,
  userId: string,
  status,
) => {
  await authedDataFetch(`/messenger/statuses`, {
    method: "PUT",
    body: JSON.stringify({ basePath, userId, status }),
  })
}

export const getUserStatus: typeof firebaseProvider.getUserStatus = async (basePath: string, userId: string) => {
  const result = await authedDataFetch(`/messenger/statuses${query({ basePath, userId })}`, {
    method: "GET",
  })
  return (result?.row || null) as { status: string; lastSeen: string } | null
}

export const getChatSettings: typeof firebaseProvider.getChatSettings = async (userId: string, chatId: string) =>
  fetchRow<ChatSettings>(`/messenger/chatSettings${query({ userId, chatId })}`)

export const updateChatSettings: typeof firebaseProvider.updateChatSettings = async (
  userId: string,
  chatId: string,
  settings,
) => {
  await authedDataFetch(`/messenger/chatSettings`, {
    method: "PATCH",
    body: JSON.stringify({ userId, chatId, settings }),
  })
}

export const saveDraftMessage: typeof firebaseProvider.saveDraftMessage = async (
  userId: string,
  chatId: string,
  text: string,
  attachments,
) => {
  await authedDataFetch(`/messenger/drafts`, {
    method: "PUT",
    body: JSON.stringify({ userId, chatId, text, attachments }),
  })
}

export const getDraftMessage: typeof firebaseProvider.getDraftMessage = async (userId: string, chatId: string) =>
  fetchRow<DraftMessage>(`/messenger/drafts${query({ userId, chatId })}`)

export const deleteDraftMessage: typeof firebaseProvider.deleteDraftMessage = async (userId: string, chatId: string) => {
  await authedDataFetch(`/messenger/drafts${query({ userId, chatId })}`, {
    method: "DELETE",
  })
}

export const getUserNotifications: typeof firebaseProvider.getUserNotifications = async (userId: string) =>
  fetchRows<ChatNotification>(`/messenger/notifications${query({ userId })}`)

export const markNotificationAsRead: typeof firebaseProvider.markNotificationAsRead = async (
  userId: string,
  notificationId: string,
) => {
  await authedDataFetch(`/messenger/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  })
}

export const markAllNotificationsAsRead: typeof firebaseProvider.markAllNotificationsAsRead = async (userId: string) => {
  await authedDataFetch(`/messenger/notifications/readAll`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  })
}

export const subscribeToNotifications: typeof firebaseProvider.subscribeToNotifications = (userId: string, callback) =>
  createPollingSubscription(
    () => getUserNotifications(userId),
    callback,
    undefined,
    10000,
  )

export const fetchContacts: typeof firebaseProvider.fetchContacts = async (basePath: string) =>
  fetchRows<Contact>(`/messenger/contacts${query({ basePath })}`)

export const addContact: typeof firebaseProvider.addContact = async (basePath: string, contact) => {
  const result = await authedDataFetch(`/messenger/contacts`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: contact }),
  })
  return (result?.row || { ...contact, id: result?.id }) as Contact
}

export const updateContact: typeof firebaseProvider.updateContact = async (
  basePath: string,
  contactId: string,
  updates,
) => {
  await authedDataFetch(`/messenger/contacts/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteContact: typeof firebaseProvider.deleteContact = async (basePath: string, contactId: string) => {
  await authedDataFetch(`/messenger/contacts/${encodeURIComponent(contactId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const subscribeToChats: typeof firebaseProvider.subscribeToChats = (basePath: string, userId: string, callback) =>
  createPollingSubscription(
    () => getUserChats(basePath, userId),
    callback,
    undefined,
    10000,
  )

export const subscribeToUserStatus: typeof firebaseProvider.subscribeToUserStatus = (
  basePath: string,
  userId: string,
  callback,
) =>
  createPollingSubscription(
    () => getUserStatus(basePath, userId),
    callback,
    undefined,
    10000,
  )
