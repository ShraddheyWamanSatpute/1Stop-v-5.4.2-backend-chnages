"use client"

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef } from "react"
import { useCompany } from "./CompanyContext"
import { useSettings } from "./SettingsContext"
import { createNotification } from "../functions/Notifications"
import { measurePerformance, performanceTimer } from "../utils/PerformanceTimer"
import { createCachedFetcher } from "../utils/CachedFetcher"
import { dataCache } from "../utils/DataCache"
import { debugLog, debugWarn } from "../utils/debugLog"
// import { useCompany } from "./CompanyContext" - removed as it's no longer used
import * as BookingsFunctions from "../functions/Bookings"
import { fetchIntegrationsFromPath, saveIntegrationToPath, subscribeAllUsers } from "../providers/supabase/Settings"
import { functions, httpsCallable } from "../services/Firebase"
import { 
  Booking, 
  BookingType, 
  Table, 
  BookingStatus, 
  Customer, 
  WaitlistEntry, 
  BookingSettings,
  FloorPlan,
  BookingStats,
  BookingTag,
  TableElement,
  Location
} from "../interfaces/Bookings"

// Define the state interface
interface BookingsState {
  companyID: string | null;
  siteID: string | null;
  subsiteID: string | null;
  bookings: Booking[];
  bookingTypes: BookingType[];
  tables: Table[];
  bookingStatuses: BookingStatus[];
  bookingTags: BookingTag[];
  customers: Customer[];
  waitlistEntries: WaitlistEntry[];
  bookingSettings: BookingSettings | null;
  floorPlans: FloorPlan[];
  bookingStats: BookingStats | null;
  locations: Location[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

// Initial state
const initialState: BookingsState = {
  companyID: null,
  siteID: null,
  subsiteID: null,
  bookings: [],
  bookingTypes: [],
  tables: [],
  bookingStatuses: [],
  bookingTags: [],
  customers: [],
  waitlistEntries: [],
  bookingSettings: null,
  floorPlans: [],
  bookingStats: null,
  locations: [],
  loading: false,
  error: null,
  initialized: false
}

// Action types enum
enum BookingsActionType {
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  SET_COMPANY_ID = 'SET_COMPANY_ID',
  SET_SITE_ID = 'SET_SITE_ID',
  SET_SUBSITE_ID = 'SET_SUBSITE_ID',
  SET_LOCATIONS = 'SET_LOCATIONS',
  SET_BOOKINGS = 'SET_BOOKINGS',
  ADD_BOOKING = 'ADD_BOOKING',
  UPDATE_BOOKING = 'UPDATE_BOOKING',
  DELETE_BOOKING = 'DELETE_BOOKING',
  SET_BOOKING_TYPES = 'SET_BOOKING_TYPES',
  ADD_BOOKING_TYPE = 'ADD_BOOKING_TYPE',
  UPDATE_BOOKING_TYPE = 'UPDATE_BOOKING_TYPE',
  DELETE_BOOKING_TYPE = 'DELETE_BOOKING_TYPE',
  SET_TABLES = 'SET_TABLES',
  ADD_TABLE = 'ADD_TABLE',
  UPDATE_TABLE = 'UPDATE_TABLE',
  DELETE_TABLE = 'DELETE_TABLE',
  SET_BOOKING_STATUSES = 'SET_BOOKING_STATUSES',
  ADD_BOOKING_STATUS = 'ADD_BOOKING_STATUS',
  UPDATE_BOOKING_STATUS = 'UPDATE_BOOKING_STATUS',
  DELETE_BOOKING_STATUS = 'DELETE_BOOKING_STATUS',
  SET_BOOKING_TAGS = 'SET_BOOKING_TAGS',
  ADD_BOOKING_TAG = 'ADD_BOOKING_TAG',
  UPDATE_BOOKING_TAG = 'UPDATE_BOOKING_TAG',
  DELETE_BOOKING_TAG = 'DELETE_BOOKING_TAG',
  SET_CUSTOMERS = 'SET_CUSTOMERS',
  ADD_CUSTOMER = 'ADD_CUSTOMER',
  UPDATE_CUSTOMER = 'UPDATE_CUSTOMER',
  DELETE_CUSTOMER = 'DELETE_CUSTOMER',
  SET_WAITLIST_ENTRIES = 'SET_WAITLIST_ENTRIES',
  ADD_WAITLIST_ENTRY = 'ADD_WAITLIST_ENTRY',
  UPDATE_WAITLIST_ENTRY = 'UPDATE_WAITLIST_ENTRY',
  DELETE_WAITLIST_ENTRY = 'DELETE_WAITLIST_ENTRY',
  SET_BOOKING_SETTINGS = 'SET_BOOKING_SETTINGS',
  UPDATE_BOOKING_SETTINGS = 'UPDATE_BOOKING_SETTINGS',
  SET_FLOOR_PLANS = 'SET_FLOOR_PLANS',
  ADD_FLOOR_PLAN = 'ADD_FLOOR_PLAN',
  UPDATE_FLOOR_PLAN = 'UPDATE_FLOOR_PLAN',
  DELETE_FLOOR_PLAN = 'DELETE_FLOOR_PLAN',
  SET_BOOKING_STATS = 'SET_BOOKING_STATS',
  SET_INITIALIZED = 'SET_INITIALIZED',
  BATCH_UPDATE = 'BATCH_UPDATE',
  RESET = 'RESET'
}

// Define action types using discriminated union
type BookingsAction =
  | { type: BookingsActionType.SET_LOADING; payload: boolean }
  | { type: BookingsActionType.SET_ERROR; payload: string | null }
  | { type: BookingsActionType.SET_COMPANY_ID; payload: string | null }
  | { type: BookingsActionType.SET_SITE_ID; payload: string | null }
  | { type: BookingsActionType.SET_SUBSITE_ID; payload: string | null }
  | { type: BookingsActionType.SET_LOCATIONS; payload: Location[] }
  | { type: BookingsActionType.SET_BOOKINGS; payload: Booking[] }
  | { type: BookingsActionType.ADD_BOOKING; payload: Booking }
  | { type: BookingsActionType.UPDATE_BOOKING; payload: { id: string; updates: Partial<Booking> } }
  | { type: BookingsActionType.DELETE_BOOKING; payload: string }
  | { type: BookingsActionType.SET_BOOKING_TYPES; payload: BookingType[] }
  | { type: BookingsActionType.ADD_BOOKING_TYPE; payload: BookingType }
  | { type: BookingsActionType.UPDATE_BOOKING_TYPE; payload: { id: string; updates: Partial<BookingType> } }
  | { type: BookingsActionType.DELETE_BOOKING_TYPE; payload: string }
  | { type: BookingsActionType.SET_TABLES; payload: Table[] }
  | { type: BookingsActionType.ADD_TABLE; payload: Table }
  | { type: BookingsActionType.UPDATE_TABLE; payload: { id: string; updates: Partial<Table> } }
  | { type: BookingsActionType.DELETE_TABLE; payload: string }
  | { type: BookingsActionType.SET_BOOKING_STATUSES; payload: BookingStatus[] }
  | { type: BookingsActionType.ADD_BOOKING_STATUS; payload: BookingStatus }
  | { type: BookingsActionType.UPDATE_BOOKING_STATUS; payload: { id: string; updates: Partial<BookingStatus> } }
  | { type: BookingsActionType.DELETE_BOOKING_STATUS; payload: string }
  | { type: BookingsActionType.SET_BOOKING_TAGS; payload: BookingTag[] }
  | { type: BookingsActionType.ADD_BOOKING_TAG; payload: BookingTag }
  | { type: BookingsActionType.UPDATE_BOOKING_TAG; payload: { id: string; updates: Partial<BookingTag> } }
  | { type: BookingsActionType.DELETE_BOOKING_TAG; payload: string }
  | { type: BookingsActionType.SET_CUSTOMERS; payload: Customer[] }
  | { type: BookingsActionType.ADD_CUSTOMER; payload: Customer }
  | { type: BookingsActionType.UPDATE_CUSTOMER; payload: { id: string; updates: Partial<Customer> } }
  | { type: BookingsActionType.DELETE_CUSTOMER; payload: string }
  | { type: BookingsActionType.SET_WAITLIST_ENTRIES; payload: WaitlistEntry[] }
  | { type: BookingsActionType.ADD_WAITLIST_ENTRY; payload: WaitlistEntry }
  | { type: BookingsActionType.UPDATE_WAITLIST_ENTRY; payload: { id: string; updates: Partial<WaitlistEntry> } }
  | { type: BookingsActionType.DELETE_WAITLIST_ENTRY; payload: string }
  | { type: BookingsActionType.SET_BOOKING_SETTINGS; payload: BookingSettings }
  | { type: BookingsActionType.UPDATE_BOOKING_SETTINGS; payload: Partial<BookingSettings> }
  | { type: BookingsActionType.SET_FLOOR_PLANS; payload: FloorPlan[] }
  | { type: BookingsActionType.ADD_FLOOR_PLAN; payload: FloorPlan }
  | { type: BookingsActionType.UPDATE_FLOOR_PLAN; payload: { id: string; updates: Partial<FloorPlan> } }
  | { type: BookingsActionType.DELETE_FLOOR_PLAN; payload: string }
  | { type: BookingsActionType.SET_BOOKING_STATS; payload: BookingStats }
  | { type: BookingsActionType.SET_INITIALIZED; payload: boolean }
  | { 
      type: BookingsActionType.BATCH_UPDATE; 
      payload: {
        bookings?: Booking[]
        bookingTypes?: BookingType[]
        tables?: Table[]
        bookingStatuses?: BookingStatus[]
        bookingTags?: BookingTag[]
        customers?: Customer[]
        waitlistEntries?: WaitlistEntry[]
        bookingSettings?: BookingSettings | null
        floorPlans?: FloorPlan[]
        locations?: Location[]
        initialized?: boolean
      }
    }
  | { type: BookingsActionType.RESET }

// Reducer function
const bookingsReducer = (state: BookingsState, action: BookingsAction): BookingsState => {
  switch (action.type) {
    case BookingsActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case BookingsActionType.SET_ERROR:
      return { ...state, error: action.payload }
    case BookingsActionType.SET_COMPANY_ID:
      return { ...state, companyID: action.payload }
    case BookingsActionType.SET_SITE_ID:
      return { ...state, siteID: action.payload }
    case BookingsActionType.SET_SUBSITE_ID:
      return { ...state, subsiteID: action.payload }
    case BookingsActionType.SET_LOCATIONS:
      return { ...state, locations: action.payload }
    case BookingsActionType.SET_BOOKINGS:
      return { ...state, bookings: action.payload }
    case BookingsActionType.ADD_BOOKING:
      return { ...state, bookings: [...state.bookings, action.payload] }
    case BookingsActionType.UPDATE_BOOKING:
      return {
        ...state,
        bookings: state.bookings.map(booking => 
          booking.id === action.payload.id 
            ? { ...booking, ...action.payload.updates } 
            : booking
        )
      }
    case BookingsActionType.DELETE_BOOKING:
      return {
        ...state,
        bookings: state.bookings.filter(booking => booking.id !== action.payload)
      }
    case BookingsActionType.SET_BOOKING_TYPES:
      return { ...state, bookingTypes: action.payload }
    case BookingsActionType.ADD_BOOKING_TYPE:
      return { ...state, bookingTypes: [...state.bookingTypes, action.payload] }
    case BookingsActionType.UPDATE_BOOKING_TYPE:
      return {
        ...state,
        bookingTypes: state.bookingTypes.map(bookingType => 
          bookingType.id === action.payload.id 
            ? { ...bookingType, ...action.payload.updates } 
            : bookingType
        )
      }
    case BookingsActionType.DELETE_BOOKING_TYPE:
      return {
        ...state,
        bookingTypes: state.bookingTypes.filter(bookingType => bookingType.id !== action.payload)
      }
    case BookingsActionType.SET_TABLES:
      return { ...state, tables: action.payload }
    case BookingsActionType.ADD_TABLE:
      return { ...state, tables: [...state.tables, action.payload] }
    case BookingsActionType.UPDATE_TABLE:
      return {
        ...state,
        tables: state.tables.map(table => 
          table.id === action.payload.id 
            ? { ...table, ...action.payload.updates } 
            : table
        )
      }
    case BookingsActionType.DELETE_TABLE:
      return {
        ...state,
        tables: state.tables.filter(table => table.id !== action.payload)
      }
    case BookingsActionType.SET_BOOKING_STATUSES:
      return { ...state, bookingStatuses: action.payload }
    case BookingsActionType.ADD_BOOKING_STATUS:
      return { ...state, bookingStatuses: [...state.bookingStatuses, action.payload] }
    case BookingsActionType.UPDATE_BOOKING_STATUS:
      return {
        ...state,
        bookingStatuses: state.bookingStatuses.map(status => 
          status.id === action.payload.id 
            ? { ...status, ...action.payload.updates } 
            : status
        )
      }
    case BookingsActionType.DELETE_BOOKING_STATUS:
      return {
        ...state,
        bookingStatuses: state.bookingStatuses.filter(status => status.id !== action.payload)
      }
    case BookingsActionType.SET_BOOKING_TAGS:
      return { ...state, bookingTags: action.payload }
    case BookingsActionType.ADD_BOOKING_TAG:
      return { ...state, bookingTags: [...state.bookingTags, action.payload] }
    case BookingsActionType.UPDATE_BOOKING_TAG:
      return {
        ...state,
        bookingTags: state.bookingTags.map(tag => 
          tag.id === action.payload.id 
            ? { ...tag, ...action.payload.updates } 
            : tag
        )
      }
    case BookingsActionType.DELETE_BOOKING_TAG:
      return {
        ...state,
        bookingTags: state.bookingTags.filter(tag => tag.id !== action.payload)
      }
    case BookingsActionType.SET_CUSTOMERS:
      return { ...state, customers: action.payload }
    case BookingsActionType.ADD_CUSTOMER:
      return { ...state, customers: [...state.customers, action.payload] }
    case BookingsActionType.UPDATE_CUSTOMER:
      return {
        ...state,
        customers: state.customers.map(customer => 
          customer.id === action.payload.id 
            ? { ...customer, ...action.payload.updates } 
            : customer
        )
      }
    case BookingsActionType.DELETE_CUSTOMER:
      return {
        ...state,
        customers: state.customers.filter(customer => customer.id !== action.payload)
      }
    case BookingsActionType.SET_WAITLIST_ENTRIES:
      return { ...state, waitlistEntries: action.payload }
    case BookingsActionType.ADD_WAITLIST_ENTRY:
      return { ...state, waitlistEntries: [...state.waitlistEntries, action.payload] }
    case BookingsActionType.UPDATE_WAITLIST_ENTRY:
      return {
        ...state,
        waitlistEntries: state.waitlistEntries.map(entry => 
          entry.id === action.payload.id 
            ? { ...entry, ...action.payload.updates } 
            : entry
        )
      }
    case BookingsActionType.DELETE_WAITLIST_ENTRY:
      return {
        ...state,
        waitlistEntries: state.waitlistEntries.filter(entry => entry.id !== action.payload)
      }
    case BookingsActionType.SET_BOOKING_SETTINGS:
      return { ...state, bookingSettings: action.payload }
    case BookingsActionType.UPDATE_BOOKING_SETTINGS:
      return { 
        ...state, 
        bookingSettings: state.bookingSettings 
          ? { ...state.bookingSettings, ...action.payload } 
          : action.payload as BookingSettings 
      }
    case BookingsActionType.SET_FLOOR_PLANS:
      return { ...state, floorPlans: action.payload }
    case BookingsActionType.ADD_FLOOR_PLAN:
      return { ...state, floorPlans: [...state.floorPlans, action.payload] }
    case BookingsActionType.UPDATE_FLOOR_PLAN:
      return {
        ...state,
        floorPlans: state.floorPlans.map(plan => 
          plan.id === action.payload.id 
            ? { ...plan, ...action.payload.updates } 
            : plan
        )
      }
    case BookingsActionType.DELETE_FLOOR_PLAN:
      return {
        ...state,
        floorPlans: state.floorPlans.filter(plan => plan.id !== action.payload)
      }
    case BookingsActionType.SET_BOOKING_STATS:
      return { ...state, bookingStats: action.payload }
    case BookingsActionType.SET_INITIALIZED:
      return { ...state, initialized: action.payload }
    case BookingsActionType.BATCH_UPDATE:
      return {
        ...state,
        ...(action.payload.bookings !== undefined && { bookings: action.payload.bookings }),
        ...(action.payload.bookingTypes !== undefined && { bookingTypes: action.payload.bookingTypes }),
        ...(action.payload.tables !== undefined && { tables: action.payload.tables }),
        ...(action.payload.bookingStatuses !== undefined && { bookingStatuses: action.payload.bookingStatuses }),
        ...(action.payload.bookingTags !== undefined && { bookingTags: action.payload.bookingTags }),
        ...(action.payload.customers !== undefined && { customers: action.payload.customers }),
        ...(action.payload.waitlistEntries !== undefined && { waitlistEntries: action.payload.waitlistEntries }),
        ...(action.payload.bookingSettings !== undefined && { bookingSettings: action.payload.bookingSettings }),
        ...(action.payload.floorPlans !== undefined && { floorPlans: action.payload.floorPlans }),
        ...(action.payload.locations !== undefined && { locations: action.payload.locations }),
        ...(action.payload.initialized !== undefined && { initialized: action.payload.initialized }),
      }
    case BookingsActionType.RESET:
      return initialState
    default:
      return state
  }
}

// Define the context interface
interface BookingsContextType extends BookingsState {
  // Derived data source path(s)
  basePath: string
  // Permission functions
  canViewBookings: () => boolean
  canEditBookings: () => boolean
  canDeleteBookings: () => boolean
  isOwner: () => boolean
  // Booking operations
  fetchBookings: () => Promise<void>;
  fetchBookingsByCustomer: (customerId: string) => Promise<void>;
  fetchBookingsByTable: (tableId: string) => Promise<void>;
  // IMPORTANT: This should NOT overwrite global `state.bookings` (used across Diary/FloorPlan/List).
  // It returns the bookings for the requested date so caller can render without clobbering global state.
  fetchBookingsByDate: (date: string) => Promise<Booking[]>;
  addBooking: (booking: Omit<Booking, "id" | "createdAt" | "updatedAt">) => Promise<Booking>;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  
  // Booking type operations
  fetchBookingTypes: () => Promise<void>;
  addBookingType: (bookingType: Omit<BookingType, "id">) => Promise<BookingType>;
  updateBookingType: (bookingTypeId: string, updates: Partial<BookingType>) => Promise<void>;
  deleteBookingType: (bookingTypeId: string) => Promise<void>;
  
  // Table operations
  fetchTables: () => Promise<void>;
  addTable: (table: Omit<Table, "id">) => Promise<Table>;
  updateTable: (tableId: string, updates: Partial<Table>) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  
  // Booking status operations
  fetchBookingStatuses: () => Promise<void>;
  addBookingStatus: (status: Omit<BookingStatus, "id" | "createdAt" | "updatedAt">) => Promise<BookingStatus>;
  updateBookingStatus: (statusId: string, updates: Partial<BookingStatus>) => Promise<void>;
  deleteBookingStatus: (statusId: string) => Promise<void>;
  
  // Customer operations
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Customer) => Promise<Customer>;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  
  // Waitlist operations
  fetchWaitlistEntries: () => Promise<void>;
  addWaitlistEntry: (entry: Omit<WaitlistEntry, "id" | "timeAdded" | "status">) => Promise<WaitlistEntry>;
  updateWaitlistEntry: (entryId: string, updates: Partial<WaitlistEntry>) => Promise<void>;
  deleteWaitlistEntry: (entryId: string) => Promise<void>;
  createWaitlistEntry: (entryData: any) => Promise<any>;
  
  // Tag operations
  createTag: (tagData: any) => Promise<any>;
  updateTag: (tagId: string, tagData: any) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  
  // Preorder profile operations
  createPreorderProfile: (profileData: any) => Promise<any>;
  updatePreorderProfile: (profileId: string, profileData: any) => Promise<void>;
  
  // Settings operations
  fetchBookingSettings: () => Promise<void>;
  updateBookingSettings: (updates: Partial<BookingSettings>) => Promise<void>;

  // Integrations (for modern settings UI) - stored under companies/<id>/settings/bookings/integrations[/sites/...][/subsites/...]
  loadBookingsIntegrations: () => Promise<Record<string, any>>;
  saveBookingsIntegration: (integration: { id: string } & Record<string, any>) => Promise<void>;

  // Email config (used by booking communications) stored under companies/<id>/sites/<id>/subsites/<id>/emailConfig
  loadBookingsEmailConfig: () => Promise<{ email?: string; senderName?: string; hasAppPassword?: boolean; updatedAt?: number } | null>;
  saveBookingsEmailConfig: (config: { email: string; appPassword?: string; senderName?: string }) => Promise<void>;

  // Staff list subscription used by staff assignment tools (keeps firebase out of UI)
  subscribeBookingStaff: (
    onStaff: (staff: Array<{ id: string; firstName: string; lastName: string; role: string; department: string; fullName: string }>) => void,
  ) => () => void;
  
  // OAuth operations
  checkOAuthToken: (provider: 'gmail' | 'outlook') => Promise<boolean>;
  
  // Floor plan operations
  fetchFloorPlans: () => Promise<void>;
  addFloorPlan: (floorPlan: Partial<FloorPlan>) => Promise<FloorPlan>;
  updateFloorPlan: (floorPlanId: string, updates: Partial<FloorPlan>) => Promise<void>;
  deleteFloorPlan: (floorPlanId: string) => Promise<void>;
  
  // Table element operations for floor plans
  addTableToFloorPlan: (floorPlanId: string, tableElement: Omit<TableElement, "id">) => Promise<TableElement>;
  updateTableInFloorPlan: (floorPlanId: string, tableElementId: string, updates: Partial<TableElement>) => Promise<void>;
  removeTableFromFloorPlan: (floorPlanId: string, tableElementId: string) => Promise<void>;
  
  // Stats operations
  fetchBookingStats: () => Promise<void>;
  
  // Booking tags operations
  fetchBookingTags: () => Promise<void>;
  addBookingTag: (tag: Omit<BookingTag, "id" | "createdAt" | "updatedAt">) => Promise<BookingTag>;
  updateBookingTag: (tagId: string, updates: Partial<BookingTag>) => Promise<void>;
  deleteBookingTag: (tagId: string) => Promise<void>;
  
  // Preorder profile operations
  fetchPreorderProfiles: () => Promise<any[]>;
  savePreorderProfile: (profile: any) => Promise<string>;
  deletePreorderProfile: (profileId: string) => Promise<void>;
  
  // Stock integration operations
  fetchStockCourses: () => Promise<any[]>;
  fetchStockProducts: () => Promise<any[]>;
  
  // Utility functions
  calculateEndTime: (arrivalTime: string, duration: number) => string;
  generateTimeSlots: (intervalMinutes?: number) => string[];
  normalizeColor: (color: string | undefined) => string;
  
  // Reset state
  resetBookingsState: () => void;
}

// Create the context
const BookingsContext = createContext<BookingsContextType | undefined>(undefined)







// Create a hook for accessing the BookingsContext - graceful handling when not loaded
export const useBookings = (): BookingsContextType => {
  const context = useContext(BookingsContext)
  if (context === undefined) {
    // Return a safe default context instead of throwing error
    // This allows components to render even when Bookings module isn't loaded yet
    const emptyContext: BookingsContextType = {
      companyID: null,
      siteID: null,
      subsiteID: null,
      bookings: [],
      bookingTypes: [],
      tables: [],
      bookingStatuses: [],
      bookingTags: [],
      customers: [],
      waitlistEntries: [],
      bookingSettings: null,
      floorPlans: [],
      bookingStats: null,
      locations: [],
      loading: false,
      error: null,
      initialized: false,
      basePath: "",
      canViewBookings: () => false,
      canEditBookings: () => false,
      canDeleteBookings: () => false,
      isOwner: () => false,
      fetchBookings: async () => {},
      fetchBookingsByCustomer: async () => {},
      fetchBookingsByTable: async () => {},
      fetchBookingsByDate: async () => [],
      addBooking: async () => ({} as any),
      updateBooking: async () => {},
      deleteBooking: async () => {},
      fetchBookingTypes: async () => {},
      addBookingType: async () => ({} as any),
      updateBookingType: async () => {},
      deleteBookingType: async () => {},
      fetchTables: async () => {},
      addTable: async () => ({} as any),
      updateTable: async () => {},
      deleteTable: async () => {},
      fetchBookingStatuses: async () => {},
      addBookingStatus: async () => ({} as any),
      updateBookingStatus: async () => {},
      deleteBookingStatus: async () => {},
      fetchCustomers: async () => {},
      addCustomer: async () => ({} as any),
      updateCustomer: async () => {},
      deleteCustomer: async () => {},
      fetchWaitlistEntries: async () => {},
      addWaitlistEntry: async () => ({} as any),
      updateWaitlistEntry: async () => {},
      deleteWaitlistEntry: async () => {},
      createWaitlistEntry: async () => ({}),
      createTag: async () => ({}),
      updateTag: async () => {},
      deleteTag: async () => {},
      createPreorderProfile: async () => ({}),
      updatePreorderProfile: async () => {},
      fetchBookingSettings: async () => {},
      updateBookingSettings: async () => {},
      loadBookingsIntegrations: async () => ({}),
      saveBookingsIntegration: async () => {},
      loadBookingsEmailConfig: async () => null,
      saveBookingsEmailConfig: async () => {},
      subscribeBookingStaff: () => () => {},
      checkOAuthToken: async () => false,
      fetchFloorPlans: async () => {},
      addFloorPlan: async () => ({} as any),
      updateFloorPlan: async () => {},
      deleteFloorPlan: async () => {},
      addTableToFloorPlan: async () => ({} as any),
      updateTableInFloorPlan: async () => {},
      removeTableFromFloorPlan: async () => {},
      fetchBookingStats: async () => {},
      fetchBookingTags: async () => {},
      addBookingTag: async () => ({} as any),
      updateBookingTag: async () => {},
      deleteBookingTag: async () => {},
      fetchPreorderProfiles: async () => [],
      savePreorderProfile: async () => "",
      deletePreorderProfile: async () => {},
      fetchStockCourses: async () => [],
      fetchStockProducts: async () => [],
      calculateEndTime: () => "",
      generateTimeSlots: () => [],
      normalizeColor: () => "#000000",
      resetBookingsState: () => {},
    }
    
    return emptyContext
  }
  return context
}

// Export types for frontend components to use
export type { 
  Booking, 
  BookingType, 
  Table, 
  BookingStatus, 
  Customer, 
  WaitlistEntry, 
  BookingSettings,
  FloorPlan,
  BookingStats,
  BookingTag,
  TableElement
} from "../interfaces/Bookings"

// Create the BookingsProvider component
interface BookingsProviderProps {
  children: React.ReactNode
}

export const BookingsProvider: React.FC<BookingsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingsReducer, initialState)
  const { state: companyState, isOwner, hasPermission, isFullyLoaded: companyFullyLoaded } = useCompany()
  const { state: settingsState } = useSettings()
  const isInitializing = useRef(false)
  const lastBasePath = useRef<string>("")
  const latestBookingsRef = useRef<Booking[]>([])
  
  // Track loaded base paths to prevent duplicate loading (like HRContext)
  const loadedPaths = React.useRef<Set<string>>(new Set())
  const loadingTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({})
  
  // Track previous basePath to detect changes
  const previousBasePathRef = useRef<string | null>(null)
  
  // Timer refs for performance tracking
  const bookingsTimersRef = useRef<{
    basePath: string | null
    coreTimerId: string | null
    allTimerId: string | null
    coreLogged: boolean
    allLogged: boolean
    cacheLogged: boolean
  }>({ basePath: null, coreTimerId: null, allTimerId: null, coreLogged: false, allLogged: false, cacheLogged: false })

  // Multi-path loader for Bookings data - prioritize subsite over site
  const getBookingsPaths = useCallback(() => {
    if (!companyState.companyID) return []
    const paths = []
    const companyRoot = `companies/${companyState.companyID}`
    if (companyState.selectedSiteID) {
      // If subsite is selected, prioritize subsite level first
      if (companyState.selectedSubsiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/subsites/${companyState.selectedSubsiteID}/data/bookings`)
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/bookings`)
      } else {
        // If no subsite selected, only check site level
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/bookings`)
      }
    } else {
      // If only company is selected, allow company-level bookings data
      paths.push(`${companyRoot}/data/bookings`)
    }
    return paths
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Compute the current bookings base path derived from company/site selection (backwards compatibility)
  const basePath = useMemo(() => {
    const paths = getBookingsPaths()
    return paths.length > 0 ? paths[0] : ""
  }, [getBookingsPaths])

  // Update company and site IDs when they change
  useEffect(() => {
    dispatch({ type: BookingsActionType.SET_COMPANY_ID, payload: companyState.companyID || null })
    dispatch({ type: BookingsActionType.SET_SITE_ID, payload: companyState.selectedSiteID || null })
    dispatch({ type: BookingsActionType.SET_SUBSITE_ID, payload: companyState.selectedSubsiteID || null })
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Keep a ref to the latest bookings so fetchers can avoid clearing UI on transient empty refreshes.
  useEffect(() => {
    latestBookingsRef.current = Array.isArray(state.bookings) ? state.bookings : []
  }, [state.bookings])

  // Auto-refresh data when base path changes (with progressive loading + caching)
  useEffect(() => {
    // Wait for dependencies: Settings must be ready first
    if (!settingsState.auth || settingsState.loading) {
      return // Settings not ready yet
    }
    
    // If no company selected but user is logged in, mark as initialized with empty state
    if (!companyState.companyID && settingsState.auth.isLoggedIn) {
      if (!state.initialized) {
        dispatch({ type: BookingsActionType.SET_INITIALIZED, payload: true })
      }
      previousBasePathRef.current = null
      loadedPaths.current.clear() // Clear loaded paths when company is deselected
      return // Company not selected yet (but user is logged in)
    }
    
    // Scope path (company/site/subsite) used for load de-duping.
    // NOTE: This is NOT the RTDB bookings data path (which includes `/data/bookings`).
    const scopePath = basePath ? basePath.replace('/data/bookings', '') : ''
    
    // If scope changed (site/subsite changed), clear old paths and reload
    if (previousBasePathRef.current && previousBasePathRef.current !== scopePath) {
      loadedPaths.current.clear() // Clear all loaded paths when path changes
      // Reset initialized state so we reload
      dispatch({ type: BookingsActionType.SET_INITIALIZED, payload: false })
      // Set new path immediately so we don't skip loading it
      previousBasePathRef.current = scopePath
    } else if (!previousBasePathRef.current) {
      // First time setting the path
      previousBasePathRef.current = scopePath
    }
    
    if (!scopePath || !basePath) {
      // If no basePath but we have a company, mark as initialized with empty state
      if (companyState.companyID && !state.initialized) {
        dispatch({ type: BookingsActionType.SET_INITIALIZED, payload: true })
      }
      return // No base path available
    }
    
    // FAST UI: hydrate from cache immediately if available (does NOT depend on Company core)
    // Cache can load immediately - doesn't need to wait for Company core
    const hydrateCache = async () => {
      if (bookingsTimersRef.current.cacheLogged) return // Already hydrated
      
      try {
        const paths = getBookingsPaths()
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
          bookingsCached,
          tablesCached,
          bookingTypesCached,
          bookingStatusesCached,
          customersCached,
          bookingTagsCached,
          floorPlansCached,
          waitlistEntriesCached,
        ] = await Promise.all([
          peekFirst<Booking>('bookings'),
          peekFirst<Table>('tables'),
          peekFirst<BookingType>('bookingTypes'),
          peekFirst<BookingStatus>('bookingStatuses'),
          peekFirst<Customer>('customers'),
          peekFirst<BookingTag>('bookingTags'),
          peekFirst<FloorPlan>('floorPlans'),
          peekFirst<WaitlistEntry>('waitlistEntries'),
        ])

        if (
          bookingsCached ||
          tablesCached ||
          bookingTypesCached ||
          bookingStatusesCached ||
          bookingTagsCached ||
          customersCached ||
          floorPlansCached ||
          waitlistEntriesCached
        ) {
          // Only update slices that actually changed to reduce flashing/re-renders
          // Priority: Core data (bookings, tables, bookingTypes, bookingStatuses, bookingTags)
          const payload: any = { initialized: true }
          if (bookingsCached !== null) payload.bookings = bookingsCached || []
          if (tablesCached !== null) payload.tables = tablesCached || []
          if (bookingTypesCached !== null) payload.bookingTypes = bookingTypesCached || []
          if (bookingStatusesCached !== null) payload.bookingStatuses = bookingStatusesCached || []
          if (bookingTagsCached !== null) payload.bookingTags = bookingTagsCached || []
          // Background data (customers, floorPlans, waitlistEntries)
          if (customersCached !== null) payload.customers = customersCached || []
          if (floorPlansCached !== null) payload.floorPlans = floorPlansCached || []
          if (waitlistEntriesCached !== null) payload.waitlistEntries = waitlistEntriesCached || []

          if (Object.keys(payload).length > 1) {
            dispatch({ type: BookingsActionType.BATCH_UPDATE, payload })
          }
          if (!bookingsTimersRef.current.cacheLogged) {
            bookingsTimersRef.current.cacheLogged = true
            debugLog("✅ BookingsContext: Cache hydrated")
          }
          // If we have cache, UI can render immediately without loading spinner
          dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
        }
      } catch {
        // ignore
      }
    }
    
    // Hydrate cache immediately (doesn't wait for Company core)
    void hydrateCache()
    
    // CRITICAL: Wait for Company core to be loaded before starting Bookings core
    // Sequence: Settings -> Company core -> Bookings core (cache can load immediately)
    if (companyState.companyID && !companyFullyLoaded) {
      return // Wait for Company core before starting Bookings core
    }
    
    // Skip if this exact path is already loaded
    if (loadedPaths.current.has(scopePath)) {
      return // Skip if already loaded
    }

    // Clear any existing timeout for this path
    if (loadingTimeouts.current[scopePath]) {
      clearTimeout(loadingTimeouts.current[scopePath])
    }

    // Debounce loading to prevent rapid fire requests
    loadingTimeouts.current[scopePath] = setTimeout(async () => {
      if (loadedPaths.current.has(scopePath)) return // Double check

      loadedPaths.current.add(scopePath)
      
      // For subsite-level data, we need both siteID and subsiteID
      if (companyState.selectedSubsiteID && !companyState.selectedSiteID) {
        loadedPaths.current.delete(scopePath)
        return
      }
      
      isInitializing.current = true
      lastBasePath.current = basePath
      
      // Start performance timers
      bookingsTimersRef.current = {
        basePath,
        coreTimerId: performanceTimer.start("BookingsContext", "coreLoad"),
        allTimerId: performanceTimer.start("BookingsContext", "allLoad"),
        coreLogged: false,
        allLogged: false,
        cacheLogged: bookingsTimersRef.current.cacheLogged, // Preserve cache logged state
      }
      debugLog("⏳ BookingsContext: Starting load", { basePath })
      
      await measurePerformance('BookingsContext', 'init', async () => {
        try {
          const paths = getBookingsPaths()

          // Only set loading to true if we don't have cache (for instant tab switching)
          // If we have cache, UI can render immediately without loading spinner
          if (!bookingsTimersRef.current.cacheLogged) {
            dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
          }
          
          // Create cached fetchers
          const fetchBookingsCached = createCachedFetcher(
            async (_path: string) => {
              for (const p of paths) {
                try {
                  const data = await BookingsFunctions.getBookings(p)
                  if (data && data.length > 0) return data
                } catch (error) {
                  continue
                }
              }
              return []
            },
            'bookings'
          )
          const fetchTablesCached = createCachedFetcher(BookingsFunctions.getTables, 'tables')
          const fetchBookingTypesCached = createCachedFetcher(BookingsFunctions.getBookingTypes, 'bookingTypes')
          const fetchBookingStatusesCached = createCachedFetcher(BookingsFunctions.getBookingStatuses, 'bookingStatuses')
          const fetchCustomersCached = createCachedFetcher(BookingsFunctions.getCustomers, 'customers')
          const fetchBookingTagsCached = createCachedFetcher(BookingsFunctions.getBookingTags, 'bookingTags')
          const fetchFloorPlansCached = createCachedFetcher(BookingsFunctions.getFloorPlans, 'floorPlans')
          const fetchWaitlistEntriesCached = createCachedFetcher(BookingsFunctions.getWaitlist, 'waitlistEntries')
          const fetchBookingSettingsCached = createCachedFetcher(
            async (path: string) => {
              const settings = await BookingsFunctions.getBookingSettings(path)
              return settings ? [settings] : []
            },
            'bookingSettings'
          )
          const fetchBookingStatsCached = createCachedFetcher(
            async (path: string) => {
              const stats = await BookingsFunctions.getBookingStats(path, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0])
              return stats ? [stats] : []
            },
            'bookingStats'
          )
          
          // PROGRESSIVE LOADING: Critical data first (for immediate UI)
          // Include bookingTypes, bookingStatuses, and bookingTags in core load since they're required by BookingsList and BookingCalendar
          // Also include floorPlans, bookingSettings, and preorderProfiles for BookingDiary, FloorPlanEditor, BookingTypeForm, and PreorderProfiles
          const [bookings, tables, bookingTypes, bookingStatuses, bookingTags, floorPlans, bookingSettings] = await Promise.all([
            fetchBookingsCached(basePath, false).catch(() => undefined),
            fetchTablesCached(basePath, false).catch(() => undefined),
            fetchBookingTypesCached(basePath, false).catch(() => undefined),
            fetchBookingStatusesCached(basePath, false).catch(() => undefined),
            fetchBookingTagsCached(basePath, false).catch(() => undefined),
            fetchFloorPlansCached(basePath, false).catch(() => undefined),
            fetchBookingSettingsCached(basePath, false).catch(() => undefined),
          ])
          
          // Load preorder profiles after core data (needed by BookingTypeForm and PreorderProfiles)
          // Preorder profiles use multi-path fetching like bookings - include in "all data loaded" check
          let preorderProfiles: any[] = []
          try {
            for (const p of paths) {
              try {
                const profiles = await BookingsFunctions.getPreorderProfiles(p)
                if (profiles && profiles.length > 0) {
                  preorderProfiles = profiles
                  break // Found profiles, no need to check other paths
                }
              } catch (error) {
                continue
              }
            }
          } catch (error) {
            debugWarn("Error fetching preorder profiles for all data loaded check:", error)
            preorderProfiles = [] // Set to empty array on error so "all data loaded" check can still pass
          }
          
          // Update critical data from the database (source of truth) when the DB fetch succeeded.
          // If a fetch failed, keep whatever we already have (often cache-hydrated) instead of
          // treating failure as an empty list.
          const corePayload: any = { initialized: true }
          const fetchedBookingsArr: Booking[] = Array.isArray(bookings) ? (bookings as Booking[]) : []
          // Database is the source of truth. If the live fetch returns an empty list,
          // we still apply it so deletes / moves are reflected correctly.
          if (bookings !== undefined) corePayload.bookings = fetchedBookingsArr
          if (tables !== undefined) corePayload.tables = tables || []
          if (bookingTypes !== undefined) corePayload.bookingTypes = bookingTypes || []
          if (bookingStatuses !== undefined) corePayload.bookingStatuses = bookingStatuses || []
          if (bookingTags !== undefined) corePayload.bookingTags = bookingTags || []
          if (floorPlans !== undefined) corePayload.floorPlans = floorPlans || []
          if (bookingSettings !== undefined) {
            corePayload.bookingSettings = (bookingSettings && bookingSettings.length > 0 ? bookingSettings[0] : null)
          }
          if (Object.keys(corePayload).length > 1) {
            dispatch({ type: BookingsActionType.BATCH_UPDATE, payload: corePayload })
          }
          
          // After dispatch, check if core is loaded (all critical data has been fetched)
          // Core is loaded when all 7 critical entities have been fetched (even if empty arrays)
          // We check after dispatch so state has been updated
          if (!bookingsTimersRef.current.coreLogged && bookingsTimersRef.current.coreTimerId) {
            // Core is loaded once all 7 critical entities have been fetched
            // Empty arrays are valid - core is loaded even if no data exists
            const coreLoaded = bookings !== undefined && 
                              tables !== undefined && 
                              bookingTypes !== undefined && 
                              bookingStatuses !== undefined && 
                              bookingTags !== undefined &&
                              floorPlans !== undefined &&
                              bookingSettings !== undefined
            
            if (coreLoaded) {
              bookingsTimersRef.current.coreLogged = true
              const duration = performanceTimer.end(bookingsTimersRef.current.coreTimerId, {
                bookings: (bookings || []).length,
                tables: (tables || []).length,
                bookingTypes: (bookingTypes || []).length,
                bookingStatuses: (bookingStatuses || []).length,
                bookingTags: (bookingTags || []).length,
                floorPlans: (floorPlans || []).length,
                bookingSettings: bookingSettings && bookingSettings.length > 0 ? 1 : 0,
              })
              debugLog(`✅ BookingsContext: Core loaded (${duration.toFixed(2)}ms)`)
              // Set loading to false once core data is loaded (for instant tab switching)
              // Core data includes all data needed by all bookings pages
              dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
            }
          }
          
          // All data loaded timing - fires when core + preorder profiles is complete
          // This ensures "All data loaded" includes all data needed by all bookings pages (including BookingTypeForm and PreorderProfiles)
          if (!bookingsTimersRef.current.allLogged && bookingsTimersRef.current.allTimerId && bookingsTimersRef.current.coreLogged) {
            // All data is loaded when core + preorder profiles are fetched
            const allDataLoaded = bookings !== undefined && 
                                 tables !== undefined && 
                                 bookingTypes !== undefined && 
                                 bookingStatuses !== undefined && 
                                 bookingTags !== undefined &&
                                 floorPlans !== undefined &&
                                 bookingSettings !== undefined &&
                                 preorderProfiles !== undefined
            
            if (allDataLoaded) {
              bookingsTimersRef.current.allLogged = true
              const duration = performanceTimer.end(bookingsTimersRef.current.allTimerId, {
                bookings: (bookings || []).length,
                tables: (tables || []).length,
                bookingTypes: (bookingTypes || []).length,
                bookingStatuses: (bookingStatuses || []).length,
                bookingTags: (bookingTags || []).length,
                floorPlans: (floorPlans || []).length,
                bookingSettings: bookingSettings && bookingSettings.length > 0 ? 1 : 0,
                preorderProfiles: (preorderProfiles || []).length,
              })
              debugLog(`✅ BookingsContext: All data loaded (${duration.toFixed(2)}ms)`)
            }
          }
          
          // BACKGROUND: Load non-critical data after (non-blocking)
          // Load additional data that's not essential for main pages
          const loadBackgroundData = () => {
            Promise.all([
              fetchCustomersCached(basePath, false).catch(() => undefined),
              fetchWaitlistEntriesCached(basePath, false).catch(() => undefined),
              fetchBookingStatsCached(basePath, false).catch(() => undefined),
            ]).then(([customers, waitlistEntries, bookingStats]) => {
              const bgPayload: any = {}
              if (customers !== undefined) bgPayload.customers = customers || []
              if (waitlistEntries !== undefined) bgPayload.waitlistEntries = waitlistEntries || []
              if (bookingStats !== undefined) bgPayload.bookingStats = (bookingStats && bookingStats.length > 0 ? bookingStats[0] : null)
              
              if (Object.keys(bgPayload).length > 0) {
                dispatch({ type: BookingsActionType.BATCH_UPDATE, payload: bgPayload })
              }
              // Background data loaded silently
            }).catch(error => {
              debugWarn('Error loading background bookings data:', error)
            })
          }
          
          // Use requestIdleCallback if available, otherwise setTimeout
          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadBackgroundData, { timeout: 300 })
          } else {
            setTimeout(loadBackgroundData, 100)
          }
        } catch (error) {
          // Remove from loaded paths on error so it can retry
          loadedPaths.current.delete(scopePath)
          debugWarn('Bookings data refresh failed, maintaining old data:', error)
          // Keep old data visible even if refresh fails
        } finally {
          // Ensure loading is set to false when all operations complete
          isInitializing.current = false
          dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
          // Clean up timeout reference
          delete loadingTimeouts.current[scopePath]
        }
      }, () => ({
        bookings: state.bookings?.length || 0,
        tables: state.tables?.length || 0,
        bookingTypes: state.bookingTypes?.length || 0,
      }))
    }, 50) // Reduced debounce for faster initial core load

    // Cleanup function
    return () => {
      if (loadingTimeouts.current[scopePath]) {
        clearTimeout(loadingTimeouts.current[scopePath])
        delete loadingTimeouts.current[scopePath]
      }
    }
  }, [
    basePath,
    settingsState.auth,
    settingsState.loading,
    companyState.companyID,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    companyFullyLoaded,
    getBookingsPaths,
  ])

  // Booking operations with multi-path loading
  const fetchBookings = useCallback(async () => {
    const paths = getBookingsPaths()
    if (paths.length === 0) return
    
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      for (const path of paths) {
        try {
          const bookings = await BookingsFunctions.getBookings(path)
          if (bookings && bookings.length > 0) {
            dispatch({ type: BookingsActionType.SET_BOOKINGS, payload: bookings })
            return
          }
        } catch (error) {
          continue
        }
      }
      // If no path returned any bookings, DON'T blindly clear the list if we already have data.
      // This prevents "bookings appear then disappear" caused by transient empty reads / wrong-path reads.
      if ((latestBookingsRef.current || []).length === 0) {
        dispatch({ type: BookingsActionType.SET_BOOKINGS, payload: [] })
      } else {
        debugWarn("fetchBookings: no bookings returned from any path; preserving existing list")
      }
    } catch (error) {
      debugWarn("Error fetching bookings:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch bookings" })
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [getBookingsPaths])

  const fetchBookingsByDate = useCallback(async (date: string): Promise<Booking[]> => {
    const paths = getBookingsPaths()
    if (paths.length === 0) return []

    const normalize = (raw: any): string => {
      if (!raw) return ""
      if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10)
      try {
        const d = new Date(raw)
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
      } catch {
        // ignore
      }
      return ""
    }

    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const wanted = normalize(date)
      for (const path of paths) {
        try {
          const all = await BookingsFunctions.getBookings(path)
          const filtered = (Array.isArray(all) ? all : []).filter((b: any) => normalize(b?.date) === wanted)
          if (filtered.length > 0) return filtered as Booking[]
        } catch (error) {
          continue
        }
      }
      return []
    } catch (error) {
      debugWarn("Error fetching bookings by date:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch bookings by date" })
      return []
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [getBookingsPaths])

  // Note: getBookingsByCustomer doesn't exist in the backend, using custom implementation
  const fetchBookingsByCustomer = useCallback(async (customerId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      // Get all bookings and filter by customer ID
      const allBookings = await BookingsFunctions.getBookings(basePath)
      const customerBookings = allBookings.filter(booking => booking.customerId === customerId)
      dispatch({ type: BookingsActionType.SET_BOOKINGS, payload: customerBookings })
    } catch (error) {
      debugWarn("Error fetching bookings by customer:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch bookings by customer" })
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Note: getBookingsByTable doesn't exist in the backend, using custom implementation
  const fetchBookingsByTable = useCallback(async (tableId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      // Get all bookings and filter by table ID
      const allBookings = await BookingsFunctions.getBookings(basePath)
      const tableBookings = allBookings.filter(booking => booking.tableId === tableId)
      dispatch({ type: BookingsActionType.SET_BOOKINGS, payload: tableBookings })
    } catch (error) {
      debugWarn("Error fetching bookings by table:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch bookings by table" })
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const addBooking = useCallback(async (booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> => {
    if (!basePath) {
      throw new Error("Base path not available")
    }
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newBooking = await BookingsFunctions.addBooking(basePath, booking)
      if (!newBooking) {
        throw new Error("Failed to create booking")
      }
      dispatch({ type: BookingsActionType.ADD_BOOKING, payload: newBooking })
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'booking',
          'created',
          'Booking Created',
          `New booking for ${booking.customer || 'customer'} on ${booking.date}`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: newBooking.id,
              entityName: `Booking for ${booking.customer || 'customer'}`,
              newValue: newBooking,
              changes: {
                booking: { from: {}, to: newBooking }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      return newBooking
    } catch (error) {
      debugWarn("Error adding booking:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to add booking" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  const updateBooking = useCallback(async (bookingId: string, updates: Partial<Booking>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      // First get the full booking
      const bookings = await BookingsFunctions.getBookings(basePath)
      const booking = bookings.find(b => b.id === bookingId)
      
      if (!booking) {
        throw new Error(`Booking with ID ${bookingId} not found`)
      }

      // Then update it with the new values
      await BookingsFunctions.updateBooking(basePath, booking.id, updates)
      dispatch({ type: BookingsActionType.UPDATE_BOOKING, payload: { id: bookingId, updates } })
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'booking',
          'updated',
          'Booking Updated',
          `Booking for ${booking.customer || 'customer'} was updated`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'info',
            details: {
              entityId: bookingId,
              entityName: `Booking for ${booking.customer || 'customer'}`,
              oldValue: booking,
              newValue: { ...booking, ...updates },
              changes: {
                booking: { from: booking, to: { ...booking, ...updates } }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
    } catch (error) {
      debugWarn("Error updating booking:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update booking" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const deleteBooking = useCallback(async (bookingId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      // Get booking info before deletion for notification
      const bookings = await BookingsFunctions.getBookings(basePath)
      const bookingToDelete = bookings.find(b => b.id === bookingId)
      
      await BookingsFunctions.deleteBooking(basePath, bookingId)
      dispatch({ type: BookingsActionType.DELETE_BOOKING, payload: bookingId })
      
      // Add notification
      if (bookingToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'booking',
            'deleted',
            'Booking Cancelled',
            `Booking for ${bookingToDelete.customer || 'customer'} was cancelled`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: bookingId,
                entityName: `Booking for ${bookingToDelete.customer || 'customer'}`,
                oldValue: bookingToDelete,
                changes: {
                  booking: { from: bookingToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      debugWarn("Error deleting booking:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to delete booking" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  // Booking type operations
  const fetchBookingTypes = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const bookingTypes = await BookingsFunctions.getBookingTypes(basePath)
      dispatch({ type: BookingsActionType.SET_BOOKING_TYPES, payload: bookingTypes })
    } catch (error) {
      debugWarn("Error fetching booking types:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch booking types" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Booking type operations
  const addBookingType = useCallback(async (bookingType: Omit<BookingType, "id">) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newType = await BookingsFunctions.addBookingType(basePath, bookingType)
      dispatch({ type: BookingsActionType.ADD_BOOKING_TYPE, payload: newType })
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'booking',
          'created',
          'Booking Type Created',
          `Booking type "${bookingType.name || 'New Type'}" was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: newType.id,
              entityName: bookingType.name || 'Booking Type',
              newValue: newType,
              changes: {
                bookingType: { from: {}, to: newType }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      return newType
    } catch (error) {
      debugWarn("Error adding booking type:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to add booking type" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  const updateBookingType = useCallback(async (bookingTypeId: string, updates: Partial<BookingType>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const originalType = state.bookingTypes.find(bt => bt.id === bookingTypeId)
      await BookingsFunctions.updateBookingType(basePath, bookingTypeId, updates)
      dispatch({ type: BookingsActionType.UPDATE_BOOKING_TYPE, payload: { id: bookingTypeId, updates } })
      
      // Add notification
      if (originalType) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'booking',
            'updated',
            'Booking Type Updated',
            `Booking type "${updates.name || originalType.name || 'Type'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: bookingTypeId,
                entityName: updates.name || originalType.name || 'Booking Type',
                oldValue: originalType,
                newValue: { ...originalType, ...updates },
                changes: {
                  bookingType: { from: originalType, to: { ...originalType, ...updates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      debugWarn("Error updating booking type:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update booking type" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath, state.bookingTypes, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  const deleteBookingType = useCallback(async (bookingTypeId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const typeToDelete = state.bookingTypes.find(bt => bt.id === bookingTypeId)
      await BookingsFunctions.deleteBookingType(basePath, bookingTypeId)
      dispatch({ type: BookingsActionType.DELETE_BOOKING_TYPE, payload: bookingTypeId })
      
      // Add notification
      if (typeToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'booking',
            'deleted',
            'Booking Type Deleted',
            `Booking type "${typeToDelete.name || 'Type'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: bookingTypeId,
                entityName: typeToDelete.name || 'Booking Type',
                oldValue: typeToDelete,
                changes: {
                  bookingType: { from: typeToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      debugWarn("Error deleting booking type:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to delete booking type" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath, state.bookingTypes, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  // Table operations
  const fetchTables = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const tables = await BookingsFunctions.getTables(basePath)
      dispatch({ type: BookingsActionType.SET_TABLES, payload: tables })
    } catch (error) {
      debugWarn("Error fetching tables:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch tables" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const addTable = useCallback(async (table: Omit<Table, "id">) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newTable = await BookingsFunctions.addTable(basePath, table)
      dispatch({ type: BookingsActionType.ADD_TABLE, payload: newTable })
      
      // Add notification
      try {
        await createNotification(
          companyState.companyID,
          settingsState.auth?.uid || 'system',
          'booking',
          'created',
          'Table Created',
          `Table "${table.name || table.number || 'New Table'}" was created`,
          {
            siteId: companyState.selectedSiteID || undefined,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: newTable.id,
                entityName: String(table.name || table.number || 'Table'),
              newValue: newTable,
              changes: {
                table: { from: {}, to: newTable }
              }
            }
          }
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      return newTable
    } catch (error) {
      debugWarn("Error adding table:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to add table" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  const updateTable = useCallback(async (tableId: string, updates: Partial<Table>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const originalTable = state.tables.find(t => t.id === tableId)
      await BookingsFunctions.updateTable(basePath, tableId, updates)
      dispatch({ type: BookingsActionType.UPDATE_TABLE, payload: { id: tableId, updates } })
      
      // Add notification
      if (originalTable) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'booking',
            'updated',
            'Table Updated',
            `Table "${updates.name || updates.number || originalTable.name || originalTable.number || 'Table'}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: tableId,
                entityName: String(updates.name || updates.number || originalTable.name || originalTable.number || 'Table'),
                oldValue: originalTable,
                newValue: { ...originalTable, ...updates },
                changes: {
                  table: { from: originalTable, to: { ...originalTable, ...updates } }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      debugWarn("Error updating table:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update table" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath, state.tables, companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid])

  const deleteTable = useCallback(async (tableId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const tableToDelete = state.tables.find(t => t.id === tableId)
      await BookingsFunctions.deleteTable(basePath, tableId)
      dispatch({ type: BookingsActionType.DELETE_TABLE, payload: tableId })
      
      // Add notification
      if (tableToDelete) {
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'booking',
            'deleted',
            'Table Deleted',
            `Table "${tableToDelete.name || tableToDelete.number || 'Table'}" was deleted`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'warning',
              details: {
                entityId: tableId,
                entityName: String(tableToDelete.name || tableToDelete.number || 'Table'),
                oldValue: tableToDelete,
                changes: {
                  table: { from: tableToDelete, to: null }
                }
              }
            }
          )
        } catch (notificationError) {
          debugWarn('Failed to create notification:', notificationError)
        }
      }
    } catch (error) {
      debugWarn("Error deleting table:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to delete table" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Booking status operations
  const fetchBookingStatuses = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const statuses = await BookingsFunctions.getBookingStatuses(basePath)
      dispatch({ type: BookingsActionType.SET_BOOKING_STATUSES, payload: statuses })
    } catch (error) {
      debugWarn("Error fetching booking statuses:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch booking statuses" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const addBookingStatus = useCallback(async (status: Omit<BookingStatus, "id" | "createdAt" | "updatedAt">) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newStatus = await BookingsFunctions.addBookingStatus(basePath, status)
      dispatch({ type: BookingsActionType.ADD_BOOKING_STATUS, payload: newStatus })
      return newStatus
    } catch (error) {
      debugWarn("Error adding booking status:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to add booking status" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const updateBookingStatus = useCallback(async (statusId: string, updates: Partial<BookingStatus>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.updateBookingStatus(basePath, statusId, updates)
      dispatch({ type: BookingsActionType.UPDATE_BOOKING_STATUS, payload: { id: statusId, updates } })
    } catch (error) {
      debugWarn("Error updating booking status:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update booking status" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const deleteBookingStatus = useCallback(async (statusId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.deleteBookingStatus(basePath, statusId)
      dispatch({ type: BookingsActionType.DELETE_BOOKING_STATUS, payload: statusId })
    } catch (error) {
      debugWarn("Error deleting booking status:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to delete booking status" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Customer operations
  const fetchCustomers = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const customers = await BookingsFunctions.getCustomers(basePath)
      dispatch({ type: BookingsActionType.SET_CUSTOMERS, payload: customers })
    } catch (error) {
      debugWarn("Error fetching customers:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch customers" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const addCustomer = useCallback(async (customer: Customer) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newCustomer = await BookingsFunctions.saveCustomerData(basePath, customer)
      dispatch({ type: BookingsActionType.ADD_CUSTOMER, payload: newCustomer })
      return newCustomer
    } catch (error) {
      debugWarn("Error adding customer:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to add customer" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const updateCustomer = useCallback(async (customerId: string, updates: Partial<Customer>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      // Need to get the full customer first, then apply updates
      const customers = await BookingsFunctions.getCustomers(basePath)
      const customer = customers.find(c => c.id === customerId)
      
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`)
      }
      
      const updatedCustomer = { ...customer, ...updates }
      await BookingsFunctions.saveCustomerData(basePath, updatedCustomer)
      dispatch({ type: BookingsActionType.UPDATE_CUSTOMER, payload: { id: customerId, updates } })
    } catch (error) {
      debugWarn("Error updating customer:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update customer" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const deleteCustomer = useCallback(async (customerId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.deleteCustomer(basePath, customerId)
      dispatch({ type: BookingsActionType.DELETE_CUSTOMER, payload: customerId })
    } catch (error) {
      debugWarn("Error deleting customer:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to delete customer" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Reset state
  const resetBookingsState = useCallback(() => {
    dispatch({ type: BookingsActionType.RESET })
  }, [])

  // Waitlist operations
  const fetchWaitlistEntries = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const entries = await BookingsFunctions.getWaitlist(basePath)
      dispatch({ type: BookingsActionType.SET_WAITLIST_ENTRIES, payload: entries })
    } catch (error) {
      debugWarn("Error fetching waitlist entries:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch waitlist entries" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const addWaitlistEntry = useCallback(async (entry: Omit<WaitlistEntry, "id" | "timeAdded" | "status">) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newEntry = await BookingsFunctions.addWaitlistEntry(basePath, entry)
      dispatch({ type: BookingsActionType.ADD_WAITLIST_ENTRY, payload: newEntry })
      return newEntry
    } catch (error) {
      debugWarn("Error adding waitlist entry:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to add waitlist entry" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const updateWaitlistEntry = useCallback(async (entryId: string, updates: Partial<WaitlistEntry>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.updateWaitlist(basePath, entryId, updates)
      dispatch({ type: BookingsActionType.UPDATE_WAITLIST_ENTRY, payload: { id: entryId, updates } })
    } catch (error) {
      debugWarn("Error updating waitlist entry:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update waitlist entry" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const deleteWaitlistEntry = useCallback(async (entryId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.removeWaitlistEntry(basePath, entryId)
      dispatch({ type: BookingsActionType.DELETE_WAITLIST_ENTRY, payload: entryId })
    } catch (error) {
      debugWarn("Error deleting waitlist entry:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to delete waitlist entry" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Booking settings operations
  const fetchBookingSettings = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const settings = await BookingsFunctions.getBookingSettings(basePath)
      if (settings) {
        dispatch({ type: BookingsActionType.SET_BOOKING_SETTINGS, payload: settings })
      }
    } catch (error) {
      debugWarn("Error fetching booking settings:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch booking settings" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const updateBookingSettings = useCallback(async (updates: Partial<BookingSettings>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      // Need to get the full settings first, then apply updates
      const currentSettings = await BookingsFunctions.getBookingSettings(basePath)
      const fallbackSettings: BookingSettings = (currentSettings || {
        openTimes: {},
        bookingTypes: {},
        businessHours: [
          { day: "Monday", closed: false, open: "09:00", close: "17:00" },
          { day: "Tuesday", closed: false, open: "09:00", close: "17:00" },
          { day: "Wednesday", closed: false, open: "09:00", close: "17:00" },
          { day: "Thursday", closed: false, open: "09:00", close: "17:00" },
          { day: "Friday", closed: false, open: "09:00", close: "17:00" },
          { day: "Saturday", closed: false, open: "10:00", close: "16:00" },
          { day: "Sunday", closed: true, open: "10:00", close: "16:00" },
        ],
        blackoutDates: [],
        allowOnlineBookings: true,
        maxDaysInAdvance: 30,
        minHoursInAdvance: 1,
        timeSlotInterval: 30,
        defaultDuration: 120,
        maxPartySize: 20,
        cancellationPolicy: "24 hours notice required.",
        confirmationEmailTemplate: "Thank you for your booking!",
        reminderEmailTemplate: "This is a reminder about your upcoming booking.",
        contactEmailProvider: "gmail",
        contactEmailAddress: "",
        gmailConnected: false,
        outlookConnected: false,
        predefinedEmailTemplates: [],
      } as BookingSettings)
      
      // Ensure required fields have default values
      const updatedSettings: BookingSettings = {
        ...fallbackSettings,
        ...updates,
        openTimes: (fallbackSettings as any).openTimes || {},
        bookingTypes: (fallbackSettings as any).bookingTypes || {},
      }
      
      await BookingsFunctions.updateBookingSettings(basePath, updatedSettings)
      dispatch({ type: BookingsActionType.SET_BOOKING_SETTINGS, payload: updatedSettings })
    } catch (error) {
      debugWarn("Error updating booking settings:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update booking settings" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Bookings integrations stored in company settings tree (site/subsite aware)
  const getBookingsIntegrationsPath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/bookings/integrations`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadBookingsIntegrations = useCallback(async () => {
    const path = getBookingsIntegrationsPath()
    if (!path) return {}
    try {
      const result = await fetchIntegrationsFromPath(path)
      return result || {}
    } catch (err: any) {
      debugWarn("BookingsContext: loadBookingsIntegrations failed", err)
      return {}
    }
  }, [getBookingsIntegrationsPath])

  const saveBookingsIntegration = useCallback(async (integration: { id: string } & Record<string, any>) => {
    const path = getBookingsIntegrationsPath()
    if (!path || !integration?.id) return
    const clean = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
    await saveIntegrationToPath(path, integration.id, clean)
  }, [getBookingsIntegrationsPath])

  const getBookingsEmailConfigPath = useCallback(() => {
    if (!companyState.companyID) return null
    const siteId = companyState.selectedSiteID || "default"
    const subsiteId = companyState.selectedSubsiteID || "default"
    return `companies/${companyState.companyID}/sites/${siteId}/subsites/${subsiteId}/emailConfig`
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadBookingsEmailConfig = useCallback(async () => {
    if (!companyState.companyID) return null
    const path = getBookingsEmailConfigPath()
    if (!path) return null
    try {
      const val: any = await fetchIntegrationsFromPath(path)
      let hasAppPassword = false
      let updatedAt: number | undefined
      if (functions) {
        try {
          const getMailboxStatus = httpsCallable(functions, "getMailboxSecretSettingsStatus")
          const result = await getMailboxStatus({
            companyId: companyState.companyID,
            siteId: companyState.selectedSiteID || "default",
            subsiteId: companyState.selectedSubsiteID || "default",
            configType: "bookings",
          })
          hasAppPassword = Boolean((result.data as any)?.hasAppPassword)
          updatedAt = typeof (result.data as any)?.updatedAt === "number" ? (result.data as any).updatedAt : undefined
        } catch (statusError) {
          debugWarn("BookingsContext: getMailboxSecretSettingsStatus failed", statusError)
        }
      }
      if (!val) return null
      return {
        email: val.email || "",
        senderName: val.senderName || "1Stop Booking System",
        hasAppPassword,
        updatedAt: updatedAt ?? (typeof val.updatedAt === "number" ? val.updatedAt : undefined),
      }
    } catch (err: any) {
      debugWarn("BookingsContext: loadBookingsEmailConfig failed", err)
      return null
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, getBookingsEmailConfigPath])

  const saveBookingsEmailConfig = useCallback(async (config: { email: string; appPassword?: string; senderName?: string }) => {
    const path = getBookingsEmailConfigPath()
    if (!path || !companyState.companyID) return
    const clean = Object.fromEntries(
      Object.entries({
        email: config.email,
        senderName: config.senderName || "1Stop Booking System",
        updatedAt: Date.now(),
      }).filter(([, v]) => v !== undefined),
    )
    await saveIntegrationToPath(path, "", clean)
    if (config.appPassword && functions) {
      const saveMailboxStatus = httpsCallable(functions, "saveMailboxSecretSettings")
      await saveMailboxStatus({
        companyId: companyState.companyID,
        siteId: companyState.selectedSiteID || "default",
        subsiteId: companyState.selectedSubsiteID || "default",
        configType: "bookings",
        email: config.email,
        senderName: config.senderName || "1Stop Booking System",
        appPassword: config.appPassword,
      })
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, getBookingsEmailConfigPath])

  const subscribeBookingStaff = useCallback((
    onStaff: (staff: Array<{ id: string; firstName: string; lastName: string; role: string; department: string; fullName: string }>) => void,
  ) => {
    const unsubscribe = subscribeAllUsers((data) => {
      if (!data) {
        onStaff([])
        return
      }
      const staffList = Object.entries(data)
        .map(([id, user]: [string, any]) => ({
          id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          role: user.role || "",
          department: user.department || "",
          fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        }))
        .filter((user) => user.role === "Waiter" || user.role === "Server" || user.role === "Floor Staff" || user.role === "Staff")
      onStaff(staffList)
    })
    return () => unsubscribe()
  }, [])

  // OAuth token check
  const checkOAuthToken = useCallback(async (provider: 'gmail' | 'outlook') => {
    if (!companyState.companyID) return false
    
    try {
      const companyId = companyState.companyID
      const siteId = companyState.selectedSiteID || 'default'
      const subsiteId = companyState.selectedSubsiteID || 'default'
      const tokenDocId = `${companyId}_${siteId}_${subsiteId}_${provider}`
      
      // Check if OAuth token exists in Firestore
      const response = await fetch(`https://us-central1-stop-test-8025f.cloudfunctions.net/checkOAuthStatus?tokenDocId=${tokenDocId}`)
      const result = await response.json()
      
      return result.exists && result.valid
    } catch (error) {
      debugWarn("Error checking OAuth token:", error)
      return false
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Floor plans operations
  const fetchFloorPlans = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const floorPlans = await BookingsFunctions.getFloorPlans(basePath)
      dispatch({ type: BookingsActionType.SET_FLOOR_PLANS, payload: floorPlans })
    } catch (error) {
      debugWarn("Error fetching floor plans:", error)
      // IMPORTANT: Do not surface floor plan errors globally (they are handled locally in UI).
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Floor plan CRUD operations
  const addFloorPlan = useCallback(async (floorPlan: Partial<FloorPlan>) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const completeFloorPlan = {
        id: "",
        name: floorPlan.name || "New Floor Plan",
        tables: floorPlan.tables || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...floorPlan
      } as FloorPlan
      
      const newFloorPlan = await BookingsFunctions.saveFloorPlan(basePath, completeFloorPlan)
      dispatch({ type: BookingsActionType.ADD_FLOOR_PLAN, payload: newFloorPlan })
      return newFloorPlan
    } catch (error) {
      debugWarn("Error adding floor plan:", error)
      // IMPORTANT: Do not surface floor plan errors globally (they are handled locally in UI).
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const updateFloorPlan = useCallback(async (floorPlanId: string, updates: Partial<FloorPlan>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const floorPlans = await BookingsFunctions.getFloorPlans(basePath)
      const floorPlan = floorPlans.find(fp => fp.id === floorPlanId)
      
      if (!floorPlan) {
        throw new Error(`Floor plan with ID ${floorPlanId} not found`)
      }
      
      const updatedFloorPlan = { 
        ...floorPlan, 
        ...updates,
        updatedAt: new Date().toISOString() 
      }
      
      await BookingsFunctions.saveFloorPlan(basePath, updatedFloorPlan)
      dispatch({ type: BookingsActionType.UPDATE_FLOOR_PLAN, payload: { id: floorPlanId, updates } })
    } catch (error) {
      debugWarn("Error updating floor plan:", error)
      // IMPORTANT: Do not surface floor plan errors globally (they are handled locally in UI).
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const deleteFloorPlan = useCallback(async (floorPlanId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.removeFloorPlan(basePath, floorPlanId)
      dispatch({ type: BookingsActionType.DELETE_FLOOR_PLAN, payload: floorPlanId })
    } catch (error) {
      debugWarn("Error deleting floor plan:", error)
      // IMPORTANT: Do not surface floor plan errors globally (they are handled locally in UI).
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Table element operations for floor plans
  const addTableToFloorPlan = useCallback(async (floorPlanId: string, tableElement: Omit<TableElement, "id">) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newTableElement = await BookingsFunctions.addTableToLayout(basePath, floorPlanId, tableElement)
      const floorPlans = await BookingsFunctions.getFloorPlans(basePath)
      dispatch({ type: BookingsActionType.SET_FLOOR_PLANS, payload: floorPlans })
      return newTableElement
    } catch (error) {
      debugWarn("Error adding table to floor plan:", error)
      // IMPORTANT: Do not surface floor plan errors globally (they are handled locally in UI).
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const updateTableInFloorPlan = useCallback(async (floorPlanId: string, tableElementId: string, updates: Partial<TableElement>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.updateTableInFloorPlan(basePath, floorPlanId, tableElementId, updates)
      const floorPlans = await BookingsFunctions.getFloorPlans(basePath)
      dispatch({ type: BookingsActionType.SET_FLOOR_PLANS, payload: floorPlans })
    } catch (error) {
      debugWarn("Error updating table in floor plan:", error)
      // IMPORTANT: Do not surface floor plan errors globally (they are handled locally in UI).
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const removeTableFromFloorPlan = useCallback(async (floorPlanId: string, tableElementId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.removeTableFromLayout(basePath, floorPlanId, tableElementId)
      const floorPlans = await BookingsFunctions.getFloorPlans(basePath)
      dispatch({ type: BookingsActionType.SET_FLOOR_PLANS, payload: floorPlans })
    } catch (error) {
      debugWarn("Error removing table from floor plan:", error)
      // IMPORTANT: Do not surface floor plan errors globally (they are handled locally in UI).
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Prevent stale floor plan errors from "leaking" across the app.
  // Floor plan CRUD flows have their own local UI error handling.
  useEffect(() => {
    if (!state.error) return
    if (!/floor plan/i.test(state.error)) return
    dispatch({ type: BookingsActionType.SET_ERROR, payload: null })
  }, [state.error])

  // Booking stats and tags operations
  const fetchBookingStats = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const stats = await BookingsFunctions.getBookingStats(basePath)
      dispatch({ type: BookingsActionType.SET_BOOKING_STATS, payload: stats })
    } catch (error) {
      debugWarn("Error fetching booking stats:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch booking stats" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const fetchBookingTags = useCallback(async () => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const tags = await BookingsFunctions.getBookingTags(basePath)
      dispatch({ type: BookingsActionType.SET_BOOKING_TAGS, payload: tags })
    } catch (error) {
      debugWarn("Error fetching booking tags:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to fetch booking tags" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const addBookingTag = useCallback(async (tag: Omit<BookingTag, "id">) => {
    if (!basePath) throw new Error("Base path not available")
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      const newTag = await BookingsFunctions.addBookingTag(basePath, tag)
      dispatch({ type: BookingsActionType.ADD_BOOKING_TAG, payload: newTag })
      return newTag
    } catch (error) {
      debugWarn("Error adding booking tag:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to add booking tag" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const updateBookingTag = useCallback(async (tagId: string, updates: Partial<BookingTag>) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.updateBookingTag(basePath, tagId, updates)
      dispatch({ type: BookingsActionType.UPDATE_BOOKING_TAG, payload: { id: tagId, updates } })
    } catch (error) {
      debugWarn("Error updating booking tag:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to update booking tag" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  const deleteBookingTag = useCallback(async (tagId: string) => {
    if (!basePath) return
    dispatch({ type: BookingsActionType.SET_LOADING, payload: true })
    try {
      await BookingsFunctions.deleteBookingTag(basePath, tagId)
      dispatch({ type: BookingsActionType.DELETE_BOOKING_TAG, payload: tagId })
    } catch (error) {
      debugWarn("Error deleting booking tag:", error)
      dispatch({ type: BookingsActionType.SET_ERROR, payload: "Failed to delete booking tag" })
      throw error
    } finally {
      dispatch({ type: BookingsActionType.SET_LOADING, payload: false })
    }
  }, [basePath])

  // Preorder profile operations
  const fetchPreorderProfiles = useCallback(async () => {
    const paths = getBookingsPaths()
    if (paths.length === 0) return []
    
    try {
      for (const path of paths) {
        try {
          const profiles = await BookingsFunctions.getPreorderProfiles(path)
          if (profiles && profiles.length > 0) {
            // Only log when profiles are actually found and loaded
            debugLog("Bookings Context - loaded preorder profiles", { path, count: profiles.length })
            return profiles
          }
        } catch (error) {
          // Only log errors, not every attempt
          debugWarn("Bookings Context - failed to load preorder profiles from path:", path, error)
          continue
        }
      }
      // No need to log when no profiles found - this is normal
      return []
    } catch (error) {
      debugWarn("Error fetching preorder profiles:", error)
      throw error
    }
  }, [getBookingsPaths])

  const savePreorderProfile = useCallback(async (profile: any) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) throw new Error("Base path not available")
    
    try {
      debugLog("Bookings Context - saving preorder profile to path:", paths[0])
      return await BookingsFunctions.savePreorderProfile(paths[0], profile)
    } catch (error) {
      debugWarn("Error saving preorder profile:", error)
      throw error
    }
  }, [getBookingsPaths])

  const deletePreorderProfile = useCallback(async (profileId: string) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) return
    
    try {
      debugLog("Bookings Context - deleting preorder profile from path:", paths[0])
      await BookingsFunctions.deletePreorderProfile(paths[0], profileId)
    } catch (error) {
      debugWarn("Error deleting preorder profile:", error)
      throw error
    }
  }, [getBookingsPaths])

  // Stock integration operations
  const fetchStockCourses = useCallback(async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return []
    try {
      return await BookingsFunctions.getStockCourses(companyState.companyID, companyState.selectedSiteID)
    } catch (error) {
      debugWarn("Error fetching stock courses:", error)
      throw error
    }
  }, [companyState.companyID, companyState.selectedSiteID])

  const fetchStockProducts = useCallback(async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return []
    try {
      return await BookingsFunctions.getStockProducts(companyState.companyID, companyState.selectedSiteID)
    } catch (error) {
      debugWarn("Error fetching stock products:", error)
      throw error
    }
  }, [companyState.companyID, companyState.selectedSiteID])

  // Additional CRUD functions
  const createWaitlistEntry = useCallback(async (entryData: any) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) throw new Error("Base path not available")
    
    try {
      const entry = await BookingsFunctions.addWaitlistEntry(paths[0], entryData)
      await fetchBookings()
      return entry
    } catch (error) {
      debugWarn("Error creating waitlist entry:", error)
      throw error
    }
  }, [getBookingsPaths, fetchBookings])

  const createTag = useCallback(async (tagData: any) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) throw new Error("Base path not available")
    
    try {
      const tag = await BookingsFunctions.addBookingTag(paths[0], tagData)
      await fetchBookings()
      return tag
    } catch (error) {
      debugWarn("Error creating tag:", error)
      throw error
    }
  }, [getBookingsPaths, fetchBookings])

  const updateTag = useCallback(async (tagId: string, tagData: any) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) return
    
    try {
      await BookingsFunctions.updateBookingTag(paths[0], tagId, tagData)
      await fetchBookings()
    } catch (error) {
      debugWarn("Error updating tag:", error)
      throw error
    }
  }, [getBookingsPaths, fetchBookings])

  const deleteTag = useCallback(async (tagId: string) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) return
    
    try {
      await BookingsFunctions.deleteBookingTag(paths[0], tagId)
      await fetchBookings()
    } catch (error) {
      debugWarn("Error deleting tag:", error)
      throw error
    }
  }, [getBookingsPaths, fetchBookings])

  const createPreorderProfile = useCallback(async (profileData: any) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) throw new Error("Base path not available")
    
    try {
      const profile = await BookingsFunctions.savePreorderProfile(paths[0], profileData)
      await fetchBookings()
      return profile
    } catch (error) {
      debugWarn("Error creating preorder profile:", error)
      throw error
    }
  }, [getBookingsPaths, fetchBookings])

  const updatePreorderProfile = useCallback(async (profileId: string, profileData: any) => {
    const paths = getBookingsPaths()
    if (paths.length === 0) return
    
    try {
      await BookingsFunctions.savePreorderProfile(paths[0], { ...profileData, id: profileId })
      await fetchBookings()
    } catch (error) {
      debugWarn("Error updating preorder profile:", error)
      throw error
    }
  }, [getBookingsPaths, fetchBookings])

  // Memoize context value to prevent unnecessary re-renders
  const value: BookingsContextType = useMemo(() => ({
    ...state,
    basePath,
    fetchBookings,
    fetchBookingsByCustomer,
    fetchBookingsByTable,
    fetchBookingsByDate,
    addBooking,
    updateBooking,
    deleteBooking,
    fetchBookingTypes,
    addBookingType,
    updateBookingType,
    deleteBookingType,
    fetchTables,
    addTable,
    updateTable,
    deleteTable,
    fetchBookingStatuses,
    addBookingStatus,
    updateBookingStatus,
    deleteBookingStatus,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    fetchWaitlistEntries,
    addWaitlistEntry,
    updateWaitlistEntry,
    deleteWaitlistEntry,
    fetchBookingSettings,
    updateBookingSettings,
    loadBookingsIntegrations,
    saveBookingsIntegration,
    loadBookingsEmailConfig,
    saveBookingsEmailConfig,
    subscribeBookingStaff,
    checkOAuthToken,
    fetchFloorPlans,
    addFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    addTableToFloorPlan,
    updateTableInFloorPlan,
    removeTableFromFloorPlan,
    fetchBookingStats,
    fetchBookingTags,
    addBookingTag,
    updateBookingTag,
    deleteBookingTag,
    fetchPreorderProfiles,
    savePreorderProfile,
    deletePreorderProfile,
    fetchStockCourses,
    fetchStockProducts,
    createWaitlistEntry,
    createTag,
    updateTag,
    deleteTag,
    createPreorderProfile,
    updatePreorderProfile,
    // Utility functions
    calculateEndTime: (arrivalTime: string, duration: number) => {
      return BookingsFunctions.calculateEndTime(arrivalTime, duration)
    },
    generateTimeSlots: (intervalMinutes: number = 30) => {
      return BookingsFunctions.generateTimeSlots(intervalMinutes)
    },
    normalizeColor: (color: string | undefined) => {
      return BookingsFunctions.normalizeColor(color)
    },
    resetBookingsState,
    // Permission functions - Owner has full access
    canViewBookings: () => isOwner() || hasPermission("bookings", "reservations", "view"),
    canEditBookings: () => isOwner() || hasPermission("bookings", "reservations", "edit"),
    canDeleteBookings: () => isOwner() || hasPermission("bookings", "reservations", "delete"),
    isOwner: () => isOwner()
  }), [
    state,
    basePath,
    fetchBookings,
    fetchBookingsByDate,
    fetchBookingsByCustomer,
    addBooking,
    updateBooking,
    deleteBooking,
    fetchTables,
    addTable,
    updateTable,
    deleteTable,
    fetchBookingTypes,
    addBookingType,
    updateBookingType,
    deleteBookingType,
    fetchBookingStatuses,
    addBookingStatus,
    updateBookingStatus,
    fetchWaitlistEntries,
    addWaitlistEntry,
    updateWaitlistEntry,
    deleteWaitlistEntry,
    fetchBookingSettings,
    updateBookingSettings,
    loadBookingsIntegrations,
    saveBookingsIntegration,
    loadBookingsEmailConfig,
    saveBookingsEmailConfig,
    subscribeBookingStaff,
    checkOAuthToken,
    fetchFloorPlans,
    addFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    addTableToFloorPlan,
    updateTableInFloorPlan,
    removeTableFromFloorPlan,
    fetchBookingStats,
    fetchBookingTags,
    addBookingTag,
    updateBookingTag,
    deleteBookingTag,
    fetchPreorderProfiles,
    savePreorderProfile,
    deletePreorderProfile,
    fetchStockCourses,
    fetchStockProducts,
    createWaitlistEntry,
    createTag,
    updateTag,
    deleteTag,
    createPreorderProfile,
    updatePreorderProfile,
    deleteBookingStatus,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    resetBookingsState,
    isOwner,
    hasPermission,
  ])

  return (
    <BookingsContext.Provider value={value}>
      {children}
    </BookingsContext.Provider>
  )
}
