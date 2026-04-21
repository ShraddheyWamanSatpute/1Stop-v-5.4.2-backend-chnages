import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = { uid: string; email?: string }
type MessengerScope = { companyId: string; siteId?: string | null; subsiteId?: string | null; basePath: string }
type MessengerHandlerArgs = { req: any; res: any; path: string; body: any; user: AppAuthedUser }

const json = (res: any, status: number, body: any) => {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

const stripUndefinedDeep = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep)
  if (value && typeof value === "object") {
    const out: Record<string, any> = {}
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) continue
      out[key] = stripUndefinedDeep(child)
    }
    return out
  }
  return value
}

const firstQueryValue = (value: any): string | undefined => {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined
  return typeof value === "string" ? value : undefined
}

const normalizeBasePath = (raw: string): string => String(raw || "").trim().replace(/\/+$/, "")

const parseScope = (rawBasePath: string): MessengerScope => {
  const basePath = normalizeBasePath(rawBasePath)
  const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?$/i)
  if (!match) throw Object.assign(new Error("Invalid messenger basePath"), { status: 400 })
  return { companyId: match[1], siteId: match[2] || null, subsiteId: match[3] || null, basePath }
}

const getSupabaseConfig = () => {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "")
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  if (!url || !serviceRoleKey) {
    throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Messenger provider"), {
      status: 500,
    })
  }
  return { url, serviceRoleKey }
}

const supabaseRequest = async (path: string, init?: RequestInit) => {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw Object.assign(new Error(text || `Supabase request failed (${res.status})`), { status: 502 })
  }
  const text = await res.text().catch(() => "")
  return text ? JSON.parse(text) : null
}

const listRows = async (filters: Record<string, string | null | undefined>, order = "created_at.asc") => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("order", order)
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue
    params.set(key, `eq.${value}`)
  }
  return ((await supabaseRequest(`app_messenger_entities?${params.toString()}`, { method: "GET" })) as Array<any>) || []
}

const getRow = async (filters: Record<string, string>) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("limit", "1")
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  const rows = (await supabaseRequest(`app_messenger_entities?${params.toString()}`, { method: "GET" })) as Array<any>
  return rows?.[0] || null
}

const insertRow = async (row: any) => {
  const rows = (await supabaseRequest("app_messenger_entities", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  })) as Array<any>
  return rows?.[0] || null
}

const patchRow = async (rowId: string, patch: any) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("row_id", `eq.${rowId}`)
  const rows = (await supabaseRequest(`app_messenger_entities?${params.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(stripUndefinedDeep(patch)),
  })) as Array<any>
  return rows?.[0] || null
}

const deleteRow = async (rowId: string) => {
  const params = new URLSearchParams()
  params.set("row_id", `eq.${rowId}`)
  await supabaseRequest(`app_messenger_entities?${params.toString()}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })
}

const rowIdFor = (entityType: string, entityId: string, basePath?: string | null, userId?: string | null, secondaryId?: string | null) =>
  [entityType, basePath || "", userId || "", secondaryId || "", entityId].join("::")

const assertCompanyAccess = async (uid: string, companyId: string) => {
  const [userCompanySnap, ownedCompanySnap] = await Promise.all([
    adminDb.ref(`users/${uid}/companies/${companyId}`).get(),
    adminDb.ref(`companies/${companyId}/users/${uid}`).get(),
  ])
  if (!userCompanySnap.exists() && !ownedCompanySnap.exists()) throw Object.assign(new Error("Forbidden"), { status: 403 })
}

const assertSelfAccess = (actorUid: string, userId: string) => {
  if (actorUid !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 })
}

const normalizeRow = (row: any) => ({ ...(row?.payload || {}), id: String(row?.entity_id || row?.payload?.id || "") })

const createEntityRow = (params: {
  entityType: string
  entityId: string
  payload: any
  companyId?: string | null
  siteId?: string | null
  subsiteId?: string | null
  basePath?: string | null
  userId?: string | null
  secondaryId?: string | null
  existing?: any
  defaultStatus?: string
}) => {
  const now = Date.now()
  const cleaned = stripUndefinedDeep(params.payload || {})
  return {
    row_id: rowIdFor(params.entityType, params.entityId, params.basePath, params.userId, params.secondaryId),
    entity_type: params.entityType,
    entity_id: params.entityId,
    company_id: params.companyId || null,
    site_id: params.siteId || null,
    subsite_id: params.subsiteId || null,
    base_path: params.basePath || null,
    user_id: params.userId || null,
    secondary_id: params.secondaryId || null,
    name: String(cleaned?.name || cleaned?.title || cleaned?.messagePreview || cleaned?.senderName || cleaned?.contactUserId || cleaned?.text || params.entityId),
    status: String(cleaned?.status || params.defaultStatus || "active"),
    payload: { ...(params.existing?.payload || {}), ...cleaned, id: params.entityId },
    created_at: Number(params.existing?.created_at || cleaned?.createdAt || (cleaned?.timestamp ? Date.parse(String(cleaned.timestamp)) : now) || now),
    updated_at: now,
  }
}

const listMessagesForChat = async (basePath: string, chatId: string, limit = 50) =>
  (await listRows({ entity_type: "messages", base_path: basePath, secondary_id: chatId }, "created_at.asc"))
    .map(normalizeRow)
    .slice(-limit)

const updateChatLastMessage = async (basePath: string, chatId: string, message: any) => {
  const existing = await getRow({ entity_type: "chats", base_path: basePath, entity_id: chatId })
  if (!existing) return
  const next = createEntityRow({
    entityType: "chats",
    entityId: chatId,
    basePath,
    companyId: existing.company_id,
    siteId: existing.site_id,
    subsiteId: existing.subsite_id,
    payload: {
      ...existing.payload,
      lastMessage: {
        id: String(message?.id || ""),
        text: String(message?.text || ""),
        timestamp: String(message?.timestamp || new Date().toISOString()),
        senderId: String(message?.senderId || message?.uid || ""),
        senderName: `${String(message?.firstName || "")} ${String(message?.lastName || "")}`.trim(),
      },
      updatedAt: String(message?.timestamp || new Date().toISOString()),
    },
    existing,
  })
  await patchRow(existing.row_id, next)
}

export const handleMessengerDataRequest = async ({ req, res, path, body, user }: MessengerHandlerArgs) => {
  try {
    const method = String(req.method || "GET").toUpperCase()

    if (method === "GET" && path === "/data/messenger/chats/user") {
      const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
      const userId = String(firstQueryValue(req.query?.userId) || user.uid).trim()
      await assertCompanyAccess(user.uid, scope.companyId)
      const rows = (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
        .map(normalizeRow)
        .filter((chat: any) => Array.isArray(chat?.participants) && (chat.participants.includes(userId) || chat.createdBy === userId))
      json(res, 200, { ok: true, rows })
      return
    }

    if (method === "GET" && path === "/data/messenger/chats/company") {
      const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
      await assertCompanyAccess(user.uid, scope.companyId)
      json(res, 200, {
        ok: true,
        rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
          .map(normalizeRow)
          .filter((chat: any) => chat.type === "company"),
      })
      return
    }

    if (method === "GET" && path === "/data/messenger/chats/site") {
      const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
      const siteId = String(firstQueryValue(req.query?.siteId) || "").trim()
      await assertCompanyAccess(user.uid, scope.companyId)
      json(res, 200, {
        ok: true,
        rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
          .map(normalizeRow)
          .filter((chat: any) => chat.siteId === siteId || chat.subsiteId === siteId),
      })
      return
    }

    if (method === "GET" && path === "/data/messenger/chats/department") {
      const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
      const departmentId = String(firstQueryValue(req.query?.departmentId) || "").trim()
      await assertCompanyAccess(user.uid, scope.companyId)
      json(res, 200, {
        ok: true,
        rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
          .map(normalizeRow)
          .filter((chat: any) => chat.departmentId === departmentId),
      })
      return
    }

    if (method === "GET" && path === "/data/messenger/chats/role") {
      const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
      const roleId = String(firstQueryValue(req.query?.roleId) || "").trim()
      await assertCompanyAccess(user.uid, scope.companyId)
      json(res, 200, {
        ok: true,
        rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
          .map(normalizeRow)
          .filter((chat: any) => chat.roleId === roleId),
      })
      return
    }

    if (path === "/data/messenger/chats") {
      if (method === "GET") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        const chatId = String(firstQueryValue(req.query?.chatId) || "").trim()
        await assertCompanyAccess(user.uid, scope.companyId)
        if (chatId) {
          const row = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId })
          json(res, 200, { ok: true, row: row ? normalizeRow(row) : null })
          return
        }
        json(res, 200, { ok: true, rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc")).map(normalizeRow) })
        return
      }

      if (method === "POST") {
        const scope = parseScope(String(body?.basePath || ""))
        await assertCompanyAccess(user.uid, scope.companyId)
        const entityId = String(body?.data?.id || randomUUID())
        const row = createEntityRow({ entityType: "chats", entityId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload: body?.data || {} })
        await insertRow(row)
        json(res, 200, { ok: true, row: normalizeRow(row), id: entityId })
        return
      }
    }

    const chatByIdMatch = path.match(/^\/data\/messenger\/chats\/([^/]+)$/)
    if (chatByIdMatch) {
      const chatId = decodeURIComponent(chatByIdMatch[1])
      if (method === "PATCH") {
        const scope = parseScope(String(body?.basePath || ""))
        await assertCompanyAccess(user.uid, scope.companyId)
        const existing = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId })
        if (!existing) throw Object.assign(new Error("Chat not found"), { status: 404 })
        const row = createEntityRow({ entityType: "chats", entityId: chatId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload: { ...existing.payload, ...(body?.updates || {}) }, existing })
        await patchRow(existing.row_id, row)
        json(res, 200, { ok: true, row: normalizeRow(row) })
        return
      }

      if (method === "DELETE") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        await assertCompanyAccess(user.uid, scope.companyId)
        const row = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId })
        if (row) await deleteRow(row.row_id)
        const messageRows = await listRows({ entity_type: "messages", base_path: scope.basePath, secondary_id: chatId })
        for (const messageRow of messageRows) await deleteRow(messageRow.row_id)
        json(res, 200, { ok: true })
        return
      }
    }

    if (path === "/data/messenger/messages") {
      if (method === "GET") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        const chatId = String(firstQueryValue(req.query?.chatId) || "").trim()
        const limit = Number(firstQueryValue(req.query?.limit) || 50)
        await assertCompanyAccess(user.uid, scope.companyId)
        json(res, 200, { ok: true, rows: await listMessagesForChat(scope.basePath, chatId, Number.isFinite(limit) ? limit : 50) })
        return
      }

      if (method === "POST") {
        const scope = parseScope(String(body?.basePath || ""))
        await assertCompanyAccess(user.uid, scope.companyId)
        const chatId = String(body?.data?.chatId || "").trim()
        const entityId = String(body?.data?.id || randomUUID())
        const row = createEntityRow({
          entityType: "messages",
          entityId,
          secondaryId: chatId,
          basePath: scope.basePath,
          companyId: scope.companyId,
          siteId: scope.siteId,
          subsiteId: scope.subsiteId,
          payload: { ...(body?.data || {}), timestamp: body?.data?.timestamp || new Date().toISOString() },
          defaultStatus: "sent",
        })
        await insertRow(row)
        await updateChatLastMessage(scope.basePath, chatId, row.payload)
        json(res, 200, { ok: true, row: normalizeRow(row), id: entityId })
        return
      }
    }

    if (method === "POST" && path === "/data/messenger/messages/search") {
      const scope = parseScope(String(body?.basePath || ""))
      const term = String(body?.query || "").toLowerCase()
      const userId = String(body?.userId || user.uid).trim()
      const chatId = String(body?.chatId || "").trim()
      await assertCompanyAccess(user.uid, scope.companyId)

      let rows = chatId
        ? await listMessagesForChat(scope.basePath, chatId, 2000)
        : (await listRows({ entity_type: "messages", base_path: scope.basePath }, "created_at.asc")).map(normalizeRow)

      if (!chatId) {
        const allowedChats = (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
          .map(normalizeRow)
          .filter((chat: any) => Array.isArray(chat?.participants) && (chat.participants.includes(userId) || chat.createdBy === userId))
        const allowedIds = new Set(allowedChats.map((chat: any) => String(chat.id)))
        rows = rows.filter((message: any) => allowedIds.has(String(message.chatId)))
      }

      json(res, 200, { ok: true, rows: rows.filter((message: any) => String(message?.text || "").toLowerCase().includes(term)) })
      return
    }

    const messageActionMatch = path.match(/^\/data\/messenger\/messages\/([^/]+)\/(read|reactions|edit|delete|pin|unpin)$/)
    if (messageActionMatch && method === "PATCH") {
      const messageId = decodeURIComponent(messageActionMatch[1])
      const action = messageActionMatch[2]
      const scope = parseScope(String(body?.basePath || ""))
      const chatId = String(body?.chatId || "").trim()
      await assertCompanyAccess(user.uid, scope.companyId)
      const existing = await getRow({ entity_type: "messages", base_path: scope.basePath, secondary_id: chatId, entity_id: messageId })
      if (!existing) throw Object.assign(new Error("Message not found"), { status: 404 })

      const payload = { ...(existing.payload || {}) }
      if (action === "read") {
        const readBy = Array.isArray(payload.readBy) ? [...payload.readBy] : []
        const userId = String(body?.userId || user.uid).trim()
        if (!readBy.includes(userId)) readBy.push(userId)
        payload.readBy = readBy
      }
      if (action === "reactions") {
        const emoji = String(body?.emoji || "").trim()
        const userId = String(body?.userId || user.uid).trim()
        const reactions = payload.reactions && typeof payload.reactions === "object" ? { ...payload.reactions } : {}
        const current = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : []
        const next = body?.add ? Array.from(new Set([...current, userId])) : current.filter((id: string) => id !== userId)
        if (next.length) reactions[emoji] = next
        else delete reactions[emoji]
        payload.reactions = reactions
      }
      if (action === "edit") {
        const actorId = String(body?.userId || user.uid).trim()
        if (String(payload.senderId || payload.uid || "") !== actorId) throw Object.assign(new Error("Only the author can edit this message"), { status: 403 })
        const editHistory = Array.isArray(payload.editHistory) ? [...payload.editHistory] : []
        editHistory.push({ text: payload.text, timestamp: new Date().toISOString() })
        payload.text = String(body?.newText || "")
        payload.isEdited = true
        payload.editHistory = editHistory
      }
      if (action === "delete") {
        const actorId = String(body?.userId || user.uid).trim()
        if (String(payload.senderId || payload.uid || "") !== actorId) throw Object.assign(new Error("Only the author can delete this message"), { status: 403 })
        payload.isDeleted = true
        payload.text = "This message was deleted"
        payload.attachments = null
      }
      if (action === "pin") payload.isPinned = true
      if (action === "unpin") payload.isPinned = false

      const row = createEntityRow({ entityType: "messages", entityId: messageId, secondaryId: chatId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload, existing, defaultStatus: "sent" })
      await patchRow(existing.row_id, row)

      if (action === "pin" || action === "unpin") {
        const chatRow = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId })
        if (chatRow) {
          const pinned = new Set<string>(Array.isArray(chatRow.payload?.pinnedMessages) ? chatRow.payload.pinnedMessages : [])
          if (action === "pin") pinned.add(messageId)
          else pinned.delete(messageId)
          const nextChat = createEntityRow({ entityType: "chats", entityId: chatId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload: { ...chatRow.payload, pinnedMessages: Array.from(pinned) }, existing: chatRow })
          await patchRow(chatRow.row_id, nextChat)
        }
      }

      if (action === "edit" || action === "delete") await updateChatLastMessage(scope.basePath, chatId, row.payload)
      json(res, 200, { ok: true, row: normalizeRow(row) })
      return
    }

    if (path === "/data/messenger/categories") {
      if (method === "GET") {
        const companyId = String(firstQueryValue(req.query?.companyId) || "").trim()
        await assertCompanyAccess(user.uid, companyId)
        json(res, 200, { ok: true, rows: (await listRows({ entity_type: "categories", company_id: companyId }, "created_at.asc")).map(normalizeRow) })
        return
      }

      if (method === "POST") {
        const companyId = String(body?.companyId || body?.data?.companyId || "").trim()
        await assertCompanyAccess(user.uid, companyId)
        const entityId = String(body?.data?.id || randomUUID())
        const row = createEntityRow({ entityType: "categories", entityId, companyId, payload: body?.data || {} })
        await insertRow(row)
        json(res, 200, { ok: true, row: normalizeRow(row), id: entityId })
        return
      }
    }

    const categoryMatch = path.match(/^\/data\/messenger\/categories\/([^/]+)$/)
    if (categoryMatch) {
      const categoryId = decodeURIComponent(categoryMatch[1])
      const companyId = String(method === "DELETE" ? firstQueryValue(req.query?.companyId) || "" : body?.companyId || "").trim()
      await assertCompanyAccess(user.uid, companyId)

      if (method === "PATCH") {
        const existing = await getRow({ entity_type: "categories", company_id: companyId, entity_id: categoryId })
        if (!existing) throw Object.assign(new Error("Category not found"), { status: 404 })
        const row = createEntityRow({ entityType: "categories", entityId: categoryId, companyId, payload: { ...existing.payload, ...(body?.updates || {}) }, existing })
        await patchRow(existing.row_id, row)
        json(res, 200, { ok: true, row: normalizeRow(row) })
        return
      }

      if (method === "DELETE") {
        const existing = await getRow({ entity_type: "categories", company_id: companyId, entity_id: categoryId })
        if (existing) await deleteRow(existing.row_id)
        const chats = await listRows({ entity_type: "chats", company_id: companyId }, "updated_at.desc")
        for (const chatRow of chats) {
          if (String(chatRow?.payload?.categoryId || "") !== categoryId) continue
          const next = createEntityRow({
            entityType: "chats",
            entityId: String(chatRow.entity_id),
            companyId,
            siteId: chatRow.site_id,
            subsiteId: chatRow.subsite_id,
            basePath: chatRow.base_path,
            payload: { ...chatRow.payload, categoryId: null },
            existing: chatRow,
          })
          await patchRow(chatRow.row_id, next)
        }
        json(res, 200, { ok: true })
        return
      }
    }

    if (path === "/data/messenger/statuses") {
      if (method === "GET") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        const userId = String(firstQueryValue(req.query?.userId) || "").trim()
        await assertCompanyAccess(user.uid, scope.companyId)
        const row = await getRow({ entity_type: "userStatuses", base_path: scope.basePath, user_id: userId, entity_id: userId })
        json(res, 200, { ok: true, row: row ? normalizeRow(row) : null })
        return
      }

      if (method === "PUT") {
        const scope = parseScope(String(body?.basePath || ""))
        const userId = String(body?.userId || user.uid).trim()
        await assertCompanyAccess(user.uid, scope.companyId)
        const existing = await getRow({ entity_type: "userStatuses", base_path: scope.basePath, user_id: userId, entity_id: userId })
        const row = createEntityRow({
          entityType: "userStatuses",
          entityId: userId,
          userId,
          basePath: scope.basePath,
          companyId: scope.companyId,
          siteId: scope.siteId,
          subsiteId: scope.subsiteId,
          payload: { status: body?.status, lastSeen: new Date().toISOString(), customStatus: body?.customStatus },
          existing,
        })
        if (existing) await patchRow(existing.row_id, row)
        else await insertRow(row)
        json(res, 200, { ok: true, row: normalizeRow(row) })
        return
      }
    }

    if (path === "/data/messenger/chatSettings") {
      const userId = String(method === "GET" ? firstQueryValue(req.query?.userId) || "" : body?.userId || "").trim()
      const chatId = String(method === "GET" ? firstQueryValue(req.query?.chatId) || "" : body?.chatId || "").trim()
      assertSelfAccess(user.uid, userId)

      if (method === "GET") {
        const row = await getRow({ entity_type: "chatSettings", user_id: userId, secondary_id: chatId, entity_id: chatId })
        json(res, 200, { ok: true, row: row ? normalizeRow(row) : null })
        return
      }

      if (method === "PATCH") {
        const existing = await getRow({ entity_type: "chatSettings", user_id: userId, secondary_id: chatId, entity_id: chatId })
        const row = createEntityRow({
          entityType: "chatSettings",
          entityId: chatId,
          userId,
          secondaryId: chatId,
          payload: { userId, chatId, isMuted: false, isStarred: false, isPinned: false, notificationLevel: "all", ...(existing?.payload || {}), ...(body?.settings || {}) },
          existing,
        })
        if (existing) await patchRow(existing.row_id, row)
        else await insertRow(row)
        json(res, 200, { ok: true, row: normalizeRow(row) })
        return
      }
    }

    if (path === "/data/messenger/drafts") {
      const userId = String(method === "GET" || method === "DELETE" ? firstQueryValue(req.query?.userId) || "" : body?.userId || "").trim()
      const chatId = String(method === "GET" || method === "DELETE" ? firstQueryValue(req.query?.chatId) || "" : body?.chatId || "").trim()
      assertSelfAccess(user.uid, userId)

      if (method === "GET") {
        const row = await getRow({ entity_type: "drafts", user_id: userId, secondary_id: chatId, entity_id: chatId })
        json(res, 200, { ok: true, row: row ? normalizeRow(row) : null })
        return
      }

      if (method === "PUT") {
        const existing = await getRow({ entity_type: "drafts", user_id: userId, secondary_id: chatId, entity_id: chatId })
        const row = createEntityRow({
          entityType: "drafts",
          entityId: chatId,
          userId,
          secondaryId: chatId,
          payload: { userId, chatId, text: body?.text || "", attachments: body?.attachments, lastUpdated: new Date().toISOString() },
          existing,
        })
        if (existing) await patchRow(existing.row_id, row)
        else await insertRow(row)
        json(res, 200, { ok: true, row: normalizeRow(row) })
        return
      }

      if (method === "DELETE") {
        const existing = await getRow({ entity_type: "drafts", user_id: userId, secondary_id: chatId, entity_id: chatId })
        if (existing) await deleteRow(existing.row_id)
        json(res, 200, { ok: true })
        return
      }
    }

    if (method === "GET" && path === "/data/messenger/notifications") {
      const userId = String(firstQueryValue(req.query?.userId) || "").trim()
      assertSelfAccess(user.uid, userId)
      json(res, 200, { ok: true, rows: (await listRows({ entity_type: "notifications", user_id: userId }, "created_at.desc")).map(normalizeRow) })
      return
    }

    if (method === "PATCH" && path === "/data/messenger/notifications/readAll") {
      const userId = String(body?.userId || "").trim()
      assertSelfAccess(user.uid, userId)
      const rows = await listRows({ entity_type: "notifications", user_id: userId }, "created_at.asc")
      for (const row of rows) {
        const next = createEntityRow({ entityType: "notifications", entityId: String(row.entity_id), userId, payload: { ...(row.payload || {}), isRead: true }, existing: row })
        await patchRow(row.row_id, next)
      }
      json(res, 200, { ok: true })
      return
    }

    const notificationMatch = path.match(/^\/data\/messenger\/notifications\/([^/]+)\/read$/)
    if (notificationMatch && method === "PATCH") {
      const notificationId = decodeURIComponent(notificationMatch[1])
      const userId = String(body?.userId || "").trim()
      assertSelfAccess(user.uid, userId)
      const row = await getRow({ entity_type: "notifications", user_id: userId, entity_id: notificationId })
      if (!row) throw Object.assign(new Error("Notification not found"), { status: 404 })
      const next = createEntityRow({ entityType: "notifications", entityId: notificationId, userId, payload: { ...(row.payload || {}), isRead: true }, existing: row })
      await patchRow(row.row_id, next)
      json(res, 200, { ok: true })
      return
    }

    if (path === "/data/messenger/contacts") {
      if (method === "GET") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        await assertCompanyAccess(user.uid, scope.companyId)
        json(res, 200, { ok: true, rows: (await listRows({ entity_type: "contacts", base_path: scope.basePath }, "created_at.asc")).map(normalizeRow) })
        return
      }

      if (method === "POST") {
        const scope = parseScope(String(body?.basePath || ""))
        await assertCompanyAccess(user.uid, scope.companyId)
        const entityId = String(body?.data?.id || randomUUID())
        const row = createEntityRow({ entityType: "contacts", entityId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, userId: body?.data?.userId || null, payload: body?.data || {} })
        await insertRow(row)
        json(res, 200, { ok: true, row: normalizeRow(row), id: entityId })
        return
      }
    }

    const contactMatch = path.match(/^\/data\/messenger\/contacts\/([^/]+)$/)
    if (contactMatch) {
      const contactId = decodeURIComponent(contactMatch[1])
      if (method === "PATCH") {
        const scope = parseScope(String(body?.basePath || ""))
        await assertCompanyAccess(user.uid, scope.companyId)
        const existing = await getRow({ entity_type: "contacts", base_path: scope.basePath, entity_id: contactId })
        if (!existing) throw Object.assign(new Error("Contact not found"), { status: 404 })
        const row = createEntityRow({ entityType: "contacts", entityId: contactId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, userId: existing.user_id, payload: { ...existing.payload, ...(body?.updates || {}) }, existing })
        await patchRow(existing.row_id, row)
        json(res, 200, { ok: true, row: normalizeRow(row) })
        return
      }

      if (method === "DELETE") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        await assertCompanyAccess(user.uid, scope.companyId)
        const existing = await getRow({ entity_type: "contacts", base_path: scope.basePath, entity_id: contactId })
        if (existing) await deleteRow(existing.row_id)
        json(res, 200, { ok: true })
        return
      }
    }

    json(res, 404, { error: `Unhandled messenger route: ${method} ${path}` })
  } catch (error: any) {
    json(res, error?.status || 500, { error: error?.message || "Unexpected messenger data error" })
  }
}
