"use client"
import type React from "react"
import { Box, Card, CardContent, Typography } from "@mui/material"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"

type IconComponent = React.ElementType<{ sx?: any }>

export interface EmptyStateCardProps {
  icon?: IconComponent
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  iconSx?: any
  cardSx?: any
  contentSx?: any
}

export default function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  iconSx,
  cardSx,
  contentSx,
}: EmptyStateCardProps) {
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  return (
    <Card
      sx={{
        bgcolor: themeConfig.brandColors.offWhite,
        border: `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}`,
        boxShadow: "none",
        ...(cardSx || {}),
      }}
    >
      <CardContent sx={{ textAlign: "center", py: 4, ...(contentSx || {}) }}>
        {Icon ? (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Icon sx={{ fontSize: 48, color: themeConfig.brandColors.navy, mb: 1, ...(iconSx || {}) }} />
          </Box>
        ) : null}
        <Typography variant="h6" sx={{ mb: 0.5, color: themeConfig.brandColors.navy }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" sx={{ color: secondaryText }}>
            {description}
          </Typography>
        ) : null}
        {action ? <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>{action}</Box> : null}
      </CardContent>
    </Card>
  )
}

