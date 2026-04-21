"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useStock } from "../../../backend/context/StockContext"
import type { Purchase, HeadCell, SortDirection } from "../../../backend/context/StockContext"
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mui/icons-material"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, parseISO } from "date-fns"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import PurchaseOrderForm, { PurchaseOrderFormRef } from "./forms/PurchaseOrderForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const headCells: HeadCell[] = [
  { id: "supplierDisplayName", label: "Supplier", numeric: false, sortable: true },
  { id: "status", label: "Status", numeric: false, sortable: true },
  { id: "invoiceNumber", label: "Invoice Number", numeric: false, sortable: true },
  { id: "subtotalExVat", label: "Total (ex VAT)", numeric: false, sortable: true },
  { id: "vatAmount", label: "VAT", numeric: false, sortable: true },
  { id: "totalIncVat", label: "Total (inc VAT)", numeric: false, sortable: true },
  { id: "deliveryDate", label: "Delivery Date", numeric: false, sortable: true },
  { id: "actions", label: "Actions", numeric: false, sortable: false },
]

const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const formatGBP = (v: unknown) => {
  const n = safeNumber(v, NaN)
  if (!Number.isFinite(n)) return "£0.00"
  return `£${n.toFixed(2)}`
}

// Helper function to format date to UK format (dd/MM/yyyy)
const formatDateUK = (dateStr: string | undefined): string => {
  if (!dateStr) return ""
  try {
    // Try parsing ISO format first
    const date = parseISO(dateStr)
    if (!isNaN(date.getTime())) {
      return format(date, "dd/MM/yyyy")
    }
    // If that fails, try parsing as regular date string
    const dateObj = new Date(dateStr)
    if (!isNaN(dateObj.getTime())) {
      return format(dateObj, "dd/MM/yyyy")
    }
    return dateStr
  } catch {
    return dateStr
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Approved":
      return "success"
    case "Awaiting Approval":
      return "warning"
    case "Awaiting Submission":
      return "info"
    default:
      return "default"
  }
}

const PurchaseOrdersTable: React.FC = () => {
  const location = useLocation()
  const { state, fetchAllPurchases, deletePurchase, savePurchase } = useStock()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("stock", "orders")
  const canRemove = canDelete("stock", "orders")
  const { dataVersion, loading: contextLoading } = state
  const navigate = useNavigate()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [orderBy, setOrderBy] = useState<string>("deliveryDate")
  const [order, setOrder] = useState<SortDirection>("desc")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("deliveryDate")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")
  const [displayedItems, setDisplayedItems] = useState<Purchase[]>([])
  const [itemsPerBatch] = useState(50)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Purchase form states
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false)
  const [purchaseFormMode, setPurchaseFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedPurchaseForForm, setSelectedPurchaseForForm] = useState<Purchase | null>(null)
  const purchaseFormRef = useRef<PurchaseOrderFormRef>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const suppliersById = useMemo(() => {
    const m = new Map<string, string>()
    ;(state.suppliers || []).forEach((s: any) => {
      if (!s) return
      const id = s.id != null ? String(s.id) : ""
      const name = String(s.name || s.companyName || s.supplierName || s.displayName || id || "").trim()
      if (id && name) m.set(id, name)

      const legacyId = s.legacyId != null ? String(s.legacyId) : ""
      if (legacyId && name && !m.has(legacyId)) m.set(legacyId, name)
    })
    return m
  }, [state.suppliers])

  const resolveSupplierName = useCallback((purchase: Purchase): string => {
    const candidates = [
      (purchase as any)?.supplierId,
      (purchase as any)?.supplierID,
      (purchase as any)?.supplierName,
      (purchase as any)?.supplier,
    ]
      .filter(Boolean)
      .map((v) => String(v))

    for (const id of candidates) {
      const hit = suppliersById.get(id)
      if (hit) return hit
    }

    // If "supplierName" is not an ID, still show it.
    return String((purchase as any)?.supplierName || (purchase as any)?.supplier || candidates[0] || "").trim()
  }, [suppliersById])

  const computeTotals = useCallback((purchase: Purchase) => {
    const items = Array.isArray((purchase as any)?.items) ? ((purchase as any)?.items as any[]) : []
    const subtotalExVatFromItems = items.reduce((sum, item) => sum + safeNumber(item?.priceExcludingVAT, 0), 0)
    const vatFromItems = items.reduce((sum, item) => sum + safeNumber(item?.taxAmount, 0), 0)
    const totalIncVatFromItems = items.reduce((sum, item) => sum + safeNumber(item?.totalPrice, 0), 0)

    const totalIncVat =
      safeNumber((purchase as any)?.totalAmount, NaN) ||
      safeNumber((purchase as any)?.totalValue, NaN) ||
      (Number.isFinite(totalIncVatFromItems) ? totalIncVatFromItems : 0)

    const vatAmount =
      safeNumber((purchase as any)?.totalTax, NaN) || (Number.isFinite(vatFromItems) ? vatFromItems : 0)

    const subtotalExVat =
      safeNumber((purchase as any)?.subtotal, NaN) ||
      safeNumber((purchase as any)?.totalExVat, NaN) ||
      (Number.isFinite(subtotalExVatFromItems) ? subtotalExVatFromItems : Math.max(0, totalIncVat - vatAmount))

    return { subtotalExVat, vatAmount, totalIncVat }
  }, [])

  // Fetch purchases - use ref to prevent duplicate calls
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    async function fetchData() {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true
      try {
        const allPurchases = await fetchAllPurchases()
        setPurchases(allPurchases)
      } catch (error) {
        debugWarn("Error fetching purchases:", error)
        hasLoadedRef.current = false // Allow retry on error
      }
    }
    fetchData()
    // Reset hasLoadedRef when dataVersion changes (data was refreshed externally)
    if (dataVersion) {
      hasLoadedRef.current = false
    }
  }, [fetchAllPurchases, dataVersion])

  const purchasesWithComputed = useMemo(() => {
    return (purchases || []).map((p) => {
      const supplierDisplayName = resolveSupplierName(p)
      const totals = computeTotals(p)
      return {
        ...p,
        supplierDisplayName,
        subtotalExVat: totals.subtotalExVat,
        vatAmount: totals.vatAmount,
        totalIncVat: totals.totalIncVat,
      } as any
    })
  }, [purchases, resolveSupplierName, computeTotals])

  // Filtered and sorted items
  const filteredPurchases = useMemo(() => {
    let filtered: any[] = purchasesWithComputed

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((purchase) =>
        purchase.supplierDisplayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.status?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((purchase) => purchase.status === statusFilter)
    }

    // Apply supplier filter
    if (supplierFilter !== "all") {
      filtered = filtered.filter((purchase) => purchase.supplierDisplayName === supplierFilter)
    }

    // Apply sorting using new sort state
    const sortKey = sortBy as keyof any
    filtered = [...filtered].sort((a, b) => {
      const aValue = (a as any)?.[sortKey] ?? ""
      const bValue = (b as any)?.[sortKey] ?? ""
      
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
  }, [purchasesWithComputed, searchQuery, statusFilter, supplierFilter, sortBy, sortDirection, dataVersion])

  // Load more items for infinite scroll (no loading UI - instant like HR section)
  const loadMoreItems = useCallback(() => {
    if (displayedItems.length >= filteredPurchases.length) {
      return
    }

    // Load items without showing loading UI (instant UI like HR section)
    const currentLength = displayedItems.length
    const nextBatch = filteredPurchases.slice(currentLength, currentLength + itemsPerBatch)
    setDisplayedItems(prev => [...prev, ...nextBatch])
  }, [displayedItems.length, filteredPurchases, itemsPerBatch])

  // Initialize displayed items when filtered purchases change
  useEffect(() => {
    setDisplayedItems(filteredPurchases.slice(0, itemsPerBatch))
  }, [filteredPurchases, itemsPerBatch])

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

  // Get unique statuses and suppliers for filters
  const uniqueStatuses = useMemo(() => {
    return [...new Set(purchasesWithComputed.map((purchase: any) => purchase.status).filter(Boolean))]
  }, [purchasesWithComputed])

  const uniqueSuppliers = useMemo(() => {
    return [...new Set(purchasesWithComputed.map((purchase: any) => purchase.supplierDisplayName).filter(Boolean))]
  }, [purchasesWithComputed])

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
    {
      label: 'Supplier',
      options: [
        { id: 'all', name: 'All Suppliers' },
        ...uniqueSuppliers.map(supplier => ({ id: supplier || '', name: supplier || '' }))
      ],
      selectedValues: supplierFilter ? [supplierFilter] : [],
      onSelectionChange: (values: string[]) => setSupplierFilter(values[0] || '')
    }
  ], [uniqueStatuses, uniqueSuppliers, statusFilter, supplierFilter])

  const sortOptions = useMemo(() => [
    { value: 'supplierDisplayName', label: 'Supplier' },
    { value: 'status', label: 'Status' },
    { value: 'invoiceNumber', label: 'Invoice Number' },
    { value: 'subtotalExVat', label: 'Total (ex VAT)' },
    { value: 'vatAmount', label: 'VAT' },
    { value: 'totalIncVat', label: 'Total (inc VAT)' },
    { value: 'deliveryDate', label: 'Delivery Date' }
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
    const dataToExport = filteredPurchases
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
        "Delivery Date", "Supplier", "Status", "Invoice Number",
        "Total (ex VAT)", "VAT", "Total (inc VAT)"
      ]
      
      const rows = dataToExport.map((purchase: any) => [
        formatDateUK(purchase.deliveryDate || purchase.expectedDeliveryDate),
        purchase.supplierDisplayName || "",
        purchase.status || "",
        purchase.invoiceNumber || "",
        safeNumber(purchase.subtotalExVat, 0).toFixed(2),
        safeNumber(purchase.vatAmount, 0).toFixed(2),
        safeNumber(purchase.totalIncVat, 0).toFixed(2),
      ])
      
      const csv = [headers.join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `purchase_orders_${dateStr}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF({ orientation: "landscape" })
      doc.setFontSize(16)
      doc.text('Purchase Orders Export', 14, 15)
      doc.setFontSize(10)
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22)
      doc.text(`Total Orders: ${dataToExport.length}`, 14, 28)
      
      const headers = [
        ["Delivery Date", "Supplier", "Status", "Invoice Number", "Total (ex VAT)", "VAT", "Total (inc VAT)"]
      ]
      
      const rows = dataToExport.map((purchase: any) => [
        formatDateUK(purchase.deliveryDate || purchase.expectedDeliveryDate),
        purchase.supplierDisplayName || "",
        purchase.status || "",
        purchase.invoiceNumber || "",
        formatGBP(purchase.subtotalExVat),
        formatGBP(purchase.vatAmount),
        formatGBP(purchase.totalIncVat),
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
      
      doc.save(`purchase_orders_${dateStr}.pdf`)
    }
  }

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (!canRemove) return
    // Prevent deleting approved orders
    if (purchase.status === "Approved") {
      alert("Cannot delete approved purchase orders")
      return
    }
    
    if (window.confirm("Are you sure you want to delete this purchase order?")) {
      try {
        await deletePurchase(purchase.id!)
        setPurchases(prev => prev.filter(p => p.id !== purchase.id))
      } catch (error) {
        debugWarn("Failed to delete purchase:", error)
        alert("Failed to delete purchase order")
      }
    }
  }



  // New CRUD form handlers
  const handleOpenPurchaseForm = (purchase: Purchase | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedPurchaseForForm(purchase)
    setPurchaseFormMode(mode)
    setPurchaseFormOpen(true)
  }

  const handleClosePurchaseForm = () => {
    setPurchaseFormOpen(false)
    setSelectedPurchaseForForm(null)
    setPurchaseFormMode('create')
  }

  // URL-driven modal open (used by StockDashboard header + legacy route redirects)
  useEffect(() => {
    const entity = searchParams.get("crudEntity")
    const mode = searchParams.get("crudMode") as 'create' | 'edit' | 'view' | null
    const id = searchParams.get("id")

    if (entity !== "purchaseOrder" || !mode) return

    if (mode === "create") {
      handleOpenPurchaseForm(null, "create")
    } else if ((mode === "edit" || mode === "view") && id) {
      const purchase = purchases.find((p) => p.id === id) || null
      if (!purchase) return
      handleOpenPurchaseForm(purchase, mode)
    } else {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    next.delete("id")
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, purchases, setSearchParams])

  const handleSavePurchase = async (purchaseData: any) => {
    try {
      // If triggered by a button click, React passes a MouseEvent.
      // Submit the actual form via ref so we save real purchase data (not the event object).
      if (purchaseData && typeof purchaseData === "object" && "nativeEvent" in purchaseData && "target" in purchaseData) {
        purchaseFormRef.current?.submit?.()
        return
      }

      if (purchaseFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(purchaseData).filter(([_, value]) => value !== undefined)
        )
        await savePurchase(createPayload)
        // Refresh the purchases list
        const updatedPurchases = await fetchAllPurchases()
        setPurchases(updatedPurchases)
      } else if (purchaseFormMode === 'edit' && selectedPurchaseForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...purchaseData, id: selectedPurchaseForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await savePurchase(updatePayload)
        // Refresh the purchases list
        const updatedPurchases = await fetchAllPurchases()
        setPurchases(updatedPurchases)
      }
      
      handleClosePurchaseForm()
    } catch (error) {
      debugWarn('Error saving purchase order:', error)
      alert(`Failed to save purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Don't close modal on error so user can retry
    }
  }

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const hasActiveFilters = searchQuery.length > 0 || (statusFilter !== "all") || (supplierFilter !== "all")

  return (
    <Box>
      {/* Header */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search purchase orders..."
        filters={filterOptions}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenPurchaseForm(null, 'create')}
        createButtonLabel="New Purchase Order"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit purchase orders."
      />

      {/* No loading indicators — UI renders and fills as data arrives */}
      
      {/* Table */}
      {displayedItems.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={ShoppingCartIcon}
            title={hasActiveFilters ? "No purchase orders match your filters" : "No purchase orders found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first purchase order to get started."
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
                {displayedItems.map((purchase) => (
                  <TableRow 
                    key={purchase.id} 
                    hover
                    onClick={() => handleOpenPurchaseForm(purchase, 'view')}
                    sx={{ 
                      cursor: "pointer",
                      '& > td': {
                        paddingTop: 1,
                        paddingBottom: 1,
                      }
                    }}
                  >
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{(purchase as any).supplierDisplayName || purchase.supplierName || purchase.supplier}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Chip
                        label={purchase.status}
                        color={getStatusColor(purchase.status || "")}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {purchase.invoiceNumber || ""}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {formatGBP((purchase as any).subtotalExVat)}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {formatGBP((purchase as any).vatAmount)}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {formatGBP((purchase as any).totalIncVat)}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {formatDateUK(purchase.deliveryDate || purchase.expectedDeliveryDate)}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Box display="flex" gap={1} justifyContent="center">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!canMutate}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenPurchaseForm(purchase, 'edit')
                          }}
                          title={canMutate ? "Edit" : "No permission to edit"}
                        >
                          <EditIcon />
                        </IconButton>
                        {purchase.status !== "Approved" && (
                          <IconButton
                            size="small"
                            disabled={!canRemove}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!canRemove) return
                              handleDeletePurchase(purchase)
                            }}
                            title={canRemove ? "Delete" : "No permission to delete"}
                            color="error"
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
          {displayedItems.length < filteredPurchases.length && (
            <Box ref={loadMoreRef} display="flex" justifyContent="center" py={2}>
              <Typography variant="body2" color="text.secondary">
                Scroll to load more...
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Purchase Order Form Modal */}
            <CRUDModal
        open={purchaseFormOpen}
        onClose={(reason) => {
          setPurchaseFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleClosePurchaseForm
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "purchaseOrdersTableModal1",
          crudMode: purchaseFormMode,
        }}
        title={purchaseFormMode === 'create' ? 'Create Purchase Order' : purchaseFormMode === 'edit' ? 'Edit Purchase Order' : 'View Purchase Order'}
        mode={purchaseFormMode}
        onSave={async (...args) => {
          const __workspaceOnSave = handleSavePurchase
          if (typeof __workspaceOnSave !== "function") return undefined
          const result = await __workspaceOnSave(...args)
          removeWorkspaceFormDraft(location.pathname, {
            crudEntity: "purchaseOrdersTableModal1",
            crudMode: purchaseFormMode,
          })
          return result
        }}
        formRef={purchaseFormRef}
        maxWidth={false}
      >
        <PurchaseOrderForm
          ref={purchaseFormRef}
          purchase={selectedPurchaseForForm}
          mode={purchaseFormMode}
          onSave={handleSavePurchase}
        />
      </CRUDModal>
    </Box>
  )
}

export default PurchaseOrdersTable
