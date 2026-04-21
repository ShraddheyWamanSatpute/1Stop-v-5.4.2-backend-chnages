"use client"

import React, { useState } from "react"
import { Box, Grid, MenuItem, TextField } from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import type { SupplyClient, SupplyDelivery, SupplyDeliveryStatus, SupplyOrder } from "./types"
import { format } from "date-fns"

export type SupplyCrudMode = "create" | "edit" | "view"

export interface SupplyDeliveryCRUDFormHandle {
  submit: () => void
}

export const makeDeliveryNumber = () => `DEL-${format(new Date(), "yyyyMMdd")}-${Math.floor(1000 + Math.random() * 9000)}`

export interface SupplyDeliveryCRUDFormProps {
  mode: SupplyCrudMode
  value: SupplyDelivery | null
  clients: SupplyClient[]
  orders: SupplyOrder[]
  onChange: (next: SupplyDelivery | null) => void
  onSubmit: (data: Partial<SupplyDelivery>) => void | Promise<void>
}

const SupplyDeliveryCRUDForm = React.forwardRef<SupplyDeliveryCRUDFormHandle, SupplyDeliveryCRUDFormProps>(
  function SupplyDeliveryCRUDForm(props, ref) {
    const { mode, value, clients, orders, onChange, onSubmit } = props
    const readOnly = mode === "view"

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [local, setLocal] = useState<Partial<SupplyDelivery>>(() => ({
      deliveryNumber: value?.deliveryNumber || makeDeliveryNumber(),
      clientId: value?.clientId || "",
      clientName: value?.clientName || "",
      orderId: value?.orderId || "",
      orderNumber: value?.orderNumber || "",
      status: value?.status || "scheduled",
      scheduledDate: value?.scheduledDate,
      driverName: value?.driverName || "",
      trackingRef: value?.trackingRef || "",
      deliveryAddress: value?.deliveryAddress || "",
      proofOfDeliveryUrl: value?.proofOfDeliveryUrl || "",
      notes: value?.notes || "",
      dispatchedAt: value?.dispatchedAt,
      deliveredAt: value?.deliveredAt,
    }))

    React.useEffect(() => {
      setLocal({
        deliveryNumber: value?.deliveryNumber || makeDeliveryNumber(),
        clientId: value?.clientId || "",
        clientName: value?.clientName || "",
        orderId: value?.orderId || "",
        orderNumber: value?.orderNumber || "",
        status: value?.status || "scheduled",
        scheduledDate: value?.scheduledDate,
        driverName: value?.driverName || "",
        trackingRef: value?.trackingRef || "",
        deliveryAddress: value?.deliveryAddress || "",
        proofOfDeliveryUrl: value?.proofOfDeliveryUrl || "",
        notes: value?.notes || "",
        dispatchedAt: value?.dispatchedAt,
        deliveredAt: value?.deliveredAt,
      })
    }, [value?.id])

    React.useImperativeHandle(ref, () => ({
      submit: () => {
        ;(async () => {
          const nextErrors: Record<string, string> = {}
          const deliveryNumber = (local.deliveryNumber || "").toString().trim()
          if (!deliveryNumber) nextErrors.deliveryNumber = "Delivery number is required."
          const clientId = (local.clientId || "").toString().trim()
          if (!clientId) nextErrors.clientId = "Client is required."
          const selectedOrder = local.orderId ? orders.find((order) => order.id === local.orderId) : undefined
          if (local.orderId && !selectedOrder) nextErrors.orderId = "Selected order no longer exists."
          if (selectedOrder && clientId && selectedOrder.clientId !== clientId) {
            nextErrors.orderId = "Order client must match the selected client."
          }

          setErrors(nextErrors)
          if (Object.keys(nextErrors).length > 0) return

          const status = (local.status as SupplyDeliveryStatus) || "scheduled"
          const now = Date.now()
          const patchDates: Partial<SupplyDelivery> = {}
          if (status === "in_transit" && !local.dispatchedAt) patchDates.dispatchedAt = now
          if (status === "delivered" && !local.deliveredAt) patchDates.deliveredAt = now

          const normalized = selectedOrder
            ? {
                ...local,
                clientId: selectedOrder.clientId,
                clientName: selectedOrder.clientName,
                orderId: selectedOrder.id,
                orderNumber: selectedOrder.orderNumber,
              }
            : local

          await onSubmit({ ...normalized, ...patchDates, deliveryNumber, status })
        })()
      },
    }))

    const setField = (k: keyof SupplyDelivery, v: any) => {
      const next = { ...local, [k]: v }
      setLocal(next)
      if (errors[k as string]) setErrors((p) => ({ ...p, [k as string]: "" }))
      onChange({ ...(value || ({} as any)), ...(next as any) })
    }

    return (
      <Box component="form" onSubmit={(e) => e.preventDefault()}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Delivery #"
              value={local.deliveryNumber || ""}
              onChange={(e) => setField("deliveryNumber", e.target.value)}
              disabled={readOnly}
              error={Boolean(errors.deliveryNumber)}
              helperText={errors.deliveryNumber || " "}
            />
          </Grid>
          <Grid item xs={12} md={4}>
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
                if (local.orderId) {
                  const linkedOrder = orders.find((order) => order.id === local.orderId)
                  if (linkedOrder && linkedOrder.clientId !== id) {
                    setField("orderId", "")
                    setField("orderNumber", "")
                  }
                }
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
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Status" value={local.status || "scheduled"} onChange={(e) => setField("status", e.target.value)} disabled={readOnly} helperText=" ">
              {(["scheduled", "in_transit", "delivered", "failed", "cancelled"] as SupplyDeliveryStatus[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Order (optional)"
              value={local.orderId || ""}
              onChange={(e) => {
                const id = e.target.value
                const order = orders.find((o) => o.id === id)
                setField("orderId", id)
                setField("orderNumber", order?.orderNumber || "")
                if (order?.clientId) {
                  setField("clientId", order.clientId)
                  setField("clientName", order.clientName)
                }
              }}
              disabled={readOnly}
              error={Boolean(errors.orderId)}
              helperText={errors.orderId || " "}
            >
              <MenuItem value="">(none)</MenuItem>
              {orders
                .slice()
                .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
                .map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.orderNumber} — {o.clientName}
                  </MenuItem>
                ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Scheduled date"
                value={local.scheduledDate ? new Date(local.scheduledDate) : null}
                onChange={(d) => setField("scheduledDate", d ? d.getTime() : undefined)}
                disabled={readOnly}
                slotProps={{ textField: { fullWidth: true, helperText: "Optional" } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Dispatched date"
                value={local.dispatchedAt ? new Date(local.dispatchedAt) : null}
                onChange={(d) => setField("dispatchedAt", d ? d.getTime() : undefined)}
                disabled={readOnly}
                slotProps={{ textField: { fullWidth: true, helperText: "Optional" } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Delivered date"
                value={local.deliveredAt ? new Date(local.deliveredAt) : null}
                onChange={(d) => setField("deliveredAt", d ? d.getTime() : undefined)}
                disabled={readOnly}
                slotProps={{ textField: { fullWidth: true, helperText: "Optional" } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Driver name" value={local.driverName || ""} onChange={(e) => setField("driverName", e.target.value)} disabled={readOnly} helperText=" " />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Tracking reference" value={local.trackingRef || ""} onChange={(e) => setField("trackingRef", e.target.value)} disabled={readOnly} helperText=" " />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Delivery address" value={local.deliveryAddress || ""} onChange={(e) => setField("deliveryAddress", e.target.value)} disabled={readOnly} helperText=" " />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Proof of delivery URL" value={local.proofOfDeliveryUrl || ""} onChange={(e) => setField("proofOfDeliveryUrl", e.target.value)} disabled={readOnly} helperText=" " />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={3} label="Notes" value={local.notes || ""} onChange={(e) => setField("notes", e.target.value)} disabled={readOnly} helperText=" " />
          </Grid>
        </Grid>
      </Box>
    )
  },
)

export default SupplyDeliveryCRUDForm

