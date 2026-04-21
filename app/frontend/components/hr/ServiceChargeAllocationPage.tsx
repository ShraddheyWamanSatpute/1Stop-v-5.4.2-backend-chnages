"use client"

import React, { useState, useEffect, useMemo } from 'react'
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
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Calculate as CalculateIcon,
  Preview as PreviewIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { DatePicker } from '@mui/x-date-pickers'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { useHR } from '../../../backend/context/HRContext'
import { useCompany } from '../../../backend/context/CompanyContext'
import type {
  ServiceChargeAllocation,
  ServiceChargeEmployeeAllocation,
  ServiceChargeRoleRule,
  Employee,
  Schedule,
} from '../../../backend/interfaces/HRs'
import { ref, get, set, update } from 'firebase/database'
import { db } from '../../../backend/services/Firebase'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const ServiceChargeAllocationPage: React.FC = () => {
  const { state: hrState, refreshEmployees, refreshSchedules } = useHR()
  const { state: companyState } = useCompany()
  
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info" | "warning"
  } | null>(null)
  
  const [tabValue, setTabValue] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateType, setDateType] = useState<"week" | "month">("week")
  
  // Allocation form state
  const [allocationForm, setAllocationForm] = useState<{
    payPeriodStart: Date | null
    payPeriodEnd: Date | null
    totalServiceCharge: number
    allocationMethod: "role_based" | "flat_rate" | "pot_system"
    roleBasedRules: ServiceChargeRoleRule[]
    flatRateAmount: number
    potSystemEnabled: boolean
    potSystemMethod: "hours_points" | "hours_only" | "points_only"
  }>({
    payPeriodStart: null,
    payPeriodEnd: null,
    totalServiceCharge: 0,
    allocationMethod: "role_based",
    roleBasedRules: [],
    flatRateAmount: 0,
    potSystemEnabled: false,
    potSystemMethod: "hours_points",
  })
  
  const [previewAllocations, setPreviewAllocations] = useState<ServiceChargeEmployeeAllocation[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [employeeSales, setEmployeeSales] = useState<Record<string, number>>({})
  
  // Get date range
  const getDateRange = () => {
    if (dateType === "week") {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      }
    } else {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      }
    }
  }
  
  // Initialize form with date range
  useEffect(() => {
    const range = getDateRange()
    setAllocationForm(prev => ({
      ...prev,
      payPeriodStart: range.start,
      payPeriodEnd: range.end,
    }))
  }, [selectedDate, dateType])
  
  // Load employee sales data (from POS/bills)
  useEffect(() => {
    const loadEmployeeSales = async () => {
      if (!companyState.selectedCompany?.id || !companyState.selectedSite?.id) return
      
      try {
        const range = getDateRange()
        const billsRef = ref(db, `companies/${companyState.selectedCompany.id}/sites/${companyState.selectedSite.id}/data/pos/bills`)
        const billsSnapshot = await get(billsRef)
        
        if (!billsSnapshot.exists()) return
        
        const bills = billsSnapshot.val()
        const sales: Record<string, number> = {}
        
        Object.values(bills).forEach((bill: any) => {
          const billDate = new Date(bill.createdAt || bill.date)
          if (billDate >= range.start && billDate <= range.end) {
            const employeeId = bill.employeeId || bill.servedBy
            if (employeeId) {
              sales[employeeId] = (sales[employeeId] || 0) + (bill.total || 0)
            }
          }
        })
        
        setEmployeeSales(sales)
      } catch (error) {
        console.error('Error loading employee sales:', error)
      }
    }
    
    loadEmployeeSales()
  }, [companyState.selectedCompany?.id, companyState.selectedSite?.id, selectedDate, dateType])
  
  // Calculate hours and points for employees in period
  const getEmployeeHoursAndPoints = useMemo(() => {
    const range = getDateRange()
    const employeeData: Record<string, { hours: number; points: number }> = {}
    
    hrState.schedules?.forEach((schedule: Schedule) => {
      const scheduleDate = new Date(schedule.date)
      if (scheduleDate >= range.start && scheduleDate <= range.end) {
        if (schedule.status === 'approved' || schedule.status === 'confirmed' || schedule.status === 'completed') {
          const employeeId = schedule.employeeId
          if (!employeeData[employeeId]) {
            employeeData[employeeId] = { hours: 0, points: 0 }
          }
          
          // Calculate hours
          const startTime = new Date(`${schedule.date}T${schedule.startTime}`)
          const endTime = schedule.clockOutTime
            ? new Date(`${schedule.date}T${schedule.clockOutTime}`)
            : new Date(`${schedule.date}T${schedule.endTime}`)
          const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
          employeeData[employeeId].hours += hours
          
          // Get points from employee (troncPoints)
          const employee = hrState.employees?.find((e: Employee) => e.id === employeeId)
          if (employee?.troncPoints) {
            employeeData[employeeId].points = employee.troncPoints
          }
        }
      }
    })
    
    return employeeData
  }, [hrState.schedules, hrState.employees, selectedDate, dateType])
  
  // Calculate preview allocations
  const calculatePreview = () => {
    if (!allocationForm.payPeriodStart || !allocationForm.payPeriodEnd || allocationForm.totalServiceCharge <= 0) {
      setNotification({ message: "Please set pay period dates and total service charge", type: "warning" })
      return
    }
    
    const allocations: ServiceChargeEmployeeAllocation[] = []
    const employeeHoursPoints = getEmployeeHoursAndPoints
    let remainingServiceCharge = allocationForm.totalServiceCharge
    
    // Step 1: Apply role-based allocations
    if (allocationForm.allocationMethod === "role_based" && allocationForm.roleBasedRules.length > 0) {
      hrState.employees?.forEach((employee: Employee) => {
        const rule = allocationForm.roleBasedRules.find(
          r => r.role === employee.role && (!r.department || r.department === employee.department)
        )
        
        if (rule) {
          let allocatedAmount = 0
          
          if (rule.allocationType === "percentage_of_sales") {
            const sales = employeeSales[employee.id] || 0
            if (sales >= (rule.minimumSales || 0)) {
              allocatedAmount = sales * (rule.percentage || 0) / 100
              if (rule.maximumAllocation) {
                allocatedAmount = Math.min(allocatedAmount, rule.maximumAllocation)
              }
            }
          } else if (rule.allocationType === "flat_rate") {
            allocatedAmount = rule.flatAmount || 0
          } else if (rule.allocationType === "percentage_of_total") {
            allocatedAmount = allocationForm.totalServiceCharge * (rule.percentage || 0) / 100
          }
          
          if (allocatedAmount > 0) {
            remainingServiceCharge -= allocatedAmount
            allocations.push({
              id: `alloc_${employee.id}`,
              allocationId: '',
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              department: employee.department || '',
              role: employee.role || '',
              allocatedAmount,
              baseSalary: 0,
              grossPay: 0,
              deductions: { tax: 0, nationalInsurance: 0, pension: 0, insurance: 0, other: 0 },
              totalDeductions: 0,
              netPay: 0,
              status: 'pending',
            })
          }
        }
      })
    }
    
    // Step 2: Apply flat rate if enabled
    if (allocationForm.allocationMethod === "flat_rate") {
      hrState.employees?.forEach((employee: Employee) => {
        const hoursData = employeeHoursPoints[employee.id]
        if (hoursData && hoursData.hours > 0) {
          allocations.push({
            id: `alloc_${employee.id}`,
            allocationId: '',
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department || '',
            role: employee.role || '',
            allocatedAmount: allocationForm.flatRateAmount,
            baseSalary: 0,
            grossPay: 0,
            deductions: { tax: 0, nationalInsurance: 0, pension: 0, insurance: 0, other: 0 },
            totalDeductions: 0,
            netPay: 0,
            status: 'pending',
          })
          remainingServiceCharge -= allocationForm.flatRateAmount
        }
      })
    }
    
    // Step 3: Apply pot system to remainder
    if (allocationForm.potSystemEnabled && remainingServiceCharge > 0) {
      let totalPointsHours = 0
      
      // Calculate total points × hours
      Object.entries(employeeHoursPoints).forEach(([employeeId, data]) => {
        if (allocationForm.potSystemMethod === "hours_points") {
          totalPointsHours += data.hours * (data.points || 1)
        } else if (allocationForm.potSystemMethod === "hours_only") {
          totalPointsHours += data.hours
        } else if (allocationForm.potSystemMethod === "points_only") {
          totalPointsHours += data.points || 1
        }
      })
      
      if (totalPointsHours > 0) {
        const servicePerPointHour = remainingServiceCharge / totalPointsHours
        
        Object.entries(employeeHoursPoints).forEach(([employeeId, data]) => {
          const employee = hrState.employees?.find((e: Employee) => e.id === employeeId)
          if (!employee) return
          
          let employeePointsHours = 0
          if (allocationForm.potSystemMethod === "hours_points") {
            employeePointsHours = data.hours * (data.points || 1)
          } else if (allocationForm.potSystemMethod === "hours_only") {
            employeePointsHours = data.hours
          } else if (allocationForm.potSystemMethod === "points_only") {
            employeePointsHours = data.points || 1
          }
          
          const allocatedAmount = employeePointsHours * servicePerPointHour
          
          // Check if employee already has allocation from role-based
          const existingAlloc = allocations.find(a => a.employeeId === employeeId)
          if (existingAlloc) {
            existingAlloc.allocatedAmount += allocatedAmount
          } else {
            allocations.push({
              id: `alloc_${employee.id}`,
              allocationId: '',
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              department: employee.department || '',
              role: employee.role || '',
              allocatedAmount,
              baseSalary: 0,
              grossPay: 0,
              deductions: { tax: 0, nationalInsurance: 0, pension: 0, insurance: 0, other: 0 },
              totalDeductions: 0,
              netPay: 0,
              status: 'pending',
            })
          }
        })
      }
    }
    
    setPreviewAllocations(allocations)
    setShowPreview(true)
  }
  
  // Save allocation
  const saveAllocation = async () => {
    if (!companyState.selectedCompany?.id || !companyState.selectedSite?.id) {
      setNotification({ message: "Please select a company and site", type: "error" })
      return
    }
    
    if (previewAllocations.length === 0) {
      setNotification({ message: "Please calculate preview first", type: "warning" })
      return
    }
    
    try {
      setLoading(true)
      
      const allocationId = `sca_${Date.now()}`
      const allocation: ServiceChargeAllocation = {
        id: allocationId,
        payPeriodId: `period_${allocationForm.payPeriodStart?.getTime()}`,
        payPeriodStart: allocationForm.payPeriodStart!.toISOString().split('T')[0],
        payPeriodEnd: allocationForm.payPeriodEnd!.toISOString().split('T')[0],
        totalServiceCharge: allocationForm.totalServiceCharge,
        totalTips: 0,
        allocationMethod: allocationForm.allocationMethod,
        roleBasedRules: allocationForm.roleBasedRules,
        flatRateAmount: allocationForm.flatRateAmount,
        potSystemEnabled: allocationForm.potSystemEnabled,
        potSystemMethod: allocationForm.potSystemMethod,
        status: 'draft',
        createdAt: new Date().toISOString(),
        auditTrail: [],
        employeeSales,
      }
      
      const allocationRef = ref(db, `companies/${companyState.selectedCompany.id}/sites/${companyState.selectedSite.id}/data/hr/serviceChargeAllocations/${allocationId}`)
      await set(allocationRef, allocation)
      
      // Save employee allocations
      for (const alloc of previewAllocations) {
        const employeeAllocRef = ref(db, `companies/${companyState.selectedCompany.id}/sites/${companyState.selectedSite.id}/data/hr/serviceChargeEmployeeAllocations/${alloc.id}`)
        await set(employeeAllocRef, {
          ...alloc,
          allocationId,
        })
      }
      
      setNotification({ message: "Service charge allocation saved successfully", type: "success" })
      setShowPreview(false)
      setPreviewAllocations([])
      
    } catch (error) {
      console.error('Error saving allocation:', error)
      setNotification({ message: "Error saving service charge allocation", type: "error" })
    } finally {
      setLoading(false)
    }
  }
  
  // Add role rule
  const addRoleRule = () => {
    setAllocationForm(prev => ({
      ...prev,
      roleBasedRules: [
        ...prev.roleBasedRules,
        {
          id: `rule_${Date.now()}`,
          role: '',
          allocationType: 'percentage_of_sales',
          percentage: 0,
        },
      ],
    }))
  }
  
  // Update role rule
  const updateRoleRule = (ruleId: string, updates: Partial<ServiceChargeRoleRule>) => {
    setAllocationForm(prev => ({
      ...prev,
      roleBasedRules: prev.roleBasedRules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ),
    }))
  }
  
  // Remove role rule
  const removeRoleRule = (ruleId: string) => {
    setAllocationForm(prev => ({
      ...prev,
      roleBasedRules: prev.roleBasedRules.filter(rule => rule.id !== ruleId),
    }))
  }
  
  // Get unique roles from employees
  const availableRoles = useMemo(() => {
    const roles = new Set<string>()
    hrState.employees?.forEach((emp: Employee) => {
      if (emp.role) roles.add(emp.role)
    })
    return Array.from(roles)
  }, [hrState.employees])
  
  // Export to Excel
  const handleExportExcel = () => {
    if (previewAllocations.length === 0) {
      setNotification({ message: "No allocation data to export", type: "warning" })
      return
    }
    
    // Prepare data
    const headers = [
      "Employee Name",
      "Employee ID",
      "Role",
      "Department",
      "Allocated Amount",
      "Sales (if applicable)",
      "Hours Worked",
      "Points",
    ]
    
    const rows = previewAllocations.map((alloc) => {
      const employee = hrState.employees?.find((e: Employee) => e.id === alloc.employeeId)
      const hoursData = getEmployeeHoursAndPoints[alloc.employeeId]
      const sales = employeeSales[alloc.employeeId] || 0
      
      return [
        alloc.employeeName,
        alloc.employeeId,
        alloc.role,
        alloc.department,
        alloc.allocatedAmount,
        sales > 0 ? sales : 'N/A',
        hoursData?.hours || 0,
        employee?.troncPoints || 0,
      ]
    })
    
    // Add summary row
    const totalAllocated = previewAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      totalAllocated,
      '',
      '',
      '',
    ])
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Employee Name
      { wch: 15 }, // Employee ID
      { wch: 20 }, // Role
      { wch: 20 }, // Department
      { wch: 18 }, // Allocated Amount
      { wch: 18 }, // Sales
      { wch: 15 }, // Hours
      { wch: 12 }, // Points
    ]
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Service Charge Allocation')
    
    // Add summary sheet
    const summaryData = [
      ['Service Charge Allocation Summary'],
      [''],
      ['Period Start', allocationForm.payPeriodStart?.toISOString().split('T')[0] || 'N/A'],
      ['Period End', allocationForm.payPeriodEnd?.toISOString().split('T')[0] || 'N/A'],
      ['Total Service Charge', allocationForm.totalServiceCharge],
      ['Allocation Method', allocationForm.allocationMethod],
      ['Total Allocated', totalAllocated],
      ['Number of Employees', previewAllocations.length],
    ]
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
    
    // Write file
    const fileName = `service_charge_allocation_${allocationForm.payPeriodStart?.toISOString().split('T')[0] || 'unknown'}.xlsx`
    XLSX.writeFile(wb, fileName)
    setNotification({ message: "Excel file exported successfully", type: "success" })
  }
  
  // Export to PDF
  const handleExportPDF = () => {
    if (previewAllocations.length === 0) {
      setNotification({ message: "No allocation data to export", type: "warning" })
      return
    }
    
    const doc = new jsPDF('landscape')
    
    // Add title
    doc.setFontSize(16)
    doc.text('Service Charge Allocation Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Period: ${allocationForm.payPeriodStart ? format(allocationForm.payPeriodStart, 'dd MMM yyyy') : 'N/A'} - ${allocationForm.payPeriodEnd ? format(allocationForm.payPeriodEnd, 'dd MMM yyyy') : 'N/A'}`, 14, 22)
    doc.text(`Total Service Charge: £${allocationForm.totalServiceCharge.toFixed(2)}`, 14, 28)
    doc.text(`Allocation Method: ${allocationForm.allocationMethod}`, 14, 34)
    
    // Prepare table data
    const tableData = previewAllocations.map((alloc) => {
      const employee = hrState.employees?.find((e: Employee) => e.id === alloc.employeeId)
      const hoursData = getEmployeeHoursAndPoints[alloc.employeeId]
      const sales = employeeSales[alloc.employeeId] || 0
      
      return [
        alloc.employeeName,
        alloc.role,
        alloc.department,
        `£${alloc.allocatedAmount.toFixed(2)}`,
        sales > 0 ? `£${sales.toFixed(2)}` : 'N/A',
        hoursData?.hours ? hoursData.hours.toFixed(1) : '0',
        (employee?.troncPoints || 0).toString(),
      ]
    })
    
    // Add total row
    const totalAllocated = previewAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
    tableData.push([
      'TOTAL',
      '',
      '',
      `£${totalAllocated.toFixed(2)}`,
      '',
      '',
      '',
    ])
    
    // Add table
    ;(doc as any).autoTable({
      head: [['Employee', 'Role', 'Department', 'Allocated Amount', 'Sales', 'Hours', 'Points']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
      },
      margin: { top: 40 },
      didParseCell: (data: any) => {
        // Make total row bold
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [240, 240, 240]
        }
      },
    })
    
    // Add allocation rules summary if role-based
    if (allocationForm.allocationMethod === 'role_based' && allocationForm.roleBasedRules.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 40
      doc.setFontSize(10)
      doc.text('Allocation Rules:', 14, finalY + 15)
      
      allocationForm.roleBasedRules.forEach((rule, index) => {
        const yPos = finalY + 22 + (index * 7)
        doc.setFontSize(8)
        doc.text(
          `${rule.role}: ${rule.allocationType === 'percentage_of_sales' ? `${rule.percentage}% of sales` : rule.allocationType === 'flat_rate' ? `£${rule.flatAmount}` : `${rule.percentage}% of total`}`,
          14,
          yPos
        )
      })
    }
    
    // Save PDF
    const fileName = `service_charge_allocation_${allocationForm.payPeriodStart?.toISOString().split('T')[0] || 'unknown'}.pdf`
    doc.save(fileName)
    setNotification({ message: "PDF file exported successfully", type: "success" })
  }
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Service Charge Allocation
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Period Type</InputLabel>
                <Select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as "week" | "month")}
                  label="Period Type"
                >
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Period: {allocationForm.payPeriodStart && allocationForm.payPeriodEnd
                  ? `${format(allocationForm.payPeriodStart, 'MMM dd')} - ${format(allocationForm.payPeriodEnd, 'MMM dd, yyyy')}`
                  : 'Not set'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Allocation Rules" />
          <Tab label="Preview & Save" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Total Service Charge"
                  type="number"
                  value={allocationForm.totalServiceCharge}
                  onChange={(e) => setAllocationForm(prev => ({
                    ...prev,
                    totalServiceCharge: parseFloat(e.target.value) || 0,
                  }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Allocation Method</InputLabel>
                  <Select
                    value={allocationForm.allocationMethod}
                    onChange={(e) => setAllocationForm(prev => ({
                      ...prev,
                      allocationMethod: e.target.value as any,
                    }))}
                    label="Allocation Method"
                  >
                    <MenuItem value="role_based">Role-Based (e.g., 45% of sales)</MenuItem>
                    <MenuItem value="flat_rate">Flat Rate</MenuItem>
                    <MenuItem value="pot_system">Pot System (Hours × Points)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Role-Based Rules */}
              {allocationForm.allocationMethod === "role_based" && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Role-Based Allocation Rules</Typography>
                    <Button startIcon={<AddIcon />} onClick={addRoleRule} variant="outlined" size="small">
                      Add Rule
                    </Button>
                  </Box>
                  
                  {allocationForm.roleBasedRules.map((rule) => (
                    <Accordion key={rule.id} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>
                          {rule.role || 'New Rule'} - {rule.allocationType === 'percentage_of_sales' 
                            ? `${rule.percentage}% of sales`
                            : rule.allocationType === 'flat_rate'
                            ? `£${rule.flatAmount}`
                            : `${rule.percentage}% of total`}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                              <InputLabel>Role</InputLabel>
                              <Select
                                value={rule.role}
                                onChange={(e) => updateRoleRule(rule.id, { role: e.target.value })}
                                label="Role"
                              >
                                {availableRoles.map(role => (
                                  <MenuItem key={role} value={role}>{role}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                              <InputLabel>Allocation Type</InputLabel>
                              <Select
                                value={rule.allocationType}
                                onChange={(e) => updateRoleRule(rule.id, { allocationType: e.target.value as any })}
                                label="Allocation Type"
                              >
                                <MenuItem value="percentage_of_sales">% of Sales</MenuItem>
                                <MenuItem value="flat_rate">Flat Rate</MenuItem>
                                <MenuItem value="percentage_of_total">% of Total</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          {rule.allocationType === "percentage_of_sales" && (
                            <>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Percentage"
                                  type="number"
                                  value={rule.percentage || 0}
                                  onChange={(e) => updateRoleRule(rule.id, { percentage: parseFloat(e.target.value) || 0 })}
                                  InputProps={{
                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Minimum Sales"
                                  type="number"
                                  value={rule.minimumSales || 0}
                                  onChange={(e) => updateRoleRule(rule.id, { minimumSales: parseFloat(e.target.value) || 0 })}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Maximum Allocation"
                                  type="number"
                                  value={rule.maximumAllocation || 0}
                                  onChange={(e) => updateRoleRule(rule.id, { maximumAllocation: parseFloat(e.target.value) || 0 })}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                                  }}
                                />
                              </Grid>
                            </>
                          )}
                          {rule.allocationType === "flat_rate" && (
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label="Flat Amount"
                                type="number"
                                value={rule.flatAmount || 0}
                                onChange={(e) => updateRoleRule(rule.id, { flatAmount: parseFloat(e.target.value) || 0 })}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                                }}
                              />
                            </Grid>
                          )}
                          {rule.allocationType === "percentage_of_total" && (
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label="Percentage"
                                type="number"
                                value={rule.percentage || 0}
                                onChange={(e) => updateRoleRule(rule.id, { percentage: parseFloat(e.target.value) || 0 })}
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                }}
                              />
                            </Grid>
                          )}
                          <Grid item xs={12}>
                            <Button
                              startIcon={<DeleteIcon />}
                              onClick={() => removeRoleRule(rule.id)}
                              color="error"
                              size="small"
                            >
                              Remove Rule
                            </Button>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Grid>
              )}
              
              {/* Flat Rate */}
              {allocationForm.allocationMethod === "flat_rate" && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Flat Rate Amount"
                    type="number"
                    value={allocationForm.flatRateAmount}
                    onChange={(e) => setAllocationForm(prev => ({
                      ...prev,
                      flatRateAmount: parseFloat(e.target.value) || 0,
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    }}
                  />
                </Grid>
              )}
              
              {/* Pot System */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={allocationForm.potSystemEnabled}
                      onChange={(e) => setAllocationForm(prev => ({
                        ...prev,
                        potSystemEnabled: e.target.checked,
                      }))}
                    />
                  }
                  label="Enable Pot System (for remainder after role-based/flat rate)"
                />
              </Grid>
              
              {allocationForm.potSystemEnabled && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Pot System Method</InputLabel>
                    <Select
                      value={allocationForm.potSystemMethod}
                      onChange={(e) => setAllocationForm(prev => ({
                        ...prev,
                        potSystemMethod: e.target.value as any,
                      }))}
                      label="Pot System Method"
                    >
                      <MenuItem value="hours_points">Hours × Points</MenuItem>
                      <MenuItem value="hours_only">Hours Only</MenuItem>
                      <MenuItem value="points_only">Points Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<CalculateIcon />}
                  onClick={calculatePreview}
                  disabled={loading || allocationForm.totalServiceCharge <= 0}
                  size="large"
                >
                  Calculate Preview
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {showPreview && previewAllocations.length > 0 ? (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Allocation Preview</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ExcelIcon />}
                    onClick={handleExportExcel}
                    disabled={loading}
                    color="success"
                  >
                    Export Excel
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    onClick={handleExportPDF}
                    disabled={loading}
                    color="error"
                  >
                    Export PDF
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveAllocation}
                    disabled={loading}
                  >
                    Save Allocation
                  </Button>
                </Box>
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Total allocated: £{previewAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0).toFixed(2)}
                {' '}out of £{allocationForm.totalServiceCharge.toFixed(2)}
              </Alert>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Allocated Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewAllocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell>{alloc.employeeName}</TableCell>
                        <TableCell>{alloc.role}</TableCell>
                        <TableCell>{alloc.department}</TableCell>
                        <TableCell align="right">£{alloc.allocatedAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Alert severity="info">
                Please configure allocation rules and click "Calculate Preview" to see the allocation breakdown.
              </Alert>
            </Paper>
          )}
        </TabPanel>
        
        <Snackbar
          open={!!notification}
          autoHideDuration={6000}
          onClose={() => setNotification(null)}
        >
          <Alert severity={notification?.type || "info"} onClose={() => setNotification(null)}>
            {notification?.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  )
}

export default ServiceChargeAllocationPage

