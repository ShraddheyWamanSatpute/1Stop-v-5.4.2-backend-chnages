import React, { useEffect, useMemo, useRef, useState } from "react"
import { Box, Chip, Divider, Paper, Typography } from "@mui/material"
import { db, get, onValue, ref } from "../../backend/services/Firebase"
import type { Activity, ActivityType, EntityType } from "./models"

type Props = {
  entityType: EntityType
  entityId: string
  title?: string
  maxItems?: number
}

function typeLabel(t: ActivityType) {
  if (t === "note") return "Note"
  if (t === "call") return "Call"
  if (t === "meeting") return "Meeting"
  if (t === "email") return "Email"
  if (t === "status_change") return "Status"
  if (t === "task_created") return "Task"
  if (t === "task_updated") return "Task"
  if (t === "project_created") return "Project"
  if (t === "project_updated") return "Project"
  if (t === "opportunity_created") return "Opportunity"
  if (t === "opportunity_updated") return "Opportunity"
  if (t === "file_added") return "File"
  return "Activity"
}

function typeColor(t: ActivityType): any {
  if (t === "note") return "default"
  if (t === "call") return "info"
  if (t === "meeting") return "primary"
  if (t === "email") return "secondary"
  if (t === "status_change") return "warning"
  if (t.endsWith("_created")) return "success"
  return "default"
}

export default function ActivityTimeline({ entityType, entityId, title = "Activity", maxItems = 50 }: Props) {
  const [activityIds, setActivityIds] = useState<string[]>([])
  const [itemsById, setItemsById] = useState<Record<string, Activity>>({})
  const unsubByIdRef = useRef<Record<string, () => void>>({})

  useEffect(() => {
    // Reset when switching entity
    setActivityIds([])
    setItemsById({})
    // Unsubscribe any existing per-activity listeners
    for (const fn of Object.values(unsubByIdRef.current)) {
      try {
        fn()
      } catch {
        // ignore
      }
    }
    unsubByIdRef.current = {}

    const path = `admin/activityBy/${entityType}/${entityId}`
    if (!entityType || !entityId) return
    const idsRef = ref(db, path)

    const unsub = onValue(idsRef, async (snap) => {
      const val = snap.val() || {}
      const ids = Object.keys(val || {}).filter((k) => Boolean(val?.[k]))
      // If we’re not yet subscribed to a specific activity, subscribe to it now.
      for (const id of ids) {
        if (unsubByIdRef.current[id]) continue
        const aRef = ref(db, `admin/activities/${id}`)
        const un = onValue(aRef, (aSnap) => {
          const raw = aSnap.val()
          if (!raw) {
            setItemsById((p) => {
              const next = { ...p }
              delete next[id]
              return next
            })
            return
          }
          const a: Activity = {
            id,
            type: (raw?.type as any) || "system",
            title: raw?.title || "",
            body: raw?.body || "",
            meta: raw?.meta && typeof raw.meta === "object" ? raw.meta : {},
            createdAt: raw?.createdAt || 0,
            updatedAt: raw?.updatedAt || 0,
            createdBy: raw?.createdBy || undefined,
            updatedBy: raw?.updatedBy || undefined,
            isArchived: Boolean(raw?.isArchived),
            archivedAt: raw?.archivedAt || undefined,
            archivedBy: raw?.archivedBy || undefined,
            ...(raw || {}),
          } as any
          setItemsById((p) => ({ ...p, [id]: a }))
        })
        unsubByIdRef.current[id] = un
      }

      // Best-effort: if activityBy has IDs but we haven't loaded them yet (e.g., listener lag),
      // do a one-time get to populate quickly.
      const missing = ids.filter((id) => !itemsById[id])
      if (missing.length > 0 && missing.length <= 10) {
        for (const id of missing) {
          try {
            const aSnap = await get(ref(db, `admin/activities/${id}`))
            const raw = aSnap.val()
            if (!raw) continue
            setItemsById((p) => ({
              ...p,
              [id]: {
                id,
                type: (raw?.type as any) || "system",
                title: raw?.title || "",
                body: raw?.body || "",
                meta: raw?.meta && typeof raw.meta === "object" ? raw.meta : {},
                createdAt: raw?.createdAt || 0,
                updatedAt: raw?.updatedAt || 0,
                ...(raw || {}),
              } as any,
            }))
          } catch {
            // ignore
          }
        }
      }

      setActivityIds(ids)
    })

    return () => {
      unsub()
      for (const fn of Object.values(unsubByIdRef.current)) {
        try {
          fn()
        } catch {
          // ignore
        }
      }
      unsubByIdRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId])

  const rows = useMemo(() => {
    const arr = activityIds.map((id) => itemsById[id]).filter(Boolean)
    arr.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    return arr.slice(0, maxItems)
  }, [activityIds, itemsById, maxItems])

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography fontWeight={900}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {rows.length} item{rows.length === 1 ? "" : "s"}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No activity yet.
        </Typography>
      ) : null}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {rows.map((a) => (
          <Box key={a.id} sx={{ display: "flex", gap: 1.25 }}>
            <Box sx={{ pt: 0.25 }}>
              <Chip size="small" label={typeLabel(a.type)} color={typeColor(a.type)} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
                <Typography fontWeight={800} noWrap>
                  {a.title || "(untitled)"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </Typography>
              </Box>
              {a.body ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}>
                  {String(a.body)}
                </Typography>
              ) : null}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

