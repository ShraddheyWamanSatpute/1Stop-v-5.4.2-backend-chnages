"use client"

import type React from "react"
import { useLocation, useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useSearchParams } from "react-router-dom"
// All company state is now handled through StockContext
// SiteContext has been merged into CompanyContext
import { useStock } from "../../../backend/context/StockContext"
import type { Site, StockCount, HeadCell, SortDirection } from "../../../backend/context/StockContext"
// All database operations are now handled through StockContext
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import {
  Edit as EditIcon,
  Close as CloseIcon,
  SwapHoriz as SwapHorizIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, parseISO } from "date-fns"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import StockCountForm, { StockCountFormRef } from "./forms/StockCountForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugLog, debugWarn } from "../../../utils/debugLog"
import { useCompany } from "../../../backend/context/CompanyContext"
import type { StockTransfer } from "../../../backend/interfaces/Stock"

// SortDirection and HeadCell interfaces moved to backend

const headCells: HeadCell[] = [
  { id: "dateUK", label: "Date", numeric: false, sortable: true },
  { id: "status", label: "Status", numeric: false, sortable: true },
  { id: "itemsCount", label: "Items Count", numeric: false, sortable: true },
  { id: "totalValue", label: "Total Value", numeric: false, sortable: true },
  { id: "actions", label: "Actions", numeric: false, sortable: false },
]

type StockCountRow = StockCount & {
  dateUK: string
  itemsCount: number
}

type TransferDraftItem = {
  id: string
  productId: string
  name: string
  countedQuantity: number
  maxQuantity: number
  measureId: string
  unitName: string
}

// Add helper function to determine chip color based on status
const getStatusColor = (status: string) => {
  if (status === "Approved") return "success"
  if (status === "Awaiting Approval" || status === "Awaiting Submission") return "warning"
  return "default"
}

const StockCountTable: React.FC = () => {
  const location = useLocation()
  const { 
    state,
    fetchAllStockCounts: contextFetchAllStockCounts,
    saveStockCount: contextSaveStockCount,
    deleteStockCount: contextDeleteStockCount,
    saveStockTransferPair,
  } = useStock()
  const { state: companyState } = useCompany()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("stock", "counts")
  const canRemove = canDelete("stock", "counts")
  const { dataVersion, loading: contextLoading } = state
  const [stockCounts, setStockCounts] = useState<StockCount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [orderBy, setOrderBy] = useState<string>("dateUK")
  const [order, setOrder] = useState<SortDirection>("desc")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("dateUK")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [selectedStockForTransfer, setSelectedStockForTransfer] = useState<StockCount | null>(null)
  const [targetSiteId, setTargetSiteId] = useState<string>("") 
  const [transferItems, setTransferItems] = useState<TransferDraftItem[]>([])
  const [transferNote, setTransferNote] = useState("")
  const [displayedItems, setDisplayedItems] = useState<StockCountRow[]>([])
  const [itemsPerBatch] = useState(50)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Stock count form states
  const [countFormOpen, setCountFormOpen] = useState(false)
  const [countFormMode, setCountFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedCountForForm, setSelectedCountForForm] = useState<StockCount | null>(null)
  const countFormRef = useRef<StockCountFormRef>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const getMeasureName = useCallback((measureId: string | undefined) => {
    if (!measureId) return ""
    const measure = (state.measures || []).find((m: any) => m.id === measureId)
    return measure?.name || measureId
  }, [state.measures])

  const formatDateUK = useCallback((dateStr: string | undefined): string => {
    if (!dateStr) return ""
    const s = String(dateStr).trim()
    // Already dd/MM/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
    try {
      const iso = parseISO(s)
      if (!isNaN(iso.getTime())) return format(iso, "dd/MM/yyyy")
    } catch {
      // ignore
    }
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return format(d, "dd/MM/yyyy")
    } catch {
      // ignore
    }
    return s
  }, [])

  const normalizeItems = useCallback((items: any): any[] => {
    if (!items) return []
    if (Array.isArray(items)) return items
    if (typeof items === "object") return Object.values(items)
    return []
  }, [])

  const computeCounts = useCallback((count: StockCount) => {
    const items = normalizeItems((count as any).items)
    const itemsCount = items.length || Number((count as any).itemCount || 0) || 0
    return { itemsCount }
  }, [normalizeItems])

  const countsWithComputed = useMemo<StockCountRow[]>(() => {
    return (stockCounts || []).map((c) => {
      const dateUKValue = formatDateUK((c as any).dateUK || (c as any).date || (c as any).timestamp)
      const { itemsCount } = computeCounts(c)
      return {
        ...(c as any),
        dateUK: dateUKValue,
        itemsCount,
      }
    })
  }, [stockCounts, computeCounts, formatDateUK])

  const availableSites = useMemo<Site[]>(() => {
    return (companyState.sites || []).filter((site) => {
      const siteId = String((site as any)?.siteID || (site as any)?.id || "").trim()
      return Boolean(siteId) && siteId !== companyState.selectedSiteID
    }) as Site[]
  }, [companyState.selectedSiteID, companyState.sites])

  // Fetch stock counts using the external service function - use ref to prevent duplicate calls
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    async function fetchData() {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true
      // All data operations are now handled through StockContext
      try {
        const allStockCounts = await contextFetchAllStockCounts()
        setStockCounts(allStockCounts)
      } catch (error) {
        debugWarn("Error fetching stock counts:", error)
        hasLoadedRef.current = false // Allow retry on error
      }
    }
    fetchData()
    // Reset hasLoadedRef when dataVersion changes (data was refreshed externally)
    if (dataVersion) {
      hasLoadedRef.current = false
    }
  }, [contextFetchAllStockCounts, dataVersion])

  // Filtered and sorted items
  const filteredCounts = useMemo(() => {
    let filtered: StockCountRow[] = countsWithComputed

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((count) =>
        count.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        count.dateUK?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (count.reference || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((count) => count.status === statusFilter)
    }

    // Apply sorting using new sort state
    const sortKey = sortBy as keyof StockCountRow
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[sortKey] || ""
      const bValue = b[sortKey] || ""
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

    return filtered
  }, [countsWithComputed, searchQuery, statusFilter, sortBy, sortDirection, dataVersion])

  // Load more items for infinite scroll (no loading UI - instant like HR section)
  const loadMoreItems = useCallback(() => {
    if (displayedItems.length >= filteredCounts.length) {
      return
    }

    // Load items without showing loading UI (instant UI like HR section)
    const currentLength = displayedItems.length
    const nextBatch = filteredCounts.slice(currentLength, currentLength + itemsPerBatch)
    setDisplayedItems(prev => [...prev, ...nextBatch])
  }, [displayedItems.length, filteredCounts, itemsPerBatch])

  // Initialize displayed items when filtered counts change
  useEffect(() => {
    setDisplayedItems(filteredCounts.slice(0, itemsPerBatch))
  }, [filteredCounts, itemsPerBatch])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [loadMoreItems])

  // Get unique statuses and presets for filters
  const uniqueStatuses = useMemo(() => {
    return [...new Set(stockCounts.map(count => count.status).filter(Boolean))]
  }, [stockCounts])

  // DataHeader options
  const filterOptions = useMemo(() => [
    {
      label: 'Status',
      options: [
        { id: 'all', name: 'All Statuses' },
        ...uniqueStatuses.map(status => ({ id: status || '', name: status || '' }))
      ],
      selectedValues: statusFilter ? [statusFilter] : [],
      onSelectionChange: (values: string[]) => setStatusFilter(values[0] || '')
    },
  ], [uniqueStatuses, statusFilter])

  const sortOptions = useMemo(() => [
    { value: 'dateUK', label: 'Date' },
    { value: 'status', label: 'Status' },
    { value: 'itemsCount', label: 'Items Count' },
    { value: 'totalValue', label: 'Total Value' }
  ], [])

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    const nextDirection = isAsc ? 'desc' : 'asc'
    setOrder(nextDirection)
    setOrderBy(property)
    setSortBy(property)
    setSortDirection(nextDirection)
  }

  // DataHeader handlers

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
    // Update legacy sort state for compatibility
    setOrderBy(field)
    setOrder(direction)
  }

  const handleExport = (exportFormat: 'csv' | 'pdf') => {
    const dataToExport = filteredCounts
    const dateStr = format(new Date(), "yyyyMMdd_HHmmss")
    
    if (exportFormat === 'csv') {
      const escapeCSV = (val: unknown) => {
        const s = (val ?? "").toString()
        if (s.includes(",") || s.includes("\n") || s.includes('"')) {
          return '"' + s.replace(/"/g, '""') + '"'
        }
        return s
      }
      
      const headers = [
        "Date", "Status", "Items Count", "Total Value", "Reference"
      ]
      
      const rows = dataToExport.map(count => [
        count.dateUK || (count as any).date || "",
        count.status || "",
        (count.itemsCount || 0).toString(),
        (count.totalValue || 0).toFixed(2),
        count.reference || "",
      ])
      
      const csv = [headers.join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `stock_counts_${dateStr}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF({ orientation: "landscape" })
      doc.setFontSize(16)
      doc.text('Stock Counts Export', 14, 15)
      doc.setFontSize(10)
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22)
      doc.text(`Total Counts: ${dataToExport.length}`, 14, 28)
      
      const headers = [
        ["Date", "Status", "Items Count", "Total Value", "Reference"]
      ]
      
      const rows = dataToExport.map(count => [
        count.dateUK || (count as any).date || "",
        count.status || "",
        (count.itemsCount || 0).toString(),
        `£${(count.totalValue || 0).toFixed(2)}`,
        count.reference || "",
      ])
      
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 35 },
      })
      
      doc.save(`stock_counts_${dateStr}.pdf`)
    }
  }


  // New CRUD form handlers
  const handleOpenCountForm = (count: StockCount | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedCountForForm(count)
    setCountFormMode(mode)
    setCountFormOpen(true)
  }

  const handleCloseCountForm = () => {
    setCountFormOpen(false)
    setSelectedCountForForm(null)
    setCountFormMode('create')
  }

  // URL-driven modal open (used by StockDashboard header + legacy route redirects)
  useEffect(() => {
    const entity = searchParams.get("crudEntity")
    const mode = searchParams.get("crudMode") as 'create' | 'edit' | 'view' | null
    const id = searchParams.get("id")

    if (entity !== "stockCount" || !mode) return

    if (mode === "create") {
      handleOpenCountForm(null, "create")
    } else if ((mode === "edit" || mode === "view") && id) {
      const count = stockCounts.find((c) => c.id === id) || null
      if (!count) return
      handleOpenCountForm(count, mode)
    } else {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    next.delete("id")
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, stockCounts, setSearchParams])

  const handleSaveCount = async (countData: any) => {
    if (!canMutate) return
    try {
      // If triggered by a button click, React passes a MouseEvent.
      // Submit the actual form via ref so we save real count data (not the event object).
      if (countData && typeof countData === "object" && "nativeEvent" in countData && "target" in countData) {
        countFormRef.current?.submit?.()
        return
      }

      if (countFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(countData).filter(([_, value]) => value !== undefined)
        )
        await contextSaveStockCount(createPayload)
      } else if (countFormMode === 'edit' && selectedCountForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...countData, id: selectedCountForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await contextSaveStockCount(updatePayload)
      }
      
      // Refresh the stock counts list
      const updatedStockCounts = await contextFetchAllStockCounts()
      setStockCounts(updatedStockCounts)
      
      handleCloseCountForm()
    } catch (error) {
      debugWarn('Error saving stock count:', error)
      alert(`Failed to save stock count: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Don't close modal on error so user can retry
    }
  }

  const handleDeleteCount = async (countId: string, stockCount?: StockCount) => {
    if (!canRemove) return
    // Check if the stock count is approved
    const countToDelete = stockCount || stockCounts.find(c => c.id === countId)
    if (countToDelete?.status === "Approved") {
      alert("Cannot delete approved stock counts")
      return
    }
    
    if (!window.confirm('Are you sure you want to delete this stock count?')) return

    try {
      await contextDeleteStockCount(countId)
      
      // Refresh the stock counts list
      const updatedStockCounts = await contextFetchAllStockCounts()
      setStockCounts(updatedStockCounts)
    } catch (error) {
      debugWarn('Error deleting stock count:', error)
      alert("Failed to delete stock count")
    }
  }

  const handleTransferStock = (stock: StockCount) => {
    setSelectedStockForTransfer(stock)
    setShowTransferDialog(true)
    
    // Initialize transfer items from stock count items
    const items = normalizeItems((stock as any).items).map((item: any, index: number) => {
      const quantity = Math.max(0, Number(item?.countedQuantity ?? item?.quantity ?? item?.previousQuantity ?? 0) || 0)
      return {
        id: String(item?.id || item?.productId || `transfer-item-${index}`),
        productId: String(item?.productId || item?.id || ""),
        name: String(item?.name || item?.productName || "Unnamed item"),
        countedQuantity: quantity,
        maxQuantity: quantity,
        measureId: String(item?.measureId || ""),
        unitName: String(item?.unitName || getMeasureName(item?.measureId) || item?.measureName || "Unit"),
      }
    })
    setTransferItems(items)
  }

  const handleCloseTransfer = () => {
    setShowTransferDialog(false)
    setSelectedStockForTransfer(null)
    setTransferItems([])
    setTargetSiteId("")
    setTransferNote("")
  }

  const handleTransferItemChange = (itemId: string, countedQuantity: number) => {
    setTransferItems(prev => 
      prev.map(item => 
        item.id === itemId
          ? { ...item, countedQuantity: Math.max(0, Math.min(item.maxQuantity, countedQuantity)) }
          : item
      )
    )
  }

  const handleSubmitTransfer = async () => {
    if (!selectedStockForTransfer) return
    if (!companyState.selectedSiteID) {
      alert("Select a source site before creating a stock transfer.")
      return
    }
    if (!targetSiteId) {
      alert("Choose a target site for this transfer.")
      return
    }

    const itemsToTransfer = transferItems
      .filter((item) => item.countedQuantity > 0)
      .map((item) => ({
        productId: item.productId || item.id,
        productName: item.name,
        measureId: item.measureId,
        unitName: item.unitName,
        quantity: item.countedQuantity,
      }))

    if (itemsToTransfer.length === 0) {
      alert("Enter at least one quantity to transfer.")
      return
    }

    const now = new Date()
    const transfer: StockTransfer = {
      date: format(now, "yyyy-MM-dd"),
      dateUK: format(now, "dd/MM/yyyy"),
      timeUK: format(now, "HH:mm"),
      status: "Awaiting Approval",
      transferType: "sent",
      fromSiteId: companyState.selectedSiteID,
      fromSubsiteId: companyState.selectedSubsiteID || undefined,
      toSiteId: targetSiteId,
      reference: selectedStockForTransfer.reference
        ? `Transfer from ${selectedStockForTransfer.reference}`
        : `Transfer from stock count ${formatDateUK((selectedStockForTransfer as any).dateUK || (selectedStockForTransfer as any).date)}`,
      notes: transferNote.trim() || undefined,
      description: `Transfer created from stock count ${selectedStockForTransfer.id || ""}`.trim(),
      approvedBySource: false,
      approvedByDestination: false,
      items: itemsToTransfer,
    }

    try {
      await saveStockTransferPair(transfer)
      debugLog("Transfer submitted:", {
        fromStock: selectedStockForTransfer?.id,
        toSite: targetSiteId,
        items: itemsToTransfer,
        note: transferNote,
      })
      handleCloseTransfer()
      alert("Transfer request submitted successfully.")
    } catch (error) {
      debugWarn("Error submitting transfer:", error)
      alert("Failed to submit transfer request.")
    }
  }

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const hasActiveFilters = searchQuery.length > 0 || (statusFilter !== "all")

  return (
    <Box>
      <DataHeader
        showDateControls={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search stock counts..."
        filters={filterOptions}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenCountForm(null, 'create')}
        createButtonLabel="New Stock Count"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit stock counts."
      />

      {/* No loading indicators — UI renders and fills as data arrives */}
      
      {/* Table */}
      {displayedItems.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={AssessmentIcon}
            title={hasActiveFilters ? "No stock counts match your filters" : "No stock counts found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first stock count to get started."
            }
          />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {headCells.map((headCell) => (
                    <TableCell
                      key={headCell.id}
                      align="center"
                      sx={{ 
                        textAlign: 'center !important',
                        padding: '16px 16px',
                        cursor: headCell.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        '&:hover': {
                          backgroundColor: headCell.sortable ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
                        }
                      }}
                      onClick={headCell.sortable ? () => handleRequestSort(headCell.id) : undefined}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: 0.5
                      }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {headCell.label}
                        </Typography>
                        {headCell.sortable && orderBy === headCell.id && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {order === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedItems.map((stock) => (
                  <TableRow 
                    key={stock.id} 
                    hover
                    onClick={() => handleOpenCountForm(stock, 'view')}
                    sx={{ 
                      cursor: "pointer",
                      '& > td': {
                        paddingTop: 1,
                        paddingBottom: 1,
                      }
                    }}
                  >
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{stock.dateUK}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Chip
                        label={stock.status}
                        color={getStatusColor(stock.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{stock.itemsCount}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      £{stock.totalValue?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Box display="flex" gap={1} justifyContent="center">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!canMutate}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenCountForm(stock, 'edit')
                          }}
                          title={canMutate ? "Edit" : "No permission to edit"}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!canMutate || stock.status !== "Approved" || stock.itemsCount === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!canMutate || stock.status !== "Approved" || stock.itemsCount === 0) return
                            handleTransferStock(stock)
                          }}
                          title={
                            !canMutate
                              ? "No permission to transfer stock"
                              : stock.status !== "Approved"
                                ? "Only approved stock counts can be transferred"
                                : stock.itemsCount === 0
                                  ? "No stock items available to transfer"
                                  : "Transfer stock"
                          }
                        >
                          <SwapHorizIcon />
                        </IconButton>
                        {stock.status !== "Approved" && (
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canRemove}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!canRemove) return
                              handleDeleteCount(stock.id || '', stock)
                            }}
                            title={canRemove ? "Delete" : "No permission to delete"}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Load More Trigger */}
          {displayedItems.length < filteredCounts.length && (
            <Box ref={loadMoreRef} display="flex" justifyContent="center" py={2}>
              <Typography variant="body2" color="text.secondary">
                Scroll to load more...
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onClose={handleCloseTransfer} maxWidth="sm" fullWidth>
        <DialogTitle>
          Transfer Stock
          <IconButton
            onClick={handleCloseTransfer}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedStockForTransfer && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Transfer from: {formatDateUK((selectedStockForTransfer as any).dateUK || (selectedStockForTransfer as any).date || (selectedStockForTransfer as any).timestamp)}{selectedStockForTransfer.reference ? ` — ${selectedStockForTransfer.reference}` : ""}
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Target Site</InputLabel>
                <Select
                  value={targetSiteId}
                  onChange={(e) => setTargetSiteId(e.target.value)}
                  label="Target Site"
                >
                  {availableSites.map((site) => (
                    <MenuItem key={(site as any).siteID || (site as any).id} value={(site as any).siteID || (site as any).id}>
                      {site.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {transferItems.length > 0 && (
                <Box mt={2}>
                  <Typography variant="h6" gutterBottom>
                    Items to Transfer
                  </Typography>
                  {transferItems.map((item) => (
                    <Box key={item.id} display="flex" alignItems="center" gap={2} mb={1}>
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {item.name}
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        value={item.countedQuantity}
                        onChange={(e) => handleTransferItemChange(item.id, parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, max: item.countedQuantity }}
                        sx={{ width: 100 }}
                      />
                    </Box>
                  ))}
                </Box>
              )}

              <TextField
                label="Transfer Note"
                multiline
                rows={3}
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                fullWidth
                margin="normal"
                placeholder="Add any notes about this transfer..."
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  This transfer will require approval from both the source and target sites before stock is adjusted.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransfer}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSubmitTransfer}
            disabled={!targetSiteId || transferItems.every(item => item.countedQuantity <= 0)}
          >
            Submit Transfer Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Count Form Modal */}
            <CRUDModal
        open={countFormOpen}
        onClose={(reason) => {
          setCountFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseCountForm
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "stockCountTableModal1",
          crudMode: countFormMode,
        }}
        title={countFormMode === 'create' ? 'Create Stock Count' : countFormMode === 'edit' ? 'Edit Stock Count' : 'View Stock Count'}
        mode={countFormMode}
        onSave={async (...args) => {
          const __workspaceOnSave = handleSaveCount
          if (typeof __workspaceOnSave !== "function") return undefined
          const result = await __workspaceOnSave(...args)
          removeWorkspaceFormDraft(location.pathname, {
            crudEntity: "stockCountTableModal1",
            crudMode: countFormMode,
          })
          return result
        }}
        formRef={countFormRef}
        maxWidth={false}
      >
        <StockCountForm
          ref={countFormRef}
          stockCount={selectedCountForForm}
          mode={countFormMode}
          onSave={handleSaveCount}
        />
      </CRUDModal>
    </Box>
  )
}

export default StockCountTable
