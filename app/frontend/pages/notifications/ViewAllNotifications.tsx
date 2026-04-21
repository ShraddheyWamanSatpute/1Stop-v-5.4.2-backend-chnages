import { themeConfig } from "../../../theme/AppTheme";
import React, { useState } from "react"
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Stack,
  Alert
} from "@mui/material"
import {
  Notifications as NotificationsIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,

  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  NotificationImportant as AlertIcon,
  Business as CompanyIcon,
  LocationOn as SiteIcon,
  Checklist as ChecklistIcon,
  Inventory as StockIcon,
  AttachMoney as FinanceIcon,
  People as HRIcon,
  EventNote as BookingIcon,
  Message as MessengerIcon,
  Person as UserIcon,
  Settings as SystemIcon
} from "@mui/icons-material"
import { useNotifications, Notification, NotificationType, NotificationCategory, NotificationPriority } from "../../../backend/context/NotificationsContext"
import { useNavigate } from "react-router-dom"

const inferNotificationTargetPath = (notification: Notification): string | null => {
  const metadata = notification.metadata || {}
  const explicitPath = typeof metadata.path === "string" ? metadata.path.trim() : ""
  if (explicitPath) return explicitPath

  const section = typeof metadata.section === "string" ? metadata.section.toLowerCase() : ""
  if (section.startsWith("company/permissions")) return "/Company/Permissions"
  if (section.startsWith("company/site") || section.startsWith("company/subsite")) return "/Company/SiteManagement"
  if (section.startsWith("company/checklist")) return "/Company/Checklists"
  if (section.startsWith("company")) return "/Company"
  if (section.startsWith("stock")) return "/Stock"
  if (section.startsWith("finance")) return "/Finance"
  if (section.startsWith("hr")) return "/HR"
  if (section.startsWith("booking")) return "/Bookings"
  if (section.startsWith("pos")) return "/POS"
  if (section.startsWith("supply")) return "/Supply"
  if (section.startsWith("messenger")) return "/Messenger"
  if (section.startsWith("settings")) return "/Settings"

  switch (notification.type) {
    case "company": return "/Company"
    case "site":
    case "subsite": return "/Company/SiteManagement"
    case "checklist": return "/Company/Checklists"
    case "stock": return "/Stock"
    case "finance": return "/Finance"
    case "hr": return "/HR"
    case "booking": return "/Bookings"
    case "messenger": return "/Messenger"
    case "system":
    case "user": return "/Settings"
    case "pos": return "/POS"
    default: return null
  }
}

const ViewAllNotifications: React.FC = () => {
  const {
    state: notificationsState,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    canViewNotifications,
    canEditNotifications,
    canDeleteNotifications,
  } = useNotifications()
  const navigate = useNavigate()
  const canView = canViewNotifications()
  const canEdit = canEditNotifications()
  const canDelete = canDeleteNotifications()

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<NotificationType | "all">("all")
  const [filterCategory, setFilterCategory] = useState<NotificationCategory | "all">("all")
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | "all">("all")
  const [filterRead, setFilterRead] = useState<"all" | "read" | "unread">("all")
  const [sortBy, setSortBy] = useState<"timestamp" | "priority" | "type">("timestamp")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)


  // Menu states
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)

  // Filter and sort notifications
  const filteredAndSortedNotifications = React.useMemo(() => {
    let filtered = notificationsState.notifications.filter(notification => {
      // Search filter
      if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Type filter
      if (filterType !== "all" && notification.type !== filterType) {
        return false
      }

      // Category filter
      if (filterCategory !== "all" && notification.category !== filterCategory) {
        return false
      }

      // Priority filter
      if (filterPriority !== "all" && notification.priority !== filterPriority) {
        return false
      }

      // Read status filter
      if (filterRead === "read" && !notification.read) {
        return false
      }
      if (filterRead === "unread" && notification.read) {
        return false
      }

      return true
    })

    // Sort notifications
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "timestamp":
          comparison = a.timestamp - b.timestamp
          break
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
      }

      return sortOrder === "desc" ? -comparison : comparison
    })

    return filtered
  }, [notificationsState.notifications, searchTerm, filterType, filterCategory, filterPriority, filterRead, sortBy, sortOrder])

  // Get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { fontSize: "small" as const }
    
    let typeIcon
    switch (type) {
      case "company": typeIcon = <CompanyIcon {...iconProps} />; break
      case "site": typeIcon = <SiteIcon {...iconProps} />; break
      case "checklist": typeIcon = <ChecklistIcon {...iconProps} />; break
      case "stock": typeIcon = <StockIcon {...iconProps} />; break
      case "finance": typeIcon = <FinanceIcon {...iconProps} />; break
      case "hr": typeIcon = <HRIcon {...iconProps} />; break
      case "booking": typeIcon = <BookingIcon {...iconProps} />; break
      case "messenger": typeIcon = <MessengerIcon {...iconProps} />; break
      case "user": typeIcon = <UserIcon {...iconProps} />; break
      case "system": typeIcon = <SystemIcon {...iconProps} />; break
      default: typeIcon = <NotificationsIcon {...iconProps} />
    }

    return typeIcon
  }

  // Get category color and icon
  const getCategoryProps = (category: NotificationCategory) => {
    switch (category) {
      case "error": return { color: "error" as const, icon: <ErrorIcon fontSize="small" /> }
      case "warning": return { color: "warning" as const, icon: <WarningIcon fontSize="small" /> }
      case "success": return { color: "success" as const, icon: <SuccessIcon fontSize="small" /> }
      case "alert": return { color: "secondary" as const, icon: <AlertIcon fontSize="small" /> }
      default: return { color: "info" as const, icon: <InfoIcon fontSize="small" /> }
    }
  }

  // Get priority color
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case "urgent": return "error"
      case "high": return "warning"
      case "medium": return "info"
      case "low": return "default"
      default: return "default"
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (canEdit && !notification.read) {
      await markAsRead(notification.id)
    }

    const targetPath = inferNotificationTargetPath(notification)
    if (targetPath) {
      navigate(targetPath)
    }
  }

  // Handle bulk actions
  const handleBulkMarkAsRead = async () => {
    if (!canEdit || selectedNotifications.length === 0) return

    if (selectedNotifications.length === notificationsState.notifications.length) {
      await markAllAsRead()
    } else {
      await Promise.all(selectedNotifications.map((notificationId) => markAsRead(notificationId)))
    }
    setSelectedNotifications([])
  }

  const handleBulkDelete = async () => {
    setDeleteConfirmOpen(true)
  }

  const confirmBulkDelete = async () => {
    if (!canDelete || selectedNotifications.length === 0) {
      setDeleteConfirmOpen(false)
      return
    }

    if (selectedNotifications.length === notificationsState.notifications.length) {
      await deleteAllNotifications()
    } else {
      await Promise.all(selectedNotifications.map((notificationId) => deleteNotification(notificationId)))
    }
    setSelectedNotifications([])
    setDeleteConfirmOpen(false)
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredAndSortedNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredAndSortedNotifications.map(n => n.id))
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("")
    setFilterType("all")
    setFilterCategory("all")
    setFilterPriority("all")
    setFilterRead("all")
    setSortBy("timestamp")
    setSortOrder("desc")
  }

  if (!canView) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          You do not have permission to view notifications in this workspace.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <NotificationsIcon sx={{ fontSize: 32, color: themeConfig.brandColors.navy }} />
          <Typography variant="h4" component="h1">
            All Notifications
          </Typography>
          <Badge badgeContent={notificationsState.unreadCount} color="error">
            <Chip label={`${notificationsState.notifications.length} Total`} />
          </Badge>
        </Box>
        
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refreshNotifications()} disabled={notificationsState.isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={() => markAllAsRead()}
            disabled={!canEdit || notificationsState.unreadCount === 0}
            startIcon={<MarkReadIcon />}
          >
            Mark All Read
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {notificationsState.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {notificationsState.error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
            }}
            sx={{ minWidth: 250 }}
          />
          
          <Button
            variant={showFilters ? "contained" : "outlined"}
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<FilterIcon />}
          >
            Filters
          </Button>
          
          <Button
            variant="outlined"
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            startIcon={<SortIcon />}
          >
            Sort: {sortBy} ({sortOrder})
          </Button>
          
          <Button
            variant="outlined"
            onClick={clearAllFilters}
            startIcon={<ClearIcon />}
          >
            Clear All
          </Button>
        </Box>

        {showFilters && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="company">Company</MenuItem>
                  <MenuItem value="site">Site</MenuItem>
                  <MenuItem value="checklist">Checklist</MenuItem>
                  <MenuItem value="stock">Stock</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="hr">HR</MenuItem>
                  <MenuItem value="booking">Booking</MenuItem>
                  <MenuItem value="messenger">Messenger</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="alert">Alert</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  label="Priority"
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterRead}
                  onChange={(e) => setFilterRead(e.target.value as any)}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="unread">Unread</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: "primary.50" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2">
              {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                onClick={handleBulkMarkAsRead}
                disabled={!canEdit}
                startIcon={<MarkReadIcon />}
              >
                Mark as Read
              </Button>
              <Button
                size="small"
                color="error"
                onClick={handleBulkDelete}
                disabled={!canDelete}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedNotifications([])}
              >
                Clear Selection
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Select All */}
      {filteredAndSortedNotifications.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedNotifications.length === filteredAndSortedNotifications.length}
                disabled={!canEdit && !canDelete}
                indeterminate={selectedNotifications.length > 0 && selectedNotifications.length < filteredAndSortedNotifications.length}
                onChange={handleSelectAll}
              />
            }
            label={`Select all ${filteredAndSortedNotifications.length} notification${filteredAndSortedNotifications.length > 1 ? 's' : ''}`}
          />
        </Box>
      )}

      {/* Notifications List */}
      {filteredAndSortedNotifications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <NotificationsIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {notificationsState.notifications.length === 0 ? "No notifications yet" : "No notifications match your filters"}
          </Typography>
          {notificationsState.notifications.length > 0 && (
            <Button onClick={clearAllFilters} sx={{ mt: 2 }}>
              Clear Filters
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={1}>
          {filteredAndSortedNotifications.map((notification) => {
            const categoryProps = getCategoryProps(notification.category)
            const isSelected = selectedNotifications.includes(notification.id)
            const targetPath = inferNotificationTargetPath(notification)
            
            return (
              <Card
                key={notification.id}
                sx={{
                  bgcolor: notification.read ? "background.paper" : "primary.50",
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? themeConfig.brandColors.navy : "divider",
                  cursor: "pointer",
                  "&:hover": { bgcolor: notification.read ? "grey.50" : "primary.100" }
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                    <Checkbox
                      checked={isSelected}
                      disabled={!canEdit && !canDelete}
                      onChange={(e) => {
                        e.stopPropagation()
                        if (isSelected) {
                          setSelectedNotifications(prev => prev.filter(id => id !== notification.id))
                        } else {
                          setSelectedNotifications(prev => [...prev, notification.id])
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {getNotificationIcon(notification.type)}
                      {categoryProps.icon}
                    </Box>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: notification.read ? "normal" : "bold" }}>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Chip size="small" label="New" color="primary" />
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {notification.message}
                      </Typography>
                      
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Chip
                          size="small"
                          label={notification.type}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={notification.priority}
                          color={getPriorityColor(notification.priority)}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={notification.category}
                          color={categoryProps.color}
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.timestamp).toLocaleString()}
                        </Typography>
                        {targetPath && (
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNotificationClick(notification)
                            }}
                          >
                            Open
                          </Button>
                        )}
                      </Box>
                    </Box>
                    
                    <IconButton
                      size="small"
                      disabled={!canDelete}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                      sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setSortBy("timestamp"); setSortMenuAnchor(null) }}>
          Sort by Date
        </MenuItem>
        <MenuItem onClick={() => { setSortBy("priority"); setSortMenuAnchor(null) }}>
          Sort by Priority
        </MenuItem>
        <MenuItem onClick={() => { setSortBy("type"); setSortMenuAnchor(null) }}>
          Sort by Type
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setSortOrder("desc"); setSortMenuAnchor(null) }}>
          Descending
        </MenuItem>
        <MenuItem onClick={() => { setSortOrder("asc"); setSortMenuAnchor(null) }}>
          Ascending
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmBulkDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ViewAllNotifications
