"use client"

import React, { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useState } from "react"
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material"
import { useStock } from "../../../../backend/context/StockContext"
import { useCompany } from "../../../../backend/context/CompanyContext"
import type { StockTransfer, StockTransferItem } from "../../../../backend/interfaces/Stock"

export interface StockTransferFormRef {
  submit: () => void
  hasItems: () => boolean
}

interface StockTransferFormProps {
  stockTransfer?: StockTransfer | null
  mode: "create" | "edit" | "view"
  onSave: (data: StockTransfer) => void
}

type SiteOption = { id: string; name: string; subsites: Array<{ id: string; name: string }> }

const toDateInput = (raw?: string) => {
  if (!raw) return new Date().toISOString().slice(0, 10)
  const value = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const ukMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (ukMatch) return `${ukMatch[3]}-${ukMatch[2]}-${ukMatch[1]}`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10)
}

const createEmptyItem = (): StockTransferItem => ({
  productId: "",
  productName: "",
  measureId: "",
  unitName: "",
  quantity: 1,
})

type LocationValue = { siteId: string; subsiteId?: string }

const locationLabelFrom = (sites: SiteOption[], value?: LocationValue | null): string => {
  const siteId = String(value?.siteId || "").trim()
  const subsiteId = String(value?.subsiteId || "").trim()
  if (!siteId) return ""
  const site = sites.find((s) => String(s.id) === siteId)
  const siteName = String(site?.name || siteId)
  if (!subsiteId) return siteName
  const subsite = site?.subsites?.find((ss) => String(ss.id) === subsiteId)
  const subsiteName = String(subsite?.name || subsiteId)
  return `${siteName} / ${subsiteName}`
}

type LocationTreeSelectProps = {
  label: string
  sites: SiteOption[]
  value: LocationValue | null
  disabled?: boolean
  error?: boolean
  helperText?: string
  /** `name` on the trigger input (autofill / audit tooling). */
  inputName?: string
  onChange: (value: LocationValue) => void
}

const LocationTreeSelect: React.FC<LocationTreeSelectProps> = ({
  label,
  sites,
  value,
  disabled,
  error,
  helperText,
  inputName = "stockTransferToLocation",
  onChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [expandedSiteIds, setExpandedSiteIds] = useState<Set<string>>(() => new Set())
  const locationFieldId = useId()

  const open = Boolean(anchorEl)
  const displayValue = locationLabelFrom(sites, value)

  const closeMenu = () => setAnchorEl(null)
  const toggleExpand = (siteId: string) => {
    setExpandedSiteIds((prev) => {
      const next = new Set(prev)
      if (next.has(siteId)) next.delete(siteId)
      else next.add(siteId)
      return next
    })
  }

  return (
    <>
      <TextField
        id={locationFieldId}
        name={inputName}
        fullWidth
        label={label}
        value={displayValue}
        placeholder="Select..."
        inputProps={{ readOnly: true, "aria-haspopup": "listbox", "aria-expanded": open }}
        onClick={(e) => {
          if (disabled) return
          setAnchorEl(e.currentTarget)
        }}
        disabled={disabled}
        error={error}
        helperText={helperText}
      />

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        PaperProps={{
          sx: { width: { xs: "92vw", sm: 420 }, maxWidth: 520 },
        }}
        MenuListProps={{
          dense: true,
          sx: { py: 0.5 },
        }}
      >
        <List dense disablePadding sx={{ py: 0 }}>
          {sites.map((site) => {
            const hasChildren = (site.subsites || []).length > 0
            const isExpanded = expandedSiteIds.has(site.id)
            const siteSelected = String(value?.siteId || "") === site.id && !String(value?.subsiteId || "")

            return (
              <Box key={site.id}>
                <ListItemButton
                  selected={siteSelected}
                  onClick={() => {
                    onChange({ siteId: site.id, subsiteId: "" })
                    closeMenu()
                  }}
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 34 }}>
                    {hasChildren ? (
                      <IconButton
                        size="small"
                        edge="start"
                        aria-label={isExpanded ? "Collapse site" : "Expand site"}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpand(site.id)
                        }}
                      >
                        {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                      </IconButton>
                    ) : (
                      <Box sx={{ width: 28 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={site.name}
                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  />
                </ListItemButton>

                {hasChildren && (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List dense disablePadding sx={{ pl: 5, pb: 0.5 }}>
                      {site.subsites.map((subsite) => {
                        const selected = String(value?.siteId || "") === site.id && String(value?.subsiteId || "") === subsite.id
                        return (
                          <ListItemButton
                            key={`${site.id}:${subsite.id}`}
                            selected={selected}
                            onClick={() => {
                              onChange({ siteId: site.id, subsiteId: subsite.id })
                              closeMenu()
                            }}
                            sx={{ py: 0.25 }}
                          >
                            <ListItemText primary={subsite.name} primaryTypographyProps={{ variant: "body2" }} />
                          </ListItemButton>
                        )
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            )
          })}
        </List>
      </Menu>
    </>
  )
}

const StockTransferForm = forwardRef<StockTransferFormRef, StockTransferFormProps>(
  ({ stockTransfer, mode, onSave }, ref) => {
    const { state: stockState } = useStock()
    const { state: companyState } = useCompany()
    const { products, measures } = stockState
    const isReadOnly = mode === "view"

    const currentSiteId = String(companyState.selectedSiteID || "")
    const currentSubsiteId = String(companyState.selectedSubsiteID || "")

    const sites = useMemo<SiteOption[]>(() => {
      return (companyState.sites || [])
        .map((site: any) => {
          const siteId = String(site?.siteID || site?.id || "")
          if (!siteId) return null

          const subsites = site?.subsites && typeof site.subsites === "object"
            ? Object.entries(site.subsites).map(([key, value]) => {
                const subsite: any = value || {}
                return {
                  id: String(subsite?.subsiteID || subsite?.id || key),
                  name: String(subsite?.name || subsite?.subsiteName || key),
                }
              })
            : []

          return {
            id: siteId,
            name: String(site?.name || site?.siteName || siteId),
            subsites: subsites.filter((subsite) => subsite.id),
          }
        })
        .filter(Boolean) as SiteOption[]
    }, [companyState.sites])

    const [transferData, setTransferData] = useState<StockTransfer>({
      date: toDateInput(),
      dateUK: toDateInput(),
      status: "Awaiting Submission",
      reference: "",
      description: "",
      notes: "",
      transferType: "sent",
      fromSiteId: currentSiteId || undefined,
      fromSubsiteId: currentSubsiteId || undefined,
      toSiteId: "",
      toSubsiteId: "",
      items: [],
    })

    const [validationErrors, setValidationErrors] = useState<{
      reference?: string
      toSiteId?: string
      items?: string
    }>({})

    useEffect(() => {
      if (stockTransfer && mode !== "create") {
        setTransferData({
          ...stockTransfer,
          date: toDateInput(stockTransfer.date || stockTransfer.dateUK),
          dateUK: toDateInput(stockTransfer.dateUK || stockTransfer.date),
          fromSiteId: stockTransfer.fromSiteId || currentSiteId || undefined,
          fromSubsiteId:
            stockTransfer.fromSubsiteId !== undefined ? stockTransfer.fromSubsiteId : currentSubsiteId || undefined,
          items: Array.isArray(stockTransfer.items) ? stockTransfer.items : [],
        })
        return
      }

      setTransferData((prev) => ({
        ...prev,
        fromSiteId: currentSiteId || undefined,
        fromSubsiteId: currentSubsiteId || undefined,
      }))
    }, [stockTransfer, mode, currentSiteId, currentSubsiteId])

    const fromLocationLabel = useMemo(() => {
      const site = sites.find((entry) => entry.id === (transferData.fromSiteId || currentSiteId))
      if (!site) return "Current site"
      const subsiteId = String(transferData.fromSubsiteId || currentSubsiteId || "")
      if (!subsiteId) return site.name
      const subsite = site.subsites.find((entry) => entry.id === subsiteId)
      return subsite ? `${site.name} / ${subsite.name}` : site.name
    }, [sites, transferData.fromSiteId, transferData.fromSubsiteId, currentSiteId, currentSubsiteId])

    const getMeasureName = (measureId: string) => {
      return String(measures.find((measure: any) => String(measure.id) === String(measureId))?.name || "")
    }

    const getAvailableMeasuresForProduct = (productId: string) => {
      const product: any = products.find((entry: any) => String(entry.id) === String(productId))
      const units = Array.isArray(product?.purchase?.units) ? product.purchase.units : []
      const ids = Array.from(
        new Set(units.map((unit: any) => String(unit?.measure || "")).filter(Boolean)),
      )

      if (!ids.length) return measures || []
      return (measures || []).filter((measure: any) => ids.includes(String(measure.id)))
    }

    const addTransferItem = () => {
      setTransferData((prev) => ({
        ...prev,
        items: [...(prev.items || []), createEmptyItem()],
      }))
    }

    const updateTransferItem = (index: number, changes: Partial<StockTransferItem>) => {
      setTransferData((prev) => {
        const items = [...(prev.items || [])]
        items[index] = { ...items[index], ...changes }
        return { ...prev, items }
      })
    }

    const removeTransferItem = (index: number) => {
      setTransferData((prev) => ({
        ...prev,
        items: (prev.items || []).filter((_, itemIndex) => itemIndex !== index),
      }))
    }

    const handleDestinationSiteChange = (siteId: string) => {
      setTransferData((prev) => ({
        ...prev,
        toSiteId: siteId,
        toSubsiteId: "",
      }))
    }

    const handleProductChange = (index: number, product: any) => {
      if (!product) {
        updateTransferItem(index, createEmptyItem())
        return
      }

      const availableMeasures = getAvailableMeasuresForProduct(String(product.id))
      const defaultMeasureId =
        String(product?.purchase?.defaultMeasure || product?.purchase?.measure || product?.measureId || "") ||
        String(availableMeasures?.[0]?.id || "")

      updateTransferItem(index, {
        productId: String(product.id),
        productName: String(product.name || ""),
        measureId: defaultMeasureId,
        unitName: defaultMeasureId ? getMeasureName(defaultMeasureId) : "",
      })
    }

    const handleMeasureChange = (index: number, measureId: string) => {
      updateTransferItem(index, {
        measureId,
        unitName: getMeasureName(measureId),
      })
    }

    const validate = () => {
      const errors: typeof validationErrors = {}

      if (!String(transferData.reference || "").trim()) {
        errors.reference = "Reference is required"
      }

      if (!String(transferData.toSiteId || "").trim()) {
        errors.toSiteId = "Destination site is required"
      }

      if (
        String(transferData.toSiteId || "") === currentSiteId &&
        String(transferData.toSubsiteId || "") === currentSubsiteId
      ) {
        errors.toSiteId = "Choose a different destination site/subsite"
      }

      const validItems = (transferData.items || []).filter((item) => {
        return String(item.productId || "").trim() && String(item.measureId || "").trim() && Number(item.quantity || 0) > 0
      })

      if (!validItems.length) {
        errors.items = "At least one item with a product, measure, and quantity is required"
      } else if (validItems.length !== (transferData.items || []).length) {
        errors.items = "Every line must include a product, measure, and quantity greater than 0"
      }

      setValidationErrors(errors)
      return { isValid: Object.keys(errors).length === 0, validItems }
    }

    const handleSubmit = (event?: React.FormEvent) => {
      if (event) event.preventDefault()

      const { isValid, validItems } = validate()
      if (!isValid) return

      onSave({
        ...transferData,
        date: transferData.dateUK || transferData.date || toDateInput(),
        dateUK: transferData.dateUK || transferData.date || toDateInput(),
        transferType: transferData.transferType || "sent",
        fromSiteId: transferData.fromSiteId || currentSiteId || undefined,
        fromSubsiteId:
          transferData.fromSubsiteId !== undefined ? transferData.fromSubsiteId : currentSubsiteId || undefined,
        items: validItems,
      })
    }

    useImperativeHandle(ref, () => ({
      submit: () => handleSubmit(),
      hasItems: () => (transferData.items || []).length > 0,
    }))

    const handleInputChange = (field: keyof StockTransfer, value: any) => {
      setTransferData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

    return (
      <Box
        sx={{
          width: "100%",
          maxWidth: 1100,
        }}
      >
        <form onSubmit={handleSubmit}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <LocationTreeSelect
                  label="Transfer To (Site / Subsite)"
                  sites={sites}
                  value={{ siteId: String(transferData.toSiteId || ""), subsiteId: String(transferData.toSubsiteId || "") }}
                  onChange={(next) => {
                    handleDestinationSiteChange(String(next.siteId || ""))
                    handleInputChange("toSubsiteId", String(next.subsiteId || ""))
                  }}
                  disabled={isReadOnly || (!!transferData.id && mode !== "create")}
                  error={!!validationErrors.toSiteId}
                  helperText={validationErrors.toSiteId}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  id="stock-transfer-reference"
                  name="reference"
                  fullWidth
                  label="Reference"
                  value={transferData.reference || ""}
                  onChange={(e) => handleInputChange("reference", e.target.value)}
                  error={!!validationErrors.reference}
                  helperText={validationErrors.reference}
                  disabled={isReadOnly}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  id="stock-transfer-date"
                  name="date"
                  fullWidth
                  label="Transfer Date"
                  type="date"
                  value={transferData.dateUK || transferData.date || ""}
                  onChange={(e) => {
                    handleInputChange("dateUK", e.target.value)
                    handleInputChange("date", e.target.value)
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={isReadOnly}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="stock-transfer-status-label" component="span">
                    Status
                  </InputLabel>
                  <Select
                    id="stock-transfer-status"
                    name="status"
                    labelId="stock-transfer-status-label"
                    value={transferData.status || "Awaiting Submission"}
                    label="Status"
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    disabled={isReadOnly}
                  >
                    <MenuItem value="Awaiting Submission">Awaiting Submission</MenuItem>
                    <MenuItem value="Awaiting Approval">Awaiting Approval</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  id="stock-transfer-from-location"
                  name="fromLocationDisplay"
                  fullWidth
                  label="From Location"
                  value={fromLocationLabel}
                  disabled
                  inputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  id="stock-transfer-description"
                  name="description"
                  fullWidth
                  label="Description"
                  value={transferData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  disabled={isReadOnly}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  id="stock-transfer-notes"
                  name="notes"
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={transferData.notes || ""}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  disabled={isReadOnly}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />

                {validationErrors.items && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {validationErrors.items}
                  </Alert>
                )}

                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    overflowX: "auto",
                    maxHeight: { xs: "400px", sm: "500px", md: "600px" },
                    width: "100%",
                  }}
                >
                <Table
                  size="small"
                  sx={{
                    tableLayout: "auto",
                      width: "100%",
                      minWidth: 820,
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}>Product</TableCell>
                      <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}>Measure</TableCell>
                      <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}>Quantity</TableCell>
                      {!isReadOnly && (
                        <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}>Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(transferData.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isReadOnly ? 3 : 4} sx={{ textAlign: "center", py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            No transfer items added yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (transferData.items || []).map((item, index) => (
                        <TableRow key={`${item.productId || "new"}-${index}`}>
                          <TableCell
                            sx={{
                              textAlign: "center",
                              width: "auto",
                              minWidth: "fit-content",
                              maxWidth: "none",
                              overflow: "visible",
                              padding: "8px",
                            }}
                          >
                            <Autocomplete
                              size="small"
                              options={products || []}
                              getOptionLabel={(option: any) => option?.name || ""}
                              isOptionEqualToValue={(option: any, value: any) => String(option?.id) === String(value?.id)}
                              value={(products || []).find((product: any) => String(product.id) === String(item.productId)) || null}
                              onChange={(_, newValue: any) => handleProductChange(index, newValue)}
                              disabled={isReadOnly}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  id={`stock-transfer-item-${index}-product`}
                                  name={`stock-transfer-item-${index}-product`}
                                  placeholder="Select product"
                                  inputProps={{
                                    ...params.inputProps,
                                    name: `stock-transfer-item-${index}-product`,
                                  }}
                                />
                              )}
                              sx={{ width: "100%", minWidth: "220px" }}
                            />
                          </TableCell>

                          <TableCell sx={{ textAlign: "center" }}>
                            <FormControl size="small" fullWidth sx={{ minWidth: "180px" }}>
                              <Select
                                id={`stock-transfer-item-${index}-measure`}
                                name={`stock-transfer-item-${index}-measure`}
                                value={item.measureId || ""}
                                onChange={(e) => handleMeasureChange(index, String(e.target.value || ""))}
                                disabled={isReadOnly || !item.productId}
                                displayEmpty
                                inputProps={{ "aria-label": "Measure" }}
                              >
                                <MenuItem value="" disabled>
                                  Select measure
                                </MenuItem>
                                {getAvailableMeasuresForProduct(item.productId).map((measure: any) => (
                                  <MenuItem key={String(measure.id)} value={String(measure.id)}>
                                    {String(measure.name || measure.id)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>

                          <TableCell sx={{ textAlign: "center", minWidth: "140px" }}>
                            <TextField
                              id={`stock-transfer-item-${index}-quantity`}
                              name={`stock-transfer-item-${index}-quantity`}
                              size="small"
                              type="number"
                              value={item.quantity || ""}
                              onChange={(e) => updateTransferItem(index, { quantity: Math.max(0, Number(e.target.value || 0)) })}
                              disabled={isReadOnly}
                              inputProps={{ min: 0, step: "0.01" }}
                              sx={{ width: "120px" }}
                            />
                            {!!item.unitName && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                {item.unitName}
                              </Typography>
                            )}
                          </TableCell>

                          {!isReadOnly && (
                            <TableCell sx={{ textAlign: "center" }}>
                              <IconButton color="error" onClick={() => removeTransferItem(index)} size="small">
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {!isReadOnly && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={addTransferItem}>
                    Add Item
                  </Button>
                </Box>
              )}
            </Grid>
            </Grid>
          </Paper>
        </form>
      </Box>
    )
  },
)

StockTransferForm.displayName = "StockTransferForm"

export default StockTransferForm
