import type React from "react"
import { useState, useEffect } from "react"
import type { StockDataGridProps } from "../../../backend/context/StockContext"
import {
  Box,
  Typography,
  FormControl,
  MenuItem,
  Select,
  Grid,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import AddIcon from "@mui/icons-material/Add"
import DataHeader from "../reusable/DataHeader"

// StockDataGridProps interface moved to backend

const StockDataGrid: React.FC<StockDataGridProps> = ({ title = "Stock Performance" }) => {
  const [dateFrequency, setDateFrequency] = useState("daily")
  const [dateRange, setDateRange] = useState("last7days")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date | null>(new Date())

  const [filterPresets, setFilterPresets] = useState<
    Array<{
      id: string
      name: string
      dateRange: string
      dateFrequency: string
      startDate: Date | null
      endDate: Date | null
    }>
  >([
    {
      id: "1",
      name: "Last 7 Days (Daily)",
      dateRange: "last7days",
      dateFrequency: "daily",
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
    },
    {
      id: "2",
      name: "This Month (Weekly)",
      dateRange: "thisMonth",
      dateFrequency: "weekly",
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
    },
  ])
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  
  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")

  useEffect(() => {
    // Update date range based on selection
    if (dateRange !== "custom") {
      const now = new Date()

      switch (dateRange) {
        case "today":
          setStartDate(now)
          setEndDate(now)
          break
        case "yesterday":
          const yesterday = subDays(now, 1)
          setStartDate(yesterday)
          setEndDate(yesterday)
          break
        case "last7days":
          setStartDate(subDays(now, 6))
          setEndDate(now)
          break
        case "last30days":
          setStartDate(subDays(now, 29))
          setEndDate(now)
          break
        case "thisWeek":
          setStartDate(startOfWeek(now, { weekStartsOn: 1 }))
          setEndDate(endOfWeek(now, { weekStartsOn: 1 }))
          break
        case "lastWeek":
          const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 })
          const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 })
          setStartDate(lastWeekStart)
          setEndDate(lastWeekEnd)
          break
        case "thisMonth":
          setStartDate(startOfMonth(now))
          setEndDate(endOfMonth(now))
          break
        case "lastMonth":
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
          setStartDate(startOfMonth(lastMonth))
          setEndDate(endOfMonth(lastMonth))
          break
        case "thisYear":
          setStartDate(startOfYear(now))
          setEndDate(endOfYear(now))
          break
        case "lastYear":
          const lastYear = new Date(now.getFullYear() - 1, 0, 1)
          setStartDate(startOfYear(lastYear))
          setEndDate(endOfYear(lastYear))
          break
        default:
          break
      }

      setShowDatePicker(false)
    } else {
      setShowDatePicker(true)
    }
  }, [dateRange])

  const handleDateFrequencyChange = (event: any) => {
    setDateFrequency(event.target.value)
  }

  const handleDateRangeChange = (event: any) => {
    setDateRange(event.target.value)
  }

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return

    const newPreset = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPresetName,
      dateRange,
      dateFrequency,
      startDate,
      endDate,
    }

    setFilterPresets([...filterPresets, newPreset])
    setNewPresetName("")
    setPresetDialogOpen(false)

    // Show a success message (you would need to add a notification system)
    console.log("Preset saved:", newPreset)
  }

  const handleLoadPreset = (presetId: string) => {
    const preset = filterPresets.find((p) => p.id === presetId)
    if (!preset) return

    setDateRange(preset.dateRange)
    setDateFrequency(preset.dateFrequency)
    setStartDate(preset.startDate)
    setEndDate(preset.endDate)
    setSelectedPreset(presetId)

    // Show a success message
    console.log("Preset loaded:", preset)
  }

  const handleDeletePreset = (presetId: string) => {
    setFilterPresets(filterPresets.filter((p) => p.id !== presetId))
    if (selectedPreset === presetId) {
      setSelectedPreset(null)
    }

    // Show a success message
    console.log("Preset deleted:", presetId)
  }

  // DataHeader sort options
  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'value', label: 'Value' },
    { value: 'name', label: 'Name' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting ${title} as ${format}`);
    // Export functionality would be implemented here
    // For now, just log the action
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
      <DataHeader
        showDateControls={true}
        dateType="custom"
        searchTerm=""
        onSearchChange={() => {}}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <Select value={dateFrequency} onChange={handleDateFrequencyChange} displayEmpty>
              <MenuItem value="hourly">Hourly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <Select value={dateRange} onChange={handleDateRangeChange} displayEmpty>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="yesterday">Yesterday</MenuItem>
              <MenuItem value="last7days">Last 7 Days</MenuItem>
              <MenuItem value="last30days">Last 30 Days</MenuItem>
              <MenuItem value="thisWeek">This Week</MenuItem>
              <MenuItem value="lastWeek">Last Week</MenuItem>
              <MenuItem value="thisMonth">This Month</MenuItem>
              <MenuItem value="lastMonth">Last Month</MenuItem>
              <MenuItem value="thisYear">This Year</MenuItem>
              <MenuItem value="lastYear">Last Year</MenuItem>
              <MenuItem value="custom">Custom Date Range</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {showDatePicker && (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      )}

      {/* Presets Section */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Saved Presets
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {filterPresets.map((preset) => (
            <Chip
              key={preset.id}
              label={preset.name}
              onClick={() => handleLoadPreset(preset.id)}
              onDelete={() => handleDeletePreset(preset.id)}
              color={selectedPreset === preset.id ? "primary" : "default"}
              variant={selectedPreset === preset.id ? "filled" : "outlined"}
            />
          ))}
          <Chip
            icon={<AddIcon />}
            label="Save Current"
            onClick={() => setPresetDialogOpen(true)}
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Save Preset Dialog */}
      <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)}>
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preset Name"
            fullWidth
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePreset} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {startDate && endDate
            ? `Showing data from ${format(startDate, "MMM d, yyyy")} to ${format(endDate, "MMM d, yyyy")}`
            : "Select a date range to view data"}
        </Typography>
      </Box>

      {/* Visualization Placeholder */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Stock Performance Visualization
        </Typography>
        <Box
          sx={{
            height: 200,
            bgcolor: "action.hover",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {startDate && endDate
              ? `Visualization for ${format(startDate, "MMM d, yyyy")} to ${format(endDate, "MMM d, yyyy")}`
              : "Select a date range to view visualization"}
          </Typography>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1, border: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                Total Stock Value
              </Typography>
              <Typography variant="h6">£24,567.89</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1, border: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                Items Low in Stock
              </Typography>
              <Typography variant="h6">12</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1, border: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                Purchases (Period)
              </Typography>
              <Typography variant="h6">£8,432.10</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1, border: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                Stock Turnover
              </Typography>
              <Typography variant="h6">3.2x</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  )
}

export default StockDataGrid
