"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Badge,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  ShoppingCart as ShoppingCartIcon,
  Store as StoreIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
} from "@mui/icons-material"
import { db, onValue, ref, remove, set } from "../../../backend/services/Firebase"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useStock } from "../../../backend/context/StockContext"
import type { Product, Purchase, PurchaseItem } from "../../../backend/interfaces/Stock"
import type { SupplyOrder } from "../../../backend/interfaces/Supply"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { useSettings } from "../../../backend/context/SettingsContext"
import { usePermission } from "../../hooks/usePermission"
import { themeConfig } from "../../../theme/AppTheme"
import { createOrder as createSupplyOrder, deleteOrder as deleteSupplyOrder, getSupplierConnection } from "../../../backend/data/Supply"

type Category = {
  id: string
  name: string
  active?: boolean
}

type OrderItem = {
  id: string
  productId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  lineTotal: number
  taxAmount: number
  status: string
}

type OrderBuyer = {
  companyId: string
  siteId: string
  companyName: string
  siteName: string
  orderedBy: string
  orderedByName: string
  contactEmail: string
  contactPhone: string
  deliveryAddress: {
    line1: string
    line2: string
    city: string
    county: string
    postcode: string
    country: string
  }
}

type OrderSupplier = {
  supplierId: string
  supplierName: string
  supplierEmail: string
}

type OrderTotals = {
  subtotal: number
  taxTotal: number
  deliveryFee: number
  grandTotal: number
}

type OrderDates = {
  createdAt: number
  requestedDeliveryDate: number
}

type OrderPayment = {
  method: string
  status: string
}

type OrderNotes = {
  buyerNotes?: string
}

type OrderFlags = {
  hasDispute: boolean
  archived: boolean
}

type SupplierCompanyRow = {
  id: string
  name: string
  status?: string
}

type SupplierProductRow = {
  supplierCompanyId: string
  supplierCompanyName: string
  productId: string
  sku?: string
  name: string
  description?: string
  categoryId?: string
  categoryName?: string
  unitPrice: number
  trackStock: boolean
  stockQty?: number
  stockLabel?: string
  taxRate?: number
  minimumOrder?: number
  incrementBy?: number
  measureId?: string
  measureName?: string
}

type CartLine = SupplierProductRow & {
  quantity: number
}

function safeNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function makeId(prefix = "id") {
  try {
    // @ts-expect-error crypto may not exist in some envs
    if (typeof crypto !== "undefined" && crypto?.randomUUID) {
      // @ts-expect-error randomUUID type
      return `${prefix}_${crypto.randomUUID()}`
    }
  } catch {
    // ignore
  }
  return `${prefix}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
}

export default function StockOrder() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { state: companyState } = useCompany()
  const { state: stockState, refreshProducts, refreshSuppliers, refreshMeasures, savePurchase, deletePurchase } = useStock()
  const { state: settingsState } = useSettings()
  const { canView, canEdit } = usePermission()
  const canViewPage = canView("stock", "orders")
  const canMutate = canEdit("stock", "orders")

  const [search, setSearch] = useState("")
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<"relevance" | "name-asc" | "name-desc" | "price-asc" | "price-desc">("relevance")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")

  const [cart, setCart] = useState<Record<string, CartLine>>({})

  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(() => new Set())
  const [loadingFavorites, setLoadingFavorites] = useState(true)

  const loadingAny = Boolean(stockState.loading) || loadingFavorites
  const favoritesPath = useMemo(() => {
    const companyId = companyState.companyID
    if (!companyId) return null
    const siteId = companyState.selectedSiteID || "company"
    return `supplierPortal/favorites/${companyId}/${siteId}/products`
  }, [companyState.companyID, companyState.selectedSiteID])

  // Ensure stock data is loaded (company-level stock suppliers/products/measures)
  useEffect(() => {
    if (!companyState.companyID) return
    if ((stockState.suppliers || []).length === 0) refreshSuppliers().catch(() => {})
    if ((stockState.products || []).length === 0) refreshProducts().catch(() => {})
    if ((stockState.measures || []).length === 0) refreshMeasures().catch(() => {})
  }, [
    companyState.companyID,
    refreshMeasures,
    refreshProducts,
    refreshSuppliers,
    stockState.measures,
    stockState.products,
    stockState.suppliers,
  ])

  const suppliers: SupplierCompanyRow[] = useMemo(() => {
    const rows = (stockState.suppliers || [])
      .map((s: any) => ({
        id: String(s?.id || s?.supplierId || s?.supplierID || s?.ref || "").trim(),
        name: String(s?.name || s?.companyName || s?.supplierName || "Supplier").trim(),
        status: String(s?.status || s?.active || "").trim(),
      }))
      .filter((s) => Boolean(s.id))
      .sort((a, b) => a.name.localeCompare(b.name))
    return rows
  }, [stockState.suppliers])

  const suppliersById = useMemo(() => {
    const m = new Map<string, SupplierCompanyRow>()
    suppliers.forEach((s) => m.set(s.id, s))
    return m
  }, [suppliers])

  const categories: Category[] = useMemo(() => {
    const raw = stockState.categories || []
    const mapped = raw
      .map((c: any) => ({
        id: String(c?.id || c?.categoryId || "").trim(),
        name: String(c?.name || c?.categoryName || "").trim(),
        active: c?.active !== false,
      }))
      .filter((c) => Boolean(c.id) && Boolean(c.name) && c.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name))
    return mapped
  }, [stockState.categories])

  const measuresById = useMemo(() => {
    const m = new Map<string, string>()
    ;(stockState.measures || []).forEach((me: any) => {
      const id = String(me?.id || "").trim()
      const name = String(me?.name || me?.abbreviation || "").trim()
      if (id && name) m.set(id, name)
    })
    return m
  }, [stockState.measures])

  const products: SupplierProductRow[] = useMemo(() => {
    const catsById = new Map<string, string>()
    categories.forEach((c) => catsById.set(c.id, c.name))

    const out: SupplierProductRow[] = []

    ;(stockState.products || []).forEach((p: Product) => {
      if (!p) return
      if (p.active === false) return

      const productId = String(p.id || "").trim()
      if (!productId) return

      const name = String(p.name || "Untitled").trim()
      const sku = p.sku ? String(p.sku) : undefined
      const description = p.description ? String(p.description) : undefined
      const categoryId = p.categoryId ? String(p.categoryId) : undefined
      const categoryName = categoryId ? catsById.get(categoryId) : (p.categoryName ? String(p.categoryName) : undefined)

      const defaultMeasureId = p.purchase?.defaultMeasure ? String(p.purchase.defaultMeasure) : undefined

      const trackStock = Boolean((p as any)?.stockTracking?.enabled)
      const stockQtyRaw =
        safeNumber((p as any)?.stockTracking?.currentStock, NaN) ||
        safeNumber((p as any)?.currentStock, NaN)
      const stockQty = Number.isFinite(stockQtyRaw) ? stockQtyRaw : undefined
      const stockLabel = trackStock && typeof stockQty === "number" ? `${stockQty}` : undefined

      const units: any[] = Array.isArray(p.purchase?.units) ? p.purchase!.units : []

      // Map best purchasable unit per supplierId (so "by supplier" stays clean)
      const bestUnitBySupplier = new Map<string, any>()
      units.forEach((u) => {
        const sid = String(u?.supplierId || (p.purchase as any)?.supplierId || (p as any)?.supplierId || "").trim()
        if (!sid) return

        const prev = bestUnitBySupplier.get(sid)
        if (!prev) {
          bestUnitBySupplier.set(sid, u)
          return
        }

        // Prefer the product's default purchase measure if available
        const prevIsDefault = defaultMeasureId && String(prev?.measure || "") === defaultMeasureId
        const nextIsDefault = defaultMeasureId && String(u?.measure || "") === defaultMeasureId
        if (!prevIsDefault && nextIsDefault) {
          bestUnitBySupplier.set(sid, u)
        }
      })

      // If we have no units, fall back to the single purchase config (supplierId/price/measure)
      if (bestUnitBySupplier.size === 0) {
        const sid = String((p.purchase as any)?.supplierId || (p as any)?.supplierId || "").trim()
        if (sid) {
          bestUnitBySupplier.set(sid, {
            supplierId: sid,
            measure: p.purchase?.measure || defaultMeasureId,
            price: p.purchase?.price,
            taxPercent: p.purchase?.taxPercent ?? p.taxPercent,
          })
        } else {
          // No supplier assigned — keep it visible under an "Unassigned" group
          bestUnitBySupplier.set("unassigned", {
            supplierId: "unassigned",
            measure: p.purchase?.measure || defaultMeasureId,
            price: p.purchase?.price,
            taxPercent: p.purchase?.taxPercent ?? p.taxPercent,
          })
        }
      }

      for (const [supplierId, u] of bestUnitBySupplier.entries()) {
        const supplierCompanyName =
          suppliersById.get(supplierId)?.name ||
          (supplierId === "unassigned" ? "Unassigned supplier" : "Supplier")

        const unitPrice = safeNumber(u?.price ?? (p.purchase as any)?.price, 0)
        const taxRate = safeNumber(u?.taxPercent ?? p.purchase?.taxPercent ?? (p as any)?.taxPercent, 0)
        const measureId = u?.measure ? String(u.measure) : defaultMeasureId
        const measureName = measureId ? measuresById.get(measureId) : undefined

        out.push({
          supplierCompanyId: supplierId,
          supplierCompanyName,
          productId,
          sku,
          name,
          description,
          categoryId,
          categoryName,
          unitPrice,
          trackStock,
          stockQty,
          stockLabel,
          taxRate,
          minimumOrder: 1,
          incrementBy: 1,
          measureId,
          measureName,
        })
      }
    })

    return out
  }, [categories, measuresById, stockState.products, suppliersById])

  // Load favorites (SupplierHub-style) for this buyer company/site
  useEffect(() => {
    if (!favoritesPath) {
      setFavoriteProductIds(new Set())
      setLoadingFavorites(false)
      return
    }
    const favRef = ref(db, favoritesPath)
    setLoadingFavorites(true)
    return onValue(
      favRef,
      (snap) => {
      const v = (snap.val() || {}) as Record<string, any>
      setFavoriteProductIds(new Set(Object.keys(v)))
      setLoadingFavorites(false)
      },
      () => setLoadingFavorites(false),
    )
  }, [favoritesPath])

  const displayedProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    let r = products.slice()

    if (selectedSupplierIds.length > 0) {
      const setIds = new Set(selectedSupplierIds)
      r = r.filter((p) => setIds.has(p.supplierCompanyId))
    }
    if (selectedCategoryIds.length > 0) {
      const setIds = new Set(selectedCategoryIds)
      r = r.filter((p) => p.categoryId && setIds.has(p.categoryId))
    }
    if (inStockOnly) {
      r = r.filter((p) => !p.trackStock || (typeof p.stockQty === "number" && p.stockQty > 0))
    }
    r = r.filter((p) => p.unitPrice >= priceRange[0] && p.unitPrice <= priceRange[1])
    if (favoritesOnly) {
      r = r.filter((p) => favoriteProductIds.has(p.productId))
    }

    if (q) {
      r = r.filter((p) => {
        const hay = [p.name, p.sku || "", p.description || "", p.supplierCompanyName, p.categoryName || ""]
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
    }

    switch (sortBy) {
      case "name-asc":
        r.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name-desc":
        r.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "price-asc":
        r.sort((a, b) => a.unitPrice - b.unitPrice)
        break
      case "price-desc":
        r.sort((a, b) => b.unitPrice - a.unitPrice)
        break
    }

    return r
  }, [
    products,
    search,
    selectedSupplierIds,
    selectedCategoryIds,
    inStockOnly,
    favoritesOnly,
    priceRange,
    sortBy,
    favoriteProductIds,
  ])

  // Progressive rendering (improves scroll fluidity for large catalogs)
  const ITEMS_PER_BATCH = 80
  const [visibleItemLimit, setVisibleItemLimit] = useState(ITEMS_PER_BATCH)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Reset pagination when filters/search/sort change
    setVisibleItemLimit(ITEMS_PER_BATCH)
  }, [
    search,
    selectedSupplierIds,
    selectedCategoryIds,
    inStockOnly,
    favoritesOnly,
    priceRange,
    sortBy,
  ])

  const loadMore = useCallback(() => {
    setVisibleItemLimit((prev) => Math.min(displayedProducts.length, prev + ITEMS_PER_BATCH))
  }, [displayedProducts.length])

  useEffect(() => {
    if (!loadMoreRef.current) return
    if (visibleItemLimit >= displayedProducts.length) return

    const el = loadMoreRef.current
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: "600px" }, // prefetch before reaching the end
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore, visibleItemLimit, displayedProducts.length])

  const allGroupsBySupplier = useMemo(() => {
    const map = new Map<string, SupplierProductRow[]>()
    displayedProducts.forEach((p) => {
      const arr = map.get(p.supplierCompanyId) || []
      arr.push(p)
      map.set(p.supplierCompanyId, arr)
    })

    const keys = Array.from(map.keys()).sort((a, b) => {
      const an = suppliersById.get(a)?.name || (a === "unassigned" ? "Unassigned supplier" : a)
      const bn = suppliersById.get(b)?.name || (b === "unassigned" ? "Unassigned supplier" : b)
      return an.localeCompare(bn)
    })

    return keys.map((supplierId) => ({
      supplierId,
      supplierName: suppliersById.get(supplierId)?.name || (supplierId === "unassigned" ? "Unassigned supplier" : "Supplier"),
      items: map.get(supplierId) || [],
    }))
  }, [displayedProducts, suppliersById])

  const visibleGroupsBySupplier = useMemo(() => {
    // Important: allocate visible items in supplier-order so new content only appends at the bottom.
    let remaining = visibleItemLimit
    const out: Array<{ supplierId: string; supplierName: string; items: SupplierProductRow[]; totalCount: number }> = []

    for (const g of allGroupsBySupplier) {
      if (remaining <= 0) break
      const take = Math.min(g.items.length, remaining)
      out.push({
        supplierId: g.supplierId,
        supplierName: g.supplierName,
        items: g.items.slice(0, take),
        totalCount: g.items.length,
      })
      remaining -= take
    }
    return out
  }, [allGroupsBySupplier, visibleItemLimit])

  const cartLines = useMemo(() => Object.values(cart), [cart])
  const cartItemCount = useMemo(() => cartLines.reduce((s, l) => s + l.quantity, 0), [cartLines])
  const cartTotal = useMemo(
    () => cartLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    [cartLines],
  )

  const addToCart = (p: SupplierProductRow) => {
    const key = `${p.supplierCompanyId}:${p.productId}`
    setCart((prev) => {
      const existing = prev[key]
      const inc = safeNumber(p.incrementBy, 1)
      const base = existing?.quantity ?? 0
      const nextQty = base === 0 ? safeNumber(p.minimumOrder, 1) : base + inc
      return { ...prev, [key]: { ...p, quantity: nextQty } }
    })
    setCartOpen(true)
  }

  const toggleFavorite = async (productId: string) => {
    if (!canMutate) return
    if (!favoritesPath) return
    const p = `${favoritesPath}/${productId}`
    if (favoriteProductIds.has(productId)) {
      await remove(ref(db, p))
    } else {
      await set(ref(db, p), { addedAt: Date.now() })
    }
  }

  const clearFilters = () => {
    setSelectedSupplierIds([])
    setSelectedCategoryIds([])
    setPriceRange([0, 1000])
    setInStockOnly(false)
    setFavoritesOnly(false)
    setSortBy("relevance")
  }

  const setQty = (key: string, quantity: number) => {
    const q = Math.max(0, Math.floor(quantity || 0))
    setCart((prev) => {
      if (!prev[key]) return prev
      if (q <= 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { ...prev[key], quantity: q } }
    })
  }

  const placeOrder = async () => {
    if (!canMutate) return
    if (!companyState.companyID) return
    if (cartLines.length === 0) return

    const now = new Date()

    // 2) Also create SupplierHub order record so supplier-side Supply → Orders can see it
    const orderedBy = settingsState.auth?.uid || "unknown"
    const orderedByName =
      (settingsState.settings?.personal?.firstName && settingsState.settings?.personal?.lastName)
        ? `${settingsState.settings.personal.firstName} ${settingsState.settings.personal.lastName}`
        : (settingsState.user?.displayName || settingsState.auth?.displayName || settingsState.auth?.email || "User")

    const buyerCompanyName =
      (companyState.company?.companyName as any) ||
      (companyState.companyName as any) ||
      "Buyer"

    const siteId = companyState.selectedSiteID || "company"
    const siteName = companyState.selectedSiteName || "Main Site"
    const selectedSite = companyState.sites?.find((s: any) => s.siteID === companyState.selectedSiteID)
    const addressSrc = selectedSite?.address || {}

    const buyer: OrderBuyer = {
      companyId: companyState.companyID,
      siteId,
      companyName: buyerCompanyName,
      siteName,
      orderedBy,
      orderedByName,
      contactEmail: String(settingsState.auth?.email || companyState.company?.companyEmail || companyState.companyEmail || ""),
      contactPhone: String(companyState.company?.companyPhone || companyState.companyPhone || ""),
      deliveryAddress: {
        line1: String(addressSrc.street || ""),
        line2: "",
        city: String(addressSrc.city || ""),
        county: String(addressSrc.state || ""),
        postcode: String(addressSrc.zipCode || ""),
        country: String(addressSrc.country || "United Kingdom"),
      },
    }

    // Group cart by supplier and place 1 order per supplier
    const grouped = new Map<string, CartLine[]>()
    cartLines.forEach((l) => {
      const arr = grouped.get(l.supplierCompanyId) || []
      arr.push(l)
      grouped.set(l.supplierCompanyId, arr)
    })

    if (grouped.has("unassigned")) {
      setCheckoutError("Assign a supplier to all products before checkout.")
      return
    }

    const supplierConnections = new Map<string, Awaited<ReturnType<typeof getSupplierConnection>>>()
    const unresolvedSuppliers: string[] = []

    for (const supId of grouped.keys()) {
      const connection = await getSupplierConnection({
        customerCompanyId: companyState.companyID,
        supplierCompanyId: supId,
      }).catch(() => null)
      supplierConnections.set(supId, connection)

      if (!connection?.supplierSupplyPath) {
        unresolvedSuppliers.push(suppliersById.get(supId)?.name || supId)
      }
    }

    if (unresolvedSuppliers.length > 0) {
      setCheckoutError(`Connect these suppliers to Supplier Hub before checkout: ${unresolvedSuppliers.join(", ")}.`)
      return
    }

    const createdPurchases: string[] = []
    const createdSupplyOrders: Array<{ supplyPath: string; orderId: string }> = []

    try {
    for (const [supId, lines] of grouped.entries()) {
      const supName = suppliersById.get(supId)?.name || lines[0]?.supplierCompanyName || "Supplier"

      // 1) Create buyer-side stock purchase record per supplier
      const purchaseId = `order_${supId}_${Date.now()}`
      const purchaseItems: PurchaseItem[] = lines.map((l) => ({
        productId: l.productId,
        productName: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.quantity * l.unitPrice,
        supplierId: l.supplierCompanyId,
      }))
      const purchaseTotal = purchaseItems.reduce((s, it) => s + (it.totalPrice || 0), 0)
      const purchase: Purchase = {
        id: purchaseId,
        supplierId: supId,
        supplierName: supName,
        status: "Awaiting Submission",
        deliveryDate: format(now, "yyyy-MM-dd"),
        totalAmount: purchaseTotal,
        items: purchaseItems,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dateUK: format(now, "dd/MM/yyyy"),
        timeUK: format(now, "HH:mm"),
        notes: `Created from Stock → Order`,
      }
      // 2) Create SupplierHub order record
      const supplier: OrderSupplier = {
        supplierId: supId,
        supplierName: supName,
        supplierEmail: "",
      }

      const orderItems: Record<string, OrderItem> = {}
      let subtotal = 0
      let taxTotal = 0
      for (const l of lines) {
        const itemId = makeId("item")
        const lineSubtotal = l.quantity * l.unitPrice
        const taxRate = safeNumber(l.taxRate, 0) / 100
        const taxAmount = Math.round(lineSubtotal * taxRate * 100) / 100
        subtotal += lineSubtotal
        taxTotal += taxAmount
        orderItems[itemId] = {
          id: itemId,
          productId: l.productId,
          sku: l.sku || "",
          name: l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: Math.round(lineSubtotal * 100) / 100,
          taxAmount,
          status: "pending",
        }
      }

      const totals: OrderTotals = {
        subtotal: Math.round(subtotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        deliveryFee: 0,
        grandTotal: Math.round((subtotal + taxTotal) * 100) / 100,
      }

      const dates: OrderDates = {
        createdAt: Date.now(),
        requestedDeliveryDate: Date.now() + 24 * 60 * 60 * 1000,
      }

      const payment: OrderPayment = {
        method: "invoice",
        status: "pending",
      }

      const notes: OrderNotes = {
        buyerNotes: "Created from 1Stop Stock → Order",
      }

      const flags: OrderFlags = {
        hasDispute: false,
        archived: false,
      }

      const connection = supplierConnections.get(supId)
      const supplyOrder: Omit<SupplyOrder, "id"> = {
        orderNumber: purchaseId,
        clientId: companyState.companyID,
        clientName: companyState.companyName || companyState.selectedSiteName || buyerCompanyName,
        status: "confirmed",
        orderDate: dates.createdAt,
        requestedDeliveryDate: dates.requestedDeliveryDate,
        currency: "GBP",
        lines: lines.map((l) => ({
          id: makeId("line"),
          sku: l.sku || "",
          name: l.name,
          measureId: l.measureId,
          measureName: l.measureName,
          qty: l.quantity,
          unitPrice: l.unitPrice,
          notes: l.categoryName || undefined,
        })),
        subtotal: totals.subtotal,
        tax: totals.taxTotal,
        total: totals.grandTotal,
        reference: `1Stop stock purchase ${purchaseId}`,
        notes: notes.buyerNotes,
        createdAt: dates.createdAt,
        updatedAt: dates.createdAt,
      }
      const supplyPath = connection!.supplierSupplyPath!
      const supplyOrderId = await createSupplyOrder(supplyPath, supplyOrder)
      createdSupplyOrders.push({ supplyPath, orderId: supplyOrderId })
      await savePurchase(purchase)
      createdPurchases.push(purchaseId)

      // OrderDB functionality removed - supplierhub module not available
      // const orderId = await OrderDB.createOrder({
      //   buyer,
      //   supplier,
      //   items: orderItems,
      //   totals,
      //   status: "CREATED",
      //   dates,
      //   payment,
      //   notes,
      //   flags,
      // } as any)
      // await OrderDB.updateOrderStatus(orderId, "PENDING_SUPPLIER", {}, orderedBy)
    }
    } catch (error) {
      await Promise.allSettled(createdPurchases.map((purchaseId) => deletePurchase(purchaseId)))
      await Promise.allSettled(createdSupplyOrders.map((record) => deleteSupplyOrder(record.supplyPath, record.orderId)))
      setCheckoutError("Checkout failed before all supplier orders were completed. Any partial records were rolled back.")
      return
    }

    setCheckoutError("")
    setCheckoutOpen(false)
    setCartOpen(false)
    setCart({})
    navigate("/Stock/PurchaseOrders")
  }

  // Basic guards
  if (!companyState.companyID) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Order</Typography>
        <Typography variant="body2" color="text.secondary">
          Please select a company and site to start ordering.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {!canViewPage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You don't have permission to view Stock Orders.
        </Alert>
      )}
      {!canMutate && canViewPage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to Stock Orders.
        </Alert>
      )}
      {/* Branded header (matches dashboard look) */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: themeConfig.brandColors.navy,
          color: themeConfig.brandColors.offWhite,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2 }}>
          <Box>
            <Typography variant="h2" sx={{ color: themeConfig.brandColors.offWhite }}>
              Stock Order
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.8) }}>
              Shop your stock items by supplier, add to cart, and place purchase orders.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={() => setFiltersOpen(true)}
              aria-label="open filters"
              disabled={loadingAny}
              sx={{
                color: themeConfig.brandColors.offWhite,
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.08),
                "&:hover": { bgcolor: alpha(themeConfig.brandColors.offWhite, 0.14) },
              }}
            >
              <FilterListIcon />
            </IconButton>
            <IconButton
              onClick={() => setCartOpen(true)}
              aria-label="open cart"
              disabled={loadingAny}
              sx={{
                color: themeConfig.brandColors.offWhite,
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.08),
                "&:hover": { bgcolor: alpha(themeConfig.brandColors.offWhite, 0.14) },
              }}
            >
              <Badge badgeContent={cartItemCount} color="primary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          border: `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}`,
          bgcolor: themeConfig.brandColors.offWhite,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} />,
              }}
              disabled={loadingAny}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              disabled={loadingAny}
            >
              <MenuItem value="relevance">Relevance</MenuItem>
              <MenuItem value="name-asc">Name A–Z</MenuItem>
              <MenuItem value="name-desc">Name Z–A</MenuItem>
              <MenuItem value="price-asc">Price (Low → High)</MenuItem>
              <MenuItem value="price-desc">Price (High → Low)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <ToggleButtonGroup
                size="small"
                value={viewMode}
                exclusive
                onChange={(_, v) => v && setViewMode(v)}
                disabled={loadingAny}
              >
                <ToggleButton value="grid">
                  <GridIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="list">
                  <ListIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {suppliers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <StoreIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            No suppliers available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add suppliers in Stock → Suppliers, then assign them to products under the product purchase settings.
          </Typography>
        </Paper>
      ) : displayedProducts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            No products found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting search or filters.
          </Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={clearFilters}>
            Clear filters
          </Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {visibleGroupsBySupplier.map((group) => (
            <Box key={group.supplierId}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderRadius: 2,
                  border: `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}`,
                  bgcolor: alpha(themeConfig.brandColors.navy, 0.04),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {group.supplierName}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: alpha(themeConfig.brandColors.navy, 0.25),
                      bgcolor: themeConfig.brandColors.offWhite,
                    }}
                    label={
                      group.items.length === group.totalCount
                        ? `${group.totalCount} item${group.totalCount === 1 ? "" : "s"}`
                        : `Showing ${group.items.length} / ${group.totalCount}`
                    }
                  />
                </Box>
              </Paper>
              <Grid container spacing={2}>
                {group.items.map((p) => (
                  <Grid
                    item
                    xs={12}
                    sm={viewMode === "list" ? 12 : 6}
                    md={viewMode === "list" ? 12 : 4}
                    lg={viewMode === "list" ? 12 : 3}
                    key={`${p.supplierCompanyId}:${p.productId}`}
                  >
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: viewMode === "list" ? "row" : "column",
                        // Helps browsers skip rendering offscreen cards (improves scroll smoothness)
                        contentVisibility: "auto",
                        containIntrinsicSize: "300px",
                        border: `1px solid ${alpha(themeConfig.brandColors.navy, 0.10)}`,
                        boxShadow: "none",
                        bgcolor: themeConfig.brandColors.offWhite,
                        transition: theme.transitions.create(["transform", "box-shadow", "border-color"], {
                          duration: theme.transitions.duration.shortest,
                        }),
                        "&:hover": {
                          transform: "translateY(-1px)",
                          borderColor: alpha(themeConfig.brandColors.navy, 0.2),
                          boxShadow: themeConfig.shadows[2],
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                              {p.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                              {p.sku ? `${p.sku} • ` : ""}
                              {p.measureName || (p.measureId ? measuresById.get(p.measureId) : "") || "Unknown Unit"}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => toggleFavorite(p.productId)}>
                            {favoriteProductIds.has(p.productId) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                          </IconButton>
                        </Box>
                        {p.categoryName ? (
                          <Chip size="small" label={p.categoryName} variant="outlined" sx={{ mb: 1 }} />
                        ) : null}
                        {p.description ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {p.description}
                          </Typography>
                        ) : null}
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Chip
                            size="small"
                            label={`£${p.unitPrice.toFixed(2)}`}
                            color="primary"
                            variant="outlined"
                            sx={{ borderColor: alpha(themeConfig.brandColors.navy, 0.25) }}
                          />
                          {p.stockLabel ? (
                            <Chip size="small" label={`Stock: ${p.stockLabel}`} variant="outlined" />
                          ) : null}
                          {p.supplierCompanyId === "unassigned" ? (
                            <Chip size="small" label="Assign supplier to order" color="warning" variant="outlined" />
                          ) : null}
                          {p.trackStock && typeof p.stockQty === "number" && p.stockQty <= 0 ? (
                            <Chip size="small" label="Out of stock" color="error" variant="outlined" />
                          ) : null}
                        </Stack>
                      </CardContent>
                      <CardActions>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<ShoppingCartIcon />}
                          onClick={() => addToCart(p)}
                          disabled={
                            p.supplierCompanyId === "unassigned" ||
                            (p.trackStock && typeof p.stockQty === "number" && p.stockQty <= 0)
                          }
                        >
                          {p.supplierCompanyId === "unassigned" ? "Assign supplier" : "Add"}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      )}

      {/* Load-more sentinel (improves scroll performance on large lists) */}
      {displayedProducts.length > visibleItemLimit ? (
        <Box ref={loadMoreRef} sx={{ py: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Loading more items…
          </Typography>
        </Box>
      ) : null}

      {/* Filters Drawer */}
      <Drawer
        anchor="left"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        PaperProps={{
          sx: {
            width: 340,
            bgcolor: themeConfig.brandColors.offWhite,
            color: themeConfig.brandColors.navy,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setFiltersOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Suppliers
          </Typography>
          <Box sx={{ maxHeight: 180, overflow: "auto", mb: 2 }}>
            {suppliers.map((s) => {
              const checked = selectedSupplierIds.includes(s.id)
              return (
                <FormControlLabel
                  key={s.id}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => {
                        setSelectedSupplierIds((prev) => (checked ? prev.filter((x) => x !== s.id) : [...prev, s.id]))
                      }}
                    />
                  }
                  label={s.name}
                />
              )
            })}
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Categories
          </Typography>
          <Box sx={{ maxHeight: 180, overflow: "auto", mb: 2 }}>
            {categories.map((c) => {
              const checked = selectedCategoryIds.includes(c.id)
              return (
                <FormControlLabel
                  key={c.id}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => {
                        setSelectedCategoryIds((prev) => (checked ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                      }}
                    />
                  }
                  label={c.name}
                />
              )
            })}
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Price
          </Typography>
          <Box sx={{ px: 1, mb: 2 }}>
            <Slider
              value={priceRange}
              onChange={(_, v) => setPriceRange(v as [number, number])}
              valueLabelDisplay="auto"
              min={0}
              max={1000}
              disabled={loadingAny}
              sx={{ color: themeConfig.brandColors.navy }}
            />
            <Typography variant="caption" color="text.secondary">
              £{priceRange[0]} – £{priceRange[1]}
            </Typography>
          </Box>

          <FormControlLabel
            control={<Checkbox checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} disabled={loadingAny} />}
            label="In stock only"
          />
          <FormControlLabel
            control={<Checkbox checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} disabled={loadingAny} />}
            label="Favorites only"
          />

          <Divider sx={{ my: 2 }} />
          <Button variant="outlined" onClick={clearFilters} fullWidth>
            Clear filters
          </Button>
        </Box>
      </Drawer>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        PaperProps={{
          sx: {
            width: 420,
            bgcolor: themeConfig.brandColors.offWhite,
            color: themeConfig.brandColors.navy,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6">Cart</Typography>
            <IconButton onClick={() => setCartOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {cartLines.length === 0 ? (
            <Typography color="text.secondary">Your cart is empty.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {cartLines.map((l) => {
                const key = `${l.supplierCompanyId}:${l.productId}`
                return (
                  <Paper key={key} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                      {l.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {l.supplierCompanyName} • £{l.unitPrice.toFixed(2)}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center" }}>
                      <TextField
                        size="small"
                        type="number"
                        label="Qty"
                        value={l.quantity}
                        onChange={(e) => setQty(key, Number(e.target.value))}
                        inputProps={{ min: 0 }}
                        sx={{ width: 110 }}
                      />
                      <Box sx={{ flexGrow: 1 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        £{(l.quantity * l.unitPrice).toFixed(2)}
                      </Typography>
                    </Box>
                  </Paper>
                )
              })}
              <Divider />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                  £{cartTotal.toFixed(2)}
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => {
                  setCheckoutError("")
                  setCheckoutOpen(true)
                }}
              >
                Checkout ({[...new Set(cartLines.map((l) => l.supplierCompanyId))].length} supplier
                {[...new Set(cartLines.map((l) => l.supplierCompanyId))].length === 1 ? "" : "s"})
              </Button>
              <Button
                variant="text"
                color="error"
                onClick={() => {
                  setCart({})
                }}
              >
                Clear cart
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Checkout Dialog */}
      <Dialog
        open={checkoutOpen}
        onClose={() => {
          setCheckoutError("")
          setCheckoutOpen(false)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Place order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will create stock purchases and Supplier Hub orders, one per connected supplier.
          </Typography>
          {checkoutError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {checkoutError}
            </Alert>
          ) : null}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderColor: alpha(themeConfig.brandColors.navy, 0.12),
              bgcolor: alpha(themeConfig.brandColors.navy, 0.03),
            }}
          >
            {[...new Set(cartLines.map((l) => l.supplierCompanyId))].map((supId) => {
              const supName = suppliersById.get(supId)?.name || "Supplier"
              const lines = cartLines.filter((l) => l.supplierCompanyId === supId)
              const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
              return (
                <Box key={supId} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {supName}
                  </Typography>
                  {lines.map((l) => (
                    <Box
                      key={`${l.supplierCompanyId}:${l.productId}`}
                      sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}
                    >
                      <Typography variant="body2">
                        {l.quantity} × {l.name}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        £{(l.quantity * l.unitPrice).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Supplier total
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      £{total.toFixed(2)}
                    </Typography>
                  </Box>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              )
            })}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                £{cartTotal.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCheckoutError("")
              setCheckoutOpen(false)
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={placeOrder} disabled={cartLines.length === 0}>
            Place order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

