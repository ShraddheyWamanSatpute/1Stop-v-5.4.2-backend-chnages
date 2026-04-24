"use client"

import React from "react"
import { createContext, useContext, useMemo, useReducer, useEffect, useCallback } from "react"
import { useCompany } from "./CompanyContext"
import { useSettings } from "./SettingsContext"
import * as POSFunctions from "../functions/POS"
import { measurePerformance, performanceTimer } from "../utils/PerformanceTimer"
import { createCachedFetcher } from "../utils/CachedFetcher"
import { dataCache } from "../utils/DataCache"
import { createNotification } from "../functions/Notifications"
import { debugLog, debugWarn } from "../utils/debugLog"
import { db, ref, get, set } from "../services/Firebase"
import {
  fetchPOSSettings as fetchPOSSettingsFn,
  savePOSSettings as savePOSSettingsFn,
  fetchPOSIntegrations as fetchPOSIntegrationsFn,
  savePOSIntegration as savePOSIntegrationFn,
} from "../data/POS"
import type { 
  Bill, TillScreen, PaymentType, FloorPlan, Table, Card, 
  Discount, Promotion, Correction, BagCheckItem,
  Location, Device, Ticket, TicketSale, PaymentTransaction, Group, Course
} from "../interfaces/POS"

type DataLevel = "company" | "site" | "subsite"

// State interface
interface POSState {
  bills: Bill[]
  tillScreens: TillScreen[]
  paymentTypes: PaymentType[]
  floorPlans: FloorPlan[]
  tables: Table[]
  cards: Card[]
  discounts: Discount[]
  promotions: Promotion[]
  corrections: Correction[]
  bagCheckItems: BagCheckItem[]
  locations: Location[]
  devices: Device[]
  tickets: Ticket[]
  ticketSales: TicketSale[]
  paymentTransactions: PaymentTransaction[]
  groups: Group[]
  courses: Course[]
  loading: boolean
  error: string | null
}

// Action types
type POSAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_BILLS"; payload: Bill[] }
  | { type: "SET_TILL_SCREENS"; payload: TillScreen[] }
  | { type: "SET_PAYMENT_TYPES"; payload: PaymentType[] }
  | { type: "SET_FLOOR_PLANS"; payload: FloorPlan[] }
  | { type: "SET_TABLES"; payload: Table[] }
  | { type: "SET_CARDS"; payload: Card[] }
  | { type: "SET_DISCOUNTS"; payload: Discount[] }
  | { type: "SET_PROMOTIONS"; payload: Promotion[] }
  | { type: "SET_CORRECTIONS"; payload: Correction[] }
  | { type: "SET_BAG_CHECK_ITEMS"; payload: BagCheckItem[] }
  | { type: "SET_LOCATIONS"; payload: Location[] }
  | { type: "SET_DEVICES"; payload: Device[] }
  | { type: "SET_TICKETS"; payload: Ticket[] }
  | { type: "SET_TICKET_SALES"; payload: TicketSale[] }
  | { type: "SET_PAYMENT_TRANSACTIONS"; payload: PaymentTransaction[] }
  | { type: "SET_GROUPS"; payload: Group[] }
  | { type: "SET_COURSES"; payload: Course[] }
  | { type: "PATCH_DATA"; payload: Partial<Omit<POSState, "loading" | "error">> }
  | { type: "SET_ALL_DATA"; payload: {
      bills: Bill[]
      tillScreens: TillScreen[]
      paymentTypes: PaymentType[]
      floorPlans: FloorPlan[]
      tables: Table[]
      cards: Card[]
      discounts: Discount[]
      promotions: Promotion[]
      corrections: Correction[]
      bagCheckItems: BagCheckItem[]
      locations: Location[]
      devices: Device[]
      tickets: Ticket[]
      ticketSales: TicketSale[]
      paymentTransactions: PaymentTransaction[]
      groups: Group[]
      courses: Course[]
    } }

export interface POSContextValue {
  // State
  state: POSState
  
  // Base paths
  companyId: string
  siteId: string | null
  subsiteId: string | null
  dataLevel: DataLevel
  rootBasePath: string
  basePaths: string[]
  stockBasePath: string
  stockBasePaths: string[]
  paymentsPath: string
  paymentsPaths: string[]
  posDataPath: string
  posDataPaths: string[]
  getPath: (key: "stock" | "products" | "paymentTypes" | "pos" | "sales" | "tillScreens" | "bills") => string
  getPaths: (key: "stock" | "products" | "paymentTypes" | "pos" | "sales") => string[]
  
  // Data fetching functions
  refreshAll: () => Promise<void>
  refreshBills: () => Promise<void>
  refreshTillScreens: () => Promise<void>
  refreshPaymentTypes: () => Promise<void>
  refreshFloorPlans: () => Promise<void>
  refreshTables: () => Promise<void>
  refreshCards: () => Promise<void>
  refreshDiscounts: () => Promise<void>
  refreshPromotions: () => Promise<void>
  refreshCorrections: () => Promise<void>
  refreshBagCheckItems: () => Promise<void>
  refreshLocations: () => Promise<void>
  refreshDevices: () => Promise<void>
  refreshTickets: () => Promise<void>
  refreshTicketSales: () => Promise<void>
  refreshPaymentTransactions: () => Promise<void>
  refreshGroups: () => Promise<void>
  refreshCourses: () => Promise<void>

  // Screen resolution (supports legacy Stock till screens migration)
  resolveTillScreen: (screenId: string) => Promise<TillScreen | null>
  
  // CRUD functions
  createBill: (bill: Omit<Bill, "id" | "createdAt" | "updatedAt">) => Promise<Bill>
  updateBill: (billId: string, updates: Partial<Bill>) => Promise<void>
  deleteBill: (billId: string) => Promise<void>
  createPaymentType: (paymentType: Omit<PaymentType, "id" | "createdAt" | "updatedAt">) => Promise<PaymentType>
  updatePaymentType: (paymentTypeId: string, updates: Partial<PaymentType>) => Promise<void>
  deletePaymentType: (paymentTypeId: string) => Promise<void>
  createTillScreen: (tillScreen: Omit<TillScreen, "id" | "createdAt" | "updatedAt">) => Promise<TillScreen>
  updateTillScreen: (tillScreenId: string, updates: Partial<TillScreen>) => Promise<void>
  deleteTillScreen: (tillScreenId: string) => Promise<void>
  createFloorPlan: (floorPlan: Omit<FloorPlan, "id" | "createdAt" | "updatedAt">) => Promise<FloorPlan>
  updateFloorPlan: (floorPlanId: string, updates: Partial<FloorPlan>) => Promise<void>
  deleteFloorPlan: (floorPlanId: string) => Promise<void>
  createTable: (table: Omit<Table, "id" | "createdAt" | "updatedAt">) => Promise<Table>
  updateTable: (tableId: string, updates: Partial<Table>) => Promise<void>
  deleteTable: (tableId: string) => Promise<void>
  createDiscount: (discount: Omit<Discount, "id" | "createdAt" | "updatedAt">) => Promise<Discount>
  updateDiscount: (discountId: string, updates: Partial<Discount>) => Promise<void>
  deleteDiscount: (discountId: string) => Promise<void>
  createPromotion: (promotion: Omit<Promotion, "id" | "createdAt" | "updatedAt">) => Promise<Promotion>
  updatePromotion: (promotionId: string, updates: Partial<Promotion>) => Promise<void>
  deletePromotion: (promotionId: string) => Promise<void>
  createCorrection: (correction: Omit<Correction, "id" | "createdAt" | "updatedAt">) => Promise<Correction>
  updateCorrection: (correctionId: string, updates: Partial<Correction>) => Promise<void>
  deleteCorrection: (correctionId: string) => Promise<void>
  createBagCheckItem: (bagCheckItem: Omit<BagCheckItem, "id" | "createdAt" | "updatedAt">) => Promise<BagCheckItem>
  updateBagCheckItem: (bagCheckItemId: string, updates: Partial<BagCheckItem>) => Promise<void>
  deleteBagCheckItem: (bagCheckItemId: string) => Promise<void>
  createLocation: (location: Omit<Location, "id" | "createdAt" | "updatedAt">) => Promise<Location>
  updateLocation: (locationId: string, updates: Partial<Location>) => Promise<void>
  deleteLocation: (locationId: string) => Promise<void>
  createDevice: (device: Omit<Device, "id" | "createdAt" | "updatedAt">) => Promise<Device>
  updateDevice: (deviceId: string, updates: Partial<Device>) => Promise<void>
  deleteDevice: (deviceId: string) => Promise<void>
  createCard: (card: Omit<Card, "id" | "createdAt" | "updatedAt">) => Promise<Card>
  updateCard: (cardId: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  createTicket: (ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt">) => Promise<Ticket>
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => Promise<void>
  deleteTicket: (ticketId: string) => Promise<void>
  createTicketSale: (ticketSale: Omit<TicketSale, "id" | "createdAt" | "updatedAt">) => Promise<TicketSale>
  updateTicketSale: (ticketSaleId: string, updates: Partial<TicketSale>) => Promise<void>
  deleteTicketSale: (ticketSaleId: string) => Promise<void>
  createPaymentTransaction: (tx: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">) => Promise<PaymentTransaction>
  updatePaymentTransaction: (txId: string, updates: Partial<PaymentTransaction>) => Promise<void>
  deletePaymentTransaction: (txId: string) => Promise<void>
  getPaymentTransactionsForBill: (billId: string) => PaymentTransaction[]
  createGroup: (group: Omit<Group, "id" | "createdAt" | "updatedAt">) => Promise<Group>
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  createCourse: (course: Omit<Course, "id" | "createdAt" | "updatedAt">) => Promise<Course>
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>
  deleteCourse: (courseId: string) => Promise<void>
  
  // Data lookup utilities
  getItemName: (itemId: string) => string
  getPaymentTypeName: (paymentTypeId: string) => string
  getLocationName: (locationId: string) => string

  // =======================
  // POS Settings (module settings, not /data/pos)
  // =======================
  getPOSSettingsPath: () => string | null
  loadPOSSettings: () => Promise<any | null>
  savePOSSettings: (settings: Record<string, any>) => Promise<void>

  // Integrations under settings/pos/integrations[/sites...][/subsites...]
  loadPOSIntegrations: () => Promise<Record<string, any>>
  savePOSIntegration: (integration: { id: string } & Record<string, any>) => Promise<void>
}

// Reducer
const posReducer = (state: POSState, action: POSAction): POSState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false }
    case "PATCH_DATA":
      return { ...state, ...action.payload }
    case "SET_BILLS":
      return { ...state, bills: action.payload }
    case "SET_TILL_SCREENS":
      return { ...state, tillScreens: action.payload }
    case "SET_PAYMENT_TYPES":
      return { ...state, paymentTypes: action.payload }
    case "SET_FLOOR_PLANS":
      return { ...state, floorPlans: action.payload }
    case "SET_TABLES":
      return { ...state, tables: action.payload }
    case "SET_CARDS":
      return { ...state, cards: action.payload }
    case "SET_DISCOUNTS":
      return { ...state, discounts: action.payload }
    case "SET_PROMOTIONS":
      return { ...state, promotions: action.payload }
    case "SET_CORRECTIONS":
      return { ...state, corrections: action.payload }
    case "SET_BAG_CHECK_ITEMS":
      return { ...state, bagCheckItems: action.payload }
    case "SET_LOCATIONS":
      return { ...state, locations: action.payload }
    case "SET_DEVICES":
      return { ...state, devices: action.payload }
    case "SET_TICKETS":
      return { ...state, tickets: action.payload }
    case "SET_TICKET_SALES":
      return { ...state, ticketSales: action.payload }
    case "SET_PAYMENT_TRANSACTIONS":
      return { ...state, paymentTransactions: action.payload }
    case "SET_GROUPS":
      return { ...state, groups: action.payload }
    case "SET_COURSES":
      return { ...state, courses: action.payload }
    case "SET_ALL_DATA":
      return {
        ...state,
        ...action.payload,
        loading: false,
        error: null,
      }
    default:
      return state
  }
}

// Fast-ish signature for list equality without sorting/JSON.stringify.
// Goal: reduce CPU cost during initial hydration while still avoiding needless updates.
function idsSignature<T>(
  items: T[] | undefined | null,
  getId: (item: T) => string | undefined,
): string {
  const arr = items || []
  let hash = 0
  for (let idx = 0; idx < arr.length; idx++) {
    const id = getId(arr[idx]) || ""
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
    }
  }
  return `${arr.length}:${hash}`
}

// Initial state
const initialState: POSState = {
  bills: [],
  tillScreens: [],
  paymentTypes: [],
  floorPlans: [],
  tables: [],
  cards: [],
  discounts: [],
  promotions: [],
  corrections: [],
  bagCheckItems: [],
  locations: [],
  devices: [],
  tickets: [],
  ticketSales: [],
  paymentTransactions: [],
  groups: [],
  courses: [],
  loading: false,
  error: null,
}

// Helper function to get base paths
function getBasePaths(
  companyId: string,
  selectedSiteId: string | null,
  selectedSubsiteId: string | null,
): string[] {
  const prefix = `companies/${companyId}`
  if (!companyId) return []

  // Priority logic: If subsite is selected, use subsite path. Otherwise, if site is selected, use site path.
  if (selectedSubsiteId && selectedSiteId) {
    return [`${prefix}/sites/${selectedSiteId}/subsites/${selectedSubsiteId}`]
  }
  if (selectedSiteId) {
    return [`${prefix}/sites/${selectedSiteId}`]
  }

  return [prefix]
}

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: companyState, getBasePath } = useCompany()
  const { state: settingsState } = useSettings()
  const [posState, dispatch] = useReducer(posReducer, initialState)

  // Track last loaded path to prevent duplicate loads
  const lastLoadedPathRef = React.useRef<string>("")
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout>()
  const isInitializedRef = React.useRef<boolean>(false)
  
  // Timer refs for performance tracking
  const posTimersRef = React.useRef<{
    basePath: string | null
    coreTimerId: string | null
    allTimerId: string | null
    coreLogged: boolean
    allLogged: boolean
    cacheLogged: boolean
  }>({ basePath: null, coreTimerId: null, allTimerId: null, coreLogged: false, allLogged: false, cacheLogged: false })

  // Get base path for POS data (add /data/pos like stock section)
  const rootBasePath = React.useMemo(() => {
    const basePath = getBasePath("pos")
    return basePath ? `${basePath}/data/pos` : ""
  }, [getBasePath])

  // Get POS paths with subsite priority (same pattern as stock)
  const getPOSPaths = React.useCallback(() => {
    if (!companyState.companyID) return []
    
    const paths = []
    const companyRoot = `companies/${companyState.companyID}`
    
    if (companyState.selectedSiteID) {
      // If subsite is selected, prioritize subsite level first
      if (companyState.selectedSubsiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/subsites/${companyState.selectedSubsiteID}/data/pos`)
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/pos`)
      } else {
        // If no subsite selected, only check site level
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/pos`)
      }
    } else {
      // If no site selected, try company level
      paths.push(`${companyRoot}/data/pos`)
    }
    
    return paths
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Data fetching functions
  const refreshBills = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const bills = await POSFunctions.getBills(path)
          if (bills && bills.length > 0) {
            dispatch({ type: "SET_BILLS", payload: bills })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_BILLS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching bills:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch bills" })
    }
  }

  const refreshTillScreens = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const tillScreens = await POSFunctions.getTillScreens(path)
          if (tillScreens && tillScreens.length > 0) {
            dispatch({ type: "SET_TILL_SCREENS", payload: tillScreens })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_TILL_SCREENS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching till screens:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch till screens" })
    }
  }

  const refreshPaymentTypes = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const paymentTypes = await POSFunctions.getPaymentTypes(path)
          if (paymentTypes && paymentTypes.length > 0) {
            dispatch({ type: "SET_PAYMENT_TYPES", payload: paymentTypes })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_PAYMENT_TYPES", payload: [] })
    } catch (error) {
      debugWarn("Error fetching payment types:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch payment types" })
    }
  }

  const refreshFloorPlans = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const floorPlans = await POSFunctions.getFloorPlans(path)
          if (floorPlans && floorPlans.length > 0) {
            dispatch({ type: "SET_FLOOR_PLANS", payload: floorPlans })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_FLOOR_PLANS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching floor plans:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch floor plans" })
    }
  }

  const refreshTables = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const tables = await POSFunctions.getTables(path)
          if (tables && tables.length > 0) {
            dispatch({ type: "SET_TABLES", payload: tables })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_TABLES", payload: [] })
    } catch (error) {
      debugWarn("Error fetching tables:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch tables" })
    }
  }

  const refreshCards = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const cards = await POSFunctions.getCards(path)
          if (cards && cards.length > 0) {
            dispatch({ type: "SET_CARDS", payload: cards })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_CARDS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching cards:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch cards" })
    }
  }

  const refreshDiscounts = async () => {
    if (!rootBasePath) return
    try {
      const discounts = await POSFunctions.getDiscounts(rootBasePath)
      dispatch({ type: "SET_DISCOUNTS", payload: discounts })
    } catch (error) {
      debugWarn("Error fetching discounts:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch discounts" })
    }
  }

  const refreshPromotions = async () => {
    if (!rootBasePath) return
    try {
      const promotions = await POSFunctions.getPromotions(rootBasePath)
      dispatch({ type: "SET_PROMOTIONS", payload: promotions })
    } catch (error) {
      debugWarn("Error fetching promotions:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch promotions" })
    }
  }

  const refreshCorrections = async () => {
    if (!rootBasePath) return
    try {
      const corrections = await POSFunctions.getCorrections(rootBasePath)
      dispatch({ type: "SET_CORRECTIONS", payload: corrections })
    } catch (error) {
      debugWarn("Error fetching corrections:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch corrections" })
    }
  }

  const refreshBagCheckItems = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return

    try {
      for (const path of paths) {
        try {
          const bagCheckItems = await POSFunctions.getBagCheckItems(path)
          if (bagCheckItems && bagCheckItems.length > 0) {
            dispatch({ type: "SET_BAG_CHECK_ITEMS", payload: bagCheckItems })
            return
          }
        } catch (error) {
          continue
        }
      }
      dispatch({ type: "SET_BAG_CHECK_ITEMS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching bag check items:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch bag check items" })
    }
  }

  const refreshTickets = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return

    try {
      for (const path of paths) {
        try {
          const tickets = await POSFunctions.getTickets(path)
          if (tickets && tickets.length > 0) {
            dispatch({ type: "SET_TICKETS", payload: tickets })
            return
          }
        } catch (error) {
          continue
        }
      }
      dispatch({ type: "SET_TICKETS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching tickets:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch tickets" })
    }
  }

  const refreshTicketSales = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return

    try {
      for (const path of paths) {
        try {
          const ticketSales = await POSFunctions.getTicketSales(path)
          if (ticketSales && ticketSales.length > 0) {
            dispatch({ type: "SET_TICKET_SALES", payload: ticketSales })
            return
          }
        } catch (error) {
          continue
        }
      }
      dispatch({ type: "SET_TICKET_SALES", payload: [] })
    } catch (error) {
      debugWarn("Error fetching ticket sales:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch ticket sales" })
    }
  }

  const refreshPaymentTransactions = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return

    try {
      for (const path of paths) {
        try {
          const txs = await POSFunctions.getPaymentTransactions(path)
          if (txs && txs.length > 0) {
            dispatch({ type: "SET_PAYMENT_TRANSACTIONS", payload: txs })
            return
          }
        } catch (error) {
          continue
        }
      }
      dispatch({ type: "SET_PAYMENT_TRANSACTIONS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching payment transactions:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch payment transactions" })
    }
  }

  const refreshGroups = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const groups = await POSFunctions.getGroups(path)
          if (groups && groups.length > 0) {
            dispatch({ type: "SET_GROUPS", payload: groups })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_GROUPS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching groups:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch groups" })
    }
  }

  const refreshCourses = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return
    
    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const courses = await POSFunctions.getCourses(path)
          if (courses && courses.length > 0) {
            dispatch({ type: "SET_COURSES", payload: courses })
            return // Success, exit early
          }
        } catch (error) {
          continue // Try next path
        }
      }
      dispatch({ type: "SET_COURSES", payload: [] })
    } catch (error) {
      debugWarn("Error fetching courses:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch courses" })
    }
  }

  // Resolve a till screen by id. If it doesn't exist in /data/pos, fall back to legacy
  // Stock till screen storage (/data/stock/tillScreens/<id>) and migrate it into POS.
  const resolveTillScreen = useCallback(
    async (screenId: string): Promise<TillScreen | null> => {
      const id = String(screenId || "").trim()
      if (!id) return null

      // 1) Fast path: already in state
      const inState = (posState.tillScreens || []).find((s) => String(s.id) === id)
      if (inState) return inState

      // 2) Fetch from POS paths directly (ensures we can return the object immediately)
      try {
        const paths = getPOSPaths()
        for (const path of paths) {
          try {
            const screens = await POSFunctions.getTillScreens(path)
            if (Array.isArray(screens) && screens.length) {
              const match = screens.find((s) => String((s as any)?.id) === id) || null
              if (match) {
                dispatch({ type: "SET_TILL_SCREENS", payload: screens })
                return match
              }
            }
          } catch {
            // try next
          }
        }
      } catch {
        // ignore
      }

      // 3) Legacy fallback: /data/stock/tillScreens/<id>
      try {
        const roots = getBasePaths(
          companyState.companyID || "",
          companyState.selectedSiteID || null,
          companyState.selectedSubsiteID || null,
        )
        for (const root of roots) {
          try {
            const legacyPath = `${root}/data/stock/tillScreens/${id}`
            const snap = await get(ref(db, legacyPath))
            if (!snap.exists()) continue

            const legacy = snap.val() || {}
            const legacyCards = (legacy?.cards || legacy?.layout?.cards || legacy?.layout || []) as Card[]
            const now = Date.now()

            const migrated: TillScreen = {
              id,
              name: String(legacy?.name || `Screen ${id}`),
              description: legacy?.description ? String(legacy.description) : undefined,
              deviceId: legacy?.deviceId,
              deviceName: legacy?.deviceName,
              locationId: legacy?.locationId,
              locationName: legacy?.locationName,
              layout: {
                width: Number(legacy?.layout?.width || legacy?.settings?.canvasWidth || 1600),
                height: Number(legacy?.layout?.height || legacy?.settings?.canvasHeight || 900),
                cards: Array.isArray(legacyCards) ? legacyCards : [],
              },
              settings: legacy?.settings,
              isActive: legacy?.isActive !== false,
              isDefault: Boolean(legacy?.isDefault),
              createdAt: Number(legacy?.createdAt || now),
              updatedAt: now,
            }

            // Best-effort migrate into POS so Management + Runtime share one source of truth.
            if (rootBasePath) {
              try {
                await set(ref(db, `${rootBasePath}/tillscreens/${id}`), migrated)
              } catch {
                // ignore migrate failures; still return migrated data
              }
            }

            // Refresh state (non-blocking)
            refreshTillScreens().catch(() => {})
            return migrated
          } catch {
            // try next root
          }
        }
      } catch {
        // ignore
      }

      return null
    },
    [
      companyState.companyID,
      companyState.selectedSiteID,
      companyState.selectedSubsiteID,
      getPOSPaths,
      posState.tillScreens,
      refreshTillScreens,
      rootBasePath,
    ],
  )

  const refreshLocations = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return

    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const locations = await POSFunctions.getLocations(path)
          if (locations && locations.length > 0) {
            dispatch({ type: "SET_LOCATIONS", payload: locations })
            return
          }
        } catch (error) {
          continue
        }
      }

      dispatch({ type: "SET_LOCATIONS", payload: [] })
    } catch (error) {
      debugWarn("Error fetching locations:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch locations" })
    }
  }

  const refreshDevices = async () => {
    const paths = getPOSPaths()
    if (paths.length === 0) return

    try {
      // Try each path until we find data
      for (const path of paths) {
        try {
          const devices = await POSFunctions.getDevices(path)
          if (devices && devices.length > 0) {
            dispatch({ type: "SET_DEVICES", payload: devices })
            return
          }
        } catch (error) {
          continue
        }
      }

      dispatch({ type: "SET_DEVICES", payload: [] })
    } catch (error) {
      debugWarn("Error fetching devices:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch devices" })
    }
  }

  // Create cached fetchers for critical data
  const fetchBillsCached = useMemo(() => createCachedFetcher(
    async () => {
      const paths = getPOSPaths()
      for (const p of paths) {
        try {
          const data = await POSFunctions.getBills(p)
          if (data && data.length > 0) return data
        } catch (error) {
          continue
        }
      }
      return []
    },
    'bills'
  ), [getPOSPaths])
  const fetchPaymentTypesCached = useMemo(() => createCachedFetcher(
    async () => {
      const paths = getPOSPaths()
      for (const p of paths) {
        try {
          const data = await POSFunctions.getPaymentTypes(p)
          if (data && data.length > 0) return data
        } catch (error) {
          continue
        }
      }
      return []
    },
    'paymentTypes'
  ), [getPOSPaths])
  const fetchTablesCached = useMemo(() => createCachedFetcher(
    async () => {
      const paths = getPOSPaths()
      for (const p of paths) {
        try {
          const data = await POSFunctions.getTables(p)
          if (data && data.length > 0) return data
        } catch (error) {
          continue
        }
      }
      return []
    },
    'tables'
  ), [getPOSPaths])

  const refreshAll = useCallback(async () => {
    if (!rootBasePath) {
      dispatch({ type: "SET_LOADING", payload: false })
      return
    }
    
    // Prevent duplicate loading for same path if already initialized
    if (rootBasePath === lastLoadedPathRef.current && isInitializedRef.current) {
      return
    }
    
    try {
      await measurePerformance('POSContext', 'refreshAll', async () => {
        dispatch({ type: "SET_LOADING", payload: true })
        lastLoadedPathRef.current = rootBasePath
        isInitializedRef.current = false
        
        // Start performance timers
        posTimersRef.current = {
          basePath: rootBasePath,
          coreTimerId: performanceTimer.start("POSContext", "coreLoad"),
          allTimerId: performanceTimer.start("POSContext", "allLoad"),
          coreLogged: false,
          allLogged: false,
          cacheLogged: false,
        }
        debugLog("⏳ POSContext: Starting load", { basePath: rootBasePath })
        
        try {
        const paths = getPOSPaths()

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

          const [
            billsCached,
            paymentTypesCached,
            tablesCached,
            tillScreensCached,
            floorPlansCached,
            cardsCached,
            discountsCached,
            promotionsCached,
            correctionsCached,
            bagCheckItemsCached,
            locationsCached,
            devicesCached,
            ticketsCached,
            ticketSalesCached,
            groupsCached,
            coursesCached,
          ] = await Promise.all([
            peekFirst<Bill>('bills'),
            peekFirst<PaymentType>('paymentTypes'),
            peekFirst<Table>('tables'),
            peekFirst<TillScreen>('tillscreens'),
            peekFirst<FloorPlan>('floorPlans'),
            peekFirst<Card>('cards'),
            peekFirst<Discount>('discounts'),
            peekFirst<Promotion>('promotions'),
            peekFirst<Correction>('corrections'),
            peekFirst<BagCheckItem>('bagCheckItems'),
            peekFirst<Location>('locations'),
            peekFirst<Device>('devices'),
            peekFirst<Ticket>('tickets'),
            peekFirst<TicketSale>('ticketSales'),
            peekFirst<any>('groups'),
            peekFirst<any>('courses'),
          ])

          if (
            billsCached ||
            paymentTypesCached ||
            tablesCached ||
            tillScreensCached ||
            floorPlansCached ||
            cardsCached ||
            discountsCached ||
            promotionsCached ||
            correctionsCached ||
            bagCheckItemsCached ||
            locationsCached ||
            devicesCached ||
            ticketsCached ||
            ticketSalesCached ||
            groupsCached ||
            coursesCached
          ) {
            // Only update slices that actually changed to reduce flashing/re-renders
            const payload: any = {}
            if (billsCached !== null) payload.bills = billsCached || []
            if (paymentTypesCached !== null) payload.paymentTypes = paymentTypesCached || []
            if (tablesCached !== null) payload.tables = tablesCached || []
            if (tillScreensCached !== null) payload.tillScreens = tillScreensCached || []
            if (floorPlansCached !== null) payload.floorPlans = floorPlansCached || []
            if (cardsCached !== null) payload.cards = cardsCached || []
            if (discountsCached !== null) payload.discounts = discountsCached || []
            if (promotionsCached !== null) payload.promotions = promotionsCached || []
            if (correctionsCached !== null) payload.corrections = correctionsCached || []
            if (bagCheckItemsCached !== null) payload.bagCheckItems = bagCheckItemsCached || []
            if (locationsCached !== null) payload.locations = locationsCached || []
            if (devicesCached !== null) payload.devices = devicesCached || []
            if (ticketsCached !== null) payload.tickets = ticketsCached || []
            if (ticketSalesCached !== null) payload.ticketSales = ticketSalesCached || []
            if (groupsCached !== null) payload.groups = groupsCached || []
            if (coursesCached !== null) payload.courses = coursesCached || []

            if (Object.keys(payload).length > 0) {
              // Mark as non-urgent so user interactions stay smooth while we hydrate.
              React.startTransition(() => {
                dispatch({ type: "PATCH_DATA", payload })
              })
            }
            if (!posTimersRef.current.cacheLogged) {
              posTimersRef.current.cacheLogged = true
              debugLog("✅ POSContext: Cache hydrated")
            }
            // Set loading to false immediately after cache hydration for instant UI
            // This allows components to render immediately with cached data
            dispatch({ type: "SET_LOADING", payload: false })
          }
        } catch {
          // ignore
        }
        
        // Helper to fetch from first available path
        const fetchFromPaths = async <T,>(fetchFn: (path: string) => Promise<T[]>): Promise<T[]> => {
          for (const path of paths) {
            try {
              const data = await fetchFn(path)
              if (data && data.length > 0) return data
            } catch (error) {
              // Failed to load from path - try next
              continue
            }
          }
          return []
        }
        
        // PROGRESSIVE LOADING: Critical data first (for immediate UI)
        const [bills, paymentTypes, tables] = await Promise.all([
          fetchBillsCached(rootBasePath, false).catch(() => fetchFromPaths(POSFunctions.getBills)),
          fetchPaymentTypesCached(rootBasePath, false).catch(() => fetchFromPaths(POSFunctions.getPaymentTypes)),
          fetchTablesCached(rootBasePath, false).catch(() => fetchFromPaths(POSFunctions.getTables)),
        ])
        
        // Load management page data (needed by all POS management pages)
        // These are required for TillScreensTable, PromotionsManagement, GroupManagement, TicketManagement, etc.
        const [tillScreens, promotions, groups, tickets] = await Promise.all([
          fetchFromPaths(POSFunctions.getTillScreens).catch(() => []),
          POSFunctions.getPromotions(rootBasePath).catch(() => []),
          fetchFromPaths(POSFunctions.getGroups).catch(() => []),
          POSFunctions.getTickets(rootBasePath).catch(() => []),
        ])

        // Persist management data to cache
        try { dataCache.set(`${rootBasePath}/tillscreens`, tillScreens || []) } catch {}
        try { dataCache.set(`${rootBasePath}/promotions`, promotions || []) } catch {}
        try { dataCache.set(`${rootBasePath}/groups`, groups || []) } catch {}
        try { dataCache.set(`${rootBasePath}/tickets`, tickets || []) } catch {}
        
        // Update critical data immediately (only if changed)
        const corePayload: any = {}
        if (
          idsSignature(posState.bills, (b) => b.id) !==
          idsSignature(bills, (b: Bill) => b.id)
        ) {
          corePayload.bills = bills || []
        }
        if (
          idsSignature(posState.paymentTypes, (p) => p.id) !==
          idsSignature(paymentTypes, (p: PaymentType) => p.id)
        ) {
          corePayload.paymentTypes = paymentTypes || []
        }
        if (
          idsSignature(posState.tables, (t) => t.id) !==
          idsSignature(tables, (t: Table) => t.id)
        ) {
          corePayload.tables = tables || []
        }
        // Include management data in core payload (needed by management pages)
        if (tillScreens && tillScreens.length !== posState.tillScreens.length) corePayload.tillScreens = tillScreens || []
        if (promotions && promotions.length !== posState.promotions.length) corePayload.promotions = promotions || []
        if (groups && groups.length !== posState.groups.length) corePayload.groups = groups || []
        if (tickets && tickets.length !== posState.tickets.length) corePayload.tickets = tickets || []
        
        if (Object.keys(corePayload).length > 0) {
          React.startTransition(() => {
            dispatch({ type: "PATCH_DATA", payload: corePayload })
          })
        }

        // Core loaded timing (bills/paymentTypes/tables)
        // Only log when all three critical entities are loaded
        if (!posTimersRef.current.coreLogged && posTimersRef.current.coreTimerId) {
          const billsLoaded = (bills || []).length > 0 || posState.bills.length > 0
          const paymentTypesLoaded = (paymentTypes || []).length > 0 || posState.paymentTypes.length > 0
          const tablesLoaded = (tables || []).length > 0 || posState.tables.length > 0
          
          if (billsLoaded && paymentTypesLoaded && tablesLoaded) {
            posTimersRef.current.coreLogged = true
            const duration = performanceTimer.end(posTimersRef.current.coreTimerId, {
              bills: (bills || []).length || posState.bills.length,
              paymentTypes: (paymentTypes || []).length || posState.paymentTypes.length,
              tables: (tables || []).length || posState.tables.length,
            })
            debugLog(`✅ POSContext: Core loaded (${duration.toFixed(2)}ms)`)
          }
        }
        
        // All data loaded timing - fires when core + management data is complete
        // This ensures "All data loaded" includes all data needed by all POS pages (including management pages)
        if (!posTimersRef.current.allLogged && posTimersRef.current.allTimerId && posTimersRef.current.coreLogged) {
          // All data is loaded when core + management data (tillScreens, promotions, groups, tickets) is ready
          // These are needed by all POS management pages (TillScreensTable, PromotionsManagement, GroupManagement, TicketManagement, etc.)
          const allDataLoaded = ((bills || []).length > 0 || posState.bills.length > 0) &&
                                ((paymentTypes || []).length > 0 || posState.paymentTypes.length > 0) &&
                                ((tables || []).length > 0 || posState.tables.length > 0) &&
                                (tillScreens !== undefined) && (promotions !== undefined) && 
                                (groups !== undefined) && (tickets !== undefined)
          
          if (allDataLoaded) {
            posTimersRef.current.allLogged = true
            const duration = performanceTimer.end(posTimersRef.current.allTimerId, {
              bills: (bills || []).length || posState.bills.length,
              paymentTypes: (paymentTypes || []).length || posState.paymentTypes.length,
              tables: (tables || []).length || posState.tables.length,
              tillScreens: (tillScreens || []).length,
              promotions: (promotions || []).length,
              groups: (groups || []).length,
              tickets: (tickets || []).length,
            })
            debugLog(`✅ POSContext: All data loaded (${duration.toFixed(2)}ms)`)
          }
        }
        
        isInitializedRef.current = true
        
        // BACKGROUND: Load non-critical data after (non-blocking)
        // These are data that's not essential for immediate page rendering
        const loadBackgroundData = () => {
          Promise.all([
            fetchFromPaths(POSFunctions.getFloorPlans),
            fetchFromPaths(POSFunctions.getCards),
            fetchFromPaths(POSFunctions.getCourses),
            POSFunctions.getDiscounts(rootBasePath).catch(() => []),
            POSFunctions.getCorrections(rootBasePath).catch(() => []),
            POSFunctions.getBagCheckItems(rootBasePath).catch(() => []),
            POSFunctions.getLocations(rootBasePath).catch(() => []),
            POSFunctions.getDevices(rootBasePath).catch(() => []),
            POSFunctions.getTicketSales(rootBasePath).catch(() => []),
          ]).then(([
            floorPlans, cards, courses,
            discounts, corrections, bagCheckItems,
            locations, devices, ticketSales
          ]) => {
            const bgPayload: any = {
              floorPlans: floorPlans || [],
              cards: cards || [],
              courses: courses || [],
              discounts: discounts || [],
              corrections: corrections || [],
              bagCheckItems: bagCheckItems || [],
              locations: locations || [],
              devices: devices || [],
              ticketSales: ticketSales || [],
            }
            
            React.startTransition(() => {
              dispatch({ type: "PATCH_DATA", payload: bgPayload })
            })
          }).catch(error => {
            debugWarn('Error loading background POS data:', error)
          })
        }
        
        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          requestIdleCallback(loadBackgroundData, { timeout: 300 })
        } else {
          setTimeout(loadBackgroundData, 100)
        }
        } catch (error) {
          debugWarn("Error refreshing all POS data:", error)
          dispatch({ type: "SET_ERROR", payload: "Failed to refresh data" })
        } finally {
          dispatch({ type: "SET_LOADING", payload: false })
        }
      }, () => ({
        bills: posState.bills?.length || 0,
        paymentTypes: posState.paymentTypes?.length || 0,
        tables: posState.tables?.length || 0,
      }))
    } catch (error) {
      // Ensure loading is cleared even if measurePerformance fails
      debugWarn("Error in measurePerformance wrapper:", error)
      dispatch({ type: "SET_LOADING", payload: false })
      throw error
    }
  }, [rootBasePath, getPOSPaths, fetchBillsCached, fetchPaymentTypesCached, fetchTablesCached, dispatch])

  // CRUD functions
  const createBill = async (bill: Omit<Bill, "id" | "createdAt" | "updatedAt">): Promise<Bill> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newBill = await POSFunctions.createBill(rootBasePath, bill)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'POS Bill Created',
        `Bill ${newBill.id || 'new bill'} was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newBill.id,
            entityName: `Bill ${newBill.id}`,
            newValue: newBill,
            changes: {
              bill: { from: {}, to: newBill }
            }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshBills()
    return newBill
  }

  const updateBill = async (billId: string, updates: Partial<Bill>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalBill = posState.bills.find(b => b.id === billId)
    await POSFunctions.updateBill(rootBasePath, billId, updates)
    
    // Add notification
    if (originalBill) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'POS Bill Updated',
          `Bill ${billId} was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: billId,
              entityName: `Bill ${billId}`,
              oldValue: originalBill,
              newValue: { ...originalBill, ...updates },
              changes: {
                bill: { from: originalBill, to: { ...originalBill, ...updates } }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshBills()
  }

  const deleteBill = async (billId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const billToDelete = posState.bills.find(b => b.id === billId)
    await POSFunctions.deleteBill(rootBasePath, billId)
    
    // Add notification
    if (billToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'POS Bill Deleted',
          `Bill ${billId} was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: billId,
              entityName: `Bill ${billId}`,
              oldValue: billToDelete,
              changes: {
                bill: { from: billToDelete, to: null }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshBills()
  }

  const createPaymentType = async (paymentType: Omit<PaymentType, "id" | "createdAt" | "updatedAt">): Promise<PaymentType> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newPaymentType = await POSFunctions.createPaymentType(rootBasePath, paymentType)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Payment Type Created',
        `Payment type "${paymentType.name || 'New Payment Type'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newPaymentType.id,
            entityName: paymentType.name || 'Payment Type',
            newValue: newPaymentType,
            changes: {
              paymentType: { from: {}, to: newPaymentType }
            }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshPaymentTypes()
    return newPaymentType
  }

  const updatePaymentType = async (paymentTypeId: string, updates: Partial<PaymentType>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalPaymentType = posState.paymentTypes.find(pt => pt.id === paymentTypeId)
    await POSFunctions.updatePaymentType(rootBasePath, paymentTypeId, updates)
    
    // Add notification
    if (originalPaymentType) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Payment Type Updated',
          `Payment type "${updates.name || originalPaymentType.name || 'Payment Type'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: paymentTypeId,
              entityName: updates.name || originalPaymentType.name || 'Payment Type',
              oldValue: originalPaymentType,
              newValue: { ...originalPaymentType, ...updates },
              changes: {
                paymentType: { from: originalPaymentType, to: { ...originalPaymentType, ...updates } }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshPaymentTypes()
  }

  const deletePaymentType = async (paymentTypeId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const paymentTypeToDelete = posState.paymentTypes.find(pt => pt.id === paymentTypeId)
    await POSFunctions.deletePaymentType(rootBasePath, paymentTypeId)
    
    // Add notification
    if (paymentTypeToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Payment Type Deleted',
          `Payment type "${paymentTypeToDelete.name || 'Payment Type'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: paymentTypeId,
              entityName: paymentTypeToDelete.name || 'Payment Type',
              oldValue: paymentTypeToDelete,
              changes: {
                paymentType: { from: paymentTypeToDelete, to: null }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshPaymentTypes()
  }

  const createTillScreen = async (tillScreen: Omit<TillScreen, "id" | "createdAt" | "updatedAt">): Promise<TillScreen> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newTillScreen = await POSFunctions.createTillScreen(rootBasePath, tillScreen)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Till Screen Created',
        `Till screen "${tillScreen.name || 'New Till Screen'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newTillScreen.id,
            entityName: tillScreen.name || 'Till Screen',
            newValue: newTillScreen,
            changes: { tillScreen: { from: {}, to: newTillScreen } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshTillScreens()
    return newTillScreen
  }

  const updateTillScreen = async (tillScreenId: string, updates: Partial<TillScreen>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalTillScreen = posState.tillScreens.find(ts => ts.id === tillScreenId)
    await POSFunctions.updateTillScreen(rootBasePath, tillScreenId, updates)
    
    // Add notification
    if (originalTillScreen) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Till Screen Updated',
          `Till screen "${updates.name || originalTillScreen.name || 'Till Screen'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: tillScreenId,
              entityName: updates.name || originalTillScreen.name || 'Till Screen',
              oldValue: originalTillScreen,
              newValue: { ...originalTillScreen, ...updates },
              changes: { tillScreen: { from: originalTillScreen, to: { ...originalTillScreen, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTillScreens()
  }

  const deleteTillScreen = async (tillScreenId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const tillScreenToDelete = posState.tillScreens.find(ts => ts.id === tillScreenId)
    await POSFunctions.deleteTillScreen(rootBasePath, tillScreenId)
    
    // Add notification
    if (tillScreenToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Till Screen Deleted',
          `Till screen "${tillScreenToDelete.name || 'Till Screen'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: tillScreenId,
              entityName: tillScreenToDelete.name || 'Till Screen',
              oldValue: tillScreenToDelete,
              changes: { tillScreen: { from: tillScreenToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTillScreens()
  }

  const createFloorPlan = async (floorPlan: Omit<FloorPlan, "id" | "createdAt" | "updatedAt">): Promise<FloorPlan> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newFloorPlan = await POSFunctions.createFloorPlan(rootBasePath, floorPlan)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Floor Plan Created',
        `Floor plan "${floorPlan.name || 'New Floor Plan'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newFloorPlan.id,
            entityName: floorPlan.name || 'Floor Plan',
            newValue: newFloorPlan,
            changes: { floorPlan: { from: {}, to: newFloorPlan } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshFloorPlans()
    return newFloorPlan
  }

  const updateFloorPlan = async (floorPlanId: string, updates: Partial<FloorPlan>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalFloorPlan = posState.floorPlans.find(fp => fp.id === floorPlanId)
    await POSFunctions.updateFloorPlan(rootBasePath, floorPlanId, updates)
    
    // Add notification
    if (originalFloorPlan) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Floor Plan Updated',
          `Floor plan "${updates.name || originalFloorPlan.name || 'Floor Plan'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: floorPlanId,
              entityName: updates.name || originalFloorPlan.name || 'Floor Plan',
              oldValue: originalFloorPlan,
              newValue: { ...originalFloorPlan, ...updates },
              changes: { floorPlan: { from: originalFloorPlan, to: { ...originalFloorPlan, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshFloorPlans()
  }

  const deleteFloorPlan = async (floorPlanId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const floorPlanToDelete = posState.floorPlans.find(fp => fp.id === floorPlanId)
    await POSFunctions.deleteFloorPlan(rootBasePath, floorPlanId)
    
    // Add notification
    if (floorPlanToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Floor Plan Deleted',
          `Floor plan "${floorPlanToDelete.name || 'Floor Plan'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: floorPlanId,
              entityName: floorPlanToDelete.name || 'Floor Plan',
              oldValue: floorPlanToDelete,
              changes: { floorPlan: { from: floorPlanToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshFloorPlans()
  }

  const createTable = async (table: Omit<Table, "id" | "createdAt" | "updatedAt">): Promise<Table> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newTable = await POSFunctions.createTable(rootBasePath, table)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Table Created',
        `Table "${table.name || table.number || 'New Table'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newTable.id,
            entityName: table.name || String(table.number ?? "") || 'Table',
            newValue: newTable,
            changes: { table: { from: {}, to: newTable } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshTables()
    return newTable
  }

  const updateTable = async (tableId: string, updates: Partial<Table>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalTable = posState.tables.find(t => t.id === tableId)
    await POSFunctions.updateTable(rootBasePath, tableId, updates)
    
    // Add notification
    if (originalTable) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Table Updated',
          `Table "${updates.name || updates.number || originalTable.name || originalTable.number || 'Table'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: tableId,
              entityName:
                updates.name ||
                String(updates.number ?? "") ||
                originalTable.name ||
                String(originalTable.number ?? "") ||
                'Table',
              oldValue: originalTable,
              newValue: { ...originalTable, ...updates },
              changes: { table: { from: originalTable, to: { ...originalTable, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTables()
  }

  const deleteTable = async (tableId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const tableToDelete = posState.tables.find(t => t.id === tableId)
    await POSFunctions.deleteTable(rootBasePath, tableId)
    
    // Add notification
    if (tableToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Table Deleted',
          `Table "${tableToDelete.name || tableToDelete.number || 'Table'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: tableId,
              entityName: tableToDelete.name || String(tableToDelete.number ?? "") || 'Table',
              oldValue: tableToDelete,
              changes: { table: { from: tableToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTables()
  }

  const createDiscount = async (discount: Omit<Discount, "id" | "createdAt" | "updatedAt">): Promise<Discount> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newDiscount = await POSFunctions.createDiscount(rootBasePath, discount)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Discount Created',
        `Discount "${discount.name || discount.code || 'New Discount'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newDiscount.id,
            entityName: discount.name || discount.code || 'Discount',
            newValue: newDiscount,
            changes: { discount: { from: {}, to: newDiscount } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshDiscounts()
    return newDiscount
  }

  const updateDiscount = async (discountId: string, updates: Partial<Discount>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalDiscount = posState.discounts.find(d => d.id === discountId)
    await POSFunctions.updateDiscount(rootBasePath, discountId, updates)
    
    // Add notification
    if (originalDiscount) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Discount Updated',
          `Discount "${updates.name || updates.code || originalDiscount.name || originalDiscount.code || 'Discount'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: discountId,
              entityName: updates.name || updates.code || originalDiscount.name || originalDiscount.code || 'Discount',
              oldValue: originalDiscount,
              newValue: { ...originalDiscount, ...updates },
              changes: { discount: { from: originalDiscount, to: { ...originalDiscount, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshDiscounts()
  }

  const deleteDiscount = async (discountId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const discountToDelete = posState.discounts.find(d => d.id === discountId)
    await POSFunctions.deleteDiscount(rootBasePath, discountId)
    
    // Add notification
    if (discountToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Discount Deleted',
          `Discount "${discountToDelete.name || discountToDelete.code || 'Discount'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: discountId,
              entityName: discountToDelete.name || discountToDelete.code || 'Discount',
              oldValue: discountToDelete,
              changes: { discount: { from: discountToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshDiscounts()
  }

  const createPromotion = async (promotion: Omit<Promotion, "id" | "createdAt" | "updatedAt">): Promise<Promotion> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newPromotion = await POSFunctions.createPromotion(rootBasePath, promotion)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Promotion Created',
        `Promotion "${promotion.name || promotion.code || 'New Promotion'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newPromotion.id,
            entityName: promotion.name || promotion.code || 'Promotion',
            newValue: newPromotion,
            changes: { promotion: { from: {}, to: newPromotion } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshPromotions()
    return newPromotion
  }

  const updatePromotion = async (promotionId: string, updates: Partial<Promotion>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalPromotion = posState.promotions.find(p => p.id === promotionId)
    await POSFunctions.updatePromotion(rootBasePath, promotionId, updates)
    
    // Add notification
    if (originalPromotion) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Promotion Updated',
          `Promotion "${updates.name || updates.code || originalPromotion.name || originalPromotion.code || 'Promotion'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: promotionId,
              entityName: updates.name || updates.code || originalPromotion.name || originalPromotion.code || 'Promotion',
              oldValue: originalPromotion,
              newValue: { ...originalPromotion, ...updates },
              changes: { promotion: { from: originalPromotion, to: { ...originalPromotion, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshPromotions()
  }

  const deletePromotion = async (promotionId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const promotionToDelete = posState.promotions.find(p => p.id === promotionId)
    await POSFunctions.deletePromotion(rootBasePath, promotionId)
    
    // Add notification
    if (promotionToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Promotion Deleted',
          `Promotion "${promotionToDelete.name || promotionToDelete.code || 'Promotion'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: promotionId,
              entityName: promotionToDelete.name || promotionToDelete.code || 'Promotion',
              oldValue: promotionToDelete,
              changes: { promotion: { from: promotionToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshPromotions()
  }

  const createCorrection = async (correction: Omit<Correction, "id" | "createdAt" | "updatedAt">): Promise<Correction> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newCorrection = await POSFunctions.createCorrection(rootBasePath, correction)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Correction Created',
        `Correction was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'info',
          details: {
            entityId: newCorrection.id,
            entityName: 'Correction',
            newValue: newCorrection,
            changes: { correction: { from: {}, to: newCorrection } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshCorrections()
    return newCorrection
  }

  const updateCorrection = async (correctionId: string, updates: Partial<Correction>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalCorrection = posState.corrections.find(c => c.id === correctionId)
    await POSFunctions.updateCorrection(rootBasePath, correctionId, updates)
    
    // Add notification
    if (originalCorrection) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Correction Updated',
          `Correction was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: correctionId,
              entityName: 'Correction',
              oldValue: originalCorrection,
              newValue: { ...originalCorrection, ...updates },
              changes: { correction: { from: originalCorrection, to: { ...originalCorrection, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshCorrections()
  }

  const deleteCorrection = async (correctionId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const correctionToDelete = posState.corrections.find(c => c.id === correctionId)
    await POSFunctions.deleteCorrection(rootBasePath, correctionId)
    
    // Add notification
    if (correctionToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Correction Deleted',
          `Correction was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: correctionId,
              entityName: 'Correction',
              oldValue: correctionToDelete,
              changes: { correction: { from: correctionToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshCorrections()
  }

  const createBagCheckItem = async (bagCheckItem: Omit<BagCheckItem, "id" | "createdAt" | "updatedAt">): Promise<BagCheckItem> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newBagCheckItem = await POSFunctions.createBagCheckItem(rootBasePath, bagCheckItem)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Bag Check Item Created',
        `Bag check item "${bagCheckItem.name || 'New Item'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newBagCheckItem.id,
            entityName: bagCheckItem.name || 'Bag Check Item',
            newValue: newBagCheckItem,
            changes: { bagCheckItem: { from: {}, to: newBagCheckItem } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshBagCheckItems()
    return newBagCheckItem
  }

  const updateBagCheckItem = async (bagCheckItemId: string, updates: Partial<BagCheckItem>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalBagCheckItem = posState.bagCheckItems.find(bci => bci.id === bagCheckItemId)
    await POSFunctions.updateBagCheckItem(rootBasePath, bagCheckItemId, updates)
    
    // Add notification
    if (originalBagCheckItem) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Bag Check Item Updated',
          `Bag check item "${updates.name || originalBagCheckItem.name || 'Item'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: bagCheckItemId,
              entityName: updates.name || originalBagCheckItem.name || 'Bag Check Item',
              oldValue: originalBagCheckItem,
              newValue: { ...originalBagCheckItem, ...updates },
              changes: { bagCheckItem: { from: originalBagCheckItem, to: { ...originalBagCheckItem, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshBagCheckItems()
  }

  const deleteBagCheckItem = async (bagCheckItemId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const bagCheckItemToDelete = posState.bagCheckItems.find(bci => bci.id === bagCheckItemId)
    await POSFunctions.deleteBagCheckItem(rootBasePath, bagCheckItemId)
    
    // Add notification
    if (bagCheckItemToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Bag Check Item Deleted',
          `Bag check item "${bagCheckItemToDelete.name || 'Item'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: bagCheckItemId,
              entityName: bagCheckItemToDelete.name || 'Bag Check Item',
              oldValue: bagCheckItemToDelete,
              changes: { bagCheckItem: { from: bagCheckItemToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshBagCheckItems()
  }

  const createLocation = async (location: Omit<Location, "id" | "createdAt" | "updatedAt">): Promise<Location> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newLocation = await POSFunctions.createLocation(rootBasePath, location)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Location Created',
        `Location "${location.name || 'New Location'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newLocation.id,
            entityName: location.name || 'Location',
            newValue: newLocation,
            changes: { location: { from: {}, to: newLocation } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshLocations()
    return newLocation
  }

  const updateLocation = async (locationId: string, updates: Partial<Location>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalLocation = posState.locations.find(l => l.id === locationId)
    await POSFunctions.updateLocation(rootBasePath, locationId, updates)
    
    // Add notification
    if (originalLocation) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Location Updated',
          `Location "${updates.name || originalLocation.name || 'Location'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: locationId,
              entityName: updates.name || originalLocation.name || 'Location',
              oldValue: originalLocation,
              newValue: { ...originalLocation, ...updates },
              changes: { location: { from: originalLocation, to: { ...originalLocation, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshLocations()
  }

  const deleteLocation = async (locationId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const locationToDelete = posState.locations.find(l => l.id === locationId)
    await POSFunctions.deleteLocation(rootBasePath, locationId)
    
    // Add notification
    if (locationToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Location Deleted',
          `Location "${locationToDelete.name || 'Location'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: locationId,
              entityName: locationToDelete.name || 'Location',
              oldValue: locationToDelete,
              changes: { location: { from: locationToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshLocations()
  }

  const createDevice = async (device: Omit<Device, "id" | "createdAt" | "updatedAt">): Promise<Device> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newDevice = await POSFunctions.createDevice(rootBasePath, device)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Device Created',
        `Device "${device.name || device.serialNumber || 'New Device'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newDevice.id,
            entityName: device.name || device.serialNumber || 'Device',
            newValue: newDevice,
            changes: { device: { from: {}, to: newDevice } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshDevices()
    return newDevice
  }

  const updateDevice = async (deviceId: string, updates: Partial<Device>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalDevice = posState.devices.find(d => d.id === deviceId)
    await POSFunctions.updateDevice(rootBasePath, deviceId, updates)
    
    // Add notification
    if (originalDevice) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Device Updated',
          `Device "${updates.name || updates.serialNumber || originalDevice.name || originalDevice.serialNumber || 'Device'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: deviceId,
              entityName: updates.name || updates.serialNumber || originalDevice.name || originalDevice.serialNumber || 'Device',
              oldValue: originalDevice,
              newValue: { ...originalDevice, ...updates },
              changes: { device: { from: originalDevice, to: { ...originalDevice, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshDevices()
  }

  const deleteDevice = async (deviceId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const deviceToDelete = posState.devices.find(d => d.id === deviceId)
    await POSFunctions.deleteDevice(rootBasePath, deviceId)
    
    // Add notification
    if (deviceToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Device Deleted',
          `Device "${deviceToDelete.name || deviceToDelete.serialNumber || 'Device'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: deviceId,
              entityName: deviceToDelete.name || deviceToDelete.serialNumber || 'Device',
              oldValue: deviceToDelete,
              changes: { device: { from: deviceToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshDevices()
  }

  const createCard = async (card: Omit<Card, "id" | "createdAt" | "updatedAt">): Promise<Card> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newCard = await POSFunctions.createCard(rootBasePath, card)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Card Created',
        `Card "${card.name || card.number || 'New Card'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newCard.id,
            entityName: card.name || String(card.number ?? "") || 'Card',
            newValue: newCard,
            changes: { card: { from: {}, to: newCard } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshCards()
    return newCard
  }

  const updateCard = async (cardId: string, updates: Partial<Card>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalCard = posState.cards.find(c => c.id === cardId)
    await POSFunctions.updateCard(rootBasePath, cardId, updates)
    
    // Add notification
    if (originalCard) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Card Updated',
          `Card "${updates.name || updates.number || originalCard.name || originalCard.number || 'Card'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: cardId,
              entityName:
                updates.name ||
                String(updates.number ?? "") ||
                originalCard.name ||
                String(originalCard.number ?? "") ||
                'Card',
              oldValue: originalCard,
              newValue: { ...originalCard, ...updates },
              changes: { card: { from: originalCard, to: { ...originalCard, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshCards()
  }

  const deleteCard = async (cardId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const cardToDelete = posState.cards.find(c => c.id === cardId)
    await POSFunctions.deleteCard(rootBasePath, cardId)
    
    // Add notification
    if (cardToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Card Deleted',
          `Card "${cardToDelete.name || cardToDelete.number || 'Card'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: cardId,
              entityName: cardToDelete.name || String(cardToDelete.number ?? "") || 'Card',
              oldValue: cardToDelete,
              changes: { card: { from: cardToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshCards()
  }

  const createTicket = async (ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt">): Promise<Ticket> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newTicket = await POSFunctions.createTicket(rootBasePath, ticket)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Ticket Created',
        `Ticket "${ticket.name || 'New Ticket'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newTicket.id,
            entityName: ticket.name || 'Ticket',
            newValue: newTicket,
            changes: { ticket: { from: {}, to: newTicket } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshTickets()
    return newTicket
  }

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalTicket = posState.tickets.find(t => t.id === ticketId)
    await POSFunctions.updateTicket(rootBasePath, ticketId, updates)
    
    // Add notification
    if (originalTicket) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Ticket Updated',
          `Ticket "${updates.name || originalTicket.name || 'Ticket'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: ticketId,
              entityName: updates.name || originalTicket.name || 'Ticket',
              oldValue: originalTicket,
              newValue: { ...originalTicket, ...updates },
              changes: { ticket: { from: originalTicket, to: { ...originalTicket, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTickets()
  }

  const deleteTicket = async (ticketId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const ticketToDelete = posState.tickets.find(t => t.id === ticketId)
    await POSFunctions.deleteTicket(rootBasePath, ticketId)
    
    // Add notification
    if (ticketToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Ticket Deleted',
          `Ticket "${ticketToDelete.name || 'Ticket'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: ticketId,
              entityName: ticketToDelete.name || 'Ticket',
              oldValue: ticketToDelete,
              changes: { ticket: { from: ticketToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTickets()
  }

  const createTicketSale = async (ticketSale: Omit<TicketSale, "id" | "createdAt" | "updatedAt">): Promise<TicketSale> => {
    const paths = getPOSPaths()
    if (paths.length === 0) throw new Error("Missing base path")
    const basePath = paths[0]
    const newTicketSale = await POSFunctions.createTicketSale(basePath, ticketSale)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Ticket Sale Created',
        `Ticket sale was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newTicketSale.id,
            entityName: 'Ticket Sale',
            newValue: newTicketSale,
            changes: { ticketSale: { from: {}, to: newTicketSale } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshTicketSales()
    return newTicketSale
  }

  const updateTicketSale = async (ticketSaleId: string, updates: Partial<TicketSale>): Promise<void> => {
    const paths = getPOSPaths()
    if (paths.length === 0) throw new Error("Missing base path")
    const basePath = paths[0]
    const originalTicketSale = posState.ticketSales.find(ts => ts.id === ticketSaleId)
    await POSFunctions.updateTicketSale(basePath, ticketSaleId, updates)
    
    // Add notification
    if (originalTicketSale) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Ticket Sale Updated',
          `Ticket sale was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: ticketSaleId,
              entityName: 'Ticket Sale',
              oldValue: originalTicketSale,
              newValue: { ...originalTicketSale, ...updates },
              changes: { ticketSale: { from: originalTicketSale, to: { ...originalTicketSale, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTicketSales()
  }

  const deleteTicketSale = async (ticketSaleId: string): Promise<void> => {
    const paths = getPOSPaths()
    if (paths.length === 0) throw new Error("Missing base path")
    const basePath = paths[0]
    const ticketSaleToDelete = posState.ticketSales.find(ts => ts.id === ticketSaleId)
    await POSFunctions.deleteTicketSale(basePath, ticketSaleId)
    
    // Add notification
    if (ticketSaleToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Ticket Sale Deleted',
          `Ticket sale was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: ticketSaleId,
              entityName: 'Ticket Sale',
              oldValue: ticketSaleToDelete,
              changes: { ticketSale: { from: ticketSaleToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshTicketSales()
  }

  const createPaymentTransaction = async (
    tx: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<PaymentTransaction> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newTx = await POSFunctions.createPaymentTransaction(rootBasePath, tx)
    await refreshPaymentTransactions()
    return newTx
  }

  const updatePaymentTransaction = async (txId: string, updates: Partial<PaymentTransaction>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    await POSFunctions.updatePaymentTransaction(rootBasePath, txId, updates)
    await refreshPaymentTransactions()
  }

  const deletePaymentTransaction = async (txId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    await POSFunctions.deletePaymentTransaction(rootBasePath, txId)
    await refreshPaymentTransactions()
  }

  const getPaymentTransactionsForBill = (billId: string): PaymentTransaction[] => {
    return posState.paymentTransactions.filter((t) => t.billId === billId)
  }

  const createGroup = async (group: Omit<Group, "id" | "createdAt" | "updatedAt">): Promise<Group> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newGroup = await POSFunctions.createGroup(rootBasePath, group)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Group Created',
        `Group "${group.name || 'New Group'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newGroup.id,
            entityName: group.name || 'Group',
            newValue: newGroup,
            changes: { group: { from: {}, to: newGroup } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshGroups()
    return newGroup
  }

  const updateGroup = async (groupId: string, updates: Partial<Group>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalGroup = posState.groups.find(g => g.id === groupId)
    await POSFunctions.updateGroup(rootBasePath, groupId, updates)
    
    // Add notification
    if (originalGroup) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Group Updated',
          `Group "${updates.name || originalGroup.name || 'Group'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: groupId,
              entityName: updates.name || originalGroup.name || 'Group',
              oldValue: originalGroup,
              newValue: { ...originalGroup, ...updates },
              changes: { group: { from: originalGroup, to: { ...originalGroup, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshGroups()
  }

  const deleteGroup = async (groupId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const groupToDelete = posState.groups.find(g => g.id === groupId)
    await POSFunctions.deleteGroup(rootBasePath, groupId)
    
    // Add notification
    if (groupToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'deleted',
          'Group Deleted',
          `Group "${groupToDelete.name || 'Group'}" was deleted`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: groupId,
              entityName: groupToDelete.name || 'Group',
              oldValue: groupToDelete,
              changes: { group: { from: groupToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshGroups()
  }

  const createCourse = async (course: Omit<Course, "id" | "createdAt" | "updatedAt">): Promise<Course> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const newCourse = await POSFunctions.createCourse(rootBasePath, course)
    
    // Add notification
    try {
      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'pos',
        'created',
        'Course Created',
        `Course "${course.name || 'New Course'}" was created`,
        {
          siteId: companyState.selectedSiteID || undefined,
          subsiteId: companyState.selectedSubsiteID || undefined,
          priority: 'medium',
          category: 'success',
          details: {
            entityId: newCourse.id,
            entityName: course.name || 'Course',
            newValue: newCourse,
            changes: { course: { from: {}, to: newCourse } }
          }
        }
      )
    } catch (notificationError) {
      debugWarn('Failed to create notification:', notificationError)
    }
    
    await refreshCourses()
    return newCourse
  }

  const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const originalCourse = posState.courses.find(c => c.id === courseId)
    await POSFunctions.updateCourse(rootBasePath, courseId, updates)
    
    // Add notification
    if (originalCourse) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
          'updated',
          'Course Updated',
          `Course "${updates.name || originalCourse.name || 'Course'}" was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: companyState.selectedSubsiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: courseId,
              entityName: updates.name || originalCourse.name || 'Course',
              oldValue: originalCourse,
              newValue: { ...originalCourse, ...updates },
              changes: { course: { from: originalCourse, to: { ...originalCourse, ...updates } } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshCourses()
  }

  const deleteCourse = async (courseId: string): Promise<void> => {
    if (!rootBasePath) throw new Error("Missing base path")
    const courseToDelete = posState.courses.find(c => c.id === courseId)
    await POSFunctions.deleteCourse(rootBasePath, courseId)
    
    // Add notification
    if (courseToDelete) {
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'pos',
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
              changes: { course: { from: courseToDelete, to: null } }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    }
    
    await refreshCourses()
  }

  // Data lookup utilities
  const getItemName = (itemId: string): string => {
    // TODO: Implement product lookup when StockProvider is available in scope
    // For now, return the item ID with a fallback format
    return `Item ${itemId}`
  }

  const getPaymentTypeName = (paymentTypeId: string): string => {
    const paymentType = posState.paymentTypes.find(pt => pt.id === paymentTypeId)
    return paymentType?.name || `Payment ${paymentTypeId}`
  }

  const getLocationName = (locationId: string): string => {
    const location = posState.locations.find(l => l.id === locationId)
    return location?.name || `Location ${locationId}`
  }

  // =======================
  // POS module settings (NOT /data/pos)
  // =======================
  const getPOSSettingsPath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/pos`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const getPOSIntegrationsPath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/pos/integrations`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadPOSSettings = useCallback(async () => {
    const path = getPOSSettingsPath()
    if (!path) return null
    try {
      return await fetchPOSSettingsFn(path)
    } catch (err: any) {
      debugWarn("POSContext: loadPOSSettings failed", err)
      return null
    }
  }, [getPOSSettingsPath])

  const savePOSSettings = useCallback(async (settings: Record<string, any>) => {
    const path = getPOSSettingsPath()
    if (!path) return
    try {
      await savePOSSettingsFn(path, settings)
    } catch (err: any) {
      debugWarn("POSContext: savePOSSettings failed", err)
      throw err
    }
  }, [getPOSSettingsPath])

  const loadPOSIntegrations = useCallback(async () => {
    const path = getPOSIntegrationsPath()
    if (!path) return {}
    try {
      return await fetchPOSIntegrationsFn(path)
    } catch (err: any) {
      debugWarn("POSContext: loadPOSIntegrations failed", err)
      return {}
    }
  }, [getPOSIntegrationsPath])

  const savePOSIntegration = useCallback(async (integration: { id: string } & Record<string, any>) => {
    const path = getPOSIntegrationsPath()
    if (!path || !integration?.id) return
    await savePOSIntegrationFn(path, integration)
  }, [getPOSIntegrationsPath])

  // Computed values
  const basePaths = useMemo(() => 
    getBasePaths(
      companyState.companyID || "",
      companyState.selectedSiteID || null,
      companyState.selectedSubsiteID || null
    ), 
    [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID]
  )

  const dataLevel: DataLevel = useMemo(() => {
    if (companyState.selectedSubsiteID) return "subsite"
    if (companyState.selectedSiteID) return "site"
    return "company"
  }, [companyState.selectedSiteID, companyState.selectedSubsiteID])

  const stockBasePath = useMemo(() => getBasePath("stock"), [getBasePath])
  const stockBasePaths = useMemo(() => 
    getBasePaths(
      companyState.companyID || "",
      companyState.selectedSiteID || null,
      companyState.selectedSubsiteID || null
    ).map(path => `${path}/data/stock`), 
    [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID]
  )

  const paymentsPath = useMemo(() => getBasePath("pos"), [getBasePath])
  const paymentsPaths = useMemo(() => 
    getBasePaths(
      companyState.companyID || "",
      companyState.selectedSiteID || null,
      companyState.selectedSubsiteID || null
    ).map(path => `${path}/data/payments`), 
    [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID]
  )

  const posDataPath = useMemo(() => getBasePath("pos"), [getBasePath])
  const posDataPaths = useMemo(() => 
    getBasePaths(
      companyState.companyID || "",
      companyState.selectedSiteID || null,
      companyState.selectedSubsiteID || null
    ).map(path => `${path}/data/pos`), 
    [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID]
  )

  const getPath = useMemo(() => (key: "stock" | "products" | "paymentTypes" | "pos" | "sales" | "tillScreens" | "bills") => {
    const base = rootBasePath || ""
    switch (key) {
      case "stock":
        return `${base}/stock`
      case "products":
        return `${base}/products`
      case "paymentTypes":
        return `${base}/paymentTypes`
      case "pos":
        return `${base}/pos`
      case "sales":
        return `${base}/sales`
      case "tillScreens":
        return `${base}/tillscreens`
      case "bills":
        return `${base}/bills`
      default:
        return base
    }
  }, [rootBasePath])

  const getPaths = useMemo(() => (key: "stock" | "products" | "paymentTypes" | "pos" | "sales") => {
    return basePaths.map(path => {
      const base = `${path}/data`
      switch (key) {
        case "stock":
          return `${base}/stock`
        case "products":
          return `${base}/products`
        case "paymentTypes":
          return `${base}/paymentTypes`
        case "pos":
          return `${base}/pos`
        case "sales":
          return `${base}/sales`
        default:
          return base
      }
    })
  }, [basePaths])

  // Auto-refresh when base path changes
  useEffect(() => {
    // Wait for dependencies: Settings and Company must be ready first
    if (!settingsState.auth || settingsState.loading) {
      return // Settings not ready yet
    }
    
    if (!companyState.companyID && settingsState.auth.isLoggedIn) {
      return // Company not selected yet (but user is logged in)
    }
    
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Only load if rootBasePath is valid and different from last loaded
    if (rootBasePath && rootBasePath !== lastLoadedPathRef.current) {
      // Reset initialized flag when path changes
      // Set new path immediately so we don't skip loading it
      lastLoadedPathRef.current = rootBasePath
      isInitializedRef.current = false
      // Debounce to prevent rapid refreshes during company/site switching
      refreshTimeoutRef.current = setTimeout(() => {
        refreshAll().catch(error => {
          debugWarn('POS data refresh failed, maintaining old data:', error)
          // Ensure loading is cleared on error
          dispatch({ type: "SET_LOADING", payload: false })
        })
      }, 100) // Reduced debounce for faster loading
    }
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [rootBasePath, companyState.companyID, settingsState.auth, settingsState.loading, refreshAll, dispatch])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: POSContextValue = useMemo(() => ({
    state: posState,
    companyId: companyState.companyID || "",
    siteId: companyState.selectedSiteID || null,
    subsiteId: companyState.selectedSubsiteID || null,
    dataLevel,
      rootBasePath,
    basePaths,
    stockBasePath,
    stockBasePaths,
    paymentsPath,
    paymentsPaths,
    posDataPath,
    posDataPaths,
    getPath,
    getPaths,
    refreshAll,
    refreshBills,
    refreshTillScreens,
    refreshPaymentTypes,
    refreshFloorPlans,
    refreshTables,
    refreshCards,
    refreshDiscounts,
    refreshPromotions,
    refreshCorrections,
    refreshBagCheckItems,
    refreshLocations,
    refreshDevices,
    refreshTickets,
    refreshTicketSales,
    refreshPaymentTransactions,
    refreshGroups,
    refreshCourses,
    resolveTillScreen,
    createBill,
    updateBill,
    deleteBill,
    createPaymentType,
    updatePaymentType,
    deletePaymentType,
    createTillScreen,
    updateTillScreen,
    deleteTillScreen,
    createFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    createTable,
    updateTable,
    deleteTable,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    createPromotion,
    updatePromotion,
    deletePromotion,
    createCorrection,
    updateCorrection,
    deleteCorrection,
    createBagCheckItem,
    updateBagCheckItem,
    deleteBagCheckItem,
    createLocation,
    updateLocation,
    deleteLocation,
    createDevice,
    updateDevice,
    deleteDevice,
    createCard,
    updateCard,
    deleteCard,
    createTicket,
    updateTicket,
    deleteTicket,
    createTicketSale,
    updateTicketSale,
    deleteTicketSale,
    createPaymentTransaction,
    updatePaymentTransaction,
    deletePaymentTransaction,
    getPaymentTransactionsForBill,
    createGroup,
    updateGroup,
    deleteGroup,
    createCourse,
    updateCourse,
    deleteCourse,
    getItemName,
    getPaymentTypeName,
    getLocationName,
    getPOSSettingsPath,
    loadPOSSettings,
    savePOSSettings,
    loadPOSIntegrations,
    savePOSIntegration,
  }), [
    posState,
    companyState.companyID,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    dataLevel,
    rootBasePath,
    basePaths,
    stockBasePath,
    stockBasePaths,
    paymentsPath,
    paymentsPaths,
    posDataPath,
    posDataPaths,
    getPath,
    getPaths,
    refreshAll,
    refreshBills,
    refreshTillScreens,
    refreshPaymentTypes,
    refreshFloorPlans,
    refreshTables,
    refreshCards,
    refreshDiscounts,
    refreshPromotions,
    refreshCorrections,
    refreshBagCheckItems,
    refreshLocations,
    refreshDevices,
    refreshTickets,
    refreshTicketSales,
    refreshPaymentTransactions,
    refreshGroups,
    refreshCourses,
    createBill,
    updateBill,
    deleteBill,
    createPaymentType,
    updatePaymentType,
    deletePaymentType,
    createTillScreen,
    updateTillScreen,
    deleteTillScreen,
    createFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    createTable,
    updateTable,
    deleteTable,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    createPromotion,
    updatePromotion,
    deletePromotion,
    createCorrection,
    updateCorrection,
    deleteCorrection,
    createBagCheckItem,
    updateBagCheckItem,
    deleteBagCheckItem,
    createLocation,
    updateLocation,
    deleteLocation,
    createDevice,
    updateDevice,
    deleteDevice,
    createCard,
    updateCard,
    deleteCard,
    createTicket,
    updateTicket,
    deleteTicket,
    createTicketSale,
    updateTicketSale,
    deleteTicketSale,
    createGroup,
    updateGroup,
    deleteGroup,
    createCourse,
    updateCourse,
    deleteCourse,
    getItemName,
    getPaymentTypeName,
    getLocationName,
    getPOSSettingsPath,
    loadPOSSettings,
    savePOSSettings,
    loadPOSIntegrations,
    savePOSIntegration,
  ])

  // Reset warning flag when provider mounts (so real issues can be detected)
  React.useEffect(() => {
    posWarningShown = false
  }, [])

  return (
    <POSContext.Provider value={contextValue}>
      {children}
    </POSContext.Provider>
  )
}

const POSContext = createContext<POSContextValue | undefined>(undefined)

// Track warnings to avoid spam during initial load
let posWarningShown = false

export const usePOS = (): POSContextValue => {
  const context = useContext(POSContext)
  if (context === undefined) {
    // Return a safe default context instead of throwing error
    // Keep console quiet during initial render.
    if (!posWarningShown) {
      posWarningShown = true
    }
    
    // Use Proxy to provide empty implementations dynamically
    const emptyHandler: ProxyHandler<any> = {
      get(target, prop) {
        // Return empty arrays for list properties
        if (prop === 'bills' || prop === 'tillScreens' || prop === 'paymentTypes' ||
            prop === 'floorPlans' || prop === 'tables' || prop === 'cards' ||
            prop === 'discounts' || prop === 'promotions' || prop === 'corrections' ||
            prop === 'bagCheckItems' || prop === 'locations' || prop === 'devices' ||
            prop === 'tickets' || prop === 'ticketSales' || prop === 'groups' || prop === 'courses') {
          return []
        }
        // Return false for boolean properties
        if (prop === 'loading') {
          return false
        }
        // Return null for error
        if (prop === 'error') {
          return null
        }
        // Return empty strings for path properties
        if (prop === 'basePath' || prop === 'rootBasePath' || prop === 'stockBasePath' ||
            prop === 'paymentsPath' || prop === 'posDataPath' || prop === 'companyId') {
          return ''
        }
        // Return null for nullable properties
        if (prop === 'siteId' || prop === 'subsiteId') {
          return null
        }
        // Return 'company' for dataLevel
        if (prop === 'dataLevel') {
          return 'company'
        }
        // Return empty array for path arrays
        if (prop === 'basePaths' || prop === 'stockBasePaths' || prop === 'paymentsPaths' || prop === 'posDataPaths') {
          return []
        }
        // Return empty string for getPath
        if (prop === 'getPath') {
          return () => ''
        }
        // Return empty array for getPaths
        if (prop === 'getPaths') {
          return () => []
        }
        // Known async helpers with typed return values
        if (prop === 'resolveTillScreen') {
          return async () => null
        }
        // Return async no-op for async functions
        if (typeof target[prop] === 'undefined') {
          return async () => {}
        }
        return target[prop]
      }
    }
    
    return new Proxy({ state: {} }, emptyHandler) as POSContextValue
  }
  return context
}

// Export types for frontend components to use
export type { 
  Bill, 
  BillItem,
  TillScreen, 
  PaymentType, 
  FloorPlan, 
  Table, 
  Card, 
  Discount, 
  Promotion, 
  Correction, 
  BagCheckItem,
  BagCheckConfig,
  Location, 
  Device,
  Sale,
  Ticket,
  TicketSale,
  PaymentIntegration
} from "../interfaces/POS"