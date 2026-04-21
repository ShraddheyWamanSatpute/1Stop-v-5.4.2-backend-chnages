import { 
  Bill, TillScreen, PaymentType, FloorPlan, Table, 
  Discount, Promotion, Correction, BagCheckItem, BagCheckConfig,
  Location, Device, PaymentIntegration, Ticket, TicketSale, 
  PaymentTransaction,
  Sale, Group, Course, Card 
} from '../interfaces/POS'
import * as rtPOS from '../data/POS'

// ===== BILLS =====

export const getBills = async (basePath: string): Promise<Bill[]> => {
  return await rtPOS.fetchBills(basePath)
}

export const createBill = async (basePath: string, bill: Omit<Bill, "id" | "createdAt" | "updatedAt">): Promise<Bill> => {
  return await rtPOS.createBill(basePath, bill)
}

export const updateBill = async (basePath: string, billId: string, updates: Partial<Bill>): Promise<void> => {
  return await rtPOS.updateBill(basePath, billId, updates)
}

export const deleteBill = async (basePath: string, billId: string): Promise<void> => {
  return await rtPOS.deleteBill(basePath, billId)
}

export const getTransactions = async (basePath: string): Promise<any[]> => {
  return await rtPOS.fetchTransactions(basePath)
}

// ===== TILL SCREENS =====

export const getTillScreens = async (basePath: string): Promise<TillScreen[]> => {
  return await rtPOS.fetchTillScreens(basePath)
}

export const createTillScreen = async (basePath: string, tillScreen: Omit<TillScreen, "id" | "createdAt" | "updatedAt">): Promise<TillScreen> => {
  return await rtPOS.createTillScreen(basePath, tillScreen)
}

export const updateTillScreen = async (basePath: string, tillScreenId: string, updates: Partial<TillScreen>): Promise<void> => {
  return await rtPOS.updateTillScreen(basePath, tillScreenId, updates)
}

export const deleteTillScreen = async (basePath: string, tillScreenId: string): Promise<void> => {
  return await rtPOS.deleteTillScreen(basePath, tillScreenId)
}

// ===== PAYMENT TYPES =====

export const getPaymentTypes = async (basePath: string): Promise<PaymentType[]> => {
  return await rtPOS.fetchPaymentTypes(basePath)
}

export const createPaymentType = async (basePath: string, paymentType: Omit<PaymentType, "id" | "createdAt" | "updatedAt">): Promise<PaymentType> => {
  return await rtPOS.createPaymentType(basePath, paymentType)
}

export const updatePaymentType = async (basePath: string, paymentTypeId: string, updates: Partial<PaymentType>): Promise<void> => {
  return await rtPOS.updatePaymentType(basePath, paymentTypeId, updates)
}

export const deletePaymentType = async (basePath: string, paymentTypeId: string): Promise<void> => {
  return await rtPOS.deletePaymentType(basePath, paymentTypeId)
}

// ===== FLOOR PLANS =====

export const getFloorPlans = async (basePath: string): Promise<FloorPlan[]> => {
  return await rtPOS.fetchFloorPlans(basePath)
}

export const createFloorPlan = async (basePath: string, floorPlan: Omit<FloorPlan, "id" | "createdAt" | "updatedAt">): Promise<FloorPlan> => {
  return await rtPOS.createFloorPlan(basePath, floorPlan)
}

export const updateFloorPlan = async (basePath: string, floorPlanId: string, updates: Partial<FloorPlan>): Promise<void> => {
  return await rtPOS.updateFloorPlan(basePath, floorPlanId, updates)
}

export const deleteFloorPlan = async (basePath: string, floorPlanId: string): Promise<void> => {
  return await rtPOS.deleteFloorPlan(basePath, floorPlanId)
}

// ===== TABLES =====

export const getTables = async (basePath: string): Promise<Table[]> => {
  return await rtPOS.fetchTables(basePath)
}

export const createTable = async (basePath: string, table: Omit<Table, "id" | "createdAt" | "updatedAt">): Promise<Table> => {
  return await rtPOS.createTable(basePath, table)
}

export const updateTable = async (basePath: string, tableId: string, updates: Partial<Table>): Promise<void> => {
  return await rtPOS.updateTable(basePath, tableId, updates)
}

export const deleteTable = async (basePath: string, tableId: string): Promise<void> => {
  return await rtPOS.deleteTable(basePath, tableId)
}

// ===== DISCOUNTS =====

export const getDiscounts = async (basePath: string): Promise<Discount[]> => {
  return await rtPOS.fetchDiscounts(basePath)
}

export const createDiscount = async (basePath: string, discount: Omit<Discount, "id" | "createdAt" | "updatedAt">): Promise<Discount> => {
  return await rtPOS.createDiscount(basePath, discount)
}

export const updateDiscount = async (basePath: string, discountId: string, updates: Partial<Discount>): Promise<void> => {
  return await rtPOS.updateDiscount(basePath, discountId, updates)
}

export const deleteDiscount = async (basePath: string, discountId: string): Promise<void> => {
  return await rtPOS.deleteDiscount(basePath, discountId)
}

// ===== PROMOTIONS =====

export const getPromotions = async (basePath: string): Promise<Promotion[]> => {
  return await rtPOS.fetchPromotions(basePath)
}

export const createPromotion = async (basePath: string, promotion: Omit<Promotion, "id" | "createdAt" | "updatedAt">): Promise<Promotion> => {
  return await rtPOS.createPromotion(basePath, promotion)
}

export const updatePromotion = async (basePath: string, promotionId: string, updates: Partial<Promotion>): Promise<void> => {
  return await rtPOS.updatePromotion(basePath, promotionId, updates)
}

export const deletePromotion = async (basePath: string, promotionId: string): Promise<void> => {
  return await rtPOS.deletePromotion(basePath, promotionId)
}

// ===== CORRECTIONS =====

export const getCorrections = async (basePath: string): Promise<Correction[]> => {
  return await rtPOS.fetchCorrections(basePath)
}

export const createCorrection = async (basePath: string, correction: Omit<Correction, "id" | "createdAt" | "updatedAt">): Promise<Correction> => {
  return await rtPOS.createCorrection(basePath, correction)
}

export const updateCorrection = async (basePath: string, correctionId: string, updates: Partial<Correction>): Promise<void> => {
  return await rtPOS.updateCorrection(basePath, correctionId, updates)
}

export const deleteCorrection = async (basePath: string, correctionId: string): Promise<void> => {
  return await rtPOS.deleteCorrection(basePath, correctionId)
}

// ===== BAG CHECK ITEMS =====

export const getBagCheckItems = async (basePath: string): Promise<BagCheckItem[]> => {
  return await rtPOS.fetchBagCheckItems(basePath)
}

export const createBagCheckItem = async (basePath: string, bagCheckItem: Omit<BagCheckItem, "id" | "createdAt" | "updatedAt">): Promise<BagCheckItem> => {
  return await rtPOS.createBagCheckItem(basePath, bagCheckItem)
}

export const updateBagCheckItem = async (basePath: string, bagCheckItemId: string, updates: Partial<BagCheckItem>): Promise<void> => {
  return await rtPOS.updateBagCheckItem(basePath, bagCheckItemId, updates)
}

export const deleteBagCheckItem = async (basePath: string, bagCheckItemId: string): Promise<void> => {
  return await rtPOS.deleteBagCheckItem(basePath, bagCheckItemId)
}

// ===== BAG CHECK CONFIG =====

export const getBagCheckConfig = async (basePath: string): Promise<BagCheckConfig | null> => {
  return await rtPOS.fetchBagCheckConfig(basePath)
}

export const updateBagCheckConfig = async (basePath: string, config: Partial<BagCheckConfig>): Promise<void> => {
  return await rtPOS.updateBagCheckConfig(basePath, config)
}

// ===== LOCATIONS =====

export const getLocations = async (basePath: string): Promise<Location[]> => {
  return await rtPOS.fetchLocations(basePath)
}

export const createLocation = async (basePath: string, location: Omit<Location, "id" | "createdAt" | "updatedAt">): Promise<Location> => {
  return await rtPOS.createLocation(basePath, location)
}

export const updateLocation = async (basePath: string, locationId: string, updates: Partial<Location>): Promise<void> => {
  return await rtPOS.updateLocation(basePath, locationId, updates)
}

export const deleteLocation = async (basePath: string, locationId: string): Promise<void> => {
  return await rtPOS.deleteLocation(basePath, locationId)
}

// ===== DEVICES =====

export const getDevices = async (basePath: string): Promise<Device[]> => {
  return await rtPOS.fetchDevices(basePath)
}

export const createDevice = async (basePath: string, device: Omit<Device, "id" | "createdAt" | "updatedAt">): Promise<Device> => {
  return await rtPOS.createDevice(basePath, device)
}

export const updateDevice = async (basePath: string, deviceId: string, updates: Partial<Device>): Promise<void> => {
  return await rtPOS.updateDevice(basePath, deviceId, updates)
}

export const deleteDevice = async (basePath: string, deviceId: string): Promise<void> => {
  return await rtPOS.deleteDevice(basePath, deviceId)
}

// ===== PAYMENT INTEGRATIONS =====

export const getPaymentIntegrations = async (basePath: string): Promise<PaymentIntegration[]> => {
  return await rtPOS.fetchPaymentIntegrations(basePath)
}

export const createPaymentIntegration = async (basePath: string, paymentIntegration: Omit<PaymentIntegration, "id" | "createdAt" | "updatedAt">): Promise<PaymentIntegration> => {
  return await rtPOS.createPaymentIntegration(basePath, paymentIntegration)
}

export const updatePaymentIntegration = async (basePath: string, paymentIntegrationId: string, updates: Partial<PaymentIntegration>): Promise<void> => {
  return await rtPOS.updatePaymentIntegration(basePath, paymentIntegrationId, updates)
}

export const deletePaymentIntegration = async (basePath: string, paymentIntegrationId: string): Promise<void> => {
  return await rtPOS.deletePaymentIntegration(basePath, paymentIntegrationId)
}

// ===== TICKETS =====

export const getTickets = async (basePath: string): Promise<Ticket[]> => {
  return await rtPOS.fetchTickets(basePath)
}

export const createTicket = async (basePath: string, ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt">): Promise<Ticket> => {
  return await rtPOS.createTicket(basePath, ticket)
}

export const updateTicket = async (basePath: string, ticketId: string, updates: Partial<Ticket>): Promise<void> => {
  return await rtPOS.updateTicket(basePath, ticketId, updates)
}

export const deleteTicket = async (basePath: string, ticketId: string): Promise<void> => {
  return await rtPOS.deleteTicket(basePath, ticketId)
}

// ===== TICKET SALES =====

export const getTicketSales = async (basePath: string): Promise<TicketSale[]> => {
  return await rtPOS.fetchTicketSales(basePath)
}

export const createTicketSale = async (basePath: string, ticketSale: Omit<TicketSale, "id" | "createdAt" | "updatedAt">): Promise<TicketSale> => {
  return await rtPOS.createTicketSale(basePath, ticketSale)
}

export const updateTicketSale = async (basePath: string, ticketSaleId: string, updates: Partial<TicketSale>): Promise<void> => {
  return await rtPOS.updateTicketSale(basePath, ticketSaleId, updates)
}

export const deleteTicketSale = async (basePath: string, ticketSaleId: string): Promise<void> => {
  return await rtPOS.deleteTicketSale(basePath, ticketSaleId)
}

// ===== PAYMENT TRANSACTIONS =====

export const getPaymentTransactions = async (basePath: string): Promise<PaymentTransaction[]> => {
  return await rtPOS.fetchPaymentTransactions(basePath)
}

export const getPaymentTransactionsByBill = async (basePath: string, billId: string): Promise<PaymentTransaction[]> => {
  return await rtPOS.fetchPaymentTransactionsByBill(basePath, billId)
}

export const createPaymentTransaction = async (
  basePath: string,
  tx: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">,
): Promise<PaymentTransaction> => {
  return await rtPOS.createPaymentTransaction(basePath, tx)
}

export const updatePaymentTransaction = async (
  basePath: string,
  txId: string,
  updates: Partial<PaymentTransaction>,
): Promise<void> => {
  return await rtPOS.updatePaymentTransaction(basePath, txId, updates)
}

export const deletePaymentTransaction = async (basePath: string, txId: string): Promise<void> => {
  return await rtPOS.deletePaymentTransaction(basePath, txId)
}

// ===== SALES =====

export const getSales = async (basePath: string): Promise<Sale[]> => {
  return await rtPOS.fetchSales(basePath)
}

export const createSale = async (basePath: string, sale: Omit<Sale, "id" | "createdAt">): Promise<Sale> => {
  return await rtPOS.createSale(basePath, sale)
}

export const getSalesByDateRange = async (basePath: string, startDate: number, endDate: number): Promise<Sale[]> => {
  return await rtPOS.fetchSalesByDateRange(basePath, startDate, endDate)
}

export const getSalesByProduct = async (basePath: string, productId: string): Promise<Sale[]> => {
  return await rtPOS.fetchSalesByProduct(basePath, productId)
}

// ===== GROUPS =====

export const getGroups = async (basePath: string): Promise<Group[]> => {
  return await rtPOS.fetchGroups(basePath)
}

export const createGroup = async (basePath: string, group: Omit<Group, "id" | "createdAt" | "updatedAt">): Promise<Group> => {
  return await rtPOS.createGroup(basePath, group)
}

export const updateGroup = async (basePath: string, groupId: string, updates: Partial<Group>): Promise<void> => {
  return await rtPOS.updateGroup(basePath, groupId, updates)
}

export const deleteGroup = async (basePath: string, groupId: string): Promise<void> => {
  return await rtPOS.deleteGroup(basePath, groupId)
}

// ===== COURSES =====

export const getCourses = async (basePath: string): Promise<any[]> => {
  return await rtPOS.fetchCourses(basePath)
}

export const createCourse = async (basePath: string, course: Omit<Course, "id" | "createdAt" | "updatedAt">): Promise<Course> => {
  return await rtPOS.createCourse(basePath, course)
}

export const updateCourse = async (basePath: string, courseId: string, updates: Partial<Course>): Promise<void> => {
  return await rtPOS.updateCourse(basePath, courseId, updates)
}

export const deleteCourse = async (basePath: string, courseId: string): Promise<void> => {
  return await rtPOS.deleteCourse(basePath, courseId)
}

// ===== CARDS =====

export const getCards = async (basePath: string): Promise<Card[]> => {
  return await rtPOS.fetchCards(basePath)
}

export const createCard = async (basePath: string, card: Omit<Card, "id" | "createdAt" | "updatedAt">): Promise<Card> => {
  return await rtPOS.createCard(basePath, card)
}

export const updateCard = async (basePath: string, cardId: string, updates: Partial<Card>): Promise<void> => {
  return await rtPOS.updateCard(basePath, cardId, updates)
}

export const deleteCard = async (basePath: string, cardId: string): Promise<void> => {
  return await rtPOS.deleteCard(basePath, cardId)
}