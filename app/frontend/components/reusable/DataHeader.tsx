"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useRef } from "react"
import {
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Menu,
  Checkbox,
  ListItemText,
  Tooltip,
  Collapse,
  useTheme,
} from "@mui/material"
import {
  Search as SearchIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarTodayIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from "@mui/icons-material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfYear, endOfYear, addYears, subYears } from "date-fns"
import { alpha } from "@mui/material/styles"

export interface FilterOption {
  id: string
  name: string
  color?: string
}

export interface ColumnOption {
  key: string
  label: string
}

export interface DataHeaderProps {
  // Title for the header
  title?: string
  
  // Date functionality (optional for management components)
  currentDate?: Date
  onDateChange?: (date: Date) => void
  dateType?: "day" | "week" | "month" | "year" | "all" | "custom"
  onDateTypeChange?: (type: "day" | "week" | "month" | "year" | "all" | "custom") => void
  showDateControls?: boolean // New prop to control date visibility
  showDateTypeSelector?: boolean // New prop to control date type selector visibility
  availableDateTypes?: ("day" | "week" | "month" | "year" | "all" | "custom")[] // Custom date type options
  
  // Search functionality
  searchTerm?: string | null
  onSearchChange?: ((term: string) => void) | null
  searchPlaceholder?: string
  
  // Filter functionality
  filters?: {
    label: string
    options: FilterOption[]
    selectedValues: string[]
    onSelectionChange: (values: string[]) => void
  }[]
  filtersExpanded?: boolean
  onFiltersToggle?: () => void
  
  // Column visibility
  columns?: ColumnOption[]
  columnVisibility?: Record<string, boolean>
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void
  
  // Group By functionality
  groupByOptions?: { value: string; label: string }[]
  groupByValue?: string
  onGroupByChange?: (value: string) => void
  
  // Sorting functionality
  sortOptions?: { value: string; label: string }[]
  sortValue?: string
  sortDirection?: "asc" | "desc"
  onSortChange?: (value: string, direction: "asc" | "desc") => void
  
  // Export functionality
  onExportCSV?: () => void
  onExportPDF?: () => void
  
  // Action buttons
  onRefresh?: () => void
  onCreateNew?: () => void
  createButtonLabel?: string
  createDisabled?: boolean
  createDisabledTooltip?: string
  
  // Additional buttons
  additionalButtons?: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    variant?: "text" | "outlined" | "contained"
    color?: "primary" | "secondary" | "error" | "warning" | "info" | "success"
    disabled?: boolean
    tooltip?: string
  }[]
  
  // Additional controls (like dropdowns, selects, etc.)
  additionalControls?: React.ReactNode
  
  // Custom date range (when dateType is "custom")
  customStartDate?: Date
  customEndDate?: Date
  onCustomDateRangeChange?: (startDate: Date, endDate: Date) => void
  
  // Styling
  backgroundColor?: string
  textColor?: string
  singleRow?: boolean // New prop to force single row layout
  /** ESS/Mobile shell: theme primary toolbar, rounded card, tighter spacing (matches Time Off / Holidays). */
  mobileESSLayout?: boolean
}

const DataHeader: React.FC<DataHeaderProps> = ({
  title,
  currentDate = new Date(),
  onDateChange,
  dateType = "day",
  onDateTypeChange,
  showDateControls = true,
  showDateTypeSelector = true,
  availableDateTypes = ["day", "week", "month", "custom"],
  searchTerm = undefined,
  onSearchChange = undefined,
  searchPlaceholder = "Search...",
  filters = [],
  filtersExpanded = false,
  onFiltersToggle,
  columns = [],
  columnVisibility = {},
  onColumnVisibilityChange,
  groupByOptions = [],
  groupByValue = "none",
  onGroupByChange,
  sortOptions = [],
  sortValue = "",
  sortDirection = "asc",
  onSortChange,
  onExportCSV,
  onExportPDF,
  onRefresh,
  onCreateNew,
  createButtonLabel = "Create New",
  createDisabled = false,
  createDisabledTooltip,
  additionalButtons = [],
  additionalControls,
  customStartDate,
  customEndDate,
  onCustomDateRangeChange,
  backgroundColor = themeConfig.brandColors.navy,
  textColor = themeConfig.brandColors.offWhite,
  singleRow = false,
  mobileESSLayout = false,
}) => {
  const theme = useTheme()
  const headerBg = mobileESSLayout ? theme.palette.primary.main : backgroundColor
  const headerFg = mobileESSLayout ? theme.palette.primary.contrastText : textColor
  const actionSurfaceBg = mobileESSLayout ? theme.palette.primary.contrastText : themeConfig.brandColors.offWhite
  const actionSurfaceFg = mobileESSLayout ? theme.palette.primary.main : backgroundColor
  const normalizedTitle = (title ?? "").trim()
  const showTitle = normalizedTitle.length > 0
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [columnsMenuAnchorEl, setColumnsMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState<null | HTMLElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)

  const handlePrevPeriod = () => {
    if (!onDateChange) return
    switch (dateType) {
      case "day":
        onDateChange(subDays(currentDate, 1))
        break
      case "week":
        onDateChange(subDays(currentDate, 7))
        break
      case "month":
        const prevMonth = new Date(currentDate)
        prevMonth.setMonth(prevMonth.getMonth() - 1)
        onDateChange(prevMonth)
        break
      case "year":
        onDateChange(subYears(currentDate, 1))
        break
      case "all":
        // No navigation for "all time"
        break
      case "custom":
        onDateChange(subDays(currentDate, 1))
        break
    }
  }

  const handleNextPeriod = () => {
    if (!onDateChange) return
    switch (dateType) {
      case "day":
        onDateChange(addDays(currentDate, 1))
        break
      case "week":
        onDateChange(addDays(currentDate, 7))
        break
      case "month":
        const nextMonth = new Date(currentDate)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        onDateChange(nextMonth)
        break
      case "year":
        onDateChange(addYears(currentDate, 1))
        break
      case "all":
        // No navigation for "all time"
        break
      case "custom":
        onDateChange(addDays(currentDate, 1))
        break
    }
  }

  const handleGoToToday = () => {
    if (!onDateChange) return
    onDateChange(new Date())
  }

  const handleDatePickerChange = (date: Date | null) => {
    if (date && onDateChange) {
      onDateChange(date)
    }
    setDatePickerOpen(false)
  }

  const getDateDisplayText = () => {
    switch (dateType) {
      case "day":
        return format(currentDate, "EEE, MMM d, yyyy")
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`
        } else {
          return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
        }
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "year":
        return format(currentDate, "yyyy")
      case "all":
        return "All Time"
      case "custom":
        return "Custom Range" // We'll show the date pickers inline instead
      default:
        return format(currentDate, "EEE, MMM d, yyyy")
    }
  }

  const toggleColumnVisibility = (key: string) => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange({
        ...columnVisibility,
        [key]: !columnVisibility[key],
      })
    }
  }

  const renderColumnsMenu = () => {
    const visibleColumns = columns.filter(col => columnVisibility[col.key])
    const hiddenColumns = columns.filter(col => !columnVisibility[col.key])
    
    return (
      <Menu
        anchorEl={columnsMenuAnchorEl}
        open={Boolean(columnsMenuAnchorEl)}
        onClose={() => setColumnsMenuAnchorEl(null)}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxWidth: 400,
            maxHeight: '70vh',
            overflow: 'hidden',
            '& .MuiMenu-list': {
              padding: 0
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          bgcolor: themeConfig.brandColors.offWhite
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Column Visibility
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {visibleColumns.length} of {columns.length} columns visible
          </Typography>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ 
          p: 1.5, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap'
        }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              // Show all columns
              const newVisibility: Record<string, boolean> = {}
              columns.forEach(col => {
                newVisibility[col.key] = true
              })
              onColumnVisibilityChange?.(newVisibility)
            }}
            sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1.5 }}
          >
            Show All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              // Hide all columns
              const newVisibility: Record<string, boolean> = {}
              columns.forEach(col => {
                newVisibility[col.key] = false
              })
              onColumnVisibilityChange?.(newVisibility)
            }}
            sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1.5 }}
          >
            Hide All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              // Show only essential columns
              const newVisibility: Record<string, boolean> = {}
              columns.forEach(col => {
                // Define essential columns (you can customize this)
                const essentialColumns = ['name', 'category', 'sku', 'purchasePrice', 'salesPrice', 'status']
                newVisibility[col.key] = essentialColumns.includes(col.key)
              })
              onColumnVisibilityChange?.(newVisibility)
            }}
            sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1.5 }}
          >
            Essential
          </Button>
        </Box>

        {/* Column List */}
        <Box sx={{ 
          maxHeight: '50vh', 
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.primary.main, 0.3),
            borderRadius: '3px',
          },
        }}>
          {/* Visible Columns Section */}
          {visibleColumns.length > 0 && (
            <>
              <Box sx={{ p: 1.5, bgcolor: 'success.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Visible columns ({visibleColumns.length})
                </Typography>
              </Box>
              {visibleColumns.map((column) => (
                <MenuItem 
                  key={column.key} 
                  onClick={() => toggleColumnVisibility(column.key)}
                  sx={{ 
                    py: 1,
                    px: 2,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Checkbox 
                    checked={true} 
                    size="small"
                    sx={{ 
                      mr: 1.5,
                      '&.Mui-checked': { color: 'success.main' }
                    }} 
                  />
                  <ListItemText 
                    primary={column.label}
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        fontSize: '0.875rem',
                        fontWeight: 500
                      } 
                    }}
                  />
                  <Box sx={{ 
                    ml: 1,
                    px: 1,
                    py: 0.5,
                    bgcolor: 'success.100',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    color: 'success.main',
                    fontWeight: 500
                  }}>
                    On
                  </Box>
                </MenuItem>
              ))}
            </>
          )}

          {/* Hidden Columns Section */}
          {hiddenColumns.length > 0 && (
            <>
              <Box sx={{ p: 1.5, bgcolor: themeConfig.brandColors.offWhite, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Hidden columns ({hiddenColumns.length})
                </Typography>
              </Box>
              {hiddenColumns.map((column) => (
                <MenuItem 
                  key={column.key} 
                  onClick={() => toggleColumnVisibility(column.key)}
                  sx={{ 
                    py: 1,
                    px: 2,
                    opacity: 0.7,
                    '&:hover': { 
                      bgcolor: 'action.hover',
                      opacity: 1 
                    }
                  }}
                >
                  <Checkbox 
                    checked={false} 
                    size="small"
                    sx={{ mr: 1.5 }} 
                  />
                  <ListItemText 
                    primary={column.label}
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        fontSize: '0.875rem',
                        color: 'text.secondary'
                      } 
                    }}
                  />
                  <Box sx={{ 
                    ml: 1,
                    px: 1,
                    py: 0.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    fontWeight: 500
                  }}>
                    Off
                  </Box>
                </MenuItem>
              ))}
            </>
          )}
        </Box>

        {/* Footer with column count */}
        <Box sx={{ 
          p: 1.5, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: themeConfig.brandColors.offWhite,
          textAlign: 'center'
        }}>
          <Typography variant="caption" color="text.secondary">
            {visibleColumns.length} columns visible • {hiddenColumns.length} hidden
          </Typography>
        </Box>
      </Menu>
    )
  }

  const renderExportMenu = () => (
    <Menu
      anchorEl={exportMenuAnchorEl}
      open={Boolean(exportMenuAnchorEl)}
      onClose={() => setExportMenuAnchorEl(null)}
    >
      {onExportCSV && (
        <MenuItem
          onClick={() => {
            onExportCSV()
            setExportMenuAnchorEl(null)
          }}
        >
          Export CSV
        </MenuItem>
      )}
      {onExportPDF && (
        <MenuItem
          onClick={() => {
            onExportPDF()
            setExportMenuAnchorEl(null)
          }}
        >
          Export PDF
        </MenuItem>
      )}
    </Menu>
  )

  return (
    <Box sx={{ mb: mobileESSLayout ? { xs: 2, sm: 2 } : 3 }}>
      <Card
        sx={{
          mb: 0,
          bgcolor: headerBg,
          borderRadius: mobileESSLayout ? { xs: 2, sm: 3 } : undefined,
          boxShadow: mobileESSLayout ? theme.shadows[2] : undefined,
        }}
      >
        <CardContent sx={{ py: mobileESSLayout ? { xs: 1.25, sm: 1.5 } : 1.5, "&:last-child": { pb: mobileESSLayout ? { xs: 1.25, sm: 1.5 } : 1.5 } }}>
          {/* Title */}
            {showTitle && (
            <Typography
              variant="h6"
              sx={{
                color: headerFg,
                mb: mobileESSLayout ? { xs: 0.75, sm: 1 } : 1,
                fontWeight: 600,
                fontSize: mobileESSLayout ? { xs: "1rem", sm: "1.125rem" } : undefined,
              }}
            >
              {normalizedTitle}
            </Typography>
          )}


          {/* Toolbar: column on small mobile ESS screens; row on tablet+ */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: singleRow ? "nowrap" : "wrap",
              overflowX: singleRow ? "auto" : "visible",
              ...(mobileESSLayout && {
                alignItems: { xs: "stretch", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 0.75, sm: 1 },
              }),
              "&::-webkit-scrollbar": singleRow
                ? {
                    height: "4px",
                  }
                : {},
              "&::-webkit-scrollbar-track": singleRow
                ? {
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                  }
                : {},
              "&::-webkit-scrollbar-thumb": singleRow
                ? {
                    backgroundColor: alpha(theme.palette.secondary.main, 0.3),
                    borderRadius: "2px",
                  }
                : {},
            }}
          >
            {/* Date Navigation - Only show if showDateControls is true */}
            {showDateControls && dateType !== "custom" && dateType !== "all" && (
              <>
                <IconButton onClick={handlePrevPeriod} size="small" sx={{ color: headerFg }}>
                  <ChevronLeftIcon />
                </IconButton>
                <Button
                  ref={dateButtonRef}
                  onClick={() => setDatePickerOpen(true)}
                  variant="text"
                  startIcon={<CalendarTodayIcon />}
                  sx={{
                    fontWeight: "medium",
                    fontSize: "0.95rem",
                    minWidth: 200,
                    color: headerFg,
                    textTransform: "none",
                  }}
                >
                  {getDateDisplayText()}
                </Button>
                <IconButton onClick={handleNextPeriod} size="small" sx={{ color: headerFg }}>
                  <ChevronRightIcon />
                </IconButton>
                <Tooltip title="Go to Today">
                  <IconButton onClick={handleGoToToday} size="small" sx={{ color: headerFg }}>
                    <TodayIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {/* Custom Date Range Selectors - Inline */}
            {showDateControls && dateType === "custom" && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={customStartDate || currentDate}
                    onChange={(date) => {
                      if (date && onCustomDateRangeChange) {
                        onCustomDateRangeChange(date, customEndDate || new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000))
                      }
                    }}
                    slotProps={{ 
                      textField: { 
                        size: "small",
                        sx: {
                          width: 140,
                          "& .MuiOutlinedInput-root": {
                            bgcolor: themeConfig.brandColors.offWhite,
                            "& fieldset": { borderColor: alpha(theme.palette.secondary.main, 0.5) },
                            "&:hover fieldset": { borderColor: alpha(theme.palette.secondary.main, 0.8) },
                            "&.Mui-focused fieldset": { borderColor: themeConfig.brandColors.offWhite },
                          },
                          "& .MuiInputLabel-root": { color: alpha(theme.palette.secondary.main, 0.8) },
                          "& .MuiInputLabel-root.Mui-focused": { color: themeConfig.brandColors.offWhite },
                        }
                      } 
                    }}
                  />
                  <Typography variant="body2" sx={{ color: headerFg, mx: 1 }}>
                    to
                  </Typography>
                  <DatePicker
                    label="End Date"
                    value={customEndDate || new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)}
                    onChange={(date) => {
                      if (date && onCustomDateRangeChange) {
                        onCustomDateRangeChange(customStartDate || currentDate, date)
                      }
                    }}
                    slotProps={{ 
                      textField: { 
                        size: "small",
                        sx: {
                          width: 140,
                          "& .MuiOutlinedInput-root": {
                            bgcolor: themeConfig.brandColors.offWhite,
                            "& fieldset": { borderColor: alpha(theme.palette.secondary.main, 0.5) },
                            "&:hover fieldset": { borderColor: alpha(theme.palette.secondary.main, 0.8) },
                            "&.Mui-focused fieldset": { borderColor: themeConfig.brandColors.offWhite },
                          },
                          "& .MuiInputLabel-root": { color: alpha(theme.palette.secondary.main, 0.8) },
                          "& .MuiInputLabel-root.Mui-focused": { color: themeConfig.brandColors.offWhite },
                        }
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Box>
            )}

            {/* Date Type Selector - Only show if showDateControls and showDateTypeSelector are true */}
            {showDateControls && showDateTypeSelector && onDateTypeChange && (
              <FormControl
                size="small"
                sx={{
                  minWidth: mobileESSLayout ? { xs: 88, sm: 100 } : 100,
                  ml: { xs: 0, sm: 1 },
                  width: mobileESSLayout ? { xs: "100%", sm: "auto" } : "auto",
                }}
              >
                <InputLabel
                  sx={{
                    color: headerFg,
                    ...(mobileESSLayout && { fontSize: { xs: "0.75rem", sm: "1rem" } }),
                  }}
                >
                  View
                </InputLabel>
                <Select
                  value={dateType}
                  onChange={(e) => onDateTypeChange?.(e.target.value as "day" | "week" | "month" | "year" | "all" | "custom")}
                  label="View"
                  sx={{
                    color: headerFg,
                    "& .MuiSvgIcon-root": { color: headerFg },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: headerFg },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: themeConfig.brandColors.offWhite },
                    ...(mobileESSLayout && {
                      "& .MuiSelect-select": { py: 0.65, fontSize: "0.8125rem" },
                    }),
                  }}
                  MenuProps={{
                    PaperProps: { sx: { mt: 1 } },
                  }}
                >
                  {availableDateTypes.includes("day") && <MenuItem key="day" value="day">Day</MenuItem>}
                  {availableDateTypes.includes("week") && <MenuItem key="week" value="week">Week</MenuItem>}
                  {availableDateTypes.includes("month") && <MenuItem key="month" value="month">Month</MenuItem>}
                  {availableDateTypes.includes("year") && <MenuItem key="year" value="year">Year</MenuItem>}
                  {availableDateTypes.includes("all") && <MenuItem key="all" value="all">All Time</MenuItem>}
                  {availableDateTypes.includes("custom") && <MenuItem key="custom" value="custom">Custom</MenuItem>}
                </Select>
              </FormControl>
            )}

            {/* Search - only show if search props are provided */}
            {searchTerm !== undefined && onSearchChange && searchTerm !== null && onSearchChange !== null && (
              <TextField
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
                sx={{
                  ml: mobileESSLayout ? { xs: 0, sm: 1 } : 1,
                  width: mobileESSLayout ? { xs: "100%", sm: 250 } : 250,
                  minWidth: mobileESSLayout ? 0 : undefined,
                  flex: mobileESSLayout ? { xs: "1 1 100%", sm: "0 0 auto" } : undefined,
                  bgcolor: themeConfig.brandColors.offWhite,
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: themeConfig.brandColors.offWhite,
                    ...(mobileESSLayout ? { minHeight: 36 } : {}),
                    "& fieldset": { borderColor: "divider" },
                    "&:hover fieldset": { borderColor: "text.primary" },
                    "&.Mui-focused fieldset": { borderColor: headerBg },
                  },
                  ...(mobileESSLayout && {
                    "& .MuiInputBase-input": { py: 0.65, fontSize: "0.8125rem" },
                    "& .MuiInputAdornment-root .MuiSvgIcon-root": { fontSize: "1.1rem" },
                  }),
                }}
              />
            )}

            {/* Additional Controls */}
            {additionalControls}

            <Box
              sx={
                mobileESSLayout
                  ? {
                      display: { xs: "flex", sm: "contents" },
                      flexWrap: { xs: "wrap", sm: "nowrap" },
                      alignItems: { xs: "center", sm: "stretch" },
                      columnGap: { xs: 0.5, sm: 0 },
                      rowGap: { xs: 0.5, sm: 0 },
                      width: { xs: "100%", sm: "auto" },
                    }
                  : { display: "contents" }
              }
            >
              {/* Group By Dropdown */}
              {groupByOptions.length > 0 && onGroupByChange && (
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: 0, sm: 110 },
                    flex: mobileESSLayout ? { xs: "1 1 calc(50% - 4px)", sm: "0 0 auto" } : undefined,
                    maxWidth: mobileESSLayout ? { xs: "calc(50% - 4px)", sm: "none" } : undefined,
                    ml: { xs: 0, sm: 1 },
                  }}
                >
                  <InputLabel
                    sx={{
                      color: headerFg,
                      ...(mobileESSLayout && { fontSize: { xs: "0.75rem", sm: "1rem" } }),
                    }}
                  >
                    Group By
                  </InputLabel>
                  <Select
                    value={groupByValue}
                    onChange={(e) => onGroupByChange(e.target.value)}
                    label="Group By"
                    sx={{
                      color: headerFg,
                      "& .MuiSvgIcon-root": { color: headerFg },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: headerFg },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: themeConfig.brandColors.offWhite },
                      ...(mobileESSLayout && {
                        "& .MuiSelect-select": { py: 0.65, fontSize: "0.8125rem" },
                      }),
                    }}
                    MenuProps={{
                      PaperProps: { sx: { mt: 1 } },
                    }}
                  >
                    {groupByOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Sort Dropdown */}
              {sortOptions.length > 0 && onSortChange && (
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: 0, sm: 120 },
                    flex: mobileESSLayout ? { xs: "1 1 auto", sm: "0 0 auto" } : undefined,
                    maxWidth: mobileESSLayout ? { xs: "calc(100% - 44px)", sm: "none" } : undefined,
                    ml: { xs: 0, sm: 1 },
                  }}
                >
                  <InputLabel
                    sx={{
                      color: headerFg,
                      ...(mobileESSLayout && { fontSize: { xs: "0.75rem", sm: "1rem" } }),
                    }}
                  >
                    Sort By
                  </InputLabel>
                  <Select
                    value={sortValue}
                    onChange={(e) => onSortChange(e.target.value, sortDirection)}
                    label="Sort By"
                    sx={{
                      color: headerFg,
                      "& .MuiSvgIcon-root": { color: headerFg },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: headerFg },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: themeConfig.brandColors.offWhite },
                      ...(mobileESSLayout && {
                        "& .MuiSelect-select": { py: 0.65, fontSize: "0.8125rem" },
                      }),
                    }}
                    MenuProps={{
                      PaperProps: { sx: { mt: 1 } },
                    }}
                  >
                    {sortOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {option.label}
                          {sortValue === option.value && (
                            sortDirection === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Sort Direction Toggle */}
              {sortOptions.length > 0 && onSortChange && sortValue && (
                <Tooltip title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}>
                  <IconButton
                    onClick={() => onSortChange(sortValue, sortDirection === "asc" ? "desc" : "asc")}
                    size="small"
                    sx={{
                      color: headerFg,
                      ml: { xs: 0, sm: 0.5 },
                      flexShrink: 0,
                      p: mobileESSLayout ? 0.5 : undefined,
                      "& .MuiSvgIcon-root": mobileESSLayout ? { fontSize: "1.15rem" } : undefined,
                    }}
                  >
                    {sortDirection === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Spacer to push actions to the right (hidden on small mobile ESS — column layout) */}
            <Box
              sx={{
                flexGrow: 1,
                ...(mobileESSLayout && { display: { xs: "none", sm: "block" } }),
              }}
            />

            {/* Actions */}
            <Box
              sx={{
                display: "flex",
                gap: mobileESSLayout ? { xs: 0.5, sm: 1 } : 1,
                alignItems: "center",
                flexWrap: "wrap",
                width: mobileESSLayout ? { xs: "100%", sm: "auto" } : "auto",
                justifyContent: mobileESSLayout ? { xs: "flex-start", sm: "flex-end" } : undefined,
              }}
            >
              {/* NOTE: Refresh buttons are intentionally not rendered. */}

              {/* Filters Toggle */}
              {filters.length > 0 && onFiltersToggle && (
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon sx={{ fontSize: mobileESSLayout ? "1.1rem" : undefined }} />}
                  endIcon={
                    filtersExpanded ? (
                      <ExpandLessIcon sx={{ fontSize: mobileESSLayout ? { xs: "1rem", sm: "1.25rem" } : undefined }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: mobileESSLayout ? { xs: "1rem", sm: "1.25rem" } : undefined }} />
                    )
                  }
                  onClick={onFiltersToggle}
                  size="small"
                  sx={{
                    height: mobileESSLayout ? { xs: 34, sm: 32 } : "32px",
                    minWidth: mobileESSLayout ? { xs: 0, sm: "auto" } : undefined,
                    px: mobileESSLayout ? { xs: 0.75, sm: 1.5 } : undefined,
                    color: headerFg,
                    borderColor: headerFg,
                    fontSize: mobileESSLayout ? { xs: "0.75rem", sm: "0.8125rem" } : undefined,
                    "&:hover": { borderColor: "divider", bgcolor: alpha(theme.palette.secondary.main, 0.1) },
                    "& .MuiButton-startIcon": mobileESSLayout
                      ? { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } }
                      : undefined,
                  }}
                >
                  <Box component="span" sx={{ display: mobileESSLayout ? { xs: "none", sm: "inline" } : "inline" }}>
                    Filters
                  </Box>
                </Button>
              )}

              {/* Column Visibility */}
              {columns.length > 0 && onColumnVisibilityChange && (() => {
                const visibleCount = columns.filter(col => columnVisibility[col.key]).length
                const totalCount = columns.length
                
                return (
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={(e) => setColumnsMenuAnchorEl(e.currentTarget)}
                    size="small"
                    sx={{ 
                      height: mobileESSLayout ? { xs: 34, sm: 32 } : "32px",
                      color: headerFg, 
                      borderColor: headerFg, 
                      "&:hover": { borderColor: "divider", bgcolor: alpha(theme.palette.secondary.main, 0.1) },
                      minWidth: { xs: 'auto', sm: '120px' },
                      fontSize: mobileESSLayout ? { xs: '0.7rem', sm: '0.875rem' } : { xs: '0.75rem', sm: '0.875rem' },
                      px: mobileESSLayout ? { xs: 0.75, sm: 1.5 } : undefined,
                    }}
                  >
                    <Box sx={{ 
                      display: { xs: 'none', sm: 'flex' }, 
                      alignItems: 'center', 
                      gap: 0.5 
                    }}>
                      Columns
                      <Box sx={{
                        ml: 0.5,
                        px: 1,
                        py: 0.25,
                        bgcolor: visibleCount === totalCount ? 'success.main' : 'warning.main',
                        color: 'white',
                        borderRadius: 1,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {visibleCount}
                      </Box>
                    </Box>
                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.5 }}>
                      <VisibilityIcon fontSize="small" />
                      <Box sx={{
                        px: 0.75,
                        py: 0.25,
                        bgcolor: visibleCount === totalCount ? 'success.main' : 'warning.main',
                        color: 'white',
                        borderRadius: 1,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        minWidth: '16px',
                        textAlign: 'center'
                      }}>
                        {visibleCount}
                      </Box>
                    </Box>
                  </Button>
                )
              })()}

              {/* Export */}
              {(onExportCSV || onExportPDF) && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon sx={{ fontSize: mobileESSLayout ? "1.1rem" : undefined }} />}
                  onClick={(e) => setExportMenuAnchorEl(e.currentTarget)}
                  size="small"
                  sx={{
                    height: mobileESSLayout ? { xs: 34, sm: 32 } : "32px",
                    minWidth: mobileESSLayout ? { xs: 0, sm: "auto" } : undefined,
                    px: mobileESSLayout ? { xs: 0.75, sm: 1.5 } : undefined,
                    color: headerFg,
                    borderColor: headerFg,
                    fontSize: mobileESSLayout ? { xs: "0.75rem", sm: "0.8125rem" } : undefined,
                    "&:hover": { borderColor: "divider", bgcolor: alpha(theme.palette.secondary.main, 0.1) },
                    "& .MuiButton-startIcon": mobileESSLayout
                      ? { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } }
                      : undefined,
                  }}
                >
                  <Box component="span" sx={{ display: mobileESSLayout ? { xs: "none", sm: "inline" } : "inline" }}>
                    Export
                  </Box>
                </Button>
              )}


              {/* Additional Buttons */}
              {additionalButtons.map((button, index) => {
                const btn = (
                  <Button
                    key={index}
                    variant={button.variant || "outlined"}
                    startIcon={button.icon}
                    onClick={(e) => {
                      // Prevent focus remaining on the trigger button while MUI applies aria-hidden to #root
                      // during Dialog/Modal open (avoids Chrome "Blocked aria-hidden..." warning).
                      ;(e.currentTarget as HTMLButtonElement).blur()
                      button.onClick()
                    }}
                    size="small"
                    color={button.color}
                    disabled={Boolean(button.disabled)}
                    sx={{
                      height: mobileESSLayout ? { xs: 34, sm: 32 } : "32px",
                      minWidth: mobileESSLayout ? { xs: 0, sm: "auto" } : undefined,
                      px: mobileESSLayout ? { xs: 0.75, sm: 1.5 } : undefined,
                      fontSize: mobileESSLayout ? { xs: "0.75rem", sm: "0.8125rem" } : undefined,
                      whiteSpace: "nowrap",
                      maxWidth: mobileESSLayout ? { xs: 160, sm: "none" } : undefined,
                      overflow: mobileESSLayout ? { xs: "hidden", sm: "visible" } : undefined,
                      textOverflow: mobileESSLayout ? { xs: "ellipsis", sm: "clip" } : undefined,
                      ...(button.variant === "contained"
                        ? {
                            bgcolor: actionSurfaceBg,
                            color: actionSurfaceFg,
                            "&:hover": {
                              bgcolor: theme.palette.secondary.main,
                              color: themeConfig.brandColors.offWhite,
                            },
                          }
                        : { 
                            color: headerFg, 
                            borderColor: headerFg, 
                            "&:hover": { borderColor: "divider", bgcolor: alpha(theme.palette.secondary.main, 0.1) } 
                          })
                    }}
                  >
                    {button.label}
                  </Button>
                )

                if (button.disabled && button.tooltip) {
                  return (
                    <Tooltip key={index} title={button.tooltip}>
                      <span>{btn}</span>
                    </Tooltip>
                  )
                }

                return btn
              })}

              {/* Create New */}
              {onCreateNew && (
                (createDisabled ? (
                  <Tooltip title={createDisabledTooltip || "You don't have permission to create or edit here."}>
                    <span>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).blur()
                          onCreateNew()
                        }}
                        size="small"
                        disabled
                        sx={{ 
                          height: mobileESSLayout ? { xs: 34, sm: 32 } : "32px",
                          minWidth: mobileESSLayout ? { xs: 0, sm: "auto" } : undefined,
                          px: mobileESSLayout ? { xs: 0.85, sm: 1.5 } : undefined,
                          fontSize: mobileESSLayout ? { xs: "0.75rem", sm: "0.8125rem" } : undefined,
                          bgcolor: actionSurfaceBg, 
                          color: actionSurfaceFg, 
                          "&:hover": {
                            bgcolor: theme.palette.secondary.main,
                            color: themeConfig.brandColors.offWhite,
                          }, 
                          whiteSpace: "nowrap",
                          maxWidth: mobileESSLayout ? { xs: 200, sm: "none" } : undefined,
                          overflow: mobileESSLayout ? "hidden" : undefined,
                          textOverflow: mobileESSLayout ? "ellipsis" : undefined,
                        }}
                      >
                        {createButtonLabel}
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon sx={{ fontSize: mobileESSLayout ? "1.1rem" : undefined }} />}
                    onClick={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).blur()
                      onCreateNew()
                    }}
                    size="small"
                    sx={{ 
                      height: mobileESSLayout ? { xs: 34, sm: 32 } : "32px",
                      minWidth: mobileESSLayout ? { xs: 0, sm: "auto" } : undefined,
                      px: mobileESSLayout ? { xs: 0.85, sm: 1.5 } : undefined,
                      fontSize: mobileESSLayout ? { xs: "0.75rem", sm: "0.8125rem" } : undefined,
                      bgcolor: actionSurfaceBg, 
                      color: actionSurfaceFg, 
                      "&:hover": {
                        bgcolor: theme.palette.secondary.main,
                        color: themeConfig.brandColors.offWhite,
                      }, 
                      whiteSpace: "nowrap",
                      maxWidth: mobileESSLayout ? { xs: 200, sm: "none" } : undefined,
                      overflow: mobileESSLayout ? "hidden" : undefined,
                      textOverflow: mobileESSLayout ? "ellipsis" : undefined,
                      "& .MuiButton-startIcon": mobileESSLayout
                        ? { mr: { xs: 0.35, sm: 1 } }
                        : undefined,
                    }}
                  >
                    {createButtonLabel}
                  </Button>
                ))
              )}
            </Box>
          </Box>

          {/* Date Picker Dialog - Only show if showDateControls is true */}
          {showDateControls && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                open={datePickerOpen}
                onClose={() => setDatePickerOpen(false)}
                value={currentDate}
                onChange={handleDatePickerChange}
                slotProps={{
                  textField: { sx: { display: "none" } },
                  popper: {
                    anchorEl: dateButtonRef.current,
                    placement: "bottom-start",
                    sx: {
                      zIndex: 1300,
                      "& .MuiPaper-root": { marginTop: 1 },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          )}


          {/* Filters Row - Collapsible */}
          {filters.length > 0 && (
            <Collapse in={filtersExpanded} timeout="auto" unmountOnExit>
              <Box
                sx={{
                  mt: mobileESSLayout ? { xs: 1, sm: 2 } : 2,
                  display: "flex",
                  gap: mobileESSLayout ? { xs: 1, sm: 2 } : 2,
                  flexWrap: "wrap",
                  flexDirection: mobileESSLayout ? { xs: "column", sm: "row" } : "row",
                  alignItems: mobileESSLayout ? { xs: "stretch", sm: "center" } : "center",
                }}
              >
                {filters.map((filter, index) => (
                  <FormControl
                    key={index}
                    size="small"
                    sx={{
                      minWidth: mobileESSLayout ? { xs: 0, sm: 180 } : 180,
                      width: mobileESSLayout ? { xs: "100%", sm: "auto" } : "auto",
                    }}
                  >
                    <InputLabel
                      sx={{
                        color: headerFg,
                        ...(mobileESSLayout && { fontSize: { xs: "0.75rem", sm: "1rem" } }),
                      }}
                    >
                      {filter.label}
                    </InputLabel>
                    <Select
                      multiple
                      value={filter.selectedValues}
                      onChange={(e) => filter.onSelectionChange(Array.isArray(e.target.value) ? (e.target.value as string[]) : [])}
                      label={filter.label}
                      renderValue={(selected) => selected.join(", ")}
                      sx={{
                        color: headerFg,
                        "& .MuiSvgIcon-root": { color: headerFg },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: headerFg },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: themeConfig.brandColors.offWhite },
                        ...(mobileESSLayout && {
                          "& .MuiSelect-select": { py: 0.65, fontSize: "0.8125rem" },
                        }),
                      }}
                    >
                      {filter.options.map((option, optionIndex) => (
                        <MenuItem key={option.id || option.name || `option-${optionIndex}`} value={option.name}>
                          <Checkbox checked={filter.selectedValues.indexOf(option.name) > -1} />
                          <ListItemText
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                {option.color && (
                                  <Box 
                                    sx={{ 
                                      width: 12, 
                                      height: 12, 
                                      borderRadius: "50%", 
                                      bgcolor: option.color, 
                                      mr: 1, 
                                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                                    }} 
                                  />
                                )}
                                {option.name}
                              </Box>
                            }
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Box>
            </Collapse>
          )}
        </CardContent>
      </Card>

      {/* Column Visibility Menu */}
      {renderColumnsMenu()}

      {/* Export Menu */}
      {renderExportMenu()}
    </Box>
  )
}

export default DataHeader
