import * as firebaseProvider from "../../rtdatabase/Accounting"
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

export * from "../../rtdatabase/Accounting"

export const fetchJournals: typeof firebaseProvider.fetchJournals = fetchJournalsShared

export const createJournal: typeof firebaseProvider.createJournal = createJournalShared as typeof firebaseProvider.createJournal

export const updateJournal: typeof firebaseProvider.updateJournal = updateJournalShared

export const deleteJournal: typeof firebaseProvider.deleteJournal = deleteJournalShared

export const approveJournal: typeof firebaseProvider.approveJournal = approveJournalShared

export const postJournal: typeof firebaseProvider.postJournal = postJournalShared

export const reverseJournal: typeof firebaseProvider.reverseJournal = (basePath, journalId, reversedBy) =>
  reverseJournalShared(basePath, journalId, reversedBy) as ReturnType<typeof firebaseProvider.reverseJournal>

export const fetchDimensions: typeof firebaseProvider.fetchDimensions = fetchDimensionsShared

export const createDimension: typeof firebaseProvider.createDimension =
  createDimensionShared as typeof firebaseProvider.createDimension

export const updateDimension: typeof firebaseProvider.updateDimension = updateDimensionShared

export const deleteDimension: typeof firebaseProvider.deleteDimension = deleteDimensionShared

export const fetchPeriodLocks: typeof firebaseProvider.fetchPeriodLocks = fetchPeriodLocksShared

export const createPeriodLock: typeof firebaseProvider.createPeriodLock =
  createPeriodLockShared as typeof firebaseProvider.createPeriodLock

export const updatePeriodLock: typeof firebaseProvider.updatePeriodLock = updatePeriodLockShared

export const deletePeriodLock: typeof firebaseProvider.deletePeriodLock = deletePeriodLockShared

export const lockPeriod: typeof firebaseProvider.lockPeriod = async (basePath, lockId, lockedBy) => {
  await updatePeriodLockShared(basePath, lockId, {
    is_locked: true,
    locked_by: lockedBy,
    locked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export const unlockPeriod: typeof firebaseProvider.unlockPeriod = async (basePath, lockId, unlockedBy, reason) => {
  await updatePeriodLockShared(basePath, lockId, {
    is_locked: false,
    unlocked_by: unlockedBy,
    unlocked_at: new Date().toISOString(),
    unlock_reason: reason,
    updated_at: new Date().toISOString(),
  })
}

export const fetchOpeningBalances: typeof firebaseProvider.fetchOpeningBalances = fetchOpeningBalancesShared

export const createOpeningBalance: typeof firebaseProvider.createOpeningBalance =
  createOpeningBalanceShared as typeof firebaseProvider.createOpeningBalance

export const updateOpeningBalance: typeof firebaseProvider.updateOpeningBalance = updateOpeningBalanceShared

export const deleteOpeningBalance: typeof firebaseProvider.deleteOpeningBalance = deleteOpeningBalanceShared
