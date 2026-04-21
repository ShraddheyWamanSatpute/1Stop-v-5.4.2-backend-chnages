"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  Grid,
  MenuItem,
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
  Chip,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  DeleteOutline as DeleteOutlineIcon,
} from "@mui/icons-material"
// All company state is now handled through StockContext
// Site functionality is now part of CompanyContext
// All database operations are now handled through StockContext
import { useStock } from "../../../backend/context/StockContext"
import type { UIParLevel, UIParLevelProfile, ParLevelProfileFromDB, TabPanelProps } from "../../../backend/interfaces/Stock"
import { usePermission } from "../../hooks/usePermission"

// ParLevelProfileFromDB and UIParLevelProfile interfaces moved to backend

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`par-level-tabpanel-${index}`}
      aria-labelledby={`par-level-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const AddParLevel: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { canView, canEdit } = usePermission()
  const canViewPage = canView("stock", "categories")
  const canMutate = canEdit("stock", "categories")
  const { 
    state: stockState, 
    saveParLevelProfile: contextSaveParLevelProfile,
    fetchParProfiles: contextFetchParProfiles,
  } = useStock()
  const { products, measures } = stockState

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [tabValue, setTabValue] = useState(0)

  // Par level profile state
  const [profile, setProfile] = useState<UIParLevelProfile>({
    name: "",
    parType: "Standard",
    parLevels: {},
    isActive: false,
  })

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Load par level profile data if editing
  useEffect(() => {
    const fetchData = async () => {
      // All data operations are now handled through StockContext

      setLoading(true)

      try {
        // If editing, load the par level profile
        if (id) {
          const allProfiles = await contextFetchParProfiles()
          const profileToEdit = allProfiles.find((p) => p.id === id)

          if (profileToEdit) {
            // Convert DB format to UI format
            const uiParLevels: Record<string, UIParLevel> = {}

            // Convert simple productId -> number mapping to full ParLevel objects
            if (profileToEdit.parLevels) {
              Object.entries(profileToEdit.parLevels).forEach(([productId, parLevel]) => {
                const product = products.find((p) => p.id === productId)
                const measureId = product?.purchase?.defaultMeasure || ""
                const measure = measures.find((m) => m.id === measureId)

                uiParLevels[productId] = {
                  itemID: productId,
                  itemName: product?.name || "Unknown Product",
                  unitID: measureId,
                  unitName: measure?.name || "Unknown Unit",
                  parLevel: typeof parLevel === "number" ? parLevel : 0,
                }
              })
            }

            setProfile({
              id: profileToEdit.id,
              name: profileToEdit.name,
              parType: (profileToEdit as any).parType || "Standard",
              parLevels: uiParLevels,
              isActive: (profileToEdit as any).isActive || false,
              bookingNumber: (profileToEdit as any).bookingNumber,
              months: (profileToEdit as any).months,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setErrorMessage("Failed to load data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, products, measures])

  // Add a new par level item
  const addParLevelItem = () => {
    const key = Date.now().toString()
    setProfile((prev) => ({
      ...prev,
      parLevels: {
        ...prev.parLevels,
        [key]: {
          itemID: "",
          itemName: "",
          unitID: "",
          unitName: "",
          parLevel: 0,
        },
      },
    }))
  }

  // Update a par level item
  const updateParLevel = (key: string, field: keyof UIParLevel, value: any) => {
    setProfile((prev) => ({
      ...prev,
      parLevels: {
        ...prev.parLevels,
        [key]: {
          ...prev.parLevels[key],
          [field]: value,
        },
      },
    }))
  }

  // Delete a par level item
  const deleteParLevel = (key: string) => {
    setProfile((prev) => {
      const updatedParLevels = { ...prev.parLevels }
      delete updatedParLevels[key]
      return {
        ...prev,
        parLevels: updatedParLevels,
      }
    })
  }

  // Handle product selection
  const handleProductChange = (key: string, product: any) => {
    if (!product) return

    const defaultMeasureId = product.purchase?.defaultMeasure || ""
    const defaultUnit = measures.find((m) => m.id === defaultMeasureId)

    updateParLevel(key, "itemID", product.id)
    updateParLevel(key, "itemName", product.name)
    updateParLevel(key, "unitID", defaultMeasureId)
    updateParLevel(key, "unitName", defaultUnit?.name || "Unknown Unit")
  }

  // Save par level profile
  const handleSave = async () => {
    // All data operations are now handled through StockContext
    if (!canMutate) {
      setErrorMessage("You don't have permission to edit Par Levels.")
      return
    }

    if (!profile.name) {
      setErrorMessage("Please enter a profile name")
      return
    }

    if (Object.keys(profile.parLevels).length === 0) {
      setErrorMessage("Please add at least one item")
      return
    }

    setSaving(true)

    // Transform the UI model to the database model
    const dbParLevels: { [productId: string]: number } = {}

    // Convert the complex ParLevel objects to simple productId -> number mapping
    Object.values(profile.parLevels).forEach((parLevel) => {
      if (parLevel.itemID && parLevel.parLevel !== undefined) {
        dbParLevels[parLevel.itemID] = parLevel.parLevel
      }
    })

    // Create the database model
    const profileToSave: ParLevelProfileFromDB = {
      name: profile.name,
      parLevels: dbParLevels,
    }

    // Add optional fields only if they exist
    if (profile.id) {
      profileToSave.id = profile.id
    }

    if (profile.parType) {
      profileToSave.parType = profile.parType
    }

    if (profile.isActive !== undefined) {
      profileToSave.isActive = profile.isActive
    }

    if (profile.bookingNumber) {
      profileToSave.bookingNumber = profile.bookingNumber
    }

    if (profile.months && profile.months.length > 0) {
      profileToSave.months = profile.months
    }

    try {
      await contextSaveParLevelProfile(profileToSave)
      setSuccessMessage(true)

      setTimeout(() => {
        navigate("/Stock")
      }, 2000)
    } catch (error) {
      console.error("Error saving par level profile:", error)
      setErrorMessage("Failed to save par level profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Filter par level items based on search term
  const filteredParLevels = Object.entries(profile.parLevels).filter(([_, item]) =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCloseSnackbar = () => {
    setSuccessMessage(false)
    setErrorMessage(null)
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
          Loading par level data...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: "1200px", mx: "auto" }}>
      {!canViewPage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You don't have permission to view Par Levels.
        </Alert>
      )}
      {!canMutate && canViewPage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to Par Levels.
        </Alert>
      )}
      <Snackbar
        open={successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: "100%" }}>
          {id ? "Par level profile updated successfully!" : "Par level profile created successfully!"}
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
            {id ? "Edit Par Level Profile" : "New Par Level Profile"}
          </Typography>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href="/" onClick={() => navigate("/")}>
              Dashboard
            </Link>
            <Link color="inherit" href="/Stock" onClick={() => navigate("/Stock")}>
              Stock
            </Link>
            <Typography color="text.primary">{id ? "Edit Par Level Profile" : "New Par Level Profile"}</Typography>
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
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="par level profile tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Profile Details" />
          <Tab label="Par Level Items" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: "bold", mb: 2 }}>
                Profile Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                label="Profile Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Profile Type</InputLabel>
                <Select
                  value={profile.parType}
                  label="Profile Type"
                  onChange={(e) => setProfile({ ...profile, parType: e.target.value as any })}
                >
                  <MenuItem value="Standard">Standard</MenuItem>
                  <MenuItem value="Booking">Booking</MenuItem>
                  <MenuItem value="Seasonal">Seasonal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              {profile.parType === "Booking" && (
                <TextField
                  fullWidth
                  label="Booking Number"
                  value={profile.bookingNumber || ""}
                  onChange={(e) => setProfile({ ...profile, bookingNumber: e.target.value })}
                  variant="outlined"
                />
              )}

              {profile.parType === "Seasonal" && (
                <FormControl fullWidth>
                  <InputLabel>Months</InputLabel>
                  <Select
                    multiple
                    value={profile.months || []}
                    label="Months"
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        months: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={profile.isActive}
                    onChange={(e) => setProfile({ ...profile, isActive: e.target.checked })}
                    color="primary"
                  />
                }
                label="Set as Active Profile"
                sx={{ mt: 2 }}
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" component="h2" sx={{ fontWeight: "bold" }}>
              Par Level Items
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="small"
                sx={{ width: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={addParLevelItem}>
                Add Item
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Measure</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Par Level
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredParLevels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        No items added yet. Click "Add Item" to start.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParLevels.map(([key, item]) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Autocomplete
                          options={products}
                          getOptionLabel={(option: any) => option.name || ""}
                          value={products.find((p) => p.id === item.itemID) || null}
                          onChange={(_, newValue) => handleProductChange(key, newValue)}
                          renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                      </TableCell>
                      <TableCell>
                        <Autocomplete
                          options={measures}
                          getOptionLabel={(option: any) => option.name || ""}
                          value={measures.find((m) => m.id === item.unitID) || null}
                          onChange={(_, newValue) => {
                            updateParLevel(key, "unitID", newValue?.id || "")
                            updateParLevel(key, "unitName", newValue?.name || "Unknown Unit")
                          }}
                          renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.parLevel}
                          onChange={(e) => updateParLevel(key, "parLevel", Number(e.target.value) || 0)}
                          InputProps={{
                            inputProps: { min: 0, step: 0.01 },
                          }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton color="error" onClick={() => deleteParLevel(key)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              mt: 3,
            }}
          >
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => navigate("/Stock")}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || !canMutate || !canViewPage}
            >
              {saving ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : id ? (
                "Update Par Level Profile"
              ) : (
                "Save Par Level Profile"
              )}
            </Button>
          </Box>
        </TabPanel>
      </Card>
    </Box>
  )
}

export default AddParLevel
