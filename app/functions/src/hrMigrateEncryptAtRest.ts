import { onRequest } from "firebase-functions/v2/https"
import { getAuth } from "firebase-admin/auth"
import { db as adminDb } from "./admin"
import { encryptString, getNestedValue, setNestedValue, isEncryptedValue } from "./hrCrypto"

// Mirror allowlists from hrSecureData
const EMPLOYEE_FIELDS = [
  "nationalInsuranceNumber",
  "dateOfBirth",
  "bankDetails.accountNumber",
  "bankDetails.routingNumber",
  "bankDetails.iban",
  "bankDetails.swift",
  "taxInformation.taxId",
  "taxCode",
  "p45Data.previousEmployerPAYERef",
  "p45Data.taxCodeAtLeaving",
  "p45Data.payToDate",
  "p45Data.taxToDate",
  "pensionSchemeReference",
  "email",
  "phone",
  "emergencyContact.phone",
  "address.street",
  "address.zipCode",
  "salary",
  "hourlyRate",
]

const PAYROLL_FIELDS = [
  "grossPay",
  "netPay",
  "taxDeductions",
  "employeeNIDeductions",
  "employerNIContributions",
  "studentLoanDeductions",
  "postgraduateLoanDeductions",
  "employeePensionDeductions",
  "employerPensionContributions",
  "ytdData.grossPayYTD",
  "ytdData.taxablePayYTD",
  "ytdData.taxPaidYTD",
  "ytdData.employeeNIPaidYTD",
  "ytdData.employerNIPaidYTD",
]

function json(res: any, status: number, body: any) {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

function getBearerToken(req: any): string | null {
  const h = String(req.headers?.authorization || req.headers?.Authorization || "")
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

async function requireAdminOrOwner(decoded: any, companyId: string): Promise<void> {
  // Allow global admin
  const userSnap = await adminDb.ref(`users/${decoded.uid}`).get()
  const user = (userSnap.val() || {}) as any
  if (Boolean(user?.isAdmin) || Boolean(user?.adminStaff?.active)) return

  // Allow company owner
  const membershipSnap = await adminDb.ref(`users/${decoded.uid}/companies/${companyId}`).get()
  const membership = (membershipSnap.val() || {}) as any
  const role = String(membership?.role || "").trim().toLowerCase()
  if (role === "owner") return

  throw Object.assign(new Error("Forbidden"), { status: 403 })
}

function getEmployeeKey(): string {
  const key = String(process.env.EMPLOYEE_DATA_KEY || "").trim()
  if (!key || key.length < 32) throw new Error("Missing EMPLOYEE_DATA_KEY (min 32 chars)")
  return key
}

function getPayrollKey(): string {
  const key = String(process.env.PAYROLL_DATA_KEY || "").trim()
  if (!key || key.length < 32) throw new Error("Missing PAYROLL_DATA_KEY (min 32 chars)")
  return key
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function encryptObject(data: any, fields: string[], key: string): { out: any; changed: boolean; encryptedFields: number } {
  const out = deepClone(data || {})
  let changed = false
  let encryptedFields = 0

  for (const path of fields) {
    const v = getNestedValue(out, path)
    if (v === undefined || v === null) continue
    if (typeof v !== "string" && typeof v !== "number") continue
    const s = String(v)
    if (isEncryptedValue(s)) continue
    const enc = encryptString(s, key)
    setNestedValue(out, path, enc)
    changed = true
    encryptedFields++
  }

  if (changed) {
    ;(out as any).__encryptionMeta = { version: "v2", encryptedAt: Date.now(), migrated: true }
  }

  return { out, changed, encryptedFields }
}

async function listHrPaths(companyId: string): Promise<string[]> {
  const paths: string[] = []
  const companyHr = `companies/${companyId}/data/hr`
  paths.push(companyHr)

  const sitesSnap = await adminDb.ref(`companies/${companyId}/sites`).get()
  const sites = (sitesSnap.val() || {}) as Record<string, any>
  const siteIds = Object.keys(sites)

  for (const siteId of siteIds) {
    paths.push(`companies/${companyId}/sites/${siteId}/data/hr`)
    const subsitesSnap = await adminDb.ref(`companies/${companyId}/sites/${siteId}/subsites`).get()
    const subsites = (subsitesSnap.val() || {}) as Record<string, any>
    const subsiteIds = Object.keys(subsites)
    for (const subsiteId of subsiteIds) {
      paths.push(`companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/hr`)
    }
  }

  // De-dup while preserving order
  return Array.from(new Set(paths))
}

async function migrateNode(params: {
  baseHrPath: string
  nodeName: "employees" | "payrolls" | "payroll"
  fields: string[]
  key: string
  dryRun: boolean
}) {
  const { baseHrPath, nodeName, fields, key, dryRun } = params
  const nodePath = `${baseHrPath}/${nodeName}`

  const snap = await adminDb.ref(nodePath).get()
  if (!snap.exists()) {
    return { nodePath, scanned: 0, updated: 0, encryptedFields: 0, skipped: 0 }
  }

  const raw = (snap.val() || {}) as Record<string, any>
  const ids = Object.keys(raw)
  let updated = 0
  let encryptedFields = 0
  let skipped = 0

  // Batch multi-location updates to avoid huge payloads
  const batch: Record<string, any> = {}
  const FLUSH_AT = 200

  const flush = async () => {
    const keys = Object.keys(batch)
    if (!keys.length) return
    if (!dryRun) {
      await adminDb.ref().update(batch)
    }
    keys.forEach((k) => delete batch[k])
  }

  for (const id of ids) {
    const record = raw[id]
    if (!record || typeof record !== "object") {
      skipped++
      continue
    }

    const { out, changed, encryptedFields: ef } = encryptObject(record, fields, key)
    encryptedFields += ef
    if (!changed) {
      skipped++
      continue
    }

    batch[`${nodePath}/${id}`] = out
    updated++

    if (updated % FLUSH_AT === 0) {
      await flush()
    }
  }

  await flush()
  return { nodePath, scanned: ids.length, updated, encryptedFields, skipped }
}

/**
 * One-time migration: encrypt existing HR employees + payrolls at rest.
 *
 * Request:
 * - Authorization: Bearer <Firebase ID token>
 * - POST JSON: { companyId: string, dryRun?: boolean, includeLegacyPayroll?: boolean }
 *
 * One-time behavior:
 * - Writes marker at `companies/<companyId>/data/hr/__migrations/encryptAtRestV2`
 * - If marker exists, returns 409 unless `dryRun=true`
 */
export const hrMigrateEncryptAtRestV2 = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Use POST" })

    const token = getBearerToken(req)
    if (!token) return json(res, 401, { ok: false, error: "Missing Authorization Bearer token" })

    const decoded = await getAuth().verifyIdToken(token).catch(() => null)
    if (!decoded?.uid) return json(res, 401, { ok: false, error: "Invalid token" })

    const companyId = String((req.body as any)?.companyId || "").trim()
    if (!companyId) return json(res, 400, { ok: false, error: "companyId is required" })

    const dryRun = Boolean((req.body as any)?.dryRun)
    const includeLegacyPayroll = Boolean((req.body as any)?.includeLegacyPayroll)

    await requireAdminOrOwner(decoded, companyId)

    const markerPath = `companies/${companyId}/data/hr/__migrations/encryptAtRestV2`
    const markerSnap = await adminDb.ref(markerPath).get()
    if (markerSnap.exists() && !dryRun) {
      return json(res, 409, { ok: false, error: "Migration already completed", marker: markerSnap.val() })
    }

    const employeeKey = getEmployeeKey()
    const payrollKey = getPayrollKey()

    const hrPaths = await listHrPaths(companyId)
    const startedAt = Date.now()

    const perPath: any[] = []
    let totals = { scanned: 0, updated: 0, encryptedFields: 0, skipped: 0 }

    for (const hrPath of hrPaths) {
      const emp = await migrateNode({
        baseHrPath: hrPath,
        nodeName: "employees",
        fields: EMPLOYEE_FIELDS,
        key: employeeKey,
        dryRun,
      })
      const pay = await migrateNode({
        baseHrPath: hrPath,
        nodeName: "payrolls",
        fields: PAYROLL_FIELDS,
        key: payrollKey,
        dryRun,
      })

      let legacy: any = null
      if (includeLegacyPayroll) {
        legacy = await migrateNode({
          baseHrPath: hrPath,
          nodeName: "payroll",
          fields: PAYROLL_FIELDS,
          key: payrollKey,
          dryRun,
        })
      }

      const rollup = [emp, pay, legacy].filter(Boolean)
      for (const r of rollup) {
        totals.scanned += r.scanned
        totals.updated += r.updated
        totals.encryptedFields += r.encryptedFields
        totals.skipped += r.skipped
      }

      perPath.push({ hrPath, employees: emp, payrolls: pay, legacyPayroll: legacy })
    }

    const finishedAt = Date.now()

    if (!dryRun) {
      await adminDb.ref(markerPath).set({
        completedAt: finishedAt,
        durationMs: finishedAt - startedAt,
        totals,
        performedBy: { uid: decoded.uid, email: decoded.email || null },
        includeLegacyPayroll,
      })
    }

    return json(res, 200, {
      ok: true,
      dryRun,
      companyId,
      totals,
      durationMs: finishedAt - startedAt,
      hrPathsCount: hrPaths.length,
      includeLegacyPayroll,
      perPath,
    })
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500
    return json(res, status, { ok: false, error: String(e?.message || e) })
  }
})

