/**
 * HMRC OAuth 2.0 Authentication Service
 * Handles authentication with HMRC Developer Hub
 */

import { HMRCTokenResponse, HMRCErrorResponse } from './types'
import { HMRCSettings } from '../../interfaces/Company'

export class HMRCAuthService {
  private baseUrl: {
    sandbox: string
    production: string
  }

  constructor() {
    this.baseUrl = {
      sandbox: 'https://test-api.service.hmrc.gov.uk',
      production: 'https://api.service.hmrc.gov.uk'
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    scope: string = 'write:paye-employer-paye-employer',
    environment: 'sandbox' | 'production' = 'sandbox',
    state?: string
  ): string {
    const baseUrl = environment === 'sandbox' 
      ? 'https://test-api.service.hmrc.gov.uk'
      : 'https://api.service.hmrc.gov.uk'

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: state || this.generateState()
    })

    return `${baseUrl}/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<HMRCTokenResponse> {
    const baseUrl = this.baseUrl[environment]
    const tokenUrl = `${baseUrl}/oauth/token`

    const credentials = this.base64Encode(`${clientId}:${clientSecret}`)

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        }).toString()
      })

      if (!response.ok) {
        const error: HMRCErrorResponse = await response.json()
        throw new Error(`HMRC Auth Error: ${error.message || response.statusText}`)
      }

      const tokenData: HMRCTokenResponse = await response.json()
      return tokenData
    } catch (error) {
      console.error('Error exchanging code for token:', error)
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<HMRCTokenResponse> {
    const baseUrl = this.baseUrl[environment]
    const tokenUrl = `${baseUrl}/oauth/token`

    const credentials = this.base64Encode(`${clientId}:${clientSecret}`)

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }).toString()
      })

      if (!response.ok) {
        const error: HMRCErrorResponse = await response.json()
        throw new Error(`HMRC Refresh Error: ${error.message || response.statusText}`)
      }

      const tokenData: HMRCTokenResponse = await response.json()
      return tokenData
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(tokenExpiry?: number, bufferSeconds: number = 300): boolean {
    if (!tokenExpiry) return true
    const now = Math.floor(Date.now() / 1000)
    return tokenExpiry <= (now + bufferSeconds)
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(
    hmrcSettings: HMRCSettings,
    refreshCallback?: (newToken: HMRCTokenResponse) => Promise<void>
  ): Promise<string> {
    // Check if we have a valid token
    if (
      hmrcSettings.hmrcAccessToken &&
      hmrcSettings.hmrcTokenExpiry &&
      !this.isTokenExpired(hmrcSettings.hmrcTokenExpiry)
    ) {
      return hmrcSettings.hmrcAccessToken
    }

    // Need to refresh
    if (!hmrcSettings.hmrcRefreshToken || !hmrcSettings.hmrcClientId || !hmrcSettings.hmrcClientSecret) {
      throw new Error('HMRC credentials not configured. Please complete OAuth setup.')
    }

    const newToken = await this.refreshAccessToken(
      hmrcSettings.hmrcRefreshToken,
      hmrcSettings.hmrcClientId,
      hmrcSettings.hmrcClientSecret,
      hmrcSettings.hmrcEnvironment
    )

    // Update settings if callback provided
    if (refreshCallback) {
      await refreshCallback(newToken)
    }

    return newToken.access_token
  }

  /**
   * Generate random state for OAuth flow
   */
  private generateState(): string {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(32)
      globalThis.crypto.getRandomValues(bytes)
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
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

