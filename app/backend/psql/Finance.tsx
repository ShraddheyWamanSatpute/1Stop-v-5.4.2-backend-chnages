"use client"

import { supabase, SupabaseTable, getCompanyScope, parseLegacyPath } from "./client"
import type {  
  Account, 
  Transaction, 
  Bill, 
  Contact, 
  BankAccount, 
  Budget, 
  DailyForecast,
  Expense,
  Payment,
  CreditNote,
  PurchaseOrder,
  TaxRate,
  PaymentTerm,
  BankReconciliation,
  FinancialReport,
  Currency,
  JournalEntry,
  Journal,
  JournalLine,
  PeriodLock,
  Dimension,
  BankStatement,
  BankRule,
  BankTransfer,
  ClearingAccount,
  FXRevaluation,
  Quote,
 } from "../interfaces/Finance"

type AnyObj = Record<string, any>

// =========================
// Supabase table helpers
// =========================

const accountsTable = new SupabaseTable<any>('finance_accounts')
const transactionsTable = new SupabaseTable<any>('finance_transactions')
const billsTable = new SupabaseTable<any>('finance_bills')
const invoicesTable = new SupabaseTable<any>('finance_invoices')
const contactsTable = new SupabaseTable<any>('finance_contacts')
const budgetsTable = new SupabaseTable<any>('finance_budgets')
const paymentsTable = new SupabaseTable<any>('finance_payments')
const bankAccountsTable = new SupabaseTable<any>('finance_bank_accounts')
const exchangeRatesTable = new SupabaseTable<any>('finance_exchange_rates')

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
