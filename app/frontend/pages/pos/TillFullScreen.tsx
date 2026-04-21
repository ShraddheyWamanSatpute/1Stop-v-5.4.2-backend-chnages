"use client"

import { alpha } from "@mui/material/styles";
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  AppBar,
  Toolbar,
} from "@mui/material"
import {
  Close,
  TableRestaurant,
  Add,
  Remove,
  Delete,
  Payment,
  ArrowBack,
  LocalOffer,
  Print,
  Cancel,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { themeConfig } from "../../../theme/AppTheme"

// import { useStock } from "../../../backend/context/StockContext" // Would use when implementing functions
import type { Bill, BillItem, Table } from "../../../backend/interfaces/Stock"

const TillFullScreen: React.FC = () => {
  const navigate = useNavigate()
  const { screenId } = useParams<{ screenId: string }>()
  const location = useLocation()
  const { state: companyState } = useCompany()

  // Get state from navigation if available
  const initialState = location.state || {}

  // State variables
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<Table | null>(initialState.selectedTable || null)
  const [tables, setTables] = useState<Table[]>([])
  const [currentBill, setCurrentBill] = useState<Bill | null>(initialState.currentBill || null)
  const [cart, setCart] = useState<BillItem[]>(initialState.cart || [])
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [tableDialogOpen, setTableDialogOpen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])

  // Mock categories and products
  const mockCategories = ["Drinks", "Food", "Desserts", "Specials"]
  const mockProducts = [
    { id: "p1", name: "Coffee", price: 3.5, category: "Drinks" },
    { id: "p2", name: "Tea", price: 2.5, category: "Drinks" },
    { id: "p3", name: "Soda", price: 2.0, category: "Drinks" },
    { id: "p4", name: "Burger", price: 9.99, category: "Food" },
    { id: "p5", name: "Pizza", price: 12.99, category: "Food" },
    { id: "p6", name: "Salad", price: 7.99, category: "Food" },
    { id: "p7", name: "Ice Cream", price: 4.99, category: "Desserts" },
    { id: "p8", name: "Cake", price: 5.99, category: "Desserts" },
    { id: "p9", name: "Daily Special", price: 14.99, category: "Specials" },
  ]

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // Load data on component mount
  useEffect(() => {
    document.body.style.overflow = "hidden" // Prevent scrolling
    loadData()

    // Load specific screen layout if screenId is provided
    if (screenId) {
      console.log(`Loading screen with ID: ${screenId}`)
      // In a real implementation, this would fetch the specific screen layout
    }

    // Set up mock products
    setProducts(mockProducts)

    return () => {
      document.body.style.overflow = "" // Restore scrolling on unmount
    }
  }, [companyState.companyID, companyState.selectedSiteID, screenId])

  // Load tables and screen layout
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load tables
      if (companyState.companyID && companyState.selectedSiteID) {
        // Would implement fetchTables in POSContext
        const fetchedTables: any[] = [] // await fetchTables(companyState.companyID, companyState.selectedSiteID)
        setTables(fetchedTables)
      }

      // Load screen layout (mock data for now)
      // In a real implementation, this would be loaded from the database based on screenId
    } catch (error) {
      console.error("Error loading data:", error)
      setNotification({
        message: "Failed to load data. Please try again.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Exit full-screen mode
  const exitFullScreen = () => {
    navigate(-1)
  }

  // Handle button click based on type

  // Handle payment button click
  const handlePaymentClick = (method: string) => {
    if (!currentBill || cart.length === 0) {
      setNotification({
        message: "No active bill to process payment",
        type: "info",
      })
      return
    }

    setPaymentMethod(method)
    setPaymentAmount(calculateTotal().toString())
    setPaymentDialogOpen(true)
  }

  // Handle till functions (void, print, etc.)
  const handleTillFunction = (functionName: string) => {
    if (functionName.includes("Void")) {
      // Handle void bill
      if (window.confirm("Are you sure you want to void this bill?")) {
        setCart([])
        setCurrentBill(null)
        setNotification({
          message: "Bill voided successfully",
          type: "success",
        })
      }
    } else if (functionName.includes("Print")) {
      // Handle print receipt
      printReceipt()
    } else if (functionName.includes("Save")) {
      // Handle save bill
      saveBillToDatabase()
    }
  }

  // Add item to cart
  const addItemToCart = (product: any) => {
    const existingItem = cart.find((item) => item.id === product.id)

    if (existingItem) {
      // Update quantity if item already exists
      const updatedCart = cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      setCart(updatedCart)
    } else {
      // Add new item
      const newItem: BillItem = {
        id: product.id,
        name: product.name,
        price: product.price || 0,
        quantity: 1,
      }
      setCart([...cart, newItem])
    }

    // Create bill if not exists
    if (!currentBill && selectedTable) {
      const newBill: Bill = {
        id: `BILL-${Date.now()}`,
        tableNumber: selectedTable.name,
        server: "Current User", // This would come from auth context
        items: [],
        total: 0,
        subtotal: 0,
        tax: 0,
        serviceCharge: 0,
        discount: 0,
        status: "Open",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setCurrentBill(newBill)
    }
  }

  // Remove item from cart
  const removeItemFromCart = (itemId: string) => {
    const existingItem = cart.find((item) => item.id === itemId)

    if (existingItem && existingItem.quantity > 1) {
      // Decrease quantity
      const updatedCart = cart.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item))
      setCart(updatedCart)
    } else {
      // Remove item
      setCart(cart.filter((item) => item.id !== itemId))
    }
  }

  // Delete item from cart
  const deleteItemFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId))
  }

  // Calculate subtotal
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  // Calculate tax (example: 10%)
  const calculateTax = () => {
    return calculateSubtotal() * 0.1
  }

  // Calculate service charge (example: 5%)
  const calculateServiceCharge = () => {
    return calculateSubtotal() * 0.05
  }

  // Calculate discount
  const calculateDiscount = () => {
    return currentBill?.discount || 0
  }

  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateServiceCharge() - calculateDiscount()
  }

  // Apply discount
  const applyDiscount = (percentage: number) => {
    if (!currentBill) return

    const discountAmount = calculateSubtotal() * (percentage / 100)

    if (currentBill) {
      setCurrentBill({
        ...currentBill,
        discount: discountAmount,
      })
    }

    setNotification({
      message: `${percentage}% discount applied`,
      type: "success",
    })
  }

  // Process payment
  const processPayment = () => {
    if (!currentBill || !selectedTable) return

    const amount = Number(paymentAmount)

    if (isNaN(amount) || amount <= 0) {
      setNotification({
        message: "Please enter a valid payment amount",
        type: "error",
      })
      return
    }

    if (amount < calculateTotal()) {
      setNotification({
        message: "Payment amount is less than the total",
        type: "error",
      })
      return
    }

    // Update bill with payment info
    const updatedBill: Bill = {
      ...currentBill,
      items: cart,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      serviceCharge: calculateServiceCharge(),
      discount: calculateDiscount(),
      total: calculateTotal(),
      status: "Closed",
      paymentMethod: paymentMethod,
      closedAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Save bill to database
    saveBillToDatabase(updatedBill)

    // Reset state
    setCart([])
    setCurrentBill(null)
    setSelectedTable(null)
    setPaymentDialogOpen(false)

    // Show change amount if cash payment
    if (paymentMethod === "Cash" && amount > calculateTotal()) {
      const change = amount - calculateTotal()
      setNotification({
        message: `Payment successful. Change: $${change.toFixed(2)}`,
        type: "success",
      })
    } else {
      setNotification({
        message: "Payment successful",
        type: "success",
      })
    }
  }

  // Save bill to database
  const saveBillToDatabase = async (bill = currentBill) => {
    if (!bill || !companyState.companyID || !companyState.selectedSiteID) return

    try {
      // Update bill with latest items and totals
      const updatedBill: Bill = {
        ...bill,
        items: cart,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        serviceCharge: calculateServiceCharge(),
        discount: calculateDiscount(),
        total: calculateTotal(),
        updatedAt: Date.now(),
      }

      // Would implement saveBill in POSContext
      console.log("Save bill:", updatedBill)

      setNotification({
        message: "Bill saved successfully",
        type: "success",
      })

      return updatedBill
    } catch (error) {
      console.error("Error saving bill:", error)
      setNotification({
        message: "Failed to save bill",
        type: "error",
      })
      return null
    }
  }

  // Print receipt
  const printReceipt = () => {
    if (!currentBill || cart.length === 0) {
      setNotification({
        message: "No active bill to print",
        type: "info",
      })
      return
    }

    // In a real app, this would connect to a receipt printer
    // For now, just show a notification
    setNotification({
      message: "Receipt sent to printer",
      type: "success",
    })
  }

  // Handle table selection
  const handleTableSelect = (table: Table) => {
    setSelectedTable(table)
    setTableDialogOpen(false)

    // Load existing bill for this table if any
    loadTableBill(table)
  }

  // Load bill for selected table
  const loadTableBill = async (table: Table) => {
    try {
      if (companyState.companyID && companyState.selectedSiteID) {
        // Would implement fetchOpenBills in POSContext
        const openBills: any[] = [] // await fetchOpenBills(companyState.companyID, companyState.selectedSiteID)
        const tableBill = openBills.find((bill) => bill.tableNumber === table.name)

        if (tableBill) {
          setCurrentBill(tableBill)
          setCart(tableBill.items)
        } else {
          // Create new bill
          setCurrentBill({
            id: `BILL-${Date.now()}`,
            tableNumber: table.name,
            server: "Current User", // This would come from auth context
            items: [],
            total: 0,
            subtotal: 0,
            tax: 0,
            serviceCharge: 0,
            discount: 0,
            status: "Open",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          setCart([])
        }
      }
    } catch (error) {
      console.error("Error loading table bill:", error)
      setNotification({
        message: "Failed to load table bill",
        type: "error",
      })
    }
  }

  // Filter products by category
  const filteredProducts = activeCategory ? products.filter((product) => product.category === activeCategory) : products

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        bgcolor: themeConfig.brandColors.offWhite,
        overflow: "hidden",
      }}
    >
      {/* App Bar */}
      <AppBar position="static" color="primary" elevation={2}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={exitFullScreen} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            POS Till
          </Typography>

          {selectedTable && (
            <Chip icon={<TableRestaurant />} label={`Table ${selectedTable.name}`} color="secondary" sx={{ mr: 2 }} />
          )}

          <IconButton color="inherit" onClick={() => setTableDialogOpen(true)}>
            <TableRestaurant />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
          {/* Left Side - Categories and Products */}
          <Box sx={{ width: "60%", display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Categories */}
            <Box sx={{ p: 1, display: "flex", flexWrap: "wrap", gap: 1, borderBottom: 1, borderColor: "divider" }}>
              <Chip
                label="All Products"
                color={activeCategory === null ? "primary" : "default"}
                onClick={() => setActiveCategory(null)}
                sx={{ m: 0.5 }}
              />
              {mockCategories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  color={activeCategory === category ? "primary" : "default"}
                  onClick={() => setActiveCategory(category === activeCategory ? null : category)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>

            {/* Products Grid */}
            <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
              <Grid container spacing={2}>
                {filteredProducts.map((product) => (
                  <Grid item xs={6} sm={4} md={3} key={product.id}>
                    <Paper
                      sx={{
                        p: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        cursor: "pointer",
                        height: "100%",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                      onClick={() => addItemToCart(product)}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ${product.price.toFixed(2)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Function Buttons */}
            <Box sx={{ p: 1, borderTop: 1, borderColor: "divider", display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<Payment />}
                onClick={() => handlePaymentClick("Cash")}
                sx={{ m: 0.5 }}
              >
                Cash
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<Payment />}
                onClick={() => handlePaymentClick("Card")}
                sx={{ m: 0.5 }}
              >
                Card
              </Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<LocalOffer />}
                onClick={() => applyDiscount(10)}
                sx={{ m: 0.5 }}
              >
                10% Off
              </Button>
              <Button variant="contained" color="info" startIcon={<Print />} onClick={printReceipt} sx={{ m: 0.5 }}>
                Print
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={() => handleTillFunction("Void Bill")}
                sx={{ m: 0.5 }}
              >
                Void
              </Button>
            </Box>
          </Box>

          {/* Right Side - Bill Window */}
          <Box sx={{ width: "40%", borderLeft: 1, borderColor: "divider" }}>
            <Paper
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRadius: 0,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: themeConfig.brandColors.navy,
                  color: themeConfig.brandColors.offWhite,
                }}
              >
                <Typography variant="h6">
                  {selectedTable ? `Table ${selectedTable.name}` : "No Table Selected"}
                </Typography>
                {currentBill && (
                  <Typography variant="body2">
                    Bill #{currentBill.id.substring(5)} • Server: {currentBill.server}
                  </Typography>
                )}
              </Box>

              <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
                {cart.length > 0 ? (
                  <List>
                    {cart.map((item) => (
                      <ListItem
                        key={item.id}
                        secondaryAction={
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <IconButton edge="end" onClick={() => removeItemFromCart(item.id)}>
                              <Remove fontSize="small" />
                            </IconButton>
                            <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                            <IconButton
                              edge="end"
                              onClick={() => addItemToCart({ id: item.id, name: item.name, price: item.price })}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                            <IconButton edge="end" color="error" onClick={() => deleteItemFromCart(item.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={item.name}
                          secondary={`$${item.price.toFixed(2)} × ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`}
                          primaryTypographyProps={{ variant: "body1" }}
                          secondaryTypographyProps={{ variant: "body2" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                    <Typography variant="body1" color="text.secondary">
                      No items added yet
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider />

              <Box sx={{ p: 2, bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body1">Subtotal:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      ${calculateSubtotal().toFixed(2)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body1">Tax (10%):</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      ${calculateTax().toFixed(2)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body1">Service (5%):</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      ${calculateServiceCharge().toFixed(2)}
                    </Typography>
                  </Grid>

                  {calculateDiscount() > 0 && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body1">Discount:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body1" align="right" color="error">
                          -${calculateDiscount().toFixed(2)}
                        </Typography>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="h6" fontWeight="bold">
                      Total:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6" fontWeight="bold" align="right">
                      ${calculateTotal().toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Payment />}
                  onClick={() => handlePaymentClick("Cash")}
                  disabled={!selectedTable || cart.length === 0}
                  sx={{ mt: 2 }}
                >
                  Process Payment
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Table Selection Dialog */}
      <Dialog open={tableDialogOpen} onClose={() => setTableDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Select Table</Typography>
            <IconButton onClick={() => setTableDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {tables.map((table) => (
              <Grid item xs={6} sm={4} md={3} key={table.id}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: selectedTable?.id === table.id ? "primary.light" : "background.paper",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => handleTableSelect(table)}
                >
                  <TableRestaurant sx={{ fontSize: 40, color: themeConfig.brandColors.navy, mb: 1 }} />
                  <Typography variant="subtitle1">{table.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {table.maxCovers} seats
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Process Payment</Typography>
            <IconButton onClick={() => setPaymentDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Total Amount: ${calculateTotal().toFixed(2)}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Payment Amount"
                type="number"
                fullWidth
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Payment Method
              </Typography>
              <Grid container spacing={1}>
                {["Cash", "Credit Card", "Debit Card", "Mobile Payment"].map((method) => (
                  <Grid item key={method}>
                    <Chip
                      label={method}
                      onClick={() => setPaymentMethod(method)}
                      color={paymentMethod === method ? "primary" : "default"}
                      variant={paymentMethod === method ? "filled" : "outlined"}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={processPayment}>
            Complete Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {notification ? (
          <Alert onClose={() => setNotification(null)} severity={notification.type} sx={{ width: "100%" }}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}

export default TillFullScreen
