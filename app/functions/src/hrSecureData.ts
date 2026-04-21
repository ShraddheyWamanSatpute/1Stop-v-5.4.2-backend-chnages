import { onCall, HttpsError } from "firebase-functions/v2/https"
import { db as adminDb } from "./admin"
import { decryptString, encryptString, getNestedValue, setNestedValue, isEncryptedValue } from "./hrCrypto"

// Field allowlists (mirror app/backend SensitiveDataService)
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
  // “Sensitive” but included to match current behavior
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

function getEmployeeKey(): string {
  const key = String(process.env.EMPLOYEE_DATA_KEY || "").trim()
  if (!key || key.length < 32) {
    throw new HttpsError("failed-precondition", "Missing EMPLOYEE_DATA_KEY (min 32 chars)")
  }
  return key
}

function getPayrollKey(): string {
  const key = String(process.env.PAYROLL_DATA_KEY || "").trim()
  if (!key || key.length < 32) {
    throw new HttpsError("failed-precondition", "Missing PAYROLL_DATA_KEY (min 32 chars)")
  }
  return key
}

function parseCompanyIdFromHrPath(hrPath: string): string {
  const m = String(hrPath || "").match(/^companies\/([^/]+)\/.+\/data\/hr$/) || String(hrPath || "").match(/^companies\/([^/]+)\/data\/hr$/)
  if (!m?.[1]) throw new HttpsError("invalid-argument", "Invalid hrPath")
  return m[1]
}

async function requireCompanyMember(uid: string, companyId: string): Promise<void> {
  const snap = await adminDb.ref(`users/${uid}/companies/${companyId}`).get()
  if (!snap.exists()) throw new HttpsError("permission-denied", "User is not a member of this company")
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function encryptObject(data: any, fields: string[], masterKey: string): any {
  const out = deepClone(data || {})
  for (const path of fields) {
    const v = getNestedValue(out, path)
    if (v === undefined || v === null) continue
    if (typeof v !== "string" && typeof v !== "number") continue
    const s = String(v)
    if (isEncryptedValue(s)) continue
    setNestedValue(out, path, encryptString(s, masterKey))
  }
  // Minimal metadata marker (optional)
  ;(out as any).__encryptionMeta = { version: "v2", encryptedAt: Date.now() }
  return out
}

function decryptObject(data: any, fields: string[], masterKey: string): any {
  const out = deepClone(data || {})
  for (const path of fields) {
    const v = getNestedValue(out, path)
    if (v === undefined || v === null) continue
    if (typeof v !== "string") continue
    if (!isEncryptedValue(v)) continue
    try {
      setNestedValue(out, path, decryptString(v, masterKey))
    } catch {
      // Leave field as-is for backward compatibility
    }
  }
  return out
}

export const hrListEmployees = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const hrPath = String((req.data as any)?.hrPath || "")
  const companyId = parseCompanyIdFromHrPath(hrPath)
  await requireCompanyMember(uid, companyId)

  const snap = await adminDb.ref(`${hrPath}/employees`).get()
  const raw = snap.val() || {}

  const masterKey = getEmployeeKey()
  const employees = Object.entries(raw).map(([id, emp]) => {
    const merged = { id, ...(emp as any) }
    return decryptObject(merged, EMPLOYEE_FIELDS, masterKey)
  })

  return { employees }
})

export const hrGetEmployee = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const hrPath = String((req.data as any)?.hrPath || "")
  const employeeId = String((req.data as any)?.employeeId || "")
  if (!employeeId) throw new HttpsError("invalid-argument", "employeeId is required")

  const companyId = parseCompanyIdFromHrPath(hrPath)
  await requireCompanyMember(uid, companyId)

  const snap = await adminDb.ref(`${hrPath}/employees/${employeeId}`).get()
  if (!snap.exists()) return { employee: null }

  const masterKey = getEmployeeKey()
  const employee = decryptObject({ id: employeeId, ...(snap.val() as any) }, EMPLOYEE_FIELDS, masterKey)
  return { employee }
})

export const hrUpsertEmployee = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const hrPath = String((req.data as any)?.hrPath || "")
  const companyId = parseCompanyIdFromHrPath(hrPath)
  await requireCompanyMember(uid, companyId)

  const masterKey = getEmployeeKey()

  const employeeIdRaw = (req.data as any)?.employeeId
  const employeeId = employeeIdRaw ? String(employeeIdRaw) : ""
  const employee = (req.data as any)?.employee
  if (!employee || typeof employee !== "object") throw new HttpsError("invalid-argument", "employee is required")

  if (employeeId) {
    const currentSnap = await adminDb.ref(`${hrPath}/employees/${employeeId}`).get()
    const current = currentSnap.exists() ? (currentSnap.val() as any) : {}
    const merged = { ...current, ...employee, updatedAt: Date.now() }
    const toSave = encryptObject(merged, EMPLOYEE_FIELDS, masterKey)
    await adminDb.ref(`${hrPath}/employees/${employeeId}`).set(toSave)
    return { employeeId }
  }

  const newRef = adminDb.ref(`${hrPath}/employees`).push()
  const newId = newRef.key
  if (!newId) throw new HttpsError("internal", "Failed to create employee")

  const toSave = encryptObject({ ...employee, createdAt: Date.now(), updatedAt: Date.now() }, EMPLOYEE_FIELDS, masterKey)
  await newRef.set(toSave)
  return { employeeId: newId }
})

export const hrDeleteEmployee = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const hrPath = String((req.data as any)?.hrPath || "")
  const employeeId = String((req.data as any)?.employeeId || "")
  if (!employeeId) throw new HttpsError("invalid-argument", "employeeId is required")

  const companyId = parseCompanyIdFromHrPath(hrPath)
  await requireCompanyMember(uid, companyId)

  await adminDb.ref(`${hrPath}/employees/${employeeId}`).remove()
  return { success: true }
})

export const hrListPayrolls = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const hrPath = String((req.data as any)?.hrPath || "")
  const companyId = parseCompanyIdFromHrPath(hrPath)
  await requireCompanyMember(uid, companyId)

  const snap = await adminDb.ref(`${hrPath}/payrolls`).get()
  const raw = snap.val() || {}

  const masterKey = getPayrollKey()
  const payrolls = Object.entries(raw).map(([id, p]) => {
    const merged = { id, ...(p as any) }
    return decryptObject(merged, PAYROLL_FIELDS, masterKey)
  })

  return { payrolls }
})

export const hrGetPayroll = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const hrPath = String((req.data as any)?.hrPath || "")
  const payrollId = String((req.data as any)?.payrollId || "")
  if (!payrollId) throw new HttpsError("invalid-argument", "payrollId is required")

  const companyId = parseCompanyIdFromHrPath(hrPath)
  await requireCompanyMember(uid, companyId)

  const snap = await adminDb.ref(`${hrPath}/payrolls/${payrollId}`).get()
  if (!snap.exists()) return { payroll: null }

  const masterKey = getPayrollKey()
  const payroll = decryptObject({ id: payrollId, ...(snap.val() as any) }, PAYROLL_FIELDS, masterKey)
  return { payroll }
})

export const hrSavePayroll = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const hrPath = String((req.data as any)?.hrPath || "")
  const payrollId = String((req.data as any)?.payrollId || "")
  const payroll = (req.data as any)?.payroll
  if (!payrollId) throw new HttpsError("invalid-argument", "payrollId is required")
  if (!payroll || typeof payroll !== "object") throw new HttpsError("invalid-argument", "payroll is required")

  const companyId = parseCompanyIdFromHrPath(hrPath)
  await requireCompanyMember(uid, companyId)

  const masterKey = getPayrollKey()
  const toSave = encryptObject({ ...payroll, updatedAt: Date.now() }, PAYROLL_FIELDS, masterKey)
  await adminDb.ref(`${hrPath}/payrolls/${payrollId}`).set(toSave)
  return { success: true }
})

