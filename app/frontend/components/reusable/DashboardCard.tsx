import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { type DashboardCardProps } from '../../types/WidgetTypes';
import AnimatedCounter from './AnimatedCounter';
import { alpha, useTheme } from '@mui/material/styles';

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  change = 0,
  changeLabel,
  color,
  onClick
}) => {
  const theme = useTheme();
  const accent = color ?? theme.palette.primary.main;
  const isPositiveChange = change >= 0;
  const formattedChange = `${isPositiveChange ? '+' : ''}${change.toFixed(1)}%`;
  
  // Determine if value is a number or string
  const isNumericValue = typeof value === 'number';
  const isCurrency = typeof value === 'string' && (value.startsWith('$') || value.startsWith('£'));
  
  // Extract numeric value if it's a currency string
  const numericValue = isCurrency 
    ? parseFloat(value.replace(/[$,£]/g, '')) 
    : (isNumericValue ? value : 0);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        borderRadius: 2,
        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          transform: 'translateY(-5px)',
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.22)}`
        } : {}
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 2, gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            lineHeight: 1,
          }}
        >
          <Icon icon={icon} width={24} height={24} />
        </Box>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
        {isNumericValue || isCurrency ? (
          <AnimatedCounter 
            value={numericValue} 
            prefix={isCurrency ? '£' : ''} 
            isCurrency={isCurrency}
          />
        ) : (
          value
        )}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: isPositiveChange ? 'success.main' : 'error.main',
            fontWeight: 'medium'
          }}
        >
          {formattedChange}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          {changeLabel || 'vs previous period'}
        </Typography>
      </Box>
    </Card>
  );
};

export default DashboardCard;
