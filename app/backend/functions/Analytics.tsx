import { 
  Product, 
  Sale, 
  Bill, 
  Purchase, 
  StockCount,
} from '../interfaces/Stock'
import { 
  Employee, 
  TimeOff, 
  Attendance, 
  Training, 
  Payroll,
} from '../interfaces/HRs'
import { 
  Booking, 
  BookingType, 
  Table, 
  Customer,
} from '../interfaces/Bookings'
import { 
  Transaction, 
  Invoice, 
  Bill as FinanceBill, 
  Expense,
  Budget
} from '../interfaces/Finance'

// ========== ANALYTICS TYPES ==========

export interface DateRange {
  startDate: string
  endDate: string
}

export interface FilterOptions {
  dateRange?: DateRange
  categories?: string[]
  locations?: string[]
  suppliers?: string[]
  employees?: string[]
  sites?: string[]
  subsites?: string[]
  customFilters?: Record<string, any>
}

export interface GroupByOptions {
  field: string
  type: 'date' | 'category' | 'location' | 'supplier' | 'employee' | 'site' | 'custom'
  interval?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export interface AnalyticsResult {
  data: any[]
  summary: {
    total: number
    average: number
    min: number
    max: number
    count: number
  }
  groupedData: Record<string, any>
  trends: {
    period: string
    change: number
    percentage: number
  }[]
  insights: string[]
}

export interface KPIMetrics {
  value: number
  label: string
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  trend: 'up' | 'down' | 'stable'
  format: 'currency' | 'number' | 'percentage' | 'time'
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
    borderWidth?: number
  }[]
}

// ========== STOCK ANALYTICS ==========

export const analyzeStockData = (
  data: Product[] | Sale[] | Purchase[] | StockCount[],
  groupBy?: GroupByOptions,
  filters?: FilterOptions
): AnalyticsResult => {
  let filteredData = [...data]

  // Apply filters
  if (filters) {
    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = (item as any).createdAt || (item as any).updatedAt || (item as any).date
        return itemDate >= filters.dateRange!.startDate && itemDate <= filters.dateRange!.endDate
      })
    }

    if (filters.categories && filters.categories.length > 0) {
      filteredData = filteredData.filter(item => 
        'category' in item && filters.categories!.includes((item as any).category)
      )
    }

    if (filters.suppliers && filters.suppliers.length > 0) {
      filteredData = filteredData.filter(item => 
        'supplierId' in item && filters.suppliers!.includes((item as any).supplierId)
      )
    }

    if (filters.locations && filters.locations.length > 0) {
      filteredData = filteredData.filter(item => 
        'locationId' in item && filters.locations!.includes((item as any).locationId)
      )
    }
  }

  // Calculate summary statistics
  const values = filteredData.map(item => {
    if ('price' in item) return (item as any).price
    if ('quantity' in item) return (item as any).quantity
    if ('total' in item) return (item as any).total
    if ('amount' in item) return (item as any).amount
    return 0
  })

  const summary = {
    total: values.reduce((sum: any, val: any) => sum + val, 0),
    average: values.length > 0 ? values.reduce((sum: any, val: any) => sum + val, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    count: filteredData.length
  }

  // Group data if groupBy is specified
  let groupedData: Record<string, any> = {}
  if (groupBy) {
    groupedData = groupDataByField(filteredData as any[], groupBy)
  }

  // Calculate trends (simplified)
  const trends = calculateTrends(filteredData, groupBy)

  // Generate insights
  const insights = generateInsights(filteredData, summary, groupBy)

  return {
    data: filteredData,
    summary,
    groupedData,
    trends,
    insights
  }
}

// ========== HR ANALYTICS ==========

export const analyzeHRData = (
  data: Employee[] | TimeOff[] | Attendance[] | Training[] | Payroll[],
  groupBy?: GroupByOptions,
  filters?: FilterOptions
): AnalyticsResult => {
  let filteredData = [...data]

  // Apply filters
  if (filters) {
    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = (item as any).createdAt || (item as any).updatedAt || (item as any).date || (item as any).startDate
        return itemDate >= filters.dateRange!.startDate && itemDate <= filters.dateRange!.endDate
      })
    }

    if (filters.employees && filters.employees.length > 0) {
      filteredData = filteredData.filter(item => 
        'employeeId' in item && filters.employees!.includes((item as any).employeeId)
      )
    }
  }

  // Calculate summary statistics
  const values = filteredData.map(item => {
    if ('salary' in item) return (item as any).salary
    if ('hours' in item) return (item as any).hours
    if ('amount' in item) return (item as any).amount
    return 1 // Count for other types
  })

  const summary = {
    total: values.reduce((sum: any, val: any) => sum + val, 0),
    average: values.length > 0 ? values.reduce((sum: any, val: any) => sum + val, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    count: filteredData.length
  }

  // Group data if groupBy is specified
  let groupedData: Record<string, any> = {}
  if (groupBy) {
    groupedData = groupDataByField(filteredData as any[], groupBy)
  }

  // Calculate trends
  const trends = calculateTrends(filteredData, groupBy)

  // Generate insights
  const insights = generateInsights(filteredData, summary, groupBy)

  return {
    data: filteredData,
    summary,
    groupedData,
    trends,
    insights
  }
}

// ========== BOOKINGS ANALYTICS ==========

export const analyzeBookingsData = (
  data: Booking[] | BookingType[] | Table[] | Customer[],
  groupBy?: GroupByOptions,
  filters?: FilterOptions
): AnalyticsResult => {
  let filteredData = [...data]

  // Apply filters
  if (filters) {
    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = (item as any).createdAt || (item as any).updatedAt || (item as any).date || (item as any).bookingDate
        return itemDate >= filters.dateRange!.startDate && itemDate <= filters.dateRange!.endDate
      })
    }

    if (filters.locations && filters.locations.length > 0) {
      filteredData = filteredData.filter(item => 
        'locationId' in item && filters.locations!.includes((item as any).locationId)
      )
    }
  }

  // Calculate summary statistics
  const values = filteredData.map(item => {
    if ('partySize' in item) return (item as any).partySize
    if ('duration' in item) return (item as any).duration
    if ('revenue' in item) return (item as any).revenue
    return 1 // Count for other types
  })

  const summary = {
    total: values.reduce((sum: any, val: any) => sum + val, 0),
    average: values.length > 0 ? values.reduce((sum: any, val: any) => sum + val, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    count: filteredData.length
  }

  // Group data if groupBy is specified
  let groupedData: Record<string, any> = {}
  if (groupBy) {
    groupedData = groupDataByField(filteredData as any[], groupBy)
  }

  // Calculate trends
  const trends = calculateTrends(filteredData, groupBy)

  // Generate insights
  const insights = generateInsights(filteredData, summary, groupBy)

  return {
    data: filteredData,
    summary,
    groupedData,
    trends,
    insights
  }
}

// ========== FINANCE ANALYTICS ==========

export const analyzeFinanceData = (
  data: Transaction[] | Invoice[] | FinanceBill[] | Expense[] | Budget[],
  groupBy?: GroupByOptions,
  filters?: FilterOptions
): AnalyticsResult => {
  let filteredData = [...data]

  // Apply filters
  if (filters) {
    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = (item as any).createdAt || (item as any).updatedAt || (item as any).date || (item as any).transactionDate
        return itemDate >= filters.dateRange!.startDate && itemDate <= filters.dateRange!.endDate
      })
    }
  }

  // Calculate summary statistics
  const values = filteredData.map(item => {
    if ('amount' in item) return (item as any).amount
    if ('total' in item) return (item as any).total
    if ('value' in item) return (item as any).value
    return 0
  })

  const summary = {
    total: values.reduce((sum: any, val: any) => sum + val, 0),
    average: values.length > 0 ? values.reduce((sum: any, val: any) => sum + val, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    count: filteredData.length
  }

  // Group data if groupBy is specified
  let groupedData: Record<string, any> = {}
  if (groupBy) {
    groupedData = groupDataByField(filteredData as any[], groupBy)
  }

  // Calculate trends
  const trends = calculateTrends(filteredData, groupBy)

  // Generate insights
  const insights = generateInsights(filteredData, summary, groupBy)

  return {
    data: filteredData,
    summary,
    groupedData,
    trends,
    insights
  }
}

// ========== POS ANALYTICS ==========

export const analyzePOSData = (
  data: Sale[] | Bill[],
  groupBy?: GroupByOptions,
  filters?: FilterOptions
): AnalyticsResult => {
  let filteredData = [...data]

  // Apply filters
  if (filters) {
    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = (item as any).createdAt || (item as any).updatedAt || (item as any).date || (item as any).tradingDate
        return itemDate >= filters.dateRange!.startDate && itemDate <= filters.dateRange!.endDate
      })
    }
  }

  // Calculate summary statistics
  const values = filteredData.map(item => {
    if ('total' in item) return (item as any).total
    if ('amount' in item) return (item as any).amount
    if ('subtotal' in item) return (item as any).subtotal
    return 0
  })

  const summary = {
    total: values.reduce((sum: any, val: any) => sum + val, 0),
    average: values.length > 0 ? values.reduce((sum: any, val: any) => sum + val, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    count: filteredData.length
  }

  // Group data if groupBy is specified
  let groupedData: Record<string, any> = {}
  if (groupBy) {
    groupedData = groupDataByField(filteredData as any[], groupBy)
  }

  // Calculate trends
  const trends = calculateTrends(filteredData, groupBy)

  // Generate insights
  const insights = generateInsights(filteredData, summary, groupBy)

  return {
    data: filteredData,
    summary,
    groupedData,
    trends,
    insights
  }
}

// ========== UTILITY FUNCTIONS ==========

const groupDataByField = (data: any[], groupBy: GroupByOptions): Record<string, any> => {
  const grouped: Record<string, any> = {}

  data.forEach(item => {
    let groupKey = ''
    
    if (groupBy.type === 'date' && groupBy.interval) {
      const date = new Date((item as any).createdAt || (item as any).updatedAt || (item as any).date || (item as any).tradingDate)
      groupKey = formatDateByInterval(date, groupBy.interval)
    } else if (groupBy.field in item) {
      groupKey = (item as any)[groupBy.field] || 'Unknown'
    } else {
      groupKey = 'Unknown'
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = []
    }
    grouped[groupKey].push(item)
  })

  return grouped
}

const formatDateByInterval = (date: Date, interval: string): string => {
  switch (interval) {
    case 'day':
      return date.toISOString().split('T')[0]
    case 'week':
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      return weekStart.toISOString().split('T')[0]
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `${date.getFullYear()}-Q${quarter}`
    case 'year':
      return date.getFullYear().toString()
    default:
      return date.toISOString().split('T')[0]
  }
}

const calculateTrends = (_data: any[], _groupBy?: GroupByOptions): any[] => {
  // Simplified trend calculation
  // In a real implementation, this would calculate actual trends over time
  // TODO: Use data and groupBy parameters when implementing trends
  return []
}

const generateInsights = (_data: any[], summary: any, _groupBy?: GroupByOptions): string[] => {
  // TODO: Use data and groupBy parameters when implementing insights
  const insights: string[] = []
  
  if (summary.count > 0) {
    insights.push(`Total records analyzed: ${summary.count}`)
  }
  
  if (summary.average > 0) {
    insights.push(`Average value: ${summary.average.toFixed(2)}`)
  }
  
  if (summary.total > 0) {
    insights.push(`Total value: ${summary.total.toFixed(2)}`)
  }

  return insights
}

// ========== KPI CALCULATION FUNCTIONS ==========

export const calculateStockKPIs = (products: Product[], _sales: Sale[], _purchases: Purchase[]): KPIMetrics[] => {
  const totalStockValue = products.reduce((sum, product) => sum + ((product.price || 0) * (product.quantity || 0)), 0)
  const totalItems = products.length
  const lowStockCount = products.filter(p => (p.quantity || 0) < (p.parLevel || 10)).length
  
  // TODO: Use sales and purchases parameters when implementing advanced KPIs
  
  return [
    {
      value: totalStockValue,
      label: 'Total Stock Value',
      change: 0, // Would calculate from previous period
      changeType: 'neutral',
      trend: 'stable',
      format: 'currency'
    },
    {
      value: totalItems,
      label: 'Total Items',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'number'
    },
    {
      value: lowStockCount,
      label: 'Low Stock Items',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'number'
    }
  ]
}

export const calculateHRKPIs = (employees: Employee[], timeOffs: TimeOff[], _attendances: Attendance[]): KPIMetrics[] => {
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.status === 'active').length
  const pendingTimeOff = timeOffs.filter(t => t.status === 'pending').length
  
  // TODO: Use attendances parameter when implementing advanced HR KPIs
  
  return [
    {
      value: totalEmployees,
      label: 'Total Employees',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'number'
    },
    {
      value: activeEmployees,
      label: 'Active Employees',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'number'
    },
    {
      value: pendingTimeOff,
      label: 'Pending Time Off',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'number'
    }
  ]
}

export const calculateFinanceKPIs = (transactions: Transaction[], _invoices: Invoice[], expenses: Expense[]): KPIMetrics[] => {
  const totalRevenue = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + ((t as any).amount || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + ((e as any).amount || 0), 0)
  const profit = totalRevenue - totalExpenses
  
  // TODO: Use invoices parameter when implementing advanced KPIs
  
  return [
    {
      value: totalRevenue,
      label: 'Total Revenue',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'currency'
    },
    {
      value: totalExpenses,
      label: 'Total Expenses',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'currency'
    },
    {
      value: profit,
      label: 'Profit',
      change: 0,
      changeType: 'neutral',
      trend: 'stable',
      format: 'currency'
    }
  ]
}

// ========== CHART DATA GENERATION ==========

export const generateChartData = (
  data: any[],
  groupBy: GroupByOptions,
  valueField: string = 'value'
): ChartData => {
  const grouped = groupDataByField(data, groupBy)
  
  const labels = Object.keys(grouped).sort()
  const values = labels.map(label => {
    const groupData = grouped[label]
    return groupData.reduce((sum: number, item: any) => {
      const value = item[valueField] || 0
      return sum + value
    }, 0)
  })

  return {
    labels,
    datasets: [{
      label: groupBy.field,
      data: values,
      backgroundColor: generateColors(labels.length),
      borderColor: generateColors(labels.length, 0.8),
      borderWidth: 1
    }]
  }
}

const generateColors = (count: number, alpha: number = 0.6): string[] => {
  const colors = [
    'rgba(255, 99, 132, ',
    'rgba(54, 162, 235, ',
    'rgba(255, 205, 86, ',
    'rgba(75, 192, 192, ',
    'rgba(153, 102, 255, ',
    'rgba(255, 159, 64, ',
    'rgba(199, 199, 199, ',
    'rgba(83, 102, 255, ',
    'rgba(255, 99, 255, ',
    'rgba(99, 255, 132, '
  ]
  
  return Array.from({ length: count }, (_, i) => colors[i % colors.length] + alpha + ')')
}
