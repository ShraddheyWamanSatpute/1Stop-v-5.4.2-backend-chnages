/**
 * Mobile route: company checklists admin/management UI (reuses desktop page).
 */
"use client"

import React from "react"
import { Box } from "@mui/material"
import { Assignment as AssignmentIcon } from "@mui/icons-material"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import ChecklistsPage from "../../../app/frontend/pages/company/Checklists"
import { EmptyState } from "../components"

const MobileCompanyChecklists: React.FC = () => {
  const { hasPermission } = useCompany()
  if (!hasPermission("mobile", "checklists", "view")) {
    return (
      <Box sx={{ p: 2, pb: 12 }}>
        <EmptyState
          icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
          title="Checklists unavailable"
          description="Your role does not include the mobile company checklists permission. Ask an admin to enable Mobile → Company checklists."
        />
      </Box>
    )
  }
  return <ChecklistsPage mobileESSLayout />
}

export default MobileCompanyChecklists
