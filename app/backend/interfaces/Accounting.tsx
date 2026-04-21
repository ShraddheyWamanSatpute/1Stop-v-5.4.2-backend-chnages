// Accounting-specific interfaces for General Ledger

// Manual Journal (separate from Transaction for approval workflow)
export interface Journal {
  id: string
  entity_id?: string
  journal_number: string
  source: "manual" | "system" | "recurring" | "reversal" | "opening_balance"
  date: string
  description: string
  reference?: string
  status: "draft" | "pending_approval" | "approved" | "posted" | "reversed" | "cancelled"
  journal_lines: JournalLine[]
  total_debit: number
  total_credit: number
  currency: string
  exchange_rate?: number
  period_id?: string
  is_reversing?: boolean
  reversed_journal_id?: string
  created_by: string
  created_at: string
  approved_by?: string
  approved_at?: string
  posted_by?: string
  posted_at?: string
  updated_at: string
}

// Journal Line (with dimensions support)
export interface JournalLine {
  id: string
  journal_id: string
  account_id: string
  description?: string
  debit: number
  credit: number
  tax_rate_id?: string
  dimension_ids?: Record<string, string> // Tracking categories: { "department": "dept_id", "project": "project_id", etc. }
  line_number: number
}

// Period Lock (prevent editing closed periods)
export interface PeriodLock {
  id: string
  entity_id?: string
  period_start: string // YYYY-MM-DD
  period_end: string // YYYY-MM-DD
  period_type: "month" | "quarter" | "year"
  is_locked: boolean
  locked_at?: string
  locked_by?: string
  lock_reason?: string
  created_at: string
  updated_at: string
}

// Dimension (Tracking Category)
export interface Dimension {
  id: string
  entity_id?: string
  name: string
  type: "department" | "project" | "location" | "cost_center" | "custom"
  code?: string
  description?: string
  is_active: boolean
  values: DimensionValue[]
  created_at: string
  updated_at: string
}

// Dimension Value (e.g., "Sales Department", "Project Alpha")
export interface DimensionValue {
  id: string
  dimension_id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  created_at: string
}

// Opening Balance
export interface OpeningBalance {
  id: string
  entity_id?: string
  account_id: string
  period_start: string // Fiscal year start
  balance: number
  currency: string
  created_by: string
  created_at: string
  updated_at: string
}
