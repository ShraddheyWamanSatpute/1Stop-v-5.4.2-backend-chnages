/**
 * Lightspeed Restaurant (K-Series) OAuth 2.0 Authentication Service
 * Handles OAuth 2.0 authorization-code flow for Lightspeed Restaurant K-Series APIs
 */

import { POSOAuthTokenResponse, POSOAuthErrorResponse } from '../types'
import { LightspeedSettings } from '../types'

export class LightspeedAuthService {
  private getBaseUrl(environment: LightspeedSettings['environment'] = 'production'): string {
    return environment === 'trial' ? 'https://api.trial.lsk.lightspeed.app' : 'https://api.lsk.lightspeed.app'
  }

  private toBase64(input: string): string {
    // Browser
    if (typeof btoa !== 'undefined') return btoa(input)
    // Node
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = (globalThis as any)?.Buffer
    if (buf?.from) return buf.from(input, 'utf-8').toString('base64')
    // Last-resort fallback (not cryptographically important, but required for auth header)
    return input
  }
  
  /**
   * Generate OAuth authorization URL
   * @param clientId - Your Lightspeed application client ID
   * @param redirectUri - Callback URL (must match app registration)
   * @param scope - Space-delimited list of scopes
   * @param state - CSRF protection state token (min 8 characters)
   */
  getAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    scope: string = 'orders-api items',
    state?: string,
    environment: LightspeedSettings['environment'] = 'production'
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: state || this.generateState()
    })

    return `${this.getBaseUrl(environment)}/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from callback
   * @param clientId - Your Lightspeed application client ID
   * @param clientSecret - Your Lightspeed application client secret
   * @param redirectUri - Must match the redirect URI used in authorization
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    environment: LightspeedSettings['environment'] = 'production'
  ): Promise<POSOAuthTokenResponse> {
    const baseUrl = this.getBaseUrl(environment)
    const tokenUrl = `${baseUrl}/oauth/token?${new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }).toString()}`

    try {
      const authHeader = `Basic ${this.toBase64(`${clientId}:${clientSecret}`)}`

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error: POSOAuthErrorResponse
        
        try {
          error = JSON.parse(errorText)
        } catch {
          error = {
            error: 'unknown_error',
            error_description: errorText || response.statusText
          }
        }
        
        throw new Error(
          `Lightspeed Auth Error: ${error.error_description || error.error || response.statusText}`
        )
      }

      const tokenData: POSOAuthTokenResponse = await response.json()
      return tokenData
    } catch (error) {
      console.error('Error exchanging code for token:', error)
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token from previous token response
   * @param clientId - Your Lightspeed application client ID
   * @param clientSecret - Your Lightspeed application client secret
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    environment: LightspeedSettings['environment'] = 'production'
  ): Promise<POSOAuthTokenResponse> {
    const tokenUrl = `${this.getBaseUrl(environment)}/oauth/token`

    try {
      const formData = new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })

      const authHeader = `Basic ${this.toBase64(`${clientId}:${clientSecret}`)}`

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData.toString()
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error: POSOAuthErrorResponse
        
        try {
          error = JSON.parse(errorText)
        } catch {
          error = {
            error: 'unknown_error',
            error_description: errorText || response.statusText
          }
        }
        
        throw new Error(
          `Lightspeed Refresh Error: ${error.error_description || error.error || response.statusText}`
        )
      }

      const tokenData: POSOAuthTokenResponse = await response.json()
      return tokenData
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

  /**
   * Check if token is expired or about to expire
   * @param tokenExpiry - Unix timestamp in seconds when token expires
   * @param bufferSeconds - Buffer time in seconds before expiry (default: 300 = 5 minutes)
   */
  isTokenExpired(tokenExpiry?: number, bufferSeconds: number = 300): boolean {
    if (!tokenExpiry) return true
    const now = Math.floor(Date.now() / 1000)
    return tokenExpiry <= (now + bufferSeconds)
  }

  /**
   * Get valid access token (refresh if needed)
   * @param settings - Lightspeed settings containing tokens
   * @param refreshCallback - Optional callback to save new tokens after refresh
   */
  async getValidAccessToken(
    settings: LightspeedSettings,
    refreshCallback?: (newToken: POSOAuthTokenResponse) => Promise<void>
  ): Promise<string> {
    // Check if we have a valid token
    if (
      settings.accessToken &&
      settings.tokenExpiry &&
      !this.isTokenExpired(settings.tokenExpiry)
    ) {
      return settings.accessToken
    }

    // Need to refresh
    if (!settings.refreshToken || !settings.clientId || !settings.clientSecret) {
      throw new Error('Lightspeed credentials not configured. Please complete OAuth setup.')
    }

    const newToken = await this.refreshAccessToken(
      settings.refreshToken,
      settings.clientId,
      settings.clientSecret,
      settings.environment || 'production'
    )

    // Update in-memory settings so subsequent calls use the rotated tokens.
    // Persist via refreshCallback where possible.
    const nowSec = Math.floor(Date.now() / 1000)
    settings.accessToken = newToken.access_token
    settings.refreshToken = newToken.refresh_token
    settings.tokenType = newToken.token_type
    settings.tokenExpiry =
      typeof newToken.expires === 'number' ? newToken.expires : nowSec + (newToken.expires_in || 3600)

    // Update settings if callback provided
    if (refreshCallback) {
      await refreshCallback(newToken)
    }

    return newToken.access_token
  }

  /**
   * Generate random state token for CSRF protection (min 8 characters)
   */
  generateState(): string {
    // Generate a secure random state token (16+ characters)
    const randomBytes = new Uint8Array(16)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes)
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < randomBytes.length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256)
      }
    }
    
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Validate state token (check if it matches and hasn't expired)
   */
  validateState(
    receivedState: string,
    storedState?: string,
    stateExpiry?: number
  ): boolean {
    if (!storedState || receivedState !== storedState) {
      return false
    }

    if (stateExpiry && Date.now() > stateExpiry * 1000) {
      return false // State expired (expiry is in seconds, convert to ms)
    }

    return true
  }
}

