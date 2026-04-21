import * as firebaseProvider from "../../rtdatabase/POS"
import { authedDataFetch } from "./http"

export * from "../../rtdatabase/POS"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const listEntity = async <T>(entity: string, basePath: string): Promise<T[]> => {
  const result = await authedDataFetch(`/pos/entities/${encodeURIComponent(entity)}${query({ basePath })}`, {
    method: "GET",
  })
  return (result?.rows || []) as T[]
}

const createEntity = async <T>(entity: string, basePath: string, data: any): Promise<T> => {
  const result = await authedDataFetch(`/pos/entities/${encodeURIComponent(entity)}`, {
    method: "POST",
    body: JSON.stringify({ basePath, data }),
  })
  return (result?.row || { ...data, id: result?.id }) as T
}

const updateEntity = async (entity: string, basePath: string, id: string, updates: any): Promise<void> => {
  await authedDataFetch(`/pos/entities/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

const deleteEntity = async (entity: string, basePath: string, id: string): Promise<void> => {
  await authedDataFetch(`/pos/entities/${encodeURIComponent(entity)}/${encodeURIComponent(id)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

const fetchSingletonEntity = async <T>(entity: string, basePath: string): Promise<T | null> => {
  const rows = await listEntity<T>(entity, basePath)
  return rows[0] || null
}

const upsertSingletonEntity = async <T extends { id?: string }>(
  entity: string,
  basePath: string,
  data: Partial<T>,
  singletonId = "config",
): Promise<void> => {
  const existing = await fetchSingletonEntity<T>(entity, basePath)
  if (existing?.id) {
    await updateEntity(entity, basePath, existing.id, data)
    return
  }
  await createEntity(entity, basePath, { ...data, id: singletonId })
}

export const fetchBills: typeof firebaseProvider.fetchBills = async (basePath: string) =>
  listEntity("bills", basePath)

export const fetchOpenBills: typeof firebaseProvider.fetchOpenBills = async (basePath: string) =>
  (await fetchBills(basePath)).filter((bill: any) => bill.status === "open")

export const fetchClosedBills: typeof firebaseProvider.fetchClosedBills = async (basePath: string) =>
  (await fetchBills(basePath)).filter((bill: any) => bill.status === "closed" || bill.status === "paid")

export const fetchTransactions: typeof firebaseProvider.fetchTransactions = async (basePath: string) =>
  listEntity("transactions", basePath)

export const createBill: typeof firebaseProvider.createBill = async (basePath: string, bill) =>
  createEntity("bills", basePath, bill)

export const updateBill: typeof firebaseProvider.updateBill = async (basePath: string, billId: string, updates) =>
  updateEntity("bills", basePath, billId, updates)

export const deleteBill: typeof firebaseProvider.deleteBill = async (basePath: string, billId: string) =>
  deleteEntity("bills", basePath, billId)

export const fetchTillScreens: typeof firebaseProvider.fetchTillScreens = async (basePath: string) =>
  listEntity("tillscreens", basePath)

export const createTillScreen: typeof firebaseProvider.createTillScreen = async (basePath: string, tillScreen) =>
  createEntity("tillscreens", basePath, tillScreen)

export const updateTillScreen: typeof firebaseProvider.updateTillScreen = async (
  basePath: string,
  tillScreenId: string,
  updates,
) => updateEntity("tillscreens", basePath, tillScreenId, updates)

export const deleteTillScreen: typeof firebaseProvider.deleteTillScreen = async (
  basePath: string,
  tillScreenId: string,
) => deleteEntity("tillscreens", basePath, tillScreenId)

export const fetchPaymentTypes: typeof firebaseProvider.fetchPaymentTypes = async (basePath: string) =>
  listEntity("paymentTypes", basePath)

export const createPaymentType: typeof firebaseProvider.createPaymentType = async (basePath: string, paymentType) =>
  createEntity("paymentTypes", basePath, paymentType)

export const updatePaymentType: typeof firebaseProvider.updatePaymentType = async (
  basePath: string,
  paymentTypeId: string,
  updates,
) => updateEntity("paymentTypes", basePath, paymentTypeId, updates)

export const deletePaymentType: typeof firebaseProvider.deletePaymentType = async (
  basePath: string,
  paymentTypeId: string,
) => deleteEntity("paymentTypes", basePath, paymentTypeId)

export const fetchFloorPlans: typeof firebaseProvider.fetchFloorPlans = async (basePath: string) =>
  listEntity("floorplans", basePath)

export const createFloorPlan: typeof firebaseProvider.createFloorPlan = async (basePath: string, floorPlan) =>
  createEntity("floorplans", basePath, floorPlan)

export const updateFloorPlan: typeof firebaseProvider.updateFloorPlan = async (
  basePath: string,
  floorPlanId: string,
  updates,
) => updateEntity("floorplans", basePath, floorPlanId, updates)

export const deleteFloorPlan: typeof firebaseProvider.deleteFloorPlan = async (
  basePath: string,
  floorPlanId: string,
) => deleteEntity("floorplans", basePath, floorPlanId)

export const fetchTables: typeof firebaseProvider.fetchTables = async (basePath: string) =>
  listEntity("tables", basePath)

export const createTable: typeof firebaseProvider.createTable = async (basePath: string, table) =>
  createEntity("tables", basePath, table)

export const updateTable: typeof firebaseProvider.updateTable = async (basePath: string, tableId: string, updates) =>
  updateEntity("tables", basePath, tableId, updates)

export const deleteTable: typeof firebaseProvider.deleteTable = async (basePath: string, tableId: string) =>
  deleteEntity("tables", basePath, tableId)

export const fetchDiscounts: typeof firebaseProvider.fetchDiscounts = async (basePath: string) =>
  listEntity("discounts", basePath)

export const createDiscount: typeof firebaseProvider.createDiscount = async (basePath: string, discount) =>
  createEntity("discounts", basePath, discount)

export const updateDiscount: typeof firebaseProvider.updateDiscount = async (
  basePath: string,
  discountId: string,
  updates,
) => updateEntity("discounts", basePath, discountId, updates)

export const deleteDiscount: typeof firebaseProvider.deleteDiscount = async (basePath: string, discountId: string) =>
  deleteEntity("discounts", basePath, discountId)

export const fetchPromotions: typeof firebaseProvider.fetchPromotions = async (basePath: string) =>
  listEntity("promotions", basePath)

export const createPromotion: typeof firebaseProvider.createPromotion = async (basePath: string, promotion) =>
  createEntity("promotions", basePath, promotion)

export const updatePromotion: typeof firebaseProvider.updatePromotion = async (
  basePath: string,
  promotionId: string,
  updates,
) => updateEntity("promotions", basePath, promotionId, updates)

export const deletePromotion: typeof firebaseProvider.deletePromotion = async (
  basePath: string,
  promotionId: string,
) => deleteEntity("promotions", basePath, promotionId)

export const fetchCorrections: typeof firebaseProvider.fetchCorrections = async (basePath: string) =>
  listEntity("corrections", basePath)

export const createCorrection: typeof firebaseProvider.createCorrection = async (basePath: string, correction) =>
  createEntity("corrections", basePath, correction)

export const updateCorrection: typeof firebaseProvider.updateCorrection = async (
  basePath: string,
  correctionId: string,
  updates,
) => updateEntity("corrections", basePath, correctionId, updates)

export const deleteCorrection: typeof firebaseProvider.deleteCorrection = async (
  basePath: string,
  correctionId: string,
) => deleteEntity("corrections", basePath, correctionId)

export const fetchBagCheckItems: typeof firebaseProvider.fetchBagCheckItems = async (basePath: string) =>
  listEntity("bagCheckItems", basePath)

export const createBagCheckItem: typeof firebaseProvider.createBagCheckItem = async (basePath: string, bagCheckItem) =>
  createEntity("bagCheckItems", basePath, bagCheckItem)

export const updateBagCheckItem: typeof firebaseProvider.updateBagCheckItem = async (
  basePath: string,
  bagCheckItemId: string,
  updates,
) => updateEntity("bagCheckItems", basePath, bagCheckItemId, updates)

export const deleteBagCheckItem: typeof firebaseProvider.deleteBagCheckItem = async (
  basePath: string,
  bagCheckItemId: string,
) => deleteEntity("bagCheckItems", basePath, bagCheckItemId)

export const fetchBagCheckConfig: typeof firebaseProvider.fetchBagCheckConfig = async (basePath: string) =>
  fetchSingletonEntity("bagCheckConfig", basePath)

export const updateBagCheckConfig: typeof firebaseProvider.updateBagCheckConfig = async (
  basePath: string,
  config,
) => upsertSingletonEntity("bagCheckConfig", basePath, config)

export const fetchLocations: typeof firebaseProvider.fetchLocations = async (basePath: string) =>
  listEntity("locations", basePath)

export const createLocation: typeof firebaseProvider.createLocation = async (basePath: string, location) =>
  createEntity("locations", basePath, location)

export const updateLocation: typeof firebaseProvider.updateLocation = async (
  basePath: string,
  locationId: string,
  updates,
) => updateEntity("locations", basePath, locationId, updates)

export const deleteLocation: typeof firebaseProvider.deleteLocation = async (basePath: string, locationId: string) =>
  deleteEntity("locations", basePath, locationId)

export const fetchDevices: typeof firebaseProvider.fetchDevices = async (basePath: string) =>
  listEntity("devices", basePath)

export const createDevice: typeof firebaseProvider.createDevice = async (basePath: string, device) =>
  createEntity("devices", basePath, device)

export const updateDevice: typeof firebaseProvider.updateDevice = async (
  basePath: string,
  deviceId: string,
  updates,
) => updateEntity("devices", basePath, deviceId, updates)

export const deleteDevice: typeof firebaseProvider.deleteDevice = async (basePath: string, deviceId: string) =>
  deleteEntity("devices", basePath, deviceId)

export const fetchPaymentIntegrations: typeof firebaseProvider.fetchPaymentIntegrations = async (basePath: string) =>
  listEntity("paymentIntegrations", basePath)

export const createPaymentIntegration: typeof firebaseProvider.createPaymentIntegration = async (
  basePath: string,
  paymentIntegration,
) => createEntity("paymentIntegrations", basePath, paymentIntegration)

export const updatePaymentIntegration: typeof firebaseProvider.updatePaymentIntegration = async (
  basePath: string,
  paymentIntegrationId: string,
  updates,
) => updateEntity("paymentIntegrations", basePath, paymentIntegrationId, updates)

export const deletePaymentIntegration: typeof firebaseProvider.deletePaymentIntegration = async (
  basePath: string,
  paymentIntegrationId: string,
) => deleteEntity("paymentIntegrations", basePath, paymentIntegrationId)

export const fetchTickets: typeof firebaseProvider.fetchTickets = async (basePath: string) =>
  listEntity("tickets", basePath)

export const createTicket: typeof firebaseProvider.createTicket = async (basePath: string, ticket) =>
  createEntity("tickets", basePath, ticket)

export const updateTicket: typeof firebaseProvider.updateTicket = async (basePath: string, ticketId: string, updates) =>
  updateEntity("tickets", basePath, ticketId, updates)

export const deleteTicket: typeof firebaseProvider.deleteTicket = async (basePath: string, ticketId: string) =>
  deleteEntity("tickets", basePath, ticketId)

export const fetchTicketSales: typeof firebaseProvider.fetchTicketSales = async (basePath: string) =>
  listEntity("ticketSales", basePath)

export const createTicketSale: typeof firebaseProvider.createTicketSale = async (basePath: string, ticketSale) =>
  createEntity("ticketSales", basePath, ticketSale)

export const updateTicketSale: typeof firebaseProvider.updateTicketSale = async (
  basePath: string,
  ticketSaleId: string,
  updates,
) => updateEntity("ticketSales", basePath, ticketSaleId, updates)

export const deleteTicketSale: typeof firebaseProvider.deleteTicketSale = async (
  basePath: string,
  ticketSaleId: string,
) => deleteEntity("ticketSales", basePath, ticketSaleId)

export const fetchPaymentTransactions: typeof firebaseProvider.fetchPaymentTransactions = async (basePath: string) =>
  listEntity("paymentTransactions", basePath)

export const fetchPaymentTransactionsByBill: typeof firebaseProvider.fetchPaymentTransactionsByBill = async (
  basePath: string,
  billId: string,
) => (await fetchPaymentTransactions(basePath)).filter((tx: any) => tx.billId === billId)

export const createPaymentTransaction: typeof firebaseProvider.createPaymentTransaction = async (
  basePath: string,
  tx,
) => createEntity("paymentTransactions", basePath, tx)

export const updatePaymentTransaction: typeof firebaseProvider.updatePaymentTransaction = async (
  basePath: string,
  txId: string,
  updates,
) => updateEntity("paymentTransactions", basePath, txId, updates)

export const deletePaymentTransaction: typeof firebaseProvider.deletePaymentTransaction = async (
  basePath: string,
  txId: string,
) => deleteEntity("paymentTransactions", basePath, txId)

export const fetchSales: typeof firebaseProvider.fetchSales = async (basePath: string) =>
  listEntity("sales", basePath)

export const createSale: typeof firebaseProvider.createSale = async (basePath: string, sale) =>
  createEntity("sales", basePath, sale)

export const fetchSalesByDateRange: typeof firebaseProvider.fetchSalesByDateRange = async (
  basePath: string,
  startDate: number,
  endDate: number,
) => (await fetchSales(basePath)).filter((sale: any) => Number(sale.createdAt || 0) >= startDate && Number(sale.createdAt || 0) <= endDate)

export const fetchSalesByProduct: typeof firebaseProvider.fetchSalesByProduct = async (
  basePath: string,
  productId: string,
) => (await fetchSales(basePath)).filter((sale: any) => sale.productId === productId)

export const fetchGroups: typeof firebaseProvider.fetchGroups = async (basePath: string) =>
  listEntity("groups", basePath)

export const createGroup: typeof firebaseProvider.createGroup = async (basePath: string, group) =>
  createEntity("groups", basePath, group)

export const updateGroup: typeof firebaseProvider.updateGroup = async (basePath: string, groupId: string, updates) =>
  updateEntity("groups", basePath, groupId, updates)

export const deleteGroup: typeof firebaseProvider.deleteGroup = async (basePath: string, groupId: string) =>
  deleteEntity("groups", basePath, groupId)

export const fetchCourses: typeof firebaseProvider.fetchCourses = async (basePath: string) =>
  listEntity("courses", basePath)

export const createCourse: typeof firebaseProvider.createCourse = async (basePath: string, course) =>
  createEntity("courses", basePath, course)

export const updateCourse: typeof firebaseProvider.updateCourse = async (basePath: string, courseId: string, updates) =>
  updateEntity("courses", basePath, courseId, updates)

export const deleteCourse: typeof firebaseProvider.deleteCourse = async (basePath: string, courseId: string) =>
  deleteEntity("courses", basePath, courseId)

export const fetchCards: typeof firebaseProvider.fetchCards = async (basePath: string) =>
  listEntity("cards", basePath)

export const createCard: typeof firebaseProvider.createCard = async (basePath: string, card) =>
  createEntity("cards", basePath, card)

export const updateCard: typeof firebaseProvider.updateCard = async (basePath: string, cardId: string, updates) =>
  updateEntity("cards", basePath, cardId, updates)

export const deleteCard: typeof firebaseProvider.deleteCard = async (basePath: string, cardId: string) =>
  deleteEntity("cards", basePath, cardId)

// ===== POS SETTINGS & INTEGRATIONS =====

export const fetchPOSSettings: typeof firebaseProvider.fetchPOSSettings = async (path: string) => {
  const result = await authedDataFetch(`/pos/settings${query({ path })}`, { method: "GET" })
  return result || null
}

export const savePOSSettings: typeof firebaseProvider.savePOSSettings = async (path: string, settings: any) => {
  await authedDataFetch(`/pos/settings`, {
    method: "PUT",
    body: JSON.stringify({ path, settings: { ...settings, updatedAt: Date.now() } }),
  })
}

export const fetchPOSIntegrations: typeof firebaseProvider.fetchPOSIntegrations = async (path: string) => {
  const result = await authedDataFetch(`/pos/integrations${query({ path })}`, { method: "GET" })
  return result || {}
}

export const savePOSIntegration: typeof firebaseProvider.savePOSIntegration = async (path: string, integration: any) => {
  if (!path || !integration?.id) return
  const clean = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
  await authedDataFetch(`/pos/integrations/${encodeURIComponent(integration.id)}`, {
    method: "PUT",
    body: JSON.stringify({ path, integration: clean }),
  })
}
