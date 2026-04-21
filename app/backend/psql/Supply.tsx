"use client"

import { supabase, SupabaseTable, getCompanyScope, parseLegacyPath } from "./client"
import type {  SupplyClient, SupplyClientInvite, SupplyDelivery, SupplyOrder  } from "../interfaces/Supply"

type AnyObj = Record<string, any>

// =========================
// Supabase table helpers
// =========================

const clientsTable = new SupabaseTable<any>('supply_clients')
const ordersTable = new SupabaseTable<any>('supply_orders')
const deliveriesTable = new SupabaseTable<any>('supply_deliveries')
const clientInvitesTable = new SupabaseTable<any>('supply_client_invites')
const supplierConnectionsTable = new SupabaseTable<any>('supply_supplier_connections')
const settingsTable = new SupabaseTable<any>('supply_settings')

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
