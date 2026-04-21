import {
  db,
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  rtdbQuery,
  limitToLast,
  storage,
  uploadBytes,
  getDownloadURL,
  off,
} from "../services/Firebase"
import type {
  Chat,
  Message,
  ChatCategory,
  UserBasicDetails,
  ChatNotification,
  ChatSettings,
  DraftMessage,
  Attachment,
  Contact,
} from "../interfaces/Messenger"
import { ref as storageRef } from "firebase/storage"

// Chat Management
export const createChat = async (
  basePath: string,
  chat: Omit<Chat, "id" | "createdAt" | "updatedAt">,
): Promise<Chat> => {
  try {
    const chatsRef = ref(db, `${basePath}/chats`)
    const newChatRef = push(chatsRef)
    const id = newChatRef.key as string

    const now = new Date().toISOString()
    const newChat = {
      ...chat,
      id,
      createdAt: now,
      updatedAt: now,
    }

    await set(newChatRef, newChat)

    // Create user-chat references under the same basePath for all participants
    for (const uid of newChat.participants) {
      const userChatRef = ref(db, `${basePath}/users/${uid}/chats/${id}`)
      await set(userChatRef, {
        joinedAt: now,
        role: "member",
      })
      // Invalidate per-user cache so newly created chats appear immediately
      clearUserChatsCache(basePath, uid)
    }
    return newChat as Chat
  } catch (error) {
    console.error("Error creating chat:", error)
    throw error
  }
}

export const getChat = async (basePath: string, chatId: string): Promise<Chat | null> => {
  const chatRef = ref(db, `${basePath}/chats/${chatId}`)

  try {
    const snapshot = await get(chatRef)
    if (snapshot.exists()) {
      return snapshot.val() as Chat
    }
    return null
  } catch (error) {
    console.error("Error fetching chat:", error)
    throw error
  }
}

// Cache for user chats to prevent duplicate fetching
const userChatsCache = new Map<string, { chats: Chat[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

const clearUserChatsCache = (basePath: string, userId: string) => {
  try {
    userChatsCache.delete(`${basePath}:${userId}`)
  } catch {
    // ignore
  }
}

export const getUserChats = async (basePath: string, userId: string): Promise<Chat[]> => {
  const cacheKey = `${basePath}:${userId}`
  const cached = userChatsCache.get(cacheKey)
  
  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.chats
  }

  const userChatsRef = ref(db, `${basePath}/users/${userId}/chats`)

  try {
    // Only log if not already cached to reduce console noise
    if (!userChatsCache.has(cacheKey)) {
      console.log("Fetching chats for user:", userId)
    }
    const snapshot = await get(userChatsRef)
    if (snapshot.exists()) {
      const chatIds = Object.keys(snapshot.val())
      const chats: Chat[] = []

      for (const chatId of chatIds) {
        const chatRef = ref(db, `${basePath}/chats/${chatId}`)
        const chatSnapshot = await get(chatRef)

        if (chatSnapshot.exists()) {
          const chat = chatSnapshot.val() as Chat
          chats.push(chat)
        } else {
          console.warn("Chat not found:", chatId)
          // Self-heal: remove stale user-chat index entry so it won't keep reappearing
          try {
            await remove(ref(db, `${basePath}/users/${userId}/chats/${chatId}`))
          } catch {
            // ignore cleanup errors
          }
        }
      }
      
      // Cache the result
      userChatsCache.set(cacheKey, { chats, timestamp: Date.now() })
      return chats
    }
    console.log("No chats found for user:", userId)
    return []
  } catch (error) {
    console.error("Error fetching user chats:", error)
    throw error
  }
}

export const getCompanyChats = async (basePath: string): Promise<Chat[]> => {
  try {
    const chatsRef = ref(db, `${basePath}/chats`)
    const snapshot = await get(chatsRef)
    if (!snapshot.exists()) return []
    const allChats = snapshot.val() as Record<string, Chat>
    return Object.values(allChats).filter((c: any) => c.type === "company") as Chat[]
  } catch (error) {
    console.error("Error fetching company chats:", error)
    throw error
  }
}

export const getSiteChats = async (basePath: string, siteId: string): Promise<Chat[]> => {
  try {
    const chatsRef = ref(db, `${basePath}/chats`)
    const snapshot = await get(chatsRef)
    if (!snapshot.exists()) return []
    const allChats = snapshot.val() as Record<string, Chat>
    return Object.values(allChats).filter((c: any) => c.siteId === siteId || c.subsiteId === siteId) as Chat[]
  } catch (error) {
    console.error("Error fetching site chats:", error)
    throw error
  }
}

export const getDepartmentChats = async (basePath: string, departmentId: string): Promise<Chat[]> => {
  try {
    const chatsRef = ref(db, `${basePath}/chats`)
    const snapshot = await get(chatsRef)
    if (!snapshot.exists()) return []
    const allChats = snapshot.val() as Record<string, Chat>
    return Object.values(allChats).filter((c: any) => c.departmentId === departmentId) as Chat[]
  } catch (error) {
    console.error("Error fetching department chats:", error)
    throw error
  }
}

export const getRoleChats = async (basePath: string, roleId: string): Promise<Chat[]> => {
  try {
    const chatsRef = ref(db, `${basePath}/chats`)
    const snapshot = await get(chatsRef)
    if (!snapshot.exists()) return []
    const allChats = snapshot.val() as Record<string, Chat>
    return Object.values(allChats).filter((c: any) => c.roleId === roleId) as Chat[]
  } catch (error) {
    console.error("Error fetching role chats:", error)
    throw error
  }
}

export const updateChat = async (basePath: string, chatId: string, updates: Partial<Chat>): Promise<void> => {
  try {
    const chatRef = ref(db, `${basePath}/chats/${chatId}`)
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await update(chatRef, updatedFields)
  } catch (error) {
    console.error("Error updating chat:", error)
    throw error
  }
}

export const deleteChat = async (basePath: string, chatId: string): Promise<void> => {
  const chatRef = ref(db, `${basePath}/chats/${chatId}`)
  try {
    // Get chat to find participants
    const chatSnapshot = await get(chatRef)
    if (chatSnapshot.exists()) {
      const chat = chatSnapshot.val() as Chat

      // Remove chat from all participants
      for (const userId of chat.participants) {
        const userChatRef = ref(db, `${basePath}/users/${userId}/chats/${chatId}`)
        await remove(userChatRef)
        // Invalidate per-user cache so deleted chats disappear immediately
        clearUserChatsCache(basePath, userId)
      }

      // Remove chat from company/site/department/role if applicable
      if (chat.type === "company") {
        const companyChatsRef = ref(db, `companies/${chat.companyId}/chats/${chatId}`)
        await remove(companyChatsRef)
      } else if (chat.type === "site" && chat.siteId) {
        const siteChatsRef = ref(db, `sites/${chat.siteId}/chats/${chatId}`)
        await remove(siteChatsRef)
      } else if (chat.type === "department" && chat.departmentId) {
        const deptChatsRef = ref(db, `departments/${chat.departmentId}/chats/${chatId}`)
        await remove(deptChatsRef)
      } else if (chat.type === "role" && chat.roleId) {
        const roleChatsRef = ref(db, `roles/${chat.roleId}/chats/${chatId}`)
        await remove(roleChatsRef)
      }

      // Delete all messages in the chat
      const messagesRef = ref(db, `${basePath}/messages/${chatId}`)
      await remove(messagesRef)
    }

    // Delete the chat itself
    await remove(chatRef)
  } catch (error) {
    console.error("Error deleting chat:", error)
    throw error
  }
}

// Message Management
export const sendMessage = async (basePath: string, message: Omit<Message, "id" | "timestamp">): Promise<Message> => {
  try {
    const messagesRef = ref(db, `${basePath}/messages/${message.chatId}`)
    const newMessageRef = push(messagesRef)
    const id = newMessageRef.key as string

    const newMessage = {
      ...message,
      id,
      timestamp: new Date().toISOString(),
    }

    await set(newMessageRef, newMessage)

    // Update chat's last message
    const chatRef = ref(db, `${basePath}/chats/${message.chatId}`)
    await update(chatRef, {
      lastMessage: {
        id,
        text: newMessage.text,
        timestamp: newMessage.timestamp,
        senderId: newMessage.senderId,
        senderName: `${newMessage.firstName || ""} ${newMessage.lastName || ""}`.trim(),
      },
      updatedAt: newMessage.timestamp,
    })

    return newMessage as Message
  } catch (error) {
    console.error("Error sending message:", error)
    throw error
  }
}

export const getMessages = async (basePath: string, chatId: string, limit = 50): Promise<Message[]> => {
  const messagesRef = ref(db, `${basePath}/messages/${chatId}`)
  const messagesQuery = rtdbQuery(messagesRef, limitToLast(limit))

  try {
    const snapshot = await get(messagesQuery)
    if (snapshot.exists()) {
      const messages = snapshot.val()
      return Object.values(messages) as Message[]
    }
    return []
  } catch (error) {
    console.error("Error fetching messages:", error)
    throw error
  }
}

export const subscribeToMessages = (basePath: string, chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = ref(db, `${basePath}/messages/${chatId}`)

  return onValue(messagesRef, (snapshot) => {
    if (snapshot.exists()) {
      const messages = Object.entries(snapshot.val())
        .map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      callback(messages)
    } else {
      callback([])
    }
  })
}

export const markMessageAsRead = async (
  basePath: string,
  chatId: string,
  messageId: string,
  userId: string,
): Promise<void> => {
  try {
    const messageRef = ref(db, `${basePath}/messages/${chatId}/${messageId}`)
    const messageSnapshot = await get(messageRef)

    if (messageSnapshot.exists()) {
      const message = messageSnapshot.val()
      const readBy = message.readBy || []

      if (!readBy.includes(userId)) {
        readBy.push(userId)
        await update(messageRef, { readBy })
      }
    }
  } catch (error) {
    console.error("Error marking message as read:", error)
  }
}

export const addReactionToMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string,
): Promise<void> => {
  try {
    const messageRef = ref(db, `${basePath}/messages/${chatId}/${messageId}`)
    const messageSnapshot = await get(messageRef)

    if (!messageSnapshot.exists()) {
      throw new Error("Message not found")
    }

    const message = messageSnapshot.val() as Message

    // Initialize reactions object if it doesn't exist
    const reactions = message.reactions || {}

    // Initialize emoji array if it doesn't exist
    const emojiReactions = reactions[emoji] || []

    // Add user to emoji reactions if not already there
    if (!emojiReactions.includes(userId)) {
      const updatedEmojiReactions = [...emojiReactions, userId]
      const updatedReactions = {
        ...reactions,
        [emoji]: updatedEmojiReactions,
      }

      await update(messageRef, { reactions: updatedReactions })
    }
  } catch (error) {
    console.error("Error adding reaction to message:", error)
    throw error
  }
}

export const removeReactionFromMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string,
): Promise<void> => {
  try {
    const messageRef = ref(db, `${basePath}/messages/${chatId}/${messageId}`)
    const messageSnapshot = await get(messageRef)

    if (!messageSnapshot.exists()) {
      throw new Error("Message not found")
    }

    const message = messageSnapshot.val() as Message

    // Check if reactions exist
    if (!message.reactions || !message.reactions[emoji]) {
      return // No reactions to remove
    }

    // Remove user from emoji reactions
    const updatedEmojiReactions = message.reactions[emoji].filter((id) => id !== userId)

    // Update reactions object
    const updatedReactions = { ...message.reactions }

    if (updatedEmojiReactions.length === 0) {
      // Remove emoji key if no users left
      delete updatedReactions[emoji]
    } else {
      updatedReactions[emoji] = updatedEmojiReactions
    }

    await update(messageRef, { reactions: updatedReactions })
  } catch (error) {
    console.error("Error removing reaction from message:", error)
    throw error
  }
}

export const editMessage = async (
  basePath: string,
  chatId: string,
  messageId: string,
  newText: string,
  userId: string,
): Promise<void> => {
  try {
    const messageRef = ref(db, `${basePath}/messages/${chatId}/${messageId}`)
    const messageSnapshot = await get(messageRef)

    if (!messageSnapshot.exists()) {
      throw new Error("Message not found")
    }

    const message = messageSnapshot.val() as Message

    // Check if user is the message author
    if (message.senderId !== userId) {
      throw new Error("Only the author can edit this message")
    }

    // Create edit history if it doesn't exist
    const editHistory = message.editHistory || []

    // Add current text to history
    editHistory.push({
      text: message.text,
      timestamp: new Date().toISOString(),
    })

    // Update message
    await update(messageRef, {
      text: newText,
      isEdited: true,
      editHistory,
    })

    // Update last message in chat if this was the last message
    const chatRef = ref(db, `${basePath}/chats/${chatId}`)
    const chatSnapshot = await get(chatRef)

    if (chatSnapshot.exists()) {
      const chat = chatSnapshot.val() as Chat

      if (chat.lastMessage && chat.lastMessage.senderId === userId) {
        await update(chatRef, {
          lastMessage: {
            ...chat.lastMessage,
            text: newText,
          },
        })
      }
    }
  } catch (error) {
    console.error("Error editing message:", error)
    throw error
  }
}

export const deleteMessage = async (basePath: string, chatId: string, messageId: string, userId: string): Promise<void> => {
  try {
    const messageRef = ref(db, `${basePath}/messages/${chatId}/${messageId}`)
    const messageSnapshot = await get(messageRef)

    if (!messageSnapshot.exists()) {
      throw new Error("Message not found")
    }

    const message = messageSnapshot.val() as Message

    // Check if user is the message author
    if (message.senderId !== userId) {
      throw new Error("Only the author can delete this message")
    }

    // Soft delete - mark as deleted but keep the record
    await update(messageRef, {
      isDeleted: true,
      text: "This message was deleted",
      attachments: null,
    })

    // Update last message in chat if this was the last message
    const chatRef = ref(db, `${basePath}/chats/${chatId}`)
    const chatSnapshot = await get(chatRef)

    if (chatSnapshot.exists()) {
      const chat = chatSnapshot.val() as Chat

      if (chat.lastMessage && chat.lastMessage.senderId === userId) {
        await update(chatRef, {
          lastMessage: {
            ...chat.lastMessage,
            text: "This message was deleted",
          },
        })
      }
    }
  } catch (error) {
    console.error("Error deleting message:", error)
    throw error
  }
}

export const pinMessage = async (basePath: string, chatId: string, messageId: string): Promise<void> => {
  try {
    // Update message
    const messageRef = ref(db, `${basePath}/messages/${chatId}/${messageId}`)
    await update(messageRef, { isPinned: true })

    // Add to chat's pinned messages
    const chatRef = ref(db, `${basePath}/chats/${chatId}`)
    const chatSnapshot = await get(chatRef)

    if (chatSnapshot.exists()) {
      const chat = chatSnapshot.val() as Chat
      const pinnedMessages = chat.pinnedMessages || []

      if (!pinnedMessages.includes(messageId)) {
        await update(chatRef, {
          pinnedMessages: [...pinnedMessages, messageId],
        })
      }
    }
  } catch (error) {
    console.error("Error pinning message:", error)
    throw error
  }
}

export const unpinMessage = async (basePath: string, chatId: string, messageId: string): Promise<void> => {
  try {
    // Update message
    const messageRef = ref(db, `${basePath}/messages/${chatId}/${messageId}`)
    await update(messageRef, { isPinned: false })

    // Remove from chat's pinned messages
    const chatRef = ref(db, `${basePath}/chats/${chatId}`)
    const chatSnapshot = await get(chatRef)

    if (chatSnapshot.exists()) {
      const chat = chatSnapshot.val() as Chat
      const pinnedMessages = chat.pinnedMessages || []

      await update(chatRef, {
        pinnedMessages: pinnedMessages.filter((id: string) => id !== messageId),
      })
    }
  } catch (error) {
    console.error("Error unpinning message:", error)
    throw error
  }
}

export const searchMessages = async (basePath: string, query: string, userId: string, chatId?: string): Promise<Message[]> => {
  try {
    // If chatId is provided, search only in that chat
    if (chatId) {
      const messagesRef = ref(db, `${basePath}/messages/${chatId}`)
      const snapshot = await get(messagesRef)

      if (snapshot.exists()) {
        const messages = snapshot.val()
        return Object.values(messages) as Message[]
      }

      return []
    }

    // Otherwise, search in all user's chats
    const userChatsRef = ref(db, `${basePath}/users/${userId}/chats`)

    const userChatsSnapshot = await get(userChatsRef)

    if (!userChatsSnapshot.exists()) {
      return []
    }

    const chatIds = Object.keys(userChatsSnapshot.val())
    const results: Message[] = []

    // Search in each chat
    for (const chatId of chatIds) {
      const messagesRef = ref(db, `messages/${chatId}`)
      const snapshot = await get(messagesRef)

      if (snapshot.exists()) {
        const messages = Object.values(snapshot.val()) as Message[]
        const matchingMessages = messages.filter((message) => message.text.toLowerCase().includes(query.toLowerCase()))

        results.push(...matchingMessages)
      }
    }

    return results
  } catch (error) {
    console.error("Error searching messages:", error)
    throw error
  }
}

// Category Management
export const createCategory = async (category: Omit<ChatCategory, "id">): Promise<string> => {
  const categoriesRef = ref(db, `categories/${category.companyId}`)
  const newCategoryRef = push(categoriesRef)
  const categoryId = newCategoryRef.key as string

  const categoryWithId = {
    ...category,
    id: categoryId,
  }

  try {
    await set(newCategoryRef, categoryWithId)
    return categoryId
  } catch (error) {
    console.error("Error creating category:", error)
    throw error
  }
}

export const getCategories = async (companyId: string): Promise<ChatCategory[]> => {
  const categoriesRef = ref(db, `categories/${companyId}`)
  try {
    const snapshot = await get(categoriesRef)
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as ChatCategory[]
    }
    return []
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw error
  }
}

export const updateCategory = async (
  categoryId: string,
  companyId: string,
  updates: Partial<ChatCategory>,
): Promise<void> => {
  const categoryRef = ref(db, `categories/${companyId}/${categoryId}`)
  try {
    await update(categoryRef, updates)
  } catch (error) {
    console.error("Error updating category:", error)
    throw error
  }
}

export const deleteCategory = async (categoryId: string, companyId: string): Promise<void> => {
  try {
    // Get all chats and update those in this category
    const chatsRef = ref(db, `chats`)
    const snapshot = await get(chatsRef)

    if (snapshot.exists()) {
      const allChats = snapshot.val()

      // Update all chats to remove category
      for (const chatId in allChats) {
        const chat = allChats[chatId] as Chat
        if ((chat as any).categoryId === categoryId) {
          const chatRef = ref(db, `chats/${chatId}`)
          await update(chatRef, { categoryId: null })
        }
      }
    }

    // Delete the category
    const categoryRef = ref(db, `categories/${companyId}/${categoryId}`)
    await remove(categoryRef)
  } catch (error) {
    console.error("Error deleting category:", error)
    throw error
  }
}

// User Status Management
export const updateUserStatus = async (
  basePath: string,
  userId: string,
  status: "online" | "offline" | "away",
): Promise<void> => {
  try {
    const userStatusRef = ref(db, `${basePath}/userStatus/${userId}`)
    await set(userStatusRef, {
      status,
      lastSeen: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating user status:", error)
  }
}

export const getUserStatus = async (
  basePath: string,
  userId: string,
): Promise<{ status: string; lastSeen: string } | null> => {
  try {
    const userStatusRef = ref(db, `${basePath}/userStatus/${userId}`)
    const snapshot = await get(userStatusRef)

    if (snapshot.exists()) {
      return snapshot.val()
    }
    return null
  } catch (error) {
    console.error("Error getting user status:", error)
    return null
  }
}

// User Management
export const getUserDetails = async (userId: string): Promise<UserBasicDetails | null> => {
  const userRef = ref(db, `users/${userId}/profile`)
  try {
    const snapshot = await get(userRef)
    if (snapshot.exists()) {
      return snapshot.val() as UserBasicDetails
    }
    return null
  } catch (error) {
    console.error("Error fetching user details:", error)
    throw error
  }
}

export const getCompanyUsers = async (companyId: string): Promise<UserBasicDetails[]> => {
  const usersRef = ref(db, `users`)
  try {
    const snapshot = await get(usersRef)
    if (snapshot.exists()) {
      const users = snapshot.val()
      const companyUsers: UserBasicDetails[] = []

      for (const userId in users) {
        if (
          users[userId].profile &&
          users[userId].profile.companyIds &&
          users[userId].profile.companyIds.includes(companyId)
        ) {
          companyUsers.push(users[userId].profile as UserBasicDetails)
        }
      }

      return companyUsers
    }
    return []
  } catch (error) {
    console.error("Error fetching company users:", error)
    throw error
  }
}

// Chat Settings
export const getChatSettings = async (userId: string, chatId: string): Promise<ChatSettings | null> => {
  const settingsRef = ref(db, `users/${userId}/chatSettings/${chatId}`)
  try {
    const snapshot = await get(settingsRef)
    if (snapshot.exists()) {
      return snapshot.val() as ChatSettings
    }
    return null
  } catch (error) {
    console.error("Error fetching chat settings:", error)
    throw error
  }
}

export const updateChatSettings = async (
  userId: string,
  chatId: string,
  settings: Partial<ChatSettings>,
): Promise<void> => {
  const settingsRef = ref(db, `users/${userId}/chatSettings/${chatId}`)
  try {
    // Get current settings or create default
    const snapshot = await get(settingsRef)
    const currentSettings = snapshot.exists()
      ? (snapshot.val() as ChatSettings)
      : {
          userId,
          chatId,
          isMuted: false,
          isStarred: false,
          isPinned: false,
          notificationLevel: "all",
        }

    // Update with new settings
    await update(settingsRef, {
      ...currentSettings,
      ...settings,
    })
  } catch (error) {
    console.error("Error updating chat settings:", error)
    throw error
  }
}

// Draft Messages
export const saveDraftMessage = async (
  userId: string,
  chatId: string,
  text: string,
  attachments?: Attachment[],
): Promise<void> => {
  const draftRef = ref(db, `users/${userId}/drafts/${chatId}`)
  try {
    await set(draftRef, {
      chatId,
      userId,
      text,
      attachments,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error saving draft message:", error)
    throw error
  }
}

export const getDraftMessage = async (userId: string, chatId: string): Promise<DraftMessage | null> => {
  const draftRef = ref(db, `users/${userId}/drafts/${chatId}`)
  try {
    const snapshot = await get(draftRef)
    if (snapshot.exists()) {
      return snapshot.val() as DraftMessage
    }
    return null
  } catch (error) {
    console.error("Error fetching draft message:", error)
    throw error
  }
}

export const deleteDraftMessage = async (userId: string, chatId: string): Promise<void> => {
  const draftRef = ref(db, `users/${userId}/drafts/${chatId}`)
  try {
    await remove(draftRef)
  } catch (error) {
    console.error("Error deleting draft message:", error)
    throw error
  }
}

// Notifications
export const getUserNotifications = async (userId: string): Promise<ChatNotification[]> => {
  const notificationsRef = ref(db, `notifications/${userId}/messages`)
  try {
    const snapshot = await get(notificationsRef)
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as ChatNotification[]
    }
    return []
  } catch (error) {
    console.error("Error fetching user notifications:", error)
    throw error
  }
}

export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
  const notificationRef = ref(db, `notifications/${userId}/messages/${notificationId}`)
  try {
    await update(notificationRef, { isRead: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const notificationsRef = ref(db, `notifications/${userId}/messages`)
  try {
    const snapshot = await get(notificationsRef)
    if (snapshot.exists()) {
      const notifications = snapshot.val()
      const updates: Record<string, any> = {}

      for (const id in notifications) {
        updates[`${id}/isRead`] = true
      }

      await update(notificationsRef, updates)
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: ChatNotification[]) => void,
): (() => void) => {
  const notificationsRef = ref(db, `notifications/${userId}/messages`)

  const handleNotifications = (snapshot: any) => {
    if (snapshot.exists()) {
      const notifications = Object.values(snapshot.val()) as ChatNotification[]
      callback(notifications)
    } else {
      callback([])
    }
  }

  onValue(notificationsRef, handleNotifications)

  // Return unsubscribe function
  return () => off(notificationsRef, "value", handleNotifications)
}

// File Upload
export const uploadAttachment = async (file: File, chatId: string, userId: string): Promise<Attachment> => {
  try {
    // Create a unique file path
    const timestamp = Date.now()
    const filePath = `attachments/${chatId}/${userId}_${timestamp}_${file.name}`
    const fileRef = storageRef(storage, filePath)

    // Upload file
    await uploadBytes(fileRef, file)

    // Get download URL
    const downloadURL = await getDownloadURL(fileRef)

    // Determine file type
    let type: Attachment["type"] = "file"
    if (file.type.startsWith("image/")) {
      type = "image"
    } else if (file.type.startsWith("video/")) {
      type = "video"
    } else if (file.type.startsWith("audio/")) {
      type = "audio"
    } else if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("sheet")) {
      type = "document"
    }

    // Create attachment object
    const attachment: Attachment = {
      id: `${userId}_${timestamp}`,
      type,
      url: downloadURL,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      metadata: {},
    }

    return attachment
  } catch (error) {
    console.error("Error uploading attachment:", error)
    throw error
  }
}

// Contacts
export const fetchContacts = async (basePath: string): Promise<Contact[]> => {
  try {
    const contactsRef = ref(db, `${basePath}/contacts`)
    const snapshot = await get(contactsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching contacts:", error)
    throw error
  }
}

export const addContact = async (basePath: string, contact: Omit<Contact, "id">): Promise<Contact> => {
  try {
    const contactsRef = ref(db, `${basePath}/contacts`)
    const newContactRef = push(contactsRef)
    const id = newContactRef.key as string

    const newContact = {
      ...contact,
      id,
    }

    await set(newContactRef, newContact)
    return newContact
  } catch (error) {
    console.error("Error adding contact:", error)
    throw error
  }
}

export const updateContact = async (basePath: string, contactId: string, updates: Partial<Contact>): Promise<void> => {
  try {
    const contactRef = ref(db, `${basePath}/contacts/${contactId}`)
    await update(contactRef, updates)
  } catch (error) {
    console.error("Error updating contact:", error)
    throw error
  }
}

export const deleteContact = async (basePath: string, contactId: string): Promise<void> => {
  try {
    const contactRef = ref(db, `${basePath}/contacts/${contactId}`)
    await remove(contactRef)
  } catch (error) {
    console.error("Error deleting contact:", error)
    throw error
  }
}

// Real-time subscriptions
export const subscribeToChats = (basePath: string, userId: string, callback: (chats: Chat[]) => void) => {
  try {
    const chatsRef = ref(db, `${basePath}/chats`)
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatsData = snapshot.val()
        const chats = Object.entries(chatsData)
          .map(([id, chat]: [string, any]) => ({ ...chat, id }))
          .filter((chat: Chat) =>
            chat.participants?.includes(userId) ||
            chat.createdBy === userId
          )
        callback(chats)
      } else {
        callback([])
      }
    })
    return unsubscribe
  } catch (error) {
    console.error("Error subscribing to chats:", error)
    return () => {}
  }
}

export const subscribeToUserStatus = (
  basePath: string,
  userId: string,
  callback: (status: { status: string; lastSeen: string } | null) => void
): (() => void) => {
  try {
    const statusRef = ref(db, `${basePath}/userStatuses/${userId}`)
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val())
      } else {
        callback(null)
      }
    })
    return unsubscribe
  } catch (error) {
    console.error("Error subscribing to user status:", error)
    return () => {}
  }
}
