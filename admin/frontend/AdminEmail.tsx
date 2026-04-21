import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Box } from "@mui/material"
import {
  Inbox as InboxIcon,
  Outbox as OutboxIcon,
  Settings as SettingsIcon,
  Help as GuideIcon,
} from "@mui/icons-material"
import { useAdmin } from "../backend/context/AdminContext"
import { APP_KEYS, getFunctionsBaseUrl, getFunctionsFetchBaseUrl } from "../backend/config/keys"
import { db, onValue, push, ref, remove, set, update } from "../backend/services/Firebase"
import CollapsibleTabHeader from "../../app/frontend/components/reusable/CollapsibleTabHeader"
import EmailInbox from "./email/EmailInbox"
import EmailOutbox from "./email/EmailOutbox"
import EmailCompose from "./email/EmailCompose"
import EmailMessageView from "./email/EmailMessageView"
import EmailSettings from "./email/EmailSettings"
import GoogleCalendarSettings from "./email/GoogleCalendarSettings"
import EmailSetupGuide from "./email/EmailSetupGuide"
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell"
import type {
  EmailMessage,
  OutboxItem,
  EmailProvider,
  EmailDirection,
  OutboxStatus,
  GmailAppPasswordConfig,
  EmailAccountConfig,
  GoogleCalendarConfig,
  ComposeState,
} from "./email/types"

type TabKey = "inbox" | "outbox" | "settings" | "guide"

const AdminEmail: React.FC = () => {
  const { state } = useAdmin()
  const companyId = "admin"
  const uid = state.user?.uid || ""

  // --- Tab state ---
  const [tab, setTab] = useState<TabKey>("inbox")
  const [isTabsExpanded, setIsTabsExpanded] = useState(true)

  // --- Data state ---
  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [outbox, setOutbox] = useState<OutboxItem[]>([])
  const [oauthStatus, setOauthStatus] = useState<{ gmail?: any; outlook?: any } | null>(null)
  const [accounts, setAccounts] = useState<EmailAccountConfig[]>([])
  const [calendarConfig, setCalendarConfig] = useState<GoogleCalendarConfig | null>(null)
  const [gmailMailbox, setGmailMailbox] = useState<GmailAppPasswordConfig>({
    email: "",
    senderName: "1Stop Admin",
    appPassword: "",
  })
  const isLocalProxy = getFunctionsFetchBaseUrl({
    projectId: APP_KEYS.firebase.projectId,
    region: APP_KEYS.firebase.functionsRegion,
  }).startsWith("/api/functions")

  // --- Compose state ---
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose")
  const [composeInitial, setComposeInitial] = useState<Partial<ComposeState>>({})
  const [composeReplyTo, setComposeReplyTo] = useState<EmailMessage | null>(null)
  const [composeForwardFrom, setComposeForwardFrom] = useState<EmailMessage | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string>("")

  // --- Message view state ---
  const [viewingMessageId, setViewingMessageId] = useState<string | null>(null)
  const [viewingSource, setViewingSource] = useState<"inbox" | "outbox">("inbox")
  const normalizeAppPassword = useCallback((value: string) => value.replace(/\s+/g, "").trim(), [])

  // Keep the viewed message always in sync with the live data arrays
  const viewingMessage = useMemo((): EmailMessage | null => {
    if (!viewingMessageId) return null
    if (viewingSource === "inbox") {
      return messages.find((m) => m.id === viewingMessageId) || null
    }
    // For outbox items, derive from live outbox array
    const item = outbox.find((o) => o.id === viewingMessageId)
    if (!item) return null
    return {
      id: item.id,
      direction: "outbound" as EmailDirection,
      from: selectedAccount || gmailMailbox.email || "",
      to: item.to,
      cc: item.cc,
      bcc: item.bcc,
      subject: item.subject,
      body: item.body,
      bodyHtml: item.bodyHtml,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }, [viewingMessageId, viewingSource, messages, outbox, selectedAccount, gmailMailbox.email])

  // --- Account colors (derived) ---
  const accountColors = useMemo(() => {
    const map: Record<string, string> = {}
    accounts.forEach((a) => { map[a.email] = a.color })
    return map
  }, [accounts])

  // ========== FIREBASE SUBSCRIPTIONS ==========

  useEffect(() => {
    if (!uid) return
    const msgRef = ref(db, `admin/email/users/${uid}/messages`)
    const outRef = ref(db, `admin/email/users/${uid}/outbox`)
    const accRef = ref(db, `admin/email/users/${uid}/emailAccounts`)
    const calRef = ref(db, `admin/email/users/${uid}/googleCalendarConfig`)

    const unsubMsg = onValue(msgRef, (snap) => {
      const val = snap.val() || {}
      const rows: EmailMessage[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        threadId: raw?.threadId || undefined,
        direction: (raw?.direction as EmailDirection) || "inbound",
        from: raw?.from || "",
        fromName: raw?.fromName || "",
        to: raw?.to || "",
        cc: raw?.cc || "",
        bcc: raw?.bcc || "",
        replyTo: raw?.replyTo || "",
        subject: raw?.subject || "",
        bodyPreview: raw?.bodyPreview || "",
        body: raw?.body || "",
        bodyHtml: raw?.bodyHtml || "",
        receivedAt: raw?.receivedAt || undefined,
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
        read: raw?.read ?? false,
        starred: raw?.starred ?? false,
        important: raw?.important ?? false,
        labels: raw?.labels || [],
        attachments: raw?.attachments || [],
        inReplyTo: raw?.inReplyTo || "",
        parentMessageId: raw?.parentMessageId || "",
      }))
      rows.sort((a, b) => (b.receivedAt || b.updatedAt) - (a.receivedAt || a.updatedAt))
      setMessages(rows)
    })

    const unsubOut = onValue(outRef, (snap) => {
      const val = snap.val() || {}
      const rows: OutboxItem[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        to: raw?.to || "",
        cc: raw?.cc || "",
        bcc: raw?.bcc || "",
        subject: raw?.subject || "",
        body: raw?.body || "",
        bodyHtml: raw?.bodyHtml || "",
        status: (raw?.status as OutboxStatus) || "queued",
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
        createdBy: raw?.createdBy || "",
        error: raw?.error || "",
        attachments: raw?.attachments || [],
        inReplyTo: raw?.inReplyTo || "",
        parentMessageId: raw?.parentMessageId || "",
        scheduledAt: raw?.scheduledAt || undefined,
      }))
      rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      setOutbox(rows)
    })

    const unsubAcc = onValue(accRef, (snap) => {
      const val = snap.val() || {}
      const rows: EmailAccountConfig[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        provider: raw?.provider || "gmail",
        email: raw?.email || "",
        displayName: raw?.displayName || "",
        color: raw?.color || "#4285f4",
        signature: raw?.signature || "",
        isDefault: raw?.isDefault ?? false,
        connected: raw?.connected ?? false,
        lastSyncAt: raw?.lastSyncAt || undefined,
        appPasswordConfigured: raw?.appPasswordConfigured ?? false,
      }))
      setAccounts(rows)
      if (!selectedAccount && rows.length) {
        const def = rows.find((r) => r.isDefault) || rows[0]
        setSelectedAccount(def.email)
      }
    })

    const unsubCal = onValue(calRef, (snap) => {
      const val = snap.val()
      if (val) {
        setCalendarConfig({
          email: val.email || "",
          appPassword: "",
          calendarId: val.calendarId || "",
          syncEnabled: val.syncEnabled ?? true,
          syncInterval: val.syncInterval || 15,
          color: val.color || "#4285f4",
          lastSyncAt: val.lastSyncAt || undefined,
          lastSyncRequestedAt: val.lastSyncRequestedAt || undefined,
          syncStatus: val.syncStatus || "idle",
          updatedAt: val.updatedAt || undefined,
        })
      } else {
        setCalendarConfig(null)
      }
    })

    return () => { unsubMsg(); unsubOut(); unsubAcc(); unsubCal() }
  }, [uid])

  // Load Gmail App Password config
  useEffect(() => {
    if (!uid) return
    const cfgRef = ref(db, `admin/email/users/${uid}/gmailAppPasswordConfig`)
    const unsub = onValue(cfgRef, (snap) => {
      const v = snap.val() || {}
      setGmailMailbox((prev) => ({
        email: String(v?.email || prev.email || ""),
        senderName: String(v?.senderName || prev.senderName || "1Stop Admin"),
        appPassword: "",
        updatedAt: typeof v?.updatedAt === "number" ? v.updatedAt : prev.updatedAt,
      }))
    })
    return () => unsub()
  }, [uid])

  // ========== OAuth / Sync ==========

  const refreshOAuth = useCallback(async () => {
    if (isLocalProxy) {
      setOauthStatus(null)
      return
    }
    const fnBase = getFunctionsFetchBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const url = new URL(`${fnBase}/checkOAuthStatus`, window.location.origin)
    url.searchParams.set("company_id", companyId)
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    if (uid) url.searchParams.set("user_id", uid)
    try {
      const resp = await fetch(url.toString())
      const data = await resp.json()
      setOauthStatus(data)
    } catch {
      setOauthStatus(null)
    }
  }, [companyId, uid, isLocalProxy])

  useEffect(() => {
    refreshOAuth()
  }, [refreshOAuth])

  const beginOAuth = useCallback((provider: EmailProvider) => {
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const endpoint = provider === "gmail" ? "oauthGoogle" : "oauthOutlook"
    const url = new URL(`${fnBase}/${endpoint}`)
    url.searchParams.set("company_id", companyId)
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    if (uid) url.searchParams.set("user_id", uid)
    // Send full origin so the callback can redirect back to this app, not the Cloud Functions host
    url.searchParams.set("return_url", `${window.location.origin}/Email`)
    window.location.href = url.toString()
  }, [companyId, uid])

  const disconnectProvider = useCallback(async (provider: EmailProvider) => {
    if (isLocalProxy) return
    const fnBase = getFunctionsFetchBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const url = new URL(`${fnBase}/disconnectOAuth`, window.location.origin)
    url.searchParams.set("company_id", companyId)
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    url.searchParams.set("provider", provider)
    if (uid) url.searchParams.set("user_id", uid)
    await fetch(url.toString())
    await refreshOAuth()
  }, [companyId, uid, refreshOAuth, isLocalProxy])

  const syncInbox = useCallback(async (provider: EmailProvider) => {
    if (isLocalProxy) return
    const fnBase = getFunctionsFetchBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const url = new URL(`${fnBase}/syncEmailInbox`, window.location.origin)
    url.searchParams.set("company_id", companyId)
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    url.searchParams.set("provider", provider)
    if (uid) url.searchParams.set("user_id", uid)
    await fetch(url.toString())
  }, [companyId, uid, isLocalProxy])

  const syncAllInboxes = useCallback(async () => {
    await syncInbox("gmail")
    await syncInbox("outlook")
  }, [syncInbox])

  // ========== MESSAGE ACTIONS ==========

  const handleToggleStar = useCallback(async (id: string, starred: boolean) => {
    if (!uid) return
    await update(ref(db, `admin/email/users/${uid}/messages/${id}`), { starred, updatedAt: Date.now() })
  }, [uid])

  const handleToggleRead = useCallback(async (ids: string[], read: boolean) => {
    if (!uid) return
    const now = Date.now()
    const updates: Record<string, any> = {}
    ids.forEach((id) => { updates[`admin/email/users/${uid}/messages/${id}/read`] = read; updates[`admin/email/users/${uid}/messages/${id}/updatedAt`] = now })
    await update(ref(db), updates)
  }, [uid])

  const handleDeleteMessages = useCallback(async (ids: string[]) => {
    if (!uid) return
    for (const id of ids) {
      await remove(ref(db, `admin/email/users/${uid}/messages/${id}`))
    }
  }, [uid])

  const handleArchiveMessages = useCallback(async (ids: string[]) => {
    if (!uid) return
    const now = Date.now()
    const updates: Record<string, any> = {}
    ids.forEach((id) => {
      updates[`admin/email/users/${uid}/messages/${id}/labels`] = ["archived"]
      updates[`admin/email/users/${uid}/messages/${id}/updatedAt`] = now
    })
    await update(ref(db), updates)
  }, [uid])

  const handleLabelMessages = useCallback(async (ids: string[], label: string) => {
    if (!uid) return
    for (const id of ids) {
      const msg = messages.find((m) => m.id === id)
      const existing = msg?.labels || []
      const newLabels = existing.includes(label) ? existing : [...existing, label]
      await update(ref(db, `admin/email/users/${uid}/messages/${id}`), { labels: newLabels, updatedAt: Date.now() })
    }
  }, [uid, messages])

  const handleMarkSpam = useCallback(async (ids: string[]) => {
    if (!uid) return
    const now = Date.now()
    const updates: Record<string, any> = {}
    ids.forEach((id) => {
      updates[`admin/email/users/${uid}/messages/${id}/labels`] = ["spam"]
      updates[`admin/email/users/${uid}/messages/${id}/updatedAt`] = now
    })
    await update(ref(db), updates)
  }, [uid])

  // ========== COMPOSE / OUTBOX ACTIONS ==========

  const openComposeNew = useCallback(() => {
    setComposeMode("compose")
    setComposeInitial({})
    setComposeReplyTo(null)
    setComposeForwardFrom(null)
    setComposeOpen(true)
  }, [])

  const openReply = useCallback((m: EmailMessage) => {
    setComposeMode("reply")
    const to = m.direction === "inbound" ? m.from : m.to
    const subj = m.subject?.startsWith("Re:") ? m.subject : `Re: ${m.subject || ""}`
    const quotedBody = `\n\n--- Original message ---\nFrom: ${m.from}\nDate: ${new Date(m.receivedAt || m.updatedAt).toLocaleString()}\n\n${m.body || m.bodyPreview || ""}`
    setComposeInitial({ to, subject: subj, body: quotedBody, inReplyTo: m.id, parentMessageId: m.id })
    setComposeReplyTo(m)
    setComposeForwardFrom(null)
    setViewingMessageId(null)
    setComposeOpen(true)
  }, [])

  const openReplyAll = useCallback((m: EmailMessage) => {
    setComposeMode("reply")
    const to = m.direction === "inbound" ? m.from : m.to
    const subj = m.subject?.startsWith("Re:") ? m.subject : `Re: ${m.subject || ""}`
    const quotedBody = `\n\n--- Original message ---\nFrom: ${m.from}\nDate: ${new Date(m.receivedAt || m.updatedAt).toLocaleString()}\n\n${m.body || m.bodyPreview || ""}`
    setComposeInitial({ to, cc: m.cc || "", subject: subj, body: quotedBody, showCc: Boolean(m.cc), inReplyTo: m.id, parentMessageId: m.id })
    setComposeReplyTo(m)
    setComposeForwardFrom(null)
    setViewingMessageId(null)
    setComposeOpen(true)
  }, [])

  const openForward = useCallback((m: EmailMessage) => {
    setComposeMode("forward")
    const subj = m.subject?.startsWith("Fwd:") ? m.subject : `Fwd: ${m.subject || ""}`
    const fwdBody = `\n\n--- Forwarded message ---\nFrom: ${m.from}\nTo: ${m.to}\nDate: ${new Date(m.receivedAt || m.updatedAt).toLocaleString()}\nSubject: ${m.subject || ""}\n\n${m.body || m.bodyPreview || ""}`
    setComposeInitial({ subject: subj, body: fwdBody, parentMessageId: m.id })
    setComposeForwardFrom(m)
    setComposeReplyTo(null)
    setViewingMessageId(null)
    setComposeOpen(true)
  }, [])

  const handleSendEmail = useCallback(async (compose: ComposeState) => {
    if (!compose.to.trim()) return
    if (!uid) return
    const now = Date.now()
    const outRef = ref(db, `admin/email/users/${uid}/outbox`)
    const newRef = push(outRef)
    await set(newRef, {
      to: compose.to.trim(),
      cc: compose.cc?.trim() || "",
      bcc: compose.bcc?.trim() || "",
      subject: compose.subject.trim(),
      body: compose.body,
      bodyHtml: compose.bodyHtml || "",
      status: "queued",
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      inReplyTo: compose.inReplyTo || "",
      parentMessageId: compose.parentMessageId || "",
    })
  }, [uid])

  const handleSaveDraft = useCallback(async (compose: ComposeState) => {
    if (!uid) return
    const now = Date.now()
    const outRef = ref(db, `admin/email/users/${uid}/outbox`)
    const newRef = push(outRef)
    await set(newRef, {
      to: compose.to.trim(),
      cc: compose.cc?.trim() || "",
      bcc: compose.bcc?.trim() || "",
      subject: compose.subject.trim(),
      body: compose.body,
      bodyHtml: compose.bodyHtml || "",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
    })
  }, [uid])

  const handleDiscardCompose = useCallback(() => {
    setComposeOpen(false)
  }, [])

  // --- Outbox actions ---
  const handleDeleteOutboxItems = useCallback(async (ids: string[]) => {
    if (!uid) return
    for (const id of ids) {
      await remove(ref(db, `admin/email/users/${uid}/outbox/${id}`))
    }
  }, [uid])

  const handleRetryOutboxItems = useCallback(async (ids: string[]) => {
    if (!uid) return
    const now = Date.now()
    for (const id of ids) {
      await update(ref(db, `admin/email/users/${uid}/outbox/${id}`), { status: "queued", updatedAt: now, error: "" })
    }
  }, [uid])

  const handleEditDraft = useCallback((item: OutboxItem) => {
    setComposeMode("compose")
    setComposeInitial({
      to: item.to,
      cc: item.cc || "",
      bcc: item.bcc || "",
      subject: item.subject,
      body: item.body,
      bodyHtml: item.bodyHtml || "",
      showCc: Boolean(item.cc),
      showBcc: Boolean(item.bcc),
    })
    setComposeReplyTo(null)
    setComposeForwardFrom(null)
    // Delete the old draft so sending creates a new outbox entry
    if (uid) remove(ref(db, `admin/email/users/${uid}/outbox/${item.id}`))
    setComposeOpen(true)
  }, [uid])

  // ========== SETTINGS ACTIONS ==========

  const handleSaveGmailMailbox = useCallback(async (config: GmailAppPasswordConfig) => {
    if (!uid) return
    await set(ref(db, `admin/email/users/${uid}/gmailAppPasswordConfig`), {
      email: config.email,
      senderName: config.senderName,
      appPassword: config.appPassword,
      updatedAt: config.updatedAt || Date.now(),
    })
  }, [uid])

  const handleUpdateAccount = useCallback(async (account: EmailAccountConfig) => {
    if (!uid) return
    await set(ref(db, `admin/email/users/${uid}/emailAccounts/${account.id}`), account)
  }, [uid])

  const handleDeleteAccount = useCallback(async (id: string) => {
    if (!uid) return
    await remove(ref(db, `admin/email/users/${uid}/emailAccounts/${id}`))
  }, [uid])

  const handleSetDefaultAccount = useCallback(async (id: string) => {
    if (!uid) return
    const updates: Record<string, any> = {}
    accounts.forEach((a) => {
      updates[`admin/email/users/${uid}/emailAccounts/${a.id}/isDefault`] = a.id === id
    })
    await update(ref(db), updates)
  }, [uid, accounts])

  // --- Google Calendar ---
  const handleSaveCalendarConfig = useCallback(async (config: GoogleCalendarConfig) => {
    if (!uid) return
    await set(ref(db, `admin/email/users/${uid}/googleCalendarConfig`), {
      email: config.email,
      appPassword: normalizeAppPassword(config.appPassword),
      calendarId: config.calendarId || "",
      syncEnabled: config.syncEnabled,
      syncInterval: config.syncInterval || 15,
      color: config.color || "#4285f4",
      lastSyncAt: config.lastSyncAt || null,
      lastSyncRequestedAt: config.lastSyncRequestedAt || null,
      syncStatus: config.syncStatus || "idle",
      updatedAt: config.updatedAt || Date.now(),
    })
  }, [normalizeAppPassword, uid])

  const handleDeleteCalendarConfig = useCallback(async () => {
    if (!uid) return
    await remove(ref(db, `admin/email/users/${uid}/googleCalendarConfig`))
  }, [uid])

  const handleTestCalendarConnection = useCallback(async (config: GoogleCalendarConfig) => {
    const email = String(config.email || "").trim()
    const appPassword = normalizeAppPassword(config.appPassword || "")
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    if (!emailIsValid) {
      return { success: false, message: "Enter a valid Google account email before testing the connection." }
    }

    if (appPassword.length < 16) {
      return { success: false, message: "Google App Passwords should be 16 characters once spaces are removed." }
    }

    return {
      success: true,
      message: "Configuration looks valid locally. Live calendar connectivity will be confirmed when server-side sync is available.",
    }
  }, [normalizeAppPassword])

  const handleSyncCalendarNow = useCallback(async () => {
    if (!uid) return
    if (!calendarConfig?.email) {
      throw new Error("Save a Google Calendar configuration before requesting a sync.")
    }
    await update(ref(db, `admin/email/users/${uid}/googleCalendarConfig`), {
      lastSyncRequestedAt: Date.now(),
      syncStatus: "pending",
      updatedAt: Date.now(),
    })
  }, [calendarConfig?.email, uid])

  // ========== MESSAGE VIEW ==========

  const handleOpenMessage = useCallback((m: EmailMessage) => {
    setViewingMessageId(m.id)
    setViewingSource("inbox")
    // Mark as read
    if (!m.read && uid) {
      update(ref(db, `admin/email/users/${uid}/messages/${m.id}`), { read: true, updatedAt: Date.now() })
    }
  }, [uid])

  const handleOpenOutboxItem = useCallback((item: OutboxItem) => {
    setViewingMessageId(item.id)
    setViewingSource("outbox")
  }, [])

  const handleBackToList = useCallback(() => {
    setViewingMessageId(null)
  }, [])

  // ========== TAB CONFIG ==========

  const tabs = useMemo(() => [
    { label: "Inbox", slug: "inbox", icon: <InboxIcon /> },
    { label: "Outbox", slug: "outbox", icon: <OutboxIcon /> },
    { label: "Settings", slug: "settings", icon: <SettingsIcon /> },
    { label: "Setup Guide", slug: "guide", icon: <GuideIcon /> },
  ], [])

  const tabIndex = tab === "inbox" ? 0 : tab === "outbox" ? 1 : tab === "settings" ? 2 : 3

  const senderAccounts = useMemo(() => {
    return accounts
      .filter((a) => a.connected || a.appPasswordConfigured)
      .map((a) => ({ email: a.email, displayName: a.displayName || a.email, color: a.color }))
  }, [accounts])

  const toggleTabsExpanded = useCallback(() => {
    setIsTabsExpanded((p) => !p)
  }, [])

  return (
    <AdminPageShell title="Emails" sx={{ height: "100%" }}>
      <AdminSectionCard flush sx={{ flex: 1 }}>
        <CollapsibleTabHeader
          layout="dataHeaderGap"
          tabs={tabs}
          activeTab={tabIndex}
          onTabChange={(_e, v) => {
            const keys: TabKey[] = ["inbox", "outbox", "settings", "guide"]
            setTab(keys[v] || "inbox")
            setViewingMessageId(null)
          }}
          isExpanded={isTabsExpanded}
          onToggleExpanded={toggleTabsExpanded}
        />

        <Box sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {tab === "inbox" && !viewingMessage && (
            <EmailInbox
              messages={messages}
              onOpenMessage={handleOpenMessage}
              onComposeNew={openComposeNew}
              onSyncInboxes={syncAllInboxes}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onDeleteMessages={handleDeleteMessages}
              onArchiveMessages={handleArchiveMessages}
              onLabelMessages={handleLabelMessages}
              onMarkSpam={handleMarkSpam}
              accountColors={accountColors}
            />
          )}

          {(tab === "inbox" || tab === "outbox") && viewingMessage && (
            <EmailMessageView
              message={viewingMessage}
              onBack={handleBackToList}
              onReply={openReply}
              onReplyAll={openReplyAll}
              onForward={openForward}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onDelete={(ids) => { handleDeleteMessages(ids); handleBackToList() }}
              onArchive={(ids) => { handleArchiveMessages(ids); handleBackToList() }}
              onMarkSpam={(ids) => { handleMarkSpam(ids); handleBackToList() }}
              accountColors={accountColors}
            />
          )}

          {tab === "outbox" && !viewingMessage && (
            <EmailOutbox
              outbox={outbox}
              onComposeNew={openComposeNew}
              onViewItem={handleOpenOutboxItem}
              onEditDraft={handleEditDraft}
              onDeleteItems={handleDeleteOutboxItems}
              onRetryItems={handleRetryOutboxItems}
            />
          )}

          {tab === "settings" && (
            <Box sx={{ overflow: "auto", flex: 1 }}>
              <EmailSettings
                accounts={accounts}
                gmailMailbox={gmailMailbox}
                oauthStatus={oauthStatus}
                onSaveGmailMailbox={handleSaveGmailMailbox}
                onBeginOAuth={beginOAuth}
                onDisconnectProvider={disconnectProvider}
                onSyncInbox={syncInbox}
                onUpdateAccount={handleUpdateAccount}
                onDeleteAccount={handleDeleteAccount}
                onSetDefaultAccount={handleSetDefaultAccount}
              />
              <Box sx={{ p: 2 }}>
                <GoogleCalendarSettings
                  config={calendarConfig}
                  onSave={handleSaveCalendarConfig}
                  onDelete={handleDeleteCalendarConfig}
                  onTestConnection={handleTestCalendarConnection}
                  onSyncNow={handleSyncCalendarNow}
                />
              </Box>
            </Box>
          )}

          {tab === "guide" && (
            <EmailSetupGuide
              gmailConfigured={Boolean(gmailMailbox.email.trim())}
              calendarConfigured={Boolean(calendarConfig)}
              oauthGmailConnected={Boolean((oauthStatus as any)?.gmail?.connected)}
              oauthOutlookConnected={Boolean((oauthStatus as any)?.outlook?.connected)}
            />
          )}
        </Box>
      </AdminSectionCard>

      {/* Floating Compose Window */}
      <EmailCompose
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardCompose}
        initialData={composeInitial}
        replyTo={composeReplyTo}
        forwardFrom={composeForwardFrom}
        mode={composeMode}
        senderAccounts={senderAccounts}
        selectedAccount={selectedAccount}
        onAccountChange={setSelectedAccount}
      />
    </AdminPageShell>
  )
}

export default AdminEmail
