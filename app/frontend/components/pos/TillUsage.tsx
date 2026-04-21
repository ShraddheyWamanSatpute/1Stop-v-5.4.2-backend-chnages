"use client"

import { alpha } from "@mui/material/styles";
import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Chip,
  FormControlLabel,
  Checkbox,
  Card as TillCardComponent,
  CardContent,
  AppBar,
  Toolbar,
  Badge,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material"
import {
  Close,
  TableRestaurant,
  Add,
  Remove,
  Payment,
  Cancel,
  Edit,
  Message,
  Person,
  Receipt,
  Fullscreen,
  FullscreenExit,
  CheckCircle,
  Warning,
  Delete,
  Refresh,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import { usePOS } from "../../../backend/context/POSContext"
// All operations now come from POSContext
import type { Bill, BillItem, Table, FloorPlan, TillScreen, PaymentType } from "../../../backend/interfaces/POS"
import type { Card } from "../../../backend/interfaces/POS"
import type { Product } from "../../../backend/interfaces/Stock"
import CanvasArea from "./TillCanvasArea"
import DataHeader from "../reusable/DataHeader"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"
import { themeConfig } from "../../../theme/AppTheme"

// Add these interfaces at the top of the file after existing imports
interface TillUsageComponentProps {
  screenId?: string
  cards?: Card[]
  onUpdateCards?: (cards: Card[]) => void
  isEmbedded?: boolean
  initialFullscreen?: boolean
}

interface NumberPadState {
  currentNumber: string
  isActive: boolean
}

interface TableBillManagementProps {
  open: boolean
  table: Table | null
  bill: Bill | null
  onClose: () => void
  onUpdateBill: (bill: Bill) => void
}

interface ProductDetailProps {
  open: boolean
  product: Product | null
  onClose: () => void
  onAddToBill: (product: Product, quantity: number) => void
}

const ProductDetailDialog: React.FC<ProductDetailProps> = ({ open, product, onClose, onAddToBill }) => {
  const [quantity, setQuantity] = useState(1)

  const handleAddToBill = () => {
    if (product) {
      onAddToBill(product, quantity)
      onClose()
      setQuantity(1)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{product?.name}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {product && (
          <Box>
            {product.image && (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px" }}
                />
              </Box>
            )}

            <Typography variant="body1" gutterBottom>
              <strong>Description:</strong> {product.description || "No description available"}
            </Typography>

            <Typography variant="body1" gutterBottom>
              <strong>Price:</strong> £{(product.salesPrice || product.price || 0).toFixed(2)}
            </Typography>

            {product.course && (
              <Typography variant="body1" gutterBottom>
                <strong>Course:</strong> {product.course}
              </Typography>
            )}

            <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 2 }}>
              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                size="small"
                sx={{ width: "100px" }}
              />
              <Button variant="contained" onClick={handleAddToBill} startIcon={<Add />} size="large">
                Add to Bill
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Table Bill Management Component - Used for advanced bill management
const TableBillManagement: React.FC<TableBillManagementProps> = ({ open, table, bill, onClose, onUpdateBill }) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [covers] = useState(2)
  const [customerName] = useState("")

  const handleItemAction = (action: string, itemIds: string[]) => {
    if (!bill) return

    const updatedItems = bill.items.map((item) => {
      if (itemIds.includes(item.id)) {
        switch (action) {
          case "void":
            return { ...item, status: "voided" as const }
          case "waste":
            return { ...item, status: "wasted" as const }
          case "clear":
            return { ...item, status: "active" as const }
          default:
            return item
        }
      }
      return item
    })

    const updatedBill = { ...bill, items: updatedItems }
    onUpdateBill(updatedBill)
    setSelectedItems(new Set())
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Table Management - {table?.name} {bill ? `(Bill)` : ""}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Table Info */}
          <Grid item xs={12} md={4}>
            <TillCardComponent>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Table Information
                </Typography>
                <Typography>Table: {table?.name}</Typography>
                <Typography>Covers: {covers}</Typography>
                <Typography>Customer: {customerName || "Walk-in"}</Typography>
                <Box mt={2}>
                  <Button variant="outlined" startIcon={<Person />} sx={{ mr: 1, mb: 1 }}>
                    Edit Covers
                  </Button>
                  <Button variant="outlined" startIcon={<Edit />} sx={{ mr: 1, mb: 1 }}>
                    Edit Name
                  </Button>
                  <Button variant="outlined" startIcon={<Message />} sx={{ mr: 1, mb: 1 }}>
                    Booking Data
                  </Button>
                </Box>
              </CardContent>
            </TillCardComponent>
          </Grid>

          {/* Bill Items */}
          <Grid item xs={12} md={8}>
            <TillCardComponent>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Bill Items</Typography>
                  <Box>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleItemAction("void", Array.from(selectedItems))}
                      disabled={selectedItems.size === 0}
                      sx={{ mr: 1 }}
                    >
                      Void Selected
                    </Button>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<Warning />}
                      onClick={() => handleItemAction("waste", Array.from(selectedItems))}
                      disabled={selectedItems.size === 0}
                      sx={{ mr: 1 }}
                    >
                      Waste Selected
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleItemAction("clear", Array.from(selectedItems))}
                      disabled={selectedItems.size === 0}
                    >
                      Clear Status
                    </Button>
                  </Box>
                </Box>

                <List>
                  {bill?.items.map((item) => (
                    <ListItem key={item.id} divider>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedItems)
                              if (e.target.checked) {
                                newSelected.add(item.id)
                              } else {
                                newSelected.delete(item.id)
                              }
                              setSelectedItems(newSelected)
                            }}
                          />
                        }
                        label=""
                      />
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography>{item.productName}</Typography>
                            {/* BillItem interface doesn't have status property */}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Qty: {item.quantity} × £{item.unitPrice.toFixed(2)} = £
                              {item.totalPrice.toFixed(2)}
                            </Typography>
                            {item.notes && (
                              <Typography variant="caption" color="text.secondary">
                                Note: {item.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Box>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                        <IconButton size="small">
                          <Message />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>

                {bill && (
                  <Box mt={2} p={2} bgcolor={alpha(themeConfig.brandColors.navy, 0.04)} borderRadius={1}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography>Subtotal:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography align="right">£{bill.subtotal.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography>Service Charge:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography align="right">£{0.00}</Typography> {/* Bill interface doesn't have serviceCharge property */}
                      </Grid>
                      <Grid item xs={6}>
                        <Typography>VAT:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography align="right">£{bill.tax.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="h6">Total:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="h6" align="right">
                          £{bill.total.toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </TillCardComponent>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  )
}

interface FunctionalNumberPadProps {
  onNumberClick: (number: string) => void
  currentNumber: string
}

const FunctionalNumberPad: React.FC<FunctionalNumberPadProps> = ({ onNumberClick, currentNumber }) => {
  const buttons = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["clear", "0", "enter"],
  ]

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Display current number */}
      <Box
        sx={{
          p: 1,
          bgcolor: alpha(themeConfig.brandColors.navy, 0.04),
          textAlign: "center",
          minHeight: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          {currentNumber || "0"}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, display: "grid", gridTemplateRows: "repeat(4, 1fr)", gap: 1, p: 1 }}>
        {buttons.map((row, rowIndex) => (
          <Box key={rowIndex} sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {row.map((btn) => (
              <Button
                key={btn}
                variant="contained"
                onClick={() => onNumberClick(btn)}
                sx={{
                  height: "100%",
                  fontSize: "1.2rem",
                  bgcolor: btn === "clear" ? "error.main" : btn === "enter" ? "success.main" : themeConfig.brandColors.navy,
                }}
              >
                {btn === "clear" ? "C" : btn === "enter" ? "✓" : btn}
              </Button>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// Update the main component declaration
const TillUsage: React.FC<TillUsageComponentProps> = ({
  screenId: propScreenId,
  cards: propCards = [],
  onUpdateCards = () => {},
  isEmbedded = false,
  initialFullscreen = false,
}) => {
  const { state: stockState } = useStock()
  const { state: posState, companyId, refreshAll } = usePOS()

  // State management
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen)
  const [currentBill, setCurrentBill] = useState<Bill | null>(null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [currentFloorPlan, setCurrentFloorPlan] = useState<FloorPlan | null>(null)
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [openBills, setOpenBills] = useState<Bill[]>([])
  const [localProducts, setLocalProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Till Screen Management
  const [availableScreens, setAvailableScreens] = useState<TillScreen[]>([])
  const [selectedScreenId, setSelectedScreenId] = useState<string>(propScreenId || "")
  const [currentScreen, setCurrentScreen] = useState<TillScreen | null>(null)
  const [cards, setCards] = useState<Card[]>(propCards)

  // Canvas settings from screen
  const [canvasWidth, setCanvasWidth] = useState(1600)
  const [canvasHeight, setCanvasHeight] = useState(900)
  const [aspectRatio, setAspectRatio] = useState("16:9")

  // UI State
  const [floorPlanDialog, setFloorPlanDialog] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState(false)
  
  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  const [tableManagementDialog, setTableManagementDialog] = useState(false)
  const [productDetailDialog, setProductDetailDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  // Number pad state
  const [numberPad, setNumberPad] = useState<NumberPadState>({
    currentNumber: "",
    isActive: false,
  })

  // Long press handling
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // Load available till screens
  useEffect(() => {
    if (!companyId) return

    // Use POS context functions instead of direct database calls
    // Load till screens using POS context
    const loadScreens = async () => {
      try {
        await refreshAll()
        setAvailableScreens(posState.tillScreens)

      // If no screen is selected, select the default or first screen
      if (!selectedScreenId && posState.tillScreens.length > 0) {
        const defaultScreen = posState.tillScreens.find((s) => s.isDefault) || posState.tillScreens[0]
        setSelectedScreenId(defaultScreen.id)
      }

      } catch (error) {
        debugWarn("Error loading till screens:", error)
      }
    }

    loadScreens()
  }, [companyId])

  // Load selected screen data
  useEffect(() => {
    if (!selectedScreenId || !availableScreens.length) return

    const screen = availableScreens.find((s) => s.id === selectedScreenId)
    if (screen) {
      setCurrentScreen(screen)
      // Convert TillScreenLayout cards to Card[] format
      if (screen.layout && Array.isArray(screen.layout.cards)) {
        setCards(screen.layout.cards as Card[])
      } else {
        setCards([])
      }

      // Apply screen settings if available
      const screenWithSettings = screen as any
      if (screenWithSettings.settings) {
        setCanvasWidth(screenWithSettings.settings.canvasWidth || 1600)
        setCanvasHeight(screenWithSettings.settings.canvasHeight || 900)
        setAspectRatio(screenWithSettings.settings.aspectRatio || "16:9")
      }
    }
  }, [selectedScreenId, availableScreens])

  // Load till data function
  const loadTillData = async () => {
    if (!companyId) return
    
    try {
      // Get data from contexts
      const tablesData = posState.tables || []
      const floorPlansData = posState.floorPlans || []
      const paymentTypesData = posState.paymentTypes || []
      const openBillsData = posState.bills.filter(bill => bill.status === 'open') || []

      setTables(tablesData)
      setCurrentFloorPlan(floorPlansData[0] || null)
      setPaymentTypes(paymentTypesData)
      setOpenBills(openBillsData)
      setLocalProducts(stockState.products || [])
      setCategories(stockState.categories || [])
    } catch (error) {
      setNotification({ message: "Failed to load till data", type: "error" })
    }
  }

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (!companyId || !selectedScreenId) return
    loadTillData()
  }, [companyId, selectedScreenId, stockState.products, stockState.categories])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleNumberPadClick = (number: string) => {
    if (number === "clear") {
      setNumberPad({ currentNumber: "", isActive: false })
    } else if (number === "enter") {
      setNumberPad({ ...numberPad, isActive: true })
    } else {
      setNumberPad({
        currentNumber: numberPad.currentNumber + number,
        isActive: true,
      })
    }
  }

  const calculateBillTotals = (items: BillItem[]) => {
    // BillItem interface doesn't have status property, so use all items
    const activeItems = items
    const subtotal = activeItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const serviceCharge = subtotal * 0.125 // 12.5%
    const tax = subtotal * 0.2 // 20% VAT
    const total = subtotal + serviceCharge + tax

    return { subtotal, serviceCharge, tax, total }
  }

  const createNewBill = (tableNumber?: string): Bill => {
    return {
      id: `BILL-${Date.now()}`,
      tableName: tableNumber || "",
      items: [],
      total: 0,
      subtotal: 0,
      tax: 0,
      paymentStatus: "pending" as const,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  const addProductToBill = (product: Product, quantity = 1) => {
    let billToUpdate = currentBill

    // Create new bill if none exists
    if (!billToUpdate) {
      billToUpdate = createNewBill(selectedTable?.name)
      setCurrentBill(billToUpdate)
    }

    // Check if item already exists in bill
    const existingItemIndex = billToUpdate.items.findIndex((item) => item.id === product.id)
    let updatedItems: BillItem[]

    if (existingItemIndex >= 0) {
      // Update existing item
      updatedItems = billToUpdate.items.map((item, index) =>
        index === existingItemIndex ? { ...item, quantity: item.quantity + quantity } : item,
      )
    } else {
      // Add new item
      const newItem: BillItem = {
        id: product.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.salesPrice || product.price || 0,
        quantity: quantity,
        totalPrice: (product.salesPrice || product.price || 0) * quantity,
        createdAt: Date.now(),
      }
      updatedItems = [...billToUpdate.items, newItem]
    }

    // Calculate totals
    const totals = calculateBillTotals(updatedItems)

    const updatedBill: Bill = {
      ...billToUpdate,
      items: updatedItems,
      ...totals,
      updatedAt: Date.now(),
    }

    setCurrentBill(updatedBill)

    // Clear number pad
    setNumberPad({ currentNumber: "", isActive: false })

    // Save bill
    if (companyId) {
      // Use POS context functions instead of direct database calls
    }

    // Update open bills list
    setOpenBills((prev) => {
      const existingBillIndex = prev.findIndex((bill) => bill.id === updatedBill.id)
      if (existingBillIndex >= 0) {
        return prev.map((bill, index) => (index === existingBillIndex ? updatedBill : bill))
      } else {
        return [...prev, updatedBill]
      }
    })
  }

  const handleProductClick = (product: Product) => {
    const quantity = numberPad.isActive && numberPad.currentNumber ? Number.parseInt(numberPad.currentNumber) || 1 : 1

    addProductToBill(product, quantity)
  }

  const handleProductLongPress = (product: Product) => {
    setSelectedProduct(product)
    setProductDetailDialog(true)
  }

  const handleTableClick = (table: Table) => {
    // Check if table already has an open bill
    const existingBill = openBills.find((bill) => bill.tableName === table.name)

    if (existingBill) {
      setCurrentBill(existingBill)
      setSelectedTable(table)
    } else {
      // Create new bill for this table
      const newBill = createNewBill(table.name)
      setCurrentBill(newBill)
      setSelectedTable(table)

      // Save new bill to backend
      if (companyId) {
        // Use POS context functions instead of direct database calls
      }
    }
  }

  const handleCardClick = (card: Card) => {
    if (card.type === "function" && card.option === "numpad") {
      // Number pad is handled by the component itself
      return
    }

    if (card.type === "function" && card.option === "billWindow") {
      // Bill window is always visible
      return
    }

    if (card.type === "function" && card.option === "tablePlan") {
      setFloorPlanDialog(true)
      return
    }

    if (card.type === "function" && card.option === "productGrid") {
      // Show product selection grid - render products in grid format
      return (
        <Box sx={{ height: "100%", overflow: "auto", p: 1 }}>
          <Grid container spacing={1}>
            {localProducts
              .filter(product => !selectedCategory || product.categoryId === selectedCategory)
              .map((product) => (
                <Grid item xs={6} sm={4} md={3} key={product.id}>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{
                      height: 80,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      textAlign: "center",
                      fontSize: "0.75rem",
                    }}
                    onClick={() => handleProductClick(product)}
                  >
                    <Typography variant="caption" noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      £{(product.salesPrice || product.price || 0).toFixed(2)}
                    </Typography>
                  </Button>
                </Grid>
              ))
            }
          </Grid>
        </Box>
      )
    }

    if (card.type === "function" && card.option === "payment") {
      if (currentBill && currentBill.items.length > 0) {
        setPaymentDialog(true)
      } else {
        setNotification({ message: "No items in current bill", type: "info" })
      }
      return
    }

    if (card.type === "function" && card.option === "group" && card.data) {
      // Handle group selection - show products in this group
      const categoryId = card.data.categoryId || card.data.id
      setSelectedCategory(categoryId)
      setNotification({ message: `Showing products for ${card.data.name || 'category'}`, type: "info" })
      return
    }

    if (card.productId) {
      const product = localProducts.find(p => p.id === card.productId)
      if (product) {
        handleProductClick(product)
      }
    }
  }

  const handleCardMouseDown = (card: Card) => {
    if (card.productId) {
      const product = localProducts.find(p => p.id === card.productId)
      if (product) {
        const timer = setTimeout(() => {
          handleProductLongPress(product)
        }, 500) // 500ms for long press
        setPressTimer(timer)
      }
    }
  }

  const handleCardMouseUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }

  const removeItemFromBill = (itemId: string) => {
    if (!currentBill) return

    const updatedItems = currentBill.items
      .map((item) => (item.id === itemId && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => !(item.id === itemId && item.quantity <= 1))

    const totals = calculateBillTotals(updatedItems)

    const updatedBill: Bill = {
      ...currentBill,
      items: updatedItems,
      ...totals,
      updatedAt: Date.now(),
    }

    setCurrentBill(updatedBill)

    if (companyId) {
      // Use POS context functions instead of direct database calls
    }
  }

  const deleteItemFromBill = (itemId: string) => {
    if (!currentBill) return

    const updatedItems = currentBill.items.filter((item) => item.id !== itemId)
    const totals = calculateBillTotals(updatedItems)

    const updatedBill: Bill = {
      ...currentBill,
      items: updatedItems,
      ...totals,
      updatedAt: Date.now(),
    }

    setCurrentBill(updatedBill)

    if (companyId) {
      // Use POS context functions instead of direct database calls
    }
  }

  // Process payment and complete sale
  const processPayment = async (paymentType: PaymentType) => {
    if (!currentBill || !companyId) return

    try {
      // Create sale record
      const saleData = {
        billId: currentBill.id,
        tableId: selectedTable?.id,
        tableName: selectedTable?.name,
        items: currentBill.items.map(item => ({
          productId: item.id,
          productName: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.totalPrice
        })),
        subtotal: currentBill.subtotal,
        tax: currentBill.tax,
        total: currentBill.total,
        paymentType: paymentType.name,
        paymentMethod: paymentType.id,
        status: 'completed',
        completedAt: Date.now()
      }

      // Create sale record using StockDB
      // Use POS context functions instead of direct database calls
      const billData: any = {
        id: saleData.billId,
        tableNumber: selectedTable?.name || '',
        server: 'System',
        items: saleData.items.map(item => ({
          id: item.productId,
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal: saleData.subtotal,
        tax: saleData.tax,
        serviceCharge: 0,
        total: saleData.total,
        status: 'Closed',
        paymentType: paymentType.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: saleData.completedAt
      }
      // Create bill using POS context
      
      // Mark bill as paid/closed
      const closedBill = {
        ...currentBill,
        status: 'Closed' as const,
        paymentType: paymentType.name,
        paidAt: Date.now(),
        updatedAt: Date.now()
      }
      
      // Clear current bill and table
      setCurrentBill(null)
      setSelectedTable(null)
      setPaymentDialog(false)
      
      // Update open bills list
      const updatedOpenBills = openBills.filter(bill => bill.id !== currentBill.id)
      setOpenBills(updatedOpenBills)
      
      setNotification({ message: `Payment of £${currentBill.total.toFixed(2)} processed successfully`, type: "success" })
    } catch (error) {
      debugWarn('Error processing payment:', error)
      setNotification({ message: "Failed to process payment", type: "error" })
    }
  }



  // Render card content based on type
  const renderCardContent = (card: Card) => {
    // If card has custom content (from TillUsage), render it
    if (card.content) {
      return card.content
    }

    if (card.productId) {
      const product = localProducts.find(p => p.id === card.productId)
      if (product) {
        return (
        <Typography
          variant="body2"
          sx={{
            fontSize: `${card.fontSize || 12}px`,
              color: card.fontColor || "text.primary",
            textAlign: "center",
            padding: "4px",
            wordBreak: "break-word",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {product.name || "Product"}
        </Typography>
        )
      }
    }

    if (card.type === "function" && card.option === "numpad") {
      return <FunctionalNumberPad onNumberClick={handleNumberPadClick} currentNumber={numberPad.currentNumber} />
    }

    if (card.type === "function" && card.option === "billWindow") {
      const billStyle = card.content || "Standard"

      if (billStyle === "Compact") {
        return (
          <Paper
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 0.5,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: themeConfig.brandColors.navy,
                color: themeConfig.brandColors.offWhite,
              }}
            >
              <Typography variant="caption" fontWeight="bold">
                {selectedTable ? `Table ${selectedTable.name}` : "No Table"} • #{currentBill?.id.substring(5) || "----"}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 0.5 }}>
              {currentBill && currentBill.items.length > 0 ? (
                <Box>
                  {currentBill.items.map((item) => (
                    <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption">
                        {item.quantity}x {item.productName}
                      </Typography>
                      <Typography variant="caption">£{item.totalPrice.toFixed(2)}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" align="center">
                  No items
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 0.5, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" fontWeight="bold">
                  Total:
                </Typography>
                <Typography variant="caption" fontWeight="bold">
                  £{currentBill?.total.toFixed(2) || "0.00"}
                </Typography>
              </Box>
              <Button variant="contained" size="small" fullWidth sx={{ mt: 0.5, fontSize: "0.6rem" }}>
                Pay
              </Button>
            </Box>
          </Paper>
        )
      } else if (billStyle === "Detailed") {
        return (
          <Paper
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 1,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: themeConfig.brandColors.navy,
                color: themeConfig.brandColors.offWhite,
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {selectedTable ? `Table ${selectedTable.name} - Main Floor` : "No Table Selected"}
              </Typography>
              <Typography variant="caption">
                Bill #{currentBill?.id.substring(5) || "----"} • Server: Current User
              </Typography>
              <Typography variant="caption" display="block">
                Started: {currentBill ? new Date(currentBill.createdAt).toLocaleTimeString() : "--:--"}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
              {currentBill && currentBill.items.length > 0 ? (
                <List dense>
                  {currentBill.items.map((item) => (
                    <ListItem
                      key={item.id}
                      sx={{ px: 0, py: 0.5 }}
                      secondaryAction={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <IconButton size="small" onClick={() => removeItemFromBill(item.id)}>
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography variant="caption" sx={{ minWidth: 20, textAlign: "center" }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              (() => {
                                const product = localProducts.find(p => p.id === item.productId)
                                if (product) {
                                  addProductToBill(product, 1)
                                }
                              })()
                            }
                          >
                            <Add fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteItemFromBill(item.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={<Typography variant="body2">{item.productName}</Typography>}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              £{item.unitPrice.toFixed(2)} each
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Subtotal: £{item.totalPrice.toFixed(2)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    No items added to bill
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 1 }}>
              <Grid container spacing={0.5}>
                <Grid item xs={8}>
                  <Typography variant="body2">Subtotal:</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" align="right">
                    £{currentBill?.subtotal.toFixed(2) || "0.00"}
                  </Typography>
                </Grid>

                <Grid item xs={8}>
                  <Typography variant="body2">Service Charge (12.5%):</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" align="right">
                    £{calculateBillTotals(currentBill?.items || []).serviceCharge.toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={8}>
                  <Typography variant="body2">VAT (20%):</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" align="right">
                    £{currentBill?.tax.toFixed(2) || "0.00"}
                  </Typography>
                </Grid>

                <Grid item xs={8}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="subtitle1" fontWeight="bold" align="right">
                    £{currentBill?.total.toFixed(2) || "0.00"}
                  </Typography>
                </Grid>
              </Grid>

              <Button variant="contained" size="small" fullWidth startIcon={<Payment />} sx={{ mt: 1 }}>
                Process Payment
              </Button>
            </Box>
          </Paper>
        )
      } else {
        // Standard bill window
        return (
          <Paper
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="subtitle2">{selectedTable ? `Table ${selectedTable.name}` : "No Table"}</Typography>
              <Typography variant="caption" color="text.secondary">
                Bill #{currentBill?.id.substring(5) || "----"} • Server: Current User
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
              {currentBill && currentBill.items.length > 0 ? (
                <List dense>
                  {currentBill.items.map((item) => (
                    <ListItem
                      key={item.id}
                      secondaryAction={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <IconButton size="small" onClick={() => removeItemFromBill(item.id)}>
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography variant="caption" sx={{ minWidth: 20, textAlign: "center" }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              (() => {
                                const product = localProducts.find(p => p.id === item.productId)
                                if (product) {
                                  addProductToBill(product, 1)
                                }
                              })()
                            }
                          >
                            <Add fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteItemFromBill(item.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={<Typography variant="caption">{item.productName}</Typography>}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            £{item.unitPrice.toFixed(2)} × {item.quantity}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="caption" color="text.secondary">
                    No items
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 1 }}>
              <Grid container spacing={0.5}>
                <Grid item xs={6}>
                  <Typography variant="caption">Subtotal:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" align="right">
                    £{currentBill?.subtotal.toFixed(2) || "0.00"}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption">VAT (20%):</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" align="right">
                    £{currentBill?.tax.toFixed(2) || "0.00"}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="bold">
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="bold" align="right">
                    £{currentBill?.total.toFixed(2) || "0.00"}
                  </Typography>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<Payment />}
                sx={{ mt: 1, fontSize: "0.7rem" }}
              >
                Pay
              </Button>
            </Box>
          </Paper>
        )
      }
    }

    return (
      <Typography
        variant="body2"
        sx={{
          fontSize: `${card.fontSize || 12}px`,
          color: card.fontColor || "text.primary",
          textAlign: "center",
          padding: "4px",
          wordBreak: "break-word",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {card.content || "Button"}
      </Typography>
    )
  }

  const containerStyle = isFullscreen
    ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        bgcolor: "background.default",
      }
    : isEmbedded
      ? { height: "100%", width: "100%" }
      : { height: "600px" }

  // DataHeader sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'category', label: 'Category' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    // Export functionality would be implemented here
  };

  // No loading indicators — UI renders and fills as data arrives (like HR section)

  return (
    <Box ref={containerRef} sx={containerStyle}>
      {!isEmbedded && (
        <DataHeader
          title={undefined}
          showDateControls={false}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search products..."
          sortOptions={sortOptions}
          sortValue={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onExportCSV={() => handleExport('csv')}
          onExportPDF={() => handleExport('pdf')}
        />
      )}
      
      {/* Header */}
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            POS Till
          </Typography>

          {/* Till Screen Selector */}
          <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
            <InputLabel sx={{ color: themeConfig.brandColors.offWhite }}>Till Screen</InputLabel>
            <Select
              value={selectedScreenId}
              label="Till Screen"
              onChange={(e) => setSelectedScreenId(e.target.value)}
              sx={{
                color: themeConfig.brandColors.offWhite,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(themeConfig.brandColors.offWhite, 0.23),
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: themeConfig.brandColors.offWhite,
                },
                "& .MuiSvgIcon-root": {
                  color: themeConfig.brandColors.offWhite,
                },
              }}
            >
              {availableScreens.map((screen) => (
                <MenuItem key={screen.id} value={screen.id}>
                  {screen.name} {screen.isDefault && "(Default)"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Screen Info */}
          {currentScreen && (
            <Chip
              label={`${aspectRatio} • ${canvasWidth}×${canvasHeight}`}
              color="secondary"
              size="small"
              sx={{ mr: 2 }}
            />
          )}

          {selectedTable && (
            <Chip icon={<TableRestaurant />} label={`Table ${selectedTable.name}`} color="secondary" sx={{ mr: 2 }} />
          )}

          {numberPad.isActive && (
            <Badge badgeContent={numberPad.currentNumber} color="error" sx={{ mr: 2 }}>
              <Chip label="Qty Mode" color="warning" />
            </Badge>
          )}

          {currentBill && (
            <Chip label={`Bill Total: £${currentBill.total.toFixed(2)}`} color="success" sx={{ mr: 2 }} />
          )}

          <IconButton color="inherit" onClick={() => {
            // Reload all data
            if (companyId) {
              loadTillData()
            }
          }}>
            <Refresh />
          </IconButton>

          <IconButton color="inherit" onClick={toggleFullscreen}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ height: isFullscreen ? "calc(100vh - 48px)" : "calc(100% - 48px)" }}>
        {/* Canvas Area - Till Layout */}
        <CanvasArea
          cards={cards.map((card) => ({
            ...card,
            // Apply saved colors and styling
            cardColor: card.cardColor || "background.paper",
            fontColor: card.fontColor || "text.primary",
            fontSize: card.fontSize || 12,
            borderColor: card.borderColor || "divider",
            borderWidth: card.borderWidth || 1,
            borderRadius: card.borderRadius || 0,
            // Override content for functional components
            ...(card.type === "billWindow" && { content: renderCardContent(card) }),
            ...(card.type === "numpad" && { content: renderCardContent(card) }),
          }))}
          onUpdateCards={onUpdateCards}
          canvasWidth={isFullscreen ? window.innerWidth : canvasWidth}
          canvasHeight={isFullscreen ? window.innerHeight - 100 : canvasHeight}
          readOnly={false}
          onCardClick={handleCardClick}
          onCardMouseDown={handleCardMouseDown}
          onCardMouseUp={handleCardMouseUp}
        />
      </Box>

      {/* Floor Plan Dialog */}
      <Dialog open={floorPlanDialog} onClose={() => setFloorPlanDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Floor Plan - {currentFloorPlan?.name}</Typography>
            <IconButton onClick={() => setFloorPlanDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {currentFloorPlan && (
            <Box
              sx={{
                width: currentFloorPlan.layout.width,
                height: currentFloorPlan.layout.height,
                position: "relative",
                border: 1,
                borderColor: "divider",
                bgcolor: themeConfig.brandColors.offWhite,
              }}
            >
              {currentFloorPlan.layout.tables?.map((tableElement: any) => {
                const table = tables.find((t) => t.id === tableElement.tableId)
                const hasBill = openBills.some((bill) => bill.tableName === table?.name)

                return (
                  <Box
                    key={tableElement.id}
                    sx={{
                      position: "absolute",
                      left: tableElement.x,
                      top: tableElement.y,
                      width: tableElement.width,
                      height: tableElement.height,
                      bgcolor: hasBill ? "warning.light" : "background.paper",
                      border: 2,
                      borderColor: hasBill ? "warning.main" : themeConfig.brandColors.navy,
                      borderRadius: tableElement.shape === "Round" ? "50%" : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => {
                      if (table) {
                        handleTableClick(table)
                        setFloorPlanDialog(false)
                      }
                    }}
                  >
                    <Box textAlign="center">
                      <Typography variant="caption" fontWeight="bold">
                        {table?.name}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {table?.seats || table?.maxCovers} seats
                      </Typography>
                      {hasBill && <Receipt fontSize="small" color="warning" />}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Table Management Dialog */}
      <Dialog open={tableManagementDialog} onClose={() => setTableManagementDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Table Management - {selectedTable?.name}</Typography>
            <IconButton onClick={() => setTableManagementDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {currentFloorPlan && (
            <Box sx={{ p: 2, height: "400px", overflow: "auto" }}>
              <Typography variant="h6" gutterBottom>
                {currentFloorPlan.name}
              </Typography>
              <Grid container spacing={2}>
                {tables.map((table) => {
                  const hasBill = openBills.some((bill) => bill.tableName === table.name)
                  return (
                    <Grid item xs={6} sm={4} md={3} key={table.id}>
                      <Button
                        variant={selectedTable?.id === table.id ? "contained" : "outlined"}
                        fullWidth
                        size="small"
                        startIcon={<TableRestaurant />}
                        onClick={() => {
                          const existingBill = openBills.find((bill) => bill.tableName === table.name)
                          if (existingBill) {
                            setCurrentBill(existingBill)
                            setSelectedTable(table)
                          } else {
                            handleTableClick(table)
                          }
                          setTableManagementDialog(false)
                        }}
                        sx={{
                          minHeight: 60,
                          bgcolor: hasBill ? "warning.light" : "background.paper",
                          color: hasBill ? "warning.contrastText" : "text.primary",
                        }}
                      >
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="body2" fontWeight="bold">
                            {table.name}
                          </Typography>
                          <Typography variant="caption">
                            {table.maxCovers} seats
                          </Typography>
                          {hasBill && <Receipt fontSize="small" color="warning" />}
                        </Box>
                      </Button>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Table Bill Management Dialog */}
      <TableBillManagement
        open={tableManagementDialog}
        table={selectedTable}
        bill={currentBill}
        onClose={() => setTableManagementDialog(false)}
        onUpdateBill={(updatedBill) => {
          setCurrentBill(updatedBill)
          if (companyId) {
            // Use POS context functions instead of direct database calls
          }
        }}
      />

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        open={productDetailDialog}
        product={selectedProduct}
        onClose={() => {
          setProductDetailDialog(false)
          setSelectedProduct(null)
        }}
        onAddToBill={addProductToBill}
      />

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Payment</DialogTitle>
        <DialogContent>
          {currentBill && (
            <Box>
              <Typography variant="h4" align="center" gutterBottom>
                £{currentBill.total.toFixed(2)}
              </Typography>
              <Grid container spacing={2}>
                {paymentTypes.map((paymentType) => (
                  <Grid item xs={6} key={paymentType.id}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<Payment />}
                      onClick={() => processPayment(paymentType)}
                    >
                      {paymentType.name}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.type} sx={{ width: "100%" }}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TillUsage
