// Manual Supabase implementation for the Stock module.
import * as firebaseProvider from "../../rtdatabase/Stock"
import type { PurchaseOrder, StockCount, StockItem, Supplier } from "../../interfaces/Stock"
import { authedDataFetch } from "./http"

export * from "../../rtdatabase/Stock"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

export const fetchSuppliers: typeof firebaseProvider.fetchSuppliers = async (basePath: string) => {
  const result = await authedDataFetch(`/stock/suppliers${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Supplier[]
}

export const fetchSuppliersData: typeof firebaseProvider.fetchSuppliersData = async (basePath: string) => {
  const result = await authedDataFetch(`/stock/suppliers${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Supplier[]
}

export const addSupplier: typeof firebaseProvider.addSupplier = async (basePath: string, supplier) => {
  const result = await authedDataFetch(`/stock/suppliers`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: supplier }),
  })
  return String(result?.id || "")
}

export const createSupplier: typeof firebaseProvider.createSupplier = async (supplierData, basePath: string) => {
  const result = await authedDataFetch(`/stock/suppliers`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: supplierData }),
  })
  return String(result?.id || "")
}

export const updateSupplier: typeof firebaseProvider.updateSupplier = async (basePath: string, supplierId: string, supplierData) => {
  await authedDataFetch(`/stock/suppliers/${encodeURIComponent(supplierId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates: supplierData }),
  })
}

export const deleteSupplier: typeof firebaseProvider.deleteSupplier = async (basePath: string, supplierId: string) => {
  await authedDataFetch(`/stock/suppliers/${encodeURIComponent(supplierId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchStockItems: typeof firebaseProvider.fetchStockItems = async (basePath: string) => {
  const result = await authedDataFetch(`/stock/items${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as StockItem[]
}

export const addStockItem: typeof firebaseProvider.addStockItem = async (basePath: string, item) => {
  const result = await authedDataFetch(`/stock/items`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: item }),
  })
  return String(result?.id || "")
}

export const updateStockItem: typeof firebaseProvider.updateStockItem = async (basePath: string, item) => {
  await authedDataFetch(`/stock/items/${encodeURIComponent(String(item.id))}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates: item }),
  })
}

export const fetchPurchaseOrders: typeof firebaseProvider.fetchPurchaseOrders = async (basePath: string) => {
  const result = await authedDataFetch(`/stock/purchaseOrders${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as PurchaseOrder[]
}

export const addPurchaseOrder: typeof firebaseProvider.addPurchaseOrder = async (basePath: string, purchaseOrder) => {
  const result = await authedDataFetch(`/stock/purchaseOrders`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: purchaseOrder }),
  })
  return String(result?.id || "")
}

export const updatePurchaseOrder: typeof firebaseProvider.updatePurchaseOrder = async (basePath: string, purchaseOrder) => {
  await authedDataFetch(`/stock/purchaseOrders/${encodeURIComponent(String(purchaseOrder.id))}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates: purchaseOrder }),
  })
}

export const deletePurchaseOrder: typeof firebaseProvider.deletePurchaseOrder = async (
  basePath: string,
  purchaseOrderId: string,
) => {
  await authedDataFetch(`/stock/purchaseOrders/${encodeURIComponent(purchaseOrderId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchAllStockCounts: typeof firebaseProvider.fetchAllStockCounts = async (basePath: string) => {
  const result = await authedDataFetch(`/stock/stockCounts${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as StockCount[]
}

export const saveStockCount: typeof firebaseProvider.saveStockCount = async (basePath: string, stock: StockCount) => {
  if (stock.id) {
    await authedDataFetch(`/stock/stockCounts/${encodeURIComponent(String(stock.id))}`, {
      method: "PATCH",
      body: JSON.stringify({ basePath, updates: stock }),
    })
    return
  }

  await authedDataFetch(`/stock/stockCounts`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: stock }),
  })
}

// ===== STOCK SETTINGS, TARGETS, INTEGRATIONS =====

export const fetchStockSettings: typeof firebaseProvider.fetchStockSettings = async (path: string) => {
  const result = await authedDataFetch(`/stock/settings${query({ path })}`, { method: "GET" })
  return result || null
}

export const saveStockSettings: typeof firebaseProvider.saveStockSettings = async (path: string, settings: any) => {
  await authedDataFetch(`/stock/settings`, {
    method: "PUT",
    body: JSON.stringify({ path, settings: { ...settings, updatedAt: Date.now() } }),
  })
}

export const fetchStockTargets: typeof firebaseProvider.fetchStockTargets = async (path: string) => {
  const result = await authedDataFetch(`/stock/targets${query({ path })}`, { method: "GET" })
  return (result?.targets || []) as any[]
}

export const saveStockTarget: typeof firebaseProvider.saveStockTarget = async (path: string, targetId: string, target: any) => {
  const clean = Object.fromEntries(Object.entries(target).filter(([, v]) => v !== undefined))
  await authedDataFetch(`/stock/targets/${encodeURIComponent(targetId)}`, {
    method: "PUT",
    body: JSON.stringify({ path, target: clean }),
  })
}

export const deleteStockTarget: typeof firebaseProvider.deleteStockTarget = async (path: string, targetId: string) => {
  await authedDataFetch(`/stock/targets/${encodeURIComponent(targetId)}${query({ path })}`, {
    method: "DELETE",
  })
}

export const fetchStockIntegrations: typeof firebaseProvider.fetchStockIntegrations = async (path: string) => {
  const result = await authedDataFetch(`/stock/integrations${query({ path })}`, { method: "GET" })
  return result || {}
}

export const saveStockIntegration: typeof firebaseProvider.saveStockIntegration = async (path: string, integration: any) => {
  if (!integration?.id) return
  const clean = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
  await authedDataFetch(`/stock/integrations/${encodeURIComponent(integration.id)}`, {
    method: "PUT",
    body: JSON.stringify({ path, integration: clean }),
  })
}
