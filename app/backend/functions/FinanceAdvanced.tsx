import { ref, get, set, push, update } from "firebase/database"
import { db } from "../services/Firebase"
import { v4 as uuidv4 } from "uuid"
import type { Invoice, Bill, Payment, BankReconciliation, FinancialReport, TaxRate, PaymentTerm, Contact, Transaction, JournalEntry } from "../interfaces/Finance"

// Currency and formatting utilities
export const DEFAULT_CURRENCY = "GBP"
export const CURRENCY_SYMBOL = "£"

export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  if (currency === "GBP") {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Generate sequential numbers for documents
export const generateInvoiceNumber = async (basePath: string): Promise<string> => {
  const counterRef = ref(db, `${basePath}/counters/invoiceNumber`)
  const snapshot = await get(counterRef)
  const currentNumber = snapshot.exists() ? snapshot.val() : 0
  const newNumber = currentNumber + 1
  await set(counterRef, newNumber)
  return `INV-${String(newNumber).padStart(6, '0')}`
}

export const generateBillNumber = async (basePath: string): Promise<string> => {
  const counterRef = ref(db, `${basePath}/counters/billNumber`)
  const snapshot = await get(counterRef)
  const currentNumber = snapshot.exists() ? snapshot.val() : 0
  const newNumber = currentNumber + 1
  await set(counterRef, newNumber)
  return `BILL-${String(newNumber).padStart(6, '0')}`
}

export const generatePaymentNumber = async (basePath: string): Promise<string> => {
  const counterRef = ref(db, `${basePath}/counters/paymentNumber`)
  const snapshot = await get(counterRef)
  const currentNumber = snapshot.exists() ? snapshot.val() : 0
  const newNumber = currentNumber + 1
  await set(counterRef, newNumber)
  return `PAY-${String(newNumber).padStart(6, '0')}`
}

// Advanced Invoice Functions
export const createInvoiceAdvanced = async (
  basePath: string,
  invoiceData: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">
): Promise<Invoice> => {
  try {
    const invoicesRef = ref(db, `${basePath}/invoices`)
    const newInvoiceRef = push(invoicesRef)
    const id = newInvoiceRef.key as string
    const invoiceNumber = await generateInvoiceNumber(basePath)

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0
    const processedLineItems = invoiceData.lineItems.map(item => {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * (item.taxRate / 100)
      subtotal += lineTotal
      taxAmount += lineTax
      return {
        ...item,
        lineTotal,
        taxAmount: lineTax
      }
    })

    const totalAmount = subtotal + taxAmount

    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      invoiceNumber,
      lineItems: processedLineItems,
      subtotal,
      taxAmount,
      totalAmount,
      currency: invoiceData.currency || DEFAULT_CURRENCY,
      remindersSent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await set(newInvoiceRef, newInvoice)

    // Create corresponding transaction if invoice is not draft
    if (newInvoice.status !== "draft") {
      await createInvoiceTransaction(basePath, newInvoice)
    }

    return newInvoice
  } catch (error) {
    console.error("Error creating invoice:", error)
    throw error
  }
}

export const updateInvoiceAdvanced = async (
  basePath: string,
  invoiceId: string,
  updates: Partial<Invoice>
): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoiceId}`)
    
    // Recalculate totals if line items are updated
    if (updates.lineItems) {
      let subtotal = 0
      let taxAmount = 0
      const processedLineItems = updates.lineItems.map(item => {
        const lineTotal = item.quantity * item.unitPrice
        const lineTax = lineTotal * (item.taxRate / 100)
        subtotal += lineTotal
        taxAmount += lineTax
        return {
          ...item,
          lineTotal,
          taxAmount: lineTax
        }
      })

      updates.subtotal = subtotal
      updates.taxAmount = taxAmount
      updates.totalAmount = subtotal + taxAmount
      updates.lineItems = processedLineItems
    }

    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await update(invoiceRef, updatedFields)
  } catch (error) {
    console.error("Error updating invoice:", error)
    throw error
  }
}

export const sendInvoice = async (basePath: string, invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoiceId}`)
    const invoiceSnapshot = await get(invoiceRef)
    
    if (!invoiceSnapshot.exists()) {
      throw new Error("Invoice not found")
    }

    const invoice = invoiceSnapshot.val() as Invoice

    // If invoice is draft, approve it first
    if (invoice.status === "draft") {
      await update(invoiceRef, {
        status: "sent",
        sentAt: new Date().toISOString(),
        approvedBy: "system", // TODO: Get from auth context
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Create journal entries for approved invoice
      await createInvoiceTransaction(basePath, { ...invoice, status: "sent" })
    } else {
      await update(invoiceRef, {
        status: "sent",
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error("Error sending invoice:", error)
    throw error
  }
}

export const approveInvoice = async (
  basePath: string,
  invoiceId: string,
  approvedBy: string
): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoiceId}`)
    const invoiceSnapshot = await get(invoiceRef)
    
    if (!invoiceSnapshot.exists()) {
      throw new Error("Invoice not found")
    }

    const invoice = invoiceSnapshot.val() as Invoice

    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be approved")
    }

    await update(invoiceRef, {
      status: "sent",
      approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Create journal entries
    await createInvoiceTransaction(basePath, { ...invoice, status: "sent" })
  } catch (error) {
    console.error("Error approving invoice:", error)
    throw error
  }
}

export const voidInvoice = async (
  basePath: string,
  invoiceId: string,
  voidedBy: string,
  reason: string
): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoiceId}`)
    const invoiceSnapshot = await get(invoiceRef)
    
    if (!invoiceSnapshot.exists()) {
      throw new Error("Invoice not found")
    }

    const invoice = invoiceSnapshot.val() as Invoice

    if (invoice.status === "paid") {
      throw new Error("Cannot void a paid invoice. Create a credit note instead.")
    }

    await update(invoiceRef, {
      status: "void",
      voidedBy,
      voidedAt: new Date().toISOString(),
      voidReason: reason,
      balance_due: 0,
      balanceDue: 0,
      updatedAt: new Date().toISOString()
    })

    // Reverse journal entries if invoice was already approved/sent
    if (invoice.status === "sent" || invoice.status === "viewed") {
      await reverseInvoiceTransaction(basePath, invoice)
    }
  } catch (error) {
    console.error("Error voiding invoice:", error)
    throw error
  }
}

export const markInvoicePaid = async (
  basePath: string,
  invoiceId: string,
  paymentAmount: number,
  paymentDate: string,
  paymentMethod: string = "bank_transfer"
): Promise<void> => {
  try {
    const invoiceRef = ref(db, `${basePath}/invoices/${invoiceId}`)
    const invoiceSnapshot = await get(invoiceRef)
    
    if (!invoiceSnapshot.exists()) {
      throw new Error("Invoice not found")
    }

    const invoice = invoiceSnapshot.val() as Invoice

    // Update invoice status
    await update(invoiceRef, {
      status: "paid",
      paidDate: paymentDate,
      updatedAt: new Date().toISOString()
    })

    // Create payment record
    await createPaymentAdvanced(basePath, {
      type: "customer_payment",
      amount: paymentAmount,
      currency: invoice.currency,
      paymentDate,
      paymentMethod: paymentMethod as any,
      contactId: invoice.customerId,
      allocations: [{
        documentType: "invoice",
        documentId: invoiceId,
        amount: paymentAmount
      }],
      status: "completed",
      bankAccountId: "" // This should be set based on the payment method
    })

    // Update customer balance
    await updateContactBalance(basePath, invoice.customerId, -paymentAmount)
  } catch (error) {
    console.error("Error marking invoice as paid:", error)
    throw error
  }
}

// Advanced Bill Functions
export const createBillAdvanced = async (
  basePath: string,
  billData: Omit<Bill, "id" | "billNumber" | "createdAt" | "updatedAt">
): Promise<Bill> => {
  try {
    const billsRef = ref(db, `${basePath}/bills`)
    const newBillRef = push(billsRef)
    const id = newBillRef.key as string
    const billNumber = await generateBillNumber(basePath)

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0
    const processedLineItems = billData.lineItems.map(item => {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * (item.taxRate / 100)
      subtotal += lineTotal
      taxAmount += lineTax
      return {
        ...item,
        lineTotal,
        taxAmount: lineTax
      }
    })

    const totalAmount = subtotal + taxAmount

    const newBill: Bill = {
      ...billData,
      id,
      billNumber,
      lineItems: processedLineItems,
      subtotal,
      taxAmount,
      totalAmount,
      currency: billData.currency || DEFAULT_CURRENCY,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await set(newBillRef, newBill)

    // Create corresponding transaction if bill is approved
    if (newBill.status === "approved") {
      await createBillTransaction(basePath, newBill)
    }

    return newBill
  } catch (error) {
    console.error("Error creating bill:", error)
    throw error
  }
}

export const approveBill = async (
  basePath: string,
  billId: string,
  approvedBy: string
): Promise<void> => {
  try {
    const billRef = ref(db, `${basePath}/bills/${billId}`)
    const billSnapshot = await get(billRef)
    
    if (!billSnapshot.exists()) {
      throw new Error("Bill not found")
    }

    const bill = billSnapshot.val() as Bill

    // Only create transaction if bill is being approved (not already approved)
    if (bill.status !== "approved") {
      await update(billRef, {
        status: "approved",
        approvedBy,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // Create transaction for approved bill (creates AP journal entry)
      await createBillTransaction(basePath, { ...bill, status: "approved" })
    }
  } catch (error) {
    console.error("Error approving bill:", error)
    throw error
  }
}

export const markBillPaid = async (
  basePath: string,
  billId: string,
  paymentAmount: number,
  paymentDate: string,
  paymentMethod: string = "bank_transfer",
  bankAccountId?: string
): Promise<void> => {
  try {
    const billRef = ref(db, `${basePath}/bills/${billId}`)
    const billSnapshot = await get(billRef)
    
    if (!billSnapshot.exists()) {
      throw new Error("Bill not found")
    }

    const bill = billSnapshot.val() as Bill
    const currentBalance = bill.balance_due || bill.balanceDue || bill.totalAmount || 0
    const newBalance = Math.max(0, currentBalance - paymentAmount)
    const isOverpayment = paymentAmount > currentBalance
    const overpaymentAmount = isOverpayment ? paymentAmount - currentBalance : 0

    // Update bill
    await update(billRef, {
      balance_due: newBalance,
      balanceDue: newBalance,
      status: newBalance === 0 ? "paid" : bill.status,
      paidDate: newBalance === 0 ? paymentDate : bill.paidDate,
      overpaymentAmount: isOverpayment ? overpaymentAmount : undefined,
      updatedAt: new Date().toISOString()
    })

    // Create payment record if bank account provided
    if (bankAccountId) {
      await createPaymentAdvanced(basePath, {
        type: "supplier_payment",
        amount: paymentAmount,
        currency: bill.currency,
        paymentDate,
        paymentMethod: paymentMethod as any,
        bankAccountId,
        contactId: bill.supplierId,
        allocations: [
          {
            documentType: "bill",
            documentId: billId,
            amount: Math.min(paymentAmount, currentBalance),
          },
        ],
        status: "completed",
      })
    }

    // Update supplier balance
    await updateContactBalance(basePath, bill.supplierId, -paymentAmount)
  } catch (error) {
    console.error("Error marking bill as paid:", error)
    throw error
  }
}

// Payment Functions
export const createPaymentAdvanced = async (
  basePath: string,
  paymentData: Omit<Payment, "id" | "paymentNumber" | "createdAt" | "updatedAt">
): Promise<Payment> => {
  try {
    const paymentsRef = ref(db, `${basePath}/payments`)
    const newPaymentRef = push(paymentsRef)
    const id = newPaymentRef.key as string
    const paymentNumber = await generatePaymentNumber(basePath)

    const newPayment: Payment = {
      ...paymentData,
      id,
      paymentNumber,
      currency: paymentData.currency || DEFAULT_CURRENCY,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await set(newPaymentRef, newPayment)

    // Create corresponding transaction
    await createPaymentTransaction(basePath, newPayment)

    return newPayment
  } catch (error) {
    console.error("Error creating payment:", error)
    throw error
  }
}

// Expense Functions
export const approveExpense = async (
  basePath: string,
  expenseId: string,
  approvedBy: string
): Promise<void> => {
  try {
    const expenseRef = ref(db, `${basePath}/expenses/${expenseId}`)
    const expenseSnapshot = await get(expenseRef)
    
    if (!expenseSnapshot.exists()) {
      throw new Error("Expense not found")
    }

    const expense = expenseSnapshot.val() as Expense

    if (expense.status !== "pending") {
      throw new Error("Only pending expenses can be approved")
    }

    await update(expenseRef, {
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Create journal entries for approved expense
    await createExpenseTransaction(basePath, { ...expense, status: "approved" })
  } catch (error) {
    console.error("Error approving expense:", error)
    throw error
  }
}

export const rejectExpense = async (
  basePath: string,
  expenseId: string,
  rejectedBy: string,
  reason: string
): Promise<void> => {
  try {
    const expenseRef = ref(db, `${basePath}/expenses/${expenseId}`)
    const expenseSnapshot = await get(expenseRef)
    
    if (!expenseSnapshot.exists()) {
      throw new Error("Expense not found")
    }

    const expense = expenseSnapshot.val() as Expense

    if (expense.status !== "pending") {
      throw new Error("Only pending expenses can be rejected")
    }

    await update(expenseRef, {
      status: "rejected",
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error rejecting expense:", error)
    throw error
  }
}

export const reimburseExpense = async (
  basePath: string,
  expenseId: string,
  reimbursementData: {
    amount: number
    date: string
    method: "bank_transfer" | "cash" | "cheque"
    bankAccountId?: string
    reimbursedBy: string
  }
): Promise<void> => {
  try {
    const expenseRef = ref(db, `${basePath}/expenses/${expenseId}`)
    const expenseSnapshot = await get(expenseRef)
    
    if (!expenseSnapshot.exists()) {
      throw new Error("Expense not found")
    }

    const expense = expenseSnapshot.val() as Expense

    if (expense.status !== "approved") {
      throw new Error("Only approved expenses can be reimbursed")
    }

    // Update expense
    await update(expenseRef, {
      status: "reimbursed",
      reimbursement_amount: reimbursementData.amount,
      reimbursement_date: reimbursementData.date,
      reimbursement_method: reimbursementData.method,
      reimbursement_bank_account_id: reimbursementData.bankAccountId,
      reimbursed_by: reimbursementData.reimbursedBy,
      reimbursed_at: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Create payment record for reimbursement
    if (reimbursementData.method === "bank_transfer" && reimbursementData.bankAccountId) {
      await createPaymentAdvanced(basePath, {
        type: "supplier_payment", // Treating employee reimbursement as supplier payment
        amount: reimbursementData.amount,
        currency: expense.currency,
        paymentDate: reimbursementData.date,
        paymentMethod: reimbursementData.method,
        bankAccountId: reimbursementData.bankAccountId,
        contactId: expense.employee_id,
        allocations: [{
          documentType: "expense",
          documentId: expenseId,
          amount: reimbursementData.amount
        }],
        status: "completed",
        reference: `Reimbursement for ${expense.description}`,
      })
    }

    // Create reimbursement transaction
    await createReimbursementTransaction(basePath, expense, reimbursementData)
  } catch (error) {
    console.error("Error reimbursing expense:", error)
    throw error
  }
}

// Transaction Creation Helpers for Expenses
const createExpenseTransaction = async (basePath: string, expense: Expense): Promise<void> => {
  const transactionsRef = ref(db, `${basePath}/transactions`)
  const newTransactionRef = push(transactionsRef)
  const id = newTransactionRef.key as string

  const expenseAccountId = expense.account_id || "expense" // Default expense account
  const taxAccountId = "vat_recoverable" // Input tax account
  const payableAccountId = expense.payment_method === "company_card" 
    ? "company_card_payable" 
    : "expense_payable"

  const entries: JournalEntry[] = [
    {
      accountId: expenseAccountId,
      amount: expense.amount,
      type: "debit",
      description: `Expense: ${expense.description}`,
      debit: expense.amount,
    }
  ]

  // Add tax entry if taxable
  if (expense.is_taxable && expense.tax_amount && expense.tax_amount > 0) {
    entries.push({
      accountId: taxAccountId,
      amount: expense.tax_amount,
      type: "debit",
      description: `Input VAT: ${expense.description}`,
      debit: expense.tax_amount,
    })
  }

  // Credit side - payable or bank
  const totalAmount = expense.tax_included 
    ? expense.amount 
    : expense.amount + (expense.tax_amount || 0)

  entries.push({
    accountId: payableAccountId,
    amount: totalAmount,
    type: "credit",
    description: `Expense Payable: ${expense.description}`,
    credit: totalAmount,
  })

  const transaction: Transaction = {
    id,
    transactionNumber: `TXN-${id.slice(-6)}`,
    date: expense.expenseDate || expense.submitDate,
    description: `Expense: ${expense.description} - ${expense.employee}`,
    type: "expense",
    status: "completed",
    entries,
    totalAmount,
    currency: expense.currency,
    sourceDocument: {
      type: "expense",
      id: expense.id
    },
    contactId: expense.employee_id,
    isReconciled: false,
    createdBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await set(newTransactionRef, transaction)
}

const createReimbursementTransaction = async (
  basePath: string,
  expense: Expense,
  reimbursementData: {
    amount: number
    date: string
    method: "bank_transfer" | "cash" | "cheque"
    bankAccountId?: string
  }
): Promise<void> => {
  const transactionsRef = ref(db, `${basePath}/transactions`)
  const newTransactionRef = push(transactionsRef)
  const id = newTransactionRef.key as string

  const payableAccountId = expense.payment_method === "company_card" 
    ? "company_card_payable" 
    : "expense_payable"
  const bankAccountId = reimbursementData.bankAccountId || "cash"

  const transaction: Transaction = {
    id,
    transactionNumber: `TXN-REIMB-${id.slice(-6)}`,
    date: reimbursementData.date,
    description: `Reimbursement: ${expense.description} - ${expense.employee}`,
    type: "payment",
    status: "completed",
    entries: [
      {
        accountId: payableAccountId,
        amount: reimbursementData.amount,
        type: "debit",
        description: `Reimbursement: ${expense.description}`,
        debit: reimbursementData.amount,
      },
      {
        accountId: bankAccountId,
        amount: reimbursementData.amount,
        type: "credit",
        description: `Reimbursement Payment: ${expense.description}`,
        credit: reimbursementData.amount,
      },
    ],
    totalAmount: reimbursementData.amount,
    currency: expense.currency,
    bankAccountId: reimbursementData.bankAccountId,
    contactId: expense.employee_id,
    sourceDocument: {
      type: "expense",
      id: expense.id
    },
    isReconciled: false,
    createdBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await set(newTransactionRef, transaction)
}

// Bank Reconciliation Functions
export const startBankReconciliation = async (
  basePath: string,
  bankAccountId: string,
  statementDate: string,
  closingBalance: number,
  reconciledBy: string
): Promise<BankReconciliation> => {
  try {
    const reconciliationsRef = ref(db, `${basePath}/bankReconciliations`)
    const newReconciliationRef = push(reconciliationsRef)
    const id = newReconciliationRef.key as string

    // Get opening balance from previous reconciliation or account
    const openingBalance = await getPreviousReconciliationBalance(basePath, bankAccountId, statementDate)

    // Get unreconciled transactions
    const unreconciledTransactions = await getUnreconciledTransactions(basePath, bankAccountId)

    const newReconciliation: BankReconciliation = {
      id,
      bankAccountId,
      statementDate,
      openingBalance,
      closingBalance,
      reconciledTransactions: [],
      unreconciledTransactions,
      adjustments: [],
      status: "in_progress",
      reconciledBy,
      createdAt: new Date().toISOString()
    }

    await set(newReconciliationRef, newReconciliation)
    return newReconciliation
  } catch (error) {
    console.error("Error starting bank reconciliation:", error)
    throw error
  }
}

// Transaction Creation Helpers
const createInvoiceTransaction = async (basePath: string, invoice: Invoice): Promise<void> => {
  const transactionsRef = ref(db, `${basePath}/transactions`)
  const newTransactionRef = push(transactionsRef)
  const id = newTransactionRef.key as string

  // Get revenue account from first line item or default
  const revenueAccountId = invoice.lineItems?.[0]?.accountId || "revenue"
  
  // Calculate tax accounts from line items (group by tax rate)
  const taxEntries: JournalEntry[] = []
  const taxGroups: Record<string, number> = {}
  
  invoice.lineItems?.forEach((item) => {
    const taxKey = item.taxRateId || `tax_${item.taxRate}`
    if (!taxGroups[taxKey]) {
      taxGroups[taxKey] = 0
    }
    taxGroups[taxKey] += item.taxAmount || 0
  })

  // Create tax entries
  Object.entries(taxGroups).forEach(([taxKey, amount]) => {
    if (amount > 0) {
      taxEntries.push({
        accountId: "vat_payable", // This should be configurable based on tax rate
        amount,
        type: "credit",
        description: `VAT - Invoice ${invoice.invoiceNumber}`,
        credit: amount,
      })
    }
  })

  // If no tax entries, add default
  if (taxEntries.length === 0 && invoice.taxAmount > 0) {
    taxEntries.push({
      accountId: "vat_payable",
      amount: invoice.taxAmount,
      type: "credit",
      description: `VAT - Invoice ${invoice.invoiceNumber}`,
      credit: invoice.taxAmount,
    })
  }

  const transaction: Transaction = {
    id,
    transactionNumber: `TXN-${id.slice(-6)}`,
    date: invoice.issueDate,
    description: `Invoice ${invoice.invoiceNumber} - ${invoice.customerName}`,
    type: "sale",
    status: invoice.status === "paid" ? "completed" : "pending",
    entries: [
      {
        accountId: "accounts_receivable", // This should be configurable
        amount: invoice.totalAmount,
        type: "debit",
        description: `Invoice ${invoice.invoiceNumber}`,
        debit: invoice.totalAmount,
      },
      {
        accountId: revenueAccountId,
        amount: invoice.subtotal,
        type: "credit",
        description: `Sales - Invoice ${invoice.invoiceNumber}`,
        credit: invoice.subtotal,
      },
      ...taxEntries,
    ],
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    exchangeRate: invoice.exchangeRate || invoice.exchange_rate,
    sourceDocument: {
      type: "invoice",
      id: invoice.id
    },
    contactId: invoice.customerId,
    isReconciled: false,
    createdBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await set(newTransactionRef, transaction)
}

const reverseInvoiceTransaction = async (basePath: string, invoice: Invoice): Promise<void> => {
  // Create reversing transaction
  const transactionsRef = ref(db, `${basePath}/transactions`)
  const newTransactionRef = push(transactionsRef)
  const id = newTransactionRef.key as string

  const revenueAccountId = invoice.lineItems?.[0]?.accountId || "revenue"

  const transaction: Transaction = {
    id,
    transactionNumber: `TXN-REV-${id.slice(-6)}`,
    date: new Date().toISOString().split("T")[0],
    description: `Void Invoice ${invoice.invoiceNumber} - ${invoice.customerName}`,
    type: "adjustment",
    status: "completed",
    entries: [
      {
        accountId: "accounts_receivable",
        amount: invoice.totalAmount,
        type: "credit",
        description: `Void Invoice ${invoice.invoiceNumber}`,
        credit: invoice.totalAmount,
      },
      {
        accountId: revenueAccountId,
        amount: invoice.subtotal,
        type: "debit",
        description: `Void Sales - Invoice ${invoice.invoiceNumber}`,
        debit: invoice.subtotal,
      },
      {
        accountId: "vat_payable",
        amount: invoice.taxAmount,
        type: "debit",
        description: `Void VAT - Invoice ${invoice.invoiceNumber}`,
        debit: invoice.taxAmount,
      },
    ],
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    exchangeRate: invoice.exchangeRate || invoice.exchange_rate,
    sourceDocument: {
      type: "invoice",
      id: invoice.id
    },
    contactId: invoice.customerId,
    isReconciled: false,
    createdBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await set(newTransactionRef, transaction)
}

const createBillTransaction = async (basePath: string, bill: Bill): Promise<void> => {
  const transactionsRef = ref(db, `${basePath}/transactions`)
  const newTransactionRef = push(transactionsRef)
  const id = newTransactionRef.key as string

  const entries: JournalEntry[] = []

  // Create entries from line items (group by account)
  if (bill.lineItems && bill.lineItems.length > 0) {
    const accountGroups: Record<string, number> = {}
    const taxGroups: Record<string, number> = {}

    bill.lineItems.forEach((item) => {
      // Group expenses/assets by account
      const accountId = item.accountId || "expense"
      if (!accountGroups[accountId]) {
        accountGroups[accountId] = 0
      }
      accountGroups[accountId] += item.lineTotal || (item.quantity * item.unitPrice)

      // Group tax by rate
      const taxKey = `vat_${item.taxRate || 0}`
      if (!taxGroups[taxKey]) {
        taxGroups[taxKey] = 0
      }
      taxGroups[taxKey] += item.taxAmount || 0
    })

    // Create debit entries for expenses/assets
    Object.entries(accountGroups).forEach(([accountId, amount]) => {
      if (amount > 0) {
        entries.push({
          accountId,
          amount,
          type: "debit",
          description: `Expense/Asset - Bill ${bill.billNumber}`,
          debit: amount,
        })
      }
    })

    // Create debit entries for input tax
    Object.entries(taxGroups).forEach(([taxKey, amount]) => {
      if (amount > 0) {
        entries.push({
          accountId: "vat_recoverable", // Input VAT account
          amount,
          type: "debit",
          description: `Input VAT - Bill ${bill.billNumber}`,
          debit: amount,
        })
      }
    })
  } else {
    // Fallback to simple entries if no line items
    entries.push({
      accountId: "expense",
      amount: bill.subtotal,
      type: "debit",
      description: `Expense - Bill ${bill.billNumber}`,
      debit: bill.subtotal,
    })

    if (bill.taxAmount > 0) {
      entries.push({
        accountId: "vat_recoverable",
        amount: bill.taxAmount,
        type: "debit",
        description: `Input VAT - Bill ${bill.billNumber}`,
        debit: bill.taxAmount,
      })
    }
  }

  // Credit Accounts Payable
  entries.push({
    accountId: "accounts_payable",
    amount: bill.totalAmount,
    type: "credit",
    description: `Bill ${bill.billNumber}`,
    credit: bill.totalAmount,
  })

  const transaction: Transaction = {
    id,
    transactionNumber: `TXN-${id.slice(-6)}`,
    date: bill.receiveDate,
    description: `Bill ${bill.billNumber} - ${bill.supplierName}`,
    type: "purchase",
    status: bill.status === "paid" ? "completed" : "pending",
    entries,
    totalAmount: bill.totalAmount,
    currency: bill.currency,
    sourceDocument: {
      type: "bill",
      id: bill.id
    },
    contactId: bill.supplierId,
    isReconciled: false,
    createdBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await set(newTransactionRef, transaction)
}

const createPaymentTransaction = async (basePath: string, payment: Payment): Promise<void> => {
  const transactionsRef = ref(db, `${basePath}/transactions`)
  const newTransactionRef = push(transactionsRef)
  const id = newTransactionRef.key as string

  const entries: JournalEntry[] = []

  // Handle supplier payments (bill payments)
  if (payment.type === "supplier_payment") {
    // Debit Accounts Payable
    entries.push({
      accountId: "accounts_payable",
      amount: payment.amount,
      type: "debit",
      description: `Payment ${payment.paymentNumber}`,
      debit: payment.amount,
    })

    // Credit Bank Account
    entries.push({
      accountId: payment.bankAccountId, // Bank account GL account
      amount: payment.amount,
      type: "credit",
      description: `Payment ${payment.paymentNumber}`,
      credit: payment.amount,
    })

    // Update bill balances if allocations exist
    if (payment.allocations && payment.allocations.length > 0) {
      for (const allocation of payment.allocations) {
        if (allocation.documentType === "bill") {
          const billRef = ref(db, `${basePath}/bills/${allocation.documentId}`)
          const billSnapshot = await get(billRef)
          
          if (billSnapshot.exists()) {
            const bill = billSnapshot.val() as Bill
            const currentBalance = bill.balance_due || bill.balanceDue || bill.totalAmount || 0
            const newBalance = Math.max(0, currentBalance - allocation.amount)
            
            await update(billRef, {
              balance_due: newBalance,
              balanceDue: newBalance,
              status: newBalance === 0 ? "paid" : bill.status,
              paidDate: newBalance === 0 ? payment.paymentDate : bill.paidDate,
              updatedAt: new Date().toISOString(),
            })
          }
        }
      }
    }
  } else if (payment.type === "customer_payment") {
    // Handle customer payments (invoice payments)
    // Debit Bank Account
    entries.push({
      accountId: payment.bankAccountId,
      amount: payment.amount,
      type: "debit",
      description: `Payment ${payment.paymentNumber}`,
      debit: payment.amount,
    })

    // Credit Accounts Receivable
    entries.push({
      accountId: "accounts_receivable",
      amount: payment.amount,
      type: "credit",
      description: `Payment ${payment.paymentNumber}`,
      credit: payment.amount,
    })
  }

  const transaction: Transaction = {
    id,
    transactionNumber: `TXN-${id.slice(-6)}`,
    date: payment.paymentDate,
    description: `Payment ${payment.paymentNumber}`,
    type: payment.type === "customer_payment" ? "receipt" : "payment",
    status: payment.status === "failed" ? "pending" : payment.status,
    entries,
    totalAmount: payment.amount,
    currency: payment.currency,
    bankAccountId: payment.bankAccountId,
    contactId: payment.contactId,
    isReconciled: false,
    createdBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await set(newTransactionRef, transaction)
}

// Helper Functions
const updateContactBalance = async (basePath: string, contactId: string, amount: number): Promise<void> => {
  const contactRef = ref(db, `${basePath}/contacts/${contactId}`)
  const contactSnapshot = await get(contactRef)
  
  if (contactSnapshot.exists()) {
    const contact = contactSnapshot.val() as Contact
    const currentBalance = contact.outstandingBalance || 0
    await update(contactRef, {
      outstandingBalance: currentBalance + amount,
      lastTransactionDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}

const getPreviousReconciliationBalance = async (
  _basePath: string,
  _bankAccountId: string,
  _statementDate: string
): Promise<number> => {
  // This would get the closing balance from the most recent reconciliation
  // For now, return 0 as a placeholder
  return 0
}

const getUnreconciledTransactions = async (
  _basePath: string,
  _bankAccountId: string
): Promise<string[]> => {
  // This would get all transactions for the bank account that haven't been reconciled
  // For now, return empty array as a placeholder
  return []
}

// Reporting Functions
export const generateProfitLossReport = async (
  basePath: string,
  startDate: string,
  endDate: string
): Promise<FinancialReport> => {
  try {
    // Get all transactions in the period
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const snapshot = await get(transactionsRef)
    
    let revenue = 0
    let expenses = 0
    
    if (snapshot.exists()) {
      const transactions = Object.values(snapshot.val()) as Transaction[]
      
      transactions.forEach(transaction => {
        if (transaction.date >= startDate && transaction.date <= endDate) {
          if (transaction.type === "sale") {
            revenue += transaction.totalAmount
          } else if (transaction.type === "purchase") {
            expenses += transaction.totalAmount
          }
        }
      })
    }

    const profit = revenue - expenses

    const report: FinancialReport = {
      id: uuidv4(),
      name: `Profit & Loss - ${startDate} to ${endDate}`,
      type: "profit_loss",
      period: {
        startDate,
        endDate,
        type: "custom"
      },
      data: {
        revenue,
        expenses,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      },
      generatedAt: new Date().toISOString(),
      generatedBy: "system"
    }

    // Save report
    const reportsRef = ref(db, `${basePath}/reports`)
    const newReportRef = push(reportsRef)
    await set(newReportRef, report)

    return report
  } catch (error) {
    console.error("Error generating profit & loss report:", error)
    throw error
  }
}

// Tax Functions
export const calculateVAT = (amount: number, vatRate: number = 20): number => {
  return amount * (vatRate / 100)
}

export const getVATRates = (): TaxRate[] => {
  return [
    {
      id: "vat_standard",
      name: "Standard VAT",
      rate: 20,
      type: "VAT",
      isActive: true
    },
    {
      id: "vat_reduced",
      name: "Reduced VAT",
      rate: 5,
      type: "VAT",
      isActive: true
    },
    {
      id: "vat_zero",
      name: "Zero VAT",
      rate: 0,
      type: "VAT",
      isActive: true
    }
  ]
}

// Default Payment Terms
export const getDefaultPaymentTerms = (): PaymentTerm[] => {
  return [
    {
      id: "net_30",
      name: "Net 30",
      days: 30
    },
    {
      id: "net_15",
      name: "Net 15",
      days: 15
    },
    {
      id: "net_7",
      name: "Net 7",
      days: 7
    },
    {
      id: "due_on_receipt",
      name: "Due on Receipt",
      days: 0
    }
  ]
}

// Currency Exchange (placeholder - would integrate with real API)
export const getExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number> => {
  // For GBP-based system, this would integrate with a real exchange rate API
  if (fromCurrency === toCurrency) return 1
  if (fromCurrency === "GBP" && toCurrency === "USD") return 1.27 // Example rate
  if (fromCurrency === "USD" && toCurrency === "GBP") return 0.79 // Example rate
  return 1 // Default fallback
}

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  return amount * rate
}
