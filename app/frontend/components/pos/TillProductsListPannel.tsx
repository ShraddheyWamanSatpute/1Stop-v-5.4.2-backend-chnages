"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Tabs,
  Tab,
  Box,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material"
import ExpandLess from "@mui/icons-material/ExpandLess"
import ExpandMore from "@mui/icons-material/ExpandMore"
import SearchIcon from "@mui/icons-material/Search"
import FilterListIcon from "@mui/icons-material/FilterList"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import AddIcon from "@mui/icons-material/Add"
import { styled } from "@mui/material/styles"
import type { Product } from "../../../backend/interfaces/Stock"

export interface TillProductListPanelProps {
  products: Product[]
  onAddProduct: (product: Product) => void
  onAddFeature: (featureType: string, option?: string, data?: any) => void
  expandedFeature?: string | null
  setExpandedFeature?: React.Dispatch<React.SetStateAction<string | null>>
  getFeatureIcon?: (featureType: string) => React.ReactElement
}

interface FeatureType {
  name: string
  options: string[]
}

const StyledListItem = styled(ListItem)(({ }) => ({
  paddingTop: 0,
  paddingBottom: 0,
}))

const TillProductListPanel: React.FC<TillProductListPanelProps> = ({
  products = [],
  onAddProduct,
  onAddFeature,
  expandedFeature,
  setExpandedFeature,
  getFeatureIcon,
}) => {
  const [tabValue, setTabValue] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [openFeature, setOpenFeature] = useState<string | null>(expandedFeature || null)
  const [featureTypes, setFeatureTypes] = useState<FeatureType[]>([])
  const [paymentTypes, setPaymentTypes] = useState<string[]>([])
  const [discounts, setDiscounts] = useState<string[]>([])
  const [promotions, setPromotions] = useState<string[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isAddFeatureDialogOpen, setIsAddFeatureDialogOpen] = useState(false)
  const [newFeatureName, setNewFeatureName] = useState("")
  const [newFeatureOptions, setNewFeatureOptions] = useState([""])
  const [selectedFeatureType, setSelectedFeatureType] = useState<string | null>(null)
  const [newFeatureOption, setNewFeatureOption] = useState("")

  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>, product: Product) => {
    setAnchorEl(event.currentTarget)
    setSelectedProduct(product)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setSelectedProduct(null)
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }


  const handleCategoryFilter = (category: string | null) => {
    setCategoryFilter(category)
  }

  const handleFeatureToggle = (featureType: string) => {
    const newOpenFeature = openFeature === featureType ? null : featureType
    setOpenFeature(newOpenFeature)
    if (setExpandedFeature) {
      setExpandedFeature(newOpenFeature)
    }
  }

  const handleOpenAddFeatureDialog = () => {
    setIsAddFeatureDialogOpen(true)
  }

  const handleCloseAddFeatureDialog = () => {
    setIsAddFeatureDialogOpen(false)
    setNewFeatureName("")
    setNewFeatureOptions([""])
  }

  const handleAddFeatureOption = () => {
    setNewFeatureOptions([...newFeatureOptions, ""])
  }

  const handleFeatureOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newFeatureOptions]
    updatedOptions[index] = value
    setNewFeatureOptions(updatedOptions)
  }

  const handleRemoveFeatureOption = (index: number) => {
    const updatedOptions = [...newFeatureOptions]
    updatedOptions.splice(index, 1)
    setNewFeatureOptions(updatedOptions)
  }

  const handleCreateFeature = () => {
    if (newFeatureName && newFeatureOptions.length > 0) {
      setFeatureTypes([...featureTypes, { name: newFeatureName, options: newFeatureOptions }])
      handleCloseAddFeatureDialog()
    }
  }

  const handleAddFeatureToProduct = () => {
    if (selectedFeatureType && selectedProduct) {
      onAddFeature(selectedFeatureType, newFeatureOption, selectedProduct)
      handleClose()
    }
  }

  const debouncedSearch = useCallback(
    (term: string) => {
      setSearchTerm(term)
    },
    [setSearchTerm],
  )

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(event.target.value)
  }

  useEffect(() => {
    // Mock data loading (replace with actual API calls)
    setPaymentTypes(["Credit Card", "Cash", "Mobile Payment"])
    setDiscounts(["10% Off", "Student Discount", "Bulk Discount"])
    setPromotions(["Weekend Sale", "Holiday Special"])

    // Generate dynamic feature types based on product properties
    if (products.length > 0) {
      const firstProduct = products[0]
      const newFeatureTypes: FeatureType[] = []

      for (const key in firstProduct) {
        if (key !== "id" && key !== "name" && key !== "price" && key !== "image" && key !== "category") {
          // Extract unique options for each feature type
          const options = [
            ...new Set(products.map((p: any) => p[key]).filter((value) => value !== undefined && value !== null)),
          ].map(String)
          if (options.length > 0) {
            newFeatureTypes.push({ name: key, options: options })
          }
        }
      }

      setFeatureTypes(newFeatureTypes)
    }
  }, [products])

  const filteredProducts = products.filter((product) => {
    const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const categoryMatch = categoryFilter ? product.categoryName === categoryFilter : true
    return searchMatch && categoryMatch
  })

  const uniqueCategories = [...new Set(products.map((product) => product.categoryName).filter(Boolean))]

  return (
    <div className="till-product-list-panel">
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="till product tabs">
          <Tab label="Products" />
          <Tab label="Payment" />
          <Tab label="Discounts" />
          <Tab label="Promotions" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box p={2}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <TextField
              label="Search Products"
              variant="outlined"
              size="small"
              style={{ marginRight: "10px" }}
              onChange={handleSearchInputChange}
            />
            <IconButton aria-label="search">
              <SearchIcon />
            </IconButton>
            <IconButton aria-label="filter" onClick={() => handleCategoryFilter(categoryFilter ? null : "category1")}>
              <FilterListIcon />
            </IconButton>
            {uniqueCategories.length > 0 && (
              <FormControl variant="outlined" size="small">
                <InputLabel id="category-filter-label">Category</InputLabel>
                <Select
                  labelId="category-filter-label"
                  id="category-filter"
                  value={categoryFilter || ""}
                  onChange={(e) => handleCategoryFilter(e.target.value as string)}
                  label="Category"
                  style={{ width: "120px", marginRight: "10px" }}
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </div>

          <div
            className="product-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}
          >
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="product-item"
                style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "4px" }}
              >
                <img
                  src={product.image || "/placeholder.svg?height=80&width=80"}
                  alt={product.name}
                  style={{ width: "100%", height: "80px", objectFit: "cover", marginBottom: "8px" }}
                />
                <h4 style={{ margin: "0 0 4px 0", fontSize: "14px" }}>{product.name}</h4>
                <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "bold" }}>
                  £{(product.salesPrice || product.price || 0).toFixed(2)}
                </p>
                <button
                  onClick={() => onAddProduct(product)}
                  style={{ width: "100%", padding: "4px", fontSize: "12px", marginBottom: "4px" }}
                >
                  Add to Cart
                </button>
                <IconButton
                  aria-label="more"
                  id="long-button"
                  aria-controls={open ? "long-menu" : undefined}
                  aria-expanded={open ? "true" : undefined}
                  aria-haspopup="true"
                  onClick={(event) => handleClick(event, product)}
                  size="small"
                >
                  <MoreVertIcon />
                </IconButton>
              </div>
            ))}
          </div>
          <Menu
            id="long-menu"
            MenuListProps={{
              "aria-labelledby": "long-button",
            }}
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            PaperProps={{
              style: {
                maxHeight: 48 * 4.5,
                width: "20ch",
              },
            }}
          >
            {selectedProduct &&
              featureTypes.map((featureType) => (
                <MenuItem
                  key={featureType.name}
                  onClick={() => {
                    setSelectedFeatureType(featureType.name)
                  }}
                >
                  {getFeatureIcon && getFeatureIcon(featureType.name)}
                  Add {featureType.name}
                </MenuItem>
              ))}
            <MenuItem onClick={handleOpenAddFeatureDialog}>
              <AddIcon style={{ marginRight: "8px" }} /> Add New Feature
            </MenuItem>
          </Menu>
          <Dialog
            open={isAddFeatureDialogOpen}
            onClose={handleCloseAddFeatureDialog}
            aria-labelledby="add-feature-dialog"
          >
            <DialogTitle id="add-feature-dialog">Add New Feature</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                id="feature-name"
                label="Feature Name"
                type="text"
                fullWidth
                variant="standard"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
              />
              {newFeatureOptions.map((option, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", marginTop: "8px" }}>
                  <TextField
                    margin="dense"
                    id={`feature-option-${index}`}
                    label={`Option ${index + 1}`}
                    type="text"
                    variant="standard"
                    value={option}
                    onChange={(e) => handleFeatureOptionChange(index, e.target.value)}
                    style={{ marginRight: "8px" }}
                  />
                  <Button onClick={() => handleRemoveFeatureOption(index)} color="error">
                    Remove
                  </Button>
                </div>
              ))}
              <Button onClick={handleAddFeatureOption}>Add Option</Button>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseAddFeatureDialog}>Cancel</Button>
              <Button onClick={handleCreateFeature}>Create</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={!!selectedFeatureType} onClose={handleClose} aria-labelledby="add-feature-value-dialog">
            <DialogTitle id="add-feature-value-dialog">Add {selectedFeatureType} Value</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                id="feature-value"
                label={`Value for ${selectedFeatureType}`}
                type="text"
                fullWidth
                variant="standard"
                value={newFeatureOption}
                onChange={(e) => setNewFeatureOption(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleAddFeatureToProduct}>Add</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {tabValue === 1 && (
        <Box p={2}>
          <h2>Payment Types</h2>
          <List>
            {paymentTypes.map((type) => (
              <ListItem key={type}>
                <ListItemText primary={type} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {tabValue === 2 && (
        <Box p={2}>
          <h2>Discounts</h2>
          <List>
            {discounts.map((discount) => (
              <ListItem key={discount}>
                <ListItemText primary={discount} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {tabValue === 3 && (
        <Box p={2}>
          <h2>Promotions</h2>
          <List>
            {promotions.map((promotion) => (
              <ListItem key={promotion}>
                <ListItemText primary={promotion} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {featureTypes.length > 0 && (
        <Box p={2}>
          <h2>Features</h2>
          <List>
            {featureTypes.map((featureType) => (
              <div key={featureType.name}>
                <ListItemButton onClick={() => handleFeatureToggle(featureType.name)}>
                  <ListItemText primary={featureType.name} />
                  {openFeature === featureType.name ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openFeature === featureType.name} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {featureType.options.map((option) => (
                      <StyledListItem key={option} sx={{ pl: 4 }}>
                        <ListItemButton onClick={() => onAddFeature(featureType.name, option)}>
                          <ListItemText primary={option} />
                        </ListItemButton>
                      </StyledListItem>
                    ))}
                  </List>
                </Collapse>
              </div>
            ))}
          </List>
        </Box>
      )}
    </div>
  )
}

export default TillProductListPanel
