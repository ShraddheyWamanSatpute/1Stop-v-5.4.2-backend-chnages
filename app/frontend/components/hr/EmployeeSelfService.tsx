"use client"
import { useLocation } from "react-router-dom"

import React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Avatar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
} from '@mui/material'
import {
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  Assessment as PerformanceIcon,
  ContactPhone as ContactIcon,
  AccessTime as TimeIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Edit as EditIcon,
  ViewList as ViewListIcon,
  CalendarMonth as CalendarMonthIcon,
  Payment as PaymentIcon,
  BeachAccess as HolidayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PictureAsPdf as PdfIcon,
  Today as TodayIcon,
  CalendarToday as CalendarTodayIcon,
  Description as ContractIcon,
  School as TrainingIcon,
  Verified as CertificationIcon,
  Visibility as ViewIcon,
  Article as ArticleIcon,
} from '@mui/icons-material'
import { styled, alpha } from "@mui/material/styles";import { useHRContext } from "../../../backend/context/HRContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { db, ref, get, uploadFile } from "../../../backend/services/Firebase"
// Company state is now handled through HRContext
import type { TimeOff, Payroll, Schedule, PerformanceReviewForm } from "../../../backend/interfaces/HRs"
import ClockInOutFeature from "./ClockInOutFeature"
import { themeConfig } from "../../../theme/AppTheme"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import EmptyStateCard from "../reusable/EmptyStateCard"
import TimeOffCRUDForm from "./forms/TimeOffCRUDForm"
import type { TimeOffCRUDFormHandle } from "./forms/TimeOffCRUDForm"
import PayrollCRUDForm from "./forms/PayrollCRUDForm"
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays } from 'date-fns'
import { calculateHolidayBalance } from '../../../../mobile/backend/utils/mobileDataFilters'
import jsPDF from 'jspdf'

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[2],
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}))

// Tab panel component
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
      id={`selfservice-tabpanel-${index}`}
      aria-labelledby={`selfservice-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'rejected': return 'error'
    case 'completed': return 'success'
    case 'in progress': return 'info'
    case 'scheduled': return 'primary'
    default: return 'default'
  }
}

// Main component
const EmployeeSelfService: React.FC = () => {
  const location = useLocation()
  const hrContext = useHRContext()
  const { state: settingsState } = useSettings()
  // Company state is now handled through HRContext
  
  const hrState = hrContext?.state
  // Use HRContext functions for time off operations
  const {
    addTimeOff,
    updateTimeOff,
    refreshTimeOffs,
    updateEmployee,
    updateContract,
    refreshContracts,
  } = hrContext || {}
  // Get current user's UID from authentication
  const currentUserId = settingsState?.auth?.uid || settingsState?.user?.uid
  const currentCompanyId = hrState?.companyID || settingsState?.user?.currentCompanyID
  // Company state is now handled through HRContext
  
  // State to hold company user data
  const [companyUserData, setCompanyUserData] = useState<any>(null)
  const [companyUserLoading, setCompanyUserLoading] = useState(true)
  const [employeesInitialized, setEmployeesInitialized] = useState(false)
  
  // Owner emulation - allow owners to view as any employee
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const isOwner = companyUserData?.role === 'owner' || settingsState?.user?.companies?.find(
    (c: any) => c.companyID === currentCompanyId
  )?.role === 'owner'
  
  // State management
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const timeOffCRUDFormRef = useRef<TimeOffCRUDFormHandle | null>(null)
  const [tabValue, setTabValue] = useState(0)
  
  // Data states
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOff[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReviewForm[]>([])
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [documentsTabValue, setDocumentsTabValue] = useState(0)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [signature, setSignature] = useState("")
  const [emergencyContactDialogOpen, setEmergencyContactDialogOpen] = useState(false)
  const [emergencyContactForm, setEmergencyContactForm] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
  })
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  
  // Dialog states - Using CRUD Modal
  const [timeOffCRUDModalOpen, setTimeOffCRUDModalOpen] = useState(false)
  const [selectedTimeOffForCRUD, setSelectedTimeOffForCRUD] = useState<TimeOff | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  
  // Payroll CRUD Modal state
  const [payrollCRUDModalOpen, setPayrollCRUDModalOpen] = useState(false)
  const [selectedPayrollForCRUD, setSelectedPayrollForCRUD] = useState<Payroll | null>(null)
  
  // View states
  const [scheduleView, setScheduleView] = useState<'list' | 'week'>('week')
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const dateButtonRef = React.useRef<HTMLButtonElement>(null)
  const documentUploadInputRef = React.useRef<HTMLInputElement>(null)
  const [listDateType, setListDateType] = useState<'day' | 'week' | 'month'>('week')
  const [listStartDate, setListStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [listEndDate, setListEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }))

  // Note: Data is now loaded automatically by HRContext with progressive loading and caching
  // No need to manually refresh - context handles all data loading efficiently
  // Only refresh if explicitly needed (e.g., after creating/updating data)
  useEffect(() => {
    // Mark as initialized when context data is available
    if (hrState.employees.length > 0 && !employeesInitialized) {
      setEmployeesInitialized(true)
    }
  }, [hrState.employees.length, employeesInitialized])

  // Fetch company user data to verify user exists in company
  useEffect(() => {
    const fetchCompanyUser = async () => {
      if (!currentUserId || !currentCompanyId) {
        setCompanyUserLoading(false)
        return
      }
      
      try {
        const companyUserRef = ref(db, `companies/${currentCompanyId}/users/${currentUserId}`)
        const snapshot = await get(companyUserRef)
        
        if (snapshot.exists()) {
          setCompanyUserData(snapshot.val())
        } else {
          setCompanyUserData(null)
        }
      } catch (err) {
        console.error('Error fetching company user data:', err)
      } finally {
        setCompanyUserLoading(false)
      }
    }
    
    fetchCompanyUser()
  }, [currentUserId, currentCompanyId])

  // Get current employee - with owner emulation support
  const currentEmployee = React.useMemo(() => {
    // If owner is emulating an employee, use the selected employee
    if (isOwner && selectedEmployeeId) {
      const emulatedEmployee = hrState?.employees?.find((emp: any) => emp.id === selectedEmployeeId)
      if (emulatedEmployee) {
        return emulatedEmployee
      }
    }
    
    // Otherwise, match by userId (normal behavior)
    return hrState?.employees?.find((emp: any) => 
      String(emp.userId) === String(currentUserId) || 
      String(emp.id) === String(currentUserId)
    )
  }, [isOwner, selectedEmployeeId, hrState?.employees, currentUserId])

  // Get employee's role name (same logic as EmployeeList)
  const getEmployeeRoleName = React.useCallback((employee: any) => {
    if (!hrState?.roles) {
      return 'N/A'
    }
    
    if (!employee) {
      return 'N/A'
    }
    
    // Get roleID from employee (note: backend uses roleID with capital ID)
    const roleId = (employee as any).roleID || employee.roleId
    
    if (!roleId) {
      return employee.jobTitle || 'N/A'
    }
    
    // Try to find role by ID
    const role = hrState.roles.find((r: any) => r.id === roleId)
    if (role) {
      return role.label || role.name || roleId
    }
    
    // If not found by ID, try to find by name (in case roleId is actually a name)
    const roleByName = hrState.roles.find((r: any) => 
      r.name === roleId || r.label === roleId
    )
    if (roleByName) {
      return roleByName.label || roleByName.name || roleId
    }
    
    return roleId || employee.jobTitle || 'Unknown Role'
  }, [hrState?.roles])

  // Get department name (same logic as EmployeeList)
  const getDepartmentName = React.useCallback((departmentValue?: string) => {
    if (!departmentValue) return 'N/A'
    
    // Check if it's already a department name (not an ID)
    if (!hrState?.departments) {
      return departmentValue
    }
    
    // Try to find department by ID
    const dept = hrState.departments.find((d: any) => d.id === departmentValue)
    if (dept) {
      return dept.name || departmentValue
    }
    
    // If not found by ID, might already be a name
    return departmentValue
  }, [hrState?.departments])

  // Keep console quiet; owner detection and mapping is stable.

  // Data loading
  const loadData = useCallback(async () => {
    if (!currentEmployee) return
    
    setLoading(true)
    try {
      // Load employee-specific data - use updated logic from mobile/ess
      const timeOffData = hrState?.timeOffs?.filter((to: any) => to.employeeId === currentEmployee.id) || []
      // Filter out draft schedules - employees should not see draft schedules
      const scheduleData = hrState?.schedules?.filter((s: any) => 
        s.employeeId === currentEmployee.id && s.status !== "draft"
      ) || []
      const performanceData = hrState?.performanceReviews?.filter((pr: any) => pr.employeeId === currentEmployee.id) || []
      const payrollData = hrState?.payrollRecords?.filter((p: any) => p.employeeId === currentEmployee.id) || []
      
      // Calculate totalDays for time off requests if missing (using differenceInDays logic from mobile/ess)
      const timeOffDataWithDays = timeOffData.map((to: TimeOff) => {
        if (!to.totalDays && to.startDate && to.endDate) {
          const start = new Date(to.startDate)
          const end = new Date(to.endDate)
          const days = differenceInDays(end, start) + 1
          return { ...to, totalDays: Math.max(1, days) }
        }
        return to
      })
      
      setTimeOffRequests(timeOffDataWithDays)
      setSchedules(scheduleData)
      setPerformanceReviews(performanceData)
      setPayrolls(payrollData)
      
      // Load announcements (all company announcements visible to employees)
      const announcementsData = hrState?.announcements || []
      setAnnouncements(announcementsData)
      
      // Load emergency contacts from employee data
      if (currentEmployee.emergencyContact) {
        setEmergencyContacts([{
          id: '1',
          name: currentEmployee.emergencyContact.name,
          relationship: currentEmployee.emergencyContact.relationship,
          phone: currentEmployee.emergencyContact.phone,
          email: (currentEmployee.emergencyContact as any).email || ""
        }])
      } else {
        setEmergencyContacts([])
      }
      
      // Load documents from employee data
      if (currentEmployee.documents) {
        setDocuments(currentEmployee.documents)
      }

      // Load contracts for this employee
      // First, ensure contracts are loaded in HR context
      if (refreshContracts && (!hrState?.contracts || hrState.contracts.length === 0)) {
        await refreshContracts()
      }
      
      const allContracts = (hrState?.contracts || []) as any[]
      const employeeContracts = allContracts.filter(c => c.employeeId === currentEmployee.id)
      setContracts(employeeContracts)
      
    } catch (err) {
      setError('Failed to load employee data')
      console.error('Error loading employee data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentEmployee, hrState, currentUserId, refreshContracts])
  
  // Refresh contracts when hrState.contracts changes
  useEffect(() => {
    if (currentEmployee?.id && hrState?.contracts) {
      const allContracts = (hrState.contracts || []) as any[]
      const employeeContracts = allContracts.filter(c => c.employeeId === currentEmployee.id)
      setContracts(employeeContracts)
    }
  }, [hrState?.contracts, currentEmployee?.id])

  // Combine contracts and documents like mobile ESS - useMemo for performance
  const allDocuments = React.useMemo(() => {
    const docs: Array<Document & { category: string; needsSignature?: boolean }> = []
    
    // Get contracts from HR context (filtered by employee)
    if (contracts && contracts.length > 0) {
      const employeeContracts = contracts.map((contract: any) => ({
        id: contract.id || contract.contractId,
        name: contract.contractTitle || contract.name || contract.title || "Contract",
        type: contract.type || "pdf",
        url: contract.url || contract.fileUrl || "",
        uploadedAt: contract.uploadedAt || contract.createdAt || Date.now(),
        expiryDate: contract.expiryDate,
        category: "contract",
        needsSignature: !contract.signedAt || !contract.signature, // Check if signature is missing
        signature: contract.signature,
        signedAt: contract.signedAt,
        contractData: contract, // Store full contract data for PDF generation
      }))
      docs.push(...employeeContracts)
    }
    
    // Get training documents from employee object (filter by category)
    if (documents && documents.length > 0) {
      const employeeDocs = documents.map((doc: any) => {
        // Determine category based on document name or type
        let category = "training"
        const docName = (doc.name || "").toLowerCase()
        if (docName.includes("certif") || docName.includes("license") || docName.includes("qualification")) {
          category = "certification"
        } else if (docName.includes("training") || docName.includes("course")) {
          category = "training"
        }
        
        return {
          ...doc,
          category,
        }
      })
      docs.push(...employeeDocs)
    }
    
    return docs
  }, [contracts, documents])

  const documentCategories = [
    { label: "Contracts", value: "contract" },
    { label: "Training", value: "training" },
    { label: "Certification", value: "certification" },
  ]

  const filteredDocuments = React.useMemo(() => {
    return allDocuments.filter((doc) => doc.category === documentCategories[documentsTabValue].value)
  }, [allDocuments, documentsTabValue, documentCategories])

  const theme = useTheme()

  const getDocumentIcon = (type: string, category: string) => {
    if (category === "contract") {
      return <ContractIcon sx={{ color: theme.palette.primary.main }} />
    }
    if (category === "training") {
      return <TrainingIcon sx={{ color: theme.palette.info.main }} />
    }
    if (category === "certification") {
      return <CertificationIcon sx={{ color: theme.palette.success.main }} />
    }
    switch (type?.toLowerCase()) {
      case "pdf":
        return <PdfIcon sx={{ color: theme.palette.error.main }} />
      case "doc":
      case "docx":
        return <ArticleIcon sx={{ color: theme.palette.primary.main }} />
      default:
        return <DocumentIcon color="action" />
    }
  }

  const handleSignContract = (contract: any) => {
    setSelectedContract(contract)
    setSignatureDialogOpen(true)
    setSignature("")
  }

  const handleSaveSignature = async () => {
    if (!signature.trim() || !selectedContract || !updateContract) return

    try {
      setLoading(true)
      const contractId = selectedContract.contractData?.id || selectedContract.id
      const signerName = `${currentEmployee?.firstName || ""} ${currentEmployee?.lastName || ""}`.trim() || signature.trim()
      const saved = await updateContract(contractId, {
        signature: signature.trim(),
        signedAt: Date.now(),
        signedByName: signerName,
      } as any)

      if (!saved) {
        throw new Error("Unable to save your signature right now")
      }

      if (refreshContracts) {
        await refreshContracts()
      }
      await loadData()
      setNotification({ message: "Contract signed successfully", type: "success" })
      setSignatureDialogOpen(false)
      setSelectedContract(null)
      setSignature("")
    } catch (err) {
      console.error("Failed to save contract signature:", err)
      setNotification({ message: "Failed to sign contract", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocument = (doc: Document & { category: string; needsSignature?: boolean; contractData?: any }) => {
    if (doc.category === "contract" && doc.needsSignature) {
      handleSignContract(doc)
    } else if (doc.category === "contract" && doc.contractData) {
      // Generate and download PDF for contract
      handleDownloadContractPDF(doc.contractData)
    } else if (doc.url) {
      window.open(doc.url, "_blank")
    }
  }

  const handleDownloadContractPDF = (c: any) => {
    try {
      // Dynamic import for jsPDF
      import('jspdf').then((jsPDF) => {
        const doc = new jsPDF.default()
        const contractTitle = c.contractTitle || 'Employment Contract'
        
        // Add title
        doc.setFontSize(16)
        doc.text(contractTitle, 14, 20)
        
        // Add contract details
        doc.setFontSize(10)
        let y = 30
        doc.text(`Type: ${c.type || 'N/A'}`, 14, y)
        y += 7
        doc.text(`Status: ${c.status || 'N/A'}`, 14, y)
        y += 7
        doc.text(`Start Date: ${c.startDate ? formatDate(new Date(c.startDate)) : 'N/A'}`, 14, y)
        y += 7
        if (c.endDate) {
          doc.text(`End Date: ${formatDate(new Date(c.endDate))}`, 14, y)
          y += 7
        }
        y += 5
        
        // Add contract body HTML content (strip HTML tags and convert to text)
        if (c.bodyHtml) {
          // Create a temporary div to extract text from HTML
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = c.bodyHtml
          const textContent = tempDiv.textContent || tempDiv.innerText || ''
          
          // Split text into lines that fit the page width
          const pageWidth = doc.internal.pageSize.width - 28 // margins
          const lines = doc.splitTextToSize(textContent, pageWidth)
          
          // Add lines to PDF
          lines.forEach((line: string) => {
            if (y > doc.internal.pageSize.height - 20) {
              doc.addPage()
              y = 20
            }
            doc.text(line, 14, y)
            y += 7
          })
        }
        
        // Save PDF
        const fileName = `contract_${c.id}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
        doc.save(fileName)
      }).catch((error) => {
        console.error('Error loading jsPDF:', error)
        setNotification({ message: 'Failed to generate PDF', type: 'error' })
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      setNotification({ message: 'Failed to generate PDF', type: 'error' })
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData, currentUserId])

  const openEmergencyContactDialog = useCallback(() => {
    setEmergencyContactForm({
      name: currentEmployee?.emergencyContact?.name || "",
      relationship: currentEmployee?.emergencyContact?.relationship || "",
      phone: currentEmployee?.emergencyContact?.phone || "",
      email: (currentEmployee?.emergencyContact as any)?.email || emergencyContacts[0]?.email || "",
    })
    setEmergencyContactDialogOpen(true)
  }, [currentEmployee, emergencyContacts])

  const handleSaveEmergencyContact = useCallback(async () => {
    if (!currentEmployee || !updateEmployee) return

    try {
      setLoading(true)
      const payload = {
        name: emergencyContactForm.name.trim(),
        relationship: emergencyContactForm.relationship.trim(),
        phone: emergencyContactForm.phone.trim(),
        email: emergencyContactForm.email.trim(),
      }

      if (!payload.name || !payload.relationship || !payload.phone) {
        setNotification({ message: "Please complete the emergency contact details", type: "error" })
        return
      }

      const updated = await updateEmployee(currentEmployee.id, {
        emergencyContact: payload as any,
      })

      if (!updated) {
        throw new Error("Failed to save emergency contact")
      }

      setEmergencyContacts([{ id: "1", ...payload }])
      setEmergencyContactDialogOpen(false)
      setNotification({ message: "Emergency contact updated", type: "success" })
    } catch (err) {
      console.error("Failed to update emergency contact:", err)
      setNotification({ message: "Failed to update emergency contact", type: "error" })
    } finally {
      setLoading(false)
    }
  }, [currentEmployee, emergencyContactForm, updateEmployee])

  const handleDocumentUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentEmployee || !updateEmployee) return

    try {
      setLoading(true)
      const url = await uploadFile(file, `hr/employees/${currentEmployee.id}/documents`)
      const extension = file.name.includes(".") ? file.name.split(".").pop() || file.type : file.type || "file"
      const nextDocument = {
        id: `${Date.now()}`,
        name: file.name,
        type: extension,
        url,
        uploadedAt: Date.now(),
      }
      const nextDocuments = [...(currentEmployee.documents || []), nextDocument]
      const updated = await updateEmployee(currentEmployee.id, { documents: nextDocuments })

      if (!updated) {
        throw new Error("Failed to save uploaded document")
      }

      setDocuments(nextDocuments)
      setNotification({ message: "Document uploaded successfully", type: "success" })
    } catch (err) {
      console.error("Failed to upload document:", err)
      setNotification({ message: "Failed to upload document", type: "error" })
    } finally {
      event.target.value = ""
      setLoading(false)
    }
  }, [currentEmployee, updateEmployee])

  // Event handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Time Off CRUD Handlers
  const handleOpenTimeOffCRUD = (timeOff?: TimeOff, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedTimeOffForCRUD(timeOff || null)
    setCrudMode(mode)
    setTimeOffCRUDModalOpen(true)
  }

  const handleCloseTimeOffCRUD = () => {
    setTimeOffCRUDModalOpen(false)
    setSelectedTimeOffForCRUD(null)
    setCrudMode('create')
  }

  const handleSaveTimeOffCRUD = async (data: any) => {
    try {
      setLoading(true)
      
      if (!currentEmployee) {
        console.error('Cannot create time off: currentEmployee is undefined')
        setNotification({ message: 'Cannot create time off: Employee not found', type: 'error' })
        return
      }
      
      // Ensure employeeId is always set to current employee (employees can only request for themselves)
      const timeOffData = {
        ...data,
        employeeId: currentEmployee.id, // Force current employee ID
        startDate: typeof data.startDate === 'number' 
          ? data.startDate 
          : (data.startDate instanceof Date ? data.startDate.getTime() : new Date(data.startDate).getTime()),
        endDate: typeof data.endDate === 'number'
          ? data.endDate
          : (data.endDate instanceof Date ? data.endDate.getTime() : new Date(data.endDate).getTime()),
        status: crudMode === 'create' ? 'pending' as const : data.status,
        createdAt: crudMode === 'create' ? Date.now() : data.createdAt,
      }
      
      // Use HRContext functions for time off operations
      if (crudMode === 'create') {
        if (!addTimeOff) {
          throw new Error('addTimeOff function not available')
        }
        const result = await addTimeOff(timeOffData)
        if (!result) {
          throw new Error('Failed to create time off request')
        }
      } else if (crudMode === 'edit' && selectedTimeOffForCRUD?.id) {
        if (!updateTimeOff) {
          throw new Error('updateTimeOff function not available')
        }
        // Ensure we're only updating the current employee's request
        if (selectedTimeOffForCRUD.employeeId !== currentEmployee.id) {
          throw new Error('You can only edit your own time off requests')
        }
        const result = await updateTimeOff(selectedTimeOffForCRUD.id, timeOffData)
        if (!result) {
          throw new Error('Failed to update time off request')
        }
      }
      
      // Refresh time offs to get latest data
      if (refreshTimeOffs) {
        await refreshTimeOffs(true)
      }
      
      handleCloseTimeOffCRUD()
      setNotification({ 
        message: `Time off request ${crudMode === 'create' ? 'submitted' : 'updated'} successfully`, 
        type: 'success' 
      })
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${crudMode} time off request`
      setError(errorMessage)
      setNotification({ message: errorMessage, type: 'error' })
      console.error(`Error ${crudMode} time off request:`, err)
    } finally {
      setLoading(false)
    }
  }

  // Payroll CRUD Handlers
  const handleOpenPayrollCRUD = (payroll: Payroll) => {
    setSelectedPayrollForCRUD(payroll)
    setPayrollCRUDModalOpen(true)
  }

  const handleClosePayrollCRUD = () => {
    setPayrollCRUDModalOpen(false)
    setSelectedPayrollForCRUD(null)
  }

  const handleDocumentDownload = (_documentId: string) => {
    // Mock download functionality
    setNotification({ message: 'Document download started', type: 'info' })
  }

  // Show loading state while checking user permissions
  if ((loading && !currentEmployee) || (companyUserLoading && !companyUserData)) {
    return (
      <Box sx={{ px: 2, py: 4 }}>
        <EmptyStateCard
          icon={PersonIcon}
          title="Preparing your employee profile"
          description="Your data is still loading. The page will populate automatically."
          cardSx={{ maxWidth: 560, mx: "auto" }}
        />
      </Box>
    )
  }

  // Show employee selector for owners
  if (isOwner && !selectedEmployeeId && hrState?.employees && hrState.employees.length > 0) {
    return (
      <Box sx={{ m: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            👑 Owner Account - Employee Self-Service Portal
          </Typography>
          <Typography variant="body2">
            As an owner, you can view the self-service portal as any employee. Select an employee below to continue.
          </Typography>
        </Alert>
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Select Employee to View As
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Employee</InputLabel>
              <Select
                value={selectedEmployeeId || ''}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                label="Employee"
              >
                {hrState.employees.map((emp: any) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={emp.photo} sx={{ width: 32, height: 32 }}>
                        {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">
                          {emp.firstName} {emp.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getEmployeeRoleName(emp)} • {getDepartmentName(emp.department)}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (!currentEmployee) {
    return (
      <Box sx={{ m: 3 }}>
        <EmptyStateCard
          icon={PersonIcon}
          title="No employee profile linked to your account"
          description="Please contact your administrator to link your user account to an employee profile."
          cardSx={{ maxWidth: 720, mx: "auto" }}
          action={
            <Box sx={{ textAlign: "left", width: "100%" }}>
              {currentUserId && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Your User ID: {currentUserId}
                </Typography>
              )}
              {hrState?.companyID && (
                <Typography variant="caption" display="block">
                  Company ID: {hrState.companyID}
                </Typography>
              )}
              {companyUserData && (
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'success.main' }}>
                  ✓ User exists in company - Role: {companyUserData.role || 'N/A'}, Department: {companyUserData.department || 'N/A'}
                </Typography>
              )}
              {!companyUserLoading && !companyUserData && (
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'warning.main' }}>
                  ⚠ User not found in companies/{hrState?.companyID}/users/ - User may not be properly added to this company
                </Typography>
              )}
            </Box>
          }
        />
        
        {hrState?.employees && hrState.employees.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Troubleshooting Information:
            </Typography>
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              Found {hrState.employees.length} employee(s) in this company/site, but none match your user ID.
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 'bold', mb: 0.5 }}>
              Your User ID: {currentUserId}
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', mb: 0.5 }}>
              Employees loaded from: {hrState?.companyID ? `companies/${hrState.companyID}` : 'unknown'}
              {hrState?.selectedSiteID && ` / site: ${hrState.selectedSiteID}`}
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
              All employees in current context:
            </Typography>
            {hrState.employees.map((emp: any) => (
              <Typography key={emp.id} variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', ml: 1 }}>
                • {emp.firstName} {emp.lastName} - UserID: {emp.userId || '(not set)'} - ID: {emp.id}
              </Typography>
            ))}
            <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold', color: themeConfig.brandColors.navy }}>
              Fix: Edit the employee record for your name and set the userId field to: {currentUserId}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
              Note: If more employees exist but aren't shown, check if they're assigned to a different site/location.
            </Typography>
          </Alert>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ pt: 3, width: "100%" }}>
      {/* Owner employee selector - shown at top if owner is emulating */}
      {isOwner && selectedEmployeeId && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setSelectedEmployeeId(null)}>
              Change Employee
            </Button>
          }
        >
          <Typography variant="body2">
            👑 Viewing as: <strong>{currentEmployee.firstName} {currentEmployee.lastName}</strong>
          </Typography>
        </Alert>
      )}

      {/* Header with Integrated Tabs */}
      <Card sx={{ mb: 3, bgcolor: themeConfig.colors.primary.main }}>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar src={currentEmployee.photo} sx={{ width: 48, height: 48 }}>
              {currentEmployee.firstName.charAt(0)}{currentEmployee.lastName.charAt(0)}
            </Avatar>
            <Box>
                <Typography variant="h6" sx={{ color: "white", fontWeight: 600 }}>
                Welcome, {currentEmployee.firstName} {currentEmployee.lastName}!
              </Typography>
                <Typography variant="body2" sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.8) }}>
                  {getEmployeeRoleName(currentEmployee)} • {getDepartmentName(currentEmployee.department)}
              </Typography>
            </Box>
          </Box>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="self service tabs"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: '40px',
                '& .MuiTab-root': {
                  color: alpha(themeConfig.brandColors.offWhite, 0.7),
                  minHeight: '40px',
                  py: 0.5,
                  fontSize: '0.875rem',
                  '&.Mui-selected': {
                    color: 'white',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'white',
                },
              }}
            >
            <Tab icon={<PersonIcon />} label="Overview" />
            <Tab icon={<ScheduleIcon />} label="Schedule" />
              <Tab icon={<HolidayIcon />} label="Holidays" />
            <Tab icon={<DocumentIcon />} label="Documents" />
            <Tab icon={<PerformanceIcon />} label="Performance" />
              <Tab icon={<PaymentIcon />} label="Payslips" />
            <Tab icon={<ContactIcon />} label="Emergency Contacts" />
          </Tabs>
        </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Overview Tab */}
        <Grid container spacing={2}>
          {/* Recent Activity & Quick Actions - Combined */}
          <Grid item xs={12}>
            <StyledCard>
              <CardContent>
                <Grid container spacing={3}>
                  {/* Quick Actions Section */}
                  <Grid item xs={12} md={6}>
                    <ClockInOutFeature employeeId={currentEmployee.id} compact />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        fullWidth
                        onClick={() => handleOpenTimeOffCRUD(undefined, 'create')}
                        startIcon={<ScheduleIcon />}
                      >
                        Request Time Off
                      </Button>
                      <Button 
                        variant="outlined"
                        fullWidth
                        onClick={() => documentUploadInputRef.current?.click()}
                        startIcon={<UploadIcon />}
                        disabled={loading}
                      >
                        Upload Document
                      </Button>
                    </Box>
                  </Grid>

                  {/* Recent Activity Section */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Recent Activity</Typography>
                    {timeOffRequests.length === 0 && announcements.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: 1 }}>No recent activity.</Alert>
                    ) : (
                      <List dense>
                        {/* Combine time off requests and announcements, sort by date, show most recent */}
                        {[
                          ...timeOffRequests.map((request: any) => ({
                            ...request,
                            itemType: 'timeoff',
                            itemDate: request.startDate,
                          })),
                          ...announcements.map((announcement: any) => ({
                            ...announcement,
                            itemType: 'announcement',
                            itemDate: announcement.createdAt,
                          })),
                        ]
                          .sort((a, b) => new Date(b.itemDate).getTime() - new Date(a.itemDate).getTime())
                          .slice(0, 6)
                          .map((item: any) => {
                            if (item.itemType === 'timeoff') {
                              return (
                                <ListItem 
                                  key={item.id}
                                  sx={{ 
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'action.hover', borderRadius: 1 },
                                    mb: 0.5
                                  }}
                                  onClick={() => handleOpenTimeOffCRUD(item, 'view')}
                                >
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" fontWeight={500}>
                                        {item.type === 'vacation' ? 'Annual Leave' : item.type.charAt(0).toUpperCase() + item.type.slice(1)} Request
                </Typography>
                                    }
                                    secondary={`${formatDate(new Date(item.startDate))} - ${formatDate(new Date(item.endDate))}`}
                                  />
                                  <Chip 
                                    label={item.status.charAt(0).toUpperCase() + item.status.slice(1)} 
                                    color={getStatusColor(item.status)}
                                    size="small"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </ListItem>
                              )
                            } else {
                              return (
                                <ListItem key={item.id} sx={{ mb: 0.5 }}>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" fontWeight={500}>
                                        📢 {item.title}
                                      </Typography>
                                    }
                                    secondary={item.message || item.content}
                                  />
                                </ListItem>
                              )
                            }
                          })}
                      </List>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* Employment Information - Combined Card */}
          <Grid item xs={12}>
            <StyledCard>
              <CardContent>
                <Grid container spacing={3}>
                  {/* Personal Information Column */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Email:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{currentEmployee.email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Phone:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{currentEmployee.phone || 'Not provided'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Date of Birth:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>
                      {currentEmployee.dateOfBirth ? formatDate(new Date(currentEmployee.dateOfBirth)) : 'Not provided'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Address:</Typography>
                    <Typography variant="body1" sx={{ textAlign: 'right', maxWidth: '60%', fontSize: '1.05rem' }}>
                      {currentEmployee.address ? `${currentEmployee.address}, ${currentEmployee.city || ''} ${currentEmployee.zip || ''}` : 'Not provided'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>National Insurance:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{currentEmployee.nationalInsuranceNumber || 'Not provided'}</Typography>
                  </Box>
                </Box>
          </Grid>

                  {/* Job Information Column */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Employee ID:</Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '1.05rem' }}>
                          {currentEmployee.employeeID || currentEmployee.id}
                        </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Role:</Typography>
                        <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{getEmployeeRoleName(currentEmployee)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Department:</Typography>
                        <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{getDepartmentName(currentEmployee.department)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Employment Type:</Typography>
                        <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>
                          {currentEmployee.employmentType || currentEmployee.isFullTime ? 'Full-time' : 'Part-time'}
                        </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Hire Date:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{formatDate(new Date(currentEmployee.hireDate))}</Typography>
                  </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Length of Service:</Typography>
                        <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>
                          {Math.floor((Date.now() - new Date(currentEmployee.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years
                        </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Status:</Typography>
                    <Chip 
                      label={currentEmployee.status} 
                          color={currentEmployee.status === 'active' ? 'success' : currentEmployee.status === 'on_leave' ? 'warning' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Manager:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{currentEmployee.manager || 'Not assigned'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Working Hours:</Typography>
                        <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{currentEmployee.hoursPerWeek || 40} hours/week</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Holiday Entitlement:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem' }}>{currentEmployee.holidaysPerYear || 25} days/year</Typography>
                </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Pay Type:</Typography>
                        <Typography variant="body1" sx={{ textTransform: 'capitalize', fontSize: '1.05rem' }}>
                          {currentEmployee.payType || 'Salary'}
                        </Typography>
                </Box>
                      {currentEmployee.payFrequency && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Pay Frequency:</Typography>
                          <Typography variant="body1" sx={{ textTransform: 'capitalize', fontSize: '1.05rem' }}>
                            {currentEmployee.payFrequency.replace('_', ' ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Contract Details Column */}
                  <Grid item xs={12} md={4}>
                    {contracts.length === 0 ? (
                      <EmptyStateCard
                        icon={ContractIcon}
                        title="No contracts found"
                        description="Contracts added by your employer will appear here."
                        cardSx={{ boxShadow: "none" }}
                        contentSx={{ py: 2 }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {contracts.map((contract: any) => {
                          const handleDownloadContractPDF = () => {
                            try {
                              const doc = new jsPDF()
                              const contractTitle = contract.contractTitle || 'Employment Contract'
                              
                              // Add title
                              doc.setFontSize(16)
                              doc.text(contractTitle, 14, 20)
                              
                              // Add contract details
                              doc.setFontSize(10)
                              let y = 30
                              doc.text(`Type: ${contract.type || 'N/A'}`, 14, y)
                              y += 7
                              doc.text(`Status: ${contract.status || 'N/A'}`, 14, y)
                              y += 7
                              doc.text(`Start Date: ${contract.startDate ? formatDate(new Date(contract.startDate)) : 'N/A'}`, 14, y)
                              y += 7
                              if (contract.endDate) {
                                doc.text(`End Date: ${formatDate(new Date(contract.endDate))}`, 14, y)
                                y += 7
                              }
                              y += 5
                              
                              // Add contract body HTML content (strip HTML tags and convert to text)
                              if (contract.bodyHtml) {
                                // Create a temporary div to extract text from HTML
                                const tempDiv = document.createElement('div')
                                tempDiv.innerHTML = contract.bodyHtml
                                const textContent = tempDiv.textContent || tempDiv.innerText || ''
                                
                                // Split text into lines that fit the page width
                                const pageWidth = doc.internal.pageSize.width - 28 // margins
                                const lines = doc.splitTextToSize(textContent, pageWidth)
                                
                                // Add lines to PDF
                                lines.forEach((line: string) => {
                                  if (y > doc.internal.pageSize.height - 20) {
                                    doc.addPage()
                                    y = 20
                                  }
                                  doc.text(line, 14, y)
                                  y += 7
                                })
                              }
                              
                              // Save PDF
                              const fileName = `contract_${contract.id}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
                              doc.save(fileName)
                            } catch (error) {
                              console.error('Error generating PDF:', error)
                            }
                          }
                          
                          return (
                            <Box key={contract.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1.05rem', flex: 1 }}>
                                  {contract.contractTitle || 'Employment Contract'}
                                </Typography>
                                <IconButton 
                                  size="small" 
                                  onClick={handleDownloadContractPDF}
                                  title="Download PDF"
                                  sx={{ ml: 1 }}
                                >
                                  <PdfIcon fontSize="small" />
                                </IconButton>
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Start Date:</Typography>
                                  <Typography variant="body2" sx={{ fontSize: '1.05rem' }}>
                                    {contract.startDate ? formatDate(new Date(contract.startDate)) : '-'}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>End Date:</Typography>
                                  <Typography variant="body2" sx={{ fontSize: '1.05rem' }}>
                                    {contract.endDate ? formatDate(new Date(contract.endDate)) : 'Ongoing'}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.05rem' }}>Status:</Typography>
                                  <Chip 
                                    label={contract.status || 'Active'} 
                                    size="small"
                                    color={contract.status === 'active' ? 'success' : 'default'}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          )
                        })}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          </Grid>

        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Schedule Tab */}
        <Box>
          {/* Controls Row - Date Navigation and View Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            {/* Date Navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {scheduleView === 'week' ? (
                <>
                  <IconButton onClick={() => setCurrentWeekDate(subDays(currentWeekDate, 7))} size="small">
                    <ChevronLeftIcon />
                  </IconButton>
                  <Button 
                    ref={dateButtonRef}
                    onClick={() => setDatePickerOpen(true)}
                    variant="text"
                    startIcon={<CalendarTodayIcon />}
                    sx={{ minWidth: 200, textTransform: 'none' }}
                  >
                    {(() => {
                      const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 })
                      const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 })
                      if (weekStart.getMonth() === weekEnd.getMonth()) {
                        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
                      } else {
                        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
                      }
                    })()}
                  </Button>
                  <IconButton onClick={() => setCurrentWeekDate(addDays(currentWeekDate, 7))} size="small">
                    <ChevronRightIcon />
                  </IconButton>
                  <IconButton onClick={() => setCurrentWeekDate(new Date())} size="small">
                    <TodayIcon />
                  </IconButton>
                </>
              ) : (
                <>
                  <IconButton 
                    onClick={() => {
                      if (listDateType === 'day') {
                        setListStartDate(subDays(listStartDate, 1))
                        setListEndDate(subDays(listEndDate, 1))
                      } else if (listDateType === 'week') {
                        setListStartDate(subDays(listStartDate, 7))
                        setListEndDate(subDays(listEndDate, 7))
                      } else {
                        const newStart = new Date(listStartDate)
                        newStart.setMonth(newStart.getMonth() - 1)
                        const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0)
                        setListStartDate(newStart)
                        setListEndDate(newEnd)
                      }
                    }} 
                    size="small"
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <Button 
                    ref={dateButtonRef}
                    onClick={() => setDatePickerOpen(true)}
                    variant="text"
                    startIcon={<CalendarTodayIcon />}
                    sx={{ minWidth: 200, textTransform: 'none' }}
                  >
                    {(() => {
                      if (listDateType === 'day') {
                        return format(listStartDate, 'MMM d, yyyy')
                      } else if (listDateType === 'week') {
                        if (listStartDate.getMonth() === listEndDate.getMonth()) {
                          return `${format(listStartDate, 'MMM d')} - ${format(listEndDate, 'd, yyyy')}`
                        } else {
                          return `${format(listStartDate, 'MMM d')} - ${format(listEndDate, 'MMM d, yyyy')}`
                        }
                      } else {
                        return format(listStartDate, 'MMMM yyyy')
                      }
                    })()}
                  </Button>
                  <IconButton 
                    onClick={() => {
                      if (listDateType === 'day') {
                        setListStartDate(addDays(listStartDate, 1))
                        setListEndDate(addDays(listEndDate, 1))
                      } else if (listDateType === 'week') {
                        setListStartDate(addDays(listStartDate, 7))
                        setListEndDate(addDays(listEndDate, 7))
                      } else {
                        const newStart = new Date(listStartDate)
                        newStart.setMonth(newStart.getMonth() + 1)
                        const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0)
                        setListStartDate(newStart)
                        setListEndDate(newEnd)
                      }
                    }} 
                    size="small"
                  >
                    <ChevronRightIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => {
                      const now = new Date()
                      if (listDateType === 'day') {
                        setListStartDate(now)
                        setListEndDate(now)
                      } else if (listDateType === 'week') {
                        setListStartDate(startOfWeek(now, { weekStartsOn: 1 }))
                        setListEndDate(endOfWeek(now, { weekStartsOn: 1 }))
                      } else {
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                        setListStartDate(monthStart)
                        setListEndDate(monthEnd)
                      }
                    }} 
                    size="small"
                  >
                    <TodayIcon />
                  </IconButton>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>View</InputLabel>
                    <Select
                      value={listDateType}
                      onChange={(e) => {
                        const newType = e.target.value as 'day' | 'week' | 'month'
                        setListDateType(newType)
                        const now = new Date()
                        if (newType === 'day') {
                          setListStartDate(now)
                          setListEndDate(now)
                        } else if (newType === 'week') {
                          setListStartDate(startOfWeek(now, { weekStartsOn: 1 }))
                          setListEndDate(endOfWeek(now, { weekStartsOn: 1 }))
                        } else if (newType === 'month') {
                          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                          setListStartDate(monthStart)
                          setListEndDate(monthEnd)
                        }
                      }}
                      label="View"
                    >
                      <MenuItem value="day">Day</MenuItem>
                      <MenuItem value="week">Week</MenuItem>
                      <MenuItem value="month">Month</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
                </Box>

            {/* View Toggle */}
            <Box sx={{ display: 'flex', gap: 1, bgcolor: 'background.paper', borderRadius: 1, p: 0.5, boxShadow: 1 }}>
              <Button 
                variant={scheduleView === 'week' ? 'contained' : 'text'}
                startIcon={<CalendarMonthIcon />}
                onClick={() => setScheduleView('week')}
                size="small"
                sx={{ minWidth: '100px' }}
              >
                Week
              </Button>
              <Button 
                variant={scheduleView === 'list' ? 'contained' : 'text'}
                startIcon={<ViewListIcon />}
                onClick={() => setScheduleView('list')}
                size="small"
                sx={{ minWidth: '100px' }}
              >
                List
              </Button>
            </Box>
          </Box>

          {/* Week View */}
          {scheduleView === 'week' && (() => {
            const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 })
            const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentWeekDate, { weekStartsOn: 1 }) })
            
            return (
              <>
                <Grid container spacing={1}>
                  {weekDays.map((dayDate) => {
                    const daySchedules = schedules.filter(s => {
                      const scheduleDate = new Date(s.date)
                      return format(scheduleDate, 'yyyy-MM-dd') === format(dayDate, 'yyyy-MM-dd')
                    })
                    
                    return (
                      <Grid item xs={12} sm={6} md={3} lg={1.71} key={format(dayDate, 'yyyy-MM-dd')}>
                        <Card 
                          sx={{ 
                            height: '100%',
                            minHeight: '180px',
                            bgcolor: daySchedules.length > 0 ? 'white' : 'background.paper',
                            border: daySchedules.length > 0 ? 1 : 1,
                            borderColor: daySchedules.length > 0 ? themeConfig.brandColors.navy : 'divider',
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography 
                              variant="caption" 
                              fontWeight="600" 
                              sx={{ 
                                display: 'block', 
                                mb: 0.5,
                                color: 'text.secondary'
                              }}
                            >
                              {format(dayDate, 'EEE').toUpperCase()}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              fontWeight="500" 
                              color="text.primary"
                              sx={{ mb: 1 }}
                            >
                              {format(dayDate, 'MMM d')}
                            </Typography>
                            {daySchedules.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {daySchedules.map((schedule) => (
                                  <Box 
                                    key={schedule.id}
                                    sx={{ 
                                      bgcolor: themeConfig.brandColors.navy,
                                      color: 'white',
                                      p: 1,
                                      borderRadius: 1,
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight="600" display="block">
                                      {schedule.startTime}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                                      to {schedule.endTime}
                                    </Typography>
                        <Chip 
                                      label={schedule.department}
                          size="small"
                                      sx={{ 
                                        height: '16px', 
                                        fontSize: '0.6rem',
                                        mt: 0.5,
                                        bgcolor: 'white',
                                        color: themeConfig.brandColors.navy,
                                        '& .MuiChip-label': { px: 0.5 }
                                      }}
                                    />
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                No shifts
                              </Typography>
                )}
              </CardContent>
                        </Card>
          </Grid>
                    )
                  })}
        </Grid>
                
                {/* DatePicker Dialog */}
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    open={datePickerOpen}
                    onClose={() => setDatePickerOpen(false)}
                    value={currentWeekDate}
                    onChange={(date) => {
                      if (date) {
                        setCurrentWeekDate(date)
                        setDatePickerOpen(false)
                      }
                    }}
                    slotProps={{
                      textField: { sx: { display: "none" } },
                      popper: {
                        anchorEl: dateButtonRef.current,
                        placement: "bottom-start",
                        sx: {
                          zIndex: 1300,
                          "& .MuiPaper-root": { marginTop: 1 },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              </>
            )
          })()}

          {/* List View */}
          {scheduleView === 'list' && (() => {
            // Filter schedules by date range
            const filteredSchedules = schedules.filter(s => {
              const scheduleDate = new Date(s.date)
              return scheduleDate >= listStartDate && scheduleDate <= listEndDate
            })
            
            return (
              <Card sx={{ boxShadow: themeConfig.shadows?.elevation2 || 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {filteredSchedules.length === 0 ? (
                    <EmptyStateCard
                      icon={CalendarMonthIcon}
                      title="No scheduled shifts found"
                      description="Try adjusting the date range."
                      cardSx={{ boxShadow: "none" }}
                      contentSx={{ py: 2 }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {filteredSchedules.map((schedule) => (
                        <Box
                          key={schedule.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: themeConfig.brandColors.navy,
                              borderColor: themeConfig.brandColors.navy,
                              boxShadow: 1,
                              '& .MuiTypography-root': {
                                color: 'white',
                              },
                              '& .MuiSvgIcon-root': {
                                color: 'white',
                              },
                              '& .MuiChip-root': {
                                borderColor: 'white',
                                '& .MuiChip-label': {
                                  color: 'white',
                                },
                              },
                            },
                          }}
                        >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Box sx={{ minWidth: '80px' }}>
                            <Typography variant="body2" fontWeight="600" color="primary">
                              {new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(schedule.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight="500">
                              {schedule.startTime} - {schedule.endTime}
                            </Typography>
                          </Box>
                          <Chip
                            label={schedule.department}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        <Chip 
                          label={schedule.status} 
                          color={getStatusColor(schedule.status)}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </Box>
                  ))}
                  </Box>
                  )}
          </CardContent>
            </Card>
            )
          })()}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Holidays Tab */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ boxShadow: themeConfig.shadows?.elevation2 || 2 }}>
              <CardContent>
                {/* Holiday Allowance Summary */}
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={10}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ height: '80px' }}>
                            <CardContent 
                              sx={{ 
                                py: 2, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                '&:last-child': { pb: 2 } 
                              }}
                            >
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'baseline', 
                                  gap: 1,
                                  color: themeConfig.brandColors.navy
                                }}
                              >
                                <span style={{ fontWeight: 'bold' }}>
                                  {(() => {
                                    const balance = calculateHolidayBalance(
                                      currentEmployee,
                                      timeOffRequests,
                                      hrState?.attendances?.filter(att => att.employeeId === currentEmployee.id) || []
                                    )
                                    return balance.total
                                  })()}
                                </span>
                                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                                  Accrued Days
                                </span>
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ height: '80px' }}>
                            <CardContent 
                              sx={{ 
                                py: 2, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                '&:last-child': { pb: 2 } 
                              }}
                            >
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'baseline', 
                                  gap: 1,
                                  color: 'info.main'
                                }}
                              >
                                <span style={{ fontWeight: 'bold' }}>
                                  {(() => {
                                    const balance = calculateHolidayBalance(
                                      currentEmployee,
                                      timeOffRequests,
                                      hrState?.attendances?.filter(att => att.employeeId === currentEmployee.id) || []
                                    )
                                    return balance.used
                                  })()}
                                </span>
                                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                                  Used Days
                                </span>
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ height: '80px' }}>
                            <CardContent 
                              sx={{ 
                                py: 2, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                '&:last-child': { pb: 2 } 
                              }}
                            >
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'baseline', 
                                  gap: 1,
                                  color: (() => {
                                    const balance = calculateHolidayBalance(
                                      currentEmployee,
                                      timeOffRequests,
                                      hrState?.attendances?.filter(att => att.employeeId === currentEmployee.id) || []
                                    )
                                    return balance.remaining < 5 ? 'warning.main' : 'success.main'
                                  })()
                                }}
                              >
                                <span style={{ fontWeight: 'bold' }}>
                                  {(() => {
                                    const balance = calculateHolidayBalance(
                                      currentEmployee,
                                      timeOffRequests,
                                      hrState?.attendances?.filter(att => att.employeeId === currentEmployee.id) || []
                                    )
                                    return balance.remaining
                                  })()}
                                </span>
                                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                                  Remaining Days
                                </span>
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ height: '80px' }}>
                            <CardContent 
                              sx={{ 
                                py: 2, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                '&:last-child': { pb: 2 } 
                              }}
                            >
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'baseline', 
                                  gap: 1,
                                  color: 'error.main'
                                }}
                              >
                                <span style={{ fontWeight: 'bold' }}>
                                  {(() => {
                                    const balance = calculateHolidayBalance(
                                      currentEmployee,
                                      timeOffRequests,
                                      hrState?.attendances?.filter(att => att.employeeId === currentEmployee.id) || []
                                    )
                                    return balance.pending
                                  })()}
                                </span>
                                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                                  Pending Requests
                                </span>
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenTimeOffCRUD(undefined, 'create')}
                        fullWidth={true}
                        sx={{ height: '80px' }}
                      >
                        Request Time Off
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                {/* Time Off Requests Table */}
                {timeOffRequests.length === 0 ? (
                  <EmptyStateCard
                    icon={HolidayIcon}
                    title="No time off requests found"
                    description="Your time off requests will appear here after you create one."
                    cardSx={{ boxShadow: "none" }}
                    contentSx={{ py: 2 }}
                  />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }}>
                          <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Days</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {timeOffRequests
                          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                          .map((request) => (
                            <TableRow 
                              key={request.id} 
                              hover
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                              onClick={() => handleOpenTimeOffCRUD(request, 'view')}
                            >
                            <TableCell>
                              <Chip 
                                  label={request.type === 'vacation' ? 'Annual Leave' : request.type.charAt(0).toUpperCase() + request.type.slice(1)} 
                                size="small"
                                  color="primary"
                                  variant="outlined"
                              />
                            </TableCell>
                              <TableCell>{formatDate(new Date(request.startDate))}</TableCell>
                              <TableCell>{formatDate(new Date(request.endDate))}</TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight={500}>
                                  {request.totalDays}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {request.reason || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={request.status.charAt(0).toUpperCase() + request.status.slice(1)} 
                                  color={getStatusColor(request.status)}
                                  size="small"
                                  sx={{ fontWeight: 500 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <IconButton 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenTimeOffCRUD(request, request.status === 'pending' ? 'edit' : 'view')
                                  }}
                                >
                                  {request.status === 'pending' ? <EditIcon fontSize="small" /> : <DocumentIcon fontSize="small" />}
                                </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
          </Grid>
    </TabPanel>

      <TabPanel value={tabValue} index={3}>
      {/* Documents Tab - Updated to match mobile ESS logic */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ boxShadow: themeConfig.shadows?.elevation2 || 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Documents</Typography>
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={() => documentUploadInputRef.current?.click()}
                    size="small"
                    disabled={loading}
                  >
                    Upload Document
                  </Button>
                  <input
                    ref={documentUploadInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                  />
                </Box>
                
                {/* Category Tabs */}
                <Tabs
                  value={documentsTabValue}
                  onChange={(_, newValue) => setDocumentsTabValue(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  {documentCategories.map((cat) => (
                    <Tab key={cat.value} label={cat.label} />
                  ))}
                </Tabs>

                {/* Documents List */}
                {filteredDocuments.length > 0 ? (
                  <List disablePadding>
                    {filteredDocuments.map((doc, index) => (
                      <React.Fragment key={doc.id}>
                        <ListItem disablePadding>
                          <ListItemButton 
                            sx={{ py: 2, borderRadius: 1 }}
                            onClick={() => handleViewDocument(doc)}
                            disabled={!doc.url && doc.category !== "contract"}
                          >
                            <ListItemIcon>
                              <Avatar sx={{ bgcolor: theme.palette.grey[100] }}>
                                {getDocumentIcon(doc.type || '', doc.category)}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={doc.name}
                              secondary={
                                <>
                                  Uploaded {formatDate(doc.uploadedAt || Date.now())}
                                  {doc.expiryDate && (
                                    <> • Expires {formatDate(doc.expiryDate)}</>
                                  )}
                                </>
                              }
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                            {doc.category === "contract" && doc.needsSignature ? (
                              <Chip
                                icon={<EditIcon />}
                                label="Sign"
                                size="small"
                                color="primary"
                                variant="contained"
                                clickable
                              />
                            ) : doc.category === "contract" ? (
                              <Chip
                                icon={<PdfIcon />}
                                label="Download"
                                size="small"
                                variant="outlined"
                                clickable
                              />
                            ) : doc.url ? (
                              <Chip
                                icon={<ViewIcon />}
                                label="View"
                                size="small"
                                variant="outlined"
                                clickable
                              />
                            ) : null}
                          </ListItemButton>
                        </ListItem>
                        {index < filteredDocuments.length - 1 && (
                          <Box sx={{ px: 2 }}>
                            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: 0 }} />
                          </Box>
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <EmptyStateCard
                    icon={ArticleIcon}
                    title="No documents found"
                    description="Documents uploaded by your employer will appear here."
                    cardSx={{ boxShadow: "none" }}
                    contentSx={{ py: 2 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Signature Dialog */}
        <Dialog
          open={signatureDialogOpen}
          onClose={() => setSignatureDialogOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Sign Contract: {selectedContract?.name}
            <IconButton onClick={() => setSignatureDialogOpen(false)} size="small">
              <EditIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Digital Signature"
                placeholder="Type your full name to sign"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                fullWidth
                required
                helperText="By typing your name, you are providing your digital signature"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              variant="contained"
              onClick={handleSaveSignature}
              disabled={!signature.trim() || loading}
            >
              Sign Contract
            </Button>
          </DialogActions>
        </Dialog>
    </TabPanel>

    <TabPanel value={tabValue} index={4}>
      {/* Performance Tab */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: themeConfig.shadows?.elevation2 || 2 }}>
            <CardContent>
              {performanceReviews.length === 0 ? (
                <EmptyStateCard
                  icon={PerformanceIcon}
                  title="No performance reviews found"
                  description="Reviews added by your employer will appear here."
                  cardSx={{ boxShadow: "none" }}
                  contentSx={{ py: 2 }}
                />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }}>
                        <TableCell sx={{ fontWeight: 600 }}>Review Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Reviewer</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                {performanceReviews.map((review) => (
                        <TableRow key={review.id} hover>
                          <TableCell>
                            <Typography variant="body2">{review.reviewDate || 'TBD'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">Performance Review</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{review.reviewerName || review.reviewerId || 'Manager'}</Typography>
                          </TableCell>
                          <TableCell align="center">
                    <Chip 
                              label={review.status.charAt(0).toUpperCase() + review.status.slice(1)} 
                      color={getStatusColor(review.status)}
                      size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary">
                              <DocumentIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </TabPanel>

    <TabPanel value={tabValue} index={5}>
      {/* Payslips Tab */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: themeConfig.shadows?.elevation2 || 2 }}>
            <CardContent>
              {payrolls.length === 0 ? (
                <EmptyStateCard
                  icon={PaymentIcon}
                  title="No payslips found"
                  description="Payslips added by your employer will appear here."
                  cardSx={{ boxShadow: "none" }}
                  contentSx={{ py: 2 }}
                />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }}>
                        <TableCell sx={{ fontWeight: 600 }}>Pay Period</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Pay Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Gross Pay</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Deductions</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Net Pay</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payrolls
                        .sort((a, b) => new Date(b.payPeriodStart).getTime() - new Date(a.payPeriodStart).getTime())
                        .map((payroll) => (
                          <TableRow 
                            key={payroll.id} 
                            hover
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => handleOpenPayrollCRUD(payroll)}
                          >
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(payroll.payPeriodStart)} - {formatDate(payroll.payPeriodEnd)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {payroll.periodStartDate ? formatDate(new Date(payroll.periodStartDate)) : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{formatCurrency(payroll.grossPay)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="text.secondary">
                                {formatCurrency(payroll.totalDeductions)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                                {formatCurrency(payroll.netPay)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenPayrollCRUD(payroll)
                                }}
                              >
                                <DocumentIcon fontSize="small" />
                    </IconButton>
                            </TableCell>
                          </TableRow>
                ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </TabPanel>

    <TabPanel value={tabValue} index={6}>
      {/* Emergency Contacts Tab */}
      <Card sx={{ boxShadow: themeConfig.shadows?.elevation2 || 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openEmergencyContactDialog}
              disabled={loading}
            >
              {emergencyContacts.length > 0 ? "Edit Contact" : "Add Contact"}
            </Button>
          </Box>
          {emergencyContacts.length === 0 ? (
            <EmptyStateCard
              icon={ContactIcon}
              title="No emergency contacts found"
              description="Add a contact so your employer can reach someone in an emergency."
              cardSx={{ boxShadow: "none" }}
              contentSx={{ py: 2 }}
            />
          ) : (
          <TableContainer>
              <Table size="small">
              <TableHead>
                  <TableRow sx={{ bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Relationship</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emergencyContacts.map((contact) => (
                    <TableRow key={contact.id} hover>
                    <TableCell>
                        <Typography variant="body2">{contact.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{contact.relationship}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{contact.phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{contact.email}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={openEmergencyContactDialog}>
                          <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
        </CardContent>
      </Card>
    </TabPanel>

    <Dialog
      open={emergencyContactDialogOpen}
      onClose={() => setEmergencyContactDialogOpen(false)}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>{emergencyContacts.length > 0 ? "Edit Emergency Contact" : "Add Emergency Contact"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            value={emergencyContactForm.name}
            onChange={(e) => setEmergencyContactForm((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Relationship"
            value={emergencyContactForm.relationship}
            onChange={(e) => setEmergencyContactForm((prev) => ({ ...prev, relationship: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Phone"
            value={emergencyContactForm.phone}
            onChange={(e) => setEmergencyContactForm((prev) => ({ ...prev, phone: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={emergencyContactForm.email}
            onChange={(e) => setEmergencyContactForm((prev) => ({ ...prev, email: e.target.value }))}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setEmergencyContactDialogOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleSaveEmergencyContact} disabled={loading}>
          Save Contact
        </Button>
      </DialogActions>
    </Dialog>

    {/* Dialogs and Notifications */}
    {/* Time Off CRUD Modal */}
        <CRUDModal
      open={timeOffCRUDModalOpen}
      onClose={(reason) => {
        setTimeOffCRUDModalOpen(false)
        if (isCrudModalHardDismiss(reason)) {
          const __workspaceOnClose = handleCloseTimeOffCRUD
          if (typeof __workspaceOnClose === "function") {
            __workspaceOnClose(reason)
          }
        }
      }}
      workspaceFormShortcut={{
        crudEntity: "employeeSelfServiceModal1",
        crudMode,
        id: selectedTimeOffForCRUD?.id,
        itemLabel: selectedTimeOffForCRUD?.employeeName,
      }}
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <TimeOffCRUDForm
          ref={timeOffCRUDFormRef}
          timeOffRequest={selectedTimeOffForCRUD as any}
          mode={crudMode}
          onSave={handleSaveTimeOffCRUD}
          employees={[currentEmployee]}
          restrictToEmployeeId={currentEmployee?.id}
          isEmployeeSelfService={true}
        />
      </LocalizationProvider>
    </CRUDModal>

    {/* Payroll CRUD Modal */}
        <CRUDModal
      open={payrollCRUDModalOpen}
      onClose={(reason) => {
        setPayrollCRUDModalOpen(false)
        if (isCrudModalHardDismiss(reason)) {
          const __workspaceOnClose = handleClosePayrollCRUD
          if (typeof __workspaceOnClose === "function") {
            __workspaceOnClose(reason)
          }
        }
      }}
      workspaceFormShortcut={{
        crudEntity: "employeeSelfServiceModal2",
        crudMode: "view",
      }}
      title="View Payslip"
      mode="view"
      maxWidth="lg"
      hideCloseButton={true}
      hideCloseAction={true}
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <PayrollCRUDForm
          payrollEntry={selectedPayrollForCRUD as any}
          mode="view"
          employees={[currentEmployee]}
          onSave={() => {}}
        />
      </LocalizationProvider>
    </CRUDModal>

      {/* Notification Snackbar */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        message={notification?.message}
      />
    </Box>
  )
}

export default EmployeeSelfService
