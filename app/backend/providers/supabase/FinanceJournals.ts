import * as firebaseProvider from "../../rtdatabase/FinanceJournals"
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

export * from "../../rtdatabase/FinanceJournals"

export const fetchJournals: typeof firebaseProvider.fetchJournals = fetchJournalsShared

export const createJournal: typeof firebaseProvider.createJournal = createJournalShared as typeof firebaseProvider.createJournal

export const updateJournal: typeof firebaseProvider.updateJournal = updateJournalShared

export const deleteJournal: typeof firebaseProvider.deleteJournal = deleteJournalShared

export const approveJournal: typeof firebaseProvider.approveJournal = approveJournalShared

export const postJournal: typeof firebaseProvider.postJournal = postJournalShared

export const reverseJournal: typeof firebaseProvider.reverseJournal = (basePath, journalId, reversedBy, reverseDate) =>
  reverseJournalShared(basePath, journalId, reversedBy, reverseDate) as ReturnType<typeof firebaseProvider.reverseJournal>

export const fetchPeriodLocks: typeof firebaseProvider.fetchPeriodLocks = fetchPeriodLocksShared

export const createPeriodLock: typeof firebaseProvider.createPeriodLock =
  createPeriodLockShared as typeof firebaseProvider.createPeriodLock

export const updatePeriodLock: typeof firebaseProvider.updatePeriodLock = updatePeriodLockShared

export const deletePeriodLock: typeof firebaseProvider.deletePeriodLock = deletePeriodLockShared

export const fetchDimensions: typeof firebaseProvider.fetchDimensions = fetchDimensionsShared

export const createDimension: typeof firebaseProvider.createDimension =
  createDimensionShared as typeof firebaseProvider.createDimension

export const updateDimension: typeof firebaseProvider.updateDimension = updateDimensionShared

export const deleteDimension: typeof firebaseProvider.deleteDimension = deleteDimensionShared

export const fetchOpeningBalances: typeof firebaseProvider.fetchOpeningBalances = fetchOpeningBalancesShared

export const createOpeningBalance: typeof firebaseProvider.createOpeningBalance =
  createOpeningBalanceShared as typeof firebaseProvider.createOpeningBalance

export const updateOpeningBalance: typeof firebaseProvider.updateOpeningBalance = updateOpeningBalanceShared

export const deleteOpeningBalance: typeof firebaseProvider.deleteOpeningBalance = deleteOpeningBalanceShared
