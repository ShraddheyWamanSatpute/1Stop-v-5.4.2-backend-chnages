import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { Box, Checkbox, Chip, FormControlLabel, Grid, MenuItem, Select, TextField } from "@mui/material"
import type { CRMClient, CRMContact, CRMContactStatus, CustomFieldDefinition } from "../types"
import { DEFAULT_CRM_STATUS } from "../types"
import FormSection from "../../../../app/frontend/components/reusable/FormSection"

export type ContactCRUDFormHandle = {
  submit: () => void | Promise<void>
}

type Mode = "create" | "edit" | "view"

type Props = {
  contact: CRMContact | null
  mode: Mode
  fields: CustomFieldDefinition[]
  clients: Array<Pick<CRMClient, "id" | "name">>
  onSave: (payload: {
    name: string
    email: string
    phone: string
    status: CRMContactStatus
    clientId?: string
    tags: string[]
    notes: string
    custom: Record<string, any>
  }) => void | Promise<void>
}

const ContactCRUDForm = forwardRef<ContactCRUDFormHandle, Props>(({ contact, mode, fields, clients, onSave }, ref) => {
  const disabled = mode === "view"

  const contactFields = useMemo(() => (fields || []).filter((f) => (f.appliesTo || "both") !== "clients"), [fields])

  const initial = useMemo(() => {
    const fullName = String(contact?.name || "").trim()
    const parts = fullName ? fullName.split(/\s+/).filter(Boolean) : []
    const firstName = parts[0] || ""
    const lastName = parts.slice(1).join(" ")
    return {
      firstName,
      lastName,
      email: contact?.email || "",
      phone: contact?.phone || "",
      status: (contact?.status as CRMContactStatus) || DEFAULT_CRM_STATUS,
      clientId: contact?.clientId || "",
      tags: Array.isArray(contact?.tags) ? contact!.tags : [],
      tagInput: "",
      notes: contact?.notes || "",
      custom: contact?.custom && typeof contact.custom === "object" ? contact.custom : {},
    }
  }, [contact])

  const [draft, setDraft] = useState(() => initial)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const submit = async () => {
    const firstName = String(draft.firstName || "").trim()
    const lastName = String(draft.lastName || "").trim()
    const name = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim()
    if (!firstName) return

    const tags = Array.isArray(draft.tags) ? draft.tags.map((t) => String(t || "").trim()).filter(Boolean) : []

    await onSave({
      name,
      email: String(draft.email || "").trim(),
      phone: String(draft.phone || "").trim(),
      status: draft.status,
      clientId: String(draft.clientId || "").trim() || undefined,
      tags,
      notes: String(draft.notes || ""),
      custom: draft.custom || {},
    })
  }

  useImperativeHandle(ref, () => ({ submit }), [draft, onSave])

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            label="First Name"
            required
            fullWidth
            value={draft.firstName}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, firstName: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Last Name"
            fullWidth
            value={draft.lastName}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, lastName: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            fullWidth
            value={draft.status}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as CRMContactStatus }))}
            displayEmpty
            renderValue={(v) => (v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "Type")}
          >
            <MenuItem value="lead">Lead</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="past">Past</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
          </Select>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Email"
            fullWidth
            value={draft.email}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Phone"
            fullWidth
            value={draft.phone}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            fullWidth
            value={draft.clientId}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, clientId: String(e.target.value || "") }))}
            displayEmpty
            renderValue={(v) => {
              const id = String(v || "")
              if (!id) return "Link To Client"
              return clients.find((c) => c.id === id)?.name || "Client"
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

        <Grid item xs={12}>
          <TextField
            label="Tags"
            fullWidth
            value={draft.tagInput}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, tagInput: e.target.value }))}
            onKeyDown={(e) => {
              if (disabled) return
              if (e.key !== "Enter") return
              e.preventDefault()
              const raw = String(draft.tagInput || "")
              const next = raw.trim().replace(/^#+/, "")
              if (!next) return
              setDraft((p) => {
                const existing = Array.isArray(p.tags) ? p.tags : []
                const has = existing.some((t) => String(t).toLowerCase() === next.toLowerCase())
                return {
                  ...p,
                  tags: has ? existing : [...existing, next],
                  tagInput: "",
                }
              })
            }}
          />
          {Array.isArray(draft.tags) && draft.tags.length ? (
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {draft.tags.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  onDelete={disabled ? undefined : () => setDraft((p) => ({ ...p, tags: (p.tags || []).filter((x) => x !== t) }))}
                />
              ))}
            </Box>
          ) : null}
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Notes"
            fullWidth
            multiline
            minRows={5}
            value={draft.notes}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
          />
        </Grid>
      </Grid>

      {contactFields.length > 0 ? (
        <FormSection title="Custom Fields" subtitle="Configured in the Fields tab.">
          <Grid container spacing={2}>
            {contactFields.map((f) => {
              const value = (draft.custom || {})[f.id]
              const commonProps = { key: f.id }

              if (f.type === "checkbox") {
                return (
                  <Grid item xs={12} md={6} {...commonProps}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={Boolean(value)}
                          disabled={disabled}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, custom: { ...(p.custom || {}), [f.id]: e.target.checked } }))
                          }
                        />
                      }
                      label={f.label}
                    />
                  </Grid>
                )
              }

              if (f.type === "select" || f.type === "multiselect") {
                const options = f.options || []
                const selected = f.type === "multiselect" ? (Array.isArray(value) ? value : []) : String(value || "")

                return (
                  <Grid item xs={12} md={6} {...commonProps}>
                    <Select
                      fullWidth
                      multiple={f.type === "multiselect"}
                      value={selected as any}
                      disabled={disabled}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraft((p) => ({ ...p, custom: { ...(p.custom || {}), [f.id]: v } }))
                      }}
                      displayEmpty
                      renderValue={(v) => {
                        if (f.type === "multiselect") {
                          const arr = Array.isArray(v) ? v : []
                          return arr.length ? arr.join(", ") : `Select ${f.label}`
                        }
                        return v ? String(v) : `Select ${f.label}`
                      }}
                    >
                      {options.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>
                )
              }

              const inputType =
                f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"

              return (
                <Grid item xs={12} md={6} {...commonProps}>
                  <TextField
                    label={f.label}
                    fullWidth
                    required={Boolean(f.required)}
                    type={inputType}
                    value={value ?? ""}
                    disabled={disabled}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, custom: { ...(p.custom || {}), [f.id]: e.target.value } }))
                    }
                    InputLabelProps={f.type === "date" ? { shrink: true } : undefined}
                  />
                </Grid>
              )
            })}
          </Grid>
        </FormSection>
      ) : null}
    </Box>
  )
})

ContactCRUDForm.displayName = "ContactCRUDForm"

export default ContactCRUDForm

