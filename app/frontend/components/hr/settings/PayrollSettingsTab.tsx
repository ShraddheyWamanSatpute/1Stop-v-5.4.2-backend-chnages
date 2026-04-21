"use client"

import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material"
import {
  Save as SaveIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material"
import { useHR } from "../../../../backend/context/HRContext"

interface PayrollSettings {
  defaultPayFrequency: 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly'
  defaultPayDay: number // 1-31 for monthly, 1-7 for weekly
  defaultTaxCode: string
  defaultNICategory: string
  defaultPensionScheme?: string
  defaultPensionSchemeReference?: string
  autoEnrolmentPostponement: number
  payrollCutoffDay: number // Day of month for payroll cutoff
  paymentProcessingDays: number // Days between payroll and payment
  enableServiceCharge: boolean
  enableTronc: boolean
  enableBonuses: boolean
  enableCommission: boolean
  payrollRetentionYears: number
  autoArchiveOldRecords: boolean
}

const PayrollSettingsTab: React.FC = () => {
  const { loadHRPayrollSettings, saveHRPayrollSettings } = useHR()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [settings, setSettings] = useState<PayrollSettings>({
    defaultPayFrequency: 'monthly',
    defaultPayDay: 25,
    defaultTaxCode: '1257L',
    defaultNICategory: 'A',
    autoEnrolmentPostponement: 0,
    payrollCutoffDay: 20,
    paymentProcessingDays: 5,
    enableServiceCharge: false,
    enableTronc: false,
    enableBonuses: true,
    enableCommission: true,
    payrollRetentionYears: 6,
    autoArchiveOldRecords: false,
  })

  useEffect(() => {
    loadSettings()
  }, [loadHRPayrollSettings])

  const loadSettings = async () => {
    try {
      const val = await loadHRPayrollSettings()
      if (val) setSettings((prev) => ({ ...prev, ...(val as any) }))
    } catch (err: any) {
      console.error('Error loading payroll settings:', err)
      setError(`Failed to load settings: ${err.message}`)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      await saveHRPayrollSettings(settings as any)

      setSuccess('Payroll settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error saving payroll settings:', err)
      setError(`Failed to save settings: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof PayrollSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Payroll Settings
      </Typography>

      {/* Default Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Default Payroll Settings" avatar={<AccountBalanceIcon />} />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Default Pay Frequency</InputLabel>
                <Select
                  value={settings.defaultPayFrequency}
                  onChange={(e) => handleChange('defaultPayFrequency', e.target.value)}
                  label="Default Pay Frequency"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="fortnightly">Fortnightly</MenuItem>
                  <MenuItem value="four_weekly">Four Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Default Pay Day"
                value={settings.defaultPayDay}
                onChange={(e) => handleChange('defaultPayDay', parseInt(e.target.value) || 1)}
                helperText="Day of month (1-31) or day of week (1-7)"
                inputProps={{ min: 1, max: 31 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Default Tax Code"
                value={settings.defaultTaxCode}
                onChange={(e) => handleChange('defaultTaxCode', e.target.value)}
                helperText="Default tax code for new employees (e.g., 1257L)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Default NI Category</InputLabel>
                <Select
                  value={settings.defaultNICategory}
                  onChange={(e) => handleChange('defaultNICategory', e.target.value)}
                  label="Default NI Category"
                >
                  <MenuItem value="A">A - Standard</MenuItem>
                  <MenuItem value="B">B - Married Women</MenuItem>
                  <MenuItem value="C">C - Over State Pension Age</MenuItem>
                  <MenuItem value="H">H - Apprentice Under 25</MenuItem>
                  <MenuItem value="M">M - Under 21</MenuItem>
                  <MenuItem value="Z">Z - Under 21 Deferred</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Pension Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Pension Settings" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Default Pension Scheme"
                value={settings.defaultPensionScheme || ""}
                onChange={(e) => handleChange('defaultPensionScheme', e.target.value)}
                helperText="Default pension scheme name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Pension Scheme Reference (PSTR)"
                value={settings.defaultPensionSchemeReference || ""}
                onChange={(e) => handleChange('defaultPensionSchemeReference', e.target.value)}
                helperText="Pension Scheme Tax Reference"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Auto-Enrolment Postponement (Months)"
                value={settings.autoEnrolmentPostponement}
                onChange={(e) => handleChange('autoEnrolmentPostponement', parseInt(e.target.value) || 0)}
                helperText="Months to postpone auto-enrolment (0-3)"
                inputProps={{ min: 0, max: 3 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payroll Processing */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Payroll Processing" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Payroll Cutoff Day"
                value={settings.payrollCutoffDay}
                onChange={(e) => handleChange('payrollCutoffDay', parseInt(e.target.value) || 1)}
                helperText="Day of month for payroll cutoff"
                inputProps={{ min: 1, max: 31 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Payment Processing Days"
                value={settings.paymentProcessingDays}
                onChange={(e) => handleChange('paymentProcessingDays', parseInt(e.target.value) || 0)}
                helperText="Days between payroll calculation and payment"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Features */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Payroll Features" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableServiceCharge}
                    onChange={(e) => handleChange('enableServiceCharge', e.target.checked)}
                  />
                }
                label="Enable Service Charge"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableTronc}
                    onChange={(e) => handleChange('enableTronc', e.target.checked)}
                  />
                }
                label="Enable Tronc (Hospitality)"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableBonuses}
                    onChange={(e) => handleChange('enableBonuses', e.target.checked)}
                  />
                }
                label="Enable Bonuses"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableCommission}
                    onChange={(e) => handleChange('enableCommission', e.target.checked)}
                  />
                }
                label="Enable Commission"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Data Retention" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Payroll Retention Years"
                value={settings.payrollRetentionYears}
                onChange={(e) => handleChange('payrollRetentionYears', parseInt(e.target.value) || 6)}
                helperText="Minimum 6 years for HMRC compliance"
                inputProps={{ min: 6 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoArchiveOldRecords}
                    onChange={(e) => handleChange('autoArchiveOldRecords', e.target.checked)}
                  />
                }
                label="Automatically archive old payroll records"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button variant="outlined" onClick={loadSettings} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          Save Settings
        </Button>
      </Box>

      {/* Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Box>
  )
}

export default PayrollSettingsTab

