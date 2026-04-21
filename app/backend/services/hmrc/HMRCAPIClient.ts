/**
 * HMRC API Client
 * Main service for submitting RTI submissions to HMRC
 */

import { HMRCAuthService } from './HMRCAuthService'
import { FraudPreventionService } from './FraudPreventionService'
import { RTIXMLGenerator } from './RTIXMLGenerator'
import {
  FPSSubmissionData,
  EPSSubmissionData,
  EYUSubmissionData,
  FPSSubmissionResult,
  EPSSubmissionResult,
  EYUSubmissionResult,
  HMRCErrorResponse
} from './types'
import { HMRCSettings } from '../../interfaces/Company'

export class HMRCAPIClient {
  private authService: HMRCAuthService
  private fraudPreventionService: FraudPreventionService
  private xmlGenerator: RTIXMLGenerator
  private baseUrl: {
    sandbox: string
    production: string
  }

  constructor() {
    this.authService = new HMRCAuthService()
    this.fraudPreventionService = new FraudPreventionService()
    this.xmlGenerator = new RTIXMLGenerator()
    
    this.baseUrl = {
      sandbox: 'https://test-api.service.hmrc.gov.uk',
      production: 'https://api.service.hmrc.gov.uk'
    }
  }

  /**
   * Submit FPS (Full Payment Submission)
   */
  async submitFPS(
    data: FPSSubmissionData,
    hmrcSettings: HMRCSettings,
    userId?: string
  ): Promise<FPSSubmissionResult> {
    try {
      // 1. Get valid access token
      const accessToken = await this.authService.getValidAccessToken(hmrcSettings)

      // 2. Generate FPS XML
      const xml = this.xmlGenerator.generateFPS(data)

      // 3. Validate XML
      const validation = this.xmlGenerator.validateXML(xml)
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          errors: validation.errors.map(msg => ({
            code: 'VALIDATION_ERROR',
            message: msg
          })),
          submittedAt: Date.now()
        }
      }

      // 4. Get fraud prevention headers
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      // 5. Submit to HMRC
      const baseUrl = this.baseUrl[hmrcSettings.hmrcEnvironment || 'sandbox']
      const employerRef = hmrcSettings.employerPAYEReference.replace('/', '%2F')
      const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions/fps`

      const response = await this.makeAPIRequest({
        method: 'POST',
        url: endpoint,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
          ...fraudHeaders
        },
        body: xml
      })

      // 6. Parse response
      if (response.status === 200 || response.status === 202) {
        return {
          success: true,
          submissionId: response.body?.submissionId || response.headers?.['x-correlation-id'],
          correlationId: response.headers?.['x-correlation-id'],
          status: 'accepted',
          submittedAt: Date.now(),
          responseBody: response.body
        }
      } else {
        const error: HMRCErrorResponse = response.body || {
          code: 'SUBMISSION_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`
        }

        return {
          success: false,
          status: 'rejected',
          errors: [error],
          submittedAt: Date.now(),
          responseBody: response.body
        }
      }
    } catch (error: any) {
      console.error('Error submitting FPS:', error)
      return {
        success: false,
        status: 'rejected',
        errors: [{
          code: 'EXCEPTION',
          message: error.message || 'Unknown error during FPS submission'
        }],
        submittedAt: Date.now()
      }
    }
  }

  /**
   * Submit EPS (Employer Payment Summary)
   */
  async submitEPS(
    data: EPSSubmissionData,
    hmrcSettings: HMRCSettings,
    userId?: string
  ): Promise<EPSSubmissionResult> {
    try {
      // 1. Get valid access token
      const accessToken = await this.authService.getValidAccessToken(hmrcSettings)

      // 2. Generate EPS XML
      const xml = this.xmlGenerator.generateEPS(data)

      // 3. Validate XML
      const validation = this.xmlGenerator.validateXML(xml)
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          errors: validation.errors.map(msg => ({
            code: 'VALIDATION_ERROR',
            message: msg
          })),
          submittedAt: Date.now()
        }
      }

      // 4. Get fraud prevention headers
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      // 5. Submit to HMRC
      const baseUrl = this.baseUrl[hmrcSettings.hmrcEnvironment || 'sandbox']
      const employerRef = hmrcSettings.employerPAYEReference.replace('/', '%2F')
      const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions/eps`

      const response = await this.makeAPIRequest({
        method: 'POST',
        url: endpoint,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
          ...fraudHeaders
        },
        body: xml
      })

      // 6. Parse response
      if (response.status === 200 || response.status === 202) {
        return {
          success: true,
          submissionId: response.body?.submissionId || response.headers?.['x-correlation-id'],
          correlationId: response.headers?.['x-correlation-id'],
          status: 'accepted',
          submittedAt: Date.now(),
          responseBody: response.body
        }
      } else {
        const error: HMRCErrorResponse = response.body || {
          code: 'SUBMISSION_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`
        }

        return {
          success: false,
          status: 'rejected',
          errors: [error],
          submittedAt: Date.now(),
          responseBody: response.body
        }
      }
    } catch (error: any) {
      console.error('Error submitting EPS:', error)
      return {
        success: false,
        status: 'rejected',
        errors: [{
          code: 'EXCEPTION',
          message: error.message || 'Unknown error during EPS submission'
        }],
        submittedAt: Date.now()
      }
    }
  }

  /**
   * Submit EYU (Earlier Year Update)
   */
  async submitEYU(
    data: EYUSubmissionData,
    hmrcSettings: HMRCSettings,
    userId?: string
  ): Promise<EYUSubmissionResult> {
    try {
      // 1. Get valid access token
      const accessToken = await this.authService.getValidAccessToken(hmrcSettings)

      // 2. Generate EYU XML
      const xml = this.xmlGenerator.generateEYU(data)

      // 3. Validate XML
      const validation = this.xmlGenerator.validateXML(xml)
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          errors: validation.errors.map(msg => ({
            code: 'VALIDATION_ERROR',
            message: msg
          })),
          submittedAt: Date.now()
        }
      }

      // 4. Get fraud prevention headers
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      // 5. Submit to HMRC
      const baseUrl = this.baseUrl[hmrcSettings.hmrcEnvironment || 'sandbox']
      const employerRef = hmrcSettings.employerPAYEReference.replace('/', '%2F')
      const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions/eyu`

      const response = await this.makeAPIRequest({
        method: 'POST',
        url: endpoint,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
          ...fraudHeaders
        },
        body: xml
      })

      // 6. Parse response
      if (response.status === 200 || response.status === 202) {
        return {
          success: true,
          submissionId: response.body?.submissionId || response.headers?.['x-correlation-id'],
          correlationId: response.headers?.['x-correlation-id'],
          status: 'accepted',
          submittedAt: Date.now(),
          responseBody: response.body
        }
      } else {
        const error: HMRCErrorResponse = response.body || {
          code: 'SUBMISSION_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`
        }

        return {
          success: false,
          status: 'rejected',
          errors: [error],
          submittedAt: Date.now(),
          responseBody: response.body
        }
      }
    } catch (error: any) {
      console.error('Error submitting EYU:', error)
      return {
        success: false,
        status: 'rejected',
        errors: [{
          code: 'EXCEPTION',
          message: error.message || 'Unknown error during EYU submission'
        }],
        submittedAt: Date.now()
      }
    }
  }

  /**
   * Test API connection - makes a simple GET request to list submissions
   * This registers an API call in HMRC Gateway, required for verification
   */
  async testAPIConnection(
    hmrcSettings: HMRCSettings,
    userId?: string
  ): Promise<{
    success: boolean
    status: number
    message: string
    data?: any
  }> {
    try {
      const accessToken = await this.authService.getValidAccessToken(hmrcSettings)
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      const baseUrl = this.baseUrl[hmrcSettings.hmrcEnvironment || 'sandbox']
      const employerRef = hmrcSettings.employerPAYEReference.replace('/', '%2F')
      
      // Use the list submissions endpoint - this is a simple GET that registers an API call
      // Even if there are no submissions, the call will be registered by HMRC
      const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions`

      const response = await this.makeAPIRequest({
        method: 'GET',
        url: endpoint,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          ...fraudHeaders
        }
      })

      // Success if we get 200 OK (even with empty list)
      if (response.status === 200) {
        return {
          success: true,
          status: response.status,
          message: 'API connection test successful! This call has been registered in HMRC Gateway.',
          data: response.body
        }
      } else {
        return {
          success: false,
          status: response.status,
          message: `API call made but received unexpected status: ${response.status} ${response.statusText}`,
          data: response.body
        }
      }
    } catch (error: any) {
      console.error('Error testing API connection:', error)
      return {
        success: false,
        status: 0,
        message: error.message || 'Unknown error during API connection test'
      }
    }
  }

  /**
   * Check submission status
   */
  async checkSubmissionStatus(
    submissionId: string,
    hmrcSettings: HMRCSettings,
    userId?: string
  ): Promise<any> {
    try {
      const accessToken = await this.authService.getValidAccessToken(hmrcSettings)
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      const baseUrl = this.baseUrl[hmrcSettings.hmrcEnvironment || 'sandbox']
      const employerRef = hmrcSettings.employerPAYEReference.replace('/', '%2F')
      const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions/${submissionId}`

      const response = await this.makeAPIRequest({
        method: 'GET',
        url: endpoint,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          ...fraudHeaders
        }
      })

      return response.body
    } catch (error: any) {
      console.error('Error checking submission status:', error)
      throw error
    }
  }

  /**
   * Make API request (wrapper for fetch with error handling)
   */
  private async makeAPIRequest(options: {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
  }): Promise<{
    status: number
    statusText: string
    body: any
    headers: Record<string, string>
  }> {
    try {
      const response = await fetch(options.url, {
        method: options.method,
        headers: options.headers,
        body: options.body
      })

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      let body: any = {}
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        try {
          body = await response.json()
        } catch {
          body = { raw: await response.text() }
        }
      } else {
        body = { raw: await response.text() }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        body,
        headers
      }
    } catch (error: any) {
      throw new Error(`API Request failed: ${error.message}`)
    }
  }
}

