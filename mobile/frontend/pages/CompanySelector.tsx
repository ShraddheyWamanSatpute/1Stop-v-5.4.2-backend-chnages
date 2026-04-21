/**
 * ESS Company Selector Page
 * 
 * For multi-company users:
 * - List of available companies
 * - Switch between companies
 */

"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Avatar,
  useTheme,
} from "@mui/material"
import {
  Business as BusinessIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { useSettings } from "../../../app/backend/context/SettingsContext"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import { EmptyState } from "../components"
import { getESSDashboardPath } from "../utils/mobileRouteUtils"

type UiCompany = {
  companyID: string
  companyName: string
}

const ESSCompanySelector: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const { authState, switchCompany } = useESS()
  const { state: settingsState } = useSettings()
  const { state: companyState } = useCompany()

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
  }, [])

  // Update from SettingsContext when it changes (same as app CompanyDropdown)
  useEffect(() => {
    const newCompaniesStr = JSON.stringify(userCompanies.map((c) => ({ companyID: c.companyID, companyName: c.companyName })))
    if (previousUserCompaniesRef.current !== newCompaniesStr) {
      previousUserCompaniesRef.current = newCompaniesStr
      if (userCompanies.length > 0) setCompanies(userCompanies)
    }
  }, [userCompanies])

  // Ensure selected company is included (same principle as app CompanyDropdown)
  const companiesForUi = useMemo(() => {
    const base = companies.length > 0 ? companies : []
    const selectedId = companyState.companyID || authState.currentCompanyId || ""
    if (!selectedId) return base
    if (base.some((c) => c.companyID === selectedId)) return base

    const selectedName =
      companyState.companyName ||
      companyState.company?.companyName ||
      (companyState.company as any)?.name ||
      selectedId

    return [...base, { companyID: selectedId, companyName: selectedName }]
  }, [companies, companyState.companyID, companyState.companyName, companyState.company, authState.currentCompanyId])

  // Handle company selection
  const handleSelectCompany = async (companyId: string) => {
    await switchCompany(companyId)
    navigate(getESSDashboardPath(), { replace: true })
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You have access to multiple companies. Select one to continue.
      </Typography>

      {/* Companies List */}
      {companiesForUi.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {companiesForUi.map((company) => {
            const selectedId = companyState.companyID || authState.currentCompanyId
            const isSelected = company.companyID === selectedId

            return (
              <Card
                key={company.companyID}
                sx={{
                  borderRadius: 3,
                  border: isSelected
                    ? `2px solid ${theme.palette.primary.main}`
                    : `1px solid ${theme.palette.divider}`,
                }}
              >
                <CardActionArea
                  onClick={() => handleSelectCompany(company.companyID)}
                  disabled={isSelected}
                >
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: isSelected
                          ? theme.palette.primary.main
                          : theme.palette.grey[200],
                      }}
                    >
                      <BusinessIcon
                        sx={{
                          fontSize: 28,
                          color: isSelected ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                        }}
                      />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {company.companyName}
                      </Typography>
                    </Box>
                    {isSelected && (
                      <CheckIcon sx={{ color: "primary.main", fontSize: 28 }} />
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Box>
      ) : (
        <EmptyState
          icon={<BusinessIcon sx={{ fontSize: 48 }} />}
          title="No Companies"
          description="You don't have access to any companies. Please contact your administrator."
        />
      )}
    </Box>
  )
}

export default ESSCompanySelector