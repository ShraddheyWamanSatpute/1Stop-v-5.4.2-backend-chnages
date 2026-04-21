"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Tooltip,
  Button,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  PointOfSale as PointOfSaleIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { useStock } from "../../../backend/context/StockContext"
import type { Sale } from "../../../backend/interfaces/POS"
import type { Product } from "../../../backend/interfaces/Stock"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import SaleForm from "./forms/SaleForm"
import DataHeader from "../reusable/DataHeader"
import StatsSection from "../reusable/StatsSection"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const OrdersTable: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "orders")
  const canRemove = canDelete("pos", "orders")
  const { state: companyState } = useCompany()
  const { state: posState, refreshBills, createBill, updateBill, deleteBill } = usePOS()
  const { state: stockState } = useStock()

  // State variables
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [salesDivisions, setSalesDivisions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [divisionFilter, setDivisionFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  
  // Date controls state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("day")
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(), // today
  })
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)
  
  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  
  // Helper functions for filters
  const getAvailableCategories = () => {
    if (divisionFilter === "all") return categories
    return categories.filter((c) => c.parentDivisionId === divisionFilter)
  }

  const getAvailableSubcategories = () => {
    if (categoryFilter === "all") return subcategories
    return subcategories.filter((s) => s.parentCategoryId === categoryFilter)
  }

  const getPaymentMethods = () => {
    const methods = new Set<string>()
    sales.forEach((sale) => {
      if (sale.paymentMethod) methods.add(sale.paymentMethod)
    })
    return Array.from(methods).sort()
  }


  // DataHeader configuration
  const sortOptions = [
    { value: "createdAt", label: "Date Created" },
    { value: "productName", label: "Product Name" },
    { value: "totalPrice", label: "Total Price" },
    { value: "quantity", label: "Quantity" },
    { value: "paymentMethod", label: "Payment Method" },
    { value: "customerName", label: "Customer" },
  ]

  // Create filters for DataHeader (using correct interface)
  const filters = useMemo(() => [
    {
      label: "Division",
      options: [
        { id: "all", name: "All Divisions" },
        ...salesDivisions.map(division => ({ id: division.id, name: division.name }))
      ],
      selectedValues: divisionFilter !== "all" ? [divisionFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setDivisionFilter(value)
        // Reset dependent filters
        if (value === "all") {
          setCategoryFilter("all")
          setSubcategoryFilter("all")
        }
      }
    },
    {
      label: "Category",
      options: [
        { id: "all", name: "All Categories" },
        ...getAvailableCategories().map(category => ({ id: category.id, name: category.name }))
      ],
      selectedValues: categoryFilter !== "all" ? [categoryFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setCategoryFilter(value)
        // Reset dependent filter
        if (value === "all") {
          setSubcategoryFilter("all")
        }
      }
    },
    {
      label: "Subcategory",
      options: [
        { id: "all", name: "All Subcategories" },
        ...getAvailableSubcategories().map(subcategory => ({ id: subcategory.id, name: subcategory.name }))
      ],
      selectedValues: subcategoryFilter !== "all" ? [subcategoryFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setSubcategoryFilter(value)
      }
    },
    {
      label: "Payment Method",
      options: [
        { id: "all", name: "All Methods" },
        ...getPaymentMethods().map(method => ({ id: method, name: method }))
      ],
      selectedValues: paymentMethodFilter !== "all" ? [paymentMethodFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setPaymentMethodFilter(value)
      }
    }
  ], [salesDivisions, categories, subcategories, sales, divisionFilter, categoryFilter, subcategoryFilter, paymentMethodFilter])

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }


  const handleRefresh = async () => {
    await fetchData()
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    // Export functionality would be implemented here
    // Export functionality would be implemented here
  }

  // Form states for sale management
  const [saleFormOpen, setSaleFormOpen] = useState(false)
  const [saleFormMode, setSaleFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedSaleForForm, setSelectedSaleForForm] = useState<Sale | null>(null)

  const mapBillsToSales = (bills: any[]): Sale[] =>
    bills.flatMap((bill: any) =>
      (bill.items || []).map((item: any, index: number) => ({
        id: `${bill.id}-${item.id || index}`,
        billId: bill.id,
        productId: item.productId || bill.id,
        productName: item.productName || item.name || 'Unknown Product',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || item.total || bill.total || 0,
        paymentMethod: bill.paymentMethod || 'cash',
        salePrice: item.unitPrice || item.price || 0,
        measureId: 'each',
        date: new Date(bill.createdAt || Date.now()).toISOString().split('T')[0],
        time: new Date(bill.createdAt || Date.now()).toTimeString().split(' ')[0],
        tradingDate: new Date(bill.createdAt || Date.now()).toISOString().split('T')[0],
        terminalId: bill.terminalId || 'Staff',
        createdAt: bill.createdAt || Date.now(),
        customerName: bill.customerName,
      }))
    )

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [companyState.companyID, companyState.selectedSiteID])

  // Update sales data when POS state changes
  useEffect(() => {
    setSales(mapBillsToSales(posState.bills || []))
  }, [posState.bills])

  // Update products when stock state changes
  useEffect(() => {
    if (stockState.products) {
      setProducts(stockState.products)
    }
  }, [stockState.products])

  // Update category filter when division changes
  useEffect(() => {
    if (divisionFilter !== "all") {
      setCategoryFilter("all")
      setSubcategoryFilter("all")
    }
  }, [divisionFilter])

  // Update subcategory filter when category changes
  useEffect(() => {
    if (categoryFilter !== "all") {
      setSubcategoryFilter("all")
    }
  }, [categoryFilter])

  const fetchData = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    setError(null)

    try {
      // Refresh bills data from POS context
      await refreshBills()
      
      // Get products from stock context
      const productsData = stockState.products || []
      
      // For now, set empty arrays for divisions, categories, and subcategories
      // These would need to be implemented in the respective contexts
      const divisionsData: any[] = []
      const categoriesData: any[] = []
      const subcategoriesData: any[] = []

      setSales(mapBillsToSales(posState.bills || []))
      setProducts(productsData)
      setSalesDivisions(divisionsData)
      setCategories(categoriesData)
      setSubcategories(subcategoriesData)
    } catch (err) {
      debugWarn("Error fetching sales data:", err)
      setError("Failed to load sales data. Please try again.")
    }
  }

  // Get product details for a sale
  const getProductDetails = (productId: string) => {
    return products.find((p) => p.id === productId)
  }

  // Get division name
  const getDivisionName = (divisionId: string) => {
    const division = salesDivisions.find((d) => d.id === divisionId)
    return division?.name || "Unknown"
  }

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || "Unknown"
  }

  // Get subcategory name
  const getSubcategoryName = (subcategoryId: string) => {
    const subcategory = subcategories.find((s) => s.id === subcategoryId)
    return subcategory?.name || "Unknown"
  }

  // Filter sales based on all criteria
  const filteredSales = sales.filter((sale) => {
    const product = getProductDetails(sale.productId)

    // Date filtering using DataHeader controls
    if (dateType === "custom") {
      const saleDate = new Date(sale.createdAt)
      if (saleDate < customDateRange.start || saleDate > customDateRange.end) {
        return false
      }
    } else {
      const saleDate = new Date(sale.createdAt)
      
      switch (dateType) {
        case "day":
          const selectedDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
          const nextDay = new Date(selectedDay.getTime() + 24 * 60 * 60 * 1000)
          if (saleDate < selectedDay || saleDate >= nextDay) {
            return false
          }
          break
        case "week":
          const startOfWeek = new Date(currentDate)
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
          startOfWeek.setHours(0, 0, 0, 0)
          const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (saleDate < startOfWeek || saleDate >= endOfWeek) {
            return false
          }
          break
        case "month":
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
          if (saleDate < startOfMonth || saleDate >= endOfMonth) {
            return false
          }
          break
      }
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        sale.productName.toLowerCase().includes(searchLower) ||
        sale.billId?.toLowerCase().includes(searchLower) ||
        sale.paymentMethod?.toLowerCase().includes(searchLower) ||
        sale.id.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false
    }

    // Division filter
    if (divisionFilter !== "all" && product?.salesDivisionId !== divisionFilter) {
      return false
    }

    // Category filter
    if (categoryFilter !== "all" && product?.categoryId !== categoryFilter) {
      return false
    }

    // Subcategory filter
    if (subcategoryFilter !== "all" && product?.subcategoryId !== subcategoryFilter) {
      return false
    }

    // Payment method filter
    if (paymentMethodFilter !== "all" && sale.paymentMethod?.toLowerCase() !== paymentMethodFilter.toLowerCase()) {
      return false
    }


    return true
  })


  // Sorting function
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const getSortedSales = () => {
    if (!sortConfig) return filteredSales

    return [...filteredSales].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Sale]
      let bValue: any = b[sortConfig.key as keyof Sale]

      // Handle special cases
      if (sortConfig.key === "productName") {
        aValue = a.productName
        bValue = b.productName
      } else if (sortConfig.key === "total") {
        aValue = a.totalPrice
        bValue = b.totalPrice
      }

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }


  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB")
  }

  const formatTime = (timeString: string) => {
    return timeString || "N/A"
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "success"
      case "card":
        return "primary"
      case "credit":
        return "warning"
      default:
        return "default"
    }
  }


  // Form handlers
  const handleOpenSaleForm = (sale: Sale | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedSaleForForm(sale)
    setSaleFormMode(mode)
    setSaleFormOpen(true)
  }

  const handleCloseSaleForm = () => {
    setSaleFormOpen(false)
    setSelectedSaleForForm(null)
    setSaleFormMode('create')
  }

  const handleSaveSale = async (saleData: any) => {
    if (!canMutate) return
    try {
      if (saleFormMode === 'create') {
        // Create new sale by creating a bill
        const billData = {
          tableNumber: saleData.tableNumber || '',
          server: saleData.server || 'System',
          items: [{
            id: saleData.productId,
            productId: saleData.productId,
            productName: saleData.productName,
            quantity: saleData.quantity,
            unitPrice: saleData.unitPrice,
            totalPrice: saleData.totalPrice,
            createdAt: Date.now()
          }],
          subtotal: saleData.totalPrice,
          tax: 0,
          serviceCharge: 0,
          total: saleData.totalPrice,
          status: 'closed' as const,
          paymentMethod: saleData.paymentMethod,
          paymentStatus: 'completed' as const,
          customerName: saleData.customerName || 'Walk-in',
          terminalId: saleData.terminalId || 'Staff'
        }
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(billData).filter(([_, value]) => value !== undefined)
        )
        await createBill(createPayload)
      } else if (saleFormMode === 'edit' && saleData.billId) {
        // Include id in update payload (required for proper updates)
        const updatePayload: any = {
          id: saleData.billId,
          customerName: saleData.customerName,
          paymentMethod: saleData.paymentMethod,
          terminalId: saleData.terminalId,
          tableNumber: saleData.tableNumber
        }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBill(saleData.billId, updatePayload)
      }

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "ordersTableModal1",
        crudMode: saleFormMode,
        id: saleData?.billId ?? selectedSaleForForm?.billId,
        itemLabel: saleData?.productName,
      })
      
      await fetchData() // Refresh data
      handleCloseSaleForm()
    } catch (error) {
      debugWarn('Error saving sale:', error)
    }
  }

  const handleDeleteSale = async (_saleId: string, billId: string) => {
    if (!canRemove) return
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await deleteBill(billId)
        await fetchData() // Refresh data
      } catch (error) {
        debugWarn('Error deleting sale:', error)
      }
    }
  }

  // No loading indicators — UI renders and fills as data arrives (like HR section)

  return (
    <Box sx={{ p: 0}}>
      {/* DataHeader */}
      <DataHeader
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        customStartDate={customDateRange.start}
        customEndDate={customDateRange.end}
        onCustomDateRangeChange={(start, end) => setCustomDateRange({ start, end })}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search sales..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onRefresh={handleRefresh}
        onCreateNew={() => handleOpenSaleForm(null, 'create')}
        createButtonLabel="Create Sale"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit orders."
      />

      {/* Stats Cards */}
      <StatsSection
        stats={[
          {
            value: filteredSales.length,
            label: "Total Sales",
            color: "primary"
          },
          {
            value: filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0).toFixed(2),
            label: "Total Revenue",
            color: "success",
            prefix: "£"
          },
          {
            value: filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
            label: "Items Sold",
            color: "info"
          },
          {
            value: filteredSales.length > 0
              ? (filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0) / filteredSales.length).toFixed(2)
              : '0.00',
            label: "Avg Sale Value",
            color: "warning",
            prefix: "£"
          }
        ]}
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}



      {/* Sales Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" onClick={() => requestSort("id")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                Sale ID {sortConfig?.key === "id" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center" onClick={() => requestSort("productName")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                Product {sortConfig?.key === "productName" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center">Category</TableCell>
              <TableCell align="center" onClick={() => requestSort("quantity")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                Quantity {sortConfig?.key === "quantity" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center" onClick={() => requestSort("salePrice")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                Unit Price {sortConfig?.key === "salePrice" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center" onClick={() => requestSort("total")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                Total {sortConfig?.key === "total" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center">Payment Method</TableCell>
              <TableCell align="center" onClick={() => requestSort("date")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                Date {sortConfig?.key === "date" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center">Time</TableCell>
              <TableCell align="center" onClick={() => requestSort("billId")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                Bill ID {sortConfig?.key === "billId" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedSales().map((sale) => {
              const product = getProductDetails(sale.productId)
              return (
                <TableRow 
                  key={sale.id} 
                  hover
                  onClick={() => handleOpenSaleForm(sale, 'view')}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="medium">
                      {sale.id}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{sale.productName}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center" }}>
                      {product?.salesDivisionId && (
                        <Chip
                          label={getDivisionName(product.salesDivisionId)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {product?.categoryId && (
                        <Chip
                          label={getCategoryName(product.categoryId)}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                      {product?.subcategoryId && (
                        <Chip
                          label={getSubcategoryName(product.subcategoryId)}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{sale.quantity}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{formatCurrency(sale.unitPrice)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(sale.totalPrice)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={sale.paymentMethod || 'N/A'}
                      size="small"
                      color={getPaymentMethodColor(sale.paymentMethod || '') as any}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{formatDate(new Date(sale.createdAt).toISOString())}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{formatTime(new Date(sale.createdAt).toTimeString().split(' ')[0])}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{sale.billId || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="Edit Sale">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenSaleForm(sale, 'edit')
                          }}
                          disabled={!canMutate}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Sale">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSale(sale.id, sale.billId || sale.id)
                          }}
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
            {getSortedSales().length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <EmptyStateCard
                    icon={PointOfSaleIcon}
                    title={
                      searchTerm ||
                      divisionFilter !== "all" ||
                      categoryFilter !== "all" ||
                      subcategoryFilter !== "all" ||
                      paymentMethodFilter !== "all"
                        ? "No sales match your filters"
                        : "No sales data available"
                    }
                    description={
                      searchTerm ||
                      divisionFilter !== "all" ||
                      categoryFilter !== "all" ||
                      subcategoryFilter !== "all" ||
                      paymentMethodFilter !== "all"
                        ? "Try adjusting your filters or search query"
                        : "Start making sales to see data here"
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Sale Form Modal */}
      <CRUDModal
        open={saleFormOpen}
        onClose={(reason) => {
          setSaleFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedSaleForForm(null)
            setSaleFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "ordersTableModal1",
          crudMode: saleFormMode,
          id: selectedSaleForForm?.billId,
          itemLabel: selectedSaleForForm?.productName,
        }}
        title={
          saleFormMode === "create"
            ? "New sale"
            : saleFormMode === "edit"
              ? "Edit sale"
              : "View sale"
        }
        icon={<ReceiptIcon />}
        mode={saleFormMode}
        onSave={saleFormMode !== "view" ? () => Promise.resolve() : undefined}
        hideSaveButton={saleFormMode === "view"}
        maxWidth="md"
      >
        <SaleForm
          sale={selectedSaleForForm}
          mode={saleFormMode}
          products={products}
          onSave={handleSaveSale}
          onCancel={handleCloseSaleForm}
        />
      </CRUDModal>
    </Box>
  )
}

export default OrdersTable
