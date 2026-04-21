import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from "firebase/database"
import { db } from "../services/Firebase"
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
import type { OpeningBalance } from "../interfaces/Accounting"

// RTDB update()/set() rejects undefined anywhere in the values object.
// Centralized deep sanitizer to prevent runtime write failures from optional form fields.
const stripUndefinedDeep = (value: any): any => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof Date) return value
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep).filter((v) => v !== undefined)
  }
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

// Accounts
export const fetchAccounts = async (basePath: string): Promise<Account[]> => {
  try {
    const accountsRef = ref(db, `${basePath}/accounts`)
    const snapshot = await get(accountsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching accounts:", error)
    throw error
  }
}

export const createAccount = async (basePath: string, account: Omit<Account, "id">): Promise<Account> => {
  try {
    const accountsRef = ref(db, `${basePath}/accounts`)
    const newAccountRef = push(accountsRef)
    const id = newAccountRef.key as string

    const newAccount = {
      ...stripUndefinedDeep(account),
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newAccountRef, newAccount)
    return newAccount
  } catch (error) {
    console.error("Error creating account:", error)
    throw error
  }
}

export const updateAccount = async (basePath: string, accountId: string, updates: Partial<Account>): Promise<void> => {
  try {
    const accountRef = ref(db, `${basePath}/accounts/${accountId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(accountRef, updatedFields)
  } catch (error) {
    console.error("Error updating account:", error)
    throw error
  }
}

export const deleteAccount = async (basePath: string, accountId: string): Promise<void> => {
  try {
    const accountRef = ref(db, `${basePath}/accounts/${accountId}`)
    await remove(accountRef)
  } catch (error) {
    console.error("Error deleting account:", error)
    throw error
  }
}

// Transactions
export const fetchTransactions = async (basePath: string): Promise<Transaction[]> => {
  try {
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const snapshot = await get(transactionsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching transactions:", error)
    throw error
  }
}

export const createTransaction = async (
  basePath: string,
  transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
): Promise<Transaction> => {
  try {
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const newTransactionRef = push(transactionsRef)
    const id = newTransactionRef.key as string

    const now = new Date().toISOString()
    const newTransaction = {
      ...stripUndefinedDeep(transaction),
      id,
      createdAt: now,
      updatedAt: now,
    }

    await set(newTransactionRef, newTransaction)
    return newTransaction as Transaction
  } catch (error) {
    console.error("Error creating transaction:", error)
    throw error
  }
}

// Bills
export const fetchBills = async (basePath: string): Promise<Bill[]> => {
  try {
    const billsRef = ref(db, `${basePath}/bills`)
    const snapshot = await get(billsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching bills:", error)
    throw error
  }
}

export const createBill = async (basePath: string, bill: Omit<Bill, "id">): Promise<Bill> => {
  try {
    const billsRef = ref(db, `${basePath}/bills`)
    const newBillRef = push(billsRef)
    const id = newBillRef.key as string

    const newBill = {
      ...stripUndefinedDeep(bill),
      id,
    }

    await set(newBillRef, newBill)
    return newBill
  } catch (error) {
    console.error("Error creating bill:", error)
    throw error
  }
}

// Contacts
export const fetchContacts = async (basePath: string): Promise<Contact[]> => {
  try {
    const contactsRef = ref(db, `${basePath}/contacts`)
    const snapshot = await get(contactsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching contacts:", error)
    throw error
  }
}

// Bank Accounts
export const fetchBankAccounts = async (basePath: string): Promise<BankAccount[]> => {
  try {
    const bankAccountsRef = ref(db, `${basePath}/bankAccounts`)
    const snapshot = await get(bankAccountsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching bank accounts:", error)
    throw error
  }
}

// Budgets
export const fetchBudgets = async (basePath: string): Promise<Budget[]> => {
  try {
    const budgetsRef = ref(db, `${basePath}/budgets`)
    const snapshot = await get(budgetsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching budgets:", error)
    throw error
  }
}

export const createBudget = async (basePath: string, budget: Omit<Budget, "id">): Promise<Budget> => {
  try {
    const budgetsRef = ref(db, `${basePath}/budgets`)
    const newBudgetRef = push(budgetsRef)
    const id = newBudgetRef.key as string

    const newBudget: Budget = {
      ...budget,
      id,
      created_at: budget.created_at || new Date().toISOString(),
      updated_at: budget.updated_at || new Date().toISOString(),
    }

    await set(newBudgetRef, newBudget)
    return newBudget
  } catch (error) {
    console.error("Error creating budget:", error)
    throw error
  }
}

export const updateBudget = async (basePath: string, budgetId: string, updates: Partial<Budget>): Promise<void> => {
  try {
    const budgetRef = ref(db, `${basePath}/budgets/${budgetId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(budgetRef, updatedFields)
  } catch (error) {
    console.error("Error updating budget:", error)
    throw error
  }
}

export const deleteBudget = async (basePath: string, budgetId: string): Promise<void> => {
  try {
    const budgetRef = ref(db, `${basePath}/budgets/${budgetId}`)
    await remove(budgetRef)
  } catch (error) {
    console.error("Error deleting budget:", error)
    throw error
  }
}

// Daily Forecasts (simple revenue forecast per day)
export const fetchDailyForecasts = async (basePath: string): Promise<DailyForecast[]> => {
  try {
    const forecastsRef = ref(db, `${basePath}/daily_forecasts`)
    const snapshot = await get(forecastsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching daily forecasts:", error)
    throw error
  }
}

export const upsertDailyForecast = async (
  basePath: string,
  forecast: Omit<DailyForecast, "id"> & { id?: string },
): Promise<DailyForecast> => {
  try {
    const rootRef = ref(db, `${basePath}/daily_forecasts`)
    const hasId = Boolean(forecast.id)
    const targetRef = hasId ? ref(db, `${basePath}/daily_forecasts/${forecast.id}`) : push(rootRef)
    const id = (hasId ? forecast.id : targetRef.key) as string

    const now = new Date().toISOString()
    const created_at = (forecast as any).created_at || now
    const updated_at = now

    const payload: DailyForecast = {
      ...(stripUndefinedDeep(forecast) as any),
      id,
      created_at,
      updated_at,
    }

    await set(targetRef, payload)
    return payload
  } catch (error) {
    console.error("Error upserting daily forecast:", error)
    throw error
  }
}

export const deleteDailyForecast = async (basePath: string, forecastId: string): Promise<void> => {
  try {
    const forecastRef = ref(db, `${basePath}/daily_forecasts/${forecastId}`)
    await remove(forecastRef)
  } catch (error) {
    console.error("Error deleting daily forecast:", error)
    throw error
  }
}

// Expenses
export const fetchExpenses = async (basePath: string): Promise<Expense[]> => {
  try {
    const expensesRef = ref(db, `${basePath}/expenses`)
    const snapshot = await get(expensesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching expenses:", error)
    throw error
  }
}

export const createExpense = async (basePath: string, expense: Omit<Expense, "id">): Promise<Expense> => {
  try {
    const expensesRef = ref(db, `${basePath}/expenses`)
    const newExpenseRef = push(expensesRef)
    const id = newExpenseRef.key as string

    const newExpense = {
      ...stripUndefinedDeep(expense),
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newExpenseRef, newExpense)
    return newExpense
  } catch (error) {
    console.error("Error creating expense:", error)
    throw error
  }
}

export const updateExpense = async (basePath: string, expenseId: string, updates: Partial<Expense>): Promise<void> => {
  try {
    const expenseRef = ref(db, `${basePath}/expenses/${expenseId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(expenseRef, updatedFields)
  } catch (error) {
    console.error("Error updating expense:", error)
    throw error
  }
}

export const deleteExpense = async (basePath: string, expenseId: string): Promise<void> => {
  try {
    const expenseRef = ref(db, `${basePath}/expenses/${expenseId}`)
    await remove(expenseRef)
  } catch (error) {
    console.error("Error deleting expense:", error)
    throw error
  }
}

// Invoices
export const fetchInvoices = async (basePath: string): Promise<any[]> => {
  try {
    const invoicesRef = ref(db, `${basePath}/invoices`)
    const snapshot = await get(invoicesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching invoices:", error)
    throw error
  }
}

// Quotes
export const fetchQuotes = async (basePath: string): Promise<Quote[]> => {
  try {
    const quotesRef = ref(db, `${basePath}/quotes`)
    const snapshot = await get(quotesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      })) as Quote[]
    }
    return []
  } catch (error) {
    console.error("Error fetching quotes:", error)
    throw error
  }
}

export const createQuote = async (basePath: string, quote: Omit<Quote, "id"> | any): Promise<Quote> => {
  try {
    const quotesRef = ref(db, `${basePath}/quotes`)
    const newQuoteRef = push(quotesRef)
    const id = newQuoteRef.key as string

    const cleanQuote = stripUndefinedDeep(quote) || {}

    const quoteNumber = cleanQuote.quoteNumber || `QUOTE-${Date.now()}`

    const newQuote: Quote = {
      id,
      quoteNumber,
      customerId: cleanQuote.customerId || "",
      customerName: cleanQuote.customerName || "",
      customerEmail: cleanQuote.customerEmail,
      customerAddress: cleanQuote.customerAddress,
      lineItems: cleanQuote.lineItems || [],
      subtotal: cleanQuote.subtotal || 0,
      taxAmount: cleanQuote.taxAmount || 0,
      totalAmount: cleanQuote.totalAmount || 0,
      currency: cleanQuote.currency || "GBP",
      status: cleanQuote.status || "draft",
      issueDate: cleanQuote.issueDate || new Date().toISOString().split("T")[0],
      expiryDate: cleanQuote.expiryDate || cleanQuote.issueDate || new Date().toISOString().split("T")[0],
      description: cleanQuote.description,
      notes: cleanQuote.notes,
      terms: cleanQuote.terms,
      reference: cleanQuote.reference,
      paymentTerms: cleanQuote.paymentTerms || 30,
      discountPercentage: cleanQuote.discountPercentage || 0,
      discountAmount: cleanQuote.discountAmount || 0,
      convertedToInvoiceId: cleanQuote.convertedToInvoiceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentAt: cleanQuote.sentAt,
      attachments: cleanQuote.attachments,
    }

    await set(newQuoteRef, stripUndefinedDeep(newQuote))
    return newQuote
  } catch (error) {
    console.error("Error creating quote:", error)
    throw error
  }
}

export const updateQuote = async (basePath: string, quoteId: string, updates: Partial<Quote> | any): Promise<void> => {
  try {
    const quoteRef = ref(db, `${basePath}/quotes/${quoteId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(quoteRef, updatedFields)
  } catch (error) {
    console.error("Error updating quote:", error)
    throw error
  }
}

export const deleteQuote = async (basePath: string, quoteId: string): Promise<void> => {
  try {
    const quoteRef = ref(db, `${basePath}/quotes/${quoteId}`)
    await remove(quoteRef)
  } catch (error) {
    console.error("Error deleting quote:", error)
    throw error
  }
}

export const createInvoice = async (basePath: string, invoice: any): Promise<any> => {
  try {
    const invoicesRef = ref(db, `${basePath}/invoices`)
    const newInvoiceRef = push(invoicesRef)
    const id = newInvoiceRef.key as string

    const cleanInvoice = stripUndefinedDeep(invoice) || {}

    // Generate invoice number if not provided
    let invoiceNumber = cleanInvoice.invoiceNumber
    if (!invoiceNumber) {
      const { generateInvoiceNumber } = await import("../functions/FinanceAdvanced")
      invoiceNumber = await generateInvoiceNumber(basePath)
    }

    // Calculate balance_due if not provided
    const balance_due = cleanInvoice.balance_due !== undefined 
      ? cleanInvoice.balance_due 
      : (cleanInvoice.balanceDue !== undefined 
          ? cleanInvoice.balanceDue 
          : (cleanInvoice.totalAmount || 0))

    const newInvoice = {
      ...cleanInvoice,
      id,
      invoiceNumber,
      balance_due,
      balanceDue: balance_due,
      remindersSent: cleanInvoice.remindersSent || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newInvoiceRef, newInvoice)
    return newInvoice
  } catch (error) {
    console.error("Error creating invoice:", error)
    throw error
  }
}

export const updateInvoice = async (basePath: string, invoiceId: string, updates: any): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoiceId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(invoiceRef, updatedFields)
  } catch (error) {
    console.error("Error updating invoice:", error)
    throw error
  }
}

// Bills - Add missing CRUD operations
export const updateBill = async (basePath: string, billId: string, updates: Partial<Bill>): Promise<void> => {
  try {
    const billRef = ref(db, `${basePath}/bills/${billId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(billRef, updatedFields)
  } catch (error) {
    console.error("Error updating bill:", error)
    throw error
  }
}

export const deleteBill = async (basePath: string, billId: string): Promise<void> => {
  try {
    const billRef = ref(db, `${basePath}/bills/${billId}`)
    await remove(billRef)
  } catch (error) {
    console.error("Error deleting bill:", error)
    throw error
  }
}

// Contacts - Add missing CRUD operations
export const createContact = async (basePath: string, contact: Omit<Contact, "id">): Promise<Contact> => {
  try {
    const contactsRef = ref(db, `${basePath}/contacts`)
    const newContactRef = push(contactsRef)
    const id = newContactRef.key as string

    const newContact = {
      ...stripUndefinedDeep(contact),
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newContactRef, newContact)
    return newContact
  } catch (error) {
    console.error("Error creating contact:", error)
    throw error
  }
}

export const updateContact = async (basePath: string, contactId: string, updates: Partial<Contact>): Promise<void> => {
  try {
    const contactRef = ref(db, `${basePath}/contacts/${contactId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(contactRef, updatedFields)
  } catch (error) {
    console.error("Error updating contact:", error)
    throw error
  }
}

export const deleteContact = async (basePath: string, contactId: string): Promise<void> => {
  try {
    const contactRef = ref(db, `${basePath}/contacts/${contactId}`)
    await remove(contactRef)
  } catch (error) {
    console.error("Error deleting contact:", error)
    throw error
  }
}

// Bank Accounts - Add missing CRUD operations
export const createBankAccount = async (basePath: string, bankAccount: Omit<BankAccount, "id">): Promise<BankAccount> => {
  try {
    const bankAccountsRef = ref(db, `${basePath}/bankAccounts`)
    const newBankAccountRef = push(bankAccountsRef)
    const id = newBankAccountRef.key as string

    const newBankAccount = {
      ...stripUndefinedDeep(bankAccount),
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newBankAccountRef, newBankAccount)
    return newBankAccount
  } catch (error) {
    console.error("Error creating bank account:", error)
    throw error
  }
}

export const updateBankAccount = async (basePath: string, bankAccountId: string, updates: Partial<BankAccount>): Promise<void> => {
  try {
    const bankAccountRef = ref(db, `${basePath}/bankAccounts/${bankAccountId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(bankAccountRef, updatedFields)
  } catch (error) {
    console.error("Error updating bank account:", error)
    throw error
  }
}

export const deleteBankAccount = async (basePath: string, bankAccountId: string): Promise<void> => {
  try {
    const bankAccountRef = ref(db, `${basePath}/bankAccounts/${bankAccountId}`)
    await remove(bankAccountRef)
  } catch (error) {
    console.error("Error deleting bank account:", error)
    throw error
  }
}

// Bank Statements - Immutable records
export const fetchBankStatements = async (basePath: string, bankAccountId?: string): Promise<BankStatement[]> => {
  try {
    const statementsRef = ref(db, `${basePath}/bank_statements`)
    const snapshot = await get(statementsRef)

    if (snapshot.exists()) {
      let statements = Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
      
      if (bankAccountId) {
        statements = statements.filter((s) => s.bank_account_id === bankAccountId)
      }
      
      return statements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
    return []
  } catch (error) {
    console.error("Error fetching bank statements:", error)
    throw error
  }
}

export const createBankStatement = async (basePath: string, statement: Omit<BankStatement, "id">): Promise<BankStatement> => {
  try {
    const statementsRef = ref(db, `${basePath}/bank_statements`)
    const newStatementRef = push(statementsRef)
    const id = newStatementRef.key as string

    const newStatement: BankStatement = {
      ...statement,
      id,
      reconciled: false,
      created_at: new Date().toISOString(),
    }

    await set(newStatementRef, newStatement)
    return newStatement
  } catch (error) {
    console.error("Error creating bank statement:", error)
    throw error
  }
}

export const updateBankStatement = async (basePath: string, statementId: string, updates: Partial<BankStatement>): Promise<void> => {
  try {
    const statementRef = ref(db, `${basePath}/bank_statements/${statementId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(statementRef, updatedFields)
  } catch (error) {
    console.error("Error updating bank statement:", error)
    throw error
  }
}

// Bank Rules
export const fetchBankRules = async (basePath: string): Promise<BankRule[]> => {
  try {
    const readNode = async (node: "bank_rules" | "bankRules") => {
      const rulesRef = ref(db, `${basePath}/${node}`)
      const snapshot = await get(rulesRef)
      if (!snapshot.exists()) return []
      const raw = snapshot.val()
      if (!raw || typeof raw !== "object") return []
      return Object.entries(raw).map(([id, data]: [string, any]) => ({
        id,
        ...(data || {}),
        // Normalize priority for consistent sorting
        priority: Number((data as any)?.priority ?? 0) || 0,
      })) as BankRule[]
    }

    // Prefer the snake_case node used by newer code, but support legacy camelCase storage.
    const rulesSnake = await readNode("bank_rules")
    const rules = rulesSnake.length > 0 ? rulesSnake : await readNode("bankRules")

    return rules.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
  } catch (error) {
    console.error("Error fetching bank rules:", error)
    throw error
  }
}

export const createBankRule = async (basePath: string, rule: Omit<BankRule, "id">): Promise<BankRule> => {
  try {
    const rulesRef = ref(db, `${basePath}/bank_rules`)
    const newRuleRef = push(rulesRef)
    const id = newRuleRef.key as string

    const newRule: BankRule = {
      ...rule,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newRuleRef, newRule)
    return newRule
  } catch (error) {
    console.error("Error creating bank rule:", error)
    throw error
  }
}

export const updateBankRule = async (basePath: string, ruleId: string, updates: Partial<BankRule>): Promise<void> => {
  try {
    const ruleRef = ref(db, `${basePath}/bank_rules/${ruleId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(ruleRef, updatedFields)
  } catch (error) {
    console.error("Error updating bank rule:", error)
    throw error
  }
}

export const deleteBankRule = async (basePath: string, ruleId: string): Promise<void> => {
  try {
    const ruleRef = ref(db, `${basePath}/bank_rules/${ruleId}`)
    await remove(ruleRef)
  } catch (error) {
    console.error("Error deleting bank rule:", error)
    throw error
  }
}

// Bank Transfers
export const fetchBankTransfers = async (basePath: string): Promise<BankTransfer[]> => {
  try {
    const transfersRef = ref(db, `${basePath}/bank_transfers`)
    const snapshot = await get(transfersRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val())
        .map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
    return []
  } catch (error) {
    console.error("Error fetching bank transfers:", error)
    throw error
  }
}

export const createBankTransfer = async (basePath: string, transfer: Omit<BankTransfer, "id">): Promise<BankTransfer> => {
  try {
    const transfersRef = ref(db, `${basePath}/bank_transfers`)
    const newTransferRef = push(transfersRef)
    const id = newTransferRef.key as string

    const newTransfer: BankTransfer = {
      ...transfer,
      id,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newTransferRef, newTransfer)
    return newTransfer
  } catch (error) {
    console.error("Error creating bank transfer:", error)
    throw error
  }
}

export const updateBankTransfer = async (basePath: string, transferId: string, updates: Partial<BankTransfer>): Promise<void> => {
  try {
    const transferRef = ref(db, `${basePath}/bank_transfers/${transferId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(transferRef, updatedFields)
  } catch (error) {
    console.error("Error updating bank transfer:", error)
    throw error
  }
}

export const deleteBankTransfer = async (basePath: string, transferId: string): Promise<void> => {
  try {
    const transferRef = ref(db, `${basePath}/bank_transfers/${transferId}`)
    await remove(transferRef)
  } catch (error) {
    console.error("Error deleting bank transfer:", error)
    throw error
  }
}

// Clearing Accounts
export const fetchClearingAccounts = async (basePath: string): Promise<ClearingAccount[]> => {
  try {
    const clearingRef = ref(db, `${basePath}/clearing_accounts`)
    const snapshot = await get(clearingRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching clearing accounts:", error)
    throw error
  }
}

export const createClearingAccount = async (basePath: string, clearing: Omit<ClearingAccount, "id">): Promise<ClearingAccount> => {
  try {
    const clearingRef = ref(db, `${basePath}/clearing_accounts`)
    const newClearingRef = push(clearingRef)
    const id = newClearingRef.key as string

    const newClearing: ClearingAccount = {
      ...clearing,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newClearingRef, newClearing)
    return newClearing
  } catch (error) {
    console.error("Error creating clearing account:", error)
    throw error
  }
}

export const updateClearingAccount = async (basePath: string, clearingId: string, updates: Partial<ClearingAccount>): Promise<void> => {
  try {
    const clearingRef = ref(db, `${basePath}/clearing_accounts/${clearingId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(clearingRef, updatedFields)
  } catch (error) {
    console.error("Error updating clearing account:", error)
    throw error
  }
}

export const deleteClearingAccount = async (basePath: string, clearingId: string): Promise<void> => {
  try {
    const clearingRef = ref(db, `${basePath}/clearing_accounts/${clearingId}`)
    await remove(clearingRef)
  } catch (error) {
    console.error("Error deleting clearing account:", error)
    throw error
  }
}

// FX Revaluations
export const fetchFXRevaluations = async (basePath: string): Promise<FXRevaluation[]> => {
  try {
    const fxRef = ref(db, `${basePath}/fx_revaluations`)
    const snapshot = await get(fxRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val())
        .map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }))
        .sort((a, b) => new Date(b.revaluation_date).getTime() - new Date(a.revaluation_date).getTime())
    }
    return []
  } catch (error) {
    console.error("Error fetching FX revaluations:", error)
    throw error
  }
}

export const createFXRevaluation = async (basePath: string, fx: Omit<FXRevaluation, "id">): Promise<FXRevaluation> => {
  try {
    const fxRef = ref(db, `${basePath}/fx_revaluations`)
    const newFxRef = push(fxRef)
    const id = newFxRef.key as string

    const newFx: FXRevaluation = {
      ...fx,
      id,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newFxRef, newFx)
    return newFx
  } catch (error) {
    console.error("Error creating FX revaluation:", error)
    throw error
  }
}

export const updateFXRevaluation = async (basePath: string, fxId: string, updates: Partial<FXRevaluation>): Promise<void> => {
  try {
    const fxRef = ref(db, `${basePath}/fx_revaluations/${fxId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(fxRef, updatedFields)
  } catch (error) {
    console.error("Error updating FX revaluation:", error)
    throw error
  }
}

// Journals (Manual Journal Entries)
export const fetchJournals = async (basePath: string): Promise<Journal[]> => {
  try {
    const journalsRef = ref(db, `${basePath}/journals`)
    const snapshot = await get(journalsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val())
        .map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
    return []
  } catch (error) {
    console.error("Error fetching journals:", error)
    throw error
  }
}

export const createJournal = async (basePath: string, journal: Omit<Journal, "id">): Promise<Journal> => {
  try {
    const journalsRef = ref(db, `${basePath}/journals`)
    const newJournalRef = push(journalsRef)
    const id = newJournalRef.key as string

    // Calculate totals and balance
    const totalDebit = journal.journal_lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = journal.journal_lines.reduce((sum, line) => sum + (line.credit || 0), 0)
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 // Allow small rounding differences

    // Check if period is locked
    const periodLocks = await fetchPeriodLocks(basePath)
    const journalDate = new Date(journal.date)
    const periodLocked = periodLocks.some(lock => {
      if (!lock.is_locked) return false
      const lockStart = new Date(lock.period_start)
      const lockEnd = new Date(lock.period_end)
      return journalDate >= lockStart && journalDate <= lockEnd
    })

    const newJournal: Journal = {
      ...stripUndefinedDeep(journal),
      id,
      journal_number: journal.journal_number || `JRN-${Date.now()}`,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: isBalanced,
      period_locked: periodLocked,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Create journal lines with IDs
    const journalLinesRef = ref(db, `${basePath}/journal_lines`)
    const linesWithIds: JournalLine[] = []
    
    for (let i = 0; i < journal.journal_lines.length; i++) {
      const line = journal.journal_lines[i]
      const lineRef = push(journalLinesRef)
      const lineId = lineRef.key as string
      
      const newLine: JournalLine = {
        ...(stripUndefinedDeep(line) as any),
        id: lineId,
        journal_id: id,
        line_number: i + 1,
        created_at: new Date().toISOString(),
      }
      
      const cleanedLine = stripUndefinedDeep(newLine) as JournalLine
      await set(lineRef, cleanedLine)
      linesWithIds.push(cleanedLine)
    }

    newJournal.journal_lines = linesWithIds
    await set(newJournalRef, stripUndefinedDeep(newJournal))
    return newJournal
  } catch (error) {
    console.error("Error creating journal:", error)
    throw error
  }
}

export const updateJournal = async (basePath: string, journalId: string, updates: Partial<Journal>): Promise<void> => {
  try {
    const journalRef = ref(db, `${basePath}/journals/${journalId}`)
    
    // If journal_lines are being updated, recalculate totals
    if (updates.journal_lines) {
      const totalDebit = updates.journal_lines.reduce((sum, line) => sum + (line.debit || 0), 0)
      const totalCredit = updates.journal_lines.reduce((sum, line) => sum + (line.credit || 0), 0)
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
      
      updates.total_debit = totalDebit
      updates.total_credit = totalCredit
      updates.is_balanced = isBalanced

      // Update journal lines
      const existingJournal = await get(journalRef)
      if (existingJournal.exists()) {
        const journal = existingJournal.val()
        // Delete old lines
        for (const line of journal.journal_lines || []) {
          const lineRef = ref(db, `${basePath}/journal_lines/${line.id}`)
          await remove(lineRef)
        }

        // Create new lines
        const journalLinesRef = ref(db, `${basePath}/journal_lines`)
        const linesWithIds: JournalLine[] = []
        
        for (let i = 0; i < updates.journal_lines.length; i++) {
          const line = updates.journal_lines[i]
          const lineRef = push(journalLinesRef)
          const lineId = lineRef.key as string
          
          const newLine: JournalLine = {
            ...(stripUndefinedDeep(line) as any),
            id: lineId,
            journal_id: journalId,
            line_number: i + 1,
            created_at: line.created_at || new Date().toISOString(),
          }
          
          const cleanedLine = stripUndefinedDeep(newLine) as JournalLine
          await set(lineRef, cleanedLine)
          linesWithIds.push(cleanedLine)
        }
        
        updates.journal_lines = linesWithIds
      }
    }

    const updatedFields = {
      ...stripUndefinedDeep(updates),
      updated_at: new Date().toISOString(),
    }
    await update(journalRef, updatedFields)
  } catch (error) {
    console.error("Error updating journal:", error)
    throw error
  }
}

export const deleteJournal = async (basePath: string, journalId: string): Promise<void> => {
  try {
    // Delete journal lines first
    const journalRef = ref(db, `${basePath}/journals/${journalId}`)
    const journalSnapshot = await get(journalRef)
    
    if (journalSnapshot.exists()) {
      const journal = journalSnapshot.val()
      for (const line of journal.journal_lines || []) {
        const lineRef = ref(db, `${basePath}/journal_lines/${line.id}`)
        await remove(lineRef)
      }
    }
    
    // Delete journal
    await remove(journalRef)
  } catch (error) {
    console.error("Error deleting journal:", error)
    throw error
  }
}

export const approveJournal = async (basePath: string, journalId: string, approvedBy: string): Promise<void> => {
  try {
    const journalRef = ref(db, `${basePath}/journals/${journalId}`)
    await update(journalRef, {
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error approving journal:", error)
    throw error
  }
}

export const postJournal = async (basePath: string, journalId: string, postedBy: string): Promise<void> => {
  try {
    const journalRef = ref(db, `${basePath}/journals/${journalId}`)
    const journalSnapshot = await get(journalRef)
    
    if (!journalSnapshot.exists()) {
      throw new Error("Journal not found")
    }
    
    const journal = journalSnapshot.val()
    
    if (!journal.is_balanced) {
      throw new Error("Cannot post unbalanced journal entry")
    }
    
    if (journal.period_locked) {
      throw new Error("Cannot post journal to locked period")
    }

    // Update journal status
    await update(journalRef, {
      status: "posted",
      posted_by: postedBy,
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Create transaction from journal
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const newTransactionRef = push(transactionsRef)
    const transactionId = newTransactionRef.key as string

    const entries = journal.journal_lines.map((line: JournalLine) => ({
      accountId: line.account_id,
      amount: line.debit > 0 ? line.debit : line.credit,
      type: line.debit > 0 ? "debit" : "credit",
      description: line.description,
      debit: line.debit,
      credit: line.credit,
      id: line.id,
    }))

    await set(newTransactionRef, {
      id: transactionId,
      transactionNumber: journal.journal_number,
      date: journal.date,
      description: journal.description || `Journal Entry: ${journal.journal_number}`,
      reference: journal.reference,
      type: "adjustment",
      status: "completed",
      entries,
      totalAmount: journal.total_debit,
      currency: journal.currency || "GBP",
      sourceDocument: {
        type: "manual",
        id: journalId,
      },
      isReconciled: false,
      createdBy: journal.created_by,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error posting journal:", error)
    throw error
  }
}

export const reverseJournal = async (basePath: string, journalId: string, reversedBy: string, reversalDate: string): Promise<Journal> => {
  try {
    const journalRef = ref(db, `${basePath}/journals/${journalId}`)
    const journalSnapshot = await get(journalRef)
    
    if (!journalSnapshot.exists()) {
      throw new Error("Journal not found")
    }
    
    const originalJournal = journalSnapshot.val()
    
    if (originalJournal.status !== "posted") {
      throw new Error("Can only reverse posted journals")
    }

    // Create reversal journal
    const reversedLines: JournalLine[] = originalJournal.journal_lines.map((line: JournalLine) => ({
      ...line,
      id: "", // Will be generated
      journal_id: "", // Will be set
      debit: line.credit, // Swap debit/credit
      credit: line.debit,
      line_number: line.line_number,
    }))

    const reversalJournal: Omit<Journal, "id"> = {
      entity_id: originalJournal.entity_id,
      journal_number: `REV-${originalJournal.journal_number}`,
      source: "reversal",
      date: reversalDate,
      description: `Reversal of ${originalJournal.journal_number}: ${originalJournal.description || ""}`,
      reference: originalJournal.reference,
      status: "draft",
      journal_lines: reversedLines,
      total_debit: originalJournal.total_credit,
      total_credit: originalJournal.total_debit,
      is_balanced: true,
      period_locked: false,
      created_by: reversedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reverses_journal_id: journalId,
    }

    const newJournal = await createJournal(basePath, reversalJournal)

    // Update original journal
    await update(journalRef, {
      status: "reversed",
      reversed_by: reversedBy,
      reversed_at: new Date().toISOString(),
      reversal_of_journal_id: newJournal.id,
      updated_at: new Date().toISOString(),
    })

    return newJournal
  } catch (error) {
    console.error("Error reversing journal:", error)
    throw error
  }
}

// Period Locks
export const fetchPeriodLocks = async (basePath: string): Promise<PeriodLock[]> => {
  try {
    const locksRef = ref(db, `${basePath}/period_locks`)
    const snapshot = await get(locksRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching period locks:", error)
    throw error
  }
}

export const createPeriodLock = async (basePath: string, lock: Omit<PeriodLock, "id">): Promise<PeriodLock> => {
  try {
    const locksRef = ref(db, `${basePath}/period_locks`)
    const newLockRef = push(locksRef)
    const id = newLockRef.key as string

    const newLock: PeriodLock = {
      ...lock,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newLockRef, newLock)
    return newLock
  } catch (error) {
    console.error("Error creating period lock:", error)
    throw error
  }
}

export const updatePeriodLock = async (basePath: string, lockId: string, updates: Partial<PeriodLock>): Promise<void> => {
  try {
    const lockRef = ref(db, `${basePath}/period_locks/${lockId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(lockRef, updatedFields)
  } catch (error) {
    console.error("Error updating period lock:", error)
    throw error
  }
}

export const deletePeriodLock = async (basePath: string, lockId: string): Promise<void> => {
  try {
    const lockRef = ref(db, `${basePath}/period_locks/${lockId}`)
    await remove(lockRef)
  } catch (error) {
    console.error("Error deleting period lock:", error)
    throw error
  }
}

// Tracking Dimensions
export const fetchDimensions = async (basePath: string): Promise<Dimension[]> => {
  try {
    const dimensionsRef = ref(db, `${basePath}/dimensions`)
    const snapshot = await get(dimensionsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching dimensions:", error)
    throw error
  }
}

export const createDimension = async (basePath: string, dimension: Omit<Dimension, "id">): Promise<Dimension> => {
  try {
    const dimensionsRef = ref(db, `${basePath}/dimensions`)
    const newDimensionRef = push(dimensionsRef)
    const id = newDimensionRef.key as string

    const newDimension: Dimension = {
      ...dimension,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newDimensionRef, newDimension)
    return newDimension
  } catch (error) {
    console.error("Error creating dimension:", error)
    throw error
  }
}

export const updateDimension = async (basePath: string, dimensionId: string, updates: Partial<Dimension>): Promise<void> => {
  try {
    const dimensionRef = ref(db, `${basePath}/dimensions/${dimensionId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(dimensionRef, updatedFields)
  } catch (error) {
    console.error("Error updating dimension:", error)
    throw error
  }
}

export const deleteDimension = async (basePath: string, dimensionId: string): Promise<void> => {
  try {
    const dimensionRef = ref(db, `${basePath}/dimensions/${dimensionId}`)
    await remove(dimensionRef)
  } catch (error) {
    console.error("Error deleting dimension:", error)
    throw error
  }
}

export const fetchReports = async (basePath: string): Promise<any[]> => {
  try {
    const reportsRef = ref(db, `${basePath}/reports`)
    const snapshot = await get(reportsRef)
    const reports = snapshot.val() || {}
    return Object.values(reports)
  } catch (error) {
    console.error("Error fetching reports:", error)
    return []
  }
}

export const fetchCurrencies = async (basePath: string): Promise<Currency[]> => {
  try {
    const currenciesRef = ref(db, `${basePath}/currencies`)
    const snapshot = await get(currenciesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        ...data,
        code: id,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching currencies:", error)
    return []
  }
}

export const createCurrency = async (basePath: string, currency: Currency): Promise<Currency> => {
  try {
    const currencyRef = ref(db, `${basePath}/currencies/${currency.code}`)
    await set(currencyRef, currency)
    return currency
  } catch (error) {
    console.error("Error creating currency:", error)
    throw error
  }
}

export const updateCurrency = async (basePath: string, currencyCode: string, updates: Partial<Currency>): Promise<void> => {
  try {
    const currencyRef = ref(db, `${basePath}/currencies/${currencyCode}`)
    await update(currencyRef, updates)
  } catch (error) {
    console.error("Error updating currency:", error)
    throw error
  }
}

export const deleteCurrency = async (basePath: string, currencyCode: string): Promise<void> => {
  try {
    const currencyRef = ref(db, `${basePath}/currencies/${currencyCode}`)
    await remove(currencyRef)
  } catch (error) {
    console.error("Error deleting currency:", error)
    throw error
  }
}

// Exchange Rate History
export const fetchExchangeRates = async (basePath: string, currencyCode?: string): Promise<ExchangeRate[]> => {
  try {
    const exchangeRatesRef = ref(db, `${basePath}/exchange_rates`)
    const snapshot = await get(exchangeRatesRef)
    if (snapshot.exists()) {
      const rates = Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
      return currencyCode 
        ? rates.filter((rate) => rate.currency_code === currencyCode)
        : rates
    }
    return []
  } catch (error) {
    console.error("Error fetching exchange rates:", error)
    return []
  }
}

export const createExchangeRate = async (basePath: string, exchangeRate: Omit<ExchangeRate, "id">): Promise<ExchangeRate> => {
  try {
    const exchangeRatesRef = ref(db, `${basePath}/exchange_rates`)
    const newRateRef = push(exchangeRatesRef)
    const id = newRateRef.key as string

    const newRate: ExchangeRate = {
      ...exchangeRate,
      id,
      created_at: exchangeRate.created_at || new Date().toISOString(),
    }

    await set(newRateRef, newRate)
    
    // Update currency's current rate if this is the latest rate
    const currencyRef = ref(db, `${basePath}/currencies/${exchangeRate.currency_code}`)
    const currencySnapshot = await get(currencyRef)
    if (currencySnapshot.exists()) {
      const currency = currencySnapshot.val()
      const existingRates = await fetchExchangeRates(basePath, exchangeRate.currency_code)
      const latestRate = existingRates.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
      
      if (latestRate && latestRate.id === id) {
        await update(currencyRef, {
          rate: exchangeRate.rate,
          lastUpdated: exchangeRate.date,
        })
      }
    }
    
    return newRate
  } catch (error) {
    console.error("Error creating exchange rate:", error)
    throw error
  }
}

export const deleteExchangeRate = async (basePath: string, rateId: string): Promise<void> => {
  try {
    const rateRef = ref(db, `${basePath}/exchange_rates/${rateId}`)
    await remove(rateRef)
  } catch (error) {
    console.error("Error deleting exchange rate:", error)
    throw error
  }
}

// Payments
export const fetchPayments = async (basePath: string): Promise<Payment[]> => {
  try {
    const paymentsRef = ref(db, `${basePath}/payments`)
    const snapshot = await get(paymentsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching payments:", error)
    throw error
  }
}

export const createPayment = async (basePath: string, payment: Omit<Payment, "id">): Promise<Payment> => {
  try {
    const paymentsRef = ref(db, `${basePath}/payments`)
    const newPaymentRef = push(paymentsRef)
    const id = newPaymentRef.key as string

    const newPayment = {
      ...stripUndefinedDeep(payment),
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newPaymentRef, newPayment)
    return newPayment
  } catch (error) {
    console.error("Error creating payment:", error)
    throw error
  }
}

export const updatePayment = async (basePath: string, paymentId: string, updates: Partial<Payment>): Promise<void> => {
  try {
    const paymentRef = ref(db, `${basePath}/payments/${paymentId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(paymentRef, updatedFields)
  } catch (error) {
    console.error("Error updating payment:", error)
    throw error
  }
}

export const deletePayment = async (basePath: string, paymentId: string): Promise<void> => {
  try {
    const paymentRef = ref(db, `${basePath}/payments/${paymentId}`)
    await remove(paymentRef)
  } catch (error) {
    console.error("Error deleting payment:", error)
    throw error
  }
}

// Credit Notes
export const fetchCreditNotes = async (basePath: string): Promise<CreditNote[]> => {
  try {
    const creditNotesRef = ref(db, `${basePath}/creditNotes`)
    const snapshot = await get(creditNotesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching credit notes:", error)
    throw error
  }
}

export const createCreditNote = async (basePath: string, creditNote: Omit<CreditNote, "id">): Promise<CreditNote> => {
  try {
    const creditNotesRef = ref(db, `${basePath}/creditNotes`)
    const newCreditNoteRef = push(creditNotesRef)
    const id = newCreditNoteRef.key as string

    const cleanCreditNote = stripUndefinedDeep(creditNote) || {}

    // Generate credit note number if not provided
    let creditNoteNumber = cleanCreditNote.creditNoteNumber
    if (!creditNoteNumber) {
      const { generateCreditNoteNumber } = await import("../functions/FinanceAdvanced")
      creditNoteNumber = await generateCreditNoteNumber(basePath)
    }

    // Calculate balance_due if not provided
    const balance_due = cleanCreditNote.balance_due !== undefined 
      ? cleanCreditNote.balance_due 
      : (cleanCreditNote.balanceDue !== undefined 
          ? cleanCreditNote.balanceDue 
          : (cleanCreditNote.totalAmount || 0))

    const newCreditNote = {
      ...cleanCreditNote,
      id,
      creditNoteNumber,
      balance_due,
      balanceDue: balance_due,
      status: cleanCreditNote.status || "issued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newCreditNoteRef, newCreditNote)
    return newCreditNote
  } catch (error) {
    console.error("Error creating credit note:", error)
    throw error
  }
}

export const updateCreditNote = async (basePath: string, creditNoteId: string, updates: Partial<CreditNote>): Promise<void> => {
  try {
    const creditNoteRef = ref(db, `${basePath}/creditNotes/${creditNoteId}`)
    const updatedFields = stripUndefinedDeep({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    await update(creditNoteRef, updatedFields)
  } catch (error) {
    console.error("Error updating credit note:", error)
    throw error
  }
}

export const deleteCreditNote = async (basePath: string, creditNoteId: string): Promise<void> => {
  try {
    const creditNoteRef = ref(db, `${basePath}/creditNotes/${creditNoteId}`)
    await remove(creditNoteRef)
  } catch (error) {
    console.error("Error deleting credit note:", error)
    throw error
  }
}

// Purchase Orders
export const fetchPurchaseOrders = async (basePath: string): Promise<PurchaseOrder[]> => {
  try {
    const purchaseOrdersRef = ref(db, `${basePath}/purchaseOrders`)
    const snapshot = await get(purchaseOrdersRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    throw error
  }
}

export const createPurchaseOrder = async (basePath: string, purchaseOrder: Omit<PurchaseOrder, "id">): Promise<PurchaseOrder> => {
  try {
    const purchaseOrdersRef = ref(db, `${basePath}/purchaseOrders`)
    const newPurchaseOrderRef = push(purchaseOrdersRef)
    const id = newPurchaseOrderRef.key as string

    const newPurchaseOrder = {
      ...purchaseOrder,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newPurchaseOrderRef, newPurchaseOrder)
    return newPurchaseOrder
  } catch (error) {
    console.error("Error creating purchase order:", error)
    throw error
  }
}

export const updatePurchaseOrder = async (basePath: string, purchaseOrderId: string, updates: Partial<PurchaseOrder>): Promise<void> => {
  try {
    const purchaseOrderRef = ref(db, `${basePath}/purchaseOrders/${purchaseOrderId}`)
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await update(purchaseOrderRef, updatedFields)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    throw error
  }
}

export const deletePurchaseOrder = async (basePath: string, purchaseOrderId: string): Promise<void> => {
  try {
    const purchaseOrderRef = ref(db, `${basePath}/purchaseOrders/${purchaseOrderId}`)
    await remove(purchaseOrderRef)
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    throw error
  }
}

// Tax Rates
export const fetchTaxRates = async (basePath: string): Promise<TaxRate[]> => {
  try {
    const taxRatesRef = ref(db, `${basePath}/taxRates`)
    const snapshot = await get(taxRatesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching tax rates:", error)
    throw error
  }
}

export const createTaxRate = async (basePath: string, taxRate: Omit<TaxRate, "id">): Promise<TaxRate> => {
  try {
    const taxRatesRef = ref(db, `${basePath}/taxRates`)
    const newTaxRateRef = push(taxRatesRef)
    const id = newTaxRateRef.key as string

    const newTaxRate = {
      ...taxRate,
      id,
    }

    await set(newTaxRateRef, newTaxRate)
    return newTaxRate
  } catch (error) {
    console.error("Error creating tax rate:", error)
    throw error
  }
}

export const updateTaxRate = async (basePath: string, taxRateId: string, updates: Partial<TaxRate>): Promise<void> => {
  try {
    const taxRateRef = ref(db, `${basePath}/taxRates/${taxRateId}`)
    await update(taxRateRef, updates)
  } catch (error) {
    console.error("Error updating tax rate:", error)
    throw error
  }
}

export const deleteTaxRate = async (basePath: string, taxRateId: string): Promise<void> => {
  try {
    const taxRateRef = ref(db, `${basePath}/taxRates/${taxRateId}`)
    await remove(taxRateRef)
  } catch (error) {
    console.error("Error deleting tax rate:", error)
    throw error
  }
}

// Payment Terms
export const fetchPaymentTerms = async (basePath: string): Promise<PaymentTerm[]> => {
  try {
    const paymentTermsRef = ref(db, `${basePath}/paymentTerms`)
    const snapshot = await get(paymentTermsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching payment terms:", error)
    throw error
  }
}

export const createPaymentTerm = async (basePath: string, paymentTerm: Omit<PaymentTerm, "id">): Promise<PaymentTerm> => {
  try {
    const paymentTermsRef = ref(db, `${basePath}/paymentTerms`)
    const newPaymentTermRef = push(paymentTermsRef)
    const id = newPaymentTermRef.key as string

    const newPaymentTerm = {
      ...paymentTerm,
      id,
    }

    await set(newPaymentTermRef, newPaymentTerm)
    return newPaymentTerm
  } catch (error) {
    console.error("Error creating payment term:", error)
    throw error
  }
}

// Bank Reconciliations
export const fetchBankReconciliations = async (basePath: string): Promise<BankReconciliation[]> => {
  try {
    const reconciliationsRef = ref(db, `${basePath}/bankReconciliations`)
    const snapshot = await get(reconciliationsRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching bank reconciliations:", error)
    throw error
  }
}

export const createBankReconciliation = async (basePath: string, reconciliation: Omit<BankReconciliation, "id">): Promise<BankReconciliation> => {
  try {
    const reconciliationsRef = ref(db, `${basePath}/bankReconciliations`)
    const newReconciliationRef = push(reconciliationsRef)
    const id = newReconciliationRef.key as string

    const newReconciliation = {
      ...reconciliation,
      id,
      createdAt: new Date().toISOString(),
    }

    await set(newReconciliationRef, newReconciliation)
    return newReconciliation
  } catch (error) {
    console.error("Error creating bank reconciliation:", error)
    throw error
  }
}

export const updateBankReconciliation = async (basePath: string, reconciliationId: string, updates: Partial<BankReconciliation>): Promise<void> => {
  try {
    const reconciliationRef = ref(db, `${basePath}/bankReconciliations/${reconciliationId}`)
    await update(reconciliationRef, updates)
  } catch (error) {
    console.error("Error updating bank reconciliation:", error)
    throw error
  }
}

// Journal Entries
export const fetchJournalEntries = async (basePath: string): Promise<JournalEntry[]> => {
  try {
    const journalEntriesRef = ref(db, `${basePath}/journalEntries`)
    const snapshot = await get(journalEntriesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching journal entries:", error)
    throw error
  }
}

export const createJournalEntry = async (basePath: string, entry: Omit<JournalEntry, "id">): Promise<JournalEntry> => {
  try {
    const journalEntriesRef = ref(db, `${basePath}/journalEntries`)
    const newEntryRef = push(journalEntriesRef)
    const id = newEntryRef.key as string

    const newEntry = {
      ...entry,
      id,
    }

    await set(newEntryRef, newEntry)
    return newEntry
  } catch (error) {
    console.error("Error creating journal entry:", error)
    throw error
  }
}

export const updateJournalEntry = async (basePath: string, entryId: string, updates: Partial<JournalEntry>): Promise<void> => {
  try {
    const entryRef = ref(db, `${basePath}/journalEntries/${entryId}`)
    await update(entryRef, updates)
  } catch (error) {
    console.error("Error updating journal entry:", error)
    throw error
  }
}

export const deleteJournalEntry = async (basePath: string, entryId: string): Promise<void> => {
  try {
    const entryRef = ref(db, `${basePath}/journalEntries/${entryId}`)
    await remove(entryRef)
  } catch (error) {
    console.error("Error deleting journal entry:", error)
    throw error
  }
}

// Financial Reports
export const saveReport = async (basePath: string, report: Omit<FinancialReport, "id">): Promise<FinancialReport> => {
  try {
    const reportsRef = ref(db, `${basePath}/reports`)
    const newReportRef = push(reportsRef)
    const id = newReportRef.key as string

    const newReport = {
      ...report,
      id,
    }

    await set(newReportRef, newReport)
    return newReport
  } catch (error) {
    console.error("Error saving report:", error)
    throw error
  }
}

export const deleteReport = async (basePath: string, reportId: string): Promise<void> => {
  try {
    const reportRef = ref(db, `${basePath}/reports/${reportId}`)
    await remove(reportRef)
  } catch (error) {
    console.error("Error deleting report:", error)
    throw error
  }
}

// Delete Invoice
export const deleteInvoice = async (basePath: string, invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoiceId}`)
    await remove(invoiceRef)
  } catch (error) {
    console.error("Error deleting invoice:", error)
    throw error
  }
}

// Opening Balances
export const fetchOpeningBalances = async (basePath: string): Promise<OpeningBalance[]> => {
  try {
    const balancesRef = ref(db, `${basePath}/opening_balances`)
    const snapshot = await get(balancesRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching opening balances:", error)
    throw error
  }
}

export const createOpeningBalance = async (basePath: string, balance: Omit<OpeningBalance, "id">): Promise<OpeningBalance> => {
  try {
    const balancesRef = ref(db, `${basePath}/opening_balances`)
    const newBalanceRef = push(balancesRef)
    const id = newBalanceRef.key as string

    const newBalance: OpeningBalance = {
      ...balance,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newBalanceRef, newBalance)
    return newBalance
  } catch (error) {
    console.error("Error creating opening balance:", error)
    throw error
  }
}

export const updateOpeningBalance = async (basePath: string, balanceId: string, updates: Partial<OpeningBalance>): Promise<void> => {
  try {
    const balanceRef = ref(db, `${basePath}/opening_balances/${balanceId}`)
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await update(balanceRef, updatedFields)
  } catch (error) {
    console.error("Error updating opening balance:", error)
    throw error
  }
}

export const deleteOpeningBalance = async (basePath: string, balanceId: string): Promise<void> => {
  try {
    const balanceRef = ref(db, `${basePath}/opening_balances/${balanceId}`)
    await remove(balanceRef)
  } catch (error) {
    console.error("Error deleting opening balance:", error)
    throw error
  }
}

// ===== FINANCE SETTINGS & INTEGRATIONS =====

export async function fetchFinanceSettings(path: string): Promise<any | null> {
  try {
    const snap = await get(ref(db, path))
    return snap.exists() ? (snap.val() || {}) : null
  } catch (err: any) {
    console.error("Error fetching finance settings:", err)
    return null
  }
}

export async function saveFinanceSettings(path: string, settings: any): Promise<void> {
  try {
    const clean = Object.fromEntries(Object.entries(settings || {}).filter(([, v]) => v !== undefined))
    await update(ref(db, path), { ...clean, updatedAt: Date.now() })
  } catch (err: any) {
    console.error("Error saving finance settings:", err)
    throw err
  }
}

export async function fetchFinanceIntegrations(path: string): Promise<any> {
  try {
    const snap = await get(ref(db, path))
    return snap.exists() ? (snap.val() || {}) : {}
  } catch (err: any) {
    console.error("Error fetching finance integrations:", err)
    return {}
  }
}

export async function saveFinanceIntegration(path: string, integration: any): Promise<void> {
  try {
    if (!path || !integration?.id) return
    const clean = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
    await set(ref(db, `${path}/${integration.id}`), clean)
  } catch (err: any) {
    console.error("Error saving finance integration:", err)
    throw err
  }
}
