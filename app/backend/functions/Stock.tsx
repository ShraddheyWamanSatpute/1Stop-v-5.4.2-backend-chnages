"use client"
import type {
  Product,
  Supplier,
  StockData
} from "../interfaces/Stock"
import { debugWarn } from "../utils/debugLog"

// ===== BUSINESS LOGIC FUNCTIONS =====

export function shouldApplyTransferStockMovement(transfer: { status?: string; stockAdjustedAt?: string }): boolean {
  return transfer.status === "Approved" && !transfer.stockAdjustedAt
}

// Permission functions
export function canViewStock(hasPermission: (permission: string) => boolean): boolean {
  return hasPermission("stock.view")
}

export function canEditStock(hasPermission: (permission: string) => boolean): boolean {
  return hasPermission("stock.edit")
}

export function canDeleteStock(hasPermission: (permission: string) => boolean): boolean {
  return hasPermission("stock.delete")
}

export function isOwnerCheck(isOwner: () => boolean): boolean {
  return isOwner()
}

// ===== PRODUCT CRUD FUNCTIONS =====

export async function createProduct(basePath: string, product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> {
  const StockDB = await import("../data/Stock")
  return await StockDB.createProduct(basePath, product)
}

export async function updateProduct(basePath: string, productId: string, updates: Partial<Product>): Promise<void> {
  const StockDB = await import("../data/Stock")
  return await StockDB.updateProduct(basePath, productId, updates)
}

// ===== UTILITY FUNCTIONS =====

// Google Maps utility functions
export function getGoogleMapsApiKey(): string {
  return (
    (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : undefined) ||
    ((typeof import.meta !== "undefined" ? (import.meta as any).env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : undefined)) ||
    ""
  )
}

export function parseAddressComponents(components: any[]): any {
  if (typeof window === "undefined") return {}
  
  const comps = components || []
  const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || ""
  
  const streetNumber = get("street_number")
  const route = get("route")
  const address = [streetNumber, route].filter(Boolean).join(" ")
  
  const city = get("locality") || get("postal_town") || get("sublocality")
  const state = get("administrative_area_level_1")
  const postcode = get("postal_code")
  const country = get("country")
  
  return {
    address,
    city,
    state,
    postcode,
    country
  }
}

// ===== DATA PROCESSING FUNCTIONS =====

// Stock data aggregation function
export function getStockData(products: Product[], suppliers: Supplier[], measures: any[]): StockData {
  return {
    products,
    suppliers,
    measures,
    salesDivisions: [],
    categories: [],
    subcategories: [],
    totalProducts: products.length,
    totalSuppliers: suppliers.length,
    totalMeasures: measures.length
  }
}

// ParLevel Helper Functions
export function getParLevelValue(value: number | { parLevel: number; measureId: string }): number {
  if (typeof value === 'number') {
    return value;
  }
  return value.parLevel;
}

export function getParLevelMeasureId(value: number | { parLevel: number; measureId: string }): string | undefined {
  if (typeof value === 'number') {
    return undefined;
  }
  return value.measureId;
}

// ===== DATA REFRESH FUNCTIONS =====

export async function refreshProducts(
  basePath: string, 
  fetchProducts: (basePath: string) => Promise<Product[]>,
  dispatch: (action: any) => void
): Promise<void> {
  if (!basePath) {
    dispatch({ type: "SET_LOADING", payload: false })
    return
  }

  try {
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })
    
    const products = await fetchProducts(basePath)
    
    dispatch({ type: "SET_PRODUCTS", payload: products })
    dispatch({ type: "SET_LOADING", payload: false })
  } catch (error) {
    debugWarn("Error refreshing products:", error)
    dispatch({ type: "SET_LOADING", payload: false })
    dispatch({ type: "SET_ERROR", payload: "Failed to refresh products" })
  }
}

export async function refreshSuppliers(
  basePath: string, 
  fetchSuppliersFromBasePath: (basePath: string) => Promise<any[]>,
  dispatch: (action: any) => void
): Promise<void> {
  if (!basePath) return

  try {
    const suppliers = await fetchSuppliersFromBasePath(basePath)
    dispatch({ type: "SET_SUPPLIERS", payload: suppliers })
  } catch (error) {
    debugWarn("Error refreshing suppliers:", error)
  }
}

export async function refreshMeasures(
  basePath: string, 
  fetchMeasuresFromBasePath: (basePath: string) => Promise<any[]>,
  dispatch: (action: any) => void
): Promise<void> {
  if (!basePath) return

  try {
    const measures = await fetchMeasuresFromBasePath(basePath)
    dispatch({ type: "SET_MEASURES", payload: measures })
  } catch (error) {
    debugWarn("Error refreshing measures:", error)
  }
}

export async function refreshAll(
  basePath: string,
  isLoading: React.MutableRefObject<boolean>,
  lastLoadedPath: React.MutableRefObject<string>,
  isInitialized: React.MutableRefObject<boolean>,
  dispatch: (action: any) => void,
  fetchProducts: (basePath: string) => Promise<Product[]>,
  fetchMeasuresFromBasePath: (basePath: string) => Promise<any[]>,
  fetchSuppliersFromBasePath: (basePath: string) => Promise<any[]>,
  fetchCategories: (basePath: string) => Promise<any[]>,
  fetchSubcategories: (basePath: string) => Promise<any[]>,
  fetchSalesDivisions: (basePath: string) => Promise<any[]>,
  fetchCourses: (basePath: string) => Promise<any[]>,
  fetchLatestCountsForProducts: (basePath: string) => Promise<Record<string, any>>
): Promise<void> {
  if (!basePath || isLoading.current) {
    dispatch({ type: "SET_LOADING", payload: false })
    return
  }
  
  // Prevent duplicate loading for same path
  if (basePath === lastLoadedPath.current && isInitialized.current) {
    dispatch({ type: "SET_LOADING", payload: false })
    return
  }

  try {
    // Set loading state
    isLoading.current = true
    lastLoadedPath.current = basePath
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })

    // IMMEDIATE: Load only critical stock data for basic functionality
    const [products, measures] = await Promise.all([
      fetchProducts(basePath),
      fetchMeasuresFromBasePath(basePath),
    ])

    // Update state with critical data first
    dispatch({ type: "SET_PRODUCTS", payload: products })
    dispatch({ type: "SET_MEASURES", payload: measures })

    // BACKGROUND: Load additional data for enhanced functionality
    const [
      suppliers,
      categories,
      subcategories,
      salesDivisions,
      courses,
      latestCounts
    ] = await Promise.all([
      fetchSuppliersFromBasePath(basePath),
      fetchCategories(basePath),
      fetchSubcategories(basePath),
      fetchSalesDivisions(basePath),
      fetchCourses(basePath),
      fetchLatestCountsForProducts(basePath),
    ])

    // Update state with additional data
    dispatch({
      type: "SET_ALL_DATA",
      payload: {
        products,
        suppliers,
        measures,
        salesDivisions,
        categories,
        subcategories,
        courses,
        purchases: [],
        stockCounts: [],
        stockItems: [],
        purchaseOrders: [],
        latestCounts,
        purchaseHistory: [],
        salesHistory: [],
      },
    })

    // Mark as initialized
    isInitialized.current = true
    dispatch({ type: "SET_LOADING", payload: false })
    isLoading.current = false
  } catch (error) {
    debugWarn("Error refreshing all data:", error)
    dispatch({ type: "SET_ERROR", payload: "Failed to load stock data" })
    dispatch({ type: "SET_LOADING", payload: false })
    isLoading.current = false
  }
}

// Category CRUD functions
export async function createCategory(basePath: string, categoryData: any): Promise<string> {
  const { createCategory: createCategoryRTDB } = await import('../data/Stock')
  const id = await createCategoryRTDB(categoryData, basePath)
  return id || ""
}

export async function updateCategory(basePath: string, categoryId: string, categoryData: any): Promise<void> {
  const { updateCategory: updateCategoryRTDB } = await import('../data/Stock')
  await updateCategoryRTDB(categoryId, categoryData, basePath, categoryData.kind)
}

export async function deleteCategory(basePath: string, categoryId: string): Promise<void> {
  const { deleteCategory: deleteCategoryRTDB } = await import('../data/Stock')
  await deleteCategoryRTDB(categoryId, 'Category', basePath)
}

// Stock Location CRUD functions
export async function createStockLocation(basePath: string, locationData: any): Promise<string> {
  const { addStockLocation } = await import('../data/Stock')
  return await addStockLocation(basePath, locationData)
}

export async function updateStockLocation(basePath: string, locationId: string, locationData: any): Promise<void> {
  const { updateStockLocation: updateStockLocationRTDB } = await import('../data/Stock')
  await updateStockLocationRTDB(basePath, { ...locationData, id: locationId })
}

export async function deleteStockLocation(basePath: string, locationId: string): Promise<void> {
  const { deleteStockLocation: deleteStockLocationRTDB } = await import('../data/Stock')
  await deleteStockLocationRTDB(basePath, locationId)
}

// Par Level CRUD functions
export async function createParLevel(basePath: string, parLevelData: any): Promise<string> {
  const { saveParLevel } = await import('../data/Stock')
  return await saveParLevel(basePath, parLevelData)
}

export async function updateParLevel(basePath: string, parLevelId: string, parLevelData: any): Promise<void> {
  const { saveParLevel } = await import('../data/Stock')
  await saveParLevel(basePath, { ...parLevelData, id: parLevelId })
}

export async function deleteParLevel(basePath: string, parLevelId: string): Promise<void> {
  const { deleteParLevel: deleteParLevelRTDB } = await import('../data/Stock')
  await deleteParLevelRTDB(basePath, parLevelId)
}

// ===== STOCK CALCULATION HELPER FUNCTIONS =====

/**
 * Convert quantity to base units (g for weight, ml for volume, or base unit for counts)
 * 
 * FORMULA: quantity * measure.quantity * unit_multiplier
 * 
 * Where:
 * - quantity: Number of measure units being counted/sold/purchased
 * - measure.quantity: How many base units are in ONE measure unit
 * - unit_multiplier: 1000 for kg→g or l→ml, otherwise 1
 * 
 * EXAMPLES:
 * 1. Measure "6-pack" has quantity=6, unit="single"
 *    User counts 5 units → 5 * 6 * 1 = 30 singles
 * 
 * 2. Measure "Case" has quantity=2, unit="kg"
 *    User counts 3 units → 3 * 2 * 1000 = 6,000g
 * 
 * 3. Measure "Bottle" has quantity=750, unit="ml"
 *    User counts 4 units → 4 * 750 * 1 = 3,000ml
 * 
 * 4. Measure "Box" has quantity=0.5, unit="kg"
 *    User counts 10 units → 10 * 0.5 * 1000 = 5,000g
 * 
 * @param quantity - The quantity to convert (number of measure units)
 * @param measureId - The measure ID to look up
 * @param measures - Array of measure definitions
 * @returns Quantity in base units (g, ml, or base count)
 */
/**
 * Check for missing measures in data and log a single summary if any are found
 * Call this after all measures are loaded to provide diagnostic information
 * This prevents spam from logging warnings for each convertToBaseUnits call
 */
export function checkForMissingMeasures(
  products: any[],
  sales: any[],
  purchases: any[],
  measures: any[]
): void {
  if (!measures || measures.length === 0) return
  
  // Track if we've already logged a summary to avoid duplicate logs
  if (typeof window !== 'undefined' && (window as any).__hasLoggedMissingMeasuresSummary) {
    return
  }
  
  const measureIds = new Set(measures.map((m: any) => m.id))
  const referencedMeasureIds = new Set<string>()
  
  // Collect all measure IDs referenced in products
  products.forEach((p: any) => {
    if (p.purchase?.defaultMeasure) referencedMeasureIds.add(p.purchase.defaultMeasure)
    if (p.sale?.defaultMeasure) referencedMeasureIds.add(p.sale.defaultMeasure)
    if (p.purchase?.measure) referencedMeasureIds.add(p.purchase.measure)
    if (p.sale?.measure) referencedMeasureIds.add(p.sale.measure)
    if (p.purchase?.units) {
      p.purchase.units.forEach((u: any) => {
        if (u.measure) referencedMeasureIds.add(u.measure)
      })
    }
    if (p.sale?.units) {
      p.sale.units.forEach((u: any) => {
        if (u.measure) referencedMeasureIds.add(u.measure)
      })
    }
  })
  
  // Collect all measure IDs referenced in sales
  sales.forEach((s: any) => {
    if (s.measureId) referencedMeasureIds.add(s.measureId)
  })
  
  // Collect all measure IDs referenced in purchases
  purchases.forEach((p: any) => {
    if (p.measureId) referencedMeasureIds.add(p.measureId)
    if (p.items) {
      p.items.forEach((item: any) => {
        if (item.measureId) referencedMeasureIds.add(item.measureId)
      })
    }
  })
  
  // Find missing measures
  const missing = Array.from(referencedMeasureIds).filter(id => {
    // Ignore empty strings, "unit", and known fallback values
    if (!id || id.toLowerCase() === "unit") return false
    return !measureIds.has(id)
  })
  
  // Only log if there are missing measures AND we haven't logged this session
  // Also only log if there's a significant number (more than 10) to avoid noise from minor data issues
  if (missing.length > 10) {
    // Check if we've already logged this warning - use a more persistent check
    const logKey = '__hasLoggedMissingMeasuresSummary'
    if (typeof window !== 'undefined' && (window as any)[logKey]) {
      return // Already logged this session
    }
    
    // Only show summary, not individual IDs (to reduce console noise)
    debugWarn(
      `⚠️ Stock Data: ${missing.length} referenced measure ID(s) not found in measures collection. This may affect unit conversions.`
    )
    
    // Mark as logged for this session
    if (typeof window !== 'undefined') {
      (window as any)[logKey] = true
    }
  }
}

export function convertToBaseUnits(quantity: number, measureId: string, measures: any[]): number {
  // Validate inputs
  if (!quantity || quantity < 0) return 0
  if (!measureId) {
    return quantity
  }
  if (!measures || measures.length === 0) {
    return quantity
  }
  
  // Handle special case: "unit" is a common fallback value that means 1 base unit
  if (measureId.toLowerCase() === "unit" || measureId === "") {
    return quantity
  }
  
  // Find the measure definition (support legacy IDs)
  const measure = measures.find((m) => {
    const id = String((m as any)?.id ?? "")
    const legacy =
      String(
        (m as any)?.measureID ??
          (m as any)?.measureId ??
          (m as any)?.legacyId ??
          "",
      )
    return id === measureId || (legacy && legacy === measureId)
  })
  if (!measure) {
    // Allow raw unit codes (base units) to be used directly (e.g. recipe ingredient measures)
    const unit = String(measureId || "").toLowerCase().trim()
    if (unit === "kg") return quantity * 1000
    if (unit === "g") return quantity
    if (unit === "l" || unit === "litre" || unit === "liter") return quantity * 1000
    if (unit === "ml") return quantity
    if (unit === "unit" || unit === "single" || unit === "pcs" || unit === "piece") return quantity

    // Silently handle missing measures - summary is logged after data loads via checkForMissingMeasures
    return quantity
  }
  
  // Get unit and quantity from measure (supports legacy fields)
  const rawUnit =
    measure.unit ??
    measure.baseUnit ??
    measure.baseunit ??
    measure.uom ??
    measure.UOM ??
    ""
  const unit = String(rawUnit || "").toLowerCase().trim()

  const rawQty =
    measure.quantity ??
    measure.conversionFactor ??
    measure.conversion ??
    measure.factor ??
    measure.multiplier ??
    1
  const measureQuantity = Number(rawQty) || 1
  
  // Validate measure quantity
  if (measureQuantity <= 0) {
    debugWarn(`convertToBaseUnits: Invalid measure quantity (${measureQuantity}) for measure ${measureId}`)
    return quantity
  }
  
  // Base conversion: quantity * measure.quantity
  let baseQuantity = quantity * measureQuantity
  
  // Apply unit multiplier for weight/volume conversions
  if (unit === "kg") {
    baseQuantity *= 1000  // kg to g
  } else if (unit === "l" || unit === "litre" || unit === "liter") {
    baseQuantity *= 1000  // l to ml
  }
  // For other units (g, ml, single, unit, etc.), no multiplier needed
  
  return baseQuantity
}

/**
 * Get the base unit for a measure (g for kg, ml for l, or the original unit)
 * @param measureId - The measure ID
 * @param measures - Array of measure definitions
 * @returns Base unit string
 */
export function getBaseUnit(measureId: string, measures: any[]): string {
  if (!measureId || measureId.toLowerCase() === "unit") return "unit"
  const measure = measures.find((m) => {
    const id = String((m as any)?.id ?? "")
    const legacy =
      String(
        (m as any)?.measureID ??
          (m as any)?.measureId ??
          (m as any)?.legacyId ??
          "",
      )
    return id === measureId || (legacy && legacy === measureId)
  })
  // If a referenced measure is missing, fall back to unit (prevents empty labels / NaN downstream).
  if (!measure) {
    // If a raw unit code was provided, normalize it to its base unit
    const unit = String(measureId || "").toLowerCase().trim()
    if (unit === "kg") return "g"
    if (unit === "g") return "g"
    if (unit === "l" || unit === "litre" || unit === "liter") return "ml"
    if (unit === "ml") return "ml"
    if (unit) return unit
    return "unit"
  }
  
  const rawUnit =
    measure.unit ??
    measure.baseUnit ??
    measure.baseunit ??
    measure.uom ??
    measure.UOM ??
    "unit"
  const unit = String(rawUnit).toLowerCase()
  if (unit === "kg") return "g"
  if (unit === "l") return "ml"
  return String(rawUnit || "unit")
}

// Prefer measureId, fallback to measure (data compatibility across app)
function getUnitMeasureId(unit: any): string | null {
  if (!unit) return null
  return unit.measureId || unit.measure || null
}

function unitMatchesMeasureId(unit: any, measureId: string | undefined): boolean {
  if (!unit || !measureId) return false
  return getUnitMeasureId(unit) === measureId
}

/**
 * Get price for a product's default sales measure
 * Uses the sale.units array with sale.defaultMeasure
 * @param product - The product
 * @returns Price for default sales measure, or 0
 */
export function getDefaultSalePrice(product: any): number {
  if (!product.sale?.units || !product.sale?.defaultMeasure) {
    return product.salesPrice || product.sale?.price || 0
  }
  
  const defaultUnit = product.sale.units.find(
    (u: any) => unitMatchesMeasureId(u, product.sale.defaultMeasure)
  )
  
  return defaultUnit?.price || product.salesPrice || product.sale?.price || 0
}

/**
 * Get price for a product's default purchase measure
 * Uses the purchase.units array with purchase.defaultMeasure
 * @param product - The product
 * @returns Price for default purchase measure, or 0
 */
export function getDefaultPurchasePrice(product: any): number {
  const toNumber = (v: any): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string") {
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }
  
  const units = Array.isArray(product.purchase?.units) ? product.purchase.units : []
  const defaultMeasureId = product.purchase?.defaultMeasure
  const legacyMeasureId = product.purchase?.measure
  const preferredSupplierId = product.purchase?.defaultSupplier || product.purchase?.supplierId || product.supplierId

  const byMeasure = (measureId: string | undefined) =>
    measureId ? units.find((u: any) => unitMatchesMeasureId(u, measureId)) : undefined

  const byMeasureAndSupplier = (measureId: string | undefined, supplierId: string | undefined) => {
    if (!measureId || !supplierId) return undefined
    return units.find(
      (u: any) =>
        unitMatchesMeasureId(u, measureId) &&
        String(u?.supplierId || "") === String(supplierId),
    )
  }

  // Prefer (defaultMeasure + defaultSupplier) when available, then defaultMeasure, then legacy purchase.measure.
  const defaultUnit =
    byMeasureAndSupplier(defaultMeasureId, preferredSupplierId) ||
    byMeasure(defaultMeasureId) ||
    byMeasureAndSupplier(legacyMeasureId, preferredSupplierId) ||
    byMeasure(legacyMeasureId)

  // If no matching unit (or no defaultMeasure set), fall back to a sensible unit:
  // - supplier match, else first priced unit, else first unit.
  const supplierUnit =
    preferredSupplierId ? units.find((u: any) => String(u?.supplierId || "") === String(preferredSupplierId)) : undefined
  const pricedUnit = units.find((u: any) => toNumber(u?.price) > 0)
  const fallbackUnit = defaultUnit || supplierUnit || pricedUnit || units[0]

  const unitPrice = toNumber(fallbackUnit?.price)
  return unitPrice || toNumber(product.purchasePrice) || toNumber(product.purchase?.price) || 0
}

/**
 * Calculate current/predicted stock from stock counts, purchases, and sales
 * Formula: Latest Stock Count + Purchases Since Count - Sales Since Count (all in base units)
 * @param productId - The product ID
 * @param stockCounts - Array of stock counts
 * @param purchases - Array of purchases
 * @param sales - Array of sales
 * @param measures - Array of measure definitions
 * @param endDate - Calculate stock up to this date (defaults to now)
 * @returns Stock quantity in base units
 */
export function calculateCurrentStock(
  productId: string,
  stockCounts: any[],
  purchases: any[],
  sales: any[],
  measures: any[],
  endDate: Date = new Date()
): { quantity: number; baseUnit: string } {
  // Find the most recent stock count before endDate
  const relevantCounts = stockCounts
    .filter((sc: any) => {
      const countDate = new Date(sc.dateUK || sc.date || 0)
      return countDate <= endDate && sc.items?.some((item: any) => item.id === productId)
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.dateUK || a.date || 0).getTime()
      const dateB = new Date(b.dateUK || b.date || 0).getTime()
      return dateB - dateA // Most recent first
    })
  
  let stockQuantity = 0
  let baseUnit = "unit"
  const lastCountDate = new Date(0)
  
  if (relevantCounts.length > 0) {
    const latestCount = relevantCounts[0]
    const countItems = latestCount.items.filter((item: any) => item.id === productId)
    
    // Sum all items for this product in the count (in base units)
    countItems.forEach((item: any) => {
      const baseQty = convertToBaseUnits(item.countedTotal || 0, item.measureId, measures)
      stockQuantity += baseQty
      
      // Set base unit from first item
      if (!baseUnit || baseUnit === "unit") {
        baseUnit = getBaseUnit(item.measureId, measures)
      }
    })
    
    lastCountDate.setTime(new Date(latestCount.dateUK || latestCount.date || 0).getTime())
  }
  
  // Add purchases since last count (in base units)
  purchases.forEach((purchase: any) => {
    const purchaseDate = new Date(purchase.dateUK || purchase.orderDate || purchase.date || 0)
    if (purchaseDate > lastCountDate && purchaseDate <= endDate && purchase.items) {
      purchase.items.forEach((item: any) => {
        if (item.itemID === productId || item.productId === productId) {
          const baseQty = convertToBaseUnits(item.quantity || 0, item.measureId, measures)
          stockQuantity += baseQty
        }
      })
    }
  })
  
  // Subtract sales since last count (in base units)
  sales.forEach((sale: any) => {
    const saleDate = new Date(sale.tradingDate || sale.date || 0)
    if (saleDate > lastCountDate && saleDate <= endDate) {
      if (sale.productId === productId || sale.itemID === productId) {
        const baseQty = convertToBaseUnits(sale.quantity || 0, sale.measureId, measures)
        stockQuantity -= baseQty
      }
    }
  })
  
  return {
    quantity: Math.max(0, stockQuantity),
    baseUnit
  }
}

/**
 * Calculate stock accuracy from variance between predicted and actual counts
 * @param predictedStock - Predicted stock in base units
 * @param actualCount - Actual counted stock in base units
 * @returns Accuracy percentage (0-100)
 */
export function calculateStockAccuracy(predictedStock: number, actualCount: number): number {
  if (actualCount === 0) return 0
  
  const variance = Math.abs(predictedStock - actualCount)
  const accuracy = Math.max(0, 100 - (variance / actualCount * 100))
  
  return Math.round(accuracy * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate stock turnover using standard formula: COGS / Average Inventory Value
 * @param products - Array of products with stock and price data
 * @param sales - Array of sales
 * @param measures - Array of measure definitions
 * @param periodDays - Period in days to calculate turnover (default 30)
 * @returns Stock turnover ratio
 */
export function calculateStockTurnover(
  products: any[],
  sales: any[],
  measures: any[],
  periodDays: number = 30
): number {
  // Calculate COGS (Cost of Goods Sold) from sales
  let totalCOGS = 0
  
  sales.forEach((sale: any) => {
    const product = products.find(p => p.id === sale.productId || p.id === sale.itemID)
    if (product) {
      // Use getProductCost which handles recipe costs properly
      const costPerUnit = getProductCost(product, products, measures, sale.measureId)
      const baseQty = convertToBaseUnits(sale.quantity || 0, sale.measureId, measures)
      
      // COGS = quantity sold * cost per unit
      totalCOGS += baseQty * costPerUnit
    }
  })
  
  // Calculate Average Inventory Value using effective costs
  let totalInventoryValue = 0
  
  products.forEach((product: any) => {
    const currentStock = product.currentStock || product.predictedStock || 0
    // Use effectiveCost if available, otherwise calculate it
    const costPerUnit = product.effectiveCost || getProductCost(product, products, measures)
    totalInventoryValue += currentStock * costPerUnit
  })
  
  const averageInventoryValue = totalInventoryValue / Math.max(1, products.length)
  
  // Stock Turnover = COGS / Average Inventory Value
  // Annualize if period is less than a year
  const annualizationFactor = 365 / periodDays
  const turnover = averageInventoryValue > 0 
    ? (totalCOGS / averageInventoryValue) * annualizationFactor 
    : 0
  
  return Math.round(turnover * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate cost of a recipe by summing ingredient costs in base units
 * For recipe-type products, this is the true cost instead of purchase price
 * 
 * @param recipe - Recipe object with ingredients array
 * @param products - All products (to look up ingredient costs)
 * @param measures - All measures (for unit conversions)
 * @returns Total recipe cost
 */
export function calculateRecipeCost(
  recipe: {
    ingredients: Array<{
      itemId: string
      measure: string
      quantity: number
    }>
  } | undefined,
  products: any[],
  measures: any[],
  _visited: Set<string> = new Set()
): number {
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
    return 0
  }
  
  let totalCost = 0
  
  recipe.ingredients.forEach((ingredient) => {
    // Find the ingredient product
    const ingredientProduct = products.find(p => p.id === ingredient.itemId)
    if (!ingredientProduct) {
      debugWarn(`Recipe ingredient product not found: ${ingredient.itemId}`)
      return
    }

    // Prevent infinite recursion if recipes reference themselves (directly or indirectly)
    const ingredientId = String(ingredientProduct.id || ingredient.itemId || "")
    if (ingredientId && _visited.has(ingredientId)) {
      debugWarn(`Recipe circular reference detected at product: ${ingredientId}`)
      return
    }

    // Get the cost per base unit of the ingredient.
    // NOTE: getProductCost returns cost PER BASE UNIT for the requested measureId.
    // We pass the ingredient's own measure so the conversion is consistent.
    const nextVisited = new Set(_visited)
    if (ingredientId) nextVisited.add(ingredientId)
    const costPerBaseUnit = getProductCost(ingredientProduct, products, measures, ingredient.measure, nextVisited)
    
    // Convert ingredient quantity to base units
    const ingredientBaseQty = convertToBaseUnits(
      ingredient.quantity || 0,
      ingredient.measure,
      measures
    )
    
    // Add to total cost
    totalCost += costPerBaseUnit * ingredientBaseQty
  })
  
  return totalCost
}

/**
 * Calculate the cost of ONE sales unit for a recipe-type product by summing ingredient costs.
 * This is the value you typically want to display as the product's "purchase price"/COGS per item.
 *
 * - Uses the recipe attached to the product's sales unit (by measureId).
 * - Converts each ingredient quantity to base units using its measure, multiplies by ingredient cost-per-base-unit.
 * - Applies unit.recipeFactor when present.
 */
export function getRecipeUnitCost(
  product: any,
  products: any[],
  measures: any[],
  salesMeasureId?: string
): number {
  if (!product) return 0
  if (!(product.type === "recipe" || product.type === "choice" || product.type === "prepped-item")) return 0

  const targetMeasureId =
    salesMeasureId ||
    product.sale?.defaultMeasure ||
    product.sale?.units?.[0]?.measure ||
    product.sale?.units?.[0]?.measureId

  const units = Array.isArray(product.sale?.units) ? product.sale.units : []
  const matchingUnit = units.find((u: any) => unitMatchesMeasureId(u, targetMeasureId))
  const defaultUnit = units.find((u: any) => unitMatchesMeasureId(u, product.sale?.defaultMeasure))
  const anyRecipeUnit = units.find((u: any) => !!u?.recipe)
  const recipeUnit = (matchingUnit?.recipe ? matchingUnit : null) || (defaultUnit?.recipe ? defaultUnit : null) || anyRecipeUnit || null

  const factor = typeof recipeUnit?.recipeFactor === "number" && isFinite(recipeUnit.recipeFactor) ? recipeUnit.recipeFactor : 1

  if (recipeUnit?.recipe) {
    return calculateRecipeCost(recipeUnit.recipe, products, measures) * factor
  }

  // Fallback: no recipe configured on the sales unit (treat as 0 or use purchase price if present).
  const purchasePrice = getDefaultPurchasePrice(product)
  return typeof purchasePrice === "number" && isFinite(purchasePrice) ? purchasePrice : 0
}

/**
 * Get the effective cost for a product (purchase price or recipe cost)
 * For recipe-type products, calculates cost from ingredients
 * For regular products, uses default purchase price
 * 
 * @param product - The product
 * @param products - All products (for ingredient lookup)
 * @param measures - All measures (for conversions)
 * @param measureId - Optional specific measure to calculate cost for (uses default if not provided)
 * @returns Cost for the product/measure
 */
export function getProductCost(
  product: any,
  products: any[],
  measures: any[],
  measureId?: string,
  _visited?: Set<string>
): number {
  // Internal recursion guard
  const visited = _visited instanceof Set ? _visited : new Set<string>()

  // Determine which measure to use
  const targetMeasureId = measureId || product.sale?.defaultMeasure || product.purchase?.defaultMeasure
  
  // For recipe-type products, calculate from ingredients
  if (product.type === "recipe" || product.type === "choice" || product.type === "prepped-item") {
    // A recipe may be defined on a sales unit that doesn't match the ingredient's measureId.
    // Cost-per-base-unit is still well-defined, so fall back to default/any recipe unit.
    const units = Array.isArray(product.sale?.units) ? product.sale.units : []
    const matchingUnit = units.find((u: any) => unitMatchesMeasureId(u, targetMeasureId))
    const defaultUnit = units.find((u: any) => unitMatchesMeasureId(u, product.sale?.defaultMeasure))
    const anyRecipeUnit = units.find((u: any) => !!u?.recipe)
    const recipeUnit = (matchingUnit?.recipe ? matchingUnit : null) || (defaultUnit?.recipe ? defaultUnit : null) || anyRecipeUnit || null

    if (recipeUnit?.recipe) {
      const factor =
        typeof recipeUnit?.recipeFactor === "number" && isFinite(recipeUnit.recipeFactor) ? recipeUnit.recipeFactor : 1
      // Recipe is defined per *one sales unit*. Convert to cost per base unit.
      const recipeTotalCostForOneSalesUnit = calculateRecipeCost(recipeUnit.recipe, products, measures, visited) * factor
      const recipeUnitMeasureId = getUnitMeasureId(recipeUnit) || targetMeasureId
      const outputBaseQty = recipeUnitMeasureId ? convertToBaseUnits(1, recipeUnitMeasureId, measures) : 0
      return outputBaseQty > 0 ? recipeTotalCostForOneSalesUnit / outputBaseQty : recipeTotalCostForOneSalesUnit
    }
    
    // Fallback to purchase price if no recipe defined
    const purchasePrice = getDefaultPurchasePrice(product)
    const purchaseMeasure = product.purchase?.defaultMeasure
    const purchaseBaseQty = purchaseMeasure ? convertToBaseUnits(1, purchaseMeasure, measures) : 0
    return purchaseBaseQty > 0 ? purchasePrice / purchaseBaseQty : purchasePrice
  }
  
  // For non-recipe products, use purchase price
  const purchasePrice = getDefaultPurchasePrice(product)
  const purchaseMeasure = product.purchase?.defaultMeasure
  const purchaseBaseQty = purchaseMeasure ? convertToBaseUnits(1, purchaseMeasure, measures) : 0
  return purchaseBaseQty > 0 ? purchasePrice / purchaseBaseQty : purchasePrice
}

