"use client"

import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormControlLabel,
  Typography,
  Avatar,
  Button,
  IconButton,
  Tabs,
  Tab,
  Paper,
  RadioGroup,
  Radio,
  Checkbox,
  Alert,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { isValid } from 'date-fns'
import { enGB } from 'date-fns/locale'
import {
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  AttachMoney as AttachMoneyIcon,
  Add as AddIcon,
  AccountBalance as AccountBalanceIcon,
  School as SchoolIcon,
  Description as DescriptionIcon,
  Link as LinkIcon,
  AttachFile as AttachFileIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteDocumentIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'
import type { Employee } from '../../../../backend/interfaces/HRs'

interface EmployeeCRUDFormProps {
  employee?: Employee | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void | Promise<void>
}

export interface EmployeeCRUDFormHandle {
  submit: () => void | Promise<void>
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

const EmployeeCRUDForm = React.forwardRef<EmployeeCRUDFormHandle, EmployeeCRUDFormProps>(
  ({ employee, mode, onSave }, ref) => {
  const { state: hrState } = useHR()
  const [tabValue, setTabValue] = useState(0)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Numeric fields: allow blank input (''), and avoid "locking" at 0 when the user clears the field.
  const asBlankableNumber = (raw: string) => (raw === '' ? '' : Number(raw))

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: null as Date | null,
    nationalInsuranceNumber: '',
    hireDate: new Date(),
    status: 'active' as 'active' | 'inactive' | 'on_leave' | 'terminated',
    roleId: '',
    departmentId: '',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'temporary',
    payType: 'salary' as 'salary' | 'hourly',
    salary: '' as number | '',
    hourlyRate: '' as number | '',
    hoursPerWeek: 40 as number | '',
    holidaysPerYear: 25 as number | '',
    photo: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'UK'
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    bankDetails: {
      accountName: '',
      accountNumber: '',
      routingNumber: '',
      bankName: ''
    },
    // HMRC Tax & NI Fields
    taxCode: '1257L',
    taxCodeBasis: 'cumulative' as 'cumulative' | 'week1month1',
    niCategory: 'A' as 'A' | 'B' | 'C' | 'F' | 'H' | 'I' | 'J' | 'L' | 'M' | 'S' | 'V' | 'Z',
    isDirector: false,
    directorNICalculationMethod: 'annual' as 'annual' | 'alternative',
    // Starter Information
    starterDeclaration: undefined as 'A' | 'B' | 'C' | undefined,
    // Student Loans
    studentLoanPlan: 'none' as 'none' | 'plan1' | 'plan2' | 'plan4',
    hasPostgraduateLoan: false,
    // Pension
    autoEnrolmentStatus: 'not_eligible' as 'eligible' | 'enrolled' | 'opted_out' | 'not_eligible' | 'postponed',
    pensionSchemeReference: '',
    pensionContributionPercentage: 5,
    // Payment Frequency
    paymentFrequency: 'monthly' as 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly',
    // Tronc (Hospitality)
    troncParticipant: false,
    troncType: 'points' as 'points' | 'flat_rate' | 'percentage',
    troncPoints: '' as number | '',
    troncFlatRate: '' as number | '',
    troncPercentage: '' as number | '',
    // Scheduling
    doNotIncludeOnRota: false,
  })

  // Emergency contacts array for multiple contacts
  const [emergencyContacts, setEmergencyContacts] = useState<Array<{
    id: string
    name: string
    relationship: string
    phone: string
    email: string
  }>>([])

  // Sync department when role is set (for existing employees or when role changes)
  useEffect(() => {
    if (formData.roleId && hrState.roles && hrState.roles.length > 0) {
      const selectedRole = hrState.roles.find(r => r.id === formData.roleId)
      if (selectedRole) {
        // Check both departmentId (primary) and department (fallback) fields
        const roleDeptId = selectedRole.departmentId || (selectedRole as any).departmentID || (selectedRole as any).department
        if (roleDeptId) {
          // Only update if department is not set or doesn't match the role's department
          if (!formData.departmentId || formData.departmentId !== roleDeptId) {
            console.log("🔍 EmployeeCRUDForm - useEffect syncing department from role:", {
              roleId: formData.roleId,
              roleName: selectedRole.label || selectedRole.name,
              departmentId: roleDeptId,
              currentDepartmentId: formData.departmentId
            })
            setFormData(prev => ({
              ...prev,
              departmentId: roleDeptId
            }))
          }
        }
      }
    }
  }, [formData.roleId, hrState.roles])

  // Update form data when employee prop changes
  useEffect(() => {
    if (employee) {
      const roleId = employee.roleId || ''
      const departmentId = employee.departmentId || ''
      
      // If role is set but department is not, try to get department from role
      let finalDepartmentId = departmentId
      if (roleId && !departmentId) {
        const role = hrState.roles?.find(r => r.id === roleId)
        if (role && role.departmentId) {
          finalDepartmentId = role.departmentId
        }
      }
      
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        middleName: employee.middleName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        gender: employee.gender || '',
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
        nationalInsuranceNumber: employee.nationalInsuranceNumber || '',
        hireDate: employee.hireDate ? new Date(employee.hireDate) : new Date(),
        status: employee.status || 'active',
        roleId: roleId,
        departmentId: finalDepartmentId,
        employmentType: (employee.employmentType as 'full_time' | 'part_time' | 'contract' | 'temporary') || 'full_time',
        payType: employee.payType || 'salary',
        salary: (employee.salary ?? 0) === 0 ? '' : (employee.salary as any),
        hourlyRate: (employee.hourlyRate ?? 0) === 0 ? '' : (employee.hourlyRate as any),
        hoursPerWeek: (employee.hoursPerWeek ?? 40) === 0 ? '' : (employee.hoursPerWeek as any) || 40,
        holidaysPerYear: (employee.holidaysPerYear ?? 25) === 0 ? '' : (employee.holidaysPerYear as any) || 25,
        photo: employee.photo || '',
        address: employee.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'UK'
        },
        emergencyContact: employee.emergencyContact ? {
          name: employee.emergencyContact.name || '',
          relationship: employee.emergencyContact.relationship || '',
          phone: employee.emergencyContact.phone || '',
          email: (employee.emergencyContact as any).email || ''
        } : {
          name: '',
          relationship: '',
          phone: '',
          email: ''
        },
        bankDetails: employee.bankDetails || {
          accountName: '',
          accountNumber: '',
          routingNumber: '',
          bankName: ''
        },
        // HMRC Fields
        taxCode: employee.taxCode || '1257L',
        taxCodeBasis: employee.taxCodeBasis || 'cumulative',
        niCategory: employee.niCategory || 'A',
        isDirector: employee.isDirector || false,
        directorNICalculationMethod: employee.directorNICalculationMethod || 'annual',
        starterDeclaration: employee.starterDeclaration,
        studentLoanPlan: employee.studentLoanPlan || 'none',
        hasPostgraduateLoan: employee.hasPostgraduateLoan || false,
        autoEnrolmentStatus: employee.autoEnrolmentStatus || 'not_eligible',
        pensionSchemeReference: employee.pensionSchemeReference || '',
        pensionContributionPercentage: employee.pensionContributionPercentage || 5,
        paymentFrequency: employee.paymentFrequency || 'monthly',
        troncParticipant: employee.troncParticipant || false,
        troncType: (employee as any).troncType || 'points',
        troncPoints: (employee.troncPoints ?? 0) === 0 ? '' : (employee.troncPoints as any),
        troncFlatRate: ((employee as any).troncFlatRate ?? 0) === 0 ? '' : ((employee as any).troncFlatRate as any),
        troncPercentage: ((employee as any).troncPercentage ?? 0) === 0 ? '' : ((employee as any).troncPercentage as any),
        doNotIncludeOnRota: employee.doNotIncludeOnRota || false,
      })
      setPhotoPreview(employee.photo || null)

      // Keep the multi-contact UI in sync with stored data.
      // Source of truth (historical): employee.emergencyContact (single).
      // Optional newer shape: employee.emergencyContacts (array).
      const existingContactsRaw = (employee as any).emergencyContacts
      const existingContacts: Array<any> = Array.isArray(existingContactsRaw)
        ? existingContactsRaw
        : employee.emergencyContact
          ? [employee.emergencyContact]
          : []

      setEmergencyContacts(
        existingContacts.map((c, idx) => ({
          id: String(c?.id ?? idx),
          name: String(c?.name ?? ''),
          relationship: String(c?.relationship ?? ''),
          phone: String(c?.phone ?? ''),
          email: String(c?.email ?? ''),
        })),
      )
    } else {
      // Reset when switching to create mode / no employee selected
      setEmergencyContacts([])
    }
  }, [employee])

  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any || {}),
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  /**
   * MUI DatePicker can emit `null` while the user is typing an incomplete/invalid date.
   * If we store that `null` into state, the field keeps clearing and "won't let you type".
   * So we only commit when the date is valid.
   */
  const handleSafeDateChange = (field: 'dateOfBirth' | 'hireDate', date: Date | null) => {
    setFormData(prev => {
      const prevValue = prev[field]

      // For DOB, allow explicit clears (e.g. clear button), but ignore repeated nulls while typing from empty.
      if (date === null) {
        if (field === 'dateOfBirth') {
          return prevValue === null ? prev : { ...prev, dateOfBirth: null }
        }
        // Hire date is required; ignore nulls (common during typing).
        return prev
      }

      if (!isValid(date)) return prev
      return { ...prev, [field]: date }
    })
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setPhotoPreview(result)
        handleChange('photo', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    handleChange('photo', '')
  }

  const addEmergencyContact = () => {
    const newContact = {
      id: Date.now().toString(),
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }
    setEmergencyContacts(prev => [...prev, newContact])
  }

  const updateEmergencyContact = (id: string, updates: Partial<typeof emergencyContacts[0]>) => {
    setEmergencyContacts(prev => prev.map(contact => 
      contact.id === id ? { ...contact, ...updates } : contact
    ))
  }

  const removeEmergencyContact = (id: string) => {
    setEmergencyContacts(prev => prev.filter(contact => contact.id !== id))
  }

  const isReadOnly = mode === 'view'

  const submit = useCallback(async () => {
    if (isReadOnly) return

    // Basic guardrails to avoid saving empty / invalid payloads
    const requiredMissing =
      !formData.firstName?.trim() ||
      !formData.lastName?.trim() ||
      !formData.email?.trim() ||
      !formData.departmentId?.trim()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmail = formData.email?.trim() ? !emailRegex.test(formData.email.trim()) : true

    if (requiredMissing || invalidEmail) {
      console.warn('EmployeeCRUDForm: cannot submit - missing required fields or invalid email', {
        firstName: !!formData.firstName?.trim(),
        lastName: !!formData.lastName?.trim(),
        email: formData.email,
        departmentId: formData.departmentId,
      })
      return
    }

    const now = Date.now()
    const hireDateMs =
      formData.hireDate instanceof Date ? formData.hireDate.getTime() : Number(formData.hireDate)
    const dobMs =
      formData.dateOfBirth instanceof Date
        ? formData.dateOfBirth.getTime()
        : formData.dateOfBirth
          ? Number(formData.dateOfBirth)
          : undefined

    const payload: any = {
      // Basic Information
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      middleName: formData.middleName?.trim() || '',
      email: formData.email.trim(),
      phone: formData.phone?.trim() || '',
      gender: formData.gender || '',
      nationalInsuranceNumber: formData.nationalInsuranceNumber?.trim() || '',
      photo: formData.photo || '',
      
      // Employment Information
      hireDate: Number.isFinite(hireDateMs) ? hireDateMs : now,
      status: formData.status || 'active',
      roleId: formData.roleId || undefined,
      departmentId: formData.departmentId || '',
      employmentType: formData.employmentType || 'full_time',
      
      // Compensation
      payType: formData.payType || 'salary',
      salary: formData.salary === '' ? undefined : (formData.salary !== undefined ? Number(formData.salary) : undefined),
      hourlyRate: formData.hourlyRate === '' ? undefined : (formData.hourlyRate !== undefined ? Number(formData.hourlyRate) : undefined),
      hoursPerWeek: formData.hoursPerWeek === '' ? undefined : (formData.hoursPerWeek !== undefined ? Number(formData.hoursPerWeek) : undefined),
      holidaysPerYear: formData.holidaysPerYear === '' ? undefined : (formData.holidaysPerYear !== undefined ? Number(formData.holidaysPerYear) : undefined),
      paymentFrequency: formData.paymentFrequency || 'monthly',
      
      // Address
      address: formData.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'UK'
      },
      
      // Bank Details
      bankDetails: formData.bankDetails || {
        accountName: '',
        accountNumber: '',
        routingNumber: '',
        bankName: ''
      },
      
      // Tax & NI Fields
      taxCode: formData.taxCode || '1257L',
      taxCodeBasis: formData.taxCodeBasis || 'cumulative',
      niCategory: formData.niCategory || 'A',
      isDirector: formData.isDirector || false,
      directorNICalculationMethod: formData.directorNICalculationMethod || 'annual',
      starterDeclaration: formData.starterDeclaration || undefined,
      
      // Student Loans
      studentLoanPlan: formData.studentLoanPlan || 'none',
      hasPostgraduateLoan: formData.hasPostgraduateLoan || false,
      
      // Pension
      autoEnrolmentStatus: formData.autoEnrolmentStatus || 'not_eligible',
      pensionSchemeReference: formData.pensionSchemeReference || '',
      pensionContributionPercentage: formData.pensionContributionPercentage || 5,
      
      // Tronc (Hospitality)
      troncParticipant: formData.troncParticipant || false,
      troncType: formData.troncType || 'points',
      troncPoints: formData.troncPoints === '' ? undefined : (formData.troncPoints !== undefined ? Number(formData.troncPoints) : undefined),
      troncFlatRate: formData.troncFlatRate === '' ? undefined : (formData.troncFlatRate !== undefined ? Number(formData.troncFlatRate) : undefined),
      troncPercentage: formData.troncPercentage === '' ? undefined : (formData.troncPercentage !== undefined ? Number(formData.troncPercentage) : undefined),
      
      // Scheduling
      doNotIncludeOnRota: formData.doNotIncludeOnRota || false,
      
      // Timestamps
      createdAt: mode === 'create' ? now : (employee?.createdAt ?? now),
    }

    // Normalize emergency contacts:
    // - UI edits happen in `emergencyContacts` (array)
    // - Core model historically uses `emergencyContact` (single)
    const normalizedEmergencyContacts = emergencyContacts
      .map(({ id: _id, ...rest }) => rest)
      .map((c) => ({
        name: String(c.name ?? '').trim(),
        relationship: String(c.relationship ?? '').trim(),
        phone: String(c.phone ?? '').trim(),
        email: String((c as any).email ?? '').trim(),
      }))
      .filter((c) => c.name || c.relationship || c.phone || c.email)

    delete payload.emergencyContact
    delete payload.emergencyContacts
    if (normalizedEmergencyContacts.length === 0) {
      // Setting to null clears existing data in RTDB (important for edits).
      payload.emergencyContact = null
    } else {
      payload.emergencyContact = normalizedEmergencyContacts[0]
      // Keep the full list for future multi-contact support (safe extra field in RTDB).
      payload.emergencyContacts = normalizedEmergencyContacts
    }

    // Avoid RTDB update() rejecting undefined values
    // Normalize DOB:
    // - blank => null (clears existing field in RTDB)
    // - valid => number (ms)
    // - invalid/unknown => omit
    delete payload.dateOfBirth
    if (formData.dateOfBirth === "" || formData.dateOfBirth === null) {
      payload.dateOfBirth = null
    } else if (dobMs !== undefined && Number.isFinite(dobMs)) {
      payload.dateOfBirth = dobMs
    }

    // Preserve documents if they exist (from employee or from form)
    if ((employee as any)?.documents) {
      payload.documents = (employee as any).documents
    }
    
    // Strip any remaining undefined keys (Firebase RTDB rejects undefined in update()).
    // But preserve null values and ensure address/bankDetails are always objects
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) {
        delete payload[k]
      } else if (k === 'address' || k === 'bankDetails') {
        // Ensure address and bankDetails are always objects (even if empty)
        if (!payload[k] || typeof payload[k] !== 'object' || Array.isArray(payload[k])) {
          payload[k] = k === 'address' 
            ? { street: '', city: '', state: '', zipCode: '', country: 'UK' }
            : { accountName: '', accountNumber: '', routingNumber: '', bankName: '' }
        }
      }
    })
    
    if (mode === 'edit') {
      payload.updatedAt = now
    }

    await onSave(payload)
  }, [employee?.createdAt, formData, isReadOnly, mode, onSave])

  useImperativeHandle(ref, () => ({ submit }), [submit])

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 120,
              }
            }}
          >
            <Tab icon={<PersonIcon />} label="Personal Info" />
            <Tab icon={<WorkIcon />} label="Employment" />
            <Tab icon={<AttachMoneyIcon />} label="Compensation" />
            <Tab icon={<AccountBalanceIcon />} label="Tax & NI" />
            <Tab icon={<SchoolIcon />} label="Pensions & Loans" />
            <Tab 
              icon={<AttachFileIcon />} 
              label="Documents" 
              disabled={!employee?.id}
            />
            <Tab 
              icon={<DescriptionIcon />} 
              label="Contract" 
              disabled={!employee?.id}
            />
          </Tabs>

          {/* Personal Information Tab */}
          <TabPanel value={tabValue} index={0}>
            <FormSection title="Basic Information">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <Avatar
                        src={photoPreview || undefined}
                        sx={{ width: 120, height: 120 }}
                      >
                        {formData.firstName.charAt(0)}
                        {formData.lastName.charAt(0)}
                      </Avatar>
                      {employee?.userId && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            bgcolor: 'success.main',
                            borderRadius: '50%',
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 2,
                            borderColor: 'background.paper',
                          }}
                          title="Account linked"
                        >
                          <LinkIcon sx={{ fontSize: 16, color: 'white' }} />
                        </Box>
                      )}
                    </Box>
                    {!isReadOnly && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="photo-upload"
                          type="file"
                          onChange={handlePhotoChange}
                        />
                        <label htmlFor="photo-upload">
                          <Button 
                            variant="outlined" 
                            component="span" 
                            startIcon={<PhotoCameraIcon />} 
                            size="small"
                          >
                            Upload
                          </Button>
                        </label>
                        {photoPreview && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={handleRemovePhoto}
                          >
                            Remove
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="First Name"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        required
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Middle Name"
                        value={formData.middleName}
                        onChange={(e) => handleChange('middleName', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        required
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required disabled={isReadOnly}>
                        <InputLabel>Gender</InputLabel>
                        <Select
                          value={formData.gender}
                          onChange={(e) => handleChange('gender', e.target.value)}
                          label="Gender"
                        >
                          <MenuItem value="male">Male</MenuItem>
                          <MenuItem value="female">Female</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                          <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Date of Birth"
                        value={formData.dateOfBirth}
                        onChange={(date) => handleSafeDateChange('dateOfBirth', date)}
                        disabled={isReadOnly}
                        maxDate={new Date(new Date().setDate(new Date().getDate() - 1))}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: formData.dateOfBirth && formData.dateOfBirth >= new Date(new Date().setHours(0, 0, 0, 0)),
                            helperText: formData.dateOfBirth && formData.dateOfBirth >= new Date(new Date().setHours(0, 0, 0, 0)) 
                              ? "Date of birth cannot be today or in the future" 
                              : "DD/MM/YYYY format"
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        required
                        disabled={isReadOnly}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </FormSection>

            <FormSection title="Address Information">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    value={formData.address.street}
                    onChange={(e) => handleChange('address.street', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.address.city}
                    onChange={(e) => handleChange('address.city', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Postcode"
                    value={formData.address.zipCode}
                    onChange={(e) => handleChange('address.zipCode', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Country"
                    value={formData.address.country}
                    onChange={(e) => handleChange('address.country', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
              </Grid>
            </FormSection>

            <FormSection title="Emergency Contacts">
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Emergency Contacts</Typography>
                {!isReadOnly && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addEmergencyContact}
                  >
                    Add Contact
                  </Button>
                )}
              </Box>
              
              {emergencyContacts.map((contact) => (
                <Paper key={contact.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Name"
                        value={contact.name}
                        onChange={(e) => updateEmergencyContact(contact.id, { name: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2.5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Relationship"
                        value={contact.relationship}
                        onChange={(e) => updateEmergencyContact(contact.id, { relationship: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2.5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Phone"
                        value={contact.phone}
                        onChange={(e) => updateEmergencyContact(contact.id, { phone: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Email"
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateEmergencyContact(contact.id, { email: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </Grid>
                    {!isReadOnly && (
                      <Grid item xs={12} sm={1}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeEmergencyContact(contact.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              ))}
              
              {emergencyContacts.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No emergency contacts added. {!isReadOnly && 'Click "Add Contact" to add contact information.'}
                </Typography>
              )}
            </FormSection>
          </TabPanel>

          {/* Employment Tab */}
          <TabPanel value={tabValue} index={1}>
            <FormSection title="Role & Department">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={formData.departmentId}
                      onChange={(e) => {
                        const newDepartmentId = e.target.value
                        // Update department
                        setFormData(prev => {
                          const updated = {
                            ...prev,
                            departmentId: newDepartmentId
                          }
                          // Clear role when department changes (unless the current role belongs to the new department)
                          if (prev.roleId && newDepartmentId) {
                            const currentRole = hrState.roles?.find(r => r.id === prev.roleId)
                            if (currentRole) {
                              // Check both departmentId (primary) and department (fallback) fields
                              const roleDeptId = currentRole.departmentId || (currentRole as any).departmentID || (currentRole as any).department
                              if (!roleDeptId || roleDeptId !== newDepartmentId) {
                                updated.roleId = ''
                              }
                            } else {
                              // Role not found, clear it
                              updated.roleId = ''
                            }
                          } else if (!newDepartmentId) {
                            // If department is cleared, keep the role (user might want to keep it)
                          }
                          return updated
                        })
                      }}
                      label="Department"
                    >
                      <MenuItem value="">
                        <em>Select a department</em>
                      </MenuItem>
                      {hrState.departments?.map((department) => (
                        <MenuItem key={department.id} value={department.id}>
                          {department.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={formData.roleId}
                      onChange={(e) => {
                        const roleId = e.target.value
                        // Auto-select department when role is selected
                        if (roleId) {
                          const selectedRole = hrState.roles?.find(r => r.id === roleId)
                          if (selectedRole) {
                            // Check both departmentId (primary) and department (fallback) fields
                            const roleDeptId = selectedRole.departmentId || (selectedRole as any).departmentID || (selectedRole as any).department
                            if (roleDeptId) {
                              console.log("🔍 EmployeeCRUDForm - Role selected, setting department:", {
                                roleId,
                                roleName: selectedRole.label || selectedRole.name,
                                departmentId: roleDeptId
                              })
                              // Use setFormData to ensure state updates correctly
                              setFormData(prev => ({
                                ...prev,
                                roleId: roleId,
                                departmentId: roleDeptId
                              }))
                            } else {
                              // Role has no department, just update role
                              setFormData(prev => ({
                                ...prev,
                                roleId: roleId
                              }))
                            }
                          }
                        } else {
                          // Role cleared, just update role
                          setFormData(prev => ({
                            ...prev,
                            roleId: ''
                          }))
                        }
                      }}
                      label="Role"
                    >
                      <MenuItem value="">
                        <em>Select a role</em>
                      </MenuItem>
                      {hrState.roles?.filter(role => {
                        // If department is selected, only show roles in that department
                        if (formData.departmentId) {
                          // Check both departmentId (primary) and department (fallback) fields
                          const roleDeptId = role.departmentId || (role as any).departmentID || (role as any).department
                          return roleDeptId === formData.departmentId
                        }
                        // If no department selected, show all roles
                        return true
                      }).map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.label || role.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required disabled={isReadOnly}>
                    <InputLabel>Employment Type</InputLabel>
                    <Select
                      value={formData.employmentType}
                      onChange={(e) => handleChange('employmentType', e.target.value)}
                      label="Employment Type"
                    >
                      <MenuItem value="full_time">Full-time</MenuItem>
                      <MenuItem value="part_time">Part-time</MenuItem>
                      <MenuItem value="contract">Contract</MenuItem>
                      <MenuItem value="temporary">Temporary</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required disabled={isReadOnly}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="on_leave">On Leave</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="terminated">Terminated</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Date Hired"
                    value={formData.hireDate}
                    onChange={(date) => handleSafeDateChange('hireDate', date)}
                    disabled={isReadOnly}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        helperText: "DD/MM/YYYY format"
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hours Per Week"
                    type="number"
                    value={formData.hoursPerWeek}
                    onChange={(e) => handleChange('hoursPerWeek', Number(e.target.value))}
                    disabled={isReadOnly}
                    InputProps={{
                      inputProps: { min: 0, max: 168, step: 0.5 },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.doNotIncludeOnRota}
                        onChange={(e) => handleChange('doNotIncludeOnRota', e.target.checked)}
                        disabled={isReadOnly}
                      />
                    }
                    label="Do not include on rota"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Holidays Per Year"
                    type="number"
                    value={formData.holidaysPerYear}
                    onChange={(e) => handleChange('holidaysPerYear', Number(e.target.value))}
                    disabled={isReadOnly}
                    InputProps={{
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
              </Grid>
            </FormSection>
          </TabPanel>

          {/* Compensation Tab */}
          <TabPanel value={tabValue} index={2}>
            <FormSection title="Pay Information">
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl component="fieldset" disabled={isReadOnly}>
                    <Typography variant="subtitle1" gutterBottom>
                      Pay Type
                    </Typography>
                    <RadioGroup
                      row
                      value={formData.payType}
                      onChange={(e) => handleChange('payType', e.target.value)}
                    >
                      <FormControlLabel value="salary" control={<Radio />} label="Salary" />
                      <FormControlLabel value="hourly" control={<Radio />} label="Hourly Rate" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hourly Rate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => handleChange('hourlyRate', asBlankableNumber(e.target.value))}
                    disabled={isReadOnly || formData.payType !== 'hourly'}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                      inputProps: { min: 0, step: 0.01 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Annual Salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleChange('salary', asBlankableNumber(e.target.value))}
                    disabled={isReadOnly || formData.payType !== 'salary'}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
              </Grid>
            </FormSection>

            <FormSection title="Bank Details">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account Name"
                    value={formData.bankDetails.accountName}
                    onChange={(e) => handleChange('bankDetails.accountName', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account Number"
                    value={formData.bankDetails.accountNumber}
                    onChange={(e) => handleChange('bankDetails.accountNumber', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Sort Code"
                    value={formData.bankDetails.routingNumber}
                    onChange={(e) => handleChange('bankDetails.routingNumber', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bank Name"
                    value={formData.bankDetails.bankName}
                    onChange={(e) => handleChange('bankDetails.bankName', e.target.value)}
                    disabled={isReadOnly}
                  />
                </Grid>
              </Grid>
            </FormSection>

            <FormSection title="Tronc Scheme (Hospitality)">
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Radio
                        checked={formData.troncParticipant}
                        onChange={(e) => handleChange('troncParticipant', e.target.checked)}
                        disabled={isReadOnly}
                      />
                    }
                    label="Participates in Tronc Scheme"
                  />
                </Grid>
                {formData.troncParticipant && (
                  <>
                    <Grid item xs={12}>
                      <FormControl component="fieldset" disabled={isReadOnly}>
                        <Typography variant="subtitle2" gutterBottom>
                          Tronc Type
                        </Typography>
                        <RadioGroup
                          row
                          value={formData.troncType}
                          onChange={(e) => handleChange('troncType', e.target.value)}
                        >
                          <FormControlLabel value="points" control={<Radio />} label="Points" />
                          <FormControlLabel value="flat_rate" control={<Radio />} label="Flat Rate Per Hour" />
                          <FormControlLabel value="percentage" control={<Radio />} label="Percentage of Sales Service Charge" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                    {formData.troncType === 'points' && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Tronc Points"
                          type="number"
                          value={formData.troncPoints}
                          onChange={(e) => handleChange('troncPoints', asBlankableNumber(e.target.value))}
                          disabled={isReadOnly}
                          InputProps={{
                            inputProps: { min: 0, step: 0.5 }
                          }}
                          helperText="Points for service charge allocation"
                        />
                      </Grid>
                    )}
                    {formData.troncType === 'flat_rate' && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Flat Rate Per Hour"
                          type="number"
                          value={formData.troncFlatRate}
                          onChange={(e) => handleChange('troncFlatRate', asBlankableNumber(e.target.value))}
                          disabled={isReadOnly}
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                            inputProps: { min: 0, step: 0.01 }
                          }}
                          helperText="Fixed amount per hour worked"
                        />
                      </Grid>
                    )}
                    {formData.troncType === 'percentage' && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Percentage of Sales Service Charge"
                          type="number"
                          value={formData.troncPercentage}
                          onChange={(e) => handleChange('troncPercentage', asBlankableNumber(e.target.value))}
                          disabled={isReadOnly}
                          InputProps={{
                            inputProps: { min: 0, max: 100, step: 0.1 },
                            endAdornment: <Typography>%</Typography>
                          }}
                          helperText="Percentage of total service charge sales"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Tronc schemes distribute tips/service charges. Must be operated independently from employer for NI savings.
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </FormSection>
          </TabPanel>

          {/* Tax & NI Tab */}
          <TabPanel value={tabValue} index={3}>
            <FormSection title="Tax Information">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="National Insurance Number"
                    value={formData.nationalInsuranceNumber}
                    onChange={(e) => handleChange('nationalInsuranceNumber', e.target.value)}
                    disabled={isReadOnly}
                    helperText="UK National Insurance number"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tax Code"
                    value={formData.taxCode}
                    onChange={(e) => handleChange('taxCode', e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                    required
                    helperText="e.g., 1257L, S1257L, BR, D0, D1, 0T"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Tax Code Basis</InputLabel>
                    <Select
                      value={formData.taxCodeBasis}
                      onChange={(e) => handleChange('taxCodeBasis', e.target.value)}
                      label="Tax Code Basis"
                    >
                      <MenuItem value="cumulative">Cumulative (Standard)</MenuItem>
                      <MenuItem value="week1month1">Week 1/Month 1 (Emergency Tax)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Tax code determines how much income tax is deducted. Get tax code from P45 or HMRC. Standard code for 2024/25 is 1257L.
                  </Typography>
                </Grid>
              </Grid>
            </FormSection>

            <FormSection title="National Insurance">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly} required>
                    <InputLabel>NI Category</InputLabel>
                    <Select
                      value={formData.niCategory}
                      onChange={(e) => handleChange('niCategory', e.target.value)}
                      label="NI Category"
                    >
                      <MenuItem value="A">Category A (Standard)</MenuItem>
                      <MenuItem value="B">Category B (Married women - reduced rate)</MenuItem>
                      <MenuItem value="C">Category C (Over state pension age)</MenuItem>
                      <MenuItem value="H">Category H (Apprentice under 25)</MenuItem>
                      <MenuItem value="M">Category M (Under 21)</MenuItem>
                      <MenuItem value="Z">Category Z (Under 21 - deferred)</MenuItem>
                      <MenuItem value="F">Category F (Female over 60)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Payment Frequency</InputLabel>
                    <Select
                      value={formData.paymentFrequency}
                      onChange={(e) => handleChange('paymentFrequency', e.target.value)}
                      label="Payment Frequency"
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="fortnightly">Fortnightly</MenuItem>
                      <MenuItem value="four_weekly">Four Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Radio
                        checked={formData.isDirector}
                        onChange={(e) => handleChange('isDirector', e.target.checked)}
                        disabled={isReadOnly}
                      />
                    }
                    label="Company Director (NI calculated annually)"
                  />
                </Grid>
                {formData.isDirector && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={isReadOnly}>
                      <InputLabel>Director NI Method</InputLabel>
                      <Select
                        value={formData.directorNICalculationMethod}
                        onChange={(e) => handleChange('directorNICalculationMethod', e.target.value)}
                        label="Director NI Method"
                      >
                        <MenuItem value="annual">Annual (Standard)</MenuItem>
                        <MenuItem value="alternative">Alternative</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </FormSection>

            <FormSection title="New Starter Information">
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Starter Declaration (for new employees without P45)
                  </Typography>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Starter Declaration</InputLabel>
                    <Select
                      value={formData.starterDeclaration || ''}
                      onChange={(e) => handleChange('starterDeclaration', e.target.value || undefined)}
                      label="Starter Declaration"
                    >
                      <MenuItem value="">
                        <em>None (Has P45)</em>
                      </MenuItem>
                      <MenuItem value="A">A - This is my first job since last 6 April</MenuItem>
                      <MenuItem value="B">B - This is now my only job</MenuItem>
                      <MenuItem value="C">C - I have another job or pension</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </FormSection>
          </TabPanel>

          {/* Pensions & Student Loans Tab */}
          <TabPanel value={tabValue} index={4}>
            <FormSection title="Pension Auto-Enrolment">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Auto-Enrolment Status</InputLabel>
                    <Select
                      value={formData.autoEnrolmentStatus}
                      onChange={(e) => handleChange('autoEnrolmentStatus', e.target.value)}
                      label="Auto-Enrolment Status"
                    >
                      <MenuItem value="not_eligible">Not Eligible</MenuItem>
                      <MenuItem value="eligible">Eligible (Not Yet Enrolled)</MenuItem>
                      <MenuItem value="enrolled">Enrolled</MenuItem>
                      <MenuItem value="opted_out">Opted Out</MenuItem>
                      <MenuItem value="postponed">Postponed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {formData.autoEnrolmentStatus === 'enrolled' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Pension Scheme Reference"
                        value={formData.pensionSchemeReference}
                        onChange={(e) => handleChange('pensionSchemeReference', e.target.value)}
                        disabled={isReadOnly}
                        helperText="PSTR - Pension Scheme Tax Reference"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Employee Contribution %"
                        type="number"
                        value={formData.pensionContributionPercentage}
                        onChange={(e) => handleChange('pensionContributionPercentage', Number(e.target.value))}
                        disabled={isReadOnly}
                        InputProps={{
                          inputProps: { min: 5, max: 100, step: 0.5 },
                          endAdornment: <Typography>%</Typography>
                        }}
                        helperText="Minimum 5% (total 8% with employer)"
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Employees aged 22-66 earning £10,000+ annually must be auto-enrolled. Contributions on qualifying earnings (£6,240-£50,270).
                  </Typography>
                </Grid>
              </Grid>
            </FormSection>

            <FormSection title="Student Loans">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Student Loan Plan</InputLabel>
                    <Select
                      value={formData.studentLoanPlan}
                      onChange={(e) => handleChange('studentLoanPlan', e.target.value)}
                      label="Student Loan Plan"
                    >
                      <MenuItem value="none">No Student Loan</MenuItem>
                      <MenuItem value="plan1">Plan 1 (Started before Sep 2012)</MenuItem>
                      <MenuItem value="plan2">Plan 2 (Started Sep 2012+)</MenuItem>
                      <MenuItem value="plan4">Plan 4 (Scotland)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasPostgraduateLoan}
                        onChange={(e) => handleChange('hasPostgraduateLoan', e.target.checked)}
                        disabled={isReadOnly}
                      />
                    }
                    label="Has Postgraduate Loan"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'info.lighter' }}>
                    <Typography variant="caption" display="block">
                      <strong>Student Loan Thresholds 2024/25:</strong>
                    </Typography>
                    <Typography variant="caption" display="block">
                      • Plan 1: £22,015 (9% above threshold)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • Plan 2: £27,295 (9% above threshold)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • Plan 4: £27,660 (9% above threshold)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • Postgraduate: £21,000 (6% above threshold)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </FormSection>

          </TabPanel>

          {/* Documents Tab */}
          <TabPanel value={tabValue} index={5}>
            {employee?.id ? (
              <FormSection title="Employee Documents">
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Upload and manage employee documents including right-to-work documents, ID verification, contracts, and other employment-related files.
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ border: 2, borderColor: 'divider', borderRadius: 2, p: 3, borderStyle: 'dashed' }}>
                      <input
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        id="document-upload"
                        type="file"
                        multiple
                        onChange={async (e) => {
                          const files = e.target.files
                          if (!files || files.length === 0) return
                          
                          if (!isReadOnly && employee?.id) {
                            // Upload documents to Firebase Storage
                            try {
                              const { uploadFile } = await import('../../../../backend/services/Firebase')
                              const documentUrls: string[] = []
                              
                              for (const file of Array.from(files)) {
                                // Validate file type
                                const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png']
                                if (!validTypes.includes(file.type)) {
                                  alert(`Invalid file type: ${file.name}. Please upload PDF, DOC, DOCX, JPG, or PNG files.`)
                                  continue
                                }
                                
                                // Validate file size (10MB max)
                                if (file.size > 10 * 1024 * 1024) {
                                  alert(`File too large: ${file.name}. Maximum size is 10MB.`)
                                  continue
                                }
                                
                                const folder = `employee-documents/${employee.id}`
                                const url = await uploadFile(file, folder)
                                documentUrls.push(url)
                              }
                              
                              // Update employee with new documents
                              if (documentUrls.length > 0) {
                                const currentDocuments = (employee as any).documents || []
                                const updatedDocuments = [...currentDocuments, ...documentUrls]
                                
                                // Call onSave to update employee
                                if (onSave) {
                                  await onSave({ documents: updatedDocuments })
                                }
                              }
                            } catch (error) {
                              console.error('Error uploading documents:', error)
                              alert('Failed to upload documents. Please try again.')
                            }
                          }
                          
                          // Reset file input
                          e.target.value = ''
                        }}
                      />
                      <label htmlFor="document-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<CloudUploadIcon />}
                          disabled={isReadOnly}
                          fullWidth
                          sx={{ py: 2 }}
                        >
                          {isReadOnly ? 'Upload Documents (View Only)' : 'Upload Documents'}
                        </Button>
                      </label>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                        Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Right to Work Documents
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main' }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Required:</strong> Right to work documentation must be uploaded for all employees. 
                        This includes passports, visas, birth certificates, or other relevant documentation.
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Uploaded Documents
                    </Typography>
                    {((employee as any)?.documents || []).length === 0 ? (
                      <Alert severity="info">No documents uploaded yet.</Alert>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {((employee as any).documents || []).map((docUrl: string, index: number) => (
                          <Paper key={index} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AttachFileIcon color="action" />
                              <Typography variant="body2">
                                Document {index + 1}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                startIcon={<DownloadIcon />}
                                href={docUrl}
                                target="_blank"
                                download
                              >
                                Download
                              </Button>
                              {!isReadOnly && (
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<DeleteDocumentIcon />}
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this document?')) {
                                      const currentDocuments = ((employee as any).documents || []).filter((_: string, i: number) => i !== index)
                                      if (onSave) {
                                        await onSave({ documents: currentDocuments })
                                      }
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </FormSection>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Documents are only available for existing employees.
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Contract Tab */}
          <TabPanel value={tabValue} index={6}>
            {employee?.id ? (() => {
                const employeeContract = hrState.contracts?.find(
                  (contract: any) => contract.employeeId === employee.id
                )

                if (!employeeContract) {
                  return (
                    <FormSection title="Contract">
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No contract has been generated for this employee yet.
                        </Typography>
                      </Box>
                    </FormSection>
                  )
                }

                return (
                  <FormSection title="Employment Contract">
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h6" gutterBottom>
                              {employeeContract.contractTitle || 'Employment Contract'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Status: <strong>{employeeContract.status || 'draft'}</strong>
                            </Typography>
                            {employeeContract.startDate && (
                              <Typography variant="body2" color="text.secondary">
                                Start Date: {new Date(employeeContract.startDate).toLocaleDateString()}
                              </Typography>
                            )}
                            {employeeContract.endDate && (
                              <Typography variant="body2" color="text.secondary">
                                End Date: {new Date(employeeContract.endDate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                          {employeeContract.bodyHtml ? (
                            <Box
                              sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 2,
                                bgcolor: 'background.default',
                                '& h1, & h2, & h3, & h4, & h5, & h6': {
                                  marginTop: 2,
                                  marginBottom: 1,
                                },
                                '& p': {
                                  marginBottom: 1,
                                },
                                '& ul, & ol': {
                                  marginLeft: 3,
                                  marginBottom: 1,
                                },
                              }}
                              dangerouslySetInnerHTML={{ __html: employeeContract.bodyHtml }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Contract content not available.
                            </Typography>
                          )}
                          {employeeContract.terms && employeeContract.terms.length > 0 && (
                            <Box sx={{ mt: 3 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Terms & Conditions:
                              </Typography>
                              <ul>
                                {employeeContract.terms.map((term: string, index: number) => (
                                  <li key={index}>
                                    <Typography variant="body2">{term}</Typography>
                                  </li>
                                ))}
                              </ul>
                            </Box>
                          )}
                          {employeeContract.benefits && employeeContract.benefits.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Benefits:
                              </Typography>
                              <ul>
                                {employeeContract.benefits.map((benefit: string, index: number) => (
                                  <li key={index}>
                                    <Typography variant="body2">{benefit}</Typography>
                                  </li>
                                ))}
                              </ul>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  </FormSection>
                )
              })() : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Contract is only available for existing employees.
                  </Typography>
                </Box>
              )}
          </TabPanel>
        </Paper>
      </Box>
    </LocalizationProvider>
  )
})

export default EmployeeCRUDForm
