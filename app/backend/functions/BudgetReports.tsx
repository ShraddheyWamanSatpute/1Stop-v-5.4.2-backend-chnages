import { ref, get, query, orderByChild, startAt, endAt } from "firebase/database"
import { db } from "../services/Firebase"
import type { Budget, BudgetLine, BudgetVsActual, Transaction, Account } from "../interfaces/Finance"

/**
 * Generate Budget vs Actual report
 * Compares budgeted amounts with actual transactions
 */
export const generateBudgetVsActual = async (
  basePath: string,
  budgetId: string,
  period?: string
): Promise<BudgetVsActual[]> => {
  try {
    // Fetch budget
    const budgetRef = ref(db, `${basePath}/budgets/${budgetId}`)
    const budgetSnapshot = await get(budgetRef)
    
    if (!budgetSnapshot.exists()) {
      throw new Error("Budget not found")
    }

    const budget = budgetSnapshot.val() as Budget
    const budgetLines = budget.budget_lines || []

    // Fetch transactions for the budget period
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionsSnapshot = await get(transactionsRef)
    
    const transactions: Transaction[] = []
    if (transactionsSnapshot.exists()) {
      const allTransactions = transactionsSnapshot.val()
      Object.values(allTransactions).forEach((txn: any) => {
        const txnDate = new Date(txn.date)
        const periodStart = new Date(budget.period_start)
        const periodEnd = new Date(budget.period_end)
        
        if (txnDate >= periodStart && txnDate <= periodEnd) {
          transactions.push(txn as Transaction)
        }
      })
    }

    // Fetch accounts for account names
    const accountsRef = ref(db, `${basePath}/accounts`)
    const accountsSnapshot = await get(accountsRef)
    const accounts: Record<string, Account> = {}
    if (accountsSnapshot.exists()) {
      Object.values(accountsSnapshot.val()).forEach((acc: any) => {
        accounts[acc.id] = acc as Account
      })
    }

    // Calculate actual amounts per account and period
    const actualsByAccount: Record<string, Record<string, number>> = {}
    
    transactions.forEach((txn) => {
      txn.entries.forEach((entry) => {
        const accountId = entry.accountId
        const txnPeriod = getPeriodFromDate(txn.date, budget.period_type)
        
        if (!actualsByAccount[accountId]) {
          actualsByAccount[accountId] = {}
        }
        
        if (!actualsByAccount[accountId][txnPeriod]) {
          actualsByAccount[accountId][txnPeriod] = 0
        }
        
        // Sum debits (expenses) and subtract credits (income)
        if (entry.type === "debit" || entry.debit) {
          actualsByAccount[accountId][txnPeriod] += entry.amount || entry.debit || 0
        } else if (entry.type === "credit" || entry.credit) {
          actualsByAccount[accountId][txnPeriod] -= entry.amount || entry.credit || 0
        }
      })
    })

    // Build report
    const report: BudgetVsActual[] = []
    
    budgetLines.forEach((line) => {
      const account = accounts[line.account_id]
      const actualAmount = actualsByAccount[line.account_id]?.[line.period] || 0
      const budgetedAmount = line.amount
      const variance = actualAmount - budgetedAmount
      const variancePercentage = budgetedAmount !== 0 
        ? (variance / budgetedAmount) * 100 
        : 0

      report.push({
        budget_id: budgetId,
        budget_name: budget.name,
        period: line.period,
        account_id: line.account_id,
        account_code: line.account_code || account?.code || "",
        account_name: line.account_name || account?.name || "",
        budgeted_amount: budgetedAmount,
        actual_amount: actualAmount,
        variance,
        variance_percentage: variancePercentage,
        dimension_ids: line.dimension_ids,
      })
    })

    // Filter by period if specified
    if (period) {
      return report.filter((r) => r.period === period)
    }

    return report.sort((a, b) => {
      // Sort by period, then by account code
      if (a.period !== b.period) {
        return a.period.localeCompare(b.period)
      }
      return a.account_code.localeCompare(b.account_code)
    })
  } catch (error) {
    console.error("Error generating budget vs actual report:", error)
    throw error
  }
}

/**
 * Get period string from date based on period type
 */
function getPeriodFromDate(date: string, periodType: Budget["period_type"]): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const quarter = Math.floor(month / 3) + 1

  switch (periodType) {
    case "monthly":
      return `${year}-${String(month).padStart(2, "0")}`
    case "quarterly":
      return `${year}-Q${quarter}`
    case "yearly":
      return String(year)
    case "rolling":
      // For rolling budgets, use monthly periods
      return `${year}-${String(month).padStart(2, "0")}`
    default:
      return `${year}-${String(month).padStart(2, "0")}`
  }
}

/**
 * Create a revised budget from an existing budget
 */
export const createRevisedBudget = async (
  basePath: string,
  originalBudgetId: string,
  newName: string,
  updates: Partial<Budget>
): Promise<Budget> => {
  try {
    // Fetch original budget
    const originalBudgetRef = ref(db, `${basePath}/budgets/${originalBudgetId}`)
    const originalBudgetSnapshot = await get(originalBudgetRef)
    
    if (!originalBudgetSnapshot.exists()) {
      throw new Error("Original budget not found")
    }

    const originalBudget = originalBudgetSnapshot.val() as Budget

    // Create new budget with incremented version
    const { createBudget } = await import("../data/Finance")
    
    const revisedBudget: Omit<Budget, "id"> = {
      ...originalBudget,
      ...updates,
      name: newName,
      version: originalBudget.version + 1,
      parent_budget_id: originalBudgetId,
      is_active: true,
      budget_lines: updates.budget_lines || originalBudget.budget_lines || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Deactivate original budget
    const { updateBudget } = await import("../data/Finance")
    await updateBudget(basePath, originalBudgetId, {
      is_active: false,
      updated_at: new Date().toISOString(),
    })

    return await createBudget(basePath, revisedBudget)
  } catch (error) {
    console.error("Error creating revised budget:", error)
    throw error
  }
}
