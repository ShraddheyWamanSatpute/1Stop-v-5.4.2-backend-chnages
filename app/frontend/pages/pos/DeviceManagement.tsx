"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import POSSettingsTable from "../../components/pos/POSSettingsTable"
import DeviceForm from "../../components/pos/forms/DeviceForm"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"

// Using Device interface from POS interfaces
import type { Device } from "../../../backend/interfaces/POS"

type DeviceType = "till" | "printer" | "scanner" | "scale" | "display"
type ConnectionType = "usb" | "ethernet" | "wifi" | "bluetooth"

const DeviceManagement: React.FC = () => {
  const location = useLocation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [formData, setFormData] = useState<Partial<Device>>({})
  
  // Form states
  const [deviceFormOpen, setDeviceFormOpen] = useState(false)
  const [deviceFormMode, setDeviceFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedDeviceForForm, setSelectedDeviceForForm] = useState<Device | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  const { hasPermission } = useCompany()
  const { 
    state: { devices, loading },
    refreshDevices,
    createDevice,
    updateDevice,
    deleteDevice
  } = usePOS()

  // Check permissions
  const canView = hasPermission("pos", "devices", "view")
  const canEdit = hasPermission("pos", "devices", "edit")
  const canDelete = hasPermission("pos", "devices", "delete")

  const deviceTypes = [
    { value: "pos_terminal", label: "POS Terminal" },
    { value: "receipt_printer", label: "Receipt Printer" },
    { value: "other", label: "Barcode Scanner" },
    { value: "other", label: "Digital Scale" },
    { value: "display", label: "Customer Display" },
  ]

  const connectionTypes = [
    { value: "usb", label: "USB" },
    { value: "ethernet", label: "Ethernet" },
    { value: "wifi", label: "WiFi" },
    { value: "bluetooth", label: "Bluetooth" },
  ]

  const columns = [
    { id: "name", label: "Device Name", minWidth: 200 },
    {
      id: "type",
      label: "Type",
      minWidth: 120,
      format: (value: DeviceType) => {
        const typeLabel = deviceTypes.find((t) => t.value === value)?.label || value
        return typeLabel
      },
    },
    {
      id: "status",
      label: "Status",
      minWidth: 100,
      format: (value: string) => {
        return value.charAt(0).toUpperCase() + value.slice(1)
      },
    },
    { id: "location", label: "Location", minWidth: 150 },
    { id: "model", label: "Model", minWidth: 150 },
    {
      id: "connectionType",
      label: "Connection",
      minWidth: 120,
      format: (value: ConnectionType) => {
        const connLabel = connectionTypes.find((c) => c.value === value)?.label || value
        return connLabel
      },
    },
  ]


  const sortOptions = [
    { value: 'name', label: 'Device Name' },
    { value: 'type', label: 'Type' },
    { value: 'status', label: 'Status' },
    { value: 'location', label: 'Location' },
    { value: 'model', label: 'Model' }
  ]

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting devices as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  useEffect(() => {
    refreshDevices()
  }, [])


  const handleDelete = async (id: string) => {
    if (!canDelete) return

    if (window.confirm("Are you sure you want to delete this device?")) {
      try {
        // Delete device using POS context
        await deleteDevice(id)
        setError(null)
      } catch (error) {
        console.error("Error deleting device:", error)
        setError("Failed to delete device")
      }
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.name) {
        setError("Device name is required")
        return
      }

      const deviceData: Omit<Device, "id" | "createdAt" | "updatedAt"> = {
        name: formData.name,
        type: formData.type || "pos_terminal",
        model: formData.model || "",
        serialNumber: formData.serialNumber || "",
        ipAddress: formData.ipAddress,
        locationId: formData.locationId || "",
        isOnline: formData.isOnline ?? false,
        isActive: formData.isActive ?? true,
      }

      if (editingDevice) {
        // Update device using POS context
        await updateDevice(editingDevice.id, deviceData)
      } else {
        // Create device using POS context
        await createDevice(deviceData)
      }

      setDialogOpen(false)
      setFormData({})
      setEditingDevice(null)
      setError(null)
    } catch (error) {
      console.error("Error saving device:", error)
      setError("Failed to save device")
    }
  }

  const handleInputChange = (field: keyof Device, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Form handlers
  const handleOpenDeviceForm = (device: Device | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedDeviceForForm(device)
    setDeviceFormMode(mode)
    setDeviceFormOpen(true)
  }

  const handleCloseDeviceForm = () => {
    setDeviceFormOpen(false)
    setSelectedDeviceForForm(null)
    setDeviceFormMode('create')
  }

  const handleDeviceCrudSave = async (formData: any) => {
    try {
      if (deviceFormMode === "create") {
        await createDevice(formData)
      } else if (deviceFormMode === "edit" && selectedDeviceForForm) {
        await updateDevice(selectedDeviceForForm.id, formData)
      } else {
        return
      }
      await refreshDevices()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "deviceManagementModal1",
        crudMode: deviceFormMode,
        id: selectedDeviceForForm?.id,
        itemLabel: formData?.name,
      })
      handleCloseDeviceForm()
    } catch (err) {
      console.error("Error saving device:", err)
      setError("Failed to save device")
    }
  }

  if (!canView) {
    return (
      <Box p={3}>
        <Alert severity="error">You don't have permission to view devices.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 0 }}>


      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search devices..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={canEdit ? () => handleOpenDeviceForm(null, 'create') : undefined}
        createButtonLabel="Add Device"
      />

      
      {/* Stats Cards */}
      <StatsSection
        stats={[
          {
            value: devices.length,
            label: "Total Devices",
            color: "primary"
          },
          {
            value: devices.filter(device => device.isOnline).length,
            label: "Online",
            color: "success"
          },
          {
            value: devices.filter(device => !device.isOnline).length,
            label: "Offline",
            color: "error"
          },
          {
            value: devices.filter(device => !device.isActive).length,
            label: "Inactive",
            color: "warning"
          }
        ]}
      />

      {/* Devices Table with search/sort applied */}
      <POSSettingsTable
        title=""
        data={[...devices]
          .filter((d) => {
            const q = searchTerm.trim().toLowerCase()
            if (!q) return true
            return (
              (d.name || '').toLowerCase().includes(q) ||
              (d.model || '').toLowerCase().includes(q) ||
              (d.locationId || '').toLowerCase().includes(q) ||
              (d.type || '').toLowerCase().includes(q) ||
              (d.serialNumber || '').toLowerCase().includes(q)
            )
          })
          .sort((a, b) => {
            const dir = sortDirection === 'asc' ? 1 : -1
            const field = sortBy
            if (field === 'name') return (a.name || '').localeCompare(b.name || '') * dir
            if (field === 'type') return (a.type || '').localeCompare(b.type || '') * dir
            if (field === 'status') return ((a.isOnline ? 1 : 0) - (b.isOnline ? 1 : 0)) * dir
            if (field === 'location') return (a.locationId || '').localeCompare(b.locationId || '') * dir
            if (field === 'model') return (a.model || '').localeCompare(b.model || '') * dir
            return 0
          })}
        columns={columns}
        loading={loading}
        onAdd={undefined}
        onView={canView ? (device: Device) => handleOpenDeviceForm(device, 'view') : undefined}
        onEdit={canEdit ? (device: Device) => handleOpenDeviceForm(device, 'edit') : undefined}
        onDelete={canDelete ? handleDelete : undefined}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingDevice ? "Edit Device" : "Add New Device"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Device Name"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Device Type</InputLabel>
                <Select
                  value={formData.type || "till"}
                  onChange={(e) => handleInputChange("type", e.target.value as DeviceType)}
                  label="Device Type"
                >
                  {deviceTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Connection Type</InputLabel>
                <Select
                  value={formData.ipAddress ? "ethernet" : "other"}
                  onChange={(e) => setFormData({...formData, ipAddress: e.target.value === "ethernet" ? "" : undefined})}
                  label="Connection Type"
                >
                  {connectionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.locationId || ""}
                onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="IP Address"
                value={formData.ipAddress || ""}
                onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="MAC Address"
                value={formData.macAddress || ""}
                onChange={(e) => setFormData({...formData, macAddress: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Model"
                value={formData.model || ""}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Serial Number"
                value={formData.serialNumber || ""}
                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingDevice ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Form Modal */}
      <CRUDModal
        open={deviceFormOpen}
        onClose={(reason) => {
          setDeviceFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedDeviceForForm(null)
            setDeviceFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "deviceManagementModal1",
          crudMode: deviceFormMode,
          id: selectedDeviceForForm?.id,
          itemLabel: selectedDeviceForForm?.name,
        }}
        title={
          deviceFormMode === "create"
            ? "Add device"
            : deviceFormMode === "edit"
              ? "Edit device"
              : "View device"
        }
        icon={<SaveIcon />}
        mode={deviceFormMode}
        onEdit={() => setDeviceFormMode("edit")}
        onSave={deviceFormMode !== "view" ? () => Promise.resolve() : undefined}
        hideSaveButton={deviceFormMode === "view"}
        maxWidth="md"
      >
        <DeviceForm
          device={selectedDeviceForForm}
          mode={deviceFormMode}
          onSave={handleDeviceCrudSave}
        />
      </CRUDModal>
    </Box>
  )
}

export default DeviceManagement
