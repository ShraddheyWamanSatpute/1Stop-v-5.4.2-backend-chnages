"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
} from '@mui/material'
import {
  Computer as TillIcon,
  GridView as LayoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import FormSection from '../../reusable/FormSection'
import { usePOS } from '../../../../backend/context/POSContext'

interface TillScreenFormData {
  name: string
  layout: {
    columns: number
    rows: number
    buttonSize: 'small' | 'medium' | 'large'
    showPrices: boolean
    showImages: boolean
  }
  settings: {
    theme: 'light' | 'dark' | 'auto'
    fontSize: number
    showCategories: boolean
    enableQuickAccess: boolean
    defaultView: 'grid' | 'list'
  }
  isDefault: boolean
}

interface TillScreenFormProps {
  open: boolean
  onClose: () => void
  tillScreen?: any // Existing till screen for edit mode
  mode: 'create' | 'edit' | 'view'
  onSave?: (formData: any) => void
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const TillScreenForm: React.FC<TillScreenFormProps> = ({
  open,
  onClose,
  tillScreen,
  mode,
  onSave,
  onModeChange,
}) => {
  const location = useLocation()
  const { createTillScreen, updateTillScreen } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<TillScreenFormData>({
    name: '',
    layout: {
      columns: 4,
      rows: 6,
      buttonSize: 'medium',
      showPrices: true,
      showImages: true,
    },
    settings: {
      theme: 'light',
      fontSize: 14,
      showCategories: true,
      enableQuickAccess: true,
      defaultView: 'grid',
    },
    isDefault: false,
  })

  // Initialize form data when till screen changes
  useEffect(() => {
    if (tillScreen && open) {
      setFormData({
        name: tillScreen.name || '',
        layout: {
          columns: tillScreen.layout?.columns || 4,
          rows: tillScreen.layout?.rows || 6,
          buttonSize: tillScreen.layout?.buttonSize || 'medium',
          showPrices: tillScreen.layout?.showPrices ?? true,
          showImages: tillScreen.layout?.showImages ?? true,
        },
        settings: {
          theme: tillScreen.settings?.theme || 'light',
          fontSize: tillScreen.settings?.fontSize || 14,
          showCategories: tillScreen.settings?.showCategories ?? true,
          enableQuickAccess: tillScreen.settings?.enableQuickAccess ?? true,
          defaultView: tillScreen.settings?.defaultView || 'grid',
        },
        isDefault: tillScreen.isDefault || false,
      })
    } else if (!tillScreen && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        layout: {
          columns: 4,
          rows: 6,
          buttonSize: 'medium',
          showPrices: true,
          showImages: true,
        },
        settings: {
          theme: 'light',
          fontSize: 14,
          showCategories: true,
          enableQuickAccess: true,
          defaultView: 'grid',
        },
        isDefault: false,
      })
    }
    setError(null)
    setSuccess(null)
  }, [tillScreen, open])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleLayoutChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: value,
      },
    }))
  }

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Till screen name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (onSave) {
        // Use external onSave handler
        await onSave(formData)
        setSuccess('Till screen saved successfully!')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        // Use internal context methods
        if (mode === 'create') {
          await createTillScreen(formData as any)
          setSuccess('Till screen created successfully!')
        } else if (mode === 'edit') {
          await updateTillScreen(tillScreen.id, formData as any)
          setSuccess('Till screen updated successfully!')
        }

        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(mode === 'create' ? 'Failed to create till screen' : 'Failed to update till screen')
      console.error('Error saving till screen:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Till Screen'
      case 'edit':
        return 'Edit Till Screen'
      case 'view':
        return 'View Till Screen'
      default:
        return 'Till Screen'
    }
  }

  const isReadOnly = mode === 'view'

  return (
                <CRUDModal
          open={open}
          onClose={(reason) => {
            const __workspaceOnClose = onClose
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "tillScreenFormModal1",
            crudMode: mode,
          }}
          title={getTitle()}
          subtitle={mode === 'view' ? formData.name : undefined}
          icon={<TillIcon />}
          mode={mode}
          onEdit={mode === "view"
          ? () => {
              if (onModeChange) onModeChange("edit")
            }
          : undefined}
          onSave={async (...args) => {
            const __workspaceOnSave = async () => {
        await handleSubmit()
      }
            if (typeof __workspaceOnSave !== "function") return undefined
            const result = await __workspaceOnSave(...args)
            removeWorkspaceFormDraft(location.pathname, {
              crudEntity: "tillScreenFormModal1",
              crudMode: mode,
            })
            return result
          }}
          maxWidth="lg"
          loading={loading}
          disabled={loading || (!isReadOnly && !formData.name.trim())}
        >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Basic Information */}
      <FormSection
        title="Screen Information"
        subtitle="Basic till screen details"
        icon={<TillIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Screen Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="e.g., Main Counter, Bar Till"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Default Screen"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Layout Configuration */}
      <FormSection
        title="Layout Configuration"
        subtitle="Configure the till screen layout"
        icon={<LayoutIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Columns: {formData.layout.columns}</Typography>
            <Slider
              value={formData.layout.columns}
              onChange={(_e, value) => handleLayoutChange('columns', value)}
              disabled={isReadOnly}
              min={2}
              max={8}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Rows: {formData.layout.rows}</Typography>
            <Slider
              value={formData.layout.rows}
              onChange={(_e, value) => handleLayoutChange('rows', value)}
              disabled={isReadOnly}
              min={3}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Button Size</InputLabel>
              <Select
                value={formData.layout.buttonSize}
                label="Button Size"
                onChange={(e) => handleLayoutChange('buttonSize', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.layout.showPrices}
                  onChange={(e) => handleLayoutChange('showPrices', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Show Prices"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.layout.showImages}
                  onChange={(e) => handleLayoutChange('showImages', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Show Images"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Display Settings */}
      <FormSection
        title="Display Settings"
        subtitle="Customize the appearance and behavior"
        icon={<SettingsIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={formData.settings.theme}
                label="Theme"
                onChange={(e) => handleSettingsChange('theme', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Default View</InputLabel>
              <Select
                value={formData.settings.defaultView}
                label="Default View"
                onChange={(e) => handleSettingsChange('defaultView', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="grid">Grid</MenuItem>
                <MenuItem value="list">List</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography gutterBottom>Font Size: {formData.settings.fontSize}px</Typography>
            <Slider
              value={formData.settings.fontSize}
              onChange={(_e, value) => handleSettingsChange('fontSize', value)}
              disabled={isReadOnly}
              min={10}
              max={24}
              step={1}
              marks={[
                { value: 10, label: '10px' },
                { value: 14, label: '14px' },
                { value: 18, label: '18px' },
                { value: 24, label: '24px' },
              ]}
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings.showCategories}
                  onChange={(e) => handleSettingsChange('showCategories', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Show Categories"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings.enableQuickAccess}
                  onChange={(e) => handleSettingsChange('enableQuickAccess', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Enable Quick Access"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Preview Section for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Layout Preview"
          subtitle="Visual representation of the till screen"
          icon={<LayoutIcon />}
          collapsible
        >
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {formData.layout.columns} × {formData.layout.rows} grid layout
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(formData.layout.columns, 6)}, 1fr)`,
                gap: 1,
                maxWidth: 400,
              }}
            >
              {Array.from({ length: Math.min(formData.layout.columns * 3, 18) }).map((_, index) => (
                <Paper
                  key={index}
                  sx={{
                    height: formData.layout.buttonSize === 'small' ? 40 : 
                           formData.layout.buttonSize === 'large' ? 60 : 50,
                    bgcolor: themeConfig.brandColors.navy,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'white',
                      fontSize: formData.settings.fontSize - 4,
                    }}
                  >
                    {formData.layout.showPrices ? '£0.00' : 'Item'}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Paper>
        </FormSection>
      )}
    </CRUDModal>
  )
}

export default TillScreenForm

