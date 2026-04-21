/**
 * Dashboard Utilities
 * Helper functions for dashboard layout management and widget configuration
 */

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  format?: 'number' | 'currency' | 'percentage' | 'time';
  showTrend?: boolean;
  showDataLabels?: boolean;
  showLegend?: boolean;
  showPercentage?: boolean;
  showTotal?: boolean;
  showConversion?: boolean;
  xAxis?: string;
  yAxis?: string | string[];
  valueField?: string;
  labelField?: string;
  colors?: string[];
  metrics?: string[];
  [key: string]: any;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  dataSource: string;
  dataType: string;
  position: WidgetPosition;
  config: WidgetConfig;
  isVisible?: boolean;
  refreshInterval?: number;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    section: string;
  };
}

/**
 * Validates a dashboard widget configuration
 */
export const validateWidget = (widget: DashboardWidget): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!widget.id || typeof widget.id !== 'string') {
    errors.push('Widget ID is required and must be a string');
  }

  if (!widget.type || typeof widget.type !== 'string') {
    errors.push('Widget type is required and must be a string');
  }

  if (!widget.title || typeof widget.title !== 'string') {
    errors.push('Widget title is required and must be a string');
  }

  if (!widget.dataSource || typeof widget.dataSource !== 'string') {
    errors.push('Widget dataSource is required and must be a string');
  }

  if (!widget.dataType || typeof widget.dataType !== 'string') {
    errors.push('Widget dataType is required and must be a string');
  }

  if (!widget.position || typeof widget.position !== 'object') {
    errors.push('Widget position is required and must be an object');
  } else {
    const { x, y, w, h } = widget.position;
    if (typeof x !== 'number' || x < 0) {
      errors.push('Widget position.x must be a non-negative number');
    }
    if (typeof y !== 'number' || y < 0) {
      errors.push('Widget position.y must be a non-negative number');
    }
    if (typeof w !== 'number' || w <= 0) {
      errors.push('Widget position.w must be a positive number');
    }
    if (typeof h !== 'number' || h <= 0) {
      errors.push('Widget position.h must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a complete dashboard layout
 */
export const validateDashboardLayout = (layout: DashboardWidget[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const widgetIds = new Set<string>();

  if (!Array.isArray(layout)) {
    errors.push('Layout must be an array of widgets');
    return { isValid: false, errors };
  }

  for (const widget of layout) {
    const validation = validateWidget(widget);
    if (!validation.isValid) {
      errors.push(...validation.errors.map(error => `Widget ${widget.id || 'unknown'}: ${error}`));
    }

    // Check for duplicate IDs
    if (widget.id) {
      if (widgetIds.has(widget.id)) {
        errors.push(`Duplicate widget ID: ${widget.id}`);
      } else {
        widgetIds.add(widget.id);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Optimizes widget positions to prevent overlaps
 */
export const optimizeLayout = (widgets: DashboardWidget[], gridColumns: number = 12): DashboardWidget[] => {
  const optimized = [...widgets];
  const grid: boolean[][] = [];

  // Initialize grid
  const maxY = Math.max(...widgets.map(w => w.position.y + w.position.h), 10);
  for (let y = 0; y < maxY + 10; y++) {
    grid[y] = new Array(gridColumns).fill(false);
  }

  // Sort widgets by position (top to bottom, left to right)
  optimized.sort((a, b) => {
    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y;
    }
    return a.position.x - b.position.x;
  });

  // Place widgets and resolve conflicts
  for (const widget of optimized) {
    const { x, y, w, h } = widget.position;
    
    // Check if position is available
    let newX = x;
    let newY = y;
    let positionFound = false;

    // Try to find a suitable position
    for (let tryY = y; tryY < grid.length - h && !positionFound; tryY++) {
      for (let tryX = 0; tryX <= gridColumns - w && !positionFound; tryX++) {
        let canPlace = true;
        
        // Check if this position is free
        for (let checkY = tryY; checkY < tryY + h && canPlace; checkY++) {
          for (let checkX = tryX; checkX < tryX + w && canPlace; checkX++) {
            if (grid[checkY] && grid[checkY][checkX]) {
              canPlace = false;
            }
          }
        }

        if (canPlace) {
          newX = tryX;
          newY = tryY;
          positionFound = true;
        }
      }
    }

    // Update widget position
    widget.position.x = newX;
    widget.position.y = newY;

    // Mark grid cells as occupied
    for (let markY = newY; markY < newY + h; markY++) {
      for (let markX = newX; markX < newX + w; markX++) {
        if (grid[markY]) {
          grid[markY][markX] = true;
        }
      }
    }
  }

  return optimized;
};

/**
 * Compacts the layout by moving widgets up to fill gaps
 */
export const compactLayout = (widgets: DashboardWidget[]): DashboardWidget[] => {
  const compacted = [...widgets];
  
  // Sort by Y position
  compacted.sort((a, b) => a.position.y - b.position.y);

  for (let i = 0; i < compacted.length; i++) {
    const widget = compacted[i];
    let newY = 0;

    // Find the highest Y position this widget can be placed
    for (let j = 0; j < i; j++) {
      const otherWidget = compacted[j];
      
      // Check if widgets overlap horizontally
      const horizontalOverlap = !(
        widget.position.x >= otherWidget.position.x + otherWidget.position.w ||
        otherWidget.position.x >= widget.position.x + widget.position.w
      );

      if (horizontalOverlap) {
        newY = Math.max(newY, otherWidget.position.y + otherWidget.position.h);
      }
    }

    widget.position.y = newY;
  }

  return compacted;
};

/**
 * Creates a widget with default configuration
 */
export const createWidget = (
  id: string,
  type: string,
  title: string,
  dataSource: string,
  dataType: string,
  position: WidgetPosition,
  config: Partial<WidgetConfig> = {}
): DashboardWidget => {
  const defaultConfigs: Record<string, WidgetConfig> = {
    kpiCard: {
      icon: 'Analytics',
      color: 'primary',
      format: 'number',
      showTrend: true
    },
    barChart: {
      showDataLabels: true,
      showLegend: false,
      color: 'primary'
    },
    lineChart: {
      showLegend: true,
      colors: ['#2196f3', '#4caf50', '#ff9800']
    },
    pieChart: {
      showPercentage: true,
      showLegend: true
    },
    donutChart: {
      showTotal: true,
      showPercentage: true
    },
    areaChart: {
      showLegend: true,
      colors: ['#2196f3', '#4caf50', '#ff9800']
    },
    funnelChart: {
      showConversion: true
    },
    radarChart: {
      color: 'secondary'
    },
    stackedBarChart: {
      showPercentage: false,
      showLegend: true
    }
  };

  return {
    id,
    type,
    title,
    dataSource,
    dataType,
    position,
    config: {
      ...defaultConfigs[type],
      ...config
    },
    isVisible: true,
    refreshInterval: 30000 // 30 seconds default
  };
};

/**
 * Clones a widget with a new ID
 */
export const cloneWidget = (widget: DashboardWidget, newId: string, offsetPosition?: Partial<WidgetPosition>): DashboardWidget => {
  return {
    ...widget,
    id: newId,
    title: `${widget.title} (Copy)`,
    position: {
      ...widget.position,
      ...offsetPosition
    }
  };
};

/**
 * Gets widget type categories for organization
 */
export const getWidgetCategories = (): Record<string, string[]> => {
  return {
    'KPI Cards': ['kpiCard', 'stat', 'dashboardCard'],
    'Charts': [
      'barChart', 'lineChart', 'pieChart', 'donutChart', 'areaChart',
      'scatterChart', 'bubbleChart', 'radarChart', 'funnelChart', 'waterfallChart'
    ],
    'Advanced Charts': [
      'multipleSeriesLineChart', 'multipleSeriesBarChart', 'stackedBarChart', 'stackedAreaChart',
      'candlestickChart', 'heatmap', 'gauge'
    ],
    'Data Display': ['table', 'dataGrid', 'metricList'],
    'Indicators': ['progressBar', 'trendIndicator'],
    'Controls': ['filterWidget', 'datePickerWidget', 'searchWidget'],
    'Layout': ['tabsWidget', 'accordionWidget', 'carouselWidget'],
    'Specialized': ['calendarHeatmap', 'geographicMap', 'treeMap', 'sankeyDiagram', 'networkDiagram']
  };
};

/**
 * Gets recommended widgets for a data source
 */
export const getRecommendedWidgets = (dataSource: string): string[] => {
  const recommendations: Record<string, string[]> = {
    hr: ['kpiCard', 'barChart', 'pieChart', 'lineChart', 'radarChart', 'funnelChart', 'areaChart'],
    stock: ['kpiCard', 'lineChart', 'barChart', 'pieChart', 'gauge', 'heatmap'],
    finance: ['kpiCard', 'lineChart', 'areaChart', 'barChart', 'waterfallChart', 'gauge'],
    bookings: ['kpiCard', 'lineChart', 'barChart', 'pieChart', 'calendarHeatmap'],
    pos: ['kpiCard', 'lineChart', 'barChart', 'pieChart', 'heatmap'],
    company: ['kpiCard', 'barChart', 'pieChart', 'progressBar'],
    messenger: ['kpiCard', 'lineChart', 'areaChart'],
    notifications: ['kpiCard', 'pieChart', 'barChart']
  };

  return recommendations[dataSource.toLowerCase()] || ['kpiCard', 'barChart', 'lineChart', 'pieChart'];
};
