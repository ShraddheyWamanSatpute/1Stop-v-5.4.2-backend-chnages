"use client"

import { useState, useEffect } from "react"
import { db, ref, get, remove, update, push, set, onValue } from "../services/Firebase"
import { debugWarn } from "../utils/debugLog"
import type {
  Booking,
  Table,
  TableType,
  BookingType,
  WaitlistEntry,
  Customer,
  BookingSettings,
  FloorPlan,
  TableElement,
  BookingStats,
  BookingStatus,
  BookingMessage,
  BookingTag,
} from "../interfaces/Bookings"
import { v4 as uuidv4 } from "uuid"

// Firebase RTDB cannot store `undefined` anywhere in the payload.
// Sanitize objects recursively by removing undefined keys; for arrays, convert undefined entries to null
// (to preserve array indexes and avoid RTDB "contains undefined" errors).
const sanitizeForRTDB = (value: any): any => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    return value.map((v) => {
      const sv = sanitizeForRTDB(v)
      return sv === undefined ? null : sv
    })
  }
  if (typeof value === "object") {
    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      const sv = sanitizeForRTDB(v)
      if (sv !== undefined) out[k] = sv
    }
    return out
  }
  return value
}

// Fetch all bookings
export const fetchBookings = async (basePath: string): Promise<Booking[]> => {
  if (!basePath) return []

  const bookingsRef = ref(db, `${basePath}/bookings`)
  try {
    const snapshot = await get(bookingsRef)
    if (snapshot.exists()) {
      const bookings = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Booking, "id">),
      }))
      return bookings
    }
    return []
  } catch (error) {
    debugWarn("Error fetching bookings:", error)
    return []
  }
}

// Fetch a single booking by ID
export const getBookingById = async (basePath: string, bookingId: string): Promise<any | null> => {
  if (!basePath || !bookingId) return null
  try {
    const snap = await get(ref(db, `${basePath}/bookings/${bookingId}`))
    return snap.exists() ? { id: bookingId, ...snap.val() } : null
  } catch (error) {
    debugWarn("Error fetching booking by id:", error)
    return null
  }
}

// Submit preorder responses for a booking (public guest flow)
export const submitPreorderResponses = async (
  basePath: string,
  bookingId: string,
  responses: any[],
): Promise<void> => {
  if (!basePath || !bookingId) throw new Error("Missing required parameters")

  // Read current tags and swap Preorder Requested → Preorder Received
  const tagsSnap = await get(ref(db, `${basePath}/bookings/${bookingId}/tags`))
  const current: string[] = tagsSnap.exists() ? tagsSnap.val() : []
  const next = Array.from(
    new Set([...(current || [])].filter((t) => t !== "Preorder Requested").concat(["Preorder Received"])),
  )

  const updates: Record<string, any> = {
    [`${basePath}/bookings/${bookingId}/preorder/responses`]: responses,
    [`${basePath}/bookings/${bookingId}/tags`]: next,
  }
  await update(ref(db, "/"), updates)
}

// ===== LOCATION CRUD =====

export const fetchLocations = async (basePath: string): Promise<any[]> => {
  if (!basePath) return []
  try {
    const snap = await get(ref(db, `${basePath}/locations`))
    if (!snap.exists()) return []
    return Object.entries(snap.val() || {}).map(([id, data]: [string, any]) => ({ id, ...data }))
  } catch (error) {
    debugWarn("Error fetching locations:", error)
    return []
  }
}

export const createLocation = async (basePath: string, locationData: any): Promise<string> => {
  if (!basePath) throw new Error("Base path is missing")
  const locationsRef = ref(db, `${basePath}/locations`)
  const newRef = push(locationsRef)
  const id = newRef.key || String(Date.now())
  const now = Date.now()
  await set(newRef, { id, ...locationData, createdAt: now, updatedAt: now })
  return id
}

export const updateLocation = async (basePath: string, locationId: string, updates: any): Promise<void> => {
  if (!basePath || !locationId) throw new Error("Missing required parameters")
  await update(ref(db, `${basePath}/locations/${locationId}`), updates)
}

export const deleteLocation = async (basePath: string, locationId: string): Promise<void> => {
  if (!basePath || !locationId) throw new Error("Missing required parameters")
  await remove(ref(db, `${basePath}/locations/${locationId}`))
}

// Fetch bookings for a specific date
export const fetchBookingsByDate = async (basePath: string, date: string): Promise<Booking[]> => {
  const bookings = await fetchBookings(basePath)
  return bookings.filter((booking) => booking.date === date)
}

// Create a new booking
export const createBooking = async (
  basePath: string,
  booking: Omit<Booking, "id" | "createdAt" | "updatedAt">,
): Promise<Booking> => {
  if (!basePath) throw new Error("Base path is missing")

  const bookingsRef = ref(db, `${basePath}/bookings`)
  const newBookingRef = push(bookingsRef)
  const bookingId = newBookingRef.key || uuidv4()

  const now = new Date().toISOString()
  const newBooking = sanitizeForRTDB({
    ...booking,
    id: bookingId,
    createdAt: now,
    updatedAt: now,
  })

  await set(newBookingRef, newBooking)
  return newBooking as Booking
}

// Update an existing booking
export const updateBooking = async (basePath: string, bookingId: string, updates: Partial<Booking>): Promise<void> => {
  if (!basePath || !bookingId) throw new Error("Missing required parameters")

  const bookingRef = ref(db, `${basePath}/bookings/${bookingId}`)

  const updatedFields = sanitizeForRTDB({
    ...updates,
    updatedAt: new Date().toISOString(),
  })

  await update(bookingRef, updatedFields)
}

// Delete a booking
export const deleteBooking = async (basePath: string, bookingId: string): Promise<void> => {
  if (!basePath || !bookingId) throw new Error("Missing required parameters")

  const bookingRef = ref(db, `${basePath}/bookings/${bookingId}`)
  await remove(bookingRef)
}

// Fetch all tables
export const fetchTables = async (basePath: string): Promise<Table[]> => {
  if (!basePath) return []

  const tablesRef = ref(db, `${basePath}/tables`)
  try {
    const snapshot = await get(tablesRef)
    if (snapshot.exists()) {
      const tables = Object.entries(snapshot.val())
        .filter(([key]) => key !== "types") // Exclude the types folder
        .map(([id, data]) => {
          const tableData = data as any // Use any temporarily to avoid type error
          const toNum = (v: any): number | undefined => {
            const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
            return Number.isFinite(n) ? n : undefined
          }

          // Normalize min/max capacity fields across legacy shapes.
          const min =
            toNum(tableData.minPartySize) ??
            toNum(tableData.minGuests) ??
            toNum(tableData.minCovers) ??
            undefined
          const max =
            toNum(tableData.maxPartySize) ??
            toNum(tableData.maxGuests) ??
            toNum(tableData.maxCovers) ??
            toNum(tableData.capacity) ??
            undefined

          return {
            ...tableData,
            id, // Ensure DB key wins over any stored id field
            order: tableData.order || 0, // Provide default order if missing
            // Ensure list views can reliably display min/max.
            minPartySize: min ?? tableData.minPartySize,
            maxPartySize: max ?? tableData.maxPartySize,
            minGuests: min ?? tableData.minGuests,
            maxGuests: max ?? tableData.maxGuests,
            // `capacity` is commonly treated as "max capacity" throughout the UI.
            capacity: max ?? toNum(tableData.capacity) ?? 0,
          } as Table
        })
      return tables.sort((a, b) => (a.order || 0) - (b.order || 0))
    }
    return []
  } catch (error) {
    debugWarn("Error fetching tables:", error)
    return []
  }
}

// Create a new table
export const createTable = async (basePath: string, table: Omit<Table, "id">): Promise<Table> => {
  if (!basePath) throw new Error("Base path is missing")

  const tablesRef = ref(db, `${basePath}/tables`)
  const newTableRef = push(tablesRef)

  await set(newTableRef, table)
  return {
    ...table,
    id: newTableRef.key || uuidv4(),
  }
}

// Update an existing table
export const updateTable = async (basePath: string, tableId: string, updates: Partial<Table>): Promise<void> => {
  if (!basePath || !tableId) throw new Error("Missing required parameters")

  const tableRef = ref(db, `${basePath}/tables/${tableId}`)
  await update(tableRef, updates)
}

// Delete a table
export const deleteTable = async (basePath: string, tableId: string): Promise<void> => {
  if (!basePath || !tableId) throw new Error("Missing required parameters")

  const tableRef = ref(db, `${basePath}/tables/${tableId}`)
  await remove(tableRef)
}

// Fetch all table types
export const fetchTableTypes = async (basePath: string): Promise<TableType[]> => {
  if (!basePath) return []

  const typesRef = ref(db, `${basePath}/tables/types`)
  try {
    const snapshot = await get(typesRef)
    if (snapshot.exists()) {
      const types = Object.entries(snapshot.val()).map(([id, name]) => ({
        id,
        name: typeof name === "string" ? name : String(name),
      }))
      return types
    }
    return []
  } catch (error) {
    debugWarn("Error fetching table types:", error)
    return []
  }
}

// Create a new table type
export const createTableType = async (basePath: string, typeName: string): Promise<TableType> => {
  if (!basePath) throw new Error("Base path is missing")

  const typesRef = ref(db, `${basePath}/tables/types`)
  const newTypeRef = push(typesRef)

  await set(newTypeRef, typeName)
  return {
    id: newTypeRef.key || uuidv4(),
    name: typeName,
  }
}

// Update a table type
export const updateTableType = async (basePath: string, typeId: string, typeName: string): Promise<void> => {
  if (!basePath || !typeId) throw new Error("Missing required parameters")

  const typeRef = ref(db, `${basePath}/tables/types/${typeId}`)
  await set(typeRef, typeName)
}

// Delete a table type
export const deleteTableType = async (basePath: string, typeId: string): Promise<void> => {
  if (!basePath || !typeId) throw new Error("Missing required parameters")

  const typeRef = ref(db, `${basePath}/tables/types/${typeId}`)
  await remove(typeRef)
}

// Fetch all booking types
export const fetchBookingTypes = async (basePath: string): Promise<BookingType[]> => {
  if (!basePath) return []

  const typesRef = ref(db, `${basePath}/types`)
  try {
    const snapshot = await get(typesRef)
    if (snapshot.exists()) {
      const types = Object.entries(snapshot.val()).map(([id, data]) => {
        if (typeof data === "string") {
          return {
            id,
            name: data,
            description: "",
            color: "#4CAF50",
            defaultDuration: 2,
            requiresDeposit: false,
            depositAmount: 0,
            active: true,
            minAdvanceHours: 1,
            maxAdvanceDays: 30,
            depositType: "fixed",
            availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            availableTimeSlots: ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"],
            // Preorder support
            preorderProfileId: "",
            autoSendPreorders: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as BookingType
        } else {
          const bookingTypeData = data as any
          // Preserve all stored fields (including newer ones like `preorderProfileId`)
          // while still applying sensible defaults for common fields.
          return {
            ...bookingTypeData,
            // Always trust the RTDB key as the id.
            id,
            name: bookingTypeData.name || "Unnamed Type",
            description: bookingTypeData.description || "",
            color:
              bookingTypeData.color && typeof bookingTypeData.color === "string" ? bookingTypeData.color : "#4CAF50",
            defaultDuration: bookingTypeData.defaultDuration ?? 2,
            requiresDeposit: bookingTypeData.requiresDeposit ?? bookingTypeData.depositRequired ?? false,
            depositAmount: bookingTypeData.depositAmount ?? 0,
            autoSendPreorders: bookingTypeData.autoSendPreorders ?? false,
            preorderProfileId: bookingTypeData.preorderProfileId ?? "",
            active: bookingTypeData.active !== undefined ? bookingTypeData.active : true,
            minAdvanceHours: bookingTypeData.minAdvanceHours ?? 1,
            maxAdvanceDays: bookingTypeData.maxAdvanceDays ?? 30,
            depositType: bookingTypeData.depositType ?? "fixed",
            availableDays: bookingTypeData.availableDays || [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            availableTimeSlots: bookingTypeData.availableTimeSlots || [
              "12:00",
              "13:00",
              "14:00",
              "18:00",
              "19:00",
              "20:00",
            ],
            createdAt: bookingTypeData.createdAt || new Date().toISOString(),
            updatedAt: bookingTypeData.updatedAt || new Date().toISOString(),
          } as BookingType
        }
      })

      return types
    }
    return []
  } catch (error) {
    debugWarn("Error fetching booking types:", error)
    return []
  }
}

// Create a new booking type
export const createBookingType = async (
  basePath: string,
  bookingType: Omit<BookingType, "id">,
): Promise<BookingType> => {
  if (!basePath) throw new Error("Base path is missing")

  const typesRef = ref(db, `${basePath}/types`)
  const newTypeRef = push(typesRef)

  await set(newTypeRef, bookingType)
  return {
    ...bookingType,
    id: newTypeRef.key || uuidv4(),
  }
}

// Update a booking type
export const updateBookingType = async (
  basePath: string,
  typeId: string,
  updates: Partial<BookingType>,
): Promise<void> => {
  if (!basePath || !typeId) throw new Error("Missing required parameters")

  const typeRef = ref(db, `${basePath}/types/${typeId}`)
  await update(typeRef, updates)
}

// Delete a booking type
export const deleteBookingType = async (basePath: string, typeId: string): Promise<void> => {
  if (!basePath || !typeId) throw new Error("Missing required parameters")

  const typeRef = ref(db, `${basePath}/types/${typeId}`)
  await remove(typeRef)
}

// Fetch all booking statuses
export const fetchBookingStatuses = async (basePath: string): Promise<BookingStatus[]> => {
  if (!basePath) return []

  const statusesRef = ref(db, `${basePath}/statuses`)
  try {
    const snapshot = await get(statusesRef)
    if (snapshot.exists()) {
      const statuses = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<BookingStatus, "id">),
      }))
      return statuses
    }
    return []
  } catch (error) {
    debugWarn("Error fetching booking statuses:", error)
    return []
  }
}

// Create a new booking status
export const createBookingStatus = async (
  basePath: string,
  status: Omit<BookingStatus, "id" | "createdAt" | "updatedAt">,
): Promise<BookingStatus> => {
  if (!basePath) throw new Error("Base path is missing")

  const statusesRef = ref(db, `${basePath}/statuses`)
  const newStatusRef = push(statusesRef)

  const now = new Date().toISOString()
  const newStatus = {
    ...status,
    createdAt: now,
    updatedAt: now,
  }

  await set(newStatusRef, newStatus)
  return {
    ...newStatus,
    id: newStatusRef.key || uuidv4(),
  }
}

// Update a booking status
export const updateBookingStatus = async (
  basePath: string,
  statusId: string,
  updates: Partial<BookingStatus>,
): Promise<void> => {
  if (!basePath || !statusId) throw new Error("Missing required parameters")

  const statusRef = ref(db, `${basePath}/statuses/${statusId}`)

  const updatedFields = {
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await update(statusRef, updatedFields)
}

// Delete a booking status
export const deleteBookingStatus = async (basePath: string, statusId: string): Promise<void> => {
  if (!basePath || !statusId) throw new Error("Missing required parameters")

  const statusRef = ref(db, `${basePath}/statuses/${statusId}`)
  await remove(statusRef)
}

// Preorder Profiles (Bookings module scoped)
export interface PreorderCourseItem {
  itemId: string
  required?: boolean
  perPerson?: boolean
  quantityPerPerson?: number
}

export interface PreorderCourse {
  id?: string
  name: string
  courseId?: string
  minPerPerson?: number
  maxPerPerson?: number
  items: PreorderCourseItem[]
}

export interface PreorderProfile {
  id?: string
  name: string
  description?: string
  // New: courses-based structure instead of categories/subcategories
  courses: PreorderCourse[]
  createdAt?: string
  updatedAt?: string
}

export const fetchPreorderProfiles = async (basePath: string): Promise<PreorderProfile[]> => {
  if (!basePath) return []
  const profilesRef = ref(db, `${basePath}/preorderProfiles`)
  try {
    const snapshot = await get(profilesRef)
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...(data as Omit<PreorderProfile, "id">) }))
    }
    return []
  } catch (error) {
    debugWarn("Error fetching preorder profiles:", error)
    return []
  }
}

export const savePreorderProfile = async (basePath: string, profile: PreorderProfile): Promise<string> => {
  if (!basePath) throw new Error("Base path is missing")
  const profilesRef = ref(db, `${basePath}/preorderProfiles`)
  const now = new Date().toISOString()
  if (profile.id) {
    const profileRef = ref(db, `${basePath}/preorderProfiles/${profile.id}`)
    await update(profileRef, { ...profile, updatedAt: now })
    return profile.id
  } else {
    const newRef = push(profilesRef)
    const id = newRef.key || ''
    await set(newRef, { ...profile, id, createdAt: now, updatedAt: now })
    return id
  }
}

export const deletePreorderProfile = async (basePath: string, profileId: string): Promise<void> => {
  if (!basePath || !profileId) throw new Error("Missing required parameters")
  const profileRef = ref(db, `${basePath}/preorderProfiles/${profileId}`)
  await remove(profileRef)
}

// Booking messages helper: append message log to booking
export const appendBookingMessage = async (
  basePath: string,
  bookingId: string,
  message: BookingMessage,
): Promise<void> => {
  if (!basePath || !bookingId) throw new Error("Missing required parameters")
  const bookingRef = ref(db, `${basePath}/bookings/${bookingId}`)
  const snapshot = await get(bookingRef)
  if (!snapshot.exists()) throw new Error("Booking not found")
  const existing = snapshot.val() as Booking
  const messages = Array.isArray((existing as any).messages) ? (existing as any).messages : []
  const updatedMessages = [...messages, message]
  await update(bookingRef, { messages: updatedMessages, updatedAt: new Date().toISOString() })
}

// Fetch waitlist entries
export const fetchWaitlist = async (basePath: string): Promise<WaitlistEntry[]> => {
  if (!basePath) return []

  const waitlistRef = ref(db, `${basePath}/waitlist`)
  try {
    const snapshot = await get(waitlistRef)
    if (snapshot.exists()) {
      const entries = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<WaitlistEntry, "id">),
      }))
      return entries
    }
    return []
  } catch (error) {
    debugWarn("Error fetching waitlist:", error)
    return []
  }
}

// Add to waitlist
export const addToWaitlist = async (
  basePath: string,
  entry: Omit<WaitlistEntry, "id" | "timeAdded" | "status">,
): Promise<WaitlistEntry> => {
  if (!basePath) throw new Error("Base path is missing")

  const waitlistRef = ref(db, `${basePath}/waitlist`)
  const newEntryRef = push(waitlistRef)
  const generatedId = newEntryRef.key || uuidv4()

  const newEntry: WaitlistEntry = {
    ...entry,
    id: generatedId,
    timeAdded: new Date().toISOString(),
    status: "Waiting",
  }

  await set(newEntryRef, newEntry)
  // Return the entry with the same ID that was persisted — avoids a second uuidv4() call
  // that would produce an ID inconsistent with what is stored in the database.
  return newEntry
}

// Update waitlist entry
export const updateWaitlistEntry = async (
  basePath: string,
  entryId: string,
  updates: Partial<WaitlistEntry>,
): Promise<void> => {
  if (!basePath || !entryId) throw new Error("Missing required parameters")

  const entryRef = ref(db, `${basePath}/waitlist/${entryId}`)
  await update(entryRef, updates)
}

// Remove from waitlist
export const removeFromWaitlist = async (basePath: string, entryId: string): Promise<void> => {
  if (!basePath || !entryId) throw new Error("Missing required parameters")

  const entryRef = ref(db, `${basePath}/waitlist/${entryId}`)
  await remove(entryRef)
}

// Fetch customers
export const fetchCustomers = async (basePath: string): Promise<Customer[]> => {
  if (!basePath) return []

  const customersRef = ref(db, `${basePath}/customers`)
  try {
    const snapshot = await get(customersRef)
    if (snapshot.exists()) {
      const customers = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Customer, "id">),
      }))
      return customers
    }
    return []
  } catch (error) {
    debugWarn("Error fetching customers:", error)
    return []
  }
}

// Create or update customer
export const saveCustomer = async (basePath: string, customer: Customer): Promise<Customer> => {
  if (!basePath) throw new Error("Base path is missing")

  const customersRef = ref(db, `${basePath}/customers`)

  if (customer.id) {
    const customerRef = ref(db, `${basePath}/customers/${customer.id}`)
    await update(customerRef, customer)
    return customer
  } else {
    const newCustomerRef = push(customersRef)
    const newCustomer = { ...customer, id: newCustomerRef.key || uuidv4() }
    await set(newCustomerRef, newCustomer)
    return newCustomer
  }
}

// Delete customer
export const deleteCustomer = async (basePath: string, customerId: string): Promise<void> => {
  if (!basePath || !customerId) throw new Error("Missing required parameters")

  const customerRef = ref(db, `${basePath}/customers/${customerId}`)
  await remove(customerRef)
}

// Fetch booking settings
export const fetchBookingSettings = async (basePath: string): Promise<BookingSettings> => {
  if (!basePath) {
    return {
      openTimes: {},
      bookingTypes: {},
      businessHours: [],
      blackoutDates: [],
      allowOnlineBookings: false,
      maxDaysInAdvance: 30,
      minHoursInAdvance: 1,
      timeSlotInterval: 30,
      defaultDuration: 2,
      maxPartySize: 20,
    }
  }

  const settingsRef = ref(db, `${basePath}/settings`)
  try {
    const snapshot = await get(settingsRef)
    if (snapshot.exists()) {
      return snapshot.val() as BookingSettings
    }
    return {
      openTimes: {},
      bookingTypes: {},
      businessHours: [],
      blackoutDates: [],
      allowOnlineBookings: false,
      maxDaysInAdvance: 30,
      minHoursInAdvance: 1,
      timeSlotInterval: 30,
      defaultDuration: 2,
      maxPartySize: 20,
    }
  } catch (error) {
    debugWarn("Error fetching booking settings:", error)
    return {
      openTimes: {},
      bookingTypes: {},
      businessHours: [],
      blackoutDates: [],
      allowOnlineBookings: false,
      maxDaysInAdvance: 30,
      minHoursInAdvance: 1,
      timeSlotInterval: 30,
      defaultDuration: 2,
      maxPartySize: 20,
    }
  }
}

// Save booking settings
export const saveBookingSettings = async (basePath: string, settings: BookingSettings): Promise<void> => {
  if (!basePath) throw new Error("Base path is missing")

  const settingsRef = ref(db, `${basePath}/settings`)
  await set(settingsRef, settings)
}

// Fetch floor plans
export const fetchFloorPlans = async (basePath: string): Promise<FloorPlan[]> => {
  if (!basePath) return []

  const plansRef = ref(db, `${basePath}/floorPlans`)
  try {
    const snapshot = await get(plansRef)
    if (snapshot.exists()) {
      const data = snapshot.val()
      return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }))
    }
    return []
  } catch (error) {
    debugWarn("Error fetching floor plans:", error)
    return []
  }
}

// Fetch booking statistics
export const fetchBookingStats = async (basePath: string, startDate?: string, endDate?: string): Promise<BookingStats> => {
  if (!basePath) {
    return {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      pendingBookings: 0,
      noShowBookings: 0,
      averagePartySize: 0,
      totalCovers: 0,
      peakHours: {},
      bookingsByType: {},
      bookingsByDay: {},
      occupancyRate: 0
    }
  }

  try {
    const bookings = await fetchBookings(basePath)
    let filteredBookings = bookings

    // Filter by date range if provided.
    // Use string comparison against ISO date strings (YYYY-MM-DD) to avoid UTC/local
    // timezone off-by-one errors that arise from `new Date("2024-01-15")` (UTC midnight).
    if (startDate || endDate) {
      filteredBookings = bookings.filter(booking => {
        const bookingDate = String(booking.date || "")
        if (startDate && bookingDate < startDate) return false
        if (endDate && bookingDate > endDate) return false
        return true
      })
    }

    const totalBookings = filteredBookings.length
    // Compare status case-insensitively — data can arrive as "Confirmed", "confirmed", etc.
    const confirmedBookings = filteredBookings.filter(b => (b.status || "").toLowerCase() === 'confirmed').length
    const cancelledBookings = filteredBookings.filter(b => ["cancelled", "canceled"].includes((b.status || "").toLowerCase())).length
    const pendingBookings = filteredBookings.filter(b => (b.status || "").toLowerCase() === 'pending').length
    const noShowBookings = filteredBookings.filter(b => ["no-show", "no show"].includes((b.status || "").toLowerCase())).length

    const totalCovers = filteredBookings.reduce((sum, booking) => sum + Number(booking.guests || booking.covers || booking.guestCount || 0), 0)
    const averagePartySize = totalBookings > 0 ? totalCovers / totalBookings : 0

    // Calculate peak hours
    const peakHours: Record<string, number> = {}
    filteredBookings.forEach(booking => {
      const hour = (booking.arrivalTime || "").split(':')[0] || 'Unknown'
      peakHours[hour] = (peakHours[hour] || 0) + 1
    })

    // Calculate bookings by type
    const bookingsByType: Record<string, number> = {}
    filteredBookings.forEach(booking => {
      const type = booking.bookingType || 'Standard'
      bookingsByType[type] = (bookingsByType[type] || 0) + 1
    })

    // Calculate bookings by day.
    // Append T00:00:00 to force local-time parsing and avoid UTC off-by-one.
    const bookingsByDay: Record<string, number> = {}
    filteredBookings.forEach(booking => {
      const rawDate = String(booking.date || "")
      const dateObj = rawDate ? new Date(`${rawDate}T00:00:00`) : null
      const day = dateObj && !Number.isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('en-US', { weekday: 'long' })
        : 'Unknown'
      bookingsByDay[day] = (bookingsByDay[day] || 0) + 1
    })

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      pendingBookings,
      noShowBookings,
      averagePartySize,
      totalCovers,
      peakHours,
      bookingsByType,
      bookingsByDay,
      occupancyRate: 0
    }
  } catch (error) {
    debugWarn("Error fetching booking stats:", error)
    return {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      pendingBookings: 0,
      noShowBookings: 0,
      averagePartySize: 0,
      totalCovers: 0,
      peakHours: {},
      bookingsByType: {},
      bookingsByDay: {},
      occupancyRate: 0
    }
  }
}

// Save floor plan
export const saveFloorPlan = async (basePath: string, floorPlan: FloorPlan): Promise<FloorPlan> => {
  if (!basePath) throw new Error("Base path is missing")

  const plansRef = ref(db, `${basePath}/floorPlans`)

  if (floorPlan.id) {
    const planRef = ref(db, `${basePath}/floorPlans/${floorPlan.id}`)
    await update(planRef, floorPlan)
    return floorPlan
  } else {
    const newPlanRef = push(plansRef)
    const newPlan = { ...floorPlan, id: newPlanRef.key || uuidv4() }
    await set(newPlanRef, newPlan)
    return newPlan
  }
}

// Delete floor plan
export const deleteFloorPlan = async (basePath: string, planId: string): Promise<void> => {
  if (!basePath || !planId) throw new Error("Missing required parameters")

  const planRef = ref(db, `${basePath}/floorPlans/${planId}`)
  await remove(planRef)
}

// Calculate booking statistics
export const calculateBookingStats = async (
  basePath: string,
  startDate?: string,
  endDate?: string,
): Promise<BookingStats> => {
  const bookings = await fetchBookings(basePath)

  const filteredBookings =
    startDate && endDate ? bookings.filter((b) => b.date >= startDate && b.date <= endDate) : bookings

  const stats: BookingStats = {
    totalBookings: filteredBookings.length,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    noShowBookings: 0,
    averagePartySize: 0,
    totalCovers: 0,
    peakHours: {},
    bookingsByType: {},
    bookingsByDay: {},
    occupancyRate: 0,
  }

  let totalGuests = 0

  filteredBookings.forEach((booking) => {
    // Normalize status to lowercase for case-insensitive comparison (data can be
    // stored as "Confirmed", "confirmed", "CONFIRMED" etc. across providers).
    const statusLower = (booking.status || "").toLowerCase()
    if (statusLower === "confirmed") stats.confirmedBookings++
    else if (statusLower === "pending") stats.pendingBookings++
    else if (statusLower === "cancelled" || statusLower === "canceled") stats.cancelledBookings++
    else if (statusLower === "no-show" || statusLower === "no show") stats.noShowBookings++

    // Guard against undefined/null guests to prevent NaN propagation.
    const guests = Number(booking.guests || booking.covers || booking.guestCount || 0)
    totalGuests += guests
    stats.totalCovers += guests

    // Guard against missing arrivalTime to prevent a runtime crash.
    const hour = (booking.arrivalTime || "").split(":")[0] || "Unknown"
    stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1

    if (booking.bookingType) {
      stats.bookingsByType[booking.bookingType] = (stats.bookingsByType[booking.bookingType] || 0) + 1
    }

    // Use string-based day derivation to avoid UTC/local timezone off-by-one.
    const dayOfWeek = new Date(booking.date).getDay()
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const day = days[dayOfWeek]
    stats.bookingsByDay[day] = (stats.bookingsByDay[day] || 0) + 1
  })

  stats.averagePartySize = filteredBookings.length > 0 ? totalGuests / filteredBookings.length : 0

  return stats
}

// Hook for subscribing to bookings
export const useBookings = (basePath: string) => {
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!basePath) return

    const bookingsRef = ref(db, `${basePath}/bookings`)
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookingsData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...(data as Omit<Booking, "id">),
        }))
        setBookings(bookingsData)
      } else {
        setBookings([])
      }
    })

    return unsubscribe
  }, [basePath])

  return bookings
}

// Hook for subscribing to tables
export const useTables = (basePath: string) => {
  const [tables, setTables] = useState<Table[]>([])

  useEffect(() => {
    if (!basePath) return

    const tablesRef = ref(db, `${basePath}/tables`)
    const unsubscribe = onValue(tablesRef, (snapshot) => {
      if (snapshot.exists()) {
        const tablesData = Object.entries(snapshot.val())
          .filter(([key]) => key !== "types") // Exclude the types folder
          .map(([id, data]) => {
            const tableData = data as any
            return {
              id,
              ...tableData,
              order: tableData.order || 0,
            } as Table
          })
        setTables(tablesData.sort((a, b) => (a.order || 0) - (b.order || 0)))
      } else {
        setTables([])
      }
    })

    return unsubscribe
  }, [basePath])

  return tables
}

// Hook for subscribing to waitlist
export const useWaitlist = (basePath: string) => {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])

  useEffect(() => {
    if (!basePath) return

    const waitlistRef = ref(db, `${basePath}/waitlist`)
    const unsubscribe = onValue(waitlistRef, (snapshot) => {
      if (snapshot.exists()) {
        const waitlistData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...(data as Omit<WaitlistEntry, "id">),
        }))
        setWaitlist(waitlistData)
      } else {
        setWaitlist([])
      }
    })

    return unsubscribe
  }, [basePath])

  return waitlist
}

// Booking Tags Functions
export const fetchBookingTags = async (basePath: string): Promise<BookingTag[]> => {
  if (!basePath) return []

  const tagsRef = ref(db, `${basePath}/tags`)
  try {
    const snapshot = await get(tagsRef)
    if (snapshot.exists()) {
      const tags = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<BookingTag, "id">),
      }))
      return tags
    }
    return []
  } catch (error) {
    debugWarn("Error fetching booking tags:", error)
    return []
  }
}

export const createBookingTag = async (basePath: string, tag: Omit<BookingTag, "id" | "createdAt" | "updatedAt">): Promise<BookingTag> => {
  if (!basePath) throw new Error("Base path is missing")

  const tagsRef = ref(db, `${basePath}/tags`)
  const newTagRef = push(tagsRef)
  const tagId = newTagRef.key || uuidv4()

  const now = new Date().toISOString()
  const newTag = {
    ...tag,
    id: tagId,
    createdAt: now,
    updatedAt: now,
  }

  await set(newTagRef, newTag)
  return newTag as BookingTag
}

export const updateBookingTag = async (basePath: string, tagId: string, updates: Partial<BookingTag>): Promise<void> => {
  if (!basePath || !tagId) throw new Error("Missing required parameters")

  const tagRef = ref(db, `${basePath}/tags/${tagId}`)
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString()
  }
  await update(tagRef, updateData)
}

export const deleteBookingTag = async (basePath: string, tagId: string): Promise<void> => {
  if (!basePath || !tagId) throw new Error("Missing required parameters")

  const tagRef = ref(db, `${basePath}/tags/${tagId}`)
  await remove(tagRef)
}

// Stock courses fetching for preorder profiles
export const fetchStockCourses = async (companyId: string, siteId: string): Promise<any[]> => {
  if (!companyId || !siteId) return []

  const coursesRef = ref(db, `companies/${companyId}/sites/${siteId}/data/stock/courses`)
  try {
    const snapshot = await get(coursesRef)
    if (snapshot.exists()) {
      const courses = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as any),
      }))
      return courses.filter((course: any) => course.active !== false)
    }
    return []
  } catch (error) {
    debugWarn("Error fetching stock courses:", error)
    return []
  }
}

// Stock products fetching for preorder profiles
export const fetchStockProducts = async (companyId: string, siteId: string): Promise<any[]> => {
  if (!companyId || !siteId) return []

  const productsRef = ref(db, `companies/${companyId}/sites/${siteId}/data/stock/products`)
  try {
    const snapshot = await get(productsRef)
    if (snapshot.exists()) {
      const products = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as any),
      }))
      return products
    }
    return []
  } catch (error) {
    debugWarn("Error fetching stock products:", error)
    return []
  }
}

// Remove duplicate - using existing fetchFloorPlans above

export const createFloorPlan = async (basePath: string, floorPlan: Omit<FloorPlan, "id">): Promise<FloorPlan> => {
  if (!basePath) throw new Error("Base path is required")

  const floorPlansRef = ref(db, `${basePath}/floorPlans`)
  const newFloorPlanRef = push(floorPlansRef)
  
  const floorPlanData: FloorPlan = {
    id: newFloorPlanRef.key!,
    ...floorPlan,
  }

  try {
    await set(newFloorPlanRef, floorPlanData)
    return floorPlanData
  } catch (error) {
    debugWarn("Error creating floor plan:", error)
    throw error
  }
}

export const updateFloorPlan = async (basePath: string, floorPlanId: string, updates: Partial<FloorPlan>): Promise<void> => {
  if (!basePath || !floorPlanId) throw new Error("Base path and floor plan ID are required")

  const floorPlanRef = ref(db, `${basePath}/floorPlans/${floorPlanId}`)
  try {
    await update(floorPlanRef, updates)
  } catch (error) {
    debugWarn("Error updating floor plan:", error)
    throw error
  }
}

// Remove duplicate - using existing deleteFloorPlan above

// Table Element Operations (for floor plan layouts)
export const updateTableElement = async (
  basePath: string, 
  floorPlanId: string, 
  tableElementId: string, 
  updates: Partial<TableElement>
): Promise<void> => {
  if (!basePath || !floorPlanId || !tableElementId) {
    throw new Error("Base path, floor plan ID, and table element ID are required")
  }

  const tableElementRef = ref(db, `${basePath}/floorPlans/${floorPlanId}/tables/${tableElementId}`)
  try {
    await update(tableElementRef, updates)
  } catch (error) {
    debugWarn("Error updating table element:", error)
    throw error
  }
}

export const addTableToFloorPlan = async (
  basePath: string, 
  floorPlanId: string, 
  tableElement: Omit<TableElement, "id">
): Promise<TableElement> => {
  if (!basePath || !floorPlanId) throw new Error("Base path and floor plan ID are required")

  const tableElementsRef = ref(db, `${basePath}/floorPlans/${floorPlanId}/tables`)
  const newTableElementRef = push(tableElementsRef)
  
  const tableElementData: TableElement = {
    id: newTableElementRef.key!,
    ...tableElement,
  }

  try {
    await set(newTableElementRef, tableElementData)
    return tableElementData
  } catch (error) {
    debugWarn("Error adding table to floor plan:", error)
    throw error
  }
}

export const removeTableFromFloorPlan = async (
  basePath: string, 
  floorPlanId: string, 
  tableElementId: string
): Promise<void> => {
  if (!basePath || !floorPlanId || !tableElementId) {
    throw new Error("Base path, floor plan ID, and table element ID are required")
  }

  const tableElementRef = ref(db, `${basePath}/floorPlans/${floorPlanId}/tables/${tableElementId}`)
  try {
    await remove(tableElementRef)
  } catch (error) {
    debugWarn("Error removing table from floor plan:", error)
    throw error
  }
}

