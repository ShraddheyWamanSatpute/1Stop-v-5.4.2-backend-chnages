"use client"

import React, { useState } from "react"
import { Box, Grid, MenuItem, TextField } from "@mui/material"
import { Business as BusinessIcon, Email as EmailIcon, LocationOn as LocationIcon, LocalShipping as DeliveryIcon, Payments as PaymentsIcon, Edit as EditIcon } from "@mui/icons-material"
import FormSection from "../../components/reusable/FormSection"
import type { SupplyClient } from "./types"

export type SupplyCrudMode = "create" | "edit" | "view"

export interface SupplyClientCRUDFormHandle {
  submit: () => void
}

export interface SupplyClientCRUDFormProps {
  mode: SupplyCrudMode
  value: SupplyClient | null
  onChange: (next: SupplyClient | null) => void
  onSubmit: (data: Partial<SupplyClient>) => void | Promise<void>
}

const SupplyClientCRUDForm = React.forwardRef<SupplyClientCRUDFormHandle, SupplyClientCRUDFormProps>(function SupplyClientCRUDForm(
  props,
  ref,
) {
  const { mode, value, onChange, onSubmit } = props
  const readOnly = mode === "view"

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [local, setLocal] = useState<Partial<SupplyClient>>(() => ({
    name: value?.name || "",
    type: value?.type || "client",
    status: value?.status || "active",
    accountReference: value?.accountReference || "",
    vatNumber: value?.vatNumber || "",
    email: value?.email || "",
    phone: value?.phone || "",
    website: value?.website || "",
    contactName: value?.contactName || "",
    addressLine1: value?.addressLine1 || "",
    addressLine2: value?.addressLine2 || "",
    city: value?.city || "",
    county: value?.county || "",
    postcode: value?.postcode || "",
    country: value?.country || "",
    billingAddressLine1: value?.billingAddressLine1 || "",
    billingAddressLine2: value?.billingAddressLine2 || "",
    billingCity: value?.billingCity || "",
    billingCounty: value?.billingCounty || "",
    billingPostcode: value?.billingPostcode || "",
    billingCountry: value?.billingCountry || "",
    deliveryContactName: value?.deliveryContactName || "",
    deliveryContactEmail: value?.deliveryContactEmail || "",
    deliveryContactPhone: value?.deliveryContactPhone || "",
    deliveryAddressLine1: value?.deliveryAddressLine1 || "",
    deliveryAddressLine2: value?.deliveryAddressLine2 || "",
    deliveryCity: value?.deliveryCity || "",
    deliveryCounty: value?.deliveryCounty || "",
    deliveryPostcode: value?.deliveryPostcode || "",
    deliveryCountry: value?.deliveryCountry || "",
    receivingHours: value?.receivingHours || "",
    preferredDeliveryDays: value?.preferredDeliveryDays || [],
    preferredDeliveryTimeFrom: value?.preferredDeliveryTimeFrom || "",
    preferredDeliveryTimeTo: value?.preferredDeliveryTimeTo || "",
    requiresPONumber: Boolean(value?.requiresPONumber),
    unloadingRequirements: value?.unloadingRequirements || "",
    accessInstructions: value?.accessInstructions || "",
    deliveryInstructions: value?.deliveryInstructions || "",
    paymentTerms: value?.paymentTerms,
    creditLimit: value?.creditLimit,
    notes: value?.notes || "",
  }))

  React.useEffect(() => {
    setLocal({
      name: value?.name || "",
      type: value?.type || "client",
      status: value?.status || "active",
      accountReference: value?.accountReference || "",
      vatNumber: value?.vatNumber || "",
      email: value?.email || "",
      phone: value?.phone || "",
      website: value?.website || "",
      contactName: value?.contactName || "",
      addressLine1: value?.addressLine1 || "",
      addressLine2: value?.addressLine2 || "",
      city: value?.city || "",
      county: value?.county || "",
      postcode: value?.postcode || "",
      country: value?.country || "",
      billingAddressLine1: value?.billingAddressLine1 || "",
      billingAddressLine2: value?.billingAddressLine2 || "",
      billingCity: value?.billingCity || "",
      billingCounty: value?.billingCounty || "",
      billingPostcode: value?.billingPostcode || "",
      billingCountry: value?.billingCountry || "",
      deliveryContactName: value?.deliveryContactName || "",
      deliveryContactEmail: value?.deliveryContactEmail || "",
      deliveryContactPhone: value?.deliveryContactPhone || "",
      deliveryAddressLine1: value?.deliveryAddressLine1 || "",
      deliveryAddressLine2: value?.deliveryAddressLine2 || "",
      deliveryCity: value?.deliveryCity || "",
      deliveryCounty: value?.deliveryCounty || "",
      deliveryPostcode: value?.deliveryPostcode || "",
      deliveryCountry: value?.deliveryCountry || "",
      receivingHours: value?.receivingHours || "",
      preferredDeliveryDays: value?.preferredDeliveryDays || [],
      preferredDeliveryTimeFrom: value?.preferredDeliveryTimeFrom || "",
      preferredDeliveryTimeTo: value?.preferredDeliveryTimeTo || "",
      requiresPONumber: Boolean(value?.requiresPONumber),
      unloadingRequirements: value?.unloadingRequirements || "",
      accessInstructions: value?.accessInstructions || "",
      deliveryInstructions: value?.deliveryInstructions || "",
      paymentTerms: value?.paymentTerms,
      creditLimit: value?.creditLimit,
      notes: value?.notes || "",
    })
  }, [value?.id])

  React.useImperativeHandle(ref, () => ({
    submit: () => {
      ;(async () => {
        const nextErrors: Record<string, string> = {}
        const name = (local.name || "").toString().trim()
        if (!name) nextErrors.name = "Name is required."
        const email = (local.email || "").toString().trim()
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Email looks invalid."
        const credit = local.creditLimit
        if (typeof credit === "number" && credit < 0) nextErrors.creditLimit = "Credit limit must be 0 or greater."

        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return
        await onSubmit({ ...local, name, email })
      })()
    },
  }))

  const setField = (k: keyof SupplyClient, v: any) => {
    const next = { ...local, [k]: v }
    setLocal(next)
    if (errors[k as string]) setErrors((p) => ({ ...p, [k as string]: "" }))
    onChange({ ...(value || ({} as any)), ...(next as any) })
  }

  return (
    <Box component="form" onSubmit={(e) => e.preventDefault()}>
      <FormSection title="Client details" icon={<BusinessIcon />}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Name"
              value={local.name || ""}
              onChange={(e) => setField("name", e.target.value)}
              disabled={readOnly}
              error={Boolean(errors.name)}
              helperText={errors.name || " "}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField select fullWidth label="Type" value={local.type || "client"} onChange={(e) => setField("type", e.target.value)} disabled={readOnly}>
              <MenuItem value="client">client</MenuItem>
              <MenuItem value="customer">customer</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField select fullWidth label="Status" value={local.status || "active"} onChange={(e) => setField("status", e.target.value)} disabled={readOnly}>
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="inactive">inactive</MenuItem>
              <MenuItem value="archived">archived</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Account reference" value={local.accountReference || ""} onChange={(e) => setField("accountReference", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="VAT number" value={local.vatNumber || ""} onChange={(e) => setField("vatNumber", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Website" value={local.website || ""} onChange={(e) => setField("website", e.target.value)} disabled={readOnly} />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Primary contact" icon={<EmailIcon />}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Contact name" value={local.contactName || ""} onChange={(e) => setField("contactName", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Email"
              value={local.email || ""}
              onChange={(e) => setField("email", e.target.value)}
              disabled={readOnly}
              error={Boolean(errors.email)}
              helperText={errors.email || " "}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Phone" value={local.phone || ""} onChange={(e) => setField("phone", e.target.value)} disabled={readOnly} />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Primary address" icon={<LocationIcon />} collapsible defaultExpanded={false}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Address line 1" value={local.addressLine1 || ""} onChange={(e) => setField("addressLine1", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Address line 2" value={local.addressLine2 || ""} onChange={(e) => setField("addressLine2", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="City" value={local.city || ""} onChange={(e) => setField("city", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="County/State" value={local.county || ""} onChange={(e) => setField("county", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Postcode" value={local.postcode || ""} onChange={(e) => setField("postcode", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Country" value={local.country || ""} onChange={(e) => setField("country", e.target.value)} disabled={readOnly} />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Billing address" icon={<LocationIcon />} collapsible defaultExpanded={false}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Address line 1" value={local.billingAddressLine1 || ""} onChange={(e) => setField("billingAddressLine1", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Address line 2" value={local.billingAddressLine2 || ""} onChange={(e) => setField("billingAddressLine2", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="City" value={local.billingCity || ""} onChange={(e) => setField("billingCity", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="County/State" value={local.billingCounty || ""} onChange={(e) => setField("billingCounty", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Postcode" value={local.billingPostcode || ""} onChange={(e) => setField("billingPostcode", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Country" value={local.billingCountry || ""} onChange={(e) => setField("billingCountry", e.target.value)} disabled={readOnly} />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Delivery / receiving details" icon={<DeliveryIcon />}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Delivery contact name" value={local.deliveryContactName || ""} onChange={(e) => setField("deliveryContactName", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Delivery contact email" value={local.deliveryContactEmail || ""} onChange={(e) => setField("deliveryContactEmail", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Delivery contact phone" value={local.deliveryContactPhone || ""} onChange={(e) => setField("deliveryContactPhone", e.target.value)} disabled={readOnly} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Delivery address line 1" value={local.deliveryAddressLine1 || ""} onChange={(e) => setField("deliveryAddressLine1", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Delivery address line 2" value={local.deliveryAddressLine2 || ""} onChange={(e) => setField("deliveryAddressLine2", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="City" value={local.deliveryCity || ""} onChange={(e) => setField("deliveryCity", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="County/State" value={local.deliveryCounty || ""} onChange={(e) => setField("deliveryCounty", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Postcode" value={local.deliveryPostcode || ""} onChange={(e) => setField("deliveryPostcode", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Country" value={local.deliveryCountry || ""} onChange={(e) => setField("deliveryCountry", e.target.value)} disabled={readOnly} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Receiving hours"
              value={local.receivingHours || ""}
              onChange={(e) => setField("receivingHours", e.target.value)}
              disabled={readOnly}
              helperText="e.g. Mon-Fri 07:00-15:00"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Preferred delivery from" value={local.preferredDeliveryTimeFrom || ""} onChange={(e) => setField("preferredDeliveryTimeFrom", e.target.value)} disabled={readOnly} placeholder="HH:mm" />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Preferred delivery to" value={local.preferredDeliveryTimeTo || ""} onChange={(e) => setField("preferredDeliveryTimeTo", e.target.value)} disabled={readOnly} placeholder="HH:mm" />
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              SelectProps={{ multiple: true }}
              label="Preferred delivery days"
              value={local.preferredDeliveryDays || []}
              onChange={(e) => setField("preferredDeliveryDays", (e.target.value as unknown as string[]) || [])}
              disabled={readOnly}
              helperText=" "
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField select fullWidth label="PO number required?" value={local.requiresPONumber ? "yes" : "no"} onChange={(e) => setField("requiresPONumber", e.target.value === "yes")} disabled={readOnly} helperText=" ">
              <MenuItem value="no">no</MenuItem>
              <MenuItem value="yes">yes</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Unloading requirements"
              value={local.unloadingRequirements || ""}
              onChange={(e) => setField("unloadingRequirements", e.target.value)}
              disabled={readOnly}
              helperText="e.g. tail-lift needed, pallet jack available, etc."
            />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="Access instructions" value={local.accessInstructions || ""} onChange={(e) => setField("accessInstructions", e.target.value)} disabled={readOnly} helperText="gate code, parking, entrance, security, etc." />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="Delivery instructions" value={local.deliveryInstructions || ""} onChange={(e) => setField("deliveryInstructions", e.target.value)} disabled={readOnly} helperText="where to drop, who to ask for, etc." />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Payments" icon={<PaymentsIcon />} collapsible defaultExpanded={false}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField select fullWidth label="Payment terms" value={local.paymentTerms || ""} onChange={(e) => setField("paymentTerms", e.target.value || undefined)} disabled={readOnly} helperText=" ">
              <MenuItem value="">(none)</MenuItem>
              <MenuItem value="due_on_receipt">Due on receipt</MenuItem>
              <MenuItem value="net_7">Net 7</MenuItem>
              <MenuItem value="net_14">Net 14</MenuItem>
              <MenuItem value="net_30">Net 30</MenuItem>
              <MenuItem value="net_60">Net 60</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Credit limit"
              value={local.creditLimit ?? ""}
              onChange={(e) => setField("creditLimit", e.target.value === "" ? undefined : Number(e.target.value))}
              disabled={readOnly}
              error={Boolean(errors.creditLimit)}
              helperText={errors.creditLimit || " "}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Notes" icon={<EditIcon />} collapsible defaultExpanded={false}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={3} label="Notes" value={local.notes || ""} onChange={(e) => setField("notes", e.target.value)} disabled={readOnly} helperText=" " />
          </Grid>
        </Grid>
      </FormSection>
    </Box>
  )
})

export default SupplyClientCRUDForm

