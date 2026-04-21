"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material"

import type { SelectChangeEvent } from "@mui/material"
import type { Location, Table } from "../../../../backend/interfaces/POS"

type Mode = "create" | "edit" | "view"

interface TableFormProps {
  table?: Table | null
  mode: Mode
  locations?: Location[]
  onSave: (data: Partial<Table>) => void
}

const TableForm: React.FC<TableFormProps> = ({ table, mode, locations = [], onSave }) => {
  const isReadOnly = mode === "view"

  const [formData, setFormData] = useState<Partial<Table>>({
    name: "",
    number: 1,
    seats: 4,
    shape: "rectangle",
    status: "available",
    sectionId: "",
    sectionName: "",
    isActive: true,
  })

  useEffect(() => {
    if (!table) {
      setFormData({
        name: "",
        number: 1,
        seats: 4,
        shape: "rectangle",
        status: "available",
        sectionId: "",
        sectionName: "",
        isActive: true,
      })
      return
    }

    setFormData({
      name: table.name || "",
      number: table.number ?? 1,
      seats: table.seats ?? table.maxCovers ?? 4,
      shape: table.shape || "rectangle",
      status: table.status || "available",
      sectionId: table.sectionId || "",
      sectionName: table.sectionName || "",
      isActive: table.isActive ?? true,
      notes: table.notes || "",
    })
  }, [table])

  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations])

  const handleTextChange = (field: keyof Table) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNumberChange = (field: keyof Table) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setFormData((prev) => ({ ...prev, [field]: Number.isFinite(value) ? value : 0 }))
  }

  const handleSelectChange = (field: keyof Table) => (e: SelectChangeEvent) => {
    const value = e.target.value as any
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSectionChange = (e: SelectChangeEvent) => {
    const sectionId = e.target.value
    const loc = locationById.get(sectionId)
    setFormData((prev) => ({
      ...prev,
      sectionId,
      sectionName: loc?.name || "",
    }))
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Table Name"
            value={formData.name || ""}
            onChange={handleTextChange("name")}
            fullWidth
            required
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Table Number"
            type="number"
            value={formData.number ?? 1}
            onChange={handleNumberChange("number")}
            fullWidth
            disabled={isReadOnly}
            inputProps={{ min: 1 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Seats"
            type="number"
            value={formData.seats ?? 4}
            onChange={handleNumberChange("seats")}
            fullWidth
            disabled={isReadOnly}
            inputProps={{ min: 1 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Shape</InputLabel>
            <Select
              label="Shape"
              value={(formData.shape || "rectangle") as any}
              onChange={handleSelectChange("shape")}
              disabled={isReadOnly}
            >
              <MenuItem value="rectangle">Rectangle</MenuItem>
              <MenuItem value="circle">Circle</MenuItem>
              <MenuItem value="square">Square</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={(formData.status || "available") as any}
              onChange={handleSelectChange("status")}
              disabled={isReadOnly}
            >
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="occupied">Occupied</MenuItem>
              <MenuItem value="reserved">Reserved</MenuItem>
              <MenuItem value="cleaning">Cleaning</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Section (Location)</InputLabel>
            <Select
              label="Section (Location)"
              value={formData.sectionId || ""}
              onChange={handleSectionChange}
              disabled={isReadOnly}
            >
              <MenuItem value="">None</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Notes"
            value={formData.notes || ""}
            onChange={handleTextChange("notes")}
            fullWidth
            multiline
            rows={2}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Active"
          />
        </Grid>
      </Grid>

      {/* CRUDModal provides Save button; this component is input-only */}
      {mode !== "view" && (
        <Box sx={{ display: "none" }}>
          {/* Keep React from complaining about unused onSave; actual save triggered by parent */}
          <button type="button" onClick={() => onSave(formData)} />
        </Box>
      )}
    </Box>
  )
}

export default TableForm

