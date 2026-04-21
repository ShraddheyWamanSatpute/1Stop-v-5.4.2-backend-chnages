import React, { useMemo } from "react"
import { Box, Checkbox, Chip, FormControlLabel, Grid, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { CustomFieldDefinition, CustomFieldType } from "../types"
import { chipSxFromBg, normalizeHexColor } from "../../shared/colorUtils"

export function normalizeCustomFieldValue(type: CustomFieldType, raw: any) {
  if (type === "checkbox") return Boolean(raw)
  if (type === "multiselect") return Array.isArray(raw) ? raw : []
  if (type === "number") return raw === "" || raw === null || raw === undefined ? "" : Number(raw)
  return raw ?? ""
}

export function coerceCustomFieldValue(type: CustomFieldType, raw: any) {
  if (type === "checkbox") return Boolean(raw)
  if (type === "multiselect") return Array.isArray(raw) ? raw : []
  if (type === "number") {
    if (raw === "" || raw === null || raw === undefined) return ""
    const n = Number(raw)
    return Number.isFinite(n) ? n : ""
  }
  return raw ?? ""
}

export function formatCustomFieldForTable(type: CustomFieldType, value: any) {
  if (type === "checkbox") return value ? "Yes" : "No"
  if (type === "multiselect") return Array.isArray(value) ? value.join(", ") : ""
  return value === null || value === undefined || value === "" ? "" : String(value)
}

type Props = {
  fields: CustomFieldDefinition[]
  value: Record<string, any>
  onChange: (next: Record<string, any>) => void
  disabled?: boolean
  optionColorsByFieldId?: Record<string, Record<string, string>>
}

export default function CustomFieldsSection({ fields, value, onChange, disabled, optionColorsByFieldId }: Props) {
  const ordered = useMemo(() => {
    return [...(fields || [])].sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : 9999
      const bo = typeof b.order === "number" ? b.order : 9999
      if (ao !== bo) return ao - bo
      return String(a.label || "").localeCompare(String(b.label || ""))
    })
  }, [fields])

  if (!ordered.length) return null

  const optColor = (fieldId: string, opt: string) => normalizeHexColor(optionColorsByFieldId?.[fieldId]?.[opt] || "")

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Custom Fields
      </Typography>
      <Grid container spacing={2}>
        {ordered.map((f) => {
          const key = String(f.id)
          const fieldValue = normalizeCustomFieldValue(f.type, value?.[key])

          if (f.type === "checkbox") {
            return (
              <Grid item xs={12} md={6} key={f.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(fieldValue)}
                      disabled={disabled}
                      onChange={(e) => onChange({ ...(value || {}), [key]: e.target.checked })}
                    />
                  }
                  label={f.label}
                />
              </Grid>
            )
          }

          if (f.type === "select") {
            const selected = String(fieldValue || "")
            return (
              <Grid item xs={12} md={6} key={f.id}>
                <Select
                  fullWidth
                  value={selected}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...(value || {}), [key]: e.target.value })}
                  displayEmpty
                  renderValue={(v) => {
                    const s = String(v || "")
                    if (!s) return <Typography color="text.secondary">—</Typography>
                    const c = optColor(f.id, s)
                    return c ? <Chip size="small" label={s} sx={{ ...(chipSxFromBg(c) as any) }} /> : s
                  }}
                >
                  <MenuItem value="">
                    <em>—</em>
                  </MenuItem>
                  {(f.options || []).map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {optColor(f.id, opt) ? (
                          <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: optColor(f.id, opt) }} />
                        ) : null}
                        <Typography>{opt}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary">
                  {f.label}
                </Typography>
              </Grid>
            )
          }

          if (f.type === "multiselect") {
            const arr = Array.isArray(fieldValue) ? fieldValue : []
            return (
              <Grid item xs={12} md={6} key={f.id}>
                <Select
                  fullWidth
                  multiple
                  value={arr}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...(value || {}), [key]: e.target.value })}
                  renderValue={(selected) => {
                    const items = Array.isArray(selected) ? (selected as any[]) : []
                    if (!items.length) return <Typography color="text.secondary">—</Typography>
                    return (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {items.map((v) => {
                          const s = String(v || "")
                          const c = optColor(f.id, s)
                          return c ? <Chip key={s} size="small" label={s} sx={{ ...(chipSxFromBg(c) as any) }} /> : <Chip key={s} size="small" label={s} />
                        })}
                      </Box>
                    )
                  }}
                >
                  {(f.options || []).map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {optColor(f.id, opt) ? (
                          <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: optColor(f.id, opt) }} />
                        ) : null}
                        <Typography>{opt}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary">
                  {f.label}
                </Typography>
              </Grid>
            )
          }

          const isDate = f.type === "date"
          const isNumber = f.type === "number"
          const isEmail = f.type === "email"
          const isUrl = f.type === "url"
          const inputType = isDate ? "date" : isNumber ? "number" : isEmail ? "email" : isUrl ? "url" : "text"

          return (
            <Grid item xs={12} md={6} key={f.id}>
              <TextField
                label={f.label}
                fullWidth
                type={inputType}
                value={fieldValue}
                disabled={disabled}
                required={Boolean(f.required)}
                onChange={(e) => onChange({ ...(value || {}), [key]: coerceCustomFieldValue(f.type, e.target.value) })}
                InputLabelProps={isDate ? { shrink: true } : undefined}
              />
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}

