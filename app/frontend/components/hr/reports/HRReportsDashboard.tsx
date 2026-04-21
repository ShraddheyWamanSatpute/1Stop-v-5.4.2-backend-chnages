"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useState } from "react"
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material"
import type { SelectChangeEvent } from "@mui/material/Select"
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  ExitToApp as ExitIcon,
  ChangeCircle as ChangeIcon,
  Description as DocumentIcon,
  EventBusy as AbsenceIcon,
  BeachAccess as HolidayIcon,
  LocalHospital as SickIcon,
  VerifiedUser as RightToWorkIcon,
  CardTravel as VisaIcon,
  School as StudentIcon,
  AccountBalance as HMRCIcon,
} from "@mui/icons-material"

import EmployeeDirectoryReport from "./EmployeeDirectoryReport"
import NewStarterFormReport from "./NewStarterFormReport"
import LeaverFormReport from "./LeaverFormReport"
import EmployeeChangesReport from "./EmployeeChangesReport"
import EmployeeDocumentationTrackerReport from "./EmployeeDocumentationTrackerReport"
import AbsenceSummaryReport from "./AbsenceSummaryReport"
import HolidayEntitlementReport from "./HolidayEntitlementReport"
import SicknessLogReport from "./SicknessLogReport"
import RightToWorkExpiryReport from "./RightToWorkExpiryReport"
import VisaStatusReport from "./VisaStatusReport"
import StudentVisaHoursMonitorReport from "./StudentVisaHoursMonitorReport"
import HMRCSubmissionHistoryReport from "./HMRCSubmissionHistoryReport"
import type { HRReportProps } from "./reportTypes"

const HRReportsDashboard: React.FC = () => {
  type ReportKey =
    | "employee-directory"
    | "new-starters"
    | "leavers"
    | "employee-changes"
    | "documentation"
    | "absence-summary"
    | "holiday-entitlement"
    | "sickness-log"
    | "right-to-work"
    | "visa-status"
    | "student-visa-hours"
    | "hmrc-submissions"

  const [selectedReport, setSelectedReport] = useState<ReportKey>("employee-directory")

  const reportOptions: { key: ReportKey; label: string; icon: React.ReactNode }[] = [
    { key: "employee-directory", label: "Employee Directory", icon: <PeopleIcon /> },
    { key: "new-starters", label: "New Starters", icon: <PersonAddIcon /> },
    { key: "leavers", label: "Leavers", icon: <ExitIcon /> },
    { key: "employee-changes", label: "Employee Changes", icon: <ChangeIcon /> },
    { key: "documentation", label: "Documentation", icon: <DocumentIcon /> },
    { key: "absence-summary", label: "Absence Summary", icon: <AbsenceIcon /> },
    { key: "holiday-entitlement", label: "Holiday Entitlement", icon: <HolidayIcon /> },
    { key: "sickness-log", label: "Sickness Log", icon: <SickIcon /> },
    { key: "right-to-work", label: "Right to Work", icon: <RightToWorkIcon /> },
    { key: "visa-status", label: "Visa Status", icon: <VisaIcon /> },
    { key: "student-visa-hours", label: "Student Visa Hours", icon: <StudentIcon /> },
    { key: "hmrc-submissions", label: "HMRC Submissions", icon: <HMRCIcon /> },
  ]

  const headerControls: HRReportProps["headerControls"] = (
    <FormControl size="small" sx={{ minWidth: 220, ml: 1 }}>
      <InputLabel sx={{ color: "white" }}>Report</InputLabel>
      <Select
        value={selectedReport}
        onChange={(e: SelectChangeEvent) => setSelectedReport(e.target.value as ReportKey)}
        label="Report"
        sx={{
          color: "white",
          "& .MuiSvgIcon-root": { color: "white" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(themeConfig.brandColors.offWhite, 0.85) },
        }}
        MenuProps={{
          PaperProps: { sx: { mt: 1 } },
        }}
      >
        {reportOptions.map((opt) => (
          <MenuItem key={opt.key} value={opt.key}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {opt.icon}
              {opt.label}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )

  const reportProps: HRReportProps = { headerControls }

  return (
    <Box sx={{ width: "100%" }}>
      {selectedReport === "employee-directory" && <EmployeeDirectoryReport {...reportProps} />}
      {selectedReport === "new-starters" && <NewStarterFormReport {...reportProps} />}
      {selectedReport === "leavers" && <LeaverFormReport {...reportProps} />}
      {selectedReport === "employee-changes" && <EmployeeChangesReport {...reportProps} />}
      {selectedReport === "documentation" && <EmployeeDocumentationTrackerReport {...reportProps} />}
      {selectedReport === "absence-summary" && <AbsenceSummaryReport {...reportProps} />}
      {selectedReport === "holiday-entitlement" && <HolidayEntitlementReport {...reportProps} />}
      {selectedReport === "sickness-log" && <SicknessLogReport {...reportProps} />}
      {selectedReport === "right-to-work" && <RightToWorkExpiryReport {...reportProps} />}
      {selectedReport === "visa-status" && <VisaStatusReport {...reportProps} />}
      {selectedReport === "student-visa-hours" && <StudentVisaHoursMonitorReport {...reportProps} />}
      {selectedReport === "hmrc-submissions" && <HMRCSubmissionHistoryReport {...reportProps} />}
    </Box>
  )
}

export default HRReportsDashboard

