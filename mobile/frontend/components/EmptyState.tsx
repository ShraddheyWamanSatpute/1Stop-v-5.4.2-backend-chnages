/**
 * ESS Empty State Component
 * 
 * Displays empty state messages with:
 * - Icon
 * - Title and description
 * - Optional action button
 * - Consistent styling
 */

"use client"

import React from "react"
import {
  Box,
  Typography,
  Button,
} from "@mui/material"

interface ESSEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

const ESSEmptyState: React.FC<ESSEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        px: 3,
        textAlign: "center",
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2,
            color: "text.secondary",
            "& svg": {
              fontSize: 64,
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
      )}

      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{ borderRadius: 2 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

export default ESSEmptyState

