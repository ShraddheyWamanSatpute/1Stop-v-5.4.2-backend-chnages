"use client"

import React, { useState } from "react"
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography } from "@mui/material"
import { Add as AddIcon } from "@mui/icons-material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import type { SupplyClient, SupplyOrder, SupplyOrderLine, SupplyOrderStatus } from "./types"
import { format } from "date-fns"

export type SupplyCrudMode = "create" | "edit" | "view"

export interface SupplyOrderCRUDFormHandle {
  submit: () => void
}

export const makeOrderNumber = () => `SO-${format(new Date(), "yyyyMMdd")}-${Math.floor(1000 + Math.random() * 9000)}`

export interface SupplyOrderCRUDFormProps {
  mode: SupplyCrudMode
  value: SupplyOrder | null
  clients: SupplyClient[]
  onChange: (next: SupplyOrder | null) => void
  onSubmit: (data: Partial<SupplyOrder>) => void | Promise<void>
}

const SupplyOrderCRUDForm = React.forwardRef<SupplyOrderCRUDFormHandle, SupplyOrderCRUDFormProps>(function SupplyOrderCRUDForm(
  props,
  ref,
) {
  const { mode, value, clients, onChange, onSubmit } = props
  const readOnly = mode === "view"

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [local, setLocal] = useState<Partial<SupplyOrder>>(() => ({
    orderNumber: value?.orderNumber || makeOrderNumber(),
    clientId: value?.clientId || "",
    clientName: value?.clientName || "",
    status: value?.status || "draft",
    orderDate: value?.orderDate || Date.now(),
    requestedDeliveryDate: value?.requestedDeliveryDate,
    currency: value?.currency || "GBP",
    reference: value?.reference || "",
    notes: value?.notes || "",
    tax: value?.tax || 0,
    lines: value?.lines || [{ id: "1", name: "", qty: 1, unitPrice: 0 }],
  }))

  React.useEffect(() => {
    setLocal({
      orderNumber: value?.orderNumber || makeOrderNumber(),
      clientId: value?.clientId || "",
      clientName: value?.clientName || "",
      status: value?.status || "draft",
      orderDate: value?.orderDate || Date.now(),
      requestedDeliveryDate: value?.requestedDeliveryDate,
      currency: value?.currency || "GBP",
      reference: value?.reference || "",
      notes: value?.notes || "",
      tax: value?.tax || 0,
      lines: value?.lines || [{ id: "1", name: "", qty: 1, unitPrice: 0 }],
    })
  }, [value?.id])

  React.useImperativeHandle(ref, () => ({
    submit: () => {
      ;(async () => {
        const nextErrors: Record<string, string> = {}
        const orderNumber = (local.orderNumber || "").toString().trim()
        if (!orderNumber) nextErrors.orderNumber = "Order number is required."
        if (!(local.clientId || "").toString().trim()) nextErrors.clientId = "Client is required."

        const lines = (local.lines || []) as SupplyOrderLine[]
        if (!lines.length) nextErrors.lines = "Add at least one line item."
        lines.forEach((l, idx) => {
          if (!l.name?.toString().trim()) nextErrors[`line_${idx}_name`] = "Item name is required."
          if (!Number.isFinite(Number(l.qty)) || Number(l.qty) <= 0) nextErrors[`line_${idx}_qty`] = "Qty must be > 0."
          if (!Number.isFinite(Number(l.unitPrice)) || Number(l.unitPrice) < 0) nextErrors[`line_${idx}_unitPrice`] = "Unit price must be 0 or greater."
        })

        const tax = Number(local.tax) || 0
        if (tax < 0) nextErrors.tax = "Tax must be 0 or greater."

        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return

        await onSubmit({
          ...local,
          orderNumber,
          tax,
          lines: lines.map((l) => ({
            ...l,
            name: l.name?.toString().trim() || "",
            qty: Number(l.qty) || 0,
            unitPrice: Number(l.unitPrice) || 0,
          })),
        })
      })()
    },
  }))

  const setField = (k: keyof SupplyOrder, v: any) => {
    const next = { ...local, [k]: v }
    setLocal(next)
    if (errors[k as string]) setErrors((p) => ({ ...p, [k as string]: "" }))
    onChange({ ...(value || ({} as any)), ...(next as any) })
  }

  const setLines = (lines: SupplyOrderLine[]) => setField("lines" as any, lines)
  const lines = (local.lines || []) as SupplyOrderLine[]
  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0)
  const tax = Number(local.tax) || 0
  const total = subtotal + tax

  return (
    <Box component="form" onSubmit={(e) => e.preventDefault()}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Order #"
            value={local.orderNumber || ""}
            onChange={(e) => setField("orderNumber", e.target.value)}
            disabled={readOnly}
            error={Boolean(errors.orderNumber)}
            helperText={errors.orderNumber || " "}
          />
        </Grid>
        <Grid item xs={12} md={5}>
          <TextField
            select
            fullWidth
            label="Client"
            value={local.clientId || ""}
            onChange={(e) => {
              const id = e.target.value
              const name = clients.find((c) => c.id === id)?.name || ""
              setField("clientId", id)
              setField("clientName", name)
            }}
            disabled={readOnly}
            error={Boolean(errors.clientId)}
            helperText={errors.clientId || " "}
          >
            <MenuItem value="">Select client...</MenuItem>
            {clients.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField select fullWidth label="Status" value={local.status || "draft"} onChange={(e) => setField("status", e.target.value)} disabled={readOnly} helperText=" ">
            {(["draft", "confirmed", "processing", "ready", "dispatched", "delivered", "cancelled"] as SupplyOrderStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField fullWidth label="Currency" value={local.currency || "GBP"} onChange={(e) => setField("currency", e.target.value)} disabled={readOnly} helperText=" " />
        </Grid>

        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Order date"
              value={local.orderDate ? new Date(local.orderDate) : new Date()}
              onChange={(d) => setField("orderDate", d ? d.getTime() : Date.now())}
              disabled={readOnly}
              slotProps={{ textField: { fullWidth: true, helperText: " " } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Requested delivery date"
              value={local.requestedDeliveryDate ? new Date(local.requestedDeliveryDate) : null}
              onChange={(d) => setField("requestedDeliveryDate", d ? d.getTime() : undefined)}
              disabled={readOnly}
              slotProps={{ textField: { fullWidth: true, helperText: "Optional" } }}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Reference" value={local.reference || ""} onChange={(e) => setField("reference", e.target.value)} disabled={readOnly} helperText=" " />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Tax"
            value={local.tax ?? 0}
            onChange={(e) => setField("tax", Number(e.target.value))}
            disabled={readOnly}
            error={Boolean(errors.tax)}
            helperText={errors.tax || " "}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Line items
          </Typography>
          {errors.lines && (
            <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
              {errors.lines}
            </Typography>
          )}
          <Paper variant="outlined" sx={{ mt: 1, p: 2 }}>
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Item
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography variant="caption" color="text.secondary">
                  Qty
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography variant="caption" color="text.secondary">
                  Unit price
                </Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" color="text.secondary">
                  Actions
                </Typography>
              </Grid>
            </Grid>

            {lines.map((line, idx) => (
              <Grid container spacing={1} key={line.id} sx={{ mb: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    value={line.name}
                    onChange={(e) => {
                      const next = lines.slice()
                      next[idx] = { ...line, name: e.target.value }
                      setLines(next)
                    }}
                    disabled={readOnly}
                    error={Boolean(errors[`line_${idx}_name`])}
                    helperText={errors[`line_${idx}_name`] || " "}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={line.qty}
                    onChange={(e) => {
                      const next = lines.slice()
                      next[idx] = { ...line, qty: Number(e.target.value) }
                      setLines(next)
                    }}
                    disabled={readOnly}
                    error={Boolean(errors[`line_${idx}_qty`])}
                    helperText={errors[`line_${idx}_qty`] || " "}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={line.unitPrice}
                    onChange={(e) => {
                      const next = lines.slice()
                      next[idx] = { ...line, unitPrice: Number(e.target.value) }
                      setLines(next)
                    }}
                    disabled={readOnly}
                    error={Boolean(errors[`line_${idx}_unitPrice`])}
                    helperText={errors[`line_${idx}_unitPrice`] || " "}
                  />
                </Grid>
                <Grid item xs={12} md={2} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button size="small" variant="outlined" color="error" disabled={readOnly || lines.length <= 1} onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                    Remove
                  </Button>
                </Grid>
              </Grid>
            ))}

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setLines([...lines, { id: `${Date.now()}`, name: "", qty: 1, unitPrice: 0 }])} disabled={readOnly}>
                Add line
              </Button>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2">Subtotal: £{subtotal.toFixed(2)}</Typography>
                <Typography variant="body2">Tax: £{tax.toFixed(2)}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Total: £{total.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <TextField fullWidth multiline minRows={3} label="Notes" value={local.notes || ""} onChange={(e) => setField("notes", e.target.value)} disabled={readOnly} helperText=" " />
        </Grid>
      </Grid>
    </Box>
  )
})

export default SupplyOrderCRUDForm

