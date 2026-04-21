import { beforeEach, describe, expect, it, vi } from "vitest"

const firebaseMocks = vi.hoisted(() => {
  const state = {
    stock: 100,
    setCalls: [] as Array<{ path: string; value: any }>,
    updateCalls: [] as Array<{ path: string; value: any }>,
    removeCalls: [] as string[],
  }

  const db = {}
  const ref = vi.fn((_db: any, path: string) => ({ path }))
  const child = vi.fn((parent: any, id: string) => ({ path: `${parent.path}/${id}` }))
  const set = vi.fn(async (target: any, value: any) => {
    state.setCalls.push({ path: target.path, value })
  })
  const update = vi.fn(async (target: any, value: any) => {
    state.updateCalls.push({ path: target.path, value })
  })
  const remove = vi.fn(async (target: any) => {
    state.removeCalls.push(target.path)
  })
  const push = vi.fn((target: any) => ({ key: "new-id", path: `${target.path}/new-id` }))
  const onValue = vi.fn()
  const runTransaction = vi.fn(async (_target: any, updater: (current: any) => any) => {
    const next = updater({ currentStock: state.stock })
    if (next && typeof next.currentStock === "number") {
      state.stock = next.currentStock
    }
    return { committed: true, snapshot: { val: () => ({ currentStock: state.stock }) } }
  })

  const get = vi.fn(async (target: any) => {
    const path = target.path
    if (path.endsWith("/stockCounts")) {
      return {
        exists: () => true,
        val: () => ({
          oldCount: {
            dateUK: "2026-01-01",
            items: {
              "p-1": {
                name: "Old Item",
                measureId: "m1",
                unitName: "unit",
                countedQuantity: 2,
                countedTotal: 2,
                previousQuantity: 1,
                salesDivisionId: "sd1",
                categoryId: "c1",
                subcategoryId: "sc1",
                type: "stock",
              },
            },
          },
          latestCount: {
            dateUK: "2026-02-01",
            items: {
              "p-1": {
                name: "Latest Item",
                measureId: "m1",
                unitName: "unit",
                countedQuantity: 5,
                countedTotal: 5,
                previousQuantity: 2,
                salesDivisionId: "sd1",
                categoryId: "c1",
                subcategoryId: "sc1",
                type: "stock",
              },
            },
          },
        }),
      }
    }

    if (path.endsWith("/purchases")) {
      return {
        exists: () => true,
        val: () => ({
          "purchase-1": { supplierId: "sup-1", items: [] },
        }),
      }
    }

    if (path.includes("/parProfiles")) {
      return {
        exists: () => true,
        val: () => ({
          "profile-1": { name: "Standard", parLevels: {} },
        }),
      }
    }

    return { exists: () => false, val: () => null }
  })

  return { state, db, ref, child, set, update, remove, push, onValue, get, runTransaction }
})

vi.mock("../services/Firebase", () => ({
  db: firebaseMocks.db,
  ref: firebaseMocks.ref,
  child: firebaseMocks.child,
  set: firebaseMocks.set,
  update: firebaseMocks.update,
  remove: firebaseMocks.remove,
  push: firebaseMocks.push,
  onValue: firebaseMocks.onValue,
  get: firebaseMocks.get,
  runTransaction: firebaseMocks.runTransaction,
}))

import {
  deleteParProfile,
  fetchParProfiles,
  fetchPurchasesHistoryFromBasePath,
  getStockCount,
  saveParLevelProfile,
  updateProductStockLevel,
} from "./Stock"

describe("Stock regression tests", () => {
  beforeEach(() => {
    firebaseMocks.state.stock = 100
    firebaseMocks.state.setCalls = []
    firebaseMocks.state.updateCalls = []
    firebaseMocks.state.removeCalls = []
    firebaseMocks.ref.mockClear()
    firebaseMocks.get.mockClear()
    firebaseMocks.runTransaction.mockClear()
  })

  it("uses stock-root path for purchases history", async () => {
    await fetchPurchasesHistoryFromBasePath("companies/c1/sites/s1/data/stock")
    expect(firebaseMocks.ref).toHaveBeenCalledWith(
      firebaseMocks.db,
      "companies/c1/sites/s1/data/stock/purchases",
    )
  })

  it("uses stock-root path for parProfiles CRUD", async () => {
    await fetchParProfiles("companies/c1/sites/s1/data/stock")
    await saveParLevelProfile("companies/c1/sites/s1/data/stock", {
      id: "profile-1",
      name: "Standard",
      parLevels: {},
    } as any)
    await deleteParProfile("companies/c1/sites/s1/data/stock", "profile-1")

    expect(firebaseMocks.ref).toHaveBeenCalledWith(
      firebaseMocks.db,
      "companies/c1/sites/s1/data/stock/parProfiles",
    )
    expect(firebaseMocks.ref).toHaveBeenCalledWith(
      firebaseMocks.db,
      "companies/c1/sites/s1/data/stock/parProfiles/profile-1",
    )
  })

  it("extracts latest stock count instead of root-level items", async () => {
    const result = await getStockCount("companies/c1/sites/s1/data/stock")
    expect(result.date).toBe("2026-02-01")
    expect(result.stockData).toHaveLength(1)
    expect(result.stockData[0].name).toBe("Latest Item")
  })

  it("applies stock updates through transaction to avoid lost updates", async () => {
    await Promise.all([
      updateProductStockLevel("companies/c1/sites/s1/data/stock", "p-1", -10),
      updateProductStockLevel("companies/c1/sites/s1/data/stock", "p-1", -5),
    ])

    expect(firebaseMocks.runTransaction).toHaveBeenCalledTimes(2)
    expect(firebaseMocks.state.stock).toBe(85)
  })
})

