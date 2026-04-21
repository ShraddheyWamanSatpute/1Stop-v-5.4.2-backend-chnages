"use client"

import type React from "react"
import { useState } from "react"
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Button,

  TextField,
  Alert,
  Tabs,
  Tab,
  Chip,
} from "@mui/material"
import {
  Upload as UploadIcon,
  TableRestaurant as RunsheetIcon,
  ShoppingCart as PreorderIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import ExcelUpload, { type ParsedData } from "../shared/ExcelUpload"

interface FloorFriendExcelUploadProps {
  onDataUploaded?: () => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`upload-tabpanel-${index}`}
      aria-labelledby={`upload-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

// Utility function from legacy code
const sanitizeFirebaseKey = (key: string): string => {
  return (key || "")
    .replace(/[.#$/[\]]/g, "_") // Replace invalid characters with underscores
    .trim() // Trim leading/trailing whitespace
}

const FloorFriendExcelUpload: React.FC<FloorFriendExcelUploadProps> = ({ onDataUploaded }) => {
  const [tabValue, setTabValue] = useState(0)
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0])
  const [runsheetData, setRunsheetData] = useState<any>(null)
  const [preorderData, setPreorderData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)


  // Parse runsheet data using legacy logic
  const parseRunsheet = (rows: string[][]) => {
    const details: Record<string, any> = {}
    const bookings: Record<string, any> = {}
    const bookingCounts: Record<string, number> = {}
    const bookingReferences: Record<string, string> = {}

    const columnTitlesRowIndex = rows.findIndex((row) => row[0]?.trim().toLowerCase() === "name")
    if (columnTitlesRowIndex === -1) {
      throw new Error("Couldn't find the column titles row with 'Name' in the first column.")
    }

    // Parse details section (before column titles)
    for (let i = 0; i < columnTitlesRowIndex; i++) {
      if (rows[i]?.[0]) {
        const key = sanitizeFirebaseKey(rows[i][0])
        details[key] = rows[i]?.[1]?.trim() || ""
      }
    }

    details.columnTitles = rows[columnTitlesRowIndex]?.map((title) => title.trim().toLowerCase())

    // Parse booking data
    for (let i = columnTitlesRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (row[0]?.trim()) {
        const baseBookingName = sanitizeFirebaseKey(row[0]?.trim())
        bookingCounts[baseBookingName] = (bookingCounts[baseBookingName] || 0) + 1

        const bookingData: Record<string, any> = { tableNumber: null, movement: {} }

        details.columnTitles?.forEach((title: string, index: number) => {
          if (title && row[index]?.trim()) {
            bookingData[sanitizeFirebaseKey(title)] = row[index]?.trim()
          }
        })

        // Process table numbers with PM/AM filtering
        if (bookingData["area"]) {
          const area = bookingData["area"]
            .replace(/[^\w\s]/g, "")
            .replace(/table/gi, "")
            .split(/\s+/)
            .map((item: string) => {
              if (item.toUpperCase().endsWith("PM") || item.toUpperCase().endsWith("AM")) {
                return null
              }
              const num = Number.parseInt(item, 10)
              return isNaN(num) ? null : num
            })
            .filter((num: number | null) => num !== null)
            .sort((a: number, b: number) => a - b)

          if (area.length > 0) {
            const ranges: string[] = []
            let start = area[0]
            let end = area[0]

            for (let j = 1; j < area.length; j++) {
              if (area[j] === end + 1) {
                end = area[j]
              } else {
                ranges.push(start === end ? `T${start}` : `T${start} - ${end}`)
                start = area[j]
                end = area[j]
              }
            }
            ranges.push(start === end ? `T${start}` : `T${start} - ${end}`)
            bookingData.tableNumber = ranges.join(", ")
          }
        }

        // Handle duplicate bookings
        let finalBookingName = baseBookingName
        if (bookingCounts[baseBookingName] === 2) {
          finalBookingName = `${baseBookingName} Drinks`
        }

        if (bookingCounts[baseBookingName] > 2) {
          const earlierBookingName = bookingReferences[baseBookingName]
          if (earlierBookingName) {
            const earlierTableNumber = bookings[earlierBookingName]?.tableNumber || "Unknown"
            bookings[earlierBookingName]["movement"]["moveTo"] = bookingData.tableNumber
            bookingData["movement"]["moveFrom"] = earlierTableNumber
          }
        } else {
          bookingReferences[baseBookingName] = finalBookingName
        }

        bookings[finalBookingName] = bookingData
      }
    }

    return { details, bookings }
  }

  // Parse preorder data using legacy logic
  const parsePreorders = (rows: string[][]) => {
    const preorders: Record<string, any> = {}
    const linkedBookings: Record<string, string> = {}
    let currentBookingName: string | null = null
    let headerFound = false

    rows.forEach((row, rowIndex) => {
      const strippedRow = row.map((cell) => (cell ? cell.trim() : ""))

      // Detect header row
      if (strippedRow.join(",").toLowerCase().includes("type,item,quantity,time,for")) {
        headerFound = true

        if (rowIndex >= 4) {
          const bookingNameRow = rows[rowIndex - 3]
          let originalBookingName = sanitizeFirebaseKey(bookingNameRow?.[0]?.trim() || "")
          originalBookingName = originalBookingName.split(",")[0].trim()

          let finalPreorderName = originalBookingName

          if (linkedBookings[originalBookingName]) {
            currentBookingName = linkedBookings[originalBookingName]
          } else {
            currentBookingName = originalBookingName
            linkedBookings[originalBookingName] = currentBookingName
          }

          const movementData = preorders[currentBookingName]?.movement || {}
          if (movementData.moveTo) {
            finalPreorderName = `${originalBookingName}, Move To ${movementData.moveTo}`
          }

          if (!preorders[finalPreorderName]) {
            preorders[finalPreorderName] = { items: [] }
          }
        }
        return
      }

      // Process preorder items
      if (headerFound && strippedRow.length >= 5 && currentBookingName) {
        const forField = strippedRow[4]
        if (forField === "First Order: --/--") {
          return
        }

        preorders[currentBookingName].items.push({
          type: strippedRow[0],
          item: strippedRow[1],
          quantity: strippedRow[2],
          time: strippedRow[3],
          for: sanitizeFirebaseKey(forField || ""),
          dietary: strippedRow[5] || "",
        })
      }
    })

    return preorders
  }

  // Handle runsheet upload
  const handleRunsheetUpload = async (data: ParsedData, fileName: string) => {
    try {
      const parsed = parseRunsheet(data.rows)
      setRunsheetData({
        ...parsed,
        fileName,
        uploadDate: new Date(),
        metadata: data.metadata
      })
    } catch (error) {
      throw new Error(`Runsheet parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle preorder upload
  const handlePreorderUpload = async (data: ParsedData, fileName: string) => {
    try {
      const parsed = parsePreorders(data.rows)
      setPreorderData({
        ...parsed,
        fileName,
        uploadDate: new Date(),
        metadata: data.metadata
      })
    } catch (error) {
      throw new Error(`Preorder parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Save data to database
  const handleSaveData = async () => {
    if (!runsheetData && !preorderData) {
      setSaveError("No data to save. Please upload at least one file.")
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      // Here you would integrate with your actual database saving logic
      // For now, we'll just simulate the save process
      
      console.log("Saving Floor Friend data:", {
        date: uploadDate,
        runsheet: runsheetData,
        preorders: preorderData
      })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Clear data after successful save
      setRunsheetData(null)
      setPreorderData(null)
      
      if (onDataUploaded) {
        onDataUploaded()
      }

    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save data")
    } finally {
      setSaving(false)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const runsheetSampleData = [
    ["Date", "2024-01-15"],
    ["Venue", "Restaurant Name"],
    ["", ""],
    ["Name", "Time", "Covers", "Area", "Notes"],
    ["Smith", "19:00", "4", "Table 12", "Birthday celebration"],
    ["Jones", "19:30", "2", "Table 5", "Vegetarian"],
  ]

  const preorderSampleData = [
    ["Smith"],
    [""],
    ["Type", "Item", "Quantity", "Time", "For", "Dietary"],
    ["Starter", "Soup", "2", "19:00", "Main", ""],
    ["Main", "Steak", "1", "19:30", "Main", "Medium rare"],
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <UploadIcon />
        Excel Upload Tool
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload runsheet and preorder data from Excel/CSV files. The data will be parsed and integrated with your Floor Friend system.
      </Typography>

      {/* Date Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          label="Upload Date"
          type="date"
          value={uploadDate}
          onChange={(e) => setUploadDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
        <Typography variant="body2" color="text.secondary">
          Select the date for which this data applies. This will be used to organize the uploaded information.
        </Typography>
      </Paper>

      {/* Upload Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="upload tabs">
          <Tab 
            icon={<RunsheetIcon />} 
            label="Runsheet Upload" 
            id="upload-tab-0"
            aria-controls="upload-tabpanel-0"
          />
          <Tab 
            icon={<PreorderIcon />} 
            label="Preorder Upload" 
            id="upload-tab-1"
            aria-controls="upload-tabpanel-1"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <ExcelUpload
            title="Upload Runsheet Data"
            description="Upload your runsheet CSV file containing booking information, table assignments, and guest details."
            acceptedFormats={['.csv']}
            maxFileSize={5}
            requiredColumns={['name']}
            sampleData={runsheetSampleData}
            onUpload={handleRunsheetUpload}
          />
          
          {runsheetData && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Runsheet data parsed successfully!
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={`${Object.keys(runsheetData.bookings || {}).length} bookings`} size="small" />
                <Chip label={`File: ${runsheetData.fileName}`} size="small" variant="outlined" />
              </Stack>
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ExcelUpload
            title="Upload Preorder Data"
            description="Upload your preorder CSV file containing menu items, quantities, and special requirements for each booking."
            acceptedFormats={['.csv']}
            maxFileSize={5}
            requiredColumns={['type', 'item']}
            sampleData={preorderSampleData}
            onUpload={handlePreorderUpload}
          />
          
          {preorderData && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Preorder data parsed successfully!
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={`${Object.keys(preorderData || {}).length} preorder groups`} size="small" />
                <Chip label={`File: ${preorderData.fileName}`} size="small" variant="outlined" />
              </Stack>
            </Alert>
          )}
        </TabPanel>
      </Paper>

      {/* Save Section */}
      {(runsheetData || preorderData) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ready to Save
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {runsheetData && (
              <Grid item xs={12} md={6}>
                <Alert severity="info">
                  <Typography variant="body2" fontWeight="bold">Runsheet Data Ready</Typography>
                  <Typography variant="body2">
                    {Object.keys(runsheetData.bookings || {}).length} bookings parsed from {runsheetData.fileName}
                  </Typography>
                </Alert>
              </Grid>
            )}
            
            {preorderData && (
              <Grid item xs={12} md={6}>
                <Alert severity="info">
                  <Typography variant="body2" fontWeight="bold">Preorder Data Ready</Typography>
                  <Typography variant="body2">
                    {Object.keys(preorderData || {}).length} preorder groups parsed from {preorderData.fileName}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>

          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSaveData}
            disabled={saving}
            sx={{ mr: 2 }}
          >
            {saving ? 'Saving...' : 'Save to Database'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              setRunsheetData(null)
              setPreorderData(null)
              setSaveError(null)
            }}
            disabled={saving}
          >
            Clear All Data
          </Button>
        </Paper>
      )}
    </Box>
  )
}

export default FloorFriendExcelUpload
