"use client"

import { supabase, SupabaseTable, getCompanyScope, parseLegacyPath } from "./client"
import type { any } from "../interfaces/Location"

type AnyObj = Record<string, any>

// =========================
// Supabase table helpers
// =========================

const locationsTable = new SupabaseTable<any>('locations')
const locationProductsTable = new SupabaseTable<any>('location_products')

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
