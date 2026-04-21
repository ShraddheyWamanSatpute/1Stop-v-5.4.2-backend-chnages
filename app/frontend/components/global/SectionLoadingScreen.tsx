import React from "react"
import { Box, Button, Typography } from "@mui/material"
import { Refresh as RefreshIcon } from "@mui/icons-material"
import { useNavigate, useLocation } from "react-router-dom"
import BrandedAppLoader from "./BrandedAppLoader"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"

// Section to redirect path mapping
const SECTION_REDIRECTS: Record<string, string> = {
  pos: "/POS/ItemSales",
  hr: "/HR/Dashboard",
  finance: "/Finance/Dashboard",
  stock: "/Stock/Items",
  company: "/Company/Dashboard",
  bookings: "/Bookings/Dashboard",
  analytics: "/Analytics",
  dashboard: "/Dashboard",
  messenger: "/Messenger",
  settings: "/Settings/Personal",
  supply: "/Supply/Clients",
  admin: "/Admin",
}

interface SectionLoadingScreenProps {
  section?: string
  message?: string
  onReload?: () => void
}

/**
 * Section-specific loading screen with reload redirect functionality
 * Automatically detects the section from the current route if not provided
 */
const SectionLoadingScreen: React.FC<SectionLoadingScreenProps> = ({
  section,
  onReload,
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Detect section from route if not provided
  const detectedSection = React.useMemo(() => {
    if (section) return section.toLowerCase()

    const path = location.pathname.toLowerCase()
    
    // Check for section matches
    for (const [sectionKey, sectionPath] of Object.entries(SECTION_REDIRECTS)) {
      if (path.includes(sectionPath.toLowerCase()) || path.includes(`/${sectionKey}/`)) {
        return sectionKey
      }
    }

    // Fallback: extract first segment after root
    const segments = path.split("/").filter(Boolean)
    if (segments.length > 0) {
      return segments[0]
    }

    return "dashboard"
  }, [section, location.pathname])

  // Get redirect path for the section
  const redirectPath = SECTION_REDIRECTS[detectedSection] || SECTION_REDIRECTS.dashboard

  // Handle reload - navigate to section's main route
  const handleReload = React.useCallback(() => {
    if (onReload) {
      onReload()
    } else {
      // Navigate to section's default route
      navigate(redirectPath, { replace: true })
      // Force page reload after navigation
      window.location.reload()
    }
  }, [onReload, navigate, redirectPath])

  return (
    <BrandedAppLoader>
      <Box
        sx={{
          mt: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: themeConfig.brandColors.offWhite,
            opacity: 0.8,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          If loading takes too long, you can reload this section
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleReload}
          sx={{
            color: themeConfig.brandColors.offWhite,
            borderColor: themeConfig.brandColors.offWhite,
            "&:hover": {
              borderColor: themeConfig.brandColors.offWhite,
              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
            },
          }}
        >
          Reload {detectedSection.charAt(0).toUpperCase() + detectedSection.slice(1)}
        </Button>
      </Box>
    </BrandedAppLoader>
  )
}

export default SectionLoadingScreen
