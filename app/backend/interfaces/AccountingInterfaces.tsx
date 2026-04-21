// Additional interfaces for Accounting/General Ledger module
// These should be added to Finance.tsx

// Journal - Manual or system-generated journal entries
export interface Journal {
  id: string
  entity_id?: string
  journal_number: string
  source: "manual" | "system" | "recurring" | "reversal" | "opening_balance"
  date: string
  description: string
  reference?: string
  status: "draft" | "pending_approval" | "approved" | "posted" | "reversed" | "cancelled"
  period_locked: boolean // Whether the period is locked
  created_by: string
  approved_by?: string
  approved_at?: string
  posted_at?: string
  reversed_at?: string
  reversed_by?: string
  reversal_of?: string // ID of journal being reversed
  created_at: string
  updated_at: string
}

// Journal Line - Individual debit/credit entries
export interface JournalLine {
  id: string
  journal_id: string
  account_id: string
  debit: number
  credit: number
  description?: string
  tax_rate_id?: string
  dimension_ids?: Record<string, string> // Tracking categories: { department: "dept1", project: "proj1" }
  created_at: string
  updated_at?: string
}

// Period Lock - Lock accounting periods
export interface PeriodLock {
  id: string
  entity_id?: string
  period_start: string // YYYY-MM-DD
  period_end: string // YYYY-MM-DD
  locked_by: string
  locked_at: string
  reason?: string
  is_active: boolean
}

// Dimension - Tracking categories (departments, projects, etc.)
export interface Dimension {
  id: string
  entity_id?: string
  name: string
  code: string
  type: "department" | "project" | "location" | "cost_center" | "custom"
  description?: string
  is_active: boolean
  parent_id?: string // For hierarchical dimensions
  created_at: string
  updated_at: string
}

// Opening Balance - Initial account balances
export interface OpeningBalance {
  id: string
  entity_id?: string
  account_id: string
  balance: number
  balance_date: string // Date of the opening balance
  currency: string
  created_by: string
  created_at: string
  updated_at: string
}
