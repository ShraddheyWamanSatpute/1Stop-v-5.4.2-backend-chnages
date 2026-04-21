"use client"

import React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  ListItemIcon,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Chip,
  CircularProgress,
} from "@mui/material"
import {
  Search as SearchIcon,
  Add as AddIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  LocalOffer as DiscountIcon,
  CardGiftcard as PromotionIcon,
  Dialpad as DialpadIcon,
  TableRestaurant as TablePlanIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Inventory as StockIcon,
  Settings as SystemFunctionIcon,
  PointOfSale as TillFunctionIcon,
  ViewModule as GroupIcon,
} from "@mui/icons-material"
// All operations now come from POSContext
import { useStock } from "../../../backend/context/StockContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { themeConfig } from "../../../theme/AppTheme"

// Update the mergedFeatureTypes interface
interface FeatureOption {
  name: string
  color: string
  options: string[]
  icon: React.ReactElement
  data?: any[] // Add data field for database items
}

interface FeatureTypes {
  [key: string]: FeatureOption
}

// Update the props interface
interface ProductListPanelProps {
  onAddProduct: (product: any) => void
  onAddFeature: (featureType: string, option?: string, data?: any) => void
  expandedFeature?: string | null
  setExpandedFeature?: React.Dispatch<React.SetStateAction<string | null>>
  getFeatureIcon?: (featureType: string) => React.ReactElement
}

const ProductListPanel: React.FC<ProductListPanelProps> = ({
  onAddProduct,
  onAddFeature,
  expandedFeature = null,
  setExpandedFeature = () => {},
  getFeatureIcon = () => <div />,
}) => {
  const [activeTab, setActiveTab] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSalesDivision, setSelectedSalesDivision] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")
  const [optionsAnchorEl, setOptionsAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedFeatureType, setSelectedFeatureType] = useState<string | null>(null)

  // Database data states
  const [paymentTypes, setPaymentTypes] = useState<any[]>([])
  const [discounts, setDiscounts] = useState<any[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [floorPlans, setFloorPlans] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Get contexts
  const { state: companyState } = useCompany()
  const { state: posState, refreshPaymentTypes, refreshDiscounts, refreshPromotions, refreshFloorPlans, refreshGroups } = usePOS()

  // Get stock data
  const { state: stockState } = useStock()
  const { products, salesDivisions, categories, subcategories } = stockState

  // Load database data for features
  useEffect(() => {
    const loadFeatureData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        setLoading(true)
        // const basePath = `${getBasePath('pos')}/data` // Would use when implementing functions
        // Use POS context functions
        await Promise.all([
          refreshPaymentTypes(),
          refreshDiscounts(),
          refreshPromotions(),
          refreshFloorPlans(),
          refreshGroups()
        ])
        
        const [paymentTypesData, discountsData, promotionsData, floorPlansData, groupsData] = [
          posState.paymentTypes || [],
          posState.discounts || [],
          posState.promotions || [],
          posState.floorPlans || [],
          posState.groups || []
        ]

        setPaymentTypes(paymentTypesData || [])
        setDiscounts(discountsData || [])
        setPromotions(promotionsData || [])
        setFloorPlans(floorPlansData || [])
        setGroups(groupsData || [])
      } catch (error) {
        console.error("Error loading feature data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFeatureData()
  }, [companyState.companyID, companyState.selectedSiteID])

  // Helper function to get product price in GBP
  const getProductPrice = (product: any): number | null => {
    // Try different price fields in order of preference
    if (product.sale?.price && typeof product.sale.price === "number") {
      return product.sale.price
    }
    if (product.salesPrice && typeof product.salesPrice === "number") {
      return product.salesPrice
    }
    if (product.price && typeof product.price === "number") {
      return product.price
    }
    return null
  }

  // Helper function to format price in GBP
  const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return ""
    return `£${price.toFixed(2)}`
  }

  // Helper function to get product stock level
  const getStockLevel = (product: any): number => {
    return product.predictedStock || product.stock || 0
  }

  // Helper function to get product type display
  const getProductTypeDisplay = (product: any): string => {
    if (!product.type) return ""

    const typeMap: { [key: string]: string } = {
      "purchase-only": "Purchase Only",
      "purchase-sell": "Purchase & Sell",
      "prepped-item": "Prepped Item",
      choice: "Choice Item",
      recipe: "Recipe",
    }

    return typeMap[product.type] || product.type
  }

  // Filter products based on search term and selected filters
  const filteredProducts = products.filter((product) => {
    if (!product || !product.name) return false

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesSalesDivision = !selectedSalesDivision || product.salesDivisionId === selectedSalesDivision
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory
    const matchesSubcategory = !selectedSubcategory || product.subcategoryId === selectedSubcategory

    return matchesSearch && matchesSalesDivision && matchesCategory && matchesSubcategory
  })

  // Get available categories based on selected sales division
  const availableCategories = categories.filter(
    (category) => !selectedSalesDivision || category.parentDivisionId === selectedSalesDivision,
  )

  // Get available subcategories based on selected category
  const availableSubcategories = subcategories.filter(
    (subcategory) => !selectedCategory || subcategory.parentCategoryId === selectedCategory,
  )

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleFeatureClick = (featureType: string) => {
    const feature = activeFeatureTypes[featureType]

    // If feature has only one option, add it directly
    if (feature && feature.options.length === 1) {
      const option = feature.options[0]
      const data = feature.data ? feature.data[0] : null
      onAddFeature(featureType, option, data)
      return
    }

    // Otherwise, expand/collapse as normal
    if (expandedFeature === featureType) {
      setExpandedFeature(null)
    } else {
      setExpandedFeature(featureType)
    }
  }

  const handleFeatureOptionClick = (featureType: string, option: string, data?: any) => {
    onAddFeature(featureType, option, data)
  }

  const handleOptionsClick = (event: React.MouseEvent<HTMLElement>, featureType: string) => {
    event.stopPropagation()
    setOptionsAnchorEl(event.currentTarget)
    setSelectedFeatureType(featureType)
  }

  const handleOptionsClose = () => {
    setOptionsAnchorEl(null)
    setSelectedFeatureType(null)
  }

  const handleAddFeatureWithOption = (option: string, data?: any) => {
    if (selectedFeatureType) {
      onAddFeature(selectedFeatureType, option, data)
      handleOptionsClose()
    }
  }

  const clearFilters = () => {
    setSelectedSalesDivision("")
    setSelectedCategory("")
    setSelectedSubcategory("")
    setSearchTerm("")
  }

  const hasActiveFilters = selectedSalesDivision || selectedCategory || selectedSubcategory || searchTerm

  // Define feature types with database data and essential functions
  const getDynamicFeatureTypes = (): FeatureTypes => {
    const features: FeatureTypes = {}

    // Only add payment feature if there are payment types
    if (paymentTypes.length > 0) {
      features.payment = {
        name: "Payment",
        color: themeConfig.colors.success.main,
        options: paymentTypes.map((pt) => pt.name || "Unnamed Payment"),
        data: paymentTypes,
        icon: <PaymentIcon />,
      }
    }

    // Only add discount feature if there are discounts
    if (discounts.length > 0) {
      features.discount = {
        name: "Discount",
        color: themeConfig.colors.warning.main,
        options: discounts.map((d) => {
          const value = d.type === "percentage" ? `${d.value}%` : `£${d.value}`
          return `${d.name || "Unnamed Discount"} (${value})`
        }),
        data: discounts,
        icon: <DiscountIcon />,
      }
    }

    // Only add promotion feature if there are promotions
    if (promotions.length > 0) {
      features.promotion = {
        name: "Promotion",
        color: themeConfig.brandColors.offWhite,
        options: promotions.map((p) => p.name || "Unnamed Promotion"),
        data: promotions,
        icon: <PromotionIcon />,
      }
    }

    // Only add table plan feature if there are floor plans
    if (floorPlans.length > 0) {
      features.tablePlan = {
        name: "Table Plan",
        color: themeConfig.colors.success.main,
        options: floorPlans.map((fp) => fp.name || "Unnamed Floor Plan"),
        data: floorPlans,
        icon: <TablePlanIcon />,
      }
    }

    // Only add groups feature if there are groups
    if (groups.length > 0) {
      features.group = {
        name: "Groups",
        color: themeConfig.brandColors.navy,
        options: groups.map((g) => g.name || "Unnamed Group"),
        data: groups,
        icon: <GroupIcon />,
      }
    }

    // Essential UI components - always available
    features.billWindow = {
      name: "Bill Window",
      color: themeConfig.brandColors.navy,
      options: ["Bill Window"], // Simplified to one option
      icon: <ReceiptIcon />,
    }

    features.numpad = {
      name: "Number Pad",
      color: themeConfig.brandColors.navy,
      options: ["Number Pad"], // Already one option
      icon: <DialpadIcon />,
    }

    // Essential till operations - updated with specific options
    features.tillFunction = {
      name: "Till Functions",
      color: themeConfig.brandColors.navy,
      options: [
        "Save",
        "Print Receipt",
        "Edit Name",
        "Edit Covers",
        "Add Message",
        "Select Employee",
        "View Bills",
        "Open Drawer",
      ],
      icon: <TillFunctionIcon />,
    }

    // Essential system operations - updated with specific options
    features.systemFunction = {
      name: "System Functions",
      color: themeConfig.colors.error.main,
      options: ["Reports", "Start Trading", "End Trading", "Clock In", "Clock Out", "Log Out"],
      icon: <SystemFunctionIcon />,
    }

    return features
  }

  // Always use the dynamic feature types - ignore any props
  const activeFeatureTypes = getDynamicFeatureTypes()

  if (loading) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="product list tabs" variant="fullWidth">
          <Tab label="Products" />
          <Tab label="Features" />
        </Tabs>
      </Box>

      {/* Products Tab */}
      {activeTab === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <Box sx={{ p: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search products by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Filters */}
          <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FilterListIcon fontSize="small" />
                <Typography variant="subtitle2">Filters</Typography>
                {hasActiveFilters && (
                  <IconButton size="small" onClick={clearFilters} title="Clear all filters">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <FormControl size="small" fullWidth>
                <InputLabel>Sales Division</InputLabel>
                <Select
                  value={selectedSalesDivision}
                  label="Sales Division"
                  onChange={(e) => {
                    setSelectedSalesDivision(e.target.value)
                    setSelectedCategory("")
                    setSelectedSubcategory("")
                  }}
                >
                  <MenuItem value="">All Divisions</MenuItem>
                  {salesDivisions.map((division) => (
                    <MenuItem key={division.id} value={division.id}>
                      {division.name || "Unnamed Division"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth disabled={!selectedSalesDivision}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setSelectedSubcategory("")
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {availableCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name || "Unnamed Category"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth disabled={!selectedCategory}>
                <InputLabel>Subcategory</InputLabel>
                <Select
                  value={selectedSubcategory}
                  label="Subcategory"
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                >
                  <MenuItem value="">All Subcategories</MenuItem>
                  {availableSubcategories.map((subcategory) => (
                    <MenuItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name || "Unnamed Subcategory"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Results Summary */}
          <Box sx={{ p: 1, bgcolor: "background.paper" }}>
            <Typography variant="caption" color="text.secondary">
              Showing {filteredProducts.length} of {products.length} products
            </Typography>
          </Box>

          {/* Product List */}
          <List sx={{ overflow: "auto", flexGrow: 1, p: 0 }}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                if (!product || !product.id) return null

                const salesDivision = salesDivisions.find((d) => d.id === product.salesDivisionId)
                const category = categories.find((c) => c.id === product.categoryId)
                const subcategory = subcategories.find((s) => s.id === product.subcategoryId)
                const price = getProductPrice(product)
                const stockLevel = getStockLevel(product)
                const productType = getProductTypeDisplay(product)

                return (
                  <ListItem key={product.id} disablePadding>
                    <ListItemButton
                      onClick={() => onAddProduct(product)}
                      sx={{
                        py: 1.5,
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" component="span">
                            {product.name || "Unnamed Product"}
                          </Typography>
                          {price !== null && (
                            <Typography variant="body2" color="primary" component="span" sx={{ fontWeight: "bold" }}>
                              {formatPrice(price)}
                            </Typography>
                          )}
                        </Box>

                        {/* Category Path */}
                        {(salesDivision || category || subcategory) && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            {[salesDivision?.name, category?.name, subcategory?.name].filter(Boolean).join(" › ")}
                          </Typography>
                        )}

                        {/* Product Description */}
                        {product.description && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            {product.description}
                          </Typography>
                        )}

                        {/* Product Details */}
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {productType && (
                            <Chip
                              label={productType}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          )}

                          {stockLevel > 0 && (
                            <Chip
                              icon={<StockIcon sx={{ fontSize: "0.8rem" }} />}
                              label={`Stock: ${stockLevel}`}
                              size="small"
                              color={stockLevel < 10 ? "warning" : "success"}
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          )}

                          {product.course && (
                            <Chip
                              label={product.course}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          )}
                        </Box>
                      </Box>
                      <IconButton size="small" color="primary">
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  </ListItem>
                )
              })
            ) : (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  {products.length === 0 ? "No products available" : "No products match your filters"}
                </Typography>
                {hasActiveFilters && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Try adjusting your search or filters
                  </Typography>
                )}
              </Box>
            )}
          </List>
        </Box>
      )}

      {/* Features Tab */}
      {activeTab === 1 && (
        <Box sx={{ overflow: "auto", flexGrow: 1 }}>
          <List>
            {Object.entries(activeFeatureTypes).map(([featureType, feature]) => {
              const hasOnlyOneOption = feature.options.length === 1

              return (
                <React.Fragment key={featureType}>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleFeatureClick(featureType)}>
                      <ListItemIcon sx={{ color: feature.color }}>
                        {getFeatureIcon(featureType) || feature.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.name}
                        secondary={
                          featureType === "payment"
                            ? `${paymentTypes.length} payment types available`
                            : featureType === "discount"
                              ? `${discounts.length} discounts available`
                              : featureType === "promotion"
                                ? `${promotions.length} promotions available`
                                : featureType === "tablePlan"
                                  ? `${floorPlans.length} floor plans available`
                                  : featureType === "group"
                                    ? `${groups.length} groups available`
                                    : featureType === "numpad"
                                      ? "Click to add number pad"
                                      : featureType === "billWindow"
                                        ? "Click to add bill window"
                                        : featureType === "tillFunction"
                                          ? `${feature.options.length} till operations available`
                                          : featureType === "systemFunction"
                                            ? `${feature.options.length} system functions available`
                                            : ""
                        }
                      />
                      {!hasOnlyOneOption && (
                        <IconButton size="small" onClick={(e) => handleOptionsClick(e, featureType)} sx={{ mr: 1 }}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                      {hasOnlyOneOption ? (
                        <IconButton size="small" color="primary">
                          <AddIcon fontSize="small" />
                        </IconButton>
                      ) : expandedFeature === featureType ? (
                        <KeyboardArrowUpIcon />
                      ) : (
                        <KeyboardArrowDownIcon />
                      )}
                    </ListItemButton>
                  </ListItem>
                  {!hasOnlyOneOption && (
                    <Collapse in={expandedFeature === featureType} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {feature.options.map((option, index) => {
                          const data = feature.data ? feature.data[index] : null
                          return (
                            <ListItemButton
                              key={option}
                              sx={{ pl: 4 }}
                              onClick={() => handleFeatureOptionClick(featureType, option, data)}
                            >
                              <ListItemText
                                primary={option}
                                secondary={
                                  featureType === "payment" && data
                                    ? `Type: ${data.type || "Unknown"}`
                                    : featureType === "discount" && data
                                      ? `${data.type === "percentage" ? "Percentage discount" : "Fixed amount discount"}`
                                      : featureType === "promotion" && data
                                        ? data.description || "No description"
                                        : featureType === "tablePlan" && data
                                          ? `${data.tables?.length || 0} tables`
                                          : featureType === "group" && data
                                            ? `${data.items?.length || 0} items in group`
                                            : featureType === "tillFunction"
                                              ? "Till operation button"
                                              : featureType === "systemFunction"
                                                ? "System function button"
                                                : ""
                                }
                              />
                              <IconButton size="small">
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </ListItemButton>
                          )
                        })}
                      </List>
                    </Collapse>
                  )}
                </React.Fragment>
              )
            })}
          </List>
        </Box>
      )}

      {/* Options Menu */}
      <Menu
        anchorEl={optionsAnchorEl}
        open={Boolean(optionsAnchorEl)}
        onClose={handleOptionsClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={() => handleAddFeatureWithOption("Custom")}>Add as Custom Button</MenuItem>
        {selectedFeatureType &&
          activeFeatureTypes[selectedFeatureType]?.options.map((option, index) => {
            const data = activeFeatureTypes[selectedFeatureType]?.data
              ? activeFeatureTypes[selectedFeatureType].data![index]
              : null
            return (
              <MenuItem key={option} onClick={() => handleAddFeatureWithOption(option, data)}>
                Add as {option}
              </MenuItem>
            )
          })}
      </Menu>
    </Box>
  )
}

export default ProductListPanel
