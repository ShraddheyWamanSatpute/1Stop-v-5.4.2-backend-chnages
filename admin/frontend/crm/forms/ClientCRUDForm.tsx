import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { Box, Chip, Grid, MenuItem, Select, Tab, Tabs, TextField, Typography } from "@mui/material"
import type { CRMClient, CRMClientStatus, CRMContact, CustomFieldDefinition } from "../types"

export type ClientCRUDFormHandle = {
  submit: () => void | Promise<void>
}

type Mode = "create" | "edit" | "view"

type Props = {
  client: CRMClient | null
  mode: Mode
  fields: CustomFieldDefinition[]
  contacts?: CRMContact[]
  onSave: (payload: {
    name: string
    email: string
    phone: string
    website: string
    industry: string
    status: CRMClientStatus
    address: string
    tags: string[]
    notes: string
    custom: Record<string, any>
  }) => void | Promise<void>
}

const DEFAULT_CLIENT_STATUS: CRMClientStatus = "active"

const ClientCRUDForm = forwardRef<ClientCRUDFormHandle, Props>(({ client, mode, fields, contacts, onSave }, ref) => {
  const disabled = mode === "view"
  const [tab, setTab] = useState<"details" | "address" | "contacts" | "companies">("details")

  const initial = useMemo(() => {
    return {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      website: client?.website || "",
      industry: client?.industry || "",
      status: (client?.status as CRMClientStatus) || DEFAULT_CLIENT_STATUS,
      address: client?.address || "",
      tags: Array.isArray(client?.tags) ? client!.tags : [],
      tagInput: "",
      notes: client?.notes || "",
      custom: client?.custom && typeof client.custom === "object" ? client.custom : {},
    }
  }, [client])

  const [draft, setDraft] = useState(() => initial)
  useEffect(() => setDraft(initial), [initial])

  useEffect(() => {
    setTab("details")
  }, [client?.id, mode])

  const submit = async () => {
    const name = String(draft.name || "").trim()
    if (!name) return

    const tags = Array.isArray(draft.tags) ? draft.tags.map((t) => String(t || "").trim()).filter(Boolean) : []

    await onSave({
      name,
      email: String(draft.email || "").trim(),
      phone: String(draft.phone || "").trim(),
      website: String(draft.website || "").trim(),
      industry: String(draft.industry || "").trim(),
      status: draft.status,
      address: String(draft.address || "").trim(),
      tags,
      notes: String(draft.notes || ""),
      custom: draft.custom || {},
    })
  }

  useImperativeHandle(ref, () => ({ submit }), [draft, onSave])

  const clientFields = useMemo(
    () => (fields || []).filter((f: CustomFieldDefinition) => (f.appliesTo || "both") !== "contacts"),
    [fields],
  )

  const linkedContacts = useMemo(() => {
    const list = contacts || []
    const id = String(client?.id || "").trim()
    if (!id) return []
    return list.filter((c) => String((c as any).clientId || "") === id)
  }, [client?.id, contacts])

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="details" label="Details" />
        <Tab value="address" label="Address & Billing" />
        <Tab value="contacts" label="Linked Contacts" />
        <Tab value="companies" label="Linked Companies" />
      </Tabs>

      {tab === "details" ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Company Name"
              required
              fullWidth
              value={draft.name}
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.status}
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as CRMClientStatus }))}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="trial">Trial</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Industry"
              fullWidth
              value={draft.industry}
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, industry: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Website"
              fullWidth
              value={draft.website}
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, website: e.target.value }))}
            />
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

          {clientFields.length ? (
            <Grid item xs={12}>
              <Box sx={{ display: "grid", gap: 2 }}>
                {clientFields.map((f: CustomFieldDefinition) => {
                  const value = (draft.custom || {})[f.id]
                  const inputType =
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : f.type === "email"
                          ? "email"
                          : "text"

                  if (f.type === "checkbox") {
                    return (
                      <Box key={f.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          disabled={disabled}
                          onChange={(e) => setDraft((p) => ({ ...p, custom: { ...(p.custom || {}), [f.id]: e.target.checked } }))}
                        />
                        <span>{f.label}</span>
                      </Box>
                    )
                  }

                  if (f.type === "select" || f.type === "multiselect") {
                    const options = f.options || []
                    const selected = f.type === "multiselect" ? (Array.isArray(value) ? value : []) : String(value || "")
                    return (
                      <Select
                        key={f.id}
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
                        {options.map((o: string) => (
                          <MenuItem key={o} value={o}>
                            {o}
                          </MenuItem>
                        ))}
                      </Select>
                    )
                  }

                  return (
                    <TextField
                      key={f.id}
                      label={f.label}
                      fullWidth
                      required={Boolean(f.required)}
                      type={inputType}
                      value={value ?? ""}
                      disabled={disabled}
                      onChange={(e) => setDraft((p) => ({ ...p, custom: { ...(p.custom || {}), [f.id]: e.target.value } }))}
                      InputLabelProps={f.type === "date" ? { shrink: true } : undefined}
                    />
                  )
                })}
              </Box>
            </Grid>
          ) : null}
        </Grid>
      ) : null}

      {tab === "address" ? (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Address Line 1"
              fullWidth
              value={
                String((draft.custom || {})?.address?.line1 || "") ||
                String(draft.address || "")
              }
              disabled={disabled}
              onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address Line 2"
              fullWidth
              value={String((draft.custom || {})?.address?.line2 || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    address: {
                      ...((p.custom || {}) as any)?.address,
                      line1: String(((p.custom || {}) as any)?.address?.line1 || p.address || ""),
                      line2: e.target.value,
                    },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="City"
              fullWidth
              value={String((draft.custom || {})?.address?.city || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    address: { ...((p.custom || {}) as any)?.address, city: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Postcode"
              fullWidth
              value={String((draft.custom || {})?.address?.postcode || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    address: { ...((p.custom || {}) as any)?.address, postcode: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Country"
              fullWidth
              value={String((draft.custom || {})?.address?.country || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    address: { ...((p.custom || {}) as any)?.address, country: e.target.value },
                  },
                }))
              }
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Billing Address Line 1"
              fullWidth
              value={String((draft.custom || {})?.billing?.addressLine1 || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    billing: { ...((p.custom || {}) as any)?.billing, addressLine1: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Billing Address Line 2"
              fullWidth
              value={String((draft.custom || {})?.billing?.addressLine2 || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    billing: { ...((p.custom || {}) as any)?.billing, addressLine2: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Billing City"
              fullWidth
              value={String((draft.custom || {})?.billing?.city || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    billing: { ...((p.custom || {}) as any)?.billing, city: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Billing Postcode"
              fullWidth
              value={String((draft.custom || {})?.billing?.postcode || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    billing: { ...((p.custom || {}) as any)?.billing, postcode: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Billing Country"
              fullWidth
              value={String((draft.custom || {})?.billing?.country || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    billing: { ...((p.custom || {}) as any)?.billing, country: e.target.value },
                  },
                }))
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Card Details
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Cardholder Name"
              fullWidth
              value={String((draft.custom || {})?.card?.cardholderName || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    card: { ...((p.custom || {}) as any)?.card, cardholderName: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Last 4 Digits"
              fullWidth
              value={String((draft.custom || {})?.card?.last4 || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    card: { ...((p.custom || {}) as any)?.card, last4: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Exp Month"
              fullWidth
              value={String((draft.custom || {})?.card?.expMonth || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    card: { ...((p.custom || {}) as any)?.card, expMonth: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Exp Year"
              fullWidth
              value={String((draft.custom || {})?.card?.expYear || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    card: { ...((p.custom || {}) as any)?.card, expYear: e.target.value },
                  },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Card Type"
              fullWidth
              value={String((draft.custom || {})?.card?.brand || "")}
              disabled={disabled}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  custom: {
                    ...(p.custom || {}),
                    card: { ...((p.custom || {}) as any)?.card, brand: e.target.value },
                  },
                }))
              }
            />
          </Grid>
        </Grid>
      ) : null}

      {tab === "contacts" ? (
        <Box>
          {linkedContacts.length ? (
            <Box sx={{ display: "grid", gap: 1 }}>
              {linkedContacts.map((c) => (
                <Box key={c.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  <Box>
                    <Typography fontWeight={700}>{c.name || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.email || c.phone || c.id}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {c.status}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">No linked contacts.</Typography>
          )}
        </Box>
      ) : null}

      {tab === "companies" ? (
        <Typography color="text.secondary">No linked companies.</Typography>
      ) : null}
    </Box>
  )
})

ClientCRUDForm.displayName = "ClientCRUDForm"

export default ClientCRUDForm

