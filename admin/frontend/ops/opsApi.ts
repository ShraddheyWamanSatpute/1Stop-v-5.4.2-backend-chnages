import { getAuth } from "firebase/auth"
import { APP_KEYS, getFunctionsBaseUrl, getFunctionsFetchBaseUrl } from "../../backend/config/keys"

/**
 * Base URL for the opsRouter HTTPS function.
 * On localhost, `getFunctionsFetchBaseUrl` is `/api/functions` (Vite proxy). The proxy derives
 * projectId from `.env` independently and can disagree with `APP_KEYS` → upstream 404. Use the
 * same region/project as Auth/RTDB via `getFunctionsBaseUrl` unless the functions emulator is on.
 */
export function opsBaseUrl(): string {
  const projectId = APP_KEYS.firebase.projectId
  const region = APP_KEYS.firebase.functionsRegion || "us-central1"
  const proxied = getFunctionsFetchBaseUrl({ projectId, region })
  if (typeof window !== "undefined" && proxied.startsWith("/api/functions")) {
    const direct = getFunctionsBaseUrl({ projectId, region })
    if (!direct.startsWith("http://127.0.0.1")) {
      return `${direct}/opsRouter`
    }
  }
  return `${proxied}/opsRouter`
}

async function authHeaders(init?: HeadersInit): Promise<Record<string, string>> {
  const auth = getAuth()
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not authenticated")
  const headers = new Headers(init)
  headers.set("Authorization", `Bearer ${token}`)
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

async function parseResponse(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function authedFetch(path: string, init?: RequestInit) {
  const headers = await authHeaders(init?.headers)
  const res = await fetch(`${opsBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  })
  const data = await parseResponse(res)
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

export async function authedBlobFetch(path: string, init?: RequestInit) {
  const headers = await authHeaders(init?.headers)
  const res = await fetch(`${opsBaseUrl()}${path}`, {
    ...init,
    headers,
  })
  if (!res.ok) {
    const data = await parseResponse(res)
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return {
    blob: await res.blob(),
    contentDisposition: res.headers.get("content-disposition") || "",
    contentType: res.headers.get("content-type") || "",
  }
}
