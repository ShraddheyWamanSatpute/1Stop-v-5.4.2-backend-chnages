"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"

import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material"
import {
  CloudUpload as UploadIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Transform as TransformIcon,
} from "@mui/icons-material"
import { useState } from "react"

interface ReformatJob {
  id: string
  fileName: string
  fileSize: string
  status: "uploading" | "analyzing" | "configuring" | "processing" | "completed" | "error"
  progress: number
  downloadUrl?: string
  error?: string
  config: ReformatConfig
  preview?: any[]
}

interface ReformatConfig {
  groupingColumn: string
  dataColumns: string[]
  outputFormat: "single-row" | "normalized"
  headerRow: number
  skipEmptyRows: boolean
}

const ExcelReformat = () => {
  const [jobs, setJobs] = useState<ReformatJob[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [activeStep] = useState(0)

  const steps = ["Upload File", "Analyze Structure", "Configure Reformatting", "Process Data", "Download Result"]

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const newJob: ReformatJob = {
          id: Date.now().toString() + Math.random(),
          fileName: file.name,
          fileSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
          status: "uploading",
          progress: 0,
          config: {
            groupingColumn: "",
            dataColumns: [],
            outputFormat: "single-row",
            headerRow: 1,
            skipEmptyRows: true,
          },
        }

        setJobs((prev) => [...prev, newJob])
        simulateAnalysis(newJob.id)
      }
    })
  }

  const simulateAnalysis = (jobId: string) => {
    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.id === jobId && job.status === "uploading") {
            const newProgress = job.progress + 15
            if (newProgress >= 100) {
              clearInterval(uploadInterval)
              setTimeout(() => startAnalyzing(jobId), 500)
              return { ...job, progress: 100, status: "analyzing" }
            }
            return { ...job, progress: newProgress }
          }
          return job
        }),
      )
    }, 150)
  }

  const startAnalyzing = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: "analyzing",
              progress: 0,
              preview: [
                { Group: "Product A", Q1: "100", Q2: "150", Q3: "200" },
                { Group: "Product A", Metric: "Sales", Value: "450" },
                { Group: "Product B", Q1: "80", Q2: "120", Q3: "160" },
                { Group: "Product B", Metric: "Sales", Value: "360" },
              ],
            }
          : job,
      ),
    )

    // Simulate analysis
    const analysisInterval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.id === jobId && job.status === "analyzing") {
            const newProgress = job.progress + 20
            if (newProgress >= 100) {
              clearInterval(analysisInterval)
              return {
                ...job,
                progress: 100,
                status: "configuring",
              }
            }
            return { ...job, progress: newProgress }
          }
          return job
        }),
      )
    }, 200)
  }

  const startProcessing = (jobId: string) => {
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: "processing", progress: 0 } : job)))

    // Simulate processing
    const processInterval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.id === jobId && job.status === "processing") {
            const newProgress = job.progress + 10
            if (newProgress >= 100) {
              clearInterval(processInterval)
              return {
                ...job,
                progress: 100,
                status: "completed",
                downloadUrl: "/api/download/" + jobId + "_reformatted.xlsx",
              }
            }
            return { ...job, progress: newProgress }
          }
          return job
        }),
      )
    }, 300)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const removeJob = (jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckIcon color="success" />
      case "error":
        return <ErrorIcon color="error" />
      case "configuring":
        return <TransformIcon color="warning" />
      default:
        return <ExcelIcon color="primary" />
    }
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case "uploading":
        return <Chip label="Uploading" color="info" size="small" />
      case "analyzing":
        return <Chip label="Analyzing" color="info" size="small" />
      case "configuring":
        return <Chip label="Configure" color="warning" size="small" />
      case "processing":
        return <Chip label="Processing" color="warning" size="small" />
      case "completed":
        return <Chip label="Ready" color="success" size="small" />
      case "error":
        return <Chip label="Error" color="error" size="small" />
      default:
        return null
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Excel Reformat Tool
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Restructure grouped Excel data into single-line records for better analysis
      </Typography>

      {/* Process Steps */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reformatting Process
          </Typography>
          <Stepper activeStep={activeStep} orientation="horizontal">
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              border: "2px dashed",
              borderColor: dragOver ? themeConfig.brandColors.navy : "grey.300",
              bgcolor: dragOver ? "primary.50" : "transparent",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <UploadIcon sx={{ fontSize: 64, color: themeConfig.brandColors.navy, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drop Excel files here or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports .xlsx and .xls files with grouped data structure
            </Typography>
            <input
              id="file-input"
              type="file"
              multiple
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </Paper>
        </CardContent>
      </Card>

      {/* Reformat Jobs */}
      {jobs.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Reformat Jobs
            </Typography>
            <List>
              {jobs.map((job) => (
                <Box key={job.id}>
                  <ListItem>
                    <ListItemIcon>{getStatusIcon(job.status)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle1">{job.fileName}</Typography>
                          {getStatusChip(job.status)}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Size: {job.fileSize}
                          </Typography>
                          {(job.status === "uploading" ||
                            job.status === "analyzing" ||
                            job.status === "processing") && (
                            <Box sx={{ mt: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={job.progress}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {job.status}: {job.progress}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      {job.status === "completed" && (
                        <Button startIcon={<DownloadIcon />} variant="contained" size="small" sx={{ mr: 1 }}>
                          Download
                        </Button>
                      )}
                      {job.status === "configuring" && (
                        <Button
                          startIcon={<TransformIcon />}
                          variant="contained"
                          size="small"
                          sx={{ mr: 1 }}
                          onClick={() => startProcessing(job.id)}
                        >
                          Process
                        </Button>
                      )}
                      <IconButton edge="end" onClick={() => removeJob(job.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {/* Configuration Panel */}
                  {job.status === "configuring" && (
                    <Box sx={{ ml: 7, mr: 2, mb: 2 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            Configure Reformatting
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Grouping Column</InputLabel>
                                <Select value={job.config.groupingColumn} label="Grouping Column">
                                  <MenuItem value="Group">Group</MenuItem>
                                  <MenuItem value="Category">Category</MenuItem>
                                  <MenuItem value="Product">Product</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Output Format</InputLabel>
                                <Select value={job.config.outputFormat} label="Output Format">
                                  <MenuItem value="single-row">Single Row per Group</MenuItem>
                                  <MenuItem value="normalized">Normalized Table</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Header Row"
                                type="number"
                                value={job.config.headerRow}
                              />
                            </Grid>
                          </Grid>

                          {job.preview && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Data Preview
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: "grey.50", maxHeight: 200, overflow: "auto" }}>
                                <pre style={{ fontSize: "0.75rem", margin: 0 }}>
                                  {JSON.stringify(job.preview.slice(0, 4), null, 2)}
                                </pre>
                              </Paper>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  )}
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reformatting Features
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Convert grouped data to single-row format" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Intelligent column detection and mapping" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Handle multiple grouping levels" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Preserve data types and formatting" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Skip empty rows and clean data" />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ExcelReformat
