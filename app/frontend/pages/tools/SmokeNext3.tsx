"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Box, Button, Card, CardContent, Divider, Typography } from "@mui/material"
import { themeConfig } from "../../../theme/AppTheme"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useMessenger } from "../../../backend/context/MessengerContext"
import { useBookings } from "../../../backend/context/BookingsContext"
import { usePOS } from "../../../backend/context/POSContext"

type StepResult = { name: string; ok: boolean; details?: string }

const tick = () => new Promise<void>((r) => setTimeout(() => r(), 0))

const SmokeNext3: React.FC = () => {
  const { state: companyState } = useCompany()
  const settings = useSettings()
  const messenger = useMessenger()
  const bookings = useBookings()
  const pos = usePOS()

  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<StepResult[]>([])

  const chatsRef = useRef<any[]>([])
  const bookingsRef = useRef<any[]>([])
  const paymentTypesRef = useRef<any[]>([])

  useEffect(() => {
    chatsRef.current = (messenger.state as any)?.chats || []
  }, [messenger.state])

  useEffect(() => {
    bookingsRef.current = (bookings as any)?.bookings || []
  }, [bookings.bookings])

  useEffect(() => {
    paymentTypesRef.current = (pos.state as any)?.paymentTypes || []
  }, [pos.state])

  const canRun = useMemo(() => Boolean(companyState.companyID), [companyState.companyID])

  const pushResult = useCallback((r: StepResult) => setResults((prev) => [...prev, r]), [])

  const run = useCallback(async () => {
    if (!companyState.companyID) return
    const uid = (settings.state as any)?.auth?.uid as string | null

    setRunning(true)
    setResults([])

    const runId = `${Date.now()}`

    try {
      // ======================
      // Messenger: create chat -> refresh -> delete -> refresh
      // ======================
      try {
        if (!uid) throw new Error("Missing auth uid")

        const chatName = `Smoke Chat ${runId}`
        const chatId = await messenger.createChat(chatName, [uid], "direct")
        if (!chatId) throw new Error("createChat returned null")

        await messenger.refreshChats(true)
        await tick()
        const existsAfterCreate = (chatsRef.current || []).some((c: any) => String(c?.id || "") === String(chatId))

        await messenger.deleteChat(chatId)
        await messenger.refreshChats(true)
        await tick()
        const existsAfterDelete = (chatsRef.current || []).some((c: any) => String(c?.id || "") === String(chatId))

        pushResult({
          name: "Messenger: create + refresh + delete + refresh (chat)",
          ok: existsAfterCreate && !existsAfterDelete,
          details: `afterCreate=${existsAfterCreate} afterDelete=${existsAfterDelete} chatId=${chatId}`,
        })
      } catch (e: any) {
        pushResult({ name: "Messenger: create + refresh + delete + refresh (chat)", ok: false, details: String(e?.message || e) })
      }

      // ======================
      // Bookings: create booking -> fetch -> delete -> fetch
      // ======================
      try {
        const today = new Date().toISOString().split("T")[0]
        const now = new Date()
        const hh = String(now.getHours()).padStart(2, "0")
        const mm = String(now.getMinutes()).padStart(2, "0")
        const startTime = `${hh}:${mm}`

        // End time +60 mins
        const endD = new Date(now.getTime() + 60 * 60 * 1000)
        const eh = String(endD.getHours()).padStart(2, "0")
        const em = String(endD.getMinutes()).padStart(2, "0")
        const endTime = `${eh}:${em}`

        const created = await bookings.addBooking({
          totalAmount: 0,
          guestCount: 2,
          firstName: "Smoke",
          lastName: `Test ${runId}`,
          email: `smoke+${runId}@example.com`,
          phone: "0000000000",
          date: today,
          arrivalTime: startTime,
          guests: 2,
          startTime,
          endTime,
          covers: 2,
          status: "Booked",
        } as any)

        const bookingId = String((created as any)?.id || "")
        if (!bookingId) throw new Error("addBooking did not return an id")

        await bookings.fetchBookings()
        await tick()
        const existsAfterCreate = (bookingsRef.current || []).some((b: any) => String(b?.id || "") === bookingId)

        await bookings.deleteBooking(bookingId)
        await bookings.fetchBookings()
        await tick()
        const existsAfterDelete = (bookingsRef.current || []).some((b: any) => String(b?.id || "") === bookingId)

        pushResult({
          name: "Bookings: create + fetch + delete + fetch (booking)",
          ok: existsAfterCreate && !existsAfterDelete,
          details: `afterCreate=${existsAfterCreate} afterDelete=${existsAfterDelete} id=${bookingId} basePath=${(bookings as any).basePath || ""}`,
        })
      } catch (e: any) {
        pushResult({ name: "Bookings: create + fetch + delete + fetch (booking)", ok: false, details: String(e?.message || e) })
      }

      // ======================
      // POS: create payment type -> refresh -> delete -> refresh
      // ======================
      try {
        const ptName = `Smoke Payment ${runId}`
        const created = await pos.createPaymentType({
          name: ptName,
          type: "other",
          isActive: true,
          requiresAuth: false,
          processingFee: 0,
        } as any)

        const paymentTypeId = String((created as any)?.id || "")
        if (!paymentTypeId) throw new Error("createPaymentType did not return an id")

        await pos.refreshPaymentTypes()
        await tick()
        const existsAfterCreate = (paymentTypesRef.current || []).some((p: any) => String(p?.id || "") === paymentTypeId)

        await pos.deletePaymentType(paymentTypeId)
        await pos.refreshPaymentTypes()
        await tick()
        const existsAfterDelete = (paymentTypesRef.current || []).some((p: any) => String(p?.id || "") === paymentTypeId)

        pushResult({
          name: "POS: create + refresh + delete + refresh (payment type)",
          ok: existsAfterCreate && !existsAfterDelete,
          details: `afterCreate=${existsAfterCreate} afterDelete=${existsAfterDelete} id=${paymentTypeId} path=${pos.paymentsPath}`,
        })
      } catch (e: any) {
        pushResult({ name: "POS: create + refresh + delete + refresh (payment type)", ok: false, details: String(e?.message || e) })
      }
    } finally {
      setRunning(false)
    }
  }, [bookings, companyState.companyID, messenger, pos, pushResult, settings.state])

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Smoke Test: Messenger + Bookings + POS
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Runs create/refresh/delete checks for the next 3 modules. Writes temporary records and removes them.
      </Typography>

      <Card sx={{ mb: 2, border: `1px solid ${themeConfig.brandColors.navy}` }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Current selection
          </Typography>
          <Typography variant="body2">CompanyID: {companyState.companyID || "—"}</Typography>
          <Typography variant="body2">SiteID: {companyState.selectedSiteID || "—"}</Typography>
          <Typography variant="body2">SubsiteID: {companyState.selectedSubsiteID || "—"}</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Button
            variant="contained"
            disabled={!canRun || running}
            onClick={run}
            sx={{
              bgcolor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
              "&:hover": { bgcolor: themeConfig.brandColors.navy },
            }}
          >
            {running ? "Running..." : "Run smoke tests"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Results
          </Typography>
          {results.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No results yet.
            </Typography>
          ) : (
            results.map((r, idx) => (
              <Box key={`${idx}-${r.name}`} sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: r.ok ? "success.main" : "error.main" }}>
                  {r.ok ? "PASS" : "FAIL"} — {r.name}
                </Typography>
                {r.details ? (
                  <Typography variant="caption" color="text.secondary">
                    {r.details}
                  </Typography>
                ) : null}
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default SmokeNext3

