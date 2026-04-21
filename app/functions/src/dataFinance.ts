import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type FinanceScope = {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  basePath: string
}

type FinanceHandlerArgs = {
  req: any
  res: any
  path: string
  body: any
  user: AppAuthedUser
}

const json = (res: any, status: number, body: any) => {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

const stripUndefinedDeep = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep)
  if (value && typeof value === "object") {
    const out: Record<string, any> = {}
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) continue
      out[key] = stripUndefinedDeep(child)
    }
    return out
  }
  return value
}

const normalizeBasePath = (raw: string): string => String(raw || "").trim().replace(/\/+$/, "")

const parseFinanceScope = (rawBasePath: string): FinanceScope => {
  const basePath = normalizeBasePath(rawBasePath)
  const match = basePath.match(
    /^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/finance$/i,
  )

  if (!match) {
    throw Object.assign(new Error("Invalid finance basePath"), { status: 400 })
  }

  return {
    companyId: match[1],
    siteId: match[2] || null,
    subsiteId: match[3] || null,
    basePath,
  }
}

const getSupabaseConfig = () => {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "")
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

  if (!url || !serviceRoleKey) {
    throw Object.assign(
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Finance provider"),
      { status: 500 },
    )
  }

  return { url, serviceRoleKey }
}

const supabaseRequest = async (path: string, init?: RequestInit) => {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw Object.assign(new Error(text || `Supabase request failed (${res.status})`), { status: 502 })
  }

  const text = await res.text().catch(() => "")
  return text ? JSON.parse(text) : null
}

const assertCompanyAccess = async (uid: string, companyId: string) => {
  const [userCompanySnap, ownedCompanySnap] = await Promise.all([
    adminDb.ref(`users/${uid}/companies/${companyId}`).get(),
    adminDb.ref(`companies/${companyId}/users/${uid}`).get(),
  ])

  if (!userCompanySnap.exists() && !ownedCompanySnap.exists()) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
}

const getSingleRow = async (table: string, filters: Record<string, string>) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("limit", "1")
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>
  return rows?.[0] || null
}

const listRows = async (table: string, basePath: string) => {
  const params = new URLSearchParams()
  params.set("base_path", `eq.${basePath}`)
  params.set("select", "id,payload,created_at,updated_at")
  params.set("order", "created_at.asc")
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>
  return (rows || []).map((row) => ({
    ...(row?.payload || {}),
    id: row?.id,
  }))
}

const insertRow = async (table: string, row: any) => {
  const rows = (await supabaseRequest(`${table}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  })) as Array<any>
  return rows?.[0] || null
}

const patchRow = async (table: string, filters: Record<string, string>, patch: any) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(stripUndefinedDeep(patch)),
  })) as Array<any>
  return rows?.[0] || null
}

const deleteRow = async (table: string, filters: Record<string, string>) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  await supabaseRequest(`${table}?${params.toString()}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })
}

const createEntityRow = (
  scope: FinanceScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null; code?: string | null },
) => {
  const cleaned = stripUndefinedDeep(payload)
  return {
    id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: String(opts?.name || cleaned?.name || cleaned?.billNumber || cleaned?.transactionNumber || id),
    status: opts?.status ?? cleaned?.status ?? null,
    code: opts?.code ?? cleaned?.code ?? null,
    payload: {
      ...cleaned,
      id,
    },
    created_at: Date.parse(cleaned?.createdAt || cleaned?.created_at || new Date().toISOString()),
    updated_at: Date.now(),
  }
}

const upsertEntity = async (
  table: string,
  scope: FinanceScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null; code?: string | null },
) => {
  const existing = await getSingleRow(table, { id, base_path: scope.basePath })
  const mergedPayload = {
    ...(existing?.payload || {}),
    ...stripUndefinedDeep(payload),
    id,
  }
  const row = createEntityRow(scope, id, mergedPayload, opts)

  if (!existing) {
    await insertRow(table, row)
  } else {
    await patchRow(table, { id, base_path: scope.basePath }, row)
  }

  return {
    ...(row.payload || {}),
    id,
  }
}

const upsertAccount = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_accounts", scope, id, payload, {
    name: payload?.name,
    status: payload?.isArchived ? "archived" : "active",
    code: payload?.code || null,
  })

const upsertTransaction = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_transactions", scope, id, payload, {
    name: payload?.description || payload?.transactionNumber || id,
    status: payload?.status || null,
    code: payload?.transactionNumber || null,
  })

const upsertBill = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_bills", scope, id, payload, {
    name: payload?.supplierName || payload?.billNumber || id,
    status: payload?.status || null,
    code: payload?.billNumber || null,
  })

const upsertContact = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_contacts", scope, id, payload, {
    name: payload?.name || payload?.companyName || id,
    status: payload?.isArchived ? "archived" : payload?.isActive === false ? "inactive" : "active",
    code: null,
  })

const upsertBudget = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_budgets", scope, id, payload, {
    name: payload?.name || payload?.category || id,
    status: payload?.status || null,
    code: null,
  })

const normalizeJournalLine = (journalId: string, line: any, index: number) => ({
  ...(stripUndefinedDeep(line) || {}),
  id: String(line?.id || `${journalId}-line-${index + 1}`),
  journal_id: journalId,
  line_number: Number(line?.line_number || index + 1),
  debit: Number(line?.debit || 0),
  credit: Number(line?.credit || 0),
  created_at:
    typeof line?.created_at === "string" && line.created_at
      ? line.created_at
      : new Date().toISOString(),
})

const normalizeJournalPayload = (id: string, payload: any, existing?: any) => {
  const merged = stripUndefinedDeep({
    ...(existing || {}),
    ...(payload || {}),
    id,
  })

  const journalLines = Array.isArray(merged?.journal_lines)
    ? merged.journal_lines.map((line: any, index: number) => normalizeJournalLine(id, line, index))
    : []

  const totalDebit = journalLines.reduce((sum: number, line: any) => sum + Number(line?.debit || 0), 0)
  const totalCredit = journalLines.reduce((sum: number, line: any) => sum + Number(line?.credit || 0), 0)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw Object.assign(new Error(`Journal is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`), {
      status: 400,
    })
  }

  return {
    ...merged,
    journal_number: String(merged?.journal_number || `JRN-${Date.now()}`),
    journal_lines: journalLines,
    total_debit: totalDebit,
    total_credit: totalCredit,
    is_balanced: true,
    created_at:
      typeof merged?.created_at === "string" && merged.created_at
        ? merged.created_at
        : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const upsertJournal = async (scope: FinanceScope, id: string, payload: any) => {
  const existing = await getSingleRow("finance_journals", { id, base_path: scope.basePath })
  const normalized = normalizeJournalPayload(id, payload, existing?.payload || {})
  return upsertEntity("finance_journals", scope, id, normalized, {
    name: normalized?.description || normalized?.journal_number || id,
    status: normalized?.status || "draft",
    code: normalized?.journal_number || null,
  })
}

const upsertDimension = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_dimensions", scope, id, payload, {
    name: payload?.name || id,
    status: payload?.is_active === false ? "inactive" : "active",
    code: payload?.code || null,
  })

const upsertPeriodLock = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_period_locks", scope, id, payload, {
    name: `${payload?.period_type || "period"}:${payload?.period_start || id}`,
    status: payload?.is_locked ? "locked" : "open",
    code: null,
  })

const upsertOpeningBalance = async (scope: FinanceScope, id: string, payload: any) =>
  upsertEntity("finance_opening_balances", scope, id, payload, {
    name: payload?.account_id || id,
    status: "active",
    code: null,
  })

const getJournalOrThrow = async (scope: FinanceScope, journalId: string) => {
  const row = await getSingleRow("finance_journals", { id: journalId, base_path: scope.basePath })
  if (!row?.payload) throw Object.assign(new Error("Journal not found"), { status: 404 })
  return row
}

const fetchAccountById = async (scope: FinanceScope, accountId: string) =>
  getSingleRow("finance_accounts", { id: accountId, base_path: scope.basePath })

const applyJournalToAccounts = async (scope: FinanceScope, journal: any) => {
  const updates = await Promise.all(
    (journal?.journal_lines || []).map(async (line: any) => {
      const accountRow = await fetchAccountById(scope, String(line?.account_id || ""))
      if (!accountRow?.payload) return null

      const account = { ...(accountRow.payload || {}), id: accountRow.id }
      const debit = Number(line?.debit || 0)
      const credit = Number(line?.credit || 0)
      const balanceChange = ["asset", "expense"].includes(String(account.type || ""))
        ? debit - credit
        : credit - debit

      return {
        id: accountRow.id,
        payload: {
          ...account,
          balance: Number(account.balance || 0) + balanceChange,
          updatedAt: new Date().toISOString(),
        },
      }
    }),
  )

  await Promise.all(
    updates
      .filter(Boolean)
      .map((entry) => upsertAccount(scope, String(entry?.id || ""), entry?.payload || {})),
  )
}

const createJournalTransaction = async (scope: FinanceScope, journalId: string, journal: any) => {
  const transactionId = randomUUID()
  return upsertTransaction(scope, transactionId, {
    transactionNumber: journal?.journal_number || `JRN-${Date.now()}`,
    date: journal?.date,
    description: journal?.description,
    reference: journal?.reference,
    type: "adjustment",
    status: "completed",
    entries: (journal?.journal_lines || []).map((line: any) => ({
      accountId: line?.account_id,
      amount: Number(line?.debit || 0) > 0 ? Number(line?.debit || 0) : Number(line?.credit || 0),
      type: Number(line?.debit || 0) > 0 ? "debit" : "credit",
      description: line?.description || journal?.description,
      debit: Number(line?.debit || 0),
      credit: Number(line?.credit || 0),
      transactionId: journalId,
    })),
    totalAmount: Number(journal?.total_debit || 0),
    currency: journal?.currency || "GBP",
    sourceDocument: {
      type: "manual",
      id: journalId,
    },
    isReconciled: false,
    createdBy: journal?.created_by || "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export const handleFinanceDataRequest = async ({ req, res, path, body, user }: FinanceHandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")
  const send = (status: number, payload: any) => json(res, status, payload)
  const getQuery = (name: string) => String(req.query?.[name] || "").trim()

  const entityMap: Record<
    string,
    {
      table: string
      list: (scope: FinanceScope) => Promise<any[]>
      upsert: (scope: FinanceScope, id: string, payload: any) => Promise<any>
    }
  > = {
    accounts: {
      table: "finance_accounts",
      list: (scope) => listRows("finance_accounts", scope.basePath),
      upsert: upsertAccount,
    },
    transactions: {
      table: "finance_transactions",
      list: (scope) => listRows("finance_transactions", scope.basePath),
      upsert: upsertTransaction,
    },
    bills: {
      table: "finance_bills",
      list: (scope) => listRows("finance_bills", scope.basePath),
      upsert: upsertBill,
    },
    contacts: {
      table: "finance_contacts",
      list: (scope) => listRows("finance_contacts", scope.basePath),
      upsert: upsertContact,
    },
    budgets: {
      table: "finance_budgets",
      list: (scope) => listRows("finance_budgets", scope.basePath),
      upsert: upsertBudget,
    },
    journals: {
      table: "finance_journals",
      list: (scope) => listRows("finance_journals", scope.basePath),
      upsert: upsertJournal,
    },
    dimensions: {
      table: "finance_dimensions",
      list: (scope) => listRows("finance_dimensions", scope.basePath),
      upsert: upsertDimension,
    },
    periodLocks: {
      table: "finance_period_locks",
      list: (scope) => listRows("finance_period_locks", scope.basePath),
      upsert: upsertPeriodLock,
    },
    openingBalances: {
      table: "finance_opening_balances",
      list: (scope) => listRows("finance_opening_balances", scope.basePath),
      upsert: upsertOpeningBalance,
    },
  }

  const listMatch = pathname.match(
    /^\/data\/finance\/(accounts|transactions|bills|contacts|budgets|journals|dimensions|periodLocks|openingBalances)$/,
  )
  if (listMatch && method === "GET") {
    const scope = parseFinanceScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    send(200, { ok: true, rows: await entityMap[entity].list(scope) })
    return
  }

  if (listMatch && method === "POST") {
    const scope = parseFinanceScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    const id = String(body?.data?.id || randomUUID())
    const row = await entityMap[entity].upsert(scope, id, body?.data || {})
    if (entity === "openingBalances" && row?.account_id) {
      const account = await fetchAccountById(scope, String(row.account_id))
      if (account?.payload) {
        await upsertAccount(scope, String(account.id), {
          ...(account.payload || {}),
          opening_balance: Number(row.balance || 0),
          balance: Number(row.balance || 0),
          updatedAt: new Date().toISOString(),
        })
      }
    }
    send(200, { ok: true, id, row })
    return
  }

  const itemMatch = pathname.match(
    /^\/data\/finance\/(accounts|bills|contacts|budgets|journals|dimensions|periodLocks|openingBalances)\/([^/]+)$/,
  )
  if (itemMatch && method === "PATCH") {
    const scope = parseFinanceScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    const row = await entityMap[entity].upsert(scope, id, body?.updates || {})
    if (entity === "openingBalances" && row?.account_id && body?.updates?.balance !== undefined) {
      const account = await fetchAccountById(scope, String(row.account_id))
      if (account?.payload) {
        await upsertAccount(scope, String(account.id), {
          ...(account.payload || {}),
          opening_balance: Number(body?.updates?.balance || 0),
          balance: Number(body?.updates?.balance || 0),
          updatedAt: new Date().toISOString(),
        })
      }
    }
    send(200, { ok: true })
    return
  }

  if (itemMatch && method === "DELETE") {
    const scope = parseFinanceScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    const existing = entity === "openingBalances" ? await getSingleRow(entityMap[entity].table, { id, base_path: scope.basePath }) : null
    await deleteRow(entityMap[entity].table, { id, base_path: scope.basePath })
    if (entity === "openingBalances" && existing?.payload?.account_id) {
      const account = await fetchAccountById(scope, String(existing.payload.account_id))
      if (account?.payload) {
        await upsertAccount(scope, String(account.id), {
          ...(account.payload || {}),
          opening_balance: 0,
          updatedAt: new Date().toISOString(),
        })
      }
    }
    send(200, { ok: true })
    return
  }

  const approveMatch = pathname.match(/^\/data\/finance\/journals\/([^/]+)\/approve$/)
  if (approveMatch && method === "PATCH") {
    const scope = parseFinanceScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const journalId = decodeURIComponent(approveMatch[1])
    const current = await getJournalOrThrow(scope, journalId)
    const row = await upsertJournal(scope, journalId, {
      ...(current?.payload || {}),
      status: "approved",
      approved_by: body?.approvedBy,
      approved_at: new Date().toISOString(),
    })
    send(200, { ok: true, row })
    return
  }

  const postMatch = pathname.match(/^\/data\/finance\/journals\/([^/]+)\/post$/)
  if (postMatch && method === "PATCH") {
    const scope = parseFinanceScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const journalId = decodeURIComponent(postMatch[1])
    const current = await getJournalOrThrow(scope, journalId)
    const journal = current.payload || {}
    if (!["draft", "approved"].includes(String(journal?.status || ""))) {
      throw Object.assign(new Error(`Cannot post journal with status: ${journal?.status || "unknown"}`), { status: 400 })
    }

    const periodLocks = await listRows("finance_period_locks", scope.basePath)
    const journalTime = new Date(String(journal?.date || "")).getTime()
    const isLocked = periodLocks.some((lock) => {
      if (!lock?.is_locked) return false
      const start = new Date(String(lock?.period_start || "")).getTime()
      const end = new Date(String(lock?.period_end || "")).getTime()
      return Number.isFinite(journalTime) && journalTime >= start && journalTime <= end
    })
    if (isLocked) {
      throw Object.assign(new Error("Cannot post journal to a locked period"), { status: 400 })
    }

    await createJournalTransaction(scope, journalId, journal)
    await applyJournalToAccounts(scope, journal)
    const row = await upsertJournal(scope, journalId, {
      ...journal,
      status: "posted",
      posted_by: body?.postedBy,
      posted_at: new Date().toISOString(),
    })
    send(200, { ok: true, row })
    return
  }

  const reverseMatch = pathname.match(/^\/data\/finance\/journals\/([^/]+)\/reverse$/)
  if (reverseMatch && method === "POST") {
    const scope = parseFinanceScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const journalId = decodeURIComponent(reverseMatch[1])
    const current = await getJournalOrThrow(scope, journalId)
    const original = current.payload || {}
    const reversalId = randomUUID()
    const reversalDate = String(body?.reversalDate || new Date().toISOString().split("T")[0])
    const reversal = await upsertJournal(scope, reversalId, {
      entity_id: original?.entity_id,
      journal_number: `REV-${original?.journal_number || journalId}`,
      source: "reversal",
      date: reversalDate,
      description: `Reversal of ${original?.journal_number || journalId}`,
      reference: original?.reference,
      status: "draft",
      journal_lines: (original?.journal_lines || []).map((line: any, index: number) => ({
        ...line,
        id: `${reversalId}-line-${index + 1}`,
        journal_id: reversalId,
        debit: Number(line?.credit || 0),
        credit: Number(line?.debit || 0),
        created_at: new Date().toISOString(),
      })),
      total_debit: Number(original?.total_credit || 0),
      total_credit: Number(original?.total_debit || 0),
      currency: original?.currency || "GBP",
      is_recurring: false,
      created_by: body?.reversedBy || "system",
      reverses_journal_id: journalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await upsertJournal(scope, journalId, {
      ...original,
      status: "reversed",
      reversed_by: body?.reversedBy,
      reversed_at: new Date().toISOString(),
      reversed_by_journal_id: reversalId,
      reversal_journal_id: reversalId,
    })

    send(200, { ok: true, row: reversal })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
