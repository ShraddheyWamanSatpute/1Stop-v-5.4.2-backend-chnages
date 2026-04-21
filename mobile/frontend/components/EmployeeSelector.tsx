/**
 * ESS Employee Selector
 * 
 * Allows owners to select an employee to view the ESS portal as
 */

"use client"

import React, { useState, useMemo } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material"
import { useESS } from "../../backend/context/MobileContext"
import { useHR } from "../../../app/backend/context/HRContext"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import { useSettings } from "../../../app/backend/context/SettingsContext"

interface ESSEmployeeSelectorProps {
  open: boolean
  onClose: () => void
}

const ESSEmployeeSelector: React.FC<ESSEmployeeSelectorProps> = ({ open, onClose }) => {
  const { state: essState, setEmulatedEmployee, clearEmulatedEmployee } = useESS()
  const { state: hrState } = useHR()
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  const [selectedId, setSelectedId] = useState<string>(essState.emulatedEmployeeId || "")

  // Check if user is owner
  const isOwner = useMemo(() => {
    const currentCompanyId = companyState.companyID || settingsState.user?.currentCompanyID
    return settingsState?.user?.companies?.find(
      (c: any) => c.companyID === currentCompanyId
    )?.role === 'owner' || companyState.user?.role?.toLowerCase() === 'owner'
  }, [settingsState?.user?.companies, companyState.companyID, companyState.user?.role])

  // Don't show if not owner
  if (!isOwner) {
    return null
  }

  const handleChange = (event: any) => {
    const newId = event.target.value
    setSelectedId(newId)
    if (newId) {
      setEmulatedEmployee(newId)
    } else {
      clearEmulatedEmployee()
    }
  }

  const handleClose = () => {
    onClose()
  }

  // Loading state
  if (!hrState.initialized || hrState.isLoading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Select Employee</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    )
  }

  // No employees
  if (!hrState.employees || hrState.employees.length === 0) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Select Employee</DialogTitle>
        <DialogContent>
          <Alert severity="info">No employees found in the current location.</Alert>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Employee to View As</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Employee</InputLabel>
            <Select
              value={selectedId}
              onChange={handleChange}
              label="Employee"
            >
              <MenuItem value="">
                <em>None (View as Owner)</em>
              </MenuItem>
              {hrState.employees.map((emp: any) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} {emp.email ? `(${emp.email})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {essState.emulatedEmployeeId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              You are currently viewing the portal as{" "}
              {hrState.employees.find((e: any) => e.id === essState.emulatedEmployeeId)?.firstName || "selected employee"}
            </Alert>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default ESSEmployeeSelector

