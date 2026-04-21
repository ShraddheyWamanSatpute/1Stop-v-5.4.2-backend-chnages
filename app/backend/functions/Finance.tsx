import { ref, get, set, push, update, query, remove } from "firebase/database"
import { equalTo, orderByChild } from "firebase/database"
import { db } from "../services/Firebase"
import { v4 as uuidv4 } from "uuid"
import type {
  FinanceData,
  Transaction,
  Invoice,
  Bill,
  BankAccount,
  Expense,
  Currency,
  Budget,
  Account,
  Contact,
  JournalEntry
} from "../interfaces/Finance"
import type { Supplier } from "../interfaces/Stock"
import type { Payroll, PayrollPeriod } from "../interfaces/HRs"

export const createAccount = async (basePath: string, account: Omit<Account, "id">): Promise<Account> => {
  try {
    const accountsRef = ref(db, `${basePath}/accounts`)
    const newAccountRef = push(accountsRef)
    const id = newAccountRef.key as string

    const newAccount = {
      ...account,
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

    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await update(accountRef, updatedFields)
  } catch (error) {
    console.error("Error updating account:", error)
    throw error
  }
}

export const deleteAccount = async (basePath: string, accountId: string): Promise<void> => {
  try {
    // Check if account has transactions
    const entriesRef = ref(db, `${basePath}/journal_entries`)
    const entriesQuery = query(entriesRef, orderByChild("accountId"), equalTo(accountId))

    const entriesSnapshot = await get(entriesQuery)

    if (entriesSnapshot.exists()) {
      throw new Error("Cannot delete account with associated transactions. Archive it instead.")
    }

    // Archive instead of delete
    const accountRef = ref(db, `${basePath}/accounts/${accountId}`)
    await update(accountRef, {
      isArchived: true,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error deleting/archiving account:", error)
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

export const addBill = async (basePath: string, bill: Omit<Bill, "id">): Promise<string> => {
  try {
    const billsRef = ref(db, `${basePath}/bills`)
    const newBillRef = push(billsRef)
    const id = newBillRef.key as string

    await set(newBillRef, {
      ...bill,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return id
  } catch (error) {
    console.error("Error adding bill:", error)
    throw error
  }
}

export const updateBill = async (basePath: string, billId: string, updates: Partial<Bill>): Promise<void> => {
  try {
    const billRef = ref(db, `${basePath}/bills/${billId}`)
    await update(billRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
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

// Suppliers (from Stock module)
export const fetchSuppliers = async (basePath: string): Promise<Supplier[]> => {
  try {
    // Note: This assumes suppliers are stored in the stock module
    const suppliersRef = ref(db, `${basePath}/stock/suppliers`)
    const snapshot = await get(suppliersRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching suppliers:", error)
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

export const createContact = async (
  basePath: string,
  contact: Omit<Contact, "id" | "createdAt" | "updatedAt">
): Promise<void> => {
  try {
    const contactsRef = ref(db, `${basePath}/contacts`)
    const newContactRef = push(contactsRef)
    const id = newContactRef.key as string

    await set(newContactRef, {
      ...contact,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error creating contact:", error)
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

// Bank Accounts
export const fetchBankAccounts = async (basePath: string): Promise<BankAccount[]> => {
  try {
    const bankAccountsRef = ref(db, `${basePath}/bank_accounts`)
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

export const createBankAccount = async (basePath: string, bankAccount: Omit<BankAccount, "id">): Promise<BankAccount> => {
  try {
    const bankAccountsRef = ref(db, `${basePath}/bank_accounts`)
    const newBankAccountRef = push(bankAccountsRef)
    const id = newBankAccountRef.key as string

    const newBankAccount = {
      ...bankAccount,
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
    const bankAccountRef = ref(db, `${basePath}/bank_accounts/${bankAccountId}`)

    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await update(bankAccountRef, updatedFields)
  } catch (error) {
    console.error("Error updating bank account:", error)
    throw error
  }
}

export const deleteBankAccount = async (basePath: string, bankAccountId: string): Promise<void> => {
  try {
    // Check if bank account has transactions
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionsQuery = query(transactionsRef, orderByChild("bankAccountId"), equalTo(bankAccountId))

    const transactionsSnapshot = await get(transactionsQuery)

    if (transactionsSnapshot.exists()) {
      throw new Error("Cannot delete bank account with associated transactions. Archive it instead.")
    }

    // Archive instead of delete
    const bankAccountRef = ref(db, `${basePath}/bank_accounts/${bankAccountId}`)
    await update(bankAccountRef, {
      isArchived: true,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error deleting/archiving bank account:", error)
    throw error
  }
}

// Reports
export const fetchReports = async (basePath: string): Promise<any[]> => {
  try {
    const reportsRef = ref(db, `${basePath}/reports`)
    const snapshot = await get(reportsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching reports:", error)
    throw error
  }
}

export const saveReport = async (basePath: string, report: any): Promise<string> => {
  try {
    const reportsRef = ref(db, `${basePath}/reports`)
    const newReportRef = push(reportsRef)
    const id = newReportRef.key as string

    await set(newReportRef, {
      ...report,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return id
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

// Currencies
export const fetchCurrencies = async (basePath: string): Promise<Currency[]> => {
  try {
    const currenciesRef = ref(db, `${basePath}/currencies`)
    const snapshot = await get(currenciesRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching currencies:", error)
    throw error
  }
}

export const addCurrency = async (basePath: string, currency: Omit<Currency, "id">): Promise<string> => {
  try {
    const currenciesRef = ref(db, `${basePath}/currencies`)
    const newCurrencyRef = push(currenciesRef)
    const id = newCurrencyRef.key as string

    await set(newCurrencyRef, {
      ...currency,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return id
  } catch (error) {
    console.error("Error adding currency:", error)
    throw error
  }
}

export const updateCurrency = async (basePath: string, currencyId: string, updates: Partial<Currency>): Promise<void> => {
  try {
    const currencyRef = ref(db, `${basePath}/currencies/${currencyId}`)
    await update(currencyRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating currency:", error)
    throw error
  }
}

export const deleteCurrency = async (basePath: string, currencyId: string): Promise<void> => {
  try {
    const currencyRef = ref(db, `${basePath}/currencies/${currencyId}`)
    await remove(currencyRef)
  } catch (error) {
    console.error("Error deleting currency:", error)
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

export const createBudget = async (basePath: string, budget: Omit<Budget, "id">): Promise<string> => {
  try {
    const budgetsRef = ref(db, `${basePath}/budgets`)
    const newBudgetRef = push(budgetsRef)
    const id = newBudgetRef.key as string

    await set(newBudgetRef, {
      ...budget,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return id
  } catch (error) {
    console.error("Error creating budget:", error)
    throw error
  }
}

export const updateBudget = async (basePath: string, budgetId: string, updates: Partial<Budget>): Promise<void> => {
  try {
    const budgetRef = ref(db, `${basePath}/budgets/${budgetId}`)
    await update(budgetRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
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

export const addTransaction = async (basePath: string, transaction: Omit<Transaction, "id">): Promise<string> => {
  try {
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const newTransactionRef = push(transactionsRef)
    const id = newTransactionRef.key as string

    await set(newTransactionRef, {
      ...transaction,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return id
  } catch (error) {
    console.error("Error adding transaction:", error)
    throw error
  }
}

export const updateTransaction = async (basePath: string, transactionId: string, updates: Partial<Transaction>): Promise<void> => {
  try {
    const transactionRef = ref(db, `${basePath}/transactions/${transactionId}`)
    await update(transactionRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating transaction:", error)
    throw error
  }
}

export const deleteTransaction = async (basePath: string, transactionId: string): Promise<void> => {
  try {
    const transactionRef = ref(db, `${basePath}/transactions/${transactionId}`)
    await remove(transactionRef)
  } catch (error) {
    console.error("Error deleting transaction:", error)
    throw error
  }
}

// Journal Entries
export const fetchJournalEntries = async (basePath: string): Promise<JournalEntry[]> => {
  try {
    const entriesRef = ref(db, `${basePath}/journal_entries`)
    const snapshot = await get(entriesRef)

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

export const addJournalEntry = async (basePath: string, entry: Omit<JournalEntry, "id">): Promise<string> => {
  try {
    const entriesRef = ref(db, `${basePath}/journal_entries`)
    const newEntryRef = push(entriesRef)
    const id = newEntryRef.key as string

    await set(newEntryRef, {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return id
  } catch (error) {
    console.error("Error adding journal entry:", error)
    throw error
  }
}

export const updateJournalEntry = async (basePath: string, entryId: string, updates: Partial<JournalEntry>): Promise<void> => {
  try {
    const entryRef = ref(db, `${basePath}/journal_entries/${entryId}`)
    await update(entryRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating journal entry:", error)
    throw error
  }
}

export const deleteJournalEntry = async (basePath: string, entryId: string): Promise<void> => {
  try {
    const entryRef = ref(db, `${basePath}/journal_entries/${entryId}`)
    await remove(entryRef)
  } catch (error) {
    console.error("Error deleting journal entry:", error)
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

export const addExpense = async (basePath: string, expense: Omit<Expense, "id">): Promise<string> => {
  try {
    const expensesRef = ref(db, `${basePath}/expenses`)
    const newExpenseRef = push(expensesRef)
    const id = newExpenseRef.key as string

    await set(newExpenseRef, {
      ...expense,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return id
  } catch (error) {
    console.error("Error adding expense:", error)
    throw error
  }
}

export const updateExpense = async (basePath: string, expenseId: string, updates: Partial<Expense>): Promise<void> => {
  try {
    const expenseRef = ref(db, `${basePath}/expenses/${expenseId}`)
    await update(expenseRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
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

// Payroll functions from Payroll.tsx

// Fetch payroll records
export const fetchPayrollRecords = async (
  companyId: string,
  siteId: string,
  employeeId?: string,
): Promise<Payroll[]> => {
  try {
    const payrollsRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrolls`)
    const snapshot = await get(payrollsRef)

    if (snapshot.exists()) {
      let payrolls = Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))

      if (employeeId) {
        payrolls = payrolls.filter((payroll) => payroll.employeeId === employeeId)
      }

      return payrolls
    }
    return []
  } catch (error) {
    console.error("Error fetching payroll records:", error)
    throw error
  }
}

// Create a new payroll record
export const createPayrollRecord = async (
  companyId: string,
  siteId: string,
  payroll: Omit<Payroll, "id">,
): Promise<Payroll> => {
  try {
    const payrollsRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrolls`)
    const newPayrollRef = push(payrollsRef)
    const id = newPayrollRef.key!

    const newPayroll = {
      ...payroll,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newPayrollRef, newPayroll)
    return newPayroll
  } catch (error) {
    console.error("Error creating payroll record:", error)
    throw error
  }
}

// Update an existing payroll record
export const updatePayrollRecord = async (
  companyId: string,
  siteId: string,
  payrollId: string,
  payroll: Partial<Payroll>,
): Promise<void> => {
  try {
    const payrollRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrolls/${payrollId}`)

    const updates = {
      ...payroll,
      updatedAt: new Date().toISOString(),
    }

    await update(payrollRef, updates)
  } catch (error) {
    console.error("Error updating payroll record:", error)
    throw error
  }
}

// Delete a payroll record
export const deletePayrollRecord = async (companyId: string, siteId: string, payrollId: string): Promise<void> => {
  try {
    const payrollRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrolls/${payrollId}`)
    await remove(payrollRef)
  } catch (error) {
    console.error("Error deleting payroll record:", error)
    throw error
  }
}

// Fetch payroll periods
export const fetchPayrollPeriods = async (companyId: string, siteId: string): Promise<PayrollPeriod[]> => {
  try {
    const periodsRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrollPeriods`)
    const snapshot = await get(periodsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching payroll periods:", error)
    throw error
  }
}

// Create a new payroll period
export const createPayrollPeriod = async (
  companyId: string,
  siteId: string,
  period: Omit<PayrollPeriod, "id">,
): Promise<PayrollPeriod> => {
  try {
    const periodsRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrollPeriods`)
    const newPeriodRef = push(periodsRef)
    const id = newPeriodRef.key!

    const newPeriod = {
      ...period,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newPeriodRef, newPeriod)
    return newPeriod
  } catch (error) {
    console.error("Error creating payroll period:", error)
    throw error
  }
}

// Update an existing payroll period
export const updatePayrollPeriod = async (
  companyId: string,
  siteId: string,
  periodId: string,
  period: Partial<PayrollPeriod>,
): Promise<void> => {
  try {
    const periodRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrollPeriods/${periodId}`)

    const updates = {
      ...period,
      updatedAt: new Date().toISOString(),
    }

    await update(periodRef, updates)
  } catch (error) {
    console.error("Error updating payroll period:", error)
    throw error
  }
}

// Delete a payroll period
export const deletePayrollPeriod = async (companyId: string, siteId: string, periodId: string): Promise<void> => {
  try {
    const periodRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrollPeriods/${periodId}`)
    await remove(periodRef)
  } catch (error) {
    console.error("Error deleting payroll period:", error)
    throw error
  }
}

export class FinanceFunctions {
  // Calculate total cash across all bank accounts
  static calculateTotalCash(bankAccounts: BankAccount[]): number {
    return bankAccounts
      .filter((account) => account.status === "active")
      .reduce((total, account) => total + account.balance, 0)
  }

  // Calculate outstanding invoices
  static calculateOutstandingInvoices(invoices: Invoice[]): number {
    return invoices
      .filter((invoice) => invoice.status !== "paid")
      .reduce((total, invoice) => total + (invoice.totalAmount || 0), 0)
  }

  // Calculate upcoming bills
  static calculateUpcomingBills(bills: Bill[]): number {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    return bills
      .filter((bill) => {
        const dueDate = new Date(bill.dueDate)
        return bill.status !== "paid" && dueDate <= thirtyDaysFromNow
      })
      .reduce((total, bill) => total + (bill.totalAmount || 0), 0)
  }

  // Calculate monthly expenses
  static calculateMonthlyExpenses(expenses: Expense[]): number {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.submitDate)
        return (
          expenseDate.getMonth() === currentMonth &&
          expenseDate.getFullYear() === currentYear &&
          expense.status === "approved"
        )
      })
      .reduce((total, expense) => total + expense.amount, 0)
  }

  // Get overdue invoices
  static getOverdueInvoices(invoices: Invoice[]): Invoice[] {
    const today = new Date()
    return invoices.filter((invoice) => {
      const dueDate = new Date(invoice.dueDate)
      return invoice.status !== "paid" && dueDate < today
    })
  }

  // Get overdue bills
  static getOverdueBills(bills: Bill[]): Bill[] {
    const today = new Date()
    return bills.filter((bill) => {
      const dueDate = new Date(bill.dueDate)
      return bill.status !== "paid" && dueDate < today
    })
  }

  // Calculate profit and loss
  static calculateProfitLoss(transactions: Transaction[]): { revenue: number; expenses: number; profit: number } {
    const revenue = transactions
      .filter((t) => t.type === "sale" && t.status === "completed")
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0)

    const expenses = transactions
      .filter((t) => t.type === "purchase" && t.status === "completed")
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0)

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
    }
  }

  // Calculate budget performance
  static calculateBudgetPerformance(budgets: Budget[]): {
    totalBudgeted: number
    totalActual: number
    overBudgetCount: number
    performance: number
  } {
    const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.budgeted, 0)
    const totalActual = budgets.reduce((sum, budget) => sum + budget.actual, 0)
    const overBudgetCount = budgets.filter((budget) => budget.status === "over-budget").length
    const performance = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0

    return {
      totalBudgeted,
      totalActual,
      overBudgetCount,
      performance,
    }
  }

  // Convert currency
  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string, currencies: Currency[]): number {
    if (fromCurrency === toCurrency) return amount

    const fromRate = currencies.find((c) => c.code === fromCurrency)?.rate || 1
    const toRate = currencies.find((c) => c.code === toCurrency)?.rate || 1

    // Convert to base currency first, then to target currency
    const baseAmount = amount / fromRate
    return baseAmount * toRate
  }

  // Generate cash flow data for charts
  static generateCashFlowData(
    transactions: Transaction[],
    months = 6,
  ): Array<{
    month: string
    inflow: number
    outflow: number
    net: number
  }> {
    const data = []
    const today = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthName = date.toLocaleDateString("en-US", { month: "short" })

      const monthTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date)
        return (
          transactionDate.getMonth() === date.getMonth() &&
          transactionDate.getFullYear() === date.getFullYear() &&
          t.status === "completed"
        )
      })

      const inflow = monthTransactions
        .filter((t) => t.type === "sale")
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0)

      const outflow = monthTransactions
        .filter((t) => t.type === "purchase")
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0)

      data.push({
        month: monthName,
        inflow,
        outflow,
        net: inflow - outflow,
      })
    }

    return data
  }

  // Validate financial data
  static validateFinanceData(data: Partial<FinanceData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate transactions
    if (data.transactions) {
      data.transactions.forEach((transaction, index) => {
        if (!transaction.id || !transaction.description || (transaction.totalAmount || 0) <= 0) {
          errors.push(`Transaction ${index + 1}: Missing required fields or invalid amount`)
        }
      })
    }

    // Validate invoices
    if (data.invoices) {
      data.invoices.forEach((invoice, index) => {
        if (!invoice.id || !invoice.customerName || (invoice.totalAmount || 0) <= 0) {
          errors.push(`Invoice ${index + 1}: Missing required fields or invalid amount`)
        }
      })
    }

    // Validate bills
    if (data.bills) {
      data.bills.forEach((bill, index) => {
        if (!bill.id || !bill.supplierName || (bill.totalAmount || 0) <= 0) {
          errors.push(`Bill ${index + 1}: Missing required fields or invalid amount`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
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


// Reports
export const fetchReportData = async (
  basePath: string,
): Promise<{
  todaySales: number
  outstandingInvoices: number
  cashBalance: number
  monthlyExpenses: number
}> => {
  try {
    // Fetch invoices to calculate today's sales and outstanding invoices
    const invoicesRef = ref(db, `${basePath}/invoices`)
    const invoicesSnapshot = await get(invoicesRef)

    // Fetch bank accounts to calculate cash balance
    const bankAccountsRef = ref(db, `${basePath}/bankAccounts`)
    const bankAccountsSnapshot = await get(bankAccountsRef)

    // Fetch expenses to calculate monthly expenses
    const expensesRef = ref(db, `${basePath}/expenses`)
    const expensesSnapshot = await get(expensesRef)

    // Calculate today's sales
    let todaySales = 0
    if (invoicesSnapshot.exists()) {
      const today = new Date()
      const todayString = today.toISOString().split("T")[0] // YYYY-MM-DD

      const invoices = Object.values(invoicesSnapshot.val() || {})
      todaySales = invoices
        .filter((invoice: any) => {
          const invoiceDate = invoice.date?.split("T")[0]
          return invoiceDate === todayString && invoice.status === "paid"
        })
        .reduce((sum: number, invoice: any) => sum + (invoice.total || 0), 0)
    }

    // Calculate outstanding invoices
    let outstandingInvoices = 0
    if (invoicesSnapshot.exists()) {
      const invoices = Object.values(invoicesSnapshot.val() || {})
      outstandingInvoices = invoices
        .filter((invoice: any) => invoice.status === "pending" || invoice.status === "sent")
        .reduce((sum: number, invoice: any) => sum + (invoice.total || 0), 0)
    }

    // Calculate cash balance
    let cashBalance = 0
    if (bankAccountsSnapshot.exists()) {
      const bankAccounts = Object.values(bankAccountsSnapshot.val() || {})
      cashBalance = bankAccounts.reduce((sum: number, account: any) => sum + (account.balance || 0), 0)
    }

    // Calculate monthly expenses
    let monthlyExpenses = 0
    if (expensesSnapshot.exists()) {
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const expenses = Object.values(expensesSnapshot.val() || {})
      monthlyExpenses = expenses
        .filter((expense: any) => {
          if (!expense.date) return false
          const expenseDate = new Date(expense.date)
          return expenseDate >= firstDayOfMonth && expense.status === "approved"
        })
        .reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0)
    }

    return {
      todaySales,
      outstandingInvoices,
      cashBalance,
      monthlyExpenses,
    }
  } catch (error) {
    console.error("Error fetching report data:", error)
    throw error
  }
}




export const createTransaction = async (
  basePath: string,
  transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { entries: JournalEntry[] },
): Promise<Transaction> => {
  try {
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const newTransactionRef = push(transactionsRef)
    const id = newTransactionRef.key as string

    // Create entries with IDs
    const entries = transaction.entries.map((entry: any) => ({
      ...entry,
      id: uuidv4(),
      transactionId: id,
    }))

    const now = new Date().toISOString()
    const newTransaction: Transaction = {
      id,
      ...transaction,
      entries: entries,
      createdAt: now,
      updatedAt: now,
    }

    await set(newTransactionRef, newTransaction)

    // Update account balances
    await updateAccountBalances(basePath, entries)

    return newTransaction
  } catch (error) {
    console.error("Error creating transaction:", error)
    throw error
  }
}

// Helper function to update account balances
const updateAccountBalances = async (basePath: string, entries: JournalEntry[]): Promise<void> => {
  try {
    const accountsRef = ref(db, `${basePath}/accounts`)
    const accountsSnapshot = await get(accountsRef)

    if (!accountsSnapshot.exists()) {
      throw new Error("Accounts not found")
    }

    const accounts = accountsSnapshot.val()

    // Group entries by account
    const entriesByAccount: Record<string, { debit: number; credit: number }> = {}

    entries.forEach((entry) => {
      if (!entriesByAccount[entry.accountId]) {
        entriesByAccount[entry.accountId] = { debit: 0, credit: 0 }
      }
      entriesByAccount[entry.accountId].debit += entry.debit || 0
      entriesByAccount[entry.accountId].credit += entry.credit || 0
    })

    // Update each account
    const updates: Record<string, any> = {}

    for (const [accountId, amounts] of Object.entries(entriesByAccount)) {
      if (!accounts[accountId]) {
        throw new Error(`Account ${accountId} not found`)
      }

      const account = accounts[accountId]
      let balanceChange = 0

      // Calculate balance change based on account type
      if (
        [
          "asset",
          "expense",
          "accounts_receivable",
          "cash",
          "fixed_asset",
          "inventory",
          "other_current_asset",
          "other_asset",
          "cost_of_goods_sold",
        ].includes(account.type)
      ) {
        // Debit increases, credit decreases
        balanceChange = amounts.debit - amounts.credit
      } else {
        // Credit increases, debit decreases for liability, equity, revenue
        balanceChange = amounts.credit - amounts.debit
      }

      updates[`${accountId}/balance`] = account.balance + balanceChange
      updates[`${accountId}/updatedAt`] = new Date().toISOString()
    }

    // Apply all updates at once
    if (Object.keys(updates).length > 0) {
      await update(accountsRef, updates)
    }
  } catch (error) {
    console.error("Error updating account balances:", error)
    throw error
  }
}

// Generate Chart of Accounts
export const generateDefaultChartOfAccounts = async (basePath: string): Promise<void> => {
  try {
    const accountsRef = ref(db, `${basePath}/accounts`)

    // Check if accounts already exist
    const snapshot = await get(accountsRef)
    if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
      return // Don't overwrite existing accounts
    }

    // Default chart of accounts
    const defaultAccounts: Omit<Account, "id">[] = [
      // Asset accounts
      {
        code: "1000",
        name: "Cash",
        type: "asset",
        subType: "current_asset",
        description: "Cash on hand",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        code: "1100",
        name: "Accounts Receivable",
        type: "asset",
        subType: "current_asset",
        description: "Money owed by customers",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        code: "1200",
        name: "Inventory",
        type: "asset",
        subType: "current_asset",
        description: "Goods for sale",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Liability accounts
      {
        code: "2000",
        name: "Accounts Payable",
        type: "liability",
        subType: "current_liability",
        description: "Money owed to suppliers",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        code: "2100",
        name: "Tax Payable",
        type: "liability",
        subType: "current_liability",
        description: "Tax owed to government",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Equity accounts
      {
        code: "3000",
        name: "Owner's Equity",
        type: "equity",
        subType: "equity",
        description: "Owner's investment",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        code: "3100",
        name: "Retained Earnings",
        type: "equity",
        subType: "equity",
        description: "Accumulated earnings",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Revenue accounts
      {
        code: "4000",
        name: "Sales Revenue",
        type: "revenue",
        subType: "revenue",
        description: "Income from sales",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Expense accounts
      {
        code: "5000",
        name: "Cost of Goods Sold",
        type: "expense",
        subType: "cost_of_goods_sold",
        description: "Direct costs of goods sold",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        code: "6000",
        name: "Rent Expense",
        type: "expense",
        subType: "expense",
        description: "Rent payments",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        code: "6100",
        name: "Utilities Expense",
        type: "expense",
        subType: "expense",
        description: "Utility payments",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        code: "6200",
        name: "Salaries Expense",
        type: "expense",
        subType: "expense",
        description: "Employee salaries",
        balance: 0,
        isArchived: false,
        isSystemAccount: true,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    // Create each account
    for (const account of defaultAccounts) {
      await createAccount(basePath, account)
    }
  } catch (error) {
    console.error("Error generating default chart of accounts:", error)
    throw error
  }
}

// Rename addExpense to createExpense for consistency
export const createExpense = async (basePath: string, expense: Omit<Expense, "id">): Promise<string> => {
  try {
    const expensesRef = ref(db, `${basePath}/expenses`)
    const newExpenseRef = push(expensesRef)
    await set(newExpenseRef, {
      ...expense,
      id: newExpenseRef.key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return newExpenseRef.key as string
  } catch (error) {
    console.error("Error creating expense:", error)
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

export const createInvoice = async (basePath: string, invoice: any): Promise<void> => {
  try {
    const invoicesRef = ref(db, `${basePath}/invoices`)
    const newInvoiceRef = push(invoicesRef)
    await set(newInvoiceRef, {
      ...invoice,
      id: newInvoiceRef.key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error creating invoice:", error)
    throw error
  }
}

export const updateInvoice = async (basePath: string, invoice: any): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoice.id}`)
    await update(invoiceRef, {
      ...invoice,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating invoice:", error)
    throw error
  }
}
