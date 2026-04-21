"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React from "react"
import { Box, Grid, Card, CardContent, Typography } from "@mui/material"

export interface StatItem {
  value: string | number
  label: string
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  prefix?: string
  suffix?: string
}

interface StatsSectionProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4 | 6
  spacing?: number
  sx?: any
}

const StatsSection: React.FC<StatsSectionProps> = ({ 
  stats, 
  columns = 4, 
  spacing = 3, 
  sx = {} 
}) => {
  const getGridSize = () => {
    switch (columns) {
      case 2: return 6
      case 3: return 4
      case 4: return 3
      case 6: return 2
      default: return 3
    }
  }

  const getColorValue = (color?: string) => {
    switch (color) {
      case 'primary': return themeConfig.brandColors.navy
      case 'secondary': return themeConfig.brandColors.offWhite
      case 'success': return 'success.main'
      case 'error': return 'error.main'
      case 'warning': return 'warning.main'
      case 'info': return 'info.main'
      default: return 'text.primary'
    }
  }

  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Grid container spacing={spacing}>
        {stats.map((stat, index) => (
          <Grid item xs={getGridSize()} key={index}>
            <Card sx={{ height: '80px' }}>
              <CardContent 
                sx={{ 
                  py: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  '&:last-child': { pb: 2 } 
                }}
              >
                <Typography 
                  variant="h5" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'baseline', 
                    gap: 1,
                    color: getColorValue(stat.color)
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>
                    {stat.prefix}{stat.value}{stat.suffix}
                  </span>
                  <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                    {stat.label}
                  </span>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default StatsSection
