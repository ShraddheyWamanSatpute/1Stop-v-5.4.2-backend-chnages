"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
} from "@mui/material"
import {
  Person as PersonIcon,
  Work as WorkIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { enGB } from "date-fns/locale"
import { themeConfig } from "../../theme/AppTheme"
import { useCompany } from "../../backend/context/CompanyContext"
import { db, ref, get, update } from "../../backend/services/Firebase"
import BrandedAppLoader from "../components/global/BrandedAppLoader"

const steps = ["Personal Information", "Right to Work", "Contract"]

const EmployeeOnboarding: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { getEmployeeJoinCodeByCode, acceptEmployeeInvite } = useCompany()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [contractData, setContractData] = useState<any>(null)
  const [employeeBasePath, setEmployeeBasePath] = useState<string | null>(null)

  // Form data for step 1
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: null as Date | null,
    nationalInsuranceNumber: '',
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
  })

  // Right to work documents
  const [rightToWorkDocuments, setRightToWorkDocuments] = useState<string[]>([])

  // Contract signature
  const [contractSigned, setContractSigned] = useState(false)
  const [signatureName, setSignatureName] = useState('')

  const code = searchParams.get("code")

  // Load invite data and pre-populate form
  useEffect(() => {
    const loadInviteData = async () => {
      if (!code) {
        setError("Invalid invite link - missing code")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const invite = await getEmployeeJoinCodeByCode(code)
        
        if (!invite) {
          setError("Invalid or expired invite link")
          setLoading(false)
          return
        }

        if (invite.used) {
          setError("This invite link has already been used")
          setLoading(false)
          return
        }

        if (invite.revoked) {
          setError("This invite link has been revoked")
          setLoading(false)
          return
        }

        if (invite.expiresAt && Date.now() > invite.expiresAt) {
          setError("This invite link has expired")
          setLoading(false)
          return
        }

        setInviteCode(code)
        
        // Build paths to check for employee and contract data
        const hrPaths: string[] = []
        if (invite.subsiteId) {
          hrPaths.push(`companies/${invite.companyId}/sites/${invite.siteId}/subsites/${invite.subsiteId}/data/hr`)
        }
        hrPaths.push(`companies/${invite.companyId}/sites/${invite.siteId}/data/hr`)
        hrPaths.push(`companies/${invite.companyId}/data/hr`)

        // Comprehensive search: check company level first, then all sites and subsites
        let employee: any = null
        let foundBasePath: string | null = null
        
        // Helper function to search for employee at a specific path
        const searchAtPath = async (path: string): Promise<{ employee: any | null, contracts: any | null }> => {
          try {
            const [employeeSnap, contractsSnap] = await Promise.all([
              get(ref(db, `${path}/employees/${invite.employeeId}`)),
              get(ref(db, `${path}/contracts`))
            ])
            return {
              employee: employeeSnap.exists() ? employeeSnap.val() : null,
              contracts: contractsSnap.exists() ? contractsSnap.val() : null
            }
          } catch (error) {
            return { employee: null, contracts: null }
          }
        }
        
        // First try company-level HR
        const companyHrPath = `companies/${invite.companyId}/data/hr`
        const companyResult = await searchAtPath(companyHrPath)
        if (companyResult.employee) {
          employee = companyResult.employee
          foundBasePath = companyHrPath
          setEmployeeData(employee)
          setEmployeeBasePath(companyHrPath)
          
          // Set contract data if found
          if (companyResult.contracts) {
            for (const contractId in companyResult.contracts) {
              const contract = companyResult.contracts[contractId]
              if (contract.employeeId === invite.employeeId && contract.status === 'draft') {
                setContractData(contract)
                break
              }
            }
          }
        } else {
          // Get all sites and search them
          const sitesRef = ref(db, `companies/${invite.companyId}/sites`)
          const sitesSnap = await get(sitesRef)
          
          if (sitesSnap.exists()) {
            const sites = sitesSnap.val() || {}
            const siteIds = Object.keys(sites)
            
            // Search all sites in parallel
            const siteSearchPromises = siteIds.map(async (siteId) => {
              // Try site-level HR
              const siteHrPath = `companies/${invite.companyId}/sites/${siteId}/data/hr`
              const siteResult = await searchAtPath(siteHrPath)
              if (siteResult.employee) {
                return { employee: siteResult.employee, basePath: siteHrPath, contracts: siteResult.contracts }
              }
              
              // Try all subsites in this site
              const subsitesRef = ref(db, `companies/${invite.companyId}/sites/${siteId}/subsites`)
              const subsitesSnap = await get(subsitesRef)
              
              if (subsitesSnap.exists()) {
                const subsites = subsitesSnap.val() || {}
                const subsiteIds = Object.keys(subsites)
                
                // Search all subsites in parallel
                const subsiteSearchPromises = subsiteIds.map(async (subsiteId) => {
                  const subsiteHrPath = `companies/${invite.companyId}/sites/${siteId}/subsites/${subsiteId}/data/hr`
                  const subsiteResult = await searchAtPath(subsiteHrPath)
                  if (subsiteResult.employee) {
                    return { employee: subsiteResult.employee, basePath: subsiteHrPath, contracts: subsiteResult.contracts }
                  }
                  return null
                })
                
                const subsiteResults = await Promise.all(subsiteSearchPromises)
                const found = subsiteResults.find(r => r !== null)
                if (found) return found
              }
              
              return null
            })
            
            const siteResults = await Promise.all(siteSearchPromises)
            const found = siteResults.find(r => r !== null)
            
            if (found) {
              employee = found.employee
              foundBasePath = found.basePath
              setEmployeeData(employee)
              setEmployeeBasePath(found.basePath)
              
              // Set contract data if found
              if (found.contracts) {
                for (const contractId in found.contracts) {
                  const contract = found.contracts[contractId]
                  if (contract.employeeId === invite.employeeId && contract.status === 'draft') {
                    setContractData(contract)
                    break
                  }
                }
              }
            }
          }
        }
        
        // If employee still not found, try the original hrPaths as fallback
        if (!employee) {
          const fetchPromises = hrPaths.map(async (p) => {
            try {
              const [employeeSnap, contractsSnap] = await Promise.all([
                get(ref(db, `${p}/employees/${invite.employeeId}`)),
                get(ref(db, `${p}/contracts`))
              ])
              return {
                path: p,
                employee: employeeSnap.exists() ? employeeSnap.val() : null,
                contracts: contractsSnap.exists() ? contractsSnap.val() : null
              }
            } catch (error) {
              return { path: p, employee: null, contracts: null }
            }
          })

          const results = await Promise.all(fetchPromises)
          
          // Find employee data (use first non-null result)
          for (const result of results) {
            if (result.employee) {
              employee = result.employee
              foundBasePath = result.path
              setEmployeeData(employee)
              setEmployeeBasePath(result.path)
              break
            }
          }
        }

        // Pre-populate form with employee data if available
        if (employee) {
          setFormData({
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            middleName: employee.middleName || '',
            email: employee.email || '',
            phone: employee.phone || '',
            gender: employee.gender || '',
            dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
            nationalInsuranceNumber: employee.nationalInsuranceNumber || '',
            address: employee.address || {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: 'UK'
            },
            emergencyContact: employee.emergencyContact || {
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
          })
          
          // Also load documents if they exist
          if (employee.documents && Array.isArray(employee.documents)) {
            setRightToWorkDocuments(employee.documents)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Error loading invite:", error)
        setError("Failed to load invite information")
        setLoading(false)
      }
    }

    loadInviteData()
  }, [code, getEmployeeJoinCodeByCode])

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate step 1
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        setError("Please fill in all required fields (First Name, Last Name, Email)")
        return
      }
    }
    setError(null)
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setError(null)
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleSubmit = async () => {
    if (!inviteCode) {
      setError("Invalid invite code")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Update employee data with form data
      const { uploadFile } = await import("../../backend/services/Firebase")
      
      if (!employeeData) {
        setError("Employee data not found")
        setSubmitting(false)
        return
      }

      // Use the basePath that was found during loading (from comprehensive search)
      if (!employeeBasePath) {
        setError("Employee record location not found. Please refresh the page.")
        setSubmitting(false)
        return
      }
      
      const basePath = employeeBasePath

      // Update employee with form data
      const employeeUpdate: any = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || '',
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.getTime() : null,
        nationalInsuranceNumber: formData.nationalInsuranceNumber?.trim() || '',
        documents: rightToWorkDocuments,
        updatedAt: Date.now(),
      }

      await update(ref(db, `${basePath}/employees/${invite.employeeId}`), employeeUpdate)

      // Update contract signature if contract exists and was signed
      if (contractData && contractSigned && signatureName.trim()) {
        await update(ref(db, `${basePath}/contracts/${contractData.id}`), {
          status: 'signed',
          signedDate: Date.now(),
          signedBy: signatureName.trim(),
          updatedAt: Date.now(),
        })
      }

      // Accept the invite to link account
      const { getAuth } = await import("firebase/auth")
      const auth = getAuth()
      if (auth.currentUser) {
        const result = await acceptEmployeeInvite(inviteCode, auth.currentUser.uid)
        if (result.success) {
          navigate("/Company")
        } else {
          setError(result.message || "Failed to accept invite")
          setSubmitting(false)
        }
      } else {
        // If not signed in, redirect to login/signup
        navigate(`/JoinCompany?code=${encodeURIComponent(inviteCode)}`)
      }
    } catch (error: any) {
      console.error("Error submitting onboarding:", error)
      setError(error.message || "Failed to submit onboarding information")
      setSubmitting(false)
    }
  }

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      const { uploadFile } = await import("../../backend/services/Firebase")
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
        
        const folder = `employee-documents/temp`
        const url = await uploadFile(file, folder)
        documentUrls.push(url)
      }
      
      setRightToWorkDocuments(prev => [...prev, ...documentUrls])
    } catch (error) {
      console.error('Error uploading documents:', error)
      alert('Failed to upload documents. Please try again.')
    }
    
    // Reset file input
    event.target.value = ''
  }

  if (loading) {
    return <BrandedAppLoader message="Loading onboarding information..." />
  }

  if (error && !inviteCode) {
    return (
      <Box sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        bgcolor: themeConfig.colors.background.default,
        p: 3
      }}>
        <Card sx={{ maxWidth: 400, width: "100%" }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button 
              variant="contained" 
              onClick={() => navigate("/Login")}
              fullWidth
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Box sx={{ 
        minHeight: "100vh",
        bgcolor: themeConfig.colors.background.default,
        py: 4,
        px: 2
      }}>
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: "center", mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Employee Onboarding
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Please complete all steps to join the company
                </Typography>
              </Box>

              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {/* Step 1: Personal Information */}
              {activeStep === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Personal Information
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name *"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name *"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Middle Name"
                        value={formData.middleName}
                        onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email *"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Gender</InputLabel>
                        <Select
                          value={formData.gender}
                          label="Gender"
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
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
                        onChange={(newValue) => setFormData({ ...formData, dateOfBirth: newValue })}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="National Insurance Number"
                        value={formData.nationalInsuranceNumber}
                        onChange={(e) => setFormData({ ...formData, nationalInsuranceNumber: e.target.value })}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Address
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Street Address"
                        value={formData.address.street}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          address: { ...formData.address, street: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="City"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          address: { ...formData.address, city: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="State/County"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          address: { ...formData.address, state: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Postal Code"
                        value={formData.address.zipCode}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          address: { ...formData.address, zipCode: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Country"
                        value={formData.address.country}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          address: { ...formData.address, country: e.target.value }
                        })}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Emergency Contact
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Contact Name"
                        value={formData.emergencyContact.name}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Relationship"
                        value={formData.emergencyContact.relationship}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Contact Phone"
                        value={formData.emergencyContact.phone}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Contact Email"
                        type="email"
                        value={formData.emergencyContact.email}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          emergencyContact: { ...formData.emergencyContact, email: e.target.value }
                        })}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Bank Details
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Account Name"
                        value={formData.bankDetails.accountName}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          bankDetails: { ...formData.bankDetails, accountName: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Account Number"
                        value={formData.bankDetails.accountNumber}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Sort Code / Routing Number"
                        value={formData.bankDetails.routingNumber}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          bankDetails: { ...formData.bankDetails, routingNumber: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bank Name"
                        value={formData.bankDetails.bankName}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                        })}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Step 2: Right to Work */}
              {activeStep === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Right to Work Documents
                  </Typography>
                  <Paper sx={{ p: 3, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', mb: 3 }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Required:</strong> Please upload your right to work documentation.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This includes passports, visas, birth certificates, or other relevant documentation that proves your eligibility to work in the UK.
                    </Typography>
                  </Paper>

                  <Box sx={{ border: 2, borderColor: 'divider', borderRadius: 2, p: 3, borderStyle: 'dashed', mb: 3 }}>
                    <input
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      id="right-to-work-upload"
                      type="file"
                      multiple
                      onChange={handleDocumentUpload}
                    />
                    <label htmlFor="right-to-work-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        fullWidth
                        sx={{ py: 2 }}
                      >
                        Upload Right to Work Documents
                      </Button>
                    </label>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                      Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
                    </Typography>
                  </Box>

                  {rightToWorkDocuments.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Uploaded Documents:
                      </Typography>
                      {rightToWorkDocuments.map((docUrl, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">
                            Document {index + 1}
                          </Typography>
                          <Button
                            size="small"
                            href={docUrl}
                            target="_blank"
                            download
                          >
                            View
                          </Button>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* Step 3: Contract */}
              {activeStep === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Employment Contract
                  </Typography>
                  {contractData ? (
                    <Box>
                      <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          {contractData.contractTitle || 'Employment Contract'}
                        </Typography>
                        <Box
                          sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 2,
                            bgcolor: 'background.default',
                            mb: 3,
                            maxHeight: 400,
                            overflow: 'auto',
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
                          dangerouslySetInnerHTML={{ __html: contractData.bodyHtml || '<p>No contract content available.</p>' }}
                        />
                      </Paper>

                      <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Sign Contract
                        </Typography>
                        <TextField
                          fullWidth
                          label="Full Name (Signature) *"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          required
                          sx={{ mb: 2 }}
                          helperText="Type your full name to sign the contract"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={contractSigned}
                              onChange={(e) => setContractSigned(e.target.checked)}
                            />
                          }
                          label="I have read and agree to the terms of this contract"
                        />
                      </Paper>
                    </Box>
                  ) : (
                    <Alert severity="info">
                      No contract has been generated yet. You can proceed with onboarding.
                    </Alert>
                  )}
                </Box>
              )}

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                >
                  Back
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || (contractData && (!contractSigned || !signatureName.trim()))}
                    endIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  >
                    {submitting ? "Submitting..." : "Complete Onboarding"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </LocalizationProvider>
  )
}

export default EmployeeOnboarding
