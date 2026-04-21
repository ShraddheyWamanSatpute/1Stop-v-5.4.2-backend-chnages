import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { Box, Checkbox, Chip, FormControlLabel, Grid, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { CustomFieldDefinition, CustomFieldType } from "../types"

export type FieldCRUDFormHandle = {
  submit: () => void | Promise<void>
}

type Mode = "create" | "edit" | "view"

type Props = {
  field: CustomFieldDefinition | null
  mode: Mode
  onSave: (payload: {
    label: string
    type: CustomFieldType
    options: string[]
    required: boolean
    showInTable: boolean
    appliesTo: "contacts" | "clients" | "both"
  }) => void | Promise<void>
}

const FieldCRUDForm = forwardRef<FieldCRUDFormHandle, Props>(({ field, mode, onSave }, ref) => {
  const disabled = mode === "view"

  const initial = useMemo(() => {
    return {
      label: field?.label || "",
      type: (field?.type as CustomFieldType) || "text",
      options: Array.isArray(field?.options) ? field!.options! : [],
      optionInput: "",
      required: Boolean(field?.required),
      showInTable: Boolean(field?.showInTable),
      appliesTo: (field?.appliesTo as any) || "both",
    }
  }, [field])

  const [draft, setDraft] = useState(() => initial)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const submit = async () => {
    const label = String(draft.label || "").trim()
    if (!label) return
    const options = draft.type === "select" || draft.type === "multiselect" ? (draft.options || []) : []

    await onSave({
      label,
      type: draft.type,
      options,
      required: Boolean(draft.required),
      showInTable: Boolean(draft.showInTable),
      appliesTo: (draft.appliesTo as any) || "both",
    })
  }

  useImperativeHandle(ref, () => ({ submit }), [draft, onSave])

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Label"
            required
            fullWidth
            value={draft.label}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            fullWidth
            value={draft.type}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as CustomFieldType }))}
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="number">Number</MenuItem>
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="select">Select</MenuItem>
            <MenuItem value="multiselect">Multiselect</MenuItem>
            <MenuItem value="checkbox">Checkbox</MenuItem>
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="phone">Phone</MenuItem>
            <MenuItem value="url">Url</MenuItem>
          </Select>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ display: "grid", gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              Applies To
            </Typography>
            <Select
              fullWidth
              value={(draft.appliesTo as any) || "both"}
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, appliesTo: e.target.value as any }))}
            >
              <MenuItem value="both">Both</MenuItem>
              <MenuItem value="contacts">Contacts</MenuItem>
              <MenuItem value="clients">Clients</MenuItem>
            </Select>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.required}
                disabled={disabled}
                onChange={(e) => setDraft((p) => ({ ...p, required: e.target.checked }))}
              />
            }
            label="Required"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.showInTable}
                disabled={disabled}
                onChange={(e) => setDraft((p) => ({ ...p, showInTable: e.target.checked }))}
              />
            }
            label="Show In Table"
          />
        </Grid>

        {draft.type === "select" || draft.type === "multiselect" ? (
          <Grid item xs={12}>
            <TextField
              label="Options"
              fullWidth
              value={draft.optionInput}
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, optionInput: e.target.value }))}
              onKeyDown={(e) => {
                if (disabled) return
                if (e.key !== "Enter") return
                e.preventDefault()
                const next = String(draft.optionInput || "").trim()
                if (!next) return
                setDraft((p) => {
                  const existing = Array.isArray(p.options) ? p.options : []
                  const has = existing.some((x) => String(x).toLowerCase() === next.toLowerCase())
                  return {
                    ...p,
                    options: has ? existing : [...existing, next],
                    optionInput: "",
                  }
                })
              }}
            />
            {Array.isArray(draft.options) && draft.options.length ? (
              <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {draft.options.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    size="small"
                    onDelete={
                      disabled
                        ? undefined
                        : () => setDraft((p) => ({ ...p, options: (p.options || []).filter((x: string) => x !== o) }))
                    }
                  />
                ))}
              </Box>
            ) : null}
          </Grid>
        ) : null}
      </Grid>
    </Box>
  )
})

FieldCRUDForm.displayName = "FieldCRUDForm"

export default FieldCRUDForm

