"use client"
import { useLocation } from "react-router-dom"

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
  Chip,
} from '@mui/material'
import {
  Category as GroupIcon,
  GridView as LayoutIcon,
  Label as TagIcon,
} from '@mui/icons-material'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import FormSection from '../../reusable/FormSection'
import { usePOS } from '../../../../backend/context/POSContext'

interface GroupFormData {
  name: string
  description: string
  layout: any[]
  tags: string[]
  isDefault: boolean
}

interface GroupFormProps {
  open: boolean
  onClose: () => void
  group?: any // Existing group for edit mode
  mode: 'create' | 'edit' | 'view'
  onSave?: (formData: any) => void
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const GroupForm: React.FC<GroupFormProps> = ({
  open,
  onClose,
  group,
  mode,
  onSave,
  onModeChange,
}) => {
  const location = useLocation()
  const { createGroup, updateGroup } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    layout: [],
    tags: [],
    isDefault: false,
  })

  // Initialize form data when group changes
  useEffect(() => {
    if (group && open) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        layout: group.layout || [],
        tags: group.tags || [],
        isDefault: group.isDefault || false,
      })
    } else if (!group && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        layout: [],
        tags: [],
        isDefault: false,
      })
    }
    setError(null)
    setSuccess(null)
  }, [group, open])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Group name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const groupData = {
        ...formData,
        createdAt: group?.createdAt || Date.now(),
        updatedAt: Date.now(),
      }

      if (onSave) {
        // Use external onSave handler
        await onSave(groupData)
        setSuccess('Group saved successfully!')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        // Use internal context methods
        if (mode === 'create') {
          await createGroup(groupData)
          setSuccess('Group created successfully!')
        } else if (mode === 'edit') {
          await updateGroup(group.id, groupData)
          setSuccess('Group updated successfully!')
        }

        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(mode === 'create' ? 'Failed to create group' : 'Failed to update group')
      console.error('Error saving group:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Group'
      case 'edit':
        return 'Edit Group'
      case 'view':
        return 'View Group'
      default:
        return 'Group'
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
            crudEntity: "groupFormModal1",
            crudMode: mode,
          }}
          title={getTitle()}
          subtitle={mode === 'view' ? formData.name : undefined}
          icon={<GroupIcon />}
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
              crudEntity: "groupFormModal1",
              crudMode: mode,
            })
            return result
          }}
          maxWidth="md"
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
        title="Group Information"
        subtitle="Basic group details"
        icon={<GroupIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Group Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="e.g., Hot Drinks, Main Courses"
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
              label="Default Group"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="Describe this product group and what items it contains..."
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Layout Information */}
      <FormSection
        title="Layout Information"
        subtitle="Group layout and organization"
        icon={<LayoutIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Layout Items: {formData.layout.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use the Group Designer to configure the layout and arrangement of items in this group.
            </Typography>
          </Grid>
        </Grid>
      </FormSection>

      {/* Summary Section for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Group Summary"
          subtitle="Complete group overview"
          icon={<TagIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.isDefault ? 'Default Group' : 'Custom Group'}
                  color={formData.isDefault ? 'primary' : 'default'}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Layout Items
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formData.layout.length} items
              </Typography>
            </Grid>
            {group?.createdAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(group.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
            {group?.updatedAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(group.updatedAt).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}
    </CRUDModal>
  )
}

export default GroupForm

