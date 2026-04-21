"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useSettings } from "../context/SettingsContext"

interface ProtectedRouteProps {
  element: React.ReactElement
  allowedRoles?: ("admin" | "musician" | "customer")[]
  requireAdmin?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, allowedRoles, requireAdmin }) => {
  const { state } = useSettings()
  const location = useLocation()
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  const currentPath = location.pathname || ""
  const lowerPath = currentPath.toLowerCase()
  // IMPORTANT: Admin app uses <BrowserRouter basename="/Admin"> so its internal paths are like "/".
  // We treat this guard as "admin-area" either when requireAdmin is set OR the *real* URL starts with /Admin.
  const isAdminArea =
    Boolean(requireAdmin) ||
    lowerPath.startsWith("/admin") ||
    (typeof window !== "undefined" && window.location.pathname.toLowerCase().startsWith("/admin"))

  const isAdminAuthRoute =
    lowerPath === "/adminlogin" ||
    lowerPath === "/adminregister" ||
    lowerPath === "/resetpassword" ||
    lowerPath.startsWith("/admininvite")

  const isUserAuthRoute =
    lowerPath === "/login" ||
    lowerPath === "/register" ||
    lowerPath === "/resetpassword" ||
    lowerPath.startsWith("/admininvite")

  const currentUser = state.user
  const userRole = currentUser?.companies?.[0]?.role || "user"
  const isAdminUser = Boolean((currentUser as any)?.isAdmin)
  const isAdminStaff = Boolean((currentUser as any)?.adminStaff?.active)
  const accountStatus = String((currentUser as any)?.accountStatus || "").toLowerCase()
  const isTerminated = accountStatus === "terminated"

  useEffect(() => {
    // Wait for auth state to resolve before deciding
    if (state.loading) {
      setRedirectPath(null)
      return
    }

    if (!state.auth.isLoggedIn) {
      // Allow access to the appropriate auth pages (prevents redirect loops).
      if (isAdminArea) {
        if (isAdminAuthRoute) {
          setRedirectPath(null)
          return
        }
        setRedirectPath("/AdminLogin")
        return
      }

      if (isUserAuthRoute) {
        setRedirectPath(null)
        return
      }
      setRedirectPath("/Login")
      return
    }

    if (isTerminated) {
      setRedirectPath("/AccountTerminated")
      return
    }

    // For /admin routes we allow super-admins OR enabled internal admin staff.
    if (requireAdmin && !(isAdminUser || isAdminStaff)) {
      // If they're already on an admin auth page, don't bounce again.
      if (isAdminAuthRoute) {
        setRedirectPath(null)
        return
      }
      setRedirectPath("/AdminLogin")
      return
    }

    if (allowedRoles && !allowedRoles.includes(userRole as "admin" | "musician" | "customer")) {
      setRedirectPath("/Login")
      return
    }

    if (currentPath === "/") {
      // Main app: redirect to company dashboard by default.
      // Admin app (basename="/Admin"): "/" is the admin dashboard, so do NOT redirect.
      setRedirectPath(isAdminArea ? null : "/Company")
    } else {
      setRedirectPath(null)
    }
  }, [
    state.loading,
    state.auth.isLoggedIn,
    userRole,
    allowedRoles,
    currentPath,
    requireAdmin,
    isAdminUser,
    isAdminStaff,
    isTerminated,
    isAdminArea,
    isAdminAuthRoute,
    isUserAuthRoute,
  ])

  // While loading auth state, render nothing (or a small placeholder)
  if (state.loading) {
    return null
  }

  // Render the redirect or the protected element
  if (redirectPath) {
    return <Navigate to={redirectPath} state={{ from: currentPath }} replace />
  }

  return element
}

export default ProtectedRoute
