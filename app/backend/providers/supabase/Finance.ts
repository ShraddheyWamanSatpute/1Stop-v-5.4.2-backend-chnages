// Manual Supabase implementation for the Finance module.
import * as firebaseProvider from "../../rtdatabase/Finance"
import type { Account, Bill, Budget, Contact, Transaction } from "../../interfaces/Finance"
import { authedDataFetch } from "./http"
import {
  approveJournalShared,
  createDimensionShared,
  createJournalShared,
  createOpeningBalanceShared,
  createPeriodLockShared,
  deleteDimensionShared,
  deleteJournalShared,
  deleteOpeningBalanceShared,
  deletePeriodLockShared,
  fetchDimensionsShared,
  fetchJournalsShared,
  fetchOpeningBalancesShared,
  fetchPeriodLocksShared,
  postJournalShared,
  reverseJournalShared,
  updateDimensionShared,
  updateJournalShared,
  updateOpeningBalanceShared,
  updatePeriodLockShared,
} from "./financeJournalShared"

export * from "../../rtdatabase/Finance"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

export const fetchAccounts: typeof firebaseProvider.fetchAccounts = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/accounts${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Account[]
}

export const createAccount: typeof firebaseProvider.createAccount = async (basePath: string, account) => {
  const result = await authedDataFetch(`/finance/accounts`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: account }),
  })
  return (result?.row || { ...account, id: String(result?.id || "") }) as Account
}

export const updateAccount: typeof firebaseProvider.updateAccount = async (basePath: string, accountId: string, updates) => {
  await authedDataFetch(`/finance/accounts/${encodeURIComponent(accountId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteAccount: typeof firebaseProvider.deleteAccount = async (basePath: string, accountId: string) => {
  await authedDataFetch(`/finance/accounts/${encodeURIComponent(accountId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchTransactions: typeof firebaseProvider.fetchTransactions = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/transactions${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Transaction[]
}

export const createTransaction: typeof firebaseProvider.createTransaction = async (basePath: string, transaction) => {
  const result = await authedDataFetch(`/finance/transactions`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: transaction }),
  })
  return (result?.row || { ...transaction, id: String(result?.id || "") }) as Transaction
}

export const fetchBills: typeof firebaseProvider.fetchBills = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/bills${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Bill[]
}

export const createBill: typeof firebaseProvider.createBill = async (basePath: string, bill) => {
  const result = await authedDataFetch(`/finance/bills`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: bill }),
  })
  return (result?.row || { ...bill, id: String(result?.id || "") }) as Bill
}

export const updateBill: typeof firebaseProvider.updateBill = async (basePath: string, billId: string, updates) => {
  await authedDataFetch(`/finance/bills/${encodeURIComponent(billId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteBill: typeof firebaseProvider.deleteBill = async (basePath: string, billId: string) => {
  await authedDataFetch(`/finance/bills/${encodeURIComponent(billId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchContacts: typeof firebaseProvider.fetchContacts = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/contacts${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Contact[]
}

export const createContact: typeof firebaseProvider.createContact = async (basePath: string, contact) => {
  const result = await authedDataFetch(`/finance/contacts`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: contact }),
  })
  return (result?.row || { ...contact, id: String(result?.id || "") }) as Contact
}

export const updateContact: typeof firebaseProvider.updateContact = async (
  basePath: string,
  contactId: string,
  updates,
) => {
  await authedDataFetch(`/finance/contacts/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteContact: typeof firebaseProvider.deleteContact = async (basePath: string, contactId: string) => {
  await authedDataFetch(`/finance/contacts/${encodeURIComponent(contactId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchBudgets: typeof firebaseProvider.fetchBudgets = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/budgets${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Budget[]
}

export const createBudget: typeof firebaseProvider.createBudget = async (basePath: string, budget) => {
  const result = await authedDataFetch(`/finance/budgets`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: budget }),
  })
  return (result?.row || { ...budget, id: String(result?.id || "") }) as Budget
}

export const updateBudget: typeof firebaseProvider.updateBudget = async (basePath: string, budgetId: string, updates) => {
  await authedDataFetch(`/finance/budgets/${encodeURIComponent(budgetId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteBudget: typeof firebaseProvider.deleteBudget = async (basePath: string, budgetId: string) => {
  await authedDataFetch(`/finance/budgets/${encodeURIComponent(budgetId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchJournals: typeof firebaseProvider.fetchJournals = fetchJournalsShared

export const createJournal: typeof firebaseProvider.createJournal = createJournalShared as typeof firebaseProvider.createJournal

export const updateJournal: typeof firebaseProvider.updateJournal = updateJournalShared

export const deleteJournal: typeof firebaseProvider.deleteJournal = deleteJournalShared

export const approveJournal: typeof firebaseProvider.approveJournal = approveJournalShared

export const postJournal: typeof firebaseProvider.postJournal = postJournalShared

export const reverseJournal: typeof firebaseProvider.reverseJournal = reverseJournalShared as typeof firebaseProvider.reverseJournal

export const fetchDimensions: typeof firebaseProvider.fetchDimensions = fetchDimensionsShared

export const createDimension: typeof firebaseProvider.createDimension = createDimensionShared as typeof firebaseProvider.createDimension

export const updateDimension: typeof firebaseProvider.updateDimension = updateDimensionShared

export const deleteDimension: typeof firebaseProvider.deleteDimension = deleteDimensionShared

export const fetchPeriodLocks: typeof firebaseProvider.fetchPeriodLocks = fetchPeriodLocksShared

export const createPeriodLock: typeof firebaseProvider.createPeriodLock = createPeriodLockShared as typeof firebaseProvider.createPeriodLock

export const updatePeriodLock: typeof firebaseProvider.updatePeriodLock = updatePeriodLockShared

export const deletePeriodLock: typeof firebaseProvider.deletePeriodLock = deletePeriodLockShared

export const fetchOpeningBalances: typeof firebaseProvider.fetchOpeningBalances = fetchOpeningBalancesShared

export const createOpeningBalance: typeof firebaseProvider.createOpeningBalance =
  createOpeningBalanceShared as typeof firebaseProvider.createOpeningBalance

export const updateOpeningBalance: typeof firebaseProvider.updateOpeningBalance = updateOpeningBalanceShared

export const deleteOpeningBalance: typeof firebaseProvider.deleteOpeningBalance = deleteOpeningBalanceShared

// ===== FINANCE SETTINGS & INTEGRATIONS =====

export const fetchFinanceSettings: typeof firebaseProvider.fetchFinanceSettings = async (path: string) => {
  const result = await authedDataFetch(`/finance/settings${query({ path })}`, { method: "GET" })
  return result || null
}

export const saveFinanceSettings: typeof firebaseProvider.saveFinanceSettings = async (path: string, settings: any) => {
  const clean = Object.fromEntries(Object.entries(settings || {}).filter(([, v]) => v !== undefined))
  await authedDataFetch(`/finance/settings`, {
    method: "PUT",
    body: JSON.stringify({ path, settings: { ...clean, updatedAt: Date.now() } }),
  })
}

export const fetchFinanceIntegrations: typeof firebaseProvider.fetchFinanceIntegrations = async (path: string) => {
  const result = await authedDataFetch(`/finance/integrations${query({ path })}`, { method: "GET" })
  return result || {}
}

export const saveFinanceIntegration: typeof firebaseProvider.saveFinanceIntegration = async (path: string, integration: any) => {
  if (!path || !integration?.id) return
  const clean = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
  await authedDataFetch(`/finance/integrations/${encodeURIComponent(integration.id)}`, {
    method: "PUT",
    body: JSON.stringify({ path, integration: clean }),
  })
}
