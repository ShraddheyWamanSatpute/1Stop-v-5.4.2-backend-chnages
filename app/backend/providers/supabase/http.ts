import { auth } from "../../services/Firebase"
import { APP_KEYS, getFunctionsFetchBaseUrl } from "../../config/keys"

let opsApiUnavailable = false

const dataBaseUrl = () => {
  const fnBase = getFunctionsFetchBaseUrl({
    projectId: APP_KEYS.firebase.projectId,
    region: APP_KEYS.firebase.functionsRegion,
  })
  return `${fnBase}/opsRouter/data`
}

const authHeaders = async (init?: HeadersInit): Promise<Record<string, string>> => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not authenticated")

  const headers = new Headers(init)
  headers.set("Authorization", `Bearer ${token}`)

  const output: Record<string, string> = {}
  headers.forEach((value, key) => {
    output[key] = value
  })
  return output
}

const parseResponse = async (res: Response): Promise<any> => {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const authedDataFetch = async (path: string, init?: RequestInit) => {
  if (opsApiUnavailable) {
    throw new Error(
      "Ops API is not available in this environment. " +
        "Deploy the `opsRouter` Cloud Function for your configured Firebase project, " +
        "or enable the Functions emulator (set `VITE_USE_FUNCTIONS_EMULATOR=true`).",
    )
  }

  const headers = await authHeaders(init?.headers)
  const response = await fetch(`${dataBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  })

  const data = await parseResponse(response)
  if (response.status === 404) {
    // When /opsRouter is not deployed (or proxy points at the wrong project),
    // callers often retry on intervals; prevent infinite 404 spam in dev.
    opsApiUnavailable = true
  }
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}

export const createPollingSubscription = <T>(
  fetcher: () => Promise<T>,
  onData: (rows: T) => void,
  onError?: (message: string) => void,
  intervalMs = 15000,
): (() => void) => {
  let active = true

  const run = async () => {
    try {
      const rows = await fetcher()
      if (active) onData(rows)
    } catch (error: any) {
      const message = error?.message || "Failed to load data"
      if (active) onError?.(message)
      if (opsApiUnavailable) {
        // Stop polling once we know the ops API isn’t reachable.
        active = false
        window.clearInterval(intervalId)
      }
    }
  }

  void run()
  const intervalId = window.setInterval(() => {
    void run()
  }, intervalMs)

  return () => {
    active = false
    window.clearInterval(intervalId)
  }
}
