import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import { ChartData } from '../../../../backend/functions/Analytics';
import EmptyCardState from './EmptyCardState';

interface ChartCardProps {
  title: string;
  data: ChartData;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onMenuClick?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar' | 'polar';
  onChartTypeChange?: (type: string) => void;
  color?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  loading = false,
  error = null,
  onRefresh,
  onMenuClick,
  onDownload,
  onFullscreen,
  chartType = 'bar',
  onChartTypeChange,
  color,
  size = 'medium'
}) => {
  const theme = useTheme();
  const accent = color ?? theme.palette.primary.main;
  const getCardHeight = () => {
    switch (size) {
      case 'small':
        return 200;
      case 'large':
        return 400;
      default:
        return 300;
    }
  };

  const getChartHeight = () => {
    switch (size) {
      case 'small':
        return 120;
      case 'large':
        return 320;
      default:
        return 220;
    }
  };
  const hasChartData = Boolean(data?.labels?.length);

  if (error) {
    return (
      <Card sx={{ height: getCardHeight() }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card sx={{ height: getCardHeight() }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: getCardHeight(), borderLeft: `4px solid ${accent}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onChartTypeChange && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Chart Type</InputLabel>
                <Select
                  value={chartType}
                  onChange={(e) => onChartTypeChange(e.target.value)}
                  label="Chart Type"
                >
                  <MenuItem value="bar">Bar</MenuItem>
                  <MenuItem value="line">Line</MenuItem>
                  <MenuItem value="pie">Pie</MenuItem>
                  <MenuItem value="doughnut">Doughnut</MenuItem>
                  <MenuItem value="area">Area</MenuItem>
                  <MenuItem value="scatter">Scatter</MenuItem>
                  <MenuItem value="radar">Radar</MenuItem>
                  <MenuItem value="polar">Polar</MenuItem>
                </Select>
              </FormControl>
            )}
            {onRefresh && (
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={onRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            {onDownload && (
              <Tooltip title="Download">
                <IconButton size="small" onClick={onDownload}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            {onFullscreen && (
              <Tooltip title="Fullscreen">
                <IconButton size="small" onClick={onFullscreen}>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            )}
            {onMenuClick && (
              <Tooltip title="More options">
                <IconButton size="small" onClick={onMenuClick}>
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ height: getChartHeight(), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasChartData ? (
            <Box sx={{ width: '100%', height: '100%' }}>
              {/* Placeholder for actual chart component */}
              <Box sx={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {chartType.toUpperCase()} Chart
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {data.labels.length} data points
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            <EmptyCardState message="No chart data available" height={getChartHeight()} />
          )}
        </Box>

        {data && data.datasets && data.datasets.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {data.datasets.map((dataset, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: dataset.backgroundColor || dataset.borderColor || accent,
                    borderRadius: '50%'
                  }}
                />
                <Typography variant="caption" color="textSecondary">
                  {dataset.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartCard;
