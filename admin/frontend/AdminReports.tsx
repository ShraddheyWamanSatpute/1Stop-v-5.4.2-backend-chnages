import React from "react"
import { Box } from "@mui/material"
import BugReportsPanel from "./reports/BugReportsPanel"
import { AdminPageShell } from "./shared/AdminPageShell"

const AdminReports: React.FC = () => {
  return (
    <AdminPageShell title="" sx={{ height: "100%" }}>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <BugReportsPanel />
      </Box>
    </AdminPageShell>
  )
}

export default AdminReports
