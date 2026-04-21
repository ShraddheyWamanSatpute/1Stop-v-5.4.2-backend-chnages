"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Autocomplete,
  Button,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  Person as PersonIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as AttachMoneyIcon,
  Email as EmailIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, parseISO } from 'date-fns'
import { useBookings, Booking } from '../../../../backend/context/BookingsContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import { APP_KEYS } from '../../../../config/keys'
import FormSection from '../../reusable/FormSection'

interface TabbedBookingFormProps {
  booking?: Booking | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const TabbedBookingForm: React.FC<TabbedBookingFormProps> = ({
  booking,
  mode,
  onSave
}) => {
  const { 
    bookingTypes: contextBookingTypes,
    bookingStatuses: contextBookingStatuses,
    tables: contextTables,
    bookingTags: contextBookingTags,
    bookingSettings,
    fetchBookingSettings,
    checkOAuthToken,
    loadBookingsEmailConfig,
    companyID,
    siteID,
    subsiteID,
  } = useBookings()
  
  const { state: companyState } = useCompany()
  
  // const { state: stockState } = useStock() // Unused for now

  const [tabValue, setTabValue] = useState(0)
  const [emailProviderStatus, setEmailProviderStatus] = useState({ connected: false, message: 'Checking...' })
  const [emailConfig, setEmailConfig] = useState<{ email?: string; senderName?: string } | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    bookingType: '',
    guests: 1,
    arrivalTime: '18:00',
    duration: 2,
    status: 'Pending',
    tracking: 'Not Arrived',
    specialRequests: '',
    dietaryRequirements: '',
    deposit: 0,
    depositPaid: false,
    tableNumber: '',
    tableId: '',
    selectedTables: [] as string[],
    tags: [] as string[],
  })

  // Preorder state
  const [preorderData, setPreorderData] = useState({
    profileId: '',
    notes: '',
    items: [] as any[],
    linkSent: false,
    linkSentAt: '',
    linkSentTo: [] as string[],
  })

  // Contact state
  const [contactData, setContactData] = useState({
    messages: [] as any[],
    emailTemplates: [] as any[],
    lastContact: '',
    contactHistory: [] as any[],
  })

  // Email composition state
  const [emailCompose, setEmailCompose] = useState({
    subject: '',
    body: '',
    template: '',
    attachments: [] as File[],
  })

  // Deposit state
  const [depositData, setDepositData] = useState({
    amount: 0,
    paid: false,
    paidAt: '',
    paymentMethod: '',
    transactions: [] as any[],
    paymentLink: '',
  })

  // UI state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' })
  const [loading, setLoading] = useState(false)

  // Dialog states
  const [showPreorderLinkDialog, setShowPreorderLinkDialog] = useState(false)
  // const [preorderEmail, setPreorderEmail] = useState('') // Unused
  // const [preorderMessage, setPreorderMessage] = useState('') // Unused
  // const [sendingPreorderLink, setSendingPreorderLink] = useState(false) // Unused

  // const [showDepositRequestDialog, setShowDepositRequestDialog] = useState(false) // Unused
  // const [depositRequestEmail, setDepositRequestEmail] = useState('') // Unused
  // const [depositRequestMessage, setDepositRequestMessage] = useState('') // Unused
  // const [sendingDepositRequest, setSendingDepositRequest] = useState(false) // Unused

  const [showProcessDepositDialog, setShowProcessDepositDialog] = useState(false)
  // const [processDepositAmount, setProcessDepositAmount] = useState('') // Unused
  // const [processDepositMethod, setProcessDepositMethod] = useState('') // Unused

  const [showEmailComposeDialog, setShowEmailComposeDialog] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Fetch booking settings when component mounts
  useEffect(() => {
    if (fetchBookingSettings) {
      fetchBookingSettings()
    }
  }, [fetchBookingSettings])

  // Fetch email configuration via BookingsContext (no direct Firebase in UI)
  useEffect(() => {
    const loadEmailConfig = async () => {
      try {
        const cfg = await loadBookingsEmailConfig()
        setEmailConfig(cfg || null)
      } catch (error) {
        console.error('Error loading email config:', error)
        setEmailConfig(null)
      }
    }
    
    loadEmailConfig()
  }, [loadBookingsEmailConfig])

  // Update email provider status when settings or emailConfig change
  useEffect(() => {
    const updateEmailProviderStatus = async () => {
      try {
        const status = await getEmailProviderStatus()
        setEmailProviderStatus(status)
      } catch (error) {
        console.error('Error updating email provider status:', error)
        setEmailProviderStatus({ connected: false, message: 'Error checking email provider' })
      }
    }
    
    updateEmailProviderStatus()
  }, [bookingSettings, emailConfig])

  // Update form data when booking prop changes
  useEffect(() => {
    if (booking) {
      setFormData({
        firstName: booking.firstName || '',
        lastName: booking.lastName || '',
        email: booking.email || '',
        phone: booking.phone || '',
        company: booking.company || '',
        source: booking.source || '',
        notes: booking.notes || '',
        date: booking.date || format(new Date(), 'yyyy-MM-dd'),
        bookingType: booking.bookingType || '',
        guests: booking.guests || 1,
        arrivalTime: booking.arrivalTime || '18:00',
        duration: booking.duration || 2,
        status: booking.status || 'Pending',
        tracking: booking.tracking || 'Not Arrived',
        specialRequests: booking.specialRequests || '',
        dietaryRequirements: booking.dietaryRequirements || '',
        deposit: booking.deposit || 0,
        depositPaid: booking.depositPaid || false,
        tableNumber: booking.tableNumber || '',
        tableId: booking.tableId || '',
        selectedTables: booking.selectedTables && booking.selectedTables.length > 0 
          ? booking.selectedTables 
          : (booking.tableId ? [booking.tableId] : []),
        tags: booking.tags || [],
      })

      // Set preorder data if available
      if (booking.preorder) {
        setPreorderData({
          profileId: booking.preorder.profileId || '',
          notes: booking.preorder.notes || '',
          items: booking.preorder.items || [],
          linkSent: false, // This would come from booking data
          linkSentAt: '',
          linkSentTo: [],
        })
      }

      // Set deposit data if available
      if (booking.payments) {
        setDepositData({
          amount: booking.payments.depositAmount || 0,
          paid: booking.payments.depositStatus === 'paid',
          paidAt: booking.payments.depositPaidAt || '',
          paymentMethod: '',
          transactions: booking.payments.transactions || [],
          paymentLink: booking.payments.stripePaymentLink || '',
        })
      }

      // Set contact data if available
      if (booking.messages) {
        setContactData({
          messages: booking.messages || [],
          emailTemplates: [],
          lastContact: booking.messages[booking.messages.length - 1]?.sentAt || '',
          contactHistory: booking.messages || [],
        })
      }
    }
  }, [booking])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    const bookingData = {
      ...formData,
      id: booking?.id,
      createdAt: booking?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endTime: formData.arrivalTime && formData.duration ? 
        (() => {
          const [hours, minutes] = formData.arrivalTime.split(':').map(Number)
          const endDate = new Date()
          endDate.setHours(hours + Math.floor(formData.duration), minutes + ((formData.duration % 1) * 60))
          return endDate.toTimeString().slice(0, 5)
        })() : undefined,
      guests: Number(formData.guests),
      duration: Number(formData.duration),
      deposit: Number(formData.deposit),
      selectedTables: formData.selectedTables,
      tags: formData.tags,
      preorder: preorderData,
      payments: depositData,
      messages: contactData.messages,
    }
    onSave(bookingData)
  }

  // Call onSave when the component mounts or when data changes (for auto-save behavior)
  React.useEffect(() => {
    // This effect ensures that the parent component can access the current form data
    // The actual save will be triggered by the CRUDModal's save button
  }, [formData, preorderData, depositData, contactData])

  // Expose the handleSubmit function for external access
  React.useEffect(() => {
    if (mode !== 'view') {
      (window as any).bookingFormSubmit = handleSubmit
    }
    return () => {
      delete (window as any).bookingFormSubmit
    }
  }, [handleSubmit, mode])

  const isReadOnly = mode === 'view'

  // Preorder functions
  const generatePreorderLink = () => {
    const bookingId = booking?.id || 'new'
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const resolvedCompanyId = companyID || companyState.selectedCompanyID || companyState.companyID
    const resolvedSiteId = siteID || companyState.selectedSiteID

    if (!bookingId || !resolvedCompanyId || !resolvedSiteId) {
      return ''
    }

    return `${origin}/Preorder/${resolvedCompanyId}/${resolvedSiteId}/${bookingId}`
  }

  const handleSendPreorderLink = async () => {
    try {
      setLoading(true)
      const link = generatePreorderLink()

      if (!formData.email) {
        throw new Error('No recipient email address')
      }

      if (!link) {
        throw new Error('Preorder link is not available until the booking has been saved in a company/site context.')
      }

      const subject = encodeURIComponent(`Preorder link for ${formData.firstName || ""} ${formData.lastName || ""}`.trim())
      const body = encodeURIComponent(`Hello ${formData.firstName || ""},\n\nYou can complete your preorder here:\n${link}\n\nBest regards`)
      window.location.href = `mailto:${formData.email}?subject=${subject}&body=${body}`
      
      setPreorderData(prev => ({
        ...prev,
        linkSent: true,
        linkSentAt: new Date().toISOString(),
        linkSentTo: [formData.email],
      }))
      
      setSnackbar({ open: true, message: 'Opened your email client with the preorder link', severity: 'success' })
      setShowPreorderLinkDialog(false)
    } catch (error) {
      console.error('Error sending preorder link:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare preorder link'
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const copyPreorderLink = async () => {
    const link = generatePreorderLink()
    try {
      await navigator.clipboard.writeText(link)
      setSnackbar({ open: true, message: 'Preorder link copied to clipboard', severity: 'success' })
    } catch (error) {
      console.error('Failed to copy link:', error)
      setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' })
    }
  }

  // Contact functions
  const handleSendEmail = async (template?: any) => {
    try {
      setSendingEmail(true)
      
      // Use template or compose data
      const emailData = template || {
        subject: emailCompose.subject,
        body: emailCompose.body,
      }
      
      // Check if email is configured
      const fromEmail = emailConfig?.email || bookingSettings?.contactEmailAddress
      if (!fromEmail) {
        throw new Error('No email address configured. Please set up Gmail in Booking Settings.')
      }
      
      if (!formData.email) {
        throw new Error('No recipient email address')
      }
      
      
      // Get company context for cloud function
      const companyId = companyID || companyState.selectedCompanyID
      const siteId = siteID || companyState.selectedSiteID || 'default'
      const subsiteId = subsiteID || companyState.selectedSubsiteID || 'default'
      
      if (!companyId) {
        throw new Error('Company ID not found. Please ensure you are logged in.')
      }
      
      // Call the sendEmailWithGmail cloud function
      const projectId = APP_KEYS?.firebase?.projectId || 'stop-test-8025f'
      const region = 'us-central1'
      const fnBase = `https://${region}-${projectId}.cloudfunctions.net`
      
      const response = await fetch(`${fnBase}/sendEmailWithGmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: formData.email,
          subject: emailData.subject,
          body: emailData.body,
          companyId: companyId,
          siteId: siteId,
          subsiteId: subsiteId
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send email')
      }
      
      const newMessage = {
        id: Date.now().toString(),
        type: 'outbound',
        to: formData.email,
        from: fromEmail,
        subject: emailData.subject,
        body: emailData.body,
        sentAt: new Date().toISOString(),
        status: 'sent',
        provider: 'gmail',
      }
      
      setContactData(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        lastContact: newMessage.sentAt,
        contactHistory: [...prev.contactHistory, newMessage],
      }))
      
      setSnackbar({ open: true, message: 'Email sent successfully', severity: 'success' })
      setShowEmailComposeDialog(false)
      
      // Clear compose form
      setEmailCompose({ subject: '', body: '', template: '', attachments: [] })
    } catch (error) {
      console.error('Error sending email:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setSnackbar({ open: true, message: `Failed to send email: ${errorMessage}`, severity: 'error' })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleOpenEmailClient = () => {
    const fromEmail = emailConfig?.email || bookingSettings?.contactEmailAddress || 'Venue Team'
    const bookingName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim()
    const bookingWhen = [formData.date, formData.arrivalTime].filter(Boolean).join(" ")
    const subject = encodeURIComponent(`Re: Booking ${bookingName || "inquiry"}${bookingWhen ? ` - ${bookingWhen}` : ""}`)
    const body = encodeURIComponent(`Hello ${formData.firstName},\n\nRegarding your booking...\n\nBest regards,\n${fromEmail}`)
    const mailtoUrl = `mailto:${formData.email}?subject=${subject}&body=${body}`
    window.open(mailtoUrl)
  }

  const handleSendSMS = () => {
    const message = encodeURIComponent(`Hi ${formData.firstName}, this is regarding your booking. Please reply if you have any questions.`)
    const smsUrl = `sms:${formData.phone}?body=${message}`
    window.open(smsUrl)
  }

  const getEmailProviderStatus = async (): Promise<{ connected: boolean; message: string }> => {
    // Check if Gmail email config is available (from Gmail Configuration section)
    if (emailConfig?.email) {
      return { connected: true, message: `Gmail configured: ${emailConfig.email}` }
    }
    
    // Fallback to booking settings
    if (!bookingSettings) {
      return { connected: false, message: 'Booking settings not loaded' }
    }
    
    if (bookingSettings.contactEmailAddress) {
      return { connected: true, message: `Email configured: ${bookingSettings.contactEmailAddress}` }
    }
    
    if (bookingSettings.contactEmailProvider) {
      const provider = bookingSettings.contactEmailProvider.toLowerCase()
      
      switch (provider) {
        case 'gmail':
          // Check OAuth token in Firestore first, then fallback to booking settings
          try {
            if (checkOAuthToken) {
              const oauthConnected = await checkOAuthToken('gmail')
              if (oauthConnected) {
                return { connected: true, message: 'Gmail connected via OAuth' }
              }
            }
          } catch (error) {
            console.error('Error checking Gmail OAuth token:', error)
          }
          
          // Fallback to booking settings
          const gmailConnected = !!(bookingSettings.gmailConnected === true || bookingSettings.googleClientId)
          return { 
            connected: gmailConnected, 
            message: gmailConnected ? 'Gmail connected via settings' : 'Gmail not configured. Please set up Gmail in Booking Settings.' 
          }
        case 'outlook':
          // Check OAuth token in Firestore first, then fallback to booking settings
          try {
            if (checkOAuthToken) {
              const oauthConnected = await checkOAuthToken('outlook')
              if (oauthConnected) {
                return { connected: true, message: 'Outlook connected via OAuth' }
              }
            }
          } catch (error) {
            console.error('Error checking Outlook OAuth token:', error)
          }
          
          // Fallback to booking settings
          const outlookConnected = !!(bookingSettings.outlookConnected === true || bookingSettings.outlookClientId)
          return { 
            connected: outlookConnected, 
            message: outlookConnected ? 'Outlook connected via settings' : 'Outlook not connected' 
          }
        case 'custom':
          return { 
            connected: !!(bookingSettings.smtpHost && bookingSettings.smtpUser), 
            message: bookingSettings.smtpHost ? 'Custom SMTP configured' : 'Custom SMTP not configured' 
          }
        default:
          return { connected: false, message: `Unknown email provider: ${bookingSettings.contactEmailProvider}` }
      }
    }
    
    return { connected: false, message: 'No email configured. Please set up Gmail in Booking Settings.' }
  }

  // Deposit functions
  const handleProcessDeposit = async () => {
    try {
      setLoading(true)

      if (!depositData.amount || depositData.amount <= 0) {
        throw new Error('Enter a valid deposit amount before marking it as paid.')
      }

      if (!depositData.paymentMethod) {
        throw new Error('Select a payment method before marking the deposit as paid.')
      }

      const paidAt = new Date().toISOString()
      const transaction = {
        id: `deposit-${Date.now()}`,
        type: 'deposit',
        amount: depositData.amount,
        status: 'paid',
        method: depositData.paymentMethod,
        createdAt: paidAt,
      }
      
      setDepositData(prev => ({
        ...prev,
        paid: true,
        paidAt,
        transactions: [...prev.transactions, transaction],
      }))
      
      setSnackbar({ open: true, message: 'Deposit marked as paid. Save the booking to persist this change.', severity: 'success' })
      setShowProcessDepositDialog(false)
    } catch (error) {
      console.error('Error processing deposit:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update deposit status'
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendDepositRequest = async () => {
    try {
      setLoading(true)

      if (!formData.email) {
        throw new Error('No recipient email address')
      }

      if (!depositData.amount || depositData.amount <= 0) {
        throw new Error('Enter a valid deposit amount before sending a deposit request.')
      }

      const bookingName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim()
      const paymentInstructions = depositData.paymentLink
        ? `Please use this payment link to pay your deposit:\n${depositData.paymentLink}`
        : 'Please contact us to arrange payment for your deposit.'
      const subject = encodeURIComponent(`Deposit request for ${bookingName || "your booking"}`)
      const body = encodeURIComponent(
        `Hello ${formData.firstName || ""},\n\nA deposit of £${depositData.amount.toFixed(2)} is due for your booking.\n\n${paymentInstructions}\n\nBest regards`
      )

      window.location.href = `mailto:${formData.email}?subject=${subject}&body=${body}`
      setSnackbar({ open: true, message: 'Opened your email client with the deposit request', severity: 'success' })
    } catch (error) {
      console.error('Error sending deposit request:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare deposit request'
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
            <Tab icon={<PersonIcon />} label="Booking Details" />
            <Tab icon={<RestaurantIcon />} label="Preorders" />
            <Tab icon={<AttachMoneyIcon />} label="Deposits" />
            <Tab icon={<EmailIcon />} label="Contact" />
          </Tabs>
        </Box>

        {/* Booking Details Tab */}
        <TabPanel value={tabValue} index={0}>
          <FormSection title="Customer Information" icon={<PersonIcon />}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  fullWidth
                  required
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  fullWidth
                  required
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Company"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Source"
                  value={formData.source}
                  onChange={(e) => handleChange('source', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                />
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Booking Information" icon={<ScheduleIcon />}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={parseISO(formData.date)}
                  onChange={(date) => handleChange('date', date ? format(date, 'yyyy-MM-dd') : '')}
                  disabled={isReadOnly}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Arrival Time"
                  value={parseISO(`2000-01-01T${formData.arrivalTime}:00`)}
                  onChange={(time) => handleChange('arrivalTime', time ? format(time, 'HH:mm') : '')}
                  disabled={isReadOnly}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Number of Guests"
                  type="number"
                  value={formData.guests}
                  onChange={(e) => handleChange('guests', parseInt(e.target.value) || 1)}
                  fullWidth
                  inputProps={{ min: 1 }}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Duration (hours)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleChange('duration', parseFloat(e.target.value) || 2)}
                  fullWidth
                  inputProps={{ min: 0.5, step: 0.5 }}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={isReadOnly}>
                  <InputLabel>Booking Type</InputLabel>
                  <Select
                    value={formData.bookingType}
                    onChange={(e) => handleChange('bookingType', e.target.value)}
                    label="Booking Type"
                  >
                    {contextBookingTypes.map((type) => (
                      <MenuItem key={type.id} value={type.name}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={isReadOnly}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    label="Status"
                  >
                    {contextBookingStatuses.map((status) => (
                      <MenuItem key={status.id || status.name} value={status.name}>
                        {status.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={contextTables}
                  getOptionLabel={(option) => `${option.name} (Capacity: ${option.capacity})`}
                  value={contextTables.filter(table => 
                    formData.selectedTables.includes(table.id || '') || 
                    formData.selectedTables.includes(table.name || '') ||
                    formData.tableId === table.id
                  )}
                  onChange={(_, newValue) => {
                    const tableIds = newValue.map(table => table.id || table.name || '')
                    handleChange('selectedTables', tableIds)
                    // Also update legacy fields for compatibility
                    if (tableIds.length > 0) {
                      const firstTable = newValue[0]
                      handleChange('tableId', firstTable.id || '')
                      handleChange('tableNumber', firstTable.name || '')
                    } else {
                      handleChange('tableId', '')
                      handleChange('tableNumber', '')
                    }
                  }}
                  disabled={isReadOnly}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip 
                        variant="outlined" 
                        label={`${option.name} (${option.capacity})`} 
                        {...getTagProps({ index })} 
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tables"
                      placeholder="Select tables"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Deposit Amount"
                  type="number"
                  value={formData.deposit}
                  onChange={(e) => handleChange('deposit', parseFloat(e.target.value) || 0)}
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.depositPaid}
                      onChange={(e) => handleChange('depositPaid', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Deposit Paid"
                />
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Additional Information" icon={<ReceiptIcon />}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Special Requests"
                  value={formData.specialRequests}
                  onChange={(e) => handleChange('specialRequests', e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Dietary Requirements"
                  value={formData.dietaryRequirements}
                  onChange={(e) => handleChange('dietaryRequirements', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={contextBookingTags.map(tag => tag.name)}
                  value={formData.tags}
                  onChange={(_, newValue) => handleChange('tags', newValue)}
                  disabled={isReadOnly}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Add tags"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </FormSection>
        </TabPanel>

        {/* Preorders Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Preorder Management</Typography>
              {!isReadOnly && (
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => setShowPreorderLinkDialog(true)}
                  disabled={!formData.email}
                >
                  Send Preorder Link
                </Button>
              )}
            </Box>

            {preorderData.linkSent ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Preorder link sent to {preorderData.linkSentTo.join(', ')} on {format(new Date(preorderData.linkSentAt), 'PPp')}
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                No preorder link has been sent yet. Click "Send Preorder Link" to send the preorder form to the customer.
              </Alert>
            )}

            <Card>
              <CardHeader title="Preorder Link" />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    value={generatePreorderLink()}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                  <Button
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    onClick={copyPreorderLink}
                  >
                    Copy
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {preorderData.items.length > 0 && (
              <Card sx={{ mt: 2 }}>
                <CardHeader title="Preorder Items" />
                <CardContent>
                  <List>
                    {preorderData.items.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.name}
                          secondary={`Quantity: ${item.quantity}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Send Preorder Link Dialog */}
          <Dialog open={showPreorderLinkDialog} onClose={() => setShowPreorderLinkDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Send Preorder Link</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                This will send a preorder link to the customer's email address: <strong>{formData.email}</strong>
              </Typography>
              <TextField
                label="Custom Message (Optional)"
                multiline
                rows={3}
                fullWidth
                placeholder="Add a custom message to include with the preorder link..."
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowPreorderLinkDialog(false)}>Cancel</Button>
              <Button onClick={handleSendPreorderLink} variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Send Link'}
              </Button>
            </DialogActions>
          </Dialog>
        </TabPanel>

        {/* Deposits Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Deposit Management</Typography>
              {!isReadOnly && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<SendIcon />}
                    onClick={handleSendDepositRequest}
                    disabled={depositData.paid}
                  >
                    Send Deposit Request
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PaymentIcon />}
                    onClick={() => setShowProcessDepositDialog(true)}
                    disabled={depositData.paid}
                  >
                    Process Deposit
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Deposit Amount</Typography>
                    <Typography variant="h4" color="primary">
                      £{depositData.amount.toFixed(2)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      {depositData.paid ? (
                        <Chip icon={<CheckCircleIcon />} label="Paid" color="success" />
                      ) : (
                        <Chip label="Unpaid" color="warning" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Payment Details</Typography>
                    {depositData.paid ? (
                      <Box>
                        <Typography variant="body2">Paid on: {format(new Date(depositData.paidAt), 'PPp')}</Typography>
                        <Typography variant="body2">Method: {depositData.paymentMethod}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No payment received yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {depositData.transactions.length > 0 && (
              <Card sx={{ mt: 2 }}>
                <CardHeader title="Transaction History" />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {depositData.transactions.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(transaction.createdAt), 'PPp')}</TableCell>
                            <TableCell>{transaction.type}</TableCell>
                            <TableCell>£{transaction.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={transaction.status} 
                                color={transaction.status === 'paid' ? 'success' : 'default'} 
                                size="small" 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Process Deposit Dialog */}
          <Dialog open={showProcessDepositDialog} onClose={() => setShowProcessDepositDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Process Deposit Payment</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Process a deposit payment of £{depositData.amount.toFixed(2)} for this booking.
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={depositData.paymentMethod}
                  onChange={(e) => setDepositData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  label="Payment Method"
                >
                  <MenuItem value="Stripe">Stripe</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowProcessDepositDialog(false)}>Cancel</Button>
              <Button onClick={handleProcessDeposit} variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Process Payment'}
              </Button>
            </DialogActions>
          </Dialog>
        </TabPanel>

        {/* Contact Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Contact Management</Typography>
              {!isReadOnly && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    onClick={handleOpenEmailClient}
                    disabled={!formData.email}
                  >
                    Open Email Client
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={() => setShowEmailComposeDialog(true)}
                    disabled={!formData.email}
                  >
                    Compose Email
                  </Button>
                </Box>
              )}
            </Box>

            {/* Email Provider Status */}
            <Alert 
              severity={emailProviderStatus.connected ? 'success' : 'warning'} 
              sx={{ mb: 2 }}
              action={
                !emailProviderStatus.connected && (
                  <Button 
                    color="inherit" 
                    size="small" 
                    href="/Bookings/Settings"
                    target="_blank"
                  >
                    Configure Email
                  </Button>
                )
              }
            >
              Email Provider: {emailProviderStatus.message}
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Customer Contact</Typography>
                    <Typography variant="body2">Email: {formData.email}</Typography>
                    <Typography variant="body2">Phone: {formData.phone}</Typography>
                    {contactData.lastContact && (
                      <Typography variant="body2" color="text.secondary">
                        Last contact: {format(new Date(contactData.lastContact), 'PPp')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>From Email Address</Typography>
                    <Typography variant="body2" color={emailConfig?.email ? 'text.primary' : 'text.secondary'}>
                      {emailConfig?.email || bookingSettings?.contactEmailAddress || 'Not configured'}
                    </Typography>
                    {emailConfig?.senderName && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Sender: {emailConfig.senderName}
                      </Typography>
                    )}
                    {!emailConfig?.email && !bookingSettings?.contactEmailAddress && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        Please configure Gmail in Booking Settings
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<EmailIcon />}
                        onClick={handleOpenEmailClient}
                        disabled={!formData.email}
                      >
                        Open Email Client
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<SendIcon />}
                        onClick={handleSendSMS}
                        disabled={!formData.phone}
                      >
                        Send SMS
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Communication History */}
            <Card sx={{ mt: 2 }}>
              <CardHeader 
                title="Communication History" 
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EmailIcon />}
                    onClick={() => setShowEmailComposeDialog(true)}
                    disabled={!formData.email}
                  >
                    New Email
                  </Button>
                }
              />
              <CardContent>
                {contactData.messages.length > 0 ? (
                  <List>
                    {contactData.messages.map((message, index) => (
                      <ListItem key={message.id || index} divider>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: message.type === 'outbound' ? themeConfig.brandColors.navy : themeConfig.brandColors.offWhite 
                          }}>
                            <EmailIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1">{message.subject}</Typography>
                              <Chip 
                                label={message.status || 'sent'} 
                                size="small" 
                                color={message.status === 'sent' ? 'success' : 'default'}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {message.type === 'outbound' ? 'To' : 'From'}: {message.to || message.from} • {format(new Date(message.sentAt), 'PPp')}
                                {message.provider && ` • Via ${message.provider}`}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                {message.body}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <EmailIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No communication history yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Start a conversation with your customer
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={() => setShowEmailComposeDialog(true)}
                      disabled={!formData.email}
                    >
                      Send First Email
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Email Compose Dialog */}
          <Dialog open={showEmailComposeDialog} onClose={() => setShowEmailComposeDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Send an email to: <strong>{formData.email}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                From: <strong>{emailConfig?.email || bookingSettings?.contactEmailAddress || 'Not configured'}</strong>
                {emailConfig?.senderName && ` (${emailConfig.senderName})`}
              </Typography>
              
              {/* Email Templates */}
              {bookingSettings?.predefinedEmailTemplates && bookingSettings.predefinedEmailTemplates.length > 0 && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Email Template</InputLabel>
                  <Select
                    value={emailCompose.template}
                    onChange={(e) => {
                      const template = bookingSettings.predefinedEmailTemplates?.find(t => t.id === e.target.value)
                      if (template) {
                        setEmailCompose(prev => ({
                          ...prev,
                          template: e.target.value,
                          subject: template.subject,
                          body: template.body
                        }))
                      } else {
                        setEmailCompose(prev => ({
                          ...prev,
                          template: e.target.value
                        }))
                      }
                    }}
                    label="Email Template"
                  >
                    <MenuItem value="">Custom Message</MenuItem>
                    {bookingSettings.predefinedEmailTemplates.map((template) => (
                      <MenuItem key={template.id || template.name} value={template.id || template.name}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <TextField
                label="Subject"
                fullWidth
                sx={{ mb: 2 }}
                value={emailCompose.subject}
                onChange={(e) => setEmailCompose(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject..."
              />
              <TextField
                label="Message"
                multiline
                rows={6}
                fullWidth
                value={emailCompose.body}
                onChange={(e) => setEmailCompose(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter your message..."
              />
              
              {/* Email Provider Status */}
              {!emailProviderStatus.connected && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {emailProviderStatus.message}. 
                  <Button 
                    color="inherit" 
                    size="small" 
                    href="/Bookings/Settings"
                    target="_blank"
                    sx={{ ml: 1 }}
                  >
                    Configure Email Provider
                  </Button>
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEmailComposeDialog(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                startIcon={<SendIcon />}
                onClick={() => handleSendEmail()}
                disabled={sendingEmail || !emailCompose.subject || !emailCompose.body}
              >
                {sendingEmail ? <CircularProgress size={20} /> : 'Send Email'}
              </Button>
            </DialogActions>
          </Dialog>
        </TabPanel>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          message={snackbar.message}
        />
      </Box>
    </LocalizationProvider>
  )
}

export default TabbedBookingForm
