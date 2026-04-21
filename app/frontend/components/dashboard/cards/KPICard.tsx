import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { KPIMetrics } from '../../../../backend/functions/Analytics';
import EmptyCardState from './EmptyCardState';

interface KPICardProps {
  title: string;
  data: KPIMetrics[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onMenuClick?: () => void;
  color?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  data,
  loading = false,
  error = null,
  onRefresh,
  onMenuClick,
  color,
  size = 'medium'
}) => {
  const theme = useTheme()
  const accentColor = color ?? theme.palette.primary.main
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${value} hours`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'success';
      case 'decrease':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon />;
      case 'down':
        return <TrendingDownIcon />;
      default:
        return <TrendingFlatIcon />;
    }
  };

  const getCardHeight = () => {
    switch (size) {
      case 'small':
        return 120;
      case 'large':
        return 200;
      default:
        return 160;
    }
  };

  const hasKpis = Array.isArray(data) && data.length > 0;

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
    <Card sx={{ height: getCardHeight(), borderLeft: `4px solid ${accentColor}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h3" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onRefresh && (
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={onRefresh}>
                  <RefreshIcon />
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

        {hasKpis ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.map((kpi, index) => (
              <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    {kpi.label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${kpi.change > 0 ? '+' : ''}${kpi.change}%`}
                      color={getChangeColor(kpi.changeType)}
                      size="small"
                      icon={getTrendIcon(kpi.trend)}
                    />
                  </Box>
                </Box>
                <Typography variant="h4" component="div" sx={{ color: accentColor, fontWeight: 'bold' }}>
                  {formatValue(kpi.value, kpi.format)}
                </Typography>
                {/* TODO: Add target property to KPIMetrics interface if needed */}
                {/* {kpi.target && (
                  <Typography variant="body2" color="textSecondary">
                    Target: {formatValue(kpi.target, kpi.format)}
                  </Typography>
                )} */}
              </Box>
            ))}
          </Box>
        ) : (
          <EmptyCardState message="No KPI data available" height={getCardHeight() - 72} />
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;
