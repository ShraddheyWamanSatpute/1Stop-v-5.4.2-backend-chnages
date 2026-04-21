import React from "react"
import { Alert, Box, Button } from "@mui/material"
import { useCompany } from "../../../backend/context/CompanyContext"

interface RequireCompanyContextProps {
  requireSite?: boolean
  children: React.ReactNode
  onFix?: () => void
}

const RequireCompanyContext: React.FC<RequireCompanyContextProps> = ({ requireSite = false, children, onFix }) => {
  const { state } = useCompany()

  const missingCompany = !state.companyID
  const missingSite = requireSite && !state.selectedSiteID

  if (missingCompany || missingSite) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="warning"
          action={
            onFix ? (
              <Button color="inherit" size="small" onClick={onFix}>
                Fix
              </Button>
            ) : undefined
          }
        >
          {!state.companyID
            ? "Please select a company to continue."
            : "Please select a site to continue."}
        </Alert>
      </Box>
    )
  }

  return <>{children}</>
}

export default RequireCompanyContext

