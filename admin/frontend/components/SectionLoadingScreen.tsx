import React from "react"
import { useLocation } from "react-router-dom"
import BrandedAppLoader from "./BrandedAppLoader"

// Section to redirect path mapping
const SECTION_REDIRECTS: Record<string, string> = {
  // Admin router uses basename="/Admin", so internal navigation should be root-relative.
  admin: "/",
}

interface SectionLoadingScreenProps {
  section?: string
  message?: string
}

/**
 * Section-specific loading screen with reload redirect functionality
 * Automatically detects the section from the current route if not provided
 */
const SectionLoadingScreen: React.FC<SectionLoadingScreenProps> = ({
  section,
}) => {
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

  return (
    <BrandedAppLoader />
  )
}

export default SectionLoadingScreen
