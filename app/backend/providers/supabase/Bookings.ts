import { useEffect, useState } from "react"
import * as firebaseProvider from "../../rtdatabase/Bookings"
import type {
  Booking,
  BookingSettings,
  BookingStats,
  BookingStatus,
  BookingTag,
  BookingType,
  Customer,
  FloorPlan,
  Table,
  TableElement,
  TableType,
  WaitlistEntry,
} from "../../interfaces/Bookings"
import { authedDataFetch, createPollingSubscription } from "./http"

export * from "../../rtdatabase/Bookings"

type PreorderProfile = Awaited<ReturnType<typeof firebaseProvider.fetchPreorderProfiles>>[number]

const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
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

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const normalizeBooking = (value: any): Booking => ({
  ...(value || {}),
  id: String(value?.id || ""),
  firstName: String(value?.firstName || ""),
  lastName: String(value?.lastName || ""),
  email: String(value?.email || ""),
  phone: String(value?.phone || ""),
  date: String(value?.date || ""),
  arrivalTime: String(value?.arrivalTime || ""),
  guests: Number(value?.guests || value?.covers || value?.guestCount || 0),
  guestCount: Number(value?.guestCount || value?.guests || value?.covers || 0),
  covers: Number(value?.covers || value?.guests || value?.guestCount || 0),
  startTime: String(value?.startTime || value?.arrivalTime || ""),
  endTime: String(value?.endTime || value?.until || ""),
  status: String(value?.status || ""),
  totalAmount: value?.totalAmount ?? 0,
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const normalizeTable = (value: any): Table => {
  const toNum = (v: any): number | undefined => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
    return Number.isFinite(n) ? n : undefined
  }
  const min = toNum(value?.minPartySize) ?? toNum(value?.minGuests) ?? toNum(value?.minCovers)
  const max =
    toNum(value?.maxPartySize) ??
    toNum(value?.maxGuests) ??
    toNum(value?.maxCovers) ??
    toNum(value?.capacity)

  return {
    ...(value || {}),
    id: String(value?.id || ""),
    name: String(value?.name || ""),
    capacity: max ?? 0,
    order: Number(value?.order || 0),
    minPartySize: min ?? value?.minPartySize,
    maxPartySize: max ?? value?.maxPartySize,
    minGuests: min ?? value?.minGuests,
    maxGuests: max ?? value?.maxGuests,
  }
}

const normalizeBookingType = (value: any): BookingType => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || "Unnamed Type"),
  description: value?.description || "",
  color: typeof value?.color === "string" ? value.color : "#4CAF50",
  defaultDuration: value?.defaultDuration ?? 2,
  requiresDeposit: value?.requiresDeposit ?? value?.depositRequired ?? false,
  depositRequired: value?.depositRequired ?? value?.requiresDeposit ?? false,
  depositAmount: value?.depositAmount ?? 0,
  autoSendPreorders: value?.autoSendPreorders ?? false,
  preorderProfileId: value?.preorderProfileId ?? "",
  active: value?.active !== undefined ? value.active : true,
  minAdvanceHours: value?.minAdvanceHours ?? 1,
  maxAdvanceDays: value?.maxAdvanceDays ?? 30,
  depositType: value?.depositType ?? "fixed",
  availableDays:
    value?.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  availableTimeSlots: value?.availableTimeSlots || ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"],
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const normalizeBookingStatus = (value: any): BookingStatus => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  description: String(value?.description || ""),
  color: String(value?.color || "#4CAF50"),
  isDefault: Boolean(value?.isDefault),
  allowsEditing: value?.allowsEditing !== false,
  allowsSeating: Boolean(value?.allowsSeating),
  countsAsAttended: Boolean(value?.countsAsAttended),
  active: value?.active !== false,
  order: Number(value?.order || 0),
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const normalizeWaitlistEntry = (value: any): WaitlistEntry => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  contact: String(value?.contact || ""),
  partySize: Number(value?.partySize || 0),
  notes: String(value?.notes || ""),
  timeAdded:
    typeof value?.timeAdded === "string"
      ? value.timeAdded
      : new Date(value?.timeAdded || Date.now()).toISOString(),
  status: String(value?.status || "Waiting"),
})

const normalizeCustomer = (value: any): Customer => ({
  ...(value || {}),
  id: String(value?.id || ""),
  firstName: String(value?.firstName || ""),
  lastName: String(value?.lastName || ""),
  email: String(value?.email || ""),
  phone: String(value?.phone || ""),
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const normalizeBookingSettings = (value: any): BookingSettings => ({
  ...DEFAULT_BOOKING_SETTINGS,
  ...(value || {}),
})

const normalizeTableElement = (value: any): TableElement => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  seats: Number(value?.seats || 0),
  x: Number(value?.x || 0),
  y: Number(value?.y || 0),
  width: Number(value?.width || 0),
  height: Number(value?.height || 0),
  shape: value?.shape || "Rectangle",
})

const normalizeFloorPlan = (value: any): FloorPlan => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  tables: Array.isArray(value?.tables) ? value.tables.map(normalizeTableElement) : [],
})

const normalizeBookingTag = (value: any): BookingTag => ({
  ...(value || {}),
  id: String(value?.id || ""),
  name: String(value?.name || ""),
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    typeof value?.updatedAt === "string"
      ? value.updatedAt
      : new Date(value?.updatedAt || Date.now()).toISOString(),
})

const normalizeTableType = (value: any): TableType => ({
  id: String(value?.id || ""),
  name: String(value?.name || value || ""),
  description: value?.description || "",
})

const normalizePreorderProfile = (value: any): PreorderProfile => ({
  ...(value || {}),
  id: value?.id ? String(value.id) : undefined,
  name: String(value?.name || ""),
  courses: Array.isArray(value?.courses) ? value.courses : [],
})

const fetchEntityRows = async (entity: string, basePath: string) => {
  const result = await authedDataFetch(`/bookings/${entity}${query({ basePath })}`, { method: "GET" })
  return result?.rows || []
}

const createEntityRow = async (entity: string, basePath: string, data: any) => {
  const result = await authedDataFetch(`/bookings/${entity}`, {
    method: "POST",
    body: JSON.stringify({ basePath, data }),
  })
  return result?.row || { ...data, id: String(result?.id || "") }
}

const updateEntityRow = async (entity: string, basePath: string, id: string, updates: any) => {
  const result = await authedDataFetch(`/bookings/${entity}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
  return result?.row || null
}

const deleteEntityRow = async (entity: string, basePath: string, id: string) => {
  await authedDataFetch(`/bookings/${entity}/${encodeURIComponent(id)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchBookings: typeof firebaseProvider.fetchBookings = async (basePath: string) => {
  const rows = await fetchEntityRows("bookings", basePath)
  return (rows as any[]).map(normalizeBooking)
}

export const fetchBookingsByDate: typeof firebaseProvider.fetchBookingsByDate = async (basePath: string, date: string) => {
  const result = await authedDataFetch(`/bookings/bookings/byDate${query({ basePath, date })}`, { method: "GET" })
  return ((result?.rows || []) as any[]).map(normalizeBooking)
}

export const createBooking: typeof firebaseProvider.createBooking = async (basePath: string, booking) => {
  const row = await createEntityRow("bookings", basePath, booking)
  return normalizeBooking(row)
}

export const updateBooking: typeof firebaseProvider.updateBooking = async (basePath: string, bookingId: string, updates) => {
  await updateEntityRow("bookings", basePath, bookingId, updates)
}

export const deleteBooking: typeof firebaseProvider.deleteBooking = async (basePath: string, bookingId: string) => {
  await deleteEntityRow("bookings", basePath, bookingId)
}

export const fetchTables: typeof firebaseProvider.fetchTables = async (basePath: string) => {
  const rows = await fetchEntityRows("tables", basePath)
  return (rows as any[]).map(normalizeTable).sort((a, b) => (a.order || 0) - (b.order || 0))
}

export const createTable: typeof firebaseProvider.createTable = async (basePath: string, table) => {
  const row = await createEntityRow("tables", basePath, table)
  return normalizeTable(row)
}

export const updateTable: typeof firebaseProvider.updateTable = async (basePath: string, tableId: string, updates) => {
  await updateEntityRow("tables", basePath, tableId, updates)
}

export const deleteTable: typeof firebaseProvider.deleteTable = async (basePath: string, tableId: string) => {
  await deleteEntityRow("tables", basePath, tableId)
}

export const fetchTableTypes: typeof firebaseProvider.fetchTableTypes = async (basePath: string) => {
  const rows = await fetchEntityRows("tableTypes", basePath)
  return (rows as any[]).map(normalizeTableType)
}

export const createTableType: typeof firebaseProvider.createTableType = async (basePath: string, typeName: string) => {
  const row = await createEntityRow("tableTypes", basePath, { name: typeName })
  return normalizeTableType(row)
}

export const updateTableType: typeof firebaseProvider.updateTableType = async (
  basePath: string,
  typeId: string,
  typeName: string,
) => {
  await updateEntityRow("tableTypes", basePath, typeId, { name: typeName })
}

export const deleteTableType: typeof firebaseProvider.deleteTableType = async (basePath: string, typeId: string) => {
  await deleteEntityRow("tableTypes", basePath, typeId)
}

export const fetchBookingTypes: typeof firebaseProvider.fetchBookingTypes = async (basePath: string) => {
  const rows = await fetchEntityRows("bookingTypes", basePath)
  return (rows as any[]).map(normalizeBookingType)
}

export const createBookingType: typeof firebaseProvider.createBookingType = async (basePath: string, bookingType) => {
  const row = await createEntityRow("bookingTypes", basePath, bookingType)
  return normalizeBookingType(row)
}

export const updateBookingType: typeof firebaseProvider.updateBookingType = async (
  basePath: string,
  typeId: string,
  updates,
) => {
  await updateEntityRow("bookingTypes", basePath, typeId, updates)
}

export const deleteBookingType: typeof firebaseProvider.deleteBookingType = async (basePath: string, typeId: string) => {
  await deleteEntityRow("bookingTypes", basePath, typeId)
}

export const fetchBookingStatuses: typeof firebaseProvider.fetchBookingStatuses = async (basePath: string) => {
  const rows = await fetchEntityRows("statuses", basePath)
  return (rows as any[]).map(normalizeBookingStatus)
}

export const createBookingStatus: typeof firebaseProvider.createBookingStatus = async (basePath: string, status) => {
  const row = await createEntityRow("statuses", basePath, status)
  return normalizeBookingStatus(row)
}

export const updateBookingStatus: typeof firebaseProvider.updateBookingStatus = async (
  basePath: string,
  statusId: string,
  updates,
) => {
  await updateEntityRow("statuses", basePath, statusId, updates)
}

export const deleteBookingStatus: typeof firebaseProvider.deleteBookingStatus = async (basePath: string, statusId: string) => {
  await deleteEntityRow("statuses", basePath, statusId)
}

export const fetchPreorderProfiles: typeof firebaseProvider.fetchPreorderProfiles = async (basePath: string) => {
  const rows = await fetchEntityRows("preorderProfiles", basePath)
  return (rows as any[]).map(normalizePreorderProfile)
}

export const savePreorderProfile: typeof firebaseProvider.savePreorderProfile = async (basePath: string, profile) => {
  if (profile?.id) {
    await updateEntityRow("preorderProfiles", basePath, String(profile.id), profile)
    return String(profile.id)
  }
  const row = await createEntityRow("preorderProfiles", basePath, profile)
  return String(row?.id || "")
}

export const deletePreorderProfile: typeof firebaseProvider.deletePreorderProfile = async (
  basePath: string,
  profileId: string,
) => {
  await deleteEntityRow("preorderProfiles", basePath, profileId)
}

export const appendBookingMessage: typeof firebaseProvider.appendBookingMessage = async (
  basePath: string,
  bookingId: string,
  message,
) => {
  await authedDataFetch(`/bookings/bookings/${encodeURIComponent(bookingId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ basePath, message }),
  })
}

export const fetchWaitlist: typeof firebaseProvider.fetchWaitlist = async (basePath: string) => {
  const rows = await fetchEntityRows("waitlist", basePath)
  return (rows as any[]).map(normalizeWaitlistEntry)
}

export const addToWaitlist: typeof firebaseProvider.addToWaitlist = async (basePath: string, entry) => {
  const row = await createEntityRow("waitlist", basePath, {
    ...entry,
    timeAdded: new Date().toISOString(),
    status: "Waiting",
  })
  return normalizeWaitlistEntry(row)
}

export const updateWaitlistEntry: typeof firebaseProvider.updateWaitlistEntry = async (
  basePath: string,
  entryId: string,
  updates,
) => {
  await updateEntityRow("waitlist", basePath, entryId, updates)
}

export const removeFromWaitlist: typeof firebaseProvider.removeFromWaitlist = async (
  basePath: string,
  entryId: string,
) => {
  await deleteEntityRow("waitlist", basePath, entryId)
}

export const fetchCustomers: typeof firebaseProvider.fetchCustomers = async (basePath: string) => {
  const rows = await fetchEntityRows("customers", basePath)
  return (rows as any[]).map(normalizeCustomer)
}

export const saveCustomer: typeof firebaseProvider.saveCustomer = async (basePath: string, customer) => {
  if (customer?.id) {
    const row = await updateEntityRow("customers", basePath, String(customer.id), customer)
    return normalizeCustomer(row || customer)
  }
  const row = await createEntityRow("customers", basePath, customer)
  return normalizeCustomer(row)
}

export const deleteCustomer: typeof firebaseProvider.deleteCustomer = async (basePath: string, customerId: string) => {
  await deleteEntityRow("customers", basePath, customerId)
}

export const fetchBookingSettings: typeof firebaseProvider.fetchBookingSettings = async (basePath: string) => {
  const result = await authedDataFetch(`/bookings/settings${query({ basePath })}`, { method: "GET" })
  return normalizeBookingSettings(result?.row)
}

export const saveBookingSettings: typeof firebaseProvider.saveBookingSettings = async (
  basePath: string,
  settings: BookingSettings,
) => {
  await authedDataFetch(`/bookings/settings`, {
    method: "PUT",
    body: JSON.stringify({ basePath, settings }),
  })
}

export const fetchFloorPlans: typeof firebaseProvider.fetchFloorPlans = async (basePath: string) => {
  const rows = await fetchEntityRows("floorPlans", basePath)
  return (rows as any[]).map(normalizeFloorPlan)
}

export const fetchBookingStats: typeof firebaseProvider.fetchBookingStats = async (
  basePath: string,
  startDate?: string,
  endDate?: string,
) => {
  const result = await authedDataFetch(`/bookings/stats${query({ basePath, startDate, endDate })}`, {
    method: "GET",
  })
  return (result?.row || {
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
    occupancyRate: 0,
  }) as BookingStats
}

export const saveFloorPlan: typeof firebaseProvider.saveFloorPlan = async (basePath: string, floorPlan: FloorPlan) => {
  if (floorPlan?.id) {
    const row = await updateEntityRow("floorPlans", basePath, String(floorPlan.id), floorPlan)
    return normalizeFloorPlan(row || floorPlan)
  }
  const row = await createEntityRow("floorPlans", basePath, floorPlan)
  return normalizeFloorPlan(row)
}

export const deleteFloorPlan: typeof firebaseProvider.deleteFloorPlan = async (basePath: string, planId: string) => {
  await deleteEntityRow("floorPlans", basePath, planId)
}

export const calculateBookingStats: typeof firebaseProvider.calculateBookingStats = async (
  basePath: string,
  startDate?: string,
  endDate?: string,
) => fetchBookingStats(basePath, startDate, endDate)

export const useBookings: typeof firebaseProvider.useBookings = (basePath: string) => {
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!basePath) {
      setBookings([])
      return
    }
    return createPollingSubscription(() => fetchBookings(basePath), setBookings)
  }, [basePath])

  return bookings
}

export const useTables: typeof firebaseProvider.useTables = (basePath: string) => {
  const [tables, setTables] = useState<Table[]>([])

  useEffect(() => {
    if (!basePath) {
      setTables([])
      return
    }
    return createPollingSubscription(() => fetchTables(basePath), setTables)
  }, [basePath])

  return tables
}

export const useWaitlist: typeof firebaseProvider.useWaitlist = (basePath: string) => {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])

  useEffect(() => {
    if (!basePath) {
      setWaitlist([])
      return
    }
    return createPollingSubscription(() => fetchWaitlist(basePath), setWaitlist)
  }, [basePath])

  return waitlist
}

export const fetchBookingTags: typeof firebaseProvider.fetchBookingTags = async (basePath: string) => {
  const rows = await fetchEntityRows("tags", basePath)
  return (rows as any[]).map(normalizeBookingTag)
}

export const createBookingTag: typeof firebaseProvider.createBookingTag = async (basePath: string, tag) => {
  const row = await createEntityRow("tags", basePath, tag)
  return normalizeBookingTag(row)
}

export const updateBookingTag: typeof firebaseProvider.updateBookingTag = async (
  basePath: string,
  tagId: string,
  updates,
) => {
  await updateEntityRow("tags", basePath, tagId, updates)
}

export const deleteBookingTag: typeof firebaseProvider.deleteBookingTag = async (basePath: string, tagId: string) => {
  await deleteEntityRow("tags", basePath, tagId)
}

export const createFloorPlan: typeof firebaseProvider.createFloorPlan = async (basePath: string, floorPlan) => {
  const row = await createEntityRow("floorPlans", basePath, floorPlan)
  return normalizeFloorPlan(row)
}

export const updateFloorPlan: typeof firebaseProvider.updateFloorPlan = async (
  basePath: string,
  floorPlanId: string,
  updates,
) => {
  await updateEntityRow("floorPlans", basePath, floorPlanId, updates)
}

export const updateTableElement: typeof firebaseProvider.updateTableElement = async (
  basePath: string,
  floorPlanId: string,
  tableElementId: string,
  updates,
) => {
  await authedDataFetch(`/bookings/floorPlans/${encodeURIComponent(floorPlanId)}/tables/${encodeURIComponent(tableElementId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const addTableToFloorPlan: typeof firebaseProvider.addTableToFloorPlan = async (
  basePath: string,
  floorPlanId: string,
  tableElement,
) => {
  const result = await authedDataFetch(`/bookings/floorPlans/${encodeURIComponent(floorPlanId)}/tables`, {
    method: "POST",
    body: JSON.stringify({ basePath, tableElement }),
  })
  return normalizeTableElement(result?.tableElement || {})
}

export const removeTableFromFloorPlan: typeof firebaseProvider.removeTableFromFloorPlan = async (
  basePath: string,
  floorPlanId: string,
  tableElementId: string,
) => {
  await authedDataFetch(
    `/bookings/floorPlans/${encodeURIComponent(floorPlanId)}/tables/${encodeURIComponent(tableElementId)}${query({ basePath })}`,
    {
      method: "DELETE",
    },
  )
}
