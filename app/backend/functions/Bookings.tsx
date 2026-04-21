"use client"

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
  BookingTag,
} from "../interfaces/Bookings"
import * as rtdb from "../data/Bookings"

// Booking Management Functions
export const getBookings = async (basePath: string): Promise<Booking[]> => {
  try {
    return await rtdb.fetchBookings(basePath)
  } catch (error) {
    debugWarn("Error fetching bookings:", error)
    throw error
  }
}

export const getBookingsByDate = async (basePath: string, date: string): Promise<Booking[]> => {
  try {
    return await rtdb.fetchBookingsByDate(basePath, date)
  } catch (error) {
    debugWarn("Error fetching bookings by date:", error)
    throw error
  }
}

export const addBooking = async (
  basePath: string,
  booking: Omit<Booking, "id" | "createdAt" | "updatedAt">
): Promise<Booking> => {
  try {
    return await rtdb.createBooking(basePath, booking)
  } catch (error) {
    debugWarn("Error creating booking:", error)
    throw error
  }
}

export const editBooking = async (
  companyId: string,
  siteId: string,
  bookingId: string,
  booking: Partial<Booking>
): Promise<void> => {
  try {
    const basePath = `companies/${companyId}/sites/${siteId}/data/bookings`
    await rtdb.updateBooking(basePath, bookingId, booking)
  } catch (error) {
    debugWarn("Error updating booking:", error)
    throw error
  }
}

export const updateBooking = async (
  basePath: string,
  bookingId: string,
  updates: Partial<Booking>
): Promise<void> => {
  try {
    await rtdb.updateBooking(basePath, bookingId, updates)
  } catch (error) {
    debugWarn("Error updating booking:", error)
    throw error
  }
}

export const removeBooking = async (basePath: string, bookingId: string): Promise<void> => {
  try {
    await rtdb.deleteBooking(basePath, bookingId)
  } catch (error) {
    debugWarn("Error deleting booking:", error)
    throw error
  }
}

// Alias for removeBooking to maintain compatibility
export const deleteBooking = removeBooking

// Table Management Functions
export const getTables = async (basePath: string): Promise<Table[]> => {
  try {
    return await rtdb.fetchTables(basePath)
  } catch (error) {
    debugWarn("Error fetching tables:", error)
    throw error
  }
}

export const addTable = async (basePath: string, table: Omit<Table, "id">): Promise<Table> => {
  try {
    return await rtdb.createTable(basePath, table)
  } catch (error) {
    debugWarn("Error creating table:", error)
    throw error
  }
}

export const updateTable = async (
  basePath: string,
  tableId: string,
  table: Partial<Table>
): Promise<void> => {
  try {
    await rtdb.updateTable(basePath, tableId, table)
  } catch (error) {
    debugWarn("Error updating table:", error)
    throw error
  }
}

export const deleteTable = async (basePath: string, tableId: string): Promise<void> => {
  try {
    await rtdb.deleteTable(basePath, tableId)
  } catch (error) {
    debugWarn("Error deleting table:", error)
    throw error
  }
}

// Table Type Management Functions
export const getTableTypes = async (companyID: string, siteID: string): Promise<TableType[]> => {
  try {
    const basePath = `companies/${companyID}/sites/${siteID}/data/bookings`
    return await rtdb.fetchTableTypes(basePath)
  } catch (error) {
    debugWarn("Error fetching table types:", error)
    throw error
  }
}

export const addTableType = async (companyID: string, siteID: string, typeName: string): Promise<TableType> => {
  try {
    const basePath = `companies/${companyID}/sites/${siteID}/data/bookings`
    return await rtdb.createTableType(basePath, typeName)
  } catch (error) {
    debugWarn("Error creating table type:", error)
    throw error
  }
}

export const editTableType = async (
  companyID: string,
  siteID: string,
  typeId: string,
  typeName: string
): Promise<void> => {
  try {
    const basePath = `companies/${companyID}/sites/${siteID}/data/bookings`
    await rtdb.updateTableType(basePath, typeId, typeName)
  } catch (error) {
    debugWarn("Error updating table type:", error)
    throw error
  }
}

export const removeTableType = async (companyID: string, siteID: string, typeId: string): Promise<void> => {
  try {
    const basePath = `companies/${companyID}/sites/${siteID}/data/bookings`
    await rtdb.deleteTableType(basePath, typeId)
  } catch (error) {
    debugWarn("Error deleting table type:", error)
    throw error
  }
}

// Booking Type Management Functions
export const getBookingTypes = async (basePath: string): Promise<BookingType[]> => {
  try {
    return await rtdb.fetchBookingTypes(basePath)
  } catch (error) {
    debugWarn("Error fetching booking types:", error)
    throw error
  }
}

export const addBookingType = async (
  basePath: string,
  bookingType: Omit<BookingType, "id">
): Promise<BookingType> => {
  try {
    return await rtdb.createBookingType(basePath, bookingType)
  } catch (error) {
    debugWarn("Error adding booking type:", error)
    throw error
  }
}

export const updateBookingType = async (
  basePath: string,
  typeId: string,
  bookingType: Partial<BookingType>
): Promise<void> => {
  try {
    await rtdb.updateBookingType(basePath, typeId, bookingType)
  } catch (error) {
    debugWarn("Error updating booking type:", error)
    throw error
  }
}

export const deleteBookingType = async (
  basePath: string,
  typeId: string
): Promise<void> => {
  try {
    await rtdb.deleteBookingType(basePath, typeId)
  } catch (error) {
    debugWarn("Error deleting booking type:", error)
    throw error
  }
}

export const removeBookingType = async (companyId: string, siteId: string, typeId: string): Promise<void> => {
  try {
    const basePath = `companies/${companyId}/sites/${siteId}/data/bookings`
    await rtdb.deleteBookingType(basePath, typeId)
  } catch (error) {
    debugWarn("Error deleting booking type:", error)
    throw error
  }
}

// Booking Status Management Functions
export const getBookingStatuses = async (basePath: string): Promise<BookingStatus[]> => {
  try {
    return await rtdb.fetchBookingStatuses(basePath)
  } catch (error) {
    debugWarn("Error fetching booking statuses:", error)
    throw error
  }
}

export const addBookingStatus = async (
  basePath: string,
  status: Omit<BookingStatus, "id" | "createdAt" | "updatedAt">
): Promise<BookingStatus> => {
  try {
    return await rtdb.createBookingStatus(basePath, status)
  } catch (error) {
    debugWarn("Error creating booking status:", error)
    throw error
  }
}

export const updateBookingStatus = async (
  basePath: string,
  statusId: string,
  updates: Partial<BookingStatus>
): Promise<void> => {
  try {
    await rtdb.updateBookingStatus(basePath, statusId, updates)
  } catch (error) {
    debugWarn("Error updating booking status:", error)
    throw error
  }
}

export const deleteBookingStatus = async (basePath: string, statusId: string): Promise<void> => {
  try {
    await rtdb.deleteBookingStatus(basePath, statusId)
  } catch (error) {
    debugWarn("Error deleting booking status:", error)
    throw error
  }
}

// Waitlist Management Functions
export const getWaitlist = async (basePath: string): Promise<WaitlistEntry[]> => {
  try {
    return await rtdb.fetchWaitlist(basePath)
  } catch (error) {
    debugWarn("Error fetching waitlist:", error)
    throw error
  }
}

export const addWaitlistEntry = async (
  basePath: string,
  entry: Omit<WaitlistEntry, "id" | "timeAdded" | "status">
): Promise<WaitlistEntry> => {
  try {
    return await rtdb.addToWaitlist(basePath, entry)
  } catch (error) {
    debugWarn("Error adding waitlist entry:", error)
    throw error
  }
}

export const updateWaitlist = async (
  basePath: string,
  entryId: string,
  updates: Partial<WaitlistEntry>
): Promise<void> => {
  try {
    await rtdb.updateWaitlistEntry(basePath, entryId, updates)
  } catch (error) {
    debugWarn("Error updating waitlist entry:", error)
    throw error
  }
}

export const removeWaitlistEntry = async (basePath: string, entryId: string): Promise<void> => {
  try {
    await rtdb.removeFromWaitlist(basePath, entryId)
  } catch (error) {
    debugWarn("Error removing waitlist entry:", error)
    throw error
  }
}

// Customer Management Functions
export const getCustomers = async (basePath: string): Promise<Customer[]> => {
  try {
    return await rtdb.fetchCustomers(basePath)
  } catch (error) {
    debugWarn("Error fetching customers:", error)
    throw error
  }
}

export const saveCustomerData = async (basePath: string, customer: Customer): Promise<Customer> => {
  try {
    return await rtdb.saveCustomer(basePath, customer)
  } catch (error) {
    debugWarn("Error saving customer:", error)
    throw error
  }
}

export const deleteCustomer = async (basePath: string, customerId: string): Promise<void> => {
  try {
    await rtdb.deleteCustomer(basePath, customerId)
  } catch (error) {
    debugWarn("Error deleting customer:", error)
    throw error
  }
}

// Booking Settings Functions
export const getBookingSettings = async (basePath: string): Promise<BookingSettings | null> => {
  try {
    return await rtdb.fetchBookingSettings(basePath)
  } catch (error) {
    debugWarn("Error fetching booking settings:", error)
    throw error
  }
}

export const updateBookingSettings = async (
  basePath: string,
  settings: BookingSettings
): Promise<void> => {
  try {
    await rtdb.saveBookingSettings(basePath, settings)
  } catch (error) {
    debugWarn("Error updating booking settings:", error)
    throw error
  }
}

// Floor Plan Management Functions
export const getFloorPlans = async (basePath: string): Promise<FloorPlan[]> => {
  try {
    return await rtdb.fetchFloorPlans(basePath)
  } catch (error) {
    debugWarn("Error fetching floor plans:", error)
    throw error
  }
}

export const saveFloorPlan = async (basePath: string, floorPlan: FloorPlan): Promise<FloorPlan> => {
  try {
    if (floorPlan.id && floorPlan.id !== `fp_${Date.now()}`) {
      // Update existing floor plan
      await rtdb.updateFloorPlan(basePath, floorPlan.id, floorPlan)
      return floorPlan
    } else {
      // Create new floor plan
      return await rtdb.createFloorPlan(basePath, floorPlan)
    }
  } catch (error) {
    debugWarn("Error saving floor plan:", error)
    throw error
  }
}

// Table Element Business Logic Functions
export const updateTableInFloorPlan = async (
  basePath: string,
  floorPlanId: string,
  tableElementId: string,
  updates: Partial<TableElement>
): Promise<void> => {
  try {
    await rtdb.updateTableElement(basePath, floorPlanId, tableElementId, updates)
  } catch (error) {
    debugWarn("Error updating table element:", error)
    throw error
  }
}

export const addTableToLayout = async (
  basePath: string,
  floorPlanId: string,
  tableElement: Omit<TableElement, "id">
): Promise<TableElement> => {
  try {
    return await rtdb.addTableToFloorPlan(basePath, floorPlanId, tableElement)
  } catch (error) {
    debugWarn("Error adding table to floor plan:", error)
    throw error
  }
}

export const removeTableFromLayout = async (
  basePath: string,
  floorPlanId: string,
  tableElementId: string
): Promise<void> => {
  try {
    await rtdb.removeTableFromFloorPlan(basePath, floorPlanId, tableElementId)
  } catch (error) {
    debugWarn("Error removing table from floor plan:", error)
    throw error
  }
}

export const removeFloorPlan = async (basePath: string, planId: string): Promise<void> => {
  try {
    await rtdb.deleteFloorPlan(basePath, planId)
  } catch (error) {
    debugWarn("Error removing floor plan:", error)
    throw error
  }
}

// Statistics Functions
export const getBookingStats = async (
  basePath: string,
  startDate?: string,
  endDate?: string
): Promise<BookingStats> => {
  try {
    return await rtdb.fetchBookingStats(basePath, startDate, endDate)
  } catch (error) {
    debugWarn("Error fetching booking stats:", error)
    throw error
  }
}

// Booking Tags Management Functions
export const getBookingTags = async (basePath: string): Promise<BookingTag[]> => {
  try {
    return await rtdb.fetchBookingTags(basePath)
  } catch (error) {
    debugWarn("Error fetching booking tags:", error)
    throw error
  }
}

export const addBookingTag = async (basePath: string, tag: Omit<BookingTag, "id" | "createdAt" | "updatedAt">): Promise<BookingTag> => {
  try {
    return await rtdb.createBookingTag(basePath, tag)
  } catch (error) {
    debugWarn("Error creating booking tag:", error)
    throw error
  }
}

export const updateBookingTag = async (basePath: string, tagId: string, updates: Partial<BookingTag>): Promise<void> => {
  try {
    await rtdb.updateBookingTag(basePath, tagId, updates)
  } catch (error) {
    debugWarn("Error updating booking tag:", error)
    throw error
  }
}

export const deleteBookingTag = async (basePath: string, tagId: string): Promise<void> => {
  try {
    await rtdb.deleteBookingTag(basePath, tagId)
  } catch (error) {
    debugWarn("Error deleting booking tag:", error)
    throw error
  }
}

// Preorder Profile Functions
export const getPreorderProfiles = async (basePath: string) => {
  try {
    return await rtdb.fetchPreorderProfiles(basePath)
  } catch (error) {
    debugWarn("Error fetching preorder profiles:", error)
    throw error
  }
}

export const savePreorderProfile = async (basePath: string, profile: any) => {
  try {
    return await rtdb.savePreorderProfile(basePath, profile)
  } catch (error) {
    debugWarn("Error saving preorder profile:", error)
    throw error
  }
}

export const deletePreorderProfile = async (basePath: string, profileId: string) => {
  try {
    await rtdb.deletePreorderProfile(basePath, profileId)
  } catch (error) {
    debugWarn("Error deleting preorder profile:", error)
    throw error
  }
}

// Stock Integration Functions
export const getStockCourses = async (companyId: string, siteId: string) => {
  try {
    return await rtdb.fetchStockCourses(companyId, siteId)
  } catch (error) {
    debugWarn("Error fetching stock courses:", error)
    throw error
  }
}

export const getStockProducts = async (companyId: string, siteId: string) => {
  try {
    return await rtdb.fetchStockProducts(companyId, siteId)
  } catch (error) {
    debugWarn("Error fetching stock products:", error)
    throw error
  }
}

// Utility Functions
export const calculateEndTime = (arrivalTime: string, duration: number): string => {
  // Business logic for calculating end time
  try {
    const [hours, minutes] = arrivalTime.split(':').map(Number)
    const arrivalDate = new Date()
    arrivalDate.setHours(hours, minutes, 0, 0)
    
    const endDate = new Date(arrivalDate.getTime() + duration * 60000) // duration in minutes
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
  } catch (error) {
    debugWarn("Error calculating end time:", error)
    return arrivalTime
  }
}

// Generate time slots for booking types
export const generateTimeSlots = (intervalMinutes: number = 30): string[] => {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      slots.push(`${hh}:${mm}`)
    }
  }
  return slots
}

// Normalize color values for booking types and statuses
export const normalizeColor = (color: string | undefined): string => {
  if (!color) return "#4caf50" // Default color

  // Ensure color starts with #
  const normalizedColor = color.startsWith("#") ? color : "#" + color

  // Ensure it's a valid hex color
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
    return "#4caf50" // Default to green if invalid
  }

  return normalizedColor
}

