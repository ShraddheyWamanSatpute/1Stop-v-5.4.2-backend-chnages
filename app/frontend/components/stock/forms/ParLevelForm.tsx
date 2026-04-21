"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import { useStock } from "../../../../backend/context/StockContext"
import type { UIParLevel, UIParLevelProfile } from "../../../../backend/interfaces/Stock"

interface ParLevelFormProps {
  parLevel?: UIParLevelProfile | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: UIParLevelProfile) => void
}

const ParLevelForm: React.FC<ParLevelFormProps> = ({
  parLevel,
  mode,
  onSave,
}) => {
  const { state: stockState } = useStock()
  const { products, measures } = stockState

  const [profileData, setProfileData] = useState<UIParLevelProfile>({
    id: "",
    name: "",
    parType: "Standard",
    parLevels: {},
    isActive: true,
    bookingNumber: "",
    months: [],
  })

  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    parLevels?: string
  }>({})

  const isReadOnly = mode === 'view'

  // Load par level data when editing
  useEffect(() => {
    if (parLevel && mode !== 'create') {
      setProfileData(parLevel)
    }
  }, [parLevel, mode])

  // Add a new par level item
  const addParLevelItem = () => {
    const key = Date.now().toString()
    setProfileData((prev) => ({
      ...prev,
      parLevels: {
        ...prev.parLevels,
        [key]: {
          itemID: "",
          itemName: "",
          unitID: "",
          unitName: "",
          parLevel: 0,
        },
      },
    }))
  }

  // Update a par level item
  const updateParLevel = (key: string, field: keyof UIParLevel, value: any) => {
    setProfileData((prev) => ({
      ...prev,
      parLevels: {
        ...prev.parLevels,
        [key]: {
          ...prev.parLevels[key],
          [field]: value,
        },
      },
    }))
  }

  // Delete a par level item
  const deleteParLevel = (key: string) => {
    setProfileData((prev) => {
      const updatedParLevels = { ...prev.parLevels }
      delete updatedParLevels[key]
      return {
        ...prev,
        parLevels: updatedParLevels,
      }
    })
  }

  // Handle product selection for par level item
  const handleProductChange = (key: string, product: any) => {
    if (!product) return

    const defaultMeasureId = product.purchase?.defaultMeasure || ""
    const defaultUnit = measures.find((m) => m.id === defaultMeasureId)

    updateParLevel(key, "itemID", product.id)
    updateParLevel(key, "itemName", product.name)
    updateParLevel(key, "unitID", defaultMeasureId)
    updateParLevel(key, "unitName", defaultUnit?.name || "")
  }

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault()
    }
    
    // Validation
    const errors: any = {}
    if (!profileData.name.trim()) {
      errors.name = "Profile name is required"
    }
    if (Object.keys(profileData.parLevels).length === 0) {
      errors.parLevels = "At least one par level item is required"
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors({})
    onSave(profileData)
  }

  const handleInputChange = (field: keyof UIParLevelProfile, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '1000px' }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Header Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Par Level Profile
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Profile Name"
              value={profileData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              disabled={isReadOnly}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Par Type</InputLabel>
              <Select
                value={profileData.parType}
                label="Par Type"
                onChange={(e) => handleInputChange('parType', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="Standard">Standard</MenuItem>
                <MenuItem value="Seasonal">Seasonal</MenuItem>
                <MenuItem value="Event">Event</MenuItem>
                <MenuItem value="Holiday">Holiday</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Booking Number"
              value={profileData.bookingNumber}
              onChange={(e) => handleInputChange('bookingNumber', e.target.value)}
              disabled={isReadOnly}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={profileData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Active Profile"
            />
          </Grid>

          {/* Par Level Items */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Par Level Items</Typography>
              {!isReadOnly && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addParLevelItem}
                  size="small"
                >
                  Add Item
                </Button>
              )}
            </Box>

            {validationErrors.parLevels && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {validationErrors.parLevels}
              </Alert>
            )}

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Measure</TableCell>
                    <TableCell>Par Level</TableCell>
                    {!isReadOnly && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(profileData.parLevels).map(([key, item]) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Autocomplete
                          size="small"
                          options={products || []}
                          getOptionLabel={(option) => option.name || ""}
                          value={(products || []).find(p => p.id === item.itemID) || null}
                          onChange={(_, newValue) => handleProductChange(key, newValue)}
                          disabled={isReadOnly}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select product" />
                          )}
                          sx={{ minWidth: 200 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.unitName || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.parLevel || 0}
                          onChange={(e) => updateParLevel(key, 'parLevel', parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                          sx={{ width: 100 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() => deleteParLevel(key)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {Object.keys(profileData.parLevels).length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No par level items added yet. Click "Add Item" to get started.
                </Typography>
              </Box>
            )}
          </Grid>

        </Grid>
      </form>
    </Box>
  )
}

export default ParLevelForm