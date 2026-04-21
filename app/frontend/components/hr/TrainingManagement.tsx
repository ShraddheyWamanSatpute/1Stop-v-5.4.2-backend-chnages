"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useEffect, useRef } from "react"
import type { ReactElement } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
} from "@mui/material"
import {
  Add as AddIcon,
  PlayCircle as PlayIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as CertificateIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import { Sort as SortIcon } from "@mui/icons-material"
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TrainingCRUDForm, { type TrainingCRUDFormHandle } from "./forms/TrainingCRUDForm"
import { usePermission } from "../../hooks/usePermission"

type TrainingManagementProps = {}

const TrainingManagement: React.FC<TrainingManagementProps> = (): ReactElement => {
  const { state: hrState, refreshTrainings, addTraining, updateTraining, deleteTraining } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "training")
  const canRemove = canDelete("hr", "training")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // New CRUD Modal state
  const [trainingCRUDModalOpen, setTrainingCRUDModalOpen] = useState(false)
  const [selectedTrainingForCRUD, setSelectedTrainingForCRUD] = useState<any>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const trainingCRUDFormRef = useRef<TrainingCRUDFormHandle | null>(null)

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; use explicit Refresh actions instead.

  // New CRUD Modal handlers
  const handleOpenTrainingCRUD = (training: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    const location = useLocation()
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedTrainingForCRUD(training)
    setCrudMode(mode)
    setTrainingCRUDModalOpen(true)
  }

  const handleCloseTrainingCRUD = () => {
    setTrainingCRUDModalOpen(false)
    setSelectedTrainingForCRUD(null)
    setCrudMode('create')
  }

  const handleSaveTrainingCRUD = async (trainingData: any) => {
    if (!canMutate) return
    try {
      setLoading(true)
      if (crudMode === 'create') {
        await addTraining(trainingData)
        setNotification({ message: 'Training created successfully', type: 'success' })
      } else if (crudMode === 'edit' && selectedTrainingForCRUD) {
        await updateTraining(selectedTrainingForCRUD.id, trainingData)
        setNotification({ message: 'Training updated successfully', type: 'success' })
      }
      handleCloseTrainingCRUD()
      refreshTrainings().catch(() => {})
    } catch (error) {
      console.error("Error saving training:", error)
      setNotification({ message: 'Failed to save training', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTraining = async (trainingId: string) => {
    if (!canRemove) return
    if (!window.confirm('Are you sure you want to delete this training? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await deleteTraining(trainingId)
      setNotification({ message: 'Training deleted successfully', type: 'success' })
      await refreshTrainings()
    } catch (error) {
      console.error("Error deleting training:", error)
      setNotification({ message: 'Failed to delete training', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Use training data from HR context, fallback to sample data if none available
  const trainings = hrState.trainings.length > 0 ? hrState.trainings.map(training => ({
    id: training.id,
    name: training.title || "Untitled Training",
    category: training.type || "General",
    assigned: 0, // This would need to be calculated from employee assignments
    completed: training.status === "completed" ? 1 : 0,
    deadline: training.endDate ? new Date(training.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    requiredFor: ["All Staff"], // This would need to be determined from role requirements
  })) : [
    {
      id: 1,
      name: "Food Safety Basics",
      category: "Compliance",
      assigned: 25,
      completed: 20,
      deadline: "2023-05-30",
      requiredFor: ["Kitchen Staff", "Servers", "Managers"],
    },
    {
      id: 2,
      name: "Customer Service Excellence",
      category: "Service",
      assigned: 15,
      completed: 12,
      deadline: "2023-06-15",
      requiredFor: ["Servers", "Hosts", "Managers"],
    },
    {
      id: 3,
      name: "Bartender Certification",
      category: "Skills",
      assigned: 8,
      completed: 5,
      deadline: "2023-05-20",
      requiredFor: ["Bartenders", "Bar Managers"],
    },
    {
      id: 4,
      name: "Leadership Fundamentals",
      category: "Management",
      assigned: 5,
      completed: 3,
      deadline: "2023-06-30",
      requiredFor: ["Managers", "Shift Leaders"],
    },
  ]

  // Sample training modules for the courses section
  const courseModules = [
    {
      id: 1,
      title: "Food Safety Basics",
      description: "Essential food handling and safety practices for restaurant staff.",
      duration: "2 hours",
      modules: 5,
      image: "/training/food-safety.jpg",
      progress: 80,
    },
    {
      id: 2,
      title: "Customer Service Excellence",
      description: "Learn how to provide outstanding customer service in a restaurant setting.",
      duration: "1.5 hours",
      modules: 4,
      image: "/training/customer-service.jpg",
      progress: 40,
    },
    {
      id: 3,
      title: "Bartender Skills",
      description: "Master the art of mixology and efficient bar service.",
      duration: "3 hours",
      modules: 8,
      image: "/training/bartending.jpg",
      progress: 0,
    },
  ]

  // State variables (example - more will be needed)
  const [trainingPrograms] = React.useState(trainings)

  // Sorting state
  const [sortBy, setSortBy] = React.useState<
    "name" | "category" | "assigned" | "progress" | "deadline"
  >("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const sortedTrainings = React.useMemo(() => {
    const arr = [...trainingPrograms]
    arr.sort((a: any, b: any) => {
      let aVal: string | number = ""
      let bVal: string | number = ""
      switch (sortBy) {
        case "name":
          aVal = a.name || ""
          bVal = b.name || ""
          break
        case "category":
          aVal = a.category || ""
          bVal = b.category || ""
          break
        case "assigned":
          aVal = a.assigned || 0
          bVal = b.assigned || 0
          break
        case "progress": {
          const aProg = a.assigned > 0 ? (a.completed / a.assigned) * 100 : 0
          const bProg = b.assigned > 0 ? (b.completed / b.assigned) * 100 : 0
          aVal = aProg
          bVal = bProg
          break
        }
        case "deadline":
          aVal = new Date(a.deadline).getTime()
          bVal = new Date(b.deadline).getTime()
          break
        default:
          aVal = 0
          bVal = 0
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const diff = (aVal as number) - (bVal as number)
      return sortOrder === "asc" ? diff : -diff
    })
    return arr
  }, [trainingPrograms, sortBy, sortOrder])

  const handleHeaderSort = (key: typeof sortBy) => {
    setSortBy((prev) => (prev === key ? prev : key))
    setSortOrder((prev) => (sortBy === key ? (prev === "asc" ? "desc" : "asc") : "asc"))
  }
  const [courses] = React.useState(courseModules)

  // Handlers (example - more will be needed)

  const handleAssignTraining = (trainingId: number) => {
    // Logic to open a modal/form for assigning training to employees
    alert(`Assign Training ${trainingId}`)
  }

  const handleStartCourse = (courseId: number) => {
    // Logic to start or continue a course
    alert(`Start/Continue Course ${courseId}`)
  }


  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          Training Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenTrainingCRUD(null, 'create')} disabled={!canMutate}>
          New Training
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Training Assignments
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell onClick={() => handleHeaderSort("name")} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Training
                        <SortIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: sortBy === 'name' && sortOrder === 'desc' ? 'rotate(180deg)' : 'none', opacity: sortBy === 'name' ? 1 : 0.3 }} />
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleHeaderSort("category")} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Category
                        <SortIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: sortBy === 'category' && sortOrder === 'desc' ? 'rotate(180deg)' : 'none', opacity: sortBy === 'category' ? 1 : 0.3 }} />
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleHeaderSort("assigned")} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Assigned
                        <SortIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: sortBy === 'assigned' && sortOrder === 'desc' ? 'rotate(180deg)' : 'none', opacity: sortBy === 'assigned' ? 1 : 0.3 }} />
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleHeaderSort("progress")} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Progress
                        <SortIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: sortBy === 'progress' && sortOrder === 'desc' ? 'rotate(180deg)' : 'none', opacity: sortBy === 'progress' ? 1 : 0.3 }} />
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleHeaderSort("deadline")} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Deadline
                        <SortIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: sortBy === 'deadline' && sortOrder === 'desc' ? 'rotate(180deg)' : 'none', opacity: sortBy === 'deadline' ? 1 : 0.3 }} />
                      </Box>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTrainings.map((training) => (
                    <TableRow key={training.id} hover>
                      <TableCell>{training.name}</TableCell>
                      <TableCell>
                        <Chip label={training.category} size="small" />
                      </TableCell>
                      <TableCell>{training.assigned}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box sx={{ width: "100%", mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={training.assigned > 0 ? (training.completed / training.assigned) * 100 : 0}
                              sx={{ height: 8, borderRadius: 5 }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {training.completed}/{training.assigned}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{training.deadline}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GroupIcon />}
                            onClick={() => handleAssignTraining(Number(training.id))}
                            disabled={!canMutate}
                          >
                            Assign
                          </Button>
                          <Tooltip title="Edit Training">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const trainingData = hrState.trainings.find(t => t.id === training.id)
                                if (trainingData) {
                                  handleOpenTrainingCRUD(trainingData, 'edit')
                                }
                              }}
                              disabled={!canMutate}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Training">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteTraining(training.id)}
                              disabled={!canRemove}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Training Stats
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ textAlign: "center", flex: "1 0 45%" }}>
                <Typography variant="h4" color="primary">
                  85%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compliance Rate
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center", flex: "1 0 45%" }}>
                <Typography variant="h4" color="secondary">
                  12
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Programs
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center", flex: "1 0 45%" }}>
                <Typography variant="h4" sx={{ color: "success.main" }}>
                  53
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Certifications
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center", flex: "1 0 45%" }}>
                <Typography variant="h4" sx={{ color: "warning.main" }}>
                  8
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiring Soon
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Button fullWidth variant="outlined" startIcon={<CertificateIcon />} sx={{ mb: 3 }}>
            Training Certifications
          </Button>

          <Button fullWidth variant="outlined" startIcon={<AssignmentIcon />}>
            Training Reports
          </Button>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Available Courses
          </Typography>
          <Grid container spacing={3}>
            {courses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <Card>
                  <Box
                    sx={{
                      height: 140,
                      bgcolor: "grey.300",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="h6" color="textSecondary">
                      {course.title}
                    </Typography>
                  </Box>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {course.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {course.description}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="caption">Duration: {course.duration}</Typography>
                      <Typography variant="caption">{course.modules} modules</Typography>
                    </Box>
                    {course.progress > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={course.progress}
                          sx={{ height: 6, borderRadius: 5 }}
                        />
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="caption">{course.progress}% complete</Typography>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button size="small" startIcon={<PlayIcon />} onClick={() => handleStartCourse(course.id)}>
                      {course.progress > 0 ? "Continue" : "Start"}
                    </Button>
                    <Button size="small" onClick={() => handleOpenTrainingCRUD(course, 'view')}>
                      Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      {/* New CRUD Modal */}
            <CRUDModal
        open={trainingCRUDModalOpen}
        onClose={(reason) => {
          setTrainingCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseTrainingCRUD
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "trainingManagementModal1",
          crudMode,
          id: selectedTrainingForCRUD?.id,
          itemLabel: selectedTrainingForCRUD?.name,
        }}
      >
        <TrainingCRUDForm
          ref={trainingCRUDFormRef}
          trainingProgram={selectedTrainingForCRUD}
          mode={crudMode}
          onSave={handleSaveTrainingCRUD}
        />
      </CRUDModal>

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        {notification && (
          <Alert
            onClose={() => setNotification(null)}
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  )
}

export default TrainingManagement
