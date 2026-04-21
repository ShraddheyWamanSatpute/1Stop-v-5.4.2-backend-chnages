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
  Alert,
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
  FormControlLabel,
  Switch,
  Grid,

} from "@mui/material"
import {
  CloudUpload as UploadIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,

} from "@mui/icons-material"
import { useState, useCallback } from "react"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface ConversionJob {
  id: string
  fileName: string
  fileSize: string
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
  downloadUrl?: string
  error?: string
  settings: ConversionSettings
  file?: File
  pdfBlob?: Blob
}

interface ConversionSettings {
  pageOrientation: "portrait" | "landscape"
  pageSize: "A4" | "A3" | "Letter" | "Legal"
  includeGridlines: boolean
  fitToPage: boolean
  includeHeaders: boolean
}

const ExcelToPdfConverter = () => {
  const [jobs, setJobs] = useState<ConversionJob[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [defaultSettings, setDefaultSettings] = useState<ConversionSettings>({
    pageOrientation: "portrait",
    pageSize: "A4",
    includeGridlines: true,
    fitToPage: true,
    includeHeaders: true,
  })

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const newJob: ConversionJob = {
          id: Date.now().toString() + Math.random(),
          fileName: file.name,
          fileSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
          status: "uploading",
          progress: 0,
          settings: { ...defaultSettings },
          file: file, // Store the actual file
        }

        setJobs((prev) => [...prev, newJob])
        simulateConversion(newJob.id)
      }
    })
  }

  const processExcelToPdf = useCallback(async (file: File, jobId: string, settings: ConversionSettings) => {
    try {
      // Update status to processing
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: "processing", progress: 10 } : job
      ))

      // Read Excel file with XLSX library
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, progress: 30 } : job
      ))

      // Create PDF with jsPDF
      const pdf = new jsPDF({
        orientation: settings.pageOrientation === 'landscape' ? 'l' : 'p',
        unit: 'mm',
        format: settings.pageSize.toLowerCase() as any
      })

      const pageWidth = pdf.internal.pageSize.width
      const margin = 10
      let currentY = 20

      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, progress: 50 } : job
      ))

      // Process each worksheet
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        if (sheetIndex > 0) {
          pdf.addPage()
          currentY = 20
        }

        // Add sheet title
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text(sheetName, margin, currentY)
        currentY += 15

        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

        if (jsonData.length > 0) {
          // Filter out empty rows
          const tableData = jsonData.filter((row: any[]) => 
            Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
          )

          if (tableData.length > 0) {
            // Prepare headers and body
            const headers = settings.includeHeaders && tableData.length > 0 ? tableData[0] : undefined
            const body = settings.includeHeaders ? tableData.slice(1) : tableData

            // Configure table with autoTable
            const tableConfig: any = {
              startY: currentY,
              head: headers ? [headers] : undefined,
              body: body,
              margin: { left: margin, right: margin },
              styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak',
                halign: 'left',
                valign: 'top'
              },
              headStyles: {
                fillColor: [66, 139, 202],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9
              },
              alternateRowStyles: {
                fillColor: [245, 245, 245]
              },
              tableLineColor: settings.includeGridlines ? [200, 200, 200] : [255, 255, 255],
              tableLineWidth: settings.includeGridlines ? 0.1 : 0,
              theme: 'grid'
            }

            // Auto-fit columns if enabled
            if (settings.fitToPage && tableData.length > 0) {
              const maxCols = Math.max(...tableData.map((row: any[]) => row.length))
              const availableWidth = pageWidth - 2 * margin
              const colWidth = availableWidth / maxCols
              
              tableConfig.columnStyles = {}
              for (let i = 0; i < maxCols; i++) {
                tableConfig.columnStyles[i] = { cellWidth: colWidth }
              }
            }

            // Add table to PDF using autoTable
            ;(pdf as any).autoTable(tableConfig)
            
            // Update Y position for next content
            currentY = (pdf as any).lastAutoTable.finalY + 10
          }
        }
      })

      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, progress: 80 } : job
      ))

      // Generate PDF blob
      const pdfBlob = pdf.output('blob')
      const downloadUrl = URL.createObjectURL(pdfBlob)

      setJobs(prev => prev.map(job => 
        job.id === jobId ? { 
          ...job, 
          status: "completed", 
          progress: 100, 
          downloadUrl,
          pdfBlob
        } : job
      ))

    } catch (error) {
      console.error('Conversion error:', error)
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { 
          ...job, 
          status: "error", 
          error: error instanceof Error ? error.message : 'Conversion failed'
        } : job
      ))
    }
  }, [])

  const simulateConversion = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return

    // Simulate upload progress then start real processing
    const uploadInterval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.id === jobId && job.status === "uploading") {
            const newProgress = job.progress + 20
            if (newProgress >= 100) {
              clearInterval(uploadInterval)
              // Start real processing with the stored file
              if (job.file) {
                processExcelToPdf(job.file, jobId, job.settings)
              }
              return { ...job, progress: 100 }
            }
            return { ...job, progress: newProgress }
          }
          return job
        }),
      )
    }, 200)
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

  const handleDownload = (job: ConversionJob) => {
    if (job.downloadUrl) {
      const link = document.createElement("a")
      link.href = job.downloadUrl
      // Download as PDF
      link.download = job.fileName.replace(/\.[^/.]+$/, ".pdf")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckIcon color="success" />
      case "error":
        return <ErrorIcon color="error" />
      default:
        return <ExcelIcon color="primary" />
    }
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case "uploading":
        return <Chip label="Uploading" color="info" size="small" />
      case "processing":
        return <Chip label="Converting" color="warning" size="small" />
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
        Excel to PDF Converter
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Convert Excel spreadsheets to PDF documents with customizable formatting options
      </Typography>

      {/* Conversion Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <SettingsIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Default Conversion Settings</Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Page Orientation</InputLabel>
                <Select
                  value={defaultSettings.pageOrientation}
                  onChange={(e) =>
                    setDefaultSettings((prev) => ({
                      ...prev,
                      pageOrientation: e.target.value as "portrait" | "landscape",
                    }))
                  }
                  label="Page Orientation"
                >
                  <MenuItem value="portrait">Portrait</MenuItem>
                  <MenuItem value="landscape">Landscape</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Page Size</InputLabel>
                <Select
                  value={defaultSettings.pageSize}
                  onChange={(e) =>
                    setDefaultSettings((prev) => ({
                      ...prev,
                      pageSize: e.target.value as "A4" | "A3" | "Letter" | "Legal",
                    }))
                  }
                  label="Page Size"
                >
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="A3">A3</MenuItem>
                  <MenuItem value="Letter">Letter</MenuItem>
                  <MenuItem value="Legal">Legal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={defaultSettings.includeGridlines}
                    onChange={(e) =>
                      setDefaultSettings((prev) => ({
                        ...prev,
                        includeGridlines: e.target.checked,
                      }))
                    }
                  />
                }
                label="Gridlines"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={defaultSettings.fitToPage}
                    onChange={(e) =>
                      setDefaultSettings((prev) => ({
                        ...prev,
                        fitToPage: e.target.checked,
                      }))
                    }
                  />
                }
                label="Fit to Page"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={defaultSettings.includeHeaders}
                    onChange={(e) =>
                      setDefaultSettings((prev) => ({
                        ...prev,
                        includeHeaders: e.target.checked,
                      }))
                    }
                  />
                }
                label="Headers"
              />
            </Grid>
          </Grid>
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
              Supports .xlsx and .xls files up to 50MB
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

      {/* Conversion Jobs */}
      {jobs.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Conversion Jobs
            </Typography>
            <List>
              {jobs.map((job) => (
                <ListItem key={job.id}>
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
                          Size: {job.fileSize} • {job.settings.pageSize} {job.settings.pageOrientation}
                        </Typography>
                        {(job.status === "uploading" || job.status === "processing") && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={job.progress}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {job.status === "uploading" ? "Uploading" : "Converting"}: {job.progress}%
                            </Typography>
                          </Box>
                        )}
                        {job.error && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {job.error}
                          </Alert>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {job.status === "completed" && (
                      <Button 
                        startIcon={<DownloadIcon />} 
                        variant="contained" 
                        size="small" 
                        sx={{ mr: 1 }}
                        onClick={() => handleDownload(job)}
                      >
                        Download
                      </Button>
                    )}
                    <IconButton edge="end" onClick={() => removeJob(job.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default ExcelToPdfConverter
