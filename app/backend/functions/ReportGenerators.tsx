import { ref, get, query, orderByChild, startAt, endAt } from "firebase/database"
import { db } from "../services/Firebase"
import type { 
  Account, 
  Transaction, 
  Invoice, 
  Bill, 
  Contact,
  Budget,
  BudgetVsActual,
  Journal,
  Dimension
} from "../interfaces/Finance"

/**
 * Generate Profit & Loss Report
 */
export const generateProfitLoss = async (
  basePath: string,
  startDate: string,
  endDate: string,
  dimensionIds?: Record<string, string>
): Promise<any> => {
  try {
    // Fetch accounts
    const accountsRef = ref(db, `${basePath}/accounts`)
    const accountsSnapshot = await get(accountsRef)
    const accounts: Account[] = []
    if (accountsSnapshot.exists()) {
      Object.values(accountsSnapshot.val()).forEach((acc: any) => {
        accounts.push(acc as Account)
      })
    }

    // Fetch transactions
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionsSnapshot = await get(transactionsRef)
    const transactions: Transaction[] = []
    if (transactionsSnapshot.exists()) {
      Object.values(transactionsSnapshot.val()).forEach((txn: any) => {
        const txnDate = new Date(txn.date)
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (txnDate >= start && txnDate <= end) {
          transactions.push(txn as Transaction)
        }
      })
    }

    // Calculate balances by account
    const accountBalances: Record<string, { debit: number; credit: number; balance: number }> = {}
    
    transactions.forEach((txn) => {
      txn.entries.forEach((entry) => {
        const accountId = entry.accountId
        
        // Filter by dimensions if provided
        if (dimensionIds && entry.dimensionIds) {
          const matches = Object.keys(dimensionIds).every(
            (key) => entry.dimensionIds?.[key] === dimensionIds[key]
          )
          if (!matches) return
        }

        if (!accountBalances[accountId]) {
          accountBalances[accountId] = { debit: 0, credit: 0, balance: 0 }
        }
        
        accountBalances[accountId].debit += entry.debit || 0
        accountBalances[accountId].credit += entry.credit || 0
      })
    })

    // Categorize accounts
    const revenueAccounts = accounts.filter((a) => a.type === "revenue" || a.subType === "revenue")
    const expenseAccounts = accounts.filter((a) => a.type === "expense" || a.subType === "expense")
    const costOfSalesAccounts = accounts.filter((a) => a.subType === "cost_of_sales")

    // Calculate totals
    const revenue = revenueAccounts.reduce((sum, acc) => {
      const balance = accountBalances[acc.id] || { credit: 0 }
      return sum + balance.credit
    }, 0)

    const costOfSales = costOfSalesAccounts.reduce((sum, acc) => {
      const balance = accountBalances[acc.id] || { debit: 0 }
      return sum + balance.debit
    }, 0)

    const expenses = expenseAccounts.reduce((sum, acc) => {
      const balance = accountBalances[acc.id] || { debit: 0 }
      return sum + balance.debit
    }, 0)

    const grossProfit = revenue - costOfSales
    const netProfit = grossProfit - expenses

    return {
      period: { startDate, endDate },
      revenue: {
        total: revenue,
        accounts: revenueAccounts.map((acc) => ({
          account: acc,
          amount: accountBalances[acc.id]?.credit || 0,
        })),
      },
      costOfSales: {
        total: costOfSales,
        accounts: costOfSalesAccounts.map((acc) => ({
          account: acc,
          amount: accountBalances[acc.id]?.debit || 0,
        })),
      },
      expenses: {
        total: expenses,
        accounts: expenseAccounts.map((acc) => ({
          account: acc,
          amount: accountBalances[acc.id]?.debit || 0,
        })),
      },
      grossProfit,
      netProfit,
      dimensionIds,
    }
  } catch (error) {
    console.error("Error generating profit & loss report:", error)
    throw error
  }
}

/**
 * Generate Balance Sheet Report
 */
export const generateBalanceSheet = async (
  basePath: string,
  asOfDate: string,
  dimensionIds?: Record<string, string>
): Promise<any> => {
  try {
    // Fetch accounts
    const accountsRef = ref(db, `${basePath}/accounts`)
    const accountsSnapshot = await get(accountsRef)
    const accounts: Account[] = []
    if (accountsSnapshot.exists()) {
      Object.values(accountsSnapshot.val()).forEach((acc: any) => {
        accounts.push(acc as Account)
      })
    }

    // Fetch transactions up to asOfDate
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionsSnapshot = await get(transactionsRef)
    const transactions: Transaction[] = []
    if (transactionsSnapshot.exists()) {
      Object.values(transactionsSnapshot.val()).forEach((txn: any) => {
        const txnDate = new Date(txn.date)
        const asOf = new Date(asOfDate)
        if (txnDate <= asOf) {
          transactions.push(txn as Transaction)
        }
      })
    }

    // Calculate balances
    const accountBalances: Record<string, { debit: number; credit: number; balance: number }> = {}
    
    transactions.forEach((txn) => {
      txn.entries.forEach((entry) => {
        const accountId = entry.accountId
        
        if (dimensionIds && entry.dimensionIds) {
          const matches = Object.keys(dimensionIds).every(
            (key) => entry.dimensionIds?.[key] === dimensionIds[key]
          )
          if (!matches) return
        }

        if (!accountBalances[accountId]) {
          accountBalances[accountId] = { debit: 0, credit: 0, balance: 0 }
        }
        
        accountBalances[accountId].debit += entry.debit || 0
        accountBalances[accountId].credit += entry.credit || 0
      })
    })

    // Calculate balance (debit - credit for asset/expense, credit - debit for liability/equity/revenue)
    accounts.forEach((acc) => {
      const balances = accountBalances[acc.id] || { debit: 0, credit: 0 }
      if (acc.type === "asset" || acc.type === "expense") {
        accountBalances[acc.id] = {
          ...balances,
          balance: balances.debit - balances.credit,
        }
      } else {
        accountBalances[acc.id] = {
          ...balances,
          balance: balances.credit - balances.debit,
        }
      }
    })

    // Categorize accounts
    const assets = accounts.filter((a) => a.type === "asset")
    const liabilities = accounts.filter((a) => a.type === "liability")
    const equity = accounts.filter((a) => a.type === "equity")

    const totalAssets = assets.reduce((sum, acc) => sum + (accountBalances[acc.id]?.balance || 0), 0)
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + (accountBalances[acc.id]?.balance || 0), 0)
    const totalEquity = equity.reduce((sum, acc) => sum + (accountBalances[acc.id]?.balance || 0), 0)

    return {
      asOfDate,
      assets: {
        total: totalAssets,
        accounts: assets.map((acc) => ({
          account: acc,
          balance: accountBalances[acc.id]?.balance || 0,
        })),
      },
      liabilities: {
        total: totalLiabilities,
        accounts: liabilities.map((acc) => ({
          account: acc,
          balance: accountBalances[acc.id]?.balance || 0,
        })),
      },
      equity: {
        total: totalEquity,
        accounts: equity.map((acc) => ({
          account: acc,
          balance: accountBalances[acc.id]?.balance || 0,
        })),
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      dimensionIds,
    }
  } catch (error) {
    console.error("Error generating balance sheet:", error)
    throw error
  }
}

/**
 * Generate Cash Flow Statement
 */
export const generateCashFlow = async (
  basePath: string,
  startDate: string,
  endDate: string
): Promise<any> => {
  try {
    // Fetch bank accounts
    const bankAccountsRef = ref(db, `${basePath}/bank_accounts`)
    const bankAccountsSnapshot = await get(bankAccountsRef)
    const bankAccounts: any[] = []
    if (bankAccountsSnapshot.exists()) {
      Object.values(bankAccountsSnapshot.val()).forEach((acc: any) => {
        bankAccounts.push(acc)
      })
    }

    // Fetch transactions
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionsSnapshot = await get(transactionsRef)
    const transactions: Transaction[] = []
    if (transactionsSnapshot.exists()) {
      Object.values(transactionsSnapshot.val()).forEach((txn: any) => {
        const txnDate = new Date(txn.date)
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (txnDate >= start && txnDate <= end && txn.bankAccountId) {
          transactions.push(txn as Transaction)
        }
      })
    }

    // Calculate cash flows
    let operatingCashFlow = 0
    let investingCashFlow = 0
    let financingCashFlow = 0

    transactions.forEach((txn) => {
      if (txn.type === "payment" || txn.type === "receipt") {
        operatingCashFlow += txn.totalAmount * (txn.type === "receipt" ? 1 : -1)
      } else if (txn.type === "transfer") {
        // Determine if investing or financing based on accounts
        investingCashFlow += txn.totalAmount * -1
      }
    })

    // Opening balance (from previous period)
    const openingBalance = bankAccounts.reduce((sum, acc) => sum + (acc.opening_balance || 0), 0)

    // Closing balance
    const closingBalance = openingBalance + operatingCashFlow + investingCashFlow + financingCashFlow

    return {
      period: { startDate, endDate },
      openingBalance,
      operatingActivities: {
        total: operatingCashFlow,
        transactions: transactions.filter((t) => t.type === "payment" || t.type === "receipt"),
      },
      investingActivities: {
        total: investingCashFlow,
        transactions: transactions.filter((t) => t.type === "transfer"),
      },
      financingActivities: {
        total: financingCashFlow,
        transactions: [],
      },
      closingBalance,
    }
  } catch (error) {
    console.error("Error generating cash flow statement:", error)
    throw error
  }
}

/**
 * Generate Trial Balance
 */
export const generateTrialBalance = async (
  basePath: string,
  asOfDate: string
): Promise<any> => {
  try {
    // Fetch accounts
    const accountsRef = ref(db, `${basePath}/accounts`)
    const accountsSnapshot = await get(accountsRef)
    const accounts: Account[] = []
    if (accountsSnapshot.exists()) {
      Object.values(accountsSnapshot.val()).forEach((acc: any) => {
        accounts.push(acc as Account)
      })
    }

    // Fetch transactions
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionsSnapshot = await get(transactionsRef)
    const transactions: Transaction[] = []
    if (transactionsSnapshot.exists()) {
      Object.values(transactionsSnapshot.val()).forEach((txn: any) => {
        const txnDate = new Date(txn.date)
        const asOf = new Date(asOfDate)
        if (txnDate <= asOf) {
          transactions.push(txn as Transaction)
        }
      })
    }

    // Calculate balances
    const accountBalances: Record<string, { debit: number; credit: number }> = {}
    
    transactions.forEach((txn) => {
      txn.entries.forEach((entry) => {
        const accountId = entry.accountId
        if (!accountBalances[accountId]) {
          accountBalances[accountId] = { debit: 0, credit: 0 }
        }
        accountBalances[accountId].debit += entry.debit || 0
        accountBalances[accountId].credit += entry.credit || 0
      })
    })

    const trialBalance = accounts.map((acc) => {
      const balances = accountBalances[acc.id] || { debit: 0, credit: 0 }
      return {
        account: acc,
        debit: balances.debit,
        credit: balances.credit,
      }
    })

    const totalDebits = trialBalance.reduce((sum, item) => sum + item.debit, 0)
    const totalCredits = trialBalance.reduce((sum, item) => sum + item.credit, 0)

    return {
      asOfDate,
      accounts: trialBalance,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    }
  } catch (error) {
    console.error("Error generating trial balance:", error)
    throw error
  }
}

/**
 * Generate General Ledger
 */
export const generateGeneralLedger = async (
  basePath: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<any> => {
  try {
    // Fetch account
    const accountRef = ref(db, `${basePath}/accounts/${accountId}`)
    const accountSnapshot = await get(accountRef)
    if (!accountSnapshot.exists()) {
      throw new Error("Account not found")
    }
    const account = accountSnapshot.val() as Account

    // Fetch transactions
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionsSnapshot = await get(transactionsRef)
    const transactions: Transaction[] = []
    if (transactionsSnapshot.exists()) {
      Object.values(transactionsSnapshot.val()).forEach((txn: any) => {
        const txnDate = new Date(txn.date)
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (txnDate >= start && txnDate <= end) {
          const hasAccountEntry = txn.entries?.some((e: any) => e.accountId === accountId)
          if (hasAccountEntry) {
            transactions.push(txn as Transaction)
          }
        }
      })
    }

    // Build ledger entries
    let runningBalance = 0
    const entries = transactions.map((txn) => {
      const entry = txn.entries.find((e) => e.accountId === accountId)
      if (!entry) return null

      const debit = entry.debit || 0
      const credit = entry.credit || 0
      
      if (account.type === "asset" || account.type === "expense") {
        runningBalance += debit - credit
      } else {
        runningBalance += credit - debit
      }

      return {
        date: txn.date,
        transactionNumber: txn.transactionNumber,
        description: entry.description || txn.description,
        reference: txn.reference,
        debit,
        credit,
        balance: runningBalance,
      }
    }).filter((e) => e !== null)

    return {
      account,
      period: { startDate, endDate },
      entries,
      openingBalance: 0, // Would need to calculate from previous period
      closingBalance: runningBalance,
    }
  } catch (error) {
    console.error("Error generating general ledger:", error)
    throw error
  }
}

/**
 * Generate AR Aging Report
 */
export const generateARAging = async (
  basePath: string,
  asOfDate: string
): Promise<any> => {
  try {
    // Fetch invoices
    const invoicesRef = ref(db, `${basePath}/invoices`)
    const invoicesSnapshot = await get(invoicesRef)
    const invoices: Invoice[] = []
    if (invoicesSnapshot.exists()) {
      Object.values(invoicesSnapshot.val()).forEach((inv: any) => {
        if (inv.status !== "paid" && inv.status !== "void") {
          invoices.push(inv as Invoice)
        }
      })
    }

    const asOf = new Date(asOfDate)
    const agingBuckets = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      daysOver90: 0,
    }

    const agedInvoices = invoices.map((inv) => {
      const dueDate = new Date(inv.dueDate || inv.issueDate)
      const daysPastDue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const balance = inv.balance_due || inv.balanceDue || inv.totalAmount

      let bucket: keyof typeof agingBuckets = "current"
      if (daysPastDue <= 0) {
        bucket = "current"
        agingBuckets.current += balance
      } else if (daysPastDue <= 30) {
        bucket = "days30"
        agingBuckets.days30 += balance
      } else if (daysPastDue <= 60) {
        bucket = "days60"
        agingBuckets.days60 += balance
      } else if (daysPastDue <= 90) {
        bucket = "days90"
        agingBuckets.days90 += balance
      } else {
        bucket = "daysOver90"
        agingBuckets.daysOver90 += balance
      }

      return {
        invoice: inv,
        daysPastDue,
        balance,
        bucket,
      }
    })

    return {
      asOfDate,
      totalOutstanding: agingBuckets.current + agingBuckets.days30 + agingBuckets.days60 + agingBuckets.days90 + agingBuckets.daysOver90,
      agingBuckets,
      invoices: agedInvoices,
    }
  } catch (error) {
    console.error("Error generating AR aging report:", error)
    throw error
  }
}

/**
 * Generate AP Aging Report
 */
export const generateAPAging = async (
  basePath: string,
  asOfDate: string
): Promise<any> => {
  try {
    // Fetch bills
    const billsRef = ref(db, `${basePath}/bills`)
    const billsSnapshot = await get(billsRef)
    const bills: Bill[] = []
    if (billsSnapshot.exists()) {
      Object.values(billsSnapshot.val()).forEach((bill: any) => {
        if (bill.status !== "paid" && bill.status !== "void") {
          bills.push(bill as Bill)
        }
      })
    }

    const asOf = new Date(asOfDate)
    const agingBuckets = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      daysOver90: 0,
    }

    const agedBills = bills.map((bill) => {
      const dueDate = new Date(bill.dueDate)
      const daysPastDue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const balance = bill.balance_due || bill.balanceDue || bill.totalAmount

      let bucket: keyof typeof agingBuckets = "current"
      if (daysPastDue <= 0) {
        bucket = "current"
        agingBuckets.current += balance
      } else if (daysPastDue <= 30) {
        bucket = "days30"
        agingBuckets.days30 += balance
      } else if (daysPastDue <= 60) {
        bucket = "days60"
        agingBuckets.days60 += balance
      } else if (daysPastDue <= 90) {
        bucket = "days90"
        agingBuckets.days90 += balance
      } else {
        bucket = "daysOver90"
        agingBuckets.daysOver90 += balance
      }

      return {
        bill,
        daysPastDue,
        balance,
        bucket,
      }
    })

    return {
      asOfDate,
      totalOutstanding: agingBuckets.current + agingBuckets.days30 + agingBuckets.days60 + agingBuckets.days90 + agingBuckets.daysOver90,
      agingBuckets,
      bills: agedBills,
    }
  } catch (error) {
    console.error("Error generating AP aging report:", error)
    throw error
  }
}

/**
 * Generate Tax Report
 */
export const generateTaxReport = async (
  basePath: string,
  startDate: string,
  endDate: string,
  taxRateId?: string
): Promise<any> => {
  try {
    // Fetch tax rates
    const taxRatesRef = ref(db, `${basePath}/taxRates`)
    const taxRatesSnapshot = await get(taxRatesRef)
    const taxRates: any[] = []
    if (taxRatesSnapshot.exists()) {
      Object.values(taxRatesSnapshot.val()).forEach((tr: any) => {
        taxRates.push(tr)
      })
    }

    // Fetch invoices (output tax)
    const invoicesRef = ref(db, `${basePath}/invoices`)
    const invoicesSnapshot = await get(invoicesRef)
    const invoices: Invoice[] = []
    if (invoicesSnapshot.exists()) {
      Object.values(invoicesSnapshot.val()).forEach((inv: any) => {
        const invDate = new Date(inv.issueDate)
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (invDate >= start && invDate <= end) {
          invoices.push(inv as Invoice)
        }
      })
    }

    // Fetch bills (input tax)
    const billsRef = ref(db, `${basePath}/bills`)
    const billsSnapshot = await get(billsRef)
    const bills: Bill[] = []
    if (billsSnapshot.exists()) {
      Object.values(billsSnapshot.val()).forEach((bill: any) => {
        const billDate = new Date(bill.date)
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (billDate >= start && billDate <= end) {
          bills.push(bill as Bill)
        }
      })
    }

    // Calculate tax by rate
    const taxByRate: Record<string, { output: number; input: number; net: number }> = {}

    invoices.forEach((inv) => {
      const rateId = inv.taxRateId || "standard"
      if (!taxByRate[rateId]) {
        taxByRate[rateId] = { output: 0, input: 0, net: 0 }
      }
      taxByRate[rateId].output += inv.taxAmount || 0
    })

    bills.forEach((bill) => {
      const rateId = bill.taxRateId || "standard"
      if (!taxByRate[rateId]) {
        taxByRate[rateId] = { output: 0, input: 0, net: 0 }
      }
      taxByRate[rateId].input += bill.taxAmount || 0
    })

    // Calculate net
    Object.keys(taxByRate).forEach((rateId) => {
      taxByRate[rateId].net = taxByRate[rateId].output - taxByRate[rateId].input
    })

    const totalOutput = Object.values(taxByRate).reduce((sum, t) => sum + t.output, 0)
    const totalInput = Object.values(taxByRate).reduce((sum, t) => sum + t.input, 0)
    const totalNet = totalOutput - totalInput

    return {
      period: { startDate, endDate },
      taxByRate: Object.entries(taxByRate).map(([rateId, amounts]) => ({
        taxRate: taxRates.find((tr) => tr.id === rateId),
        ...amounts,
      })),
      totals: {
        outputTax: totalOutput,
        inputTax: totalInput,
        netTax: totalNet,
      },
    }
  } catch (error) {
    console.error("Error generating tax report:", error)
    throw error
  }
}
