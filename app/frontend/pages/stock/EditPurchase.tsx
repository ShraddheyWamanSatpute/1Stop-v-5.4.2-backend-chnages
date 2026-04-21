"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Divider,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  InputAdornment,
  Autocomplete,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  Merge as MergeIcon,
  Warning as WarningIcon,
  Drafts as DraftIcon,
  Send as SendIcon,
} from "@mui/icons-material"
// All company state is now handled through StockContext
// Site functionality is now part of CompanyContext
// All database operations are now handled through StockContext
import { useStock } from "../../../backend/context/StockContext"
import type { Purchase, PurchaseItem } from "../../../backend/interfaces/Stock"
import { usePermission } from "../../hooks/usePermission"

const EditPurchase: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { canView, canEdit } = usePermission()
  const canViewPage = canView("stock", "orders")
  const canMutate = canEdit("stock", "orders")
  const { 
    state: stockState, 
    savePurchase: contextSavePurchase,
    fetchAllPurchases: contextFetchAllPurchases,
  } = useStock()
  const { products, measures, suppliers, salesDivisions, categories, subcategories } = stockState

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<string>("none")
  const [duplicateRows, setDuplicateRows] = useState<number[]>([])
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  // Purchase state
  const [purchase, setPurchase] = useState<Purchase>({
    supplier: "",
    dateUK: new Date().toISOString().split("T")[0],
    timeUK: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    status: "Awaiting Submission",
    totalTax: 0,
    totalValue: 0,
    invoiceNumber: "",
    items: [],
  })

  const [originalPurchase, setOriginalPurchase] = useState<Purchase | null>(null)
  const [applySupplierToAll, setApplySupplierToAll] = useState(false)

  // Load purchase data if editing
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      setLoading(true)

      try {
        const allPurchases = await contextFetchAllPurchases()
        const purchaseToEdit = allPurchases.find((p) => p.id === id)

        if (purchaseToEdit) {
          setPurchase(purchaseToEdit)
          setOriginalPurchase(JSON.parse(JSON.stringify(purchaseToEdit)))
        } else {
          setErrorMessage("Purchase not found")
          setTimeout(() => navigate("/Stock"), 2000)
        }
      } catch (error) {
        console.error("Error fetching purchase:", error)
        setErrorMessage("Failed to load purchase. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate])

  // Check for duplicates whenever items change
  useEffect(() => {
    findDuplicateRows()
  }, [purchase.items])

  // Add a new purchase item
  const addPurchaseItem = () => {
    setPurchase((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          productName: "",
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          // Legacy fields for compatibility
          itemID: "",
          name: "",
          supplierId: applySupplierToAll ? prev.supplier : "",
          measureId: "",
          measureName: "",
          taxPercent: 20,
          priceExcludingVAT: 0,
          taxAmount: 0,
          salesDivisionId: "",
          categoryId: "",
          subcategoryId: "",
          type: "",
        },
      ],
    }))
  }

  // Update a purchase item
  const updatePurchaseItem = (index: number, changes: Partial<PurchaseItem>) => {
    setPurchase((prev) => {
      const updatedItems = [...prev.items]
      updatedItems[index] = { ...updatedItems[index], ...changes }

      // Recalculate totals
      const quantity = updatedItems[index].quantity || 0
      const unitPrice = updatedItems[index].unitPrice || 0
      const taxPercent = updatedItems[index].taxPercent || 0

      const totalPrice = quantity * unitPrice
      const taxAmount = (totalPrice * taxPercent) / (100 + taxPercent)
      const priceExcludingVAT = totalPrice - taxAmount

      updatedItems[index] = {
        ...updatedItems[index],
        totalPrice,
        taxAmount,
        priceExcludingVAT,
      }

      // Update purchase totals
      const newTotalTax = updatedItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
      const newTotalValue = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

      return {
        ...prev,
        items: updatedItems,
        totalTax: newTotalTax,
        totalValue: newTotalValue,
      }
    })
  }

  // Handle product selection
  const handleProductChange = (index: number, product: any) => {
    if (!product) return

    const defaultMeasureId = product.purchase?.defaultMeasure || ""
    const defaultUnit = measures.find((m) => m.id === defaultMeasureId)
    const defaultSupplierId = product.purchase?.defaultSupplier || ""
    const defaultPrice = product.purchase?.price || 0

    updatePurchaseItem(index, {
      itemID: product.id,
      name: product.name,
      supplierId: applySupplierToAll ? purchase.supplier : defaultSupplierId,
      measureId: defaultMeasureId,
      measureName: defaultUnit?.name || "Unknown Unit",
      unitPrice: defaultPrice,
      salesDivisionId: product.salesDivisionId || "",
      categoryId: product.categoryId || "",
      subcategoryId: product.subcategoryId || "",
      type: product.type || "",
    })
  }

  // Delete a purchase item
  const deletePurchaseItem = (index: number) => {
    setPurchase((prev) => {
      const updatedItems = [...prev.items]
      updatedItems.splice(index, 1)

      // Update purchase totals
      const newTotalTax = updatedItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
      const newTotalValue = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

      return {
        ...prev,
        items: updatedItems,
        totalTax: newTotalTax,
        totalValue: newTotalValue,
      }
    })
  }

  // Calculate totals
  const calculateTotals = () => {
    const totalTax = purchase.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
    const totalValue = purchase.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const subtotal = totalValue - totalTax

    return { totalTax, totalValue, subtotal }
  }

  const totals = calculateTotals()

  // Revert changes
  const handleRevert = () => {
    if (originalPurchase) {
      setPurchase(JSON.parse(JSON.stringify(originalPurchase)))
    } else {
      setPurchase({
        supplier: "",
        dateUK: new Date().toISOString().split("T")[0],
        timeUK: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        status: "Awaiting Submission",
        totalTax: 0,
        totalValue: 0,
        invoiceNumber: "",
        items: [],
      })
    }
    setDuplicateRows([])
  }

  // Function to find duplicate rows
  const findDuplicateRows = () => {
    const duplicateGroups: { [key: string]: number[] } = {}
    const duplicates: number[] = []

    purchase.items.forEach((item, index) => {
      if (!item.itemID || !item.measureId) return

      const key = `${item.itemID}-${item.measureId}-${item.supplierId}-${item.unitPrice}-${item.taxPercent}`
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = []
      }
      duplicateGroups[key].push(index)
    })

    // Find groups with more than one item
    Object.values(duplicateGroups).forEach((group) => {
      if (group.length > 1) {
        duplicates.push(...group)
      }
    })

    setDuplicateRows(duplicates)
  }

  // Function to get duplicate groups for combining
  const getDuplicateGroups = () => {
    const duplicateGroups: { [key: string]: { items: PurchaseItem[]; indices: number[] } } = {}

    purchase.items.forEach((item, index) => {
      if (!item.itemID || !item.measureId) return

      const key = `${item.itemID}-${item.measureId}-${item.supplierId}-${item.unitPrice}-${item.taxPercent}`
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = { items: [], indices: [] }
      }
      duplicateGroups[key].items.push(item)
      duplicateGroups[key].indices.push(index)
    })

    // Return only groups with duplicates
    return Object.entries(duplicateGroups).filter(([_, group]) => group.items.length > 1)
  }

  // Function to combine duplicate items
  const combineDuplicates = () => {
    const duplicateGroups = getDuplicateGroups()

    if (duplicateGroups.length === 0) {
      setErrorMessage("No duplicates found to combine.")
      return
    }

    setPurchase((prev) => {
      const newItems: PurchaseItem[] = []
      const processedIndices = new Set<number>()

      duplicateGroups.forEach(([_, group]) => {
        // Combine all items in this group
        const combinedItem = { ...group.items[0] }
        combinedItem.quantity = group.items.reduce((sum, item) => sum + (item.quantity || 0), 0)

        // Recalculate totals for combined item
        const totalPrice = combinedItem.quantity * (combinedItem.unitPrice || 0)
        const taxAmount = (totalPrice * (combinedItem.taxPercent || 0)) / (100 + (combinedItem.taxPercent || 0))
        const priceExcludingVAT = totalPrice - taxAmount

        combinedItem.totalPrice = totalPrice
        combinedItem.taxAmount = taxAmount
        combinedItem.priceExcludingVAT = priceExcludingVAT

        newItems.push(combinedItem)
        group.indices.forEach((index) => processedIndices.add(index))
      })

      // Add non-duplicate items
      prev.items.forEach((item, index) => {
        if (!processedIndices.has(index)) {
          newItems.push(item)
        }
      })

      // Update purchase totals
      const newTotalTax = newItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
      const newTotalValue = newItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

      return {
        ...prev,
        items: newItems,
        totalTax: newTotalTax,
        totalValue: newTotalValue,
      }
    })

    setSuccessMessage("Duplicate items have been combined successfully!")
    setShowDuplicateDialog(false)
  }

  // Save purchase
  const handleSave = async (status: "Awaiting Submission" | "Awaiting Approval") => {
    // All data operations are now handled through StockContext
    if (!canMutate) {
      setErrorMessage("You don't have permission to edit Stock Orders/Purchases.")
      return
    }

    if (!purchase.supplier) {
      setErrorMessage("Please select a supplier")
      return
    }

    if (purchase.items.length === 0) {
      setErrorMessage("Please add at least one item")
      return
    }

    // Check for duplicates before submitting for approval
    if (duplicateRows.length > 0 && status === "Awaiting Approval") {
      setShowDuplicateDialog(true)
      return
    }

    setSaving(true)

    try {
      const finalPurchase: Purchase = {
        ...purchase,
        status: status,
        totalTax: totals.totalTax,
        totalValue: totals.totalValue,
      }

      await contextSavePurchase(finalPurchase)

      const message =
        status === "Awaiting Submission"
          ? "Purchase updated and saved as draft successfully!"
          : "Purchase updated and submitted for approval successfully!"

      setSuccessMessage(message)

      setTimeout(() => {
        navigate("/Stock")
      }, 2000)
    } catch (error) {
      console.error("Error saving purchase:", error)
      setErrorMessage("Failed to save purchase. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Group items by selected field
  const getGroupName = (item: PurchaseItem, field: string): string => {
    if (field === "supplierId") {
      const supplier = suppliers.find((s) => s.id === item.supplierId)
      return supplier ? supplier.name : "Unassigned"
    }
    if (field === "salesDivisionId") {
      const sd = salesDivisions.find((sd) => sd.id === item.salesDivisionId)
      return sd ? sd.name : "Unassigned"
    }
    if (field === "categoryId") {
      const cat = categories.find((c) => c.id === item.categoryId)
      return cat ? cat.name : "Unassigned"
    }
    if (field === "subcategoryId") {
      const sub = subcategories.find((sc) => sc.id === item.subcategoryId)
      return sub ? sub.name : "Unassigned"
    }
    if (field === "type") {
      return item.type || "Unassigned"
    }
    if (field === "itemID") {
      const product = products.find((p) => p.id === item.itemID)
      return product ? product.name : "Unassigned"
    }
    return "Unassigned"
  }

  const groupItems = (items: PurchaseItem[], groupField: string) => {
    if (groupField === "none") return items

    const groups: Record<string, PurchaseItem[]> = {}

    items.forEach((item) => {
      const groupKey = getGroupName(item, groupField)
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(item)
    })

    return Object.entries(groups).flatMap(([groupKey, groupItems]) => [
      { groupKey, isGroupHeader: true } as any,
      ...groupItems,
    ])
  }

  const groupedItems = groupItems(purchase.items, groupBy)

  // Handle supplier change
  const handleSupplierChange = (supplierId: string) => {
    setPurchase((prev) => {
      const updatedPurchase = { ...prev, supplier: supplierId }

      // If apply to all is checked, update all items
      if (applySupplierToAll) {
        updatedPurchase.items = prev.items.map((item) => ({
          ...item,
          supplierId,
        }))
      }

      return updatedPurchase
    })
  }

  // Handle apply supplier to all toggle
  const handleApplySupplierToAllChange = (checked: boolean) => {
    setApplySupplierToAll(checked)

    // If toggled on and we have a supplier selected, apply it to all items
    if (checked && purchase.supplier) {
      setPurchase((prev) => ({
        ...prev,
        items: prev.items.map((item) => ({
          ...item,
          supplierId: prev.supplier,
        })),
      }))
    }
  }

  const handleCloseSnackbar = () => {
    setSuccessMessage("")
    setErrorMessage(null)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Awaiting Submission":
        return "default"
      case "Awaiting Approval":
        return "warning"
      case "Approved":
        return "success"
      default:
        return "default"
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading purchase data...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: "1200px", mx: "auto" }}>
      {!canViewPage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You don't have permission to view Stock Orders/Purchases.
        </Alert>
      )}
      {!canMutate && canViewPage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to Stock Orders/Purchases.
        </Alert>
      )}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Duplicate Items Dialog */}
      <Dialog open={showDuplicateDialog} onClose={() => setShowDuplicateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WarningIcon color="warning" />
            Duplicate Items Detected
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            The following duplicate items were found. Would you like to combine them before submitting?
          </Typography>
          <List>
            {getDuplicateGroups().map(([, group], index) => {
              const product = products.find((p) => p.id === group.items[0].itemID)
              const measure = measures.find((m) => m.id === group.items[0].measureId)
              const supplier = suppliers.find((s) => s.id === group.items[0].supplierId)

              return (
                <ListItem key={index} sx={{ bgcolor: "rgba(255, 0, 0, 0.1)", mb: 1, borderRadius: 1 }}>
                  <ListItemText
                    primary={`${product?.name || "Unknown Product"} - ${measure?.name || "Unknown Unit"}`}
                    secondary={`Supplier: ${supplier?.name || "Unknown"} | ${group.items.length} duplicate entries | Total Quantity: ${group.items.reduce((sum, item) => sum + item.quantity, 0)}`}
                  />
                </ListItem>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDuplicateDialog(false)}>Cancel</Button>
          <Button onClick={combineDuplicates} variant="contained" color="primary" startIcon={<MergeIcon />}>
            Combine Duplicates
          </Button>
          <Button
            onClick={() => {
              setShowDuplicateDialog(false)
              handleSave("Awaiting Approval")
            }}
            variant="outlined"
            color="warning"
          >
            Submit Anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
            Edit Purchase Order
          </Typography>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href="/" onClick={() => navigate("/")}>
              Dashboard
            </Link>
            <Link color="inherit" href="/Stock" onClick={() => navigate("/Stock")}>
              Stock
            </Link>
            <Typography color="text.primary">Edit Purchase Order</Typography>
          </Breadcrumbs>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/Stock")}
          sx={{ borderRadius: 2 }}
        >
          Back to Stock
        </Button>
      </Box>

      <Card elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: "visible" }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: "bold" }}>
                  Purchase Order Details
                </Typography>
                {purchase.status && (
                  <Chip label={purchase.status} color={getStatusColor(purchase.status) as any} size="small" />
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                label="Invoice Number"
                name="invoiceNumber"
                value={purchase.invoiceNumber}
                onChange={(e) => setPurchase({ ...purchase, invoiceNumber: e.target.value })}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                label="Date"
                name="date"
                type="date"
                value={purchase.dateUK}
                onChange={(e) => setPurchase({ ...purchase, dateUK: e.target.value })}
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option: any) => option.name || ""}
                value={suppliers.find((s) => s.id === purchase.supplier) || null}
                onChange={(_, newValue) => handleSupplierChange(newValue?.id || "")}
                renderInput={(params) => <TextField {...params} label="Supplier" required fullWidth />}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={applySupplierToAll}
                    onChange={(e) => handleApplySupplierToAllChange(e.target.checked)}
                    color="primary"
                  />
                }
                label="Apply supplier to all items"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h2" sx={{ fontWeight: "bold" }}>
                  Order Items
                  {duplicateRows.length > 0 && (
                    <Chip
                      label={`${duplicateRows.length} duplicates`}
                      color="error"
                      size="small"
                      sx={{ ml: 2 }}
                      icon={<WarningIcon />}
                    />
                  )}
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Group By</InputLabel>
                    <Select value={groupBy} label="Group By" onChange={(e) => setGroupBy(e.target.value)}>
                      <MenuItem value="none">No Grouping</MenuItem>
                      <MenuItem value="itemID">Product</MenuItem>
                      <MenuItem value="supplierId">Supplier</MenuItem>
                      <MenuItem value="salesDivisionId">Sales Division</MenuItem>
                      <MenuItem value="categoryId">Category</MenuItem>
                      <MenuItem value="subcategoryId">Subcategory</MenuItem>
                      <MenuItem value="type">Type</MenuItem>
                    </Select>
                  </FormControl>

                  {duplicateRows.length > 0 && (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<MergeIcon />}
                      onClick={() => setShowDuplicateDialog(true)}
                    >
                      Combine Duplicates
                    </Button>
                  )}

                  <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={addPurchaseItem}>
                    Add Item
                  </Button>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
                <Table>
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Measure</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Supplier</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Quantity
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Unit Price
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Tax %
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Tax Amount
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Total
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="center">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                          <Typography variant="body1" color="text.secondary">
                            No items added yet. Click "Add Item" to start.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedItems.map((item: any, idx) =>
                        item.isGroupHeader ? (
                          <TableRow key={`group-${idx}`} sx={{ bgcolor: "rgba(0, 0, 0, 0.04)" }}>
                            <TableCell colSpan={9} sx={{ fontWeight: "bold" }}>
                              {item.groupKey}
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow
                            key={`item-${idx}`}
                            sx={{
                              ...(duplicateRows.includes(
                                purchase.items.findIndex(
                                  (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                ),
                              )
                                ? { bgcolor: "error.light", border: 2, borderColor: "error.main" }
                                : {}),
                            }}
                          >
                            <TableCell>
                              <Autocomplete
                                options={products}
                                getOptionLabel={(option: any) => option.name || ""}
                                value={products.find((p) => p.id === item.itemID) || null}
                                onChange={(_, newValue) =>
                                  handleProductChange(
                                    purchase.items.findIndex(
                                      (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                    ),
                                    newValue,
                                  )
                                }
                                renderInput={(params) => <TextField {...params} fullWidth />}
                              />
                            </TableCell>
                            <TableCell>
                              <Autocomplete
                                options={measures}
                                getOptionLabel={(option: any) => option.name || ""}
                                value={measures.find((m) => m.id === item.measureId) || null}
                                onChange={(_, newValue) => {
                                  const index = purchase.items.findIndex(
                                    (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                  )
                                  updatePurchaseItem(index, {
                                    measureId: newValue?.id || "",
                                    measureName: newValue?.name || "Unknown Unit",
                                  })
                                }}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                              />
                            </TableCell>
                            <TableCell>
                              <Autocomplete
                                options={suppliers}
                                getOptionLabel={(option: any) => option.name || ""}
                                value={suppliers.find((s) => s.id === item.supplierId) || null}
                                onChange={(_, newValue) => {
                                  const index = purchase.items.findIndex(
                                    (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                  )
                                  updatePurchaseItem(index, {
                                    supplierId: newValue?.id || "",
                                  })
                                }}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                                disabled={applySupplierToAll}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const index = purchase.items.findIndex(
                                    (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                  )
                                  updatePurchaseItem(index, {
                                    quantity: Number(e.target.value) || 0,
                                  })
                                }}
                                InputProps={{
                                  inputProps: { min: 0, step: 0.01 },
                                }}
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const index = purchase.items.findIndex(
                                    (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                  )
                                  updatePurchaseItem(index, {
                                    unitPrice: Number(e.target.value) || 0,
                                  })
                                }}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                                  inputProps: { min: 0, step: 0.01 },
                                }}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                value={item.taxPercent}
                                onChange={(e) => {
                                  const index = purchase.items.findIndex(
                                    (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                  )
                                  updatePurchaseItem(index, {
                                    taxPercent: Number(e.target.value) || 0,
                                  })
                                }}
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                  inputProps: { min: 0, max: 100, step: 0.1 },
                                }}
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell align="right">£{item.taxAmount?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell align="right">£{item.totalPrice?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell align="center">
                              <IconButton
                                color="error"
                                onClick={() => {
                                  const index = purchase.items.findIndex(
                                    (i) => i.itemID === item.itemID && i.measureId === item.measureId,
                                  )
                                  deletePurchaseItem(index)
                                }}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" component="h2" sx={{ fontWeight: "bold", mb: 2 }}>
                Order Summary
              </Typography>
            </Grid>

            <Grid item xs={12} md={6} />
            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body1">Subtotal:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    £{totals.subtotal.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body1">Tax:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    £{totals.totalTax.toFixed(2)}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6" fontWeight="bold">
                    Total:
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                    £{totals.totalValue.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid
              item
              xs={12}
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 2,
              }}
            >
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleRevert}>
                Revert Changes
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DraftIcon />}
                onClick={() => handleSave("Awaiting Submission")}
                disabled={saving || !canMutate || !canViewPage}
              >
                {saving ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    Saving...
                  </>
                ) : (
                  "Save as Draft"
                )}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={() => handleSave("Awaiting Approval")}
                disabled={saving || !canMutate || !canViewPage}
              >
                {saving ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    Submitting...
                  </>
                ) : (
                  "Update & Submit"
                )}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}

export default EditPurchase
