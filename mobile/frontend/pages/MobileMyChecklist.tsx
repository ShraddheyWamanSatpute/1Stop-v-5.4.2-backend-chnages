/**
 * Mobile route: staff “My checklists” (reuses desktop page).
 */
"use client"

import React from "react"
import { Box } from "@mui/material"
import { AssignmentTurnedIn as MyChecklistIcon } from "@mui/icons-material"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import MyChecklistPage from "../../../app/frontend/pages/company/MyChecklist"
import { EmptyState } from "../components"

const MobileMyChecklist: React.FC = () => {
  const { hasPermission } = useCompany()
  if (!hasPermission("mobile", "myChecklists", "view")) {
    return (
      <Box sx={{ p: 2, pb: 12 }}>
        <EmptyState
          icon={<MyChecklistIcon sx={{ fontSize: 48 }} />}
          title="My checklists unavailable"
          description="Your role does not include mobile My checklists. Ask an admin to enable Mobile → My checklists."
        />
      </Box>
    )
  }
  return <MyChecklistPage mobileESSLayout />
}

export default MobileMyChecklist
