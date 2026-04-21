/**
 * Centralized Error Handler for ESS Portal
 * Provides consistent error handling and user-friendly messages
 */

import type { ESSError, ESSErrorCode } from "../interfaces"

// Error code to user-friendly message mapping
const ERROR_MESSAGES: Record<ESSErrorCode, { title: string; message: string; action?: string }> = {
  AUTH_REQUIRED: {
    title: "Login Required",
    message: "Please log in to access the ESS portal.",
    action: "Go to Login",
  },
  WRONG_ROLE: {
    title: "Access Restricted",
    message: "This portal is for staff members only. Managers and administrators should use the main portal.",
    action: "Go to Main Portal",
  },
  NO_EMPLOYEE: {
    title: "Employee Profile Not Found",
    message: "Your account is not linked to an employee profile. Please contact your manager to set up your profile.",
  },
  NO_COMPANY: {
    title: "No Company Access",
    message: "You don't have access to any company. Please contact your administrator.",
  },
  LOCATION_DENIED: {
    title: "Location Access Denied",
    message: "Location access is required to clock in/out. Please enable location in your device settings.",
    action: "Open Settings",
  },
  LOCATION_TIMEOUT: {
    title: "Location Timeout",
    message: "Could not get your location in time. Please try again.",
    action: "Retry",
  },
  LOCATION_UNAVAILABLE: {
    title: "Location Unavailable",
    message: "Your device could not determine your location. Please ensure location services are enabled.",
  },
  CLOCK_FAILED: {
    title: "Clock Action Failed",
    message: "There was an error recording your clock in/out. Please try again.",
    action: "Retry",
  },
  NETWORK_ERROR: {
    title: "Network Error",
    message: "Unable to connect to the server. Please check your internet connection and try again.",
    action: "Retry",
  },
  DATABASE_ERROR: {
    title: "Data Error",
    message: "There was an error loading your data. Please refresh the page.",
    action: "Refresh",
  },
  VALIDATION_ERROR: {
    title: "Invalid Input",
    message: "Please check your input and try again.",
  },
  UNKNOWN_ERROR: {
    title: "Unexpected Error",
    message: "Something went wrong. Please try again or contact support if the problem persists.",
    action: "Retry",
  },
}

/**
 * Create a standardized ESS error
 */
export const createESSError = (
  code: ESSErrorCode,
  customMessage?: string,
  details?: string
): ESSError => {
  const errorInfo = ERROR_MESSAGES[code]

  return {
    code,
    message: customMessage || errorInfo.message,
    details,
    timestamp: Date.now(),
    recoverable: [
      "LOCATION_DENIED",
      "LOCATION_TIMEOUT",
      "CLOCK_FAILED",
      "NETWORK_ERROR",
      "VALIDATION_ERROR",
    ].includes(code),
  }
}

/**
 * Get user-friendly error display info
 */
export const getErrorDisplayInfo = (error: ESSError) => {
  const info = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR

  return {
    title: info.title,
    message: error.message || info.message,
    details: error.details,
    action: info.action,
    recoverable: error.recoverable,
  }
}

/**
 * Log error for debugging (can be extended to external logging)
 */
export const logESSError = (error: ESSError, context?: string) => {
  console.error("[ESS Error]", {
    code: error.code,
    message: error.message,
    details: error.details,
    context,
    timestamp: new Date(error.timestamp).toISOString(),
  })
}

/**
 * Handle Firebase errors and convert to ESS errors
 */
export const handleFirebaseError = (error: any): ESSError => {
  const errorCode = error?.code || ""

  if (errorCode.includes("auth")) {
    return createESSError("AUTH_REQUIRED", error.message)
  }

  if (errorCode.includes("permission") || errorCode.includes("PERMISSION_DENIED")) {
    return createESSError("DATABASE_ERROR", "You don't have permission to access this data")
  }

  if (errorCode.includes("network") || errorCode.includes("unavailable")) {
    return createESSError("NETWORK_ERROR")
  }

  return createESSError("DATABASE_ERROR", error.message)
}
