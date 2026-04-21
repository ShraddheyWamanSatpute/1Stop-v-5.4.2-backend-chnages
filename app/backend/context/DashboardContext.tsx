import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useCompany } from './CompanyContext';
import { useSettings } from './SettingsContext';
import { useAnalytics } from './AnalyticsContext';
import { createNotification } from "../functions/Notifications"
import { getCurrentEmployeeId } from "../utils/notificationAudit"
// import { useStock } from './StockContext'; // TODO: Use when implementing functions
// import { useHR } from './HRContext'; // TODO: Use when implementing functions
// import { useBookings } from './BookingsContext'; // TODO: Use when implementing functions
// import { useFinance } from './FinanceContext'; // TODO: Use when implementing functions
// import { usePOS } from './POSContext'; // TODO: Use when implementing functions
import {
  DashboardCard,
  DashboardLayout,
  DashboardSettings,
  // ChartConfig,
  // TableConfig,
  // KPIConfig,
  // TextConfig,
  // CustomWidgetConfig,
  ReportTemplate,
  ReportGeneration,
  DashboardCardType,
  // DashboardFilter,
  DashboardFilterState,
  DEFAULT_DASHBOARD_SETTINGS,
  // CARD_SIZE_CONFIG,
  // CHART_COLORS,
  // MODULE_COLORS
} from '../interfaces/Dashboard';
import { FilterOptions, GroupByOptions } from '../functions/Analytics';

// ========== DASHBOARD CONTEXT TYPES ==========

interface DashboardContextType {
  // State
  loading: boolean;
  error: string | null;
  settings: DashboardSettings;
  activeLayout: DashboardLayout | null;
  filters: DashboardFilterState;
  
  // Layout Management
  createLayout: (layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DashboardLayout>;
  updateLayout: (layoutId: string, updates: Partial<DashboardLayout>) => Promise<void>;
  deleteLayout: (layoutId: string) => Promise<void>;
  setActiveLayout: (layoutId: string) => Promise<void>;
  duplicateLayout: (layoutId: string, newName: string) => Promise<DashboardLayout>;
  
  // Card Management
  addCard: (card: Omit<DashboardCard, 'id' | 'lastUpdated'>) => Promise<DashboardCard>;
  updateCard: (cardId: string, updates: Partial<DashboardCard>) => Promise<void>;
  removeCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, newPosition: { x: number; y: number }) => Promise<void>;
  resizeCard: (cardId: string, newSize: { w: number; h: number }) => Promise<void>;
  duplicateCard: (cardId: string) => Promise<DashboardCard>;
  
  // Data Management
  refreshCardData: (cardId: string) => Promise<void>;
  refreshAllCards: () => Promise<void>;
  getCardData: (card: DashboardCard) => Promise<any>;
  
  // Filter Management
  setFilter: (filterId: string, value: any) => Promise<void>;
  clearFilters: () => Promise<void>;
  applyFilters: () => Promise<void>;
  
  // Report Management
  generateReport: (templateId: string, filters?: FilterOptions, groupBy?: GroupByOptions) => Promise<ReportGeneration>;
  getReportTemplates: (module?: string) => Promise<ReportTemplate[]>;
  createReportTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ReportTemplate>;
  updateReportTemplate: (templateId: string, updates: Partial<ReportTemplate>) => Promise<void>;
  deleteReportTemplate: (templateId: string) => Promise<void>;
  
  // Settings Management
  updateSettings: (updates: Partial<DashboardSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  
  // Utility Functions
  getAvailableCardTypes: (module?: string) => DashboardCardType[];
  getDefaultLayout: (module: string) => DashboardLayout;
  exportLayout: (layoutId: string) => Promise<string>;
  importLayout: (layoutData: string) => Promise<DashboardLayout>;
}

// ========== DASHBOARD CARD TYPES ==========

const DASHBOARD_CARD_TYPES: DashboardCardType[] = [
  // Stock Cards
  {
    id: 'stock-kpi',
    name: 'Stock KPIs',
    description: 'Key performance indicators for stock management',
    icon: '📊',
    category: 'kpi',
    module: 'stock',
    configSchema: {},
    defaultConfig: {},
    component: 'StockKPICard'
  },
  {
    id: 'stock-chart',
    name: 'Stock Chart',
    description: 'Visual representation of stock data',
    icon: '📈',
    category: 'visualization',
    module: 'stock',
    configSchema: {},
    defaultConfig: {},
    component: 'StockChartCard'
  },
  {
    id: 'stock-table',
    name: 'Stock Table',
    description: 'Tabular view of stock data',
    icon: '📋',
    category: 'visualization',
    module: 'stock',
    configSchema: {},
    defaultConfig: {},
    component: 'StockTableCard'
  },
  
  // HR Cards
  {
    id: 'hr-kpi',
    name: 'HR KPIs',
    description: 'Key performance indicators for human resources',
    icon: '👥',
    category: 'kpi',
    module: 'hr',
    configSchema: {},
    defaultConfig: {},
    component: 'HRKPICard'
  },
  {
    id: 'hr-chart',
    name: 'HR Chart',
    description: 'Visual representation of HR data',
    icon: '📊',
    category: 'visualization',
    module: 'hr',
    configSchema: {},
    defaultConfig: {},
    component: 'HRChartCard'
  },
  {
    id: 'hr-table',
    name: 'HR Table',
    description: 'Tabular view of HR data',
    icon: '📋',
    category: 'visualization',
    module: 'hr',
    configSchema: {},
    defaultConfig: {},
    component: 'HRTableCard'
  },
  
  // Bookings Cards
  {
    id: 'bookings-kpi',
    name: 'Bookings KPIs',
    description: 'Key performance indicators for bookings',
    icon: '📅',
    category: 'kpi',
    module: 'bookings',
    configSchema: {},
    defaultConfig: {},
    component: 'BookingsKPICard'
  },
  {
    id: 'bookings-chart',
    name: 'Bookings Chart',
    description: 'Visual representation of bookings data',
    icon: '📈',
    category: 'visualization',
    module: 'bookings',
    configSchema: {},
    defaultConfig: {},
    component: 'BookingsChartCard'
  },
  {
    id: 'bookings-table',
    name: 'Bookings Table',
    description: 'Tabular view of bookings data',
    icon: '📋',
    category: 'visualization',
    module: 'bookings',
    configSchema: {},
    defaultConfig: {},
    component: 'BookingsTableCard'
  },
  
  // Finance Cards
  {
    id: 'finance-kpi',
    name: 'Finance KPIs',
    description: 'Key performance indicators for finance',
    icon: '💰',
    category: 'kpi',
    module: 'finance',
    configSchema: {},
    defaultConfig: {},
    component: 'FinanceKPICard'
  },
  {
    id: 'finance-chart',
    name: 'Finance Chart',
    description: 'Visual representation of finance data',
    icon: '📊',
    category: 'visualization',
    module: 'finance',
    configSchema: {},
    defaultConfig: {},
    component: 'FinanceChartCard'
  },
  {
    id: 'finance-table',
    name: 'Finance Table',
    description: 'Tabular view of finance data',
    icon: '📋',
    category: 'visualization',
    module: 'finance',
    configSchema: {},
    defaultConfig: {},
    component: 'FinanceTableCard'
  },
  
  // POS Cards
  {
    id: 'pos-kpi',
    name: 'POS KPIs',
    description: 'Key performance indicators for point of sale',
    icon: '🛒',
    category: 'kpi',
    module: 'pos',
    configSchema: {},
    defaultConfig: {},
    component: 'POSKPICard'
  },
  {
    id: 'pos-chart',
    name: 'POS Chart',
    description: 'Visual representation of POS data',
    icon: '📈',
    category: 'visualization',
    module: 'pos',
    configSchema: {},
    defaultConfig: {},
    component: 'POSChartCard'
  },
  {
    id: 'pos-table',
    name: 'POS Table',
    description: 'Tabular view of POS data',
    icon: '📋',
    category: 'visualization',
    module: 'pos',
    configSchema: {},
    defaultConfig: {},
    component: 'POSTableCard'
  },
  
  // Global Cards
  {
    id: 'global-summary',
    name: 'Global Summary',
    description: 'Overview of all business modules',
    icon: '🌐',
    category: 'analytics',
    module: 'global',
    configSchema: {},
    defaultConfig: {},
    component: 'GlobalSummaryCard'
  },
  {
    id: 'global-chart',
    name: 'Global Chart',
    description: 'Cross-module data visualization',
    icon: '📊',
    category: 'visualization',
    module: 'global',
    configSchema: {},
    defaultConfig: {},
    component: 'GlobalChartCard'
  }
];

const DEFAULT_REPORT_TEMPLATES: ReportTemplate[] = [
  "global",
  "stock",
  "hr",
  "bookings",
  "finance",
  "pos",
].map((module) => ({
  id: `default-${module}-summary`,
  name: `${module === "global" ? "Global" : module.toUpperCase()} Summary`,
  description: `Standard ${module} dashboard summary report`,
  module: module as ReportTemplate["module"],
  type: "standard",
  isDefault: true,
  config: {
    title: `${module === "global" ? "Global" : module.toUpperCase()} Summary Report`,
    sections: [],
    filters: {},
    format: "html",
  },
  createdAt: 0,
  updatedAt: 0,
  createdBy: "system",
}));

const mergeReportTemplates = (customTemplates: ReportTemplate[] = [], module?: string): ReportTemplate[] => {
  const templateMap = new Map<string, ReportTemplate>();
  [...DEFAULT_REPORT_TEMPLATES, ...customTemplates].forEach((template) => {
    if (!module || template.module === module) {
      templateMap.set(template.id, template);
    }
  });

  return Array.from(templateMap.values()).sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
};

const buildCsvRows = (data: any[]): string => {
  if (!data.length) return "";

  const headers = Array.from(
    data.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  return [
    headers.map(escape).join(","),
    ...data.map((row) => headers.map((header) => escape((row || {})[header])).join(",")),
  ].join("\n");
};

// ========== DASHBOARD CONTEXT ==========

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

const DASHBOARD_SETTINGS_CACHE_PREFIX = "dashboardSettingsCache:";

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toDashboardSettingsCacheKey(uid: string, companyId: string) {
  return `${DASHBOARD_SETTINGS_CACHE_PREFIX}${uid}:${companyId}`;
}

function normalizeDashboardSettings(raw: Partial<DashboardSettings>): DashboardSettings {
  const toFiniteNumber = (value: unknown, fallback: number) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const normalizeCardPosition = (card: any, idx: number) => {
    const pos = (card && typeof card === "object" ? card.position : null) || {};
    const w = clamp(Math.floor(toFiniteNumber(pos.w, 4)), 2, 12);
    const h = clamp(Math.floor(toFiniteNumber(pos.h, 3)), 2, 1000);

    // Default placement pattern for missing x/y: 3 columns of width 4 within a 12-col grid.
    const defaultX = (idx % 3) * 4;
    const defaultY = Math.floor(idx / 3) * 3;

    const xRaw = toFiniteNumber(pos.x, defaultX);
    const yRaw = toFiniteNumber(pos.y, defaultY);

    // Clamp within grid so cards don't all collapse at (0,0) or go off-canvas.
    const x = clamp(Math.floor(xRaw), 0, Math.max(0, 12 - w));
    const y = clamp(Math.floor(yRaw), 0, 100000);

    return { x, y, w, h };
  };

  const normalizedLayouts: DashboardLayout[] = Array.isArray(raw.layouts)
    ? (raw.layouts as any[])
        .filter((l: any) => l && typeof l === "object" && typeof l.id === "string")
        .map((layout: any) => {
          const cards = Array.isArray(layout.cards) ? layout.cards : [];
          const visibleCards = cards.filter((c: any) => c && typeof c === "object");
          const normalizedCards = visibleCards.map((card: any, idx: number) => ({
            ...card,
            position: normalizeCardPosition(card, idx),
            visible: typeof card.visible === "boolean" ? card.visible : true,
            order: typeof card.order === "number" ? card.order : idx,
          }));

          return {
            ...layout,
            cards: normalizedCards,
          } as DashboardLayout;
        })
    : [];

  return {
    ...DEFAULT_DASHBOARD_SETTINGS,
    ...raw,
    layouts: normalizedLayouts,
    reportTemplates: Array.isArray((raw as any).reportTemplates) ? ((raw as any).reportTemplates as ReportTemplate[]) : [],
    reportGenerations: Array.isArray((raw as any).reportGenerations) ? ((raw as any).reportGenerations as ReportGeneration[]) : [],
    // Keep a stable userId value
    userId: (raw.userId as any) || DEFAULT_DASHBOARD_SETTINGS.userId,
  };
}

function pickActiveLayout(settings: DashboardSettings): { settings: DashboardSettings; activeLayout: DashboardLayout | null } {
  const explicit = settings.activeLayout
    ? settings.layouts.find(l => l.id === settings.activeLayout) || null
    : null;
  if (explicit) return { settings, activeLayout: explicit };
  const first = settings.layouts[0] || null;
  if (!first) return { settings, activeLayout: null };
  // Ensure activeLayout id is valid so consumers don't see "no layout" despite layouts existing.
  return {
    settings: { ...settings, activeLayout: first.id },
    activeLayout: first,
  };
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: companyState } = useCompany();
  const settingsCtx = useSettings();
  const settingsState = settingsCtx.state;
  
  // Call useAnalytics unconditionally at top level (React hooks rule)
  // The hook itself handles the case when provider is not available
  const analytics = useAnalytics();
  // const stock = useStock(); // TODO: Use when implementing functions
  // const hr = useHR(); // TODO: Use when implementing functions
  // const bookings = useBookings(); // TODO: Use when implementing functions
  // const finance = useFinance(); // TODO: Use when implementing functions
  // const pos = usePOS(); // TODO: Use when implementing functions

  const getCacheIdentity = useCallback(() => {
    const uid =
      (settingsState as any)?.auth?.uid ||
      (settingsState as any)?.user?.uid ||
      null;

    const companyId =
      (companyState as any)?.companyID ||
      (settingsState as any)?.user?.currentCompanyID ||
      (typeof window !== "undefined"
        ? localStorage.getItem("selectedCompanyID") ||
          localStorage.getItem("companyID") ||
          localStorage.getItem("companyId")
        : null) ||
      null;

    return { uid: typeof uid === "string" ? uid : null, companyId: typeof companyId === "string" ? companyId : null };
  }, [settingsState, companyState]);

  const readCachedDashboardSettings = useCallback((): Partial<DashboardSettings> | null => {
    if (typeof window === "undefined") return null;

    const { uid, companyId } = getCacheIdentity();
    // Preferred: per-user, per-company key.
    if (uid && companyId) {
      const cached = safeJsonParse<Partial<DashboardSettings>>(localStorage.getItem(toDashboardSettingsCacheKey(uid, companyId)));
      if (cached) return cached;
    }
    // Fallback: last-known (prevents flashing defaults if identity isn't ready yet).
    return safeJsonParse<Partial<DashboardSettings>>(localStorage.getItem(`${DASHBOARD_SETTINGS_CACHE_PREFIX}last`));
  }, [getCacheIdentity]);

  const persistDashboardSettings = useCallback((next: DashboardSettings) => {
    if (typeof window === "undefined") return;
    try {
      const { uid, companyId } = getCacheIdentity();
      if (uid && companyId) {
        localStorage.setItem(toDashboardSettingsCacheKey(uid, companyId), JSON.stringify(next));
      }
      localStorage.setItem(`${DASHBOARD_SETTINGS_CACHE_PREFIX}last`, JSON.stringify(next));
    } catch {
      // non-blocking
    }
  }, [getCacheIdentity]);

  // Debounced DB save (prevents spamming on drag/resize).
  const dbSaveTimerRef = useRef<number | null>(null);
  const pendingDbSaveRef = useRef<DashboardSettings | null>(null);
  const queueDashboardSettingsDbSave = useCallback((next: DashboardSettings) => {
    if (typeof window === "undefined") return;
    if (!settingsCtx.state?.auth?.uid) return;

    pendingDbSaveRef.current = next;
    if (dbSaveTimerRef.current) {
      window.clearTimeout(dbSaveTimerRef.current);
    }
    dbSaveTimerRef.current = window.setTimeout(() => {
      const payload = pendingDbSaveRef.current;
      pendingDbSaveRef.current = null;
      dbSaveTimerRef.current = null;
      if (!payload) return;
      // Best-effort; ignore errors.
      settingsCtx
        .updatePreferences({ dashboardSettings: payload } as any)
        .catch(() => {});
    }, 800);
  }, [settingsCtx]);

  // Cache-first bootstrap so dashboards don't flash default layouts.
  const bootstrapRef = useRef<{ settings: DashboardSettings; activeLayout: DashboardLayout | null } | null>(null);
  if (!bootstrapRef.current) {
    const cachedRaw = readCachedDashboardSettings();
    const normalized = cachedRaw ? normalizeDashboardSettings(cachedRaw) : DEFAULT_DASHBOARD_SETTINGS;
    const picked = pickActiveLayout(normalized);
    bootstrapRef.current = { settings: picked.settings, activeLayout: picked.activeLayout };
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DashboardSettings>(() => bootstrapRef.current!.settings);
  const [activeLayout, setActiveLayout] = useState<DashboardLayout | null>(() => bootstrapRef.current!.activeLayout);
  const [filters, setFilters] = useState<DashboardFilterState>({});

  const notifyDashboardCrud = useCallback(
    async (params: {
      action: "created" | "updated" | "deleted"
      entityType: "layout" | "card"
      entityId: string
      entityName?: string
      oldValue?: any
      newValue?: any
    }) => {
      try {
        const companyId = (companyState as any)?.companyID
        const uid = (settingsState as any)?.auth?.uid
        if (!companyId || !uid) return

        await createNotification(
          companyId,
          uid,
          "system",
          params.action,
          `Dashboard ${params.entityType === "layout" ? "Layout" : "Card"} ${params.action}`,
          `${params.entityType} "${params.entityName || params.entityId}" was ${params.action}`,
          {
            siteId: (companyState as any).selectedSiteID || undefined,
            subsiteId: (companyState as any).selectedSubsiteID || undefined,
            priority: "low",
            category: params.action === "deleted" ? "warning" : params.action === "created" ? "success" : "info",
            details: {
              entityId: params.entityId,
              entityName: params.entityName || params.entityId,
              oldValue: params.action === "created" ? null : (params.oldValue ?? null),
              newValue: params.action === "deleted" ? null : (params.newValue ?? null),
              changes: {
                [params.entityType]: {
                  from: params.action === "created" ? null : params.oldValue,
                  to: params.action === "deleted" ? null : params.newValue,
                },
              },
            },
            metadata: {
              section: params.entityType === "layout" ? "Dashboard/Layouts" : "Dashboard/Cards",
              companyId,
              siteId: (companyState as any).selectedSiteID || undefined,
              subsiteId: (companyState as any).selectedSubsiteID || undefined,
              uid,
              employeeId: getCurrentEmployeeId(companyState as any, settingsState as any),
              entityType: params.entityType,
              entityId: params.entityId,
            },
          },
        )
      } catch {
        // non-blocking
      }
    },
    [companyState, settingsState],
  )

  // ========== LAYOUT MANAGEMENT ==========

  const createLayout = useCallback(async (layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>): Promise<DashboardLayout> => {
    try {
      setLoading(true);
      setError(null);

      const newLayout: DashboardLayout = {
        ...layout,
        id: `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const nextActiveLayoutId = settings.activeLayout || newLayout.id
      const updatedSettings = {
        ...settings,
        layouts: [...settings.layouts, newLayout],
        activeLayout: nextActiveLayoutId,
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);

      // If there isn't an active layout yet, make the first created layout active.
      if (!activeLayout) {
        setActiveLayout(newLayout)
      }
      

      // Notification (audit)
      notifyDashboardCrud({
        action: "created",
        entityType: "layout",
        entityId: newLayout.id,
        entityName: newLayout.name,
        oldValue: null,
        newValue: newLayout,
      })

      return newLayout;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating layout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [settings, activeLayout, persistDashboardSettings, queueDashboardSettingsDbSave, settingsState, notifyDashboardCrud]);

  const updateLayout = useCallback(async (layoutId: string, updates: Partial<DashboardLayout>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const originalLayout = settings.layouts.find(l => l.id === layoutId) || null
      const updatedLayouts = settings.layouts.map(layout =>
        layout.id === layoutId
          ? { ...layout, ...updates, updatedAt: Date.now() }
          : layout
      );
      const updatedLayout = updatedLayouts.find(l => l.id === layoutId) || null

      const updatedSettings = {
        ...settings,
        layouts: updatedLayouts,
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);
      

      if (activeLayout?.id === layoutId) {
        setActiveLayout({ ...activeLayout, ...updates, updatedAt: Date.now() });
      }

      // Notification (audit)
      notifyDashboardCrud({
        action: "updated",
        entityType: "layout",
        entityId: layoutId,
        entityName: (updatedLayout as any)?.name || (originalLayout as any)?.name,
        oldValue: originalLayout,
        newValue: updatedLayout,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating layout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [settings, activeLayout, persistDashboardSettings, queueDashboardSettingsDbSave, settingsState, notifyDashboardCrud]);

  const deleteLayout = useCallback(async (layoutId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const layoutToDelete = settings.layouts.find(l => l.id === layoutId) || null
      const updatedLayouts = settings.layouts.filter(layout => layout.id !== layoutId);
      
      const updatedSettings = {
        ...settings,
        layouts: updatedLayouts,
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);
      

      if (activeLayout?.id === layoutId) {
        setActiveLayout(null);
      }

      // Notification (audit)
      notifyDashboardCrud({
        action: "deleted",
        entityType: "layout",
        entityId: layoutId,
        entityName: (layoutToDelete as any)?.name,
        oldValue: layoutToDelete,
        newValue: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting layout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [settings, activeLayout, persistDashboardSettings, queueDashboardSettingsDbSave, settingsState, notifyDashboardCrud]);

  const setActiveLayoutById = useCallback(async (layoutId: string): Promise<void> => {
    try {
      const layout = settings.layouts.find(l => l.id === layoutId);
      if (layout) {
        setActiveLayout(layout);
        
        const updatedSettings = {
          ...settings,
          activeLayout: layoutId,
          lastUpdated: Date.now(),
        };

        setSettings(updatedSettings);
        persistDashboardSettings(updatedSettings);
        queueDashboardSettingsDbSave(updatedSettings);
        
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting active layout');
      throw err;
    }
  }, [settings, persistDashboardSettings, queueDashboardSettingsDbSave, settingsState]);

  const duplicateLayout = useCallback(async (layoutId: string, newName: string): Promise<DashboardLayout> => {
    try {
      const originalLayout = settings.layouts.find(l => l.id === layoutId);
      if (!originalLayout) {
        throw new Error('Layout not found');
      }

      const duplicatedLayout: DashboardLayout = {
        ...originalLayout,
        id: `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newName,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cards: originalLayout.cards.map(card => ({
          ...card,
          id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })),
      };

      const updatedSettings = {
        ...settings,
        layouts: [...settings.layouts, duplicatedLayout],
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);
      

      return duplicatedLayout;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error duplicating layout');
      throw err;
    }
  }, [settings, persistDashboardSettings, queueDashboardSettingsDbSave, settingsState]);

  // ========== CARD MANAGEMENT ==========

  const addCard = useCallback(async (card: Omit<DashboardCard, 'id' | 'lastUpdated'>): Promise<DashboardCard> => {
    try {
      setLoading(true);
      setError(null);

      const newCard: DashboardCard = {
        ...card,
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lastUpdated: Date.now(),
      };

      if (activeLayout) {
        const updatedLayout = {
          ...activeLayout,
          cards: [...activeLayout.cards, newCard],
          updatedAt: Date.now(),
        };

        await updateLayout(activeLayout.id, updatedLayout);
      }

      // Notification (audit)
      notifyDashboardCrud({
        action: "created",
        entityType: "card",
        entityId: newCard.id,
        entityName: newCard.title,
        oldValue: null,
        newValue: newCard,
      })

      return newCard;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding card');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeLayout, updateLayout, notifyDashboardCrud]);

  const updateCard = useCallback(async (cardId: string, updates: Partial<DashboardCard>): Promise<void> => {
    try {
      if (!activeLayout) return;

      const originalCard = activeLayout.cards.find(c => c.id === cardId) || null
      const updatedCards = activeLayout.cards.map(card =>
        card.id === cardId
          ? { ...card, ...updates, lastUpdated: Date.now() }
          : card
      );

      await updateLayout(activeLayout.id, { cards: updatedCards });

      const nextCard = updatedCards.find(c => c.id === cardId) || null
      notifyDashboardCrud({
        action: "updated",
        entityType: "card",
        entityId: cardId,
        entityName: (nextCard as any)?.title || (originalCard as any)?.title,
        oldValue: originalCard,
        newValue: nextCard,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating card');
      throw err;
    }
  }, [activeLayout, updateLayout, notifyDashboardCrud]);

  const removeCard = useCallback(async (cardId: string): Promise<void> => {
    try {
      if (!activeLayout) return;

      const cardToDelete = activeLayout.cards.find(c => c.id === cardId) || null
      const updatedCards = activeLayout.cards.filter(card => card.id !== cardId);
      await updateLayout(activeLayout.id, { cards: updatedCards });

      notifyDashboardCrud({
        action: "deleted",
        entityType: "card",
        entityId: cardId,
        entityName: (cardToDelete as any)?.title,
        oldValue: cardToDelete,
        newValue: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing card');
      throw err;
    }
  }, [activeLayout, updateLayout, notifyDashboardCrud]);

  const moveCard = useCallback(async (cardId: string, newPosition: { x: number; y: number }): Promise<void> => {
    try {
      const currentCard = activeLayout?.cards.find(c => c.id === cardId);
      if (currentCard?.position) {
        await updateCard(cardId, { position: { ...currentCard.position, ...newPosition } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error moving card');
      throw err;
    }
  }, [updateCard, activeLayout]);

  const resizeCard = useCallback(async (cardId: string, newSize: { w: number; h: number }): Promise<void> => {
    try {
      const currentCard = activeLayout?.cards.find(c => c.id === cardId);
      if (currentCard?.position) {
        await updateCard(cardId, { position: { ...currentCard.position, ...newSize } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resizing card');
      throw err;
    }
  }, [updateCard, activeLayout]);

  const duplicateCard = useCallback(async (cardId: string): Promise<DashboardCard> => {
    try {
      const originalCard = activeLayout?.cards.find(c => c.id === cardId);
      if (!originalCard) {
        throw new Error('Card not found');
      }

      const duplicatedCard: DashboardCard = {
        ...originalCard,
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${originalCard.title} (Copy)`,
        lastUpdated: Date.now(),
      };

      await addCard(duplicatedCard);
      return duplicatedCard;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error duplicating card');
      throw err;
    }
  }, [activeLayout, addCard]);

  // ========== DATA MANAGEMENT ==========

  const getCardData = useCallback(async (card: DashboardCard): Promise<any> => {
    try {
      const { source, module, config } = card.data;
      
      switch (source) {
        case 'kpi':
          if (!analytics) {
            console.warn('Analytics not available for KPI generation');
            return [];
          }
          
          switch (module) {
            case 'stock':
              return await analytics.getStockKPIs();
            case 'hr':
              return await analytics.getHRKPIs();
            case 'bookings':
              return await analytics.getBookingsKPIs();
            case 'finance':
              return await analytics.getFinanceKPIs();
            case 'pos':
              return await analytics.getPOSKPIs();
            default:
              return [];
          }
          
        case 'chart':
          if (!analytics) {
            console.warn('Analytics not available for chart data generation');
            return { labels: [], datasets: [] };
          }
          
          switch (module) {
            case 'stock':
              return await analytics.getStockChartData(card.groupBy || { field: 'category', type: 'category' }, config.valueField);
            case 'hr':
              return await analytics.getHRChartData(card.groupBy || { field: 'department', type: 'custom' }, config.valueField);
            case 'bookings':
              return await analytics.getBookingsChartData(card.groupBy || { field: 'status', type: 'custom' }, config.valueField);
            case 'finance':
              return await analytics.getFinanceChartData(card.groupBy || { field: 'type', type: 'custom' }, config.valueField);
            case 'pos':
              return await analytics.getPOSChartData(card.groupBy || { field: 'paymentMethod', type: 'custom' }, config.valueField);
            default:
              return { labels: [], datasets: [] };
          }
          
        case 'table':
          if (!analytics) {
            console.warn('Analytics not available for table data generation');
            return { data: [], summary: { total: 0, average: 0, min: 0, max: 0, count: 0 } };
          }
          
          switch (module) {
            case 'stock':
              return await analytics.getStockAnalytics(card.groupBy, card.filters);
            case 'hr':
              return await analytics.getHRAnalytics(card.groupBy, card.filters);
            case 'bookings':
              return await analytics.getBookingsAnalytics(card.groupBy, card.filters);
            case 'finance':
              return await analytics.getFinanceAnalytics(card.groupBy, card.filters);
            case 'pos':
              return await analytics.getPOSAnalytics(card.groupBy, card.filters);
            default:
              return { data: [], summary: { total: 0, average: 0, min: 0, max: 0, count: 0 } };
          }
          
        default:
          return null;
      }
    } catch (err) {
      console.error('Error getting card data:', err);
      return null;
    }
  }, [analytics]);

  const refreshCardData = useCallback(async (cardId: string): Promise<void> => {
    try {
      const card = activeLayout?.cards.find(c => c.id === cardId);
      if (card) {
        // const data = await getCardData(card); // TODO: Use data when implementing refresh
        await updateCard(cardId, { lastUpdated: Date.now() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing card data');
      throw err;
    }
  }, [activeLayout, getCardData, updateCard]);

  const refreshAllCards = useCallback(async (): Promise<void> => {
    try {
      if (!activeLayout) return;

      const refreshPromises = activeLayout.cards.map(card => refreshCardData(card.id));
      await Promise.all(refreshPromises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing all cards');
      throw err;
    }
  }, [activeLayout, refreshCardData]);

  // ========== FILTER MANAGEMENT ==========

  const setFilter = useCallback(async (filterId: string, value: any): Promise<void> => {
    try {
      setFilters(prev => ({ ...prev, [filterId]: value }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting filter');
      throw err;
    }
  }, []);

  const clearFilters = useCallback(async (): Promise<void> => {
    try {
      setFilters({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error clearing filters');
      throw err;
    }
  }, []);

  const applyFilters = useCallback(async (): Promise<void> => {
    try {
      await refreshAllCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error applying filters');
      throw err;
    }
  }, [refreshAllCards]);

  // ========== REPORT MANAGEMENT ==========

  const getReportTemplates = useCallback(async (module?: string): Promise<ReportTemplate[]> => {
    try {
      return mergeReportTemplates(settings.reportTemplates || [], module);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error getting report templates');
      throw err;
    }
  }, [settings.reportTemplates]);

  const generateReport = useCallback(async (templateId: string, filters?: FilterOptions, groupBy?: GroupByOptions): Promise<ReportGeneration> => {
    try {
      setLoading(true);
      setError(null);

      const template = mergeReportTemplates(settings.reportTemplates || []).find((item) => item.id === templateId);
      if (!template) {
        throw new Error('Report template not found');
      }

      if (!analytics) {
        throw new Error('Analytics context is unavailable');
      }

      const effectiveFilters = filters || template.config.filters || {};
      const effectiveGroupBy = groupBy || template.config.groupBy;

      const resolveAnalyticsPayload = async () => {
        switch (template.module) {
          case 'stock':
            return Promise.all([
              analytics.getStockKPIs(),
              analytics.getStockAnalytics(effectiveGroupBy, effectiveFilters),
            ]);
          case 'hr':
            return Promise.all([
              analytics.getHRKPIs(),
              analytics.getHRAnalytics(effectiveGroupBy, effectiveFilters),
            ]);
          case 'bookings':
            return Promise.all([
              analytics.getBookingsKPIs(),
              analytics.getBookingsAnalytics(effectiveGroupBy, effectiveFilters),
            ]);
          case 'finance':
            return Promise.all([
              analytics.getFinanceKPIs(),
              analytics.getFinanceAnalytics(effectiveGroupBy, effectiveFilters),
            ]);
          case 'pos':
            return Promise.all([
              analytics.getPOSKPIs(),
              analytics.getPOSAnalytics(effectiveGroupBy, effectiveFilters),
            ]);
          case 'global':
          default:
            return Promise.all([
              analytics.getStockKPIs(),
              analytics.getStockAnalytics(effectiveGroupBy, effectiveFilters),
            ]);
        }
      };

      const [kpis, analyticsResult] = await resolveAnalyticsPayload();
      const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const format = template.config.format || 'html';
      const filenameBase = `${template.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}`;

      const htmlBody = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${template.config.title || template.name}</title>
  </head>
  <body>
    <h1>${template.config.title || template.name}</h1>
    <p>Module: ${template.module}</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <h2>KPIs</h2>
    <ul>
      ${kpis.map((kpi) => `<li>${kpi.label}: ${kpi.value}</li>`).join("")}
    </ul>
    <h2>Summary</h2>
    <pre>${JSON.stringify(analyticsResult.summary, null, 2)}</pre>
    <h2>Data</h2>
    <pre>${JSON.stringify(analyticsResult.data.slice(0, 250), null, 2)}</pre>
  </body>
</html>`;

      const csvBody = [
        "KPIs",
        buildCsvRows(kpis.map((kpi) => ({
          label: kpi.label,
          value: kpi.value,
          change: kpi.change,
          changeType: kpi.changeType,
          trend: kpi.trend,
          format: kpi.format,
        }))),
        "",
        "Summary",
        buildCsvRows([analyticsResult.summary]),
        "",
        "Data",
        buildCsvRows(analyticsResult.data.slice(0, 500)),
      ].join("\n");

      const blob = new Blob(
        [format === 'csv' ? csvBody : htmlBody],
        { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/html;charset=utf-8;' },
      );
      const fileUrl = typeof window !== 'undefined' ? window.URL.createObjectURL(blob) : undefined;

      const reportGeneration: ReportGeneration = {
        id: reportId,
        templateId,
        status: 'completed',
        progress: 100,
        startedAt: Date.now(),
        completedAt: Date.now(),
        fileUrl,
        generatedBy: companyState.user?.uid || settingsState.auth?.uid || '',
        filters: effectiveFilters,
        groupBy: effectiveGroupBy,
      };

      const updatedSettings = {
        ...settings,
        reportGenerations: [reportGeneration, ...(settings.reportGenerations || [])].slice(0, 50),
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);

      if (fileUrl && typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = `${filenameBase}.${format === 'csv' ? 'csv' : 'html'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return reportGeneration;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [analytics, companyState.user?.uid, persistDashboardSettings, queueDashboardSettingsDbSave, settings, settingsState.auth?.uid]);

  const createReportTemplate = useCallback(async (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> => {
    try {
      const newTemplate: ReportTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updatedSettings = {
        ...settings,
        reportTemplates: [...(settings.reportTemplates || []), newTemplate],
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);

      return newTemplate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating report template');
      throw err;
    }
  }, [persistDashboardSettings, queueDashboardSettingsDbSave, settings]);

  const updateReportTemplate = useCallback(async (templateId: string, updates: Partial<ReportTemplate>): Promise<void> => {
    try {
      const updatedSettings = {
        ...settings,
        reportTemplates: (settings.reportTemplates || []).map((template) =>
          template.id === templateId
            ? { ...template, ...updates, updatedAt: Date.now() }
            : template,
        ),
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating report template');
      throw err;
    }
  }, [persistDashboardSettings, queueDashboardSettingsDbSave, settings]);

  const deleteReportTemplate = useCallback(async (templateId: string): Promise<void> => {
    try {
      const updatedSettings = {
        ...settings,
        reportTemplates: (settings.reportTemplates || []).filter((template) => template.id !== templateId),
        reportGenerations: (settings.reportGenerations || []).filter((generation) => generation.templateId !== templateId),
        lastUpdated: Date.now(),
      };

      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting report template');
      throw err;
    }
  }, [persistDashboardSettings, queueDashboardSettingsDbSave, settings]);

  // ========== SETTINGS MANAGEMENT ==========

  const updateSettings = useCallback(async (updates: Partial<DashboardSettings>): Promise<void> => {
    try {
      const updatedSettings = { ...settings, ...updates, lastUpdated: Date.now() };
      setSettings(updatedSettings);
      persistDashboardSettings(updatedSettings);
      queueDashboardSettingsDbSave(updatedSettings);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating settings');
      throw err;
    }
  }, [settings, persistDashboardSettings, queueDashboardSettingsDbSave, settingsState]);

  const resetToDefaults = useCallback(async (): Promise<void> => {
    try {
      setSettings(DEFAULT_DASHBOARD_SETTINGS);
      setActiveLayout(null);
      setFilters({});
      persistDashboardSettings(DEFAULT_DASHBOARD_SETTINGS);
      queueDashboardSettingsDbSave(DEFAULT_DASHBOARD_SETTINGS);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resetting to defaults');
      throw err;
    }
  }, [persistDashboardSettings, queueDashboardSettingsDbSave, settingsState]);

  // ========== UTILITY FUNCTIONS ==========

  const getAvailableCardTypes = useCallback((module?: string): DashboardCardType[] => {
    if (module) {
      return DASHBOARD_CARD_TYPES.filter(cardType => 
        cardType.module === module || cardType.module === 'global'
      );
    }
    return DASHBOARD_CARD_TYPES;
  }, []);

  const getDefaultLayout = useCallback((module: string): DashboardLayout => {
    const defaultCards: DashboardCard[] = [
      {
        id: `default-kpi-${module}`,
        title: `${module.toUpperCase()} KPIs`,
        type: 'kpi',
        size: 'medium',
        position: { x: 0, y: 0, w: 4, h: 3 },
        data: { source: 'kpi', module: module as any, config: {} },
        filters: {},
        visible: true,
        order: 0,
        lastUpdated: Date.now(),
      },
      {
        id: `default-chart-${module}`,
        title: `${module.toUpperCase()} Chart`,
        type: 'chart',
        size: 'large',
        position: { x: 4, y: 0, w: 6, h: 4 },
        data: { source: 'chart', module: module as any, config: {} },
        filters: {},
        visible: true,
        order: 1,
        lastUpdated: Date.now(),
      },
      {
        id: `default-table-${module}`,
        title: `${module.toUpperCase()} Table`,
        type: 'table',
        size: 'xlarge',
        position: { x: 0, y: 4, w: 8, h: 6 },
        data: { source: 'table', module: module as any, config: {} },
        filters: {},
        visible: true,
        order: 2,
        lastUpdated: Date.now(),
      },
    ];

    return {
      id: `default-${module}`,
      name: `Default ${module.toUpperCase()} Layout`,
      description: `Default layout for ${module} dashboard`,
      isDefault: true,
      isGlobal: false,
      module: module as any,
      cards: defaultCards,
      gridSize: { columns: 12, rows: 10 },
      breakpoints: { xs: 12, sm: 6, md: 4, lg: 3, xl: 2 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: companyState.user?.uid || '',
    };
  }, [companyState.user?.uid]);

  const exportLayout = useCallback(async (layoutId: string): Promise<string> => {
    try {
      const layout = settings.layouts.find(l => l.id === layoutId);
      if (!layout) {
        throw new Error('Layout not found');
      }
      return JSON.stringify(layout, null, 2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exporting layout');
      throw err;
    }
  }, [settings]);

  const importLayout = useCallback(async (layoutData: string): Promise<DashboardLayout> => {
    try {
      const layout = JSON.parse(layoutData) as DashboardLayout;
      layout.id = `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      layout.createdAt = Date.now();
      layout.updatedAt = Date.now();
      layout.isDefault = false;
      
      await createLayout(layout);
      return layout;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importing layout');
      throw err;
    }
  }, [createLayout]);

  // ========== INITIALIZATION ==========

  useEffect(() => {
    // Load dashboard settings from user settings
    const raw = (settingsState.settings as any)?.preferences?.dashboardSettings as Partial<DashboardSettings> | undefined;
    if (raw) {
      const normalizedSettings = normalizeDashboardSettings(raw);
      const picked = pickActiveLayout(normalizedSettings);

      setSettings(picked.settings);
      // Cache only (avoid writing back to DB from hydration).
      persistDashboardSettings(picked.settings);
      
      // Set active layout if available
      setActiveLayout(picked.activeLayout);
    }
  }, [settingsState.settings, persistDashboardSettings]);

  const value: DashboardContextType = {
    loading,
    error,
    settings,
    activeLayout,
    filters,
    createLayout,
    updateLayout,
    deleteLayout,
    setActiveLayout: setActiveLayoutById,
    duplicateLayout,
    addCard,
    updateCard,
    removeCard,
    moveCard,
    resizeCard,
    duplicateCard,
    refreshCardData,
    refreshAllCards,
    getCardData,
    setFilter,
    clearFilters,
    applyFilters,
    generateReport,
    getReportTemplates,
    createReportTemplate,
    updateReportTemplate,
    deleteReportTemplate,
    updateSettings,
    resetToDefaults,
    getAvailableCardTypes,
    getDefaultLayout,
    exportLayout,
    importLayout,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export { DashboardContext };
