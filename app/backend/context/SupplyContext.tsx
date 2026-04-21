"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react"
import { useCompany } from "./CompanyContext"
import { useSettings } from "./SettingsContext"
import type { SupplyClient, SupplyClientInvite, SupplyDelivery, SupplyOrder } from "../interfaces/Supply"
import { debugLog, debugWarn } from "../utils/debugLog"
import { fetchSupplySettingsSection as fetchSettingsSection, saveSupplySettingsSection as saveSettingsSection } from "../providers/supabase/Supply"
import * as SupplyDB from "../providers/supabase/Supply"
import { buildClientInviteUrl, generateInviteCode } from "../functions/Supply"
import { dataCache } from "../utils/DataCache"
import { createNotification } from "../functions/Notifications"

interface SupplyState {
  basePath: string
  supplyPath: string
  clients: SupplyClient[]
  orders: SupplyOrder[]
  deliveries: SupplyDelivery[]
  loading: boolean
  error: string | null
  initialized: boolean
}

const initialState: SupplyState = {
  basePath: "",
  supplyPath: "",
  clients: [],
  orders: [],
  deliveries: [],
  loading: false,
  error: null,
  initialized: false,
}

enum SupplyActionType {
  SET_PATHS = "SET_PATHS",
  SET_LOADING = "SET_LOADING",
  SET_ERROR = "SET_ERROR",
  SET_CLIENTS = "SET_CLIENTS",
  SET_ORDERS = "SET_ORDERS",
  SET_DELIVERIES = "SET_DELIVERIES",
  SET_INITIALIZED = "SET_INITIALIZED",
  RESET = "RESET",
}

type SupplyAction =
  | { type: SupplyActionType.SET_PATHS; payload: { basePath: string; supplyPath: string } }
  | { type: SupplyActionType.SET_LOADING; payload: boolean }
  | { type: SupplyActionType.SET_ERROR; payload: string | null }
  | { type: SupplyActionType.SET_CLIENTS; payload: SupplyClient[] }
  | { type: SupplyActionType.SET_ORDERS; payload: SupplyOrder[] }
  | { type: SupplyActionType.SET_DELIVERIES; payload: SupplyDelivery[] }
  | { type: SupplyActionType.SET_INITIALIZED; payload: boolean }
  | { type: SupplyActionType.RESET }

const supplyReducer = (state: SupplyState, action: SupplyAction): SupplyState => {
  switch (action.type) {
    case SupplyActionType.SET_PATHS:
      return { ...state, ...action.payload }
    case SupplyActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case SupplyActionType.SET_ERROR:
      return { ...state, error: action.payload }
    case SupplyActionType.SET_CLIENTS:
      return { ...state, clients: action.payload }
    case SupplyActionType.SET_ORDERS:
      return { ...state, orders: action.payload }
    case SupplyActionType.SET_DELIVERIES:
      return { ...state, deliveries: action.payload }
    case SupplyActionType.SET_INITIALIZED:
      return { ...state, initialized: action.payload }
    case SupplyActionType.RESET:
      return { ...initialState }
    default:
      return state
  }
}

interface SupplyContextType {
  state: SupplyState
  supplyPath: string

  // =======================
  // Settings API (no direct Firebase in UI)
  // =======================
  getSupplySettingsBasePath: () => string | null
  loadSupplySettingsSection: (section: "general" | "compliance") => Promise<Record<string, any> | null>
  saveSupplySettingsSection: (section: "general" | "compliance", data: Record<string, any>) => Promise<void>

  refreshAll: () => Promise<void>

  createClient: (data: Omit<SupplyClient, "id">) => Promise<string>
  updateClient: (id: string, updates: Partial<Omit<SupplyClient, "id">>) => Promise<void>
  deleteClient: (id: string) => Promise<void>

  createOrder: (data: Omit<SupplyOrder, "id">) => Promise<string>
  updateOrder: (id: string, updates: Partial<Omit<SupplyOrder, "id">>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>

  createDelivery: (data: Omit<SupplyDelivery, "id">) => Promise<string>
  updateDelivery: (id: string, updates: Partial<Omit<SupplyDelivery, "id">>) => Promise<void>
  deleteDelivery: (id: string) => Promise<void>

  // Client invite link (accept page will be built later)
  generateClientInviteLink: (params: {
    clientId: string
    email?: string
    phone?: string
    expiresInDays?: number
  }) => Promise<{ code: string; link: string }>
}

const SupplyContext = createContext<SupplyContextType | undefined>(undefined)

export const SupplyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getBasePath, state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  const [state, dispatch] = useReducer(supplyReducer, initialState)
  const lastSupplyPathRef = useRef<string>("")
  const cacheWriteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const basePath = useMemo(() => getBasePath?.("supply") || "", [getBasePath])
  const supplyPath = useMemo(() => (basePath ? `${basePath}/supply` : ""), [basePath])

  // =======================
  // Settings helpers (companies/<id>/settings/supply[/sites...][/subsites...])
  // =======================

  const getSupplySettingsBasePath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/supply`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadSupplySettingsSection = useCallback(
    async (section: "general" | "compliance") => {
      const base = getSupplySettingsBasePath()
      if (!base) return null
      try {
        return await fetchSettingsSection(base, section)
      } catch (err: any) {
        debugWarn("SupplyContext: loadSupplySettingsSection failed", err)
        return null
      }
    },
    [getSupplySettingsBasePath],
  )

  const saveSupplySettingsSection = useCallback(
    async (section: "general" | "compliance", data: Record<string, any>) => {
      const base = getSupplySettingsBasePath()
      if (!base) return
      await saveSettingsSection(base, section, data)
    },
    [getSupplySettingsBasePath],
  )

  // Keep state paths updated
  useEffect(() => {
    dispatch({ type: SupplyActionType.SET_PATHS, payload: { basePath, supplyPath } })
  }, [basePath, supplyPath])

  // Subscribe to collections whenever supplyPath changes
  useEffect(() => {
    if (!supplyPath) return
    if (lastSupplyPathRef.current === supplyPath) return
    lastSupplyPathRef.current = supplyPath

    dispatch({ type: SupplyActionType.SET_LOADING, payload: true })
    dispatch({ type: SupplyActionType.SET_ERROR, payload: null })
    dispatch({ type: SupplyActionType.SET_INITIALIZED, payload: false })

    const unsubs: Array<() => void> = []
    const cachePrefix = `supplyCache/${supplyPath}`

    const scheduleCacheWrite = (key: string, value: unknown) => {
      // Debounce writes so realtime updates don't spam IndexedDB.
      const existing = cacheWriteTimersRef.current[key]
      if (existing) clearTimeout(existing)

      const write = () => {
        try {
          dataCache.set(key, value as any)
        } catch {
          // ignore cache errors
        }
      }

      // Prefer idle callback when available; fallback to short timeout.
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        const ric = (window as any).requestIdleCallback as (cb: () => void, opts?: { timeout?: number }) => void
        ric(write, { timeout: 750 })
        // Also store a small timer so we can cancel/batch in older browsers.
        cacheWriteTimersRef.current[key] = setTimeout(() => {}, 0)
      } else {
        cacheWriteTimersRef.current[key] = setTimeout(write, 150)
      }
    }

    // FAST UI: hydrate from cache immediately if available (so Supply pages don't flash empty).
    ;(async () => {
      try {
        const [clientsCached, ordersCached, deliveriesCached] = await Promise.all([
          dataCache.peek<SupplyClient[]>(`${cachePrefix}/clients`),
          dataCache.peek<SupplyOrder[]>(`${cachePrefix}/orders`),
          dataCache.peek<SupplyDelivery[]>(`${cachePrefix}/deliveries`),
        ])

        let hadCache = false
        if (clientsCached !== null) {
          hadCache = true
          dispatch({ type: SupplyActionType.SET_CLIENTS, payload: clientsCached || [] })
        }
        if (ordersCached !== null) {
          hadCache = true
          dispatch({ type: SupplyActionType.SET_ORDERS, payload: ordersCached || [] })
        }
        if (deliveriesCached !== null) {
          hadCache = true
          dispatch({ type: SupplyActionType.SET_DELIVERIES, payload: deliveriesCached || [] })
        }

        if (hadCache) {
          // Allow UI to render immediately with cached data.
          dispatch({ type: SupplyActionType.SET_LOADING, payload: false })
          dispatch({ type: SupplyActionType.SET_INITIALIZED, payload: true })
        }
      } catch {
        // ignore
      }
    })()

    unsubs.push(
      SupplyDB.subscribeClients(
        supplyPath,
        (rows) => {
          dispatch({ type: SupplyActionType.SET_CLIENTS, payload: rows })
          scheduleCacheWrite(`${cachePrefix}/clients`, rows || [])
        },
        (msg) => dispatch({ type: SupplyActionType.SET_ERROR, payload: msg }),
      ),
    )

    unsubs.push(
      SupplyDB.subscribeOrders(
        supplyPath,
        (rows) => {
          dispatch({ type: SupplyActionType.SET_ORDERS, payload: rows })
          scheduleCacheWrite(`${cachePrefix}/orders`, rows || [])
        },
        (msg) => dispatch({ type: SupplyActionType.SET_ERROR, payload: msg }),
      ),
    )

    unsubs.push(
      SupplyDB.subscribeDeliveries(
        supplyPath,
        (rows) => {
          dispatch({ type: SupplyActionType.SET_DELIVERIES, payload: rows })
          scheduleCacheWrite(`${cachePrefix}/deliveries`, rows || [])
        },
        (msg) => dispatch({ type: SupplyActionType.SET_ERROR, payload: msg }),
      ),
    )

    // Mark initialized after first microtask; listeners will populate quickly.
    Promise.resolve().then(() => {
      dispatch({ type: SupplyActionType.SET_LOADING, payload: false })
      dispatch({ type: SupplyActionType.SET_INITIALIZED, payload: true })
      debugLog("✅ SupplyContext: subscribed", { supplyPath })
    })

    return () => {
      unsubs.forEach((u) => {
        try {
          u()
        } catch {}
      })
      Object.values(cacheWriteTimersRef.current).forEach((t) => {
        try {
          clearTimeout(t)
        } catch {}
      })
      cacheWriteTimersRef.current = {}
    }
  }, [supplyPath])

  const refreshAll = useCallback(async () => {
    if (!supplyPath) return
    dispatch({ type: SupplyActionType.SET_LOADING, payload: true })
    dispatch({ type: SupplyActionType.SET_ERROR, payload: null })
    try {
      const [clients, orders, deliveries] = await Promise.all([
        SupplyDB.fetchClients(supplyPath),
        SupplyDB.fetchOrders(supplyPath),
        SupplyDB.fetchDeliveries(supplyPath),
      ])
      dispatch({ type: SupplyActionType.SET_CLIENTS, payload: clients })
      dispatch({ type: SupplyActionType.SET_ORDERS, payload: orders })
      dispatch({ type: SupplyActionType.SET_DELIVERIES, payload: deliveries })
      dispatch({ type: SupplyActionType.SET_INITIALIZED, payload: true })

      // Persist for fast future loads (non-blocking).
      try {
        const cachePrefix = `supplyCache/${supplyPath}`
        dataCache.set(`${cachePrefix}/clients`, clients || [])
        dataCache.set(`${cachePrefix}/orders`, orders || [])
        dataCache.set(`${cachePrefix}/deliveries`, deliveries || [])
      } catch {
        // ignore
      }
    } catch (e: any) {
      debugWarn("SupplyContext refreshAll failed:", e)
      dispatch({ type: SupplyActionType.SET_ERROR, payload: e?.message || "Failed to refresh supply data" })
    } finally {
      dispatch({ type: SupplyActionType.SET_LOADING, payload: false })
    }
  }, [supplyPath])

  const buildDeleteClientDependencyMessage = useCallback(
    (clientId: string) => {
      const linkedOrders = state.orders.filter((order) => order.clientId === clientId)
      const linkedDeliveries = state.deliveries.filter((delivery) => delivery.clientId === clientId)
      if (!linkedOrders.length && !linkedDeliveries.length) return null

      const parts: string[] = []
      if (linkedOrders.length) parts.push(`${linkedOrders.length} order${linkedOrders.length === 1 ? "" : "s"}`)
      if (linkedDeliveries.length) parts.push(`${linkedDeliveries.length} deliver${linkedDeliveries.length === 1 ? "y" : "ies"}`)
      return `Cannot delete this client while ${parts.join(" and ")} still reference it.`
    },
    [state.orders, state.deliveries],
  )

  const buildDeleteOrderDependencyMessage = useCallback(
    (orderId: string) => {
      const linkedDeliveries = state.deliveries.filter((delivery) => delivery.orderId === orderId)
      if (!linkedDeliveries.length) return null
      return `Cannot delete this order while ${linkedDeliveries.length} deliver${linkedDeliveries.length === 1 ? "y" : "ies"} still reference it.`
    },
    [state.deliveries],
  )

  const normalizeDeliveryRecord = useCallback(
    (data: Omit<SupplyDelivery, "id"> | Partial<Omit<SupplyDelivery, "id">>) => {
      const orderId = (data.orderId || "").toString().trim()
      const clientId = (data.clientId || "").toString().trim()

      if (orderId) {
        const order = state.orders.find((entry) => entry.id === orderId)
        if (!order) throw new Error("The selected order no longer exists.")
        return {
          ...data,
          orderId,
          orderNumber: order.orderNumber,
          clientId: order.clientId,
          clientName: order.clientName,
        }
      }

      if (!clientId) {
        throw new Error("Client is required.")
      }

      const client = state.clients.find((entry) => entry.id === clientId)
      if (!client) throw new Error("The selected client no longer exists.")

      return {
        ...data,
        orderId: undefined,
        orderNumber: undefined,
        clientId,
        clientName: client.name,
      }
    },
    [state.clients, state.orders],
  )

  const generateClientInviteLink = useCallback(
    async (params: { clientId: string; email?: string; phone?: string; expiresInDays?: number }) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const client = state.clients.find((c) => c.id === params.clientId)
      const now = Date.now()
      const expiresInDays = typeof params.expiresInDays === "number" ? params.expiresInDays : 7
      const expiresAt = now + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000

      const code = generateInviteCode(16)
      const invite: Omit<SupplyClientInvite, "id"> = {
        code,
        clientId: params.clientId,
        clientName: client?.name,
        email: params.email,
        phone: params.phone,
        status: "pending",
        createdAt: now,
        expiresAt,
        supplierCompanyId: companyState.companyID || undefined,
        supplierCompanyName: companyState.companyName || undefined,
        supplierSupplyPath: supplyPath,
      }

      await SupplyDB.createClientInvite(supplyPath, invite)

      // Notification (audit)
      try {
        if (companyState.companyID && (settingsState.auth?.uid || "system")) {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || "system",
            "system",
            "created",
            "Supply Client Invite Created",
            `Invite created for ${client?.name || "client"}`,
            {
              siteId: (companyState as any).selectedSiteID || undefined,
              subsiteId: (companyState as any).selectedSubsiteID || undefined,
              priority: "low",
              category: "info",
              details: {
                entityId: code,
                entityName: client?.name || "Client Invite",
                oldValue: null,
                newValue: invite,
                changes: { invite: { from: null, to: invite } },
              },
              metadata: {
                section: "Supply/Invites",
                companyId: companyState.companyID,
                siteId: (companyState as any).selectedSiteID || undefined,
                subsiteId: (companyState as any).selectedSubsiteID || undefined,
                uid: settingsState.auth?.uid || "system",
                entityType: "invite",
                entityId: code,
                clientId: params.clientId,
              },
            },
          )
        }
      } catch {
        // non-blocking
      }

      // Build a link to a page we will implement later.
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const link = origin ? buildClientInviteUrl({ origin, code }) : `code:${code}`
      return { code, link }
    },
    [supplyPath, state.clients, companyState.companyID, companyState.companyName, settingsState.auth?.uid, companyState],
  )

  const notifySupplyCrud = useCallback(
    async (params: {
      action: "created" | "updated" | "deleted"
      entityType: "client" | "order" | "delivery"
      entityId: string
      entityName?: string
      oldValue?: any
      newValue?: any
    }) => {
      try {
        if (!companyState.companyID) return
        const uid = settingsState.auth?.uid || "system"
        const { action, entityType, entityId, entityName, oldValue, newValue } = params

        const titleBase =
          entityType === "client" ? "Client" : entityType === "order" ? "Order" : "Delivery"
        const actionVerb = action === "created" ? "Created" : action === "updated" ? "Updated" : "Deleted"

        await createNotification(
          companyState.companyID,
          uid,
          "system",
          action,
          `Supply ${titleBase} ${actionVerb}`,
          `${titleBase} "${entityName || entityId}" was ${actionVerb.toLowerCase()}`,
          {
            siteId: (companyState as any).selectedSiteID || undefined,
            subsiteId: (companyState as any).selectedSubsiteID || undefined,
            priority: action === "deleted" ? "medium" : "low",
            category: action === "deleted" ? "warning" : action === "created" ? "success" : "info",
            details: {
              entityId,
              entityName: entityName || entityId,
              oldValue: action === "created" ? null : (oldValue ?? null),
              newValue: action === "deleted" ? null : (newValue ?? null),
              changes: { [entityType]: { from: action === "created" ? null : oldValue, to: action === "deleted" ? null : newValue } },
            },
            metadata: {
              section: `Supply/${titleBase}s`,
              companyId: companyState.companyID,
              siteId: (companyState as any).selectedSiteID || undefined,
              subsiteId: (companyState as any).selectedSubsiteID || undefined,
              uid,
              entityType,
              entityId,
            },
          },
        )
      } catch {
        // non-blocking
      }
    },
    [companyState, settingsState.auth?.uid],
  )

  const createClient = useCallback(
    async (data: Omit<SupplyClient, "id">) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const id = await SupplyDB.createClient(supplyPath, data)
      await notifySupplyCrud({
        action: "created",
        entityType: "client",
        entityId: id,
        entityName: (data as any)?.name,
        oldValue: null,
        newValue: { ...data, id },
      })
      await refreshAll()
      return id
    },
    [supplyPath, notifySupplyCrud, refreshAll],
  )

  const updateClient = useCallback(
    async (id: string, updates: Partial<Omit<SupplyClient, "id">>) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const original = state.clients.find((c) => c.id === id)
      await SupplyDB.updateClient(supplyPath, id, updates)
      await notifySupplyCrud({
        action: "updated",
        entityType: "client",
        entityId: id,
        entityName: (updates as any)?.name || (original as any)?.name,
        oldValue: original ?? null,
        newValue: { ...(original || {}), ...(updates || {}), id },
      })
      await refreshAll()
    },
    [supplyPath, state.clients, notifySupplyCrud, refreshAll],
  )

  const deleteClient = useCallback(
    async (id: string) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const dependencyMessage = buildDeleteClientDependencyMessage(id)
      if (dependencyMessage) throw new Error(dependencyMessage)
      const original = state.clients.find((c) => c.id === id)
      await SupplyDB.deleteClient(supplyPath, id)
      await notifySupplyCrud({
        action: "deleted",
        entityType: "client",
        entityId: id,
        entityName: (original as any)?.name,
        oldValue: original ?? null,
        newValue: null,
      })
      await refreshAll()
    },
    [supplyPath, state.clients, notifySupplyCrud, refreshAll, buildDeleteClientDependencyMessage],
  )

  const createOrder = useCallback(
    async (data: Omit<SupplyOrder, "id">) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const id = await SupplyDB.createOrder(supplyPath, data)
      await notifySupplyCrud({
        action: "created",
        entityType: "order",
        entityId: id,
        entityName: (data as any)?.reference || (data as any)?.name,
        oldValue: null,
        newValue: { ...data, id },
      })
      await refreshAll()
      return id
    },
    [supplyPath, notifySupplyCrud, refreshAll],
  )

  const updateOrder = useCallback(
    async (id: string, updates: Partial<Omit<SupplyOrder, "id">>) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const original = state.orders.find((o) => o.id === id)
      await SupplyDB.updateOrder(supplyPath, id, updates)
      await notifySupplyCrud({
        action: "updated",
        entityType: "order",
        entityId: id,
        entityName: (updates as any)?.reference || (updates as any)?.name || (original as any)?.reference || (original as any)?.name,
        oldValue: original ?? null,
        newValue: { ...(original || {}), ...(updates || {}), id },
      })
      await refreshAll()
    },
    [supplyPath, state.orders, notifySupplyCrud, refreshAll],
  )

  const deleteOrder = useCallback(
    async (id: string) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const dependencyMessage = buildDeleteOrderDependencyMessage(id)
      if (dependencyMessage) throw new Error(dependencyMessage)
      const original = state.orders.find((o) => o.id === id)
      await SupplyDB.deleteOrder(supplyPath, id)
      await notifySupplyCrud({
        action: "deleted",
        entityType: "order",
        entityId: id,
        entityName: (original as any)?.reference || (original as any)?.name,
        oldValue: original ?? null,
        newValue: null,
      })
      await refreshAll()
    },
    [supplyPath, state.orders, notifySupplyCrud, refreshAll, buildDeleteOrderDependencyMessage],
  )

  const createDelivery = useCallback(
    async (data: Omit<SupplyDelivery, "id">) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const normalized = normalizeDeliveryRecord(data) as Omit<SupplyDelivery, "id">
      const id = await SupplyDB.createDelivery(supplyPath, normalized)
      await notifySupplyCrud({
        action: "created",
        entityType: "delivery",
        entityId: id,
        entityName: (normalized as any)?.reference || (normalized as any)?.name,
        oldValue: null,
        newValue: { ...normalized, id },
      })
      await refreshAll()
      return id
    },
    [supplyPath, notifySupplyCrud, refreshAll, normalizeDeliveryRecord],
  )

  const updateDelivery = useCallback(
    async (id: string, updates: Partial<Omit<SupplyDelivery, "id">>) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const original = state.deliveries.find((d) => d.id === id)
      const normalized = normalizeDeliveryRecord({ ...(original || {}), ...(updates || {}) })
      await SupplyDB.updateDelivery(supplyPath, id, normalized)
      await notifySupplyCrud({
        action: "updated",
        entityType: "delivery",
        entityId: id,
        entityName: (normalized as any)?.reference || (normalized as any)?.name || (original as any)?.reference || (original as any)?.name,
        oldValue: original ?? null,
        newValue: { ...(original || {}), ...(normalized || {}), id },
      })
      await refreshAll()
    },
    [supplyPath, state.deliveries, notifySupplyCrud, refreshAll, normalizeDeliveryRecord],
  )

  const deleteDelivery = useCallback(
    async (id: string) => {
      if (!supplyPath) throw new Error("Missing supplyPath")
      const original = state.deliveries.find((d) => d.id === id)
      await SupplyDB.deleteDelivery(supplyPath, id)
      await notifySupplyCrud({
        action: "deleted",
        entityType: "delivery",
        entityId: id,
        entityName: (original as any)?.reference || (original as any)?.name,
        oldValue: original ?? null,
        newValue: null,
      })
      await refreshAll()
    },
    [supplyPath, state.deliveries, notifySupplyCrud, refreshAll],
  )

  const value: SupplyContextType = {
    state,
    supplyPath,
    getSupplySettingsBasePath,
    loadSupplySettingsSection,
    saveSupplySettingsSection,
    refreshAll,

    createClient,
    updateClient,
    deleteClient,

    createOrder,
    updateOrder,
    deleteOrder,

    createDelivery,
    updateDelivery,
    deleteDelivery,

    generateClientInviteLink,
  }

  return <SupplyContext.Provider value={value}>{children}</SupplyContext.Provider>
}

export const useSupply = (): SupplyContextType => {
  const ctx = useContext(SupplyContext)
  if (!ctx) throw new Error("useSupply must be used within a SupplyProvider")
  return ctx
}

