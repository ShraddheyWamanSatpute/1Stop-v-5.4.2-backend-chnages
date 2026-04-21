"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,

  Divider,
  IconButton,

} from "@mui/material"
import {

  MenuBook as MenuBookIcon,
  ExpandMore as ExpandMoreIcon,
  Upload as UploadIcon,
  QrCode as QrCodeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  LocalOffer as PriceIcon,
  Category as CategoryIcon,
} from "@mui/icons-material"

interface FloorFriendMenusProps {
  // This will be enhanced when we integrate with actual menu data
}

// Mock menu data structure (will be replaced with real data)
const mockMenuData = {
  categories: [
    {
      id: "starters",
      name: "Starters",
      items: [
        { id: "1", name: "Garlic Bread", price: "£4.50", description: "Fresh bread with garlic butter", allergens: ["Gluten", "Dairy"] },
        { id: "2", name: "Soup of the Day", price: "£5.95", description: "Chef's special soup", allergens: ["May contain nuts"] },
      ]
    },
    {
      id: "mains",
      name: "Main Courses",
      items: [
        { id: "3", name: "Fish & Chips", price: "£12.95", description: "Fresh cod with hand-cut chips", allergens: ["Fish", "Gluten"] },
        { id: "4", name: "Chicken Curry", price: "£11.50", description: "Mild curry with rice", allergens: ["May contain nuts"] },
      ]
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        { id: "5", name: "Chocolate Cake", price: "£6.50", description: "Rich chocolate cake with cream", allergens: ["Gluten", "Dairy", "Eggs"] },
        { id: "6", name: "Ice Cream", price: "£4.95", description: "Selection of flavors", allergens: ["Dairy"] },
      ]
    },
    {
      id: "drinks",
      name: "Beverages",
      items: [
        { id: "7", name: "Coffee", price: "£2.95", description: "Freshly brewed coffee", allergens: [] },
        { id: "8", name: "Wine (Glass)", price: "£5.50", description: "House wine selection", allergens: ["Sulphites"] },
      ]
    }
  ]
}

const FloorFriendMenus: React.FC<FloorFriendMenusProps> = () => {
  const [globalSearch, setGlobalSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [, ] = useState<string>("all") // Placeholder for future category filtering

  const normalizedSearch = globalSearch.toLowerCase()

  // Filter menu items
  const filteredCategories = useMemo(() => {
    return mockMenuData.categories.map(category => ({
      ...category,
      items: category.items.filter(item => {
        // Global search filter
        if (normalizedSearch) {
          const searchableFields = [
            item.name,
            item.description,
            item.price,
            ...item.allergens
          ]
          
          const matchesSearch = searchableFields.some(field => 
            String(field || "").toLowerCase().includes(normalizedSearch)
          )
          if (!matchesSearch) return false
        }

        // Category filter
        if (categoryFilter !== "all" && category.id !== categoryFilter) {
          return false
        }

        return true
      })
    })).filter(category => category.items.length > 0)
  }, [normalizedSearch, categoryFilter])

  // Get total items count
  const totalItems = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0)

  const handleUploadMenu = () => {
    setUploadDialogOpen(true)
  }

  const handleGenerateQR = () => {
    setQrDialogOpen(true)
  }

  const handleCloseUpload = () => {
    setUploadDialogOpen(false)
  }

  const handleCloseQR = () => {
    setQrDialogOpen(false)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <MenuBookIcon />
        Menu Management
      </Typography>

      {/* Summary and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h6" color="primary">
                  {filteredCategories.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Categories
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" color="primary">
                  {totalItems}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Menu Items
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleUploadMenu}
              >
                Upload Menu
              </Button>
              <Button
                variant="outlined"
                startIcon={<QrCodeIcon />}
                onClick={handleGenerateQR}
              >
                QR Code
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
              >
                Add Item
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search menu items"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Filter by Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {mockMenuData.categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Menu Categories */}
      {filteredCategories.map((category) => (
        <Accordion key={category.id} defaultExpanded>
          <AccordionSummary 
            expandIcon={<ExpandMoreIcon />}
            sx={{ backgroundColor: "grey.50" }}
          >
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CategoryIcon />
              {category.name} ({category.items.length} items)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {category.items.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card>
                    <CardContent>
                      <Stack spacing={2}>
                        {/* Item Header */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Typography variant="h6" component="h3">
                            {item.name}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <IconButton size="small" color="primary">
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </Box>

                        {/* Price */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PriceIcon fontSize="small" color="primary" />
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            {item.price}
                          </Typography>
                        </Box>

                        {/* Description */}
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>

                        {/* Allergens */}
                        {item.allergens.length > 0 && (
                          <>
                            <Divider />
                            <Box>
                              <Typography variant="caption" color="text.secondary" gutterBottom>
                                Allergens:
                              </Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {item.allergens.map((allergen, index) => (
                                  <Chip
                                    key={index}
                                    label={allergen}
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                  />
                                ))}
                              </Stack>
                            </Box>
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {filteredCategories.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <MenuBookIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No menu items found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {globalSearch || categoryFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Upload a menu or add items to get started"}
          </Typography>
        </Paper>
      )}

      {/* Upload Menu Dialog */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUpload} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Menu</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Upload your menu in Excel or CSV format. The file should include columns for:
              Category, Item Name, Description, Price, and Allergens.
            </Typography>
            
            <Paper
              sx={{
                p: 3,
                border: "2px dashed",
                borderColor: "grey.300",
                textAlign: "center",
                cursor: "pointer",
                "&:hover": { borderColor: themeConfig.brandColors.navy }
              }}
            >
              <UploadIcon sx={{ fontSize: 48, color: "grey.500", mb: 1 }} />
              <Typography variant="body1" gutterBottom>
                Click to select file or drag and drop
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: .xlsx, .csv (Max 10MB)
              </Typography>
            </Paper>

            <Typography variant="caption" color="text.secondary">
              Note: Uploading a new menu will replace the existing menu data.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUpload}>Cancel</Button>
          <Button variant="contained" disabled>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={handleCloseQR} maxWidth="sm" fullWidth>
        <DialogTitle>Menu QR Code</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Generate QR codes for customers to view your menu on their devices.
            </Typography>
            
            {/* Placeholder for QR Code */}
            <Paper
              sx={{
                p: 4,
                border: "1px solid",
                borderColor: "grey.300",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2
              }}
            >
              <QrCodeIcon sx={{ fontSize: 120, color: "grey.400" }} />
              <Typography variant="body2" color="text.secondary">
                QR Code will appear here
              </Typography>
            </Paper>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="outlined">
                Download PNG
              </Button>
              <Button variant="outlined">
                Download PDF
              </Button>
              <Button variant="contained">
                Print
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQR}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FloorFriendMenus
