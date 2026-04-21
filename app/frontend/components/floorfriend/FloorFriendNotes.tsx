"use client"

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
  IconButton,

  Divider,
  Avatar,

} from "@mui/material"
import {
  StickyNote2 as NotesIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PriorityHigh as Priority,
  Search as SearchIcon,
} from "@mui/icons-material"
import { format } from "date-fns"

interface FloorFriendNotesProps {
  // This will be enhanced when we integrate with actual notes data
}

// Mock notes data structure (will be replaced with real data)
const mockNotesData = [
  {
    id: "1",
    title: "Staff Meeting Notes",
    content: "Discussed new menu items and service improvements. Need to train staff on allergen information.",
    author: "Manager",
    authorId: "mgr1",
    priority: "high",
    category: "staff",
    createdAt: new Date(2024, 0, 15, 9, 30),
    updatedAt: new Date(2024, 0, 15, 9, 30),
    tags: ["training", "menu", "allergens"]
  },
  {
    id: "2",
    title: "Kitchen Equipment Issue",
    content: "Oven temperature inconsistent. Technician scheduled for tomorrow morning.",
    author: "Head Chef",
    authorId: "chef1",
    priority: "urgent",
    category: "maintenance",
    createdAt: new Date(2024, 0, 14, 14, 15),
    updatedAt: new Date(2024, 0, 14, 16, 20),
    tags: ["equipment", "repair"]
  },
  {
    id: "3",
    title: "Customer Feedback",
    content: "Regular customer mentioned they loved the new dessert menu. Consider promoting it more.",
    author: "Server",
    authorId: "srv1",
    priority: "medium",
    category: "feedback",
    createdAt: new Date(2024, 0, 13, 18, 45),
    updatedAt: new Date(2024, 0, 13, 18, 45),
    tags: ["customer", "dessert", "promotion"]
  },
  {
    id: "4",
    title: "Inventory Alert",
    content: "Running low on salmon. Need to order more for weekend rush.",
    author: "Kitchen Manager",
    authorId: "kmgr1",
    priority: "high",
    category: "inventory",
    createdAt: new Date(2024, 0, 12, 11, 0),
    updatedAt: new Date(2024, 0, 12, 11, 0),
    tags: ["inventory", "salmon", "ordering"]
  }
]

// Get priority color
const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return "error"
    case "high":
      return "warning"
    case "medium":
      return "info"
    case "low":
      return "success"
    default:
      return "default"
  }
}

// Get category color
const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case "staff":
      return "primary"
    case "maintenance":
      return "error"
    case "feedback":
      return "success"
    case "inventory":
      return "warning"
    case "general":
      return "info"
    default:
      return "default"
  }
}

const FloorFriendNotes: React.FC<FloorFriendNotesProps> = () => {
  const [globalSearch, setGlobalSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [editNoteOpen, setEditNoteOpen] = useState(false)

  const normalizedSearch = globalSearch.toLowerCase()

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let filtered = mockNotesData.filter((note) => {
      // Global search filter
      if (normalizedSearch) {
        const searchableFields = [
          note.title,
          note.content,
          note.author,
          note.category,
          ...note.tags
        ]
        
        const matchesSearch = searchableFields.some(field => 
          String(field || "").toLowerCase().includes(normalizedSearch)
        )
        if (!matchesSearch) return false
      }

      // Priority filter
      if (priorityFilter !== "all" && note.priority !== priorityFilter) {
        return false
      }

      // Category filter
      if (categoryFilter !== "all" && note.category !== categoryFilter) {
        return false
      }

      return true
    })

    // Sort notes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.updatedAt.getTime() - a.updatedAt.getTime()
        case "oldest":
          return a.updatedAt.getTime() - b.updatedAt.getTime()
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
        case "title":
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

    return filtered
  }, [mockNotesData, normalizedSearch, priorityFilter, categoryFilter, sortBy])

  // Get unique priorities and categories for filters
  const uniquePriorities = useMemo(() => {
    return Array.from(new Set(mockNotesData.map(note => note.priority)))
  }, [])

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(mockNotesData.map(note => note.category)))
  }, [])

  const handleAddNote = () => {
    setAddNoteOpen(true)
  }

  const handleEditNote = (note: any) => {
    setSelectedNote(note)
    setEditNoteOpen(true)
  }

  const handleCloseAdd = () => {
    setAddNoteOpen(false)
  }

  const handleCloseEdit = () => {
    setEditNoteOpen(false)
    setSelectedNote(null)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <NotesIcon />
        Manager Notes
      </Typography>

      {/* Summary and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h6" color="primary">
                  {filteredNotes.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Notes
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" color="error.main">
                  {filteredNotes.filter(n => n.priority === "urgent").length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Urgent
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNote}
              >
                Add Note
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search notes"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: "action.active" }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {uniquePriorities.map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {uniqueCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="title">Title A-Z</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Notes List */}
      <Grid container spacing={2}>
        {filteredNotes.map((note) => (
          <Grid item xs={12} key={note.id}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  {/* Note Header */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {note.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip
                          label={note.priority}
                          size="small"
                          color={getPriorityColor(note.priority) as any}
                          icon={<Priority />}
                        />
                        <Chip
                          label={note.category}
                          size="small"
                          variant="outlined"
                          color={getCategoryColor(note.category) as any}
                        />
                        {note.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" color="primary" onClick={() => handleEditNote(note)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Box>

                  {/* Note Content */}
                  <Typography variant="body1">
                    {note.content}
                  </Typography>

                  <Divider />

                  {/* Note Footer */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>
                        {note.author.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        {note.author}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {format(note.updatedAt, "MMM dd, yyyy 'at' HH:mm")}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredNotes.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <NotesIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No notes found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {globalSearch || priorityFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Create your first note to get started"}
          </Typography>
        </Paper>
      )}

      {/* Add Note Dialog */}
      <Dialog open={addNoteOpen} onClose={handleCloseAdd} maxWidth="md" fullWidth>
        <DialogTitle>Add New Note</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              variant="outlined"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select label="Priority" defaultValue="medium">
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select label="Category" defaultValue="general">
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="feedback">Feedback</MenuItem>
                    <MenuItem value="inventory">Inventory</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Content"
              multiline
              rows={6}
              variant="outlined"
            />

            <TextField
              fullWidth
              label="Tags (comma separated)"
              variant="outlined"
              placeholder="e.g. urgent, kitchen, repair"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>Cancel</Button>
          <Button variant="contained">Save Note</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={editNoteOpen} onClose={handleCloseEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Note</DialogTitle>
        <DialogContent>
          {selectedNote && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Title"
                variant="outlined"
                defaultValue={selectedNote.title}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select label="Priority" defaultValue={selectedNote.priority}>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select label="Category" defaultValue={selectedNote.category}>
                      <MenuItem value="general">General</MenuItem>
                      <MenuItem value="staff">Staff</MenuItem>
                      <MenuItem value="maintenance">Maintenance</MenuItem>
                      <MenuItem value="feedback">Feedback</MenuItem>
                      <MenuItem value="inventory">Inventory</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Content"
                multiline
                rows={6}
                variant="outlined"
                defaultValue={selectedNote.content}
              />

              <TextField
                fullWidth
                label="Tags (comma separated)"
                variant="outlined"
                defaultValue={selectedNote.tags.join(", ")}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button variant="contained">Update Note</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FloorFriendNotes
