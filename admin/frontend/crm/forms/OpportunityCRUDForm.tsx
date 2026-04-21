import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { Alert, Box, Grid, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { CRMOpportunity, CRMOpportunityStatus, CRMPipeline, CRMStage, StaffProfile } from "../../shared/models"

export type OpportunityCRUDFormHandle = {
  submit: () => void | Promise<void>
}

type Mode = "create" | "edit" | "view"

type Props = {
  mode: Mode
  opportunity: CRMOpportunity | null
  pipelines: CRMPipeline[]
  stagesByPipelineId: Record<string, CRMStage[]>
  staff: Array<Pick<StaffProfile, "uid" | "email" | "displayName">>
  clients: Array<{ id: string; name: string }>
  contacts: Array<{ id: string; name: string; clientId?: string }>
  onSave: (payload: {
    title: string
    pipelineId: string
    stageId: string
    status: CRMOpportunityStatus
    ownerUserId?: string
    clientId?: string
    contactId?: string
    valueAmount?: number
    valueCurrency?: string
    probability?: number
    expectedCloseAt?: number
    nextActionTitle?: string
    nextActionDueAt?: number
    notes?: string
    tags?: string[]
  }) => void | Promise<void>
}

function dateToUtcMs(date: string): number | undefined {
  const s = String(date || "").trim()
  if (!s) return undefined
  const [y, m, d] = s.split("-").map((x) => Number(x))
  if (!y || !m || !d) return undefined
  return Date.UTC(y, m - 1, d)
}

function utcMsToDate(ms?: number): string {
  const n = Number(ms || 0)
  if (!n) return ""
  const dt = new Date(n)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const d = String(dt.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const OpportunityCRUDForm = forwardRef<OpportunityCRUDFormHandle, Props>(
  ({ mode, opportunity, pipelines, stagesByPipelineId, staff, clients, contacts, onSave }, ref) => {
    const disabled = mode === "view"

    const defaultPipelineId = pipelines[0]?.id || "default"
    const initial = useMemo(() => {
      const pipelineId = opportunity?.pipelineId || defaultPipelineId
      const stages = stagesByPipelineId[pipelineId] || []
      const fallbackStageId = stages[0]?.id || opportunity?.stageId || ""
      const valueAmount = opportunity?.value?.amount
      const valueCurrency = opportunity?.value?.currency || "GBP"
      const nextActionTitle = opportunity?.nextAction?.title || ""
      const nextActionDueAt = opportunity?.nextAction?.dueAt || 0
      return {
        title: opportunity?.title || "",
        pipelineId,
        stageId: opportunity?.stageId || fallbackStageId,
        status: (opportunity?.status as CRMOpportunityStatus) || "open",
        ownerUserId: opportunity?.ownerUserId || "",
        clientId: opportunity?.clientId || "",
        contactId: opportunity?.contactId || "",
        valueAmount: typeof valueAmount === "number" ? String(valueAmount) : "",
        valueCurrency,
        probability: typeof opportunity?.probability === "number" ? String(opportunity.probability) : "",
        expectedCloseDate: utcMsToDate(opportunity?.expectedCloseAt),
        nextActionTitle,
        nextActionDate: utcMsToDate(nextActionDueAt || undefined),
        tagsText: (opportunity?.tags || []).join(", "),
        notes: opportunity?.notes || "",
      }
    }, [defaultPipelineId, opportunity, stagesByPipelineId])

    const [draft, setDraft] = useState(() => initial)
    useEffect(() => setDraft(initial), [initial])
    const [errorMsg, setErrorMsg] = useState<string>("")

    const stageOptions = stagesByPipelineId[draft.pipelineId] || []

    useEffect(() => {
      if (!draft.pipelineId) return
      const stages = stagesByPipelineId[draft.pipelineId] || []
      if (!stages.length) return
      const ok = stages.some((s) => s.id === draft.stageId)
      if (!ok) setDraft((p) => ({ ...p, stageId: stages[0].id }))
    }, [draft.pipelineId, draft.stageId, stagesByPipelineId])

    const filteredContacts = useMemo(() => {
      const cid = String(draft.clientId || "").trim()
      if (!cid) return contacts
      return contacts.filter((c) => String(c.clientId || "") === cid)
    }, [contacts, draft.clientId])

    const submit = async () => {
      setErrorMsg("")
      const title = String(draft.title || "").trim()
      if (!title) {
        setErrorMsg("Please enter an opportunity title.")
        return
      }
      const pipelineId = String(draft.pipelineId || "").trim()
      const stageId = String(draft.stageId || "").trim()
      if (!pipelineId || !stageId) {
        setErrorMsg("Please select a pipeline and stage.")
        return
      }

      const tags = String(draft.tagsText || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const expectedCloseAt = dateToUtcMs(draft.expectedCloseDate)
      const nextActionDueAt = dateToUtcMs(draft.nextActionDate)
      const nextActionTitle = String(draft.nextActionTitle || "").trim()

      const stage = (stagesByPipelineId[pipelineId] || []).find((s) => s.id === stageId) || null
      if (stage?.requireNextAction) {
        if (!nextActionTitle || !nextActionDueAt) {
          setErrorMsg(`Stage "${stage.name}" requires a next action and due date.`)
          return
        }
      }

      const amount = String(draft.valueAmount || "").trim()
      const valueAmount = amount ? Number(amount) : undefined
      const probability = String(draft.probability || "").trim()
      const prob = probability ? Number(probability) : undefined

      try {
        await onSave({
          title,
          pipelineId,
          stageId,
          status: draft.status,
          ownerUserId: String(draft.ownerUserId || "").trim() || undefined,
          clientId: String(draft.clientId || "").trim() || undefined,
          contactId: String(draft.contactId || "").trim() || undefined,
          valueAmount: typeof valueAmount === "number" && !Number.isNaN(valueAmount) ? valueAmount : undefined,
          valueCurrency: String(draft.valueCurrency || "").trim() || undefined,
          probability: typeof prob === "number" && !Number.isNaN(prob) ? prob : undefined,
          expectedCloseAt,
          nextActionTitle: nextActionTitle || undefined,
          nextActionDueAt,
          notes: String(draft.notes || "") || undefined,
          tags,
        })
      } catch (e: any) {
        setErrorMsg(String(e?.message || "Failed to save opportunity."))
      }
    }

    useImperativeHandle(ref, () => ({ submit }), [draft, onSave])

    return (
      <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        {errorMsg ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        ) : null}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Opportunity Title"
              required
              fullWidth
              disabled={disabled}
              value={draft.title}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Select
              fullWidth
              disabled={disabled}
              value={draft.status}
              onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as any }))}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="won">Won</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={12} md={4}>
            <Select
              fullWidth
              disabled={disabled}
              value={draft.pipelineId}
              onChange={(e) => setDraft((p) => ({ ...p, pipelineId: String(e.target.value || "") }))}
            >
              {pipelines.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name || p.id}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} md={4}>
            <Select
              fullWidth
              disabled={disabled}
              value={draft.stageId}
              onChange={(e) => setDraft((p) => ({ ...p, stageId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                return stageOptions.find((s) => s.id === id)?.name || "Select Stage"
              }}
            >
              {stageOptions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              disabled={disabled}
              value={draft.ownerUserId}
              onChange={(e) => setDraft((p) => ({ ...p, ownerUserId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Owner (Optional)"
                const u = staff.find((s) => s.uid === id)
                return u?.displayName || u?.email || id
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.uid} value={s.uid}>
                  {s.displayName || s.email || s.uid}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Expected Close"
              type="date"
              fullWidth
              disabled={disabled}
              value={draft.expectedCloseDate}
              onChange={(e) => setDraft((p) => ({ ...p, expectedCloseDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              disabled={disabled}
              value={draft.clientId}
              onChange={(e) => setDraft((p) => ({ ...p, clientId: String(e.target.value || ""), contactId: "" }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Link To Client (Optional)"
                return clients.find((c) => c.id === id)?.name || id
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name || c.id}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              disabled={disabled}
              value={draft.contactId}
              onChange={(e) => setDraft((p) => ({ ...p, contactId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Link To Contact (Optional)"
                return contacts.find((c) => c.id === id)?.name || id
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {filteredContacts.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name || c.id}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Value
            </Typography>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              disabled={disabled}
              value={draft.valueAmount}
              onChange={(e) => setDraft((p) => ({ ...p, valueAmount: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Currency"
              fullWidth
              disabled={disabled}
              value={draft.valueCurrency}
              onChange={(e) => setDraft((p) => ({ ...p, valueCurrency: e.target.value.toUpperCase() }))}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Probability (0-100)"
              type="number"
              fullWidth
              disabled={disabled}
              value={draft.probability}
              onChange={(e) => setDraft((p) => ({ ...p, probability: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Next Action
            </Typography>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="Next Action"
              fullWidth
              disabled={disabled}
              value={draft.nextActionTitle}
              onChange={(e) => setDraft((p) => ({ ...p, nextActionTitle: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Due"
              type="date"
              fullWidth
              disabled={disabled}
              value={draft.nextActionDate}
              onChange={(e) => setDraft((p) => ({ ...p, nextActionDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Tags (Comma Separated)"
              fullWidth
              disabled={disabled}
              value={draft.tagsText}
              onChange={(e) => setDraft((p) => ({ ...p, tagsText: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={4}
              disabled={disabled}
              value={draft.notes}
              onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
            />
          </Grid>
        </Grid>
      </Box>
    )
  },
)

OpportunityCRUDForm.displayName = "OpportunityCRUDForm"

export default OpportunityCRUDForm

