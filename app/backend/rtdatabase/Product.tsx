import { db, ref, get, set, push, update, remove } from "../services/Firebase"

// Product interface (basic structure)
interface Product {
  id: string
  name: string
  description?: string
  price: number
  category?: string
  sku?: string
  barcode?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface ProductCategory {
  id: string
  name: string
  description?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// Products
export const fetchProducts = async (basePath: string): Promise<Product[]> => {
  try {
    const productsRef = ref(db, `${basePath}/products`)
    const snapshot = await get(productsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching products:", error)
    throw error
  }
}

export const createProduct = async (basePath: string, product: Omit<Product, "id">): Promise<Product> => {
  try {
    const productsRef = ref(db, `${basePath}/products`)
    const newProductRef = push(productsRef)
    const id = newProductRef.key as string

    const newProduct = {
      ...product,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newProductRef, newProduct)
    return newProduct
  } catch (error) {
    console.error("Error creating product:", error)
    throw error
  }
}

export const updateProduct = async (basePath: string, productId: string, updates: Partial<Product>): Promise<void> => {
  try {
    const productRef = ref(db, `${basePath}/products/${productId}`)
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await update(productRef, updatedFields)
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

export const deleteProduct = async (basePath: string, productId: string): Promise<void> => {
  try {
    const productRef = ref(db, `${basePath}/products/${productId}`)
    await remove(productRef)
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

// Product Categories
export const fetchProductCategories = async (basePath: string): Promise<ProductCategory[]> => {
  try {
    const categoriesRef = ref(db, `${basePath}/productCategories`)
    const snapshot = await get(categoriesRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching product categories:", error)
    throw error
  }
}

export const createProductCategory = async (
  basePath: string,
  category: Omit<ProductCategory, "id">,
): Promise<ProductCategory> => {
  try {
    const categoriesRef = ref(db, `${basePath}/productCategories`)
    const newCategoryRef = push(categoriesRef)
    const id = newCategoryRef.key as string

    const newCategory = {
      ...category,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newCategoryRef, newCategory)
    return newCategory
  } catch (error) {
    console.error("Error creating product category:", error)
    throw error
  }
}

export const updateProductCategory = async (
  basePath: string,
  categoryId: string,
  updates: Partial<ProductCategory>,
): Promise<void> => {
  try {
    const categoryRef = ref(db, `${basePath}/productCategories/${categoryId}`)
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await update(categoryRef, updatedFields)
  } catch (error) {
    console.error("Error updating product category:", error)
    throw error
  }
}

export const deleteProductCategory = async (basePath: string, categoryId: string): Promise<void> => {
  try {
    const categoryRef = ref(db, `${basePath}/productCategories/${categoryId}`)
    await remove(categoryRef)
  } catch (error) {
    console.error("Error deleting product category:", error)
    throw error
  }
}

// Product search and filtering
export const searchProducts = async (basePath: string, searchTerm: string, categoryId?: string): Promise<Product[]> => {
  try {
    const products = await fetchProducts(basePath)

    let filteredProducts = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())),
    )

    if (categoryId) {
      filteredProducts = filteredProducts.filter((product) => product.category === categoryId)
    }

    return filteredProducts
  } catch (error) {
    console.error("Error searching products:", error)
    throw error
  }
}

// Product by barcode
export const getProductByBarcode = async (basePath: string, barcode: string): Promise<Product | null> => {
  try {
    const products = await fetchProducts(basePath)
    const product = products.find((p) => p.barcode === barcode)
    return product || null
  } catch (error) {
    console.error("Error getting product by barcode:", error)
    throw error
  }
}
