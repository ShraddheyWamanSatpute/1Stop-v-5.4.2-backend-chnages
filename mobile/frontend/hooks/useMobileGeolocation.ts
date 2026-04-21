/**
 * Geolocation Hook with Configurable Requirement
 * Respects company setting: clockInRequiresLocation
 */

import { useState, useCallback } from "react"
import type { ESSLocation, ESSError } from "../../backend/interfaces"

interface GeolocationState {
  location: ESSLocation | null
  isLoading: boolean
  error: ESSError | null
  permissionStatus: "prompt" | "granted" | "denied" | "unavailable"
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export const useESSGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    isLoading: false,
    error: null,
    permissionStatus: "prompt",
  })

  // Check if geolocation is available
  const isAvailable = typeof navigator !== "undefined" && "geolocation" in navigator

  // Request current location
  const requestLocation = useCallback(async (
    options: GeolocationOptions = {}
  ): Promise<ESSLocation | null> => {
    if (!isAvailable) {
      setState((prev) => ({
        ...prev,
        error: {
          code: "LOCATION_UNAVAILABLE",
          message: "Geolocation is not supported by this device",
          timestamp: Date.now(),
          recoverable: false,
        },
        permissionStatus: "unavailable",
      }))
      return null
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: options.enableHighAccuracy ?? true,
            timeout: options.timeout ?? 20000, // Increased default to 20 seconds
            maximumAge: options.maximumAge ?? 60000, // Accept location up to 1 minute old by default
          }
        )
      })

      const location: ESSLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      }

      setState({
        location,
        isLoading: false,
        error: null,
        permissionStatus: "granted",
      })

      return location
    } catch (error: any) {
      let essError: ESSError

      switch (error.code) {
        case 1: // PERMISSION_DENIED
          essError = {
            code: "LOCATION_DENIED",
            message: "Location permission was denied",
            details: "Please enable location access in your device settings to clock in/out",
            timestamp: Date.now(),
            recoverable: true,
          }
          setState((prev) => ({ ...prev, permissionStatus: "denied" }))
          break
        case 2: // POSITION_UNAVAILABLE
          essError = {
            code: "LOCATION_UNAVAILABLE",
            message: "Location information is unavailable",
            details: "Your device could not determine your location. Please try again.",
            timestamp: Date.now(),
            recoverable: true,
          }
          break
        case 3: // TIMEOUT
          essError = {
            code: "LOCATION_TIMEOUT",
            message: "Location request timed out",
            details: "Getting your location took too long. Please ensure GPS is enabled and try again, or move to an area with better signal.",
            timestamp: Date.now(),
            recoverable: true,
          }
          break
        default:
          essError = {
            code: "UNKNOWN_ERROR",
            message: "An unknown error occurred while getting location",
            timestamp: Date.now(),
            recoverable: true,
          }
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: essError,
      }))

      return null
    }
  }, [isAvailable])

  // Check permission status
  const checkPermission = useCallback(async (): Promise<PermissionState | null> => {
    if (!isAvailable) return null

    try {
      const result = await navigator.permissions.query({ name: "geolocation" })
      setState((prev) => ({
        ...prev,
        permissionStatus: result.state as "prompt" | "granted" | "denied",
      }))
      return result.state
    } catch {
      // Permissions API not supported
      return null
    }
  }, [isAvailable])

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    isAvailable,
    requestLocation,
    checkPermission,
    clearError,
  }
}

export default useESSGeolocation

