export type SidebarSectionKey =
  | "dashboard"
  | "stock"
  | "hr"
  | "bookings"
  | "pos"
  | "finance"
  | "supply"
  | "messenger"
  | "company"
  | "settings"

export interface SidebarSectionDefinition {
  key: SidebarSectionKey
  label: string
  path: string
  description: string
  moduleKey?: string
  alwaysVisible?: boolean
}

export interface NavigationPermissionTarget {
  sectionKey: SidebarSectionKey | null
  moduleKey?: string
  pageKey?: string
  alwaysVisible?: boolean
}

export const sidebarSectionCatalog: SidebarSectionDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/Dashboard",
    description: "Dashboard, analytics, and notifications",
    moduleKey: "dashboard",
  },
  {
    key: "stock",
    label: "Stock",
    path: "/Stock",
    description: "Inventory, purchasing, and stock control",
    moduleKey: "stock",
  },
  {
    key: "hr",
    label: "HR",
    path: "/HR",
    description: "Employees, payroll, and scheduling",
    moduleKey: "hr",
  },
  {
    key: "bookings",
    label: "Bookings",
    path: "/Bookings",
    description: "Reservations, floor plans, and table setup",
    moduleKey: "bookings",
  },
  {
    key: "pos",
    label: "POS",
    path: "/POS",
    description: "Point of sale, tills, and menu controls",
    moduleKey: "pos",
  },
  {
    key: "finance",
    label: "Finance",
    path: "/Finance",
    description: "Sales, banking, accounting, and reporting",
    moduleKey: "finance",
  },
  {
    key: "supply",
    label: "Supply",
    path: "/Supply",
    description: "Supplier orders, clients, and deliveries",
    moduleKey: "supply",
  },
  {
    key: "messenger",
    label: "Messenger",
    path: "/Messenger",
    description: "Internal messages and conversations",
    moduleKey: "messenger",
  },
  {
    key: "company",
    label: "Company",
    path: "/Company",
    description: "Company setup, users, permissions, and reports",
    moduleKey: "company",
  },
  {
    key: "settings",
    label: "Settings",
    path: "/Settings",
    description: "Your profile, notifications, and preferences",
    alwaysVisible: true,
  },
]

export function normalizeSidebarSectionVisibility(value: unknown): Record<SidebarSectionKey, boolean> {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return sidebarSectionCatalog.reduce(
    (acc, section) => {
      acc[section.key] = section.alwaysVisible ? true : raw[section.key] !== false
      return acc
    },
    {} as Record<SidebarSectionKey, boolean>,
  )
}

export function getShortcutGroupLabel(path: string): string {
  if (path.startsWith("/Dashboard")) return "Other"
  if (path.startsWith("/Analytics")) return "Other"
  if (path.startsWith("/Notifications")) return "Other"
  if (path.startsWith("/Messenger")) return "Other"
  if (path.startsWith("/Finance")) return "Finance"
  if (path.startsWith("/Stock")) return "Stock"
  if (path.startsWith("/HR")) return "HR"
  if (path.startsWith("/Bookings")) return "Bookings"
  if (path.startsWith("/POS")) return "POS"
  if (path.startsWith("/Supply")) return "Supply"
  if (path.startsWith("/Company")) return "Company"
  if (path.startsWith("/Settings")) return "Settings"
  return "General"
}

export function getNavigationPermissionTarget(path: string): NavigationPermissionTarget {
  if (path.startsWith("/Settings")) {
    return { sectionKey: "settings", alwaysVisible: true }
  }

  if (path.startsWith("/Dashboard") || path.startsWith("/Analytics") || path.startsWith("/Notifications")) {
    return { sectionKey: "dashboard", moduleKey: "dashboard", pageKey: "dashboard" }
  }

  if (path.startsWith("/Stock/OrderDelivery") || path.startsWith("/Stock/AddPurchase") || path.startsWith("/Stock/EditPurchase")) {
    return { sectionKey: "stock", moduleKey: "stock", pageKey: "orders" }
  }

  if (path.startsWith("/Stock/AddItem") || path.startsWith("/Stock/EditItem")) {
    return { sectionKey: "stock", moduleKey: "stock", pageKey: "items" }
  }

  if (
    path.startsWith("/Stock/StockCounts") ||
    path.startsWith("/Stock/Transfers") ||
    path.startsWith("/Stock/AddStockCount") ||
    path.startsWith("/Stock/EditStockCount") ||
    path.startsWith("/Stock/ParLevels") ||
    path.startsWith("/Stock/AddParLevel")
  ) {
    return { sectionKey: "stock", moduleKey: "stock", pageKey: "counts" }
  }

  if (path.startsWith("/Stock")) {
    return { sectionKey: "stock", moduleKey: "stock" }
  }

  if (path.startsWith("/Finance")) {
    return { sectionKey: "finance", moduleKey: "finance" }
  }

  if (path.startsWith("/Company")) {
    return { sectionKey: "company", moduleKey: "company" }
  }

  if (path.startsWith("/Bookings")) {
    return { sectionKey: "bookings", moduleKey: "bookings" }
  }

  if (path.startsWith("/HR")) {
    return { sectionKey: "hr", moduleKey: "hr" }
  }

  if (path.startsWith("/POS/TillScreen")) {
    return { sectionKey: "pos", moduleKey: "pos", pageKey: "tillscreens" }
  }

  if (path.startsWith("/POS/TillUsage")) {
    return { sectionKey: "pos", moduleKey: "pos", pageKey: "usage" }
  }

  if (path.startsWith("/POS")) {
    return { sectionKey: "pos", moduleKey: "pos" }
  }

  if (path.startsWith("/Supply")) {
    return { sectionKey: "supply", moduleKey: "supply" }
  }

  if (path.startsWith("/Messenger")) {
    return { sectionKey: "messenger", moduleKey: "messenger" }
  }

  return { sectionKey: null }
}
