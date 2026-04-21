import { authedDataFetch } from "./http"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

export const fetchJournalsShared = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/journals${query({ basePath })}`, { method: "GET" })
  return result?.rows || []
}

export const createJournalShared = async (basePath: string, journal: any) => {
  const result = await authedDataFetch(`/finance/journals`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: journal }),
  })
  return result?.row || { ...journal, id: String(result?.id || "") }
}

export const updateJournalShared = async (basePath: string, journalId: string, updates: any) => {
  await authedDataFetch(`/finance/journals/${encodeURIComponent(journalId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteJournalShared = async (basePath: string, journalId: string) => {
  await authedDataFetch(`/finance/journals/${encodeURIComponent(journalId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const approveJournalShared = async (basePath: string, journalId: string, approvedBy: string) => {
  await authedDataFetch(`/finance/journals/${encodeURIComponent(journalId)}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, approvedBy }),
  })
}

export const postJournalShared = async (basePath: string, journalId: string, postedBy: string) => {
  await authedDataFetch(`/finance/journals/${encodeURIComponent(journalId)}/post`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, postedBy }),
  })
}

export const reverseJournalShared = async (
  basePath: string,
  journalId: string,
  reversedBy: string,
  reversalDate?: string,
) => {
  const result = await authedDataFetch(`/finance/journals/${encodeURIComponent(journalId)}/reverse`, {
    method: "POST",
    body: JSON.stringify({ basePath, reversedBy, reversalDate }),
  })
  return result?.row || null
}

export const fetchDimensionsShared = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/dimensions${query({ basePath })}`, { method: "GET" })
  return result?.rows || []
}

export const createDimensionShared = async (basePath: string, dimension: any) => {
  const result = await authedDataFetch(`/finance/dimensions`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: dimension }),
  })
  return result?.row || { ...dimension, id: String(result?.id || "") }
}

export const updateDimensionShared = async (basePath: string, dimensionId: string, updates: any) => {
  await authedDataFetch(`/finance/dimensions/${encodeURIComponent(dimensionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteDimensionShared = async (basePath: string, dimensionId: string) => {
  await authedDataFetch(`/finance/dimensions/${encodeURIComponent(dimensionId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchPeriodLocksShared = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/periodLocks${query({ basePath })}`, { method: "GET" })
  return result?.rows || []
}

export const createPeriodLockShared = async (basePath: string, lock: any) => {
  const result = await authedDataFetch(`/finance/periodLocks`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: lock }),
  })
  return result?.row || { ...lock, id: String(result?.id || "") }
}

export const updatePeriodLockShared = async (basePath: string, lockId: string, updates: any) => {
  await authedDataFetch(`/finance/periodLocks/${encodeURIComponent(lockId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deletePeriodLockShared = async (basePath: string, lockId: string) => {
  await authedDataFetch(`/finance/periodLocks/${encodeURIComponent(lockId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchOpeningBalancesShared = async (basePath: string) => {
  const result = await authedDataFetch(`/finance/openingBalances${query({ basePath })}`, { method: "GET" })
  return result?.rows || []
}

export const createOpeningBalanceShared = async (basePath: string, balance: any) => {
  const result = await authedDataFetch(`/finance/openingBalances`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: balance }),
  })
  return result?.row || { ...balance, id: String(result?.id || "") }
}

export const updateOpeningBalanceShared = async (basePath: string, balanceId: string, updates: any) => {
  await authedDataFetch(`/finance/openingBalances/${encodeURIComponent(balanceId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteOpeningBalanceShared = async (basePath: string, balanceId: string) => {
  await authedDataFetch(`/finance/openingBalances/${encodeURIComponent(balanceId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}
