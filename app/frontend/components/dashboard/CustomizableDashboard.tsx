import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  // Chip, // TODO: Use when implementing chip functionality
  Grid,
  // Paper, // TODO: Use when implementing paper functionality
  Tabs,
  Tab,
  // Divider, // TODO: Use when implementing divider functionality
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  // Download as DownloadIcon, // TODO: Use when implementing download functionality
  // Fullscreen as FullscreenIcon, // TODO: Use when implementing fullscreen functionality
  DragIndicator as DragIndicatorIcon,
  // Visibility as VisibilityIcon, // TODO: Use when implementing visibility functionality
  // VisibilityOff as VisibilityOffIcon, // TODO: Use when implementing visibility functionality
} from '@mui/icons-material';
import { Rnd } from 'react-rnd';
import { useDashboard } from '../../../backend/context/DashboardContext';
import { DashboardCard, DashboardCardType, DashboardLayout } from '../../../backend/interfaces/Dashboard';
import { useAnalytics } from '../../../backend/context/AnalyticsContext';
import KPICard from './cards/KPICard';
import ChartCard from './cards/ChartCard';
import TableCard from './cards/TableCard';
import EmptyCardState from './cards/EmptyCardState';

interface CustomizableDashboardProps {
  module: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'global';
  title: string;
  onLayoutChange?: (layout: DashboardLayout) => void;
  dateRange?: { startDate: Date; endDate: Date };
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type WidgetData = {
  kpis?: Record<string, unknown>;
  employeesByDepartment?: unknown[];
  [key: string]: unknown;
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CustomizableDashboard: React.FC<CustomizableDashboardProps> = ({
  module,
  title,
  dateRange,
  frequency = 'daily',
  // onLayoutChange // TODO: Use when implementing layout change functionality
}) => {
  const theme = useTheme()
  const GRID_PX = 100;
  const toFiniteNumber = (value: unknown, fallback: number) => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const toMinInt = (value: unknown, fallback: number, min: number) => {
    const n = Math.floor(toFiniteNumber(value, fallback));
    return Number.isFinite(n) ? Math.max(min, n) : fallback;
  };

  const dashboard = useDashboard();
  const analytics = useAnalytics();
  const [activeTab, setActiveTab] = useState(0);
  const [editingCard, setEditingCard] = useState<DashboardCard | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  // const [draggedCard, setDraggedCard] = useState<string | null>(null); // TODO: Use when implementing drag functionality

  // Load default layout if none exists
  useEffect(() => {
    if (!dashboard.activeLayout && dashboard.settings.layouts.length === 0) {
      const defaultLayout = dashboard.getDefaultLayout(module);
      dashboard.createLayout(defaultLayout);
    }
  }, [dashboard, module]);

  const activeLayout = dashboard.activeLayout;

  // Fetch widget data for the module
  const fetchWidgetData = async () => {
    try {
      // Format date range for API
      const dateRangeFormatted = dateRange ? {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0]
      } : undefined;
      
      let data;
      switch (module) {
        case 'hr':
          data = await analytics.getHRWidgets(dateRangeFormatted);
          break;
        case 'stock':
          data = await analytics.getStockWidgets(dateRangeFormatted);
          break;
        case 'bookings':
          data = await analytics.getBookingsWidgets(dateRangeFormatted);
          break;
        case 'finance':
          data = await analytics.getFinanceWidgets(dateRangeFormatted);
          break;
        case 'pos':
          data = await analytics.getPOSWidgets(dateRangeFormatted);
          break;
        case 'global':
          data = await analytics.getCompanyWidgets();
          break;
        default:
          data = null;
      }
      setWidgetData(data);
    } catch (error) {
      // Error handling - could show user notification if needed
    }
  };

  useEffect(() => {
    fetchWidgetData();
  }, [module, dateRange?.startDate, dateRange?.endDate, frequency]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddCard = async (cardType: string) => {
    try {
      const cardTypes = dashboard.getAvailableCardTypes(module);
      const selectedType = cardTypes.find(ct => ct.id === cardType);
      
      if (selectedType) {
        const categoryToDashboardType = (category: DashboardCardType['category']): DashboardCard['type'] => {
          switch (category) {
            case 'kpi':
              return 'kpi';
            case 'visualization':
              return 'chart';
            case 'analytics':
              return 'table';
            case 'custom':
            default:
              return 'custom';
          }
        };

        const categoryToSource = (category: DashboardCardType['category']): DashboardCard['data']['source'] => {
          switch (category) {
            case 'kpi':
              return 'kpi';
            case 'visualization':
              return 'chart';
            case 'analytics':
              return 'analytics';
            case 'custom':
            default:
              return 'custom';
          }
        };

        const newCard: Omit<DashboardCard, 'id' | 'lastUpdated'> = {
          title: selectedType.name,
          type: categoryToDashboardType(selectedType.category),
          size: 'medium',
          position: { x: 0, y: 0, w: 4, h: 3 },
          data: {
            source: categoryToSource(selectedType.category),
            module: module,
            config: selectedType.defaultConfig
          },
          filters: {},
          visible: true,
          order: dashboard.activeLayout?.cards.length || 0,
        };

        await dashboard.addCard(newCard);
        setShowAddCard(false);
      }
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  const handleEditCard = (card: DashboardCard) => {
    setEditingCard(card);
  };

  const handleUpdateCard = async (updates: Partial<DashboardCard>) => {
    if (editingCard) {
      try {
        await dashboard.updateCard(editingCard.id, updates);
        setEditingCard(null);
      } catch (error) {
        console.error('Error updating card:', error);
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await dashboard.removeCard(cardId);
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleMoveCard = async (cardId: string, newPosition: { x: number; y: number }) => {
    try {
      await dashboard.moveCard(cardId, newPosition);
    } catch (error) {
      console.error('Error moving card:', error);
    }
  };

  const handleResizeCard = async (cardId: string, newSize: { w: number; h: number }) => {
    try {
      await dashboard.resizeCard(cardId, newSize);
    } catch (error) {
      console.error('Error resizing card:', error);
    }
  };

  const handleRefreshCard = async (cardId: string) => {
    try {
      await dashboard.refreshCardData(cardId);
      await fetchWidgetData(); // Refresh widget data
    } catch (error) {
      console.error('Error refreshing card:', error);
    }
  };

  const handleRefreshAll = async () => {
    try {
      await dashboard.refreshAllCards();
      await fetchWidgetData(); // Refresh widget data
    } catch (error) {
      console.error('Error refreshing all cards:', error);
    }
  };

  const renderCard = (card: DashboardCard) => {
    const commonProps = {
      title: card.title,
      loading: !widgetData || analytics.loading,
      error: dashboard.error || analytics.error,
      onRefresh: () => handleRefreshCard(card.id),
      onMenuClick: () => handleEditCard(card),
      color: theme.palette.primary.main,
      size: card.size,
    };

    // Transform widget data into KPI format
    const getKPIData = () => {
      if (!widgetData || !widgetData.kpis) {
        return [];
      }
      
      const kpis = widgetData.kpis;
      
      return Object.entries(kpis).map(([key, value]) => ({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: typeof value === 'number' ? value : 0,
        format: (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percent') || key.toLowerCase().includes('completion') ? 'percentage' 
               : key.toLowerCase().includes('total') || key.toLowerCase().includes('payroll') || key.toLowerCase().includes('hours') ? 'number'
               : 'number') as 'number' | 'time' | 'currency' | 'percentage',
        change: 0, // Would need historical data for actual change
        changeType: 'neutral' as const,
        trend: 'stable' as const
      }));
    };

    switch (card.type) {
      case 'kpi':
        return (
          <KPICard
            {...commonProps}
            data={getKPIData()}
          />
        );
      case 'chart':
        return (
          <ChartCard
            {...commonProps}
            data={{ labels: [], datasets: [] }} // Chart data would be populated from specific widget data arrays
          />
        );
      case 'table':
        return (
          <TableCard
            {...commonProps}
            data={{ 
              data: widgetData?.employeesByDepartment || [], 
              summary: { total: 0, average: 0, min: 0, max: 0, count: widgetData?.employeesByDepartment?.length || 0 }, 
              groupedData: {}, 
              trends: [], 
              insights: [] 
            }}
          />
        );
      default:
        return (
          <Card>
            <CardContent>
              <Typography>Unknown card type: {card.type}</Typography>
            </CardContent>
          </Card>
        );
    }
  };

  if (!dashboard.activeLayout) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>No dashboard layout available</Typography>
      </Box>
    );
  }

  const visibleCards = activeLayout?.cards.filter((c) => c.visible) ?? [];
  const isLikelyPxPosition = (pos?: { x: unknown; y: unknown }) => {
    if (!pos) return false;
    // In a "grid unit" layout x/y are typically <= 12 / <= 30. If values get larger, they're likely pixels.
    const x = toFiniteNumber(pos.x, 0);
    const y = toFiniteNumber(pos.y, 0);
    return x > 50 || y > 50;
  };

  // Cards are absolutely positioned (via Rnd), so we must reserve space explicitly.
  const BASE_GRID_HEIGHT = 600;
  let gridHeight = BASE_GRID_HEIGHT;
  if (visibleCards.length > 0) {
    let maxBottom = 0;
    for (const card of visibleCards) {
      const posIsPx = isLikelyPxPosition(card.position);
      const yRaw = toFiniteNumber(card.position?.y, 0);
      const hUnits = toMinInt(card.position?.h, 3, 2);
      const yBasePx = posIsPx ? yRaw : yRaw * GRID_PX;
      const heightPx = hUnits * GRID_PX;
      maxBottom = Math.max(maxBottom, yBasePx + heightPx);
    }
    gridHeight = Math.max(BASE_GRID_HEIGHT, Math.ceil(maxBottom + 32));
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {title} Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Add Card">
            <IconButton onClick={() => setShowAddCard(true)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh All">
            <IconButton onClick={handleRefreshAll}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton onClick={() => setShowSettings(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Dashboard Grid */}
      <Box sx={{ position: 'relative', height: gridHeight, minHeight: gridHeight, overflow: 'hidden' }}>
        {activeLayout?.cards.filter((card) => card.visible).length === 0 ? (
          <Box sx={{ maxWidth: 720, mx: 'auto', mt: 6, height: 320 }}>
            <EmptyCardState message="No widgets to display yet. Add a card to start building this dashboard." height={320} />
          </Box>
        ) : (
          activeLayout!.cards
            .filter(card => card.visible)
            .map((card) => (
            <Rnd
              key={card.id}
              position={{
                x: isLikelyPxPosition(card.position)
                  ? toFiniteNumber(card.position?.x, 0)
                  : toFiniteNumber(card.position?.x, 0) * GRID_PX,
                y: isLikelyPxPosition(card.position)
                  ? toFiniteNumber(card.position?.y, 0)
                  : toFiniteNumber(card.position?.y, 0) * GRID_PX,
              }}
              size={{
                width: toMinInt(card.position?.w, 4, 2) * GRID_PX,
                height: toMinInt(card.position?.h, 3, 2) * GRID_PX,
              }}
              onDragStop={(_e, d) => {
                const posIsPx = isLikelyPxPosition(card.position);
                handleMoveCard(card.id, {
                  x: posIsPx ? d.x : Math.round(d.x / GRID_PX),
                  y: posIsPx ? d.y : Math.round(d.y / GRID_PX),
                });
              }}
              onResizeStop={(_e, _direction, ref) => {
                handleResizeCard(card.id, {
                  w: Math.max(2, Math.floor(ref.offsetWidth / GRID_PX)),
                  h: Math.max(2, Math.floor(ref.offsetHeight / GRID_PX))
                });
              }}
              bounds="parent"
              dragGrid={[GRID_PX, GRID_PX]}
              resizeGrid={[GRID_PX, GRID_PX]}
              enableResizing={{
                top: true,
                right: true,
                bottom: true,
                left: true,
                topRight: true,
                bottomRight: true,
                bottomLeft: true,
                topLeft: true,
              }}
              dragHandleClassName="drag-handle"
            >
              <Box sx={{ position: 'relative', height: '100%' }}>
                <Box
                  className="drag-handle"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1000,
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  <IconButton size="small" sx={{ opacity: 0.7 }}>
                    <DragIndicatorIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleEditCard(card)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteCard(card.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
                {renderCard(card)}
              </Box>
            </Rnd>
          ))
        )}
      </Box>

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onClose={() => setShowAddCard(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Card</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {dashboard.getAvailableCardTypes(module).map((cardType) => (
              <Grid item xs={12} sm={6} key={cardType.id}>
                <Card
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}
                  onClick={() => handleAddCard(cardType.id)}
                >
                  <CardContent>
                    <Typography variant="h6">{cardType.icon} {cardType.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {cardType.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddCard(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={!!editingCard} onClose={() => setEditingCard(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Card</DialogTitle>
        <DialogContent>
          {editingCard && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Title"
                value={editingCard.title}
                onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Size</InputLabel>
                <Select
                  value={editingCard.size}
                  onChange={(e) => setEditingCard({ ...editingCard, size: e.target.value as DashboardCard['size'] })}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                  <MenuItem value="xlarge">Extra Large</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingCard.visible}
                    onChange={(e) => setEditingCard({ ...editingCard, visible: e.target.checked })}
                  />
                }
                label="Visible"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCard(null)}>Cancel</Button>
          <Button onClick={() => editingCard && handleUpdateCard(editingCard)}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="General" />
            <Tab label="Layout" />
            <Tab label="Filters" />
          </Tabs>
          
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={dashboard.settings.globalSettings.autoRefresh}
                    onChange={(e) => dashboard.updateSettings({
                      globalSettings: {
                        ...dashboard.settings.globalSettings,
                        autoRefresh: e.target.checked
                      }
                    })}
                  />
                }
                label="Auto Refresh"
              />
              <Box>
                <Typography gutterBottom>Refresh Interval (seconds)</Typography>
                <Slider
                  value={dashboard.settings.globalSettings.refreshInterval}
                  onChange={(_e, value) => dashboard.updateSettings({
                    globalSettings: {
                      ...dashboard.settings.globalSettings,
                      refreshInterval: value as number
                    }
                  })}
                  min={60}
                  max={3600}
                  step={60}
                  marks={[
                    { value: 60, label: '1m' },
                    { value: 300, label: '5m' },
                    { value: 900, label: '15m' },
                    { value: 1800, label: '30m' },
                    { value: 3600, label: '1h' },
                  ]}
                />
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={dashboard.settings.globalSettings.showGrid}
                    onChange={(e) => dashboard.updateSettings({
                      globalSettings: {
                        ...dashboard.settings.globalSettings,
                        showGrid: e.target.checked
                      }
                    })}
                  />
                }
                label="Show Grid"
              />
            </Box>
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <Typography>Layout settings would go here</Typography>
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <Typography>Filter settings would go here</Typography>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomizableDashboard;
