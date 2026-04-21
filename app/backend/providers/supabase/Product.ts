import * as firebaseProvider from "../../rtdatabase/Product"
import { authedDataFetch } from "./http"

export * from "../../rtdatabase/Product"

type ProductRecord = Awaited<ReturnType<typeof firebaseProvider.fetchProducts>>[number]
type ProductCategoryRecord = Awaited<ReturnType<typeof firebaseProvider.fetchProductCategories>>[number]

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const normalizeProduct = (value: any): ProductRecord => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  description: value?.description || undefined,
  price: typeof value?.price === "number" ? value.price : Number(value?.price || 0),
  category: value?.category || undefined,
  sku: value?.sku || undefined,
  barcode: value?.barcode || undefined,
  active: value?.active !== false,
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const normalizeCategory = (value: any): ProductCategoryRecord => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  description: value?.description || undefined,
  active: value?.active !== false,
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const lower = (value: unknown) => String(value || "").toLowerCase()

export const fetchProducts: typeof firebaseProvider.fetchProducts = async (basePath: string) => {
  const result = await authedDataFetch(`/product/products${query({ basePath })}`, { method: "GET" })
  return ((result?.rows || []) as any[]).map(normalizeProduct)
}

export const createProduct: typeof firebaseProvider.createProduct = async (basePath: string, product) => {
  const result = await authedDataFetch(`/product/products`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: product }),
  })
  return normalizeProduct(result?.row || { ...product, id: result?.id })
}

export const updateProduct: typeof firebaseProvider.updateProduct = async (basePath: string, productId: string, updates) => {
  await authedDataFetch(`/product/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteProduct: typeof firebaseProvider.deleteProduct = async (basePath: string, productId: string) => {
  await authedDataFetch(`/product/products/${encodeURIComponent(productId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchProductCategories: typeof firebaseProvider.fetchProductCategories = async (basePath: string) => {
  const result = await authedDataFetch(`/product/productCategories${query({ basePath })}`, { method: "GET" })
  return ((result?.rows || []) as any[]).map(normalizeCategory)
}

export const createProductCategory: typeof firebaseProvider.createProductCategory = async (basePath: string, category) => {
  const result = await authedDataFetch(`/product/productCategories`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: category }),
  })
  return normalizeCategory(result?.row || { ...category, id: result?.id })
}

export const updateProductCategory: typeof firebaseProvider.updateProductCategory = async (
  basePath: string,
  categoryId: string,
  updates,
) => {
  await authedDataFetch(`/product/productCategories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteProductCategory: typeof firebaseProvider.deleteProductCategory = async (
  basePath: string,
  categoryId: string,
) => {
  await authedDataFetch(`/product/productCategories/${encodeURIComponent(categoryId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const searchProducts: typeof firebaseProvider.searchProducts = async (
  basePath: string,
  searchTerm: string,
  categoryId?: string,
) => {
  let rows = await fetchProducts(basePath)
  const term = lower(searchTerm)

  rows = rows.filter(
    (row) =>
      lower(row.name).includes(term) ||
      lower(row.description).includes(term) ||
      lower(row.sku).includes(term),
  )

  if (categoryId) {
    rows = rows.filter((row) => row.category === categoryId)
  }

  return rows
}

export const getProductByBarcode: typeof firebaseProvider.getProductByBarcode = async (
  basePath: string,
  barcode: string,
) => {
  const rows = await fetchProducts(basePath)
  return rows.find((row) => row.barcode === barcode) || null
}
