"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Box, Button, Card, CardContent, Divider, Typography } from "@mui/material"
import { themeConfig } from "../../../theme/AppTheme"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useHR } from "../../../backend/context/HRContext"
import { useFinance } from "../../../backend/context/FinanceContext"
import { db, ref, set, remove } from "../../../backend/services/Firebase"

type StepResult = { name: string; ok: boolean; details?: string }

const SmokeTop3: React.FC = () => {
  const { state: companyState, getBasePath } = useCompany()
  const hr = useHR()
  const finance = useFinance()

  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<StepResult[]>([])

  // Keep "latest" context state available inside the async run() callback.
  // Without this, checks can read stale state because context updates land on the next render.
  const hrEmployeesRef = useRef<any[]>([])
  const financeContactsRef = useRef<any[]>([])
  const financeBillsRef = useRef<any[]>([])

  useEffect(() => {
    hrEmployeesRef.current = (hr.state as any)?.employees || []
  }, [hr.state])

  useEffect(() => {
    financeContactsRef.current = (finance.state as any)?.contacts || []
    financeBillsRef.current = (finance.state as any)?.bills || []
  }, [finance.state])

  const canRun = useMemo(() => Boolean(companyState.companyID), [companyState.companyID])

  const pushResult = useCallback((r: StepResult) => {
    setResults((prev) => [...prev, r])
  }, [])

  const run = useCallback(async () => {
    if (!companyState.companyID) return

    setRunning(true)
    setResults([])

    const runId = `${Date.now()}`

    try {
      // ======================
      // Company: base path + RTDB write/delete sanity
      // ======================
      const companyRoot = `companies/${companyState.companyID}`
      const companySmokePath = `${companyRoot}/__smoke/company/${runId}`
      try {
        await set(ref(db, companySmokePath), { createdAt: Date.now(), runId, ok: true })
        await remove(ref(db, companySmokePath))
        pushResult({ name: "Company: write + delete under companies/<id>/__smoke", ok: true })
      } catch (e: any) {
        pushResult({ name: "Company: write + delete under companies/<id>/__smoke", ok: false, details: String(e?.message || e) })
      }

      // ======================
      // HR: create -> refresh -> delete -> refresh
      // ======================
      try {
        // Prefer HRContext's resolved basePath (includes subsite when applicable).
        const hrDataPath =
          String((hr.state as any)?.basePath || "") ||
          (getBasePath("hr") ? `${getBasePath("hr")}/data/hr` : "")
        const employeeId = `smoke_emp_${runId}`
        const employeePath = `${hrDataPath}/employees/${employeeId}`

        if (!hrDataPath) throw new Error("HR base path is empty")

        await set(ref(db, employeePath), {
          id: employeeId,
          employeeID: employeeId,
          firstName: "Smoke",
          lastName: `Test ${runId}`,
          email: `smoke+${runId}@example.com`,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Force refresh (some refresh fns accept optional param; keep runtime-safe)
        await Promise.resolve((hr.refreshEmployees as any)(true))
        // Give React a tick to apply context updates, then read from the "latest" ref.
        await new Promise((r) => setTimeout(r, 0))
        const existsAfterCreate = (hrEmployeesRef.current || []).some((e: any) => String(e?.id || e?.employeeID || "") === employeeId)

        await remove(ref(db, employeePath))
        await Promise.resolve((hr.refreshEmployees as any)(true))
        await new Promise((r) => setTimeout(r, 0))
        const existsAfterDelete = (hrEmployeesRef.current || []).some((e: any) => String(e?.id || e?.employeeID || "") === employeeId)

        pushResult({
          name: "HR: create + refresh + delete + refresh (employee)",
          ok: existsAfterCreate && !existsAfterDelete,
          details: `afterCreate=${existsAfterCreate} afterDelete=${existsAfterDelete} path=${hrDataPath}`,
        })
      } catch (e: any) {
        pushResult({ name: "HR: create + refresh + delete + refresh (employee)", ok: false, details: String(e?.message || e) })
      }

      // ======================
      // Finance: create contact + bill, refresh, then delete, refresh
      // ======================
      try {
        const contactName = `Smoke Supplier ${runId}`
        await finance.createContact({
          name: contactName,
          type: "supplier",
          email: `supplier+${runId}@example.com`,
          currency: "GBP",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any)

        await finance.refreshContacts()
        await new Promise((r) => setTimeout(r, 0))
        const createdContact = (financeContactsRef.current || []).find((c: any) => c?.name === contactName)
        const contactId = String(createdContact?.id || "")
        const hasContact = Boolean(contactId)

        // Create a minimal bill tied to the supplier
        const billRef = `SMOKE-${runId}`
        await finance.createBill({
          supplierId: contactId,
          supplierName: contactName,
          reference: billRef,
          description: "Smoke test bill",
          subtotal: 1,
          taxAmount: 0,
          totalAmount: 1,
          currency: "GBP",
          receiveDate: new Date().toISOString().split("T")[0],
          dueDate: new Date().toISOString().split("T")[0],
          lineItems: [],
          status: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any)

        await finance.refreshBills()
        await new Promise((r) => setTimeout(r, 0))
        const createdBill = (financeBillsRef.current || []).find((b: any) => b?.reference === billRef)
        const billId = String(createdBill?.id || "")
        const hasBill = Boolean(billId)

        if (billId) {
          await finance.deleteBill(billId)
          await finance.refreshBills()
          await new Promise((r) => setTimeout(r, 0))
        }
        if (contactId) {
          await finance.deleteContact(contactId)
          await finance.refreshContacts()
          await new Promise((r) => setTimeout(r, 0))
        }

        const billStillThere = (financeBillsRef.current || []).some((b: any) => String(b?.id || "") === billId)
        const contactStillThere = (financeContactsRef.current || []).some((c: any) => String(c?.id || "") === contactId)

        pushResult({
          name: "Finance: create + refresh + delete + refresh (contact + bill)",
          ok: hasContact && hasBill && !billStillThere && !contactStillThere,
          details: `hasContact=${hasContact} hasBill=${hasBill} billStillThere=${billStillThere} contactStillThere=${contactStillThere}`,
        })
      } catch (e: any) {
        pushResult({ name: "Finance: create + refresh + delete + refresh (contact + bill)", ok: false, details: String(e?.message || e) })
      }
    } finally {
      setRunning(false)
    }
  }, [companyState.companyID, finance, getBasePath, hr, pushResult])

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Smoke Test: Company + HR + Finance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Runs create/edit/delete/read checks against your current company context. Writes temporary records and removes them.
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

export default SmokeTop3

