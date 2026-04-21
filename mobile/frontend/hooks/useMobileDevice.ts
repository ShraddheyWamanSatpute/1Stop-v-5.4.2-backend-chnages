/**
 * Device Detection Hook
 * Enhanced device detection using userAgent parsing
 * Detects device type (mobile, tablet, desktop), platform, and touch capability
 */

import { useState, useEffect, useMemo } from "react"
import type { ESSDeviceInfo } from "../../backend/interfaces"

/**
 * Comprehensive device type detection from userAgent
 * Returns: "mobile" | "tablet" | "desktop"
 */
const getDeviceType = (userAgent: string, screenWidth: number, screenHeight: number): "mobile" | "tablet" | "desktop" => {
  const ua = userAgent.toLowerCase()
  
  // Check for tablets first (more specific patterns)
  const isTablet = 
    // iPad detection (including iOS 13+ which reports as Mac)
    /ipad/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    // Android tablets
    (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) ||
    // Other tablets
    /tablet|playbook|silk/i.test(ua) ||
    // Windows tablets
    (/windows/i.test(ua) && /touch/i.test(ua)) ||
    // Kindle Fire
    /kindle|silk|kfapwi|kftt|kfot|kfjwa|kfjwi|kfapw|kfapwi|kfsowi|kfthw|kftbw|kfot|kfjwa|kfjwi/i.test(ua)
  
  if (isTablet) {
    return "tablet"
  }
  
  // Check for mobile devices
  const isMobile =
    // iPhone (but not iPad)
    /iphone/i.test(userAgent) ||
    // Android phones
    (/android/i.test(userAgent) && /mobile/i.test(userAgent)) ||
    // Other mobile devices
    /mobile|iphone|ipod|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua) ||
    // Windows Phone
    /windows phone/i.test(ua) ||
    // Older mobile browsers
    /webos|hpwos|bada/i.test(ua) ||
    // Screen size heuristic for mobile (fallback)
    (screenWidth < 768 && screenHeight < 1024)
  
  if (isMobile) {
    return "mobile"
  }
  
  // Default to desktop
  return "desktop"
}

/**
 * Enhanced platform detection
 */
const getPlatform = (userAgent: string): ESSDeviceInfo["platform"] => {
  const ua = userAgent.toLowerCase()
  
  // iOS (including iPad on iOS 13+)
  if (/iphone|ipad|ipod/i.test(userAgent) || 
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios"
  }
  
  // Android
  if (/android/i.test(userAgent)) {
    return "android"
  }
  
  // Windows
  if (/win/i.test(userAgent) || /windows/i.test(ua)) {
    return "windows"
  }
  
  // macOS
  if (/mac/i.test(userAgent) || /macintosh/i.test(ua)) {
    return "macos"
  }
  
  // Linux
  if (/linux/i.test(userAgent) || /x11/i.test(ua)) {
    return "linux"
  }
  
  // Chrome OS
  if (/cros/i.test(userAgent)) {
    return "linux" // Chrome OS is Linux-based
  }
  
  return "unknown"
}

export const useESSDevice = (): ESSDeviceInfo => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  })

  // Update screen size on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const deviceInfo = useMemo((): ESSDeviceInfo => {
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
    const { width, height } = screenSize

    // Get device type using enhanced detection
    const deviceType = getDeviceType(userAgent, width, height)
    
    // Get platform
    const platform = getPlatform(userAgent)
    
    // Touch device detection
    const isTouchDevice = typeof window !== "undefined" && (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - legacy support
      (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
    )

    // Derive boolean flags from device type
    const isMobile = deviceType === "mobile"
    const isTablet = deviceType === "tablet"
    const isDesktop = deviceType === "desktop"

    // Orientation detection
    const orientation: "portrait" | "landscape" = width > height ? "landscape" : "portrait"

    // Log device type for debugging (only in development)
    if (process.env.NODE_ENV === "development" && typeof console !== "undefined" && console.log) {
      console.log(`[ESS Device] Type: ${deviceType}`, {
        platform,
        screenSize: `${width}x${height}`,
        orientation,
        isTouchDevice,
        userAgent: userAgent.substring(0, 100),
      })
    }

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      userAgent,
      screenWidth: width,
      screenHeight: height,
      platform,
      deviceType,
      orientation,
    }
  }, [screenSize])

  return deviceInfo
}

export default useESSDevice