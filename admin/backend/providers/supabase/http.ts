import { auth } from "../../services/Firebase"
import { APP_KEYS, getFunctionsFetchBaseUrl } from "../../config/keys"

const dataBaseUrl = () => {
  const fnBase = getFunctionsFetchBaseUrl({
    projectId: APP_KEYS.firebase.projectId,
    region: APP_KEYS.firebase.functionsRegion,
  })
  return `${fnBase}/opsRouter/data/admin`
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

export const authedAdminDataFetch = async (path: string, init?: RequestInit) => {
  const headers = await authHeaders(init?.headers)
  const response = await fetch(`${dataBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  })

  const data = await parseResponse(response)
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}
