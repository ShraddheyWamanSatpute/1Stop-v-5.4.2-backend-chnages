"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Card,
  CardContent,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { Save as SaveIcon } from "@mui/icons-material"
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"

const toISODateLocal = (d: Date) => format(d, "yyyy-MM-dd")

const Forecasting: React.FC = () => {
  const { state: financeState, refreshDailyForecasts, upsertDailyForecast, deleteDailyForecast } = useFinance()
  const { canEdit } = usePermission()
  const canMutate = canEdit("finance", "forecasting")

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [customEndDate, setCustomEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const [draftByDate, setDraftByDate] = useState<Record<string, { amount: string; notes: string }>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if ((financeState.dailyForecasts?.length || 0) === 0 && !financeState.loading) {
      refreshDailyForecasts().catch(() => {})
    }
  }, [financeState.dailyForecasts?.length, financeState.loading, refreshDailyForecasts])

  // When company/site/subsite changes, FinanceContext updates `basePath`.
  // Force a refresh so we don't keep showing stale forecasts until remount.
  useEffect(() => {
    if (!financeState.basePath) return
    setDraftByDate({})
    refreshDailyForecasts().catch(() => {})
  }, [financeState.basePath, refreshDailyForecasts])

  const forecastsByDate = useMemo(() => {
    const map = new Map<string, any>()
    ;(financeState.dailyForecasts || []).forEach((f: any) => {
      if (!f?.date) return
      if (!map.has(f.date)) map.set(f.date, f)
    })
    return map
  }, [financeState.dailyForecasts])

  const interval = useMemo(() => {
    const d = currentDate || new Date()
    switch (dateType) {
      case "day":
        return { start: d, end: d }
      case "week":
        return {
          start: startOfWeek(d, { weekStartsOn: 1 }),
          end: endOfWeek(d, { weekStartsOn: 1 }),
        }
      case "month":
        return {
          start: startOfMonth(d),
          end: endOfMonth(d),
        }
      case "custom": {
        const from = customStartDate <= customEndDate ? customStartDate : customEndDate
        const to = customStartDate <= customEndDate ? customEndDate : customStartDate
        return { start: from, end: to }
      }
      default:
        return { start: d, end: d }
    }
  }, [currentDate, customEndDate, customStartDate, dateType])

  const days = useMemo(() => {
    return eachDayOfInterval(interval).map((d) => toISODateLocal(d))
  }, [interval])

  const total = useMemo(() => {
    return days.reduce((sum, date) => {
      const existing = forecastsByDate.get(date)
      const amountStr = draftByDate[date]?.amount ?? (existing?.amount != null ? String(existing.amount) : "")
      const n = Number.parseFloat(amountStr)
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
  }, [days, draftByDate, forecastsByDate])

  const onChangeAmount = (date: string, amount: string) => {
    setDraftByDate((prev) => ({
      ...prev,
      [date]: {
        amount,
        notes: prev[date]?.notes ?? (forecastsByDate.get(date)?.notes || ""),
      },
    }))
  }

  const onChangeNotes = (date: string, notes: string) => {
    setDraftByDate((prev) => ({
      ...prev,
      [date]: {
        amount: prev[date]?.amount ?? (forecastsByDate.get(date)?.amount != null ? String(forecastsByDate.get(date)?.amount) : ""),
        notes,
      },
    }))
  }

  const handleSaveAll = async () => {
    if (!canMutate) return
    setSaving(true)
    try {
      for (const date of days) {
        const existing = forecastsByDate.get(date)
        const draft = draftByDate[date]

        // No edits for this day -> skip
        if (!draft) continue

        const amountTrimmed = (draft.amount ?? "").trim()
        const notesTrimmed = (draft.notes ?? "").trim()

        if (amountTrimmed === "") {
          if (existing?.id) {
            await deleteDailyForecast(existing.id)
          }
          continue
        }

        const amountNum = Number.parseFloat(amountTrimmed)
        if (!Number.isFinite(amountNum)) {
          // Skip invalid values (leave in UI for correction)
          continue
        }

        const existingAmount = typeof existing?.amount === "number" ? existing.amount : undefined
        const existingNotes = typeof existing?.notes === "string" ? existing.notes : ""

        const isNoop =
          existing &&
          existingAmount === amountNum &&
          (existingNotes || "") === (notesTrimmed || "")

        if (isNoop) continue

        await upsertDailyForecast({
          id: existing?.id,
          date,
          amount: amountNum,
          notes: notesTrimmed || undefined,
          entity_id: existing?.entity_id,
        })
      }

      setDraftByDate({})
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ width: "100%" }}>
      {financeState.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {financeState.error}
        </Alert>
      )}

      {!canMutate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to forecasting.
        </Alert>
      )}

      <DataHeader
        showDateControls
        showDateTypeSelector
        availableDateTypes={["day", "week", "month", "custom"]}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => {
          setCustomStartDate(start)
          setCustomEndDate(end)
        }}
        singleRow
        additionalControls={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ color: "white", ml: 1, fontWeight: 600 }}>
              Total: £{total.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        }
        additionalButtons={[
          {
            label: saving ? "Saving..." : "Save",
            icon: <SaveIcon />,
            onClick: handleSaveAll,
            variant: "contained",
            disabled: !canMutate || saving,
            tooltip: !canMutate ? "You don't have permission to edit forecasts." : undefined,
          },
        ]}
      />

      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 140 }}>Date</TableCell>
                  <TableCell sx={{ width: 120 }}>Day</TableCell>
                  <TableCell sx={{ width: 200 }}>Forecast (£)</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {days.map((date) => {
                  const existing = forecastsByDate.get(date)
                  const amountValue = draftByDate[date]?.amount ?? (existing?.amount != null ? String(existing.amount) : "")
                  const notesValue = draftByDate[date]?.notes ?? (existing?.notes || "")
                  const dayLabel = format(parseISO(date), "EEE")

                  return (
                    <TableRow key={date} hover>
                      <TableCell>{format(parseISO(date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{dayLabel}</TableCell>
                      <TableCell>
                        <TextField
                          value={amountValue}
                          onChange={(e) => onChangeAmount(date, e.target.value)}
                          size="small"
                          disabled={!canMutate}
                          placeholder="0.00"
                          inputProps={{ inputMode: "decimal" }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">£</InputAdornment>,
                          }}
                          sx={{ width: 180 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={notesValue}
                          onChange={(e) => onChangeNotes(date, e.target.value)}
                          size="small"
                          disabled={!canMutate}
                          placeholder="Optional notes…"
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Forecasting

