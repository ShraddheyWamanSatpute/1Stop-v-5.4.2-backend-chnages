import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { Box, Grid, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { MarketingEvent } from "../../../backend/interfaces/Marketing"

export type MarketingEventCRUDFormHandle = {
  submit: () => void | Promise<void>
}

type Mode = "create" | "edit" | "view"

type Props = {
  event: MarketingEvent | null
  mode: Mode
  onSave: (payload: {
    name: string
    description: string
    type: MarketingEvent["type"]
    status: MarketingEvent["status"]
    startDate: number
    endDate: number
    budget: number
    spent: number
    targetAudience: string
    adContent: string
  }) => void | Promise<void>
}

const MarketingEventCRUDForm = forwardRef<MarketingEventCRUDFormHandle, Props>(({ event, mode, onSave }, ref) => {
  const disabled = mode === "view"

  const initial = useMemo(() => {
    const start = event?.startDate || Date.now()
    const end = typeof event?.endDate === "number" ? event.endDate : start
    return {
      name: event?.name || "",
      description: event?.description || "",
      type: (event?.type as MarketingEvent["type"]) || "google_ads",
      status: (event?.status as MarketingEvent["status"]) || "planned",
      startDate: new Date(start).toISOString().slice(0, 10),
      endDate: new Date(end).toISOString().slice(0, 10),
      budget: Number(event?.budget || 0),
      spent: Number(event?.spent || 0),
      targetAudience: event?.targetAudience || "",
      adContent: event?.adContent || "",
    }
  }, [event])

  const [draft, setDraft] = useState(() => initial)
  useEffect(() => setDraft(initial), [initial])

  const submit = async () => {
    const name = String(draft.name || "").trim()
    if (!name) return

    const startDate = new Date(String(draft.startDate || "")).getTime() || Date.now()
    const endDate = new Date(String(draft.endDate || "")).getTime() || startDate

    await onSave({
      name,
      description: String(draft.description || ""),
      type: draft.type,
      status: draft.status,
      startDate,
      endDate,
      budget: Number(draft.budget || 0),
      spent: Number(draft.spent || 0),
      targetAudience: String(draft.targetAudience || ""),
      adContent: String(draft.adContent || ""),
    })
  }

  useImperativeHandle(ref, () => ({ submit }), [draft, onSave])

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Name"
            required
            fullWidth
            value={draft.name}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            value={draft.type}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as any }))}
          >
            <MenuItem value="google_ads">google ads</MenuItem>
            <MenuItem value="instagram_ads">instagram ads</MenuItem>
            <MenuItem value="facebook_ads">facebook ads</MenuItem>
            <MenuItem value="email_campaign">email campaign</MenuItem>
            <MenuItem value="content_post">content post</MenuItem>
            <MenuItem value="event">event</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary">
            Type
          </Typography>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            value={draft.status}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as any }))}
          >
            <MenuItem value="planned">planned</MenuItem>
            <MenuItem value="active">active</MenuItem>
            <MenuItem value="paused">paused</MenuItem>
            <MenuItem value="completed">completed</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Start date"
            type="date"
            fullWidth
            value={draft.startDate}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="End date"
            type="date"
            fullWidth
            value={draft.endDate}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Budget"
            type="number"
            fullWidth
            value={draft.budget}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, budget: Number(e.target.value) }))}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Spent"
            type="number"
            fullWidth
            value={draft.spent}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, spent: Number(e.target.value) }))}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={3}
            value={draft.description}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Target audience"
            fullWidth
            value={draft.targetAudience}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, targetAudience: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Ad content"
            fullWidth
            multiline
            minRows={4}
            value={draft.adContent}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, adContent: e.target.value }))}
          />
        </Grid>
      </Grid>
    </Box>
  )
})

MarketingEventCRUDForm.displayName = "MarketingEventCRUDForm"

export default MarketingEventCRUDForm

