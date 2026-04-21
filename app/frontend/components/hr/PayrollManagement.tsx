"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Divider,
  Card,
  Alert,
  Snackbar,
  InputAdornment,
  TablePagination,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Payments as PaymentsIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { DatePicker } from "@mui/x-date-pickers"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"
import { useHR } from "../../../backend/context/HRContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import PayrollCRUDForm, { type PayrollCRUDFormHandle } from "./forms/PayrollCRUDForm"
import DataHeader from "../reusable/DataHeader"
import StatsSection from "../reusable/StatsSection"
import EmptyStateCard from "../reusable/EmptyStateCard"
import ServiceChargeAllocationPage from "./ServiceChargeAllocationPage"
import { usePermission } from "../../hooks/usePermission"
import { generatePayrollFromApprovedSchedules, approvePayrollRecord } from "../../../backend/functions/PayrollCalculation"
import { submitFPSForPayrollRun } from "../../../backend/functions/HMRCRTISubmission"
// Company state is now handled through HRContext
// Site management is now part of CompanyContext
import type { 
  Payroll, 
  Employee,
  ServiceChargeAllocation,
  ServiceChargeEmployeeAllocation,
  ServiceChargeFormData,
  ServiceChargeValidationResult,
} from "../../../backend/interfaces/HRs"
// Functions now accessed through HRContext
import type { WageStreamRequest } from "../../../backend/interfaces/HRs"

import type { PayrollFormData } from "../../../backend/interfaces/HRs"

const initialFormData: PayrollFormData = {
  employeeId: "",
  payPeriod: "",
  payPeriodStart: startOfMonth(new Date()).toISOString(),
  payPeriodEnd: endOfMonth(new Date()).toISOString(),
  hoursWorked: 0,
  overtimeHours: 0,
  regularPay: 0,
  overtimePay: 0,
  bonuses: 0,
  grossPay: 0,
  totalGross: 0,
  deductions: {
    tax: 0,
    insurance: 0,
    retirement: 0,
    other: 0,
  },
  totalDeductions: 0,
  netPay: 0,
  totalNet: 0,
  status: "pending",
  paymentMethod: "bank_transfer",
  paymentDate: new Date().toISOString(),
  notes: "",
}

const PayrollManagement = () => {
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "payroll")
  const canRemove = canDelete("hr", "payroll")
  const { state: hrState, refreshEmployees, refreshPayrolls, refreshSchedules, addPayroll, updatePayrollRecord, deletePayrollRecord } = useHR()
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  // Company state is now handled through HRContext
  
  // Note: Debug logging removed for performance


  // Use payroll records from HR context state
  const payrollRecords = hrState.payrollRecords || []
  const schedules = hrState.schedules || []
  const currentUserId = settingsState?.auth?.uid || settingsState?.user?.uid || "system"
  
  // Note: Debug logging removed for performance
  
  const [loading, setLoading] = useState(false)
  const [] = useState(false)

  // New CRUD Modal state
  const [payrollCRUDModalOpen, setPayrollCRUDModalOpen] = useState(false)
  const [selectedPayrollForCRUD, setSelectedPayrollForCRUD] = useState<any>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const payrollCRUDFormRef = useRef<PayrollCRUDFormHandle | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info" | "warning"
  } | null>(null)

  // UI state
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState<PayrollFormData>(initialFormData)
  const [editMode, setEditMode] = useState(false)
  const [currentTab, setCurrentTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [currentPeriod] = useState<Date>(new Date())
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState<string>("paymentDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Date control state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")

  // Weekly payroll generation state
  const [weeklyPayrollData, setWeeklyPayrollData] = useState<any[]>([])
  const [generatedPayrollRecords, setGeneratedPayrollRecords] = useState<any[]>([])
  const [isPayrollGenerated, setIsPayrollGenerated] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeePayrollDetails, setEmployeePayrollDetails] = useState<any[]>([])
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false)

  // Bulk operations state
  const [selectedPayrollRecords, setSelectedPayrollRecords] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>("")
  const [showBulkDialog, setShowBulkDialog] = useState(false)

  // Service Charge Allocation state
  const [serviceChargeAllocations, setServiceChargeAllocations] = useState<ServiceChargeAllocation[]>([])
  const [showServiceChargeDialog, setShowServiceChargeDialog] = useState(false)
  const [serviceChargeFormData, setServiceChargeFormData] = useState<ServiceChargeFormData>({
    payPeriodStart: null,
    payPeriodEnd: null,
    totalServiceCharge: 0,
    totalTips: 0,
    allocationMethod: "points",
    employeeAllocations: []
  })

  // Initialize Service Charge form with selected date range
  useEffect(() => {
    const dateRange = getDateRange()
    setServiceChargeFormData(prev => ({
      ...prev,
      payPeriodStart: dateRange.start,
      payPeriodEnd: dateRange.end
    }))
  }, [selectedDate, dateType])
  const [serviceChargePreview, setServiceChargePreview] = useState<ServiceChargeEmployeeAllocation[]>([])
  const [showServiceChargePreview, setShowServiceChargePreview] = useState(false)

  // DataHeader configuration
  const filters = [
    {
      label: "Status",
      options: [
        { id: "pending", name: "Pending", color: "#ff9800" },
        { id: "paid", name: "Paid", color: "#4caf50" },
        { id: "completed", name: "Completed", color: "#2196f3" },
        { id: "cancelled", name: "Cancelled", color: "#f44336" },
      ],
      selectedValues: selectedStatus ? [selectedStatus] : [],
      onSelectionChange: (values: string[]) => setSelectedStatus(values[0] || ""),
    },
    {
      label: "Payment Method",
      options: [
        { id: "bank_transfer", name: "Bank Transfer", color: "#2196f3" },
        { id: "check", name: "Check", color: "#ff9800" },
        { id: "cash", name: "Cash", color: "#4caf50" },
        { id: "direct_deposit", name: "Direct Deposit", color: themeConfig.colors.primary.light },
      ],
      selectedValues: selectedPaymentMethod ? [selectedPaymentMethod] : [],
      onSelectionChange: (values: string[]) => setSelectedPaymentMethod(values[0] || ""),
    },
  ]

  const sortOptions = [
    { value: "employeeName", label: "Employee Name" },
    { value: "paymentDate", label: "Payment Date" },
    { value: "payPeriodStart", label: "Pay Period Start" },
    { value: "grossPay", label: "Gross Pay" },
    { value: "netPay", label: "Net Pay" },
    { value: "status", label: "Status" },
  ]

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortOrder(direction)
  }

  const handleCreateNew = () => {
    if (!canMutate) return
    setFormData(initialFormData)
    setEditMode(false)
    setOpenDialog(true)
  }

  const handleViewPayrollRecord = (record: Payroll) => {
    setFormData({
      id: record.id,
      employeeId: record.employeeId,
      payPeriod: record.payPeriodStart,
      payPeriodStart: record.payPeriodStart,
      payPeriodEnd: record.payPeriodEnd,
      hoursWorked: record.hoursWorked,
      overtimeHours: record.overtimeHours,
      regularPay: record.regularPay,
      overtimePay: record.overtimePay,
      bonuses: record.bonuses || 0,
      grossPay: record.grossPay,
      totalGross: record.totalGross,
      deductions: {
        tax: record.deductions?.tax || record.taxDeductions || 0,
        insurance: record.deductions?.insurance || 0,
        retirement: record.deductions?.retirement || 0,
        other: record.deductions?.other || 0,
      },
      totalDeductions: record.totalDeductions,
      netPay: record.netPay,
      totalNet: record.totalNet,
      status: record.status,
      paymentMethod: record.paymentMethod || "direct_deposit",
      paymentDate: record.paymentDate || new Date().toISOString(),
      notes: record.notes || "",
    })
    setEditMode(false)
    setOpenDialog(true)
  }

  const handleEditPayroll = (record: Payroll) => {
    if (!canMutate) return
    setFormData({
      id: record.id,
      employeeId: record.employeeId,
      payPeriod: record.payPeriodStart,
      payPeriodStart: record.payPeriodStart,
      payPeriodEnd: record.payPeriodEnd,
      hoursWorked: record.hoursWorked,
      overtimeHours: record.overtimeHours,
      regularPay: record.regularPay,
      overtimePay: record.overtimePay,
      bonuses: record.bonuses || 0,
      grossPay: record.grossPay,
      totalGross: record.totalGross,
      deductions: {
        tax: record.deductions?.tax || record.taxDeductions || 0,
        insurance: record.deductions?.insurance || 0,
        retirement: record.deductions?.retirement || 0,
        other: record.deductions?.other || 0,
      },
      totalDeductions: record.totalDeductions,
      netPay: record.netPay,
      totalNet: record.totalNet,
      status: record.status,
      paymentMethod: record.paymentMethod || "direct_deposit",
      paymentDate: record.paymentDate || new Date().toISOString(),
      notes: record.notes || "",
    })
    setEditMode(true)
    setOpenDialog(true)
  }

  const handleRefresh = async () => {
    await refreshPayrolls()
    await refreshEmployees()
    await refreshSchedules()
  }

  // Calculate hours worked from schedule data
  const calculateHoursFromSchedule = (employeeId: string, startDate: Date, endDate: Date) => {
    const employeeSchedules = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date)
      const matchesEmployee = schedule.employeeId === employeeId
      const matchesDateRange = scheduleDate >= startDate && scheduleDate <= endDate
      const matchesStatus = ['scheduled', 'confirmed', 'completed', 'draft'].includes(schedule.status)
      
      return matchesEmployee && matchesDateRange && matchesStatus
    })

    let totalHours = 0
    let totalOvertimeHours = 0
    const dailyHours: { [key: string]: number } = {}

    employeeSchedules.forEach(schedule => {
      const startTime = new Date(`${schedule.date}T${schedule.startTime}`)
      const endTime = new Date(`${schedule.date}T${schedule.endTime}`)
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      
      const dateKey = schedule.date
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + hours
      
      totalHours += hours
      
      // Calculate overtime (over 8 hours per day)
      if (dailyHours[dateKey] > 8) {
        totalOvertimeHours += dailyHours[dateKey] - 8
        totalHours -= (dailyHours[dateKey] - 8) // Remove overtime from regular hours
      }
    })


    return {
      totalHours: Math.round((totalHours || 0) * 100) / 100,
      totalOvertimeHours: Math.round((totalOvertimeHours || 0) * 100) / 100,
      dailyHours,
      scheduleCount: employeeSchedules.length
    }
  }

  // Date handling functions
  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  const handleDateTypeChange = (type: "day" | "week" | "month" | "custom") => {
    setDateType(type)
  }

  // Get date range based on selected date and type
  const getDateRange = () => {
    let start: Date, end: Date
    
    switch (dateType) {
      case "day":
        start = startOfDay(selectedDate)
        end = endOfDay(selectedDate)
        break
      case "week":
        start = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday start
        end = endOfWeek(selectedDate, { weekStartsOn: 1 })
        break
      case "month":
        start = startOfMonth(selectedDate)
        end = endOfMonth(selectedDate)
        break
      default:
        start = startOfWeek(selectedDate, { weekStartsOn: 1 })
        end = endOfWeek(selectedDate, { weekStartsOn: 1 })
    }
    
    return { start, end }
  }

  // Generate weekly payroll data
  const generateWeeklyPayroll = (weekStart?: Date) => {
    const dateRange = getDateRange()
    const weekStartDate = weekStart || dateRange.start
    const weekEnd = new Date(weekStartDate)
    weekEnd.setDate(weekStartDate.getDate() + 6)
    
    const weeklyData = hrState.employees.map(employee => {
      const hoursData = calculateHoursFromSchedule(employee.id, weekStartDate, weekEnd)
      const hourlyRate = employee.hourlyRate || 0
      const totalHours = hoursData.totalHours || 0
      const totalOvertimeHours = hoursData.totalOvertimeHours || 0
      const regularPay = totalHours * hourlyRate
      const overtimePay = totalOvertimeHours * (hourlyRate * 1.5)
      const grossPay = regularPay + overtimePay
      
      // Calculate basic deductions (simplified)
      const taxRate = 0.15 // 15% tax rate
      const insuranceRate = 0.05 // 5% insurance
      const tax = grossPay * taxRate
      const insurance = grossPay * insuranceRate
      const totalDeductions = tax + insurance
      const netPay = grossPay - totalDeductions

      const employeeData = {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department || 'Unknown',
        hourlyRate,
        totalHours,
        totalOvertimeHours,
        regularPay: Math.round(regularPay * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        grossPay: Math.round(grossPay * 100) / 100,
        deductions: {
          tax: Math.round(tax * 100) / 100,
          insurance: Math.round(insurance * 100) / 100,
          other: 0
        },
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        payPeriodStart: weekStartDate.toISOString().split('T')[0],
        payPeriodEnd: weekEnd.toISOString().split('T')[0],
        status: 'pending'
      }


      return employeeData
    }) // Include all employees, even those with 0 hours

    setWeeklyPayrollData(weeklyData)
    
    if (weeklyData.length === 0) {
      setNotification({ 
        message: "No employees found for this period", 
        type: "warning" 
      })
    } else {
      const employeesWithHours = weeklyData.filter(emp => emp.totalHours > 0).length
      setNotification({ 
        message: `Generated payroll for ${weeklyData.length} employees (${employeesWithHours} with hours worked)`, 
        type: "success" 
      })
    }
    
    return weeklyData
  }

  // Get employee payroll details for drill-down
  const getEmployeePayrollDetails = (employeeId: string, weekStart: Date) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    const employeeSchedules = schedules.filter(schedule => 
      schedule.employeeId === employeeId &&
      new Date(schedule.date) >= weekStart &&
      new Date(schedule.date) <= weekEnd
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const details = employeeSchedules.map(schedule => {
      const startTime = new Date(`${schedule.date}T${schedule.startTime}`)
      const endTime = new Date(`${schedule.date}T${schedule.endTime}`)
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      
      return {
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        hours: Math.round(hours * 100) / 100,
        status: schedule.status,
        shiftType: schedule.shiftType,
        payRate: schedule.payRate,
        notes: schedule.notes
      }
    })

    setEmployeePayrollDetails(details)
    return details
  }

  // Handle employee drill-down
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    const dateRange = getDateRange()
    getEmployeePayrollDetails(employee.id, dateRange.start)
    setShowEmployeeDetails(true)
  }

  // Generate payroll records (without saving)
  const generatePayroll = async () => {
    try {
      setLoading(true)
      const weeklyData = generateWeeklyPayroll()
      
      // Convert to Payroll format
      const payrollRecords = weeklyData.map(data => ({
        id: `payroll_${data.employeeId}_${data.payPeriodStart}`,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        periodId: `period_${data.payPeriodStart}`,
        periodStartDate: new Date(data.payPeriodStart).getTime(),
        periodEndDate: new Date(data.payPeriodEnd).getTime(),
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd,
        regularHours: data.totalHours - data.totalOvertimeHours,
        overtimeHours: data.totalOvertimeHours,
        totalHours: data.totalHours,
        hoursWorked: data.totalHours,
        hourlyRate: data.hourlyRate || 0,
        regularPay: data.regularPay,
        overtimePay: data.overtimePay,
        bonuses: 0,
        grossPay: data.grossPay,
        totalGross: data.grossPay,
        deductions: {
          tax: data.deductions?.tax || 0,
          insurance: data.deductions?.insurance || 0,
          retirement: 0,
          other: data.deductions?.other || 0
        },
        totalDeductions: data.totalDeductions,
        netPay: data.netPay,
        totalNet: data.netPay,
        status: 'pending' as const,
        paymentMethod: 'direct_deposit' as const,
        paymentDate: new Date().toISOString(),
        notes: `Generated from schedule data for ${dateType} of ${format(selectedDate, 'MMM dd, yyyy')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      // Store generated records for preview
      setGeneratedPayrollRecords(payrollRecords)
      setIsPayrollGenerated(true)
      setNotification({ message: `Generated ${payrollRecords.length} payroll records for review`, type: "success" })
      
    } catch (error) {
      console.error('Error generating payroll:', error)
      setNotification({ message: "Error generating payroll records", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Generate payroll from approved schedules using backend calculation engine
  const generatePayrollFromApprovedSchedulesHandler = async () => {
    try {
      setLoading(true)
      
      const companyId = companyState.selectedCompany?.id
      const siteId = companyState.selectedSite?.id
      
      if (!companyId || !siteId) {
        setNotification({ message: "Please select a company and site", type: "error" })
        return
      }
      
      const dateRange = getDateRange()
      const periodStart = dateRange.start.getTime()
      const periodEnd = dateRange.end.getTime()
      
      // Determine period type based on date range
      const daysDiff = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24))
      let periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly' = 'weekly'
      if (daysDiff <= 7) periodType = 'weekly'
      else if (daysDiff <= 14) periodType = 'fortnightly'
      else if (daysDiff <= 28) periodType = 'four_weekly'
      else periodType = 'monthly'
      
      // Get service charge allocations if any (from service charge tab)
      const serviceChargeMap = new Map<string, number>()
      // TODO: Integrate with service charge allocations when that page is ready
      
      // Generate payroll using backend function
      const payrollRecords = await generatePayrollFromApprovedSchedules(
        companyId,
        siteId,
        periodStart,
        periodEnd,
        periodType,
        serviceChargeMap.size > 0 ? serviceChargeMap : undefined
      )
      
      if (payrollRecords.length === 0) {
        setNotification({ 
          message: "No approved schedules found for this period", 
          type: "warning" 
        })
        return
      }
      
      // Store generated records for preview
      setGeneratedPayrollRecords(payrollRecords)
      setIsPayrollGenerated(true)
      setNotification({ 
        message: `Generated ${payrollRecords.length} payroll records from approved schedules`, 
        type: "success" 
      })
      
      // Refresh schedules to show updated status
      await refreshSchedules()
      
    } catch (error: any) {
      console.error('Error generating payroll from approved schedules:', error)
      setNotification({ 
        message: error.message || "Error generating payroll from approved schedules", 
        type: "error" 
      })
    } finally {
      setLoading(false)
    }
  }

  // Save generated payroll records
  const savePayroll = async () => {
    try {
      setLoading(true)
      
      if (!isPayrollGenerated || generatedPayrollRecords.length === 0) {
        setNotification({ message: "No payroll records to save. Please generate payroll first.", type: "warning" })
        return
      }

      // Save each payroll record
      for (const record of generatedPayrollRecords) {
        await addPayroll(record)
      }

      // Clear generated records and reset state
      setGeneratedPayrollRecords([])
      setIsPayrollGenerated(false)
      setNotification({ message: `Saved ${generatedPayrollRecords.length} payroll records successfully`, type: "success" })
      
      // Refresh payroll records
      await refreshPayrolls()
      
    } catch (error) {
      console.error('Error saving payroll:', error)
      setNotification({ message: "Error saving payroll records", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Bulk approve payroll records with HMRC submission
  const handleBulkApproveWithHMRC = async () => {
    try {
      setLoading(true)
      
      if (selectedPayrollRecords.length === 0) {
        setNotification({ message: "Please select payroll records to approve", type: "warning" })
        return
      }
      
      const companyId = companyState.selectedCompany?.id
      const siteId = companyState.selectedSite?.id
      
      if (!companyId || !siteId) {
        setNotification({ message: "Please select a company and site", type: "error" })
        return
      }
      
      // Approve each payroll record
      for (const payrollId of selectedPayrollRecords) {
        try {
          await approvePayrollRecord(
            companyId,
            siteId,
            payrollId,
            currentUserId,
            undefined,
            true // Auto-submit to HMRC
          )
        } catch (error) {
          console.error(`Error approving payroll ${payrollId}:`, error)
          // Continue with other records
        }
      }
      
      setNotification({ 
        message: `Approved ${selectedPayrollRecords.length} payroll record(s). HMRC submission initiated.`, 
        type: "success" 
      })
      
      // Clear selection
      setSelectedPayrollRecords([])
      
      // Refresh payroll records
      await refreshPayrolls()
      
    } catch (error) {
      console.error('Error in bulk approve:', error)
      setNotification({ message: "Error approving payroll records", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Manual HMRC submission for selected records
  const handleBulkHMRCSubmission = async () => {
    try {
      setLoading(true)
      
      if (selectedPayrollRecords.length === 0) {
        setNotification({ message: "Please select approved payroll records to submit", type: "warning" })
        return
      }
      
      const companyId = companyState.selectedCompany?.id
      const siteId = companyState.selectedSite?.id
      
      if (!companyId || !siteId) {
        setNotification({ message: "Please select a company and site", type: "error" })
        return
      }
      
      // Filter to only approved records
      const approvedRecords = payrollRecords.filter(
        record => selectedPayrollRecords.includes(record.id) && record.status === 'approved'
      )
      
      if (approvedRecords.length === 0) {
        setNotification({ message: "Please select approved payroll records", type: "warning" })
        return
      }
      
      // Submit to HMRC
      const result = await submitFPSForPayrollRun(
        companyId,
        siteId,
        approvedRecords.map(r => r.id),
        currentUserId
      )
      
      if (result.success) {
        setNotification({ 
          message: `Successfully submitted ${approvedRecords.length} payroll record(s) to HMRC`, 
          type: "success" 
        })
      } else {
        setNotification({ 
          message: `HMRC submission completed with errors: ${result.errors?.map(e => e.message).join(', ')}`, 
          type: "warning" 
        })
      }
      
      // Clear selection
      setSelectedPayrollRecords([])
      
      // Refresh payroll records
      await refreshPayrolls()
      
    } catch (error: any) {
      console.error('Error submitting to HMRC:', error)
      setNotification({ 
        message: error.message || "Error submitting to HMRC", 
        type: "error" 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = [
      "Employee Name",
      "Pay Period Start",
      "Pay Period End",
      "Pay Date",
      "Gross Pay",
      "Deductions",
      "Net Pay",
      "Status",
      "Payment Method",
      "Hours Worked",
      "Hourly Rate",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredPayrollRecords.map((record) =>
        [
          `"${record.employeeName}"`,
          record.payPeriodStart,
          record.payPeriodEnd,
          record.paymentDate,
          record.grossPay?.toString() || "",
          record.deductions?.toString() || "",
          record.netPay?.toString() || "",
          record.status || "",
          record.paymentMethod || "",
          record.hoursWorked?.toString() || "",
          record.hourlyRate?.toString() || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `payroll_records_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  // Generate payslip for individual employee
  const handleGeneratePayslip = (record: Payroll) => {
    const payslipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${record.employeeName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .payslip-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section h3 { background-color: #f5f5f5; padding: 10px; margin: 0 0 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .amount { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYSLIP</h1>
          <p>Pay Period: ${record.payPeriodStart}</p>
        </div>
        
        <div class="payslip-details">
          <div>
            <h3>Employee Details</h3>
            <p><strong>Name:</strong> ${record.employeeName}</p>
            <p><strong>Employee ID:</strong> ${record.employeeId}</p>
            <p><strong>Pay Period:</strong> ${record.payPeriodStart} to ${record.payPeriodEnd}</p>
          </div>
          <div>
            <h3>Payment Details</h3>
            <p><strong>Payment Date:</strong> ${record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Payment Method:</strong> ${record.paymentMethod}</p>
            <p><strong>Status:</strong> ${record.status}</p>
          </div>
        </div>

        <div class="section">
          <h3>Hours Worked</h3>
          <table>
            <tr><td>Regular Hours</td><td class="amount">${record.hoursWorked}</td></tr>
            <tr><td>Overtime Hours</td><td class="amount">${record.overtimeHours}</td></tr>
          </table>
        </div>

        <div class="section">
          <h3>Earnings</h3>
          <table>
            <tr><td>Regular Pay</td><td class="amount">£${record.regularPay.toFixed(2)}</td></tr>
            <tr><td>Overtime Pay</td><td class="amount">£${record.overtimePay.toFixed(2)}</td></tr>
            <tr><td>Bonuses</td><td class="amount">£${(record.bonuses || 0).toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total Gross Pay</td><td class="amount">£${record.grossPay.toFixed(2)}</td></tr>
          </table>
        </div>

        <div class="section">
          <h3>Deductions</h3>
          <table>
            <tr><td>Tax</td><td class="amount">£${(record.taxDeductions || record.deductions?.tax || 0).toFixed(2)}</td></tr>
            <tr><td>National Insurance</td><td class="amount">£${(record.employeeNIDeductions || record.deductions?.nationalInsurance || 0).toFixed(2)}</td></tr>
            <tr><td>Pension</td><td class="amount">£${(record.employeePensionDeductions || record.deductions?.pension || 0).toFixed(2)}</td></tr>
            <tr><td>Student Loan</td><td class="amount">£${(record.studentLoanDeductions || record.deductions?.studentLoan || 0).toFixed(2)}</td></tr>
            <tr><td>Other</td><td class="amount">£${(record.deductions?.other || 0).toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total Deductions</td><td class="amount">£${record.totalDeductions.toFixed(2)}</td></tr>
          </table>
        </div>

        <div class="section">
          <h3>Net Pay</h3>
          <table>
            <tr class="total-row"><td>Net Pay</td><td class="amount">£${record.netPay.toFixed(2)}</td></tr>
          </table>
        </div>

        <div style="margin-top: 30px; font-size: 12px; color: #666;">
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `

    // Create and download payslip
    const blob = new Blob([payslipHTML], { type: "text/html" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `payslip_${record.employeeName}_${record.payPeriodStart}.html`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Bulk operations functions
  const handleSelectPayrollRecord = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayrollRecords(prev => [...prev, recordId])
    } else {
      setSelectedPayrollRecords(prev => prev.filter(id => id !== recordId))
    }
  }

  const handleSelectAllPayrollRecords = (checked: boolean) => {
    if (checked) {
      setSelectedPayrollRecords(filteredPayrollRecords.map(record => record.id))
    } else {
      setSelectedPayrollRecords([])
    }
  }

  const handleBulkAction = async () => {
    if (selectedPayrollRecords.length === 0) {
      setNotification({ message: "Please select payroll records", type: "error" })
      return
    }

    try {
      setLoading(true)
      
      switch (bulkAction) {
        case "approve":
          await Promise.all(
            selectedPayrollRecords.map(id => 
              updatePayrollRecord(id, { status: "paid" })
            )
          )
          setNotification({ 
            message: `Approved ${selectedPayrollRecords.length} payroll records`, 
            type: "success" 
          })
          break
        case "reject":
          await Promise.all(
            selectedPayrollRecords.map(id => 
              updatePayrollRecord(id, { status: "cancelled" })
            )
          )
          setNotification({ 
            message: `Rejected ${selectedPayrollRecords.length} payroll records`, 
            type: "success" 
          })
          break
        case "delete":
          await Promise.all(
            selectedPayrollRecords.map(id => 
              deletePayrollRecord(id)
            )
          )
          setNotification({ 
            message: `Deleted ${selectedPayrollRecords.length} payroll records`, 
            type: "success" 
          })
          break
        case "export":
          const selectedRecords = payrollRecords.filter(record => 
            selectedPayrollRecords.includes(record.id)
          )
          exportSelectedRecords(selectedRecords)
          setNotification({ 
            message: `Exported ${selectedRecords.length} payroll records`, 
            type: "success" 
          })
          break
      }
      
      setSelectedPayrollRecords([])
      setShowBulkDialog(false)
    } catch (error) {
      console.error('Error performing bulk action:', error)
      setNotification({ message: "Error performing bulk action", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const exportSelectedRecords = (records: Payroll[]) => {
    const headers = [
      "Employee Name",
      "Pay Period Start",
      "Pay Period End",
      "Hours Worked",
      "Overtime Hours",
      "Regular Pay",
      "Overtime Pay",
      "Gross Pay",
      "Total Deductions",
      "Net Pay",
      "Status",
      "Payment Method",
      "Payment Date",
    ]

    const csvData = records.map((record) => [
      record.employeeName || "",
      record.payPeriodStart,
      record.payPeriodEnd,
      record.hoursWorked,
      record.overtimeHours,
      record.regularPay,
      record.overtimePay,
      record.grossPay,
      record.totalDeductions,
      record.netPay,
      record.status,
      record.paymentMethod,
      record.paymentDate,
    ])

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `selected_payroll_records_${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Payroll analytics and reporting
  const calculatePayrollAnalytics = () => {
    
    const totalGross = filteredPayrollRecords.reduce((sum, record) => sum + (record.totalGross || 0), 0)
    const totalDeductions = filteredPayrollRecords.reduce((sum, record) => sum + (record.totalDeductions || 0), 0)
    const totalNet = filteredPayrollRecords.reduce((sum, record) => sum + (record.totalNet || 0), 0)
    const totalHours = filteredPayrollRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0)
    const totalOvertimeHours = filteredPayrollRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0)
    
    const statusCounts = filteredPayrollRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate department-wise breakdown
    const departmentBreakdown = filteredPayrollRecords.reduce((acc, record) => {
      const dept = record.employeeName ? 
        (hrState.employees.find(emp => emp.id === record.employeeId)?.department || 'Unknown') : 
        'Unknown'
      if (!acc[dept]) {
        acc[dept] = { count: 0, totalGross: 0, totalNet: 0 }
      }
      acc[dept].count += 1
      acc[dept].totalGross += record.grossPay || 0
      acc[dept].totalNet += record.netPay || 0
      return acc
    }, {} as Record<string, { count: number, totalGross: number, totalNet: number }>)

    // Calculate average metrics
    const avgGrossPay = filteredPayrollRecords.length > 0 ? totalGross / filteredPayrollRecords.length : 0
    const avgNetPay = filteredPayrollRecords.length > 0 ? totalNet / filteredPayrollRecords.length : 0
    const avgHours = filteredPayrollRecords.length > 0 ? totalHours / filteredPayrollRecords.length : 0

    return {
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      recordCount: filteredPayrollRecords.length,
      statusCounts,
      departmentBreakdown,
      avgGrossPay: Math.round(avgGrossPay * 100) / 100,
      avgNetPay: Math.round(avgNetPay * 100) / 100,
      avgHours: Math.round(avgHours * 100) / 100
    }
  }

  // Advanced payroll features
  const handleGeneratePayrollReport = () => {
    const analytics = calculatePayrollAnalytics()
    const reportData = {
      reportDate: new Date().toISOString(),
      period: `${format(currentPeriod, 'MMMM yyyy')}`,
      summary: {
        totalRecords: analytics.recordCount,
        totalGrossPay: analytics.totalGross,
        totalDeductions: analytics.totalDeductions,
        totalNetPay: analytics.totalNet,
        totalHours: analytics.totalHours,
        totalOvertimeHours: analytics.totalOvertimeHours
      },
      departmentBreakdown: analytics.departmentBreakdown,
      statusBreakdown: analytics.statusCounts,
      records: filteredPayrollRecords.map(record => ({
        employeeName: record.employeeName,
        department: hrState.employees.find(emp => emp.id === record.employeeId)?.department || 'Unknown',
        payPeriod: record.payPeriodStart,
        grossPay: record.grossPay,
        netPay: record.netPay,
        status: record.status,
        paymentMethod: record.paymentMethod
      }))
    }

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payroll Report - ${format(currentPeriod, 'MMMM yyyy')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
          .summary-card h3 { margin: 0 0 10px 0; color: #333; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #1976d2; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYROLL REPORT</h1>
          <p>Period: ${reportData.period}</p>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Total Records</h3>
            <div class="value">${reportData.summary.totalRecords}</div>
          </div>
          <div class="summary-card">
            <h3>Total Gross Pay</h3>
            <div class="value">£${reportData.summary.totalGrossPay.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <h3>Total Net Pay</h3>
            <div class="value">£${reportData.summary.totalNetPay.toFixed(2)}</div>
          </div>
        </div>

        <div class="section">
          <h2>Department Breakdown</h2>
          <table>
            <thead>
              <tr><th>Department</th><th>Records</th><th>Total Gross</th><th>Total Net</th></tr>
            </thead>
            <tbody>
              ${Object.entries(reportData.departmentBreakdown).map(([dept, data]) => 
                `<tr><td>${dept}</td><td>${data.count}</td><td>£${data.totalGross.toFixed(2)}</td><td>£${data.totalNet.toFixed(2)}</td></tr>`
              ).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Status Breakdown</h2>
          <table>
            <thead>
              <tr><th>Status</th><th>Count</th></tr>
            </thead>
            <tbody>
              ${Object.entries(reportData.statusBreakdown).map(([status, count]) => 
                `<tr><td>${status}</td><td>${count}</td></tr>`
              ).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Detailed Records</h2>
          <table>
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Pay Period</th><th>Gross Pay</th><th>Net Pay</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${reportData.records.map(record => 
                `<tr><td>${record.employeeName}</td><td>${record.department}</td><td>${record.payPeriod}</td><td>£${record.grossPay.toFixed(2)}</td><td>£${record.netPay.toFixed(2)}</td><td>${record.status}</td></tr>`
              ).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([reportHTML], { type: "text/html" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `payroll_report_${format(currentPeriod, 'yyyy-MM')}.html`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Payroll validation and compliance checks
  const validatePayrollCompliance = (record: Payroll) => {
    const errors: string[] = []
    const warnings: string[] = []

    // Minimum wage compliance
    const hourlyRate = record.hoursWorked > 0 ? record.regularPay / record.hoursWorked : 0
    const minWage = 10.42 // UK minimum wage 2024
    if (hourlyRate > 0 && hourlyRate < minWage) {
      errors.push(`Hourly rate £${hourlyRate.toFixed(2)} is below minimum wage £${minWage}`)
    }

    // Overtime compliance
    if (record.overtimeHours > 0 && record.overtimePay <= record.regularPay) {
      warnings.push("Overtime pay should be higher than regular pay")
    }

    // Tax compliance
    const expectedTaxRate = 0.20 // 20% basic rate
    const actualTaxRate = record.grossPay > 0 ? record.deductions.tax / record.grossPay : 0
    if (Math.abs(actualTaxRate - expectedTaxRate) > 0.05) {
      warnings.push(`Tax rate ${(actualTaxRate * 100).toFixed(1)}% differs significantly from expected ${(expectedTaxRate * 100)}%`)
    }

    // Payment date validation
    const payDate = record.paymentDate ? new Date(record.paymentDate) : new Date()
    const periodEnd = new Date(record.payPeriodEnd)
    if (payDate < periodEnd) {
      warnings.push("Payment date is before pay period end date")
    }

    return { errors, warnings }
  }

  const [periodDialogOpen, setPeriodsDialogOpen] = useState(false)
  const [wageRequests, setWageRequests] = useState<WageStreamRequest[]>([])
  
  // Initialize wage requests (feature not fully implemented)

  // Service Charge Allocation Functions
  const validateServiceChargeAllocation = (formData: ServiceChargeFormData): ServiceChargeValidationResult => {
    const location = useLocation()
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields
    if (!formData.payPeriodStart || !formData.payPeriodEnd) {
      errors.push("Pay period dates are required")
    }

    if (formData.totalServiceCharge <= 0) {
      errors.push("Total service charge must be greater than 0")
    }

    if (formData.employeeAllocations.length === 0) {
      errors.push("At least one employee allocation is required")
    }

    // Validate allocation method specific requirements
    if (formData.allocationMethod === "points") {
      const totalPoints = formData.employeeAllocations.reduce((sum, emp) => sum + (emp.points || 0), 0)
      if (totalPoints <= 0) {
        errors.push("Total points must be greater than 0 for points-based allocation")
      }
      if (totalPoints !== 100 && totalPoints !== 1) {
        warnings.push(`Total points is ${totalPoints}. Consider normalizing to 100 or 1.`)
      }
    } else if (formData.allocationMethod === "percentage") {
      const totalPercentage = formData.employeeAllocations.reduce((sum, emp) => sum + (emp.percentage || 0), 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(`Total percentage must equal 100%. Current total: ${totalPercentage.toFixed(2)}%`)
      }
    } else if (formData.allocationMethod === "hybrid") {
      const totalPoints = formData.employeeAllocations.reduce((sum, emp) => sum + (emp.points || 0), 0)
      const totalPercentage = formData.employeeAllocations.reduce((sum, emp) => sum + (emp.percentage || 0), 0)
      
      if (totalPoints <= 0) {
        errors.push("Total points must be greater than 0 for hybrid allocation")
      }
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(`Total percentage must equal 100%. Current total: ${totalPercentage.toFixed(2)}%`)
      }
      if (!formData.hybridPointsWeight || !formData.hybridPercentageWeight) {
        errors.push("Hybrid weights are required for hybrid allocation")
      }
      if (formData.hybridPointsWeight && formData.hybridPercentageWeight) {
        const totalWeight = formData.hybridPointsWeight + formData.hybridPercentageWeight
        if (Math.abs(totalWeight - 1) > 0.01) {
          errors.push(`Hybrid weights must sum to 1.0. Current sum: ${totalWeight.toFixed(2)}`)
        }
      }
    }

    // Validate employee allocations
    formData.employeeAllocations.forEach((emp, index) => {
      if (!emp.employeeId) {
        errors.push(`Employee ${index + 1}: Employee ID is required`)
      }
      if (emp.baseSalary < 0) {
        errors.push(`Employee ${index + 1}: Base salary cannot be negative`)
      }
      if (formData.allocationMethod === "points" && (emp.points || 0) < 0) {
        errors.push(`Employee ${index + 1}: Points cannot be negative`)
      }
      if (formData.allocationMethod === "percentage" && (emp.percentage || 0) < 0) {
        errors.push(`Employee ${index + 1}: Percentage cannot be negative`)
      }
    })

    // Calculate totals for validation
    const totalPoints = formData.employeeAllocations.reduce((sum, emp) => sum + (emp.points || 0), 0)
    const totalPercentage = formData.employeeAllocations.reduce((sum, emp) => sum + (emp.percentage || 0), 0)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalPoints: totalPoints > 0 ? totalPoints : undefined,
      totalPercentage: totalPercentage > 0 ? totalPercentage : undefined,
      pointsValue: totalPoints > 0 ? formData.totalServiceCharge / totalPoints : undefined,
      percentageValue: totalPercentage > 0 ? formData.totalServiceCharge * (totalPercentage / 100) : undefined
    }
  }

  const calculateServiceChargeAllocation = (formData: ServiceChargeFormData): ServiceChargeEmployeeAllocation[] => {
    const validation = validateServiceChargeAllocation(formData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const allocations: ServiceChargeEmployeeAllocation[] = []

    formData.employeeAllocations.forEach(empForm => {
      const employee = hrState.employees.find(emp => emp.id === empForm.employeeId)
      if (!employee) return

      let allocatedAmount = 0
      let points = empForm.points || 0
      let percentage = empForm.percentage || 0

      // Calculate allocation based on method
      if (formData.allocationMethod === "points") {
        const totalPoints = validation.totalPoints || 1
        allocatedAmount = (points / totalPoints) * formData.totalServiceCharge
      } else if (formData.allocationMethod === "percentage") {
        allocatedAmount = (percentage / 100) * formData.totalServiceCharge
      } else if (formData.allocationMethod === "hybrid") {
        const pointsAllocation = (points / (validation.totalPoints || 1)) * formData.totalServiceCharge * (formData.hybridPointsWeight || 0)
        const percentageAllocation = (percentage / 100) * formData.totalServiceCharge * (formData.hybridPercentageWeight || 0)
        allocatedAmount = pointsAllocation + percentageAllocation
      }

      // Calculate gross pay (base salary + allocated amount)
      const grossPay = empForm.baseSalary + allocatedAmount

      // Calculate deductions
      const taxRate = 0.20 // 20% tax rate
      const nationalInsuranceRate = 0.12
      const pensionRate = employee.payType === 'salary' ? 0.05 : 0.03
      const insuranceRate = 0.03

      const deductions = {
        tax: grossPay * taxRate,
        nationalInsurance: grossPay * nationalInsuranceRate,
        pension: grossPay * pensionRate,
        insurance: grossPay * insuranceRate,
        other: 0
      }

      const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0)
      const netPay = grossPay - totalDeductions

      allocations.push({
        id: `sca_${empForm.employeeId}_${Date.now()}`,
        allocationId: formData.id || `allocation_${Date.now()}`,
        employeeId: empForm.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department || 'Unknown',
        role: employee.position || 'Unknown',
        points: points > 0 ? points : undefined,
        percentage: percentage > 0 ? percentage : undefined,
        allocatedAmount: Math.round(allocatedAmount * 100) / 100,
        baseSalary: empForm.baseSalary,
        grossPay: Math.round(grossPay * 100) / 100,
        deductions: {
          tax: Math.round(deductions.tax * 100) / 100,
          nationalInsurance: Math.round(deductions.nationalInsurance * 100) / 100,
          pension: Math.round(deductions.pension * 100) / 100,
          insurance: Math.round(deductions.insurance * 100) / 100,
          other: deductions.other
        },
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        status: "pending",
        notes: empForm.notes
      })
    })

    return allocations
  }

  const handleServiceChargeAllocationChange = (field: string, value: any) => {
    setServiceChargeFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEmployeeAllocationChange = (index: number, field: string, value: any) => {
    setServiceChargeFormData(prev => ({
      ...prev,
      employeeAllocations: prev.employeeAllocations.map((emp, i) => 
        i === index ? { ...emp, [field]: value } : emp
      )
    }))
  }

  const addEmployeeToAllocation = () => {
    setServiceChargeFormData(prev => ({
      ...prev,
      employeeAllocations: [
        ...prev.employeeAllocations,
        {
          employeeId: "",
          baseSalary: 0,
          points: 0,
          percentage: 0
        }
      ]
    }))
  }

  const removeEmployeeFromAllocation = (index: number) => {
    setServiceChargeFormData(prev => ({
      ...prev,
      employeeAllocations: prev.employeeAllocations.filter((_, i) => i !== index)
    }))
  }

  const generateServiceChargePreview = () => {
    try {
      const preview = calculateServiceChargeAllocation(serviceChargeFormData)
      setServiceChargePreview(preview)
      setShowServiceChargePreview(true)
    } catch (error) {
      setNotification({ 
        message: `Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: "error" 
      })
    }
  }

  const finalizeServiceChargeAllocation = async () => {
    try {
      setLoading(true)
      
      const validation = validateServiceChargeAllocation(serviceChargeFormData)
      if (!validation.isValid) {
        setNotification({ 
          message: `Validation failed: ${validation.errors.join(', ')}`, 
          type: "error" 
        })
        return
      }

      const allocations = calculateServiceChargeAllocation(serviceChargeFormData)
      
      // Create service charge allocation record
      const allocationRecord: ServiceChargeAllocation = {
        id: `sca_${Date.now()}`,
        payPeriodId: `period_${Date.now()}`,
        payPeriodStart: serviceChargeFormData.payPeriodStart!.toISOString().split('T')[0],
        payPeriodEnd: serviceChargeFormData.payPeriodEnd!.toISOString().split('T')[0],
        totalServiceCharge: serviceChargeFormData.totalServiceCharge,
        totalTips: serviceChargeFormData.totalTips,
        allocationMethod: serviceChargeFormData.allocationMethod,
        pointsTotal: validation.totalPoints,
        percentageTotal: validation.totalPercentage,
        hybridPointsWeight: serviceChargeFormData.hybridPointsWeight,
        hybridPercentageWeight: serviceChargeFormData.hybridPercentageWeight,
        status: "finalized",
        createdAt: new Date().toISOString(),
        finalizedAt: new Date().toISOString(),
        finalizedBy: currentUserId,
        notes: serviceChargeFormData.notes,
        auditTrail: [{
          id: `audit_${Date.now()}`,
          allocationId: `sca_${Date.now()}`,
          action: "finalized",
        performedBy: currentUserId,
          performedAt: new Date().toISOString(),
          notes: "Service charge allocation finalized"
        }]
      }

      // Convert to payroll records and save
      const payrollRecords = allocations.map(allocation => ({
        id: `payroll_sca_${allocation.employeeId}_${Date.now()}`,
        employeeId: allocation.employeeId,
        employeeName: allocation.employeeName,
        periodId: `period_sca_${Date.now()}`,
        periodStartDate: new Date(allocationRecord.payPeriodStart).getTime(),
        periodEndDate: new Date(allocationRecord.payPeriodEnd).getTime(),
        payPeriodStart: allocationRecord.payPeriodStart,
        payPeriodEnd: allocationRecord.payPeriodEnd,
        regularHours: 0, // Service charge doesn't track hours
        overtimeHours: 0,
        totalHours: 0,
        hoursWorked: 0, // Service charge doesn't track hours
        hourlyRate: 0,
        regularPay: allocation.baseSalary,
        overtimePay: 0,
        bonuses: allocation.allocatedAmount, // Service charge as bonus
        grossPay: allocation.grossPay,
        totalGross: allocation.grossPay,
        deductions: {
          tax: allocation.deductions?.tax || 0,
          insurance: allocation.deductions?.insurance || 0,
          retirement: 0,
          other: allocation.deductions?.other || 0
        },
        totalDeductions: allocation.totalDeductions,
        netPay: allocation.netPay,
        totalNet: allocation.netPay,
        status: "pending" as const,
        paymentMethod: "direct_deposit" as const,
        paymentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        notes: `Service charge allocation: ${allocation.allocatedAmount.toFixed(2)}`,
        // Add required HMRC fields with defaults
        taxYear: "2024-25",
        taxPeriod: 1,
        periodType: "monthly" as const,
        taxableGrossPay: allocation.allocatedAmount,
        niableGrossPay: allocation.allocatedAmount,
        pensionableGrossPay: allocation.allocatedAmount,
        taxCode: hrState.employees.find(e => e.id === allocation.employeeId)?.taxCode || "1257L",
        taxCodeBasis: "cumulative" as const,
        taxDeductions: 0,
        taxPaidYTD: 0,
        niCategory: hrState.employees.find(e => e.id === allocation.employeeId)?.niCategory || "A",
        employeeNIDeductions: 0,
        employerNIContributions: 0,
        employeeNIPaidYTD: 0,
        employerNIPaidYTD: 0,
        studentLoanDeductions: 0,
        employeePensionDeductions: 0,
        employerPensionContributions: 0,
        employeePensionPaidYTD: 0,
        employerPensionPaidYTD: 0,
        legacyDeductions: {
          tax: 0,
          insurance: 0,
          retirement: 0,
          other: 0
        },
        ytdData: {
          grossPayYTD: allocation.allocatedAmount,
          taxablePayYTD: allocation.allocatedAmount,
          taxPaidYTD: 0,
          niablePayYTD: allocation.allocatedAmount,
          employeeNIPaidYTD: 0,
          employerNIPaidYTD: 0,
          pensionablePayYTD: allocation.allocatedAmount,
          employeePensionYTD: 0,
          employerPensionYTD: 0
        }
      }))

      // Save payroll records
      for (const record of payrollRecords) {
        await addPayroll(record as any)
      }

      // Save service charge allocation
      setServiceChargeAllocations(prev => [...prev, allocationRecord])

      setNotification({ 
        message: `Service charge allocation finalized for ${allocations.length} employees`, 
        type: "success" 
      })

      setShowServiceChargeDialog(false)
      setShowServiceChargePreview(false)
      
      // Reset form
      setServiceChargeFormData({
        payPeriodStart: null,
        payPeriodEnd: null,
        totalServiceCharge: 0,
        totalTips: 0,
        allocationMethod: "points",
        employeeAllocations: []
      })

    } catch (error) {
      console.error("Error finalizing service charge allocation:", error)
      setNotification({ 
        message: "Error finalizing service charge allocation", 
        type: "error" 
      })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    // Would implement wage stream requests loading
    setWageRequests([]) // Placeholder to avoid unused setter warning
  }, [])
  const [periodFormData, setPeriodFormData] = useState<{
    name: string
    startDate: Date
    endDate: Date
    payDate: Date
    status: "draft" | "processing" | "completed" | "closed"
  }>({
    name: `Pay Period ${format(new Date(), "MMMM yyyy")}`,
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    payDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    status: "draft",
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: "payroll" | "period" } | null>(null)

  // Derived data
  const paymentMethods = ["Direct Deposit", "Check", "Cash", "Bank Transfer"]
  const statuses = ["Pending", "Processing", "Completed", "Cancelled"]

  const filteredPayrollRecords = useMemo(() => {
    const dateRange = getDateRange()
    
    
    const filtered = payrollRecords.filter((record) => {
      const matchesSearch =
        searchQuery === "" ||
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.id.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = selectedStatus === "" || record.status === selectedStatus
      const matchesPaymentMethod = selectedPaymentMethod === "" || record.paymentMethod === selectedPaymentMethod

      // Filter by date range for Records tab (tab 0)
      let matchesPeriod = true
      if (currentTab === 0) {
        // Handle different date formats
        let recordStart: Date
        try {
          // Try parsing as ISO string first
          recordStart = parseISO(record.payPeriodStart)
          // If that fails or gives invalid date, try parsing as regular date
          if (isNaN(recordStart.getTime())) {
            recordStart = new Date(record.payPeriodStart)
          }
        } catch (error) {
          recordStart = new Date(record.payPeriodStart)
        }
        
        matchesPeriod = recordStart >= dateRange.start && recordStart <= dateRange.end
        
      }

      return matchesSearch && matchesStatus && matchesPaymentMethod && matchesPeriod
    })
    
    return filtered
  }, [payrollRecords, searchQuery, selectedStatus, selectedPaymentMethod, currentTab, selectedDate, dateType])

  // Sort filtered records
  const sortedRecords = useMemo(() => {
    const getValue = (r: Payroll, key: string) => {
      switch (key) {
        case "id":
          return r.id
        case "employee":
        case "employeeName":
          return r.employeeName || ""
        case "payPeriod":
        case "payPeriodStart":
          return r.payPeriodStart
        case "gross":
        case "totalGross":
          return r.totalGross ?? 0
        case "net":
        case "totalNet":
          return r.totalNet ?? 0
        case "paymentMethod":
          return r.paymentMethod || ""
        case "paymentDate":
          return r.paymentDate || ""
        case "status":
          return r.status || ""
        default:
          return (r as any)[key]
      }
    }

    const copy = [...filteredPayrollRecords]
    copy.sort((a, b) => {
      const av = getValue(a, sortBy)
      const bv = getValue(b, sortBy)

      // Handle dates
      const isDateKey = sortBy === "paymentDate" || sortBy === "payPeriodStart" || sortBy === "payPeriod"
      let cmp = 0
      if (isDateKey) {
        const ad = av ? Date.parse(av as string) : 0
        const bd = bv ? Date.parse(bv as string) : 0
        cmp = ad - bd
      } else if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv
      } else {
        const as = (av ?? "").toString().toLowerCase()
        const bs = (bv ?? "").toString().toLowerCase()
        cmp = as.localeCompare(bs)
      }

      return sortOrder === "asc" ? cmp : -cmp
    })
    return copy
  }, [filteredPayrollRecords, sortBy, sortOrder])

  // Pagination
  const paginatedRecords = useMemo(() => {
    return sortedRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [sortedRecords, page, rowsPerPage])

  // Data now comes from HR context, no need to load separately
  // useEffect(() => {
  //   Data is loaded by HRContext automatically
  // }, [])

  // Note: Data is now loaded automatically by HRContext with progressive loading and caching
  // No need to manually refresh - context handles all data loading efficiently
  // Only refresh if explicitly needed (e.g., after creating/updating data)
  useEffect(() => {
    // Data is available from context automatically
    // keep quiet
  }, [hrState.employees.length, hrState.payrollRecords.length])

  // Calculate totals when form data changes
  useEffect(() => {
    if (openDialog) {
      const totalGross = formData.regularPay + formData.overtimePay + formData.bonuses
      const totalDeductions =
        formData.deductions.tax +
        formData.deductions.insurance +
        formData.deductions.retirement +
        formData.deductions.other
      const totalNet = totalGross - totalDeductions

      setFormData((prev) => ({
        ...prev,
        totalGross,
        totalNet,
      }))
    }
  }, [
    formData.regularPay,
    formData.overtimePay,
    formData.bonuses,
    formData.deductions.tax,
    formData.deductions.insurance,
    formData.deductions.retirement,
    formData.deductions.other,
    openDialog,
  ])

  // Payroll data is automatically loaded through HR context




  const handleCloseDialog = () => {
    setOpenDialog(false)
    setFormData(initialFormData)
    setEditMode(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Handle numeric inputs
    if (["hoursWorked", "regularPay", "overtimePay", "bonuses"].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: Number.parseFloat(value) || 0,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleDeductionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const deductionType = name.split(".")[1] // e.g., "deductions.tax" -> "tax"

    setFormData((prev) => ({
      ...prev,
      deductions: {
        ...prev.deductions,
        [deductionType]: Number.parseFloat(value) || 0,
      },
    }))
  }

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // If employee is selected, auto-fill employee name
    if (name === "employeeId" && value) {
      const employee = hrState.employees.find((emp) => emp.id === value)
      if (employee) {
        setFormData((prev) => ({
          ...prev,
          employeeName: `${employee.firstName} ${employee.lastName}`,
        }))
      }
    }
  }

  const handleFormDateChange = (date: Date | null, field: string) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        [field]: date,
      }))
    }
  }

  const handlePeriodDateChange = (date: Date | null, field: string) => {
    if (date) {
      setPeriodFormData((prev) => ({
        ...prev,
        [field]: date,
      }))
    }
  }

  const handlePeriodInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPeriodFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePeriodSelectChange = (e: any) => {
    const { name, value } = e.target
    setPeriodFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleClosePeriodDialog = () => {
    setPeriodsDialogOpen(false)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (!formData.employeeId) {
        setNotification({ message: "Please select an employee", type: "error" })
        setLoading(false)
        return
      }

      const employee = hrState.employees.find(e => e.id === formData.employeeId)
      const payrollData = {
        employeeId: formData.employeeId,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : '',
        periodId: '', // Will be set by backend
        periodStartDate: typeof formData.payPeriodStart === 'string' ? new Date(formData.payPeriodStart).getTime() : (formData.payPeriodStart as Date).getTime(),
        periodEndDate: typeof formData.payPeriodEnd === 'string' ? new Date(formData.payPeriodEnd).getTime() : (formData.payPeriodEnd as Date).getTime(),
        payPeriodStart: typeof formData.payPeriodStart === 'string' ? formData.payPeriodStart : format(formData.payPeriodStart, "yyyy-MM-dd"),
        payPeriodEnd: typeof formData.payPeriodEnd === 'string' ? formData.payPeriodEnd : format(formData.payPeriodEnd, "yyyy-MM-dd"),
        regularHours: formData.hoursWorked - formData.overtimeHours,
        overtimeHours: formData.overtimeHours,
        totalHours: formData.hoursWorked,
        hoursWorked: formData.hoursWorked,
        hourlyRate: employee?.hourlyRate || 0,
        regularPay: formData.regularPay,
        overtimePay: formData.overtimePay,
        bonuses: formData.bonuses,
        grossPay: formData.grossPay,
        totalGross: formData.totalGross,
        legacyDeductions: formData.deductions,
        totalDeductions: formData.totalDeductions,
        netPay: formData.netPay,
        totalNet: formData.totalNet,
        status: formData.status as "pending" | "approved" | "paid" | "cancelled",
        paymentMethod: formData.paymentMethod as "direct_deposit" | "check" | "cash",
        paymentDate: typeof formData.paymentDate === 'string' ? formData.paymentDate : format(formData.paymentDate, "yyyy-MM-dd"),
        createdAt: new Date().toISOString(),
        frequency: (hrState.employees.find((e) => e.id === formData.employeeId)?.payFrequency) || undefined,
        notes: formData.notes,
        // Add required HMRC fields with defaults
        taxYear: "2024-25",
        taxPeriod: 1,
        periodType: "monthly" as const,
        taxableGrossPay: formData.grossPay,
        niableGrossPay: formData.grossPay,
        pensionableGrossPay: formData.grossPay,
        taxCode: employee?.taxCode || "1257L",
        taxCodeBasis: "cumulative" as const,
        taxDeductions: formData.deductions.tax,
        taxPaidYTD: 0,
        niCategory: employee?.niCategory || "A",
        employeeNIDeductions: formData.deductions.insurance || 0,
        employerNIContributions: 0,
        employeeNIPaidYTD: 0,
        employerNIPaidYTD: 0,
        studentLoanDeductions: 0,
        employeePensionDeductions: formData.deductions.retirement || 0,
        employerPensionContributions: 0,
        employeePensionPaidYTD: 0,
        employerPensionPaidYTD: 0,
        ytdData: {
          grossPayYTD: formData.grossPay,
          taxablePayYTD: formData.grossPay,
          taxPaidYTD: formData.deductions.tax,
          niablePayYTD: formData.grossPay,
          employeeNIPaidYTD: formData.deductions.insurance || 0,
          employerNIPaidYTD: 0,
          pensionablePayYTD: formData.grossPay,
          employeePensionYTD: formData.deductions.retirement || 0,
          employerPensionYTD: 0
        }
      }

      // Validate compliance before saving
      const validation = validatePayrollCompliance(payrollData as any)
      if (validation.errors.length > 0) {
        setNotification({ 
          message: `Compliance errors: ${validation.errors.join(', ')}`, 
          type: "error" 
        })
        setLoading(false)
        return
      }

      if (validation.warnings.length > 0) {
        setNotification({ 
          message: `Warnings: ${validation.warnings.join(', ')}`, 
          type: "warning" 
        })
      }

      if (editMode) {
        await updatePayrollRecord(formData.id!, payrollData as any)
        setNotification({ message: "Payroll record updated successfully", type: "success" })
      } else {
        await addPayroll(payrollData as any)
        setNotification({ message: "Payroll record created successfully", type: "success" })
      }

      // Data will be refreshed automatically by HRContext
      handleCloseDialog()
    } catch (err) {
      console.error("Error saving payroll record:", err)
      setError("Failed to save payroll record. Please try again.")
      setNotification({ message: "Failed to save payroll record", type: "error" })
    } finally {
      setLoading(false)
    }
  }


  const handleSubmitPeriod = async () => {
    try {
      const periodData = {
        name: periodFormData.name,
        startDate: format(periodFormData.startDate, "yyyy-MM-dd"),
        endDate: format(periodFormData.endDate, "yyyy-MM-dd"),
        payDate: format(periodFormData.payDate, "yyyy-MM-dd"),
        status: periodFormData.status,
      }

      // Note: Payroll periods functionality would need to be added to HRContext

      setNotification({ message: "Pay period created successfully", type: "success" })
      // Data will be refreshed automatically by HRContext
      handleClosePeriodDialog()
    } catch (err) {
      console.error("Error creating pay period:", err)
      setNotification({ message: "Failed to create pay period", type: "error" })
    }
  }


  const handleClosePayrollCRUD = () => {
    setPayrollCRUDModalOpen(false)
    setSelectedPayrollForCRUD(null)
    setCrudMode('create')
  }

  const handleSavePayrollCRUD = async (payrollData: any) => {
    if (!canMutate) return
    try {
      if (crudMode === 'create') {
        await addPayroll(payrollData as any)
        setNotification({ message: "Payroll entry created successfully", type: "success" })
      } else if (crudMode === 'edit' && selectedPayrollForCRUD) {
        await updatePayrollRecord(selectedPayrollForCRUD.id, payrollData as any)
        setNotification({ message: "Payroll entry updated successfully", type: "success" })
      }
      handleClosePayrollCRUD()
      await refreshPayrolls()
    } catch (error) {
      console.error("Error saving payroll:", error)
      setNotification({ message: `Failed to ${crudMode === 'create' ? 'create' : 'update'} payroll entry`, type: "error" })
    }
  }

  const handleDeleteClick = (id: string, type: "payroll" | "period") => {
    if (!canRemove) return
    setItemToDelete({ id, type })
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!canRemove) return
    if (!itemToDelete) return

    try {
      if (itemToDelete.type === "payroll") {
        await deletePayrollRecord(itemToDelete.id)
      } else {
        // Note: Payroll periods deletion would need to be added to HRContext
      }

      setNotification({
        message: `${itemToDelete.type === "payroll" ? "Payroll record" : "Pay period"} deleted successfully`,
        type: "success",
      })
      // Data will be refreshed automatically by HRContext
    } catch (err) {
      console.error("Error deleting item:", err)
      setNotification({ message: "Failed to delete item", type: "error" })
    } finally {
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "completed":
        return "success"
      case "approved":
      case "processing":
        return "warning"
      case "pending":
      case "draft":
        return "info"
      case "cancelled":
      case "closed":
        return "error"
      default:
        return "default"
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <StatsSection
          stats={[
            {
              value: formatCurrency(
                filteredPayrollRecords.reduce((sum, record) => sum + (record.totalGross || 0), 0),
              ),
              label: "Total Payroll (Selected Period)",
              color: "primary"
            },
            {
              value: filteredPayrollRecords.filter((record) => record.status?.toLowerCase() === "pending").length,
              label: "Pending Payments",
              color: "warning"
            },
            {
              value: filteredPayrollRecords.filter((record) => {
                const s = record.status?.toLowerCase()
                return s === "paid" || s === "completed"
              }).length,
              label: "Completed Payments",
              color: "success"
            },
            {
              value: formatCurrency(
                filteredPayrollRecords.length > 0
                  ? filteredPayrollRecords.reduce((sum, record) => sum + (record.totalNet || 0), 0) / filteredPayrollRecords.length
                  : 0,
              ),
              label: "Average Pay",
              color: "info"
            }
          ]}
        />




        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* No loading UI — render and let data fill in */}
        <>
          {/* DataHeader */}
            <DataHeader
              showDateControls={true}
              currentDate={selectedDate}
              onDateChange={handleDateChange}
              dateType={dateType}
              onDateTypeChange={handleDateTypeChange}
              availableDateTypes={["day", "week", "month", "custom"]}
              searchTerm={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search employees or records..."
              filters={filters}
              filtersExpanded={filtersExpanded}
              onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
              sortOptions={sortOptions}
              sortValue={sortBy}
              sortDirection={sortOrder}
              onSortChange={handleSortChange}
              onCreateNew={handleCreateNew}
              createButtonLabel="Add Payroll Record"
              createDisabled={!canMutate}
              createDisabledTooltip="You don't have permission to create or edit payroll."
              onExportCSV={handleExportCSV}
              additionalButtons={[
                {
                  label: "Generate Report",
                  icon: <SearchIcon />,
                  onClick: handleGeneratePayrollReport,
                  color: "secondary"
                }
              ]}
              additionalControls={
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexWrap: 'nowrap',
                  minWidth: 0
                }}>
                  <Button
                    variant={currentTab === 0 ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setCurrentTab(0)}
                    sx={
                      currentTab === 0
                        ? { 
                            bgcolor: "white", 
                            color: themeConfig.brandColors.navy, 
                            "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                            whiteSpace: "nowrap"
                          }
                        : { 
                            color: "white", 
                            borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                            "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                            whiteSpace: "nowrap"
                          }
                    }
                  >
                    Records
                  </Button>
                  <Button
                    variant={currentTab === 1 ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setCurrentTab(1)}
                    sx={
                      currentTab === 1
                        ? { 
                            bgcolor: "white", 
                            color: themeConfig.brandColors.navy, 
                            "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                            whiteSpace: "nowrap"
                          }
                        : { 
                            color: "white", 
                            borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                            "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                            whiteSpace: "nowrap"
                          }
                    }
                  >
                    Weekly Generation
                  </Button>
                  <Button
                    variant={currentTab === 2 ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setCurrentTab(2)}
                    sx={
                      currentTab === 2
                        ? { 
                            bgcolor: "white", 
                            color: themeConfig.brandColors.navy, 
                            "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                            whiteSpace: "nowrap"
                          }
                        : { 
                            color: "white", 
                            borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                            "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                            whiteSpace: "nowrap"
                          }
                    }
                  >
                    Service Charge
                  </Button>
                </Box>
              }
            />

            {/* Tab Content */}
            {currentTab === 0 && (
              <>
                {/* Payroll Analytics Dashboard */}
                {(() => {
                  const analytics = calculatePayrollAnalytics()
                  return (
                    <StatsSection
                      stats={[
                        {
                          label: "Total Records",
                          value: analytics.recordCount.toString(),
                          color: "primary"
                        },
                        {
                          label: "Total Gross Pay",
                          value: `£${analytics.totalGross.toFixed(2)}`,
                          color: "success"
                        },
                        {
                          label: "Total Deductions",
                          value: `£${analytics.totalDeductions.toFixed(2)}`,
                          color: "warning"
                        },
                        {
                          label: "Total Net Pay",
                          value: `£${analytics.totalNet.toFixed(2)}`,
                          color: "info"
                        },
                        {
                          label: "Total Hours",
                          value: analytics.totalHours.toString(),
                          color: "secondary"
                        },
                        {
                          label: "Overtime Hours",
                          value: analytics.totalOvertimeHours.toString(),
                          color: "error"
                        }
                      ]}
                      columns={6}
                    />
                  )
                })()}

            {/* Bulk Operations Toolbar */}
            {selectedPayrollRecords.length > 0 && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: themeConfig.brandColors.offWhite }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6">
                    {selectedPayrollRecords.length} record(s) selected
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleBulkApproveWithHMRC}
                    disabled={loading}
                  >
                    Approve & Submit to HMRC
                  </Button>
                  <Button
                    variant="contained"
                    color="info"
                    onClick={handleBulkHMRCSubmission}
                    disabled={loading}
                  >
                    Submit to HMRC
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => {
                      setBulkAction("reject")
                      setShowBulkDialog(true)
                    }}
                    disabled={loading}
                  >
                    Reject Selected
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                      setBulkAction("delete")
                      setShowBulkDialog(true)
                    }}
                    disabled={loading}
                  >
                    Delete Selected
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setBulkAction("export")
                      handleBulkAction()
                    }}
                    disabled={loading}
                  >
                    Export Selected
                  </Button>
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={() => setSelectedPayrollRecords([])}
                  >
                    Clear Selection
                  </Button>
                </Box>
              </Paper>
            )}
            
            {/* Payroll Records Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedPayrollRecords.length === filteredPayrollRecords.length && filteredPayrollRecords.length > 0}
                        onChange={(e) => handleSelectAllPayrollRecords(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ 
                        textAlign: 'center !important',
                        padding: '16px 16px',
                        cursor: "pointer",
                        userSelect: 'none',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                      onClick={() => {
                        if (sortBy === "id") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                        else {
                          setSortBy("id"); setSortOrder("asc")
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>ID</Typography>
                        {sortBy === "id" && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "employeeName") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("employeeName"); setSortOrder("asc") } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Employee</Typography>
                        {sortBy === "employeeName" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "payPeriodStart") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("payPeriodStart"); setSortOrder("asc") } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Pay Period</Typography>
                        {sortBy === "payPeriodStart" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "totalGross") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("totalGross"); setSortOrder("asc") } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Gross Pay</Typography>
                        {sortBy === "totalGross" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "totalNet") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("totalNet"); setSortOrder("asc") } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Net Pay</Typography>
                        {sortBy === "totalNet" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "paymentMethod") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("paymentMethod"); setSortOrder("asc") } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Payment Method</Typography>
                        {sortBy === "paymentMethod" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "paymentDate") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("paymentDate"); setSortOrder("asc") } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Payment Date</Typography>
                        {sortBy === "paymentDate" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "status") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("status"); setSortOrder("asc") } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Status</Typography>
                        {sortBy === "status" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>HMRC Status</Typography></TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Payslip</Typography></TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record) => (
                      <TableRow key={record.id} hover onClick={() => handleViewPayrollRecord(record)} sx={{ cursor: "pointer", '& > td': { paddingTop: 1, paddingBottom: 1 } }}>
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedPayrollRecords.includes(record.id)}
                            onChange={(e) => handleSelectPayrollRecord(record.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{record.id.substring(0, 8)}...</TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{record.employeeName}</TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                          {format(parseISO(record.payPeriodStart), "dd MMM")} -{" "}
                          {format(parseISO(record.payPeriodEnd), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{formatCurrency(record.totalGross)}</TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{formatCurrency(record.totalNet)}</TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{record.paymentMethod}</TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{format(parseISO(record.paymentDate!), "dd MMM yyyy")}</TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                          <Chip
                            label={record.status}
                            color={
                              getStatusColor(record.status) as "success" | "warning" | "error" | "info" | "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                          {record.submittedToHMRC ? (
                            <Chip
                              label="Submitted"
                              color="success"
                              size="small"
                              title={record.fpsSubmissionDate ? `Submitted on ${new Date(record.fpsSubmissionDate).toLocaleDateString()}` : 'Submitted to HMRC'}
                            />
                          ) : record.status === 'approved' ? (
                            <Chip
                              label="Ready"
                              color="warning"
                              size="small"
                              title="Approved but not yet submitted to HMRC"
                            />
                          ) : (
                            <Chip
                              label="Pending"
                              color="default"
                              size="small"
                              title="Not yet approved"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                          {record.payslipUrl ? (
                            <Button size="small" href={record.payslipUrl} target="_blank" rel="noopener noreferrer">View</Button>
                          ) : (
                            <Button size="small" variant="outlined" onClick={() => handleGeneratePayslip(record)}>Generate</Button>
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                          <Box display="flex" gap={1} justifyContent="center">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => { e.stopPropagation(); handleEditPayroll(record); }}
                              disabled={!canMutate}
                              title={canMutate ? "Edit" : "No permission to edit"}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(record.id, "payroll"); }}
                              disabled={!canRemove}
                              title={canRemove ? "Delete" : "No permission to delete"}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <EmptyStateCard
                          icon={PaymentsIcon}
                          title="No payroll records found"
                          description="Generate payroll or adjust your search/filters."
                          cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                          contentSx={{ py: 2 }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredPayrollRecords.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number.parseInt(event.target.value, 10))
                setPage(0)
              }}
            />

            {/* Simple Wage Stream section */}
            {wageRequests.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Wage Stream Requests</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Requested</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {wageRequests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{hrState.employees.find(e => e.id === r.employeeId)?.firstName} {hrState.employees.find(e => e.id === r.employeeId)?.lastName}</TableCell>
                          <TableCell>{formatCurrency(r.amount)}</TableCell>
                          <TableCell><Chip label={r.status} size="small" /></TableCell>
                          <TableCell>{new Date(r.requestDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
              </>
            )}




        {/* Weekly Payroll Generation Tab Content */}
        {currentTab === 1 && (
          <>
            {/* Weekly Payroll Generation Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Weekly Payroll Generation
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Generate payroll records based on schedule data for a specific week.
              </Typography>
              
              {/* Date Information */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Using selected date: {format(selectedDate, 'MMM dd, yyyy')} ({dateType})
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>New:</strong> Generate payroll from approved schedules with full HMRC calculations. 
                  This uses the proper calculation engine and includes service charge support.
                </Typography>
              </Alert>
              
              <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={6}>
                  <Button
                    variant="contained"
                    onClick={generatePayrollFromApprovedSchedulesHandler}
                    disabled={loading}
                    startIcon={<PaymentsIcon />}
                    fullWidth
                    color="primary"
                    sx={{ height: '56px' }}
                  >
                    Generate from Approved Schedules
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Uses HMRC-compliant calculations from approved schedules
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="contained"
                    onClick={savePayroll}
                    disabled={loading || !isPayrollGenerated || generatedPayrollRecords.length === 0}
                    startIcon={<SaveIcon />}
                    fullWidth
                    color="success"
                    sx={{ height: '56px' }}
                  >
                    Save Payroll ({generatedPayrollRecords.length} records)
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Save generated payroll records to database
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Legacy Generation (Simple Calculations)
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      generateWeeklyPayroll()
                    }}
                    disabled={loading}
                    startIcon={<FilterListIcon />}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Generate Preview (Legacy)
                  </Button>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="outlined"
                    onClick={generatePayroll}
                    disabled={loading || weeklyPayrollData.length === 0}
                    startIcon={<PaymentsIcon />}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Generate Payroll (Legacy)
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Weekly Payroll Summary */}
            {weeklyPayrollData.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Payroll Summary - {dateType === 'week' ? 'Week' : dateType === 'month' ? 'Month' : 'Period'} of {format(selectedDate, 'MMM dd, yyyy')}
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {weeklyPayrollData.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Employees
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        £{weeklyPayrollData.reduce((sum, emp) => sum + emp.grossPay, 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Gross Pay
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        £{weeklyPayrollData.reduce((sum, emp) => sum + emp.totalDeductions, 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Deductions
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        £{weeklyPayrollData.reduce((sum, emp) => sum + emp.netPay, 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Net Pay
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                {/* Weekly Payroll Table */}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Hours Worked</TableCell>
                        <TableCell>Overtime</TableCell>
                        <TableCell>Hourly Rate</TableCell>
                        <TableCell>Regular Pay</TableCell>
                        <TableCell>Overtime Pay</TableCell>
                        <TableCell>Gross Pay</TableCell>
                        <TableCell>Deductions</TableCell>
                        <TableCell>Net Pay</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weeklyPayrollData.map((employee) => (
                        <TableRow 
                          key={employee.employeeId} 
                          hover
                          sx={{ 
                            backgroundColor: employee.totalHours === 0 ? 'rgba(255, 152, 0, 0.1)' : 'inherit',
                            '&:hover': {
                              backgroundColor: employee.totalHours === 0 ? 'rgba(255, 152, 0, 0.2)' : undefined
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Button
                                variant="text"
                                onClick={() => handleEmployeeClick(hrState.employees?.find(emp => emp.id === employee.employeeId)!)}
                                sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                              >
                                {employee.employeeName}
                              </Button>
                              {employee.totalHours === 0 && (
                                <Chip 
                                  label="No Hours" 
                                  size="small" 
                                  color="warning" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.totalHours || 0}</TableCell>
                          <TableCell>{employee.totalOvertimeHours || 0}</TableCell>
                          <TableCell>£{(employee.hourlyRate || 0).toFixed(2)}</TableCell>
                          <TableCell>£{(employee.regularPay || 0).toFixed(2)}</TableCell>
                          <TableCell>£{(employee.overtimePay || 0).toFixed(2)}</TableCell>
                          <TableCell>£{(employee.grossPay || 0).toFixed(2)}</TableCell>
                          <TableCell>£{(employee.totalDeductions || 0).toFixed(2)}</TableCell>
                          <TableCell>£{(employee.netPay || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleEmployeeClick(hrState.employees?.find(emp => emp.id === employee.employeeId)!)}
                            >
                              <SearchIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Employee Details Dialog */}
            <Dialog 
              open={showEmployeeDetails} 
              onClose={() => setShowEmployeeDetails(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">
                    {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} - Payroll Details` : 'Employee Details'}
                  </Typography>
                  <IconButton onClick={() => setShowEmployeeDetails(false)} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent>
                {selectedEmployee && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {dateType === 'week' ? 'Week' : dateType === 'month' ? 'Month' : 'Period'} of {format(selectedDate, 'MMM dd, yyyy')}
                    </Typography>
                    
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Start Time</TableCell>
                            <TableCell>End Time</TableCell>
                            <TableCell>Hours</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Shift Type</TableCell>
                            <TableCell>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {employeePayrollDetails.map((detail, index) => (
                            <TableRow key={index}>
                              <TableCell>{new Date(detail.date).toLocaleDateString()}</TableCell>
                              <TableCell>{detail.startTime}</TableCell>
                              <TableCell>{detail.endTime}</TableCell>
                              <TableCell>{detail.hours}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={detail.status} 
                                  size="small" 
                                  color={detail.status === 'completed' ? 'success' : 'default'}
                                />
                              </TableCell>
                              <TableCell>{detail.shiftType}</TableCell>
                              <TableCell>{detail.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowEmployeeDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={showBulkDialog} onClose={() => setShowBulkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Confirm Bulk Action</Typography>
            <IconButton onClick={() => setShowBulkDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to {bulkAction} {selectedPayrollRecords.length} payroll record(s)?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleBulkAction} 
            variant="contained" 
            color={bulkAction === "delete" ? "error" : "primary"} 
            disabled={loading}
          >
            {`Confirm ${bulkAction}`}
          </Button>
        </DialogActions>
      </Dialog>

        {/* Create/Edit Payroll Record Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{editMode ? "Edit Payroll Record" : "Create Payroll Record"}</Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleSelectChange}
                    label="Employee"
                    disabled={editMode}
                  >
                    {hrState.employees.map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select name="status" value={formData.status} onChange={handleSelectChange} label="Status">
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Pay Period Start"
                  value={typeof formData.payPeriodStart === 'string' ? parseISO(formData.payPeriodStart) : formData.payPeriodStart}
                  onChange={(date) => handleFormDateChange(date, "payPeriodStart")}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Pay Period End"
                  value={typeof formData.payPeriodEnd === 'string' ? parseISO(formData.payPeriodEnd) : formData.payPeriodEnd}
                  onChange={(date) => handleFormDateChange(date, "payPeriodEnd")}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hours Worked"
                  name="hoursWorked"
                  type="number"
                  value={formData.hoursWorked}
                  onChange={handleInputChange}
                  InputProps={{
                    inputProps: { min: 0, step: 0.5 },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Payment Date"
                  value={typeof formData.paymentDate === 'string' ? parseISO(formData.paymentDate) : formData.paymentDate}
                  onChange={(date) => handleFormDateChange(date, "paymentDate")}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Regular Pay"
                  name="regularPay"
                  type="number"
                  value={formData.regularPay}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Overtime Pay"
                  name="overtimePay"
                  type="number"
                  value={formData.overtimePay}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bonuses"
                  name="bonuses"
                  type="number"
                  value={formData.bonuses}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleSelectChange}
                    label="Payment Method"
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method} value={method}>
                        {method}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Deductions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Tax"
                      name="deductions.tax"
                      type="number"
                      value={formData.deductions.tax}
                      onChange={handleDeductionChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">£</InputAdornment>,
                        inputProps: { min: 0, step: 0.01 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Insurance"
                      name="deductions.insurance"
                      type="number"
                      value={formData.deductions.insurance}
                      onChange={handleDeductionChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">£</InputAdornment>,
                        inputProps: { min: 0, step: 0.01 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Retirement"
                      name="deductions.retirement"
                      type="number"
                      value={formData.deductions.retirement}
                      onChange={handleDeductionChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">£</InputAdornment>,
                        inputProps: { min: 0, step: 0.01 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Other"
                      name="deductions.other"
                      type="number"
                      value={formData.deductions.other}
                      onChange={handleDeductionChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">£</InputAdornment>,
                        inputProps: { min: 0, step: 0.01 },
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2">Gross Pay:</Typography>
                    <Typography variant="h6">{formatCurrency(formData.totalGross)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2">Total Deductions:</Typography>
                    <Typography variant="h6">
                      {formatCurrency(
                        formData.deductions.tax +
                          formData.deductions.insurance +
                          formData.deductions.retirement +
                          formData.deductions.other,
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2">Net Pay:</Typography>
                    <Typography variant="h6">{formatCurrency(formData.totalNet)}</Typography>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formData.notes || ""}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleSubmit}>
              {editMode ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Pay Period Dialog */}
        <Dialog open={periodDialogOpen} onClose={handleClosePeriodDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Create New Pay Period</Typography>
              <IconButton onClick={handleClosePeriodDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Period Name"
                  name="name"
                  value={periodFormData.name}
                  onChange={handlePeriodInputChange}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={periodFormData.startDate}
                  onChange={(date) => handlePeriodDateChange(date, "startDate")}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={periodFormData.endDate}
                  onChange={(date) => handlePeriodDateChange(date, "endDate")}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Pay Date"
                  value={periodFormData.payDate}
                  onChange={(date) => handlePeriodDateChange(date, "payDate")}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={periodFormData.status}
                    onChange={handlePeriodSelectChange}
                    label="Status"
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="processing">Processing</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleSubmitPeriod}>
              Create Period
            </Button>
          </DialogActions>
        </Dialog>
          </>
        )}

        {/* Service Charge Allocation Tab Content */}
        {currentTab === 2 && (
          <ServiceChargeAllocationPage />
        )}


        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this {itemToDelete?.type === "payroll" ? "payroll record" : "pay period"}?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification */}
        <Snackbar
          open={!!notification}
          autoHideDuration={6000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={() => setNotification(null)} severity={notification?.type} sx={{ width: "100%" }}>
            {notification?.message}
          </Alert>
        </Snackbar>

        {/* New CRUD Modal */}
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
            crudEntity: "payrollManagementModal1",
            crudMode,
            id: selectedPayrollForCRUD?.id,
            itemLabel: selectedPayrollForCRUD?.employeeName,
          }}
        >
          <PayrollCRUDForm
            ref={payrollCRUDFormRef}
            payrollEntry={selectedPayrollForCRUD}
            mode={crudMode}
            onSave={handleSavePayrollCRUD}
            employees={hrState.employees}
          />
        </CRUDModal>

        {/* Service Charge Allocation Dialog */}
        <Dialog 
          open={showServiceChargeDialog} 
          onClose={() => setShowServiceChargeDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Create Service Charge Allocation</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Pay Period Start"
                  value={serviceChargeFormData.payPeriodStart}
                  onChange={(date) => handleServiceChargeAllocationChange('payPeriodStart', date)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Pay Period End"
                  value={serviceChargeFormData.payPeriodEnd}
                  onChange={(date) => handleServiceChargeAllocationChange('payPeriodEnd', date)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Total Service Charge"
                  type="number"
                  value={serviceChargeFormData.totalServiceCharge}
                  onChange={(e) => handleServiceChargeAllocationChange('totalServiceCharge', parseFloat(e.target.value) || 0)}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Total Tips"
                  type="number"
                  value={serviceChargeFormData.totalTips}
                  onChange={(e) => handleServiceChargeAllocationChange('totalTips', parseFloat(e.target.value) || 0)}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>
                  }}
                />
              </Grid>

              {/* Allocation Method */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Allocation Method</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Allocation Method</InputLabel>
                  <Select
                    value={serviceChargeFormData.allocationMethod}
                    onChange={(e) => handleServiceChargeAllocationChange('allocationMethod', e.target.value)}
                    label="Allocation Method"
                  >
                    <MenuItem value="points">Points Based</MenuItem>
                    <MenuItem value="percentage">Percentage Based</MenuItem>
                    <MenuItem value="hybrid">Hybrid (Points + Percentage)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {serviceChargeFormData.allocationMethod === 'hybrid' && (
                <>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Points Weight"
                      type="number"
                      value={serviceChargeFormData.hybridPointsWeight || 0}
                      onChange={(e) => handleServiceChargeAllocationChange('hybridPointsWeight', parseFloat(e.target.value) || 0)}
                      fullWidth
                      inputProps={{ min: 0, max: 1, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Percentage Weight"
                      type="number"
                      value={serviceChargeFormData.hybridPercentageWeight || 0}
                      onChange={(e) => handleServiceChargeAllocationChange('hybridPercentageWeight', parseFloat(e.target.value) || 0)}
                      fullWidth
                      inputProps={{ min: 0, max: 1, step: 0.1 }}
                    />
                  </Grid>
                </>
              )}

              {/* Employee Allocations */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Typography variant="h6">Employee Allocations</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addEmployeeToAllocation}
                    size="small"
                  >
                    Add Employee
                  </Button>
                </Box>
              </Grid>

              {serviceChargeFormData.employeeAllocations.map((emp, index) => (
                <Grid item xs={12} key={index}>
                  <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Employee</InputLabel>
                          <Select
                            value={emp.employeeId}
                            onChange={(e) => handleEmployeeAllocationChange(index, 'employeeId', e.target.value)}
                            label="Employee"
                          >
                            {hrState.employees.map((employee) => (
                              <MenuItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <TextField
                          label="Base Salary"
                          type="number"
                          value={emp.baseSalary}
                          onChange={(e) => handleEmployeeAllocationChange(index, 'baseSalary', parseFloat(e.target.value) || 0)}
                          fullWidth
                          InputProps={{
                            startAdornment: <InputAdornment position="start">£</InputAdornment>
                          }}
                        />
                      </Grid>

                      {serviceChargeFormData.allocationMethod === 'points' && (
                        <Grid item xs={12} md={2}>
                          <TextField
                            label="Points"
                            type="number"
                            value={emp.points || 0}
                            onChange={(e) => handleEmployeeAllocationChange(index, 'points', parseFloat(e.target.value) || 0)}
                            fullWidth
                          />
                        </Grid>
                      )}

                      {serviceChargeFormData.allocationMethod === 'percentage' && (
                        <Grid item xs={12} md={2}>
                          <TextField
                            label="Percentage"
                            type="number"
                            value={emp.percentage || 0}
                            onChange={(e) => handleEmployeeAllocationChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                            fullWidth
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>
                            }}
                          />
                        </Grid>
                      )}

                      {serviceChargeFormData.allocationMethod === 'hybrid' && (
                        <>
                          <Grid item xs={12} md={1.5}>
                            <TextField
                              label="Points"
                              type="number"
                              value={emp.points || 0}
                              onChange={(e) => handleEmployeeAllocationChange(index, 'points', parseFloat(e.target.value) || 0)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={1.5}>
                            <TextField
                              label="Percentage"
                              type="number"
                              value={emp.percentage || 0}
                              onChange={(e) => handleEmployeeAllocationChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                              fullWidth
                              InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>
                              }}
                            />
                          </Grid>
                        </>
                      )}

                      <Grid item xs={12} md={2}>
                        <TextField
                          label="Notes"
                          value={emp.notes || ''}
                          onChange={(e) => handleEmployeeAllocationChange(index, 'notes', e.target.value)}
                          fullWidth
                          multiline
                          rows={1}
                        />
                      </Grid>

                      <Grid item xs={12} md={1}>
                        <IconButton
                          color="error"
                          onClick={() => removeEmployeeFromAllocation(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  value={serviceChargeFormData.notes || ''}
                  onChange={(e) => handleServiceChargeAllocationChange('notes', e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              variant="outlined" 
              onClick={generateServiceChargePreview}
              disabled={serviceChargeFormData.employeeAllocations.length === 0}
            >
              Preview
            </Button>
            <Button 
              variant="contained" 
              onClick={finalizeServiceChargeAllocation}
              disabled={loading || serviceChargeFormData.employeeAllocations.length === 0}
            >
              Finalize Allocation
            </Button>
          </DialogActions>
        </Dialog>

        {/* Service Charge Preview Dialog */}
        <Dialog 
          open={showServiceChargePreview} 
          onClose={() => setShowServiceChargePreview(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Service Charge Allocation Preview</DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Base Salary</TableCell>
                    <TableCell>Allocated Amount</TableCell>
                    <TableCell>Gross Pay</TableCell>
                    <TableCell>Deductions</TableCell>
                    <TableCell>Net Pay</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serviceChargePreview.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>{allocation.employeeName}</TableCell>
                      <TableCell>{allocation.department}</TableCell>
                      <TableCell>£{allocation.baseSalary.toFixed(2)}</TableCell>
                      <TableCell>£{allocation.allocatedAmount.toFixed(2)}</TableCell>
                      <TableCell>£{allocation.grossPay.toFixed(2)}</TableCell>
                      <TableCell>£{allocation.totalDeductions.toFixed(2)}</TableCell>
                      <TableCell>£{allocation.netPay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowServiceChargePreview(false)}>Close</Button>
            <Button 
              variant="contained" 
              onClick={finalizeServiceChargeAllocation}
              disabled={loading}
            >
              Finalize Allocation
            </Button>
          </DialogActions>
        </Dialog>


        {/* All Dialogs - shown regardless of tab */}
        {/* Payroll Record Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editMode ? "Edit Payroll Record" : "Add Payroll Record"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    label="Employee"
                  >
                    {(hrState.employees || []).map(emp => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {(emp as any).name || emp.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Pay Period Start"
                  type="date"
                  value={formData.payPeriodStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, payPeriodStart: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Pay Period End"
                  type="date"
                  value={formData.payPeriodEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, payPeriodEnd: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Regular Hours"
                  type="number"
                  value={(formData as any).regularHours || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, regularHours: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Overtime Hours"
                  type="number"
                  value={formData.overtimeHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hourly Rate (£)"
                  type="number"
                  value={(formData as any).hourlyRate || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bonuses (£)"
                  type="number"
                  value={formData.bonuses}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonuses: parseFloat(e.target.value) || 0 }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleSubmit}>
              {editMode ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteConfirmOpen} 
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this {itemToDelete?.type === "payroll" ? "payroll record" : "pay period"}?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Service Charge Dialog */}
        <Dialog 
          open={showServiceChargeDialog} 
          onClose={() => setShowServiceChargeDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Create Service Charge Allocation</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Service Charge Amount"
                  type="number"
                  value={serviceChargeFormData.totalServiceCharge}
                  onChange={(e) => setServiceChargeFormData(prev => ({
                    ...prev,
                    totalServiceCharge: parseFloat(e.target.value) || 0
                  }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Allocation Method</InputLabel>
                  <Select
                    value={serviceChargeFormData.allocationMethod}
                    onChange={(e) => setServiceChargeFormData(prev => ({
                      ...prev,
                      allocationMethod: e.target.value as 'points' | 'percentage' | 'hybrid'
                    }))}
                    label="Allocation Method"
                  >
                    <MenuItem value="points">Points System</MenuItem>
                    <MenuItem value="percentage">Percentage Based</MenuItem>
                    <MenuItem value="hybrid">Hybrid Method</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowServiceChargeDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={finalizeServiceChargeAllocation}
              disabled={loading}
            >
              Finalize Allocation
            </Button>
          </DialogActions>
        </Dialog>
      </>
      </Box>
    </LocalizationProvider>
  )
}

export default PayrollManagement
