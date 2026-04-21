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
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,

} from "@mui/icons-material"
import { useState, useCallback } from "react"
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

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
  excelBlob?: Blob
}

interface ConversionSettings {
  outputFormat: 'csv' | 'xlsx'
  extractTables: boolean
  preserveFormatting: boolean
  includeImages: boolean
  detectTables: boolean
  enableOCR: boolean
}

const PdfToExcelConverter = () => {
  const [jobs, setJobs] = useState<ConversionJob[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [settings, setSettings] = useState<ConversionSettings>({
    outputFormat: 'xlsx',
    extractTables: true,
    preserveFormatting: true,
    includeImages: false,
    detectTables: true,
    enableOCR: false
  })

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type === "application/pdf") {
        const newJob: ConversionJob = {
          id: Date.now().toString() + Math.random(),
          fileName: file.name,
          fileSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
          status: "uploading",
          progress: 0,
          settings: { ...settings },
          file: file,
        }

        setJobs((prev) => [...prev, newJob])

        // Simulate upload and conversion process
        simulateConversion(newJob.id)
      }
    })
  }

  const processPdfToExcel = useCallback(async (file: File, jobId: string, settings: ConversionSettings) => {
    try {
      // Update status to processing
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: "processing", progress: 10 } : job
      ))

      // Read PDF file
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, progress: 20 } : job
      ))

      const extractedData: any[][] = [
        ['PDF to Excel Conversion Report'],
        ['File Name', file.name],
        ['File Size', `${(file.size / 1024 / 1024).toFixed(2)} MB`],
        ['Total Pages', pdf.numPages.toString()],
        ['Converted On', new Date().toLocaleString()],
        ['Output Format', settings.outputFormat],
        ['Include Images', settings.includeImages ? 'Yes' : 'No'],
        ['Detect Tables', settings.detectTables ? 'Yes' : 'No'],
        ['Enable OCR', settings.enableOCR ? 'Yes' : 'No'],
        [],
        ['Extracted Content']
      ]

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        
        setJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, progress: 20 + (pageNum / pdf.numPages) * 50 } : job
        ))

        // Extract text content
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .filter((item: any) => item.str && item.str.trim())
          .map((item: any) => item.str)
          .join(' ')

        if (pageText.trim()) {
          extractedData.push([`Page ${pageNum}`, 'Text', pageText.trim()])
        }

        // Table detection using text positioning
        if (settings.detectTables) {
          const tables = await detectTablesFromText(textContent)
          tables.forEach((table: string[][], tableIndex: number) => {
            extractedData.push([`Page ${pageNum}`, `Table ${tableIndex + 1}`, ''])
            table.forEach((row: string[]) => {
              extractedData.push(['', '', row.join(' | ')])
            })
          })
        }

        // OCR processing for images and complex layouts
        if (settings.enableOCR) {
          try {
            const viewport = page.getViewport({ scale: 2.0 })
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')!
            canvas.height = viewport.height
            canvas.width = viewport.width

            const renderContext = {
              canvasContext: context,
              viewport: viewport
            }

            await page.render(renderContext).promise
            
            // Convert canvas to image for OCR
            const imageData = canvas.toDataURL('image/png')
            
            setJobs(prev => prev.map(job => 
              job.id === jobId ? { ...job, progress: 70 + (pageNum / pdf.numPages) * 15 } : job
            ))

            // Perform OCR
            const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
              logger: () => {} // Suppress OCR logs
            })

            if (text.trim() && text.trim() !== pageText.trim()) {
              extractedData.push([`Page ${pageNum}`, 'OCR Text', text.trim()])
            }
          } catch (ocrError) {
            console.warn(`OCR failed for page ${pageNum}:`, ocrError)
            extractedData.push([`Page ${pageNum}`, 'OCR Error', 'OCR processing failed for this page'])
          }
        }
      }

      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, progress: 90 } : job
      ))

      let blob: Blob
      let fileExtension: string

      if (settings.outputFormat === 'xlsx') {
        // Create Excel workbook with multiple sheets if needed
        const wb = XLSX.utils.book_new()
        
        // Main data sheet
        const ws = XLSX.utils.aoa_to_sheet(extractedData)
        XLSX.utils.book_append_sheet(wb, ws, 'PDF Content')
        
        // Create separate sheets for tables if detected
        if (settings.detectTables) {
          const tableData = extractedData.filter(row => 
            row[1] && (row[1].toString().startsWith('Table') || row[1] === '')
          )
          
          if (tableData.length > 0) {
            const tableWs = XLSX.utils.aoa_to_sheet(tableData)
            XLSX.utils.book_append_sheet(wb, tableWs, 'Extracted Tables')
          }
        }
        
        // Generate Excel blob
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        fileExtension = '.xlsx'
      } else {
        // Create CSV blob
        const csvString = extractedData.map(row => 
          row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`)
            .join(',')
        ).join('\n')
        blob = new Blob([csvString], { type: 'text/csv' })
        fileExtension = '.csv'
      }

      const downloadUrl = URL.createObjectURL(blob)

      setJobs(prev => prev.map(job => 
        job.id === jobId ? { 
          ...job, 
          status: "completed", 
          progress: 100, 
          downloadUrl,
          excelBlob: blob,
          fileExtension
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

  // Advanced table detection function
  const detectTablesFromText = async (textContent: any): Promise<string[][][]> => {
    const items = textContent.items
    const tables: string[][][] = []
    
    // Group text items by Y position (rows)
    const rowGroups: { [key: number]: any[] } = {}
    
    items.forEach((item: any) => {
      if (item.str && item.str.trim()) {
        const y = Math.round(item.transform[5]) // Y position
        if (!rowGroups[y]) rowGroups[y] = []
        rowGroups[y].push(item)
      }
    })

    // Sort rows by Y position (top to bottom)
    const sortedYPositions = Object.keys(rowGroups)
      .map(y => parseInt(y))
      .sort((a, b) => b - a) // PDF coordinates are bottom-up

    // Detect table-like structures
    let currentTable: string[][] = []
    let lastRowItemCount = 0
    
    for (const y of sortedYPositions) {
      const rowItems = rowGroups[y].sort((a: any, b: any) => a.transform[4] - b.transform[4]) // Sort by X position
      
      // Check if this looks like a table row (multiple items with consistent spacing)
      if (rowItems.length >= 2) {
        const row = rowItems.map((item: any) => item.str.trim())
        
        // If this is consistent with previous rows, add to current table
        if (Math.abs(rowItems.length - lastRowItemCount) <= 1 || lastRowItemCount === 0) {
          currentTable.push(row)
          lastRowItemCount = rowItems.length
        } else {
          // End current table and start new one
          if (currentTable.length >= 2) {
            tables.push([...currentTable])
          }
          currentTable = [row]
          lastRowItemCount = rowItems.length
        }
      } else {
        // End current table if we hit a non-table row
        if (currentTable.length >= 2) {
          tables.push(currentTable)
        }
        currentTable = []
        lastRowItemCount = 0
      }
    }
    
    // Add final table if exists
    if (currentTable.length >= 2) {
      tables.push(currentTable)
    }
    
    return tables
  }

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
                processPdfToExcel(job.file, jobId, job.settings)
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
      const extension = job.settings.outputFormat === 'csv' ? '.csv' : '.xlsx'
      link.download = job.fileName.replace(/\.[^/.]+$/, extension)
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
        return <PdfIcon color="primary" />
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
        PDF to Excel Converter
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Convert PDF documents to Excel spreadsheets with intelligent data extraction
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
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={settings.outputFormat}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      outputFormat: e.target.value as 'csv' | 'xlsx',
                    }))
                  }
                  label="Output Format"
                >
                  <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                  <MenuItem value="csv">CSV (.csv)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.extractTables}
                    onChange={(e) => setSettings(prev => ({ ...prev, extractTables: e.target.checked }))} 
                  />
                }
                label="Extract Tables"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.detectTables}
                    onChange={(e) => setSettings(prev => ({ ...prev, detectTables: e.target.checked }))}
                  />
                }
                label="Detect Tables"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableOCR}
                    onChange={(e) => setSettings(prev => ({ ...prev, enableOCR: e.target.checked }))}
                  />
                }
                label="Enable OCR"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.preserveFormatting}
                    onChange={(e) => setSettings(prev => ({ ...prev, preserveFormatting: e.target.checked }))}
                  />
                }
                label="Preserve Formatting"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.includeImages}
                    onChange={(e) => setSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
                  />
                }
                label="Include Images"
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
              Drop PDF files here or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports PDF files up to 50MB
            </Typography>
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf"
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
                          Size: {job.fileSize}
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

      {/* Features */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Intelligent table detection and extraction" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Preserves data formatting and structure" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Handles multi-page documents" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Batch processing support" />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  )
}

export default PdfToExcelConverter
