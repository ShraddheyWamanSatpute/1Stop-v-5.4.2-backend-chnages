/**
 * Device Detection Utility
 * 
 * Detects device type to route users appropriately:
 * - Mobile phones -> /Mobile
 * - PC/Tablets -> / (root)
 */

/**
 * Detects if the device is a mobile phone (not tablet)
 * Returns true for mobile phones, false for tablets/desktops
 */
export const isMobilePhone = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false
  }

  const userAgent = navigator.userAgent.toLowerCase()
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight

  // Check for tablets first (more specific patterns)
  const isTablet =
    // iPad detection (including iOS 13+ which reports as Mac)
    /ipad/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    // Android tablets
    (/android/i.test(navigator.userAgent) && !/mobile/i.test(navigator.userAgent)) ||
    // Other tablets
    /tablet|playbook|silk/i.test(userAgent) ||
    // Windows tablets
    (/windows/i.test(userAgent) && /touch/i.test(userAgent)) ||
    // Kindle Fire
    /kindle|silk|kfapwi|kftt|kfot|kfjwa|kfjwi|kfapw|kfapwi|kfsowi|kfthw|kftbw|kfot|kfjwa|kfjwi/i.test(userAgent) ||
    // Screen size heuristic for tablets (larger screens)
    (screenWidth >= 768 && screenWidth < 1024)

  if (isTablet) {
    return false
  }

  // Check for mobile phones
  const isMobile =
    // iPhone (but not iPad)
    /iphone/i.test(navigator.userAgent) ||
    // Android phones
    (/android/i.test(navigator.userAgent) && /mobile/i.test(navigator.userAgent)) ||
    // Other mobile devices
    /mobile|iphone|ipod|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent) ||
    // Windows Phone
    /windows phone/i.test(userAgent) ||
    // Older mobile browsers
    /webos|hpwos|bada/i.test(userAgent) ||
    // Screen size heuristic for mobile (small screens)
    (screenWidth < 768 && screenHeight < 1024)

  return isMobile
}

/**
 * Gets the appropriate route based on device type
 * - Mobile phones -> "/Mobile"
 * - PC/Tablets -> "/" (root)
 */
export const getDeviceRoute = (): string => {
  return isMobilePhone() ? "/Mobile" : "/"
}

/**
 * Hook-like function to detect device type
 * Can be used in components that need device detection
 */
export const useDeviceDetection = () => {
  if (typeof window === "undefined") {
    return {
      isMobilePhone: false,
      route: "/",
    }
  }

  const mobile = isMobilePhone()
  return {
    isMobilePhone: mobile,
    route: mobile ? "/Mobile" : "/",
  }
}

