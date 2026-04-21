import { createTheme } from "@mui/material/styles"

// Using the exact color from the logo background - updated to #17234E
const logoNavyBlue = "#17234E"
const logoNavyBlueLight = "#27335E"
const logoNavyBlueDark = "#07133E"

const theme = createTheme({
  palette: {
    primary: {
      main: logoNavyBlue,
      dark: logoNavyBlueDark,
      light: logoNavyBlueLight,
    },
    secondary: {
      main: "#8B5CF6", // Keep purple as secondary
    },
    background: {
      default: "#f8f9fa",
      paper: "#ffffff",
    },
    text: {
      primary: logoNavyBlue,
      secondary: "#6B7280",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "3.5rem",
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
      color: logoNavyBlue,
      "@media (max-width:900px)": {
        fontSize: "2.5rem",
      },
      "@media (max-width:600px)": {
        fontSize: "2rem",
      },
    },
    h2: {
      fontWeight: 700,
      fontSize: "2.5rem",
      lineHeight: 1.2,
      letterSpacing: "-0.01em",
      color: logoNavyBlue,
      "@media (max-width:900px)": {
        fontSize: "2rem",
      },
      "@media (max-width:600px)": {
        fontSize: "1.75rem",
      },
    },
    h3: {
      fontWeight: 700,
      fontSize: "2rem",
      lineHeight: 1.3,
      color: logoNavyBlue,
      "@media (max-width:600px)": {
        fontSize: "1.5rem",
      },
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
      lineHeight: 1.4,
      color: logoNavyBlue,
      "@media (max-width:600px)": {
        fontSize: "1.25rem",
      },
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      lineHeight: 1.4,
      color: logoNavyBlue,
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.1rem",
      lineHeight: 1.4,
      color: logoNavyBlue,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
      color: "#6B7280",
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
      color: "#6B7280",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "12px 24px",
          fontSize: "0.95rem",
          fontWeight: 600,
        },
        contained: {
          backgroundColor: logoNavyBlue,
          color: "white",
          boxShadow: "0 2px 8px rgba(23, 35, 78, 0.15)",
          "&:hover": {
            backgroundColor: logoNavyBlueDark,
            boxShadow: "0 4px 12px rgba(23, 35, 78, 0.2)",
          },
        },
        outlined: {
          borderColor: logoNavyBlue,
          color: logoNavyBlue,
          "&:hover": {
            backgroundColor: `${logoNavyBlue}08`,
            borderColor: logoNavyBlueDark,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          border: "1px solid #E5E7EB",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: logoNavyBlue,
            },
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: logoNavyBlue,
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          "@media (min-width:600px)": {
            paddingLeft: 24,
            paddingRight: 24,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: logoNavyBlue,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        colorPrimary: {
          backgroundColor: logoNavyBlue,
          color: "white",
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
})

export default theme
