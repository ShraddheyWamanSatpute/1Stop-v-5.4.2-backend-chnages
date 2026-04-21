"use client"
import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import type React from "react"
import { useLocation } from "react-router-dom"
import {
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  IconButton,
  Grid,
  Alert,
  LinearProgress,
  Divider,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import {
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
} from "@mui/icons-material"
import { useState, useRef, useEffect } from "react"
import type {
  ChecklistItem,
  ItemResponse,
  MultipleEntryResponse,
  ChecklistSection
} from "../../../backend/interfaces/Company"
import { useCompany, CompanyChecklist, ChecklistCompletion } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { getChecklistWindowForChecklist } from "../../../backend/utils/checklistUtils"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"

interface ChecklistCompletionProps {
  open: boolean
  onClose: () => void
  checklist: CompanyChecklist
  instanceDate?: number | null
  onComplete: (completion: ChecklistCompletion) => void
}

// Utility functions that were previously imported
const calculateCompletionScore = (responses: Record<string, ItemResponse>, checklist: CompanyChecklist): number => {
  // Simple implementation - calculate percentage of completed items
  const totalItems = checklist.sections.reduce((acc, section) => acc + section.items.length, 0);
  const completedItems = Object.values(responses).filter(r => r.completed).length;
  return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;
};

/** Editor stores min/max on `validation`; legacy / alternate shapes use `options`. */
const getNumberItemBounds = (item: ChecklistItem) => {
  const val =
    item.validation && typeof item.validation === "object"
      ? (item.validation as Record<string, unknown>)
      : {}
  const opts =
    item.options && typeof item.options === "object" ? (item.options as Record<string, unknown>) : {}

  const coalesceNum = (...cands: unknown[]): number | undefined => {
    for (const c of cands) {
      if (typeof c === "number" && Number.isFinite(c)) return c
      if (typeof c === "string" && c.trim() !== "") {
        const n = Number(c)
        if (Number.isFinite(n)) return n
      }
    }
    return undefined
  }

  const min = coalesceNum(val.min, val.minValue, opts.minValue, opts.min)
  const max = coalesceNum(val.max, val.maxValue, opts.maxValue, opts.max)
  const warningThreshold = coalesceNum(opts.warningThreshold)
  const criticalThreshold = coalesceNum(opts.criticalThreshold)
  const unit = opts.unit != null ? String(opts.unit) : ""

  return { min, max, warningThreshold, criticalThreshold, unit }
}

/** Fixed width for all number responses so every item lines up the same. */
const CHECKLIST_NUMBER_INPUT_WIDTH_PX = 168

const checkNumberValueRange = (
  value: number | null,
  item: ChecklistItem,
): { isOutOfRange: boolean; level: "warning" | "critical" } => {
  const { min, max, warningThreshold, criticalThreshold } = getNumberItemBounds(item)

  if (value === null || Number.isNaN(value)) {
    return { isOutOfRange: false, level: "warning" }
  }

  if (min !== undefined && value < min) {
    return { isOutOfRange: true, level: "critical" }
  }
  if (max !== undefined && value > max) {
    return { isOutOfRange: true, level: "critical" }
  }

  if (criticalThreshold !== undefined && value >= criticalThreshold) {
    return { isOutOfRange: false, level: "critical" }
  }
  if (warningThreshold !== undefined && value >= warningThreshold) {
    return { isOutOfRange: false, level: "warning" }
  }

  return { isOutOfRange: false, level: "warning" }
}

const ChecklistCompletionDialog: React.FC<ChecklistCompletionProps> = ({ open, onClose, checklist, instanceDate, onComplete }) => {
  const location = useLocation()
  const { state: companyState, createChecklistCompletion, uploadChecklistCompletionPhoto } = useCompany()
  const { state: settingsState } = useSettings()
  
  // Create loginState from settingsState
  const loginState = {
    uid: settingsState.auth?.uid || ''
  }
  


  const [responses, setResponses] = useState<Record<string, ItemResponse>>({})
  const [logEntries, setLogEntries] = useState<Record<string, MultipleEntryResponse[]>>({})
  const [notes, setNotes] = useState("")
  const [signature, setSignature] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Open first section when the completion dialog opens (per checklist).
  useEffect(() => {
    if (!open) return
    const first = checklist.sections?.[0]
    if (first?.id) {
      setExpandedSections({ [first.id]: true })
    } else {
      setExpandedSections({})
    }
  }, [open, checklist.id])
  const startTime = useRef<number>(Date.now())

  const sections = checklist.sections || []
  // Filter out log sections when calculating total items
  const totalItems = sections.reduce((sum, section) => {
    // Skip log sections in the count
    if ((section.sectionType || 'normal') === 'logs') {
      return sum
    }
    return sum + section.items.length
  }, 0)
  
  // Count only completed items that are not in log sections
  const completedItems = Object.values(responses).filter((r) => {
    // Check if this response is for an item in a log section
    const isLogSectionItem = sections
      .filter(section => (section.sectionType || 'normal') === 'logs')
      .some(section => 
        section.items.some(item => item.id.replace(/[.#$\[\]/]/g, '_') === r.itemId)
      )
    return r.completed && !isLogSectionItem
  }).length
  
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 100 // Return 100% if no non-log items

  const hasCompany = Boolean(companyState.companyID)
  const hasSite = Boolean(companyState.selectedSiteID)
  const hasUser = Boolean(loginState.uid)
  const canCompleteChecklist = hasCompany && hasSite && hasUser

  const handleSectionToggle = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const handleResponseChange = (
    itemId: string,
    value: any,
    photos?: string[],
    isOutOfRange?: boolean,
    warningLevel?: "warning" | "critical",
    explanation?: string,
  ) => {
    const item = sections.flatMap((s) => s.items).find((i) => i.id === itemId)
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        itemId,
        type: item?.type as any,
        value,
        completed: value !== null && value !== "" && value !== undefined && value !== false,
        photos: photos || prev[itemId]?.photos || [],
        isOutOfRange: isOutOfRange || false,
        warningLevel: warningLevel || "warning",
        explanation: explanation || prev[itemId]?.explanation || "",
      },
    }))
  }

  const uploadPhotoToStorage = async (file: File, itemId: string): Promise<string> => {
    return uploadChecklistCompletionPhoto(checklist.id, itemId, file)
  }

  const handlePhotoUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setUploadingPhotos((prev) => ({ ...prev, [itemId]: true }))

    try {
      const photoUrls: string[] = []

      for (const file of Array.from(files)) {
        const url = await uploadPhotoToStorage(file, itemId)
        photoUrls.push(url)
      }

      const currentResponse = responses[itemId]
      const existingPhotos = currentResponse?.photos || []
      handleResponseChange(itemId, currentResponse?.value || true, [...existingPhotos, ...photoUrls])
    } catch (error) {
      console.error("Error uploading photos:", error)
      setError("Failed to upload photos. Please try again.")
    } finally {
      setUploadingPhotos((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  const removePhoto = (itemId: string, photoIndex: number) => {
    const currentResponse = responses[itemId]
    if (currentResponse?.photos) {
      const newPhotos = currentResponse.photos.filter((_: string, index: number) => index !== photoIndex)
      handleResponseChange(itemId, currentResponse.value, newPhotos)
    }
  }

  const validateResponses = (): string[] => {
    const errors: string[] = []
    // Require signature
    if (!signature || signature.trim() === "") {
      errors.push("Digital signature is required to complete this checklist")
    }
    sections.forEach((section) => {
      // Skip validation for logs sections - they are not required
      if ((section.sectionType || 'normal') === 'logs') {
        return
      }
      
      section.items.forEach((item) => {
        const response = responses[item.id]
        if (item.required && (!response || !response.completed)) {
          errors.push(`${section.title}: ${item.title} is required`)
          return
        }

        if (response) {
          // Check if explanation is required
          if (
            item.type === "checkbox" &&
            response.value === false &&
            item.validation?.requireExplanationWhenNo &&
            !response.explanation
          ) {
            errors.push(`${section.title}: ${item.title} - Explanation required for "No" response`)
          }
          if (
            item.type === "number" &&
            response.isOutOfRange &&
            item.validation?.requireExplanationWhenOutOfRange &&
            !response.explanation
          ) {
            errors.push(`${section.title}: ${item.title} - Explanation required for out of range value`)
          }
        }
      })
    })
    return errors
  }

  const renderLogEntryInput = (sectionId: string, entryIndex: number, item: ChecklistItem) => {
    const entries = logEntries[sectionId] || []
    const entry = entries[entryIndex]
    const value = entry?.fields[item.id] || ''
    
    switch (item.type) {
      case 'text':
        return (
          <TextField
            size="small"
            fullWidth
            value={value || ''}
            onChange={(e) => handleLogEntryChange(sectionId, entryIndex, item.id, e.target.value)}
          />
        )
      case 'number':
        return (
          <TextField
            size="small"
            fullWidth
            type="number"
            value={value || ''}
            onChange={(e) => handleLogEntryChange(sectionId, entryIndex, item.id, Number(e.target.value))}
          />
        )
      case 'checkbox':
        return (
          <Checkbox
            checked={Boolean(value)}
            onChange={(e) => handleLogEntryChange(sectionId, entryIndex, item.id, e.target.checked)}
          />
        )
      default:
        return null
    }
  }

  const handleComplete = async () => {
    console.log("DEBUG - Starting checklist completion process")
    if (!companyState.companyID || !companyState.selectedSiteID || !loginState.uid) {
      console.log("ERROR - Missing required state:", { 
        companyID: companyState.companyID ? "Present" : "Missing", 
        siteID: companyState.selectedSiteID ? "Present" : "Missing", 
        uid: loginState.uid ? "Present" : "Missing" 
      })
      return
    }

    const validationErrors = validateResponses()
    if (validationErrors.length > 0) {
      console.log("DEBUG - Validation failed with errors:", validationErrors)
      setError(validationErrors.join("\n"))
      return
    }
    console.log("DEBUG - Validation passed successfully")

    try {
      setLoading(true)
      setError(null)
      console.log("DEBUG - Starting checklist submission process")

      const completedAt = Date.now()
      // Use provided instanceDate if any, else compute based on schedule
      const window = getChecklistWindowForChecklist(checklist, { instanceDate: instanceDate ?? null })
      const scheduledFor = window.openingAt.getTime()
      
      // Process log entries into responses format and sanitize IDs
      const processedResponses = { ...responses }
      
      // Sanitize existing response keys to remove invalid characters
      const sanitizedResponses: Record<string, ItemResponse> = {}
      Object.entries(processedResponses).forEach(([key, value]) => {
        const sanitizedKey = key.replace(/[.#$\[\]/]/g, '_')
        sanitizedResponses[sanitizedKey] = {
          ...value,
          itemId: sanitizedKey
        }
      })
      
      Object.entries(logEntries).forEach(([sectionId, entries]) => {
        const section = sections.find(s => s.id === sectionId)
        if (section && section.sectionType === 'logs') {
          section.items.forEach(item => {
            const sanitizedItemId = item.id.replace(/[.#$\[\]\/]/g, '_')
            
            // Sanitize each log entry ID and field keys to ensure Firebase compatibility
            const sanitizedEntries = entries.map(entry => ({
              ...entry,
              id: entry.id.replace(/[.#$\[\]\/]/g, '_'),
              fields: Object.entries(entry.fields).reduce((acc, [fieldKey, fieldValue]) => {
                const sanitizedFieldKey = fieldKey.replace(/[.#$\[\]\/]/g, '_')
                return { ...acc, [sanitizedFieldKey]: fieldValue }
              }, {})
            }))
            
            sanitizedResponses[sanitizedItemId] = {
              itemId: sanitizedItemId,
              type: 'multiple_entry',
              value: sanitizedEntries,
              completed: entries.length > 0
            }
          })
        }
      })
      
      const finalResponses = sanitizedResponses

      // Determine completion status based on closing time and expiration window.
      let completionStatus: "completed" | "late" | "expired" = "completed"
      const isLate = completedAt > window.closingAt.getTime()
      const expireAt = window.expireAt ? window.expireAt.getTime() : null
      if (expireAt && completedAt > expireAt) completionStatus = "expired"
      else if (isLate) completionStatus = "late"
      
      // Create completion data
      const completion: ChecklistCompletion = {
        id: "",
        checklistId: checklist.id,
        completedBy: loginState.uid,
        completedAt,
        startedAt: startTime.current,
        scheduledFor,
        responses: finalResponses,
        status: completionStatus,
        overallNotes: notes.trim(),
        signature: signature.trim(),
        completionScore: calculateCompletionScore(finalResponses, checklist),
        isLate,
      }

      console.log("DEBUG - ChecklistCompletion: Final completion data being submitted:", {
        checklistId: completion.checklistId,
        status: completion.status,
        completedAt: new Date(completion.completedAt).toLocaleString(),
        scheduledFor: completion.scheduledFor ? new Date(completion.scheduledFor).toLocaleString() : 'Not scheduled',
        isLate: completion.isLate,
        signature: completion.signature ? "Provided" : "Missing",
        responseCount: Object.keys(finalResponses).length,
        companyID: companyState.companyID,
        siteID: companyState.selectedSiteID,
        subsiteID: companyState.selectedSubsiteID || "none"
      })

      console.log("DEBUG - ChecklistCompletion: Calling createChecklistCompletion from company context")
      
      // Use the CompanyContext function - this uses getChecklistWritePath() to determine the correct path
      // Same path logic used by getChecklistCompletions() for reading
      const completionID = await createChecklistCompletion(completion)
      
      console.log("DEBUG - Received completion ID:", completionID)

      // Update the completion with the ID returned from Firebase
      completion.id = completionID

      console.log("DEBUG - Final checklist completion object:", {
        id: completion.id,
        status: completion.status,
        completedAt: completion.completedAt ? new Date(completion.completedAt).toLocaleString() : 'undefined'
      })
      
      console.log("DEBUG - Calling onComplete callback")
      onComplete(completion)
      console.log("DEBUG - Closing dialog and resetting form")
      onClose()
      resetForm()
    } catch (err) {
      console.error("ERROR - Failed to complete checklist:", err)
      setError("Failed to complete checklist")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    console.log("DEBUG - Resetting form state")
    setResponses({})
    setLogEntries({})
    setNotes("")
    setSignature("")
    setError(null)
    const first = checklist.sections?.[0]
    setExpandedSections(first?.id ? { [first.id]: true } : {})
    startTime.current = Date.now()
  }

  const renderItemInput = (item: ChecklistItem) => {
    const response = responses[item.id]
    const needsExplanation =
      (item.type === "checkbox" && response?.value === false && item.validation?.requireExplanationWhenNo) ||
      (item.type === "number" && response?.isOutOfRange && item.validation?.requireExplanationWhenOutOfRange)

    switch (item.type) {
      case "checkbox":
        return (
          <Box key={item.id} sx={{ mb: 3 }}>
            <FormControl component="fieldset" fullWidth>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={response?.value === true}
                      onChange={(e) => handleResponseChange(item.id, e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">{item.title}</Typography>
                      {item.description && (
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </FormGroup>
              {needsExplanation && (
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Explanation Required"
                  value={response?.explanation || ""}
                  onChange={(e) =>
                    handleResponseChange(
                      item.id,
                      response?.value,
                      response?.photos,
                      response?.isOutOfRange,
                      response?.warningLevel === "normal" ? undefined : response?.warningLevel,
                      e.target.value,
                    )
                  }
                  sx={{ mt: 2 }}
                  required
                  error={!response?.explanation}
                  helperText={!response?.explanation ? "Please provide an explanation" : ""}
                />
              )}
            </FormControl>
          </Box>
        )

      case "number": {
        const parseResponseNumber = (): number | null => {
          const raw = response?.value
          if (raw === "" || raw === null || raw === undefined) return null
          if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
          const n = Number(raw)
          return Number.isFinite(n) ? n : null
        }
        const numValue = parseResponseNumber()
        const rangeCheck = checkNumberValueRange(numValue, item)
        const { min: minV, max: maxV, unit } = getNumberItemBounds(item)
        const acceptableHint =
          minV !== undefined && maxV !== undefined
            ? `Acceptable: ${minV}–${maxV}${unit ? ` ${unit}` : ""}`
            : minV !== undefined
              ? `Acceptable: ≥${minV}${unit ? ` ${unit}` : ""}`
              : maxV !== undefined
                ? `Acceptable: ≤${maxV}${unit ? ` ${unit}` : ""}`
                : ""
        const outOfAcceptableRange = rangeCheck.isOutOfRange
        const helperMessage = outOfAcceptableRange
          ? acceptableHint
            ? `Outside acceptable range (${acceptableHint})`
            : "Value is outside acceptable range"
          : ""
        return (
          <Box key={item.id} sx={{ mb: 2, width: "100%" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 1.5,
                width: "100%",
              }}
            >
              <Typography
                variant="body2"
                component="label"
                htmlFor={`checklist-number-${item.id}`}
                sx={{
                  fontWeight: 600,
                  flex: "1 1 auto",
                  minWidth: 0,
                  pr: 1,
                  pt: "6px",
                }}
              >
                {item.title}
              </Typography>
              <TextField
                id={`checklist-number-${item.id}`}
                type="number"
                size="small"
                value={response?.value ?? ""}
                onChange={(e) => {
                  const rawStr = e.target.value
                  if (rawStr === "" || rawStr === "-") {
                    const check = checkNumberValueRange(null, item)
                    handleResponseChange(item.id, "", undefined, check.isOutOfRange, check.level)
                    return
                  }
                  const value = Number(rawStr)
                  if (Number.isNaN(value)) return
                  const check = checkNumberValueRange(value, item)
                  handleResponseChange(item.id, value, undefined, check.isOutOfRange, check.level)
                }}
                placeholder="Enter number"
                error={false}
                helperText={helperMessage || undefined}
                FormHelperTextProps={{
                  sx: {
                    mx: 0,
                    mt: 0.5,
                    textAlign: "right",
                    ...(outOfAcceptableRange ? { color: "warning.main" } : {}),
                  },
                }}
                InputProps={{
                  endAdornment: item.options?.unit ? (
                    <InputAdornment position="end">{item.options.unit}</InputAdornment>
                  ) : undefined,
                }}
                sx={{
                  flex: "0 0 auto",
                  width: CHECKLIST_NUMBER_INPUT_WIDTH_PX,
                  maxWidth: CHECKLIST_NUMBER_INPUT_WIDTH_PX,
                  "& .MuiOutlinedInput-root": {
                    width: "100%",
                    ...(outOfAcceptableRange
                      ? {
                          "& fieldset": { borderColor: "warning.main", borderWidth: 2 },
                          "&:hover fieldset": { borderColor: "warning.dark" },
                          "&.Mui-focused fieldset": { borderColor: "warning.main" },
                        }
                      : {}),
                  },
                }}
              />
            </Box>
            {item.description && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                {item.description}
              </Typography>
            )}
            {needsExplanation && (
              <TextField
                sx={{ mt: 1.5, width: "100%" }}
                multiline
                rows={2}
                label="Explanation Required"
                fullWidth
                value={response?.explanation || ""}
                onChange={(e) =>
                  handleResponseChange(
                    item.id,
                    response?.value,
                    response?.photos,
                    response?.isOutOfRange,
                    response?.warningLevel === "normal" ? undefined : response?.warningLevel,
                    e.target.value,
                  )
                }
                required
                error={!response?.explanation}
                helperText={!response?.explanation ? "Please provide an explanation for the out of range value" : ""}
              />
            )}
          </Box>
        )
      }

      case "text":
        return (
          <Box key={item.id} sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: "medium" }}>
              {item.title}
            </Typography>
            {item.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {item.description}
              </Typography>
            )}
            <TextField
              fullWidth
              multiline={item.options?.multiline}
              rows={item.options?.multiline ? 3 : 1}
              value={response?.value || ""}
              onChange={(e) => handleResponseChange(item.id, e.target.value)}
              placeholder={item.options?.placeholder || "Enter your response"}
            />
          </Box>
        )

      case "file":
        return (
          <Box key={item.id} sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: "medium" }}>
              {item.title}
            </Typography>
            {item.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {item.description}
              </Typography>
            )}
            <Box sx={{ mb: 2 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handlePhotoUpload(item.id, e)}
              />
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhotos[item.id]}
              >
                {uploadingPhotos[item.id] ? "Uploading..." : "Take Photo"}
              </Button>
              {uploadingPhotos[item.id] && <LinearProgress sx={{ mt: 1 }} />}
            </Box>
            {response?.photos && response.photos.length > 0 && (
              <Grid container spacing={1}>
                {response.photos.map((photo: string, index: number) => (
                  <Grid item xs={6} sm={4} key={index}>
                    <Box
                      sx={{
                        position: "relative",
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          bgcolor: alpha(themeConfig.brandColors.offWhite, 0.85),
                        }}
                        onClick={() => removePhoto(item.id, index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )

      default:
        return null
    }
  }

  const handleAddLogEntry = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return
    
    // Generate a Firebase-safe ID without periods, #, $, [, ], or /
    const newEntry: MultipleEntryResponse = {
      id: `entry-${Date.now()}-${Math.random().toString(36).replace(/[.#$\[\]\/]/g, '_').substr(2, 9)}`,
      fields: {},
      timestamp: Date.now()
    }
    
    setLogEntries(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), newEntry]
    }))
  }
  
  const handleLogEntryChange = (sectionId: string, entryIndex: number, itemId: string, value: any) => {
    setLogEntries(prev => {
      const sectionEntries = [...(prev[sectionId] || [])]
      sectionEntries[entryIndex] = {
        ...sectionEntries[entryIndex],
        fields: {
          ...sectionEntries[entryIndex].fields,
          [itemId]: value
        }
      }
      return {
        ...prev,
        [sectionId]: sectionEntries
      }
    })
  }
  
  const handleRemoveLogEntry = (sectionId: string, entryIndex: number) => {
    setLogEntries(prev => {
      const sectionEntries = [...(prev[sectionId] || [])]
      sectionEntries.splice(entryIndex, 1)
      return {
        ...prev,
        [sectionId]: sectionEntries
      }
    })
  }

  const renderSection = (section: ChecklistSection) => {
    const sectionResponses = section.items.map((item) => responses[item.id]).filter(Boolean)
    const sectionProgress = section.items.length > 0 ? (sectionResponses.length / section.items.length) * 100 : 0
    const isExpanded = expandedSections[section.id] ?? false
    
    // Check if this is a logs section (default to 'normal' if not specified)
    if (section.sectionType === 'logs') {
      return renderLogsSection(section)
    }

    return (
      <Accordion
        key={section.id}
        expanded={isExpanded}
        onChange={() => handleSectionToggle(section.id)}
        disableGutters
        elevation={0}
        sx={{ mb: 1, border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, py: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", width: "100%", mr: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {section.title}
              </Typography>
              {section.description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {section.description}
                </Typography>
              )}
            </Box>
            <Box sx={{ minWidth: 100, ml: 2 }}>
              <Typography variant="body2" color="text.secondary" align="right">
                {sectionResponses.length}/{section.items.length} completed
              </Typography>
              <LinearProgress variant="determinate" value={sectionProgress} sx={{ mt: 0.5, height: 4 }} />
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
          <Box sx={{ pt: 0.5 }}>{section.items.map((item) => renderItemInput(item))}</Box>
        </AccordionDetails>
      </Accordion>
    )
  }
  
  const renderLogsSection = (section: ChecklistSection) => {
    const entries = logEntries[section.id] || []
    const isExpanded = expandedSections[section.id] ?? false
    
    return (
      <Accordion
        key={section.id}
        expanded={isExpanded}
        onChange={() => handleSectionToggle(section.id)}
        disableGutters
        elevation={0}
        sx={{ mb: 1, border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, py: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", width: "100%", mr: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {section.title}
              </Typography>
              <Chip label="Logs" size="small" color="secondary" sx={{ mt: 0.25, height: 22 }} />
            </Box>
            <Box sx={{ minWidth: 100, ml: 2 }}>
              <Typography variant="body2" color="text.secondary" align="right">
                {entries.length} log entries
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
          <TableContainer sx={{ mb: 1, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="120px">Timestamp</TableCell>
                  {section.items.map(item => (
                    <TableCell key={item.id}>{item.title}</TableCell>
                  ))}
                  <TableCell width="60px">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry, entryIndex) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                    {section.items.map(item => (
                      <TableCell key={item.id}>
                        {renderLogEntryInput(section.id, entryIndex, item)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveLogEntry(section.id, entryIndex)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={() => handleAddLogEntry(section.id)}
          >
            Add Log Entry
          </Button>
        </AccordionDetails>
      </Accordion>
    )
  }

  return (
                <CRUDModal
          open={open}
          onClose={(reason) => {
            const __workspaceOnClose = onClose
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "checklistCompletionModal1",
            crudMode: "create",
          }}
          title={`Complete Checklist: ${checklist.title}`}
          icon={<CheckCircleIcon />}
          mode="create"
          onSave={async (...args) => {
            const __workspaceOnSave = handleComplete
            if (typeof __workspaceOnSave !== "function") return undefined
            const result = await __workspaceOnSave(...args)
            removeWorkspaceFormDraft(location.pathname, {
              crudEntity: "checklistCompletionModal1",
              crudMode: "create",
            })
            return result
          }}
          saveButtonText={loading ? "Completing..." : "Complete Checklist"}
          maxWidth="lg"
          loading={loading}
          hideDefaultActions={false}
          disabled={!canCompleteChecklist || (totalItems > 0 && completedItems === 0)}
        >
        {!canCompleteChecklist && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please ensure a company and site are selected and you are signed in before completing a checklist.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3, whiteSpace: "pre-line" }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Overall Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completedItems} of {totalItems} items
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        </Box>

        {/* Sections */}
        {sections.map((section) => renderSection(section))}

        {/* Additional Fields */}
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          
          {/* Additional Notes - Collapsible */}
          <Accordion
            disableGutters
            elevation={0}
            sx={{ mb: 1, border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, py: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Additional Notes
              </Typography>
              {notes.trim() && (
                <Chip 
                  label="Has notes" 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 2 }} 
                />
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or observations"
              />
            </AccordionDetails>
          </Accordion>
          
          {/* Digital Signature - Horizontal Layout */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ minWidth: "fit-content", fontWeight: 700 }}>
              Digital signature
            </Typography>
            <TextField
              fullWidth
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name as digital signature"
              size="small"
            />
          </Box>
        </Box>
    </CRUDModal>
  )
}

export default ChecklistCompletionDialog
