"use client"

import { supabase, SupabaseTable, getCompanyScope, parseLegacyPath } from "./client"
import type { 
  Booking,
  Table,
  TableType,
  BookingType,
  WaitlistEntry,
  Customer,
  BookingSettings,
  FloorPlan,
  TableElement,
  BookingStats,
  BookingStatus,
  BookingMessage,
  BookingTag,
 } from "../interfaces/Bookings"

type AnyObj = Record<string, any>

// =========================
// Supabase table helpers
// =========================

const bookingsTable = new SupabaseTable<any>('bookings')
const tablesTable = new SupabaseTable<any>('booking_tables')
const statusesTable = new SupabaseTable<any>('booking_statuses')
const typesTable = new SupabaseTable<any>('booking_types')
const waitlistEntriesTable = new SupabaseTable<any>('waitlist_entries')
const customersTable = new SupabaseTable<any>('booking_customers')
const tagsTable = new SupabaseTable<any>('booking_tags')
const floorPlansTable = new SupabaseTable<any>('floor_plans')

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
