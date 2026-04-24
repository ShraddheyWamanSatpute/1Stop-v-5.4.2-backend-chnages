"use client"

import { db, ref, get, remove, update, push, set } from "../services/Firebase"
import type {
  Bill,
  TillScreen,
  PaymentType,
  FloorPlan,
  Table,
  Discount,
  Promotion,
  Correction,
  BagCheckItem,
  BagCheckConfig,
  Location,
  Device,
  PaymentIntegration,
  Ticket,
  TicketSale,
  PaymentTransaction,
  Sale,
  Group,
  Course,
  Card
} from "../interfaces/POS"
import { v4 as uuidv4 } from "uuid"

 const stripUndefined = <T,>(value: T): T => {
   if (Array.isArray(value)) {
     return value.map((v) => stripUndefined(v)) as T
   }
 
   if (value && typeof value === "object") {
     const result: any = {}
     for (const [k, v] of Object.entries(value as any)) {
       if (v === undefined) continue
       result[k] = stripUndefined(v)
     }
     return result as T
   }
 
   return value
 }

// ===== BILLS =====

export const fetchBills = async (basePath: string): Promise<Bill[]> => {
  if (!basePath) return []
  
  const billsRef = ref(db, `${basePath}/bills`)
  try {
    const snapshot = await get(billsRef)
    if (snapshot.exists()) {
      const bills = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Bill, "id">),
      }))
      return bills
    }
    return []
  } catch (error) {
    console.error("Error fetching bills:", error)
    return []
  }
}

export const fetchOpenBills = async (basePath: string): Promise<Bill[]> => {
  const bills = await fetchBills(basePath)
  return bills.filter(bill => bill.status === "open")
}

export const fetchClosedBills = async (basePath: string): Promise<Bill[]> => {
  const bills = await fetchBills(basePath)
  return bills.filter(bill => bill.status === "closed" || bill.status === "paid")
}

export const fetchTransactions = async (basePath: string): Promise<any[]> => {
  if (!basePath) return []
  
  const transactionsRef = ref(db, `${basePath}/transactions`)
  try {
    const snapshot = await get(transactionsRef)
    if (snapshot.exists()) {
      const transactions = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as any),
      }))
      return transactions
    }
    return []
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return []
  }
}

export const createBill = async (basePath: string, bill: Omit<Bill, "id" | "createdAt" | "updatedAt">): Promise<Bill> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const billsRef = ref(db, `${basePath}/bills`)
  const newBillRef = push(billsRef)
  const billId = newBillRef.key || uuidv4()
  
  const now = Date.now()
  const newBill = {
    ...bill,
    id: billId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newBillRef, stripUndefined(newBill))
  return newBill as Bill
}

export const updateBill = async (basePath: string, billId: string, updates: Partial<Bill>): Promise<void> => {
  if (!basePath || !billId) throw new Error("Missing required parameters")
  
  const billRef = ref(db, `${basePath}/bills/${billId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(billRef, updatedFields)
}

export const deleteBill = async (basePath: string, billId: string): Promise<void> => {
  if (!basePath || !billId) throw new Error("Missing required parameters")
  
  const billRef = ref(db, `${basePath}/bills/${billId}`)
  await remove(billRef)
}

// ===== TILL SCREENS =====

export const fetchTillScreens = async (basePath: string): Promise<TillScreen[]> => {
  if (!basePath) return []
  
  const tillScreensRef = ref(db, `${basePath}/tillscreens`)
  try {
    const snapshot = await get(tillScreensRef)
    if (snapshot.exists()) {
      const tillScreens = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<TillScreen, "id">),
      }))
      return tillScreens
    }
    return []
  } catch (error) {
    console.error("Error fetching till screens:", error)
    return []
  }
}

export const createTillScreen = async (basePath: string, tillScreen: Omit<TillScreen, "id" | "createdAt" | "updatedAt">): Promise<TillScreen> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const tillScreensRef = ref(db, `${basePath}/tillscreens`)
  const newTillScreenRef = push(tillScreensRef)
  const tillScreenId = newTillScreenRef.key || uuidv4()
  
  const now = Date.now()
  const newTillScreen = {
    ...tillScreen,
    id: tillScreenId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newTillScreenRef, stripUndefined(newTillScreen))
  return newTillScreen as TillScreen
}

export const updateTillScreen = async (basePath: string, tillScreenId: string, updates: Partial<TillScreen>): Promise<void> => {
  if (!basePath || !tillScreenId) throw new Error("Missing required parameters")
  
  const tillScreenRef = ref(db, `${basePath}/tillscreens/${tillScreenId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(tillScreenRef, updatedFields)
}

export const deleteTillScreen = async (basePath: string, tillScreenId: string): Promise<void> => {
  if (!basePath || !tillScreenId) throw new Error("Missing required parameters")
  
  const tillScreenRef = ref(db, `${basePath}/tillscreens/${tillScreenId}`)
  await remove(tillScreenRef)
}

// ===== PAYMENT TYPES =====

export const fetchPaymentTypes = async (basePath: string): Promise<PaymentType[]> => {
  if (!basePath) return []
  
  const paymentTypesRef = ref(db, `${basePath}/paymentTypes`)
  try {
    const snapshot = await get(paymentTypesRef)
    if (snapshot.exists()) {
      const paymentTypes = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<PaymentType, "id">),
      }))
      return paymentTypes
    }
    return []
  } catch (error) {
    console.error("Error fetching payment types:", error)
    return []
  }
}

export const createPaymentType = async (basePath: string, paymentType: Omit<PaymentType, "id" | "createdAt" | "updatedAt">): Promise<PaymentType> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const paymentTypesRef = ref(db, `${basePath}/paymentTypes`)
  const newPaymentTypeRef = push(paymentTypesRef)
  const paymentTypeId = newPaymentTypeRef.key || uuidv4()
  
  const now = Date.now()
  const newPaymentType = stripUndefined({
    ...paymentType,
    id: paymentTypeId,
    createdAt: now,
    updatedAt: now,
  })
  
  await set(newPaymentTypeRef, newPaymentType)
  return newPaymentType as PaymentType
}

export const updatePaymentType = async (basePath: string, paymentTypeId: string, updates: Partial<PaymentType>): Promise<void> => {
  if (!basePath || !paymentTypeId) throw new Error("Missing required parameters")
  
  const paymentTypeRef = ref(db, `${basePath}/paymentTypes/${paymentTypeId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })
  
  await update(paymentTypeRef, updatedFields)
}

export const deletePaymentType = async (basePath: string, paymentTypeId: string): Promise<void> => {
  if (!basePath || !paymentTypeId) throw new Error("Missing required parameters")
  
  const paymentTypeRef = ref(db, `${basePath}/paymentTypes/${paymentTypeId}`)
  await remove(paymentTypeRef)
}

// ===== FLOOR PLANS =====

export const fetchFloorPlans = async (basePath: string): Promise<FloorPlan[]> => {
  if (!basePath) return []
  
  const floorPlansRef = ref(db, `${basePath}/floorplans`)
  try {
    const snapshot = await get(floorPlansRef)
    if (snapshot.exists()) {
      const floorPlans = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<FloorPlan, "id">),
      }))
      return floorPlans
    }
    return []
  } catch (error) {
    console.error("Error fetching floor plans:", error)
    return []
  }
}

export const createFloorPlan = async (basePath: string, floorPlan: Omit<FloorPlan, "id" | "createdAt" | "updatedAt">): Promise<FloorPlan> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const floorPlansRef = ref(db, `${basePath}/floorplans`)
  const newFloorPlanRef = push(floorPlansRef)
  const floorPlanId = newFloorPlanRef.key || uuidv4()
  
  const now = Date.now()
  const newFloorPlan = {
    ...floorPlan,
    id: floorPlanId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newFloorPlanRef, stripUndefined(newFloorPlan))
  return newFloorPlan as FloorPlan
}

export const updateFloorPlan = async (basePath: string, floorPlanId: string, updates: Partial<FloorPlan>): Promise<void> => {
  if (!basePath || !floorPlanId) throw new Error("Missing required parameters")
  
  const floorPlanRef = ref(db, `${basePath}/floorplans/${floorPlanId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(floorPlanRef, updatedFields)
}

export const deleteFloorPlan = async (basePath: string, floorPlanId: string): Promise<void> => {
  if (!basePath || !floorPlanId) throw new Error("Missing required parameters")
  
  const floorPlanRef = ref(db, `${basePath}/floorplans/${floorPlanId}`)
  await remove(floorPlanRef)
}

// ===== TABLES =====

export const fetchTables = async (basePath: string): Promise<Table[]> => {
  if (!basePath) return []
  
  const tablesRef = ref(db, `${basePath}/tables`)
  try {
    const snapshot = await get(tablesRef)
    if (snapshot.exists()) {
      const tables = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Table, "id">),
      }))
      return tables
    }
    return []
  } catch (error) {
    console.error("Error fetching tables:", error)
    return []
  }
}

export const createTable = async (basePath: string, table: Omit<Table, "id" | "createdAt" | "updatedAt">): Promise<Table> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const tablesRef = ref(db, `${basePath}/tables`)
  const newTableRef = push(tablesRef)
  const tableId = newTableRef.key || uuidv4()
  
  const now = Date.now()
  const newTable = {
    ...table,
    id: tableId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newTableRef, stripUndefined(newTable))
  return newTable as Table
}

export const updateTable = async (basePath: string, tableId: string, updates: Partial<Table>): Promise<void> => {
  if (!basePath || !tableId) throw new Error("Missing required parameters")
  
  const tableRef = ref(db, `${basePath}/tables/${tableId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(tableRef, updatedFields)
}

export const deleteTable = async (basePath: string, tableId: string): Promise<void> => {
  if (!basePath || !tableId) throw new Error("Missing required parameters")
  
  const tableRef = ref(db, `${basePath}/tables/${tableId}`)
  await remove(tableRef)
}

// ===== DISCOUNTS =====

export const fetchDiscounts = async (basePath: string): Promise<Discount[]> => {
  if (!basePath) return []
  
  const discountsRef = ref(db, `${basePath}/discounts`)
  try {
    const snapshot = await get(discountsRef)
    if (snapshot.exists()) {
      const discounts = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Discount, "id">),
      }))
      return discounts
    }
    return []
  } catch (error) {
    console.error("Error fetching discounts:", error)
    return []
  }
}

export const createDiscount = async (basePath: string, discount: Omit<Discount, "id" | "createdAt" | "updatedAt">): Promise<Discount> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const discountsRef = ref(db, `${basePath}/discounts`)
  const newDiscountRef = push(discountsRef)
  const discountId = newDiscountRef.key || uuidv4()
  
  const now = Date.now()
  const newDiscount = {
    ...discount,
    id: discountId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newDiscountRef, stripUndefined(newDiscount))
  return newDiscount as Discount
}

export const updateDiscount = async (basePath: string, discountId: string, updates: Partial<Discount>): Promise<void> => {
  if (!basePath || !discountId) throw new Error("Missing required parameters")
  
  const discountRef = ref(db, `${basePath}/discounts/${discountId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(discountRef, updatedFields)
}

export const deleteDiscount = async (basePath: string, discountId: string): Promise<void> => {
  if (!basePath || !discountId) throw new Error("Missing required parameters")
  
  const discountRef = ref(db, `${basePath}/discounts/${discountId}`)
  await remove(discountRef)
}

// ===== PROMOTIONS =====

export const fetchPromotions = async (basePath: string): Promise<Promotion[]> => {
  if (!basePath) return []
  
  const promotionsRef = ref(db, `${basePath}/promotions`)
  try {
    const snapshot = await get(promotionsRef)
    if (snapshot.exists()) {
      const promotions = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Promotion, "id">),
      }))
      return promotions
    }
    return []
  } catch (error) {
    console.error("Error fetching promotions:", error)
    return []
  }
}

export const createPromotion = async (basePath: string, promotion: Omit<Promotion, "id" | "createdAt" | "updatedAt">): Promise<Promotion> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const promotionsRef = ref(db, `${basePath}/promotions`)
  const newPromotionRef = push(promotionsRef)
  const promotionId = newPromotionRef.key || uuidv4()
  
  const now = Date.now()
  const newPromotion = {
    ...promotion,
    id: promotionId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newPromotionRef, stripUndefined(newPromotion))
  return newPromotion as Promotion
}

export const updatePromotion = async (basePath: string, promotionId: string, updates: Partial<Promotion>): Promise<void> => {
  if (!basePath || !promotionId) throw new Error("Missing required parameters")
  
  const promotionRef = ref(db, `${basePath}/promotions/${promotionId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(promotionRef, updatedFields)
}

export const deletePromotion = async (basePath: string, promotionId: string): Promise<void> => {
  if (!basePath || !promotionId) throw new Error("Missing required parameters")
  
  const promotionRef = ref(db, `${basePath}/promotions/${promotionId}`)
  await remove(promotionRef)
}

// ===== CORRECTIONS =====

export const fetchCorrections = async (basePath: string): Promise<Correction[]> => {
  if (!basePath) return []
  
  const correctionsRef = ref(db, `${basePath}/corrections`)
  try {
    const snapshot = await get(correctionsRef)
    if (snapshot.exists()) {
      const corrections = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Correction, "id">),
      }))
      return corrections
    }
    return []
  } catch (error) {
    console.error("Error fetching corrections:", error)
    return []
  }
}

export const createCorrection = async (basePath: string, correction: Omit<Correction, "id" | "createdAt" | "updatedAt">): Promise<Correction> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const correctionsRef = ref(db, `${basePath}/corrections`)
  const newCorrectionRef = push(correctionsRef)
  const correctionId = newCorrectionRef.key || uuidv4()
  
  const now = Date.now()
  const newCorrection = {
    ...correction,
    id: correctionId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newCorrectionRef, stripUndefined(newCorrection))
  return newCorrection as Correction
}

export const updateCorrection = async (basePath: string, correctionId: string, updates: Partial<Correction>): Promise<void> => {
  if (!basePath || !correctionId) throw new Error("Missing required parameters")
  
  const correctionRef = ref(db, `${basePath}/corrections/${correctionId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(correctionRef, updatedFields)
}

export const deleteCorrection = async (basePath: string, correctionId: string): Promise<void> => {
  if (!basePath || !correctionId) throw new Error("Missing required parameters")
  
  const correctionRef = ref(db, `${basePath}/corrections/${correctionId}`)
  await remove(correctionRef)
}

// ===== BAG CHECK ITEMS =====

export const fetchBagCheckItems = async (basePath: string): Promise<BagCheckItem[]> => {
  if (!basePath) return []
  
  const bagCheckItemsRef = ref(db, `${basePath}/bagCheckItems`)
  try {
    const snapshot = await get(bagCheckItemsRef)
    if (snapshot.exists()) {
      const bagCheckItems = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<BagCheckItem, "id">),
      }))
      return bagCheckItems
    }
    return []
  } catch (error) {
    console.error("Error fetching bag check items:", error)
    return []
  }
}

export const createBagCheckItem = async (basePath: string, bagCheckItem: Omit<BagCheckItem, "id" | "createdAt" | "updatedAt">): Promise<BagCheckItem> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const bagCheckItemsRef = ref(db, `${basePath}/bagCheckItems`)
  const newBagCheckItemRef = push(bagCheckItemsRef)
  const bagCheckItemId = newBagCheckItemRef.key || uuidv4()
  
  const now = Date.now()
  const newBagCheckItem = {
    ...bagCheckItem,
    id: bagCheckItemId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newBagCheckItemRef, stripUndefined(newBagCheckItem))
  return newBagCheckItem as BagCheckItem
}

export const updateBagCheckItem = async (basePath: string, bagCheckItemId: string, updates: Partial<BagCheckItem>): Promise<void> => {
  if (!basePath || !bagCheckItemId) throw new Error("Missing required parameters")
  
  const bagCheckItemRef = ref(db, `${basePath}/bagCheckItems/${bagCheckItemId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(bagCheckItemRef, updatedFields)
}

export const deleteBagCheckItem = async (basePath: string, bagCheckItemId: string): Promise<void> => {
  if (!basePath || !bagCheckItemId) throw new Error("Missing required parameters")
  
  const bagCheckItemRef = ref(db, `${basePath}/bagCheckItems/${bagCheckItemId}`)
  await remove(bagCheckItemRef)
}

// ===== BAG CHECK CONFIG =====

export const fetchBagCheckConfig = async (basePath: string): Promise<BagCheckConfig | null> => {
  if (!basePath) return null
  
  const bagCheckConfigRef = ref(db, `${basePath}/bagcheck/config`)
  try {
    const snapshot = await get(bagCheckConfigRef)
    if (snapshot.exists()) {
      return snapshot.val() as BagCheckConfig
    }
    return null
  } catch (error) {
    console.error("Error fetching bag check config:", error)
    return null
  }
}

export const updateBagCheckConfig = async (basePath: string, config: Partial<BagCheckConfig>): Promise<void> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const bagCheckConfigRef = ref(db, `${basePath}/bagcheck/config`)
  await update(bagCheckConfigRef, stripUndefined({ ...config, updatedAt: Date.now() }))
}

// ===== LOCATIONS =====

export const fetchLocations = async (basePath: string): Promise<Location[]> => {
  if (!basePath) return []
  
  const locationsRef = ref(db, `${basePath}/locations`)
  try {
    const snapshot = await get(locationsRef)
    if (snapshot.exists()) {
      const locations = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Location, "id">),
      }))
      return locations
    }
    return []
  } catch (error) {
    console.error("Error fetching locations:", error)
    return []
  }
}

export const createLocation = async (basePath: string, location: Omit<Location, "id" | "createdAt" | "updatedAt">): Promise<Location> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const locationsRef = ref(db, `${basePath}/locations`)
  const newLocationRef = push(locationsRef)
  const locationId = newLocationRef.key || uuidv4()
  
  const now = Date.now()
  const newLocation = {
    ...location,
    id: locationId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newLocationRef, stripUndefined(newLocation))
  return newLocation as Location
}

export const updateLocation = async (basePath: string, locationId: string, updates: Partial<Location>): Promise<void> => {
  if (!basePath || !locationId) throw new Error("Missing required parameters")
  
  const locationRef = ref(db, `${basePath}/locations/${locationId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(locationRef, updatedFields)
}

export const deleteLocation = async (basePath: string, locationId: string): Promise<void> => {
  if (!basePath || !locationId) throw new Error("Missing required parameters")
  
  const locationRef = ref(db, `${basePath}/locations/${locationId}`)
  await remove(locationRef)
}

// ===== DEVICES =====

export const fetchDevices = async (basePath: string): Promise<Device[]> => {
  if (!basePath) return []
  
  const devicesRef = ref(db, `${basePath}/devices`)
  try {
    const snapshot = await get(devicesRef)
    if (snapshot.exists()) {
      const devices = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Device, "id">),
      }))
      return devices
    }
    return []
  } catch (error) {
    console.error("Error fetching devices:", error)
    return []
  }
}

export const createDevice = async (basePath: string, device: Omit<Device, "id" | "createdAt" | "updatedAt">): Promise<Device> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const devicesRef = ref(db, `${basePath}/devices`)
  const newDeviceRef = push(devicesRef)
  const deviceId = newDeviceRef.key || uuidv4()
  
  const now = Date.now()
  const newDevice = stripUndefined({
    ...device,
    id: deviceId,
    createdAt: now,
    updatedAt: now,
  })
  
  await set(newDeviceRef, newDevice)
  return newDevice as Device
}

export const updateDevice = async (basePath: string, deviceId: string, updates: Partial<Device>): Promise<void> => {
  if (!basePath || !deviceId) throw new Error("Missing required parameters")
  
  const deviceRef = ref(db, `${basePath}/devices/${deviceId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })
  
  await update(deviceRef, updatedFields)
}

export const deleteDevice = async (basePath: string, deviceId: string): Promise<void> => {
  if (!basePath || !deviceId) throw new Error("Missing required parameters")
  
  const deviceRef = ref(db, `${basePath}/devices/${deviceId}`)
  await remove(deviceRef)
}

// ===== PAYMENT INTEGRATIONS =====

export const fetchPaymentIntegrations = async (basePath: string): Promise<PaymentIntegration[]> => {
  if (!basePath) return []
  
  const paymentIntegrationsRef = ref(db, `${basePath}/paymentIntegrations`)
  try {
    const snapshot = await get(paymentIntegrationsRef)
    if (snapshot.exists()) {
      const paymentIntegrations = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<PaymentIntegration, "id">),
      }))
      return paymentIntegrations
    }
    return []
  } catch (error) {
    console.error("Error fetching payment integrations:", error)
    return []
  }
}

export const createPaymentIntegration = async (basePath: string, paymentIntegration: Omit<PaymentIntegration, "id" | "createdAt" | "updatedAt">): Promise<PaymentIntegration> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const paymentIntegrationsRef = ref(db, `${basePath}/paymentIntegrations`)
  const newPaymentIntegrationRef = push(paymentIntegrationsRef)
  const paymentIntegrationId = newPaymentIntegrationRef.key || uuidv4()
  
  const now = Date.now()
  const newPaymentIntegration = {
    ...paymentIntegration,
    id: paymentIntegrationId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newPaymentIntegrationRef, stripUndefined(newPaymentIntegration))
  return newPaymentIntegration as PaymentIntegration
}

export const updatePaymentIntegration = async (basePath: string, paymentIntegrationId: string, updates: Partial<PaymentIntegration>): Promise<void> => {
  if (!basePath || !paymentIntegrationId) throw new Error("Missing required parameters")
  
  const paymentIntegrationRef = ref(db, `${basePath}/paymentIntegrations/${paymentIntegrationId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(paymentIntegrationRef, updatedFields)
}

export const deletePaymentIntegration = async (basePath: string, paymentIntegrationId: string): Promise<void> => {
  if (!basePath || !paymentIntegrationId) throw new Error("Missing required parameters")
  
  const paymentIntegrationRef = ref(db, `${basePath}/paymentIntegrations/${paymentIntegrationId}`)
  await remove(paymentIntegrationRef)
}

// ===== TICKETS =====

export const fetchTickets = async (basePath: string): Promise<Ticket[]> => {
  if (!basePath) return []
  
  const ticketsRef = ref(db, `${basePath}/tickets`)
  try {
    const snapshot = await get(ticketsRef)
    if (snapshot.exists()) {
      const tickets = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Ticket, "id">),
      }))
      return tickets
    }
    return []
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return []
  }
}

export const createTicket = async (basePath: string, ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt">): Promise<Ticket> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const ticketsRef = ref(db, `${basePath}/tickets`)
  const newTicketRef = push(ticketsRef)
  const ticketId = newTicketRef.key || uuidv4()
  
  const now = Date.now()
  const newTicket = {
    ...ticket,
    id: ticketId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newTicketRef, stripUndefined(newTicket))
  return newTicket as Ticket
}

export const updateTicket = async (basePath: string, ticketId: string, updates: Partial<Ticket>): Promise<void> => {
  if (!basePath || !ticketId) throw new Error("Missing required parameters")
  
  const ticketRef = ref(db, `${basePath}/tickets/${ticketId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(ticketRef, updatedFields)
}

export const deleteTicket = async (basePath: string, ticketId: string): Promise<void> => {
  if (!basePath || !ticketId) throw new Error("Missing required parameters")
  
  const ticketRef = ref(db, `${basePath}/tickets/${ticketId}`)
  await remove(ticketRef)
}

// ===== TICKET SALES =====

export const fetchTicketSales = async (basePath: string): Promise<TicketSale[]> => {
  if (!basePath) return []
  
  const ticketSalesRef = ref(db, `${basePath}/ticketSales`)
  try {
    const snapshot = await get(ticketSalesRef)
    if (snapshot.exists()) {
      const ticketSales = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<TicketSale, "id">),
      }))
      return ticketSales
    }
    return []
  } catch (error) {
    console.error("Error fetching ticket sales:", error)
    return []
  }
}

export const createTicketSale = async (basePath: string, ticketSale: Omit<TicketSale, "id" | "createdAt" | "updatedAt">): Promise<TicketSale> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const ticketSalesRef = ref(db, `${basePath}/ticketSales`)
  const newTicketSaleRef = push(ticketSalesRef)
  const ticketSaleId = newTicketSaleRef.key || uuidv4()
  
  const now = Date.now()
  const newTicketSale = {
    ...ticketSale,
    id: ticketSaleId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newTicketSaleRef, stripUndefined(newTicketSale))
  return newTicketSale as TicketSale
}

export const updateTicketSale = async (basePath: string, ticketSaleId: string, updates: Partial<TicketSale>): Promise<void> => {
  if (!basePath || !ticketSaleId) throw new Error("Missing required parameters")
  
  const ticketSaleRef = ref(db, `${basePath}/ticketSales/${ticketSaleId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(ticketSaleRef, updatedFields)
}

export const deleteTicketSale = async (basePath: string, ticketSaleId: string): Promise<void> => {
  if (!basePath || !ticketSaleId) throw new Error("Missing required parameters")
  
  const ticketSaleRef = ref(db, `${basePath}/ticketSales/${ticketSaleId}`)
  await remove(ticketSaleRef)
}

// ===== PAYMENT TRANSACTIONS =====

export const fetchPaymentTransactions = async (basePath: string): Promise<PaymentTransaction[]> => {
  if (!basePath) return []

  const txRef = ref(db, `${basePath}/paymentTransactions`)
  try {
    const snapshot = await get(txRef)
    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...(data as Omit<PaymentTransaction, "id">),
    }))
  } catch (error) {
    console.error("Error fetching payment transactions:", error)
    return []
  }
}

export const fetchPaymentTransactionsByBill = async (basePath: string, billId: string): Promise<PaymentTransaction[]> => {
  const all = await fetchPaymentTransactions(basePath)
  return all.filter((t) => t.billId === billId)
}

export const createPaymentTransaction = async (
  basePath: string,
  tx: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">,
): Promise<PaymentTransaction> => {
  if (!basePath) throw new Error("Base path is missing")

  const txRef = ref(db, `${basePath}/paymentTransactions`)
  const newTxRef = push(txRef)
  const id = newTxRef.key || uuidv4()
  const now = Date.now()
  const newTx: PaymentTransaction = stripUndefined({ ...tx, id, createdAt: now, updatedAt: now }) as PaymentTransaction
  await set(newTxRef, newTx)
  return newTx
}

export const updatePaymentTransaction = async (
  basePath: string,
  txId: string,
  updates: Partial<PaymentTransaction>,
): Promise<void> => {
  if (!basePath || !txId) throw new Error("Missing required parameters")
  const txRef = ref(db, `${basePath}/paymentTransactions/${txId}`)
  await update(txRef, stripUndefined({ ...updates, updatedAt: Date.now() }))
}

export const deletePaymentTransaction = async (basePath: string, txId: string): Promise<void> => {
  if (!basePath || !txId) throw new Error("Missing required parameters")
  const txRef = ref(db, `${basePath}/paymentTransactions/${txId}`)
  await remove(txRef)
}

// ===== SALES =====

export const fetchSales = async (basePath: string): Promise<Sale[]> => {
  if (!basePath) return []
  
  const salesRef = ref(db, `${basePath}/sales`)
  try {
    const snapshot = await get(salesRef)
    if (snapshot.exists()) {
      const sales = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Sale, "id">),
      }))
      return sales
    }
    return []
  } catch (error) {
    console.error("Error fetching sales:", error)
    return []
  }
}

export const createSale = async (basePath: string, sale: Omit<Sale, "id" | "createdAt">): Promise<Sale> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const salesRef = ref(db, `${basePath}/sales`)
  const newSaleRef = push(salesRef)
  const saleId = newSaleRef.key || uuidv4()
  
  const now = Date.now()
  const newSale = {
    ...sale,
    id: saleId,
    createdAt: now,
  }
  
  await set(newSaleRef, stripUndefined(newSale))
  return newSale as Sale
}

export const fetchSalesByDateRange = async (basePath: string, startDate: number, endDate: number): Promise<Sale[]> => {
  const sales = await fetchSales(basePath)
  return sales.filter(sale => sale.createdAt >= startDate && sale.createdAt <= endDate)
}

export const fetchSalesByProduct = async (basePath: string, productId: string): Promise<Sale[]> => {
  const sales = await fetchSales(basePath)
  return sales.filter(sale => sale.productId === productId)
}

// ===== GROUPS =====

export const fetchGroups = async (basePath: string): Promise<Group[]> => {
  if (!basePath) return []
  
  const groupsRef = ref(db, `${basePath}/groups`)
  try {
    const snapshot = await get(groupsRef)
    if (snapshot.exists()) {
      const groups = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Group, "id">),
      }))
      return groups
    }
    return []
  } catch (error) {
    console.error("Error fetching groups:", error)
    return []
  }
}

export const createGroup = async (basePath: string, group: Omit<Group, "id" | "createdAt" | "updatedAt">): Promise<Group> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const groupsRef = ref(db, `${basePath}/groups`)
  const newGroupRef = push(groupsRef)
  const groupId = newGroupRef.key || uuidv4()
  
  const now = Date.now()
  const newGroup = {
    ...group,
    id: groupId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newGroupRef, stripUndefined(newGroup))
  return newGroup as Group
}

export const updateGroup = async (basePath: string, groupId: string, updates: Partial<Group>): Promise<void> => {
  if (!basePath || !groupId) throw new Error("Missing required parameters")
  
  const groupRef = ref(db, `${basePath}/groups/${groupId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(groupRef, updatedFields)
}

export const deleteGroup = async (basePath: string, groupId: string): Promise<void> => {
  if (!basePath || !groupId) throw new Error("Missing required parameters")
  
  const groupRef = ref(db, `${basePath}/groups/${groupId}`)
  await remove(groupRef)
}

// ===== COURSES =====

export const fetchCourses = async (basePath: string): Promise<Course[]> => {
  if (!basePath) return []
  
  const coursesRef = ref(db, `${basePath}/courses`)
  try {
    const snapshot = await get(coursesRef)
    if (snapshot.exists()) {
      const courses = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Course, "id">),
      }))
      return courses
    }
    return []
  } catch (error) {
    console.error("Error fetching courses:", error)
    return []
  }
}

export const createCourse = async (basePath: string, course: Omit<Course, "id" | "createdAt" | "updatedAt">): Promise<Course> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const coursesRef = ref(db, `${basePath}/courses`)
  const newCourseRef = push(coursesRef)
  const courseId = newCourseRef.key || uuidv4()
  
  const now = Date.now()
  const newCourse = {
    ...course,
    id: courseId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newCourseRef, stripUndefined(newCourse))
  return newCourse as Course
}

export const updateCourse = async (basePath: string, courseId: string, updates: Partial<Course>): Promise<void> => {
  if (!basePath || !courseId) throw new Error("Missing required parameters")
  
  const courseRef = ref(db, `${basePath}/courses/${courseId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(courseRef, updatedFields)
}

export const deleteCourse = async (basePath: string, courseId: string): Promise<void> => {
  if (!basePath || !courseId) throw new Error("Missing required parameters")
  
  const courseRef = ref(db, `${basePath}/courses/${courseId}`)
  await remove(courseRef)
}

// ===== CARDS =====

export const fetchCards = async (basePath: string): Promise<Card[]> => {
  if (!basePath) return []
  
  const cardsRef = ref(db, `${basePath}/cards`)
  try {
    const snapshot = await get(cardsRef)
    if (snapshot.exists()) {
      const cards = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...(data as Omit<Card, "id">),
      }))
      return cards
    }
    return []
  } catch (error) {
    console.error("Error fetching cards:", error)
    return []
  }
}

export const createCard = async (basePath: string, card: Omit<Card, "id" | "createdAt" | "updatedAt">): Promise<Card> => {
  if (!basePath) throw new Error("Base path is missing")
  
  const cardsRef = ref(db, `${basePath}/cards`)
  const newCardRef = push(cardsRef)
  const cardId = newCardRef.key || uuidv4()
  
  const now = Date.now()
  const newCard = {
    ...card,
    id: cardId,
    createdAt: now,
    updatedAt: now,
  }
  
  await set(newCardRef, stripUndefined(newCard))
  return newCard as Card
}

export const updateCard = async (basePath: string, cardId: string, updates: Partial<Card>): Promise<void> => {
  if (!basePath || !cardId) throw new Error("Missing required parameters")
  
  const cardRef = ref(db, `${basePath}/cards/${cardId}`)
  const updatedFields = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  })

  await update(cardRef, updatedFields)
}

export const deleteCard = async (basePath: string, cardId: string): Promise<void> => {
  if (!basePath || !cardId) throw new Error("Missing required parameters")
  
  const cardRef = ref(db, `${basePath}/cards/${cardId}`)
  await remove(cardRef)
}

// ===== POS SETTINGS & INTEGRATIONS =====

export async function fetchPOSSettings(path: string): Promise<any | null> {
  try {
    const snapshot = await get(ref(db, path))
    return snapshot.exists() ? snapshot.val() : null
  } catch (err: any) {
    console.error("Error fetching POS settings:", err)
    return null
  }
}

export async function savePOSSettings(path: string, settings: any): Promise<void> {
  try {
    await update(ref(db, path), stripUndefined({ ...settings, updatedAt: Date.now() }))
  } catch (err: any) {
    console.error("Error saving POS settings:", err)
    throw err
  }
}

export async function fetchPOSIntegrations(path: string): Promise<any> {
  try {
    const snapshot = await get(ref(db, path))
    return snapshot.exists() ? (snapshot.val() || {}) : {}
  } catch (err: any) {
    console.error("Error fetching POS integrations:", err)
    return {}
  }
}

export async function savePOSIntegration(path: string, integration: any): Promise<void> {
  try {
    if (!path || !integration?.id) return
    const clean = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
    await set(ref(db, `${path}/${integration.id}`), clean)
  } catch (err: any) {
    console.error("Error saving POS integration:", err)
    throw err
  }
}
