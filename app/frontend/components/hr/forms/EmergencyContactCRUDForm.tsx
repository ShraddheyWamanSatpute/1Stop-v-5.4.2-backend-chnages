"use client"

import React, { useCallback, useEffect, useImperativeHandle, useState } from "react"
import { Box, Grid, TextField } from "@mui/material"

export interface EmergencyContact {
  id?: string
  name: string
  relationship: string
  phone: string
  email?: string
}

export interface EmergencyContactCRUDFormHandle {
  submit: () => void | Promise<void>
}

interface EmergencyContactCRUDFormProps {
  contact?: EmergencyContact | null
  mode: "create" | "edit" | "view"
  onSave: (data: EmergencyContact) => void | Promise<void>
}

const EmergencyContactCRUDForm = React.forwardRef<EmergencyContactCRUDFormHandle, EmergencyContactCRUDFormProps>(
  ({ contact, mode, onSave }, ref) => {
    const isReadOnly = mode === "view"
    const [formData, setFormData] = useState<EmergencyContact>({
      id: undefined,
      name: "",
      relationship: "",
      phone: "",
      email: "",
    })

    useEffect(() => {
      if (contact) {
        setFormData({
          id: contact.id,
          name: contact.name || "",
          relationship: contact.relationship || "",
          phone: contact.phone || "",
          email: (contact as any).email || "",
        })
      } else {
        setFormData({ id: undefined, name: "", relationship: "", phone: "", email: "" })
      }
    }, [contact, mode])

    const submit = useCallback(async () => {
      if (isReadOnly) return
      const payload: EmergencyContact = {
        ...formData,
        name: String(formData.name ?? "").trim(),
        relationship: String(formData.relationship ?? "").trim(),
        phone: String(formData.phone ?? "").trim(),
        email: String((formData as any).email ?? "").trim(),
      }
      await Promise.resolve(onSave(payload))
    }, [formData, isReadOnly, onSave])

    useImperativeHandle(ref, () => ({ submit }), [submit])

    return (
      <Box sx={{ width: "100%" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              disabled={isReadOnly}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Relationship"
              value={formData.relationship}
              onChange={(e) => setFormData((p) => ({ ...p, relationship: e.target.value }))}
              disabled={isReadOnly}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              disabled={isReadOnly}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              disabled={isReadOnly}
            />
          </Grid>
        </Grid>
      </Box>
    )
  },
)

export default EmergencyContactCRUDForm

