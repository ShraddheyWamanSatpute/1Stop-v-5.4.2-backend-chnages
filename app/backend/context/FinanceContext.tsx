import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef, FC } from "react"
import { useCompany } from "./CompanyContext"
import { useSettings } from "./SettingsContext"
import { useStock } from "./StockContext"
import { useHR } from "./HRContext"
import { useBookings } from "./BookingsContext"
import { usePOS } from "./POSContext"
import { createNotification } from "../functions/Notifications"
import { measurePerformance, performanceTimer } from "../utils/PerformanceTimer"
import { createCachedFetcher } from "../utils/CachedFetcher"
import { dataCache } from "../utils/DataCache"
import { debugLog, debugWarn } from "../utils/debugLog"
import { ref, get, set, db } from "../services/Firebase"
import { 
  fetchFinanceSettings as fetchFinanceSettingsFn,
  saveFinanceSettings as saveFinanceSettingsFn,
  fetchFinanceIntegrations as fetchFinanceIntegrationsFn,
  saveFinanceIntegration as saveFinanceIntegrationFn,
} from "../providers/supabase/Finance"

// Import finance functions from RTDatabase
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  fetchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  fetchQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  fetchBills,
  createBill as addBill,
  updateBill,
  deleteBill,
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  fetchTransactions,
  createTransaction,
  fetchBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  fetchDailyForecasts,
  upsertDailyForecast as upsertDailyForecastRTDB,
  deleteDailyForecast as deleteDailyForecastRTDB,
  fetchReports,
  saveReport,
  deleteReport,
  fetchCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  fetchPayments,
  createPayment,
  updatePayment,
  deletePayment,
  fetchCreditNotes,
  createCreditNote,
  updateCreditNote,
  deleteCreditNote,
  fetchPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  fetchTaxRates,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  fetchBankStatements,
  createBankStatement,
  updateBankStatement,
  fetchBankRules,
  createBankRule,
  updateBankRule,
  deleteBankRule,
  fetchBankTransfers,
  createBankTransfer,
  updateBankTransfer,
  deleteBankTransfer,
  fetchClearingAccounts,
  createClearingAccount,
  updateClearingAccount,
  deleteClearingAccount,
  fetchFXRevaluations,
  createFXRevaluation,
  updateFXRevaluation,
  fetchJournals,
  createJournal,
  updateJournal,
  deleteJournal,
  approveJournal,
  postJournal,
  reverseJournal,
  fetchPeriodLocks,
  createPeriodLock,
  updatePeriodLock,
  deletePeriodLock,
  fetchDimensions,
  createDimension,
  updateDimension,
  deleteDimension,
  fetchOpeningBalances,
  // fetchPaymentTerms,
  // createPaymentTerm,
  // fetchBankReconciliations,
  // createBankReconciliation,
  // updateBankReconciliation,
} from "../providers/supabase/Finance"

// Import advanced finance functions
import {
  sendInvoice,
  startBankReconciliation,
  formatCurrency,
  getDefaultPaymentTerms,
  convertCurrency,
} from "../functions/FinanceAdvanced"

// Import finance interfaces
import {
  Account,
  Transaction,
  Invoice,
  Quote,
  Bill,
  Contact,
  BankAccount,
  Budget,
  BudgetLine,
  BudgetVsActual,
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
  BankStatement,
  BankRule,
  BankTransfer,
  ClearingAccount,
  FXRevaluation,
  Journal,
  PeriodLock,
  Dimension,
  OpeningBalance,
} from "../interfaces/Finance"

// Finance State Interface
interface FinanceState {
  accounts: Account[]
  transactions: Transaction[]
  invoices: Invoice[]
  quotes: Quote[]
  bills: Bill[]
  contacts: Contact[]
  bankAccounts: BankAccount[]
  bankStatements: BankStatement[]
  bankRules: BankRule[]
  bankTransfers: BankTransfer[]
  clearingAccounts: ClearingAccount[]
  fxRevaluations: FXRevaluation[]
  journals: Journal[]
  periodLocks: PeriodLock[]
  dimensions: Dimension[]
  openingBalances: OpeningBalance[]
  budgets: Budget[]
  dailyForecasts: DailyForecast[]
  expenses: Expense[]
  payments: Payment[]
  creditNotes: CreditNote[]
  purchaseOrders: PurchaseOrder[]
  taxRates: TaxRate[]
  paymentTerms: PaymentTerm[]
  bankReconciliations: BankReconciliation[]
  reports: FinancialReport[]
  currencies: Currency[]
  loading: boolean
  error: string | null
  basePath: string
  dataVersion: number // Increments on data changes to trigger re-renders
}

// Finance Action Types
type FinanceAction =
  | { type: "SET_ACCOUNTS"; payload: Account[] }
  | { type: "SET_TRANSACTIONS"; payload: Transaction[] }
  | { type: "SET_INVOICES"; payload: Invoice[] }
  | { type: "SET_QUOTES"; payload: Quote[] }
  | { type: "SET_BILLS"; payload: Bill[] }
  | { type: "SET_CONTACTS"; payload: Contact[] }
  | { type: "SET_BANK_ACCOUNTS"; payload: BankAccount[] }
  | { type: "SET_BANK_STATEMENTS"; payload: BankStatement[] }
  | { type: "SET_BANK_RULES"; payload: BankRule[] }
  | { type: "SET_BANK_TRANSFERS"; payload: BankTransfer[] }
  | { type: "SET_CLEARING_ACCOUNTS"; payload: ClearingAccount[] }
  | { type: "SET_FX_REVALUATIONS"; payload: FXRevaluation[] }
  | { type: "SET_BUDGETS"; payload: Budget[] }
  | { type: "SET_DAILY_FORECASTS"; payload: DailyForecast[] }
  | { type: "SET_EXPENSES"; payload: Expense[] }
  | { type: "SET_PAYMENTS"; payload: Payment[] }
  | { type: "SET_CREDIT_NOTES"; payload: CreditNote[] }
  | { type: "SET_PURCHASE_ORDERS"; payload: PurchaseOrder[] }
  | { type: "SET_TAX_RATES"; payload: TaxRate[] }
  | { type: "SET_PAYMENT_TERMS"; payload: PaymentTerm[] }
  | { type: "SET_BANK_RECONCILIATIONS"; payload: BankReconciliation[] }
  | { type: "SET_REPORTS"; payload: FinancialReport[] }
  | { type: "SET_CURRENCIES"; payload: Currency[] }
  | { type: "SET_JOURNALS"; payload: Journal[] }
  | { type: "SET_PERIOD_LOCKS"; payload: PeriodLock[] }
  | { type: "SET_DIMENSIONS"; payload: Dimension[] }
  | { type: "SET_OPENING_BALANCES"; payload: OpeningBalance[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_BASE_PATH"; payload: string }
  | { 
      type: "BATCH_UPDATE"; 
      payload: {
        accounts?: Account[]
        transactions?: Transaction[]
        invoices?: Invoice[]
        quotes?: Quote[]
        bills?: Bill[]
        contacts?: Contact[]
        bankAccounts?: BankAccount[]
        bankStatements?: BankStatement[]
        bankRules?: BankRule[]
        bankTransfers?: BankTransfer[]
        clearingAccounts?: ClearingAccount[]
        fxRevaluations?: FXRevaluation[]
        journals?: Journal[]
        periodLocks?: PeriodLock[]
        dimensions?: Dimension[]
        openingBalances?: OpeningBalance[]
        budgets?: Budget[]
        dailyForecasts?: DailyForecast[]
        expenses?: Expense[]
        payments?: Payment[]
        creditNotes?: CreditNote[]
        purchaseOrders?: PurchaseOrder[]
        taxRates?: TaxRate[]
        paymentTerms?: PaymentTerm[]
        bankReconciliations?: BankReconciliation[]
        reports?: FinancialReport[]
        currencies?: Currency[]
      }
    }

// Initial State
const initialState: FinanceState = {
  accounts: [],
  transactions: [],
  invoices: [],
  quotes: [],
  bills: [],
  contacts: [],
  bankAccounts: [],
  bankStatements: [],
  bankRules: [],
  bankTransfers: [],
  clearingAccounts: [],
  fxRevaluations: [],
  journals: [],
  periodLocks: [],
  dimensions: [],
  openingBalances: [],
  budgets: [],
  dailyForecasts: [],
  expenses: [],
  payments: [],
  creditNotes: [],
  purchaseOrders: [],
  taxRates: [],
  paymentTerms: [],
  bankReconciliations: [],
  reports: [],
  currencies: [],
  loading: false,
  error: null,
  basePath: "",
  dataVersion: 0,
}

// Finance Reducer
const financeReducer = (state: FinanceState, action: FinanceAction): FinanceState => {
  switch (action.type) {
    case "SET_ACCOUNTS":
      return { ...state, accounts: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_TRANSACTIONS":
      return { ...state, transactions: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_INVOICES":
      return { ...state, invoices: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_QUOTES":
      return { ...state, quotes: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_BILLS":
      return { ...state, bills: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_CONTACTS":
      return { ...state, contacts: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_BANK_ACCOUNTS":
      return { ...state, bankAccounts: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_BANK_STATEMENTS":
      return { ...state, bankStatements: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_BANK_RULES":
      return { ...state, bankRules: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_BANK_TRANSFERS":
      return { ...state, bankTransfers: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_CLEARING_ACCOUNTS":
      return { ...state, clearingAccounts: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_FX_REVALUATIONS":
      return { ...state, fxRevaluations: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_BUDGETS":
      return { ...state, budgets: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_DAILY_FORECASTS":
      return { ...state, dailyForecasts: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_EXPENSES":
      return { ...state, expenses: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_PAYMENTS":
      return { ...state, payments: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_CREDIT_NOTES":
      return { ...state, creditNotes: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_PURCHASE_ORDERS":
      return { ...state, purchaseOrders: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_TAX_RATES":
      return { ...state, taxRates: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_PAYMENT_TERMS":
      return { ...state, paymentTerms: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_BANK_RECONCILIATIONS":
      return { ...state, bankReconciliations: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_JOURNALS":
      return { ...state, journals: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_PERIOD_LOCKS":
      return { ...state, periodLocks: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_DIMENSIONS":
      return { ...state, dimensions: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_OPENING_BALANCES":
      return { ...state, openingBalances: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_REPORTS":
      return { ...state, reports: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_CURRENCIES":
      return { ...state, currencies: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_BASE_PATH":
      return { ...state, basePath: action.payload }
    case "BATCH_UPDATE":
      return {
        ...state,
        ...(action.payload.accounts !== undefined && { accounts: action.payload.accounts }),
        ...(action.payload.transactions !== undefined && { transactions: action.payload.transactions }),
        ...(action.payload.invoices !== undefined && { invoices: action.payload.invoices }),
        ...(action.payload.quotes !== undefined && { quotes: action.payload.quotes }),
        ...(action.payload.bills !== undefined && { bills: action.payload.bills }),
        ...(action.payload.contacts !== undefined && { contacts: action.payload.contacts }),
        ...(action.payload.bankAccounts !== undefined && { bankAccounts: action.payload.bankAccounts }),
        ...(action.payload.bankStatements !== undefined && { bankStatements: action.payload.bankStatements }),
        ...(action.payload.bankRules !== undefined && { bankRules: action.payload.bankRules }),
        ...(action.payload.bankTransfers !== undefined && { bankTransfers: action.payload.bankTransfers }),
        ...(action.payload.clearingAccounts !== undefined && { clearingAccounts: action.payload.clearingAccounts }),
        ...(action.payload.fxRevaluations !== undefined && { fxRevaluations: action.payload.fxRevaluations }),
        ...(action.payload.journals !== undefined && { journals: action.payload.journals }),
        ...(action.payload.periodLocks !== undefined && { periodLocks: action.payload.periodLocks }),
        ...(action.payload.dimensions !== undefined && { dimensions: action.payload.dimensions }),
        ...(action.payload.budgets !== undefined && { budgets: action.payload.budgets }),
        ...(action.payload.dailyForecasts !== undefined && { dailyForecasts: action.payload.dailyForecasts }),
        ...(action.payload.expenses !== undefined && { expenses: action.payload.expenses }),
        ...(action.payload.payments !== undefined && { payments: action.payload.payments }),
        ...(action.payload.creditNotes !== undefined && { creditNotes: action.payload.creditNotes }),
        ...(action.payload.purchaseOrders !== undefined && { purchaseOrders: action.payload.purchaseOrders }),
        ...(action.payload.taxRates !== undefined && { taxRates: action.payload.taxRates }),
        ...(action.payload.paymentTerms !== undefined && { paymentTerms: action.payload.paymentTerms }),
        ...(action.payload.bankReconciliations !== undefined && { bankReconciliations: action.payload.bankReconciliations }),
        ...(action.payload.reports !== undefined && { reports: action.payload.reports }),
        ...(action.payload.currencies !== undefined && { currencies: action.payload.currencies }),
        dataVersion: state.dataVersion + 1 // Increment version once for the batch update
      }
    default:
      return state
  }
}

// Finance Context Type
interface FinanceContextType {
  state: FinanceState
  dispatch: React.Dispatch<FinanceAction>
  // =======================
  // Settings API (no direct Firebase in UI)
  // Stored under companies/<id>/settings/finance[/sites...][/subsites...]
  // Integrations under companies/<id>/settings/finance/integrations[/sites...][/subsites...]
  // =======================
  getFinanceSettingsPath: () => string | null
  loadFinanceSettings: () => Promise<Record<string, any> | null>
  saveFinanceSettings: (settings: Record<string, any>) => Promise<void>
  loadFinanceIntegrations: () => Promise<Record<string, any>>
  saveFinanceIntegration: (integration: { id: string } & Record<string, any>) => Promise<void>
  // Permission functions
  canViewFinance: () => boolean
  canEditFinance: () => boolean
  canDeleteFinance: () => boolean
  isOwner: () => boolean
  // Refresh functions
  refreshAccounts: () => Promise<void>
  refreshTransactions: () => Promise<void>
  refreshInvoices: () => Promise<void>
  refreshQuotes: () => Promise<void>
  refreshBills: () => Promise<void>
  refreshContacts: () => Promise<void>
  refreshBankAccounts: () => Promise<void>
  refreshBankStatements: () => Promise<void>
  refreshBankRules: () => Promise<void>
  refreshBankTransfers: () => Promise<void>
  refreshClearingAccounts: () => Promise<void>
  refreshFXRevaluations: () => Promise<void>
  refreshJournals: () => Promise<void>
  refreshPeriodLocks: () => Promise<void>
  refreshDimensions: () => Promise<void>
  refreshOpeningBalances: () => Promise<void>
  refreshBudgets: () => Promise<void>
  refreshDailyForecasts: () => Promise<void>
  refreshExpenses: () => Promise<void>
  refreshPayments: () => Promise<void>
  refreshCreditNotes: () => Promise<void>
  refreshPurchaseOrders: () => Promise<void>
  refreshTaxRates: () => Promise<void>
  refreshPaymentTerms: () => Promise<void>
  refreshBankReconciliations: () => Promise<void>
  refreshReports: () => Promise<void>
  refreshCurrencies: () => Promise<void>
  refreshAll: () => Promise<void>
  // Account operations
  createAccount: (account: Omit<Account, "id">) => Promise<void>
  updateAccount: (accountId: string, updates: Partial<Account>) => Promise<void>
  deleteAccount: (accountId: string) => Promise<void>
  // Invoice operations
  createInvoice: (invoice: any) => Promise<void>
  updateInvoice: (invoiceId: string, updates: any) => Promise<void>
  deleteInvoice: (invoiceId: string) => Promise<void>
  sendInvoice: (invoiceId: string) => Promise<void>
  approveInvoice: (invoiceId: string) => Promise<void>
  markInvoicePaid: (invoiceId: string, paymentAmount: number) => Promise<void>
  // Quote operations
  createQuote: (quote: Omit<Quote, "id"> | any) => Promise<void>
  updateQuote: (quoteId: string, updates: Partial<Quote> | any) => Promise<void>
  deleteQuote: (quoteId: string) => Promise<void>
  // Bill operations
  createBill: (bill: Omit<Bill, "id">) => Promise<void>
  updateBill: (billId: string, updates: Partial<Bill>) => Promise<void>
  deleteBill: (billId: string) => Promise<void>
  approveBill: (billId: string) => Promise<void>
  markBillPaid: (billId: string, paymentAmount: number, paymentDate?: string, paymentMethod?: string, bankAccountId?: string) => Promise<void>
  // Contact operations
  createContact: (contact: Omit<Contact, "id">) => Promise<void>
  updateContact: (contactId: string, updates: Partial<Contact>) => Promise<void>
  deleteContact: (contactId: string) => Promise<void>
  // Payment operations
  createPayment: (payment: Partial<Payment>) => Promise<void>
  updatePayment: (paymentId: string, updates: Partial<Payment>) => Promise<void>
  deletePayment: (paymentId: string) => Promise<void>
  allocatePayment: (paymentId: string, allocations: any[]) => Promise<void>
  // Bank operations
  createBankAccount: (bankAccount: Omit<BankAccount, "id">) => Promise<void>
  updateBankAccount: (bankAccountId: string, updates: Partial<BankAccount>) => Promise<void>
  deleteBankAccount: (bankAccountId: string) => Promise<void>
  startReconciliation: (bankAccountId: string, statementDate: Date, closingBalance?: number, reconciledBy?: string) => Promise<void>
  reconcileTransaction: (transactionId: string, statementLineId: string) => Promise<void>
  completeReconciliation: (reconciliationId: string) => Promise<void>
  // Bank Statement operations
  createBankStatement: (statement: Omit<BankStatement, "id">) => Promise<void>
  updateBankStatement: (statementId: string, updates: Partial<BankStatement>) => Promise<void>
  importBankStatements: (bankAccountId: string, statements: Omit<BankStatement, "id" | "bank_account_id">[]) => Promise<void>
  autoMatchStatements: (bankAccountId: string) => Promise<void>
  manualMatchStatement: (statementId: string, transactionId: string) => Promise<void>
  codeUncategorizedTransaction: (statementId: string, accountId: string, taxRateId?: string) => Promise<void>
  // Bank Rule operations
  createBankRule: (rule: Omit<BankRule, "id">) => Promise<void>
  updateBankRule: (ruleId: string, updates: Partial<BankRule>) => Promise<void>
  deleteBankRule: (ruleId: string) => Promise<void>
  // Bank Transfer operations
  createBankTransfer: (transfer: Omit<BankTransfer, "id">) => Promise<void>
  updateBankTransfer: (transferId: string, updates: Partial<BankTransfer>) => Promise<void>
  deleteBankTransfer: (transferId: string) => Promise<void>
  // Clearing Account operations
  createClearingAccount: (clearing: Omit<ClearingAccount, "id">) => Promise<void>
  updateClearingAccount: (clearingId: string, updates: Partial<ClearingAccount>) => Promise<void>
  deleteClearingAccount: (clearingId: string) => Promise<void>
  // FX Revaluation operations
  createFXRevaluation: (fx: Omit<FXRevaluation, "id">) => Promise<void>
  updateFXRevaluation: (fxId: string, updates: Partial<FXRevaluation>) => Promise<void>
  // Journal operations
  createJournal: (journal: Omit<Journal, "id">) => Promise<void>
  updateJournal: (journalId: string, updates: Partial<Journal>) => Promise<void>
  deleteJournal: (journalId: string) => Promise<void>
  approveJournal: (journalId: string, approvedBy: string) => Promise<void>
  postJournal: (journalId: string, postedBy: string) => Promise<void>
  reverseJournal: (journalId: string, reversedBy: string, reversalDate: string) => Promise<Journal>
  // Period Lock operations
  createPeriodLock: (lock: Omit<PeriodLock, "id">) => Promise<void>
  updatePeriodLock: (lockId: string, updates: Partial<PeriodLock>) => Promise<void>
  deletePeriodLock: (lockId: string) => Promise<void>
  unlockPeriod: (lockId: string, reason?: string) => Promise<void>
  checkPeriodLocked: (date: string) => Promise<boolean>
  // Dimension operations
  createDimension: (dimension: Omit<Dimension, "id">) => Promise<void>
  updateDimension: (dimensionId: string, updates: Partial<Dimension>) => Promise<void>
  deleteDimension: (dimensionId: string) => Promise<void>
  performFXRevaluation: (bankAccountId: string, revaluationDate: string) => Promise<void>
  // Credit Note operations
  createCreditNote: (creditNote: Omit<CreditNote, "id">) => Promise<void>
  updateCreditNote: (creditNoteId: string, updates: Partial<CreditNote>) => Promise<void>
  deleteCreditNote: (creditNoteId: string) => Promise<void>
  // Purchase Order operations
  createPurchaseOrder: (purchaseOrder: Omit<PurchaseOrder, "id">) => Promise<void>
  updatePurchaseOrder: (purchaseOrderId: string, updates: Partial<PurchaseOrder>) => Promise<void>
  deletePurchaseOrder: (purchaseOrderId: string) => Promise<void>
  // Tax Rate operations
  createTaxRate: (taxRate: Omit<TaxRate, "id">) => Promise<void>
  updateTaxRate: (taxRateId: string, updates: Partial<TaxRate>) => Promise<void>
  deleteTaxRate: (taxRateId: string) => Promise<void>
  // Budget operations
  createBudget: (budget: Omit<Budget, "id">) => Promise<void>
  updateBudget: (budgetId: string, updates: Partial<Budget>) => Promise<void>
  deleteBudget: (budgetId: string) => Promise<void>
  addBudgetLine: (budgetId: string, line: Omit<BudgetLine, "id" | "budget_id">) => Promise<void>
  updateBudgetLine: (budgetId: string, lineId: string, updates: Partial<BudgetLine>) => Promise<void>
  deleteBudgetLine: (budgetId: string, lineId: string) => Promise<void>
  generateBudgetVsActual: (budgetId: string, period?: string) => Promise<BudgetVsActual[]>
  // Daily forecast operations (finance/forecasting + scheduling comparisons)
  upsertDailyForecast: (forecast: Omit<DailyForecast, "id"> & { id?: string }) => Promise<void>
  deleteDailyForecast: (forecastId: string) => Promise<void>
  // Report generation
  generateProfitLoss: (startDate: string, endDate: string, dimensionIds?: Record<string, string>) => Promise<any>
  generateBalanceSheet: (asOfDate: string, dimensionIds?: Record<string, string>) => Promise<any>
  generateCashFlow: (startDate: string, endDate: string) => Promise<any>
  generateTrialBalance: (asOfDate: string) => Promise<any>
  generateGeneralLedger: (accountId: string, startDate: string, endDate: string) => Promise<any>
  generateARAging: (asOfDate: string) => Promise<any>
  generateAPAging: (asOfDate: string) => Promise<any>
  generateTaxReport: (startDate: string, endDate: string, taxRateId?: string) => Promise<any>
  // Currency operations
  createCurrency: (currency: Currency) => Promise<void>
  updateCurrency: (currencyCode: string, updates: Partial<Currency>) => Promise<void>
  deleteCurrency: (currencyCode: string) => Promise<void>
  // Report operations
  generateReport: (reportType: string, period: any, parameters?: any) => Promise<void>
  saveReport: (report: Omit<FinancialReport, "id">) => Promise<void>
  deleteReport: (reportId: string) => Promise<void>
  // Expense operations
  createExpense: (expense: Omit<Expense, "id">) => Promise<void>
  updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>
  approveExpense: (expenseId: string) => Promise<void>
  rejectExpense: (expenseId: string) => Promise<void>
  reimburseExpense: (expenseId: string) => Promise<void>
  // Transaction operations
  createTransaction: (transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => Promise<void>
  // Utility functions
  calculateTax: (amount: number, taxRateId: string) => number
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) => Promise<number>
  formatCurrency: (amount: number, currency?: string) => string
  getAccountBalance: (accountId: string) => number
  getOutstandingInvoices: () => Invoice[]
  getOverdueBills: () => Bill[]
  getCashFlowProjection: (months: number) => any[]
}

// Finance Provider Props
interface FinanceProviderProps {
  children: React.ReactNode
}

// Create Finance Context
const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

// Finance Provider Component
export const FinanceProvider: FC<FinanceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(financeReducer, initialState)
  const { state: companyState, isOwner, hasPermission } = useCompany()
  const { state: settingsState } = useSettings()
  
  // Check if dependent contexts have loaded their core data
  // Finance should start after Stock, POS, HR, and Bookings core have loaded
  const stockContext = useStock()
  const hrContext = useHR()
  const bookingsContext = useBookings()
  const posContext = usePOS()
  
  // Check if core data is loaded - contexts are considered loaded if they have data OR have been initialized (empty arrays are valid)
  // Stock: products and measures
  const stockCoreLoaded = stockContext.state.products !== undefined && stockContext.state.measures !== undefined
  // HR: employees, roles, departments
  const hrCoreLoaded = hrContext.state.employees !== undefined && hrContext.state.roles !== undefined && hrContext.state.departments !== undefined
  // Bookings: bookings and tables
  const bookingsCoreLoaded = bookingsContext.bookings !== undefined && bookingsContext.tables !== undefined
  // POS: bills, paymentTypes, tables
  const posCoreLoaded = posContext.state.bills !== undefined && posContext.state.paymentTypes !== undefined && posContext.state.tables !== undefined
  
  const dependentContextsLoaded = stockCoreLoaded && hrCoreLoaded && bookingsCoreLoaded && posCoreLoaded

  // Track resolved base paths per finance node so reads/writes stay consistent.
  // This prevents writing to a different scope (company/site/subsite) than where data was loaded from.
  const accountsPathRef = useRef<string>("")
  const transactionsPathRef = useRef<string>("")
  const invoicesPathRef = useRef<string>("")
  const quotesPathRef = useRef<string>("")
  const billsPathRef = useRef<string>("")
  const contactsPathRef = useRef<string>("")
  const bankAccountsPathRef = useRef<string>("")
  const budgetsPathRef = useRef<string>("")
  const dailyForecastsPathRef = useRef<string>("")
  const expensesPathRef = useRef<string>("")
  const paymentsPathRef = useRef<string>("")
  const currenciesPathRef = useRef<string>("")
  const reportsPathRef = useRef<string>("")

  const clearResolvedFinancePaths = useCallback(() => {
    accountsPathRef.current = ""
    transactionsPathRef.current = ""
    invoicesPathRef.current = ""
    quotesPathRef.current = ""
    billsPathRef.current = ""
    contactsPathRef.current = ""
    bankAccountsPathRef.current = ""
    budgetsPathRef.current = ""
    dailyForecastsPathRef.current = ""
    expensesPathRef.current = ""
    paymentsPathRef.current = ""
    currenciesPathRef.current = ""
    reportsPathRef.current = ""
  }, [])

  // Multi-path loading functions
  const getFinancePaths = useCallback(() => {
    const paths: string[] = []
    if (!companyState.companyID) return paths

    const companyRoot = `companies/${companyState.companyID}`
    const cfgLevel = (companyState as any)?.dataManagement?.finance || "company"

    // Always include company-level as a fallback so we can read legacy/company-scoped finance data.
    const companyPath = `${companyRoot}/data/finance`

    if (cfgLevel === "subsite") {
      if (companyState.selectedSiteID && companyState.selectedSubsiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/subsites/${companyState.selectedSubsiteID}/data/finance`)
      }
      if (companyState.selectedSiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/finance`)
      }
      paths.push(companyPath)
      return paths
    }

    if (cfgLevel === "site") {
      if (companyState.selectedSiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/finance`)
      }
      paths.push(companyPath)
      return paths
    }

    // Default: company-level finance
    paths.push(companyPath)
    return paths
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, (companyState as any)?.dataManagement?.finance])

  const getFinanceWritePath = useCallback(() => {
    if (!companyState.companyID) return ""

    const companyRoot = `companies/${companyState.companyID}`
    const cfgLevel = (companyState as any)?.dataManagement?.finance || "company"

    if (cfgLevel === "subsite") {
      if (companyState.selectedSiteID && companyState.selectedSubsiteID) {
        return `${companyRoot}/sites/${companyState.selectedSiteID}/subsites/${companyState.selectedSubsiteID}/data/finance`
      }
      if (companyState.selectedSiteID) {
        return `${companyRoot}/sites/${companyState.selectedSiteID}/data/finance`
      }
      return `${companyRoot}/data/finance`
    }

    if (cfgLevel === "site") {
      if (companyState.selectedSiteID) return `${companyRoot}/sites/${companyState.selectedSiteID}/data/finance`
      return `${companyRoot}/data/finance`
    }

    return `${companyRoot}/data/finance`
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, (companyState as any)?.dataManagement?.finance])

  const getFinanceRootFromDataPath = useCallback((financeDataPath: string): string => {
    // Converts `.../data/finance` -> `...` (site/subsite root).
    return financeDataPath.replace(/\/data\/finance\/?$/, "")
  }, [])

  const resolveFinanceNodeBasePath = useCallback(
    async (nodeName: string, pathRef: React.MutableRefObject<string>): Promise<string> => {
      // If we already resolved this node for the current scope, reuse it.
      if (pathRef.current) return pathRef.current

      const paths = getFinancePaths()
      const writePath = getFinanceWritePath()

      // Search each candidate finance data path for the node.
      for (const p of paths) {
        const canonicalNodePath = `${p}/${nodeName}`
        try {
          const snap = await get(ref(db, canonicalNodePath))
          if (snap.exists()) {
            pathRef.current = p
            return p
          }
        } catch {
          // ignore and keep checking other fallbacks
        }

        // Legacy 1: data accidentally stored at the site/subsite root (missing `/data/finance`)
        const root = getFinanceRootFromDataPath(p)
        const legacyRootNodePath = `${root}/${nodeName}`
        try {
          const legacySnap = await get(ref(db, legacyRootNodePath))
          if (legacySnap.exists()) {
            await set(ref(db, canonicalNodePath), legacySnap.val())
            await set(ref(db, legacyRootNodePath), null)
            pathRef.current = p
            return p
          }
        } catch {
          // ignore
        }

        // Legacy 2: data accidentally stored with a duplicated `/data/finance`
        const legacyDoubleNodePath = `${p}/data/finance/${nodeName}`
        try {
          const legacySnap2 = await get(ref(db, legacyDoubleNodePath))
          if (legacySnap2.exists()) {
            await set(ref(db, canonicalNodePath), legacySnap2.val())
            await set(ref(db, legacyDoubleNodePath), null)
            pathRef.current = p
            return p
          }
        } catch {
          // ignore
        }
      }

      // No existing node found anywhere; default to writePath (or first path).
      const fallback = writePath || paths[0] || ""
      pathRef.current = fallback
      return fallback
    },
    [getFinancePaths, getFinanceWritePath, getFinanceRootFromDataPath],
  )

  // =======================
  // Finance module settings (NOT /data/finance)
  // =======================
  const getFinanceSettingsPath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/finance`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const getFinanceIntegrationsPath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/finance/integrations`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadFinanceSettings = useCallback(async () => {
    const path = getFinanceSettingsPath()
    if (!path) return null
    try {
      return await fetchFinanceSettingsFn(path)
    } catch (err: any) {
      debugWarn("FinanceContext: loadFinanceSettings failed", err)
      return null
    }
  }, [getFinanceSettingsPath])

  const saveFinanceSettings = useCallback(async (settings: Record<string, any>) => {
    const path = getFinanceSettingsPath()
    if (!path) return
    await saveFinanceSettingsFn(path, settings)
  }, [getFinanceSettingsPath])

  const loadFinanceIntegrations = useCallback(async () => {
    const path = getFinanceIntegrationsPath()
    if (!path) return {}
    try {
      return await fetchFinanceIntegrationsFn(path)
    } catch (err: any) {
      debugWarn("FinanceContext: loadFinanceIntegrations failed", err)
      return {}
    }
  }, [getFinanceIntegrationsPath])

  const saveFinanceIntegration = useCallback(async (integration: { id: string } & Record<string, any>) => {
    const path = getFinanceIntegrationsPath()
    if (!path || !integration?.id) return
    await saveFinanceIntegrationFn(path, integration)
  }, [getFinanceIntegrationsPath])

  // Update base path when company/site/subsite changes
  useEffect(() => {
    clearResolvedFinancePaths()
    const paths = getFinancePaths()
    if (paths.length > 0) {
      dispatch({ type: "SET_BASE_PATH", payload: paths[0] })
    } else {
      // Clear basePath when no paths available (no company/site selected)
      dispatch({ type: "SET_BASE_PATH", payload: "" })
      lastLoadedPathRef.current = "" // Reset last loaded path
    }
  }, [getFinancePaths, clearResolvedFinancePaths])

  // Refresh functions with multi-path loading
  const refreshAccounts = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("accounts", accountsPathRef)
    if (!basePath) return
    
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const accounts = await fetchAccounts(basePath)
      dispatch({ type: "SET_ACCOUNTS", payload: accounts || [] })
      debugLog(`All accounts loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching accounts:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch accounts" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [resolveFinanceNodeBasePath])

  const refreshTransactions = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("transactions", transactionsPathRef)
    if (!basePath) return
    
    try {
      const transactions = await fetchTransactions(basePath)
      dispatch({ type: "SET_TRANSACTIONS", payload: transactions || [] })
      debugLog(`All transactions loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching transactions:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshInvoices = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("invoices", invoicesPathRef)
    if (!basePath) return
    
    try {
      const invoices = await fetchInvoices(basePath)
      dispatch({ type: "SET_INVOICES", payload: invoices || [] })
      debugLog(`All invoices loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching invoices:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshQuotes = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("quotes", quotesPathRef)
    if (!basePath) return

    try {
      const quotes = await fetchQuotes(basePath)
      dispatch({ type: "SET_QUOTES", payload: quotes || [] })
      debugLog(`All quotes loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching quotes:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshBills = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("bills", billsPathRef)
    if (!basePath) return
    
    try {
      const bills = await fetchBills(basePath)
      dispatch({ type: "SET_BILLS", payload: bills || [] })
      debugLog(`All bills loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching bills:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshContacts = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("contacts", contactsPathRef)
    if (!basePath) return
    
    try {
      const contacts = await fetchContacts(basePath)
      dispatch({ type: "SET_CONTACTS", payload: contacts || [] })
      debugLog(`All contacts loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching contacts:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshBankAccounts = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("bankAccounts", bankAccountsPathRef)
    if (!basePath) return
    
    try {
      const bankAccounts = await fetchBankAccounts(basePath)
      dispatch({ type: "SET_BANK_ACCOUNTS", payload: bankAccounts || [] })
      debugLog(`All bank accounts loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching bank accounts:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshBankStatements = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const statements = await fetchBankStatements(path)
          if (statements && statements.length > 0) {
            dispatch({ type: "SET_BANK_STATEMENTS", payload: statements })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load bank statements from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching bank statements:", error)
    }
  }, [getFinancePaths])

  const refreshBankRules = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      let loadedAny = false
      for (const path of paths) {
        try {
          const rules = await fetchBankRules(path)
          if (rules) {
            if (rules.length > 0) {
              dispatch({ type: "SET_BANK_RULES", payload: rules })
              loadedAny = true
              break
            }
            // If the node exists but is empty for this path, remember that we checked it.
            loadedAny = true
          }
        } catch (error) {
          debugWarn(`Failed to load bank rules from ${path}:`, error)
        }
      }
      // Ensure state is not left stale when no rules exist anywhere.
      if (!loadedAny) {
        dispatch({ type: "SET_BANK_RULES", payload: [] })
      }
    } catch (error) {
      debugWarn("Error fetching bank rules:", error)
    }
  }, [getFinancePaths])

  const refreshBankTransfers = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const transfers = await fetchBankTransfers(path)
          if (transfers && transfers.length > 0) {
            dispatch({ type: "SET_BANK_TRANSFERS", payload: transfers })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load bank transfers from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching bank transfers:", error)
    }
  }, [getFinancePaths])

  const refreshClearingAccounts = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const clearing = await fetchClearingAccounts(path)
          if (clearing && clearing.length > 0) {
            dispatch({ type: "SET_CLEARING_ACCOUNTS", payload: clearing })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load clearing accounts from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching clearing accounts:", error)
    }
  }, [getFinancePaths])

  const refreshFXRevaluations = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const fx = await fetchFXRevaluations(path)
          if (fx && fx.length > 0) {
            dispatch({ type: "SET_FX_REVALUATIONS", payload: fx })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load FX revaluations from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching FX revaluations:", error)
    }
  }, [getFinancePaths])

  const refreshJournals = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const journals = await fetchJournals(path)
          if (journals && journals.length > 0) {
            dispatch({ type: "SET_JOURNALS", payload: journals })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load journals from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching journals:", error)
    }
  }, [getFinancePaths])

  const refreshDimensions = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const dimensions = await fetchDimensions(path)
          if (dimensions && dimensions.length > 0) {
            dispatch({ type: "SET_DIMENSIONS", payload: dimensions })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load dimensions from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching dimensions:", error)
    }
  }, [getFinancePaths])

  const refreshPeriodLocks = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const locks = await fetchPeriodLocks(path)
          if (locks && locks.length > 0) {
            dispatch({ type: "SET_PERIOD_LOCKS", payload: locks })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load period locks from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching period locks:", error)
    }
  }, [getFinancePaths])

  const refreshOpeningBalances = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const balances = await fetchOpeningBalances(path)
          if (balances && balances.length > 0) {
            dispatch({ type: "SET_OPENING_BALANCES", payload: balances })
            break
          }
        } catch (error) {
          debugWarn(`Failed to load opening balances from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching opening balances:", error)
    }
  }, [getFinancePaths])

  const refreshBudgets = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      let budgetsFound = false
      for (const path of paths) {
        try {
          const budgets = await fetchBudgets(path)
          // Always dispatch, even if empty array, to ensure state updates after deletions
          if (budgets !== undefined) {
            dispatch({ type: "SET_BUDGETS", payload: budgets })
            debugLog(`Budgets loaded from path: ${path} (${budgets.length} budgets)`)
            budgetsFound = true
            break
          }
        } catch (error) {
          debugWarn(`Failed to load budgets from ${path}:`, error)
        }
      }
      // If no budgets found in any path, dispatch empty array to clear state
      if (!budgetsFound) {
        dispatch({ type: "SET_BUDGETS", payload: [] })
      }
    } catch (error) {
      debugWarn("Error fetching budgets:", error)
      // Dispatch empty array on error to ensure state is cleared
      dispatch({ type: "SET_BUDGETS", payload: [] })
    }
  }, [getFinancePaths])

  const refreshDailyForecasts = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("daily_forecasts", dailyForecastsPathRef)
    if (!basePath) return

    try {
      const forecasts = await fetchDailyForecasts(basePath)
      dispatch({ type: "SET_DAILY_FORECASTS", payload: forecasts || [] })
      debugLog(`Daily forecasts loaded from path: ${basePath} (${(forecasts || []).length} rows)`)
    } catch (error) {
      debugWarn("Error fetching daily forecasts:", error)
      dispatch({ type: "SET_DAILY_FORECASTS", payload: [] })
    }
  }, [resolveFinanceNodeBasePath])

  const refreshExpenses = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("expenses", expensesPathRef)
    if (!basePath) return
    
    try {
      const expenses = await fetchExpenses(basePath)
      dispatch({ type: "SET_EXPENSES", payload: expenses || [] })
      debugLog(`All expenses loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching expenses:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshPayments = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("payments", paymentsPathRef)
    if (!basePath) return
    
    try {
      const payments = await fetchPayments(basePath)
      dispatch({ type: "SET_PAYMENTS", payload: payments || [] })
      debugLog(`All payments loaded from path: ${basePath}`)
    } catch (error) {
      debugWarn("Error fetching payments:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshCreditNotes = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const creditNotes = await fetchCreditNotes(path)
          if (creditNotes && creditNotes.length > 0) {
            dispatch({ type: "SET_CREDIT_NOTES", payload: creditNotes })
            debugLog(`All credit notes loaded from path: ${path}`)
            break
          }
        } catch (error) {
          debugWarn(`Failed to load credit notes from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching credit notes:", error)
    }
  }, [getFinancePaths])

  const refreshPurchaseOrders = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const purchaseOrders = await fetchPurchaseOrders(path)
          if (purchaseOrders && purchaseOrders.length > 0) {
            dispatch({ type: "SET_PURCHASE_ORDERS", payload: purchaseOrders })
            debugLog(`All purchase orders loaded from path: ${path}`)
            break
          }
        } catch (error) {
          debugWarn(`Failed to load purchase orders from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching purchase orders:", error)
    }
  }, [getFinancePaths])

  const refreshTaxRates = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) return
    
    try {
      for (const path of paths) {
        try {
          const taxRates = await fetchTaxRates(path)
          if (taxRates && taxRates.length > 0) {
            dispatch({ type: "SET_TAX_RATES", payload: taxRates })
            debugLog(`All tax rates loaded from path: ${path}`)
            break
          }
        } catch (error) {
          debugWarn(`Failed to load tax rates from ${path}:`, error)
        }
      }
    } catch (error) {
      debugWarn("Error fetching tax rates:", error)
    }
  }, [getFinancePaths])

  const refreshPaymentTerms = useCallback(async () => {
    if (!state.basePath) return
    try {
      const paymentTerms = await getDefaultPaymentTerms()
      dispatch({ type: "SET_PAYMENT_TERMS", payload: paymentTerms })
    } catch (error) {
      debugWarn("Error fetching payment terms:", error)
    }
  }, [state.basePath])

  const refreshBankReconciliations = useCallback(async () => {
    if (!state.basePath) return
    try {
      // Bank reconciliations will be fetched when the function is implemented
      // For now, set empty array to avoid errors
      dispatch({ type: "SET_BANK_RECONCILIATIONS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching bank reconciliations:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch bank reconciliations" })
    }
  }, [state.basePath])

  const refreshReports = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("reports", reportsPathRef)
    if (!basePath) return
    try {
      const reports = await fetchReports(basePath)
      dispatch({ type: "SET_REPORTS", payload: reports })
    } catch (error) {
      debugWarn("Error fetching reports:", error)
    }
  }, [resolveFinanceNodeBasePath])

  const refreshCurrencies = useCallback(async () => {
    const basePath = await resolveFinanceNodeBasePath("currencies", currenciesPathRef)
    if (!basePath) return
    try {
      const currencies = await fetchCurrencies(basePath)
      dispatch({ type: "SET_CURRENCIES", payload: currencies })
    } catch (error) {
      debugWarn("Error fetching currencies:", error)
    }
  }, [resolveFinanceNodeBasePath])

  // Create cached fetchers for critical data
  const fetchAccountsCached = useMemo(() => createCachedFetcher(fetchAccounts, 'accounts'), [])
  const fetchTransactionsCached = useMemo(() => createCachedFetcher(fetchTransactions, 'transactions'), [])
  const fetchInvoicesCached = useMemo(() => createCachedFetcher(fetchInvoices, 'invoices'), [])
  const fetchQuotesCached = useMemo(() => createCachedFetcher(fetchQuotes, 'quotes'), [])
  const fetchBillsCached = useMemo(() => createCachedFetcher(fetchBills, 'bills'), [])
  const fetchContactsCached = useMemo(() => createCachedFetcher(fetchContacts, 'contacts'), [])

  // Track if we're currently loading to prevent duplicate loads
  const isLoadingRef = useRef(false)
  const lastLoadedPathRef = useRef<string>("")
  
  // Timer refs for performance tracking
  const financeTimersRef = useRef<{
    basePath: string | null
    coreTimerId: string | null
    allTimerId: string | null
    coreLogged: boolean
    allLogged: boolean
    cacheLogged: boolean
  }>({ basePath: null, coreTimerId: null, allTimerId: null, coreLogged: false, allLogged: false, cacheLogged: false })

  const refreshAll = useCallback(async () => {
    const paths = getFinancePaths()
    if (paths.length === 0) {
      // Avoid dispatch loops when nothing can load yet
      if (state.loading) dispatch({ type: "SET_LOADING", payload: false })
      return
    }
    
    const basePath = state.basePath || paths[0]
    
    // Prevent duplicate loading for same path while already loading.
    // IMPORTANT: do NOT block refreshes just because accounts are present; otherwise a partial/failed load can
    // "stick" and pages like Contacts/Journals won't be able to recover without a create/mutation.
    if (basePath === lastLoadedPathRef.current && isLoadingRef.current) {
      if (state.loading) dispatch({ type: "SET_LOADING", payload: false })
      return
    }
    
    // Mark as loading and update last loaded path
    isLoadingRef.current = true
    lastLoadedPathRef.current = basePath
    
    // Reset timers when switching scope
    if (financeTimersRef.current.basePath !== basePath) {
      financeTimersRef.current = {
        basePath,
        coreTimerId: performanceTimer.start("FinanceContext", "coreLoad"),
        allTimerId: performanceTimer.start("FinanceContext", "allLoad"),
        coreLogged: false,
        allLogged: false,
        cacheLogged: false,
      }
    } else {
      if (!financeTimersRef.current.coreTimerId) financeTimersRef.current.coreTimerId = performanceTimer.start("FinanceContext", "coreLoad")
      if (!financeTimersRef.current.allTimerId) financeTimersRef.current.allTimerId = performanceTimer.start("FinanceContext", "allLoad")
    }
    
    await measurePerformance('FinanceContext', 'refreshAll', async () => {
      dispatch({ type: "SET_LOADING", payload: true })
      
      try {
        debugLog("⏳ FinanceContext: Starting load", { basePath })

        // FAST UI: hydrate from cache immediately if available
        try {
          const [accountsCached, transactionsCached, invoicesCached, quotesCached, billsCached, contactsCached, 
                 bankAccountsCached, budgetsCached, expensesCached, paymentsCached, creditNotesCached,
                 purchaseOrdersCached, taxRatesCached, journalsCached, periodLocksCached, dimensionsCached,
                 openingBalancesCached, bankStatementsCached, bankRulesCached, bankTransfersCached,
                 clearingAccountsCached, fxRevaluationsCached] = await Promise.all([
            dataCache.peek<any[]>(`${basePath}/accounts`),
            dataCache.peek<any[]>(`${basePath}/transactions`),
            dataCache.peek<any[]>(`${basePath}/invoices`),
            dataCache.peek<any[]>(`${basePath}/quotes`),
            dataCache.peek<any[]>(`${basePath}/bills`),
            dataCache.peek<any[]>(`${basePath}/contacts`),
            dataCache.peek<any[]>(`${basePath}/bankAccounts`),
            dataCache.peek<any[]>(`${basePath}/budgets`),
            dataCache.peek<any[]>(`${basePath}/expenses`),
            dataCache.peek<any[]>(`${basePath}/payments`),
            dataCache.peek<any[]>(`${basePath}/creditNotes`),
            dataCache.peek<any[]>(`${basePath}/purchaseOrders`),
            dataCache.peek<any[]>(`${basePath}/taxRates`),
            dataCache.peek<any[]>(`${basePath}/journals`),
            dataCache.peek<any[]>(`${basePath}/periodLocks`),
            dataCache.peek<any[]>(`${basePath}/dimensions`),
            dataCache.peek<any[]>(`${basePath}/openingBalances`),
            dataCache.peek<any[]>(`${basePath}/bankStatements`),
            dataCache.peek<any[]>(`${basePath}/bankRules`),
            dataCache.peek<any[]>(`${basePath}/bankTransfers`),
            dataCache.peek<any[]>(`${basePath}/clearingAccounts`),
            dataCache.peek<any[]>(`${basePath}/fxRevaluations`),
          ])
          
          if (accountsCached || transactionsCached || invoicesCached || quotesCached || billsCached || contactsCached ||
              bankAccountsCached || budgetsCached || expensesCached || paymentsCached || creditNotesCached ||
              purchaseOrdersCached || taxRatesCached || journalsCached || periodLocksCached || dimensionsCached ||
              openingBalancesCached || bankStatementsCached || bankRulesCached || bankTransfersCached ||
              clearingAccountsCached || fxRevaluationsCached) {
            const payload: any = {}
            if (accountsCached !== null) payload.accounts = accountsCached || []
            if (transactionsCached !== null) payload.transactions = transactionsCached || []
            if (invoicesCached !== null) payload.invoices = invoicesCached || []
            if (quotesCached !== null) payload.quotes = quotesCached || []
            if (billsCached !== null) payload.bills = billsCached || []
            if (contactsCached !== null) payload.contacts = contactsCached || []
            if (bankAccountsCached !== null) payload.bankAccounts = bankAccountsCached || []
            if (budgetsCached !== null) payload.budgets = budgetsCached || []
            if (expensesCached !== null) payload.expenses = expensesCached || []
            if (paymentsCached !== null) payload.payments = paymentsCached || []
            if (creditNotesCached !== null) payload.creditNotes = creditNotesCached || []
            if (purchaseOrdersCached !== null) payload.purchaseOrders = purchaseOrdersCached || []
            if (taxRatesCached !== null) payload.taxRates = taxRatesCached || []
            if (journalsCached !== null) payload.journals = journalsCached || []
            if (periodLocksCached !== null) payload.periodLocks = periodLocksCached || []
            if (dimensionsCached !== null) payload.dimensions = dimensionsCached || []
            if (openingBalancesCached !== null) payload.openingBalances = openingBalancesCached || []
            if (bankStatementsCached !== null) payload.bankStatements = bankStatementsCached || []
            if (bankRulesCached !== null) payload.bankRules = bankRulesCached || []
            if (bankTransfersCached !== null) payload.bankTransfers = bankTransfersCached || []
            if (clearingAccountsCached !== null) payload.clearingAccounts = clearingAccountsCached || []
            if (fxRevaluationsCached !== null) payload.fxRevaluations = fxRevaluationsCached || []
            
            if (Object.keys(payload).length > 0) {
              // Mark as non-urgent so the UI stays responsive during hydration.
              React.startTransition(() => {
                dispatch({ type: "BATCH_UPDATE", payload })
              })
            }
            
            if (!financeTimersRef.current.cacheLogged) {
              financeTimersRef.current.cacheLogged = true
              debugLog("✅ FinanceContext: Cache hydrated")
            }
            // Set loading to false immediately after cache hydration for instant UI
            dispatch({ type: "SET_LOADING", payload: false })
          }
        } catch {
          // ignore
        }

        // Helper to fetch from first available path
        const fetchFromPaths = async <T,>(fetchFn: (path: string) => Promise<T[]>): Promise<T[]> => {
          for (const path of paths) {
            try {
              const data = await fetchFn(path)
              if (data && data.length > 0) return data
            } catch (error) {
              debugWarn(`Failed to load from ${path}:`, error)
              continue
            }
          }
          return []
        }
        
        // PROGRESSIVE LOADING: Critical data first (for immediate UI)
        const [accounts, transactions, invoices] = await Promise.all([
          fetchAccountsCached(basePath, false).catch(() => fetchFromPaths(fetchAccounts)),
          fetchTransactionsCached(basePath, false).catch(() => fetchFromPaths(fetchTransactions)),
          fetchInvoicesCached(basePath, false).catch(() => fetchFromPaths(fetchInvoices)),
        ])
        
        // Persist critical data to cache
        try { dataCache.set(`${basePath}/accounts`, accounts || []) } catch {}
        try { dataCache.set(`${basePath}/transactions`, transactions || []) } catch {}
        try { dataCache.set(`${basePath}/invoices`, invoices || []) } catch {}
        
        // Update critical data immediately
        React.startTransition(() => {
          dispatch({
            type: "BATCH_UPDATE",
            payload: {
              accounts: accounts || [],
              transactions: transactions || [],
              invoices: invoices || [],
            },
          })
        })
        
        // Core loaded timing (accounts/transactions/invoices)
        if (!financeTimersRef.current.coreLogged && financeTimersRef.current.coreTimerId) {
          const accountsLoaded = (accounts !== undefined)
          const transactionsLoaded = (transactions !== undefined)
          const invoicesLoaded = (invoices !== undefined)
          
          if (accountsLoaded && transactionsLoaded && invoicesLoaded) {
            financeTimersRef.current.coreLogged = true
            const duration = performanceTimer.end(financeTimersRef.current.coreTimerId, {
              accounts: (accounts || []).length || state.accounts.length,
              transactions: (transactions || []).length || state.transactions.length,
              invoices: (invoices || []).length || state.invoices.length,
            })
            debugLog(`✅ FinanceContext: Core loaded (${duration.toFixed(2)}ms)`)
          }
        }
        
        // Load management page data (needed by all finance pages)
        // These are required for Accounting, Banking, Budgeting, Expenses, Sales, Reports pages
        const [quotes, bills, contacts, bankAccounts, budgets, expenses, payments, creditNotes, purchaseOrders, taxRates, 
               journals, periodLocks, dimensions, openingBalances, bankStatements, bankRules, bankTransfers,
               clearingAccounts, fxRevaluations] = await Promise.all([
          fetchQuotesCached(basePath, false).catch(() => fetchFromPaths(fetchQuotes)),
          fetchBillsCached(basePath, false).catch(() => fetchFromPaths(fetchBills)),
          fetchContactsCached(basePath, false).catch(() => fetchFromPaths(fetchContacts)),
          fetchFromPaths(fetchBankAccounts).catch(() => []),
          fetchFromPaths(fetchBudgets).catch(() => []),
          fetchFromPaths(fetchExpenses).catch(() => []),
          fetchFromPaths(fetchPayments).catch(() => []),
          fetchFromPaths(fetchCreditNotes).catch(() => []),
          fetchFromPaths(fetchPurchaseOrders).catch(() => []),
          fetchFromPaths(fetchTaxRates).catch(() => []),
          basePath ? fetchJournals(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchPeriodLocks(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchDimensions(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchOpeningBalances(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchBankStatements(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchBankRules(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchBankTransfers(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchClearingAccounts(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchFXRevaluations(basePath).catch(() => []) : Promise.resolve([]),
        ])
        
        // Persist to cache
        try { dataCache.set(`${basePath}/quotes`, quotes || []) } catch {}
        try { dataCache.set(`${basePath}/bills`, bills || []) } catch {}
        try { dataCache.set(`${basePath}/contacts`, contacts || []) } catch {}
        try { dataCache.set(`${basePath}/bankAccounts`, bankAccounts || []) } catch {}
        try { dataCache.set(`${basePath}/budgets`, budgets || []) } catch {}
        try { dataCache.set(`${basePath}/expenses`, expenses || []) } catch {}
        try { dataCache.set(`${basePath}/payments`, payments || []) } catch {}
        try { dataCache.set(`${basePath}/creditNotes`, creditNotes || []) } catch {}
        try { dataCache.set(`${basePath}/purchaseOrders`, purchaseOrders || []) } catch {}
        try { dataCache.set(`${basePath}/taxRates`, taxRates || []) } catch {}
        try { dataCache.set(`${basePath}/journals`, journals || []) } catch {}
        try { dataCache.set(`${basePath}/periodLocks`, periodLocks || []) } catch {}
        try { dataCache.set(`${basePath}/dimensions`, dimensions || []) } catch {}
        try { dataCache.set(`${basePath}/openingBalances`, openingBalances || []) } catch {}
        try { dataCache.set(`${basePath}/bankStatements`, bankStatements || []) } catch {}
        try { dataCache.set(`${basePath}/bankRules`, bankRules || []) } catch {}
        try { dataCache.set(`${basePath}/bankTransfers`, bankTransfers || []) } catch {}
        try { dataCache.set(`${basePath}/clearingAccounts`, clearingAccounts || []) } catch {}
        try { dataCache.set(`${basePath}/fxRevaluations`, fxRevaluations || []) } catch {}
        
        // Load remaining background data (paymentTerms, currencies, reports, bankReconciliations)
        const [paymentTerms, currencies, reports, bankReconciliations] = await Promise.all([
          basePath ? Promise.resolve(getDefaultPaymentTerms()).catch(() => []) : Promise.resolve([]),
          basePath ? fetchCurrencies(basePath).catch(() => []) : Promise.resolve([]),
          basePath ? fetchReports(basePath).catch(() => []) : Promise.resolve([]),
          Promise.resolve([]), // Bank reconciliations not implemented yet
        ])
        
        // Update all data
        React.startTransition(() => {
          dispatch({
            type: "BATCH_UPDATE",
            payload: {
              quotes: quotes || [],
              bills: bills || [],
              contacts: contacts || [],
              bankAccounts: bankAccounts || [],
              budgets: budgets || [],
              expenses: expenses || [],
              payments: payments || [],
              creditNotes: creditNotes || [],
              purchaseOrders: purchaseOrders || [],
              taxRates: taxRates || [],
              paymentTerms: paymentTerms || [],
              bankReconciliations: bankReconciliations || [],
              reports: reports || [],
              currencies: currencies || [],
              journals: journals || [],
              periodLocks: periodLocks || [],
              dimensions: dimensions || [],
              openingBalances: openingBalances || [],
              bankStatements: bankStatements || [],
              bankRules: bankRules || [],
              bankTransfers: bankTransfers || [],
              clearingAccounts: clearingAccounts || [],
              fxRevaluations: fxRevaluations || [],
            },
          })
        })
        
        // All data loaded timing - fires when core + management data is complete
        if (!financeTimersRef.current.allLogged && financeTimersRef.current.allTimerId && financeTimersRef.current.coreLogged) {
          const allDataLoaded = (accounts !== undefined) && (transactions !== undefined) && (invoices !== undefined) &&
                                (bills !== undefined) && (contacts !== undefined) && (bankAccounts !== undefined) &&
                                (budgets !== undefined) && (expenses !== undefined) && (payments !== undefined) &&
                                (creditNotes !== undefined) && (purchaseOrders !== undefined) && (taxRates !== undefined) &&
                                (journals !== undefined) && (periodLocks !== undefined) && (dimensions !== undefined) &&
                                (openingBalances !== undefined) && (bankStatements !== undefined) && (bankRules !== undefined) &&
                                (bankTransfers !== undefined) && (clearingAccounts !== undefined) && (fxRevaluations !== undefined) &&
                                (paymentTerms !== undefined) && (currencies !== undefined) && (reports !== undefined)
          
          if (allDataLoaded) {
            financeTimersRef.current.allLogged = true
            const duration = performanceTimer.end(financeTimersRef.current.allTimerId, {
              accounts: (accounts || []).length || state.accounts.length,
              transactions: (transactions || []).length || state.transactions.length,
              invoices: (invoices || []).length || state.invoices.length,
              bills: (bills || []).length,
              contacts: (contacts || []).length,
              bankAccounts: (bankAccounts || []).length,
              budgets: (budgets || []).length,
              expenses: (expenses || []).length,
              payments: (payments || []).length,
              creditNotes: (creditNotes || []).length,
              purchaseOrders: (purchaseOrders || []).length,
              taxRates: (taxRates || []).length,
              journals: (journals || []).length,
              periodLocks: (periodLocks || []).length,
              dimensions: (dimensions || []).length,
              openingBalances: (openingBalances || []).length,
              bankStatements: (bankStatements || []).length,
              bankRules: (bankRules || []).length,
              bankTransfers: (bankTransfers || []).length,
              clearingAccounts: (clearingAccounts || []).length,
              fxRevaluations: (fxRevaluations || []).length,
              paymentTerms: (paymentTerms || []).length,
              currencies: (currencies || []).length,
              reports: (reports || []).length,
            })
            debugLog(`✅ FinanceContext: All data loaded (${duration.toFixed(2)}ms)`)
          }
        }
        
      } catch (error) {
        debugWarn("Error loading finance data:", error)
        dispatch({ type: "SET_ERROR", payload: "Failed to load finance data" })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
        isLoadingRef.current = false
      }
    }, () => ({
      accounts: state.accounts?.length || 0,
      transactions: state.transactions?.length || 0,
      invoices: state.invoices?.length || 0,
    }))
  }, [
    getFinancePaths,
    state.basePath,
    state.loading,
    state.accounts.length,
    state.transactions.length,
    state.invoices.length,
    fetchAccountsCached,
    fetchTransactionsCached,
    fetchInvoicesCached,
    fetchQuotesCached,
    fetchBillsCached,
    fetchContactsCached,
  ])

  // Keep latest refreshAll without forcing effects to rerun
  const refreshAllRef = useRef(refreshAll)
  useEffect(() => {
    refreshAllRef.current = refreshAll
  }, [refreshAll])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: FinanceContextType = useMemo(() => ({
    state,
    dispatch,
    getFinanceSettingsPath,
    loadFinanceSettings,
    saveFinanceSettings,
    loadFinanceIntegrations,
    saveFinanceIntegration,
    refreshAccounts,
    refreshTransactions,
    refreshInvoices,
    refreshQuotes,
    refreshBills,
    refreshContacts,
    refreshBankAccounts,
    refreshBankStatements,
    refreshBankRules,
    refreshBankTransfers,
    refreshClearingAccounts,
  refreshFXRevaluations,
  refreshJournals,
  refreshDimensions,
  refreshPeriodLocks,
  refreshOpeningBalances,
  refreshBudgets,
  refreshDailyForecasts,
    refreshExpenses,
    refreshPayments,
    refreshCreditNotes,
    refreshPurchaseOrders,
    refreshTaxRates,
    refreshPaymentTerms,
    refreshBankReconciliations,
    refreshReports,
    refreshCurrencies,
    refreshAll,
    createAccount: async (account: Omit<Account, "id">) => {
      const writePath = await resolveFinanceNodeBasePath("accounts", accountsPathRef)
      if (!writePath) return
      const createdAccount = await createAccount(writePath, stripUndefinedDeep(account))
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'finance',
          'created',
          'Account Created',
          `Account "${createdAccount.name || 'New Account'}" was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: createdAccount.id,
              entityName: createdAccount.name || 'Account',
              newValue: createdAccount,
              changes: {
                account: { from: {}, to: createdAccount }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      await refreshAccounts()
    },
    updateAccount: async (accountId: string, updates: Partial<Account>) => {
      const writePath = await resolveFinanceNodeBasePath("accounts", accountsPathRef)
      if (!writePath) return
      const originalAccount = state.accounts.find(a => a.id === accountId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updateAccount(writePath, accountId, cleanUpdates)
      
      // Add notification
      if (originalAccount) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'updated',
            'Account Updated',
            `Account "${cleanUpdates.name || originalAccount.name || 'Account'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: accountId,
                entityName: cleanUpdates.name || originalAccount.name || 'Account',
                oldValue: originalAccount,
                newValue: { ...originalAccount, ...cleanUpdates },
                changes: {
                  account: { from: originalAccount, to: { ...originalAccount, ...cleanUpdates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshAccounts()
    },
    deleteAccount: async (accountId) => {
      const writePath = await resolveFinanceNodeBasePath("accounts", accountsPathRef)
      if (!writePath) return
      const accountToDelete = state.accounts.find(a => a.id === accountId)
      await deleteAccount(writePath, accountId)
      
      // Add notification
      if (accountToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'deleted',
            'Account Deleted',
            `Account "${accountToDelete.name || 'Account'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: accountId,
                entityName: accountToDelete.name || 'Account',
                oldValue: accountToDelete,
                changes: {
                  account: { from: accountToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshAccounts()
    },
    createInvoice: async (invoice) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const createdInvoice = await createInvoice(writePath, stripUndefinedDeep(invoice))
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'finance',
          'created',
          'Invoice Created',
          `Invoice ${createdInvoice.invoiceNumber || 'new invoice'} was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: createdInvoice.id,
              entityName: `Invoice ${createdInvoice.invoiceNumber || createdInvoice.id}`,
              newValue: createdInvoice,
              changes: {
                invoice: { from: {}, to: createdInvoice }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      await refreshInvoices()
    },
    updateInvoice: async (invoiceId: string, updates: any) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const originalInvoice = state.invoices.find(i => i.id === invoiceId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updateInvoice(writePath, invoiceId, cleanUpdates)
      
      // Add notification
      if (originalInvoice) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'updated',
            'Invoice Updated',
            `Invoice ${originalInvoice.invoiceNumber || invoiceId} was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: invoiceId,
                entityName: `Invoice ${originalInvoice.invoiceNumber}`,
                oldValue: originalInvoice,
              newValue: { ...originalInvoice, ...cleanUpdates },
                changes: {
                invoice: { from: originalInvoice, to: { ...originalInvoice, ...cleanUpdates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshInvoices()
    },
    deleteInvoice: async (invoiceId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const invoiceToDelete = state.invoices.find(i => i.id === invoiceId)
      await deleteInvoice(writePath, invoiceId)
      
      // Add notification
      if (invoiceToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'deleted',
            'Invoice Deleted',
            `Invoice ${invoiceToDelete.invoiceNumber || invoiceId} was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: invoiceId,
                entityName: `Invoice ${invoiceToDelete.invoiceNumber}`,
                oldValue: invoiceToDelete,
                changes: {
                  invoice: { from: invoiceToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshInvoices()
    },
    createQuote: async (quote) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const createdQuote = await createQuote(writePath, stripUndefinedDeep(quote))

      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || "system",
          "finance",
          "created",
          "Quote Created",
          `Quote ${createdQuote.quoteNumber || "new quote"} was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: "medium",
            category: "success",
            details: {
              entityId: createdQuote.id,
              entityName: `Quote ${createdQuote.quoteNumber || createdQuote.id}`,
              newValue: createdQuote,
              changes: { quote: { from: {}, to: createdQuote } },
            },
          }
        )
      } catch (notificationError) {
        debugWarn("Failed to create notification:", notificationError)
      }

      await refreshQuotes()
    },
    updateQuote: async (quoteId: string, updates: any) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const originalQuote = state.quotes.find((q) => q.id === quoteId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updateQuote(writePath, quoteId, cleanUpdates)

      if (originalQuote) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || "system",
            "finance",
            "updated",
            "Quote Updated",
            `Quote ${originalQuote.quoteNumber || quoteId} was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: "medium",
              category: "info",
              details: {
                entityId: quoteId,
                entityName: `Quote ${originalQuote.quoteNumber || quoteId}`,
                oldValue: originalQuote,
                newValue: { ...originalQuote, ...cleanUpdates },
                changes: { quote: { from: originalQuote, to: { ...originalQuote, ...cleanUpdates } } },
              },
            }
          )
        } catch (notificationError) {
          debugWarn("Failed to create notification:", notificationError)
        }
      }

      await refreshQuotes()
    },
    deleteQuote: async (quoteId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const quoteToDelete = state.quotes.find((q) => q.id === quoteId)
      await deleteQuote(writePath, quoteId)

      if (quoteToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || "system",
            "finance",
            "deleted",
            "Quote Deleted",
            `Quote ${quoteToDelete.quoteNumber || quoteId} was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: "medium",
              category: "warning",
              details: {
                entityId: quoteId,
                entityName: `Quote ${quoteToDelete.quoteNumber || quoteId}`,
                oldValue: quoteToDelete,
                changes: { quote: { from: quoteToDelete, to: null } },
              },
            }
          )
        } catch (notificationError) {
          debugWarn("Failed to create notification:", notificationError)
        }
      }

      await refreshQuotes()
    },
    sendInvoice: async (invoiceId: string) => {
      if (!state.basePath) return
      await sendInvoice(state.basePath, invoiceId)
      await refreshInvoices()
    },
    approveInvoice: async (invoiceId: string) => {
      if (!state.basePath) return
      const { approveInvoice: approveInvoiceFn } = await import("../functions/FinanceAdvanced")
      await approveInvoiceFn(state.basePath, invoiceId, settingsState.auth?.uid || "system")
      await refreshInvoices()
      await refreshTransactions()
    },
    voidInvoice: async (invoiceId: string, reason: string) => {
      if (!state.basePath) return
      const { voidInvoice: voidInvoiceFn } = await import("../functions/FinanceAdvanced")
      await voidInvoiceFn(state.basePath, invoiceId, settingsState.auth?.uid || "system", reason)
      await refreshInvoices()
      await refreshTransactions()
    },
    markInvoicePaid: async (_invoiceId: string, _paymentAmount: number) => {
      if (!state.basePath) return
      // markInvoicePaid function not implemented in backend yet
      debugWarn('markInvoicePaid not implemented')
      await refreshInvoices()
    },
    createBill: async (bill: Omit<Bill, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const createdBill = await addBill(writePath, stripUndefinedDeep(bill))
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'finance',
          'created',
          'Bill Created',
          `Bill ${createdBill.billNumber || 'new bill'} was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: createdBill.id,
              entityName: `Bill ${createdBill.billNumber || createdBill.id}`,
              newValue: createdBill,
              changes: {
                bill: { from: {}, to: createdBill }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      await refreshBills()
    },
    updateBill: async (billId: string, updates: Partial<Bill>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const originalBill = state.bills.find(b => b.id === billId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updateBill(writePath, billId, cleanUpdates)
      
      // Add notification
      if (originalBill) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'updated',
            'Bill Updated',
            `Bill ${originalBill.billNumber || billId} was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: billId,
                entityName: `Bill ${originalBill.billNumber}`,
                oldValue: originalBill,
                newValue: { ...originalBill, ...cleanUpdates },
                changes: {
                  bill: { from: originalBill, to: { ...originalBill, ...cleanUpdates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshBills()
    },
    deleteBill: async (billId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const billToDelete = state.bills.find(b => b.id === billId)
      await deleteBill(writePath, billId)
      
      // Add notification
      if (billToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'deleted',
            'Bill Deleted',
            `Bill ${billToDelete.billNumber || billId} was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: billId,
                entityName: `Bill ${billToDelete.billNumber}`,
                oldValue: billToDelete,
                changes: {
                  bill: { from: billToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshBills()
    },
    approveBill: async (billId: string) => {
      if (!state.basePath) return
      const { approveBill: approveBillFn } = await import("../functions/FinanceAdvanced")
      await approveBillFn(state.basePath, billId, settingsState.auth?.uid || "system")
      await refreshBills()
      await refreshTransactions()
    },
    markBillPaid: async (billId: string, paymentAmount: number, paymentDate?: string, paymentMethod?: string, bankAccountId?: string) => {
      if (!state.basePath) return
      const { markBillPaid: markBillPaidFn } = await import("../functions/FinanceAdvanced")
      await markBillPaidFn(
        state.basePath,
        billId,
        paymentAmount,
        paymentDate || new Date().toISOString().split("T")[0],
        paymentMethod || "bank_transfer",
        bankAccountId
      )
      await refreshBills()
      await refreshPayments()
      await refreshTransactions()
    },
    createContact: async (contact: Omit<Contact, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const createdContact = await createContact(writePath, stripUndefinedDeep(contact))
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'finance',
          'created',
          'Contact Created',
          `Contact "${createdContact.name || 'New Contact'}" was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: createdContact.id,
              entityName: createdContact.name || 'Contact',
              newValue: createdContact,
              changes: {
                contact: { from: {}, to: createdContact }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      await refreshContacts()
    },
    updateContact: async (contactId: string, updates: Partial<Contact>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const originalContact = state.contacts.find(c => c.id === contactId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updateContact(writePath, contactId, cleanUpdates)
      
      // Add notification
      if (originalContact) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'updated',
            'Contact Updated',
            `Contact "${cleanUpdates.name || originalContact.name || 'Contact'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: contactId,
                entityName: cleanUpdates.name || originalContact.name || 'Contact',
                oldValue: originalContact,
                newValue: { ...originalContact, ...cleanUpdates },
                changes: {
                  contact: { from: originalContact, to: { ...originalContact, ...cleanUpdates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshContacts()
    },
    deleteContact: async (contactId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const contactToDelete = state.contacts.find(c => c.id === contactId)
      await deleteContact(writePath, contactId)
      
      // Add notification
      if (contactToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'deleted',
            'Contact Deleted',
            `Contact "${contactToDelete.name || 'Contact'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: contactId,
                entityName: contactToDelete.name || 'Contact',
                oldValue: contactToDelete,
                changes: {
                  contact: { from: contactToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshContacts()
    },
    createPayment: async (payment: Partial<Payment>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const createdPayment = await createPayment(writePath, stripUndefinedDeep(payment) as Omit<Payment, "id">)
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'finance',
          'created',
          'Payment Created',
          `Payment ${createdPayment.amount ? `of ${formatCurrency(createdPayment.amount, createdPayment.currency)}` : ''} was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: createdPayment.id,
              entityName: `Payment ${createdPayment.amount ? formatCurrency(createdPayment.amount, createdPayment.currency) : ''}`,
              newValue: createdPayment,
              changes: {
                payment: { from: {}, to: createdPayment }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      await refreshPayments()
    },
    allocatePayment: async (paymentId: string, allocations: any[]) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updatePayment(writePath, paymentId, stripUndefinedDeep({ allocations }))
      await refreshPayments()
    },
    startReconciliation: async (bankAccountId: string, statementDate: Date, closingBalance: number = 0, reconciledBy: string = "system") => {
      if (!state.basePath) return
      await startBankReconciliation(state.basePath, bankAccountId, statementDate.toISOString(), closingBalance, reconciledBy)
      await refreshBankReconciliations()
    },
    reconcileTransaction: async (_transactionId: string, _statementLineId: string) => {
      if (!state.basePath) return
      // reconcileTransaction function not implemented in backend yet
      debugWarn('reconcileTransaction not implemented')
      await refreshBankReconciliations()
    },
    completeReconciliation: async (_reconciliationId: string) => {
      if (!state.basePath) return
      // completeReconciliation function not implemented in backend yet
      debugWarn('completeReconciliation not implemented')
      await refreshBankReconciliations()
    },
    generateReport: async (_reportType: string, _period: any, _parameters?: any) => {
      if (!state.basePath) return
      // generateReport function not implemented in backend yet
      debugWarn('generateReport not implemented')
      await refreshReports()
    },
    calculateTax: (_amount: number, _taxRateId: string) => {
      // calculateTax function not implemented in backend yet
      debugWarn('calculateTax not implemented')
      return 0
    },
    convertCurrency: async (amount: number, fromCurrency: string, toCurrency: string) => {
      return await convertCurrency(amount, fromCurrency, toCurrency)
    },
    formatCurrency: (amount: number, currency?: string) => formatCurrency(amount, currency || 'GBP'),
    getAccountBalance: (accountId: string) => {
      // getAccountBalance utility function not implemented yet
      const account = state.accounts.find(acc => acc.id === accountId)
      return account ? account.balance || 0 : 0
    },
    getOutstandingInvoices: () => {
      // getOutstandingInvoices utility function not implemented yet
      return state.invoices.filter(invoice => invoice.status === 'draft' || invoice.status === 'sent')
    },
    getOverdueBills: () => {
      // getOverdueBills utility function not implemented yet
      const today = new Date()
      return state.bills.filter(bill => new Date(bill.dueDate) < today && bill.status !== 'paid')
    },
    getCashFlowProjection: (_months: number) => {
      // getCashFlowProjection utility function not implemented yet
      debugWarn('getCashFlowProjection not implemented')
      return []
    },
    createExpense: async (expense: Omit<Expense, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const createdExpense = await createExpense(writePath, stripUndefinedDeep(expense))
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'finance',
          'created',
          'Expense Created',
          `Expense "${createdExpense.description || createdExpense.category || 'New Expense'}" was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: createdExpense.id,
              entityName: createdExpense.description || createdExpense.category || 'Expense',
              newValue: createdExpense,
              changes: {
                expense: { from: {}, to: createdExpense }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      await refreshExpenses()
    },
    updateExpense: async (expenseId: string, updates: Partial<Expense>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const originalExpense = state.expenses.find(e => e.id === expenseId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updateExpense(writePath, expenseId, cleanUpdates)
      
      // Add notification
      if (originalExpense) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'updated',
            'Expense Updated',
            `Expense "${cleanUpdates.description || originalExpense.description || 'Expense'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: expenseId,
                entityName: cleanUpdates.description || originalExpense.description || 'Expense',
                oldValue: originalExpense,
                newValue: { ...originalExpense, ...cleanUpdates },
                changes: {
                  expense: { from: originalExpense, to: { ...originalExpense, ...cleanUpdates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshExpenses()
    },
    deleteExpense: async (expenseId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const expenseToDelete = state.expenses.find(e => e.id === expenseId)
      await deleteExpense(writePath, expenseId)
      
      // Add notification
      if (expenseToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'deleted',
            'Expense Deleted',
            `Expense "${expenseToDelete.description || 'Expense'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: expenseId,
                entityName: expenseToDelete.description || 'Expense',
                oldValue: expenseToDelete,
                changes: {
                  expense: { from: expenseToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshExpenses()
    },
    approveExpense: async (expenseId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateExpense(writePath, expenseId, { status: "approved" })
      await refreshExpenses()
    },
    rejectExpense: async (expenseId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateExpense(writePath, expenseId, { status: "rejected" })
      await refreshExpenses()
    },
    reimburseExpense: async (expenseId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateExpense(writePath, expenseId, { status: "reimbursed" })
      await refreshExpenses()
    },
    // Bank Account operations
    createBankAccount: async (bankAccount: Omit<BankAccount, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const createdBankAccount = await createBankAccount(writePath, stripUndefinedDeep(bankAccount))
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'finance',
          'created',
          'Bank Account Created',
          `Bank account "${createdBankAccount.name || createdBankAccount.accountNumber || 'New Account'}" was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: createdBankAccount.id,
              entityName: createdBankAccount.name || createdBankAccount.accountNumber || 'Bank Account',
              newValue: createdBankAccount,
              changes: {
                bankAccount: { from: {}, to: createdBankAccount }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      await refreshBankAccounts()
    },
    updateBankAccount: async (bankAccountId: string, updates: Partial<BankAccount>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const originalBankAccount = state.bankAccounts.find(ba => ba.id === bankAccountId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updateBankAccount(writePath, bankAccountId, cleanUpdates)
      
      // Add notification
      if (originalBankAccount) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'updated',
            'Bank Account Updated',
            `Bank account "${cleanUpdates.name || originalBankAccount.name || 'Account'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: bankAccountId,
                entityName: cleanUpdates.name || originalBankAccount.name || 'Bank Account',
                oldValue: originalBankAccount,
                newValue: { ...originalBankAccount, ...cleanUpdates },
                changes: {
                  bankAccount: { from: originalBankAccount, to: { ...originalBankAccount, ...cleanUpdates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshBankAccounts()
    },
    deleteBankAccount: async (bankAccountId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const bankAccountToDelete = state.bankAccounts.find(ba => ba.id === bankAccountId)
      await deleteBankAccount(writePath, bankAccountId)
      
      // Add notification
      if (bankAccountToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'deleted',
            'Bank Account Deleted',
            `Bank account "${bankAccountToDelete.name || 'Account'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: bankAccountId,
                entityName: bankAccountToDelete.name || 'Bank Account',
                oldValue: bankAccountToDelete,
                changes: {
                  bankAccount: { from: bankAccountToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshBankAccounts()
    },
    // Bank Statement operations
    createBankStatement: async (statement: Omit<BankStatement, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createBankStatement(writePath, statement)
      await refreshBankStatements()
    },
    updateBankStatement: async (statementId: string, updates: Partial<BankStatement>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateBankStatement(writePath, statementId, updates)
      await refreshBankStatements()
    },
    importBankStatements: async (bankAccountId: string, statements: Omit<BankStatement, "id" | "bank_account_id">[]) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      for (const stmt of statements) {
        await createBankStatement(writePath, { ...stmt, bank_account_id: bankAccountId })
      }
      await refreshBankStatements()
    },
    autoMatchStatements: async (bankAccountId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      // Auto-match logic - match statements to transactions based on rules
      const statements = state.bankStatements.filter(s => s.bank_account_id === bankAccountId && !s.reconciled)
      const rules = state.bankRules.filter(r => r.is_active).sort((a, b) => b.priority - a.priority)
      const transactions = state.transactions.filter(t => t.bankAccountId === bankAccountId && !t.isReconciled)
      
      for (const statement of statements) {
        for (const rule of rules) {
          const matches = transactions.filter(t => {
            const cond = rule.conditions
            if (cond.description_contains && !cond.description_contains.some(d => statement.description.toLowerCase().includes(d.toLowerCase()))) return false
            if (cond.amount_equals && Math.abs(statement.amount) !== cond.amount_equals) return false
            if (cond.amount_range && (Math.abs(statement.amount) < cond.amount_range.min || Math.abs(statement.amount) > cond.amount_range.max)) return false
            if (cond.type && statement.type !== cond.type) return false
            return Math.abs(statement.amount) === Math.abs(t.totalAmount)
          })
          
          if (matches.length === 1) {
            await updateBankStatement(writePath, statement.id, {
              reconciled: true,
              transaction_id: matches[0].id,
              reconciled_at: new Date().toISOString(),
            })
            break
          }
        }
      }
      await refreshBankStatements()
      await refreshTransactions()
    },
    manualMatchStatement: async (statementId: string, transactionId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateBankStatement(writePath, statementId, {
        reconciled: true,
        transaction_id: transactionId,
        reconciled_at: new Date().toISOString(),
      })
      await refreshBankStatements()
      await refreshTransactions()
    },
    codeUncategorizedTransaction: async (statementId: string, accountId: string, _taxRateId?: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const statement = state.bankStatements.find(s => s.id === statementId)
      if (!statement) return
      
      // Create a transaction from the statement
      await createTransaction(writePath, {
        transactionNumber: `STMT-${statementId}`,
        date: statement.date,
        description: statement.description,
        type: statement.type === "debit" ? "expense" : "income",
        status: "completed",
        entries: [{
          accountId,
          amount: Math.abs(statement.amount),
          type: statement.type === "debit" ? "debit" : "credit",
        }],
        totalAmount: statement.amount,
        currency: statement.currency,
        bankAccountId: statement.bank_account_id,
        isReconciled: true,
        createdBy: settingsState.auth?.uid || "system",
      })
      
      await updateBankStatement(writePath, statementId, {
        reconciled: true,
        reconciled_at: new Date().toISOString(),
      })
      
      await refreshBankStatements()
      await refreshTransactions()
    },
    // Bank Rule operations
    createBankRule: async (rule: Omit<BankRule, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createBankRule(writePath, rule)
      await refreshBankRules()
    },
    updateBankRule: async (ruleId: string, updates: Partial<BankRule>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateBankRule(writePath, ruleId, updates)
      await refreshBankRules()
    },
    deleteBankRule: async (ruleId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteBankRule(writePath, ruleId)
      await refreshBankRules()
    },
    // Bank Transfer operations
    createBankTransfer: async (transfer: Omit<BankTransfer, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const newTransfer = await createBankTransfer(writePath, transfer)
      
      // Create two journal entries for the transfer
      const fromAccount = state.bankAccounts.find(a => a.id === transfer.from_account_id)
      const toAccount = state.bankAccounts.find(a => a.id === transfer.to_account_id)
      
      if (fromAccount?.account_id && toAccount?.account_id) {
        await createTransaction(writePath, {
          transactionNumber: `TRF-${newTransfer.id}`,
          date: transfer.date,
          description: transfer.description || `Transfer to ${toAccount.name}`,
          type: "transfer",
          status: "completed",
          entries: [
            { accountId: fromAccount.account_id, amount: transfer.amount, type: "credit" },
            { accountId: toAccount.account_id, amount: transfer.amount, type: "debit" },
          ],
          totalAmount: transfer.amount,
          currency: transfer.currency,
          bankAccountId: transfer.from_account_id,
          isReconciled: false,
          createdBy: transfer.created_by,
        })
      }
      
      await refreshBankTransfers()
      await refreshTransactions()
    },
    updateBankTransfer: async (transferId: string, updates: Partial<BankTransfer>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateBankTransfer(writePath, transferId, updates)
      await refreshBankTransfers()
    },
    deleteBankTransfer: async (transferId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteBankTransfer(writePath, transferId)
      await refreshBankTransfers()
    },
    // Clearing Account operations
    createClearingAccount: async (clearing: Omit<ClearingAccount, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createClearingAccount(writePath, clearing)
      await refreshClearingAccounts()
    },
    updateClearingAccount: async (clearingId: string, updates: Partial<ClearingAccount>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateClearingAccount(writePath, clearingId, updates)
      await refreshClearingAccounts()
    },
    deleteClearingAccount: async (clearingId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteClearingAccount(writePath, clearingId)
      await refreshClearingAccounts()
    },
    // FX Revaluation operations
    createFXRevaluation: async (fx: Omit<FXRevaluation, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createFXRevaluation(writePath, fx)
      await refreshFXRevaluations()
    },
    updateFXRevaluation: async (fxId: string, updates: Partial<FXRevaluation>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateFXRevaluation(writePath, fxId, updates)
      await refreshFXRevaluations()
    },
    // Journal operations
    createJournal: async (journal: Omit<Journal, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const entityId = companyState.companyID
      if (!entityId) {
        debugWarn("Company ID not found, cannot create journal.")
        throw new Error("Company ID not found.")
      }
      await createJournal(writePath, { ...journal, entity_id: entityId })
      await refreshJournals()
    },
    updateJournal: async (journalId: string, updates: Partial<Journal>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateJournal(writePath, journalId, updates)
      await refreshJournals()
    },
    deleteJournal: async (journalId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteJournal(writePath, journalId)
      await refreshJournals()
    },
    approveJournal: async (journalId: string, approvedBy: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await approveJournal(writePath, journalId, approvedBy)
      await refreshJournals()
    },
    postJournal: async (journalId: string, postedBy: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await postJournal(writePath, journalId, postedBy)
      await refreshJournals()
      await refreshTransactions()
    },
    reverseJournal: async (journalId: string, reversedBy: string, reversalDate: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) {
        throw new Error("No write path available")
      }
      const reversedJournal = await reverseJournal(writePath, journalId, reversedBy, reversalDate)
      await refreshJournals()
      await refreshTransactions()
      return reversedJournal
    },
    // Period Lock operations
    createPeriodLock: async (lock: Omit<PeriodLock, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const entityId = companyState.companyID
      if (!entityId) {
        debugWarn("Company ID not found, cannot create period lock.")
        throw new Error("Company ID not found.")
      }
      await createPeriodLock(writePath, { ...lock, entity_id: entityId })
      await refreshPeriodLocks()
    },
    updatePeriodLock: async (lockId: string, updates: Partial<PeriodLock>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updatePeriodLock(writePath, lockId, updates)
      await refreshPeriodLocks()
    },
    deletePeriodLock: async (lockId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deletePeriodLock(writePath, lockId)
      await refreshPeriodLocks()
    },
    unlockPeriod: async (lockId: string, reason?: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updatePeriodLock(writePath, lockId, {
        is_locked: false,
        unlock_reason: reason,
        unlocked_by: settingsState.auth?.uid || "system",
        unlocked_at: new Date().toISOString(),
      })
      await refreshPeriodLocks()
    },
    checkPeriodLocked: async (date: string): Promise<boolean> => {
      const checkDate = new Date(date)
      const lockedPeriods = state.periodLocks.filter(lock => {
        if (!lock.is_locked) return false
        const lockStart = new Date(lock.period_start)
        const lockEnd = new Date(lock.period_end)
        return checkDate >= lockStart && checkDate <= lockEnd
      })
      return lockedPeriods.length > 0
    },
    // Dimension operations
    createDimension: async (dimension: Omit<Dimension, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const entityId = companyState.companyID
      if (!entityId) {
        debugWarn("Company ID not found, cannot create dimension.")
        throw new Error("Company ID not found.")
      }
      await createDimension(writePath, { ...dimension, entity_id: entityId })
      await refreshDimensions()
    },
    updateDimension: async (dimensionId: string, updates: Partial<Dimension>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateDimension(writePath, dimensionId, updates)
      await refreshDimensions()
    },
    deleteDimension: async (dimensionId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteDimension(writePath, dimensionId)
      await refreshDimensions()
    },
    performFXRevaluation: async (bankAccountId: string, revaluationDate: string, gainLossAccountId?: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const account = state.bankAccounts.find(a => a.id === bankAccountId)
      if (!account || !account.account_id) return
      
      const baseCurrency = state.currencies.find(c => c.isBase)?.code || "GBP"
      const accountCurrency = account.currency
      
      if (baseCurrency === accountCurrency) return // No revaluation needed
      
      const currency = state.currencies.find(c => c.code === accountCurrency)
      if (!currency) return
      
      const balanceBefore = account.balance
      const exchangeRate = currency.rate
      const balanceAfter = balanceBefore * exchangeRate
      const gainLoss = balanceAfter - balanceBefore
      
      // Use provided gain/loss account or fall back to bank account's GL account
      const fxGainLossAccountId = gainLossAccountId || account.account_id
      
      const nowIso = new Date().toISOString()
      const fxRevaluation = await createFXRevaluation(writePath, {
        entity_id: companyState.companyID,
        bank_account_id: bankAccountId,
        revaluation_date: revaluationDate,
        currency: accountCurrency,
        base_currency: baseCurrency,
        exchange_rate: exchangeRate,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        gain_loss: gainLoss,
        gain_loss_account_id: fxGainLossAccountId,
        status: "pending",
        created_by: settingsState.auth?.uid || "system",
        created_at: nowIso,
        updated_at: nowIso,
      })
      
      // Create journal entry for FX gain/loss
      if (gainLoss !== 0) {
        await createTransaction(writePath, {
          transactionNumber: `FX-${fxRevaluation.id}`,
          date: revaluationDate,
          description: `FX Revaluation - ${accountCurrency} to ${baseCurrency}`,
          type: "adjustment",
          status: "completed",
          entries: [
            {
              accountId: account.account_id,
              amount: Math.abs(gainLoss),
              type: gainLoss > 0 ? "debit" : "credit",
              debit: gainLoss > 0 ? Math.abs(gainLoss) : 0,
              credit: gainLoss < 0 ? Math.abs(gainLoss) : 0,
              description: `FX Revaluation - Bank Account Adjustment`,
            },
            {
              accountId: fxGainLossAccountId,
              amount: Math.abs(gainLoss),
              type: gainLoss > 0 ? "credit" : "debit",
              debit: gainLoss < 0 ? Math.abs(gainLoss) : 0,
              credit: gainLoss > 0 ? Math.abs(gainLoss) : 0,
              description: `FX Revaluation - Gain/Loss`,
            },
          ],
          totalAmount: Math.abs(gainLoss),
          currency: baseCurrency,
          bankAccountId: bankAccountId,
          isReconciled: false,
          createdBy: settingsState.auth?.uid || "system",
        })
      }
      
      await refreshFXRevaluations()
      await refreshTransactions()
      await refreshBankAccounts()
    },
    // Credit Note operations
    createCreditNote: async (creditNote: Omit<CreditNote, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createCreditNote(writePath, creditNote)
      await refreshCreditNotes()
    },
    updateCreditNote: async (creditNoteId: string, updates: Partial<CreditNote>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateCreditNote(writePath, creditNoteId, updates)
      await refreshCreditNotes()
    },
    deleteCreditNote: async (creditNoteId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteCreditNote(writePath, creditNoteId)
      await refreshCreditNotes()
    },
    // Purchase Order operations
    createPurchaseOrder: async (purchaseOrder: Omit<PurchaseOrder, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createPurchaseOrder(writePath, purchaseOrder)
      await refreshPurchaseOrders()
    },
    updatePurchaseOrder: async (purchaseOrderId: string, updates: Partial<PurchaseOrder>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updatePurchaseOrder(writePath, purchaseOrderId, updates)
      await refreshPurchaseOrders()
    },
    deletePurchaseOrder: async (purchaseOrderId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deletePurchaseOrder(writePath, purchaseOrderId)
      await refreshPurchaseOrders()
    },
    // Tax Rate operations
    createTaxRate: async (taxRate: Omit<TaxRate, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createTaxRate(writePath, stripUndefinedDeep(taxRate))
      await refreshTaxRates()
    },
    updateTaxRate: async (taxRateId: string, updates: Partial<TaxRate>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateTaxRate(writePath, taxRateId, stripUndefinedDeep(updates))
      await refreshTaxRates()
    },
    deleteTaxRate: async (taxRateId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteTaxRate(writePath, taxRateId)
      await refreshTaxRates()
    },
    // Budget operations
    createBudget: async (budget: Omit<Budget, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const budgetWithEntity = stripUndefinedDeep({
        ...budget,
        entity_id: companyState.companyID || budget.entity_id,
      })
      await createBudget(writePath, budgetWithEntity)
      await refreshBudgets()
    },
    updateBudget: async (budgetId: string, updates: Partial<Budget>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateBudget(writePath, budgetId, stripUndefinedDeep(updates))
      await refreshBudgets()
    },
    deleteBudget: async (budgetId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteBudget(writePath, budgetId)
      await refreshBudgets()
    },
    addBudgetLine: async (budgetId: string, line: Omit<BudgetLine, "id" | "budget_id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const nowIso = new Date().toISOString()
      const budget = state.budgets.find((b) => b.id === budgetId)
      const existingLines = (budget?.budget_lines || []) as any[]
      const newLine: BudgetLine = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        budget_id: budgetId,
        account_id: (line as any).account_id,
        amount: (line as any).amount,
        description: (line as any).description,
        created_at: nowIso,
        updated_at: nowIso,
      }
      await updateBudget(writePath, budgetId, stripUndefinedDeep({ budget_lines: [...existingLines, newLine] }))
      await refreshBudgets()
    },
    updateBudgetLine: async (budgetId: string, lineId: string, updates: Partial<BudgetLine>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const budget = state.budgets.find((b) => b.id === budgetId)
      const existingLines = (budget?.budget_lines || []) as any[]
      const nextLines = existingLines.map((l: any) =>
        String(l.id) === String(lineId) ? { ...l, ...stripUndefinedDeep(updates), updated_at: new Date().toISOString() } : l,
      )
      await updateBudget(writePath, budgetId, stripUndefinedDeep({ budget_lines: nextLines }))
      await refreshBudgets()
    },
    deleteBudgetLine: async (budgetId: string, lineId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const budget = state.budgets.find((b) => b.id === budgetId)
      const existingLines = (budget?.budget_lines || []) as any[]
      const nextLines = existingLines.filter((l: any) => String(l.id) !== String(lineId))
      await updateBudget(writePath, budgetId, stripUndefinedDeep({ budget_lines: nextLines }))
      await refreshBudgets()
    },
    generateBudgetVsActual: async (budgetId: string, period?: string): Promise<BudgetVsActual[]> => {
      if (!state.basePath) return []
      const { generateBudgetVsActual } = await import("../functions/BudgetReports")
      return await generateBudgetVsActual(state.basePath, budgetId, period)
    },
    // Daily forecast operations
    upsertDailyForecast: async (forecast: Omit<DailyForecast, "id"> & { id?: string }) => {
      const writePath = await resolveFinanceNodeBasePath("daily_forecasts", dailyForecastsPathRef)
      if (!writePath) return
      const withEntity = stripUndefinedDeep({
        ...forecast,
        entity_id: companyState.companyID || (forecast as any).entity_id,
      })
      await upsertDailyForecastRTDB(writePath, withEntity as any)
      await refreshDailyForecasts()
    },
    deleteDailyForecast: async (forecastId: string) => {
      const writePath = await resolveFinanceNodeBasePath("daily_forecasts", dailyForecastsPathRef)
      if (!writePath) return
      await deleteDailyForecastRTDB(writePath, forecastId)
      await refreshDailyForecasts()
    },
    // Report generation
    generateProfitLoss: async (startDate: string, endDate: string, dimensionIds?: Record<string, string>) => {
      if (!state.basePath) return null
      const { generateProfitLoss } = await import("../functions/ReportGenerators")
      return await generateProfitLoss(state.basePath, startDate, endDate, dimensionIds)
    },
    generateBalanceSheet: async (asOfDate: string, dimensionIds?: Record<string, string>) => {
      if (!state.basePath) return null
      const { generateBalanceSheet } = await import("../functions/ReportGenerators")
      return await generateBalanceSheet(state.basePath, asOfDate, dimensionIds)
    },
    generateCashFlow: async (startDate: string, endDate: string) => {
      if (!state.basePath) return null
      const { generateCashFlow } = await import("../functions/ReportGenerators")
      return await generateCashFlow(state.basePath, startDate, endDate)
    },
    generateTrialBalance: async (asOfDate: string) => {
      if (!state.basePath) return null
      const { generateTrialBalance } = await import("../functions/ReportGenerators")
      return await generateTrialBalance(state.basePath, asOfDate)
    },
    generateGeneralLedger: async (accountId: string, startDate: string, endDate: string) => {
      if (!state.basePath) return null
      const { generateGeneralLedger } = await import("../functions/ReportGenerators")
      return await generateGeneralLedger(state.basePath, accountId, startDate, endDate)
    },
    generateARAging: async (asOfDate: string) => {
      if (!state.basePath) return null
      const { generateARAging } = await import("../functions/ReportGenerators")
      return await generateARAging(state.basePath, asOfDate)
    },
    generateAPAging: async (asOfDate: string) => {
      if (!state.basePath) return null
      const { generateAPAging } = await import("../functions/ReportGenerators")
      return await generateAPAging(state.basePath, asOfDate)
    },
    generateTaxReport: async (startDate: string, endDate: string, taxRateId?: string) => {
      if (!state.basePath) return null
      const { generateTaxReport } = await import("../functions/ReportGenerators")
      return await generateTaxReport(state.basePath, startDate, endDate, taxRateId)
    },
    // Currency operations
    createCurrency: async (currency: Currency) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createCurrency(writePath, stripUndefinedDeep(currency))
      await refreshCurrencies()
    },
    updateCurrency: async (currencyCode: string, updates: Partial<Currency>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await updateCurrency(writePath, currencyCode, stripUndefinedDeep(updates))
      await refreshCurrencies()
    },
    deleteCurrency: async (currencyCode: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteCurrency(writePath, currencyCode)
      await refreshCurrencies()
    },
    // Payment operations
    updatePayment: async (paymentId: string, updates: Partial<Payment>) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const originalPayment = state.payments.find(p => p.id === paymentId)
      const cleanUpdates = stripUndefinedDeep(updates)
      await updatePayment(writePath, paymentId, cleanUpdates)
      
      // Add notification
      if (originalPayment) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'updated',
            'Payment Updated',
            `Payment was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: paymentId,
                entityName: `Payment`,
                oldValue: originalPayment,
                newValue: { ...originalPayment, ...cleanUpdates },
                changes: {
                  payment: { from: originalPayment, to: { ...originalPayment, ...cleanUpdates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshPayments()
    },
    deletePayment: async (paymentId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      const paymentToDelete = state.payments.find(p => p.id === paymentId)
      await deletePayment(writePath, paymentId)
      
      // Add notification
      if (paymentToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'finance',
            'deleted',
            'Payment Deleted',
            `Payment was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: paymentId,
                entityName: `Payment`,
                oldValue: paymentToDelete,
                changes: {
                  payment: { from: paymentToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshPayments()
    },
    // Report operations
    saveReport: async (report: Omit<FinancialReport, "id">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await saveReport(writePath, report)
      await refreshReports()
    },
    deleteReport: async (reportId: string) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await deleteReport(writePath, reportId)
      await refreshReports()
    },
    // Transaction operations
    createTransaction: async (transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
      const writePath = getFinanceWritePath()
      if (!writePath) return
      await createTransaction(writePath, transaction)
      await refreshTransactions()
    },
    // Permission functions - Owner has full access
    canViewFinance: () => isOwner() || hasPermission("finance", "accounts", "view"),
    canEditFinance: () => isOwner() || hasPermission("finance", "accounts", "edit"),
    canDeleteFinance: () => isOwner() || hasPermission("finance", "accounts", "delete"),
    isOwner: () => isOwner()
  }), [
    state,
    dispatch,
    getFinanceSettingsPath,
    loadFinanceSettings,
    saveFinanceSettings,
    loadFinanceIntegrations,
    saveFinanceIntegration,
    refreshAccounts,
    refreshTransactions,
    refreshInvoices,
    refreshBills,
    refreshContacts,
    refreshBankAccounts,
    refreshBankStatements,
    refreshBankRules,
    refreshBankTransfers,
    refreshClearingAccounts,
  refreshFXRevaluations,
  refreshJournals,
  refreshDimensions,
  refreshPeriodLocks,
  refreshOpeningBalances,
  refreshBudgets,
    refreshExpenses,
    refreshPayments,
    refreshCreditNotes,
    refreshPurchaseOrders,
    refreshTaxRates,
    refreshPaymentTerms,
    refreshBankReconciliations,
    refreshReports,
    refreshCurrencies,
    refreshAll,
    getFinanceWritePath,
    companyState,
    settingsState,
    isOwner,
    hasPermission,
  ])

  // Debounced initialization - only load when basePath stabilizes and dependent contexts are loaded
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  useEffect(() => {
    // Wait for dependencies: Settings and Company must be ready first
    const authUid = settingsState.auth?.uid
    const isLoggedIn = settingsState.auth?.isLoggedIn

    if (!authUid || settingsState.loading) {
      if (state.loading) dispatch({ type: "SET_LOADING", payload: false })
      return // Settings not ready yet
    }
    
    if (!companyState.companyID && isLoggedIn) {
      if (state.loading) dispatch({ type: "SET_LOADING", payload: false })
      return // Company not selected yet (but user is logged in)
    }
    
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Only initialize if basePath is valid and different from last loaded path
    if (state.basePath && state.basePath !== lastLoadedPathRef.current) {
      // Set new path immediately so we don't skip loading it
      lastLoadedPathRef.current = state.basePath
      // Debounce to prevent rapid refreshes during company/site switching
      refreshTimeoutRef.current = setTimeout(() => {
        // Load data in background, maintaining old data until complete
        refreshAllRef.current().catch(error => {
          debugWarn('Finance data refresh failed, maintaining old data:', error)
          if (state.loading) dispatch({ type: "SET_LOADING", payload: false })
        })
      }, 150) // Slightly increased debounce for stability
    } else if (!state.basePath) {
      // Clear loading state if no basePath
      lastLoadedPathRef.current = "" // Reset last loaded path
      if (state.loading) dispatch({ type: "SET_LOADING", payload: false })
    } else if (state.basePath === lastLoadedPathRef.current && !isLoadingRef.current) {
      // If basePath hasn't changed and we're not loading, ensure loading is cleared
      if (state.loading) dispatch({ type: "SET_LOADING", payload: false })
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [state.basePath, state.loading, settingsState.auth?.uid, settingsState.auth?.isLoggedIn, settingsState.loading, companyState.companyID, dependentContextsLoaded])

  return <FinanceContext.Provider value={contextValue}>{children}</FinanceContext.Provider>
}

// RTDB update()/set() rejects undefined anywhere in the values object.
// Centralized deep sanitizer for any FinanceContext create/update payloads.
const stripUndefinedDeep = (value: any): any => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(stripUndefinedDeep).filter((v) => v !== undefined)
  if (typeof value === "object") {
    const out: any = {}
    Object.entries(value).forEach(([k, v]) => {
      if (v === undefined) return
      const cleaned = stripUndefinedDeep(v)
      if (cleaned === undefined) return
      out[k] = cleaned
    })
    return out
  }
  return value
}

// Module-level guard: warn once per session.
let hasWarnedUseFinanceOutsideProvider = false

// Hook to use the finance context - graceful handling when not loaded
export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext)
  if (context === undefined) {
    // Return a safe default context instead of throwing error
    // This allows components to render even when Finance module isn't loaded yet
    // Avoid spamming the console if multiple components render before providers mount.
    // (Still logs once in dev so we can spot wiring issues.)
    if (!hasWarnedUseFinanceOutsideProvider) {
      hasWarnedUseFinanceOutsideProvider = true
      debugWarn("useFinance called outside FinanceProvider - returning empty context")
    }
    
    const emptyContext: FinanceContextType = {
      state: {
        accounts: [],
        transactions: [],
        invoices: [],
        bills: [],
        contacts: [],
        bankAccounts: [],
        bankStatements: [],
        bankRules: [],
        bankTransfers: [],
        clearingAccounts: [],
        fxRevaluations: [],
        journals: [],
        periodLocks: [],
        dimensions: [],
        openingBalances: [],
        budgets: [],
        expenses: [],
        payments: [],
        creditNotes: [],
        purchaseOrders: [],
        taxRates: [],
        paymentTerms: [],
        bankReconciliations: [],
        reports: [],
        currencies: [],
        quotes: [],
        dailyForecasts: [],
        loading: false,
        error: null,
        basePath: "",
        dataVersion: 0,
      },
      dispatch: () => {},
      getFinanceSettingsPath: () => null,
      loadFinanceSettings: async () => null,
      saveFinanceSettings: async () => {},
      loadFinanceIntegrations: async () => ({}),
      saveFinanceIntegration: async () => {},
      canViewFinance: () => false,
      canEditFinance: () => false,
      canDeleteFinance: () => false,
      isOwner: () => false,
      refreshAccounts: async () => {},
      refreshTransactions: async () => {},
      refreshInvoices: async () => {},
      refreshBills: async () => {},
      refreshContacts: async () => {},
      refreshBankAccounts: async () => {},
      refreshBankStatements: async () => {},
      refreshBankRules: async () => {},
      refreshBankTransfers: async () => {},
      refreshClearingAccounts: async () => {},
      refreshFXRevaluations: async () => {},
      refreshJournals: async () => {},
      refreshPeriodLocks: async () => {},
      refreshDimensions: async () => {},
      refreshOpeningBalances: async () => {},
      refreshBudgets: async () => {},
      refreshDailyForecasts: async () => {},
      refreshExpenses: async () => {},
      refreshPayments: async () => {},
      refreshCreditNotes: async () => {},
      refreshPurchaseOrders: async () => {},
      refreshTaxRates: async () => {},
      refreshPaymentTerms: async () => {},
      refreshBankReconciliations: async () => {},
      refreshReports: async () => {},
      refreshCurrencies: async () => {},
      refreshAll: async () => {},
      createAccount: async () => {},
      updateAccount: async () => {},
      deleteAccount: async () => {},
      createInvoice: async () => {},
      updateInvoice: async () => {},
      deleteInvoice: async () => {},
      sendInvoice: async () => {},
      approveInvoice: async () => {},
      markInvoicePaid: async () => {},
      refreshQuotes: async () => {},
      createQuote: async () => {},
      updateQuote: async () => {},
      deleteQuote: async () => {},
      createBill: async () => {},
      updateBill: async () => {},
      deleteBill: async () => {},
      approveBill: async () => {},
      markBillPaid: async () => {},
      createContact: async () => {},
      updateContact: async () => {},
      deleteContact: async () => {},
      createPayment: async () => {},
      allocatePayment: async () => {},
      startReconciliation: async () => {},
      reconcileTransaction: async () => {},
      completeReconciliation: async () => {},
      generateReport: async () => {},
      calculateTax: () => 0,
      convertCurrency: async () => 0,
      formatCurrency: () => "$0.00",
      getAccountBalance: () => 0,
      getOutstandingInvoices: () => [],
      getOverdueBills: () => [],
      getCashFlowProjection: () => [],
      createExpense: async () => {},
      updateExpense: async () => {},
      deleteExpense: async () => {},
      approveExpense: async () => {},
      rejectExpense: async () => {},
      reimburseExpense: async () => {},
      createBankAccount: async () => {},
      updateBankAccount: async () => {},
      deleteBankAccount: async () => {},
      createCreditNote: async () => {},
      updateCreditNote: async () => {},
      deleteCreditNote: async () => {},
      createPurchaseOrder: async () => {},
      updatePurchaseOrder: async () => {},
      deletePurchaseOrder: async () => {},
      createTaxRate: async () => {},
      updateTaxRate: async () => {},
      deleteTaxRate: async () => {},
      createBudget: async () => {},
      updateBudget: async () => {},
      deleteBudget: async () => {},
      addBudgetLine: async () => {},
      updateBudgetLine: async () => {},
      deleteBudgetLine: async () => {},
      generateBudgetVsActual: async () => [],
      upsertDailyForecast: async () => {},
      deleteDailyForecast: async () => {},
      generateProfitLoss: async () => null,
      generateBalanceSheet: async () => null,
      generateCashFlow: async () => null,
      generateTrialBalance: async () => null,
      generateGeneralLedger: async () => null,
      generateARAging: async () => null,
      generateAPAging: async () => null,
      generateTaxReport: async () => null,
      createCurrency: async () => {},
      updateCurrency: async () => {},
      deleteCurrency: async () => {},
      updatePayment: async () => {},
      deletePayment: async () => {},
      saveReport: async () => {},
      deleteReport: async () => {},
      createTransaction: async () => {},
      createJournal: async () => {},
      updateJournal: async () => {},
      deleteJournal: async () => {},
      approveJournal: async () => {},
      postJournal: async () => {},
      reverseJournal: async () => Promise.resolve({} as Journal),
      createPeriodLock: async () => {},
      updatePeriodLock: async () => {},
      deletePeriodLock: async () => {},
      unlockPeriod: async () => {},
      checkPeriodLocked: async () => false,
      createDimension: async () => {},
      updateDimension: async () => {},
      deleteDimension: async () => {},
      createBankStatement: async () => {},
      updateBankStatement: async () => {},
      importBankStatements: async () => {},
      autoMatchStatements: async () => {},
      manualMatchStatement: async () => {},
      codeUncategorizedTransaction: async () => {},
      createBankRule: async () => {},
      updateBankRule: async () => {},
      deleteBankRule: async () => {},
      createBankTransfer: async () => {},
      updateBankTransfer: async () => {},
      deleteBankTransfer: async () => {},
      createClearingAccount: async () => {},
      updateClearingAccount: async () => {},
      deleteClearingAccount: async () => {},
      createFXRevaluation: async () => {},
      updateFXRevaluation: async () => {},
      performFXRevaluation: async () => {},
    }
    
    return emptyContext
  }
  return context
}

// Export the context (FinanceProvider is already exported above)
export { FinanceContext }

// Export types for frontend consumption
export type { 
  Account, 
  Transaction, 
  Invoice, 
  Bill, 
  Contact, 
  BankAccount, 
  Budget, 
  Expense, 
  Payment, 
  Currency,
  Journal,
  PeriodLock,
  Dimension,
  OpeningBalance
} from "../interfaces/Finance"




