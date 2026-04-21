import { httpsCallable } from "firebase/functions"
import { onAuthStateChanged } from "firebase/auth"

import { APP_KEYS, getFunctionsFetchBaseUrl } from "../config/keys"
import { auth, functionsApp } from "./Firebase"

type CallableEnvelope<T> = { data: T }

type CallableProxyError = Error & {
  status?: number
  isAuthError?: boolean
}

const AUTH_BLOCK_MS = 30_000
const authBlockedUntilByCallable = new Map<string, number>()

// Clear auth blocks when auth state changes (user signed in/out).
onAuthStateChanged(auth, () => {
  authBlockedUntilByCallable.clear()
})

const parseJsonResponse = async (response: Response): Promise<any> => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const waitForInitialAuthState = async (): Promise<void> => {
  const authWithReady = auth as typeof auth & { authStateReady?: () => Promise<void> }
  if (typeof authWithReady?.authStateReady === "function") {
    await authWithReady.authStateReady()
    return
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe()
      resolve()
    })
  })
}

export const callCallableProxy = async <T = any>(name: string, data?: unknown): Promise<CallableEnvelope<T>> => {
  const baseUrl = getFunctionsFetchBaseUrl({
    projectId: APP_KEYS.firebase.projectId,
    region: APP_KEYS.firebase.functionsRegion,
  })

  if (baseUrl.startsWith("/api/functions")) {
    const blockedUntil = authBlockedUntilByCallable.get(name)
    if (typeof blockedUntil === "number") {
      if (Date.now() < blockedUntil) {
        const err: CallableProxyError = new Error("Unauthorized (cached)")
        err.status = 401
        err.isAuthError = true
        throw err
      }
      authBlockedUntilByCallable.delete(name)
    }

    await waitForInitialAuthState()

    const headers = new Headers({
      "Content-Type": "application/json",
    })

    const token = await auth.currentUser?.getIdToken()
    if (!token) {
      const err: CallableProxyError = new Error("Not signed in")
      err.status = 401
      err.isAuthError = true
      throw err
    }
    headers.set("Authorization", `Bearer ${token}`)

    const response = await fetch(`${baseUrl}/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: data ?? null }),
    })

    const payload = await parseJsonResponse(response)
    if (!response.ok || payload?.error) {
      const msg = payload?.error?.message || payload?.error || `Request failed (${response.status})`
      const err: CallableProxyError = new Error(String(msg))
      err.status = response.status
      err.isAuthError = response.status === 401 || response.status === 403
      if (err.isAuthError) {
        authBlockedUntilByCallable.set(name, Date.now() + AUTH_BLOCK_MS)
      }
      throw err
    }

    return {
      data: (payload?.result ?? payload?.data ?? payload) as T,
    }
  }

  if (!functionsApp) {
    throw new Error("Firebase Functions is not initialized")
  }

  const fn = httpsCallable(functionsApp, name)
  const result: any = await fn(data)
  return { data: (result?.data ?? null) as T }
}
