import { themeConfig } from "../../../theme/AppTheme";
import React, { useState } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Menu,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  useTheme,
} from "@mui/material"
import {
  Add as AddIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  CalendarToday as CalendarTodayIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
} from "@mui/icons-material"
import { alpha } from "@mui/material/styles"

export interface DashboardMenuItem {
  label: string
  onClick: () => void
  permission?: boolean
}

export interface DashboardHeaderProps {
  title: string
  subtitle?: string
  canEdit?: boolean
  isEditing?: boolean
  onToggleEdit?: () => void
  onClearWidgets?: () => void
  onRevert?: () => void
  showGrid?: boolean
  onToggleGrid?: (show: boolean) => void
  menuItems?: DashboardMenuItem[]
  dateRange?: {
    value: string
    label: string
    onChange: (range: string) => void
  }
  frequency?: {
    value: string
    options: string[]
    onChange: (freq: string) => void
  }
  className?: string
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({

  subtitle,
  canEdit = false,
  isEditing = false,
  onToggleEdit,
  onClearWidgets,
  onRevert,
  showGrid = false,
  onToggleGrid,
  menuItems = [],
  dateRange,
  frequency,
 
}) => {
  const theme = useTheme()
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null)
  const [dateRangeAnchor, setDateRangeAnchor] = useState<null | HTMLElement>(null)

  const handleDateRangeChange = (range: string) => {
    dateRange?.onChange(range)
    setDateRangeAnchor(null)
  }

  const handleFrequencyChange = (freq: string) => {
    frequency?.onChange(freq)
  }

  return (
    <>

      {/* Add New Menu */}
      {menuItems.length > 0 && (
        <Menu
          anchorEl={addMenuAnchor}
          open={Boolean(addMenuAnchor)}
          onClose={() => setAddMenuAnchor(null)}
        >
          {menuItems.map((item, index) => {
            // Don't render if permission is explicitly false
            if (item.permission === false) return null
            
            return (
              <MenuItem
                key={index}
                onClick={() => {
                  setAddMenuAnchor(null)
                  // Prevent focus remaining on the trigger button while MUI applies aria-hidden to #root
                  // during Dialog/Modal open (avoids Chrome "Blocked aria-hidden..." warning).
                  ;(document.activeElement as HTMLElement | null)?.blur?.()
                  item.onClick()
                }}
              >
                {item.label}
              </MenuItem>
            )
          })}
        </Menu>
      )}

      {/* Overview Section with Date Range and Frequency */}
      {(dateRange || frequency) && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 4,
            bgcolor: themeConfig.brandColors.navy,
            color: themeConfig.brandColors.offWhite,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="h6" component="h3">
              {subtitle || "Overview"}
            </Typography>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {/* Date Range Dropdown */}
              {dateRange && (
                <Button
                  variant="text"
                  color="inherit"
                  startIcon={<CalendarTodayIcon />}
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={(e) => setDateRangeAnchor(e.currentTarget)}
                  sx={{ color: themeConfig.brandColors.offWhite }}
                >
                  {dateRange?.label}
                </Button>
              )}
            </Box>
          </Box>



          {/* Date Range Menu */}
          {dateRange && (
            <Menu
              anchorEl={dateRangeAnchor}
              open={Boolean(dateRangeAnchor)}
              onClose={() => setDateRangeAnchor(null)}
            >
              <MenuItem onClick={() => handleDateRangeChange("today")}>Today</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("yesterday")}>Yesterday</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("last7days")}>Last 7 Days</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("last30days")}>Last 30 Days</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("thisMonth")}>This Month</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("lastMonth")}>Last Month</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("thisYear")}>This Year</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("lastYear")}>Last Year</MenuItem>
              <MenuItem onClick={() => handleDateRangeChange("custom")}>Custom Range...</MenuItem>
            </Menu>
          )}

          {/* Frequency Chips and Buttons Row */}
          {frequency && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, flexWrap: "wrap", gap: 2 }}>
              {/* Frequency Chips */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {frequency?.options.map((freq) => (
                  (() => {
                    const isSelected = frequency?.value === freq.toLowerCase()
                    return (
                  <Chip
                    key={freq}
                    label={freq}
                    color="primary"
                    variant={isSelected ? "filled" : "outlined"}
                    onClick={() => handleFrequencyChange(freq.toLowerCase())}
                    sx={{
                      bgcolor:
                        isSelected
                          ? alpha(themeConfig.colors.primary.light, 0.85)
                          : "transparent",
                      color: themeConfig.brandColors.offWhite,
                      "&:hover": {
                        bgcolor: isSelected
                          ? alpha(themeConfig.colors.primary.light, 0.95)
                          : alpha(themeConfig.colors.primary.light, 0.25),
                      },
                      borderRadius: 10,
                      borderColor: isSelected
                        ? alpha(themeConfig.colors.primary.light, 0.9)
                        : alpha(themeConfig.brandColors.offWhite, 0.5),
                    }}
                  />
                    )
                  })()
                ))}
              </Box>

              {/* Edit Layout, Grid Toggle, Clear Widgets, and Add New Buttons */}
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                {/* Edit Layout Button */}
                {canEdit && onToggleEdit && (
                  <Button
                    variant="contained"
                    color={isEditing ? "secondary" : "primary"}
                    onClick={onToggleEdit}
                    startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
                    sx={{ 
                      bgcolor: isEditing ? themeConfig.brandColors.offWhite : themeConfig.brandColors.navy,
                      color: isEditing ? themeConfig.brandColors.navy : themeConfig.brandColors.offWhite,
                      "&:hover": {
                        bgcolor: isEditing ? themeConfig.colors.secondary.dark : themeConfig.colors.primary.dark,
                        color: themeConfig.brandColors.offWhite,
                      }
                    }}
                  >
                    {isEditing ? "Save Layout" : "Edit Layout"}
                  </Button>
                )}

                {/* Show Grid Toggle - Only in edit mode */}
                {isEditing && onToggleGrid && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showGrid}
                        onChange={(e) => onToggleGrid?.(e.target.checked)}
                        color="primary"
                        size="small"
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: themeConfig.brandColors.offWhite,
                            "& + .MuiSwitch-track": {
                              backgroundColor: alpha(themeConfig.colors.primary.light, 0.9),
                            },
                          },
                        }}
                      />
                    }
                    label="Show Grid"
                    sx={{ color: themeConfig.brandColors.offWhite, m: 0 }}
                  />
                )}

                {/* Revert Button - Only in edit mode */}
                {isEditing && onRevert && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onRevert}
                    startIcon={<UndoIcon />}
                    sx={{
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.7),
                      color: themeConfig.brandColors.offWhite,
                      "&:hover": {
                        borderColor: themeConfig.brandColors.offWhite,
                        backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                      },
                    }}
                  >
                    Revert
                  </Button>
                )}

                {/* Clear Widgets Button - Only in edit mode */}
                {isEditing && onClearWidgets && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={onClearWidgets}
                    startIcon={<DeleteIcon />}
                    sx={{
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.7),
                      color: themeConfig.brandColors.offWhite,
                      "&:hover": {
                        borderColor: themeConfig.brandColors.offWhite,
                        backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                      },
                    }}
                  >
                    Clear Widgets
                  </Button>
                )}

                {/* Add New Button - Same style as original stock dashboard */}
                {menuItems.length > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    endIcon={<KeyboardArrowDownIcon />}
                    onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                    sx={{
                      bgcolor: themeConfig.brandColors.offWhite,
                      color: themeConfig.brandColors.navy,
                      borderRadius: 2,
                      transition: "all 0.3s",
                      "&:hover": { 
                        bgcolor: themeConfig.colors.secondary.main,
                        color: themeConfig.brandColors.offWhite,
                        transform: "scale(1.05)" 
                      },
                      "&:active": { transform: "scale(0.95)" },
                    }}
                  >
                    Add New
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </>
  )
}

export default DashboardHeader
