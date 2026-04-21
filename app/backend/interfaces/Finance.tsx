// Supporting interfaces
// Re-export accounting types that FinanceContext expects.
export type { OpeningBalance } from "./Accounting"

export interface Address {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  lineTotal: number
  accountId?: string
  taxRateId?: string
  dimensionIds?: Record<string, string> // For tracking categories, departments, etc.
}

export interface BillLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  lineTotal: number
  accountId?: string
}

export interface RecurringSchedule {
  frequency: "weekly" | "monthly" | "quarterly" | "yearly"
  interval: number
  endDate?: string
  nextDate: string
  isActive: boolean
}

export interface BankAccountDetails {
  accountNumber: string
  sortCode: string
  iban?: string
  swiftCode?: string
}

export interface TaxRate {
  id: string
  name: string
  rate: number
  type: "VAT" | "GST" | "Sales Tax" | "Other"
  isActive: boolean
}

export interface PaymentTerm {
  id: string
  name: string
  days: number
  discountPercentage?: number
  discountDays?: number
}

export interface JournalEntry {
  accountId: string
  amount: number
  type: "debit" | "credit"
  description?: string
  debit?: number
  credit?: number
  id?: string
  transactionId?: string
}

// Manual Journal - Separate from Transaction for accounting control
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
  is_recurring: boolean
  recurring_schedule?: {
    frequency: "monthly" | "quarterly" | "yearly"
    end_date?: string
    next_date: string
  }
  reversed_by_journal_id?: string // If this is a reversal
  reverses_journal_id?: string // If this journal reverses another
  period_locked: boolean
  created_by: string
  approved_by?: string
  approved_at?: string
  posted_by?: string
  posted_at?: string
  created_at: string
  updated_at: string
}

// Journal Line - Individual debit/credit entry
export interface JournalLine {
  id: string
  journal_id: string
  account_id: string
  debit: number
  credit: number
  description?: string
  tax_rate_id?: string
  dimension_ids?: Record<string, string> // Tracking categories: department, project, location, etc.
  line_number: number
  created_at: string
}

// Dimension (Tracking Category) - For multi-dimensional reporting
export interface Dimension {
  id: string
  entity_id?: string
  name: string
  type: "department" | "project" | "location" | "cost_center" | "custom"
  code?: string
  description?: string
  parent_id?: string // For hierarchical dimensions
  is_active: boolean
  is_required: boolean // Whether this dimension must be set on journal lines
  applicable_account_types?: string[] // Which account types this applies to
  created_at: string
  updated_at: string
}

// Period Lock - Prevent editing of closed periods
export interface PeriodLock {
  id: string
  entity_id?: string
  period_type: "month" | "quarter" | "year"
  period_start: string // YYYY-MM-DD
  period_end: string // YYYY-MM-DD
  is_locked: boolean
  locked_by?: string
  locked_at?: string
  unlock_reason?: string
  unlocked_by?: string
  unlocked_at?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  transactionNumber: string
  date: string
  description: string
  reference?: string
  type:
    | "sale"
    | "purchase"
    | "payment"
    | "receipt"
    | "transfer"
    | "adjustment"
    | "opening_balance"
    // Backwards compatibility (legacy naming used in some contexts)
    | "expense"
    | "income"
  status: "draft" | "pending" | "completed" | "cancelled" | "reconciled"
  entries: JournalEntry[]
  totalAmount: number
  currency: string
  exchangeRate?: number
  sourceDocument?: {
    type: "invoice" | "bill" | "expense" | "manual"
    id: string
  }
  bankAccountId?: string
  contactId?: string
  isReconciled: boolean
  reconciledAt?: string
  attachments?: string[]
  createdBy: string
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  entity_id?: string
  invoiceNumber: string
  customerId: string
  contact_id?: string // Alias for customerId
  customerName: string
  customerEmail?: string
  customerAddress?: Address
  lineItems: InvoiceLineItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  balance_due?: number // Amount still owed
  balanceDue?: number // Alias
  currency: string
  exchange_rate?: number
  exchangeRate?: number // Alias
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled" | "void"
  dueDate: string
  issueDate: string
  paidDate?: string
  description?: string
  notes?: string
  terms?: string
  reference?: string
  recurringSchedule?: RecurringSchedule
  paymentTerms: number // days
  discountPercentage?: number
  discountAmount?: number
  createdAt: string
  updatedAt: string
  sentAt?: string
  viewedAt?: string
  remindersSent: number
  attachments?: string[]
  approvedBy?: string
  approvedAt?: string
  voidedBy?: string
  voidedAt?: string
  voidReason?: string
  invoice_branding_theme?: string
  invoice_numbering_rule?: string
}

export interface Bill {
  id: string
  billNumber: string
  supplierId: string
  supplierName: string
  supplierEmail?: string
  supplierAddress?: Address
  lineItems: BillLineItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  balance_due?: number // Amount still owed
  balanceDue?: number // Alias
  currency: string
  status: "draft" | "pending" | "approved" | "paid" | "overdue" | "cancelled"
  dueDate: string
  receiveDate: string
  paidDate?: string
  description?: string
  reference: string
  purchaseOrderNumber?: string
  approvedBy?: string
  approvedAt?: string
  paymentMethod?: string
  recurringSchedule?: RecurringSchedule
  prepaymentAmount?: number
  overpaymentAmount?: number
  createdAt: string
  updatedAt: string
  attachments?: string[]
}

export interface Contact {
  id: string
  name: string
  type: "customer" | "supplier" | "employee" | "other" | "both" // "both" for dual-role (customer & supplier)
  companyName?: string
  firstName?: string
  lastName?: string
  contactPerson?: string
  email: string
  phone?: string
  mobile?: string
  website?: string
  address?: Address
  billingAddress?: Address
  shippingAddress?: Address
  taxNumber?: string
  vatNumber?: string
  paymentTerms?: number
  creditLimit?: number
  discount?: number
  currency: string
  isActive: boolean
  isArchived?: boolean // For archived contacts
  notes?: string
  tags?: string[]
  // Default settings for invoices/bills
  defaultAccountId?: string // Default account for line items
  defaultTaxRateId?: string // Default tax rate
  // Bank details
  bankDetails?: {
    accountName?: string
    accountNumber?: string
    sortCode?: string
    iban?: string
    swiftCode?: string
    bankName?: string
  }
  // Financial summaries (calculated from ledger)
  totalInvoiced?: number
  totalPaid?: number
  outstandingBalance?: number
  lastTransactionDate?: string
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  entity_id?: string
  name: string
  code: string
  type: "asset" | "liability" | "equity" | "revenue" | "expense"
  subType: "current_asset" | "fixed_asset" | "current_liability" | "long_term_liability" | "equity" | "revenue" | "cost_of_goods_sold" | "expense" | "other_income" | "other_expense"
  category?: string
  balance: number
  opening_balance?: number
  description: string
  parentAccountId?: string
  parent_id?: string // Alias for parentAccountId
  isArchived: boolean
  isSystemAccount: boolean
  taxCode?: string
  currency: string
  bankAccountDetails?: BankAccountDetails
  createdAt: string
  updatedAt: string
}

export interface BankAccount {
  id: string
  entity_id?: string
  name: string
  bank: string
  accountNumber: string
  type: "checking" | "savings" | "credit" | "credit_card" | "line_of_credit"
  balance: number
  opening_balance?: number
  currency: string
  status: "active" | "inactive" | "closed"
  account_id?: string // GL account ID
  lastSync?: string
  createdAt?: string
  updatedAt?: string
}

export interface Expense {
  id: string
  entity_id?: string
  employee: string
  employee_id?: string
  description: string
  amount: number
  currency: string
  category: string
  account_id?: string // GL account for expense
  tax_rate_id?: string // Tax rate applied
  tax_rate?: number // Tax rate percentage (supports custom rates)
  tax_amount?: number // Calculated tax amount
  tax_included?: boolean // Whether tax is included in amount
  is_taxable?: boolean // Whether expense is taxable
  status: "pending" | "approved" | "reimbursed" | "rejected"
  submitDate: string
  expenseDate?: string // Date expense was incurred
  receiptAttached: boolean
  receipt_urls?: string[] // Array of receipt file URLs
  department: string
  payment_method?: "cash" | "card" | "bank_transfer" | "company_card" | "reimbursement"
  mileage?: {
    distance: number // in miles/km
    rate: number // per mile/km rate
    total: number // distance * rate
  }
  reimbursement_date?: string
  reimbursement_amount?: number
  reimbursement_method?: "bank_transfer" | "cash" | "cheque"
  reimbursement_bank_account_id?: string
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  reimbursed_by?: string
  reimbursed_at?: string
  notes?: string
  project_code?: string
  client_name?: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseReceipt {
  id: string
  expense_id: string
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
  uploaded_by: string
}

export interface Currency {
  code: string
  name: string
  symbol: string
  rate: number
  isBase: boolean
  lastUpdated: string
  status: "active" | "inactive"
}

// Exchange rate history (used by finance context / widgets)
export interface ExchangeRate {
  id: string
  base_currency: string
  quote_currency: string
  rate: number
  rate_date: string // YYYY-MM-DD
  source?: string
  created_at?: string
  updated_at?: string
}

export interface Budget {
  id: string
  entity_id?: string
  name: string
  budgetType?: "total labour" | "salaried labour" | "hourly labour" | "freelance" | "stock purchasing" | "stock holding" | "custom" // Optional for backward compatibility
  period_type: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly"
  period_start: string
  period_end?: string
  budget_lines?: BudgetLine[]
  category?: string // Optional for backward compatibility
  budgeted: number
  actual: number
  remaining: number
  period: string
  status: "on-track" | "under-budget" | "near-limit" | "over-budget"
  percentage: number
  /**
   * Optional targeting metadata (for computed budgets).
   * Example: set a budget as a % of the finance Forecasting total for the same period.
   */
  target_method?: "manual" | "percent_of_forecast"
  target_percent_of_forecast?: number
  created_at?: string
  updated_at?: string
}

// Simple daily revenue forecast values (used by Scheduling + Finance Forecasting page)
export interface DailyForecast {
  id: string
  entity_id?: string
  date: string // YYYY-MM-DD
  amount: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface BudgetLine {
  id: string
  budget_id: string
  account_id: string
  amount: number
  description?: string
  created_at: string
  updated_at: string
}

export interface BudgetVsActual {
  account_id: string
  account_name: string
  budgeted: number
  actual: number
  variance: number
  variance_percentage: number
  period: string
}

// Advanced finance interfaces
export interface BankReconciliation {
  id: string
  bankAccountId: string
  statementDate: string
  openingBalance: number
  closingBalance: number
  reconciledTransactions: string[]
  unreconciledTransactions: string[]
  adjustments: BankAdjustment[]
  status: "in_progress" | "completed" | "reviewed"
  reconciledBy: string
  reconciledAt?: string
  createdAt: string
}

export interface BankAdjustment {
  id: string
  description: string
  amount: number
  type: "bank_fee" | "interest" | "correction" | "other"
  accountId: string
}

// Bank Statement Line - Immutable record from bank
export interface BankStatement {
  id: string
  bank_account_id: string
  date: string
  description: string
  amount: number
  currency: string
  reconciled: boolean
  reconciled_at?: string
  reconciled_by?: string
  transaction_id?: string // Linked transaction ID
  reference?: string
  type?: "debit" | "credit"
  balance?: number // Running balance
  fees?: number // Fees deducted by bank
  created_at: string
  updated_at?: string
}

// Bank Rule - Auto-matching rules
export interface BankRule {
  id: string
  entity_id?: string
  name: string
  conditions: {
    description_contains?: string[]
    description_matches?: string
    amount_equals?: number
    amount_range?: { min: number; max: number }
    reference_contains?: string[]
    type?: "debit" | "credit"
  }
  target_account: string // GL account ID
  tax_rate_id?: string
  tax_rate?: number // Optional custom tax rate percent
  is_active: boolean
  priority: number // Higher priority rules checked first
  created_at: string
  updated_at: string
}

// Bank Transfer - Between accounts
export interface BankTransfer {
  id: string
  entity_id?: string
  from_account_id: string
  to_account_id: string
  amount: number
  currency: string
  exchange_rate?: number
  date: string
  description?: string
  reference?: string
  status: "pending" | "completed" | "cancelled"
  created_by: string
  created_at: string
  updated_at: string
}

// Clearing Account - For POS/gateways
export interface ClearingAccount {
  id: string
  entity_id?: string
  name: string
  account_id: string // GL account ID
  bank_account_id: string // Linked bank account
  type: "pos" | "gateway" | "other"
  auto_reconcile: boolean
  reconciliation_frequency: "daily" | "weekly" | "monthly"
  last_reconciled?: string
  created_at: string
  updated_at: string
}

// FX Revaluation
export interface FXRevaluation {
  id: string
  entity_id?: string
  bank_account_id: string
  revaluation_date: string
  currency: string
  base_currency: string
  exchange_rate: number
  balance_before: number
  balance_after: number
  gain_loss: number
  gain_loss_account_id: string // GL account for FX gain/loss
  journal_entry_id?: string
  status: "pending" | "posted" | "cancelled"
  created_by: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  paymentNumber: string
  type: "customer_payment" | "supplier_payment" | "expense_payment" | "transfer"
  amount: number
  currency: string
  exchangeRate?: number
  paymentDate: string
  paymentMethod: "cash" | "cheque" | "bank_transfer" | "card" | "online" | "other"
  reference?: string
  bankAccountId: string
  contactId?: string
  allocations: PaymentAllocation[]
  status: "pending" | "completed" | "cancelled" | "failed"
  createdAt: string
  updatedAt: string
}

export interface PaymentAllocation {
  documentType: "invoice" | "bill" | "credit_note"
  documentId: string
  amount: number
  discount?: number
}

export interface CreditNote {
  id: string
  creditNoteNumber: string
  customerId: string
  customerName: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  balance_due?: number // Remaining credit available
  balanceDue?: number // Alias
  currency: string
  issueDate: string
  reason: string
  originalInvoiceId?: string
  appliedInvoices?: Array<{ invoiceId: string; appliedAmount: number }> // Applied to multiple invoices
  status: "draft" | "issued" | "applied" | "partially_applied"
  createdAt: string
  updatedAt: string
}

export interface Quote {
  id: string
  quoteNumber: string
  customerId: string
  customerName: string
  customerEmail?: string
  customerAddress?: Address
  lineItems: InvoiceLineItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  currency: string
  status: "draft" | "sent" | "accepted" | "declined" | "expired" | "converted"
  issueDate: string
  expiryDate: string
  description?: string
  notes?: string
  terms?: string
  reference?: string
  paymentTerms: number
  discountPercentage?: number
  discountAmount?: number
  convertedToInvoiceId?: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  attachments?: string[]
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  lineItems: BillLineItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  currency: string
  orderDate: string
  expectedDate?: string
  deliveryAddress?: Address
  status: "draft" | "sent" | "acknowledged" | "partially_received" | "received" | "cancelled"
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FinancialReport {
  id: string
  name: string
  type: "profit_loss" | "balance_sheet" | "cash_flow" | "trial_balance" | "aged_receivables" | "aged_payables" | "budget_vs_actual" | "custom"
  period: {
    startDate: string
    endDate: string
    type: "month" | "quarter" | "year" | "custom"
  }
  data: any
  generatedAt: string
  generatedBy: string
  parameters?: any
}

export interface FinanceData {
  transactions: Transaction[]
  invoices: Invoice[]
  quotes?: Quote[]
  bills: Bill[]
  contacts: Contact[]
  accounts: Account[]
  bankAccounts: BankAccount[]
  bankStatements: BankStatement[]
  bankRules: BankRule[]
  bankTransfers: BankTransfer[]
  clearingAccounts: ClearingAccount[]
  fxRevaluations: FXRevaluation[]
  expenses: Expense[]
  currencies: Currency[]
  budgets: Budget[]
  payments: Payment[]
  creditNotes: CreditNote[]
  purchaseOrders: PurchaseOrder[]
  taxRates: TaxRate[]
  paymentTerms: PaymentTerm[]
  bankReconciliations: BankReconciliation[]
  reports: FinancialReport[]
}

// Alias for FinanceReport
export type FinanceReport = FinancialReport

// FinanceSettings interface
export interface FinanceSettings {
  id: string
  companyId: string
  defaultCurrency: string
  taxRate: number
  invoicePrefix: string
  invoiceNumber: number
  billPrefix: string
  billNumber: number
  paymentTerms: number
  lateFeeRate: number
  lateFeeAmount: number
  autoReminders: boolean
  reminderDays: number[]
  fiscalYearStart: string
  fiscalYearEnd: string
  createdAt: string
  updatedAt: string
}
