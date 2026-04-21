export type EmailProvider = "gmail" | "outlook"
export type EmailDirection = "inbound" | "outbound"
export type OutboxStatus = "queued" | "sent" | "failed" | "draft"
export type EmailLabel = "primary" | "social" | "promotions" | "updates" | "forums" | "spam" | "trash" | "starred" | "important" | "drafts" | "sent" | "custom"

export interface EmailAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  url?: string
  data?: string // base64 for upload
}

export interface EmailMessage {
  id: string
  threadId?: string
  direction: EmailDirection
  from: string
  fromName?: string
  to: string
  cc?: string
  bcc?: string
  replyTo?: string
  subject: string
  bodyPreview?: string
  body?: string
  bodyHtml?: string
  receivedAt?: number
  createdAt: number
  updatedAt: number
  read?: boolean
  starred?: boolean
  important?: boolean
  labels?: string[]
  attachments?: EmailAttachment[]
  inReplyTo?: string
  parentMessageId?: string
}

export interface OutboxItem {
  id: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  bodyHtml?: string
  status: OutboxStatus
  createdAt: number
  updatedAt: number
  createdBy?: string
  error?: string
  attachments?: EmailAttachment[]
  inReplyTo?: string
  parentMessageId?: string
  scheduledAt?: number
}

export type GmailAppPasswordConfig = {
  email: string
  senderName: string
  appPassword: string
  updatedAt?: number
}

export interface EmailAccountConfig {
  id: string
  provider: EmailProvider
  email: string
  displayName: string
  color: string
  signature?: string
  isDefault?: boolean
  connected: boolean
  lastSyncAt?: number
  appPasswordConfigured?: boolean
}

export interface GoogleCalendarConfig {
  email: string
  appPassword: string
  calendarId?: string
  syncEnabled: boolean
  syncInterval?: number // minutes
  color?: string
  lastSyncAt?: number
  lastSyncRequestedAt?: number
  syncStatus?: "idle" | "pending" | "error"
  updatedAt?: number
}

export interface ComposeState {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  bodyHtml: string
  attachments: EmailAttachment[]
  inReplyTo?: string
  parentMessageId?: string
  showCc: boolean
  showBcc: boolean
}

export const DEFAULT_COMPOSE: ComposeState = {
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
  bodyHtml: "",
  attachments: [],
  showCc: false,
  showBcc: false,
}

export const LABEL_COLORS: Record<string, string> = {
  primary: "#4285f4",
  social: "#1a73e8",
  promotions: "#0f9d58",
  updates: "#f4b400",
  forums: "#db4437",
  spam: "#ea4335",
  trash: "#5f6368",
  starred: "#f4b400",
  important: "#fbbc04",
  drafts: "#9e9e9e",
  sent: "#34a853",
}

export const DEFAULT_ACCOUNT_COLORS = [
  "#4285f4", "#ea4335", "#fbbc04", "#34a853",
  "#ff6d00", "#46bdc6", "#7b1fa2", "#c62828",
  "#1565c0", "#2e7d32", "#f57f17", "#6a1b9a",
]
