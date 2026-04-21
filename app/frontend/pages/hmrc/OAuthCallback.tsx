"use client"

import React, { useEffect, useState, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
} from "@mui/material"
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from "@mui/icons-material"
import { functions, httpsCallable } from "../../../backend/services/Firebase"
import { APP_KEYS } from "../../../config/keys"

const HMRCOAuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState<string>('')
  const isProcessingRef = useRef(false)

  useEffect(() => {
    // Prevent multiple executions
    if (isProcessingRef.current) {
      return
    }

    const handleCallback = async () => {
      isProcessingRef.current = true
      try {
        // Get authorization code from URL
        const code = searchParams.get('code')
        const returnedState = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus('error')
          setMessage(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('No authorization code received. Make sure the redirect URI in HMRC Developer Hub matches exactly: ' + (APP_KEYS.hmrc.redirectUri || `${window.location.origin}/hmrc/callback`))
          return
        }

        // Get stored state
        const storedState = sessionStorage.getItem('hmrc_oauth_state')
        if (!storedState) {
          setStatus('error')
          setMessage('OAuth state not found. Please try connecting again.')
          return
        }

        const stateData = JSON.parse(storedState)
        const { companyId, siteId, subsiteId, environment, state } = stateData

        if (!returnedState || !state || returnedState !== state) {
          sessionStorage.removeItem('hmrc_oauth_state')
          setStatus('error')
          setMessage('OAuth state validation failed. Please reconnect to HMRC and try again.')
          return
        }

        if (!functions) {
          throw new Error('Firebase Functions is not available.')
        }

        const redirectUri = APP_KEYS.hmrc.redirectUri || `${window.location.origin}/hmrc/callback`
        const exchangeTokens = httpsCallable(functions, 'hmrcExchangeCodeAndStoreTokens')

        await exchangeTokens({
          code,
          companyId,
          siteId: siteId || null,
          subsiteId: subsiteId || null,
          redirectUri,
          environment: environment || 'sandbox'
        })

        // Clear stored state
        sessionStorage.removeItem('hmrc_oauth_state')

        setStatus('success')
        setMessage('Successfully connected to HMRC!')

        // Redirect to HR Settings after 3 seconds
        setTimeout(() => {
          navigate('/HR?tab=settings')
        }, 3000)
      } catch (err: any) {
        setStatus('error')
        setMessage(`Failed to complete OAuth: ${err.message}`)
      } finally {
        isProcessingRef.current = false
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          {status === 'processing' && (
            <>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                Connecting to HMRC...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we complete the authorization.
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom color="success.main">
                Successfully Connected!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting to HR Settings...
              </Typography>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom color="error.main">
                Connection Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {message}
              </Alert>
              <Button
                variant="contained"
                onClick={() => navigate('/HR?tab=settings')}
              >
                Go to HR Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default HMRCOAuthCallback

