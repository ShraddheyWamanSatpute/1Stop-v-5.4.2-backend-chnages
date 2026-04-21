/**
 * Device Router Component
 * 
 * Routes users based on device type:
 * - Mobile phones -> /Mobile
 * - PC/Tablets -> /Company (main app entry point)
 */

"use client"

import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { isMobilePhone } from "../utils/deviceDetection"

const DeviceRouter: React.FC = () => {
  const location = useLocation()
  
  // If already on /Mobile or /ESS, don't redirect
  if (location.pathname.startsWith("/Mobile") || location.pathname.startsWith("/ESS")) {
    return null
  }
  
  // Redirect based on device type
  if (isMobilePhone()) {
    return <Navigate to="/Mobile" replace />
  }
  
  // Desktop/Tablet: redirect to Company (main app entry point)
  return <Navigate to="/Company" replace />
}

export default DeviceRouter

