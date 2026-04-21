import React, { useMemo, useState } from "react"
import { Box, Button, Grid, MenuItem, Paper, Select, TextField, Typography } from "@mui/material"
import { Add as AddIcon } from "@mui/icons-material"
import type { ActivityType, EntityType } from "./models"
import { createActivity, nowMs } from "./rtdb"

type Props = {
  entityType: EntityType
  entityId: string
  defaultTitle?: string
}

const TYPES: ActivityType[] = ["note", "call", "meeting", "email", "status_change"]

export default function ActivityComposer({ entityType, entityId, defaultTitle }: Props) {
  const [type, setType] = useState<ActivityType>("note")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)

  const effectiveTitle = useMemo(() => String(title || "").trim() || String(defaultTitle || "").trim() || "Activity", [defaultTitle, title])

  const canSave = Boolean(entityType && entityId && effectiveTitle && String(body || "").trim())

  const save = async () => {
    if (!canSave) return
    setBusy(true)
    try {
      const now = nowMs()
      const links: any = {}
      // Store a canonical link to the current entity type
      if (entityType === "client") links.clientId = entityId
      if (entityType === "contact") links.contactId = entityId
      if (entityType === "company") links.companyId = entityId
      if (entityType === "lead") links.leadId = entityId
      if (entityType === "opportunity") links.opportunityId = entityId
      if (entityType === "project") links.projectId = entityId
      if (entityType === "task") links.taskId = entityId
      if (entityType === "calendarEvent") links.calendarEventId = entityId

      await createActivity({
        type,
        title: effectiveTitle,
        body: String(body || ""),
        createdAt: now,
        updatedAt: now,
        ...(links as any),
      } as any)

      setTitle("")
      setBody("")
      setType("note")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography fontWeight={900}>Log activity</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => void save()} disabled={!canSave || busy}>
          Add
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Select fullWidth value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
            {TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField fullWidth label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle || "Title"} />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Details"
            multiline
            minRows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the note/outcome/next steps…"
          />
        </Grid>
      </Grid>
    </Paper>
  )
}

