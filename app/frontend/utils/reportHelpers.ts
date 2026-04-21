/**
 * Report Helper Utilities
 * Provides common functions for reports to ensure consistent behavior
 */

import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays,
  isWithinInterval,
  parseISO,
  isValid,
  format
} from "date-fns"

/**
 * Calculate date range based on date type and current date
 * Ensures consistent date range calculations across all reports
 */
export const calculateDateRange = (
  dateType: "day" | "week" | "month" | "custom",
  currentDate: Date,
  customStartDate?: Date,
  customEndDate?: Date
): { startDate: Date; endDate: Date } => {
  // Validate currentDate
  if (!isValid(currentDate)) {
    const today = new Date()
    return { startDate: today, endDate: today }
  }

  switch (dateType) {
    case "day":
      return { startDate: currentDate, endDate: currentDate }
    
    case "week":
      return { 
        startDate: startOfWeek(currentDate, { weekStartsOn: 1 }), 
        endDate: endOfWeek(currentDate, { weekStartsOn: 1 }) 
      }
    
    case "month":
      return { 
        startDate: startOfMonth(currentDate), 
        endDate: endOfMonth(currentDate) 
      }
    
    case "custom":
      // Validate custom dates
      const start = customStartDate && isValid(customStartDate) ? customStartDate : subDays(new Date(), 7)
      const end = customEndDate && isValid(customEndDate) ? customEndDate : new Date()
      
      // Ensure start <= end
      if (start > end) {
        return { startDate: end, endDate: start }
      }
      
      return { startDate: start, endDate: end }
    
    default:
      // Default to current week
      return { 
        startDate: startOfWeek(currentDate, { weekStartsOn: 1 }), 
        endDate: endOfWeek(currentDate, { weekStartsOn: 1 }) 
      }
  }
}

/**
 * Filter data by company/site/subsite based on context
 * Ensures reports only show data for the selected company/site/subsite
 */
export const filterByCompanyContext = <T extends Record<string, any>>(
  data: T[] | null | undefined,
  selectedSiteID: string | null | undefined,
  selectedSubsiteID: string | null | undefined
): T[] => {
  if (!data || !Array.isArray(data)) return []
  
  // If no site/subsite selected, return all data (company level)
  if (!selectedSiteID && !selectedSubsiteID) {
    return data
  }
  
  // If subsite is selected, only show data for that subsite
  if (selectedSubsiteID && selectedSiteID) {
    return data.filter(item => {
      const itemSiteId = item.siteId || item.locationId
      const itemSubsiteId = item.subsiteId
      return itemSubsiteId === selectedSubsiteID && itemSiteId === selectedSiteID
    })
  }
  
  // If only site is selected, show data for that site (including subsites if no subsiteId field)
  if (selectedSiteID) {
    return data.filter(item => {
      const itemSiteId = item.siteId || item.locationId
      const itemSubsiteId = item.subsiteId
      // If item has subsiteId, it should match the selected site
      // If item doesn't have subsiteId, it's site-level data
      return itemSiteId === selectedSiteID && (!itemSubsiteId || itemSubsiteId === selectedSubsiteID)
    })
  }
  
  return data
}

/**
 * Safely parse a date string or Date object
 */
export const safeParseDate = (date: string | Date | null | undefined): Date | null => {
  if (!date) return null
  
  if (date instanceof Date) {
    return isValid(date) ? date : null
  }
  
  if (typeof date === 'string') {
    try {
      const parsed = parseISO(date)
      return isValid(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  
  return null
}

/**
 * Check if a date is within a date range (inclusive)
 */
export const isDateInRange = (
  date: string | Date | null | undefined,
  startDate: Date,
  endDate: Date
): boolean => {
  const parsedDate = safeParseDate(date)
  if (!parsedDate) return false
  
  try {
    return isWithinInterval(parsedDate, { start: startDate, end: endDate })
  } catch {
    return false
  }
}

/**
 * Validate and sanitize array data
 */
export const safeArray = <T>(data: T[] | null | undefined): T[] => {
  if (!data || !Array.isArray(data)) return []
  return data
}

/**
 * Get safe numeric value with default
 */
export const safeNumber = (value: number | null | undefined, defaultValue: number = 0): number => {
  if (value === null || value === undefined || isNaN(value)) return defaultValue
  return value
}

/**
 * Get safe string value with default
 */
export const safeString = (value: string | null | undefined, defaultValue: string = ""): string => {
  if (!value || typeof value !== 'string') return defaultValue
  return value
}

/**
 * Aggregate data points by frequency (daily, weekly, monthly, etc.)
 * Used for dashboard widgets to group time-series data
 */
export const aggregateByFrequency = <T extends { date: string; [key: string]: any }>(
  data: T[],
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  valueField: string = 'value',
  startDate?: Date,
  endDate?: Date
): Array<{ label: string; value: number; date: string }> => {
  if (!data || data.length === 0) return []
  
  const grouped = new Map<string, { sum: number; count: number; date: string }>()
  
  data.forEach(item => {
    const itemDate = safeParseDate(item.date)
    if (!itemDate) return
    
    // Filter by date range if provided
    if (startDate && endDate && !isDateInRange(item.date, startDate, endDate)) return
    
    let key = ''
    
    switch (frequency) {
      case 'hourly':
        key = format(itemDate, 'yyyy-MM-dd HH:00')
        break
      case 'daily':
        key = format(itemDate, 'yyyy-MM-dd')
        break
      case 'weekly':
        const weekStart = startOfWeek(itemDate, { weekStartsOn: 1 })
        key = format(weekStart, 'yyyy-MM-dd')
        break
      case 'monthly':
        const monthStart = startOfMonth(itemDate)
        key = format(monthStart, 'yyyy-MM')
        break
      case 'quarterly':
        const quarter = Math.floor(itemDate.getMonth() / 3)
        key = `${itemDate.getFullYear()}-Q${quarter + 1}`
        break
      case 'yearly':
        key = itemDate.getFullYear().toString()
        break
      default:
        key = format(itemDate, 'yyyy-MM-dd')
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, { sum: 0, count: 0, date: key })
    }
    
    const group = grouped.get(key)!
    const value = safeNumber(item[valueField], 0)
    group.sum += value
    group.count += 1
  })
  
  return Array.from(grouped.entries())
    .map(([key, group]) => ({
      label: group.date,
      value: group.sum,
      date: key
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

