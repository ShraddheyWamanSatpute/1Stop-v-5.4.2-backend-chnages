"use client"

import { supabase, SupabaseTable, getCompanyScope, parseLegacyPath } from "./client"
import type {  
  Journal,
  JournalLine,
  PeriodLock,
  Dimension,
  OpeningBalance,
  Account
 } from "../interfaces/FinanceJournals"

type AnyObj = Record<string, any>

// =========================
// Supabase table helpers
// =========================

const journalsTable = new SupabaseTable<any>('finance_journals')
const dimensionsTable = new SupabaseTable<any>('finance_dimensions')
const periodLocksTable = new SupabaseTable<any>('finance_period_locks')
const openingBalancesTable = new SupabaseTable<any>('finance_opening_balances')

// Helper to extract company scope from legacy path
function getScopeFromPath(path: string) {
  const parsed = parseLegacyPath(path)
  if (!parsed.companyId) {
    throw new Error(`Invalid path format: ${path}`)
  }
  return getCompanyScope(parsed.companyId, parsed.siteId, parsed.subsiteId)
}

// Helper to convert payload to typed object
function fromPayload<T>(record: any): T {
  return record.payload as T
}

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export
