"use client"

import React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useCompany } from "./CompanyContext"
import { useSettings } from "./SettingsContext"
import { createNotification } from "../functions/Notifications"
// SiteContext has been merged into CompanyContext
import * as StockDB from "../providers/supabase/Stock"
import * as StockFunctions from "../functions/Stock"
import { 
  fetchStockSettings as fetchStockSettingsFn,
  saveStockSettings as saveStockSettingsFn,
  fetchStockTargets as fetchStockTargetsFn,
  saveStockTarget as saveStockTargetFn,
  deleteStockTarget as deleteStockTargetFn,
  fetchStockIntegrations as fetchStockIntegrationsFn,
  saveStockIntegration as saveStockIntegrationFn,
} from "../providers/supabase/Stock"
import { measurePerformance } from "../utils/PerformanceTimer"
import { performanceTimer } from "../utils/PerformanceTimer"
import { createCachedFetcher } from "../utils/CachedFetcher"
import { dataCache } from "../utils/DataCache"
import { debugLog, debugWarn, debugVerbose } from "../utils/debugLog"
import { db, ref, get, set, remove } from "../services/Firebase"
import type { 
  Product, 
  StockData, 
  Purchase, 
  StockCount,
  StockTransfer,
  StockState,
  StockAction,
  StockContextType,
  StockProviderProps
} from "../interfaces/Stock"

// Interfaces moved to interfaces/Stock.tsx

// Initial state
const initialState: StockState = {
  companyID: null,
  siteID: null,
  subsiteID: null,
  products: [],
  suppliers: [],
  measures: [],
  salesDivisions: [],
  categories: [],
  subcategories: [],
  subCategories: [],  // Alias for backward compatibility
  courses: [],
  purchases: [],
  stockCounts: [],
  stockTransfers: [],
  stockItems: [],
  purchaseOrders: [],
  parLevels: [],
  latestCounts: {},
  purchaseHistory: [],
  salesHistory: [],
  loading: false,
  error: null,
  dataVersion: 0, // Increments on data changes to trigger re-renders
}

// Reducer
const stockReducer = (state: StockState, action: StockAction): StockState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false }
    case "SET_COMPANY_ID":
      return { ...state, companyID: action.payload }
    case "SET_SITE_ID":
      return { ...state, siteID: action.payload }
    case "SET_SUBSITE_ID":
      return { ...state, subsiteID: action.payload }
    case "SET_PRODUCTS":
      return { ...state, products: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_SUPPLIERS":
      return { ...state, suppliers: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_MEASURES":
      return { ...state, measures: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_SALES_DIVISIONS":
      return { ...state, salesDivisions: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_CATEGORIES":
      return { ...state, categories: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_SUBCATEGORIES":
      return { ...state, subcategories: action.payload, subCategories: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_SUB_CATEGORIES":
      // Alias for backward compatibility (keep both fields in sync)
      return { ...state, subcategories: action.payload, subCategories: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_COURSES":
      return { ...state, courses: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_PURCHASES":
      return { ...state, purchases: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_STOCK_COUNTS":
      return { ...state, stockCounts: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_STOCK_TRANSFERS":
      return { ...state, stockTransfers: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_STOCK_ITEMS":
      return { ...state, stockItems: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_PURCHASE_ORDERS":
      return { ...state, purchaseOrders: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_LATEST_COUNTS":
      return { ...state, latestCounts: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_PURCHASE_HISTORY":
      return { ...state, purchaseHistory: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_SALES_HISTORY":
      return { ...state, salesHistory: action.payload, dataVersion: state.dataVersion + 1 }
    case "SET_ALL_DATA":
      // Only update fields that are explicitly provided (not undefined)
      // This preserves existing data when loading background data
      return {
        ...state,
        ...(action.payload.products !== undefined && { products: action.payload.products }),
        ...(action.payload.suppliers !== undefined && { suppliers: action.payload.suppliers }),
        ...(action.payload.measures !== undefined && { measures: action.payload.measures }),
        ...(action.payload.salesDivisions !== undefined && { salesDivisions: action.payload.salesDivisions }),
        ...(action.payload.categories !== undefined && { categories: action.payload.categories }),
        ...(action.payload.subcategories !== undefined && { subcategories: action.payload.subcategories }),
        ...(action.payload.subCategories !== undefined && { 
          subcategories: action.payload.subCategories,
          subCategories: action.payload.subCategories 
        }),
        ...(action.payload.courses !== undefined && { courses: action.payload.courses }),
        ...(action.payload.purchases !== undefined && { purchases: action.payload.purchases }),
        ...(action.payload.stockCounts !== undefined && { stockCounts: action.payload.stockCounts }),
        ...(action.payload.stockTransfers !== undefined && { stockTransfers: action.payload.stockTransfers }),
        ...(action.payload.stockItems !== undefined && { stockItems: action.payload.stockItems }),
        ...(action.payload.purchaseOrders !== undefined && { purchaseOrders: action.payload.purchaseOrders }),
        ...(action.payload.parLevels !== undefined && { parLevels: action.payload.parLevels }),
        ...(action.payload.latestCounts !== undefined && { latestCounts: action.payload.latestCounts }),
        ...(action.payload.purchaseHistory !== undefined && { purchaseHistory: action.payload.purchaseHistory }),
        ...(action.payload.salesHistory !== undefined && { salesHistory: action.payload.salesHistory }),
        loading: false,
        error: null,
        dataVersion: state.dataVersion + 1,
      }
    case "ADD_PRODUCT":
      return { ...state, products: [...state.products, action.payload], dataVersion: state.dataVersion + 1 }
    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) => (p.id === action.payload.id ? action.payload : p)),
        dataVersion: state.dataVersion + 1,
      }
    case "DELETE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
        dataVersion: state.dataVersion + 1,
      }
    case "ADD_SUPPLIER":
      return { ...state, suppliers: [...state.suppliers, action.payload], dataVersion: state.dataVersion + 1 }
    case "UPDATE_SUPPLIER":
      return {
        ...state,
        suppliers: state.suppliers.map((s) => (s.id === action.payload.id ? action.payload : s)),
        dataVersion: state.dataVersion + 1,
      }
    case "DELETE_SUPPLIER":
      return {
        ...state,
        suppliers: state.suppliers.filter((s) => s.id !== action.payload),
        dataVersion: state.dataVersion + 1,
      }
    default:
      return state
  }
}

// Context
// StockContextType interface moved to interfaces/Stock.tsx

const StockContext = createContext<StockContextType | undefined>(undefined)

// Provider component
// StockProviderProps interface moved to interfaces/Stock.tsx

export const StockProvider: React.FC<StockProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(stockReducer, initialState)
  const { state: companyState, isOwner, hasPermission, isFullyLoaded: companyFullyLoaded } = useCompany()
  const { state: settingsState } = useSettings()
  
  // Track loaded base paths to prevent duplicate loading
  const loadedPaths = React.useRef<Set<string>>(new Set())
  const loadingTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({})
  const isLoadingRef = React.useRef(false)
  // Track which path actually contains the loaded products node.
  // This prevents "no error but not updating" when we READ from a fallback path but WRITE to basePath.
  const productsPathRef = React.useRef<string>("")

  // Track which Firebase path each product was loaded from (site vs subsite).
  // This lets the UI show a merged list while still updating/deleting the correct record.
  const productOriginPathRef = React.useRef<Record<string, string>>({})

  // Track which path actually contains the loaded suppliers/measures/etc nodes.
  // This prevents writing to subsite when data was loaded from site (or vice-versa).
  const suppliersPathRef = React.useRef<string>("")
  const measuresPathRef = React.useRef<string>("")
  const coursesPathRef = React.useRef<string>("")
  const locationsPathRef = React.useRef<string>("")
  const categoriesPathRef = React.useRef<string>("")
  const purchasesPathRef = React.useRef<string>("")
  const stockCountsPathRef = React.useRef<string>("")
  const stockTransfersPathRef = React.useRef<string>("")
  const parLevelsPathRef = React.useRef<string>("")
  
  // Track previous basePath to detect changes
  const previousBasePathRef = React.useRef<string | null>(null)
  const stockTimersRef = React.useRef<{
    basePath: string | null
    coreTimerId: string | null
    allTimerId: string | null
    coreLogged: boolean
    allLogged: boolean
    cacheLogged: boolean
  }>({ basePath: null, coreTimerId: null, allTimerId: null, coreLogged: false, allLogged: false, cacheLogged: false })

  // Update company and site IDs when they change
  React.useEffect(() => {
    dispatch({ type: "SET_COMPANY_ID", payload: companyState.companyID || null })
    dispatch({ type: "SET_SITE_ID", payload: companyState.selectedSiteID || null })
    dispatch({ type: "SET_SUBSITE_ID", payload: companyState.selectedSubsiteID || null })
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Compute and track the base path for stock module
  const basePath = React.useMemo(() => {
    if (!companyState.companyID) return ""
    
    // For stock data, check both site and subsite levels
    // This matches the actual Firebase data structure
    let root = `companies/${companyState.companyID}`
    
    if (companyState.selectedSiteID) {
      root += `/sites/${companyState.selectedSiteID}`
      
      // If subsite is selected, also check subsite level
      if (companyState.selectedSubsiteID) {
        root += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    
    return `${root}/data/stock`
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Helper function to get multiple possible paths for stock data
  const getStockPaths = React.useCallback(() => {
    if (!companyState.companyID) return []
    
    const paths = []
    const companyRoot = `companies/${companyState.companyID}`
    
    if (companyState.selectedSiteID) {
      // If subsite is selected, prioritize subsite level first
      if (companyState.selectedSubsiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/subsites/${companyState.selectedSubsiteID}/data/stock`)
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/stock`)
        // Fallback: some legacy data may exist at company-level
        paths.push(`${companyRoot}/data/stock`)
      } else {
        // If no subsite selected, only check site level
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/stock`)
        // Fallback: some legacy data may exist at company-level
        paths.push(`${companyRoot}/data/stock`)
      }
    } else {
      // If only company is selected, allow company-level stock data
      paths.push(`${companyRoot}/data/stock`)
    }
    
    return paths
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // =======================
  // Stock module settings paths (NOT /data/stock)
  // =======================
  const getStockSettingsPath = React.useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/stock`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const getStockTargetsPath = React.useCallback(() => {
    const base = getStockSettingsPath()
    if (!base) return null
    return `${base}/targets`
  }, [getStockSettingsPath])

  const getStockIntegrationsPath = React.useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/stock/integrations`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadStockSettings = React.useCallback(async () => {
    const path = getStockSettingsPath()
    if (!path) return null
    try {
      return await fetchStockSettingsFn(path)
    } catch (err: any) {
      debugWarn("StockContext: loadStockSettings failed", err)
      return null
    }
  }, [getStockSettingsPath])

  const saveStockSettings = React.useCallback(async (settings: Record<string, any>) => {
    const path = getStockSettingsPath()
    if (!path) return
    try {
      // update() so we don't overwrite children like /targets
      await saveStockSettingsFn(path, settings)
    } catch (err: any) {
      debugWarn("StockContext: saveStockSettings failed", err)
      throw err
    }
  }, [getStockSettingsPath])

  const fetchStockTargets = React.useCallback(async () => {
    const path = getStockTargetsPath()
    if (!path) return []
    try {
      return await fetchStockTargetsFn(path)
    } catch (err: any) {
      debugWarn("StockContext: fetchStockTargets failed", err)
      return []
    }
  }, [getStockTargetsPath])

  const saveStockTarget = React.useCallback(async (targetId: string, target: Record<string, any>) => {
    const path = getStockTargetsPath()
    if (!path) return
    // Remove undefined values - Firebase doesn't allow undefined
    const cleanTarget = Object.fromEntries(Object.entries(target).filter(([, v]) => v !== undefined))
    await saveStockTargetFn(path, targetId, cleanTarget)
  }, [getStockTargetsPath])

  const deleteStockTarget = React.useCallback(async (targetId: string) => {
    const path = getStockTargetsPath()
    if (!path) return
    await deleteStockTargetFn(path, targetId)
  }, [getStockTargetsPath])

  const loadStockIntegrations = React.useCallback(async () => {
    const path = getStockIntegrationsPath()
    if (!path) return {}
    try {
      return await fetchStockIntegrationsFn(path)
    } catch (err: any) {
      debugWarn("StockContext: loadStockIntegrations failed", err)
      return {}
    }
  }, [getStockIntegrationsPath])

  const saveStockIntegration = React.useCallback(async (integration: { id: string } & Record<string, any>) => {
    const path = getStockIntegrationsPath()
    if (!path || !integration?.id) return
    // Remove undefined values - Firebase doesn't allow undefined
    const cleanIntegration = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
    await saveStockIntegrationFn(path, cleanIntegration)
  }, [getStockIntegrationsPath])

  // Helper functions with useCallback to prevent unnecessary re-creation
  const refreshProducts = React.useCallback(async () => {
    const paths = getStockPaths()
    if (paths.length === 0) {
      debugVerbose("refreshProducts: No paths available")
      return
    }
    
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      dispatch({ type: "SET_ERROR", payload: null })

      // Merge products across all relevant paths (e.g. subsite + site).
      // This prevents "missing" products when some are stored at a different level,
      // which commonly affects recipe-type products.
      const merged = new Map<string, Product>()
      const origin: Record<string, string> = {}

      for (const path of paths) {
        try {
          const products = await StockDB.fetchProducts(path)
          if (Array.isArray(products) && products.length > 0) {
            debugVerbose(`✅ refreshProducts: ${products.length} products loaded from path: ${path}`)
          } else {
            debugVerbose(`refreshProducts: no products at path: ${path}`)
          }

          for (const p of products || []) {
            if (!p?.id) continue
            // Prefer the most-specific path (paths are ordered: subsite first).
            if (!merged.has(p.id)) {
              merged.set(p.id, p)
              origin[p.id] = path
            }
          }
        } catch (error) {
          debugWarn(`⚠️ refreshProducts: Failed to load from path: ${path}`, error)
        }
      }

      const finalProducts = Array.from(merged.values())
      if (finalProducts.length === 0) {
        debugWarn("⚠️ refreshProducts: No products found at any path")
      }

      productOriginPathRef.current = origin
      // Default write target remains the most-specific selected path.
      productsPathRef.current = paths[0] || basePath || ""

      dispatch({ type: "SET_PRODUCTS", payload: finalProducts })
    } catch (error) {
      debugWarn("❌ refreshProducts: Error refreshing products:", error)
      // Ensure we dispatch empty array on error to prevent stale data
      dispatch({ type: "SET_PRODUCTS", payload: [] })
      productOriginPathRef.current = {}
      productsPathRef.current = ""
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [getStockPaths, dispatch, basePath])

  const refreshSuppliers = React.useCallback(async () => {
    const paths = getStockPaths()
    if (paths.length === 0) return
    
    try {
      // Only treat a path as "loaded" if the suppliers node exists.
      // Otherwise we can accidentally "successfully" load an empty array from a missing node
      // and never fall back to the site-level suppliers.
      let suppliersLoaded = false
      for (const path of paths) {
        try {
          let existsSnap = await get(ref(db, `${path}/suppliers`))
          if (!existsSnap.exists()) {
            // Auto-recover from legacy bug where suppliers were written to `${basePath}/data/stock/suppliers`
            // even though basePath already included `/data/stock`.
            const legacyPath = `${path}/data/stock/suppliers`
            const legacySnap = await get(ref(db, legacyPath))
            if (legacySnap.exists()) {
              try {
                await set(ref(db, `${path}/suppliers`), legacySnap.val())
                await remove(ref(db, legacyPath))
                debugWarn(`⚠️ Migrated legacy suppliers from ${legacyPath} -> ${path}/suppliers`)
                existsSnap = await get(ref(db, `${path}/suppliers`))
              } catch (migrateErr) {
                debugWarn(`⚠️ Failed migrating legacy suppliers at path: ${legacyPath}`, migrateErr)
              }
            }
          }

          if (!existsSnap.exists()) {
            debugVerbose(`refreshSuppliers: suppliers node missing at path: ${path}`)
            continue
          }

          await StockFunctions.refreshSuppliers(path, StockDB.fetchSuppliersFromBasePath, dispatch)
          debugVerbose(`✅ refreshSuppliers: Suppliers loaded from path: ${path}`)
          suppliersPathRef.current = path
          suppliersLoaded = true
          break
        } catch (error) {
          debugWarn(`⚠️ refreshSuppliers: Failed to load from path: ${path}`, error)
          continue
        }
      }

      if (!suppliersLoaded) {
        debugVerbose("refreshSuppliers: No suppliers found at any path")
        dispatch({ type: "SET_SUPPLIERS", payload: [] })
        // Default write target to the most-specific selected path.
        suppliersPathRef.current = paths[0] || ""
      }
    } catch (error) {
      debugWarn("Error refreshing suppliers:", error)
    }
  }, [getStockPaths, dispatch])

  const refreshMeasures = React.useCallback(async () => {
    const paths = getStockPaths()
    if (paths.length === 0) return
    
    try {
      // Only treat a path as "loaded" if the measures node exists.
      let measuresLoaded = false
      for (const path of paths) {
        try {
          let existsSnap = await get(ref(db, `${path}/measures`))
          if (!existsSnap.exists()) {
            // Auto-recover from legacy bug where measures were written to `${basePath}/data/stock/measures`
            const legacyPath = `${path}/data/stock/measures`
            const legacySnap = await get(ref(db, legacyPath))
            if (legacySnap.exists()) {
              try {
                await set(ref(db, `${path}/measures`), legacySnap.val())
                await remove(ref(db, legacyPath))
                debugWarn(`⚠️ Migrated legacy measures from ${legacyPath} -> ${path}/measures`)
                existsSnap = await get(ref(db, `${path}/measures`))
              } catch (migrateErr) {
                debugWarn(`⚠️ Failed migrating legacy measures at path: ${legacyPath}`, migrateErr)
              }
            }
          }

          if (!existsSnap.exists()) {
            debugVerbose(`refreshMeasures: measures node missing at path: ${path}`)
            continue
          }

          await StockFunctions.refreshMeasures(path, StockDB.fetchMeasuresFromBasePath, dispatch)
          debugVerbose(`✅ refreshMeasures: Measures loaded from path: ${path}`)
          measuresPathRef.current = path
          measuresLoaded = true
          break
        } catch (error) {
          debugWarn(`⚠️ refreshMeasures: Failed to load from path: ${path}`, error)
          continue
        }
      }

      if (!measuresLoaded) {
        debugVerbose("refreshMeasures: No measures found at any path")
        dispatch({ type: "SET_MEASURES", payload: [] })
        measuresPathRef.current = paths[0] || ""
      }
    } catch (error) {
      debugWarn("Error refreshing measures:", error)
    }
  }, [getStockPaths, dispatch])

  // Create cached fetchers for critical data
  const fetchProductsCached = React.useMemo(() => createCachedFetcher(StockDB.fetchProducts, 'products'), [])
  const fetchMeasuresCached = React.useMemo(() => createCachedFetcher(StockDB.fetchMeasuresFromBasePath, 'measures'), [])

  const refreshAll = React.useCallback(async () => {
    const paths = getStockPaths()
    if (paths.length === 0) {
      // Ensure loading is false if no paths available
      dispatch({ type: "SET_LOADING", payload: false })
      return
    }

    // Prevent duplicate / concurrent refreshes (avoids repeated "Starting load" logs)
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    
    try {
      await measurePerformance('StockContext', 'refreshAll', async () => {
        dispatch({ type: "SET_LOADING", payload: true })
        
        try {
        const basePath = paths[0] || ""
        // Reset timers when switching scope
        if (stockTimersRef.current.basePath !== basePath) {
          stockTimersRef.current = {
            basePath,
            coreTimerId: performanceTimer.start("StockContext", "coreLoad"),
            allTimerId: performanceTimer.start("StockContext", "allLoad"),
            coreLogged: false,
            allLogged: false,
            cacheLogged: false,
          }
        } else {
          if (!stockTimersRef.current.coreTimerId) stockTimersRef.current.coreTimerId = performanceTimer.start("StockContext", "coreLoad")
          if (!stockTimersRef.current.allTimerId) stockTimersRef.current.allTimerId = performanceTimer.start("StockContext", "allLoad")
        }

        debugLog("⏳ StockContext: Starting load", { basePath })

        // FAST UI: hydrate from cache immediately if available (does NOT affect timers)
        try {
          const peekFirst = async <T,>(relative: string): Promise<T[] | null> => {
            for (const p of paths) {
              try {
                const cached = await dataCache.peek<T[]>(`${p}/${relative}`)
                if (cached !== null) return cached
              } catch {
                // try next
              }
            }
            return null
          }

          const peekFirstRecord = async <T,>(relative: string): Promise<Record<string, T> | null> => {
            for (const p of paths) {
              try {
                const cached = await dataCache.peek<Record<string, T>>(`${p}/${relative}`)
                if (cached !== null) return cached
              } catch {
                // try next
              }
            }
            return null
          }

          const [
            productsCached,
            measuresCached,
            suppliersCached,
            categoriesCached,
            subcategoriesCached,
            salesDivisionsCached,
            coursesCached,
            purchasesCached,
            stockCountsCached,
            stockItemsCached,
            purchaseOrdersCached,
            parLevelsCached,
            latestCountsCached,
          ] = await Promise.all([
            peekFirst<Product>('products'),
            peekFirst<any>('measures'),
            peekFirst<any>('suppliers'),
            peekFirst<any>('categories'),
            peekFirst<any>('subcategories'),
            peekFirst<any>('salesDivisions'),
            peekFirst<any>('courses'),
            peekFirst<any>('purchases'),
            peekFirst<any>('stockCounts'),
            peekFirst<any>('stockItems'),
            peekFirst<any>('purchaseOrders'),
            peekFirst<any>('parLevels'),
            peekFirstRecord<any>('latestCounts'),
          ])

          if (
            productsCached ||
            measuresCached ||
            suppliersCached ||
            categoriesCached ||
            subcategoriesCached ||
            salesDivisionsCached ||
            coursesCached ||
            purchasesCached ||
            stockCountsCached ||
            stockItemsCached ||
            purchaseOrdersCached ||
            parLevelsCached ||
            latestCountsCached
          ) {
            // Only update slices that actually changed to reduce flashing/re-renders
            const payload: any = { initialized: true }
            if (productsCached !== null) payload.products = productsCached || []
            if (measuresCached !== null) payload.measures = measuresCached || []
            if (suppliersCached !== null) payload.suppliers = suppliersCached || []
            if (categoriesCached !== null) payload.categories = categoriesCached || []
            if (subcategoriesCached !== null) payload.subcategories = subcategoriesCached || []
            if (salesDivisionsCached !== null) payload.salesDivisions = salesDivisionsCached || []
            if (coursesCached !== null) payload.courses = coursesCached || []
            if (purchasesCached !== null) payload.purchases = purchasesCached || []
            if (stockCountsCached !== null) payload.stockCounts = stockCountsCached || []
            if (stockItemsCached !== null) payload.stockItems = stockItemsCached || []
            if (purchaseOrdersCached !== null) payload.purchaseOrders = purchaseOrdersCached || []
            if (parLevelsCached !== null) payload.parLevels = parLevelsCached || []
            if (latestCountsCached !== null) payload.latestCounts = latestCountsCached || {}

            if (Object.keys(payload).length > 1) {
              dispatch({ type: "SET_ALL_DATA", payload })
            }
            if (!stockTimersRef.current.cacheLogged) {
              stockTimersRef.current.cacheLogged = true
              debugLog("✅ StockContext: Cache hydrated")
            }
            // Set loading to false immediately after cache hydration for instant UI
            // This allows components to render immediately with cached data
            dispatch({ type: "SET_LOADING", payload: false })
          }
        } catch {
          // ignore
        }
        
        // Helper to fetch from paths, distinguishing "empty" from "failed".
        // - returns `T[]` (possibly empty) if at least one path read succeeded
        // - returns `undefined` if ALL path reads failed (so we preserve existing/cache-hydrated state)
        const fetchFromPaths = async <T,>(fetchFn: (path: string) => Promise<T[]>): Promise<T[] | undefined> => {
          let didSucceed = false
          for (const path of paths) {
            try {
              const data = await fetchFn(path)
              didSucceed = true
              if (data && data.length > 0) return data
            } catch (error) {
              debugWarn(`Failed to load from ${path}:`, error)
              continue
            }
          }
          return didSucceed ? [] : undefined
        }

        const fetchFromPathsWithPath = async <T,>(
          fetchFn: (path: string) => Promise<T[]>,
        ): Promise<{ data: T[] | undefined; path: string | null }> => {
          let didSucceed = false
          let firstSucceededPath: string | null = null
          for (const path of paths) {
            try {
              const data = await fetchFn(path)
              didSucceed = true
              if (!firstSucceededPath) firstSucceededPath = path
              if (data && data.length > 0) return { data, path }
            } catch (error) {
              debugWarn(`Failed to load from ${path}:`, error)
              continue
            }
          }
          return didSucceed ? { data: [], path: firstSucceededPath } : { data: undefined, path: null }
        }
        
        // PROGRESSIVE LOADING: Critical data first (for immediate UI)
        // Load products and measures first (core data)
        const [productsRes, measuresRes] = await Promise.all([
          (async () => {
            try {
              const cached = await fetchProductsCached(basePath, false)
              if (cached && cached.length > 0) return { data: cached, path: productsPathRef.current || basePath }
            } catch {
              // ignore
            }
            return await fetchFromPathsWithPath(StockDB.fetchProducts)
          })(),
          (async () => {
            try {
              const cached = await fetchMeasuresCached(basePath, false)
              if (cached && cached.length > 0) return { data: cached, path: productsPathRef.current || basePath }
            } catch {
              // ignore
            }
            return await fetchFromPathsWithPath(async (p) => {
              // Back-compat: migrate from legacy double-nested path if present
              try {
                const currentSnap = await get(ref(db, `${p}/measures`))
                if (!currentSnap.exists()) {
                  const legacyPath = `${p}/data/stock/measures`
                  const legacySnap = await get(ref(db, legacyPath))
                  if (legacySnap.exists()) {
                    await set(ref(db, `${p}/measures`), legacySnap.val())
                    await remove(ref(db, legacyPath))
                    debugWarn(`⚠️ Migrated legacy measures from ${legacyPath} -> ${p}/measures`)
                  }
                }
              } catch {
                // ignore
              }
              return await StockDB.fetchMeasuresFromBasePath(p)
            })
          })(),
        ])
        // Products can legitimately be split across multiple paths (e.g. subsite items + site shared items/recipes).
        // Merge across all paths and track origin so updates/deletes hit the correct record location.
        const productsFetchSucceeded = Array.isArray(productsRes.data)
        const measuresFetchSucceeded = Array.isArray(measuresRes.data)
        let products: Product[] = productsFetchSucceeded ? (productsRes.data as Product[]) : (state.products || [])
        const measures: any[] = measuresFetchSucceeded ? (measuresRes.data as any[]) : (state.measures || [])
        try {
          const merged = new Map<string, Product>()
          const origin: Record<string, string> = {}

          // Seed from the first successful products fetch to avoid duplicate reads for that path.
          if (productsFetchSucceeded && Array.isArray(productsRes.data) && productsRes.data.length > 0 && productsRes.path) {
            for (const p of productsRes.data) {
              if (!p?.id) continue
              merged.set(p.id, p)
              origin[p.id] = productsRes.path
            }
          }

          for (const path of paths) {
            if (productsRes.path && path === productsRes.path) continue
            try {
              const list = await StockDB.fetchProducts(path)
              for (const p of list || []) {
                if (!p?.id) continue
                if (!merged.has(p.id)) {
                  merged.set(p.id, p)
                  origin[p.id] = path
                }
              }
            } catch {
              // keep going
            }
          }

          if (merged.size > 0) {
            products = Array.from(merged.values())
            productOriginPathRef.current = origin
            productsPathRef.current = paths[0] || basePath || ""
          }
        } catch {
          // ignore; fall back to productsRes.data
        }

        // Persist critical data to IndexedDB cache (backup)
        if (productsFetchSucceeded) {
          try { dataCache.set(`${basePath}/products`, products || []) } catch {}
        }
        if (measuresFetchSucceeded) {
          try { dataCache.set(`${basePath}/measures`, measures || []) } catch {}
        }
        
        // Fetch latest counts if we have products and measures
        let latestCounts: Record<string, any> = {}
        if (productsFetchSucceeded && measuresFetchSucceeded && products.length > 0 && measures.length > 0) {
          for (const path of paths) {
            try {
              latestCounts = await StockDB.fetchLatestCountsForProductsFromBasePath(path, products, measures)
              if (Object.keys(latestCounts).length > 0) break
            } catch (error) {
              continue
            }
          }
        }

        if (productsFetchSucceeded && measuresFetchSucceeded) {
          try { dataCache.set(`${basePath}/latestCounts`, latestCounts || {}) } catch {}
        }
        
        // Load management page data (needed by all management pages)
        // These are required for CategoriesManagement, SuppliersManagement, etc.
        const migrateLegacyNode = async (path: string, node: string): Promise<void> => {
          try {
            const currentSnap = await get(ref(db, `${path}/${node}`))
            if (currentSnap.exists()) return
            const legacyPath = `${path}/data/stock/${node}`
            const legacySnap = await get(ref(db, legacyPath))
            if (!legacySnap.exists()) return
            await set(ref(db, `${path}/${node}`), legacySnap.val())
            await remove(ref(db, legacyPath))
            debugWarn(`⚠️ Migrated legacy ${node} from ${legacyPath} -> ${path}/${node}`)
          } catch (migrateErr) {
            // best-effort only
            debugWarn(`⚠️ Failed migrating legacy ${node} at path: ${path}`, migrateErr)
          }
        }

        const [suppliersRes, categoriesRes, subcategoriesRes, salesDivisionsRes, coursesRes] = await Promise.all([
          fetchFromPathsWithPath(async (p) => {
            await migrateLegacyNode(p, "suppliers")
            return await StockDB.fetchSuppliersFromBasePath(p)
          }),
          fetchFromPathsWithPath(async (p) => {
            await migrateLegacyNode(p, "categories")
            return await StockDB.fetchCategoriesFromBasePath(p)
          }),
          fetchFromPathsWithPath(async (p) => {
            await migrateLegacyNode(p, "subcategories")
            return await StockDB.fetchSubcategoriesFromBasePath(p)
          }),
          fetchFromPathsWithPath(async (p) => {
            await migrateLegacyNode(p, "salesDivisions")
            return await StockDB.fetchSalesDivisionsFromBasePath(p)
          }),
          fetchFromPathsWithPath(async (p) => {
            await migrateLegacyNode(p, "courses")
            return await StockDB.fetchCourses(p)
          }),
        ])
        const suppliers = suppliersRes.data
        const categories = categoriesRes.data
        const subcategories = subcategoriesRes.data
        const salesDivisions = salesDivisionsRes.data
        const courses = coursesRes.data

        // Track the resolved write path per node (best-effort).
        // If a list was loaded from a specific path, write back to that same path for that node.
        if (measuresRes.path) measuresPathRef.current = measuresRes.path
        if (suppliersRes.path) suppliersPathRef.current = suppliersRes.path
        if (coursesRes.path) coursesPathRef.current = coursesRes.path
        if (categoriesRes.path || subcategoriesRes.path || salesDivisionsRes.path) {
          categoriesPathRef.current = categoriesRes.path || subcategoriesRes.path || salesDivisionsRes.path || categoriesPathRef.current
        }

        // If nothing has been resolved yet, default write targets to the most-specific selected path.
        if (!productsPathRef.current) productsPathRef.current = paths[0] || basePath || ""
        if (!measuresPathRef.current) measuresPathRef.current = paths[0] || basePath || ""
        if (!suppliersPathRef.current) suppliersPathRef.current = paths[0] || basePath || ""
        if (!coursesPathRef.current) coursesPathRef.current = paths[0] || basePath || ""
        if (!categoriesPathRef.current) categoriesPathRef.current = paths[0] || basePath || ""

        // Persist management data to cache
        if (suppliers !== undefined) { try { dataCache.set(`${basePath}/suppliers`, suppliers || []) } catch {} }
        if (categories !== undefined) { try { dataCache.set(`${basePath}/categories`, categories || []) } catch {} }
        if (subcategories !== undefined) { try { dataCache.set(`${basePath}/subcategories`, subcategories || []) } catch {} }
        if (salesDivisions !== undefined) { try { dataCache.set(`${basePath}/salesDivisions`, salesDivisions || []) } catch {} }
        if (courses !== undefined) { try { dataCache.set(`${basePath}/courses`, courses || []) } catch {} }
        
        // Update critical data from the database (source of truth) when fetches succeeded.
        const corePayload: any = { initialized: true }
        if (productsFetchSucceeded) corePayload.products = products || []
        if (measuresFetchSucceeded) corePayload.measures = measures || []
        if (productsFetchSucceeded && measuresFetchSucceeded) corePayload.latestCounts = latestCounts || {}
        // Include management data in core payload (needed by management pages)
        if (suppliers !== undefined) corePayload.suppliers = suppliers || []
        if (categories !== undefined) corePayload.categories = categories || []
        if (subcategories !== undefined) corePayload.subcategories = subcategories || []
        if (salesDivisions !== undefined) corePayload.salesDivisions = salesDivisions || []
        if (courses !== undefined) corePayload.courses = courses || []
        
        if (Object.keys(corePayload).length > 1) {
          dispatch({ type: "SET_ALL_DATA", payload: corePayload })
        }

        // Core loaded timing (products/measures)
        // Only log when both critical entities are loaded
        if (!stockTimersRef.current.coreLogged && stockTimersRef.current.coreTimerId) {
          const productsLoaded = (products || []).length > 0 || state.products.length > 0
          const measuresLoaded = (measures || []).length > 0 || state.measures.length > 0
          
          if (productsLoaded && measuresLoaded) {
            stockTimersRef.current.coreLogged = true
            const duration = performanceTimer.end(stockTimersRef.current.coreTimerId, {
              products: (products || []).length || state.products.length,
              measures: (measures || []).length || state.measures.length,
            })
            debugLog(`✅ StockContext: Core loaded (${duration.toFixed(2)}ms)`)
          }
        }
        
        // All data loaded timing - fires when core + management data is complete
        // This ensures "All data loaded" includes all data needed by all stock pages (including management pages)
        if (!stockTimersRef.current.allLogged && stockTimersRef.current.allTimerId && stockTimersRef.current.coreLogged) {
          // All data is loaded when core + management data (suppliers, categories, subcategories, salesDivisions, courses) is ready
          // These are needed by all management pages (CategoriesManagement, SuppliersManagement, etc.)
          const allDataLoaded = ((products || []).length > 0 || state.products.length > 0) &&
                                ((measures || []).length > 0 || state.measures.length > 0) &&
                                (suppliers !== undefined) && (categories !== undefined) && 
                                (subcategories !== undefined) && (salesDivisions !== undefined) && 
                                (courses !== undefined)
          
          if (allDataLoaded) {
            stockTimersRef.current.allLogged = true
            const duration = performanceTimer.end(stockTimersRef.current.allTimerId, {
              products: (products || []).length || state.products.length,
              measures: (measures || []).length || state.measures.length,
              suppliers: (suppliers || []).length,
              categories: (categories || []).length,
              subcategories: (subcategories || []).length,
              salesDivisions: (salesDivisions || []).length,
              courses: (courses || []).length,
            })
            debugLog(`✅ StockContext: All data loaded (${duration.toFixed(2)}ms)`)
          }
        }
        
        // BACKGROUND: Load non-critical data after (non-blocking)
        // These are data that's not essential for immediate page rendering
        const loadBackgroundData = () => {
          const fetchTransfersMerged = async () => {
            try {
              const results = await Promise.all(
                paths.map((p) => StockDB.fetchAllStockTransfersFromBasePath(p).catch(() => [])),
              )
              const merged = new Map<string, any>()
              for (const list of results) {
                for (const tr of list || []) {
                  const id = String((tr as any)?.id || "")
                  if (!id) continue
                  merged.set(id, tr)
                }
              }
              return Array.from(merged.values())
            } catch {
              return []
            }
          }

          Promise.all([
            fetchFromPaths(StockDB.fetchPurchases),
            fetchFromPaths(StockDB.fetchAllStockCountsFromBasePath),
            fetchTransfersMerged().catch(() => undefined),
            fetchFromPaths(StockDB.fetchStockItemsFromBasePath),
            fetchFromPaths(StockDB.fetchPurchaseOrdersFromBasePath),
            fetchFromPaths(StockDB.fetchParLevels),
          ]).then(([purchases, stockCounts, stockTransfers, stockItems, purchaseOrders, parLevels]) => {
            if (purchases !== undefined) { try { dataCache.set(`${basePath}/purchases`, purchases || []) } catch {} }
            if (stockCounts !== undefined) { try { dataCache.set(`${basePath}/stockCounts`, stockCounts || []) } catch {} }
            if (stockTransfers !== undefined) { try { dataCache.set(`${basePath}/stockTransfers`, stockTransfers || []) } catch {} }
            if (stockItems !== undefined) { try { dataCache.set(`${basePath}/stockItems`, stockItems || []) } catch {} }
            if (purchaseOrders !== undefined) { try { dataCache.set(`${basePath}/purchaseOrders`, purchaseOrders || []) } catch {} }
            if (parLevels !== undefined) { try { dataCache.set(`${basePath}/parLevels`, parLevels || []) } catch {} }

            const bgPayload: any = {}
            if (purchases !== undefined) bgPayload.purchases = purchases || []
            if (stockCounts !== undefined) bgPayload.stockCounts = stockCounts || []
            if (stockTransfers !== undefined) bgPayload.stockTransfers = stockTransfers || []
            if (stockItems !== undefined) bgPayload.stockItems = stockItems || []
            if (purchaseOrders !== undefined) bgPayload.purchaseOrders = purchaseOrders || []
            if (parLevels !== undefined) bgPayload.parLevels = parLevels || []
            
            if (Object.keys(bgPayload).length > 0) {
              dispatch({ type: "SET_ALL_DATA", payload: bgPayload })
            }
            // Background data loaded silently
          }).catch(error => {
            debugWarn('Error loading background stock data:', error)
          })
        }
        
        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          requestIdleCallback(loadBackgroundData, { timeout: 300 })
        } else {
          setTimeout(loadBackgroundData, 100)
        }
        
      } catch (error) {
        debugWarn("Error refreshing all stock data:", error)
        dispatch({ type: "SET_ERROR", payload: "Failed to load stock data" })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
      }
      }, () => ({
        products: state.products.length,
        suppliers: state.suppliers.length,
        measures: state.measures.length,
      }))
    } catch (error) {
      // Ensure loading is cleared even if measurePerformance fails
      debugWarn("Error in measurePerformance wrapper:", error)
      dispatch({ type: "SET_LOADING", payload: false })
      throw error
    } finally {
      isLoadingRef.current = false
    }
  }, [getStockPaths, dispatch, state.products, state.measures, fetchProductsCached, fetchMeasuresCached])

  // Keep a stable reference to refreshAll so load effects
  // don't re-trigger due to refreshAll identity changes.
  const refreshAllRef = React.useRef(refreshAll)
  React.useEffect(() => {
    refreshAllRef.current = refreshAll
  }, [refreshAll])

  const getStockData = (): StockData => {
    return StockFunctions.getStockData(state.products, state.suppliers, state.measures)
  }

  // Permission functions - Owner has full access
  // Check for dashboard permission (which exists in default permissions) or any stock permission
  const canViewStock = React.useCallback(() => {
    if (isOwner()) return true
    
    // If permissions aren't loaded yet, allow access (will be checked again when loaded)
    // This prevents blocking users during initial load
    const perms = companyState.permissions
    if (!perms || !perms.roles) {
      if (process.env.NODE_ENV === 'development') {
        debugVerbose("🔍 canViewStock: No permissions loaded, allowing access (fail-open)")
      }
      return true
    }
    
    // Check for dashboard permission (most common) or items permission
    const hasAccess = hasPermission("stock", "dashboard", "view") || 
                      hasPermission("stock", "items", "view") ||
                      hasPermission("stock", "orders", "view") ||
                      hasPermission("stock", "counts", "view") ||
                      hasPermission("stock", "categories", "view") ||
                      hasPermission("stock", "suppliers", "view") ||
                      hasPermission("stock", "reports", "view")
    
    // If no explicit permission found, check default permissions for user's role
    // This handles cases where permissions might not be fully configured
    if (!hasAccess) {
      const userRole = companyState.user?.role?.toLowerCase() || perms.defaultRole || 'staff'
      const rolePerms = perms.roles?.[userRole]?.modules?.stock
      
      if (rolePerms) {
        const hasDefaultAccess = Boolean(
          rolePerms.dashboard?.view || 
          rolePerms.items?.view || 
          rolePerms.orders?.view ||
          rolePerms.counts?.view ||
          rolePerms.categories?.view ||
          rolePerms.suppliers?.view ||
          rolePerms.reports?.view
        )
        
        if (process.env.NODE_ENV === 'development' && !hasDefaultAccess) {
          debugVerbose("🔍 canViewStock: No stock permissions found for role:", userRole, "permissions:", rolePerms)
        }
        
        return hasDefaultAccess
      } else {
        // If role not found in permissions, check if default role has access
        const defaultRolePerms = perms.roles?.[perms.defaultRole || 'staff']?.modules?.stock
        if (defaultRolePerms) {
          return Boolean(
            defaultRolePerms.dashboard?.view || 
            defaultRolePerms.items?.view || 
            defaultRolePerms.orders?.view ||
            defaultRolePerms.counts?.view
          )
        }
        
        // Last resort: if permissions structure exists but no role matches, allow access
        // This prevents blocking users when permissions aren't properly configured
        if (process.env.NODE_ENV === 'development') {
          debugWarn("🔍 canViewStock: Role not found in permissions, allowing access (fail-open)", {
            userRole,
            availableRoles: Object.keys(perms.roles || {}),
            defaultRole: perms.defaultRole
          })
        }
        return true
      }
    }
    
    return hasAccess
  }, [isOwner, hasPermission, companyState.permissions, companyState.user?.role])

  const canEditStock = React.useCallback(() => {
    if (isOwner()) return true
    // Check for dashboard edit permission or items edit permission
    return hasPermission("stock", "dashboard", "edit") || 
           hasPermission("stock", "items", "edit") ||
           hasPermission("stock", "orders", "edit") ||
           hasPermission("stock", "counts", "edit")
  }, [isOwner, hasPermission])

  const canDeleteStock = React.useCallback(() => {
    if (isOwner()) return true
    // Check for dashboard delete permission or items delete permission
    return hasPermission("stock", "dashboard", "delete") || 
           hasPermission("stock", "items", "delete") ||
           hasPermission("stock", "orders", "delete") ||
           hasPermission("stock", "counts", "delete")
  }, [isOwner, hasPermission])

  const ownerCheck = React.useCallback(() => {
    return isOwner()
  }, [isOwner])

  // Data operation functions (product operations moved to end)

  const savePurchase = React.useCallback(async (purchase: Purchase) => {
    if (!basePath) return
    try {
      const targetPath = purchasesPathRef.current || productsPathRef.current || basePath
      purchasesPathRef.current = targetPath
      await StockDB.savePurchase(targetPath, purchase)
      await refreshAll()
    } catch (error) {
      console.error("Error saving purchase:", error)
      throw error
    }
  }, [basePath, refreshAll])

  const fetchAllPurchases = React.useCallback(async (): Promise<Purchase[]> => {
    if (!basePath) return []
    try {
      const targetPath = purchasesPathRef.current || productsPathRef.current || basePath
      return await StockDB.fetchAllPurchasesFromBasePath(targetPath)
    } catch (error) {
      console.error("Error fetching purchases:", error)
      throw error
    }
  }, [basePath, dispatch])

  const deletePurchase = React.useCallback(async (purchaseId: string) => {
    if (!basePath) return
    try {
      const purchaseToDelete = state.purchases.find(p => p.id === purchaseId)
      const targetPath = purchasesPathRef.current || productsPathRef.current || basePath
      purchasesPathRef.current = targetPath
      await StockDB.deletePurchase(targetPath, purchaseId)
      await refreshAll()
      
      // Add notification
      if (purchaseToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Purchase Removed',
            `Purchase record was removed`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: purchaseId,
                entityName: 'Purchase',
                oldValue: purchaseToDelete
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting purchase:", error)
      throw error
    }
  }, [basePath, refreshAll, state.purchases, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const saveStockCount = React.useCallback(async (stockCount: StockCount) => {
    if (!basePath) return
    try {
      const targetPath = stockCountsPathRef.current || productsPathRef.current || basePath
      stockCountsPathRef.current = targetPath
      await StockDB.saveStockCount(targetPath, stockCount)
      await refreshAll()
    } catch (error) {
      console.error("Error saving stock count:", error)
      throw error
    }
  }, [basePath, refreshAll])

  const fetchAllStockCounts = React.useCallback(async (): Promise<StockCount[]> => {
    if (!basePath) return []
    try {
      const targetPath = stockCountsPathRef.current || productsPathRef.current || basePath
      return await StockDB.fetchAllStockCountsFromBasePath(targetPath)
    } catch (error) {
      console.error("Error fetching stock counts:", error)
      throw error
    }
  }, [basePath])

  const deleteStockCount = React.useCallback(async (stockCountId: string) => {
    if (!basePath) return
    try {
      const stockCountToDelete = state.stockCounts.find(sc => sc.id === stockCountId)
      const targetPath = stockCountsPathRef.current || productsPathRef.current || basePath
      stockCountsPathRef.current = targetPath
      await StockDB.deleteStockCountFromBasePath(targetPath, stockCountId)
      await refreshAll()
      
      // Add notification
      if (stockCountToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Stock Count Removed',
            `Stock count record was removed`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: stockCountId,
                entityName: 'Stock Count',
                oldValue: stockCountToDelete
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting stock count:", error)
      throw error
    }
  }, [basePath, refreshAll, state.stockCounts, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const buildStockBasePathForSite = React.useCallback((siteId?: string | null, subsiteId?: string | null) => {
    if (!companyState.companyID || !siteId) return ""
    const companyRoot = `companies/${companyState.companyID}`
    if (subsiteId) {
      return `${companyRoot}/sites/${siteId}/subsites/${subsiteId}/data/stock`
    }
    return `${companyRoot}/sites/${siteId}/data/stock`
  }, [companyState.companyID])

  const applyApprovedTransferStockMovement = React.useCallback(
    async (
      sourcePath: string,
      destinationPath: string,
      transfer: StockTransfer,
    ) => {
      const items = Array.isArray(transfer.items) ? transfer.items : []
      const userId = settingsState.auth?.uid || "system"

      for (const item of items) {
        const productId = String(item.productId || "").trim()
        const quantity = Number(item.quantity || 0)
        if (!productId || quantity <= 0) continue

        const [sourceProduct, destinationProduct] = await Promise.all([
          StockDB.fetchProductById(sourcePath, productId),
          StockDB.fetchProductById(destinationPath, productId),
        ])

        if (!sourceProduct) {
          throw new Error(`Source stock item not found for product ${productId}`)
        }
        if (!destinationProduct) {
          throw new Error(`Destination stock item not found for product ${productId}`)
        }

        const sourceCurrent = Number(sourceProduct.currentStock || 0)
        const destinationCurrent = Number(destinationProduct.currentStock || 0)
        if (sourceCurrent < quantity) {
          throw new Error(`Insufficient stock for product ${item.productName || productId}`)
        }

        await Promise.all([
          StockDB.updateProduct(sourcePath, productId, {
            currentStock: sourceCurrent - quantity,
            updatedAt: new Date().toISOString(),
          }),
          StockDB.updateProduct(destinationPath, productId, {
            currentStock: destinationCurrent + quantity,
            updatedAt: new Date().toISOString(),
          }),
        ])

        try {
          await createNotification(
            companyState.companyID,
            userId,
            "stock",
            "updated",
            "Stock Transfer Applied",
            `${quantity} units of "${item.productName || productId}" were transferred.`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: "medium",
              category: "info",
              details: {
                entityId: transfer.id || transfer.groupId,
                entityName: transfer.reference || "Stock Transfer",
                additionalInfo: {
                  productId,
                  quantity,
                  fromSiteId: transfer.fromSiteId,
                  fromSubsiteId: transfer.fromSubsiteId,
                  toSiteId: transfer.toSiteId,
                  toSubsiteId: transfer.toSubsiteId,
                },
              },
            },
          )
        } catch (notificationError) {
          console.warn("Failed to create stock transfer notification:", notificationError)
        }
      }
    },
    [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid],
  )

  const fetchAllStockTransfers = React.useCallback(async (): Promise<StockTransfer[]> => {
    const paths = getStockPaths()
    if (paths.length === 0) return []

    try {
      // Transfers can legitimately live at BOTH subsite and site level:
      // - subsite transfers: .../subsites/<id>/data/stock/stockTransfers
      // - site-wide transfers: .../sites/<id>/data/stock/stockTransfers (toSubsiteId empty)
      // So we merge results across all candidate paths instead of "first path wins".
      const results = await Promise.all(
        paths.map((p) => StockDB.fetchAllStockTransfersFromBasePath(p).catch(() => [])),
      )
      const merged = new Map<string, StockTransfer>()
      for (const list of results) {
        for (const tr of list || []) {
          const id = String((tr as any)?.id || "")
          if (!id) continue
          merged.set(id, tr)
        }
      }

      // Keep a stable default write path (subsite first when selected).
      stockTransfersPathRef.current = paths[0] || stockTransfersPathRef.current || ""

      return Array.from(merged.values())
    } catch (error) {
      console.error("Error fetching stock transfers:", error)
      throw error
    }
  }, [getStockPaths])

  const saveStockTransferPair = React.useCallback(async (transfer: StockTransfer) => {
    if (!basePath || !companyState.companyID) return
    const toSiteId = transfer.toSiteId || ""
    if (!toSiteId) {
      throw new Error("Target site is required for a stock transfer.")
    }

    const fromSiteIdResolved = transfer.fromSiteId || companyState.selectedSiteID || ""
    const fromSubsiteIdResolved =
      transfer.fromSubsiteId !== undefined ? transfer.fromSubsiteId : (companyState.selectedSubsiteID || undefined)

    const sentPath = buildStockBasePathForSite(fromSiteIdResolved, fromSubsiteIdResolved || null)
    const receivedPath = buildStockBasePathForSite(toSiteId, transfer.toSubsiteId || null)

    if (!sentPath) {
      throw new Error("Unable to resolve source site path for stock transfer.")
    }
    if (!receivedPath) {
      throw new Error("Unable to resolve target site path for stock transfer.")
    }

    const nowIso = new Date().toISOString()
    const fromSiteId = companyState.selectedSiteID || undefined
    const fromSubsiteId = companyState.selectedSubsiteID || undefined

    // Pull existing records (if any) to preserve approvals and avoid overwriting fields with undefined.
    const existingSource = transfer.id ? await StockDB.fetchStockTransferByIdFromBasePath(sentPath, transfer.id) : null
    const existingTarget = transfer.id ? await StockDB.fetchStockTransferByIdFromBasePath(receivedPath, transfer.id) : null

    const mergedApprovedBySource =
      transfer.approvedBySource !== undefined
        ? transfer.approvedBySource
        : (existingSource?.approvedBySource ?? existingTarget?.approvedBySource ?? false)
    const mergedApprovedByDestination =
      transfer.approvedByDestination !== undefined
        ? transfer.approvedByDestination
        : (existingSource?.approvedByDestination ?? existingTarget?.approvedByDestination ?? false)

    const mergedSourceApprovedAt =
      transfer.sourceApprovedAt !== undefined
        ? transfer.sourceApprovedAt
        : (existingSource?.sourceApprovedAt ?? existingTarget?.sourceApprovedAt)
    const mergedDestinationApprovedAt =
      transfer.destinationApprovedAt !== undefined
        ? transfer.destinationApprovedAt
        : (existingSource?.destinationApprovedAt ?? existingTarget?.destinationApprovedAt)
    const mergedStockAdjustedAt =
      transfer.stockAdjustedAt !== undefined
        ? transfer.stockAdjustedAt
        : (existingSource?.stockAdjustedAt ?? existingTarget?.stockAdjustedAt)
    const mergedStockAdjustedBy =
      transfer.stockAdjustedBy !== undefined
        ? transfer.stockAdjustedBy
        : (existingSource?.stockAdjustedBy ?? existingTarget?.stockAdjustedBy)

    // Always store the same from/to on both sides. transferType indicates perspective.
    const baseRecord: StockTransfer = {
      ...(existingSource || existingTarget || {}),
      ...transfer,
      fromSiteId: transfer.fromSiteId || fromSiteIdResolved || fromSiteId,
      fromSubsiteId: transfer.fromSubsiteId || fromSubsiteIdResolved || fromSubsiteId,
      toSiteId: toSiteId,
      toSubsiteId: transfer.toSubsiteId || undefined,
      // default required fields if caller omitted
      date: transfer.date || transfer.dateUK || nowIso.slice(0, 10),
      dateUK: transfer.dateUK || transfer.date || nowIso.slice(0, 10),
      status: transfer.status || (existingSource?.status as any) || (existingTarget?.status as any) || "Awaiting Submission",
      approvedBySource: mergedApprovedBySource,
      approvedByDestination: mergedApprovedByDestination,
      sourceApprovedAt: mergedSourceApprovedAt,
      destinationApprovedAt: mergedDestinationApprovedAt,
      stockAdjustedAt: mergedStockAdjustedAt,
      stockAdjustedBy: mergedStockAdjustedBy,
      items: Array.isArray(transfer.items) ? transfer.items : [],
      updatedAt: nowIso,
      createdAt: transfer.createdAt || nowIso,
      createdBy: transfer.createdBy || settingsState.auth?.uid || "system",
    }

    // Submission resets approvals.
    if (baseRecord.status === "Awaiting Submission") {
      baseRecord.approvedBySource = false
      baseRecord.approvedByDestination = false
      baseRecord.sourceApprovedAt = undefined
      baseRecord.destinationApprovedAt = undefined
    }
    if (baseRecord.status === "Awaiting Approval") {
      // If caller is moving to approval stage (or editing while in approval), keep merged approvals,
      // but compute final Approved only if both sides approved.
      if (baseRecord.approvedBySource && baseRecord.approvedByDestination) {
        baseRecord.status = "Approved"
      } else {
        baseRecord.status = "Awaiting Approval"
      }
    }

    // Save "sent" record in current (source) site
    const sentRecord: StockTransfer = {
      ...baseRecord,
      transferType: "sent",
    }

    // Create or update on source; get or reuse id
    const id = sentRecord.id
      ? sentRecord.id
      : await StockDB.saveStockTransfer(sentPath, sentRecord)

    const groupId = baseRecord.groupId || id

    const finalSent: StockTransfer = { ...sentRecord, id, groupId }
    const receivedRecord: StockTransfer = { ...baseRecord, id, groupId, transferType: "received" }

    const shouldApplyStockMovement = StockFunctions.shouldApplyTransferStockMovement(finalSent)

    if (shouldApplyStockMovement) {
      await applyApprovedTransferStockMovement(sentPath, receivedPath, finalSent)
      finalSent.stockAdjustedAt = nowIso
      finalSent.stockAdjustedBy = settingsState.auth?.uid || "system"
      receivedRecord.stockAdjustedAt = finalSent.stockAdjustedAt
      receivedRecord.stockAdjustedBy = finalSent.stockAdjustedBy
    }

    // Ensure the stored source record also has groupId/id populated
    await StockDB.saveStockTransfer(sentPath, finalSent)
    // Mirror to destination
    await StockDB.saveStockTransfer(receivedPath, receivedRecord)

    // Refresh other stock data (counts/items/etc). Transfer list pages will refetch transfers.
    await refreshAll()
  }, [
    basePath,
    companyState.companyID,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    settingsState.auth?.uid,
    applyApprovedTransferStockMovement,
    buildStockBasePathForSite,
    refreshAll,
  ])

  const deleteStockTransferPair = React.useCallback(async (transfer: StockTransfer) => {
    if (!basePath || !companyState.companyID) return
    const id = transfer.id
    if (!id) return

    const toSiteId = transfer.toSiteId || ""
    const fromSiteIdResolved = transfer.fromSiteId || companyState.selectedSiteID || ""
    const fromSubsiteIdResolved =
      transfer.fromSubsiteId !== undefined ? transfer.fromSubsiteId : (companyState.selectedSubsiteID || undefined)

    const sentPath = buildStockBasePathForSite(fromSiteIdResolved, fromSubsiteIdResolved || null)
    const receivedPath = buildStockBasePathForSite(toSiteId || null, transfer.toSubsiteId || null)

    // Delete both sides best-effort.
    if (sentPath) {
      try { await StockDB.deleteStockTransferFromBasePath(sentPath, id) } catch {}
    }
    if (receivedPath) {
      try { await StockDB.deleteStockTransferFromBasePath(receivedPath, id) } catch {}
    }

    await refreshAll()
  }, [basePath, companyState.companyID, buildStockBasePathForSite, refreshAll])

  const fetchLatestCountsForProducts = React.useCallback(async (): Promise<Record<string, any>> => {
    const paths = getStockPaths()
    if (paths.length === 0 || !state.products.length || !state.measures.length) return {}
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const counts = await StockDB.fetchLatestCountsForProductsFromBasePath(path, state.products, state.measures)
          if (counts && Object.keys(counts).length > 0) {
            debugVerbose(`Latest counts loaded from path: ${path}`)
            return counts
          }
        } catch (error) {
          debugVerbose(`No latest counts found at path: ${path}`)
          continue // Try next path
        }
      }
      debugVerbose("No latest counts found at any path")
      return {}
    } catch (error) {
      debugWarn("Error fetching latest counts:", error)
      throw error
    }
  }, [getStockPaths, state.products, state.measures])

  const saveParLevelProfile = React.useCallback(async (profile: any) => {
    if (!basePath) return
    try {
      const targetPath = parLevelsPathRef.current || productsPathRef.current || basePath
      parLevelsPathRef.current = targetPath
      await StockDB.saveParLevelProfile(targetPath, profile)
    } catch (error) {
      console.error("Error saving par level profile:", error)
      throw error
    }
  }, [basePath])

  const fetchParProfiles = React.useCallback(async (): Promise<any[]> => {
    const paths = getStockPaths()
    if (paths.length === 0) return []
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const profiles = await StockDB.fetchParProfiles(path)
          if (profiles && profiles.length > 0) {
            debugVerbose(`Par profiles loaded from path: ${path}`)
            return profiles
          }
        } catch (error) {
          debugVerbose(`No par profiles found at path: ${path}`)
          continue // Try next path
        }
      }
      debugVerbose("No par profiles found at any path")
      return []
    } catch (error) {
      debugWarn("Error fetching par profiles:", error)
      throw error
    }
  }, [getStockPaths])

  const deleteParProfile = React.useCallback(async (profileId: string) => {
    if (!basePath) return
    try {
      const targetPath = productsPathRef.current || basePath
      await StockDB.deleteParProfile(targetPath, profileId)
    } catch (error) {
      console.error("Error deleting par profile:", error)
      throw error
    }
  }, [basePath])

  const fetchMeasureData = React.useCallback(async (measureId: string): Promise<any> => {
    if (!basePath) return null
    try {
      const targetPath = productsPathRef.current || basePath
      return await StockDB.fetchMeasureData(targetPath, measureId)
    } catch (error) {
      console.error("Error fetching measure data:", error)
      throw error
    }
  }, [basePath])

  const fetchSalesHistory = React.useCallback(async (): Promise<any[]> => {
    const paths = getStockPaths()
    if (paths.length === 0) return []
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const sales = await StockDB.fetchSalesHistoryFromBasePath(path)
          if (sales && sales.length > 0) {
            debugVerbose(`Sales history loaded from path: ${path}`)
            return sales
          }
        } catch (error) {
          debugVerbose(`No sales history found at path: ${path}`)
          continue // Try next path
        }
      }
      debugVerbose("No sales history found at any path")
      return []
    } catch (error) {
      debugWarn("Error fetching sales history:", error)
      throw error
    }
  }, [getStockPaths])

  const fetchPurchasesHistory = React.useCallback(async (): Promise<any[]> => {
    const paths = getStockPaths()
    if (paths.length === 0) return []
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const purchases = await StockDB.fetchPurchasesHistoryFromBasePath(path)
          if (purchases && purchases.length > 0) {
            debugVerbose(`Purchases history loaded from path: ${path}`)
            return purchases
          }
        } catch (error) {
          debugVerbose(`No purchases history found at path: ${path}`)
          continue // Try next path
        }
      }
      debugVerbose("No purchases history found at any path")
      return []
    } catch (error) {
      debugWarn("Error fetching purchases history:", error)
      throw error
    }
  }, [getStockPaths])

  const fetchCurrentStock = React.useCallback(async (): Promise<any[]> => {
    const paths = getStockPaths()
    if (paths.length === 0) return []
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const stock = await StockDB.fetchCurrentStock(path)
          if (stock && stock.length > 0) {
            debugVerbose(`Current stock loaded from path: ${path}`)
            return stock
          }
        } catch (error) {
          debugVerbose(`No current stock found at path: ${path}`)
          continue // Try next path
        }
      }
      debugVerbose("No current stock found at any path")
      return []
    } catch (error) {
      debugWarn("Error fetching current stock:", error)
      throw error
    }
  }, [getStockPaths])

  const fetchPresetsFromDB = React.useCallback(async (): Promise<any[]> => {
    if (!basePath) return []
    try {
      const targetPath = productsPathRef.current || basePath
      return await StockDB.fetchPresetsFromDB(targetPath)
    } catch (error) {
      console.error("Error fetching presets:", error)
      throw error
    }
  }, [basePath])

  const savePresetToDB = React.useCallback(async (presetData: any) => {
    if (!basePath) return
    try {
      const targetPath = productsPathRef.current || basePath
      await StockDB.savePresetToDB(targetPath, presetData)
    } catch (error) {
      console.error("Error saving preset:", error)
      throw error
    }
  }, [basePath])

  const fetchCourses = React.useCallback(async (): Promise<any[]> => {
    if (!basePath) return []
    try {
      const targetPath = coursesPathRef.current || productsPathRef.current || basePath
      coursesPathRef.current = targetPath

      // Auto-recover from legacy bug where courses were written to `${path}/data/stock/courses`
      // even though `basePath` already included `/data/stock`.
      try {
        const currentSnap = await get(ref(db, `${targetPath}/courses`))
        if (!currentSnap.exists()) {
          const legacyPath = `${targetPath}/data/stock/courses`
          const legacySnap = await get(ref(db, legacyPath))
          if (legacySnap.exists()) {
            try {
              await set(ref(db, `${targetPath}/courses`), legacySnap.val())
              await remove(ref(db, legacyPath))
              debugWarn(`⚠️ Migrated legacy courses from ${legacyPath} -> ${targetPath}/courses`)
            } catch (migrateErr) {
              debugWarn(`⚠️ Failed migrating legacy courses at path: ${legacyPath}`, migrateErr)
            }
          }
        }
      } catch (migrationCheckErr) {
        // best-effort only; continue to fetch
        debugVerbose("fetchCourses: legacy migration check failed", migrationCheckErr)
      }

      const courses = await StockDB.fetchCourses(targetPath)
      // Keep context state in sync so all UIs render consistently.
      dispatch({ type: "SET_COURSES", payload: courses || [] })
      return courses || []
    } catch (error) {
      console.error("Error fetching courses:", error)
      throw error
    }
  }, [basePath, dispatch])

  const saveCourse = React.useCallback(async (course: any): Promise<string | undefined> => {
    if (!basePath) return
    try {
      const targetPath = coursesPathRef.current || productsPathRef.current || basePath
      coursesPathRef.current = targetPath
      const id = await StockDB.saveCourse(targetPath, course)
      // Refresh courses in state (used by item forms / selectors)
      try {
        const refreshed = await StockDB.fetchCourses(targetPath)
        dispatch({ type: "SET_COURSES", payload: refreshed })
      } catch {
        // best-effort
      }
      return id
    } catch (error) {
      console.error("Error saving course:", error)
      throw error
    }
  }, [basePath])

  const updateCourse = React.useCallback(async (courseId: string, course: any) => {
    if (!basePath) return
    try {
      const originalCourse = state.courses?.find(c => c.id === courseId)
      const targetPath = coursesPathRef.current || productsPathRef.current || basePath
      coursesPathRef.current = targetPath
      await StockDB.updateCourse(targetPath, courseId, course)
      
      // Add notification
      if (originalCourse) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'updated',
            'Course Updated',
            `Course "${course.name || originalCourse.name || 'Course'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: courseId,
                entityName: course.name || originalCourse.name || 'Course',
                oldValue: originalCourse,
                newValue: course,
                changes: {
                  course: { from: originalCourse, to: course }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error updating course:", error)
      throw error
    }
  }, [basePath, state.courses, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const deleteCourse = React.useCallback(async (courseId: string) => {
    if (!basePath) return
    try {
      const courseToDelete = state.courses?.find(c => c.id === courseId)
      const targetPath = coursesPathRef.current || productsPathRef.current || basePath
      coursesPathRef.current = targetPath
      await StockDB.deleteCourse(targetPath, courseId)
      
      // Add notification
      if (courseToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Course Deleted',
            `Course "${courseToDelete.name || 'Course'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: courseId,
                entityName: courseToDelete.name || 'Course',
                oldValue: courseToDelete,
                changes: {
                  course: { from: courseToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting course:", error)
      throw error
    }
  }, [basePath, state.courses, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const createSupplier = React.useCallback(async (supplier: any) => {
    if (!basePath) return
    try {
      const targetPath = suppliersPathRef.current || productsPathRef.current || basePath
      suppliersPathRef.current = targetPath
      const supplierId = await StockDB.createSupplier(supplier, targetPath)
      await refreshSuppliers()
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'created',
          'Supplier Added',
          `Supplier "${supplier.name || 'New Supplier'}" was added`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: typeof supplierId === 'string' ? supplierId : (supplier.id || 'new-supplier'),
              entityName: supplier.name || 'Supplier',
              newValue: supplier,
              changes: {
                supplier: { from: null, to: supplier }
              }
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error creating supplier:", error)
      throw error
    }
  }, [basePath, refreshSuppliers, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const updateSupplier = React.useCallback(async (supplierId: string, supplier: any) => {
    if (!basePath) return
    try {
      const originalSupplier = state.suppliers.find(s => s.id === supplierId)
      const targetPath = suppliersPathRef.current || productsPathRef.current || basePath
      suppliersPathRef.current = targetPath
      await StockDB.updateSupplier(targetPath, supplierId, supplier)
      await refreshSuppliers()
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'updated',
          'Supplier Updated',
          `Supplier "${supplier.name || originalSupplier?.name || 'Supplier'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: supplierId,
              entityName: supplier.name || originalSupplier?.name || 'Supplier',
              oldValue: originalSupplier,
              newValue: supplier,
              changes: {
                supplier: { from: originalSupplier, to: supplier }
              }
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error updating supplier:", error)
      throw error
    }
  }, [basePath, refreshSuppliers, state.suppliers, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const createProduct = React.useCallback(async (product: any) => {
    debugVerbose("🔍 StockContext: createProduct called")
    debugVerbose("🔍 StockContext: basePath:", basePath)
    debugVerbose("🔍 StockContext: companyState:", {
      companyID: companyState.companyID,
      selectedSiteID: companyState.selectedSiteID,
      selectedSubsiteID: companyState.selectedSubsiteID
    })
    debugVerbose("🔍 StockContext: product data:", product)
    
    if (!basePath) {
      debugWarn("❌ StockContext: No basePath available, cannot create product")
      return undefined
    }
    
    try {
      const targetPath = productsPathRef.current || basePath
      debugVerbose("🔍 StockContext: Calling StockFunctions.createProduct with path:", targetPath)
      const createdProduct = await StockFunctions.createProduct(targetPath, product)
      debugVerbose("✅ StockContext: Product created successfully:", createdProduct)
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'created',
          'Product Added',
          `Product "${product.name || createdProduct.name || 'New Product'}" was added to inventory`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: createdProduct.id,
              entityName: product.name || createdProduct.name || 'Product',
              newValue: createdProduct,
              changes: {
                product: { from: null, to: createdProduct }
              }
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      debugVerbose("🔍 StockContext: Refreshing products...")
      await refreshProducts()
      debugVerbose("✅ StockContext: Products refreshed")
      
      return createdProduct.id
    } catch (error) {
      debugWarn("❌ StockContext: Error creating product:", error)
      throw error
    }
  }, [basePath, refreshProducts, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const updateProduct = React.useCallback(async (productId: string, product: any) => {
    if (!basePath) return
    try {
      const originalProduct = state.products.find(p => p.id === productId)
      const targetPath = productOriginPathRef.current[productId] || productsPathRef.current || basePath
      await StockFunctions.updateProduct(targetPath, productId, product)
      // Instead of refreshing all products, just update the specific product in state
      const updatedProduct = { ...product, id: productId, updatedAt: new Date().toISOString() }
      dispatch({ 
        type: "UPDATE_PRODUCT", 
        payload: updatedProduct
      })
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'updated',
          'Product Updated',
          `Product "${product.name || originalProduct?.name || 'Product'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: productId,
              entityName: product.name || originalProduct?.name || 'Product',
              oldValue: originalProduct,
              newValue: updatedProduct,
              changes: {
                product: { from: originalProduct, to: updatedProduct }
              }
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error updating product:", error)
      throw error
    }
  }, [basePath, state.products, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid, dispatch])

  const deleteSupplier = React.useCallback(async (supplierId: string) => {
    if (!basePath) return
    try {
      const supplierToDelete = state.suppliers.find(s => s.id === supplierId)
      const targetPath = suppliersPathRef.current || productsPathRef.current || basePath
      suppliersPathRef.current = targetPath
      await StockDB.deleteSupplier(targetPath, supplierId)
      await refreshSuppliers()
      
      // Add notification
      if (supplierToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Supplier Removed',
            `Supplier "${supplierToDelete.name || 'Supplier'}" was removed`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: supplierId,
                entityName: supplierToDelete.name || 'Supplier',
                oldValue: supplierToDelete,
                changes: {
                  supplier: { from: supplierToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting supplier:", error)
      throw error
    }
  }, [basePath, refreshSuppliers, state.suppliers, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const fetchLocations = React.useCallback(async (): Promise<any[]> => {
    if (!basePath) return []
    try {
      const targetPath = locationsPathRef.current || productsPathRef.current || basePath
      // Back-compat: migrate legacy double-nested locations if present
      try {
        const currentSnap = await get(ref(db, `${targetPath}/locations`))
        if (!currentSnap.exists()) {
          const legacyPath = `${targetPath}/data/stock/locations`
          const legacySnap = await get(ref(db, legacyPath))
          if (legacySnap.exists()) {
            await set(ref(db, `${targetPath}/locations`), legacySnap.val())
            await remove(ref(db, legacyPath))
            debugWarn(`⚠️ Migrated legacy locations from ${legacyPath} -> ${targetPath}/locations`)
          }
        }
      } catch {
        // ignore
      }
      return await StockDB.fetchLocations(targetPath)
    } catch (error) {
      console.error("Error fetching locations:", error)
      throw error
    }
  }, [basePath])

  const updateLocation = React.useCallback(async (locationId: string, location: any) => {
    if (!basePath) return
    try {
      const targetPath = locationsPathRef.current || productsPathRef.current || basePath
      locationsPathRef.current = targetPath
      await StockDB.updateLocation(targetPath, locationId, location)
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'updated',
          'Location Updated',
          `Stock location "${location.name || locationId}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: locationId,
              entityName: location.name || locationId,
              newValue: location
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error updating location:", error)
      throw error
    }
  }, [basePath, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const deleteLocation = React.useCallback(async (locationId: string) => {
    if (!basePath) return
    try {
      const targetPath = locationsPathRef.current || productsPathRef.current || basePath
      locationsPathRef.current = targetPath
      await StockDB.deleteLocation(targetPath, locationId)
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'deleted',
          'Location Removed',
          `Stock location "${locationId}" was removed`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: locationId,
              entityName: locationId
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error deleting location:", error)
      throw error
    }
  }, [basePath, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const fetchSuppliers = React.useCallback(async (): Promise<any[]> => {
    if (!basePath) return []
    try {
      const targetPath = productsPathRef.current || basePath
      return await StockDB.fetchSuppliersFromBasePath(targetPath)
    } catch (error) {
      console.error("Error fetching suppliers:", error)
      throw error
    }
  }, [basePath])

  const fetchMeasures = React.useCallback(async (): Promise<any[]> => {
    if (!basePath) return []
    try {
      const targetPath = productsPathRef.current || basePath
      return await StockDB.fetchMeasuresFromBasePath(targetPath)
    } catch (error) {
      console.error("Error fetching measures:", error)
      throw error
    }
  }, [basePath])

  const saveMeasure = React.useCallback(async (measure: any): Promise<string | undefined> => {
    if (!basePath) return
    try {
      const targetPath = measuresPathRef.current || productsPathRef.current || basePath
      measuresPathRef.current = targetPath
      const id = await StockDB.saveMeasureToBasePath(targetPath, measure)
      await refreshMeasures()
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'created',
          'Measure Added',
          `Measure "${measure.name || measure.unit || 'New Measure'}" was added`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: measure.id,
              entityName: measure.name || measure.unit || 'Measure',
              newValue: measure
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      return id
    } catch (error) {
      console.error("Error saving measure:", error)
      throw error
    }
  }, [basePath, refreshMeasures, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const updateMeasure = React.useCallback(async (measureId: string, measure: any) => {
    if (!basePath) return
    try {
      const originalMeasure = state.measures.find(m => m.id === measureId)
      const targetPath = measuresPathRef.current || productsPathRef.current || basePath
      measuresPathRef.current = targetPath
      await StockDB.updateMeasureInBasePath(targetPath, measureId, measure)
      await refreshMeasures()
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'updated',
          'Measure Updated',
          `Measure "${measure.name || measure.unit || originalMeasure?.name || originalMeasure?.unit || 'Measure'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: measureId,
              entityName: measure.name || measure.unit || originalMeasure?.name || originalMeasure?.unit || 'Measure',
              oldValue: originalMeasure,
              newValue: measure
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error updating measure:", error)
      throw error
    }
  }, [basePath, refreshMeasures, state.measures, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const deleteMeasure = React.useCallback(async (measureId: string) => {
    if (!basePath) return
    try {
      const measureToDelete = state.measures.find(m => m.id === measureId)
      const targetPath = measuresPathRef.current || productsPathRef.current || basePath
      measuresPathRef.current = targetPath
      await StockDB.deleteMeasureFromBasePath(targetPath, measureId)
      await refreshMeasures()
      
      // Add notification
      if (measureToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Measure Removed',
            `Measure "${measureToDelete.name || measureToDelete.unit || 'Measure'}" was removed`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: measureId,
                entityName: measureToDelete.name || measureToDelete.unit || 'Measure',
                oldValue: measureToDelete
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting measure:", error)
      throw error
    }
  }, [basePath, refreshMeasures, state.measures, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const getGoogleMapsApiKey = React.useCallback((): string => {
    return StockFunctions.getGoogleMapsApiKey()
  }, [])

  const parseAddressComponents = React.useCallback((components: any[]): any => {
    return StockFunctions.parseAddressComponents(components)
  }, [])

  // createLocation function removed - doesn't exist in backend


  // Stock Locations CRUD
  const createStockLocation = React.useCallback(async (locationData: any) => {
    if (!basePath) return
    try {
      const targetPath = productsPathRef.current || basePath
      const locationId = await StockFunctions.createStockLocation(targetPath, locationData)
      await refreshAll() // Refresh to get updated locations
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'created',
          'Stock Location Added',
          `Stock location "${locationData.name || locationId}" was added`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: locationId,
              entityName: locationData.name || locationId,
              newValue: locationData
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return locationId
    } catch (error) {
      console.error("Error creating stock location:", error)
      throw error
    }
  }, [basePath, refreshAll, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const updateStockLocation = React.useCallback(async (locationId: string, locationData: any) => {
    if (!basePath) return
    try {
      const targetPath = productsPathRef.current || basePath
      await StockFunctions.updateStockLocation(targetPath, locationId, locationData)
      await refreshAll() // Refresh to get updated locations
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'updated',
          'Stock Location Updated',
          `Stock location "${locationData.name || locationId}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: locationId,
              entityName: locationData.name || locationId,
              newValue: locationData
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error updating stock location:", error)
      throw error
    }
  }, [basePath, refreshAll, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const deleteStockLocation = React.useCallback(async (locationId: string) => {
    if (!basePath) return
    try {
      const targetPath = productsPathRef.current || basePath
      await StockFunctions.deleteStockLocation(targetPath, locationId)
      await refreshAll() // Refresh to get updated locations
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'deleted',
          'Stock Location Removed',
          `Stock location "${locationId}" was removed`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: locationId,
              entityName: locationId
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error deleting stock location:", error)
      throw error
    }
  }, [basePath, refreshAll, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  // Par Levels CRUD
  const createParLevel = React.useCallback(async (parLevelData: any) => {
    if (!basePath) return
    try {
      const targetPath = parLevelsPathRef.current || productsPathRef.current || basePath
      parLevelsPathRef.current = targetPath
      const parLevelId = await StockFunctions.createParLevel(targetPath, parLevelData)
      await refreshAll() // Refresh to get updated par levels
      
      // Add notification
      try {
        const product = state.products.find(p => p.id === parLevelData.productId)
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'created',
          'Par Level Added',
          `Par level for "${product?.name || parLevelData.productId || 'Product'}" was added`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: parLevelId,
              entityName: product?.name || parLevelData.productId || 'Par Level',
              newValue: parLevelData
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return parLevelId
    } catch (error) {
      console.error("Error creating par level:", error)
      throw error
    }
  }, [basePath, refreshAll, state.products, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const updateParLevel = React.useCallback(async (parLevelId: string, parLevelData: any) => {
    if (!basePath) return
    try {
      const targetPath = parLevelsPathRef.current || productsPathRef.current || basePath
      parLevelsPathRef.current = targetPath
      await StockFunctions.updateParLevel(targetPath, parLevelId, parLevelData)
      await refreshAll() // Refresh to get updated par levels
      
      // Add notification
      try {
        const product = state.products.find(p => p.id === parLevelData.productId)
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'updated',
          'Par Level Updated',
          `Par level for "${product?.name || parLevelData.productId || 'Product'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: parLevelId,
              entityName: product?.name || parLevelData.productId || 'Par Level',
              newValue: parLevelData
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error updating par level:", error)
      throw error
    }
  }, [basePath, refreshAll, state.products, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const deleteParLevel = React.useCallback(async (parLevelId: string) => {
    if (!basePath) return
    try {
      const parLevelToDelete = state.parLevels.find((pl: any) => pl.id === parLevelId) as any
      const targetPath = parLevelsPathRef.current || productsPathRef.current || basePath
      parLevelsPathRef.current = targetPath
      await StockFunctions.deleteParLevel(targetPath, parLevelId)
      await refreshAll() // Refresh to get updated par levels
      
      // Add notification
      if (parLevelToDelete) {
        try {
          const product = state.products.find(p => p.id === parLevelToDelete.productId)
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Par Level Removed',
            `Par level for "${product?.name || parLevelToDelete.productId || 'Product'}" was removed`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: parLevelId,
                entityName: product?.name || parLevelToDelete.productId || 'Par Level',
                oldValue: parLevelToDelete
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting par level:", error)
      throw error
    }
  }, [basePath, refreshAll, state.parLevels, state.products, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const fetchProductById = React.useCallback(async (productId: string): Promise<Product | null> => {
    if (!basePath) return null
    try {
      const targetPath = productsPathRef.current || basePath
      return await StockDB.fetchProductById(targetPath, productId)
    } catch (error) {
      console.error("Error fetching product by ID:", error)
      throw error
    }
  }, [basePath])

  const saveProduct = React.useCallback(async (product: Product, isUpdate: boolean = false) => {
    if (!basePath) return
    try {
      const targetPath = productsPathRef.current || basePath
      await StockDB.saveProduct(product, targetPath, isUpdate)
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          isUpdate ? 'updated' : 'created',
          isUpdate ? 'Product Updated' : 'Product Added',
          `${product.name} was ${isUpdate ? 'updated' : 'added to inventory'}`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: isUpdate ? 'info' : 'success',
            details: {
              entityId: product.id,
              entityName: product.name,
              newValue: product,
              changes: {
                product: { from: isUpdate ? null : {}, to: product }
              }
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      await refreshProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      throw error
    }
  }, [basePath, refreshProducts, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  const deleteProduct = React.useCallback(async (productId: string) => {
    if (!basePath) return
    try {
      // Get product info before deletion for notification
      const productToDelete = state.products.find(p => p.id === productId)
      
      const targetPath = productOriginPathRef.current[productId] || productsPathRef.current || basePath
      await StockDB.deleteProduct(targetPath, productId)
      
      // Add notification
      if (productToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Product Removed',
            `${productToDelete.name} was removed from inventory`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: productId,
                entityName: productToDelete.name,
                oldValue: productToDelete,
                changes: {
                  product: { from: productToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      await refreshProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      throw error
    }
  }, [basePath, refreshProducts, state.products, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  // Till screen functions
  const fetchTillScreen = React.useCallback(async (screenId: string): Promise<any> => {
    if (!basePath) return null
    try {
      const targetPath = productsPathRef.current || basePath
      return await StockDB.fetchTillScreen(targetPath, screenId)
    } catch (error) {
      console.error("Error fetching till screen:", error)
      throw error
    }
  }, [basePath])

  const saveTillScreenWithId = React.useCallback(async (screenId: string, screenData: any) => {
    if (!basePath) return
    try {
      const targetPath = productsPathRef.current || basePath
      await StockDB.saveTillScreenWithId(targetPath, screenId, screenData)
    } catch (error) {
      console.error("Error saving till screen:", error)
      throw error
    }
  }, [basePath])

  const fetchStockHistory = React.useCallback(async (): Promise<any[]> => {
    if (!basePath) return []
    try {
      const targetPath = productsPathRef.current || basePath
      return await StockDB.fetchStockHistory(targetPath)
    } catch (error) {
      console.error("Error fetching stock history:", error)
      throw error
    }
  }, [basePath])

  // Category CRUD functions
  const createCategory = React.useCallback(async (categoryData: any): Promise<string | undefined> => {
    if (!basePath) return undefined
    try {
      const targetPath = categoriesPathRef.current || productsPathRef.current || basePath
      categoriesPathRef.current = targetPath
      const categoryId = await StockFunctions.createCategory(targetPath, categoryData)
      // Refresh only categories, subcategories, and sales divisions
      const [categories, subcategories, salesDivisions] = await Promise.all([
        StockDB.fetchCategoriesFromBasePath(targetPath),
        StockDB.fetchSubcategoriesFromBasePath(targetPath),
        StockDB.fetchSalesDivisionsFromBasePath(targetPath)
      ])
      dispatch({ type: "SET_CATEGORIES", payload: categories })
      dispatch({ type: "SET_SUBCATEGORIES", payload: subcategories })
      dispatch({ type: "SET_SALES_DIVISIONS", payload: salesDivisions })
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'created',
          'Category Added',
          `Category "${categoryData.name || categoryId}" was added`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: categoryId,
              entityName: categoryData.name || categoryId,
              newValue: categoryData
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return categoryId
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  }, [basePath, dispatch, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const updateCategory = React.useCallback(async (categoryId: string, categoryData: any): Promise<void> => {
    if (!basePath) return
    try {
      const originalCategory = state.categories.find(c => c.id === categoryId)
      const targetPath = categoriesPathRef.current || productsPathRef.current || basePath
      categoriesPathRef.current = targetPath
      await StockFunctions.updateCategory(targetPath, categoryId, categoryData)
      // Refresh only categories, subcategories, and sales divisions
      const [categories, subcategories, salesDivisions] = await Promise.all([
        StockDB.fetchCategoriesFromBasePath(targetPath),
        StockDB.fetchSubcategoriesFromBasePath(targetPath),
        StockDB.fetchSalesDivisionsFromBasePath(targetPath)
      ])
      dispatch({ type: "SET_CATEGORIES", payload: categories })
      dispatch({ type: "SET_SUBCATEGORIES", payload: subcategories })
      dispatch({ type: "SET_SALES_DIVISIONS", payload: salesDivisions })
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'stock',
          'updated',
          'Category Updated',
          `Category "${categoryData.name || originalCategory?.name || categoryId}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: categoryId,
              entityName: categoryData.name || originalCategory?.name || categoryId,
              oldValue: originalCategory,
              newValue: categoryData
            }
          }
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error("Error updating category:", error)
      throw error
    }
  }, [basePath, dispatch, state.categories, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  const deleteCategory = React.useCallback(async (categoryId: string): Promise<void> => {
    if (!basePath) return
    try {
      const categoryToDelete = state.categories.find(c => c.id === categoryId)
      const targetPath = categoriesPathRef.current || productsPathRef.current || basePath
      categoriesPathRef.current = targetPath
      await StockFunctions.deleteCategory(targetPath, categoryId)
      // Refresh only categories, subcategories, and sales divisions
      const [categories, subcategories, salesDivisions] = await Promise.all([
        StockDB.fetchCategoriesFromBasePath(targetPath),
        StockDB.fetchSubcategoriesFromBasePath(targetPath),
        StockDB.fetchSalesDivisionsFromBasePath(targetPath)
      ])
      dispatch({ type: "SET_CATEGORIES", payload: categories })
      dispatch({ type: "SET_SUBCATEGORIES", payload: subcategories })
      dispatch({ type: "SET_SALES_DIVISIONS", payload: salesDivisions })
      
      // Add notification
      if (categoryToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'stock',
            'deleted',
            'Category Removed',
            `Category "${categoryToDelete.name || categoryId}" was removed`,
            {
              siteId: companyState.selectedSiteID || undefined,
              subsiteId: companyState.selectedSubsiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: categoryId,
                entityName: categoryToDelete.name || categoryId,
                oldValue: categoryToDelete
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      throw error
    }
  }, [basePath, dispatch, state.categories, companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, settingsState.auth?.uid])

  // Auto-refresh data when base path changes (with progressive loading + caching)
  useEffect(() => {
    // Wait for dependencies: Settings and Company must be ready first
    if (!settingsState.auth || settingsState.loading) {
      return // Settings not ready yet
    }

    // Start loading only after Company core is ready
    if (!companyFullyLoaded) {
      return
    }
    
    // Wait for company, site, and subsite to be loaded
    // Only proceed if we have at least a company ID
    if (!companyState.companyID) {
      if (settingsState.auth.isLoggedIn) {
        previousBasePathRef.current = null
        loadedPaths.current.clear() // Clear loaded paths when company is deselected
        productsPathRef.current = ""
      }
      return // Company not selected yet
    }
    
    // Only load if we have a complete basePath (company + site/subsite structure ready)
    if (!basePath) {
      return // No base path available (waiting for site/subsite structure)
    }
    
    // If basePath changed (site/subsite changed), clear old paths and reload
    if (previousBasePathRef.current && previousBasePathRef.current !== basePath) {
      debugVerbose(`🔄 Stock Context: Base path changed from ${previousBasePathRef.current} to ${basePath} - clearing and reloading`)
      loadedPaths.current.clear() // Clear all loaded paths when path changes
      productsPathRef.current = ""
      // Set new path immediately so we don't skip loading it
      previousBasePathRef.current = basePath
    } else if (!previousBasePathRef.current) {
      // First time setting the path
      previousBasePathRef.current = basePath
    }
    
    // Skip if this exact path is already loaded (only if path hasn't changed)
    if (previousBasePathRef.current === basePath && loadedPaths.current.has(basePath)) {
      return // Skip if already loaded and path hasn't changed
    }

    // Clear any existing timeout for this path
    if (loadingTimeouts.current[basePath]) {
      clearTimeout(loadingTimeouts.current[basePath])
    }

    // Debounce loading to prevent rapid fire requests
    loadingTimeouts.current[basePath] = setTimeout(async () => {
      // Double check path hasn't changed and isn't already loaded
      if (previousBasePathRef.current !== basePath || loadedPaths.current.has(basePath)) {
        return
      }

      loadedPaths.current.add(basePath)
      
      // Load data with progressive loading (critical first, then background)
      // Critical: products, measures (most commonly used)
      // Background: suppliers, categories, etc.
      refreshAllRef.current().catch(error => {
        console.error('❌ Stock data refresh failed:', error)
        // Remove from loaded paths on error so it can retry
        loadedPaths.current.delete(basePath)
        // Ensure loading is cleared on error
        dispatch({ type: "SET_LOADING", payload: false })
      })
    }, 100) // Debounce for faster loading
    
    return () => {
      // Cleanup timeout if component unmounts or basePath changes
      if (loadingTimeouts.current[basePath]) {
        clearTimeout(loadingTimeouts.current[basePath])
        delete loadingTimeouts.current[basePath]
      }
    }
  }, [
    basePath,
    settingsState.auth?.uid,
    settingsState.auth?.isLoggedIn,
    settingsState.loading,
    companyFullyLoaded,
    companyState.companyID,
    dispatch,
  ])

  // Load purchase and sales history after products and measures are loaded
  useEffect(() => {
    const loadHistoryData = async () => {
      if (!basePath || !state.products.length || !state.measures.length) return
      
      try {
        debugVerbose('Loading purchase and sales history...')
        const [purchaseHist, salesHist] = await Promise.all([
          fetchPurchasesHistory(),
          fetchSalesHistory()
        ])
        
        dispatch({ type: "SET_PURCHASE_HISTORY", payload: purchaseHist })
        dispatch({ type: "SET_SALES_HISTORY", payload: salesHist })
        debugVerbose('History data loaded:', { purchases: purchaseHist.length, sales: salesHist.length })
      } catch (error) {
        console.error('Error loading history data:', error)
      }
    }
    
    loadHistoryData()
  }, [basePath, state.products.length, state.measures.length, fetchPurchasesHistory, fetchSalesHistory, dispatch])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: StockContextType = React.useMemo(() => ({
    state,
    dispatch,
    refreshProducts,
    refreshSuppliers,
    refreshMeasures,
    refreshAll,
    getStockData,
    canViewStock,
    canEditStock,
    canDeleteStock,
    isOwner: ownerCheck,
    basePath,
    // Data operation functions
    saveProduct,
    fetchProductById,
    deleteProduct,
    createProduct,
    updateProduct,
    savePurchase,
    fetchAllPurchases,
    deletePurchase,
    saveStockCount,
    fetchAllStockCounts,
    deleteStockCount,
    saveStockTransferPair,
    fetchAllStockTransfers,
    deleteStockTransferPair,
    fetchLatestCountsForProducts,
    saveParLevelProfile,
    fetchParProfiles,
    deleteParProfile,
    fetchMeasureData,
    fetchSalesHistory,
    fetchPurchasesHistory,
    fetchCurrentStock,
    fetchPresetsFromDB,
    savePresetToDB,
    fetchCourses,
    saveCourse,
    updateCourse,
    deleteCourse,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    fetchLocations,
    updateLocation,
    deleteLocation,
    fetchSuppliers,
    fetchMeasures,
    saveMeasure,
    updateMeasure,
    deleteMeasure,
    // Till screen functions
    fetchTillScreen,
    saveTillScreenWithId,
    fetchStockHistory,
    getGoogleMapsApiKey,
    parseAddressComponents,
    // Helper functions
    getParLevelValue: StockFunctions.getParLevelValue,
    getParLevelMeasureId: StockFunctions.getParLevelMeasureId,
    // New CRUD functions
    createCategory,
    updateCategory,
    deleteCategory,
    createStockLocation,
    updateStockLocation,
    deleteStockLocation,
    createParLevel,
    updateParLevel,
    deleteParLevel,

    // Stock Settings API
    getStockSettingsPath,
    loadStockSettings,
    saveStockSettings,
    fetchStockTargets,
    saveStockTarget,
    deleteStockTarget,
    loadStockIntegrations,
    saveStockIntegration,
  }), [
    state,
    dispatch,
    refreshProducts,
    refreshSuppliers,
    refreshMeasures,
    refreshAll,
    getStockData,
    canViewStock,
    canEditStock,
    canDeleteStock,
    ownerCheck,
    basePath,
    saveProduct,
    fetchProductById,
    deleteProduct,
    createProduct,
    updateProduct,
    savePurchase,
    fetchAllPurchases,
    deletePurchase,
    saveStockCount,
    fetchAllStockCounts,
    deleteStockCount,
    saveStockTransferPair,
    fetchAllStockTransfers,
    deleteStockTransferPair,
    fetchLatestCountsForProducts,
    saveParLevelProfile,
    fetchParProfiles,
    deleteParProfile,
    fetchMeasureData,
    fetchSalesHistory,
    fetchPurchasesHistory,
    fetchCurrentStock,
    fetchPresetsFromDB,
    savePresetToDB,
    fetchCourses,
    saveCourse,
    updateCourse,
    deleteCourse,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    fetchLocations,
    updateLocation,
    deleteLocation,
    fetchSuppliers,
    fetchMeasures,
    saveMeasure,
    updateMeasure,
    deleteMeasure,
    fetchTillScreen,
    saveTillScreenWithId,
    fetchStockHistory,
    getGoogleMapsApiKey,
    parseAddressComponents,
    StockFunctions,
    createCategory,
    updateCategory,
    deleteCategory,
    createStockLocation,
    updateStockLocation,
    deleteStockLocation,
    createParLevel,
    updateParLevel,
    deleteParLevel,
    getStockSettingsPath,
    loadStockSettings,
    saveStockSettings,
    fetchStockTargets,
    saveStockTarget,
    deleteStockTarget,
    loadStockIntegrations,
    saveStockIntegration,
  ])

  return <StockContext.Provider value={contextValue}>{children}</StockContext.Provider>
}

// Hook to use the context - graceful handling when not loaded
export const useStock = (): StockContextType => {
  const context = useContext(StockContext)
  if (context === undefined) {
    // Return a safe default context instead of throwing error
    // This allows components to render even when Stock module isn't loaded yet
    // Suppress warnings during initial load - components will wait for providers via guards
    // Only warn in development mode if this persists after initial load
    // (Warnings are expected during initial render before providers are ready)
    
    const emptyContext: StockContextType = {
      state: {
        companyID: null,
        siteID: null,
        subsiteID: null,
        products: [],
        suppliers: [],
        measures: [],
        salesDivisions: [],
        categories: [],
        subcategories: [],
        subCategories: [],
        courses: [],
        purchases: [],
        stockCounts: [],
        stockTransfers: [],
        stockItems: [],
        purchaseOrders: [],
        parLevels: [],
        latestCounts: {},
        purchaseHistory: [],
        salesHistory: [],
        loading: false,
        error: null,
        dataVersion: 0,
      },
      dispatch: () => {},
      refreshProducts: async () => {},
      refreshSuppliers: async () => {},
      refreshMeasures: async () => {},
      refreshAll: async () => {},
      getStockData: () => ({ products: [], suppliers: [], measures: [], salesDivisions: [], categories: [], subcategories: [] }),
      canViewStock: () => false,
      canEditStock: () => false,
      canDeleteStock: () => false,
      isOwner: () => false,
      basePath: "",
      saveProduct: async () => {},
      fetchProductById: async () => null,
      deleteProduct: async () => {},
      createProduct: async () => undefined,
      updateProduct: async () => {},
      savePurchase: async () => {},
      fetchAllPurchases: async () => [],
      deletePurchase: async () => {},
      saveStockCount: async () => {},
      fetchAllStockCounts: async () => [],
      deleteStockCount: async () => {},
      saveStockTransferPair: async () => {},
      fetchAllStockTransfers: async () => [],
      deleteStockTransferPair: async () => {},
      fetchLatestCountsForProducts: async () => ({}),
      saveParLevelProfile: async () => {},
      fetchParProfiles: async () => [],
      deleteParProfile: async () => {},
      fetchMeasureData: async () => null,
      fetchSalesHistory: async () => [],
      fetchPurchasesHistory: async () => [],
      fetchCurrentStock: async () => [],
      fetchPresetsFromDB: async () => [],
      savePresetToDB: async () => {},
      fetchCourses: async () => [],
      saveCourse: async () => undefined,
      updateCourse: async () => {},
      deleteCourse: async () => {},
      createSupplier: async () => {},
      updateSupplier: async () => {},
      deleteSupplier: async () => {},
      fetchLocations: async () => [],
      updateLocation: async () => {},
      deleteLocation: async () => {},
      fetchSuppliers: async () => [],
      fetchMeasures: async () => [],
      saveMeasure: async () => undefined,
      updateMeasure: async () => {},
      deleteMeasure: async () => {},
      fetchTillScreen: async () => null,
      saveTillScreenWithId: async () => {},
      fetchStockHistory: async () => [],
      getGoogleMapsApiKey: () => "",
      parseAddressComponents: () => ({}),
      getParLevelValue: () => 0,
      getParLevelMeasureId: () => undefined,
      getStockSettingsPath: () => null,
      loadStockSettings: async () => null,
      saveStockSettings: async () => {},
      fetchStockTargets: async () => [],
      saveStockTarget: async () => {},
      deleteStockTarget: async () => {},
      loadStockIntegrations: async () => ({}),
      saveStockIntegration: async () => {},
      createCategory: async () => undefined,
      updateCategory: async () => {},
      deleteCategory: async () => {},
      createStockLocation: async () => undefined,
      updateStockLocation: async () => {},
      deleteStockLocation: async () => {},
      createParLevel: async () => undefined,
      updateParLevel: async () => {},
      deleteParLevel: async () => {},
    }
    
    return emptyContext
  }
  return context
}

// Export types for frontend components to use
export type { 
  Product, 
  StockData, 
  Purchase, 
  StockCount,
  StockCountItem,
  Supplier,
  Measure,
  CategoryType,
  StockItem,
  PurchaseOrder,
  Bill,
  Sale,
  TillScreen,
  PaymentType,
  FloorPlan,
  Table,
  Card,
  Discount,
  Promotion,
  Correction,
  BagCheckItem,
  Location,
  Site,
  HeadCell,
  SortDirection,
  MeasureOption,
  FilterGroup,
  Filter,
  ProductRow,
  Column,
  TabPanelProps,
  StockDataGridProps,
  NewPaymentTypeProps,
  NewDeviceProps,
  NewCorrectionProps,
  UIParLevel,
  UIParLevelProfile,
  ParLevelProfileFromDB,
  PurchaseItem,
  StockPreset,
  Ticket,
  TicketSale,
  BagCheckConfig,
  PaymentIntegration
} from "../interfaces/Stock"
