"use client"

import React from "react"
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material"
import { themeConfig } from "../../../theme/AppTheme"

export type NamedColorOption = {
  name: string
  value: string // hex
}

export const DEFAULT_NAMED_COLORS: NamedColorOption[] = [
  // App theme defaults (used heavily across dashboards/widgets)
  { name: "Navy", value: themeConfig.brandColors.navy },
  { name: "Off White", value: themeConfig.brandColors.offWhite },
  { name: "Light Grey", value: themeConfig.colors.divider },
  { name: "Success", value: themeConfig.colors.success.main },
  { name: "Warning", value: themeConfig.colors.warning.main },
  { name: "Error", value: themeConfig.colors.error.main },

  // Extra palette options (still useful in other screens)
  { name: "Blue", value: "#1976d2" },
  { name: "Teal", value: "#009688" },
  { name: "Green", value: "#2e7d32" },
  { name: "Lime", value: "#7cb342" },
  { name: "Yellow", value: "#f9a825" },
  { name: "Orange", value: "#ef6c00" },
  { name: "Red", value: "#d32f2f" },
  { name: "Pink", value: "#c2185b" },
  { name: "Purple", value: "#6a1b9a" },
  { name: "Brown", value: "#5d4037" },
  { name: "Grey", value: "#616161" },
]

const ColorDot: React.FC<{ color: string }> = ({ color }) => (
  <Box
    sx={{
      width: 14,
      height: 14,
      borderRadius: "50%",
      backgroundColor: color,
      border: "1px solid rgba(0,0,0,0.18)",
      flex: "0 0 auto",
    }}
  />
)

export interface ColorSelectProps {
  label?: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  fullWidth?: boolean
  size?: "small" | "medium"
  variant?: "outlined" | "filled" | "standard"
  options?: NamedColorOption[]
}

const normalizeHex = (v: string): string => {
  const raw = String(v || "").trim()
  if (!raw) return ""
  const withHash = raw.startsWith("#") ? raw : `#${raw}`
  if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) return withHash
  return raw // fallback for unexpected values
}

const ColorSelect: React.FC<ColorSelectProps> = ({
  label = "Color",
  value,
  onChange,
  disabled,
  fullWidth = true,
  size = "medium",
  variant = "outlined",
  options = DEFAULT_NAMED_COLORS,
}) => {
  const normalized = normalizeHex(value)
  const selected = options.find((o) => normalizeHex(o.value).toLowerCase() === normalized.toLowerCase())

  return (
    <FormControl fullWidth={fullWidth} disabled={disabled} size={size} variant={variant}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={selected ? selected.value : normalized || options[0]?.value || ""}
        onChange={(e) => onChange(String(e.target.value))}
        renderValue={(selectedValue) => {
          const opt = options.find((o) => o.value === selectedValue)
          const name = opt?.name || "Custom"
          const col = normalizeHex(opt?.value || selectedValue)
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ColorDot color={col} />
              <Typography variant="body2">{name}</Typography>
            </Box>
          )
        }}
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ColorDot color={normalizeHex(opt.value)} />
              <Typography variant="body2">{opt.name}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default ColorSelect

