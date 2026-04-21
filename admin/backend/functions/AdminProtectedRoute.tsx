"use client"

import type React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { GlobalLoader } from "../../../app/backend/shared/GlobalLoader"
import { useAdmin } from "../context/AdminContext"

interface AdminProtectedRouteProps {
  element: React.ReactElement
}

// Guard for Admin app only. Uses AdminContext (not SettingsContext).
const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ element }) => {
  const { state } = useAdmin()
  const location = useLocation()

  const currentPath = location.pathname || "/"
  const lowerPath = currentPath.toLowerCase()
  const isAdminAuthRoute =
    lowerPath === "/adminlogin" ||
    lowerPath === "/adminregister" ||
    lowerPath === "/resetpassword" ||
    lowerPath.startsWith("/admininvite")

  if (state.loading) return <GlobalLoader />

  if (!state.isLoggedIn) {
    // If this guard is ever used on auth routes, don't bounce.
    if (isAdminAuthRoute) return element
    return <Navigate to="/AdminLogin" state={{ from: currentPath }} replace />
  }

  const user: any = state.user
  const hasAdminAccess = Boolean(user?.isAdmin) || Boolean(user?.adminStaff?.active)
  if (!hasAdminAccess) {
    return <Navigate to="/AdminLogin" replace />
  }

  return element
}

export default AdminProtectedRoute

