#!/usr/bin/env node

/**
 * Generate psql/ modules from rtdatabase/ modules
 * This script converts Firebase RTDB modules to Supabase equivalents
 */

const fs = require('fs')
const path = require('path')

const RTDB_DIR = path.join(__dirname, '../rtdatabase')
const PSQL_DIR = path.join(__dirname, '../psql')

// Table mapping based on your existing migrations
const TABLE_MAPPINGS = {
  'Supply': {
    clients: 'supply_clients',
    orders: 'supply_orders', 
    deliveries: 'supply_deliveries',
    clientInvites: 'supply_client_invites',
    supplierConnections: 'supply_supplier_connections',
    settings: 'supply_settings'
  },
  'Finance': {
    accounts: 'finance_accounts',
    transactions: 'finance_transactions',
    bills: 'finance_bills',
    invoices: 'finance_invoices',
    contacts: 'finance_contacts',
    budgets: 'finance_budgets',
    payments: 'finance_payments',
    bankAccounts: 'finance_bank_accounts',
    exchangeRates: 'finance_exchange_rates'
  },
  'Stock': {
    products: 'stock_products',
    items: 'stock_items',
    counts: 'stock_counts',
    transfers: 'stock_transfers',
    locations: 'stock_locations',
    suppliers: 'stock_suppliers',
    purchaseOrders: 'purchase_orders',
    parLevelProfiles: 'par_level_profiles'
  },
  'Company': {
    companies: 'companies',
    permissions: 'company_permissions',
    configs: 'company_configs',
    setups: 'company_setups',
    sites: 'company_sites',
    subsites: 'company_subsites'
  },
  'HRs': {
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
  'Bookings': {
    bookings: 'bookings',
    tables: 'booking_tables',
    statuses: 'booking_statuses',
    types: 'booking_types',
    waitlistEntries: 'waitlist_entries',
    customers: 'booking_customers',
    tags: 'booking_tags',
    floorPlans: 'floor_plans'
  },
  'POS': {
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
  'Notifications': {
    notifications: 'notifications',
    notificationReads: 'notification_reads',
    notificationSettings: 'notification_settings'
  },
  'Messenger': {
    conversations: 'conversations',
    conversationMembers: 'conversation_members',
    messages: 'messages',
    messageReactions: 'message_reactions',
    draftMessages: 'draft_messages'
  },
  'Location': {
    locations: 'locations',
    locationProducts: 'location_products'
  },
  'Product': {
    products: 'products',
    productCategories: 'product_categories'
  },
  'Settings': {
    userProfiles: 'user_profiles',
    personalSettings: 'personal_settings',
    preferences: 'preferences',
    businessSettings: 'business_settings'
  },
  'Accounting': {
    // Uses finance tables
  },
  'FinanceAccounting': {
    // Uses finance tables  
  },
  'FinanceJournals': {
    journals: 'finance_journals',
    dimensions: 'finance_dimensions',
    periodLocks: 'finance_period_locks',
    openingBalances: 'finance_opening_balances'
  }
}

function generatePsqlModule(moduleName, rtdbContent) {
  const tables = TABLE_MAPPINGS[moduleName] || {}
  
  const imports = [
    `"use client"`,
    '',
    `import { supabase, SupabaseTable, getCompanyScope, parseLegacyPath } from "./client"`,
    `import type { ${getInterfaceImports(rtdbContent)} } from "../interfaces/${moduleName}"`
  ]

  const tableDefinitions = Object.entries(tables).map(([name, tableName]) => {
    return `const ${name}Table = new SupabaseTable<any>('${tableName}')`
  }).join('\n')

  const functionMappings = extractFunctionMappings(rtdbContent, tables)

  const template = `${imports.join('\n')}

type AnyObj = Record<string, any>

// =========================
// Supabase table helpers
// =========================

${tableDefinitions}

// Helper to extract company scope from legacy path
function getScopeFromPath(path: string) {
  const parsed = parseLegacyPath(path)
  if (!parsed.companyId) {
    throw new Error(\`Invalid path format: \${path}\`)
  }
  return getCompanyScope(parsed.companyId, parsed.siteId, parsed.subsiteId)
}

// Helper to convert payload to typed object
function fromPayload<T>(record: any): T {
  return record.payload as T
}

${functionMappings}
`

  return template
}

function getInterfaceImports(content) {
  // Extract import types from the original file
  const importMatch = content.match(/import type \{([^}]+)\} from/)
  return importMatch ? importMatch[1] : 'any'
}

function extractFunctionMappings(content, tables) {
  // Extract function signatures and convert them to Supabase equivalents
  const functions = []
  
  // Find all export functions
  const functionMatches = content.match(/export\s+(?:async\s+)?function\s+(\w+)|export\s+(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?/g)
  
  if (functionMatches) {
    functionMatches.forEach(match => {
      const functionName = match.match(/(\w+)/)[1]
      functions.push(generateFunctionMapping(functionName, tables))
    })
  }

  return functions.join('\n\n')
}

function generateFunctionMapping(functionName, tables) {
  // Generate Supabase equivalent for common patterns
  if (functionName.startsWith('subscribe')) {
    return generateSubscribeFunction(functionName, tables)
  } else if (functionName.startsWith('fetch') || functionName.startsWith('get')) {
    return generateFetchFunction(functionName, tables)
  } else if (functionName.startsWith('create')) {
    return generateCreateFunction(functionName, tables)
  } else if (functionName.startsWith('update')) {
    return generateUpdateFunction(functionName, tables)
  } else if (functionName.startsWith('delete')) {
    return generateDeleteFunction(functionName, tables)
  }
  
  return `// TODO: Implement ${functionName}`
}

function generateSubscribeFunction(functionName, tables) {
  const entityName = functionName.replace('subscribe', '').toLowerCase()
  const tableName = tables[entityName + 's'] || tables[entityName]
  
  if (!tableName) return `// TODO: Implement ${functionName} - table mapping not found`

  return `export function ${functionName}(
  path: string,
  onData: (rows: any[]) => void,
  onError?: (message: string) => void,
): () => void {
  const scope = getScopeFromPath(path)
  let active = true

  const fetchData = async () => {
    try {
      const records = await ${entityName}sTable.select(scope)
      const data = records.map(fromPayload<any>)
      if (active) onData(data)
    } catch (error: any) {
      if (active) onError?.(error?.message || "Failed to load data")
    }
  }

  void fetchData()
  const intervalId = setInterval(fetchData, 15000)

  return () => {
    active = false
    clearInterval(intervalId)
  }
}`
}

function generateFetchFunction(functionName, tables) {
  const entityName = functionName.replace('fetch', '').replace('get', '').toLowerCase()
  const tableName = tables[entityName + 's'] || tables[entityName]
  
  if (!tableName) return `// TODO: Implement ${functionName} - table mapping not found`

  return `export async function ${functionName}(path: string): Promise<any[]> {
  const scope = getScopeFromPath(path)
  const records = await ${entityName}sTable.select(scope)
  return records.map(fromPayload<any>)
}`
}

function generateCreateFunction(functionName, tables) {
  const entityName = functionName.replace('create', '').toLowerCase()
  const tableName = tables[entityName + 's'] || tables[entityName]
  
  if (!tableName) return `// TODO: Implement ${functionName} - table mapping not found`

  return `export async function ${functionName}(path: string, data: any): Promise<string> {
  const scope = getScopeFromPath(path)
  const record = await ${entityName}sTable.insert({
    ...scope,
    payload: data
  })
  return record.id
}`
}

function generateUpdateFunction(functionName, tables) {
  const entityName = functionName.replace('update', '').toLowerCase()
  const tableName = tables[entityName + 's'] || tables[entityName]
  
  if (!tableName) return `// TODO: Implement ${functionName} - table mapping not found`

  return `export async function ${functionName}(
  path: string,
  id: string,
  updates: any,
): Promise<void> {
  await ${entityName}sTable.update(id, {
    payload: updates
  })
}`
}

function generateDeleteFunction(functionName, tables) {
  const entityName = functionName.replace('delete', '').toLowerCase()
  const tableName = tables[entityName + 's'] || tables[entityName]
  
  if (!tableName) return `// TODO: Implement ${functionName} - table mapping not found`

  return `export async function ${functionName}(path: string, id: string): Promise<void> {
  await ${entityName}sTable.delete(id)
}`
}

// Main execution
async function main() {
  console.log('Generating psql modules from rtdatabase modules...')
  
  // Ensure psql directory exists
  if (!fs.existsSync(PSQL_DIR)) {
    fs.mkdirSync(PSQL_DIR, { recursive: true })
  }

  // Get all RTDB files
  const rtdbFiles = fs.readdirSync(RTDB_DIR).filter(file => file.endsWith('.tsx'))
  
  console.log(`Found ${rtdbFiles.length} RTDB modules to convert`)
  
  for (const file of rtdbFiles) {
    const moduleName = path.basename(file, '.tsx')
    const rtdbPath = path.join(RTDB_DIR, file)
    const psqlPath = path.join(PSQL_DIR, file)
    
    console.log(`Converting ${moduleName}...`)
    
    try {
      const rtdbContent = fs.readFileSync(rtdbPath, 'utf8')
      const psqlContent = generatePsqlModule(moduleName, rtdbContent)
      
      fs.writeFileSync(psqlPath, psqlContent)
      console.log(`  Generated ${psqlPath}`)
    } catch (error) {
      console.error(`  Error converting ${moduleName}:`, error.message)
    }
  }
  
  console.log('Done! All psql modules generated.')
  console.log('\nNext steps:')
  console.log('1. Review and customize the generated modules')
  console.log('2. Update context components to import from psql/ instead of rtdatabase/')
  console.log('3. Run the data migration script')
  console.log('4. Test the implementation')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { generatePsqlModule }
