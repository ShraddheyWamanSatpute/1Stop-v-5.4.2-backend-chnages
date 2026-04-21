"use client"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'

interface FormSectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  icon?: React.ReactNode
  elevation?: number
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  subtitle,
  children,
  collapsible = false,
  defaultExpanded = true,
  icon,
  elevation = 0,
}) => {
  if (collapsible) {
    return (
      <Paper elevation={elevation} sx={{ mb: 2, overflow: 'hidden' }}>
        <Accordion defaultExpanded={defaultExpanded} elevation={0}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: 'grey.50',
              borderBottom: 1,
              borderColor: 'divider',
              '&:hover': {
                bgcolor: alpha(themeConfig.brandColors.navy, 0.04),
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {icon && (
                <Box sx={{ display: 'flex', alignItems: 'center', color: themeConfig.brandColors.navy }}>
                  {icon}
                </Box>
              )}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            {children}
          </AccordionDetails>
        </Accordion>
      </Paper>
    )
  }

  return (
    <Paper elevation={elevation} sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon && (
            <Box sx={{ display: 'flex', alignItems: 'center', color: themeConfig.brandColors.navy }}>
              {icon}
            </Box>
          )}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    </Paper>
  )
}

export default FormSection

