/**
 * ESS Location Selector Dialog
 * 
 * Mobile-friendly dialog for selecting company/site/subsite
 * Similar to the main app's LocationSelector but optimized for mobile
 */

"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Collapse,
  Card,
  CardContent,
  useTheme,
} from "@mui/material"
import {
  Close as CloseIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Store as StoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import { useSettings } from "../../../app/backend/context/SettingsContext"

interface ESSLocationSelectorProps {
  open: boolean
  onClose: () => void
}

const ESSLocationSelector: React.FC<ESSLocationSelectorProps> = ({ open, onClose }) => {
  const theme = useTheme()
  const { state: companyState, setCompanyID, selectSite, selectSubsite, getUserAccessibleSites } = useCompany()
  const { state: settingsState } = useSettings()
  const [companyExpanded, setCompanyExpanded] = useState(!companyState.companyID)
  const [siteExpanded, setSiteExpanded] = useState(!!companyState.companyID && !companyState.selectedSiteID)
  const [subsiteExpanded, setSubsiteExpanded] = useState(!!companyState.selectedSiteID && !companyState.selectedSubsiteID)

  type UiCompany = { companyID: string; companyName: string }
  const [companies, setCompanies] = useState<UiCompany[]>([])
  const previousUserCompaniesRef = useRef<string>("")

  const normalizeCompanies = (rawCompanies: any[]): UiCompany[] => {
    const out: UiCompany[] = []
    const seen = new Set<string>()

    ;(rawCompanies || []).forEach((company: any) => {
      const companyID = String(company?.companyID || company?.companyId || company?.id || "").trim()
      if (!companyID) return
      if (seen.has(companyID)) return
      seen.add(companyID)

      const companyName = String(company?.companyName || company?.name || companyID).trim() || companyID
      out.push({ companyID, companyName })
    })

    return out
  }

  const userCompanies = useMemo(() => {
    if (!settingsState.user?.companies) return []
    const raw: any = (settingsState.user as any).companies
    const arr: any[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : []
    return normalizeCompanies(arr)
  }, [settingsState.user?.companies])

  // Cache-first (same as app CompanyDropdown)
  useEffect(() => {
    if (!open) return
    try {
      const cachedState = localStorage.getItem("settingsState")
      if (cachedState) {
        const parsed = JSON.parse(cachedState)
        const raw = parsed?.user?.companies
        const arr: any[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : []
        const cachedCompanies = normalizeCompanies(arr)
        if (cachedCompanies.length > 0) setCompanies(cachedCompanies)
      }
    } catch {
      // ignore
    }
  }, [open])

  // Update from SettingsContext when it changes (same as app CompanyDropdown)
  useEffect(() => {
    const newCompaniesStr = JSON.stringify(userCompanies.map((c) => ({ companyID: c.companyID, companyName: c.companyName })))
    if (previousUserCompaniesRef.current !== newCompaniesStr) {
      previousUserCompaniesRef.current = newCompaniesStr
      if (userCompanies.length > 0) setCompanies(userCompanies)
    }
  }, [userCompanies])

  const companiesForUi = useMemo(() => {
    const base = companies.length > 0 ? companies : []
    if (!companyState.companyID) return base
    if (base.some((c) => c.companyID === companyState.companyID)) return base
    return [
      ...base,
      {
        companyID: companyState.companyID,
        companyName:
          companyState.companyName ||
          companyState.company?.companyName ||
          (companyState.company as any)?.name ||
          companyState.companyID,
      },
    ]
  }, [companies, companyState.companyID, companyState.companyName, companyState.company])

  // Get sites for current company
  const [sites, setSites] = useState<any[]>([])
  const [subsites, setSubsites] = useState<any[]>([])
  const [loadingSites, setLoadingSites] = useState(false)

  useEffect(() => {
    if (!companyState.companyID || !open) {
      setSites([])
      setSubsites([])
      return
    }

    const loadSites = async () => {
      setLoadingSites(true)
      try {
        // getUserAccessibleSites uses state.companyID internally, no parameter needed
        const accessibleSites = await getUserAccessibleSites()
        setSites(accessibleSites || [])
      } catch (error) {
        console.error("Error loading sites:", error)
        setSites([])
      } finally {
        setLoadingSites(false)
      }
    }

    loadSites()
  }, [companyState.companyID, open, getUserAccessibleSites])

  // Get subsites for selected site
  useEffect(() => {
    if (!companyState.selectedSiteID || !open) {
      setSubsites([])
      return
    }

    // Get subsites from company state - convert Record to array
    const site = companyState.sites?.find(s => s.siteID === companyState.selectedSiteID)
    if (site?.subsites) {
      // Convert Record<string, Subsite> to array
      const subsitesArray = Object.entries(site.subsites).map(([subsiteID, subsite]) => ({
        ...subsite,
        subsiteID: subsite.subsiteID || subsiteID, // Use subsiteID from object if available, otherwise use key
        subsiteName: subsite.name || "",
      }))
      setSubsites(subsitesArray)
    } else {
      setSubsites([])
    }
  }, [companyState.selectedSiteID, companyState.sites, open])

  const handleCompanySelect = async (companyID: string) => {
    if (companyID === companyState.companyID) {
      onClose()
      return
    }

    setCompanyID(companyID)
    setCompanyExpanded(false) // Collapse companies when one is selected
    setSiteExpanded(true) // Expand sites when company is selected
    // Sites and subsites will reload automatically via useEffect
  }

  const handleSiteSelect = async (siteID: string, siteName: string) => {
    if (siteID === companyState.selectedSiteID) {
      onClose()
      return
    }

    // Ensure we always persist a non-empty display name so the header can show Site when no Subsite is selected.
    const resolvedSiteName =
      String(siteName || "").trim() ||
      String(sites.find((s) => s.siteID === siteID)?.name || sites.find((s) => s.siteID === siteID)?.siteName || "").trim() ||
      (siteID ? "Unnamed Site" : "")

    selectSite(siteID, resolvedSiteName)
    setSiteExpanded(false) // Collapse sites when one is selected
    setSubsiteExpanded(true) // Expand subsites when site is selected
    // Clear subsite when site changes
    selectSubsite("", "")
  }

  const handleSubsiteSelect = (subsiteID: string, subsiteName: string) => {
    if (subsiteID === companyState.selectedSubsiteID) {
      onClose()
      return
    }

    selectSubsite(subsiteID, subsiteName)
    onClose()
  }

  // Get current location display text
  const getCurrentLocation = (): string => {
    // Prefer explicit names if present
    if (companyState.selectedSubsiteName) return companyState.selectedSubsiteName
    if (companyState.selectedSiteName) return companyState.selectedSiteName

    // If an ID is selected but the name is missing, derive from loaded sites/subsites
    if (companyState.selectedSubsiteID && companyState.selectedSiteID && companyState.sites?.length) {
      const site = companyState.sites.find((s: any) => String(s?.siteID) === String(companyState.selectedSiteID))
      const subsite =
        site?.subsites?.[String(companyState.selectedSubsiteID)] ||
        Object.values(site?.subsites || {}).find((ss: any) => String((ss as any)?.subsiteID) === String(companyState.selectedSubsiteID))
      const derived = String((subsite as any)?.name || (subsite as any)?.subsiteName || "").trim()
      if (derived) return derived
    }

    if (companyState.selectedSiteID && companyState.sites?.length) {
      const site = companyState.sites.find((s: any) => String(s?.siteID) === String(companyState.selectedSiteID))
      const derived = String((site as any)?.name || (site as any)?.siteName || "").trim()
      if (derived) return derived
    }

    const companyName =
      companyState.company?.companyName ||
      (companyState.company as any)?.name ||
      (companyState as any).companyName ||
      ""
    if (companyName) return companyName
    return "Select Location"
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          m: 0,
          maxHeight: "100vh",
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Top-right close button (no title bar) */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Selected Company/Site/Subsite at Top */}
        {companyState.companyID && (
          <Card sx={{ m: 2, mb: 1, bgcolor: "primary.main", color: "primary.contrastText" }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mb: 0.5 }}>
                Selected
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {getCurrentLocation()}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Company Selection - Collapsible */}
        <Box>
          <ListItemButton
            onClick={() => setCompanyExpanded(!companyExpanded)}
            sx={{
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            <BusinessIcon sx={{ mr: 1 }} />
            <ListItemText primary="Company" />
            {companyExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={companyExpanded}>
            <List sx={{ pt: 0 }}>
              {companiesForUi.map((company) => (
                <ListItem key={company.companyID} disablePadding>
                  <ListItemButton
                    selected={company.companyID === companyState.companyID}
                    onClick={() => handleCompanySelect(company.companyID)}
                  >
                    <ListItemText
                      primary={company.companyName}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Box>

        {/* Site Selection - Only show if company is selected, Collapsible */}
        {companyState.companyID && (
          <>
            <Divider />
            <Box>
              <ListItemButton
                onClick={() => setSiteExpanded(!siteExpanded)}
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                }}
              >
                <LocationIcon sx={{ mr: 1 }} />
                <ListItemText primary="Site" />
                {loadingSites && (
                  <CircularProgress
                    size={16}
                    sx={{ ml: 1, color: theme.palette.primary.contrastText }}
                  />
                )}
                {siteExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={siteExpanded}>
                <List sx={{ pt: 0 }}>
                  {loadingSites ? (
                    <ListItem>
                      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", py: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    </ListItem>
                  ) : sites.length > 0 ? (
                    <>
                      <ListItem disablePadding>
                        <ListItemButton
                          selected={!companyState.selectedSiteID}
                          onClick={() => handleSiteSelect("", "")}
                        >
                          <ListItemText primary="No Site" />
                        </ListItemButton>
                      </ListItem>
                      {sites.map((site) => (
                        <ListItem key={site.siteID} disablePadding>
                          <ListItemButton
                            selected={site.siteID === companyState.selectedSiteID}
                            onClick={() => handleSiteSelect(site.siteID, site.name || site.siteName || "Unnamed Site")}
                          >
                            <ListItemText primary={site.name || site.siteName || "Unnamed Site"} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </>
                  ) : (
                    <ListItem>
                      <ListItemText primary="No sites available" secondary="Select a company first" />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </Box>
          </>
        )}

        {/* Subsite Selection - Only show if site is selected, Collapsible */}
        {companyState.selectedSiteID && (
          <>
            <Divider />
            <Box>
              <ListItemButton
                onClick={() => setSubsiteExpanded(!subsiteExpanded)}
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                }}
              >
                <StoreIcon sx={{ mr: 1 }} />
                <ListItemText primary="Subsite" />
                {subsiteExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={subsiteExpanded}>
                <List sx={{ pt: 0 }}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={!companyState.selectedSubsiteID}
                      onClick={() => handleSubsiteSelect("", "")}
                    >
                      <ListItemText primary="No Subsite" />
                    </ListItemButton>
                  </ListItem>
                  {subsites.map((subsite) => (
                    <ListItem key={subsite.subsiteID} disablePadding>
                      <ListItemButton
                        selected={subsite.subsiteID === companyState.selectedSubsiteID}
                        onClick={() => handleSubsiteSelect(subsite.subsiteID, subsite.subsiteName || subsite.name || "")}
                      >
                        <ListItemText primary={subsite.subsiteName || "Unnamed Subsite"} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ESSLocationSelector

