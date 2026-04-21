"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  InputAdornment,
  Chip,
  CircularProgress,
} from "@mui/material"
import {
  Add,
  Remove,
  Delete,
  Search,
  Receipt,
  LocalDining,
  LocalBar,
  Cake,
  ArrowBack,
  TableBar,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { useCompany } from "../../../backend/context/CompanyContext"
// import { usePOS } from "../../../backend/context/POSContext" // Would use when implementing functions
import { Bill, BillItem } from "../../../backend/interfaces/POS"
import { Product } from "../../../backend/interfaces/POS"
import DataHeader from "../../components/reusable/DataHeader"

// Sample tables
const tables = [
  { id: 1, name: "Table 1", status: "Available" },
  { id: 2, name: "Table 2", status: "Available" },
  { id: 3, name: "Table 3", status: "Occupied" },
  { id: 4, name: "Table 4", status: "Reserved" },
  { id: 5, name: "Table 5", status: "Available" },
  { id: 6, name: "Table 6", status: "Available" },
]

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  product: Product
}

const NewOrder = () => {
  const navigate = useNavigate()
  const { state: companyState, getBasePath } = useCompany()
  // const { products, bills, loading, error } = usePOS() // Would use when implementing functions
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; icon: React.ReactNode }[]>([])
  const [loading, setLoading] = useState(false)
  const [, setOpenBills] = useState<Bill[]>([])
  
  // DataHeader state
  const [dataHeaderSearchTerm, setDataHeaderSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  // Products now come from POS context

  useEffect(() => {
    const loadData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      setLoading(true)
      try {
        // Would implement fetchProducts in POSContext
        console.log("Fetch products:", "stock")
        const productsData: Product[] = []
        setProducts(productsData)

        // Extract categories from products
        const uniqueCategories = new Set<string>()
        productsData.forEach((product: any) => {
          if (product.categoryId) {
            uniqueCategories.add(product.categoryId)
          }
        })

        // Create category objects with icons
        const categoryObjects = Array.from(uniqueCategories).map((catId) => {
          const categoryName = productsData.find((p) => p.categoryId === catId)?.categoryId || catId
          return {
            id: catId,
            name: categoryName,
            icon: getCategoryIcon(categoryName),
          }
        })

        // Add "All" category at the beginning
        setCategories([{ id: "all", name: "All Items", icon: <LocalDining /> }, ...categoryObjects])

        // Would implement fetchOpenBills in POSContext
        const basePath = `${getBasePath('pos')}/data`
        console.log("Fetch open bills:", basePath)
        const bills: Bill[] = []
        setOpenBills(bills)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [companyState.companyID, companyState.selectedSiteID])

  const getCategoryIcon = (categoryName: string): React.ReactNode => {
    const name = categoryName.toLowerCase()
    if (name.includes("drink") || name.includes("beverage")) {
      return <LocalBar />
    } else if (name.includes("dessert") || name.includes("sweet")) {
      return <Cake />
    }
    return <LocalDining />
  }

  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveCategory(newValue)
  }

  const handleAddToCart = (product: Product) => {
    const existingItem = cart.find((cartItem) => cartItem.id === product.id)
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === product.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        ),
      )
    } else {
      const price = product.price || 0
      setCart([...cart, { id: product.id, name: product.name, price, quantity: 1, product }])
    }
  }

  const handleRemoveFromCart = (itemId: string) => {
    const existingItem = cart.find((cartItem) => cartItem.id === itemId)
    if (existingItem && existingItem.quantity > 1) {
      setCart(
        cart.map((cartItem) => (cartItem.id === itemId ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem)),
      )
    } else {
      setCart(cart.filter((cartItem) => cartItem.id !== itemId))
    }
  }

  const handleDeleteFromCart = (itemId: string) => {
    setCart(cart.filter((cartItem) => cartItem.id !== itemId))
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)
  }

  const handlePlaceOrder = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID || cart.length === 0) return

    try {
      // Create a new bill
      const billId = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create bill items with all required properties
      const billItems: BillItem[] = cart.map((item) => {
        return {
          id: item.product.id,
          productId: item.product.id,
          productName: item.product.name,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          price: item.price, // Ensure price is always defined
          notes: "",
          createdAt: Date.now()
        }
      })

      const bill: Bill = {
        id: billId,
        tableName: selectedTable?.toString() || "TAKEAWAY",
        tableNumber: selectedTable?.toString() || "TAKEAWAY",
        server: "Current User", // This should ideally come from a user context
        items: billItems,
        status: "open",
        paymentStatus: "pending",
        total: Number.parseFloat(calculateTotal()),
        subtotal: Number.parseFloat(calculateTotal()),
        tax: Number.parseFloat(calculateTotal()) * 0.1,
        serviceCharge: 0,
        discount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Would implement saveBill in POSContext
      const basePath = `${getBasePath('pos')}/data`
      console.log("Save bill:", bill, basePath)

      // Would implement recordSale in POSContext
      for (const item of cart) {
        console.log("Record sale:", item.product, basePath, item.price, item.quantity, "Cash", 0)
      }

      alert("Order placed successfully!")
      navigate("/POS")
    } catch (error) {
      console.error("Error placing order:", error)
      alert("Failed to place order. Please try again.")
    }
  }

  // DataHeader handlers
  const sortOptions = [
    { value: 'name', label: 'Product Name' },
    { value: 'price', label: 'Price' },
    { value: 'categoryId', label: 'Category' }
  ]

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = () => {
    const data = filteredAndSortedProducts.map(product => ({
      'Name': product.name,
      'Price': `$${product.price?.toFixed(2) || '0.00'}`,
      'Category': product.categoryId || 'N/A',
      'Description': product.description || 'N/A'
    }))
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `products-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredAndSortedProducts = products
    .filter((product: any) => {
      // Filter by category
      if (activeCategory !== "all" && product.categoryId !== activeCategory) {
        return false
      }

      // Filter by search query (use both searchQuery and dataHeaderSearchTerm)
      const searchTerm = searchQuery || dataHeaderSearchTerm
      if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      return true
    })
    .sort((a: any, b: any) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      
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

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        title="New Order"
        showDateControls={false}
        searchTerm={dataHeaderSearchTerm}
        onSearchChange={setDataHeaderSearchTerm}
        searchPlaceholder="Search products..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport()}
        onExportPDF={() => handleExport()}
        additionalButtons={[
          {
            label: "Back to POS",
            icon: <ArrowBack />,
            onClick: () => navigate("/POS"),
            variant: 'outlined' as const
          }
        ]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <TableBar sx={{ mr: 1 }} />
                <Typography variant="h6">Select Table</Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {tables.map((table) => (
                  <Button
                    key={table.id}
                    variant={selectedTable === table.id ? "contained" : "outlined"}
                    color={table.status === "Available" ? "primary" : table.status === "Occupied" ? "error" : "warning"}
                    disabled={table.status !== "Available"}
                    onClick={() => setSelectedTable(table.id)}
                    sx={{ minWidth: 100 }}
                  >
                    {table.name}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeCategory}
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={(theme) => ({
                  px: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                    minHeight: 44
                  },
                  '& .MuiTab-root.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 600
                  }
                })}
              >
                {categories.map((category) => (
                  <Tab
                    key={category.id}
                    value={category.id}
                    label={category.name}
                    icon={category.icon as React.ReactElement}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Box>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Search menu items..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              <Grid container spacing={2}>
                  {filteredAndSortedProducts.map((product: any) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Paper
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                      onClick={() => handleAddToCart(product)}
                    >
                      <Avatar
                        src={product.image || "/placeholder.svg?height=40&width=40&query=food"}
                        alt={product.name}
                        sx={{ mr: 2 }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          ${(product.sale?.price || product.price || 0).toFixed(2)}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="primary">
                        <Add />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
                {filteredAndSortedProducts.length === 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No products found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your search or category filter
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Receipt sx={{ mr: 1 }} />
                <Typography variant="h6">Order Summary</Typography>
              </Box>

              {selectedTable ? (
                <Chip
                  label={`Table ${selectedTable}`}
                  color="primary"
                  variant="outlined"
                  onDelete={() => setSelectedTable(null)}
                  sx={{ mb: 2 }}
                />
              ) : (
                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                  Please select a table
                </Typography>
              )}

              {cart.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography variant="body1" color="text.secondary">
                    No items added yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Select items from the menu
                  </Typography>
                </Box>
              ) : (
                <List sx={{ mb: 2 }}>
                  {cart.map((item) => (
                    <ListItem key={item.id} disablePadding sx={{ py: 1 }}>
                      <ListItemText
                        primary={item.name}
                        secondary={`${item.price.toFixed(2)} x ${item.quantity}`}
                        primaryTypographyProps={{ variant: "body2" }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography variant="body2" sx={{ mr: 1, fontWeight: 500 }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </Typography>
                          <IconButton size="small" onClick={() => handleRemoveFromCart(item.id)}>
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => handleAddToCart(item.product)}>
                            <Add fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteFromCart(item.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body1">Subtotal</Typography>
                <Typography variant="body1">${calculateTotal()}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Tax (10%)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ${(Number.parseFloat(calculateTotal()) * 0.1).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">${(Number.parseFloat(calculateTotal()) * 1.1).toFixed(2)}</Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    setCart([])
                    setSelectedTable(null)
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={cart.length === 0 || !selectedTable}
                  onClick={handlePlaceOrder}
                >
                  Place Order
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default NewOrder
