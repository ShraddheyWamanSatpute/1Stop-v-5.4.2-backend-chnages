import React, { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Box,
  IconButton,
  Stack,
  Typography,
  Collapse,
  Paper
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { areDependenciesReady } from "../../../backend/utils/ContextDependencies"
import type { Site } from "../../../backend/interfaces/Company"
import CompanyDropdown from "./CompanyDropdown"
import SiteDropdown from "./SiteDropdown"
import SubsiteDropdown from "./SubsiteDropdown"
import { themeConfig } from "../../../theme/AppTheme"

const LocationSelector: React.FC = () => {
  const { state } = useCompany()
  const { state: settingsState } = useSettings()
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Terminated users must not be able to select/view company/site/subsite
  const isTerminated = String((settingsState.user as any)?.accountStatus || "").toLowerCase() === "terminated"
  
  // Wait for core contexts (Settings and Company) to be ready before rendering
  // This ensures dropdowns have access to the data they need
  const coreContextsReady = areDependenciesReady(settingsState, state)

  // Only show Subsite dropdown when subsites actually exist for the selected site.
  const hasSubsites = useMemo(() => {
    if (!state.selectedSiteID) return false

    // Prefer extracted subsites from CompanyContext, but only count valid ones
    const validFromState =
      Array.isArray(state.subsites) &&
      state.subsites.some((s: any) => !!s?.subsiteID && String(s.subsiteID).trim().length > 0)
    if (validFromState) return true

    const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object"
    const selectedSite = (state.sites as Site[] | undefined)?.find((s) => s?.siteID === state.selectedSiteID)
    const subsitesObj: unknown = selectedSite?.subsites
    if (!isRecord(subsitesObj)) return false

    // Count only entries that look like real subsites (id + name). This avoids false positives
    // from other keys hanging off the `subsites` object.
    return Object.entries(subsitesObj).some(([subsiteKey, subsiteVal]) => {
      if (!isRecord(subsiteVal)) return false
      const id =
        typeof subsiteVal.subsiteID === "string"
          ? subsiteVal.subsiteID
          : typeof (subsiteVal as Record<string, unknown>).id === "string"
            ? ((subsiteVal as Record<string, unknown>).id as string)
            : subsiteKey

      // Treat as a real subsite if it has an id AND at least one expected field.
      const hasExpectedField =
        "subsiteID" in subsiteVal ||
        "id" in subsiteVal ||
        "name" in subsiteVal ||
        "subsiteName" in subsiteVal

      return String(id || "").trim().length > 0 && hasExpectedField
    })
  }, [state.selectedSiteID, state.subsites, state.sites])

  // Get the innermost selected location name for display
  const getInnermostLocation = useCallback(() => {
    if (state.selectedSubsiteName) {
      return state.selectedSubsiteName
    }
    if (state.selectedSiteName) {
      return state.selectedSiteName
    }
    if (state.company?.companyName) {
      return state.company.companyName
    }
    return "No company selected"
  }, [state.selectedSubsiteName, state.selectedSiteName, state.company])

  // Collapse the selector when clicking outside
  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (!isExpanded) return
      const target = e.target as Node
      // Ignore clicks inside MUI select/popover menus (rendered in a portal)
      const isElement = (target as any)?.nodeType === 1
      const el = isElement ? (target as Element) : null
      const inMuiMenu = !!el?.closest('.MuiPopover-root, .MuiMenuItem-root, [role="listbox"], .MuiModal-root')
      if (inMuiMenu) return

      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [isExpanded])

  // Don't render until core contexts are ready
  if (!coreContextsReady) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: themeConfig.brandColors.offWhite,
            minWidth: 120
          }}
        >
          Loading...
        </Typography>
      </Box>
    )
  }

  if (isTerminated) {
    return null
  }

  return (
    <Box ref={containerRef} sx={{ display: 'flex', alignItems: 'center' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          bgcolor: 'transparent',
          p: 1,
          borderRadius: 1
        }}
      >
        <IconButton
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ 
            mr: 1,
            color: themeConfig.brandColors.offWhite,
            '&:hover': {
              backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
            }
          }}
        >
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>

        <Collapse in={isExpanded} orientation="horizontal">
          <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
            <CompanyDropdown />
            {state.companyID && <SiteDropdown />}
            {state.selectedSiteID && hasSubsites && <SubsiteDropdown />}
          </Stack>
        </Collapse>

        {!isExpanded && (
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: themeConfig.brandColors.offWhite,
              minWidth: 120
            }}
          >
            {getInnermostLocation()}
          </Typography>
        )}
      </Paper>
    </Box>
  )
}

export default LocationSelector