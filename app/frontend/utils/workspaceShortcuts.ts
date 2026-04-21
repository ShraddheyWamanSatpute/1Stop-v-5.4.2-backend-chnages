export type WorkspaceShortcutKind = "page" | "form"

export type WorkspaceShortcutIcon =
  | "dashboard"
  | "finance"
  | "stock"
  | "settings"
  | "company"
  | "bookings"
  | "hr"
  | "messenger"
  | "pos"
  | "supply"
  | "account"
  | "journal"
  | "bank"
  | "rule"
  | "transfer"
  | "budget"
  | "contact"
  | "currency"
  | "invoice"
  | "quote"
  | "bill"
  | "expense"
  | "product"
  | "purchaseOrder"
  | "stockCount"
  | "parLevel"
  | "favorites"
  | "recents"

export interface WorkspaceShortcut {
  key: string
  label: string
  kind: WorkspaceShortcutKind
  path: string
  search?: string
  description?: string
  icon?: WorkspaceShortcutIcon
  recentAt?: number
}

type ShortcutSeed = Omit<WorkspaceShortcut, "kind">

const createPageShortcut = (shortcut: ShortcutSeed): WorkspaceShortcut => ({
  ...shortcut,
  kind: "page",
})

const createFormShortcut = (shortcut: ShortcutSeed): WorkspaceShortcut => ({
  ...shortcut,
  kind: "form",
})

const LEGACY_ROUTE_METADATA: Array<{ path: string; label: string; icon: WorkspaceShortcutIcon }> = [
  { path: "/Finance", label: "Finance", icon: "finance" },
  { path: "/Stock", label: "Stock", icon: "stock" },
  { path: "/Company", label: "Company", icon: "company" },
  { path: "/Bookings", label: "Bookings", icon: "bookings" },
  { path: "/HR", label: "HR", icon: "hr" },
  { path: "/POS", label: "POS", icon: "pos" },
  { path: "/Supply", label: "Supply", icon: "supply" },
  { path: "/Settings", label: "Settings", icon: "settings" },
  { path: "/Stock/PurchaseOrders", label: "Purchases", icon: "stock" },
]

const CRUD_ENTITY_LABELS: Record<string, string> = {
  account: "Account",
  journal: "Manual Journal",
  bankAccount: "Bank Account",
  bankRule: "Bank Rule",
  bankTransfer: "Bank Transfer",
  clearingAccount: "Clearing Account",
  statementImport: "Statement Import",
  budget: "Budget",
  contact: "Contact",
  currency: "Currency",
  bill: "Bill",
  expense: "Expense",
  invoice: "Invoice",
  quote: "Quote",
  product: "Stock Item",
  purchaseOrder: "Purchase Order",
  stockCount: "Stock Count",
  parLevel: "Par Level",
}

const CRUD_ENTITY_ICONS: Record<string, WorkspaceShortcutIcon> = {
  account: "account",
  journal: "journal",
  bankAccount: "bank",
  bankRule: "rule",
  bankTransfer: "transfer",
  clearingAccount: "bank",
  statementImport: "bank",
  budget: "budget",
  contact: "contact",
  currency: "currency",
  bill: "bill",
  expense: "bill",
  invoice: "invoice",
  quote: "quote",
  product: "product",
  purchaseOrder: "purchaseOrder",
  stockCount: "stockCount",
  parLevel: "parLevel",
}

const MODE_LABELS: Record<string, string> = {
  create: "New",
  edit: "Edit",
  view: "View",
}

export const pageShortcutCatalog: WorkspaceShortcut[] = [
  createPageShortcut({ key: "page:dashboard", label: "Dashboard", path: "/Dashboard", icon: "dashboard" }),
  createPageShortcut({ key: "page:analytics", label: "Analytics", path: "/Analytics", icon: "dashboard" }),
  createPageShortcut({ key: "page:notifications", label: "Notifications", path: "/Notifications", icon: "settings" }),

  createPageShortcut({ key: "page:stock-items", label: "Items", path: "/Stock/Items", icon: "stock" }),
  createPageShortcut({ key: "page:stock-purchases", label: "Purchases", path: "/Stock/PurchaseOrders", icon: "stock" }),
  createPageShortcut({ key: "page:stock-stock-counts", label: "Stock Counts", path: "/Stock/StockCounts", icon: "stock" }),
  createPageShortcut({ key: "page:stock-transfers", label: "Transfers", path: "/Stock/Transfers", icon: "stock" }),
  createPageShortcut({ key: "page:stock-par-levels", label: "Par Levels", path: "/Stock/ParLevels", icon: "stock" }),
  createPageShortcut({ key: "page:stock-management", label: "Management", path: "/Stock/Management", icon: "stock" }),
  createPageShortcut({ key: "page:stock-management-categories", label: "Categories", path: "/Stock/Management/Categories", icon: "stock" }),
  createPageShortcut({ key: "page:stock-management-suppliers", label: "Suppliers", path: "/Stock/Management/Suppliers", icon: "stock" }),
  createPageShortcut({ key: "page:stock-management-locations", label: "Locations", path: "/Stock/Management/Locations", icon: "stock" }),
  createPageShortcut({ key: "page:stock-management-measures", label: "Measures", path: "/Stock/Management/Measures", icon: "stock" }),
  createPageShortcut({ key: "page:stock-management-courses", label: "Courses", path: "/Stock/Management/Courses", icon: "stock" }),
  createPageShortcut({ key: "page:stock-reports", label: "Reports", path: "/Stock/Reports", icon: "stock" }),
  createPageShortcut({ key: "page:stock-order", label: "Order", path: "/Stock/Order", icon: "stock" }),
  createPageShortcut({ key: "page:stock-order-delivery", label: "Order Delivery", path: "/Stock/OrderDelivery", icon: "stock" }),
  createPageShortcut({ key: "page:stock-settings", label: "Settings", path: "/Stock/Settings", icon: "stock" }),

  createPageShortcut({ key: "page:finance-dashboard", label: "Dashboard", path: "/Finance/Dashboard", icon: "finance" }),
  createPageShortcut({ key: "page:finance-sales", label: "Sales", path: "/Finance/Sales", icon: "finance" }),
  createPageShortcut({ key: "page:finance-banking", label: "Banking", path: "/Finance/Banking", icon: "finance" }),
  createPageShortcut({ key: "page:finance-purchases", label: "Purchases", path: "/Finance/Purchases", icon: "finance" }),
  createPageShortcut({ key: "page:finance-expenses", label: "Expenses", path: "/Finance/Expenses", icon: "finance" }),
  createPageShortcut({ key: "page:finance-contacts", label: "Contacts", path: "/Finance/Contacts", icon: "finance" }),
  createPageShortcut({ key: "page:finance-accounting", label: "Accounting", path: "/Finance/Accounting", icon: "finance" }),
  createPageShortcut({ key: "page:finance-currency", label: "Currency", path: "/Finance/Currency", icon: "finance" }),
  createPageShortcut({ key: "page:finance-budgeting", label: "Budgeting", path: "/Finance/Budgeting", icon: "finance" }),
  createPageShortcut({ key: "page:finance-forecasting", label: "Forecasting", path: "/Finance/Forecasting", icon: "finance" }),
  createPageShortcut({ key: "page:finance-reports", label: "Reports", path: "/Finance/Reports", icon: "finance" }),
  createPageShortcut({ key: "page:finance-settings", label: "Settings", path: "/Finance/Settings", icon: "finance" }),

  createPageShortcut({ key: "page:company-dashboard", label: "Dashboard", path: "/Company/Dashboard", icon: "company" }),
  createPageShortcut({ key: "page:company-info", label: "Company Info", path: "/Company/Info", icon: "company" }),
  createPageShortcut({ key: "page:company-site-management", label: "Site Management", path: "/Company/SiteManagement", icon: "company" }),
  createPageShortcut({ key: "page:company-user-allocation", label: "User Allocation", path: "/Company/UserAllocation", icon: "company" }),
  createPageShortcut({ key: "page:company-permissions", label: "Permissions", path: "/Company/Permissions", icon: "company" }),
  createPageShortcut({ key: "page:company-checklists", label: "Checklists", path: "/Company/Checklists", icon: "company" }),
  createPageShortcut({ key: "page:company-checklist-history", label: "Checklist History", path: "/Company/ChecklistHistory", icon: "company" }),
  createPageShortcut({ key: "page:company-checklist-types", label: "Checklist Types", path: "/Company/ChecklistTypes", icon: "company" }),
  createPageShortcut({ key: "page:company-my-checklists", label: "My Checklists", path: "/Company/MyChecklist", icon: "company" }),
  createPageShortcut({ key: "page:company-reports", label: "Reports", path: "/Company/Reports", icon: "company" }),
  createPageShortcut({ key: "page:company-settings", label: "Settings", path: "/Company/Settings", icon: "company" }),

  createPageShortcut({ key: "page:bookings-dashboard", label: "Dashboard", path: "/Bookings/Dashboard", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-list", label: "Bookings List", path: "/Bookings/List", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-calendar", label: "Calendar", path: "/Bookings/Calendar", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-diary", label: "Diary", path: "/Bookings/Diary", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-floor-plan", label: "Floor Plan", path: "/Bookings/FloorPlan", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-waitlist", label: "Waitlist", path: "/Bookings/Waitlist", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-tables", label: "Tables", path: "/Bookings/Tables", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-locations", label: "Locations", path: "/Bookings/Locations", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-types", label: "Booking Types", path: "/Bookings/BookingTypes", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-preorder-profiles", label: "Preorder Profiles", path: "/Bookings/PreorderProfiles", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-status", label: "Status", path: "/Bookings/Status", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-tags", label: "Tags", path: "/Bookings/Tags", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-reports", label: "Reports", path: "/Bookings/Reports", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-tools", label: "Tools", path: "/Bookings/Tools", icon: "bookings" }),
  createPageShortcut({ key: "page:bookings-settings", label: "Settings", path: "/Bookings/Settings", icon: "bookings" }),

  createPageShortcut({ key: "page:hr-dashboard", label: "Dashboard", path: "/HR/Dashboard", icon: "hr" }),
  createPageShortcut({ key: "page:hr-employees", label: "Employees", path: "/HR/Employees", icon: "hr" }),
  createPageShortcut({ key: "page:hr-scheduling", label: "Scheduling", path: "/HR/Scheduling", icon: "hr" }),
  createPageShortcut({ key: "page:hr-time-off", label: "Time Off", path: "/HR/TimeOff", icon: "hr" }),
  createPageShortcut({ key: "page:hr-payroll", label: "Payroll", path: "/HR/Payroll", icon: "hr" }),
  createPageShortcut({ key: "page:hr-self-service", label: "Self Service", path: "/HR/SelfService", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management", label: "Management", path: "/HR/Management", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-contracts", label: "Contracts", path: "/HR/Management/Contracts", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-performance", label: "Staff Performance", path: "/HR/Management/Performance", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-recruitment", label: "Recruitment", path: "/HR/Management/Recruitment", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-warnings", label: "Warnings", path: "/HR/Management/Warnings", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-roles", label: "Roles", path: "/HR/Management/Roles", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-departments", label: "Departments", path: "/HR/Management/Departments", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-announcements", label: "Announcements", path: "/HR/Management/Announcements", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-benefits", label: "Benefits", path: "/HR/Management/Benefits", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-risk", label: "Risk & Compliance", path: "/HR/Management/Risk", icon: "hr" }),
  createPageShortcut({ key: "page:hr-management-events", label: "Events", path: "/HR/Management/Events", icon: "hr" }),
  createPageShortcut({ key: "page:hr-reports", label: "Reports", path: "/HR/Reports", icon: "hr" }),
  createPageShortcut({ key: "page:hr-settings", label: "Settings", path: "/HR/Settings", icon: "hr" }),

  createPageShortcut({ key: "page:pos-sales", label: "Sales", path: "/POS/ItemSales", icon: "pos" }),
  createPageShortcut({ key: "page:pos-bills", label: "Bills", path: "/POS/Bills", icon: "pos" }),
  createPageShortcut({ key: "page:pos-floor-plan", label: "Floor Plan", path: "/POS/FloorPlan", icon: "pos" }),
  createPageShortcut({ key: "page:pos-items", label: "Items", path: "/POS/Items", icon: "pos" }),
  createPageShortcut({ key: "page:pos-till-screens", label: "Till Screens", path: "/POS/TillScreens", icon: "pos" }),
  createPageShortcut({ key: "page:pos-tickets", label: "Tickets", path: "/POS/Tickets", icon: "pos" }),
  createPageShortcut({ key: "page:pos-bag-check", label: "Bag Check", path: "/POS/BagCheck", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management", label: "Management", path: "/POS/Management", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-devices", label: "Devices", path: "/POS/Management/Devices", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-locations", label: "Locations", path: "/POS/Management/Locations", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-payments", label: "Payments", path: "/POS/Management/Payments", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-categories", label: "Categories", path: "/POS/Management/Categories", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-tables", label: "Tables", path: "/POS/Management/Tables", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-courses", label: "Courses", path: "/POS/Management/Courses", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-corrections", label: "Corrections", path: "/POS/Management/Corrections", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-discounts", label: "Discounts", path: "/POS/Management/Discounts", icon: "pos" }),
  createPageShortcut({ key: "page:pos-management-promotions", label: "Promotions", path: "/POS/Management/Promotions", icon: "pos" }),
  createPageShortcut({ key: "page:pos-reports", label: "Reports", path: "/POS/Reports", icon: "pos" }),
  createPageShortcut({ key: "page:pos-settings", label: "Settings", path: "/POS/Settings", icon: "pos" }),
  createPageShortcut({ key: "page:pos-till-usage", label: "Till Usage", path: "/POS/Management/TillUsage", icon: "pos" }),

  createPageShortcut({ key: "page:supply-dashboard", label: "Dashboard", path: "/Supply/Dashboard", icon: "supply" }),
  createPageShortcut({ key: "page:supply-clients", label: "Clients", path: "/Supply/Clients", icon: "supply" }),
  createPageShortcut({ key: "page:supply-client-invite", label: "Client Invite", path: "/Supply/ClientInvite", icon: "supply" }),
  createPageShortcut({ key: "page:supply-orders", label: "Orders", path: "/Supply/Orders", icon: "supply" }),
  createPageShortcut({ key: "page:supply-deliveries", label: "Deliveries", path: "/Supply/Deliveries", icon: "supply" }),
  createPageShortcut({ key: "page:supply-reports", label: "Reports", path: "/Supply/Reports", icon: "supply" }),
  createPageShortcut({ key: "page:supply-settings", label: "Settings", path: "/Supply/Settings", icon: "supply" }),

  createPageShortcut({ key: "page:messenger", label: "Messenger", path: "/Messenger", icon: "messenger" }),

  createPageShortcut({ key: "page:settings-personal", label: "Personal Info", path: "/Settings/Personal", icon: "settings" }),
  createPageShortcut({ key: "page:settings-account", label: "Account & Security", path: "/Settings/Account", icon: "settings" }),
  createPageShortcut({ key: "page:settings-preferences", label: "Preferences", path: "/Settings/Preferences", icon: "settings" }),
  createPageShortcut({ key: "page:settings-navigation", label: "Navigation", path: "/Settings/Navigation", icon: "settings" }),
  createPageShortcut({ key: "page:settings-companies", label: "Companies", path: "/Settings/Companies", icon: "settings" }),
]

export const formShortcutCatalog: WorkspaceShortcut[] = [
  createFormShortcut({ key: "form:stock-item-create", label: "New Stock Item", path: "/Stock/Items", search: "crudEntity=product&crudMode=create", icon: "product" }),
  createFormShortcut({ key: "form:stock-purchase-order-create", label: "New Purchase Order", path: "/Stock/PurchaseOrders", search: "crudEntity=purchaseOrder&crudMode=create", icon: "purchaseOrder" }),
  createFormShortcut({ key: "form:stock-count-create", label: "New Stock Count", path: "/Stock/StockCounts", search: "crudEntity=stockCount&crudMode=create", icon: "stockCount" }),
  createFormShortcut({ key: "form:stock-par-level-create", label: "New Par Level", path: "/Stock/ParLevels", search: "crudEntity=parLevel&crudMode=create", icon: "parLevel" }),
  createFormShortcut({ key: "form:stock-add-item-page", label: "Add Item Page", path: "/Stock/AddItem", icon: "product" }),
  createFormShortcut({ key: "form:stock-add-stock-count-page", label: "Add Stock Count Page", path: "/Stock/AddStockCount", icon: "stockCount" }),
  createFormShortcut({ key: "form:stock-add-purchase-page", label: "Add Purchase Page", path: "/Stock/AddPurchase", icon: "purchaseOrder" }),
  createFormShortcut({ key: "form:stock-add-par-level-page", label: "Add Par Level Page", path: "/Stock/AddParLevel", icon: "parLevel" }),

  createFormShortcut({ key: "form:finance-account-create", label: "New Account", path: "/Finance/Accounting", search: "crudEntity=account&crudMode=create", icon: "account" }),
  createFormShortcut({ key: "form:finance-journal-create", label: "New Manual Journal", path: "/Finance/Accounting", search: "crudEntity=journal&crudMode=create", icon: "journal" }),
  createFormShortcut({ key: "form:finance-budget-create", label: "New Budget", path: "/Finance/Budgeting", search: "crudEntity=budget&crudMode=create", icon: "budget" }),
  createFormShortcut({ key: "form:finance-bank-account-create", label: "New Bank Account", path: "/Finance/Banking", search: "crudEntity=bankAccount&crudMode=create", icon: "bank" }),
  createFormShortcut({ key: "form:finance-bank-rule-create", label: "New Bank Rule", path: "/Finance/Banking", search: "crudEntity=bankRule&crudMode=create", icon: "rule" }),
  createFormShortcut({ key: "form:finance-bank-transfer-create", label: "New Bank Transfer", path: "/Finance/Banking", search: "crudEntity=bankTransfer&crudMode=create", icon: "transfer" }),
  createFormShortcut({ key: "form:finance-clearing-account-create", label: "New Clearing Account", path: "/Finance/Banking", search: "crudEntity=clearingAccount&crudMode=create", icon: "bank" }),
  createFormShortcut({ key: "form:finance-statement-import-create", label: "Import Statement", path: "/Finance/Banking", search: "crudEntity=statementImport&crudMode=create", icon: "bank" }),
  createFormShortcut({ key: "form:finance-contact-create", label: "New Contact", path: "/Finance/Contacts", search: "crudEntity=contact&crudMode=create", icon: "contact" }),
  createFormShortcut({ key: "form:finance-currency-create", label: "New Currency", path: "/Finance/Currency", search: "crudEntity=currency&crudMode=create", icon: "currency" }),
  createFormShortcut({ key: "form:finance-bill-create", label: "New Bill", path: "/Finance/Purchases", search: "crudEntity=bill&crudMode=create", icon: "bill" }),
  createFormShortcut({ key: "form:finance-invoice-create", label: "New Invoice", path: "/Finance/Sales", search: "crudEntity=invoice&crudMode=create", icon: "invoice" }),
  createFormShortcut({ key: "form:finance-quote-create", label: "New Quote", path: "/Finance/Sales", search: "crudEntity=quote&crudMode=create", icon: "quote" }),
  createFormShortcut({ key: "form:finance-expense-create", label: "New Expense", path: "/Finance/Expenses", search: "crudEntity=expense&crudMode=create", icon: "bill" }),

  createFormShortcut({ key: "form:pos-till-screen-add", label: "New Till Screen", path: "/POS/TillScreens", icon: "pos" }),
]

const routeMetadataEntries = [
  ...pageShortcutCatalog.map((shortcut) => [shortcut.path, { label: shortcut.label, icon: shortcut.icon || "favorites" }] as const),
  ...LEGACY_ROUTE_METADATA.map((shortcut) => [shortcut.path, { label: shortcut.label, icon: shortcut.icon }] as const),
]

const ROUTE_LABELS = Object.fromEntries(routeMetadataEntries.map(([path, meta]) => [path, meta.label])) as Record<string, string>
const ROUTE_ICONS = Object.fromEntries(routeMetadataEntries.map(([path, meta]) => [path, meta.icon])) as Record<string, WorkspaceShortcutIcon>

export const workspaceShortcutCatalog: WorkspaceShortcut[] = [...pageShortcutCatalog, ...formShortcutCatalog]

export function buildShortcutHref(shortcut: Pick<WorkspaceShortcut, "path" | "search">): string {
  return shortcut.search ? `${shortcut.path}?${shortcut.search}` : shortcut.path
}

export function getRouteLabel(pathname: string): string {
  return ROUTE_LABELS[pathname] || pathname.replace(/\//g, " ").trim() || "Workspace"
}

export function getRouteIcon(pathname: string): WorkspaceShortcutIcon {
  return ROUTE_ICONS[pathname] || "favorites"
}

export function createShortcutKey(path: string, search?: string): string {
  return `${path}?${search || ""}`
}

export function getCrudEntityLabel(entity: string | null): string {
  return entity ? CRUD_ENTITY_LABELS[entity] || entity : "Form"
}

export function getCrudEntityIcon(entity: string | null, pathname: string): WorkspaceShortcutIcon {
  return (entity && CRUD_ENTITY_ICONS[entity]) || getRouteIcon(pathname)
}

export function parseWorkspaceRecent(pathname: string, search: string): WorkspaceShortcut | null {
  const params = new URLSearchParams(search)
  const crudEntity = params.get("crudEntity")
  const crudMode = params.get("crudMode")

  if (!crudEntity || !crudMode) {
    return null
  }

  const itemLabel = params.get("itemLabel")
  const entityLabel = getCrudEntityLabel(crudEntity)
  const modeLabel = MODE_LABELS[crudMode] || "Open"
  const sectionLabel = getRouteLabel(pathname)
  const id = params.get("id")

  const nextSearch = new URLSearchParams()
  nextSearch.set("crudEntity", crudEntity)
  nextSearch.set("crudMode", crudMode)
  if (id) nextSearch.set("id", id)
  if (itemLabel) nextSearch.set("itemLabel", itemLabel)

  return {
    key: `recent:${pathname}:${crudEntity}:${crudMode}:${id || "new"}`,
    label: itemLabel ? `${modeLabel} ${entityLabel}: ${itemLabel}` : `${modeLabel} ${entityLabel}`,
    kind: "form",
    path: pathname,
    search: nextSearch.toString(),
    description: sectionLabel,
    icon: getCrudEntityIcon(crudEntity, pathname),
    recentAt: Date.now(),
  }
}
