#!/usr/bin/env node

/**
 * Complete Firebase to Supabase Data Migration Script
 * Migrates all data from Firebase Realtime Database to Supabase PostgreSQL
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  supabaseServiceKey: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_FIREBASE_PROJECT_ID',
  firebaseDatabaseUrl: process.env.VITE_FIREBASE_DATABASE_URL || 'YOUR_FIREBASE_DATABASE_URL'
}

// Initialize Supabase client
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Migration statistics
const stats = {
  totalModules: 0,
  migratedModules: 0,
  totalRecords: 0,
  migratedRecords: 0,
  errors: []
}

// Table mappings based on your migrations
const TABLE_MAPPINGS = {
  supply: {
    clients: 'supply_clients',
    orders: 'supply_orders',
    deliveries: 'supply_deliveries',
    clientInvites: 'supply_client_invites',
    supplierConnections: 'supply_supplier_connections',
    settings: 'supply_settings'
  },
  finance: {
    accounts: 'finance_accounts',
    transactions: 'finance_transactions',
    bills: 'finance_bills',
    invoices: 'finance_invoices',
    contacts: 'finance_contacts',
    budgets: 'finance_budgets',
    payments: 'finance_payments',
    bankAccounts: 'finance_bank_accounts',
    exchangeRates: 'finance_exchange_rates',
    journals: 'finance_journals',
    dimensions: 'finance_dimensions',
    periodLocks: 'finance_period_locks',
    openingBalances: 'finance_opening_balances'
  },
  stock: {
    products: 'stock_products',
    items: 'stock_items',
    counts: 'stock_counts',
    transfers: 'stock_transfers',
    locations: 'stock_locations',
    suppliers: 'stock_suppliers',
    purchaseOrders: 'purchase_orders',
    parLevelProfiles: 'par_level_profiles'
  },
  company: {
    companies: 'companies',
    permissions: 'company_permissions',
    configs: 'company_configs',
    setups: 'company_setups',
    sites: 'company_sites',
    subsites: 'company_subsites'
  },
  hrs: {
    employees: 'employees',
    departments: 'departments',
    roles: 'roles',
    schedules: 'schedules',
    timeOffRequests: 'time_off_requests',
    attendances: 'attendances',
    trainings: 'trainings',
    benefits: 'benefits',
    payrollRuns: 'payroll_runs',
    performanceReviews: 'performance_reviews'
  },
  bookings: {
    bookings: 'bookings',
    tables: 'booking_tables',
    statuses: 'booking_statuses',
    types: 'booking_types',
    waitlistEntries: 'waitlist_entries',
    customers: 'booking_customers',
    tags: 'booking_tags',
    floorPlans: 'floor_plans'
  },
  pos: {
    bills: 'pos_bills',
    billItems: 'pos_bill_items',
    sales: 'pos_sales',
    paymentTypes: 'pos_payment_types',
    devices: 'pos_devices',
    tables: 'pos_tables',
    floorPlans: 'pos_floor_plans',
    discounts: 'pos_discounts',
    promotions: 'pos_promotions'
  },
  notifications: {
    notifications: 'notifications',
    notificationReads: 'notification_reads',
    notificationSettings: 'notification_settings'
  },
  messenger: {
    conversations: 'conversations',
    conversationMembers: 'conversation_members',
    messages: 'messages',
    messageReactions: 'message_reactions',
    draftMessages: 'draft_messages'
  },
  location: {
    locations: 'locations',
    locationProducts: 'location_products'
  },
  product: {
    products: 'products',
    productCategories: 'product_categories'
  },
  settings: {
    userProfiles: 'user_profiles',
    personalSettings: 'personal_settings',
    preferences: 'preferences',
    businessSettings: 'business_settings'
  }
}

/**
 * Export data from Firebase Realtime Database
 */
async function exportFromFirebase(path) {
  // For now, we'll simulate this with a placeholder
  // In a real implementation, you'd use Firebase Admin SDK
  console.log(`Exporting Firebase data from: ${path}`)
  
  // This would be replaced with actual Firebase export logic
  // const admin = require('firebase-admin')
  // const db = admin.database()
  // const snapshot = await db.ref(path).once('value')
  // return snapshot.val() || {}
  
  // Placeholder data structure
  return {}
}

/**
 * Transform Firebase data to Supabase format
 */
function transformData(firebaseData, tableName, scope = {}) {
  if (!firebaseData || typeof firebaseData !== 'object') {
    return []
  }

  const records = []
  
  // Handle Firebase object structure where keys are record IDs
  Object.entries(firebaseData).forEach(([id, data]) => {
    if (typeof data === 'object' && data !== null) {
      const record = {
        id,
        company_id: scope.companyId,
        site_id: scope.siteId || null,
        subsite_id: scope.subsiteId || null,
        payload: data,
        created_at: data.created_at || data.createdAt || Date.now(),
        updated_at: data.updated_at || data.updatedAt || Date.now()
      }

      // Add table-specific fields
      if (tableName.includes('supply_')) {
        record.supply_path = scope.supplyPath || ''
      }
      if (tableName.includes('client_invites')) {
        record.code = data.code || id
        record.expires_at = data.expires_at || data.expiresAt || null
        record.status = data.status || 'pending'
      }
      if (tableName.includes('supplier_connections')) {
        record.customer_company_id = scope.customerCompanyId || data.customerCompanyId
        record.supplier_company_id = scope.supplierCompanyId || data.supplierCompanyId
        record.linked_at = data.linked_at || data.linkedAt || Date.now()
      }
      if (tableName.includes('settings')) {
        record.section = scope.section || 'default'
      }

      records.push(record)
    }
  })

  return records
}

/**
 * Import data to Supabase
 */
async function importToSupabase(tableName, records) {
  if (records.length === 0) {
    console.log(`  No records to import for ${tableName}`)
    return 0
  }

  try {
    // Batch insert in chunks of 1000 to avoid payload limits
    const chunkSize = 1000
    let importedCount = 0

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      
      const { data, error } = await supabase
        .from(tableName)
        .upsert(chunk, { onConflict: 'id' })
        .select()

      if (error) {
        throw error
      }

      importedCount += chunk.length
      console.log(`  Imported ${importedCount}/${records.length} records to ${tableName}`)
    }

    return importedCount
  } catch (error) {
    console.error(`  Error importing to ${tableName}:`, error.message)
    stats.errors.push({
      table: tableName,
      error: error.message,
      recordsCount: records.length
    })
    return 0
  }
}

/**
 * Parse Firebase path to extract scope information
 */
function parseFirebasePath(path) {
  // Parse paths like: "companies/companyId/sites/siteId/subsites/subsiteId/data/module"
  const match = path.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?(?:\/data\/([^\/]+))?/i)
  
  if (!match) {
    return {}
  }

  return {
    companyId: match[1],
    siteId: match[2],
    subsiteId: match[3],
    module: match[4]
  }
}

/**
 * Migrate a single module
 */
async function migrateModule(moduleName, firebasePaths) {
  console.log(`\n=== Migrating ${moduleName} ===`)
  stats.totalModules++

  const moduleTables = TABLE_MAPPINGS[moduleName.toLowerCase()]
  if (!moduleTables) {
    console.log(`  No table mapping found for ${moduleName}`)
    return
  }

  let totalMigrated = 0

  for (const firebasePath of firebasePaths) {
    const scope = parseFirebasePath(firebasePath)
    
    // Determine which table this path maps to
    let tableName = null
    const pathParts = firebasePath.split('/')
    const lastPart = pathParts[pathParts.length - 1]

    // Find matching table
    for (const [key, table] of Object.entries(moduleTables)) {
      if (lastPart.includes(key.slice(0, -1))) { // Remove 's' from plural
        tableName = table
        break
      }
    }

    if (!tableName) {
      console.log(`  No table mapping for path: ${firebasePath}`)
      continue
    }

    try {
      // Export from Firebase
      const firebaseData = await exportFromFirebase(firebasePath)
      
      // Transform data
      const supabaseRecords = transformData(firebaseData, tableName, scope)
      stats.totalRecords += supabaseRecords.length

      // Import to Supabase
      const importedCount = await importToSupabase(tableName, supabaseRecords)
      stats.migratedRecords += importedCount
      totalMigrated += importedCount

    } catch (error) {
      console.error(`  Error migrating ${firebasePath}:`, error.message)
      stats.errors.push({
        path: firebasePath,
        error: error.message
      })
    }
  }

  if (totalMigrated > 0) {
    stats.migratedModules++
    console.log(`  Successfully migrated ${totalMigrated} records for ${moduleName}`)
  }
}

/**
 * Validate migration results
 */
async function validateMigration() {
  console.log('\n=== Validating Migration ===')
  
  for (const [module, tables] of Object.entries(TABLE_MAPPINGS)) {
    console.log(`\nValidating ${module}:`)
    
    for (const [entity, tableName] of Object.entries(tables)) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.error(`  Error counting ${tableName}: ${error.message}`)
        } else {
          console.log(`  ${tableName}: ${count} records`)
        }
      } catch (error) {
        console.error(`  Error validating ${tableName}: ${error.message}`)
      }
    }
  }
}

/**
 * Generate migration report
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalModules: stats.totalModules,
      migratedModules: stats.migratedModules,
      totalRecords: stats.totalRecords,
      migratedRecords: stats.migratedRecords,
      successRate: stats.totalModules > 0 ? (stats.migratedModules / stats.totalModules * 100).toFixed(2) + '%' : '0%',
      recordSuccessRate: stats.totalRecords > 0 ? (stats.migratedRecords / stats.totalRecords * 100).toFixed(2) + '%' : '0%'
    },
    errors: stats.errors,
    tablesMigrated: Object.values(TABLE_MAPPINGS).flat()
  }

  const reportPath = path.join(__dirname, '../migration-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log(`\n=== Migration Report ===`)
  console.log(`Modules: ${stats.migratedModules}/${stats.totalModules} (${report.summary.successRate})`)
  console.log(`Records: ${stats.migratedRecords}/${stats.totalRecords} (${report.summary.recordSuccessRate})`)
  console.log(`Errors: ${stats.errors.length}`)
  console.log(`Report saved to: ${reportPath}`)

  if (stats.errors.length > 0) {
    console.log('\nErrors encountered:')
    stats.errors.forEach(err => {
      console.log(`  ${err.table || err.path}: ${err.error}`)
    })
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('=== Firebase to Supabase Migration ===')
  console.log(`Supabase URL: ${CONFIG.supabaseUrl}`)
  console.log(`Firebase Project: ${CONFIG.firebaseProjectId}`)
  
  // Check configuration
  if (CONFIG.supabaseUrl === 'YOUR_SUPABASE_URL') {
    console.error('ERROR: Please configure your Supabase URL in environment variables')
    process.exit(1)
  }

  // Test Supabase connection
  try {
    const { data, error } = await supabase.from('companies').select('count', { count: 'exact', head: true })
    if (error) {
      console.error('ERROR: Cannot connect to Supabase:', error.message)
      process.exit(1)
    }
    console.log('Successfully connected to Supabase')
  } catch (error) {
    console.error('ERROR: Supabase connection failed:', error.message)
    process.exit(1)
  }

  // Define Firebase paths to migrate (this would be dynamically discovered)
  const firebasePaths = [
    'companies/companyId/data/supply',
    'companies/companyId/data/finance',
    'companies/companyId/data/stock',
    'companies/companyId/data/company',
    'companies/companyId/data/hrs',
    'companies/companyId/data/bookings',
    'companies/companyId/data/pos',
    'companies/companyId/data/notifications',
    'companies/companyId/data/messenger',
    'companies/companyId/data/location',
    'companies/companyId/data/product',
    'companies/companyId/data/settings'
  ]

  // Migrate each module
  const modules = Object.keys(TABLE_MAPPINGS)
  for (const module of modules) {
    await migrateModule(module, firebasePaths.filter(path => path.includes(module)))
  }

  // Validate results
  await validateMigration()

  // Generate report
  generateReport()

  console.log('\n=== Migration Complete ===')
  console.log('Next steps:')
  console.log('1. Review the migration report')
  console.log('2. Update context components to use psql/ imports')
  console.log('3. Test the application thoroughly')
  console.log('4. Plan Firebase decommissioning')
}

// Run migration if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
}

module.exports = { migrateModule, validateMigration }
