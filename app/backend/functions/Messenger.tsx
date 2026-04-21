import { auth, db, ref, push, set, get, update, remove, onValue, off } from "../services/Firebase"
import {
  createChat as dbCreateChat,
  getChat,
  getUserChats,
  getCompanyChats,
  getSiteChats,
  getDepartmentChats,
  getRoleChats,
  updateChat,
  deleteChat as dbDeleteChat,
  sendMessage as dbSendMessage,
  getMessages,
  subscribeToMessages,
  markMessageAsRead,
  addReactionToMessage,
  removeReactionFromMessage,
  editMessage as dbEditMessage,
  deleteMessage as dbDeleteMessage,
  pinMessage as dbPinMessage,
  updateUserStatus,
  unpinMessage as dbUnpinMessage,
  searchMessages as dbSearchMessages,
  createCategory as dbCreateCategory,
  getCategories,
  updateCategory,
  deleteCategory as dbDeleteCategory,

  getUserStatus,
  subscribeToUserStatus,
  getUserDetails,
  getCompanyUsers,
  getChatSettings,
  updateChatSettings as dbUpdateChatSettings,
  saveDraftMessage,
  getDraftMessage,
  deleteDraftMessage,
  uploadAttachment as dbUploadAttachment,
} from "../data/Messenger"
import type {
  Chat,
  Message,
  ChatCategory,
  UserStatus,
  UserBasicDetails,
  ChatSettings,
  Attachment,
  Contact,
  ContactInvitation,
} from "../interfaces/Messenger"

// Chat Functions
export const createChat = async (
  name: string,
  participants: string[],
  type: Chat["type"] = "direct",
  options: Partial<Chat> = {},
): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Get company ID from options or local storage with fallbacks
    let companyId = options.companyId || localStorage.getItem("companyId")

    // If no company ID, try to get from user data or create a default one
    if (!companyId) {
      companyId = localStorage.getItem("userCompanyId") || "default-company"
    }

    // Persist selected companyId so downstream calls resolve correct basePath
    try {
      if (companyId) localStorage.setItem("companyId", companyId)
    } catch (_) {
      // ignore storage errors (SSR/tests)
    }

    const uid = currentUser.uid

    // For organizational chats, check if chat already exists
    if (type === "company") {
      const basePath = `companies/${companyId}`
      // Correct lookup: query company chats under this company and reuse if present
      const companyChats = await getCompanyChats(basePath)
      const existingChat = companyChats && companyChats.length > 0 ? companyChats[0] : null
      if (existingChat && existingChat.type === "company") {
        // Ensure current user is a participant and has user-chat index
        const now = new Date().toISOString()
        if (!Array.isArray((existingChat as any).participants) || !(existingChat as any).participants.includes(uid)) {
          const updatedParticipants = [ ...(existingChat as any).participants || [], uid ]
          await updateChat(basePath, existingChat.id, { participants: updatedParticipants })
        }
        // Ensure the chat name reflects current requested name (usually selected company name)
        try {
          if (name && existingChat.name !== name) {
            await updateChat(basePath, existingChat.id, { name })
          }
        } catch (_) {}
        try {
          const userChatRef = ref(db, `${basePath}/users/${uid}/chats/${existingChat.id}`)
          await set(userChatRef, { joinedAt: now, role: "member" })
        } catch (_) {}
        return existingChat.id // Return existing company chat (now indexed for user)
      }
    } else if (type === "site" && (options.siteId || (options as any).subsiteId)) {
      const basePath = `companies/${companyId}`
      const scopeId = (options as any).subsiteId || options.siteId!
      const siteChats = await getSiteChats(basePath, scopeId)
      const existingChat = siteChats && siteChats.length > 0 ? siteChats[0] : null
      if (existingChat && existingChat.type === "site") {
        const now = new Date().toISOString()
        if (!Array.isArray((existingChat as any).participants) || !(existingChat as any).participants.includes(uid)) {
          const updatedParticipants = [ ...(existingChat as any).participants || [], uid ]
          await updateChat(basePath, existingChat.id, { participants: updatedParticipants })
        }
        try {
          const userChatRef = ref(db, `${basePath}/users/${uid}/chats/${existingChat.id}`)
          await set(userChatRef, { joinedAt: now, role: "member" })
        } catch (_) {}
        return existingChat.id
      }
    } else if (type === "department" && options.departmentId) {
      const basePath = `companies/${companyId}`
      const deptChats = await getDepartmentChats(basePath, options.departmentId)
      const existingChat = deptChats && deptChats.length > 0 ? deptChats[0] : null
      if (existingChat && existingChat.type === "department") {
        const now = new Date().toISOString()
        if (!Array.isArray((existingChat as any).participants) || !(existingChat as any).participants.includes(uid)) {
          const updatedParticipants = [ ...(existingChat as any).participants || [], uid ]
          await updateChat(basePath, existingChat.id, { participants: updatedParticipants })
        }
        try {
          const userChatRef = ref(db, `${basePath}/users/${uid}/chats/${existingChat.id}`)
          await set(userChatRef, { joinedAt: now, role: "member" })
        } catch (_) {}
        return existingChat.id
      }
    } else if (type === "role" && options.roleId) {
      const basePath = `companies/${companyId}`
      const roleChats = await getRoleChats(basePath, options.roleId)
      const existingChat = roleChats && roleChats.length > 0 ? roleChats[0] : null
      if (existingChat && existingChat.type === "role") {
        const now = new Date().toISOString()
        if (!Array.isArray((existingChat as any).participants) || !(existingChat as any).participants.includes(uid)) {
          const updatedParticipants = [ ...(existingChat as any).participants || [], uid ]
          await updateChat(basePath, existingChat.id, { participants: updatedParticipants })
        }
        try {
          const userChatRef = ref(db, `${basePath}/users/${uid}/chats/${existingChat.id}`)
          await set(userChatRef, { joinedAt: now, role: "member" })
        } catch (_) {}
        return existingChat.id
      }
    }

    // Make sure creator is included in participants for all chat types
    if (!participants.includes(uid)) {
      participants.push(uid)
    }

    const chat: Omit<Chat, "id"> = {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: uid,
      participants,
      type,
      companyId,
      isPrivate: false,
      isArchived: false,
      ...options,
    }

    const basePath = `companies/${companyId}`
    const createdChat = await dbCreateChat(basePath, chat)
    return createdChat.id
  } catch (error) {
    console.error("Error creating new chat:", error)
    return null
  }
}

export const fetchChat = async (chatId: string): Promise<Chat | null> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    return await getChat(basePath, chatId)
  } catch (error) {
    console.error("Error fetching chat:", error)
    return null
  }
}

export const fetchUserChats = async (userId?: string): Promise<Chat[]> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser && !userId) {
      throw new Error("User not authenticated")
    }

    const uid = userId || currentUser!.uid
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    const indexed = await getUserChats(basePath, uid)
    if (indexed && indexed.length > 0) {
      console.log("fetchUserChats: using indexed user chats", { basePath, uid, count: indexed.length })
      return indexed
    }

    // Fallback: scan all chats and filter by participant membership
    console.warn("fetchUserChats: no indexed chats found; falling back to scan all chats", { basePath, uid })
    try {
      const allChatsRef = ref(db, `${basePath}/chats`)
      const snapshot = await get(allChatsRef)
      if (!snapshot.exists()) return []
      const allChatsObj = snapshot.val() as Record<string, Chat>
      const all = Object.values(allChatsObj || {})
      const mine = all.filter((c: any) => Array.isArray(c.participants) && c.participants.includes(uid)) as Chat[]

      // Also include company-level chats for this company even if user index/participants missing
      const companyLevel = all.filter((c: any) => c.type === "company" && c.companyId === companyId) as Chat[]

      // Merge unique by id
      const byId: Record<string, Chat> = {}
      for (const c of [...mine, ...companyLevel]) byId[c.id] = c
      const merged = Object.values(byId)

      console.log("fetchUserChats fallback result", { total: all.length, mine: mine.length, merged: merged.length })

      // Backfill user-chat index for reliability next time
      try {
        const now = new Date().toISOString()
        for (const c of merged) {
          const userChatRef = ref(db, `${basePath}/users/${uid}/chats/${c.id}`)
          await set(userChatRef, { joinedAt: now, role: "member" })
        }
      } catch (backfillErr) {
        console.warn("fetchUserChats backfill failed", backfillErr)
      }

      return merged
    } catch (scanErr) {
      console.error("fetchUserChats fallback scan failed", scanErr)
      return []
    }
  } catch (error) {
    console.error("Error fetching user chats:", error)
    return []
  }
}

export const fetchCompanyChats = async (companyId: string): Promise<Chat[]> => {
  try {
    const basePath = `companies/${companyId}`
    return await getCompanyChats(basePath)
  } catch (error) {
    console.error("Error fetching company chats:", error)
    return []
  }
}

export const fetchSiteChats = async (siteId: string): Promise<Chat[]> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    return await getSiteChats(basePath, siteId)
  } catch (error) {
    console.error("Error fetching site chats:", error)
    return []
  }
}

export const fetchDepartmentChats = async (departmentId: string): Promise<Chat[]> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    return await getDepartmentChats(basePath, departmentId)
  } catch (error) {
    console.error("Error fetching department chats:", error)
    return []
  }
}

export const fetchRoleChats = async (roleId: string): Promise<Chat[]> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    return await getRoleChats(basePath, roleId)
  } catch (error) {
    console.error("Error fetching role chats:", error)
    return []
  }
}

export const updateChatDetails = async (chatId: string, updates: Partial<Chat>): Promise<boolean> => {
  try {
    const companyId = localStorage.getItem("companyId")
    if (!companyId) throw new Error("Company ID not found")
    const basePath = `companies/${companyId}`
    await updateChat(basePath, chatId, updates)
    return true
  } catch (error) {
    console.error("Error updating chat:", error)
    return false
  }
}

export const deleteChat = async (chatId: string): Promise<boolean> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    await dbDeleteChat(basePath, chatId)
    return true
  } catch (error) {
    console.error("Error deleting message:", error)
    return false
  }
}

export const addParticipant = async (chatId: string, userId: string): Promise<boolean> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    const chat = await getChat(basePath, chatId)
    if (!chat) throw new Error("Chat not found")
    const current = Array.isArray(chat.participants) ? chat.participants : []
    const next = Array.from(new Set([...current, userId]))
    await updateChat(basePath, chatId, { participants: next })
    return true
  } catch (error) {
    console.error("Error adding participant:", error)
    return false
  }
}

export const removeParticipant = async (chatId: string, userId: string): Promise<boolean> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    const chat = await getChat(basePath, chatId)
    if (!chat) throw new Error("Chat not found")
    const current = Array.isArray(chat.participants) ? chat.participants : []
    const next = current.filter((id: string) => id !== userId)
    await updateChat(basePath, chatId, { participants: next })
    return true
  } catch (error) {
    console.error("Error removing participant:", error)
    return false
  }
}

// Message Functions
export const sendMessage = async (
  chatId: string,
  text: string,
  replyToMessageId?: string,
  replyToText?: string,
  attachments?: Attachment[],
  mentions?: string[],
  forwardedFrom?: Message["forwardedFrom"],
): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const now = new Date()
    const timestamp = now.toISOString()
    const date = now.toDateString()
    const time = now.toTimeString().split(" ")[0]

    // Get user details from localStorage or other source
    const firstName = localStorage.getItem("userFirstName") || "Unknown"
    const lastName = localStorage.getItem("userLastName") || "User"

    const message: Omit<Message, "id"> = {
      chatId,
      text,
      timestamp,
      date,
      time,
      uid: currentUser.uid,
      senderId: currentUser.uid,
      firstName,
      lastName,
      readBy: [currentUser.uid],
      status: "sending",
      ...(replyToMessageId && replyToText
        ? {
            replyTo: {
              id: replyToMessageId,
              text: replyToText,
            },
          }
        : {}),
      ...(forwardedFrom ? { forwardedFrom } : {}),
      ...(attachments ? { attachments } : {}),
      ...(mentions ? { mentions } : {}),
    }

    // Send the message
    const companyId = localStorage.getItem("companyId")
    if (!companyId) throw new Error("Company ID not found")
    const basePath = `companies/${companyId}`
    const createdMessage = await dbSendMessage(basePath, message)

    // Delete draft if it exists
    await deleteDraftMessage(currentUser.uid, chatId).catch(() => {
      // Ignore errors when deleting draft
    })

    return createdMessage.id
  } catch (error) {
    console.error("Error sending message:", error)
    return null
  }
}

export const forwardMessage = async (messageId: string, targetChatIds: string[]): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // This would need to be implemented in the database layer
    // For now, return true as placeholder
    console.log("Forwarding message", messageId, "to chats", targetChatIds)
    return true
  } catch (error) {
    console.error("Error forwarding message:", error)
    return false
  }
}

export const fetchMessages = async (chatId: string, limit = 50): Promise<Message[]> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    return await getMessages(basePath, chatId, limit)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return []
  }
}

export const listenToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void,
): (() => void) => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    return subscribeToMessages(basePath, chatId, callback)
  } catch (error) {
    console.error("Error subscribing to messages:", error)
    return () => {}
  }
}

// Listen for chat list changes (user chat index and chats collection)
export const listenToChatList = (callback: () => void): (() => void) => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    const currentUser = auth.currentUser
    if (!currentUser) return () => {}

    const userChatsRef = ref(db, `${basePath}/users/${currentUser.uid}/chats`)
    const chatsRef = ref(db, `${basePath}/chats`)

    const handler = () => { try { callback() } catch {} }

    const unUser = onValue(userChatsRef, handler)
    const unChats = onValue(chatsRef, handler)

    return () => {
      try { typeof unUser === 'function' ? unUser() : off(userChatsRef) } catch {}
      try { typeof unChats === 'function' ? unChats() : off(chatsRef) } catch {}
    }
  } catch (error) {
    console.error("Error subscribing to chat list:", error)
    return () => {}
  }
}

export const markAsRead = async (chatId: string, messageId: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const companyId = localStorage.getItem("companyId")
    if (!companyId) throw new Error("Company ID not found")
    const basePath = `companies/${companyId}`
    await markMessageAsRead(basePath, chatId, messageId, currentUser.uid)
    return true
  } catch (error) {
    console.error("Error marking message as read:", error)
    return false
  }
}

export const addReaction = async (chatId: string, messageId: string, emoji: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    await addReactionToMessage(basePath, chatId, messageId, emoji, currentUser.uid)
    return true
  } catch (error) {
    console.error("Error adding reaction:", error)
    return false
  }
}

export const removeReaction = async (chatId: string, messageId: string, emoji: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    await removeReactionFromMessage(basePath, chatId, messageId, emoji, currentUser.uid)
    return true
  } catch (error) {
    console.error("Error removing reaction:", error)
    return false
  }
}

export const editMessage = async (chatId: string, messageId: string, newText: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    await dbEditMessage(basePath, chatId, messageId, newText, currentUser.uid)
    return true
  } catch (error) {
    console.error("Error editing message:", error)
    return false
  }
}

export const deleteMessage = async (chatId: string, messageId: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    await dbDeleteMessage(basePath, chatId, messageId, currentUser.uid)
    return true
  } catch (error) {
    console.error("Error deleting message:", error)
    return false
  }
}

export const pinMessage = async (chatId: string, messageId: string): Promise<boolean> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    await dbPinMessage(basePath, chatId, messageId)
    return true
  } catch (error) {
    console.error("Error pinning message:", error)
    return false
  }
}

export const unpinMessage = async (chatId: string, messageId: string): Promise<boolean> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    await dbUnpinMessage(basePath, chatId, messageId)
    return true
  } catch (error) {
    console.error("Error unpinning message:", error)
    return false
  }
}

export const searchMessages = async (query: string, chatId?: string): Promise<Message[]> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    return await dbSearchMessages(basePath, query, currentUser.uid, chatId)
  } catch (error) {
    console.error("Error searching messages:", error)
    return []
  }
}

// Category Functions
export const createCategory = async (name: string, options: Partial<ChatCategory> = {}): Promise<string | null> => {
  try {
    // Get company ID from options or local storage with fallback
    let companyId = options.companyId || localStorage.getItem("companyId")

    if (!companyId) {
      companyId = "default-company"
      localStorage.setItem("companyId", companyId)
    }

    const category: Omit<ChatCategory, "id"> = {
      name,
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
      order: 0,
      ...options,
    }

    return await dbCreateCategory(category)
  } catch (error) {
    console.error("Error creating category:", error)
    return null
  }
}

export const fetchCategories = async (companyId: string): Promise<ChatCategory[]> => {
  try {
    return await getCategories(companyId)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

export const updateCategoryDetails = async (categoryId: string, updates: Partial<ChatCategory>): Promise<boolean> => {
  try {
    // Get company ID from updates or local storage with fallback
    let companyId = updates.companyId || localStorage.getItem("companyId")

    if (!companyId) {
      companyId = "default-company"
    }

    await updateCategory(categoryId, companyId, updates)
    return true
  } catch (error) {
    console.error("Error updating category:", error)
    return false
  }
}

export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  try {
    // Get company ID from local storage with fallback
    let companyId = localStorage.getItem("companyId")

    if (!companyId) {
      companyId = "default-company"
    }

    await dbDeleteCategory(categoryId, companyId)
    return true
  } catch (error) {
    console.error("Error deleting category:", error)
    return false
  }
}

// User Status Functions
export const setUserStatus = async (status: "online" | "away" | "offline", customStatus?: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    
    await updateUserStatus(basePath, currentUser.uid, status)
    console.log("User status updated:", status, customStatus)
    return true
  } catch (error) {
    console.error("Error updating user status:", error)
    return false
  }
}

export const fetchUserStatus = async (userId: string): Promise<UserStatus | null> => {
  try {
    const companyId = localStorage.getItem("companyId") || "default"
    const basePath = `companies/${companyId}`
    const statusData = await getUserStatus(basePath, userId)
    
    if (!statusData) return null
    
    return {
      uid: userId,
      status: statusData.status as "online" | "away" | "busy" | "offline",
      lastActive: statusData.lastSeen
    }
  } catch (error) {
    console.error("Error fetching user status:", error)
    return null
  }
}

export const listenToUserStatus = (userId: string, callback: (status: UserStatus | null) => void): (() => void) => {
  const companyId = localStorage.getItem("companyId") || "default"
  const basePath = `companies/${companyId}`
  // Adapt the callback to match the expected signature
  const adaptedCallback = (status: { status: string; lastSeen: string } | null) => {
    if (status) {
      const userStatus: UserStatus = {
        uid: userId,
        status: status.status as "online" | "away" | "busy" | "offline",
        lastActive: status.lastSeen
      }
      callback(userStatus)
    } else {
      callback(null)
    }
  }
  return subscribeToUserStatus(basePath, userId, adaptedCallback)
}

// User Functions
export const fetchUserDetails = async (userId: string): Promise<UserBasicDetails | null> => {
  try {
    return await getUserDetails(userId)
  } catch (error) {
    console.error("Error fetching user details:", error)
    return null
  }
}

export const fetchCompanyUsers = async (companyId: string): Promise<UserBasicDetails[]> => {
  try {
    return await getCompanyUsers(companyId)
  } catch (error) {
    console.error("Error fetching company users:", error)
    return []
  }
}

// Chat Settings Functions
export const fetchChatSettings = async (chatId: string): Promise<ChatSettings | null> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    return await getChatSettings(currentUser.uid, chatId)
  } catch (error) {
    console.error("Error fetching chat settings:", error)
    return null
  }
}

export const updateChatSettings = async (chatId: string, settings: Partial<ChatSettings>): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    await dbUpdateChatSettings(currentUser.uid, chatId, settings)
    return true
  } catch (error) {
    console.error("Error updating chat settings:", error)
    return false
  }
}

// Draft Functions
export const saveDraft = async (chatId: string, text: string, attachments?: Attachment[]): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    await saveDraftMessage(currentUser.uid, chatId, text, attachments)
    return true
  } catch (error) {
    console.error("Error saving draft:", error)
    return false
  }
}

export const getDraft = async (chatId: string): Promise<DraftMessage | null> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    return await getDraftMessage(currentUser.uid, chatId)
  } catch (error) {
    console.error("Error getting draft:", error)
    return null
  }
}

export const uploadAttachment = async (file: File, chatId: string): Promise<Attachment | null> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    return await dbUploadAttachment(file, chatId, currentUser.uid)
  } catch (error) {
    console.error("Error uploading attachment:", error)
    return null
  }
}

// Contact management functions using Realtime Database (without complex queries)
export const fetchUserContacts = async (): Promise<Contact[]> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Get all contacts and filter client-side
    const contactsRef = ref(db, `contacts`)
    const snapshot = await get(contactsRef)

    const contacts: Contact[] = []
    if (snapshot.exists()) {
      const contactsData = snapshot.val()
      for (const contactId in contactsData) {
        const contact = contactsData[contactId]
        if (contact.userId === currentUser.uid) {
          contacts.push({
            id: contactId,
            ...contact,
          } as Contact)
        }
      }
    }

    console.log("Fetched user contacts:", contacts)
    return contacts
  } catch (error) {
    console.error("Error fetching user contacts:", error)
    throw error
  }
}

export const fetchContactInvitations = async (): Promise<ContactInvitation[]> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Get all invitations and filter client-side
    const invitationsRef = ref(db, `contactInvitations`)
    const snapshot = await get(invitationsRef)

    const invitations: ContactInvitation[] = []
    if (snapshot.exists()) {
      const invitationsData = snapshot.val()
      for (const invitationId in invitationsData) {
        const invitation = invitationsData[invitationId]
        if (invitation.toUserId === currentUser.uid && invitation.status === "pending") {
          invitations.push({
            id: invitationId,
            ...invitation,
          } as ContactInvitation)
        }
      }
    }

    console.log("Fetched contact invitations:", invitations)
    return invitations
  } catch (error) {
    console.error("Error fetching contact invitations:", error)
    throw error
  }
}

export const sendContactInvitation = async (toUserId: string, message?: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if invitation already exists
    const invitationsRef = ref(db, `contactInvitations`)
    const snapshot = await get(invitationsRef)

    if (snapshot.exists()) {
      const invitationsData = snapshot.val()
      for (const invitationId in invitationsData) {
        const invitation = invitationsData[invitationId]
        if (
          invitation.fromUserId === currentUser.uid &&
          invitation.toUserId === toUserId &&
          invitation.status === "pending"
        ) {
          console.warn("Contact invitation already exists")
          return false
        }
      }
    }

    // Create new invitation
    const newInvitationRef = push(invitationsRef)
    const invitationData: Omit<ContactInvitation, "id"> = {
      fromUserId: currentUser.uid,
      toUserId,
      message: message || "",
      status: "pending",
      sentAt: new Date().toISOString(),
    }

    await set(newInvitationRef, invitationData)
    console.log("Contact invitation sent with ID:", newInvitationRef.key)
    return true
  } catch (error) {
    console.error("Error sending contact invitation:", error)
    return false
  }
}

export const acceptContactInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Get the invitation
    const invitationRef = ref(db, `contactInvitations/${invitationId}`)
    const invitationSnapshot = await get(invitationRef)

    if (!invitationSnapshot.exists()) {
      throw new Error("Invitation not found")
    }

    const invitationData = invitationSnapshot.val() as ContactInvitation

    // Update invitation status
    await update(invitationRef, {
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    })

    // Create contact relationships for both users
    const contactsRef = ref(db, `contacts`)

    // Contact for current user
    const contactRef1 = push(contactsRef)
    const contactData1: Omit<Contact, "id"> = {
      userId: currentUser.uid,
      contactUserId: invitationData.fromUserId,
      type: "saved",
      status: "accepted",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Contact for the inviter
    const contactRef2 = push(contactsRef)
    const contactData2: Omit<Contact, "id"> = {
      userId: invitationData.fromUserId,
      contactUserId: currentUser.uid,
      type: "saved",
      status: "accepted",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await Promise.all([set(contactRef1, contactData1), set(contactRef2, contactData2)])

    console.log("Contact invitation accepted and contacts created")
    return true
  } catch (error) {
    console.error("Error accepting contact invitation:", error)
    return false
  }
}

export const declineContactInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const invitationRef = ref(db, `contactInvitations/${invitationId}`)
    await update(invitationRef, {
      status: "declined",
      declinedAt: new Date().toISOString(),
    })

    console.log("Contact invitation declined")
    return true
  } catch (error) {
    console.error("Error declining contact invitation:", error)
    return false
  }
}

export const removeContact = async (contactId: string): Promise<boolean> => {
  try {
    const contactRef = ref(db, `contacts/${contactId}`)
    await remove(contactRef)

    console.log("Contact removed")
    return true
  } catch (error) {
    console.error("Error removing contact:", error)
    return false
  }
}

export const updateContact = async (contactId: string, updates: Partial<Contact>): Promise<boolean> => {
  try {
    const contactRef = ref(db, `contacts/${contactId}`)
    await update(contactRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    console.log("Contact updated")
    return true
  } catch (error) {
    console.error("Error updating contact:", error)
    return false
  }
}
