import { createClient } from '@supabase/supabase-js'
import { APP_KEYS } from '../config/keys'

const supabaseUrl = APP_KEYS.supabase.url
const supabaseServiceKey = APP_KEYS.supabase.serviceRoleKey

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper for standard table operations
export class SupabaseTable<T> {
  constructor(private tableName: string) {}

  async select(conditions?: Partial<T>): Promise<T[]> {
    let query = supabase.from(this.tableName).select('*')
    
    if (conditions) {
      Object.entries(conditions).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async selectOne(conditions: Partial<T>): Promise<T | null> {
    const results = await this.select(conditions)
    return results.length > 0 ? results[0] : null
  }

  async insert(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([{ ...data, created_at: Date.now(), updated_at: Date.now() }])
      .select()
      .single()

    if (error) throw error
    return result
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({ ...updates, updated_at: Date.now() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async upsert(data: T): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .upsert({ ...data, updated_at: Date.now() })
      .select()
      .single()

    if (error) throw error
    return result
  }
}

// Helper for company-scoped queries
export function getCompanyScope(companyId: string, siteId?: string, subsiteId?: string) {
  return {
    company_id: companyId,
    ...(siteId && { site_id: siteId }),
    ...(subsiteId && { subsite_id: subsiteId })
  }
}

// Helper for parsing legacy RTDB paths
export function parseLegacyPath(path: string): {
  companyId?: string
  siteId?: string  
  subsiteId?: string
  remainingPath?: string
} {
  const match = path.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?(?:\/.*)?$/i)
  if (!match) return {}

  return {
    companyId: match[1],
    siteId: match[2],
    subsiteId: match[3],
    remainingPath: match[0]
  }
}
