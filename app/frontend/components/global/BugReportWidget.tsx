"use client"

import React, { useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { db, push, ref, set } from "../../../backend/services/Firebase"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import ReusableModal from "../reusable/ReusableModal"
import {
  BUG_REPORTS_ADMIN_PATH,
  type BugReportRecord,
  type BugReportSeverity,
} from "../../../backend/shared/BugReports"

interface BugReportWidgetProps {
  open: boolean
  onClose: () => void
}

const initialForm = {
  title: "",
  area: "",
  severity: "medium" as BugReportSeverity,
  description: "",
  stepsToReproduce: "",
  expectedResult: "",
  actualResult: "",
}

const BugReportWidget: React.FC<BugReportWidgetProps> = ({ open, onClose }) => {
  const { state: settingsState } = useSettings()
  const { state: companyState } = useCompany()

  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const reporterName = useMemo(() => {
    const firstName = settingsState.settings?.personal?.firstName || (settingsState.user as any)?.firstName || ""
    const lastName = settingsState.settings?.personal?.lastName || (settingsState.user as any)?.lastName || ""
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || settingsState.user?.displayName || settingsState.auth.displayName || "Unknown user"
  }, [
    settingsState.settings?.personal?.firstName,
    settingsState.settings?.personal?.lastName,
    settingsState.user,
    settingsState.auth.displayName,
  ])

  const locationInfo = useMemo(() => {
    const activeCompany: any = companyState.company || {}
    const companyId =
      companyState.companyID ||
      settingsState.user?.currentCompanyID ||
      settingsState.user?.companies?.find((company) => company.isDefault)?.companyID ||
      undefined

    const companyName =
      activeCompany.companyName ||
      activeCompany.name ||
      settingsState.user?.companies?.find((company) => company.companyID === companyId)?.companyName ||
      undefined

    const siteId = companyState.selectedSiteID || undefined
    const siteName =
      (companyState.sites || []).find((site: any) => String(site?.siteID || site?.id || "") === String(siteId || ""))?.name ||
      (companyState.sites || []).find((site: any) => String(site?.siteID || site?.id || "") === String(siteId || ""))?.siteName ||
      undefined

    const subsiteId = companyState.selectedSubsiteID || undefined
    const selectedSite: any = (companyState.sites || []).find(
      (site: any) => String(site?.siteID || site?.id || "") === String(siteId || ""),
    )
    const subsiteRecord = selectedSite?.subsites?.[String(subsiteId || "")]
    const subsiteName = subsiteRecord?.name || subsiteRecord?.subsiteName || undefined

    return { companyId, companyName, siteId, siteName, subsiteId, subsiteName }
  }, [
    companyState.company,
    companyState.companyID,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    companyState.sites,
    settingsState.user,
  ])

  const handleFieldChange = (field: keyof typeof initialForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    if (error) setError(null)
  }

  const resetState = () => {
    setForm(initialForm)
    setError(null)
    setSuccessMessage(null)
    setSubmitting(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Please add a short bug title.")
      return
    }
    if (!form.description.trim()) {
      setError("Please describe the bug before submitting.")
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const createdAt = Date.now()
      const { companyId, companyName, siteId, siteName, subsiteId, subsiteName } = locationInfo

      const reportsRoot = companyId ? `companies/${companyId}/bugReports` : "bugReports"
      const newReportRef = push(ref(db, reportsRoot))
      const reportId = newReportRef.key || `report-${createdAt}`

      const payload: BugReportRecord = {
        id: reportId,
        title: form.title.trim(),
        area: form.area.trim() || undefined,
        severity: form.severity,
        description: form.description.trim(),
        stepsToReproduce: form.stepsToReproduce.trim() || undefined,
        expectedResult: form.expectedResult.trim() || undefined,
        actualResult: form.actualResult.trim() || undefined,
        status: "new",
        createdAt,
        updatedAt: createdAt,
        source: "app",
        pagePath: typeof window !== "undefined" ? window.location.pathname : undefined,
        companyId,
        companyName,
        siteId,
        siteName,
        subsiteId,
        subsiteName,
        reportedByUid: settingsState.auth.uid || undefined,
        reportedByName: reporterName,
        reportedByEmail: settingsState.auth.email || settingsState.user?.email || undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }

      await set(newReportRef, payload)

      try {
        await set(ref(db, `${BUG_REPORTS_ADMIN_PATH}/${reportId}`), payload)
      } catch {
        // Best-effort mirror for admin convenience. Company-scoped copy remains the source of truth.
      }

      setSuccessMessage("Bug report submitted. The admin team can review it in Reports.")
      setForm(initialForm)
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to submit bug report.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ReusableModal
      open={open}
      onClose={handleClose}
      title="Report Bug"
      initialSize={{ width: 640, height: 760 }}
      minSize={{ width: 420, height: 560 }}
      maxSize={{ width: 980, height: 900 }}
      centerOnOpen={true}
      resizable={true}
      draggable={true}
      showMinimizeButton={true}
    >
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2.25 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip
            size="small"
            variant="outlined"
            label={`Company: ${locationInfo.companyName || "Unknown"}`}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`Site: ${locationInfo.siteName || "None"}`}
          />
          {locationInfo.subsiteId ? (
            <Chip
              size="small"
              variant="outlined"
              label={`Subsite: ${locationInfo.subsiteName || "Unknown"}`}
            />
          ) : null}
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <Stack spacing={2}>
          <TextField
            label="Bug Title"
            id="bug-report-title"
            name="title"
            autoComplete="off"
            value={form.title}
            onChange={(event) => handleFieldChange("title", event.target.value)}
            placeholder="Short summary of the issue"
            fullWidth
            required
          />

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 180px" } }}>
            <TextField
              label="Area"
              id="bug-report-area"
              name="area"
              autoComplete="off"
              value={form.area}
              onChange={(event) => handleFieldChange("area", event.target.value)}
              placeholder="Stock, HR, Bookings, sidebar, etc."
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="bug-report-severity-label" component="span">
                Severity
              </InputLabel>
              <Select
                name="severity"
                labelId="bug-report-severity-label"
                label="Severity"
                autoComplete="off"
                value={form.severity}
                onChange={(event) => handleFieldChange("severity", String(event.target.value))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="What Happened?"
            id="bug-report-description"
            name="description"
            autoComplete="off"
            value={form.description}
            onChange={(event) => handleFieldChange("description", event.target.value)}
            multiline
            minRows={4}
            fullWidth
            required
          />

          <TextField
            label="Steps To Reproduce"
            id="bug-report-steps"
            name="stepsToReproduce"
            autoComplete="off"
            value={form.stepsToReproduce}
            onChange={(event) => handleFieldChange("stepsToReproduce", event.target.value)}
            multiline
            minRows={3}
            fullWidth
            placeholder="1. Open page... 2. Click... 3. See error..."
          />

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <TextField
              label="Expected Result"
              id="bug-report-expected"
              name="expectedResult"
              autoComplete="off"
              value={form.expectedResult}
              onChange={(event) => handleFieldChange("expectedResult", event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Actual Result"
              id="bug-report-actual"
              name="actualResult"
              autoComplete="off"
              value={form.actualResult}
              onChange={(event) => handleFieldChange("actualResult", event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Box>
        </Stack>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            mt: "auto",
          }}
        >
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ minWidth: 200 }}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </Box>
      </Box>
    </ReusableModal>
  )
}

export default BugReportWidget
