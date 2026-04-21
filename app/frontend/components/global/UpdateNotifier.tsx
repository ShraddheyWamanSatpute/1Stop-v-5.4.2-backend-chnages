import React from "react"
import { Alert, Button, Snackbar } from "@mui/material"

type VersionJson = {
  version?: string
  gitSha?: string
  buildTime?: string
}

async function fetchVersionJson(timeoutMs = 6000): Promise<VersionJson | null> {
  if (import.meta.env.DEV) {
    return null
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as any
    if (!data || typeof data !== "object") return null
    return {
      version: typeof data.version === "string" ? data.version : undefined,
      gitSha: typeof data.gitSha === "string" ? data.gitSha : undefined,
      buildTime: typeof data.buildTime === "string" ? data.buildTime : undefined,
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

export default function UpdateNotifier({ pollMs = 5 * 60 * 1000 }: { pollMs?: number }) {
  const [baseline, setBaseline] = React.useState<VersionJson | null>(null)
  const [latest, setLatest] = React.useState<VersionJson | null>(null)
  const [open, setOpen] = React.useState(false)

  const check = React.useCallback(async () => {
    const v = await fetchVersionJson()
    if (!v?.gitSha) return
    setLatest(v)

    setBaseline((prev) => {
      if (!prev?.gitSha) return v
      if (prev.gitSha && v.gitSha && prev.gitSha !== v.gitSha) {
        setOpen(true)
      }
      return prev
    })
  }, [])

  React.useEffect(() => {
    check()
    const id = window.setInterval(check, pollMs)
    const onVis = () => {
      if (document.visibilityState === "visible") check()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [check, pollMs])

  const currentSha = baseline?.gitSha || ""
  const newSha = latest?.gitSha || ""
  const hasUpdate = Boolean(currentSha && newSha && currentSha !== newSha)

  if (!hasUpdate) return null

  const newVersionLabel = latest?.version ? `v${latest.version}` : "a new version"

  return (
    <Snackbar
      open={open}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button color="inherit" size="small" onClick={() => setOpen(false)}>
              Dismiss
            </Button>
          </>
        }
        sx={{ alignItems: "center" }}
      >
        {newVersionLabel} is available.
      </Alert>
    </Snackbar>
  )
}
