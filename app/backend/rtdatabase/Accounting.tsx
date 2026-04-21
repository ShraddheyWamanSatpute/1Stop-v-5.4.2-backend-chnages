import { ref, get, set, push, update, remove } from "firebase/database"
import { db } from "../services/Firebase"
import type {
  Journal,
  JournalLine,
  Dimension,
  DimensionValue,
  PeriodLock,
  OpeningBalance,
  JournalEntry
} from "../interfaces/Accounting"

// Journals
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

    // Calculate totals and check balance
    const totalDebit = journal.journal_lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = journal.journal_lines.reduce((sum, line) => sum + (line.credit || 0), 0)
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 // Allow small rounding differences

    if (!isBalanced) {
      throw new Error(`Journal is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`)
    }

    // Create journal lines with IDs
    const journalLines = journal.journal_lines.map((line, index) => ({
      ...line,
      id: line.id || `${id}-line-${index}`,
      journal_id: id,
      line_number: index + 1,
      created_at: line.created_at || new Date().toISOString(),
    }))

    const newJournal: Journal = {
      ...journal,
      id,
      journal_lines: journalLines,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: isBalanced,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await set(newJournalRef, newJournal)
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

      if (!isBalanced) {
        throw new Error(`Journal is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`)
      }

      updates.total_debit = totalDebit
      updates.total_credit = totalCredit
      updates.is_balanced = isBalanced

      // Update line numbers
      updates.journal_lines = updates.journal_lines.map((line, index) => ({
        ...line,
        line_number: index + 1,
      }))
    }

    const updatedFields = {
      ...updates,
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
    const journalRef = ref(db, `${basePath}/journals/${journalId}`)
    const journalSnapshot = await get(journalRef)
    
    if (journalSnapshot.exists()) {
      const journal = journalSnapshot.val()
      if (journal.status === "posted") {
        throw new Error("Cannot delete a posted journal. Reverse it instead.")
      }
    }

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
    
    if (journal.status !== "approved" && journal.status !== "draft") {
      throw new Error(`Cannot post journal with status: ${journal.status}`)
    }

    // Check if period is locked
    const periodLocks = await fetchPeriodLocks(basePath)
    const journalDate = new Date(journal.date)
    const isLocked = periodLocks.some(lock => {
      if (!lock.is_locked) return false
      const lockStart = new Date(lock.period_start)
      const lockEnd = new Date(lock.period_end)
      return journalDate >= lockStart && journalDate <= lockEnd
    })

    if (isLocked) {
      throw new Error("Cannot post journal to a locked period")
    }

    // Update journal status
    await update(journalRef, {
      status: "posted",
      posted_by: postedBy,
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Create transaction entries for each journal line
    const transactionsRef = ref(db, `${basePath}/transactions`)
    const transactionEntries: JournalEntry[] = journal.journal_lines.map((line: JournalLine) => ({
      accountId: line.account_id,
      amount: line.debit > 0 ? line.debit : line.credit,
      type: line.debit > 0 ? "debit" : "credit",
      description: line.description || journal.description,
      debit: line.debit,
      credit: line.credit,
      transactionId: journalId,
    }))

    // Create transaction
    const newTransactionRef = push(transactionsRef)
    const transactionId = newTransactionRef.key as string

    await set(newTransactionRef, {
      id: transactionId,
      transactionNumber: journal.journal_number,
      date: journal.date,
      description: journal.description,
      reference: journal.reference,
      type: "adjustment",
      status: "completed",
      entries: transactionEntries,
      totalAmount: journal.total_debit,
      currency: "GBP", // Default, should be configurable
      sourceDocument: {
        type: "manual",
        id: journalId,
      },
      isReconciled: false,
      createdBy: journal.created_by,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Update account balances
    const accountsRef = ref(db, `${basePath}/accounts`)
    const accountsSnapshot = await get(accountsRef)
    
    if (accountsSnapshot.exists()) {
      const accounts = accountsSnapshot.val()
      const updates: Record<string, any> = {}

      journal.journal_lines.forEach((line: JournalLine) => {
        if (accounts[line.account_id]) {
          const account = accounts[line.account_id]
          let balanceChange = 0

          // Calculate balance change based on account type
          if (["asset", "expense"].includes(account.type)) {
            balanceChange = line.debit - line.credit
          } else {
            balanceChange = line.credit - line.debit
          }

          if (!updates[`${line.account_id}/balance`]) {
            updates[`${line.account_id}/balance`] = account.balance || 0
          }
          updates[`${line.account_id}/balance`] += balanceChange
          updates[`${line.account_id}/updatedAt`] = new Date().toISOString()
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(accountsRef, updates)
      }
    }
  } catch (error) {
    console.error("Error posting journal:", error)
    throw error
  }
}

export const reverseJournal = async (basePath: string, journalId: string, reversedBy: string): Promise<Journal> => {
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

    // Create reversal journal with opposite entries
    const reversalLines = originalJournal.journal_lines.map((line: JournalLine) => ({
      account_id: line.account_id,
      description: `Reversal: ${line.description || originalJournal.description}`,
      debit: line.credit, // Swap debit and credit
      credit: line.debit,
      tax_rate_id: line.tax_rate_id,
      dimension_ids: line.dimension_ids,
      line_number: line.line_number,
    }))

    const reversalJournal = await createJournal(basePath, {
      entity_id: originalJournal.entity_id,
      journal_number: `REV-${originalJournal.journal_number}`,
      source: "reversal",
      date: new Date().toISOString().split('T')[0],
      description: `Reversal of ${originalJournal.journal_number}`,
      reference: originalJournal.reference,
      status: "posted", // Auto-post reversals
      journal_lines: reversalLines,
      total_debit: originalJournal.total_credit,
      total_credit: originalJournal.total_debit,
      is_balanced: true,
      created_by: reversedBy,
      original_journal_id: journalId,
    })

    // Update original journal
    await updateJournal(basePath, journalId, {
      status: "reversed",
      reversed_by: reversedBy,
      reversed_at: new Date().toISOString(),
      reversal_journal_id: reversalJournal.id,
    })

    // Post the reversal journal
    await postJournal(basePath, reversalJournal.id, reversedBy)

    return reversalJournal
  } catch (error) {
    console.error("Error reversing journal:", error)
    throw error
  }
}

// Dimensions
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

export const lockPeriod = async (basePath: string, lockId: string, lockedBy: string): Promise<void> => {
  try {
    await updatePeriodLock(basePath, lockId, {
      is_locked: true,
      locked_by: lockedBy,
      locked_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error locking period:", error)
    throw error
  }
}

export const unlockPeriod = async (basePath: string, lockId: string, unlockedBy: string, reason?: string): Promise<void> => {
  try {
    await updatePeriodLock(basePath, lockId, {
      is_locked: false,
      unlocked_by: unlockedBy,
      unlocked_at: new Date().toISOString(),
      unlock_reason: reason,
    })
  } catch (error) {
    console.error("Error unlocking period:", error)
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
