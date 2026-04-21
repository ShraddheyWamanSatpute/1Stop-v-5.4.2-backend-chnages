/**
 * Centralized Theme Colors
 * Use these constants for inline styles and non-MUI components
 * This ensures consistency across the entire application
 */

import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../theme/AppTheme"

export const THEME_COLORS = {
  // Core Brand Colors (3-color palette)
  navy: themeConfig.brandColors.navy,
  offWhite: themeConfig.brandColors.offWhite,
  // Accent (lighter navy) — replaces legacy purple accents.
  lightBlue: themeConfig.colors.primary.light,
  
  // Extended Palette
  navyLight: themeConfig.colors.primary.light,
  navyDark: themeConfig.colors.primary.dark,
  // Legacy light-blue variants -> navy accent
  lightBlueDark: themeConfig.colors.secondary.dark,
  lightBlueLight: themeConfig.colors.secondary.light,
  // Avoid pure white; map to off-white for consistency
  white: themeConfig.brandColors.offWhite,
  
  // Text Colors
  textPrimary: themeConfig.brandColors.navy,
  // Requirement: secondary text is off-white (used on navy surfaces)
  textSecondary: themeConfig.brandColors.offWhite,
  textDisabled: alpha(themeConfig.brandColors.navy, 0.4),
  textOnNavy: themeConfig.brandColors.offWhite,
  
  // Status Colors
  error: themeConfig.colors.error.main,
  errorLight: themeConfig.colors.error.light,
  warning: themeConfig.colors.warning.main,
  warningLight: themeConfig.colors.warning.light,
  success: themeConfig.colors.success.main,
  successLight: themeConfig.colors.success.light,
  
  // UI Colors
  divider: themeConfig.colors.divider,
  border: themeConfig.colors.divider,
  // Overlays should be derived from navy, not light-blue
  hoverOverlay: alpha(themeConfig.brandColors.navy, 0.08),
  selectedOverlay: alpha(themeConfig.brandColors.navy, 0.12),
  
  // Background Colors
  backgroundDefault: themeConfig.brandColors.offWhite,
  backgroundPaper: themeConfig.brandColors.offWhite,
  backgroundNavy: themeConfig.brandColors.navy,
} as const;

export const THEME_FONT_SIZES = {
  xs: '0.75rem',   // 12px - Small labels, captions
  sm: '0.875rem',  // 14px - Secondary text, small buttons
  md: '1rem',      // 16px - Body text, standard UI
  lg: '1.25rem',   // 20px - Section headers, large buttons
  xl: '1.5rem',    // 24px - Page titles, major headings
} as const;

export const THEME_SPACING = {
  xs: 4,   // 4px
  sm: 8,   // 8px
  md: 16,  // 16px
  lg: 24,  // 24px
  xl: 32,  // 32px
  xxl: 48, // 48px
} as const;

