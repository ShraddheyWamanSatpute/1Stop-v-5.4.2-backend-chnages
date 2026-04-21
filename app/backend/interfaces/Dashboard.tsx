import { FilterOptions, GroupByOptions, ChartData } from '../functions/Analytics';
// import { DateRange, AnalyticsResult, KPIMetrics } from '../functions/Analytics'; // TODO: Use when implementing these types

// ========== DASHBOARD TYPES ==========

export interface DashboardCard {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'text' | 'image' | 'custom';
  size: 'small' | 'medium' | 'large' | 'xlarge';
  position: { x: number; y: number; w: number; h: number };
  data: {
    source: 'analytics' | 'kpi' | 'chart' | 'table' | 'custom';
    module: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'company' | 'messenger' | 'notifications' | 'global';
    config: any;
  };
  filters: FilterOptions;
  groupBy?: GroupByOptions;
  refreshInterval?: number; // in seconds
  lastUpdated?: number;
  visible: boolean;
  order: number;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isGlobal: boolean;
  module?: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'company' | 'messenger' | 'notifications' | 'global';
  cards: DashboardCard[];
  gridSize: { columns: number; rows: number };
  breakpoints: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface DashboardSettings {
  userId: string;
  layouts: DashboardLayout[];
  activeLayout: string;
  reportTemplates?: ReportTemplate[];
  reportGenerations?: ReportGeneration[];
  globalSettings: {
    refreshInterval: number;
    autoRefresh: boolean;
    theme: 'light' | 'dark' | 'auto';
    cardSpacing: number;
    showGrid: boolean;
    showCardBorders: boolean;
  };
  moduleSettings: {
    [module: string]: {
      defaultLayout: string;
      customCards: DashboardCard[];
      filters: FilterOptions;
      groupBy?: GroupByOptions;
    };
  };
  lastUpdated: number;
}

// ========== DATA VISUALIZATION TYPES ==========

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar' | 'polar';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend: boolean;
  showGrid: boolean;
  colors: string[];
  data: ChartData;
  options?: any;
}

export interface TableConfig {
  title: string;
  columns: TableColumn[];
  data: any[];
  pagination: {
    enabled: boolean;
    pageSize: number;
    pageSizeOptions: number[];
  };
  sorting: {
    enabled: boolean;
    defaultSort?: { column: string; direction: 'asc' | 'desc' };
  };
  filtering: {
    enabled: boolean;
    globalFilter: boolean;
    columnFilters: boolean;
  };
  export: {
    enabled: boolean;
    formats: ('csv' | 'excel' | 'pdf')[];
  };
}

export interface TableColumn {
  id: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  sortable: boolean;
  filterable: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface KPIConfig {
  title: string;
  value: number;
  label: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: 'up' | 'down' | 'stable';
  format: 'currency' | 'number' | 'percentage' | 'time';
  color?: string;
  icon?: string;
  target?: number;
  unit?: string;
}

export interface TextConfig {
  title: string;
  content: string;
  type: 'markdown' | 'html' | 'plain';
  fontSize: 'small' | 'medium' | 'large';
  alignment: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
}

export interface CustomWidgetConfig {
  title: string;
  component: string;
  props: Record<string, any>;
  data: any;
}

// ========== REPORT TYPES ==========

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  module: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'company' | 'messenger' | 'notifications' | 'global';
  type: 'standard' | 'custom';
  isDefault: boolean;
  config: {
    title: string;
    sections: ReportSection[];
    filters: FilterOptions;
    groupBy?: GroupByOptions;
    format: 'pdf' | 'excel' | 'csv' | 'html';
    schedule?: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      time: string;
      recipients: string[];
    };
  };
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'kpi' | 'text' | 'custom';
  config: any;
  order: number;
}

export interface ReportGeneration {
  id: string;
  templateId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  startedAt: number;
  completedAt?: number;
  fileUrl?: string;
  error?: string;
  filters: FilterOptions;
  groupBy?: GroupByOptions;
  generatedBy: string;
}

// ========== DASHBOARD CARD TYPES ==========

export interface DashboardCardType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'analytics' | 'kpi' | 'visualization' | 'custom';
  module: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'company' | 'messenger' | 'notifications' | 'global';
  configSchema: any;
  defaultConfig: any;
  component: string;
}

// ========== FILTER TYPES ==========

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'text' | 'number' | 'boolean';
  options?: { value: any; label: string }[];
  defaultValue?: any;
  module?: string;
  field?: string;
  required: boolean;
}

export interface DashboardFilterState {
  [filterId: string]: any;
}

// ========== DASHBOARD EVENTS ==========

export interface DashboardEvent {
  type: 'card_added' | 'card_removed' | 'card_updated' | 'layout_changed' | 'filter_applied' | 'data_refreshed';
  timestamp: number;
  userId: string;
  data: any;
}

// ========== DASHBOARD PERMISSIONS ==========

export interface DashboardPermission {
  userId: string;
  module: string;
  permissions: {
    view: boolean;
    edit: boolean;
    create: boolean;
    delete: boolean;
    share: boolean;
  };
}

// ========== DASHBOARD SHARING ==========

export interface DashboardShare {
  id: string;
  dashboardId: string;
  sharedWith: string[];
  permissions: {
    view: boolean;
    edit: boolean;
    share: boolean;
  };
  expiresAt?: number;
  createdAt: number;
  createdBy: string;
}

// ========== DASHBOARD ANALYTICS ==========

export interface DashboardAnalytics {
  dashboardId: string;
  views: number;
  uniqueViewers: string[];
  lastViewed: number;
  averageViewTime: number;
  mostUsedCards: string[];
  filterUsage: Record<string, number>;
  exportCount: number;
  shareCount: number;
}

// ========== DEFAULT CONFIGURATIONS ==========

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  userId: '',
  layouts: [],
  activeLayout: '',
  reportTemplates: [],
  reportGenerations: [],
  globalSettings: {
    refreshInterval: 300, // 5 minutes
    autoRefresh: true,
    theme: 'auto',
    cardSpacing: 16,
    showGrid: false,
    showCardBorders: true,
  },
  moduleSettings: {},
  lastUpdated: Date.now(),
};

export const DEFAULT_GRID_BREAKPOINTS = {
  xs: 12,
  sm: 6,
  md: 4,
  lg: 3,
  xl: 2,
};

export const CARD_SIZE_CONFIG = {
  small: { w: 2, h: 2 },
  medium: { w: 4, h: 3 },
  large: { w: 6, h: 4 },
  xlarge: { w: 8, h: 6 },
};

export const CHART_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
];

export const MODULE_COLORS = {
  stock: '#4CAF50',
  hr: '#2196F3',
  bookings: '#FF9800',
  finance: '#9C27B0',
  pos: '#F44336',
  company: '#607D8B',
  messenger: '#00BCD4',
  notifications: '#795548',
  global: '#9E9E9E',
};
