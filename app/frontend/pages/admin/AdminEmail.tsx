import React, { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { Send as SendIcon, Mail as MailIcon } from "@mui/icons-material"
import DataHeader from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import { useSettings } from "../../../backend/context/SettingsContext"
import { APP_KEYS, getFunctionsBaseUrl } from "../../../config/keys"
import { db, onValue, push, ref, set, update } from "../../../backend/services/Firebase"

type EmailProvider = "gmail" | "outlook"
type EmailDirection = "inbound" | "outbound"
type OutboxStatus = "queued" | "sent" | "failed" | "draft"

interface EmailMessage {
  id: string
  direction: EmailDirection
  from: string
  to: string
  subject: string
  bodyPreview?: string
  body?: string
  receivedAt?: number
  createdAt: number
  updatedAt: number
}

interface OutboxItem {
  id: string
  to: string
  subject: string
  body: string
  status: OutboxStatus
  createdAt: number
  updatedAt: number
  createdBy?: string
  error?: string
}

type TabKey = "inbox" | "outbox" | "accounts"

const AdminEmail: React.FC = () => {
  const location = useLocation()
  const { state: settingsState } = useSettings()
  const companyId = "admin"
  const uid = settingsState.auth?.uid || ""

  const [tab, setTab] = useState<TabKey>("inbox")
  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [directionFilter, setDirectionFilter] = useState<EmailDirection[]>([])
  const [outboxStatusFilter, setOutboxStatusFilter] = useState<OutboxStatus[]>([])

  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [outbox, setOutbox] = useState<OutboxItem[]>([])
  const [oauthStatus, setOauthStatus] = useState<{ gmail?: any; outlook?: any } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view")
  const [selectedMsg, setSelectedMsg] = useState<EmailMessage | null>(null)
  const [selectedOutbox, setSelectedOutbox] = useState<OutboxItem | null>(null)

  const [compose, setCompose] = useState({ to: "", subject: "", body: "" })

  useEffect(() => {
    if (!uid) return
    const msgRef = ref(db, `admin/email/users/${uid}/messages`)
    const outRef = ref(db, `admin/email/users/${uid}/outbox`)

    const unsubMsg = onValue(msgRef, (snap) => {
      const val = snap.val() || {}
      const rows: EmailMessage[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        direction: (raw?.direction as EmailDirection) || "inbound",
        from: raw?.from || "",
        to: raw?.to || "",
        subject: raw?.subject || "",
        bodyPreview: raw?.bodyPreview || "",
        body: raw?.body || "",
        receivedAt: raw?.receivedAt || undefined,
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a, b) => (b.receivedAt || b.updatedAt) - (a.receivedAt || a.updatedAt))
      setMessages(rows)
    })

    const unsubOut = onValue(outRef, (snap) => {
      const val = snap.val() || {}
      const rows: OutboxItem[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        to: raw?.to || "",
        subject: raw?.subject || "",
        body: raw?.body || "",
        status: (raw?.status as OutboxStatus) || "queued",
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
        createdBy: raw?.createdBy || "",
        error: raw?.error || "",
      }))
      rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      setOutbox(rows)
    })

    return () => {
      unsubMsg()
      unsubOut()
    }
  }, [uid])

  const refreshOAuth = async () => {
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const url = new URL(`${fnBase}/checkOAuthStatus`)
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
  }

  useEffect(() => {
    refreshOAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, uid])

  const beginOAuth = (provider: EmailProvider) => {
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const endpoint = provider === "gmail" ? "oauthGoogle" : "oauthOutlook"
    const url = new URL(`${fnBase}/${endpoint}`)
    url.searchParams.set("company_id", companyId)
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    if (settingsState.auth?.uid) url.searchParams.set("user_id", settingsState.auth.uid)
    url.searchParams.set("return_path", "/Admin/Email")
    window.location.href = url.toString()
  }

  const disconnectProvider = async (provider: EmailProvider) => {
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const url = new URL(`${fnBase}/disconnectOAuth`)
    url.searchParams.set("company_id", companyId)
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    url.searchParams.set("provider", provider)
    if (uid) url.searchParams.set("user_id", uid)
    await fetch(url.toString())
    await refreshOAuth()
  }

  const syncInbox = async (provider: EmailProvider) => {
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const url = new URL(`${fnBase}/syncEmailInbox`)
    url.searchParams.set("company_id", companyId)
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    url.searchParams.set("provider", provider)
    if (uid) url.searchParams.set("user_id", uid)
    await fetch(url.toString())
  }

  const syncAllInboxes = async () => {
    await syncInbox("gmail")
    await syncInbox("outlook")
  }

  const openCompose = (prefill?: Partial<typeof compose>) => {
    setSelectedMsg(null)
    setSelectedOutbox(null)
    setCompose({
      to: prefill?.to || "",
      subject: prefill?.subject || "",
      body: prefill?.body || "",
    })
    setModalMode("create")
    setModalOpen(true)
  }

  const openViewMessage = (m: EmailMessage) => {
    setSelectedMsg(m)
    setSelectedOutbox(null)
    setModalMode("view")
    setModalOpen(true)
  }

  const openViewOutbox = (o: OutboxItem) => {
    setSelectedOutbox(o)
    setSelectedMsg(null)
    setCompose({ to: o.to, subject: o.subject, body: o.body })
    setModalMode("view")
    setModalOpen(true)
  }

  const switchToEdit = () => setModalMode("edit")

  const queueEmail = async (status: OutboxStatus = "queued") => {
    if (!compose.to.trim() || !compose.subject.trim()) return
    const now = Date.now()
    if (!uid) return
    const modeSnapshot = modalMode
    const outRef = ref(db, `admin/email/users/${uid}/outbox`)

    if (selectedOutbox && modalMode === "edit") {
      await update(ref(db, `admin/email/users/${uid}/outbox/${selectedOutbox.id}`), {
        to: compose.to.trim(),
        subject: compose.subject.trim(),
        body: compose.body,
        status,
        updatedAt: now,
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminEmailModal1",
        crudMode: modeSnapshot,
        id: selectedOutbox.id,
        itemLabel: compose.subject.trim(),
      })
      setModalOpen(false)
      return
    }

    const newRef = push(outRef)
    await set(newRef, {
      to: compose.to.trim(),
      subject: compose.subject.trim(),
      body: compose.body,
      status,
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
    })
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "adminEmailModal1",
      crudMode: modeSnapshot,
      id: newRef.key || undefined,
      itemLabel: compose.subject.trim(),
    })
    setCompose({ to: "", subject: "", body: "" })
    setModalOpen(false)
  }

  const filteredInbox = useMemo(() => {
    const q = search.trim().toLowerCase()
    return messages.filter((m) => {
      if (directionFilter.length > 0 && !directionFilter.includes(m.direction)) return false
      if (!q) return true
      return (
        (m.subject || "").toLowerCase().includes(q) ||
        (m.from || "").toLowerCase().includes(q) ||
        (m.to || "").toLowerCase().includes(q) ||
        (m.bodyPreview || "").toLowerCase().includes(q)
      )
    })
  }, [messages, search, directionFilter])

  const filteredOutbox = useMemo(() => {
    const q = search.trim().toLowerCase()
    return outbox.filter((o) => {
      if (outboxStatusFilter.length > 0 && !outboxStatusFilter.includes(o.status)) return false
      if (!q) return true
      return (
        (o.subject || "").toLowerCase().includes(q) ||
        (o.to || "").toLowerCase().includes(q) ||
        (o.body || "").toLowerCase().includes(q)
      )
    })
  }, [outbox, search, outboxStatusFilter])

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={(t) => setSearch(t)}
        searchPlaceholder={tab === "accounts" ? "Search…" : "Search subject, to/from, body…"}
        filtersExpanded={tab === "accounts" ? undefined : filtersExpanded}
        onFiltersToggle={tab === "accounts" ? undefined : () => setFiltersExpanded((p) => !p)}
        filters={
          tab === "inbox"
            ? [
                {
                  label: "Direction",
                  options: [
                    { id: "inbound", name: "inbound" },
                    { id: "outbound", name: "outbound" },
                  ],
                  selectedValues: directionFilter,
                  onSelectionChange: (values) => setDirectionFilter(values as EmailDirection[]),
                },
              ]
            : tab === "outbox"
              ? [
                  {
                    label: "Status",
                    options: [
                      { id: "draft", name: "draft" },
                      { id: "queued", name: "queued" },
                      { id: "sent", name: "sent" },
                      { id: "failed", name: "failed" },
                    ],
                    selectedValues: outboxStatusFilter,
                    onSelectionChange: (values) => setOutboxStatusFilter(values as OutboxStatus[]),
                  },
                ]
              : []
        }
        onCreateNew={tab === "accounts" ? undefined : () => openCompose()}
        createButtonLabel="Compose"
        additionalButtons={[
          tab === "inbox"
            ? {
                label: "Sync",
                onClick: syncAllInboxes,
                variant: "outlined",
              }
            : tab === "accounts"
              ? undefined
              : undefined,
        ].filter(Boolean) as any}
        additionalControls={
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            sx={{
              ml: 1,
              "& .MuiTab-root": { color: "primary.contrastText", textTransform: "none", minHeight: 40 },
              "& .MuiTabs-indicator": { bgcolor: "primary.contrastText" },
            }}
          >
            <Tab value="inbox" label="Inbox" />
            <Tab value="outbox" label="Outbox" />
            <Tab value="accounts" label="Accounts" />
          </Tabs>
        }
      />

      {tab === "inbox" ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Inbox is synced into RTDB under <code>admin/email/users/&lt;uid&gt;/messages</code> (current account only).
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell>From / To</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInbox.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary">No messages.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInbox.slice(0, 200).map((m) => (
                      <TableRow key={m.id} hover sx={{ cursor: "pointer" }} onClick={() => openViewMessage(m)}>
                        <TableCell>
                          <Typography fontWeight={700}>{m.subject || "(no subject)"}</Typography>
                        </TableCell>
                        <TableCell>
                          {m.direction === "inbound" ? `From: ${m.from}` : `To: ${m.to}`}
                        </TableCell>
                        <TableCell>{m.direction}</TableCell>
                        <TableCell>{new Date(m.receivedAt || m.updatedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : null}

      {tab === "outbox" ? (
        <Card>
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Sending queues to your personal outbox and is processed by a backend trigger.
            </Alert>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>To</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOutbox.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary">No outbox items.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOutbox.slice(0, 200).map((o) => (
                      <TableRow key={o.id} hover sx={{ cursor: "pointer" }} onClick={() => openViewOutbox(o)}>
                        <TableCell>{o.to || "—"}</TableCell>
                        <TableCell>
                          <Typography fontWeight={700}>{o.subject || "(no subject)"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={o.status}
                            color={o.status === "sent" ? "success" : o.status === "failed" ? "error" : "default"}
                          />
                        </TableCell>
                        <TableCell>{new Date(o.updatedAt || o.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : null}

      {tab === "accounts" ? (
        <Grid container spacing={2}>
          {(["gmail", "outlook"] as EmailProvider[]).map((provider) => {
            const isConnected = Boolean((oauthStatus as any)?.[provider]?.connected)
            const connectedEmail = (oauthStatus as any)?.[provider]?.email || ""
            return (
              <Grid item xs={12} md={6} key={provider}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ textTransform: "capitalize" }}>
                      {provider}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {connectedEmail || (isConnected ? "Connected" : "Not connected")}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button variant="outlined" onClick={() => beginOAuth(provider)}>
                        Connect via OAuth
                      </Button>
                      <Button variant="outlined" onClick={() => disconnectProvider(provider)} disabled={!isConnected}>
                        Disconnect
                      </Button>
                      <Button variant="outlined" onClick={() => syncInbox(provider)}>
                        Sync inbox
                      </Button>
                    </Box>

                    <Alert severity="warning" sx={{ mt: 2 }}>
                      OAuth tokens are stored in Firestore (<code>oauth_tokens</code>). Inbox is synced into RTDB for this Admin Email view (per user).
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      ) : null}

            <CRUDModal
        open={modalOpen}
        onClose={(reason) => {
          setModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedMsg(null)
            setSelectedOutbox(null)
            setModalMode("view")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "adminEmailModal1",
          crudMode: modalMode,
          id: selectedMsg?.id || selectedOutbox?.id,
          itemLabel: selectedMsg?.subject || selectedOutbox?.subject || compose.subject || undefined,
        }}
        title={selectedMsg ? "Message" : selectedOutbox ? "Outbox item" : "Compose email"}
        subtitle={
          selectedMsg
            ? selectedMsg.direction === "inbound"
              ? `From: ${selectedMsg.from}`
              : `To: ${selectedMsg.to}`
            : selectedOutbox
              ? `To: ${selectedOutbox.to} • ${selectedOutbox.subject || ""} • ${selectedOutbox.status}`
              : undefined
        }
        mode={modalMode}
        onEdit={
          selectedMsg
            ? undefined
            : selectedOutbox && modalMode === "view" && selectedOutbox.status !== "sent"
              ? switchToEdit
              : undefined
        }
        onSave={
          selectedMsg ? undefined : modalMode === "view" ? undefined : () => queueEmail("queued")
        }
        saveButtonText={selectedOutbox ? "Save & Queue" : "Queue email"}
        topBarActions={
          selectedMsg && modalMode === "view" ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={() => {
                const to = selectedMsg.direction === "inbound" ? selectedMsg.from : selectedMsg.to
                const subjectBase = selectedMsg.subject || ""
                const subject = subjectBase.startsWith("Re:") ? subjectBase : `Re: ${subjectBase}`
                setModalOpen(false)
                openCompose({ to, subject })
              }}
            >
              Reply
            </Button>
          ) : selectedOutbox && modalMode === "view" ? (
            <Button size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => {
              setModalMode("edit")
            }}>
              Re-queue
            </Button>
          ) : null
        }
      >
        {selectedMsg ? (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Subject
            </Typography>
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              {selectedMsg.subject || "(no subject)"}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ whiteSpace: "pre-wrap" }}>
              {selectedMsg.body || selectedMsg.bodyPreview || "(no content)"}
            </Typography>
          </Box>
        ) : (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="To"
                  fullWidth
                  value={compose.to}
                  disabled={modalMode === "view"}
                  onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Subject"
                  fullWidth
                  value={compose.subject}
                  disabled={modalMode === "view"}
                  onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Body"
                  fullWidth
                  multiline
                  minRows={10}
                  value={compose.body}
                  disabled={modalMode === "view"}
                  onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
                />
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Emails are queued into your personal outbox.
            </Typography>
          </Box>
        )}
      </CRUDModal>
    </Box>
  )
}

export default AdminEmail

