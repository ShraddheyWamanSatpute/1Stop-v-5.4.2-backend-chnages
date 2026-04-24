import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from "firebase/database"
import { db } from "../services/Firebase"
import type {
  Journal,
  JournalLine,
  Dimension,
  PeriodLock,
  OpeningBalance,
} from "../interfaces/Finance"

const stripUndefinedDeep = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(stripUndefinedDeep)
  if (typeof obj !== "object") return obj
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)])
  )
}

// Journals
export const fetchJournals = async (basePath: string): Promise<Journal[]> => {
  try {
    const journalsRef = ref(db, `${basePath}/journals`)
    const snapshot = await get(journalsRef)

    if (snapshot.exists()) {
      const journals = Object.entries(snapshot.val())
        .map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }))
        .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())

      // Fetch journal lines for each journal
      const journalLinesRef = ref(db, `${basePath}/journal_lines`)
      const linesSnapshot = await get(journalLinesRef)
      const allLines = linesSnapshot.exists() ? Object.entries(linesSnapshot.val()).map(([id, data]: [string, any]) => ({ id, ...data })) : []

      return journals.map(journal => ({
        ...journal,
        journal_lines: allLines.filter((line: JournalLine) => line.journal_id === journal.id),
      }))
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

    const newJournal: Journal = {
      ...journal,
      id,
      journal_number: journal.journal_number || `JRN-${Date.now()}`,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: isBalanced,
      period_locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Save journal lines separately
    const journalLinesRef = ref(db, `${basePath}/journal_lines`)
    const savedLines: JournalLine[] = []
    
    for (let i = 0; i < journal.journal_lines.length; i++) {
      const line = journal.journal_lines[i]
      const lineRef = push(journalLinesRef)
      const lineId = lineRef.key as string
      const savedLine: JournalLine = {
        ...line,
        id: lineId,
        journal_id: id,
        line_number: i + 1,
        created_at: new Date().toISOString(),
      }
      await set(lineRef, savedLine)
      savedLines.push(savedLine)
    }

    newJournal.journal_lines = savedLines
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
    const journalSnapshot = await get(journalRef)
    
    if (!journalSnapshot.exists()) {
      throw new Error("Journal not found")
    }

    const existingJournal = journalSnapshot.val()
    
    // Check if period is locked
    if (existingJournal.period_locked || existingJournal.status === "posted") {
      throw new Error("Cannot modify journal in locked period or posted journal")
    }

    // If journal_lines are updated, recalculate totals
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

      // Update journal lines
      const journalLinesRef = ref(db, `${basePath}/journal_lines`)
      const linesSnapshot = await get(journalLinesRef)
      
      // Delete old lines
      if (linesSnapshot.exists()) {
        const lines = linesSnapshot.val()
        const lineUpdates: Record<string, null> = {}
        for (const [lineId, line] of Object.entries(lines)) {
          if ((line as any).journal_id === journalId) {
            lineUpdates[lineId] = null
          }
        }
        if (Object.keys(lineUpdates).length > 0) {
          await update(journalLinesRef, lineUpdates)
        }
      }

      // Create new lines
      for (let i = 0; i < updates.journal_lines.length; i++) {
        const line = updates.journal_lines[i]
        const lineRef = push(journalLinesRef)
        const lineId = lineRef.key as string
        await set(lineRef, {
          ...line,
          id: lineId,
          journal_id: journalId,
          line_number: i + 1,
          created_at: new Date().toISOString(),
        })
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
    // Check if journal is posted - cannot delete posted journals
    const journalRef = ref(db, `${basePath}/journals/${journalId}`)
    const journalSnapshot = await get(journalRef)
    
    if (journalSnapshot.exists()) {
      const journal = journalSnapshot.val()
      if (journal.status === "posted") {
        throw new Error("Cannot delete posted journal. Reverse it instead.")
      }
    }

    // Delete journal lines
    const journalLinesRef = ref(db, `${basePath}/journal_lines`)
    const linesSnapshot = await get(journalLinesRef)
    if (linesSnapshot.exists()) {
      const lines = linesSnapshot.val()
      const updates: Record<string, null> = {}
      for (const [lineId, line] of Object.entries(lines)) {
        if ((line as any).journal_id === journalId) {
          updates[lineId] = null
        }
      }
      if (Object.keys(updates).length > 0) {
        await update(journalLinesRef, updates)
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
    const journalSnapshot = await get(journalRef)
    
    if (!journalSnapshot.exists()) {
      throw new Error("Journal not found")
    }

    const journal = journalSnapshot.val()
    
    if (journal.status !== "draft") {
      throw new Error("Only draft journals can be approved")
    }

    if (!journal.is_balanced) {
      throw new Error("Journal is not balanced. Debits must equal credits.")
    }

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
      throw new Error("Journal must be approved or in draft to post")
    }

    if (!journal.is_balanced) {
      throw new Error("Journal is not balanced. Debits must equal credits.")
    }

    // Update journal status
    await update(journalRef, {
      status: "posted",
      posted_by: postedBy,
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Update account balances
    const journalLinesRef = ref(db, `${basePath}/journal_lines`)
    const linesSnapshot = await get(journalLinesRef)
    
    if (linesSnapshot.exists()) {
      const lines = linesSnapshot.val()
      const accountUpdates: Record<string, any> = {}
      const accountsRef = ref(db, `${basePath}/accounts`)
      const accountsSnapshot = await get(accountsRef)
      const accounts = accountsSnapshot.exists() ? accountsSnapshot.val() : {}

      for (const line of Object.values(lines)) {
        const lineData = line as any
        if (lineData.journal_id === journalId) {
          const accountId = lineData.account_id
          if (!accounts[accountId]) continue

          const account = accounts[accountId]
          let balanceChange = 0

          // Calculate balance change based on account type
          if (["asset", "expense"].includes(account.type)) {
            balanceChange = (lineData.debit || 0) - (lineData.credit || 0)
          } else {
            balanceChange = (lineData.credit || 0) - (lineData.debit || 0)
          }

          if (!accountUpdates[accountId]) {
            accountUpdates[accountId] = {
              balance: account.balance || 0,
              updatedAt: new Date().toISOString(),
            }
          }
          accountUpdates[accountId].balance += balanceChange
        }
      }

      // Apply all account balance updates
      const finalUpdates: Record<string, any> = {}
      for (const [accountId, updates] of Object.entries(accountUpdates)) {
        finalUpdates[`${accountId}/balance`] = updates.balance
        finalUpdates[`${accountId}/updatedAt`] = updates.updatedAt
      }

      if (Object.keys(finalUpdates).length > 0) {
        await update(accountsRef, finalUpdates)
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

    // Create reversal journal
    const reversalLines = originalJournal.journal_lines.map((line: JournalLine) => ({
      account_id: line.account_id,
      description: `Reversal: ${line.description || ''}`,
      debit: line.credit, // Swap debit and credit
      credit: line.debit,
      tax_rate_id: line.tax_rate_id,
      dimension_ids: line.dimension_ids,
    }))

    const reversalJournal = await createJournal(basePath, {
      entity_id: originalJournal.entity_id,
      journal_number: `REV-${originalJournal.journal_number}`,
      source: "reversal",
      date: new Date().toISOString().split('T')[0],
      description: `Reversal of ${originalJournal.journal_number}`,
      reference: originalJournal.reference,
      status: "draft",
      journal_lines: reversalLines,
      total_debit: originalJournal.total_credit,
      total_credit: originalJournal.total_debit,
      is_balanced: true,
      currency: originalJournal.currency || "GBP",
      is_recurring: false,
      period_locked: false,
      created_by: reversedBy,
      reverses_journal_id: journalId,
    })

    // Mark original journal as reversed
    await update(journalRef, {
      status: "reversed",
      reversed_by: reversedBy,
      reversed_at: new Date().toISOString(),
      reversed_by_journal_id: reversalJournal.id,
      updated_at: new Date().toISOString(),
    })

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
      values: dimension.values || [],
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
      ...stripUndefinedDeep(updates),
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
      return Object.entries(snapshot.val())
        .map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }))
        .sort((a, b) => new Date(b.period_start || "").getTime() - new Date(a.period_start || "").getTime())
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
      ...stripUndefinedDeep(updates),
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

    // Update account opening balance
    const accountRef = ref(db, `${basePath}/accounts/${balance.account_id}`)
    await update(accountRef, {
      opening_balance: balance.balance,
      balance: balance.balance,
      updatedAt: new Date().toISOString(),
    })

    return newBalance
  } catch (error) {
    console.error("Error creating opening balance:", error)
    throw error
  }
}

export const updateOpeningBalance = async (basePath: string, balanceId: string, updates: Partial<OpeningBalance>): Promise<void> => {
  try {
    const balanceRef = ref(db, `${basePath}/opening_balances/${balanceId}`)
    const balanceSnapshot = await get(balanceRef)
    
    if (balanceSnapshot.exists()) {
      const balance = balanceSnapshot.val()
      
      const updatedFields = {
        ...stripUndefinedDeep(updates),
        updated_at: new Date().toISOString(),
      }
      await update(balanceRef, updatedFields)

      // Update account if balance changed
      if (updates.balance !== undefined) {
        const accountRef = ref(db, `${basePath}/accounts/${balance.account_id}`)
        await update(accountRef, {
          opening_balance: updates.balance,
          balance: updates.balance,
          updatedAt: new Date().toISOString(),
        })
      }
    }
  } catch (error) {
    console.error("Error updating opening balance:", error)
    throw error
  }
}

export const deleteOpeningBalance = async (basePath: string, balanceId: string): Promise<void> => {
  try {
    const balanceRef = ref(db, `${basePath}/opening_balances/${balanceId}`)
    const balanceSnapshot = await get(balanceRef)
    
    if (balanceSnapshot.exists()) {
      const balance = balanceSnapshot.val()
      
      // Reset account opening balance
      const accountRef = ref(db, `${basePath}/accounts/${balance.account_id}`)
      await update(accountRef, {
        opening_balance: 0,
        updatedAt: new Date().toISOString(),
      })
    }

    await remove(balanceRef)
  } catch (error) {
    console.error("Error deleting opening balance:", error)
    throw error
  }
}
