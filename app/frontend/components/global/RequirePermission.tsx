import React from "react"
import { Navigate } from "react-router-dom"
import { Box, CircularProgress, Typography } from "@mui/material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"

type Action = "view" | "edit" | "delete"

type RequirePermissionProps = {
  module: string
  page?: string
  action?: Action
  children: React.ReactNode
  /** Where to redirect if blocked */
  fallbackTo?: string
}

/**
 * Route-level permission guard.
 * - If `page` is omitted, we treat it as "module visible" (any page.view=true inside module).
 * - Otherwise, we use hasPermission(module, page, action).
 */
export default function RequirePermission({
  module,
  page,
  action = "view",
  children,
  fallbackTo = "/Company",
}: RequirePermissionProps) {
  const { state: companyState, getUserPermissions, hasPermission } = useCompany()
  const { state: settingsState } = useSettings()

  // Avoid hard-blocking while permissions are still loading (prevents flicker).
  if (companyState?.loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8 }}>
        <CircularProgress size={48} />
        <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
          Loading...
        </Typography>
      </Box>
    )
  }

  const allowed = (() => {
    // Super-admins always allowed.
    if (Boolean((settingsState.user as any)?.isAdmin)) return true

    // Admin staff: only bypass when support view mode is enabled.
    try {
      const isAdminStaff = Boolean((settingsState.user as any)?.adminStaff?.active)
      const supportViewMode = typeof window !== "undefined" && localStorage.getItem("supportViewMode") === "true"
      if (isAdminStaff && supportViewMode) return true
    } catch {
      // ignore
    }

    if (!page) {
      const effective = getUserPermissions?.()
      const mod = (effective as any)?.modules?.[module]
      if (!mod) return false
      return Object.values(mod).some((p: any) => Boolean(p?.view))
    }
    return hasPermission(module, page, action)
  })()

  if (!allowed) {
    return <Navigate to={fallbackTo} replace />
  }

  return <>{children}</>
}

