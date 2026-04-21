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
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  DirectionsWalk as WalkInIcon,
  Payment as PaymentIcon,
  Restaurant as RestaurantIcon,
  Source as SourceIcon,
  People as PeopleIcon,
  EventAvailable as EventAvailableIcon,
  Cancel as CancelIcon,
  Event as EventIcon,
} from "@mui/icons-material"

// Import all report components
import BookingsSummaryReport from "./BookingsSummaryReport"
import BookingVelocityReport from "./BookingVelocityReport"
import WalkInLiveBookingsReport from "./WalkInLiveBookingsReport"
import PaymentsDepositsReport from "./PaymentsDepositsReport"
import PreordersPackagesReport from "./PreordersPackagesReport"
import SourceConversionReport from "./SourceConversionReport"
import StaffPerformanceReport from "./StaffPerformanceReport"
import ForecastAvailabilityReport from "./ForecastAvailabilityReport"
import CancellationsNoShowReport from "./CancellationsNoShowReport"
import EventPromotionPerformanceReport from "./EventPromotionPerformanceReport"
import type { BookingsReportProps } from "./reportTypes"

const BookingsReportsDashboard: React.FC = () => {
  type ReportKey =
    | "bookings-summary"
    | "booking-velocity"
    | "walkin-live"
    | "payments-deposits"
    | "preorders-packages"
    | "source-conversion"
    | "staff-performance"
    | "forecast-availability"
    | "cancellations-noshow"
    | "event-promotion"

  const [selectedReport, setSelectedReport] = useState<ReportKey>("bookings-summary")

  const reportOptions: { key: ReportKey; label: string; icon: React.ReactNode }[] = [
    { key: "bookings-summary", label: "Bookings Summary", icon: <AssessmentIcon /> },
    { key: "booking-velocity", label: "Booking Velocity", icon: <TrendingUpIcon /> },
    { key: "walkin-live", label: "Walk-in & Live", icon: <WalkInIcon /> },
    { key: "payments-deposits", label: "Payments & Deposits", icon: <PaymentIcon /> },
    { key: "preorders-packages", label: "Preorders & Packages", icon: <RestaurantIcon /> },
    { key: "source-conversion", label: "Source & Conversion", icon: <SourceIcon /> },
    { key: "staff-performance", label: "Staff Performance", icon: <PeopleIcon /> },
    { key: "forecast-availability", label: "Forecast & Availability", icon: <EventAvailableIcon /> },
    { key: "cancellations-noshow", label: "Cancellations & No-shows", icon: <CancelIcon /> },
    { key: "event-promotion", label: "Event & Promotion", icon: <EventIcon /> },
  ]

  const headerControls: BookingsReportProps["headerControls"] = (
    <FormControl size="small" sx={{ minWidth: 240, ml: 1 }}>
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

  const reportProps: BookingsReportProps = { headerControls }

  return (
    <Box sx={{ width: "100%" }}>
      {selectedReport === "bookings-summary" && <BookingsSummaryReport {...reportProps} />}
      {selectedReport === "booking-velocity" && <BookingVelocityReport {...reportProps} />}
      {selectedReport === "walkin-live" && <WalkInLiveBookingsReport {...reportProps} />}
      {selectedReport === "payments-deposits" && <PaymentsDepositsReport {...reportProps} />}
      {selectedReport === "preorders-packages" && <PreordersPackagesReport {...reportProps} />}
      {selectedReport === "source-conversion" && <SourceConversionReport {...reportProps} />}
      {selectedReport === "staff-performance" && <StaffPerformanceReport {...reportProps} />}
      {selectedReport === "forecast-availability" && <ForecastAvailabilityReport {...reportProps} />}
      {selectedReport === "cancellations-noshow" && <CancellationsNoShowReport {...reportProps} />}
      {selectedReport === "event-promotion" && <EventPromotionPerformanceReport {...reportProps} />}
    </Box>
  )
}

export default BookingsReportsDashboard

