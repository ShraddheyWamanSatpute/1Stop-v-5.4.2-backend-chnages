import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import type { ReactNode } from 'react';

// Centralized theme configuration
// Modify these values to change the entire application's appearance
const themeConfig = {
  // Core Brand Colors (3-color palette)
  brandColors: {
    // Single-brand primary color
    navy: '#17234e',        // Main navy blue for navigation, headers, primary actions
    offWhite: '#f8f9fa',    // Off-white for backgrounds
    // Used wherever an "accent" color is needed (tabs/indicators/secondary buttons).
    // Accent: lighter navy blue (replaces legacy purple accents).
    lightBlue: '#2d3a66',
  },

  // Color Palette
  colors: {
    primary: {
      main: '#17234e',
      light: '#2d3a66',
      dark: '#0d1429',
      contrastText: '#f8f9fa',
    },
    secondary: {
      // Secondary is the accent (lighter navy)
      main: '#2d3a66',
      light: '#3b4a86',
      dark: '#1f2b55',
      contrastText: '#f8f9fa',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#f8f9fa',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#f8f9fa',
    },
    info: {
      // Keep "info" aligned with the single brand navy
      main: '#17234e',
      light: '#2d3a66',
      dark: '#0d1429',
      contrastText: '#f8f9fa',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#f8f9fa',
    },
    background: {
      // Backgrounds: only two colors
      default: '#f8f9fa',
      paper: '#f8f9fa',
    },
    text: {
      // Text: only two colors (navy + off-white)
      primary: '#17234e',
      // Secondary text must be readable on light surfaces (cards/backgrounds).
      // Use navy with lower emphasis instead of off-white.
      secondary: 'rgba(23, 35, 78, 0.7)',
      disabled: 'rgba(23, 35, 78, 0.4)',  // Navy at 40% opacity
    },
    divider: 'rgba(23, 35, 78, 0.12)',
  },

  // Typography - 5 Font Size Scale
  fontSizes: {
    xs: '0.75rem',   // 12px - Small labels, captions
    sm: '0.875rem',  // 14px - Secondary text, small buttons
    md: '1rem',      // 16px - Body text, standard UI
    lg: '1.25rem',   // 20px - Section headers, large buttons
    xl: '1.5rem',    // 24px - Page titles, major headings
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    
    // Heading sizes (using our 5-size scale)
    h1: {
      fontSize: '1.5rem',   // xl - 24px - Page titles
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h2: {
      fontSize: '1.25rem', // lg - 20px - Section headers
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1rem',    // md - 16px - Subsection headers
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '0.875rem', // sm - 14px - Small headers
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '0.875rem', // sm - 14px
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '0.75rem',  // xs - 12px
      fontWeight: 500,
      lineHeight: 1.4,
    },
    
    // Body text
    body1: {
      fontSize: '1rem',     // md - 16px - Main body text
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem', // sm - 14px - Secondary text
      fontWeight: 400,
      lineHeight: 1.5,
    },
    
    // Button text
    button: {
      fontSize: '0.875rem', // sm - 14px
      fontWeight: 500,
      lineHeight: 1.75,
      textTransform: 'none' as const,
    },
    
    // Caption and overline
    caption: {
      fontSize: '0.75rem',  // xs - 12px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.75rem',  // xs - 12px
      fontWeight: 400,
      lineHeight: 1.5,
      // Do not force ALL CAPS anywhere by default.
      textTransform: 'none' as const,
    },
  },

  // Spacing (reduced by 10% for global scale)
  spacing: 7.2, // Base spacing unit (7.2px = 8px * 0.9)

  // Border radius
  borderRadius: 4,

  // Shadows
  shadows: {
    elevation1: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    elevation2: '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
    elevation3: '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
    elevation4: '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
  },

  // Component-specific overrides
  components: {
    // Card styling
    card: {
      padding: 16,
      borderRadius: 8,
      boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    },
    
    // Button styling
    button: {
      borderRadius: 4,
      padding: '8px 16px',
      minHeight: 36,
    },
    
    // Input styling
    input: {
      borderRadius: 4,
      padding: '8px 12px',
    },
    
    // Table styling
    table: {
      headerBackground: '#f8f9fa',  // Off-white
      borderColor: 'rgba(23, 35, 78, 0.12)',
    },
    
    // Sidebar styling - Navy
    sidebar: {
      width: 280,
      backgroundColor: '#17234e',
      borderColor: 'rgba(248, 249, 250, 0.12)',
    },
    
    // Header styling - Navy (matches sidebar)
    header: {
      height: 64,
      backgroundColor: '#17234e',
      borderColor: 'rgba(248, 249, 250, 0.12)',
    },
    
    // Additional component configurations
    chip: {
      borderRadius: 16,
      fontSize: '0.75rem',
    },
    
    dialog: {
      borderRadius: 8,
      padding: 24,
    },
    
    menu: {
      borderRadius: 4,
      elevation: 3,
    },
    
    list: {
      itemPadding: '8px 16px',
      itemBorderRadius: 4,
    },
  },
};

// Create the MUI theme using our configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: themeConfig.colors.primary,
    secondary: themeConfig.colors.secondary,
    error: themeConfig.colors.error,
    warning: themeConfig.colors.warning,
    info: themeConfig.colors.info,
    success: themeConfig.colors.success,
    background: themeConfig.colors.background,
    text: themeConfig.colors.text,
    divider: themeConfig.colors.divider,
    // Fast global fix: any MUI `grey.*` usages resolve to off-white/navy.
    // - Light greys (50-200) -> off-white (background surfaces)
    // - Dark greys (300-900) -> navy (borders/text accents)
    grey: {
      50: themeConfig.brandColors.offWhite,
      100: themeConfig.brandColors.offWhite,
      200: themeConfig.brandColors.offWhite,
      300: themeConfig.brandColors.navy,
      400: themeConfig.brandColors.navy,
      500: themeConfig.brandColors.navy,
      600: themeConfig.brandColors.navy,
      700: themeConfig.brandColors.navy,
      800: themeConfig.brandColors.navy,
      900: themeConfig.brandColors.navy,
    },
  },
  typography: {
    fontFamily: themeConfig.typography.fontFamily,
    fontSize: themeConfig.typography.fontSize,
    fontWeightLight: themeConfig.typography.fontWeightLight,
    fontWeightRegular: themeConfig.typography.fontWeightRegular,
    fontWeightMedium: themeConfig.typography.fontWeightMedium,
    fontWeightBold: themeConfig.typography.fontWeightBold,
    h1: themeConfig.typography.h1,
    h2: themeConfig.typography.h2,
    h3: themeConfig.typography.h3,
    h4: themeConfig.typography.h4,
    h5: themeConfig.typography.h5,
    h6: themeConfig.typography.h6,
    body1: themeConfig.typography.body1,
    body2: themeConfig.typography.body2,
    button: themeConfig.typography.button,
    caption: themeConfig.typography.caption,
    overline: themeConfig.typography.overline,
  },
  spacing: themeConfig.spacing,
  shape: {
    borderRadius: themeConfig.borderRadius,
  },
  components: {
    // Global component overrides
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--brand-navy': themeConfig.brandColors.navy,
          '--brand-offWhite': themeConfig.brandColors.offWhite,
          '--brand-divider': themeConfig.colors.divider,
          '--brand-navy-04': 'rgba(23, 35, 78, 0.04)',
          '--brand-navy-05': 'rgba(23, 35, 78, 0.05)',
          '--brand-navy-08': 'rgba(23, 35, 78, 0.08)',
          '--brand-navy-12': 'rgba(23, 35, 78, 0.12)',
          '--brand-offWhite-08': 'rgba(248, 249, 250, 0.08)',
          '--brand-offWhite-10': 'rgba(248, 249, 250, 0.10)',
          '--brand-offWhite-12': 'rgba(248, 249, 250, 0.12)',
          '--brand-offWhite-15': 'rgba(248, 249, 250, 0.15)',
          '--brand-offWhite-20': 'rgba(248, 249, 250, 0.20)',
        },
        body: {
          backgroundColor: themeConfig.colors.background.default,
          fontFamily: themeConfig.typography.fontFamily,
        },
        '#root': {
          backgroundColor: themeConfig.colors.background.default,
          minHeight: '100vh',
        },
        // Hard guarantee: never force ALL CAPS anywhere.
        // (Some merged setups can change style injection order, causing MUI defaults to win.)
        '.MuiButton-root': { textTransform: 'none !important' },
        '.MuiTab-root': { textTransform: 'none !important' },
        '.MuiToggleButton-root': { textTransform: 'none !important' },
        '.MuiButtonBase-root': { textTransform: 'none !important' },
      },
    },

    // Inputs: ensure labels are readable when NOT focused.
    // MUI defaults often use `palette.text.secondary` for labels; in our palette that's off-white
    // (great on navy, invisible on off-white backgrounds). So we force labels to match normal text.
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          "&.Mui-focused": {
            color: theme.palette.text.primary,
          },
          "&.Mui-disabled": {
            color: theme.palette.text.disabled,
          },
          "&.Mui-error": {
            color: theme.palette.error.main,
          },
        }),
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          "&.Mui-focused": {
            color: theme.palette.text.primary,
          },
          "&.Mui-disabled": {
            color: theme.palette.text.disabled,
          },
          "&.Mui-error": {
            color: theme.palette.error.main,
          },
        }),
      },
    },
    
    // Cards
    MuiCard: {
      styleOverrides: {
        root: {
          padding: themeConfig.components.card.padding,
          borderRadius: themeConfig.components.card.borderRadius,
          boxShadow: themeConfig.components.card.boxShadow,
        },
      },
    },
    
    // Buttons - Navy primary, Light Blue secondary
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.components.button.borderRadius,
          padding: themeConfig.components.button.padding,
          minHeight: themeConfig.components.button.minHeight,
          textTransform: 'none !important',
          fontFamily: themeConfig.typography.fontFamily,
          fontSize: themeConfig.typography.button.fontSize,
          fontWeight: themeConfig.typography.button.fontWeight,
        },
        containedPrimary: {
          backgroundColor: themeConfig.brandColors.navy,
          color: themeConfig.brandColors.offWhite,
          '&:hover': {
            backgroundColor: themeConfig.colors.primary.light,
          },
        },
        containedSecondary: {
          backgroundColor: themeConfig.colors.secondary.main,
          color: themeConfig.colors.secondary.contrastText,
          '&:hover': {
            backgroundColor: themeConfig.colors.secondary.main,
          },
        },
        outlinedPrimary: {
          borderColor: themeConfig.brandColors.navy,
          color: themeConfig.brandColors.navy,
          '&:hover': {
            borderColor: themeConfig.colors.primary.light,
            backgroundColor: 'rgba(23, 35, 78, 0.04)',
          },
        },
        outlinedSecondary: {
          borderColor: themeConfig.colors.secondary.main,
          color: themeConfig.colors.secondary.main,
          '&:hover': {
            borderColor: themeConfig.colors.secondary.main,
            backgroundColor: 'rgba(23, 35, 78, 0.04)',
          },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          textTransform: 'none !important',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
        },
      },
    },
    
    // Text Fields and Inputs
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: themeConfig.components.input.borderRadius,
            fontFamily: themeConfig.typography.fontFamily,
          },
          '& .MuiInputLabel-root': {
            fontFamily: themeConfig.typography.fontFamily,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.components.input.borderRadius,
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    
    // Tables
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: themeConfig.components.table.headerBackground,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: themeConfig.components.table.borderColor,
          fontFamily: themeConfig.typography.fontFamily,
        },
        head: {
          fontWeight: themeConfig.typography.fontWeightMedium,
          backgroundColor: themeConfig.components.table.headerBackground,
        },
      },
    },
    
    // Typography - All variants
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: themeConfig.typography.fontFamily,
        },
        h1: themeConfig.typography.h1,
        h2: themeConfig.typography.h2,
        h3: themeConfig.typography.h3,
        h4: themeConfig.typography.h4,
        h5: themeConfig.typography.h5,
        h6: themeConfig.typography.h6,
        body1: themeConfig.typography.body1,
        body2: themeConfig.typography.body2,
        caption: themeConfig.typography.caption,
        overline: themeConfig.typography.overline,
      },
    },
    
    // Chips
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
          fontFamily: themeConfig.typography.fontFamily,
          fontSize: themeConfig.typography.caption.fontSize,
        },
      },
    },
    
    // Dialogs
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: themeConfig.borderRadius * 2,
          boxShadow: themeConfig.shadows.elevation4,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: themeConfig.typography.fontFamily,
          fontSize: themeConfig.typography.h5.fontSize,
          fontWeight: themeConfig.typography.fontWeightMedium,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    
    // Tabs - Light blue accent for active tabs
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: themeConfig.typography.fontFamily,
          fontSize: themeConfig.typography.button.fontSize,
          fontWeight: themeConfig.typography.fontWeightMedium,
          textTransform: 'none !important',
          // Default tabs appear on light surfaces in most forms; keep unselected readable.
          color: themeConfig.colors.text.secondary,
          '&.Mui-selected': {
            // Selected state must contrast on light surfaces.
            color: themeConfig.brandColors.navy,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none !important',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
          '& .MuiTabs-indicator': {
            // Use brand accent so indicator is visible on light backgrounds.
            backgroundColor: themeConfig.brandColors.lightBlue,
          },
        },
      },
    },
    
    // App Bar and Navigation - Navy Blue
    MuiAppBar: {
      styleOverrides: {
        root: {
          height: themeConfig.components.header.height,
          backgroundColor: themeConfig.components.header.backgroundColor,
          borderBottom: `1px solid ${themeConfig.components.header.borderColor}`,
          boxShadow: 'none',
          color: themeConfig.brandColors.offWhite,  // Off-white text on navy
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: `${themeConfig.components.header.height}px !important`,
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    
    // Drawer/Sidebar - Navy Blue
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: themeConfig.components.sidebar.width,
          backgroundColor: themeConfig.components.sidebar.backgroundColor,
          borderRight: `1px solid ${themeConfig.components.sidebar.borderColor}`,
          color: themeConfig.brandColors.offWhite,  // Off-white text on navy
        },
      },
    },
    
    // Lists
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontFamily: themeConfig.typography.fontFamily,
          fontSize: themeConfig.typography.body1.fontSize,
        },
        secondary: {
          fontFamily: themeConfig.typography.fontFamily,
          fontSize: themeConfig.typography.body2.fontSize,
        },
      },
    },
    
    // Menus
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: themeConfig.borderRadius,
          boxShadow: themeConfig.shadows.elevation3,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: themeConfig.typography.fontFamily,
          fontSize: themeConfig.typography.body2.fontSize,
        },
      },
    },
    
    // Form Controls
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    
    // Select
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.components.input.borderRadius,
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    
    // Accordion
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        content: {
          fontFamily: themeConfig.typography.fontFamily,
          fontWeight: themeConfig.typography.fontWeightMedium,
        },
      },
    },
    
    // Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
        },
        elevation1: {
          boxShadow: themeConfig.shadows.elevation1,
        },
        elevation2: {
          boxShadow: themeConfig.shadows.elevation2,
        },
        elevation3: {
          boxShadow: themeConfig.shadows.elevation3,
        },
        elevation4: {
          boxShadow: themeConfig.shadows.elevation4,
        },
      },
    },
    
    // Alerts
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    
    // Snackbar
    MuiSnackbar: {
      styleOverrides: {
        root: {
          fontFamily: themeConfig.typography.fontFamily,
        },
      },
    },
    
    // Links - Light blue accent
    MuiLink: {
      styleOverrides: {
        root: {
          color: themeConfig.brandColors.lightBlue,
          textDecorationColor: themeConfig.brandColors.lightBlue,
          '&:hover': {
            color: themeConfig.colors.secondary.dark,
          },
        },
      },
    },
    
    // Checkbox - Light blue accent
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: themeConfig.colors.text.secondary,
          '&.Mui-checked': {
            color: themeConfig.brandColors.lightBlue,
          },
        },
      },
    },
    
    // Radio - Light blue accent
    MuiRadio: {
      styleOverrides: {
        root: {
          color: themeConfig.colors.text.secondary,
          '&.Mui-checked': {
            color: themeConfig.brandColors.lightBlue,
          },
        },
      },
    },
    
    // Switch - Light blue accent
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: themeConfig.brandColors.lightBlue,
            '& + .MuiSwitch-track': {
              backgroundColor: themeConfig.brandColors.lightBlue,
            },
          },
        },
      },
    },
    
    // Slider - Light blue accent
    MuiSlider: {
      styleOverrides: {
        root: {
          color: themeConfig.brandColors.offWhite,
        },
      },
    },
    
    // Progress indicators - Light blue accent
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius,
          backgroundColor: 'rgba(23, 35, 78, 0.15)',
        },
        bar: {
          backgroundColor: themeConfig.brandColors.offWhite,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: themeConfig.brandColors.offWhite,
        },
      },
    },
    
    // Badge - Light blue accent
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: themeConfig.brandColors.offWhite,
          color: themeConfig.brandColors.navy,
        },
      },
    },
  },
});

const darkTheme = createTheme(theme, {
  palette: {
    mode: 'dark',
    background: {
      default: themeConfig.brandColors.navy,
      paper: themeConfig.brandColors.navy,
    },
    text: {
      primary: themeConfig.brandColors.offWhite,
      secondary: themeConfig.brandColors.offWhite,
    },
    divider: 'rgba(248, 249, 250, 0.12)',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: themeConfig.brandColors.navy,
        },
        '#root': {
          backgroundColor: themeConfig.brandColors.navy,
        },
      },
    },
  },
});

// Export the theme configuration for direct access if needed
export { themeConfig };

// Export the MUI theme for use in components
export { theme };
export { darkTheme };

// Theme Provider Component
interface AppThemeProviderProps {
  children: ReactNode;
  mode?: 'light' | 'dark';
}

const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children, mode = 'light' }) => {
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default AppThemeProvider;
