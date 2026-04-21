// Currency utilities for frontend components
export const DEFAULT_CURRENCY = "GBP"
export const CURRENCY_SYMBOL = "£"

/**
 * Format a number as currency in GBP
 */
export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  if (currency === "GBP") {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format a number with GBP symbol (for cases where you just need the symbol)
 */
export const formatWithGBPSymbol = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Check if a data type should display as currency
 */
export const isCurrencyDataType = (dataType: string): boolean => {
  const currencyTypes = [
    'stockValue',
    'stockProfit', 
    'inventoryValue',
    'profit',
    'costOfSales',
    'revenue',
    'expenses',
    'cashBalance',
    'sales',
    'purchases',
    'totalPurchaseValue',
    'totalSalesValue',
    'totalCostValue',
    'payroll',
    'payrollCost',
    'payrollBreakdown',
    'posSales',
    'posTransactions',
    'totalTransactions',
    'dailySales',
    'hourlySales',
    'salesByDay',
    'salesByHour',
    'totalRevenue',
    'averageBookingValue',
    'revenuePerBooking'
  ]
  return currencyTypes.includes(dataType)
}

/**
 * Get the appropriate prefix for a data type
 */
export const getCurrencyPrefix = (dataType: string): string => {
  return isCurrencyDataType(dataType) ? CURRENCY_SYMBOL : ""
}

/**
 * Format a value based on its data type
 */
export const formatValueByDataType = (value: number, dataType: string): string => {
  if (isCurrencyDataType(dataType)) {
    return formatCurrency(value)
  } else if (dataType === 'profitMargin' || dataType === 'PROFIT_MARGIN') {
    return `${value.toFixed(1)}%`
  } else {
    return value.toLocaleString('en-GB')
  }
}
