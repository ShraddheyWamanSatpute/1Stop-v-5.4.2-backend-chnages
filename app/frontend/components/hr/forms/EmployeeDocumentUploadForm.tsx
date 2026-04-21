"use client"

import React, { useCallback, useEffect, useImperativeHandle, useState } from "react"
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material"

export type EmployeeUploadKind = "passport" | "signed_contract"

export interface EmployeeDocumentUploadFormHandle {
  submit: () => void | Promise<void>
}

interface EmployeeDocumentUploadFormProps {
  mode: "create" | "edit" | "view"
  defaultKind?: EmployeeUploadKind
  onSave: (data: { kind: EmployeeUploadKind; file: File }) => void | Promise<void>
  disabled?: boolean
}

const EmployeeDocumentUploadForm = React.forwardRef<EmployeeDocumentUploadFormHandle, EmployeeDocumentUploadFormProps>(
  ({ mode, defaultKind = "passport", onSave, disabled = false }, ref) => {
    const isReadOnly = mode === "view"
    const [kind, setKind] = useState<EmployeeUploadKind>(defaultKind)
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => {
      setKind(defaultKind)
      setFile(null)
    }, [defaultKind, mode])

    const submit = useCallback(async () => {
      if (isReadOnly) return
      if (!file) {
        throw new Error("Please choose a PDF file")
      }
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Only PDF files are supported")
      }
      await Promise.resolve(onSave({ kind, file }))
    }, [file, isReadOnly, kind, onSave])

    useImperativeHandle(ref, () => ({ submit }), [submit])

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl fullWidth size="small" disabled={disabled || isReadOnly}>
          <InputLabel>Document Type</InputLabel>
          <Select value={kind} label="Document Type" onChange={(e) => setKind(e.target.value as EmployeeUploadKind)}>
            <MenuItem value="passport">Passport</MenuItem>
            <MenuItem value="signed_contract">Signed Contract</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" component="label" disabled={disabled || isReadOnly}>
          Choose PDF
          <input
            hidden
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Button>

        <Typography variant="body2" color="text.secondary">
          {file ? `Selected: ${file.name}` : "No file selected"}
        </Typography>
      </Box>
    )
  },
)

export default EmployeeDocumentUploadForm

