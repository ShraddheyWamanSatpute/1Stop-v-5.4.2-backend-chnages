"use client"

import { supabase, SupabaseTable, getCompanyScope, parseLegacyPath } from "./client"
import type { 
  Product,
  Purchase,
  StockCount,
  StockTransfer,
  StockPreset,
  StockLocation,
  FloorPlan,
  Table,
  PurchaseItem,
  StockCountItem,
  Ticket,
  TicketSale,
  BagCheckItem,
  BagCheckConfig,
  ParLevelProfile,
 } from "../interfaces/Stock"

type AnyObj = Record<string, any>

// =========================
// Supabase table helpers
// =========================

const productsTable = new SupabaseTable<any>('stock_products')
const itemsTable = new SupabaseTable<any>('stock_items')
const countsTable = new SupabaseTable<any>('stock_counts')
const transfersTable = new SupabaseTable<any>('stock_transfers')
const locationsTable = new SupabaseTable<any>('stock_locations')
const suppliersTable = new SupabaseTable<any>('stock_suppliers')
const purchaseOrdersTable = new SupabaseTable<any>('purchase_orders')
const parLevelProfilesTable = new SupabaseTable<any>('par_level_profiles')

// Helper to extract company scope from legacy path
function getScopeFromPath(path: string) {
  const parsed = parseLegacyPath(path)
  if (!parsed.companyId) {
    throw new Error(`Invalid path format: ${path}`)
  }
  return getCompanyScope(parsed.companyId, parsed.siteId, parsed.subsiteId)
}

// Helper to convert payload to typed object
function fromPayload<T>(record: any): T {
  return record.payload as T
}

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export

// TODO: Implement export
