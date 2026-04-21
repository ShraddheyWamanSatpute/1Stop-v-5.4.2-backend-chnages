export type StoredMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO
}

export type LearnedPreference = {
  timestamp: string // ISO
  text: string
}

export type AssistantLearnedState = {
  preferences: LearnedPreference[]
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function makeAssistantStorageKey(basePath: string): string {
  // basePath is already scoped by company/site/subsite; make it stable for local storage.
  const compact = basePath.replace(/[^\w\-/.]/g, '_')
  return `assistant.v1.${compact}`
}

export function loadChatHistory(baseKey: string): StoredMessage[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(`${baseKey}.chat`)
  const parsed = safeJsonParse<StoredMessage[]>(raw, [])
  return Array.isArray(parsed) ? parsed.slice(-50) : []
}

export function saveChatHistory(baseKey: string, messages: StoredMessage[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${baseKey}.chat`, JSON.stringify(messages.slice(-50)))
  } catch {
    // ignore storage quota / private mode issues
  }
}

export function loadLearnedState(baseKey: string): AssistantLearnedState {
  if (typeof window === 'undefined') return { preferences: [] }
  const raw = window.localStorage.getItem(`${baseKey}.learned`)
  const parsed = safeJsonParse<AssistantLearnedState>(raw, { preferences: [] })
  return parsed && typeof parsed === 'object' && Array.isArray((parsed as any).preferences)
    ? { preferences: (parsed as any).preferences.slice(-50) }
    : { preferences: [] }
}

export function saveLearnedState(baseKey: string, state: AssistantLearnedState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${baseKey}.learned`, JSON.stringify({ preferences: state.preferences.slice(-50) }))
  } catch {
    // ignore
  }
}

export function tryExtractPreference(text: string): string | null {
  const t = text.trim()
  const lower = t.toLowerCase()
  const looksLikePreference =
    lower.startsWith('/remember') ||
    lower.startsWith('remember ') ||
    lower.startsWith('from now on') ||
    lower.startsWith('always ') ||
    lower.startsWith('prefer ') ||
    lower.startsWith('i want you to') ||
    lower.startsWith('when i say')

  if (!looksLikePreference) return null

  if (lower.startsWith('/remember')) return t.replace(/^\/remember\s*/i, '').trim() || null
  return t
}

