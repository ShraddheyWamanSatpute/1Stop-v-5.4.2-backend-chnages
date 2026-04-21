/**
 * HMRC Fraud Prevention Headers Service
 * Generates mandatory fraud prevention headers for HMRC API calls
 * 
 * Required since April 2021 for all HMRC API submissions
 */

import { FraudPreventionHeaders } from './types'

export class FraudPreventionService {
  private deviceId: string

  constructor() {
    // Generate or retrieve persistent device ID
    this.deviceId = this.getOrCreateDeviceId()
  }

  /**
   * Generate all required fraud prevention headers
   */
  generateHeaders(userId?: string): FraudPreventionHeaders {
    return {
      'Gov-Client-Connection-Method': this.getConnectionMethod(),
      'Gov-Client-Device-ID': this.deviceId,
      'Gov-Client-User-IDs': this.getUserIds(userId),
      'Gov-Client-Timezone': this.getTimezone(),
      'Gov-Client-Local-IPs': this.getLocalIPs(),
      'Gov-Client-Screens': this.getScreenInfo(),
      'Gov-Client-Window-Size': this.getWindowSize(),
      'Gov-Client-Browser-Plugins': this.getBrowserPlugins(),
      'Gov-Client-Browser-JS-User-Agent': this.getBrowserUserAgent(),
      'Gov-Client-Browser-Do-Not-Track': this.getDoNotTrack(),
      'Gov-Client-Multi-Factor': this.getMultiFactor()
    }
  }

  /**
   * Get or create persistent device ID
   */
  private getOrCreateDeviceId(): string {
    // Try to get from localStorage (browser) or generate new
    if (typeof window !== 'undefined' && window.localStorage) {
      let deviceId = localStorage.getItem('hmrc_device_id')
      if (!deviceId) {
        deviceId = this.generateDeviceId()
        localStorage.setItem('hmrc_device_id', deviceId)
      }
      return deviceId
    }

    // Server-side: generate based on machine characteristics
    return this.generateDeviceId()
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Get connection method
   * Options: WEB_APP_VIA_SERVER, DESKTOP_APP_DIRECT, MOBILE_APP_DIRECT, etc.
   */
  private getConnectionMethod(): string {
    // For web application via server (most common)
    return 'WEB_APP_VIA_SERVER'
  }

  /**
   * Get user IDs (base64 encoded JSON array)
   */
  private getUserIds(userId?: string): string {
    const userIds: string[] = []
    
    if (userId) {
      userIds.push(userId)
    }

    // Encode as base64 JSON
    const json = JSON.stringify(userIds)
    return this.base64Encode(json)
  }

  /**
   * Get timezone (UTC offset in format: UTC+00:00)
   */
  private getTimezone(): string {
    const offset = -new Date().getTimezoneOffset()
    const hours = Math.floor(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    const sign = offset >= 0 ? '+' : '-'
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  /**
   * Get local IP addresses (base64 encoded JSON array)
   * Note: In browser, this is limited. Use empty array if not available.
   */
  private getLocalIPs(): string {
    // In browser, we can't get local IPs directly
    // Return empty array encoded as base64
    const ips: string[] = []
    const json = JSON.stringify(ips)
    return this.base64Encode(json)
  }

  /**
   * Get screen information (base64 encoded JSON)
   * Format: {width: number, height: number, scalingFactor: number, colourDepth: number}
   */
  private getScreenInfo(): string {
    let screenData = {
      width: 1920,
      height: 1080,
      scalingFactor: 1,
      colourDepth: 24
    }

    if (typeof window !== 'undefined' && window.screen) {
      screenData = {
        width: window.screen.width,
        height: window.screen.height,
        scalingFactor: window.devicePixelRatio || 1,
        colourDepth: window.screen.colorDepth || 24
      }
    }

    const json = JSON.stringify(screenData)
    return this.base64Encode(json)
  }

  /**
   * Get window size (base64 encoded JSON)
   * Format: {width: number, height: number}
   */
  private getWindowSize(): string {
    let windowData = {
      width: 1920,
      height: 1080
    }

    if (typeof window !== 'undefined') {
      windowData = {
        width: window.innerWidth || 1920,
        height: window.innerHeight || 1080
      }
    }

    const json = JSON.stringify(windowData)
    return this.base64Encode(json)
  }

  /**
   * Get browser plugins (base64 encoded JSON array)
   */
  private getBrowserPlugins(): string {
    const plugins: string[] = []

    if (typeof navigator !== 'undefined' && navigator.plugins) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name)
      }
    }

    const json = JSON.stringify(plugins)
    return this.base64Encode(json)
  }

  /**
   * Get browser user agent (from JavaScript)
   */
  private getBrowserUserAgent(): string {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return navigator.userAgent
    }
    return 'Unknown'
  }

  /**
   * Get Do Not Track setting
   */
  private getDoNotTrack(): string {
    if (typeof navigator !== 'undefined' && navigator.doNotTrack !== undefined) {
      return navigator.doNotTrack === '1' ? 'true' : 'false'
    }
    return 'false'
  }

  /**
   * Get multi-factor authentication status
   * Format: base64 encoded JSON: {type: string, timestamp: string}
   */
  private getMultiFactor(): string {
    const mfaData = {
      type: 'NONE', // Options: NONE, SMS, EMAIL, AUTHENTICATOR_APP, etc.
      timestamp: new Date().toISOString()
    }

    const json = JSON.stringify(mfaData)
    return this.base64Encode(json)
  }

  /**
   * Base64 encode (works in both browser and Node.js)
   */
  private base64Encode(str: string): string {
    if (typeof window !== 'undefined' && window.btoa) {
      // Browser
      return window.btoa(unescape(encodeURIComponent(str)))
    } else if (typeof Buffer !== 'undefined') {
      // Node.js
      return Buffer.from(str).toString('base64')
    } else {
      // Fallback: simple base64 implementation
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      let result = ''
      let i = 0
      while (i < str.length) {
        const a = str.charCodeAt(i++)
        const b = i < str.length ? str.charCodeAt(i++) : 0
        const c = i < str.length ? str.charCodeAt(i++) : 0
        const bitmap = (a << 16) | (b << 8) | c
        result += chars.charAt((bitmap >> 18) & 63)
        result += chars.charAt((bitmap >> 12) & 63)
        result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '='
        result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '='
      }
      return result
    }
  }
}

