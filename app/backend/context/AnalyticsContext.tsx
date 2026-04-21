import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  analyzeHRData as analyzeHRDataAI,
  analyzeStockData as analyzeStockDataAI,
  analyzeBookingsData as analyzeBookingsDataAI,
  analyzeFinanceData as analyzeFinanceDataAI,
  analyzePOSData as analyzePOSDataAI,
  analyzeCompanyData,
  generateBusinessReport,
} from '../services/VertexService';
import { useCompany } from './CompanyContext';
import { useSettings } from './SettingsContext';
import { useStock } from './StockContext';
import { useHR } from './HRContext';
import { useBookings } from './BookingsContext';
import { usePOS } from './POSContext';
import { useFinance } from './FinanceContext';
import { useMessenger } from './MessengerContext';
import { debugLog, debugWarn } from '../utils/debugLog';
import { performanceTimer } from '../utils/PerformanceTimer';
import { dataCache } from '../utils/DataCache';
import { 
  fetchIntegrationsFromPath as fetchFromPathFn,
  saveIntegrationToPath as saveToPathFn,
} from "../providers/supabase/Settings";
// Import RTDatabase modules
import * as StockRTDB from "../providers/supabase/Stock";
import * as StockFunctions from '../functions/Stock';
import * as HRRTDB from "../providers/supabase/HRs";
import * as BookingsRTDB from "../providers/supabase/Bookings";
import * as FinanceRTDB from "../providers/supabase/Finance";
// POS functions are in Stock and Finance RTDatabase modules
import * as CompanyRTDB from "../providers/supabase/Company";
// import * as FinanceFunctions from '../functions/Finance'; // TODO: Implement FinanceFunctions
// New comprehensive analytics functions
import {
  analyzeStockData,
  analyzeHRData,
  analyzeBookingsData,
  analyzeFinanceData,
  analyzePOSData,
  calculateStockKPIs,
  calculateHRKPIs,
  calculateFinanceKPIs,
  generateChartData,
  // type DateRange,
  type FilterOptions,
  type GroupByOptions,
  type AnalyticsResult,
  type KPIMetrics,
  type ChartData
} from '../functions/Analytics';
// Import helper functions for filtering
import { 
  safeArray, 
  safeNumber, 
  safeString,
  safeParseDate
} from '../../frontend/utils/reportHelpers';

// Lightweight widget data contracts for dashboards
interface TimeSeriesPoint { label: string; value: number }

interface FinanceWidgets {
  kpis: {
    cashBalance: number;
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
    outstandingInvoices: number;
    monthlyExpenses: number;
    quarterlyRevenue: number;
    yearlyRevenue: number;
    accountsReceivable: number;
    accountsPayable: number;
    currentRatio: number;
    debtToEquity: number;
    returnOnInvestment: number;
    burnRate: number;
    runway: number;
  };
  cashFlow: Array<{ month: string; inflow: number; outflow: number; net: number; forecast: number }>;
  revenueBySource: Array<{ source: string; amount: number; percentage: number; growth: number }>;
  expensesByCategory: Array<{ category: string; amount: number; percentage: number; trend: string }>;
  profitLossTrends: Array<{ month: string; revenue: number; expenses: number; profit: number; margin: number }>;
  budgetVsActual: Array<{ category: string; budgeted: number; actual: number; variance: number; percentage: number }>;
  invoiceAnalysis: Array<{ status: string; count: number; amount: number; avgDays: number }>;
  paymentTrends: Array<{ method: string; amount: number; count: number; percentage: number }>;
  financialRatios: Array<{ ratio: string; value: number; benchmark: number; status: string }>;
  taxAnalysis: Array<{ period: string; taxableIncome: number; taxOwed: number; rate: number }>;
}

interface BookingsWidgets {
  kpis: {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
    averagePartySize: number;
    occupancyRate: number;
    revenuePerBooking: number;
    repeatCustomers: number;
    bookingConversionRate: number;
    averageLeadTime: number;
    peakBookingHours: string;
    totalRevenue: number;
  };
  bookingsByDay: Array<{ date: string; bookings: number; revenue: number; occupancy: number }>;
  bookingsByHour: Array<{ hour: string; bookings: number; utilization: number }>;
  bookingsBySource: Array<{ source: string; count: number; conversion: number }>;
  bookingsByPartySize: Array<{ size: number; count: number; revenue: number }>;
  customerSegments: Array<{ segment: string; count: number; averageSpend: number; frequency: number }>;
  tableUtilization: Array<{ table: string; bookings: number; revenue: number; utilization: number }>;
  seasonalTrends: Array<{ month: string; bookings: number; revenue: number; growth: number }>;
  cancellationAnalysis: Array<{ reason: string; count: number; leadTime: number; impact: number }>;
  waitlistAnalysis: Array<{ date: string; waitlisted: number; converted: number; conversionRate: number }>;
}

interface POSWidgets {
  kpis: { 
    totalSales: number; 
    totalTransactions: number;
    averageTransactionValue: number;
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    totalCustomers: number;
    repeatCustomers: number;
    peakHourSales: number;
    discountsGiven: number;
    refundsProcessed: number;
    cashSales: number;
    cardSales: number;
    /** Best-effort (from bills if available) */
    serviceChargeTotal?: number;
    /** Best-effort (from bills if available) */
    tipsTotal?: number;
    /** Best-effort (from bills if available) */
    grossTakings?: number;
    /** Best-effort: grossTakings - tipsTotal - serviceChargeTotal */
    netTakings?: number;
  };
  salesByDay: TimeSeriesPoint[];
  salesByHour: Array<{ hour: string; sales: number; transactions: number }>;
  salesByWeekday: Array<{ day: string; sales: number; transactions: number }>;
  paymentMethodBreakdown: Record<string, number>;
  topSellingItems: Array<{ item: string; quantity: number; revenue: number }>;
  customerAnalytics: Array<{ segment: string; count: number; averageSpend: number }>;
  discountAnalysis: Array<{ type: string; amount: number; usage: number; impact: number }>;
  refundAnalysis: Array<{ date: string; amount: number; reason: string; items: number }>;
  peakTimes: Array<{ timeSlot: string; avgSales: number; avgTransactions: number }>;
  tableUtilization: Array<{ table: string; utilization: number; revenue: number; turns: number }>;
}

interface HRWidgets {
  kpis: { 
    totalEmployees: number; 
    activeEmployees: number; 
    pendingTimeOff: number; 
    trainingsCompleted: number;
    totalDepartments: number;
    averageAttendance: number;
    turnoverRate: number;
    trainingCompletionRate: number;
    performanceScore: number;
    recruitmentActive: number;
    payrollTotal: number;
    overtimeHours: number;
  };
  employeesByDepartment: Array<{ department: string; count: number; active: number }>;
  attendanceTrends: Array<{ date: string; present: number; absent: number; late: number }>;
  performanceMetrics: Array<{ employee: string; score: number; department: string; trend: string }>;
  trainingProgress: Array<{ course: string; completed: number; total: number; completion: number }>;
  payrollBreakdown: Array<{ department: string; amount: number; employees: number; average: number }>;
  timeOffRequests: Array<{ date: string; approved: number; pending: number; rejected: number }>;
  recruitmentFunnel: Array<{ stage: string; count: number; conversion: number }>;
  turnoverAnalysis: Array<{ month: string; joined: number; left: number; netChange: number }>;
}

interface StockWidgets {
  kpis: { 
    totalStockValue: number; 
    totalItems: number; 
    lowStockCount: number;
    totalCategories: number;
    totalSuppliers: number;
    averageStockTurnover: number;
    totalPurchaseValue: number;
    totalSalesValue: number;
    profitMargin: number;
    stockAccuracy: number;
    reorderRequired: number;
    expiredItems: number;
  };
  stockByCategory: Array<{ category: string; value: number; count: number }>;
  stockBySupplier: Array<{ supplier: string; value: number; count: number }>;
  stockByLocation: Array<{ location: string; value: number; count: number }>;
  topSellingItems: Array<{ name: string; quantity: number; value: number }>;
  lowStockItems: Array<{ name: string; current: number; required: number; status: string }>;
  stockTrends: Array<{ date: string; stockValue: number; itemCount: number; transactions: number }>;
  purchaseHistory: Array<{ date: string; amount: number; items: number; supplier: string }>;
  salesHistory: Array<{ date: string; amount: number; items: number; profit: number }>;
  stockCounts: Array<{ date: string; counted: number; variance: number; accuracy: number }>;
  parLevelStatus: Array<{ item: string; current: number; parLevel: number; status: string }>;
  profitAnalysis: Array<{ item: string; cost: number; price: number; margin: number; volume: number }>;
}

interface CompanyWidgets {
  kpis: {
    totalSites: number;
    totalSubsites: number;
    totalEmployees: number;
    totalChecklists: number;
    completionRate: number;
  };
  checklistStats: Array<{ name: string; completionRate: number; overdue: number }>;
  sitePerformance: Array<{ siteName: string; score: number; issues: number }>;
}

interface AnalyticsContextType {
  loading: boolean;
  error: string | null;
  
  // AI Analysis Functions (existing)
  analyzeHR: () => Promise<string>;
  analyzeStock: () => Promise<string>;
  analyzeBookings: (startDate?: string, endDate?: string) => Promise<string>;
  analyzeFinance: (startDate?: string, endDate?: string) => Promise<string>;
  analyzePOS: (startDate?: string, endDate?: string) => Promise<string>;
  analyzeCompany: () => Promise<string>;
  
  // Comprehensive Analytics Functions (new)
  getStockAnalytics: (groupBy?: GroupByOptions, filters?: FilterOptions) => Promise<AnalyticsResult>;
  getHRAnalytics: (groupBy?: GroupByOptions, filters?: FilterOptions) => Promise<AnalyticsResult>;
  getBookingsAnalytics: (groupBy?: GroupByOptions, filters?: FilterOptions) => Promise<AnalyticsResult>;
  getFinanceAnalytics: (groupBy?: GroupByOptions, filters?: FilterOptions) => Promise<AnalyticsResult>;
  getPOSAnalytics: (groupBy?: GroupByOptions, filters?: FilterOptions) => Promise<AnalyticsResult>;
  
  // KPI Functions
  getStockKPIs: () => Promise<KPIMetrics[]>;
  getHRKPIs: () => Promise<KPIMetrics[]>;
  getFinanceKPIs: () => Promise<KPIMetrics[]>;
  getBookingsKPIs: () => Promise<KPIMetrics[]>;
  getPOSKPIs: () => Promise<KPIMetrics[]>;
  
  // Chart Data Functions
  getStockChartData: (groupBy: GroupByOptions, valueField?: string) => Promise<ChartData>;
  getHRChartData: (groupBy: GroupByOptions, valueField?: string) => Promise<ChartData>;
  getBookingsChartData: (groupBy: GroupByOptions, valueField?: string) => Promise<ChartData>;
  getFinanceChartData: (groupBy: GroupByOptions, valueField?: string) => Promise<ChartData>;
  getPOSChartData: (groupBy: GroupByOptions, valueField?: string) => Promise<ChartData>;
  
  // Enhanced widget data for comprehensive dashboards
  getFinanceWidgets: (dateRange?: { startDate: string; endDate: string }) => Promise<FinanceWidgets>;
  getBookingsWidgets: (dateRange?: { startDate: string; endDate: string }) => Promise<BookingsWidgets>;
  getPOSWidgets: (dateRange?: { startDate: string; endDate: string }) => Promise<POSWidgets>;
  getHRWidgets: (dateRange?: { startDate: string; endDate: string }) => Promise<HRWidgets>;
  getStockWidgets: (dateRange?: { startDate: string; endDate: string }) => Promise<StockWidgets>;
  getCompanyWidgets: () => Promise<CompanyWidgets>;
  
  // Universal data access for any data type
  getWidgetData: (dataType: string, options?: { 
    dateRange?: { startDate: string; endDate: string };
    filters?: Record<string, any>;
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    module?: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'company';
  }) => Promise<any>;
  
  // Dashboard management
  saveDashboardLayout: (section: string, layout: any[]) => Promise<void>;
  loadDashboardLayout: (section: string) => Promise<any[]>;
  getAvailableWidgetTypes: () => string[];
  getAvailableDataTypes: (section?: string) => Array<{ value: string; label: string; category: string }>;
  
  // Enhanced AI-powered reporting with cross-module analysis
  generateReport: (request: string, domain?: 'finance' | 'bookings' | 'pos' | 'hr' | 'stock' | 'company' | 'comprehensive') => Promise<string>;
  // New: Comprehensive data export for AI analysis
  getComprehensiveDataSnapshot: () => Promise<any>;
  // New: Cross-module correlation analysis
  analyzeCrossModuleCorrelations: () => Promise<string>;
  
  // Real-time data subscriptions
  subscribeToWidgetData: (dataType: string, callback: (data: any) => void) => () => void;
  unsubscribeFromWidgetData: (dataType: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return a safe default context instead of throwing error
    // This allows components to render even when Analytics module isn't loaded yet
    // Suppress warnings during initial load - components will wait for providers via guards
    // (Warnings are expected during initial render before providers are ready)
    
    const emptyContext: AnalyticsContextType = {
      loading: false,
      error: null,
      
      // AI Analysis Functions - return empty strings
      analyzeHR: async () => "",
      analyzeStock: async () => "",
      analyzeBookings: async () => "",
      analyzeFinance: async () => "",
      analyzePOS: async () => "",
      analyzeCompany: async () => "",
      
      // Comprehensive Analytics Functions - return empty results
      getStockAnalytics: async () => ({ 
        data: [], 
        summary: { total: 0, average: 0, min: 0, max: 0, count: 0 }, 
        groupedData: {},
        trends: [],
        insights: [] 
      }),
      getHRAnalytics: async () => ({ 
        data: [], 
        summary: { total: 0, average: 0, min: 0, max: 0, count: 0 }, 
        groupedData: {},
        trends: [],
        insights: [] 
      }),
      getBookingsAnalytics: async () => ({ 
        data: [], 
        summary: { total: 0, average: 0, min: 0, max: 0, count: 0 }, 
        groupedData: {},
        trends: [],
        insights: [] 
      }),
      getFinanceAnalytics: async () => ({ 
        data: [], 
        summary: { total: 0, average: 0, min: 0, max: 0, count: 0 }, 
        groupedData: {},
        trends: [],
        insights: [] 
      }),
      getPOSAnalytics: async () => ({ 
        data: [], 
        summary: { total: 0, average: 0, min: 0, max: 0, count: 0 }, 
        groupedData: {},
        trends: [],
        insights: [] 
      }),
      
      // KPI Functions - return empty KPIs
      getStockKPIs: async () => [],
      getHRKPIs: async () => [],
      getFinanceKPIs: async () => [],
      getBookingsKPIs: async () => [],
      getPOSKPIs: async () => [],
      
      // Chart Data Functions - return empty charts
      getStockChartData: async () => ({ labels: [], datasets: [] }),
      getHRChartData: async () => ({ labels: [], datasets: [] }),
      getBookingsChartData: async () => ({ labels: [], datasets: [] }),
      getFinanceChartData: async () => ({ labels: [], datasets: [] }),
      getPOSChartData: async () => ({ labels: [], datasets: [] }),
      
      // Widget getters - return empty widgets
      getStockWidgets: async () => ({ 
        kpis: { 
          totalStockValue: 0, totalItems: 0, lowStockCount: 0, totalCategories: 0, totalSuppliers: 0,
          averageStockTurnover: 0, totalPurchaseValue: 0, totalSalesValue: 0, profitMargin: 0,
          stockAccuracy: 0, reorderRequired: 0, expiredItems: 0
        }, 
        stockByCategory: [], stockBySupplier: [], stockByLocation: [], topSellingItems: [],
        lowStockItems: [], stockTrends: [], purchaseHistory: [], salesHistory: [],
        stockCounts: [], parLevelStatus: [], profitAnalysis: []
      }),
      getHRWidgets: async () => ({ 
        kpis: { 
          totalEmployees: 0, activeEmployees: 0, pendingTimeOff: 0, trainingsCompleted: 0, totalDepartments: 0,
          averageAttendance: 0, turnoverRate: 0, trainingCompletionRate: 0, performanceScore: 0,
          recruitmentActive: 0, payrollTotal: 0, overtimeHours: 0
        }, 
        employeesByDepartment: [], attendanceTrends: [], performanceMetrics: [], trainingProgress: [],
        payrollBreakdown: [], timeOffRequests: [], recruitmentFunnel: [], turnoverAnalysis: []
      }),
      getBookingsWidgets: async () => ({ 
        kpis: { 
          totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, noShowBookings: 0,
          averagePartySize: 0, occupancyRate: 0, revenuePerBooking: 0, repeatCustomers: 0,
          bookingConversionRate: 0, averageLeadTime: 0, peakBookingHours: "", totalRevenue: 0
        }, 
        bookingsByDay: [], bookingsByHour: [], bookingsBySource: [], bookingsByPartySize: [],
        customerSegments: [], tableUtilization: [], seasonalTrends: [], cancellationAnalysis: [],
        waitlistAnalysis: []
      }),
      getFinanceWidgets: async () => ({ 
        kpis: { 
          cashBalance: 0, revenue: 0, expenses: 0, profit: 0, profitMargin: 0,
          outstandingInvoices: 0, monthlyExpenses: 0, quarterlyRevenue: 0, yearlyRevenue: 0,
          accountsReceivable: 0, accountsPayable: 0, currentRatio: 0, debtToEquity: 0,
          returnOnInvestment: 0, burnRate: 0, runway: 0
        }, 
        cashFlow: [], revenueBySource: [], expensesByCategory: [], profitLossTrends: [],
        budgetVsActual: [], invoiceAnalysis: [], paymentTrends: [], financialRatios: [],
        taxAnalysis: []
      }),
      getPOSWidgets: async () => ({ 
        kpis: { 
          totalSales: 0, totalTransactions: 0, averageTransactionValue: 0, dailySales: 0,
          weeklySales: 0, monthlySales: 0, totalCustomers: 0, repeatCustomers: 0,
          peakHourSales: 0, discountsGiven: 0, refundsProcessed: 0, cashSales: 0, cardSales: 0
        }, 
        salesByDay: [], salesByHour: [], salesByWeekday: [], paymentMethodBreakdown: {},
        topSellingItems: [], customerAnalytics: [], discountAnalysis: [], refundAnalysis: [],
        peakTimes: [], tableUtilization: []
      }),
      getCompanyWidgets: async () => ({ 
        kpis: { 
          totalSites: 0, totalSubsites: 0, totalEmployees: 0, totalChecklists: 0,
          completionRate: 0
        }, 
        checklistStats: [], sitePerformance: []
      }),
      
      // Universal data access - return empty
      getWidgetData: async () => null,
      
      // Dashboard management
      saveDashboardLayout: async () => {},
      loadDashboardLayout: async () => [],
      getAvailableWidgetTypes: () => [],
      getAvailableDataTypes: () => [],
      
      // Enhanced AI-powered reporting - return empty string
      generateReport: async () => "",
      
      // Comprehensive data export - return empty object
      getComprehensiveDataSnapshot: async () => ({}),
      
      // Cross-module correlation analysis - return empty string
      analyzeCrossModuleCorrelations: async () => "",
      
      // Real-time data subscriptions - return no-op unsubscribe
      subscribeToWidgetData: () => () => {},
      unsubscribeFromWidgetData: () => {},
    };
    
    return emptyContext;
  }
  return context;
};

// ========== FRONTEND DATA ACCESS (DASHBOARDS / REPORTS) ==========
// The goal here is to ensure dashboards and reports source *data* via the Analytics module.
// These wrappers deliberately centralize access patterns so UI components don't import
// individual module contexts directly.

export const useBookingsReportContext = () => {
  const bookings = useBookings();
  const { state: companyState, hasPermission } = useCompany();
  return { ...bookings, companyState, hasPermission };
};

export const useHRReportContext = () => {
  const hr = useHR();
  const { state: hrState } = hr;
  const { state: companyState } = useCompany();
  return { hr, hrState, companyState };
};

export const usePOSReportContext = () => {
  const pos = usePOS();
  const { state: posState } = pos;
  const { state: companyState } = useCompany();
  return { pos, posState, companyState };
};

export const useStockReportContext = () => {
  const stock = useStock();
  const { state: stockState } = stock;
  const { state: companyState } = useCompany();
  return { stock, stockState, companyState };
};

export const useFinanceReportContext = () => {
  const finance = useFinance();
  const { state: financeState } = finance;
  const { state: companyState, hasPermission } = useCompany();
  return { finance, financeState, companyState, hasPermission };
};

export const useGlobalDashboardContext = () => {
  const { state: companyState, hasPermission } = useCompany();
  const { state: hrState } = useHR();
  const { state: stockState } = useStock();
  const { state: posState } = usePOS();
  const { state: financeState } = useFinance();
  const bookingsState = useBookings();
  return { companyState, hasPermission, hrState, stockState, posState, financeState, bookingsState };
};

// Helper function to create empty HR widgets when data isn't available
const createEmptyHRWidgets = (): HRWidgets => ({
  kpis: {
    totalEmployees: 0,
    activeEmployees: 0,
    pendingTimeOff: 0,
    trainingsCompleted: 0,
    totalDepartments: 0,
    averageAttendance: 0,
    turnoverRate: 0,
    trainingCompletionRate: 0,
    performanceScore: 0,
    recruitmentActive: 0,
    payrollTotal: 0,
    overtimeHours: 0
  },
  employeesByDepartment: [],
  attendanceTrends: [],
  performanceMetrics: [],
  trainingProgress: [],
  payrollBreakdown: [],
  timeOffRequests: [],
  recruitmentFunnel: [],
  turnoverAnalysis: []
});

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state: companyState, getBasePath, fetchChecklists } = useCompany();
  const { state: settingsState } = useSettings();
  
  // Check if all other contexts have loaded their core data
  // Analytics should start when all other contexts' cores are loaded
  const stockContext = useStock();
  const hrContext = useHR();
  const bookingsContext = useBookings();
  const posContext = usePOS();
  const financeContext = useFinance();
  const messengerContext = useMessenger();
  
  // Check if all contexts have loaded their core data.
  // IMPORTANT: many contexts expose safe fallback values outside their providers (arrays like []),
  // so we also require identifiers/initialization flags to ensure the provider is actually active.
  const stockCoreLoaded =
    !!stockContext.state.companyID &&
    stockContext.state.products !== undefined &&
    stockContext.state.measures !== undefined;
  const hrCoreLoaded =
    !!hrContext.state.initialized &&
    hrContext.state.employees !== undefined &&
    hrContext.state.roles !== undefined &&
    hrContext.state.departments !== undefined;
  const bookingsCoreLoaded =
    !!bookingsContext.basePath &&
    bookingsContext.bookings !== undefined &&
    bookingsContext.tables !== undefined;
  const posCoreLoaded =
    !!posContext.companyId &&
    posContext.state.bills !== undefined &&
    posContext.state.paymentTypes !== undefined &&
    posContext.state.tables !== undefined;
  const financeCoreLoaded =
    !!financeContext.state.basePath &&
    financeContext.state.accounts !== undefined &&
    financeContext.state.transactions !== undefined &&
    financeContext.state.invoices !== undefined;
  const messengerCoreLoaded =
    !!messengerContext.state.basePath &&
    messengerContext.state.chats !== undefined;
  
  const allContextsLoaded = stockCoreLoaded && hrCoreLoaded && bookingsCoreLoaded && posCoreLoaded && financeCoreLoaded && messengerCoreLoaded;
  
  // Timer refs for performance tracking
  const analyticsTimersRef = useRef<{
    coreTimerId: string | null;
    allTimerId: string | null;
    coreLogged: boolean;
    allLogged: boolean;
    cacheLogged: boolean;
  }>({ coreTimerId: null, allTimerId: null, coreLogged: false, allLogged: false, cacheLogged: false });

  // ==========
  // Derived-data caching (Analytics/KPIs/Charts)
  // ==========
  // We cache computed outputs (not raw module data) for fast dashboard/widget rendering.
  // Cache is scoped by the module basePath + params, with short TTLs to keep correlations correct.
  const analyticsPendingRef = useRef<Map<string, Promise<any>>>(new Map())

  const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000
  const KPI_CACHE_TTL_MS = 2 * 60 * 1000
  const CHART_CACHE_TTL_MS = 2 * 60 * 1000

  const hashString = (s: string): string => {
    let h = 0
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0
    }
    // convert to unsigned
    return String(h >>> 0)
  }

  const stableStringify = (value: any): string => {
    const seen = new WeakSet<object>()
    const stringify = (v: any): any => {
      if (v === null || v === undefined) return v
      if (typeof v !== "object") return v
      if (v instanceof Date) return v.toISOString()
      if (Array.isArray(v)) return v.map(stringify)
      if (seen.has(v)) return "[Circular]"
      seen.add(v)
      const out: Record<string, any> = {}
      Object.keys(v).sort().forEach((k) => {
        out[k] = stringify(v[k])
      })
      return out
    }
    return JSON.stringify(stringify(value))
  }

  const buildDerivedCacheKey = (kind: string, basePath: string, params: any): string => {
    const keyBase = basePath || "no-base"
    const paramsHash = hashString(stableStringify(params))
    // Keep keys short and path-safe for IndexedDB store.
    return `derived/${kind}/${keyBase}/${paramsHash}`
  }

  const getFreshDerivedCache = async <T,>(key: string, ttlMs: number): Promise<T | null> => {
    try {
      const cached = await dataCache.peek<{ ts: number; value: T }>(key)
      if (!cached || typeof cached.ts !== "number") return null
      if (Date.now() - cached.ts > ttlMs) return null
      return cached.value ?? null
    } catch {
      return null
    }
  }

  const setDerivedCache = <T,>(key: string, value: T): void => {
    try {
      dataCache.set(key, { ts: Date.now(), value })
    } catch {
      // ignore cache errors
    }
  }

  const runDeduped = async <T,>(key: string, compute: () => Promise<T>): Promise<T> => {
    const existing = analyticsPendingRef.current.get(key) as Promise<T> | undefined
    if (existing) return existing

    const p = (async () => {
      try {
        const value = await compute()
        setDerivedCache(key, value)
        return value
      } finally {
        analyticsPendingRef.current.delete(key)
      }
    })()

    analyticsPendingRef.current.set(key, p as Promise<any>)
    return p
  }
  
  // Log when Analytics is ready (when all contexts have loaded)
  useEffect(() => {
    if (!allContextsLoaded) return;
    
    // Initialize timers on first ready state
    if (!analyticsTimersRef.current.coreTimerId) {
      analyticsTimersRef.current.coreTimerId = performanceTimer.start("AnalyticsContext", "coreLoad");
      analyticsTimersRef.current.allTimerId = performanceTimer.start("AnalyticsContext", "allLoad");
    }
    
    // Core loaded timing (all contexts ready)
    if (!analyticsTimersRef.current.coreLogged && analyticsTimersRef.current.coreTimerId) {
      analyticsTimersRef.current.coreLogged = true;
      const duration = performanceTimer.end(analyticsTimersRef.current.coreTimerId, {
        stock: stockContext.state.products?.length || 0,
        hr: hrContext.state.employees?.length || 0,
        bookings: bookingsContext.bookings?.length || 0,
        pos: posContext.state.bills?.length || 0,
        finance: financeContext.state.accounts?.length || 0,
        messenger: messengerContext.state.chats?.length || 0,
      });
      debugLog(`✅ AnalyticsContext: Core loaded (${duration.toFixed(2)}ms)`);
    }
    
    // All data loaded timing (all contexts fully loaded)
    if (!analyticsTimersRef.current.allLogged && analyticsTimersRef.current.allTimerId && analyticsTimersRef.current.coreLogged) {
      analyticsTimersRef.current.allLogged = true;
      const duration = performanceTimer.end(analyticsTimersRef.current.allTimerId, {
        stock: stockContext.state.products?.length || 0,
        hr: hrContext.state.employees?.length || 0,
        bookings: bookingsContext.bookings?.length || 0,
        pos: posContext.state.bills?.length || 0,
        finance: financeContext.state.accounts?.length || 0,
        messenger: messengerContext.state.chats?.length || 0,
      });
      debugLog(`✅ AnalyticsContext: All data loaded (${duration.toFixed(2)}ms)`);
    }
  }, [allContextsLoaded, stockContext.state, hrContext.state, bookingsContext, posContext.state, financeContext.state, messengerContext.state]);

  // Local analyzeData function using generateBusinessReport
  const analyzeData = async (data: any, prompt: string): Promise<string> => {
    return await generateBusinessReport(prompt, data);
  };

  const fetchDataForAnalysis = async (path: string) => {
    return await fetchFromPathFn(path);
  };

  const getModuleBasePath = (module: 'finance' | 'bookings' | 'stock' | 'hr' | 'pos' | 'company'): string => {
    const base = getBasePath(module as any);
    if (!base) return '';
    if (module === 'company') return base;
    // Most modules store under /data/{module}
    // POS sales are under /data/sales (handled in getPOSWidgets)
    return `${base}/data/${module}`;
  };

  const fetchComprehensiveModuleData = async (module: string, basePath: string) => {
    try {
      return await fetchFromPathFn(basePath);
    } catch (error) {
      debugWarn(`Failed to fetch ${module} data:`, error);
      return null;
    }
  };

  const analyzeHR = async () => {
    try {
      setLoading(true);
      setError(null);

      const hrBasePath = getModuleBasePath('hr');
      if (!hrBasePath) throw new Error('No HR path available');

      const [employees, timeOffs, attendances, trainings, widgets] = await Promise.all([
        HRRTDB.fetchEmployees(hrBasePath).catch(() => hrContext.state.employees || []),
        HRRTDB.fetchTimeOffs(hrBasePath).catch(() => hrContext.state.timeOffs || []),
        HRRTDB.fetchAttendances(hrBasePath).catch(() => hrContext.state.attendances || []),
        HRRTDB.fetchTrainings(hrBasePath).catch(() => hrContext.state.trainings || []),
        getHRWidgets().catch(() => createEmptyHRWidgets()),
      ]);

      const payrolls = hrContext.state.payrollRecords || [];
      const hrData = { employees, timeOffs, attendances, trainings, payrolls, widgets };
      const hasAnyData = [employees, timeOffs, attendances, trainings, payrolls].some((items) => safeArray(items).length > 0);
      if (!hasAnyData) throw new Error('No HR data available for analysis');

      return await analyzeHRDataAI(hrData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing HR data');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const analyzeStock = async () => {
    try {
      setLoading(true);
      setError(null);

      const stockBasePath = getModuleBasePath('stock');
      if (!stockBasePath) throw new Error('No stock path available');

      const [products, sales, purchases, stockCounts, widgets] = await Promise.all([
        StockRTDB.fetchProducts(stockBasePath).catch(() => stockContext.state.products || []),
        StockRTDB.fetchSales(stockBasePath).catch(() => stockContext.state.sales || []),
        StockRTDB.fetchPurchases(stockBasePath).catch(() => stockContext.state.purchases || []),
        StockRTDB.fetchStockCounts2(stockBasePath).catch(() => stockContext.state.stockCounts || []),
        getStockWidgets().catch(() => null),
      ]);
      
      const stockData = { products, sales, purchases, stockCounts, widgets };
      const hasAnyData = [products, sales, purchases, stockCounts].some((items) => safeArray(items).length > 0);
      if (!hasAnyData) throw new Error('No stock data available for analysis');

      return await analyzeStockDataAI(stockData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing stock data');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const analyzeBookings = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);
      const bookingsBasePath = getModuleBasePath('bookings');
      if (!bookingsBasePath) throw new Error('No bookings path available');
      const [bookings, bookingTypes, tables, customers, widgets] = await Promise.all([
        BookingsRTDB.fetchBookings(bookingsBasePath).catch(() => bookingsContext.state.bookings || []),
        BookingsRTDB.fetchBookingTypes(bookingsBasePath).catch(() => bookingsContext.state.bookingTypes || []),
        BookingsRTDB.fetchTables(bookingsBasePath).catch(() => bookingsContext.state.tables || []),
        BookingsRTDB.fetchCustomers(bookingsBasePath).catch(() => bookingsContext.state.customers || []),
        getBookingsWidgets(startDate && endDate ? { startDate, endDate } : undefined).catch(() => null),
      ]);
      
      const filtered = startDate && endDate
        ? (safeArray(bookings) as any[]).filter((b: any) => (b.date || '') >= startDate && (b.date || '') <= endDate)
        : bookings;

      const bookingsData = { bookings: filtered, bookingTypes, tables, customers, widgets };
      const hasAnyData = [filtered, bookingTypes, tables, customers].some((items) => safeArray(items).length > 0);
      if (!hasAnyData) throw new Error('No bookings data available for analysis');
      
      return await analyzeBookingsDataAI(bookingsData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing bookings data');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const analyzeFinance = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);
      const financeBasePath = getModuleBasePath('finance');
      if (!financeBasePath) throw new Error('No finance path available');
      const [transactions, bills, expenses, budgets, bankAccounts, widgets] = await Promise.all([
        FinanceRTDB.fetchTransactions(financeBasePath).catch(() => financeContext.state.transactions || []),
        FinanceRTDB.fetchBills(financeBasePath).catch(() => financeContext.state.bills || []),
        FinanceRTDB.fetchExpenses(financeBasePath).catch(() => financeContext.state.expenses || []),
        FinanceRTDB.fetchBudgets(financeBasePath).catch(() => financeContext.state.budgets || []),
        FinanceRTDB.fetchBankAccounts(financeBasePath).catch(() => financeContext.state.bankAccounts || []),
        getFinanceWidgets(startDate && endDate ? { startDate, endDate } : undefined).catch(() => null),
      ]);
      
      const filteredTransactions = startDate && endDate
        ? (safeArray(transactions) as any[]).filter((t: any) => (t.date || '') >= startDate && (t.date || '') <= endDate)
        : transactions;

      const financeData = { transactions: filteredTransactions, invoices: safeArray(bills), bills, expenses, budgets, bankAccounts, widgets };
      const hasAnyData = [filteredTransactions, bills, expenses, budgets, bankAccounts].some((items) => safeArray(items).length > 0);
      if (!hasAnyData) throw new Error('No finance data available for analysis');
      
      return await analyzeFinanceDataAI(financeData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing finance data');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const analyzePOS = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);

      const base = getBasePath('pos');
      if (!base) throw new Error('No POS path available');

      const salesBasePath = `${base}/data`;
      const posDataBasePath = `${base}/data/pos`;
      const [sales, bills, discounts, promotions, widgets] = await Promise.all([
        StockRTDB.fetchSales(salesBasePath).catch(() => posContext.state.sales || []),
        FinanceRTDB.fetchBills(base).catch(() => posContext.state.bills || []),
        StockRTDB.fetchDiscounts(posDataBasePath).catch(() => []),
        StockRTDB.fetchPromotions(posDataBasePath).catch(() => []),
        getPOSWidgets(startDate && endDate ? { startDate, endDate } : undefined).catch(() => null),
      ]);
      
      const filteredSales = startDate && endDate
        ? (safeArray(sales) as any[]).filter((sale: any) => {
            const date = safeString(sale.tradingDate || sale.date || sale.createdAt).slice(0, 10);
            return date && date >= startDate && date <= endDate;
          })
        : sales;

      const filteredBills = startDate && endDate
        ? (safeArray(bills) as any[]).filter((bill: any) => {
            const date = safeString(bill.tradingDate || bill.date || bill.createdAt).slice(0, 10);
            return date && date >= startDate && date <= endDate;
          })
        : bills;
      
      const posData = { sales: filteredSales, bills: filteredBills, cards: [], discounts, promotions, widgets };
      const hasAnyData = [filteredSales, filteredBills, discounts, promotions].some((items) => safeArray(items).length > 0);
      if (!hasAnyData) throw new Error('No POS data available for analysis');
      
      return await analyzePOSDataAI(posData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing POS data');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      const companyBasePath = getBasePath();
      if (!companyBasePath) throw new Error('No company path available');

      const [companyData, widgets, snapshot] = await Promise.all([
        fetchDataForAnalysis(`${companyBasePath}`),
        getCompanyWidgets().catch(() => null),
        getComprehensiveDataSnapshot().catch(() => null),
      ]);

      if (!companyData && !widgets && !snapshot) throw new Error('No company data available for analysis');
      return await analyzeCompanyData({ companyData, widgets, snapshot });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing company data');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ===== NEW: Structured widget data helpers =====
  const getFinanceWidgets = async (dateRange?: { startDate: string; endDate: string }): Promise<FinanceWidgets> => {
    try {
      setLoading(true);
      setError(null);
      const basePath = getModuleBasePath('finance');
      if (!basePath) throw new Error('No finance path available');

      const [allTransactions, allBankAccounts, bills, expenses, budgets] = await Promise.all([
        FinanceRTDB.fetchTransactions(basePath).catch((): any[] => []),
        FinanceRTDB.fetchBankAccounts(basePath).catch((): any[] => []),
        FinanceRTDB.fetchBills(basePath).catch((): any[] => []),
        FinanceRTDB.fetchExpenses(basePath).catch((): any[] => []),
        FinanceRTDB.fetchBudgets(basePath).catch((): any[] => []),
      ]);

      // Filter by date range if provided (basePath is already scoped by company/site/subsite)
      const transactions = dateRange
        ? (safeArray(allTransactions) as any[]).filter((t: any) => {
            const tDate = safeString(t.date || t.createdAt || t.transactionDate).slice(0, 10);
            return tDate >= dateRange.startDate && tDate <= dateRange.endDate;
          })
        : (safeArray(allTransactions) as any[]);
      const bankAccounts = safeArray(allBankAccounts) as any[];

      // TODO: Implement FinanceFunctions methods
      const isRevenueTx = (t: any) => {
        const type = safeString(t.type).toLowerCase();
        return type === 'sale' || type === 'income' || type === 'revenue' || safeNumber(t.amount, 0) > 0;
      };
      const isExpenseTx = (t: any) => {
        const type = safeString(t.type).toLowerCase();
        return type === 'purchase' || type === 'expense' || type === 'bill' || safeNumber(t.amount, 0) < 0;
      };

      const revenue = transactions.filter(isRevenueTx).reduce((sum: number, t: any) => sum + Math.abs(safeNumber(t.amount, 0)), 0);
      const expenseFromTx = transactions.filter(isExpenseTx).reduce((sum: number, t: any) => sum + Math.abs(safeNumber(t.amount, 0)), 0);
      const expenseFromExpenses = (safeArray(expenses) as any[]).reduce((sum: number, e: any) => sum + Math.abs(safeNumber(e.amount, 0)), 0);
      const expensesTotal = expenseFromExpenses > 0 ? expenseFromExpenses : expenseFromTx;
      const profit = revenue - expensesTotal;

      const cash = bankAccounts.reduce((sum: number, account: any) => sum + safeNumber(account.balance, 0), 0);

      const start = dateRange?.startDate ? safeParseDate(dateRange.startDate) : null;
      const end = dateRange?.endDate ? safeParseDate(dateRange.endDate) : null;

      const daysInRange = (() => {
        if (!start || !end) return 1;
        const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff + 1);
      })();

      // --- Time series (monthly) ---
      const monthKey = (d: string) => d.slice(0, 7); // yyyy-MM
      const revenueByMonth = new Map<string, number>();
      const expenseByMonth = new Map<string, number>();
      for (const t of transactions) {
        const d = safeString(t.date || t.createdAt || t.transactionDate).slice(0, 10);
        if (!d) continue;
        const k = monthKey(d);
        const amt = Math.abs(safeNumber(t.amount, 0));
        if (isRevenueTx(t)) revenueByMonth.set(k, (revenueByMonth.get(k) || 0) + amt);
        if (isExpenseTx(t)) expenseByMonth.set(k, (expenseByMonth.get(k) || 0) + amt);
      }
      for (const e of safeArray(expenses) as any[]) {
        const d = safeString(e.date || e.createdAt).slice(0, 10);
        if (!d) continue;
        const k = monthKey(d);
        const amt = Math.abs(safeNumber(e.amount, 0));
        expenseByMonth.set(k, (expenseByMonth.get(k) || 0) + amt);
      }

      const profitLossTrends = Array.from(new Set([...revenueByMonth.keys(), ...expenseByMonth.keys()]))
        .sort()
        .map((m) => {
          const r = revenueByMonth.get(m) || 0;
          const e = expenseByMonth.get(m) || 0;
          const p = r - e;
          return {
            month: m,
            revenue: Math.round(r * 100) / 100,
            expenses: Math.round(e * 100) / 100,
            profit: Math.round(p * 100) / 100,
            margin: r > 0 ? (p / r) * 100 : 0,
          };
        });

      const cashFlow = profitLossTrends.map((m) => ({
        month: m.month,
        inflow: m.revenue,
        outflow: m.expenses,
        net: m.profit,
        forecast: 0,
      }));

      // --- Breakdowns ---
      const expensesByCategoryMap = new Map<string, number>();
      for (const e of safeArray(expenses) as any[]) {
        const cat = safeString(e.category || e.type || e.accountName || 'Other');
        expensesByCategoryMap.set(cat, (expensesByCategoryMap.get(cat) || 0) + Math.abs(safeNumber(e.amount, 0)));
      }
      const expensesByCategory = Array.from(expensesByCategoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount: Math.round(amount * 100) / 100,
          percentage: expensesTotal > 0 ? (amount / expensesTotal) * 100 : 0,
          trend: 'stable',
        }))
        .sort((a, b) => b.amount - a.amount);

      const revenueBySourceMap = new Map<string, number>();
      for (const t of transactions.filter(isRevenueTx)) {
        const src = safeString(t.source || t.customer || t.accountName || 'Revenue');
        revenueBySourceMap.set(src, (revenueBySourceMap.get(src) || 0) + Math.abs(safeNumber(t.amount, 0)));
      }
      const revenueBySource = Array.from(revenueBySourceMap.entries())
        .map(([source, amount]) => ({
          source,
          amount: Math.round(amount * 100) / 100,
          percentage: revenue > 0 ? (amount / revenue) * 100 : 0,
          growth: 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const budgetVsActual = (safeArray(budgets) as any[]).map((b: any) => {
        const budgeted = safeNumber(b.budgeted, safeNumber(b.amount, 0));
        const actual = safeNumber(b.actual, 0);
        const variance = budgeted - actual;
        return {
          category: safeString(b.category || b.name || 'Budget'),
          budgeted,
          actual,
          variance,
          percentage: budgeted > 0 ? (actual / budgeted) * 100 : 0,
        };
      });

      // Simple invoice/bill analysis from bills list (if available)
      const invoiceAnalysisMap = new Map<string, { count: number; amount: number }>();
      for (const bill of safeArray(bills) as any[]) {
        const status = safeString(bill.status || bill.state || 'unknown');
        const amt = Math.abs(safeNumber(bill.totalAmount, safeNumber(bill.total, 0)));
        const prev = invoiceAnalysisMap.get(status) || { count: 0, amount: 0 };
        invoiceAnalysisMap.set(status, { count: prev.count + 1, amount: prev.amount + amt });
      }
      const invoiceAnalysis = Array.from(invoiceAnalysisMap.entries()).map(([status, v]) => ({
        status,
        count: v.count,
        amount: Math.round(v.amount * 100) / 100,
        avgDays: 0,
      }));

      const paymentTrendsMap = new Map<string, { amount: number; count: number }>();
      for (const t of transactions) {
        const method = safeString(t.paymentMethod || t.method || 'unknown');
        const amt = Math.abs(safeNumber(t.amount, 0));
        const prev = paymentTrendsMap.get(method) || { amount: 0, count: 0 };
        paymentTrendsMap.set(method, { amount: prev.amount + amt, count: prev.count + 1 });
      }
      const paymentTrends = Array.from(paymentTrendsMap.entries()).map(([method, v]) => ({
        method,
        amount: Math.round(v.amount * 100) / 100,
        count: v.count,
        percentage: revenue + expensesTotal > 0 ? (v.amount / (revenue + expensesTotal)) * 100 : 0,
      }));

      const outstandingInvoices = invoiceAnalysis
        .filter((i) => !safeString(i.status).toLowerCase().includes('paid') && !safeString(i.status).toLowerCase().includes('closed'))
        .reduce((sum, i) => sum + safeNumber(i.amount, 0), 0);

      const monthlyExpenses = (() => {
        if (!end) return 0;
        const thirtyDaysAgo = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        const exp = (safeArray(expenses) as any[]).filter((e: any) => {
          const d = safeParseDate(e.date || e.createdAt);
          return d ? d >= thirtyDaysAgo && d <= end : false;
        });
        return exp.reduce((sum: number, e: any) => sum + Math.abs(safeNumber(e.amount, 0)), 0);
      })();

      return {
        kpis: {
          cashBalance: cash,
          revenue,
          expenses: expensesTotal,
          profit,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          outstandingInvoices: outstandingInvoices || 0,
          monthlyExpenses: monthlyExpenses || 0,
          quarterlyRevenue: daysInRange >= 90 ? revenue : revenue, // Best-effort
          yearlyRevenue: daysInRange >= 365 ? revenue : revenue, // Best-effort
          accountsReceivable: 0, // TODO: Calculate accounts receivable
          accountsPayable: 0, // TODO: Calculate accounts payable
          currentRatio: 0, // TODO: Calculate current ratio
          debtToEquity: 0, // TODO: Calculate debt to equity
          returnOnInvestment: 0, // TODO: Calculate ROI
          burnRate: 0, // TODO: Calculate burn rate
          runway: 0, // TODO: Calculate runway
        },
        cashFlow,
        revenueBySource,
        expensesByCategory,
        profitLossTrends,
        budgetVsActual,
        invoiceAnalysis,
        paymentTrends,
        financialRatios: [], // TODO: Implement financial ratios
        taxAnalysis: [], // TODO: Implement tax analysis
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading finance widgets');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getBookingsWidgets = async (dateRange?: { startDate: string; endDate: string }): Promise<BookingsWidgets> => {
    try {
      setLoading(true);
      setError(null);
      const basePath = getModuleBasePath('bookings');
      if (!basePath) throw new Error('No bookings path available');

      // Fetch the full datasets needed for dashboards + reports
      const [allBookings, allTables, allCustomers, allWaitlist] = await Promise.all([
        BookingsRTDB.fetchBookings(basePath).catch((): any[] => []),
        BookingsRTDB.fetchTables(basePath).catch((): any[] => []),
        BookingsRTDB.fetchCustomers(basePath).catch((): any[] => []),
        BookingsRTDB.fetchWaitlist(basePath).catch((): any[] => []),
      ]);

      const start = dateRange?.startDate ? safeParseDate(dateRange.startDate) : null;
      const end = dateRange?.endDate ? safeParseDate(dateRange.endDate) : null;

      const bookings = (safeArray(allBookings) as any[]).filter((b: any) => {
        if (!start || !end) return true;
        const d = safeString(b.date);
        // Most booking dates are stored as yyyy-MM-dd so string compare is safe
        return d >= dateRange!.startDate && d <= dateRange!.endDate;
      });

      const tables = safeArray(allTables) as any[];
      const customers = safeArray(allCustomers) as any[];
      const waitlist = (safeArray(allWaitlist) as any[]).filter((w: any) => {
        if (!start || !end) return true;
        const d = safeString(w.timeAdded).slice(0, 10);
        return d >= dateRange!.startDate && d <= dateRange!.endDate;
      });

      const totalCapacity = tables.reduce((sum: number, t: any) => sum + safeNumber(t.capacity, 0), 0);
      const daysInRange = (() => {
        if (!start || !end) return 1;
        const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff + 1);
      })();

      const getCovers = (b: any) =>
        safeNumber(b.covers, safeNumber(b.guests, safeNumber(b.guestCount, safeNumber(b.partySize, 0))));
      const getRevenue = (b: any) => safeNumber(Number(b.totalAmount), safeNumber(Number(b.deposit), 0));

      const totalRevenue = bookings.reduce((sum: number, b: any) => sum + getRevenue(b), 0);
      const totalCovers = bookings.reduce((sum: number, b: any) => sum + getCovers(b), 0);

      const isConfirmed = (status: string) => status.includes('confirm');
      const isCancelled = (status: string) => status.includes('cancel');
      const isNoShow = (b: any) => safeString(b.tracking).toLowerCase() === 'no show' || safeString(b.status).toLowerCase().includes('no-show');

      const confirmedBookings = bookings.filter((b: any) => isConfirmed(safeString(b.status).toLowerCase())).length;
      const cancelledBookings = bookings.filter((b: any) => isCancelled(safeString(b.status).toLowerCase())).length;
      const noShowBookings = bookings.filter(isNoShow).length;
      const averagePartySize = bookings.length > 0 ? totalCovers / bookings.length : 0;
      const occupancyRate = totalCapacity > 0 ? Math.min(100, (totalCovers / (totalCapacity * daysInRange)) * 100) : 0;
      const revenuePerBooking = bookings.length > 0 ? totalRevenue / bookings.length : 0;

      // Repeat customers by customerId/email
      const customerKey = (b: any) => safeString(b.customerId) || safeString(b.email) || `${safeString(b.firstName)} ${safeString(b.lastName)}`.trim();
      const customerCounts = new Map<string, { count: number; spend: number }>();
      for (const b of bookings) {
        const key = customerKey(b);
        if (!key) continue;
        const prev = customerCounts.get(key) || { count: 0, spend: 0 };
        customerCounts.set(key, { count: prev.count + 1, spend: prev.spend + getRevenue(b) });
      }
      const repeatCustomers = Array.from(customerCounts.values()).filter(v => v.count >= 2).length;

      // Lead time (createdAt -> booking date)
      const leadTimes = bookings
        .map((b: any) => {
          const created = safeParseDate(b.createdAt);
          const booked = safeParseDate(`${safeString(b.date)}T${safeString(b.arrivalTime || b.startTime || '00:00')}:00`);
          if (!created || !booked) return null;
          return Math.max(0, (booked.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        })
        .filter((x: any) => typeof x === 'number') as number[];
      const averageLeadTime = leadTimes.length ? leadTimes.reduce((a, v) => a + v, 0) / leadTimes.length : 0;

      // Peak booking hour
      const hourCounts = new Map<string, number>();
      for (const b of bookings) {
        const t = safeString(b.arrivalTime || b.startTime);
        const hour = t ? t.slice(0, 2) : '00';
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      const peakBookingHours =
        Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
          ? `${Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]![0]}:00`
          : '12:00';

      // Conversion rate: bookings vs (bookings + waitlist)
      const bookingConversionRate =
        bookings.length + waitlist.length > 0 ? (bookings.length / (bookings.length + waitlist.length)) * 100 : 0;

      // --- Breakdowns ---
      const bookingsByDayMap = new Map<string, { bookings: number; revenue: number; covers: number }>();
      for (const b of bookings) {
        const day = safeString(b.date);
        if (!day) continue;
        const prev = bookingsByDayMap.get(day) || { bookings: 0, revenue: 0, covers: 0 };
        bookingsByDayMap.set(day, {
          bookings: prev.bookings + 1,
          revenue: prev.revenue + getRevenue(b),
          covers: prev.covers + getCovers(b),
        });
      }
      const bookingsByDay = Array.from(bookingsByDayMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([date, v]) => ({
          date,
          bookings: v.bookings,
          revenue: Math.round(v.revenue * 100) / 100,
          occupancy: totalCapacity > 0 ? Math.min(100, (v.covers / totalCapacity) * 100) : 0,
        }));

      const bookingsByHourMap = new Map<string, { bookings: number; covers: number }>();
      for (const b of bookings) {
        const t = safeString(b.arrivalTime || b.startTime);
        const hour = t ? t.slice(0, 2) : '00';
        const prev = bookingsByHourMap.get(hour) || { bookings: 0, covers: 0 };
        bookingsByHourMap.set(hour, { bookings: prev.bookings + 1, covers: prev.covers + getCovers(b) });
      }
      const bookingsByHour = Array.from(bookingsByHourMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([hour, v]) => ({
          hour: `${hour}:00`,
          bookings: v.bookings,
          utilization: totalCapacity > 0 ? Math.min(100, (v.covers / totalCapacity) * 100) : 0,
        }));

      const bookingsBySourceMap = new Map<string, { count: number; conversion: number }>();
      for (const b of bookings) {
        const source = safeString(b.source, 'unknown');
        const prev = bookingsBySourceMap.get(source) || { count: 0, conversion: 0 };
        bookingsBySourceMap.set(source, { count: prev.count + 1, conversion: 0 });
      }
      const bookingsBySource = Array.from(bookingsBySourceMap.entries()).map(([source, v]) => ({
        source,
        count: v.count,
        conversion: 0,
      }));

      const bookingsByPartySizeMap = new Map<number, { count: number; revenue: number }>();
      for (const b of bookings) {
        const size = Math.max(1, getCovers(b));
        const prev = bookingsByPartySizeMap.get(size) || { count: 0, revenue: 0 };
        bookingsByPartySizeMap.set(size, { count: prev.count + 1, revenue: prev.revenue + getRevenue(b) });
      }
      const bookingsByPartySize = Array.from(bookingsByPartySizeMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([size, v]) => ({ size, count: v.count, revenue: Math.round(v.revenue * 100) / 100 }));

      // Customer segments (VIP/Regular/New)
      const customersById = new Map<string, any>((customers as any[]).map((c: any) => [safeString(c.id), c]));
      const segmentAgg = new Map<string, { count: number; spend: number; bookings: number }>();
      for (const b of bookings) {
        const key = customerKey(b);
        const spend = getRevenue(b);
        const countInfo = customerCounts.get(key);
        const c = customersById.get(safeString(b.customerId));
        const segment = c?.vip ? 'VIP' : countInfo && countInfo.count >= 2 ? 'Regular' : 'New';
        const prev = segmentAgg.get(segment) || { count: 0, spend: 0, bookings: 0 };
        segmentAgg.set(segment, { count: prev.count + 1, spend: prev.spend + spend, bookings: prev.bookings + 1 });
      }
      const customerSegments = Array.from(segmentAgg.entries()).map(([segment, v]) => ({
        segment,
        count: v.count,
        averageSpend: v.bookings > 0 ? v.spend / v.bookings : 0,
        frequency: daysInRange > 0 ? v.bookings / daysInRange : 0,
      }));

      // Table utilization
      const tablesById = new Map<string, any>((tables as any[]).map((t: any) => [safeString(t.id), t]));
      const tableAgg = new Map<string, { bookings: number; revenue: number }>();
      for (const b of bookings) {
        const tid = safeString(b.tableId) || safeString(b.tableNumber);
        if (!tid) continue;
        const prev = tableAgg.get(tid) || { bookings: 0, revenue: 0 };
        tableAgg.set(tid, { bookings: prev.bookings + 1, revenue: prev.revenue + getRevenue(b) });
      }
      const tableUtilization = Array.from(tableAgg.entries())
        .map(([table, v]) => ({
          table: tablesById.get(table)?.name || table,
          bookings: v.bookings,
          revenue: Math.round(v.revenue * 100) / 100,
          utilization: daysInRange > 0 && tables.length > 0 ? Math.min(100, (v.bookings / (daysInRange)) * 100) : 0,
        }))
        .sort((a, b) => b.bookings - a.bookings);

      // Seasonal trends by month
      const monthAgg = new Map<string, { bookings: number; revenue: number }>();
      for (const b of bookings) {
        const d = safeString(b.date);
        if (!d) continue;
        const month = d.slice(0, 7); // yyyy-MM
        const prev = monthAgg.get(month) || { bookings: 0, revenue: 0 };
        monthAgg.set(month, { bookings: prev.bookings + 1, revenue: prev.revenue + getRevenue(b) });
      }
      const seasonalTrendsRaw = Array.from(monthAgg.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([month, v]) => ({ month, bookings: v.bookings, revenue: Math.round(v.revenue * 100) / 100 }));
      const seasonalTrends = seasonalTrendsRaw.map((m, idx) => {
        const prev = seasonalTrendsRaw[idx - 1];
        const growth = prev && prev.bookings > 0 ? ((m.bookings - prev.bookings) / prev.bookings) * 100 : 0;
        return { ...m, growth };
      });

      // Cancellation analysis (best-effort)
      const cancelled = bookings.filter((b: any) => isCancelled(safeString(b.status).toLowerCase()) || isNoShow(b));
      const cancellationAnalysis = cancelled.length
        ? [
            {
              reason: 'Unknown',
              count: cancelled.length,
              leadTime: averageLeadTime,
              impact: cancelled.reduce((sum: number, b: any) => sum + getRevenue(b), 0),
            },
          ]
        : [];

      // Waitlist analysis
      const waitByDay = new Map<string, { waitlisted: number; converted: number }>();
      for (const w of waitlist as any[]) {
        const d = safeString(w.timeAdded).slice(0, 10);
        if (!d) continue;
        const status = safeString(w.status).toLowerCase();
        const converted = status.includes('convert') || status.includes('seat') || status.includes('book');
        const prev = waitByDay.get(d) || { waitlisted: 0, converted: 0 };
        waitByDay.set(d, { waitlisted: prev.waitlisted + 1, converted: prev.converted + (converted ? 1 : 0) });
      }
      const waitlistAnalysis = Array.from(waitByDay.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([date, v]) => ({
          date,
          waitlisted: v.waitlisted,
          converted: v.converted,
          conversionRate: v.waitlisted > 0 ? (v.converted / v.waitlisted) * 100 : 0,
        }));

      return {
        kpis: {
          totalBookings: bookings.length,
          confirmedBookings,
          cancelledBookings,
          noShowBookings,
          averagePartySize,
          occupancyRate,
          revenuePerBooking,
          repeatCustomers,
          bookingConversionRate,
          averageLeadTime,
          peakBookingHours,
          totalRevenue,
        },
        bookingsByDay,
        bookingsByHour,
        bookingsBySource,
        bookingsByPartySize,
        customerSegments,
        tableUtilization,
        seasonalTrends,
        cancellationAnalysis,
        waitlistAnalysis,
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading bookings widgets');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPOSWidgets = async (dateRange?: { startDate: string; endDate: string }): Promise<POSWidgets> => {
    try {
      setLoading(true);
      setError(null);
      // POS has split storage:
      // - Sales live under {company/site/subsite}/data/sales
      // - POS config entities (discounts/promotions/etc.) live under {company/site/subsite}/data/pos
      const base = getBasePath('pos');
      if (!base) throw new Error('No POS path available');
      const salesBasePath = `${base}/data`; // StockRTDB.fetchSales appends "/sales"
      const posDataBasePath = `${base}/data/pos`;
      const [allSales, billsRaw, discounts, promotions] = await Promise.all([
        StockRTDB.fetchSales(salesBasePath).catch((): any[] => []),
        FinanceRTDB.fetchBills(base).catch((): any[] => []),
        StockRTDB.fetchDiscounts(posDataBasePath).catch((): any[] => []),
        StockRTDB.fetchPromotions(posDataBasePath).catch((): any[] => []),
      ]);

      // Filter by date range if provided (basePath is already scoped by company/site/subsite)
      const sales = dateRange
        ? (safeArray(allSales) as any[]).filter((s: any) => {
            const sDate = safeString(s.tradingDate || s.date || s.createdAt).slice(0, 10);
            return sDate >= dateRange.startDate && sDate <= dateRange.endDate;
          })
        : (safeArray(allSales) as any[]);

      // Bills (best-effort; used for service charge / tips / takings breakdown)
      const bills = dateRange
        ? (safeArray(billsRaw) as any[]).filter((b: any) => {
            const createdIso =
              typeof b.createdAt === 'number'
                ? new Date(b.createdAt).toISOString()
                : typeof b.createdAt === 'string'
                  ? b.createdAt
                  : '';
            const bDate = safeString(b.tradingDate || b.date || createdIso).slice(0, 10);
            return bDate >= dateRange.startDate && bDate <= dateRange.endDate;
          })
        : (safeArray(billsRaw) as any[]);

      // KPIs
      const totalSales = sales.reduce((sum, s: any) => sum + safeNumber(Number(s.salePrice), 0), 0);
      const uniqueBills = new Set<string>(sales.map((s: any) => safeString(s.billId)).filter(Boolean));
      const totalTransactions = uniqueBills.size > 0 ? uniqueBills.size : sales.length;
      const serviceChargeTotal = bills.reduce((sum: number, b: any) => {
        const v = safeNumber(
          b.serviceCharge,
          safeNumber(b.servicecharge, safeNumber(b.service_charge, 0)),
        );
        return sum + Math.max(0, v);
      }, 0);
      const tipsTotal = bills.reduce((sum: number, b: any) => {
        const v = safeNumber(
          b.tip,
          safeNumber(
            b.tips,
            safeNumber(
              b.gratuity,
              safeNumber(b.tipAmount, safeNumber(b.tipamount, safeNumber(b.cardTip, 0))),
            ),
          ),
        );
        return sum + Math.max(0, v);
      }, 0);
      const grossTakings = bills.reduce((sum: number, b: any) => {
        const v = safeNumber(b.total, safeNumber(b.amount, safeNumber(b.totalAmount, 0)));
        return sum + v;
      }, 0);
      const netTakings = grossTakings > 0 ? Math.max(0, grossTakings - serviceChargeTotal - tipsTotal) : 0;
      const daysInRange = (() => {
        if (!dateRange?.startDate || !dateRange?.endDate) return 1;
        const start = safeParseDate(dateRange.startDate);
        const end = safeParseDate(dateRange.endDate);
        if (!start || !end) return 1;
        const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff + 1);
      })();

      // Sales by day
      const byDayMap = new Map<string, { sales: number; transactions: number }>();
      const paymentBreakdown: Record<string, number> = {};
      const byHourMap = new Map<string, { sales: number; transactions: number }>();
      const byWeekdayMap = new Map<string, { sales: number; transactions: number }>();
      const topItemsMap = new Map<string, { item: string; quantity: number; revenue: number }>();
      const tableMap = new Map<string, { revenue: number; turns: number }>();

      let discountsGiven = 0;
      let refundsProcessed = 0;
      let cashSales = 0;
      let cardSales = 0;

      for (const s of sales as any[]) {
        const day = safeString(s.tradingDate || s.date).slice(0, 10);
        const amount = safeNumber(Number(s.salePrice), 0);

        if (amount < 0) refundsProcessed += Math.abs(amount);

        const pm = safeString(s.paymentMethod, 'unknown').toLowerCase();
        paymentBreakdown[pm] = (paymentBreakdown[pm] || 0) + 1;
        if (pm.includes('cash')) cashSales += amount;
        if (pm.includes('card')) cardSales += amount;

        // Heuristic discount capture if present on sale row
        const disc = safeNumber(Number(s.discount), 0);
        if (disc > 0) discountsGiven += disc;

        if (day) {
          const prev = byDayMap.get(day) || { sales: 0, transactions: 0 };
          byDayMap.set(day, { sales: prev.sales + amount, transactions: prev.transactions + 1 });

          const dObj = safeParseDate(day);
          const weekday = dObj ? dObj.toLocaleDateString('en-GB', { weekday: 'short' }) : 'Unknown';
          const wdPrev = byWeekdayMap.get(weekday) || { sales: 0, transactions: 0 };
          byWeekdayMap.set(weekday, { sales: wdPrev.sales + amount, transactions: wdPrev.transactions + 1 });
        }

        const time = safeString(s.time);
        const hour = time ? time.slice(0, 2) : '00';
        const hourKey = `${hour}:00`;
        const hPrev = byHourMap.get(hourKey) || { sales: 0, transactions: 0 };
        byHourMap.set(hourKey, { sales: hPrev.sales + amount, transactions: hPrev.transactions + 1 });

        const itemKey = safeString(s.productId) || safeString(s.productName);
        if (itemKey) {
          const prev = topItemsMap.get(itemKey) || { item: safeString(s.productName, itemKey), quantity: 0, revenue: 0 };
          topItemsMap.set(itemKey, {
            item: prev.item,
            quantity: prev.quantity + safeNumber(Number(s.quantity), 0),
            revenue: prev.revenue + amount,
          });
        }

        const table = safeString(s.tableNumber);
        if (table) {
          const prev = tableMap.get(table) || { revenue: 0, turns: 0 };
          tableMap.set(table, { revenue: prev.revenue + amount, turns: prev.turns + 1 });
        }
      }

      const salesByDay = Array.from(byDayMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([label, v]) => ({ label, value: Math.round(v.sales * 100) / 100 }));

      const salesByHour = Array.from(byHourMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([hour, v]) => ({ hour, sales: Math.round(v.sales * 100) / 100, transactions: v.transactions }));

      const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const salesByWeekday = Array.from(byWeekdayMap.entries())
        .sort((a, b) => weekdayOrder.indexOf(a[0]) - weekdayOrder.indexOf(b[0]))
        .map(([day, v]) => ({ day, sales: Math.round(v.sales * 100) / 100, transactions: v.transactions }));

      const topSellingItems = Array.from(topItemsMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20)
        .map((i) => ({ item: i.item, quantity: i.quantity, revenue: Math.round(i.revenue * 100) / 100 }));

      // Peak times (hour buckets)
      const peakTimes = salesByHour
        .slice()
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 6)
        .map((h) => ({ timeSlot: h.hour, avgSales: h.sales, avgTransactions: h.transactions }));

      const tableUtilization = Array.from(tableMap.entries())
        .map(([table, v]) => ({
          table,
          utilization: daysInRange > 0 ? Math.min(100, (v.turns / daysInRange) * 100) : 0,
          revenue: Math.round(v.revenue * 100) / 100,
          turns: v.turns,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        kpis: { 
          totalSales, 
          totalTransactions,
          averageTransactionValue: totalTransactions > 0 ? totalSales / totalTransactions : 0,
          dailySales: daysInRange > 0 ? totalSales / daysInRange : totalSales,
          weeklySales: totalSales, // Best-effort (use dateRange for exact weekly grouping if needed)
          monthlySales: totalSales, // Best-effort (use dateRange for exact monthly grouping if needed)
          totalCustomers: 0, // Not available from sale rows today
          repeatCustomers: 0, // Not available from sale rows today
          peakHourSales: peakTimes[0]?.avgSales || 0,
          discountsGiven: discountsGiven || safeArray(discounts).length, // fallback to count if amounts not present
          refundsProcessed,
          cashSales,
          cardSales,
          serviceChargeTotal: serviceChargeTotal || 0,
          tipsTotal: tipsTotal || 0,
          grossTakings: grossTakings > 0 ? grossTakings : totalSales, // fallback to sales if bills missing
          netTakings: grossTakings > 0 ? netTakings : Math.max(0, totalSales - (serviceChargeTotal || 0) - (tipsTotal || 0)),
        },
        salesByDay,
        salesByHour,
        salesByWeekday,
        paymentMethodBreakdown: paymentBreakdown,
        topSellingItems,
        customerAnalytics: [
          { segment: 'All', count: 0, averageSpend: totalTransactions > 0 ? totalSales / totalTransactions : 0 },
        ],
        discountAnalysis: [
          {
            type: safeArray(discounts).length ? 'Configured Discounts' : 'Discounts',
            amount: discountsGiven,
            usage: safeArray(discounts).length,
            impact: discountsGiven,
          },
          ...(safeArray(promotions).length
            ? [
                {
                  type: 'Promotions',
                  amount: 0,
                  usage: safeArray(promotions).length,
                  impact: 0,
                },
              ]
            : []),
        ],
        refundAnalysis: refundsProcessed
          ? [{ date: dateRange?.endDate || new Date().toISOString().slice(0, 10), amount: refundsProcessed, reason: 'Refund', items: 0 }]
          : [],
        peakTimes,
        tableUtilization,
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading POS widgets');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getHRWidgets = async (dateRange?: { startDate: string; endDate: string }): Promise<HRWidgets> => {
    try {
      setLoading(true);
      setError(null);
      const basePath = getModuleBasePath('hr');
      if (!basePath) {
        debugWarn('AnalyticsContext: No HR path available, returning empty HR widgets');
        return createEmptyHRWidgets();
      }
      
      debugLog('AnalyticsContext: Fetching HR widgets from path:', basePath);
      
      const [allEmployees, allTimeOffs, allTrainings, allAttendances, allDepartments, , allPerformanceReviews, allPayrollRecords, allCandidates, allInterviews] = await Promise.all([
        HRRTDB.fetchEmployees(basePath).catch(err => { debugWarn('Failed to fetch employees:', err); return []; }),
        HRRTDB.fetchTimeOffs(basePath).catch(() => []),
        HRRTDB.fetchTrainings(basePath).catch(() => []),
        HRRTDB.fetchAttendances(basePath).catch(() => []),
        HRRTDB.fetchDepartments(basePath).catch(() => []),
        HRRTDB.fetchRoles(basePath).catch(() => []), // Unused but kept for potential future use
        HRRTDB.fetchPerformanceReviews(basePath).catch(() => []),
        HRRTDB.fetchPayroll(basePath).catch(() => []),
        HRRTDB.fetchCandidates(basePath).catch(() => []),
        HRRTDB.fetchInterviews(basePath).catch(() => [])
      ]);
      
      // NOTE: basePath is already scoped to the selected site/subsite via CompanyContext.getBasePath().
      // Avoid filtering again by siteId/subsiteId fields (many records don't include them).
      const employees = (allEmployees || []) as any[];
      const timeOffs = (allTimeOffs || []) as any[];
      const trainings = (allTrainings || []) as any[];
      const attendances = (allAttendances || []) as any[];
      const departments = (allDepartments || []) as any[];
      // const roles = safeArray(allRoles); // Roles are typically company-level - unused
      const performanceReviews = (allPerformanceReviews || []) as any[];
      const payrollRecords = (allPayrollRecords || []) as any[];
      const candidates = (allCandidates || []) as any[];
      const interviews = (allInterviews || []) as any[];
      
      debugLog('AnalyticsContext: HR data fetched and filtered:', {
        employees: employees.length,
        departments: departments.length,
        trainings: trainings.length,
        attendances: attendances.length,
        performanceReviews: performanceReviews.length
      });
      
      // Filter data by date range if provided (for future use)
      
      
      
      
      // Calculate comprehensive KPIs
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter((e: any) => e.status === 'active' || e.isActive).length;
      const inactiveEmployees = employees.filter((e: any) => e.status === 'inactive' || !e.isActive).length;
      const pendingTimeOff = timeOffs.filter((t: any) => t.status === 'pending').length;
      const trainingsCompleted = trainings.filter((t: any) => t.status === 'completed').length;
      const totalTrainings = trainings.length;
      const totalDepartments = departments.length || new Set(employees.map((e: any) => e.department || e.departmentID)).size;
      
      // Calculate attendance rate - DEFAULT TO 0 when no data
      const totalAttendanceRecords = attendances.length;
      const presentRecords = attendances.filter((a: any) => a.status === 'present' || a.present).length;
      const averageAttendance = totalAttendanceRecords > 0 ? (presentRecords / totalAttendanceRecords) * 100 : 0;
      
      // Calculate turnover rate (simplified)
      const turnoverRate = totalEmployees > 0 ? (inactiveEmployees / totalEmployees) * 100 : 0;
      
      // Calculate training completion rate
      const trainingCompletionRate = totalTrainings > 0 ? (trainingsCompleted / totalTrainings) * 100 : 0;
      
      // Calculate average performance score from actual performance reviews
      const performanceScore = performanceReviews.length > 0
        ? performanceReviews.reduce((sum: number, review: any) => sum + (review.overallScore || 0), 0) / performanceReviews.length
        : 0;
      
      // Calculate payroll total from actual payroll records
      const payrollTotal = payrollRecords.length > 0
        ? payrollRecords.reduce((sum: number, p: any) => sum + (p.grossPay || p.totalGross || 0), 0)
        : employees.reduce((sum: number, e: any) => {
            const salary = e.salary || (e.hourlyRate * (e.hoursPerWeek || 40) * 52) || 0;
            return sum + salary;
          }, 0);
      
      // Calculate overtime hours from actual attendance/clock records
      const overtimeHours = attendances.reduce((sum: number, a: any) => {
        if (!a.clockIn || !a.clockOut) return sum;
        
        const clockInTime = new Date(a.clockIn).getTime();
        const clockOutTime = new Date(a.clockOut).getTime();
        const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
        
        // Break time
        let breakHours = 0;
        if (a.breakStart && a.breakEnd) {
          const breakStart = new Date(a.breakStart).getTime();
          const breakEnd = new Date(a.breakEnd).getTime();
          breakHours = (breakEnd - breakStart) / (1000 * 60 * 60);
        }
        
        const netHours = hoursWorked - breakHours;
        const overtime = Math.max(0, netHours - 8); // Overtime beyond 8 hours per day
        return sum + overtime;
      }, 0);
      
      // Employees by department breakdown
      const employeesByDepartment = departments.length > 0 
        ? departments.map((dept: any) => {
            const deptEmployees = employees.filter((e: any) => 
              e.department === dept.name || e.departmentID === dept.id
            );
            return {
              department: dept.name || 'Unknown',
              count: deptEmployees.length,
              active: deptEmployees.filter((e: any) => e.status === 'active' || e.isActive).length
            };
          })
        : Object.entries(employees.reduce((acc: any, e: any) => {
            const dept = e.department || 'Unknown';
            if (!acc[dept]) acc[dept] = { total: 0, active: 0 };
            acc[dept].total++;
            if (e.status === 'active' || e.isActive) acc[dept].active++;
            return acc;
          }, {})).map(([department, data]: [string, any]) => ({
            department,
            count: data.total,
            active: data.active
          }));
      
      // Generate attendance trends based on date range
      const generateAttendanceTrends = () => {
        const start = dateRange ? new Date(dateRange.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = dateRange ? new Date(dateRange.endDate) : new Date();
        const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        const maxDays = Math.min(days, 90); // Limit to 90 days max
        
        return Array.from({ length: maxDays }).map((_, i) => {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayAttendances = attendances.filter((a: any) => {
            const aDate = safeParseDate(a.date || a.createdAt);
            if (!aDate) return false;
            return aDate.toISOString().split('T')[0] === dateStr;
          });
          
          return {
            date: dateStr,
            present: dayAttendances.filter((a: any) => safeString(a.status) === 'present' || a.present).length,
            absent: dayAttendances.filter((a: any) => safeString(a.status) === 'absent' || !a.present).length,
            late: dayAttendances.filter((a: any) => safeString(a.status) === 'late' || a.late).length
          };
        });
      };
      
      const attendanceTrends = generateAttendanceTrends();
      
      // Performance metrics from actual performance reviews
      const performanceMetrics = performanceReviews.map((review: any) => {
        const employee = (employees as any[]).find((e: any) => e.id === review.employeeId);
        
        // Calculate trend by comparing with previous reviews
        const employeeReviews = performanceReviews
          .filter((r: any) => r.employeeId === review.employeeId)
          .sort((a: any, b: any) => (b.endDate || b.createdAt || 0) - (a.endDate || a.createdAt || 0));
        
        let trend = 'stable';
        if (employeeReviews.length >= 2) {
          const currentReview: any = employeeReviews[0];
          const previousReview: any = employeeReviews[1];
          const current = currentReview.overallScore || 0;
          const previous = previousReview.overallScore || 0;
          trend = current > previous ? 'up' : current < previous ? 'down' : 'stable';
        }
        
        return {
          employee: employee ? `${(employee as any).firstName} ${(employee as any).lastName}` : 'Unknown Employee',
          score: review.overallScore || 0,
          department: (employee as any)?.department || 'Unknown',
          trend
        };
      }).slice(0, 20); // Top 20 most recent reviews
      
      // Training progress
      const trainingProgress = trainings.reduce((acc: any, t: any) => {
        const course = t.course || t.title || 'Unknown Course';
        if (!acc[course]) {
          acc[course] = { completed: 0, total: 0 };
        }
        acc[course].total++;
        if (t.status === 'completed') acc[course].completed++;
        return acc;
      }, {});
      
      const trainingProgressArray = Object.entries(trainingProgress).map(([course, data]: [string, any]) => ({
        course,
        completed: data.completed,
        total: data.total,
        completion: data.total > 0 ? (data.completed / data.total) * 100 : 0
      }));
      
      // Payroll breakdown by department - use actual payroll records when available
      const payrollBreakdown = employeesByDepartment.map(dept => {
        const deptEmployees = (employees as any[]).filter((e: any) => 
          e.department === dept.department || e.departmentId === dept.department
        );
        
        // Try to use actual payroll records first
        const deptPayrollRecords = payrollRecords.filter((p: any) => {
          const emp = (employees as any[]).find((e: any) => e.id === p.employeeId);
          return emp && ((emp as any).department === dept.department || (emp as any).departmentId === dept.department);
        });
        
        const amount = deptPayrollRecords.length > 0
          ? deptPayrollRecords.reduce((sum: number, p: any) => sum + (p.grossPay || p.totalGross || 0), 0)
          : deptEmployees.reduce((sum: number, e: any) => {
              const salary = e.salary || (e.hourlyRate * (e.hoursPerWeek || 40) * 52) || 0;
              return sum + salary;
            }, 0);
            
        return {
          department: dept.department,
          amount,
          employees: dept.count,
          average: dept.count > 0 ? amount / dept.count : 0
        };
      });
      
      // Time off requests breakdown
      const timeOffRequests = Array.from({ length: 12 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
        
        const monthRequests = timeOffs.filter((t: any) => {
          const requestDate = new Date(t.startDate || t.createdAt).toISOString().slice(0, 7);
          return requestDate === monthStr;
        });
        
        return {
          date: monthStr,
          approved: monthRequests.filter((t: any) => t.status === 'approved').length,
          pending: monthRequests.filter((t: any) => t.status === 'pending').length,
          rejected: monthRequests.filter((t: any) => t.status === 'rejected').length
        };
      });
      
      // Recruitment funnel from actual candidate and interview data
      const totalApplications = candidates.length;
      const screeningCandidates = candidates.filter((c: any) => 
        c.status === 'screening' || c.status === 'interview' || c.status === 'offer' || c.status === 'hired'
      ).length;
      const interviewCandidates = candidates.filter((c: any) => 
        c.status === 'interview' || c.status === 'offer' || c.status === 'hired'
      ).length;
      const offerCandidates = candidates.filter((c: any) => 
        c.status === 'offer' || c.status === 'hired'
      ).length;
      const hiredCandidates = candidates.filter((c: any) => c.status === 'hired').length;
      
      // Calculate phone screen count from interviews marked as 'phone'
      const phoneScreenCount = interviews.filter((i: any) => i.type === 'phone').length;
      
      const recruitmentFunnel = [
        { 
          stage: 'Applications', 
          count: totalApplications, 
          conversion: 100 
        },
        { 
          stage: 'Phone Screen', 
          count: phoneScreenCount || screeningCandidates, 
          conversion: totalApplications > 0 ? ((phoneScreenCount || screeningCandidates) / totalApplications) * 100 : 0 
        },
        { 
          stage: 'Interview', 
          count: interviewCandidates, 
          conversion: totalApplications > 0 ? (interviewCandidates / totalApplications) * 100 : 0 
        },
        { 
          stage: 'Offer', 
          count: offerCandidates, 
          conversion: totalApplications > 0 ? (offerCandidates / totalApplications) * 100 : 0 
        },
        { 
          stage: 'Hired', 
          count: hiredCandidates, 
          conversion: totalApplications > 0 ? (hiredCandidates / totalApplications) * 100 : 0 
        }
      ];
      
      // Turnover analysis from actual employee hire and termination dates
      const turnoverAnalysis = Array.from({ length: 12 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        const monthStr = date.toISOString().slice(0, 7);
        
        // Count employees who joined in this month
        const joined = employees.filter((e: any) => {
          if (!e.hireDate && !e.createdAt) return false;
          const hireDate = new Date(e.hireDate || e.createdAt).toISOString().slice(0, 7);
          return hireDate === monthStr;
        }).length;
        
        // Count employees who left in this month (terminated or inactive with termination date)
        const left = employees.filter((e: any) => {
          if (!e.terminationDate && !e.endDate) return false;
          const termDate = new Date(e.terminationDate || e.endDate).toISOString().slice(0, 7);
          return termDate === monthStr;
        }).length;
        
        return {
          month: monthStr,
          joined,
          left,
          netChange: joined - left
        };
      });
      
      // Count active recruitment (from job postings)
      const jobPostings = await HRRTDB.fetchJobs(basePath).catch(() => []);
      const recruitmentActive = jobPostings.filter((job: any) => 
        job.status === 'published' || job.status === 'Published' || job.status === 'active'
      ).length;
      
      return {
        kpis: {
          totalEmployees,
          activeEmployees,
          pendingTimeOff,
          trainingsCompleted,
          totalDepartments,
          averageAttendance,
          turnoverRate,
          trainingCompletionRate,
          performanceScore,
          recruitmentActive,
          payrollTotal,
          overtimeHours
        },
        employeesByDepartment,
        attendanceTrends,
        performanceMetrics,
        trainingProgress: trainingProgressArray,
        payrollBreakdown,
        timeOffRequests,
        recruitmentFunnel,
        turnoverAnalysis
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading HR widgets');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getStockWidgets = async (dateRange?: { startDate: string; endDate: string }): Promise<StockWidgets> => {
    try {
      setLoading(true);
      setError(null);
      const basePath = getModuleBasePath('stock');
      if (!basePath) throw new Error('No stock path available');
      
      // Fetch all stock-related data INCLUDING MEASURES
      const [allProducts, allSales, allPurchases, allStockCounts, allCategories, allSuppliers, allLocations, allMeasures] = await Promise.all([
        StockRTDB.fetchProducts(basePath),
        StockRTDB.fetchSales(basePath),
        StockRTDB.fetchPurchases(basePath),
        StockRTDB.fetchStockCounts2(basePath),
        StockRTDB.fetchCategories(basePath).catch(() => []),
        StockRTDB.fetchSuppliers(basePath).catch(() => []),
        StockRTDB.fetchLocations(basePath).catch(() => []),
        StockRTDB.fetchMeasures(basePath).catch(() => [])
      ]);
      
      // NOTE: basePath is already scoped to the selected site/subsite via CompanyContext.getBasePath().
      // Avoid filtering again by siteId/subsiteId fields (many records don't include them).
      const products = safeArray(allProducts) as any[];
      const sales = safeArray(allSales) as any[];
      const purchases = safeArray(allPurchases) as any[];
      const stockCounts = safeArray(allStockCounts) as any[];
      const categories = (allCategories || []) as any[]; // Categories are typically company-level
      const suppliers = (allSuppliers || []) as any[]; // Suppliers are typically company-level
      const locations = (allLocations || []) as any[]; // Locations are typically company-level
      const measures = (allMeasures || []) as any[]; // Measures are typically company-level
      
      // Check for missing measure IDs and log a single summary if any are found
      // This happens once after measures are loaded, instead of logging for each conversion
      StockFunctions.checkForMissingMeasures(products, sales, purchases, measures);
      
      // Calculate current stock for each product (in base units)
      const productsWithStock = products.map((p: any) => {
        const stockData = StockFunctions.calculateCurrentStock(
          p.id,
          stockCounts,
          purchases,
          sales,
          measures,
          dateRange?.endDate ? new Date(dateRange.endDate) : new Date()
        );
        
        // Calculate effective cost (uses recipe cost for recipe-type products)
        const effectiveCost = StockFunctions.getProductCost(p, products, measures);
        
        return {
          ...p,
          currentStock: stockData.quantity,
          predictedStock: stockData.quantity, // Same as currentStock per requirements
          baseUnit: stockData.baseUnit,
          effectiveCost: effectiveCost // Cost including recipe calculations
        };
      });
      
      // Calculate comprehensive KPIs using base units and defaultMeasure prices
      const totalPurchaseValue = purchases.reduce((sum: number, p: any) => sum + (p.totalValue || 0), 0);
      
      // Calculate total sales value using base units
      const totalSalesValue = sales.reduce((sum: number, s: any) => {
        const product = productsWithStock.find((p: any) => p.id === s.productId || p.id === s.itemID);
        if (!product) return sum;
        
        const salePrice = StockFunctions.getDefaultSalePrice(product);
        const baseQty = StockFunctions.convertToBaseUnits(s.quantity || 0, s.measureId, measures);
        return sum + (salePrice * baseQty);
      }, 0);
      
      const profitMargin = totalSalesValue > 0 ? ((totalSalesValue - totalPurchaseValue) / totalSalesValue) * 100 : 0;
      
      // Stock by category analysis - use base units and effective cost (includes recipe costs)
      const stockByCategory = categories.map((cat: any) => {
        const categoryProducts = productsWithStock.filter((p: any) => p.categoryId === cat.id);
        const value = categoryProducts.reduce((sum: number, p: any) => {
          // Use effectiveCost which includes recipe calculations
          return sum + (p.currentStock * p.effectiveCost);
        }, 0);
        return {
          category: cat.name,
          value,
          count: categoryProducts.length
        };
      });
      
      // Stock by supplier analysis - use base units and effective cost (includes recipe costs)
      const stockBySupplier = suppliers.map((sup: any) => {
        const supplierProducts = productsWithStock.filter((p: any) => p.purchase?.defaultSupplier === sup.id);
        const value = supplierProducts.reduce((sum: number, p: any) => {
          // Use effectiveCost which includes recipe calculations
          return sum + (p.currentStock * p.effectiveCost);
        }, 0);
        return {
          supplier: sup.name,
          value,
          count: supplierProducts.length
        };
      });
      
      // Top selling items - use base units
      const topSellingItems = productsWithStock
        .map((p: any) => {
          const productSales = sales.filter((s: any) => s.productId === p.id || s.itemID === p.id);
          const quantity = productSales.reduce((sum: number, s: any) => {
            return sum + StockFunctions.convertToBaseUnits(s.quantity || 0, s.measureId, measures);
          }, 0);
          const value = productSales.reduce((sum: number, s: any) => {
            const salePrice = StockFunctions.getDefaultSalePrice(p);
            const baseQty = StockFunctions.convertToBaseUnits(s.quantity || 0, s.measureId, measures);
            return sum + (salePrice * baseQty);
          }, 0);
          return { name: p.name, quantity, value };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      
      // Low stock items - use calculated current stock
      const lowStockItems = productsWithStock
        .filter((p: any) => p.currentStock < (p.parLevel || 10))
        .map((p: any) => ({
          name: p.name,
          current: p.currentStock || 0,
          required: p.parLevel || 10,
          status: p.currentStock === 0 ? 'Out of Stock' : 'Low Stock'
        }))
        .slice(0, 10);
      const buildDateKeys = (startDate?: string, endDate?: string) => {
        const start = startDate ? safeParseDate(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? safeParseDate(endDate) : new Date();

        if (!start || !end || start > end) {
          return [new Date().toISOString().split('T')[0]];
        }

        const keys: string[] = [];
        for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
          keys.push(current.toISOString().split('T')[0]);
        }

        return keys.length > 0 ? keys : [new Date().toISOString().split('T')[0]];
      };
      // Filter sales and purchases by date range if provided
      const filteredSales = dateRange ? sales.filter((s: any) => {
        const saleDate = safeString(s.tradingDate || s.date);
        return saleDate && saleDate >= dateRange.startDate && saleDate <= dateRange.endDate;
      }) : sales;

      const filteredPurchases = dateRange ? purchases.filter((p: any) => {
        const purchaseDate = safeString(p.dateOrdered || p.date);
        return purchaseDate && purchaseDate >= dateRange.startDate && purchaseDate <= dateRange.endDate;
      }) : purchases;
      // Generate trend data from actual filtered sales and purchases
      const baseStockValue = productsWithStock.reduce((sum: number, p: any) => {
        return sum + (p.currentStock * p.effectiveCost);
      }, 0);

      const dateKeys = buildDateKeys(dateRange?.startDate, dateRange?.endDate);
      const purchaseAmountByDate = new Map<string, number>();
      const salesAmountByDate = new Map<string, number>();
      const transactionsByDate = new Map<string, number>();

      filteredPurchases.forEach((purchase: any) => {
        const date = safeString(purchase.dateOrdered || purchase.date).slice(0, 10);
        if (!date) return;
        purchaseAmountByDate.set(date, (purchaseAmountByDate.get(date) || 0) + safeNumber(purchase.totalValue || purchase.totalCost, 0));
        transactionsByDate.set(date, (transactionsByDate.get(date) || 0) + 1);
      });

      filteredSales.forEach((sale: any) => {
        const date = safeString(sale.tradingDate || sale.date).slice(0, 10);
        if (!date) return;
        const product = productsWithStock.find((p: any) => p.id === sale.productId || p.id === sale.itemID);
        const unitPrice = product ? StockFunctions.getDefaultSalePrice(product) : safeNumber(sale.salePrice, 0);
        const quantity = StockFunctions.convertToBaseUnits(sale.quantity || 0, sale.measureId, measures);
        const amount = safeNumber(sale.salePrice, unitPrice * quantity);
        salesAmountByDate.set(date, (salesAmountByDate.get(date) || 0) + amount);
        transactionsByDate.set(date, (transactionsByDate.get(date) || 0) + 1);
      });

      let runningStockValue = baseStockValue;
      const stockTrends = dateKeys.map((date) => {
        const purchasesForDay = purchaseAmountByDate.get(date) || 0;
        const salesForDay = salesAmountByDate.get(date) || 0;
        runningStockValue = Math.max(runningStockValue + purchasesForDay - salesForDay, 0);

        return {
          date,
          stockValue: Math.round(runningStockValue * 100) / 100,
          itemCount: productsWithStock.length,
          transactions: transactionsByDate.get(date) || 0
        };
      });
      
      
      // Generate sales history from filtered sales - format for widget compatibility
      const salesHistory = filteredSales.length > 0 
        ? filteredSales.map((s: any) => ({
            date: s.tradingDate || s.date || new Date().toISOString().split('T')[0],
            amount: s.salePrice || 0,
            items: s.quantity || 1,
            profit: (s.salePrice || 0) - (s.cost || s.salePrice * 0.7 || 0)
          }))
        : [];

      // Generate purchase history from filtered purchases - format for widget compatibility
      const purchaseHistory = filteredPurchases.length > 0
        ? filteredPurchases.map((p: any) => ({
            date: p.dateOrdered || p.date || new Date().toISOString().split('T')[0],
            amount: p.totalValue || p.totalCost || 0,
            items: p.items?.length || 1,
            supplier: p.supplierName || 'Unknown'
          }))
        : [];
      
      // Calculate stock turnover using standard formula (COGS / Average Inventory Value)
      const periodDays = dateRange ? 
        Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (24 * 60 * 60 * 1000)) : 
        30;
      const stockTurnover = StockFunctions.calculateStockTurnover(
        productsWithStock,
        filteredSales,
        measures,
        periodDays
      );
      
      // Calculate stock accuracy from variance between predicted and actual counts
      let totalAccuracy = 0;
      let accuracyCount = 0;
      stockCounts.forEach((count: any) => {
        if (!count.items) return;
        count.items.forEach((item: any) => {
          const product = productsWithStock.find((p: any) => p.id === item.id);
          if (!product) return;
          
          const predictedStock = product.predictedStock || 0;
          const actualCount = StockFunctions.convertToBaseUnits(item.countedTotal || 0, item.measureId, measures);
          const accuracy = StockFunctions.calculateStockAccuracy(predictedStock, actualCount);
          
          totalAccuracy += accuracy;
          accuracyCount++;
        });
      });
      const avgStockAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 95;
      
      const result = {
        kpis: {
          totalStockValue: baseStockValue,
          totalItems: productsWithStock.length,
          lowStockCount: lowStockItems.length,
          totalCategories: categories.length,
          totalSuppliers: suppliers.length,
          averageStockTurnover: stockTurnover,
          totalPurchaseValue,
          totalSalesValue,
          profitMargin,
          stockAccuracy: Math.round(avgStockAccuracy * 100) / 100,
          reorderRequired: lowStockItems.length,
          expiredItems: 0, // TODO: Calculate expired items based on expiry dates
        },
        stockByCategory,
        stockBySupplier,
        stockByLocation: locations.map((loc: any) => ({
          location: loc.name || 'Unknown Location',
          value: Math.round(baseStockValue / Math.max(1, locations.length)),
          count: Math.round(productsWithStock.length / Math.max(1, locations.length))
        })),
        topSellingItems,
        lowStockItems,
        stockTrends,
        purchaseHistory,
        salesHistory,
        stockCounts: stockCounts.map((count: any) => {
          // Calculate variance for this stock count
          let totalVariance = 0;
          let itemCount = 0;
          let totalAccuracyForCount = 0;
          
          if (count.items) {
            count.items.forEach((item: any) => {
              const product = productsWithStock.find((p: any) => p.id === item.id);
              if (!product) return;
              
              const predictedStock = product.predictedStock || 0;
              const actualCount = StockFunctions.convertToBaseUnits(item.countedTotal || 0, item.measureId, measures);
              const variance = predictedStock - actualCount;
              const accuracy = StockFunctions.calculateStockAccuracy(predictedStock, actualCount);
              
              totalVariance += variance;
              totalAccuracyForCount += accuracy;
              itemCount++;
            });
          }
          
          return {
            date: count.dateUK || count.date || new Date().toISOString().split('T')[0],
            counted: count.items?.length || 0,
            variance: itemCount > 0 ? Math.round(totalVariance / itemCount) : 0,
            accuracy: itemCount > 0 ? Math.round((totalAccuracyForCount / itemCount) * 100) / 100 : 100
          };
        }),
        parLevelStatus: productsWithStock
          .filter((p: any) => p.parLevel)
          .map((p: any) => ({
            item: p.name,
            current: p.currentStock || 0,
            parLevel: p.parLevel || 0,
            status: (p.currentStock || 0) < (p.parLevel || 0) ? 'Below Par' : 'Above Par'
          }))
          .slice(0, 20),
        profitAnalysis: topSellingItems.map((item: any) => ({
          item: item.name,
          cost: item.value * 0.7, // Assume 70% cost ratio
          price: item.value,
          margin: 30, // 30% margin
          volume: item.quantity
        })),
      };
      
      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading stock widgets');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getCompanyWidgets = async (): Promise<CompanyWidgets> => {
    try {
      setLoading(true);
      setError(null);
      const basePath = getBasePath();
      if (!basePath) throw new Error('No company path available');

      const [sites, checklists] = await Promise.all([
        CompanyRTDB.getSitesFromDb(companyState.companyID!),
        fetchChecklists(),
      ]);

      const totalSites = sites?.length || 0;
      const totalSubsites = sites?.reduce((sum: number, site: any) => sum + (site.subsites ? Object.keys(site.subsites).length : 0), 0) || 0;
      const totalChecklists = checklists?.length || 0;
      const getChecklistItems = (checklist: any) => {
        const sections = safeArray(checklist?.sections) as any[];
        return sections.flatMap((section: any) => safeArray(section?.items) as any[]);
      };

      const isCompletedItem = (item: any) => {
        const status = safeString(item?.status).toLowerCase();
        return Boolean(item?.completedAt || item?.completed || item?.isCompleted || status === 'completed' || status === 'done');
      };

      const isOverdueItem = (item: any) => {
        if (isCompletedItem(item)) return false;
        const status = safeString(item?.status).toLowerCase();
        if (status === 'overdue' || status === 'late' || status === 'expired') return true;
        const dueDate = safeParseDate(item?.dueDate || item?.deadline || item?.targetDate);
        return dueDate ? dueDate.getTime() < Date.now() : false;
      };

      const checklistStats = (checklists || []).map((checklist: any) => {
        const items = getChecklistItems(checklist);
        const completedCount = items.filter(isCompletedItem).length;
        const overdueCount = items.filter(isOverdueItem).length;

        return {
          name: checklist.title || 'Unnamed Checklist',
          completionRate: items.length > 0 ? (completedCount / items.length) * 100 : 0,
          overdue: overdueCount,
        };
      });

      const sitePerformance = (sites || []).map((site: any) => {
        const relatedChecklists = (checklists || []).filter((checklist: any) => {
          const assignedSites = safeArray(checklist?.assignedSites) as any[];
          const siteIds = safeArray(checklist?.siteIds) as any[];
          return checklist?.siteId === site.id || assignedSites.includes(site.id) || siteIds.includes(site.id) || checklist?.isGlobalAccess;
        });

        const siteItems = relatedChecklists.flatMap((checklist: any) => getChecklistItems(checklist));
        const completedItems = siteItems.filter(isCompletedItem).length;
        const openIssues = siteItems.filter((item: any) => !isCompletedItem(item)).length;

        return {
          siteName: site.name || 'Unnamed Site',
          score: siteItems.length > 0 ? (completedItems / siteItems.length) * 100 : 0,
          issues: openIssues,
        };
      });

      const totalChecklistItems = (checklists || []).reduce((sum: number, checklist: any) => sum + getChecklistItems(checklist).length, 0);
      const completedChecklistItems = (checklists || []).reduce((sum: number, checklist: any) => {
        return sum + getChecklistItems(checklist).filter(isCompletedItem).length;
      }, 0);

      return {
        kpis: {
          totalSites,
          totalSubsites,
          totalEmployees: hrContext.state.employees?.length || 0,
          totalChecklists,
          completionRate: totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0,
        },
        checklistStats,
        sitePerformance,
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading company widgets');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getComprehensiveDataSnapshot = async () => {
    try {
      setLoading(true);
      setError(null);
      const basePath = getBasePath();
      if (!basePath) throw new Error('No base path available');

      // Fetch comprehensive data from required modules in parallel
      const [finance, bookings, pos, hr, stock, company] = await Promise.all([
        fetchComprehensiveModuleData('finance', getModuleBasePath('finance')),
        fetchComprehensiveModuleData('bookings', getModuleBasePath('bookings')),
        fetchComprehensiveModuleData('pos', `${basePath}/data/sales`),
        fetchComprehensiveModuleData('hr', getModuleBasePath('hr')),
        fetchComprehensiveModuleData('stock', getModuleBasePath('stock')),
        fetchComprehensiveModuleData('company', basePath),
      ]);

      // Get current context information
      const currentSite = companyState.sites?.find(s => s.siteID === companyState.selectedSiteID);
      const currentSubsite = currentSite?.subsites?.[companyState.selectedSubsiteID || ''];
      const currentUser = settingsState.user;

      // Enhanced data snapshot with complete subsite context
      return {
        timestamp: new Date().toISOString(),
        
        // Current Context
        context: {
          companyId: companyState.companyID,
          companyName: companyState.companyName,
          siteId: companyState.selectedSiteID,
          siteName: currentSite?.name || 'Unknown Site',
          subsiteId: companyState.selectedSubsiteID,
          subsiteName: currentSubsite?.name || 'No Subsite Selected',
          userId: settingsState.auth?.uid,
          userName: currentUser?.displayName || currentUser?.email || 'Unknown User',
          userEmail: currentUser?.email || 'Unknown Email',
        },

        // Complete Business Data
        modules: {
          finance,
          bookings,
          pos,
          hr,
          stock,
          company,
        },

        // Enhanced Metadata
        metadata: {
          dataScope: companyState.selectedSubsiteID ? 'subsite' : companyState.selectedSiteID ? 'site' : 'company',
          basePath,
          totalDataPoints: Object.values({ finance, bookings, pos, hr, stock, company })
            .filter(Boolean)
            .reduce((sum, module) => sum + (typeof module === 'object' ? Object.keys(module).length : 0), 0),
          modulesWithData: Object.entries({ finance, bookings, pos, hr, stock, company })
            .filter(([, data]) => data !== null)
            .map(([name]) => name),
          hierarchyLevel: companyState.selectedSubsiteID ? 3 : companyState.selectedSiteID ? 2 : 1,
          accessLevel: 'user', // Access level determined by Firebase Auth
        },

        // Site/Subsite Structure for Context
        organizationStructure: {
          company: {
            id: companyState.companyID,
            name: companyState.companyName,
          },
          site: currentSite ? {
            id: currentSite.siteID,
            name: currentSite.name,
            description: currentSite.description,
            address: currentSite.address,
          } : null,
          subsite: currentSubsite ? {
            id: companyState.selectedSubsiteID,
            name: currentSubsite.name,
            description: currentSubsite.description,
            address: currentSubsite.address,
          } : null,
          allSites: companyState.sites?.map(s => ({
            id: s.siteID,
            name: s.name,
            subsiteCount: s.subsites ? Object.keys(s.subsites).length : 0,
          })) || [],
        },
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error creating comprehensive data snapshot');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCrossModuleCorrelations = async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getComprehensiveDataSnapshot();
      const prompt = `Analyze cross-module correlations and dependencies in this comprehensive business data:

1. Identify patterns between different business modules (finance, HR, stock, bookings, etc.)
2. Find correlations between employee performance and business metrics
3. Analyze how inventory levels affect sales and bookings
4. Examine financial health impact on operational efficiency
5. Identify bottlenecks and optimization opportunities across modules

Provide specific insights with data-driven recommendations for improving overall business performance.`;
      return await analyzeData(snapshot, prompt);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing cross-module correlations');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (request: string, domain?: 'finance' | 'bookings' | 'pos' | 'hr' | 'stock' | 'company' | 'comprehensive') => {
    try {
      setLoading(true);
      setError(null);
      let context: any = {};
      
      switch (domain) {
        case 'finance':
          context = await getFinanceWidgets();
          break;
        case 'bookings':
          context = await getBookingsWidgets();
          break;
        case 'pos':
          context = await getPOSWidgets();
          break;
        case 'hr':
          context = await getHRWidgets();
          break;
        case 'stock':
          context = await getStockWidgets();
          break;
        case 'company':
          context = await getCompanyWidgets();
          break;
        case 'comprehensive':
          context = await getComprehensiveDataSnapshot();
          break;
        default:
          // Provide comprehensive context with all available modules
          context = {
            finance: await getFinanceWidgets().catch(() => undefined),
            bookings: await getBookingsWidgets().catch(() => undefined),
            pos: await getPOSWidgets().catch(() => undefined),
            hr: await getHRWidgets().catch(() => undefined),
            stock: await getStockWidgets().catch(() => undefined),
            company: await getCompanyWidgets().catch(() => undefined),
          };
      }
      
      return await generateBusinessReport(request, context);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error generating report');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ========== UNIVERSAL DATA ACCESS ==========
  
  const getWidgetData = useCallback(async (dataType: string, options?: { 
    dateRange?: { startDate: string; endDate: string };
    filters?: Record<string, any>;
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    module?: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'company';
  }): Promise<any> => {
    try {
      setLoading(true);
      setError(null);
      
      const dt = safeString(dataType);
      const dtLower = dt.toLowerCase();
      const moduleHint =
        options?.module ||
        (options?.filters?.module as any) ||
        (options?.filters?.section as any);

      const STOCK_TYPES = new Set([
        'stockcount','stockvalue','stockquantity','purchases','sales','predictedstock','costofsales','profit','parlevels','stockturnover',
        'topitems','totalitems','profitmargin','lowstockitems','inventoryvalue','stockreorder','stockprofit','categories','suppliers','locations',
        'stockaccuracy','expireditems','stockbycategory','stockbysupplier','stockbylocation','stocktrends','purchasehistory','saleshistory',
        'stockcountshistory','parlevelstatus','profitanalysis'
      ]);
      const HR_TYPES = new Set([
        'attendance','performance','turnover','recruitment','training','payroll','departments','employeesbydepartment','attendancetrends',
        'performancemetrics','trainingprogress','payrollbreakdown','timeoffrequests','recruitmentfunnel','turnoveranalysis'
      ]);
      const BOOKINGS_TYPES = new Set([
        'totalbookings','bookingsbyday','bookingsbyhour','bookingsbysource','bookingsbypartysize','customersegments','seasonaltrends',
        'cancellationanalysis','waitlistanalytics','occupancyrate','bookingsbystatus','bookingsbytype','tableoccupancy','bookingtrends'
      ]);
      const FINANCE_TYPES = new Set([
        'cashbalance','revenue','expenses','profit','profitmargin','cashflow','outstandinginvoices','budgetvariance','cashflowanalysis',
        'revenuebycustomer','expensebreakdown','budgetperformance','revenuebysource','expensesbycategory','profitlosstrends','budgetvsactual',
        'invoiceanalysis','paymenttrends','financialratios','taxanalysis','accountsreceivable','accountspayable'
      ]);
      const POS_TYPES = new Set([
        'possales','postransactions','totaltransactions','dailysales','hourlysales','salesbyday','salesbyhour','salesbyweekday',
        'paymentmethods','paymentmethodbreakdown','topsellingitems','customeranalytics','discountanalysis','refundanalysis','peaktimes','tableutilization'
      ]);
      const COMPANY_TYPES = new Set(['totalsites','checkliststats','siteperformance','companymetrics']);

      const inferredModule = (() => {
        if (moduleHint) return safeString(moduleHint).toLowerCase();
        if (STOCK_TYPES.has(dtLower)) return 'stock';
        if (HR_TYPES.has(dtLower)) return 'hr';
        if (BOOKINGS_TYPES.has(dtLower)) return 'bookings';
        if (FINANCE_TYPES.has(dtLower)) return 'finance';
        if (POS_TYPES.has(dtLower)) return 'pos';
        if (COMPANY_TYPES.has(dtLower)) return 'company';
        // Last-resort heuristic: prefix-based
        if (dtLower.startsWith('stock')) return 'stock';
        if (dtLower.startsWith('hr')) return 'hr';
        if (dtLower.startsWith('booking')) return 'bookings';
        if (dtLower.startsWith('finance')) return 'finance';
        if (dtLower.startsWith('pos')) return 'pos';
        if (dtLower.startsWith('company')) return 'company';
        return 'stock';
      })();

      if (inferredModule === 'stock') {
        const stockWidgets = await getStockWidgets(options?.dateRange);
        return getDataFromWidgets(stockWidgets, dtLower, options);
      }
      if (inferredModule === 'hr') {
        const hrWidgets = await getHRWidgets(options?.dateRange);
        return getDataFromWidgets(hrWidgets, dtLower, options);
      }
      if (inferredModule === 'pos') {
        const posWidgets = await getPOSWidgets(options?.dateRange);
        return getDataFromWidgets(posWidgets, dtLower, options);
      }
      if (inferredModule === 'bookings') {
        const bookingWidgets = await getBookingsWidgets(options?.dateRange);
        return getDataFromWidgets(bookingWidgets, dtLower, options);
      }
      if (inferredModule === 'finance') {
        const financeWidgets = await getFinanceWidgets(options?.dateRange);
        return getDataFromWidgets(financeWidgets, dtLower, options);
      }
      if (inferredModule === 'company') {
        const companyWidgets = await getCompanyWidgets();
        return getDataFromWidgets(companyWidgets, dtLower, options);
      }
      
      throw new Error(`Unsupported data type: ${dataType}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error fetching widget data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  // Helper function to extract specific data from widget collections
  const getDataFromWidgets = (widgets: any, dataType: string, _options?: any): any => {
    const lowerDataType = dataType.toLowerCase();
    
    // KPI data
    if (lowerDataType.includes('kpi') || lowerDataType.includes('total') || lowerDataType.includes('count')) {
      return widgets.kpis || {};
    }
    
    // Time-series style datasets
    if (
      lowerDataType.includes('trend') ||
      lowerDataType.includes('history') ||
      lowerDataType.includes('byday') ||
      lowerDataType.includes('byhour') ||
      lowerDataType.includes('byweekday')
    ) {
      return (
        widgets.stockTrends ||
        widgets.attendanceTrends ||
        widgets.salesByDay ||
        widgets.bookingsByDay ||
        widgets.cashFlow ||
        widgets.profitLossTrends ||
        []
      );
    }
    
    // Category/breakdown data
    if (lowerDataType.includes('category') || lowerDataType.includes('breakdown')) {
      return widgets.stockByCategory || widgets.expensesByCategory || widgets.paymentMethodBreakdown || [];
    }
    
    // Customer segmentation / utilization datasets
    if (lowerDataType.includes('segment') || lowerDataType.includes('customer')) {
      return widgets.customerSegments || widgets.customerAnalytics || [];
    }
    if (lowerDataType.includes('utilization') || lowerDataType.includes('occupancy')) {
      return widgets.tableUtilization || [];
    }

    // Analysis data
    if (lowerDataType.includes('analysis')) {
      return widgets.profitAnalysis || widgets.cancellationAnalysis || widgets.discountAnalysis || [];
    }
    
    // Return all widget data if no specific match
    return widgets;
  };

  // ========== DASHBOARD MANAGEMENT ==========
  
  const saveDashboardLayout = useCallback(async (section: string, layout: any[]): Promise<void> => {
    try {
      const uid = settingsState.auth?.uid
      if (!uid) throw new Error("Not authenticated")

      const companyId = companyState.companyID
      if (!companyId) throw new Error("No company selected")

      // Persist layouts per-user so each user can customize independently.
      // Scope the layout to company/site/subsite selection so users can have different dashboards per context.
      const siteId = companyState.selectedSiteID
      const subsiteId = companyState.selectedSubsiteID

      const scopeType = siteId ? (subsiteId ? "subsite" : "site") : "company"
      const scopeId = siteId ? (subsiteId ? `${siteId}__${subsiteId}` : siteId) : "company"

      const layoutPath = `users/${uid}/dashboardLayouts/${companyId}/${scopeType}/${scopeId}/${section}`
      await saveToPathFn(layoutPath, "", {
        layout,
        updatedAt: Date.now(),
        version: '1.0'
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error saving dashboard layout');
      throw error;
    }
  }, [
    companyState.companyID,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    settingsState.auth?.uid,
  ]);

  // Get default dashboard layout for a specific section
  const getDefaultDashboardLayout = useCallback((section: string): any[] => {
    const layouts: Record<string, any[]> = {
      hr: [
        // Row 1: Key Metrics
        {
          id: 'hr-total-employees',
          type: 'kpiCard',
          title: 'Total Employees',
          dataSource: 'hr',
          dataType: 'totalEmployees',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: {
            icon: 'People',
            color: 'primary',
            format: 'number',
            showTrend: true
          }
        },
        {
          id: 'hr-active-employees',
          type: 'kpiCard',
          title: 'Active Employees',
          dataSource: 'hr',
          dataType: 'activeEmployees',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: {
            icon: 'CheckCircle',
            color: 'success',
            format: 'number',
            showTrend: true
          }
        },
        {
          id: 'hr-attendance-rate',
          type: 'kpiCard',
          title: 'Attendance Rate',
          dataSource: 'hr',
          dataType: 'averageAttendance',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: {
            icon: 'Schedule',
            color: 'info',
            format: 'percentage',
            showTrend: true
          }
        },
        {
          id: 'hr-payroll-total',
          type: 'kpiCard',
          title: 'Total Payroll',
          dataSource: 'hr',
          dataType: 'payrollTotal',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: {
            icon: 'AttachMoney',
            color: 'warning',
            format: 'currency',
            showTrend: true
          }
        },
        // Row 2: Department & Performance
        {
          id: 'hr-employees-by-department',
          type: 'barChart',
          title: 'Employees by Department',
          dataSource: 'hr',
          dataType: 'employeesByDepartment',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: {
            xAxis: 'department',
            yAxis: 'count',
            color: 'primary',
            showDataLabels: true
          }
        },
        {
          id: 'hr-performance-metrics',
          type: 'radarChart',
          title: 'Performance Overview',
          dataSource: 'hr',
          dataType: 'performanceMetrics',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: {
            metrics: ['score', 'attendance', 'training'],
            color: 'secondary'
          }
        },
        // Row 3: Attendance & Time Off
        {
          id: 'hr-attendance-trends',
          type: 'lineChart',
          title: 'Attendance Trends (30 Days)',
          dataSource: 'hr',
          dataType: 'attendanceTrends',
          position: { x: 0, y: 6, w: 8, h: 4 },
          config: {
            xAxis: 'date',
            yAxis: ['present', 'absent', 'late'],
            colors: ['#4caf50', '#f44336', '#ff9800'],
            showLegend: true
          }
        },
        {
          id: 'hr-time-off-summary',
          type: 'pieChart',
          title: 'Time Off Requests',
          dataSource: 'hr',
          dataType: 'timeOffRequests',
          position: { x: 8, y: 6, w: 4, h: 4 },
          config: {
            valueField: 'approved',
            labelField: 'type',
            showPercentage: true
          }
        },
        // Row 4: Training & Payroll
        {
          id: 'hr-training-progress',
          type: 'stackedBarChart',
          title: 'Training Progress',
          dataSource: 'hr',
          dataType: 'trainingProgress',
          position: { x: 0, y: 10, w: 6, h: 4 },
          config: {
            xAxis: 'course',
            yAxis: ['completed', 'total'],
            colors: ['#4caf50', '#e0e0e0'],
            showPercentage: true
          }
        },
        {
          id: 'hr-payroll-breakdown',
          type: 'donutChart',
          title: 'Payroll by Department',
          dataSource: 'hr',
          dataType: 'payrollBreakdown',
          position: { x: 6, y: 10, w: 6, h: 4 },
          config: {
            valueField: 'amount',
            labelField: 'department',
            showTotal: true,
            format: 'currency'
          }
        },
        // Row 5: Recruitment & Turnover
        {
          id: 'hr-recruitment-funnel',
          type: 'funnelChart',
          title: 'Recruitment Funnel',
          dataSource: 'hr',
          dataType: 'recruitmentFunnel',
          position: { x: 0, y: 14, w: 6, h: 4 },
          config: {
            valueField: 'count',
            labelField: 'stage',
            showConversion: true
          }
        },
        {
          id: 'hr-turnover-analysis',
          type: 'areaChart',
          title: 'Turnover Analysis (12 Months)',
          dataSource: 'hr',
          dataType: 'turnoverAnalysis',
          position: { x: 6, y: 14, w: 6, h: 4 },
          config: {
            xAxis: 'month',
            yAxis: ['joined', 'left', 'netChange'],
            colors: ['#4caf50', '#f44336', '#2196f3'],
            showLegend: true
          }
        }
      ],
      stock: [
        // Stock dashboard layout
        {
          id: 'stock-total-value',
          type: 'kpiCard',
          title: 'Total Stock Value',
          dataSource: 'stock',
          dataType: 'totalStockValue',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: { icon: 'Inventory', color: 'primary', format: 'currency' }
        },
        {
          id: 'stock-total-items',
          type: 'kpiCard',
          title: 'Total Items',
          dataSource: 'stock',
          dataType: 'totalItems',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: { icon: 'Category', color: 'info', format: 'number' }
        },
        {
          id: 'stock-low-stock',
          type: 'kpiCard',
          title: 'Low Stock Items',
          dataSource: 'stock',
          dataType: 'lowStockCount',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { icon: 'Warning', color: 'warning', format: 'number' }
        },
        {
          id: 'stock-profit-margin',
          type: 'kpiCard',
          title: 'Profit Margin',
          dataSource: 'stock',
          dataType: 'profitMargin',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: { icon: 'TrendingUp', color: 'success', format: 'percentage' }
        },
        {
          id: 'stock-by-category',
          type: 'pieChart',
          title: 'Stock by Category',
          dataSource: 'stock',
          dataType: 'stockByCategory',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: { valueField: 'value', labelField: 'category' }
        },
        {
          id: 'stock-trends',
          type: 'lineChart',
          title: 'Stock Value Trends',
          dataSource: 'stock',
          dataType: 'stockTrends',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: { xAxis: 'date', yAxis: 'stockValue' }
        }
      ],
      finance: [
        // Finance dashboard layout
        {
          id: 'finance-cash-balance',
          type: 'kpiCard',
          title: 'Cash Balance',
          dataSource: 'finance',
          dataType: 'cashBalance',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: { icon: 'AccountBalance', color: 'primary', format: 'currency' }
        },
        {
          id: 'finance-revenue',
          type: 'kpiCard',
          title: 'Revenue',
          dataSource: 'finance',
          dataType: 'revenue',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: { icon: 'TrendingUp', color: 'success', format: 'currency' }
        },
        {
          id: 'finance-expenses',
          type: 'kpiCard',
          title: 'Expenses',
          dataSource: 'finance',
          dataType: 'expenses',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { icon: 'TrendingDown', color: 'error', format: 'currency' }
        },
        {
          id: 'finance-profit',
          type: 'kpiCard',
          title: 'Profit',
          dataSource: 'finance',
          dataType: 'profit',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: { icon: 'AttachMoney', color: 'warning', format: 'currency' }
        }
      ],
      bookings: [
        // Bookings dashboard layout
        {
          id: 'bookings-total',
          type: 'kpiCard',
          title: 'Total Bookings',
          dataSource: 'bookings',
          dataType: 'totalBookings',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: { icon: 'Event', color: 'primary', format: 'number' }
        },
        {
          id: 'bookings-confirmed',
          type: 'kpiCard',
          title: 'Confirmed Bookings',
          dataSource: 'bookings',
          dataType: 'confirmedBookings',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: { icon: 'CheckCircle', color: 'success', format: 'number' }
        },
        {
          id: 'bookings-occupancy',
          type: 'kpiCard',
          title: 'Occupancy Rate',
          dataSource: 'bookings',
          dataType: 'occupancyRate',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { icon: 'TableRestaurant', color: 'info', format: 'percentage' }
        },
        {
          id: 'bookings-revenue',
          type: 'kpiCard',
          title: 'Booking Revenue',
          dataSource: 'bookings',
          dataType: 'totalRevenue',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: { icon: 'AttachMoney', color: 'warning', format: 'currency' }
        }
      ],
      pos: [
        // POS dashboard layout
        {
          id: 'pos-total-sales',
          type: 'kpiCard',
          title: 'Total Sales',
          dataSource: 'pos',
          dataType: 'totalSales',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: { icon: 'PointOfSale', color: 'primary', format: 'currency' }
        },
        {
          id: 'pos-transactions',
          type: 'kpiCard',
          title: 'Transactions',
          dataSource: 'pos',
          dataType: 'totalTransactions',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: { icon: 'Receipt', color: 'info', format: 'number' }
        },
        {
          id: 'pos-avg-transaction',
          type: 'kpiCard',
          title: 'Avg Transaction',
          dataSource: 'pos',
          dataType: 'averageTransactionValue',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { icon: 'Calculate', color: 'success', format: 'currency' }
        },
        {
          id: 'pos-daily-sales',
          type: 'kpiCard',
          title: 'Daily Sales',
          dataSource: 'pos',
          dataType: 'dailySales',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: { icon: 'Today', color: 'warning', format: 'currency' }
        }
      ]
    };
    
    return layouts[section.toLowerCase()] || [];
  }, []);

  const loadDashboardLayout = useCallback(async (section: string): Promise<any[]> => {
    try {
      const uid = settingsState.auth?.uid
      const companyId = companyState.companyID
      if (!uid || !companyId) return []

      const siteId = companyState.selectedSiteID
      const subsiteId = companyState.selectedSubsiteID

      const scopeType = siteId ? (subsiteId ? "subsite" : "site") : "company"
      const scopeId = siteId ? (subsiteId ? `${siteId}__${subsiteId}` : siteId) : "company"

      const userLayoutPath = `users/${uid}/dashboardLayouts/${companyId}/${scopeType}/${scopeId}/${section}`
      const userLayout = await fetchFromPathFn(userLayoutPath)

      if (userLayout) {
        return userLayout.layout
      }

      // Backward compatibility: previously layouts were stored at a shared company/site/subsite path.
      // If we find a legacy layout, return it as the initial layout for this user and migrate it.
      const basePath = getBasePath()
      if (!basePath) return []

      const legacyPath = `${basePath}/dashboards/${section}/layout`
      const legacyLayout = await fetchFromPathFn(legacyPath)
      if (legacyLayout) {
        // Migrate to user-specific layout
        try {
          await saveToPathFn(userLayoutPath, "", {
            layout: legacyLayout,
            updatedAt: Date.now(),
            migrated: true,
            updatedBy: uid,
            migratedFrom: legacyPath,
          })
        } catch {
          // ignore
        }
        return legacyLayout
      }

      return []
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading dashboard layout');
      // Fail closed; let the UI layer fall back to local defaults/localStorage.
      return [];
    }
  }, [
    companyState.companyID,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    settingsState.auth?.uid,
  ]);

  const getAvailableWidgetTypes = useCallback((): string[] => {
    return [
      'stat', 'kpiCard', 'dashboardCard',
      'barChart', 'lineChart', 'pieChart', 'donutChart', 'areaChart',
      'scatterChart', 'bubbleChart', 'radarChart', 'heatmap', 'gauge',
      'funnelChart', 'waterfallChart', 'candlestickChart',
      'multipleSeriesLineChart', 'multipleSeriesBarChart', 'stackedBarChart', 'stackedAreaChart',
      'table', 'dataGrid', 'metricList', 'progressBar', 'trendIndicator',
      'filterWidget', 'datePickerWidget', 'searchWidget',
      'calendarHeatmap', 'geographicMap', 'treeMap', 'sankeyDiagram', 'networkDiagram',
      'tabsWidget', 'accordionWidget', 'carouselWidget'
    ];
  }, []);


  // ========== REAL-TIME SUBSCRIPTIONS ==========
  
  const subscriptions = useRef<Map<string, any>>(new Map());
  
  const subscribeToWidgetData = useCallback((dataType: string, callback: (data: any) => void): (() => void) => {
    // For now, implement polling-based updates
    // TODO: Implement real-time Firebase listeners for better performance
    const intervalId = setInterval(async () => {
      try {
        const data = await getWidgetData(dataType);
        callback(data);
      } catch (error) {
        debugWarn(`Error updating widget data for ${dataType}:`, error);
      }
    }, 30000); // Update every 30 seconds
    
    subscriptions.current.set(dataType, intervalId);
    
    return () => {
      clearInterval(intervalId);
      subscriptions.current.delete(dataType);
    };
  }, [getWidgetData]);

  const unsubscribeFromWidgetData = useCallback((dataType: string): void => {
    const intervalId = subscriptions.current.get(dataType);
    if (intervalId) {
      clearInterval(intervalId);
      subscriptions.current.delete(dataType);
    }
  }, []);

  // ========== COMPREHENSIVE ANALYTICS FUNCTIONS ==========

  const getStockAnalytics = useCallback(async (groupBy?: GroupByOptions, filters?: FilterOptions): Promise<AnalyticsResult> => {
    const stockBasePath = getModuleBasePath('stock');
    const cacheKey = buildDerivedCacheKey("analytics/stock", stockBasePath, { groupBy, filters })
    const cached = await getFreshDerivedCache<AnalyticsResult>(cacheKey, ANALYTICS_CACHE_TTL_MS)
    if (cached) {
      // Refresh in background (deduped) to keep correlations correct.
      void runDeduped(cacheKey, async () => {
        const [products, sales, purchases, stockCounts] = await Promise.all([
          StockRTDB.fetchProducts(stockBasePath),
          StockRTDB.fetchSales(stockBasePath),
          StockRTDB.fetchPurchases(stockBasePath),
          StockRTDB.fetchStockCounts2(stockBasePath),
        ])
        const allData = [...products, ...sales, ...purchases, ...stockCounts]
        return analyzeStockData(allData as any, groupBy, filters)
      }).catch(() => {})
      return cached
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get data from RTDatabase
      return await runDeduped(cacheKey, async () => {
        const [products, sales, purchases, stockCounts] = await Promise.all([
          StockRTDB.fetchProducts(stockBasePath),
          StockRTDB.fetchSales(stockBasePath),
          StockRTDB.fetchPurchases(stockBasePath),
          StockRTDB.fetchStockCounts2(stockBasePath),
        ])
        const allData = [...products, ...sales, ...purchases, ...stockCounts]
        return analyzeStockData(allData as any, groupBy, filters)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing stock data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getHRAnalytics = useCallback(async (groupBy?: GroupByOptions, filters?: FilterOptions): Promise<AnalyticsResult> => {
    const hrBasePath = getModuleBasePath('hr');
    const cacheKey = buildDerivedCacheKey("analytics/hr", hrBasePath, { groupBy, filters })
    const cached = await getFreshDerivedCache<AnalyticsResult>(cacheKey, ANALYTICS_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [employees, timeOffs, attendances, trainings] = await Promise.all([
          HRRTDB.fetchEmployees(hrBasePath),
          HRRTDB.fetchTimeOffs(hrBasePath).catch(() => []),
          HRRTDB.fetchAttendances(hrBasePath).catch(() => []),
          HRRTDB.fetchTrainings(hrBasePath).catch(() => []),
        ])
        const payrolls: any[] = []
        const allData = [...employees, ...timeOffs, ...attendances, ...trainings, ...payrolls]
        return analyzeHRData(allData, groupBy, filters)
      }).catch(() => {})
      return cached
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get data from RTDatabase
      return await runDeduped(cacheKey, async () => {
        const [employees, timeOffs, attendances, trainings] = await Promise.all([
          HRRTDB.fetchEmployees(hrBasePath),
          HRRTDB.fetchTimeOffs(hrBasePath).catch(() => []),
          HRRTDB.fetchAttendances(hrBasePath).catch(() => []),
          HRRTDB.fetchTrainings(hrBasePath).catch(() => []),
        ])
        const payrolls: any[] = []
        const allData = [...employees, ...timeOffs, ...attendances, ...trainings, ...payrolls]
        return analyzeHRData(allData, groupBy, filters)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing HR data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getBookingsAnalytics = useCallback(async (groupBy?: GroupByOptions, filters?: FilterOptions): Promise<AnalyticsResult> => {
    const bookingsBasePath = getModuleBasePath('bookings');
    const cacheKey = buildDerivedCacheKey("analytics/bookings", bookingsBasePath, { groupBy, filters })
    const cached = await getFreshDerivedCache<AnalyticsResult>(cacheKey, ANALYTICS_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [bookings, bookingTypes, tables, customers] = await Promise.all([
          BookingsRTDB.fetchBookings(bookingsBasePath),
          BookingsRTDB.fetchBookingTypes(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchTables(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchCustomers(bookingsBasePath).catch(() => []),
        ])
        const allData = [...bookings, ...bookingTypes, ...tables, ...customers] as any[]
        return analyzeBookingsData(allData, groupBy, filters)
      }).catch(() => {})
      return cached
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get data from RTDatabase
      return await runDeduped(cacheKey, async () => {
        const [bookings, bookingTypes, tables, customers] = await Promise.all([
          BookingsRTDB.fetchBookings(bookingsBasePath),
          BookingsRTDB.fetchBookingTypes(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchTables(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchCustomers(bookingsBasePath).catch(() => []),
        ])
        const allData = [...bookings, ...bookingTypes, ...tables, ...customers] as any[]
        return analyzeBookingsData(allData, groupBy, filters)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing bookings data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getFinanceAnalytics = useCallback(async (groupBy?: GroupByOptions, filters?: FilterOptions): Promise<AnalyticsResult> => {
    const financeBasePath = getModuleBasePath('finance');
    const cacheKey = buildDerivedCacheKey("analytics/finance", financeBasePath, { groupBy, filters })
    const cached = await getFreshDerivedCache<AnalyticsResult>(cacheKey, ANALYTICS_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [transactions, bills, expenses, budgets] = await Promise.all([
          FinanceRTDB.fetchTransactions(financeBasePath),
          FinanceRTDB.fetchBills(financeBasePath).catch(() => []),
          FinanceRTDB.fetchExpenses(financeBasePath).catch(() => []),
          FinanceRTDB.fetchBudgets(financeBasePath).catch(() => []),
        ])
        const allData = [...transactions, ...bills, ...expenses, ...budgets] as any[]
        return analyzeFinanceData(allData, groupBy, filters)
      }).catch(() => {})
      return cached
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get data from RTDatabase
      return await runDeduped(cacheKey, async () => {
        const [transactions, bills, expenses, budgets] = await Promise.all([
          FinanceRTDB.fetchTransactions(financeBasePath),
          FinanceRTDB.fetchBills(financeBasePath).catch(() => []),
          FinanceRTDB.fetchExpenses(financeBasePath).catch(() => []),
          FinanceRTDB.fetchBudgets(financeBasePath).catch(() => []),
        ])
        const allData = [...transactions, ...bills, ...expenses, ...budgets] as any[]
        return analyzeFinanceData(allData, groupBy, filters)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing finance data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getPOSAnalytics = useCallback(async (groupBy?: GroupByOptions, filters?: FilterOptions): Promise<AnalyticsResult> => {
    const posBasePath = getModuleBasePath('pos');
    const cacheKey = buildDerivedCacheKey("analytics/pos", posBasePath, { groupBy, filters })
    const cached = await getFreshDerivedCache<AnalyticsResult>(cacheKey, ANALYTICS_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [bills, discounts, promotions] = await Promise.all([
          FinanceRTDB.fetchBills(posBasePath),
          StockRTDB.fetchDiscounts(posBasePath).catch(() => []),
          StockRTDB.fetchPromotions(posBasePath).catch(() => []),
        ])
        const cards: any[] = []
        const allData = [...bills, ...cards, ...discounts, ...promotions] as any[]
        return analyzePOSData(allData, groupBy, filters)
      }).catch(() => {})
      return cached
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get data from RTDatabase
      return await runDeduped(cacheKey, async () => {
        const [bills, discounts, promotions] = await Promise.all([
          FinanceRTDB.fetchBills(posBasePath),
          StockRTDB.fetchDiscounts(posBasePath).catch(() => []),
          StockRTDB.fetchPromotions(posBasePath).catch(() => []),
        ])
        const cards: any[] = []
        const allData = [...bills, ...cards, ...discounts, ...promotions] as any[]
        return analyzePOSData(allData, groupBy, filters)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error analyzing POS data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  // ========== KPI FUNCTIONS ==========

  const getStockKPIs = useCallback(async (): Promise<KPIMetrics[]> => {
    const stockBasePath = getModuleBasePath('stock');
    const cacheKey = buildDerivedCacheKey("kpis/stock", stockBasePath, {})
    const cached = await getFreshDerivedCache<KPIMetrics[]>(cacheKey, KPI_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [products, sales, purchases] = await Promise.all([
          StockRTDB.fetchProducts(stockBasePath),
          StockRTDB.fetchSales(stockBasePath),
          StockRTDB.fetchPurchases(stockBasePath),
        ])
        return calculateStockKPIs(products, sales, purchases as any)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [products, sales, purchases] = await Promise.all([
          StockRTDB.fetchProducts(stockBasePath),
          StockRTDB.fetchSales(stockBasePath),
          StockRTDB.fetchPurchases(stockBasePath),
        ])
        return calculateStockKPIs(products, sales, purchases as any)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error calculating stock KPIs');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getHRKPIs = useCallback(async (): Promise<KPIMetrics[]> => {
    const hrBasePath = getModuleBasePath('hr');
    const cacheKey = buildDerivedCacheKey("kpis/hr", hrBasePath, {})
    const cached = await getFreshDerivedCache<KPIMetrics[]>(cacheKey, KPI_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [employees, timeOffs, attendances] = await Promise.all([
          HRRTDB.fetchEmployees(hrBasePath),
          HRRTDB.fetchTimeOffs(hrBasePath).catch(() => []),
          HRRTDB.fetchAttendances(hrBasePath).catch(() => []),
        ])
        return calculateHRKPIs(employees, timeOffs as any, attendances)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [employees, timeOffs, attendances] = await Promise.all([
          HRRTDB.fetchEmployees(hrBasePath),
          HRRTDB.fetchTimeOffs(hrBasePath).catch(() => []),
          HRRTDB.fetchAttendances(hrBasePath).catch(() => []),
        ])
        return calculateHRKPIs(employees, timeOffs as any, attendances)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error calculating HR KPIs');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getFinanceKPIs = useCallback(async (): Promise<KPIMetrics[]> => {
    const financeBasePath = getModuleBasePath('finance');
    const cacheKey = buildDerivedCacheKey("kpis/finance", financeBasePath, {})
    const cached = await getFreshDerivedCache<KPIMetrics[]>(cacheKey, KPI_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [transactions, expenses] = await Promise.all([
          FinanceRTDB.fetchTransactions(financeBasePath),
          FinanceRTDB.fetchExpenses(financeBasePath).catch(() => []),
        ])
        return calculateFinanceKPIs(transactions, [], expenses)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [transactions, expenses] = await Promise.all([
          FinanceRTDB.fetchTransactions(financeBasePath),
          FinanceRTDB.fetchExpenses(financeBasePath).catch(() => []),
        ])
        return calculateFinanceKPIs(transactions, [], expenses)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error calculating finance KPIs');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getBookingsKPIs = useCallback(async (): Promise<KPIMetrics[]> => {
    try {
      const bookingsBasePath = getModuleBasePath('bookings');
      const bookings = await BookingsRTDB.fetchBookings(bookingsBasePath);
      // Basic KPIs for bookings
      return [
        {
          value: bookings.length,
          label: 'Total Bookings',
          change: 0,
          changeType: 'neutral',
          trend: 'stable',
          format: 'number'
        },
        {
          value: bookings.filter(b => b.status === 'confirmed').length,
          label: 'Confirmed Bookings',
          change: 0,
          changeType: 'neutral',
          trend: 'stable',
          format: 'number'
        }
      ];
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error calculating bookings KPIs');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getPOSKPIs = useCallback(async (): Promise<KPIMetrics[]> => {
    try {
      const posBasePath = getModuleBasePath('pos');
      const bills = await FinanceRTDB.fetchBills(posBasePath);
      const totalSales = bills.reduce((sum: number, bill: any) => sum + (bill.total || bill.amount || 0), 0);
      
      return [
        {
          value: totalSales,
          label: 'Total Sales',
          change: 0,
          changeType: 'neutral',
          trend: 'stable',
          format: 'currency'
        },
        {
          value: bills.length,
          label: 'Total Transactions',
          change: 0,
          changeType: 'neutral',
          trend: 'stable',
          format: 'number'
        }
      ];
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error calculating POS KPIs');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  // ========== CHART DATA FUNCTIONS ==========

  const getStockChartData = useCallback(async (groupBy: GroupByOptions, valueField?: string): Promise<ChartData> => {
    const stockBasePath = getModuleBasePath('stock');
    const cacheKey = buildDerivedCacheKey("chart/stock", stockBasePath, { groupBy, valueField })
    const cached = await getFreshDerivedCache<ChartData>(cacheKey, CHART_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [products, sales, purchases] = await Promise.all([
          StockRTDB.fetchProducts(stockBasePath),
          StockRTDB.fetchSales(stockBasePath),
          StockRTDB.fetchPurchases(stockBasePath),
        ])
        const allData = [...products, ...sales, ...purchases]
        return generateChartData(allData, groupBy, valueField)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [products, sales, purchases] = await Promise.all([
          StockRTDB.fetchProducts(stockBasePath),
          StockRTDB.fetchSales(stockBasePath),
          StockRTDB.fetchPurchases(stockBasePath),
        ])
        const allData = [...products, ...sales, ...purchases]
        return generateChartData(allData, groupBy, valueField)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error generating stock chart data');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getHRChartData = useCallback(async (groupBy: GroupByOptions, valueField?: string): Promise<ChartData> => {
    const hrBasePath = getModuleBasePath('hr');
    const cacheKey = buildDerivedCacheKey("chart/hr", hrBasePath, { groupBy, valueField })
    const cached = await getFreshDerivedCache<ChartData>(cacheKey, CHART_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [employees, timeOffs, attendances, trainings] = await Promise.all([
          HRRTDB.fetchEmployees(hrBasePath),
          HRRTDB.fetchTimeOffs(hrBasePath).catch(() => []),
          HRRTDB.fetchAttendances(hrBasePath).catch(() => []),
          HRRTDB.fetchTrainings(hrBasePath).catch(() => []),
        ])
        const payrolls: any[] = []
        const allData = [...employees, ...timeOffs, ...attendances, ...trainings, ...payrolls]
        return generateChartData(allData, groupBy, valueField)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [employees, timeOffs, attendances, trainings] = await Promise.all([
          HRRTDB.fetchEmployees(hrBasePath),
          HRRTDB.fetchTimeOffs(hrBasePath).catch(() => []),
          HRRTDB.fetchAttendances(hrBasePath).catch(() => []),
          HRRTDB.fetchTrainings(hrBasePath).catch(() => []),
        ])
        const payrolls: any[] = []
        const allData = [...employees, ...timeOffs, ...attendances, ...trainings, ...payrolls]
        return generateChartData(allData, groupBy, valueField)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error generating HR chart data');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getBookingsChartData = useCallback(async (groupBy: GroupByOptions, valueField?: string): Promise<ChartData> => {
    const bookingsBasePath = getModuleBasePath('bookings');
    const cacheKey = buildDerivedCacheKey("chart/bookings", bookingsBasePath, { groupBy, valueField })
    const cached = await getFreshDerivedCache<ChartData>(cacheKey, CHART_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [bookings, bookingTypes, tables, customers] = await Promise.all([
          BookingsRTDB.fetchBookings(bookingsBasePath),
          BookingsRTDB.fetchBookingTypes(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchTables(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchCustomers(bookingsBasePath).catch(() => []),
        ])
        const allData = [...bookings, ...bookingTypes, ...tables, ...customers] as any[]
        return generateChartData(allData, groupBy, valueField)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [bookings, bookingTypes, tables, customers] = await Promise.all([
          BookingsRTDB.fetchBookings(bookingsBasePath),
          BookingsRTDB.fetchBookingTypes(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchTables(bookingsBasePath).catch(() => []),
          BookingsRTDB.fetchCustomers(bookingsBasePath).catch(() => []),
        ])
        const allData = [...bookings, ...bookingTypes, ...tables, ...customers] as any[]
        return generateChartData(allData, groupBy, valueField)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error generating bookings chart data');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getFinanceChartData = useCallback(async (groupBy: GroupByOptions, valueField?: string): Promise<ChartData> => {
    const financeBasePath = getModuleBasePath('finance');
    const cacheKey = buildDerivedCacheKey("chart/finance", financeBasePath, { groupBy, valueField })
    const cached = await getFreshDerivedCache<ChartData>(cacheKey, CHART_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [transactions, bills, expenses, budgets] = await Promise.all([
          FinanceRTDB.fetchTransactions(financeBasePath),
          FinanceRTDB.fetchBills(financeBasePath).catch(() => []),
          FinanceRTDB.fetchExpenses(financeBasePath).catch(() => []),
          FinanceRTDB.fetchBudgets(financeBasePath).catch(() => []),
        ])
        const allData = [...transactions, ...bills, ...expenses, ...budgets] as any[]
        return generateChartData(allData, groupBy, valueField)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [transactions, bills, expenses, budgets] = await Promise.all([
          FinanceRTDB.fetchTransactions(financeBasePath),
          FinanceRTDB.fetchBills(financeBasePath).catch(() => []),
          FinanceRTDB.fetchExpenses(financeBasePath).catch(() => []),
          FinanceRTDB.fetchBudgets(financeBasePath).catch(() => []),
        ])
        const allData = [...transactions, ...bills, ...expenses, ...budgets] as any[]
        return generateChartData(allData, groupBy, valueField)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error generating finance chart data');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  const getPOSChartData = useCallback(async (groupBy: GroupByOptions, valueField?: string): Promise<ChartData> => {
    const posBasePath = getModuleBasePath('pos');
    const cacheKey = buildDerivedCacheKey("chart/pos", posBasePath, { groupBy, valueField })
    const cached = await getFreshDerivedCache<ChartData>(cacheKey, CHART_CACHE_TTL_MS)
    if (cached) {
      void runDeduped(cacheKey, async () => {
        const [bills, discounts, promotions] = await Promise.all([
          FinanceRTDB.fetchBills(posBasePath),
          StockRTDB.fetchDiscounts(posBasePath).catch(() => []),
          StockRTDB.fetchPromotions(posBasePath).catch(() => []),
        ])
        const cards: any[] = []
        const allData = [...bills, ...cards, ...discounts, ...promotions] as any[]
        return generateChartData(allData, groupBy, valueField)
      }).catch(() => {})
      return cached
    }
    try {
      return await runDeduped(cacheKey, async () => {
        const [bills, discounts, promotions] = await Promise.all([
          FinanceRTDB.fetchBills(posBasePath),
          StockRTDB.fetchDiscounts(posBasePath).catch(() => []),
          StockRTDB.fetchPromotions(posBasePath).catch(() => []),
        ])
        const cards: any[] = []
        const allData = [...bills, ...cards, ...discounts, ...promotions] as any[]
        return generateChartData(allData, groupBy, valueField)
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error generating POS chart data');
      throw error;
    }
  }, [companyState.companyID, companyState.selectedSiteID]);

  // Get available data types for a specific section
  const getAvailableDataTypes = useCallback((section?: string) => {
    const allDataTypes = [
      // Stock Analytics
      { value: 'stockCount', label: 'Stock Count', category: 'Stock' },
      { value: 'stockValue', label: 'Stock Value', category: 'Stock' },
      { value: 'stockQuantity', label: 'Stock Quantity', category: 'Stock' },
      { value: 'purchases', label: 'Purchases', category: 'Stock' },
      { value: 'sales', label: 'Sales', category: 'Stock' },
      { value: 'predictedStock', label: 'Predicted Stock', category: 'Stock' },
      { value: 'costOfSales', label: 'Cost of Sales', category: 'Stock' },
      { value: 'profit', label: 'Profit', category: 'Stock' },
      { value: 'parLevels', label: 'Par Levels', category: 'Stock' },
      { value: 'stockTurnover', label: 'Stock Turnover', category: 'Stock' },
      { value: 'topItems', label: 'Top Items', category: 'Stock' },
      { value: 'totalItems', label: 'Total Items', category: 'Stock' },
      { value: 'profitMargin', label: 'Profit Margin', category: 'Stock' },
      { value: 'lowStockItems', label: 'Low Stock Items', category: 'Stock' },
      { value: 'inventoryValue', label: 'Inventory Value', category: 'Stock' },
      { value: 'stockReorder', label: 'Stock Reorder', category: 'Stock' },
      { value: 'stockProfit', label: 'Stock Profit', category: 'Stock' },
      { value: 'categories', label: 'Categories', category: 'Stock' },
      { value: 'suppliers', label: 'Suppliers', category: 'Stock' },
      { value: 'locations', label: 'Locations', category: 'Stock' },
      { value: 'stockAccuracy', label: 'Stock Accuracy', category: 'Stock' },
      { value: 'expiredItems', label: 'Expired Items', category: 'Stock' },
      { value: 'stockByCategory', label: 'Stock by Category', category: 'Stock' },
      { value: 'stockBySupplier', label: 'Stock by Supplier', category: 'Stock' },
      { value: 'stockByLocation', label: 'Stock by Location', category: 'Stock' },
      { value: 'stockTrends', label: 'Stock Trends', category: 'Stock' },
      { value: 'purchaseHistory', label: 'Purchase History', category: 'Stock' },
      { value: 'salesHistory', label: 'Sales History', category: 'Stock' },
      { value: 'stockCountsHistory', label: 'Stock Counts History', category: 'Stock' },
      { value: 'parLevelStatus', label: 'Par Level Status', category: 'Stock' },
      { value: 'profitAnalysis', label: 'Profit Analysis', category: 'Stock' },

      // HR Analytics
      { value: 'attendance', label: 'Attendance', category: 'HR' },
      { value: 'performance', label: 'Performance', category: 'HR' },
      { value: 'turnover', label: 'Turnover', category: 'HR' },
      { value: 'recruitment', label: 'Recruitment', category: 'HR' },
      { value: 'training', label: 'Training', category: 'HR' },
      { value: 'payroll', label: 'Payroll', category: 'HR' },
      { value: 'departments', label: 'Departments', category: 'HR' },
      { value: 'employeesByDepartment', label: 'Employees by Department', category: 'HR' },
      { value: 'attendanceTrends', label: 'Attendance Trends', category: 'HR' },
      { value: 'performanceMetrics', label: 'Performance Metrics', category: 'HR' },
      { value: 'trainingProgress', label: 'Training Progress', category: 'HR' },
      { value: 'payrollBreakdown', label: 'Payroll Breakdown', category: 'HR' },
      { value: 'timeOffRequests', label: 'Time Off Requests', category: 'HR' },
      { value: 'recruitmentFunnel', label: 'Recruitment Funnel', category: 'HR' },
      { value: 'turnoverAnalysis', label: 'Turnover Analysis', category: 'HR' },

      // Finance Analytics
      { value: 'cashBalance', label: 'Cash Balance', category: 'Finance' },
      { value: 'revenue', label: 'Revenue', category: 'Finance' },
      { value: 'expenses', label: 'Expenses', category: 'Finance' },
      { value: 'cashFlow', label: 'Cash Flow', category: 'Finance' },
      { value: 'revenueBySource', label: 'Revenue by Source', category: 'Finance' },
      { value: 'expensesByCategory', label: 'Expenses by Category', category: 'Finance' },
      { value: 'profitLossTrends', label: 'Profit/Loss Trends', category: 'Finance' },
      { value: 'budgetVsActual', label: 'Budget vs Actual', category: 'Finance' },
      { value: 'invoiceAnalysis', label: 'Invoice Analysis', category: 'Finance' },
      { value: 'paymentTrends', label: 'Payment Trends', category: 'Finance' },
      { value: 'financialRatios', label: 'Financial Ratios', category: 'Finance' },
      { value: 'taxAnalysis', label: 'Tax Analysis', category: 'Finance' },
      { value: 'accountsReceivable', label: 'Accounts Receivable', category: 'Finance' },
      { value: 'accountsPayable', label: 'Accounts Payable', category: 'Finance' },

      // POS Analytics
      { value: 'posSales', label: 'POS Sales', category: 'POS' },
      { value: 'posTransactions', label: 'POS Transactions', category: 'POS' },
      { value: 'totalTransactions', label: 'Total Transactions', category: 'POS' },
      { value: 'dailySales', label: 'Daily Sales', category: 'POS' },
      { value: 'hourlySales', label: 'Hourly Sales', category: 'POS' },
      { value: 'salesByDay', label: 'Sales by Day', category: 'POS' },
      { value: 'salesByHour', label: 'Sales by Hour', category: 'POS' },
      { value: 'salesByWeekday', label: 'Sales by Weekday', category: 'POS' },
      { value: 'paymentMethods', label: 'Payment Methods', category: 'POS' },
      { value: 'paymentMethodBreakdown', label: 'Payment Method Breakdown', category: 'POS' },
      { value: 'topSellingItems', label: 'Top Selling Items', category: 'POS' },
      { value: 'customerAnalytics', label: 'Customer Analytics', category: 'POS' },
      { value: 'discountAnalysis', label: 'Discount Analysis', category: 'POS' },
      { value: 'refundAnalysis', label: 'Refund Analysis', category: 'POS' },
      { value: 'peakTimes', label: 'Peak Times', category: 'POS' },
      { value: 'tableUtilization', label: 'Table Utilization', category: 'POS' },

      // Bookings Analytics
      { value: 'totalBookings', label: 'Total Bookings', category: 'Bookings' },
      { value: 'bookingsByDay', label: 'Bookings by Day', category: 'Bookings' },
      { value: 'bookingsByHour', label: 'Bookings by Hour', category: 'Bookings' },
      { value: 'bookingsBySource', label: 'Bookings by Source', category: 'Bookings' },
      { value: 'bookingsByPartySize', label: 'Bookings by Party Size', category: 'Bookings' },
      { value: 'customerSegments', label: 'Customer Segments', category: 'Bookings' },
      { value: 'seasonalTrends', label: 'Seasonal Trends', category: 'Bookings' },
      { value: 'cancellationAnalysis', label: 'Cancellation Analysis', category: 'Bookings' },
      { value: 'waitlistAnalytics', label: 'Waitlist Analytics', category: 'Bookings' },
      { value: 'occupancyRate', label: 'Occupancy Rate', category: 'Bookings' },
      { value: 'bookingsByStatus', label: 'Bookings by Status', category: 'Bookings' },
      { value: 'bookingsByType', label: 'Bookings by Type', category: 'Bookings' },
      { value: 'tableOccupancy', label: 'Table Occupancy', category: 'Bookings' },
      { value: 'bookingTrends', label: 'Booking Trends', category: 'Bookings' },

      // Company Analytics
      { value: 'totalSites', label: 'Total Sites', category: 'Company' },
      { value: 'checklistStats', label: 'Checklist Stats', category: 'Company' },
      { value: 'sitePerformance', label: 'Site Performance', category: 'Company' },
      { value: 'notificationsBreakdown', label: 'Notifications Breakdown', category: 'Company' },
      { value: 'companyMetrics', label: 'Company Metrics', category: 'Company' },

      // Messenger Analytics
      { value: 'messengerChats', label: 'Messenger Chats', category: 'Messenger' },
      { value: 'messengerActivity', label: 'Messenger Activity', category: 'Messenger' },
      { value: 'responseTimes', label: 'Response Times', category: 'Messenger' },
      { value: 'messageVolume', label: 'Message Volume', category: 'Messenger' },

      // Cross-module Analytics
      { value: 'businessOverview', label: 'Business Overview', category: 'Cross-module' },
      { value: 'performanceDashboard', label: 'Performance Dashboard', category: 'Cross-module' },
      { value: 'operationalMetrics', label: 'Operational Metrics', category: 'Cross-module' },
      { value: 'financialHealth', label: 'Financial Health', category: 'Cross-module' },
    ];

    if (section) {
      return allDataTypes.filter(dt => dt.category.toLowerCase() === section.toLowerCase());
    }
    
    return allDataTypes;
  }, []);

  const value = {
    loading,
    error,
    analyzeHR,
    analyzeStock,
    analyzeBookings,
    analyzeFinance,
    analyzePOS,
    analyzeCompany,
    // New comprehensive analytics functions
    getStockAnalytics,
    getHRAnalytics,
    getBookingsAnalytics,
    getFinanceAnalytics,
    getPOSAnalytics,
    // KPI functions
    getStockKPIs,
    getHRKPIs,
    getFinanceKPIs,
    getBookingsKPIs,
    getPOSKPIs,
    // Chart data functions
    getStockChartData,
    getHRChartData,
    getBookingsChartData,
    getFinanceChartData,
    getPOSChartData,
    // Enhanced widget functions
    getFinanceWidgets,
    getBookingsWidgets,
    getPOSWidgets,
    getHRWidgets,
    getStockWidgets,
    getCompanyWidgets,
    // Universal data access
    getWidgetData,
    // Dashboard management
    saveDashboardLayout,
    loadDashboardLayout,
    getDefaultDashboardLayout,
    getAvailableWidgetTypes,
    getAvailableDataTypes,
    // Real-time subscriptions
    subscribeToWidgetData,
    unsubscribeFromWidgetData,
    // AI reporting
    generateReport,
    getComprehensiveDataSnapshot,
    analyzeCrossModuleCorrelations,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

// Export types for frontend consumption
export type { 
  DateRange,
  FilterOptions,
  GroupByOptions,
  AnalyticsResult,
  KPIMetrics,
  ChartData
} from "../functions/Analytics"
