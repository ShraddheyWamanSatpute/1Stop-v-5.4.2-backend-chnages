import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { Box, Checkbox, FormControlLabel, Grid, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { ContentPost } from "../../../backend/interfaces/Content"

export type ContentPostCRUDFormHandle = {
  submit: () => void | Promise<void>
}

type Mode = "create" | "edit" | "view"

type Props = {
  post: ContentPost | null
  mode: Mode
  onSave: (payload: {
    platform: ContentPost["platform"]
    content: string
    scheduledDate: number
    status: ContentPost["status"]
    hashtags: string[]
    targetAudience: string
    isAd: boolean
    adBudget: number
    mediaUrls: string[]
  }) => void | Promise<void>
}

const ContentPostCRUDForm = forwardRef<ContentPostCRUDFormHandle, Props>(({ post, mode, onSave }, ref) => {
  const disabled = mode === "view"

  const initial = useMemo(() => {
    return {
      platform: (post?.platform as ContentPost["platform"]) || "instagram",
      content: post?.content || "",
      scheduledDate: new Date(post?.scheduledDate || Date.now()).toISOString().slice(0, 16),
      status: (post?.status as ContentPost["status"]) || "draft",
      hashtagsText: (post?.hashtags || []).join(", "),
      targetAudience: post?.targetAudience || "",
      isAd: Boolean(post?.isAd),
      adBudget: Number(post?.adBudget || 0),
      mediaUrlsText: (post?.mediaUrls || []).join(", "),
    }
  }, [post])

  const [draft, setDraft] = useState(() => initial)
  useEffect(() => setDraft(initial), [initial])

  const submit = async () => {
    const content = String(draft.content || "").trim()
    if (!content) return
    const scheduledDate = new Date(String(draft.scheduledDate || "")).getTime() || Date.now()
    const hashtags = String(draft.hashtagsText || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const mediaUrls = String(draft.mediaUrlsText || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    await onSave({
      platform: draft.platform,
      content,
      scheduledDate,
      status: draft.status,
      hashtags,
      targetAudience: String(draft.targetAudience || "").trim(),
      isAd: Boolean(draft.isAd),
      adBudget: Number(draft.adBudget || 0),
      mediaUrls,
    })
  }

  useImperativeHandle(ref, () => ({ submit }), [draft, onSave])

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Select
            fullWidth
            value={draft.platform}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, platform: e.target.value as any }))}
          >
            <MenuItem value="instagram">instagram</MenuItem>
            <MenuItem value="facebook">facebook</MenuItem>
            <MenuItem value="linkedin">linkedin</MenuItem>
            <MenuItem value="twitter">twitter</MenuItem>
            <MenuItem value="google_ads">google ads</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary">
            Platform
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            fullWidth
            value={draft.status}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as any }))}
          >
            <MenuItem value="draft">draft</MenuItem>
            <MenuItem value="scheduled">scheduled</MenuItem>
            <MenuItem value="published">published</MenuItem>
            <MenuItem value="failed">failed</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Scheduled date/time"
            type="datetime-local"
            fullWidth
            value={draft.scheduledDate}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, scheduledDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Content"
            fullWidth
            multiline
            minRows={6}
            value={draft.content}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Media URLs (comma separated)"
            fullWidth
            value={draft.mediaUrlsText}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, mediaUrlsText: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Hashtags (comma separated)"
            fullWidth
            value={draft.hashtagsText}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, hashtagsText: e.target.value }))}
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
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(draft.isAd)}
                disabled={disabled}
                onChange={(e) => setDraft((p) => ({ ...p, isAd: e.target.checked }))}
              />
            }
            label="Promote as advertisement"
          />
        </Grid>
        {draft.isAd ? (
          <Grid item xs={12} md={6}>
            <TextField
              label="Ad budget"
              type="number"
              fullWidth
              value={draft.adBudget}
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, adBudget: Number(e.target.value) }))}
            />
          </Grid>
        ) : null}
      </Grid>
    </Box>
  )
})

ContentPostCRUDForm.displayName = "ContentPostCRUDForm"

export default ContentPostCRUDForm

