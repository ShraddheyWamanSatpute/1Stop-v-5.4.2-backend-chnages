import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { Box, Typography, Paper, Chip, Tooltip } from "@mui/material"
import { TrendingUp, TrendingDown, TrendingFlat } from "@mui/icons-material"
import AnimatedCounter from "./AnimatedCounter"

interface StatCardProps {
  title: string
  value: number
  previousValue?: number
  format?: string
  trend?: "up" | "down" | "flat"
  trendValue?: number
  trendLabel?: string
  color?: string
  icon?: React.ReactNode
  size?: "small" | "medium" | "large"
  rating?: "positive" | "negative" | "neutral"
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  previousValue,
  format = "number",
  trend,
  trendValue,
  trendLabel,
  color = themeConfig.brandColors.navy,
  icon,
  size = "medium",
  rating,
}) => {
  const formatValue = (val: number): string => {
    if (format === "currency") {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 2,
      }).format(val)
    } else if (format === "percent") {
      return `${val.toFixed(1)}%`
    } else {
      return val.toLocaleString('en-GB')
    }
  }

  const calculateTrend = (): { trend: "up" | "down" | "flat"; value: number } => {
    if (trend && trendValue !== undefined) {
      return { trend, value: trendValue }
    }

    if (previousValue === undefined || previousValue === 0) {
      return { trend: "flat", value: 0 }
    }

    const diff = value - previousValue
    const percentChange = (diff / Math.abs(previousValue)) * 100

    if (Math.abs(percentChange) < 0.5) {
      return { trend: "flat", value: percentChange }
    } else if (percentChange > 0) {
      return { trend: "up", value: percentChange }
    } else {
      return { trend: "down", value: percentChange }
    }
  }

  const { trend: calculatedTrend, value: calculatedValue } = calculateTrend()

  const getTrendIcon = (trend: "up" | "down" | "flat") => {
    switch (trend) {
      case "up":
        return <TrendingUp fontSize={size === "small" ? "small" : "medium"} />
      case "down":
        return <TrendingDown fontSize={size === "small" ? "small" : "medium"} />
      default:
        return <TrendingFlat fontSize={size === "small" ? "small" : "medium"} />
    }
  }

  const getTrendColor = (trend: "up" | "down" | "flat", rating?: "positive" | "negative" | "neutral") => {
    if (rating === "positive") {
      return trend === "up" ? "success" : trend === "down" ? "error" : "default"
    } else if (rating === "negative") {
      return trend === "down" ? "success" : trend === "up" ? "error" : "default"
    } else {
      return trend === "up" ? "success" : trend === "down" ? "error" : "default"
    }
  }

  const sizeStyles = {
    small: {
      padding: 1.5,
      titleSize: "body2",
      valueSize: "h6",
      iconSize: 32,
      chipSize: "small" as const,
    },
    medium: {
      padding: 2,
      titleSize: "body1",
      valueSize: "h5",
      iconSize: 40,
      chipSize: "medium" as const,
    },
    large: {
      padding: 3,
      titleSize: "h6",
      valueSize: "h4",
      iconSize: 48,
      chipSize: "medium" as const,
    },
  }

  const currentSize = sizeStyles[size]

  return (
    <Paper
      elevation={2}
      sx={{
        p: currentSize.padding,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography variant={currentSize.titleSize as any} color="text.secondary">
          {title}
        </Typography>
        {icon && (
          <Box
            sx={{
              backgroundColor: `${color}15`,
              borderRadius: "50%",
              width: currentSize.iconSize,
              height: currentSize.iconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Typography
          variant={currentSize.valueSize as any}
          component="div"
          sx={{
            fontWeight: "bold",
            fontSize: {
              xs: size === "large" ? "1.5rem" : size === "medium" ? "1.25rem" : "1rem",
              sm: size === "large" ? "2rem" : size === "medium" ? "1.5rem" : "1.25rem",
              md: size === "large" ? "2.5rem" : size === "medium" ? "2rem" : "1.5rem",
            },
          }}
        >
          <AnimatedCounter value={value} format={formatValue} />
        </Typography>
      </Box>

      {(calculatedTrend !== "flat" || trendLabel) && (
        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <Tooltip
            title={
              trendLabel ||
              `${Math.abs(calculatedValue).toFixed(1)}% ${calculatedTrend === "up" ? "increase" : "decrease"} from previous period`
            }
          >
            <Chip
              icon={getTrendIcon(calculatedTrend)}
              label={trendLabel || `${Math.abs(calculatedValue).toFixed(1)}%`}
              color={getTrendColor(calculatedTrend, rating)}
              size={currentSize.chipSize}
              sx={{
                backgroundColor: `${getTrendColor(calculatedTrend, rating)}15`,
                fontWeight: "bold",
              }}
            />
          </Tooltip>
        </Box>
      )}
    </Paper>
  )
}

export default StatCard
