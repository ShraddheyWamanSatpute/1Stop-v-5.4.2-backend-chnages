"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useCallback } from "react"
import Papa from "papaparse"
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,

  CircularProgress,
  Alert,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material"
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
} from "@mui/icons-material"

export interface ExcelUploadConfig {
  title: string
  description?: string
  acceptedFormats: string[]
  maxFileSize?: number // in MB
  requiredColumns?: string[]
  sampleData?: string[][]
  onUpload: (data: ParsedData, fileName: string) => Promise<void>
  onPreview?: (data: ParsedData) => void
}

export interface ParsedData {
  headers: string[]
  rows: string[][]
  metadata: {
    fileName: string
    fileSize: number
    rowCount: number
    columnCount: number
    uploadDate: Date
  }
}

interface UploadedFile {
  file: File
  data: ParsedData | null
  error: string | null
  status: 'pending' | 'parsing' | 'parsed' | 'error'
}



const ExcelUpload: React.FC<ExcelUploadConfig> = ({
  title,
  description,
  acceptedFormats = ['.csv', '.xlsx', '.xls'],
  maxFileSize = 10, // 10MB default
  requiredColumns = [],
  sampleData = [],
  onUpload,
  onPreview,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedFileData, setSelectedFileData] = useState<ParsedData | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`
    }

    // Check file format
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!acceptedFormats.includes(fileExtension)) {
      return `Unsupported file format. Accepted formats: ${acceptedFormats.join(', ')}`
    }

    return null
  }

  // Parse CSV file
  const parseFile = useCallback((file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const csvData = e.target?.result
        if (typeof csvData !== "string") {
          reject(new Error("Failed to read the file"))
          return
        }

        Papa.parse<string[]>(csvData, {
          complete: (results) => {
            try {
              const rows = results.data as string[][]
              const headers = rows[0] || []
              const dataRows = rows.slice(1).filter(row => row.some(cell => cell?.trim()))

              // Validate required columns
              if (requiredColumns.length > 0) {
                const missingColumns = requiredColumns.filter(col => 
                  !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
                )
                if (missingColumns.length > 0) {
                  reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`))
                  return
                }
              }

              const parsedData: ParsedData = {
                headers: headers.map(h => h?.trim() || ''),
                rows: dataRows.map(row => row.map(cell => cell?.trim() || '')),
                metadata: {
                  fileName: file.name,
                  fileSize: file.size,
                  rowCount: dataRows.length,
                  columnCount: headers.length,
                  uploadDate: new Date(),
                }
              }

              resolve(parsedData)
            } catch (error) {
              reject(new Error(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`))
            }
          },
          error: (error: any) => {
            reject(new Error(`CSV parsing error: ${error.message}`))
          },
          skipEmptyLines: true,
          header: false,
        })
      }

      reader.onerror = () => {
        reject(new Error("Error reading file"))
      }

      reader.readAsText(file)
    })
  }, [requiredColumns])

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles: UploadedFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file)

      if (validationError) {
        newFiles.push({
          file,
          data: null,
          error: validationError,
          status: 'error'
        })
        continue
      }

      const uploadedFile: UploadedFile = {
        file,
        data: null,
        error: null,
        status: 'parsing'
      }

      newFiles.push(uploadedFile)

      // Parse file asynchronously
      try {
        const parsedData = await parseFile(file)
        uploadedFile.data = parsedData
        uploadedFile.status = 'parsed'
      } catch (error) {
        uploadedFile.error = error instanceof Error ? error.message : 'Unknown parsing error'
        uploadedFile.status = 'error'
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles])
  }, [parseFile])

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // Remove file
  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Preview file data
  const previewFile = useCallback((data: ParsedData) => {
    setSelectedFileData(data)
    setPreviewOpen(true)
    if (onPreview) {
      onPreview(data)
    }
  }, [onPreview])

  // Upload files
  const handleUpload = useCallback(async () => {
    const validFiles = uploadedFiles.filter(f => f.status === 'parsed' && f.data)
    if (validFiles.length === 0) return

    setUploading(true)
    try {
      for (const file of validFiles) {
        if (file.data) {
          await onUpload(file.data, file.file.name)
        }
      }
      setUploadedFiles([]) // Clear files after successful upload
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }, [uploadedFiles, onUpload])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validFilesCount = uploadedFiles.filter(f => f.status === 'parsed').length
  const hasErrors = uploadedFiles.some(f => f.status === 'error')

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      {/* Upload Area */}
      <Paper
        sx={{
          p: 4,
          border: "2px dashed",
          borderColor: dragActive ? themeConfig.brandColors.navy : "grey.300",
          backgroundColor: dragActive ? "primary.50" : "background.paper",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": { 
            borderColor: themeConfig.brandColors.navy,
            backgroundColor: "primary.50"
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />
        
        <CloudUploadIcon sx={{ fontSize: 48, color: themeConfig.brandColors.navy, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Click to select files or drag and drop
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supported formats: {acceptedFormats.join(', ')} (Max {maxFileSize}MB)
        </Typography>
        
        {requiredColumns.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Required columns: {requiredColumns.join(', ')}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Sample Data */}
      {sampleData.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Expected format:
            </Typography>
            <Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
              {sampleData.map((row) => row.join(', ')).join('\n')}
            </Box>
          </Alert>
        </Box>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Uploaded Files ({uploadedFiles.length})
          </Typography>
          
          <List>
            {uploadedFiles.map((uploadedFile, index) => (
              <ListItem key={index} divider>
                <ListItemIcon>
                  {uploadedFile.status === 'parsing' && <CircularProgress size={20} />}
                  {uploadedFile.status === 'parsed' && <SuccessIcon color="success" />}
                  {uploadedFile.status === 'error' && <ErrorIcon color="error" />}
                  {uploadedFile.status === 'pending' && <FileIcon />}
                </ListItemIcon>
                
                <ListItemText
                  primary={uploadedFile.file.name}
                  secondary={
                    <Stack spacing={0.5}>
                      <Typography variant="caption">
                        {formatFileSize(uploadedFile.file.size)}
                      </Typography>
                      {uploadedFile.data && (
                        <Typography variant="caption" color="success.main">
                          {uploadedFile.data.metadata.rowCount} rows, {uploadedFile.data.metadata.columnCount} columns
                        </Typography>
                      )}
                      {uploadedFile.error && (
                        <Typography variant="caption" color="error.main">
                          {uploadedFile.error}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
                
                <Stack direction="row" spacing={1}>
                  {uploadedFile.data && (
                    <Tooltip title="Preview data">
                      <IconButton size="small" onClick={() => previewFile(uploadedFile.data!)}>
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Remove file">
                    <IconButton size="small" color="error" onClick={() => removeFile(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Upload Button */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {validFilesCount > 0 && (
              <Chip 
                icon={<SuccessIcon />} 
                label={`${validFilesCount} file(s) ready`} 
                color="success" 
                variant="outlined" 
              />
            )}
            {hasErrors && (
              <Chip 
                icon={<ErrorIcon />} 
                label="Some files have errors" 
                color="error" 
                variant="outlined" 
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            onClick={handleUpload}
            disabled={uploading || validFilesCount === 0}
          >
            {uploading ? 'Uploading...' : `Upload ${validFilesCount} file(s)`}
          </Button>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Data Preview - {selectedFileData?.metadata.fileName}
        </DialogTitle>
        <DialogContent>
          {selectedFileData && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Rows</Typography>
                  <Typography variant="h6">{selectedFileData.metadata.rowCount}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Columns</Typography>
                  <Typography variant="h6">{selectedFileData.metadata.columnCount}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">File Size</Typography>
                  <Typography variant="h6">{formatFileSize(selectedFileData.metadata.fileSize)}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Upload Date</Typography>
                  <Typography variant="h6">{selectedFileData.metadata.uploadDate.toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>Headers</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {selectedFileData.headers.map((header, index) => (
                  <Chip key={index} label={header || `Column ${index + 1}`} size="small" />
                ))}
              </Stack>
              
              <Typography variant="subtitle1" gutterBottom>Sample Data (First 10 rows)</Typography>
              <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {selectedFileData.headers.map((header, index) => (
                        <th key={index} style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f5f5f5' }}>
                          {header || `Column ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFileData.rows.slice(0, 10).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} style={{ border: '1px solid #ddd', padding: '8px' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ExcelUpload
