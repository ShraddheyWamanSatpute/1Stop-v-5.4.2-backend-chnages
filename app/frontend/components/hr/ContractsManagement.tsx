import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useHR } from '../../../backend/context/HRContext'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../reusable/CRUDModal'
import ContractCRUDForm, { type ContractCRUDFormHandle } from './forms/ContractCRUDForm'
import DataHeader from '../reusable/DataHeader'
import { useLocation } from "react-router-dom"
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material'
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material'
import { Employee, Contract, ContractTemplate } from '../../../backend/interfaces/HRs'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"

const ContractsManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "employees")
  const canRemove = canDelete("hr", "employees")
  const { 
    state, 
    fetchContractTemplates, 
    createContractTemplate,
    updateContractTemplate,
    deleteContractTemplate,
    initializeDefaultContractTemplates,
    refreshContracts,
    addContract,
    updateContract,
    deleteContract,
  } = useHR()
  
  const [tab, setTab] = useState(0)
  const templates = state.contractTemplates || []
  const contracts = state.contracts || []
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [loading, setLoading] = useState(false)

  // CRUD Modal states
  const [contractCRUDModalOpen, setContractCRUDModalOpen] = useState(false)
  const [selectedContractForCRUD, setSelectedContractForCRUD] = useState<any>(null)
  const [contractCrudMode, setContractCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const contractCRUDFormRef = useRef<ContractCRUDFormHandle | null>(null)

  // Template Dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState<{ name: string; bodyHtml: string }>({ name: '', bodyHtml: '' })
  const [templateMode, setTemplateMode] = useState<'create' | 'edit'>('create')

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'template' | 'contract', id: string, name: string } | null>(null)

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  // Must match the current tab's available sort options (prevents MUI out-of-range warnings)
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Ensure sort value is always valid for the active tab.
  useEffect(() => {
    const allowed = tab === 0 ? ['name', 'createdAt'] : ['contractTitle', 'status', 'createdAt']
    if (!allowed.includes(sortBy)) {
      setSortBy(allowed[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; use explicit refresh actions instead.

  // Update selected contract when contracts state changes (after update/refresh)
  useEffect(() => {
    if (selectedContractForCRUD?.id && contracts.length > 0) {
      const updatedContract = contracts.find((c: any) => c.id === selectedContractForCRUD.id)
      if (updatedContract && JSON.stringify(updatedContract) !== JSON.stringify(selectedContractForCRUD)) {
        setSelectedContractForCRUD(updatedContract)
      }
    }
  }, [contracts, selectedContractForCRUD?.id])

  // Template CRUD handlers
  const handleOpenTemplateDialog = (template: ContractTemplate | null = null, mode: 'create' | 'edit' = 'create') => {
    if (!canMutate) return
    setSelectedTemplate(template)
    setTemplateMode(mode)
    if (template) {
      setTemplateForm({ name: template.name, bodyHtml: template.bodyHtml })
    } else {
      setTemplateForm({ name: '', bodyHtml: '' })
    }
    setTemplateDialogOpen(true)
  }

  const handleCloseTemplateDialog = () => {
    setTemplateDialogOpen(false)
    setSelectedTemplate(null)
    setTemplateForm({ name: '', bodyHtml: '' })
  }

  const handleSaveTemplate = async () => {
    if (!canMutate) return
    if (!templateForm.name || !templateForm.bodyHtml) {
      setSnackbar({ open: true, message: 'Please fill in all fields', severity: 'error' })
      return
    }

    try {
      setLoading(true)
      if (templateMode === 'create') {
        const newTemplate = await createContractTemplate({
          name: templateForm.name,
          bodyHtml: templateForm.bodyHtml,
          defaultType: 'permanent',
          terms: [],
          active: true,
          createdBy: 'user',
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
        if (newTemplate) {
          setSnackbar({ open: true, message: 'Template created successfully', severity: 'success' })
        }
      } else if (templateMode === 'edit' && selectedTemplate) {
        const updatedTemplate = await updateContractTemplate(selectedTemplate.id, {
          name: templateForm.name,
          bodyHtml: templateForm.bodyHtml,
          updatedAt: Date.now()
        })
        if (updatedTemplate) {
          setSnackbar({ open: true, message: 'Template updated successfully', severity: 'success' })
        }
      }
      handleCloseTemplateDialog()
    } catch (error) {
      console.error('Error saving template:', error)
      setSnackbar({ open: true, message: `Failed to ${templateMode} template`, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!canRemove) return
    setItemToDelete({ type: 'template', id: templateId, name: templateName })
    setDeleteConfirmOpen(true)
  }

  // Contract CRUD handlers
  const handleOpenContractCRUD = (contract: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedContractForCRUD(contract)
    setContractCrudMode(mode)
    setContractCRUDModalOpen(true)
  }

  const handleCloseContractCRUD = () => {
    setContractCRUDModalOpen(false)
    setSelectedContractForCRUD(null)
    setContractCrudMode('create')
  }

  const handleSaveContractCRUD = async (contractData: any) => {
    if (!canMutate) return
    try {
      setLoading(true)
      if (contractCrudMode === 'create') {
        const result = await addContract(contractData)
        if (result) {
          await refreshContracts()
          setSnackbar({ open: true, message: 'Contract created successfully', severity: 'success' })
        } else {
          setSnackbar({ open: true, message: 'Failed to create contract', severity: 'error' })
        }
      } else if (contractCrudMode === 'edit' && selectedContractForCRUD) {
        const result = await updateContract(selectedContractForCRUD.id, contractData)
        if (result) {
          // Force refresh contracts to get latest data
          await refreshContracts()
          
          // Update the selected contract with the result so form shows updated data if reopened
          setSelectedContractForCRUD(result)
          
          setSnackbar({ open: true, message: 'Contract updated successfully', severity: 'success' })
        } else {
          setSnackbar({ open: true, message: 'Failed to update contract', severity: 'error' })
        }
      }
      
      // Don't close immediately - let user see the success message
      // Only close if it's a create operation or if there was an error
      if (contractCrudMode === 'create' || !contractCrudMode) {
        handleCloseContractCRUD()
      }
    } catch (error) {
      console.error('Error saving contract:', error)
      setSnackbar({ open: true, message: `Failed to ${contractCrudMode === 'create' ? 'create' : 'update'} contract`, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContract = async (contractId: string, contractTitle: string) => {
    if (!canRemove) return
    setItemToDelete({ type: 'contract', id: contractId, name: contractTitle })
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!canRemove) return
    if (!itemToDelete) return

    try {
      setLoading(true)
      if (itemToDelete.type === 'template') {
        await deleteContractTemplate(itemToDelete.id)
        setSnackbar({ open: true, message: 'Template deleted successfully', severity: 'success' })
      } else {
        await deleteContract(itemToDelete.id)
        await refreshContracts()
        setSnackbar({ open: true, message: 'Contract deleted successfully', severity: 'success' })
      }
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Error deleting item:', error)
      setSnackbar({ open: true, message: 'Failed to delete item', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Utility functions
  const handleCopyLink = async (contract: Contract) => {
    const shareLink = `${window.location.origin}/contract/${contract.id}`
    try {
      await navigator.clipboard.writeText(shareLink)
      setSnackbar({ open: true, message: 'Link copied to clipboard', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' })
    }
  }

  const handleSendEmail = (contract: Contract) => {
    const employee = state.employees.find((e: Employee) => e.id === contract.employeeId)
    if (!employee) return

    const shareLink = `${window.location.origin}/contract/${contract.id}`
    const subject = encodeURIComponent(`Contract: ${contract.contractTitle || 'Employment Contract'}`)
    const emailBody = encodeURIComponent(`Hello ${employee.firstName},\n\nPlease review and sign your contract here: ${shareLink}\n\nThanks`)
    
    window.open(`mailto:${employee.email}?subject=${subject}&body=${emailBody}`, "_blank")
  }

  const handleSendWhatsApp = (contract: Contract) => {
    const employee = state.employees.find((e: Employee) => e.id === contract.employeeId)
    if (!employee || !employee.phone) return

    const shareLink = `${window.location.origin}/contract/${contract.id}`
    const text = encodeURIComponent(`Hello ${employee.firstName}, please review and sign your contract: ${shareLink}`)
    const phoneNumber = employee.phone.replace(/\D/g, '')
    
    window.open(`https://wa.me/${phoneNumber}?text=${text}`, "_blank")
  }

  const handleDownloadPDF = (contract: Contract) => {
    try {
      const doc = new jsPDF()
      const employee = state.employees.find((e: Employee) => e.id === contract.employeeId)
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
      const contractTitle = contract.contractTitle || `${contract.type} Contract - ${employeeName}`
      
      // Add title
      doc.setFontSize(16)
      doc.text(contractTitle, 14, 20)
      
      // Add contract details
      doc.setFontSize(10)
      let y = 30
      doc.text(`Employee: ${employeeName}`, 14, y)
      y += 7
      doc.text(`Type: ${contract.type || 'N/A'}`, 14, y)
      y += 7
      doc.text(`Status: ${contract.status || 'N/A'}`, 14, y)
      y += 7
      doc.text(`Start Date: ${contract.startDate ? format(new Date(contract.startDate), 'dd MMM yyyy') : 'N/A'}`, 14, y)
      y += 7
      if (contract.endDate) {
        doc.text(`End Date: ${format(new Date(contract.endDate), 'dd MMM yyyy')}`, 14, y)
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
      
      setSnackbar({ open: true, message: 'PDF downloaded successfully', severity: 'success' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      setSnackbar({ open: true, message: 'Failed to generate PDF', severity: 'error' })
    }
  }

  // DataHeader handlers
  const handleSortChange = (value: string, direction: 'asc' | 'desc') => {
    setSortBy(value)
    setSortOrder(direction)
  }

  const handleRefresh = async () => {
    try {
      setLoading(true)
      await refreshContracts()
      await fetchContractTemplates()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const data = tab === 0 ? templates : sortedContracts
    const headers = tab === 0 
      ? ['Name', 'Type', 'Created', 'Status']
      : ['Title', 'Employee', 'Type', 'Status', 'Created']
    
    const csvData = data.map((item: any) => {
      if (tab === 0) {
        return {
          Name: item.name,
          Type: item.defaultType || 'N/A',
          Created: item.createdAt ? format(new Date(item.createdAt), 'yyyy-MM-dd') : 'N/A',
          Status: item.active ? 'Active' : 'Inactive'
        }
      } else {
        const employee = state.employees.find((e: Employee) => e.id === item.employeeId)
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'
        return {
          Title: item.contractTitle || `${item.type} Contract`,
          Employee: employeeName,
          Type: item.type || 'N/A',
          Status: item.status || 'N/A',
          Created: item.createdAt ? format(new Date(item.createdAt), 'yyyy-MM-dd') : 'N/A'
        }
      }
    })
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tab === 0 ? 'contract-templates' : 'contracts'}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    setSnackbar({ open: true, message: 'CSV exported successfully', severity: 'success' })
  }

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.bodyHtml || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [templates, searchTerm])

  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      let aValue = ''
      let bValue = ''
      
      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'createdAt':
          aValue = a.createdAt?.toString() || ''
          bValue = b.createdAt?.toString() || ''
          break
        default:
          aValue = a.name
          bValue = b.name
      }
      
      const comparison = aValue.localeCompare(bValue)
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredTemplates, sortBy, sortOrder])

  // Filter and sort contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const employee = state.employees.find((e: Employee) => e.id === contract.employeeId)
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : ''
      const contractTitle = contract.contractTitle || `${contract.type} Contract - ${employeeName}`
      
      const matchesSearch = contractTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contract.type?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(contract.status)
      
      return matchesSearch && matchesStatus
    })
  }, [contracts, searchTerm, statusFilter, state.employees])

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      let aValue = ''
      let bValue = ''
      
      switch (sortBy) {
        case 'contractTitle':
          const aEmployee = state.employees.find((e: Employee) => e.id === a.employeeId)
          const bEmployee = state.employees.find((e: Employee) => e.id === b.employeeId)
          const aEmployeeName = aEmployee ? `${aEmployee.firstName} ${aEmployee.lastName}` : ''
          const bEmployeeName = bEmployee ? `${bEmployee.firstName} ${bEmployee.lastName}` : ''
          aValue = a.contractTitle || `${a.type} Contract - ${aEmployeeName}`
          bValue = b.contractTitle || `${b.type} Contract - ${bEmployeeName}`
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'createdAt':
          aValue = a.createdAt?.toString() || ''
          bValue = b.createdAt?.toString() || ''
          break
        default:
          const aEmployeeDefault = state.employees.find((e: Employee) => e.id === a.employeeId)
          const bEmployeeDefault = state.employees.find((e: Employee) => e.id === b.employeeId)
          const aEmployeeNameDefault = aEmployeeDefault ? `${aEmployeeDefault.firstName} ${aEmployeeDefault.lastName}` : ''
          const bEmployeeNameDefault = bEmployeeDefault ? `${bEmployeeDefault.firstName} ${bEmployeeDefault.lastName}` : ''
          aValue = a.contractTitle || `${a.type} Contract - ${aEmployeeNameDefault}`
          bValue = b.contractTitle || `${b.type} Contract - ${bEmployeeNameDefault}`
      }
      
      const comparison = aValue.localeCompare(bValue)
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredContracts, sortBy, sortOrder, state.employees])

  // DataHeader configuration
  const filters = [
    {
      label: "Status",
      options: [
        { id: "active", name: "Active", color: "#4caf50" },
        { id: "inactive", name: "Inactive", color: "#757575" },
        { id: "expired", name: "Expired", color: "#f44336" },
        { id: "terminated", name: "Terminated", color: "#f44336" },
        { id: "draft", name: "Draft", color: "#9e9e9e" },
        { id: "pending_signature", name: "Pending Signature", color: "#ff9800" },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
  ]

  const sortOptions = tab === 0 
    ? [
        { value: "name", label: "Name" },
        { value: "createdAt", label: "Created Date" },
      ]
    : [
        { value: "contractTitle", label: "Title" },
        { value: "status", label: "Status" },
        { value: "createdAt", label: "Created Date" },
      ]

  return (
    <Box>
      <DataHeader
        onCreateNew={() => tab === 0 ? handleOpenTemplateDialog(null, 'create') : handleOpenContractCRUD(null, 'create')}
        onExportCSV={handleExportCSV}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={tab === 0 ? "Search templates..." : "Search contracts..."}
        showDateControls={false}
        filters={tab === 1 ? filters : []}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={handleSortChange}
        onRefresh={handleRefresh}
        createButtonLabel={tab === 0 ? "New Template" : "New Contract"}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit contracts."
        additionalControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button
              variant={tab === 0 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTab(0)}
              sx={
                tab === 0
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
              Templates ({templates.length})
            </Button>
            <Button
              variant={tab === 1 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTab(1)}
              sx={
                tab === 1
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
              Contracts ({sortedContracts.length})
            </Button>
          </Box>
        }
      />

      {/* Templates Table */}
      {tab === 0 && (
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Template Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Type</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Created</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTemplates.map((template) => (
                <TableRow 
                  key={template.id} 
                  hover
                  onClick={() => handleOpenTemplateDialog(template, 'edit')}
                  sx={{ 
                    cursor: "pointer",
                    '& > td': {
                      paddingTop: 1,
                      paddingBottom: 1,
                    }
                  }}
                >
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{template.name}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{template.defaultType || 'N/A'}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    {template.createdAt ? format(new Date(template.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    <Chip 
                      label={template.active ? 'Active' : 'Inactive'} 
                      size="small" 
                      color={template.active ? 'success' : 'default'} 
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    <Box display="flex" gap={1} justifyContent="center">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTemplateDialog(template, 'edit')
                        }}
                        disabled={!canMutate}
                        title={canMutate ? "Edit Template" : "No permission to edit"}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTemplate(template.id, template.name)
                        }}
                        disabled={!canRemove}
                        title={canRemove ? "Delete Template" : "No permission to delete"}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedTemplates.length === 0 && (
            <Box sx={{ py: 4, px: 2 }}>
              <EmptyStateCard
                icon={DescriptionIcon}
                title={searchTerm ? "No templates match your search" : "No templates found"}
                description={searchTerm ? "Try adjusting your search." : "Get started by creating your first template."}
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenTemplateDialog(null, 'create')}
                    disabled={!canMutate}
                  >
                    Create Template
                  </Button>
                }
                cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
              />
            </Box>
          )}
        </TableContainer>
      )}

      {/* Contracts Table */}
      {tab === 1 && (
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Contract Title</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Employee</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Type</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Created</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedContracts.map((contract) => {
                const employee = state.employees.find((e: Employee) => e.id === contract.employeeId)
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
                const contractTitle = contract.contractTitle || `${contract.type} Contract - ${employeeName}`
                
                return (
                  <TableRow 
                    key={contract.id} 
                    hover
                    onClick={() => handleOpenContractCRUD(contract, 'view')}
                    sx={{ 
                      cursor: "pointer",
                      '& > td': {
                        paddingTop: 1,
                        paddingBottom: 1,
                      }
                    }}
                  >
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{contractTitle}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{employeeName}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{contract.type || 'N/A'}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Chip 
                        label={contract.status || 'N/A'} 
                        size="small" 
                        color={
                          contract.status === 'active' ? 'success' : 
                          contract.status === 'pending_signature' ? 'warning' :
                          contract.status === 'expired' || contract.status === 'terminated' ? 'error' : 
                          'default'
                        } 
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {contract.createdAt ? format(new Date(contract.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Box display="flex" gap={0.5} justifyContent="center">
                        <Tooltip title="View Contract">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenContractCRUD(contract, 'view')
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Contract">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenContractCRUD(contract, 'edit')
                            }}
                            disabled={!canMutate}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy Link">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyLink(contract)
                            }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Send Email">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSendEmail(contract)
                            }}
                          >
                            <EmailIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Send WhatsApp">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSendWhatsApp(contract)
                            }}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download PDF">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadPDF(contract)
                            }}
                          >
                            <PdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Contract">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteContract(contract.id, contractTitle)
                            }}
                            color="error"
                            disabled={!canRemove}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {sortedContracts.length === 0 && (
            <Box sx={{ py: 4, px: 2 }}>
              <EmptyStateCard
                icon={DescriptionIcon}
                title={contracts.length === 0 ? "No contracts found" : "No contracts match your filters"}
                description={
                  contracts.length === 0
                    ? "No contracts created yet. Create your first contract from a template."
                    : "Try adjusting your search or filters."
                }
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenContractCRUD(null, 'create')}
                    disabled={!canMutate}
                  >
                    Create Contract
                  </Button>
                }
                cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
              />
            </Box>
          )}
        </TableContainer>
      )}

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={handleCloseTemplateDialog} maxWidth="md" fullWidth>
        <DialogTitle>{templateMode === 'create' ? 'Create' : 'Edit'} Contract Template</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField 
              fullWidth 
              label="Template Name" 
              value={templateForm.name} 
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))} 
              sx={{ mb: 2 }}
            />
            <TextField 
              fullWidth 
              label="Contract Body (HTML)" 
              multiline 
              minRows={8} 
              value={templateForm.bodyHtml} 
              onChange={(e) => setTemplateForm(prev => ({ ...prev, bodyHtml: e.target.value }))}
              helperText="HTML formatting (paragraphs, lists, headings, etc.) is fully preserved. Use placeholders below:"
            />
            <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                Available Placeholders:
              </Typography>
              <Typography variant="caption" component="div" sx={{ fontSize: '0.75rem' }}>
                <strong>Employee Information:</strong><br/>
                • {'{{'}employeeName{'}}'} - Full name<br/>
                • {'{{'}firstName{'}}'} - First name<br/>
                • {'{{'}lastName{'}}'} - Last name<br/>
                • {'{{'}role{'}}'} or {'{{'}position{'}}'} - Job position/role<br/>
                • {'{{'}department{'}}'} - Department name<br/>
                • {'{{'}email{'}}'} - Email address<br/>
                • {'{{'}phone{'}}'} - Phone number<br/>
                • {'{{'}address{'}}'} - Full address<br/>
                • {'{{'}nationalInsuranceNumber{'}}'} - NI number<br/>
                <br/>
                <strong>Employment Details:</strong><br/>
                • {'{{'}startDate{'}}'} - Contract start date<br/>
                • {'{{'}hireDate{'}}'} - Original hire date<br/>
                • {'{{'}endDate{'}}'} - Contract end date<br/>
                • {'{{'}contractDuration{'}}'} - Contract duration<br/>
                • {'{{'}employmentType{'}}'} - Employment type<br/>
                • {'{{'}hoursPerWeek{'}}'} - Weekly working hours<br/>
                • {'{{'}holidaysPerYear{'}}'} - Annual holiday entitlement<br/>
                <br/>
                <strong>Compensation:</strong><br/>
                • {'{{'}salary{'}}'} - Annual salary (formatted)<br/>
                • {'{{'}hourlyRate{'}}'} - Hourly rate (formatted)<br/>
                <br/>
                <strong>Company:</strong><br/>
                • {'{{'}companyName{'}}'} - Company name<br/>
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleSaveTemplate} disabled={loading || !canMutate}>
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {itemToDelete?.type === 'template' ? 'template' : 'contract'}? 
            This action cannot be undone.
          </Typography>
          {itemToDelete && (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
              {itemToDelete.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={loading || !canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contract CRUD Modal */}
                        <CRUDModal
              open={contractCRUDModalOpen}
              onClose={(reason) => {
                setContractCRUDModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = handleCloseContractCRUD
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "contractsManagementModal1",
                crudMode: contractCrudMode,
              }}
              title={contractCrudMode === 'create' ? 'Create Contract' : 
          contractCrudMode === 'edit' ? 'Edit Contract' : 
          'View Contract'}
              mode={contractCrudMode}
              onSave={async (...args) => {
                const __workspaceOnSave = contractCrudMode !== 'view' ? handleSaveContractCRUD : undefined
                if (typeof __workspaceOnSave !== "function") return undefined
                const result = await __workspaceOnSave(...args)
                removeWorkspaceFormDraft(location.pathname, {
                  crudEntity: "contractsManagementModal1",
                  crudMode: contractCrudMode,
                })
                return result
              }}
              maxWidth="lg"
              formRef={contractCRUDFormRef}
              cancelButtonText={undefined}
              hideCloseButton={true}
              hideCloseAction={true}
              disabled={(contractCrudMode === "create" || contractCrudMode === "edit") && !canMutate}
            >
        <ContractCRUDForm
          ref={contractCRUDFormRef}
          contract={selectedContractForCRUD}
          mode={contractCrudMode}
          onSave={handleSaveContractCRUD}
        />
      </CRUDModal>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ContractsManagement
