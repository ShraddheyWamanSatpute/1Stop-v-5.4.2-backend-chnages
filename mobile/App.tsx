/**
 * Mobile App Router
 * 
 * Main router component for Mobile portal
 * Sets up all Mobile routes with protected route wrapper
 */

"use client"

import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { MobileProvider } from "./backend/context"
import { ProtectedRoute } from "./frontend/routes"
import Layout from "./frontend/layouts/Layout"

// Pages
import ESSDashboard from "./frontend/pages/Dashboard"
import ESSSchedule from "./frontend/pages/Schedule"
import ESSClock from "./frontend/pages/Clock"
import ESSDocuments from "./frontend/pages/Documents"
import ESSProfile from "./frontend/pages/Profile"
import ESSTimeOff from "./frontend/pages/TimeOff"
import ESSPayslips from "./frontend/pages/Payslips"
import ESSPerformance from "./frontend/pages/Performance"
import ESSEmergencyContacts from "./frontend/pages/EmergencyContacts"
import ESSHolidays from "./frontend/pages/Holidays"
import ESSMobileScheduling from "./frontend/pages/MobileScheduling"
import ESSMobileCompanyChecklists from "./frontend/pages/MobileCompanyChecklists"
import ESSMobileMyChecklist from "./frontend/pages/MobileMyChecklist"
import ESSCompanySelector from "./frontend/pages/CompanySelector"
import Login from "../app/frontend/pages/Login"

const ESSApp: React.FC = () => {
  return (
    <MobileProvider>
      <ProtectedRoute>
        <Routes>
          {/* Public login route - handled by ProtectedRoute redirect if not authenticated */}
          <Route path="Login" element={<Login />} />
          
          {/* Company Selector - Must be first */}
          <Route path="CompanySelect" element={<ESSCompanySelector />} />
          
          {/* Main Mobile Routes with Layout */}
          <Route element={<Layout />}>
            <Route index element={<Navigate to="Dashboard" replace />} />
            <Route path="Dashboard" element={<ESSDashboard />} />
            <Route path="Schedule" element={<ESSSchedule />} />
            <Route path="Clock" element={<ESSClock />} />
            <Route path="Documents" element={<ESSDocuments />} />
            <Route path="Profile" element={<ESSProfile />} />
            <Route path="TimeOff" element={<ESSTimeOff />} />
            <Route path="Payslips" element={<ESSPayslips />} />
            <Route path="Performance" element={<ESSPerformance />} />
            <Route path="EmergencyContacts" element={<ESSEmergencyContacts />} />
            <Route path="Holidays" element={<ESSHolidays />} />
            <Route path="MobileScheduling" element={<ESSMobileScheduling />} />
            <Route path="Checklists" element={<ESSMobileCompanyChecklists />} />
            <Route path="MyChecklist" element={<ESSMobileMyChecklist />} />
          </Route>
          
          {/* Catch all - redirect to dashboard (relative path) */}
          <Route path="*" element={<Navigate to="Dashboard" replace />} />
        </Routes>
      </ProtectedRoute>
    </MobileProvider>
  )
}

export default ESSApp
