import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

const OAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state');
          return;
        }

        // Parse state to get context
        const stateParts = state.split('_');
        const provider = stateParts[0];
        const companyId = stateParts[1];
        const siteId = stateParts[2];
        const subsiteId = stateParts[3];
        const userId = stateParts[4];

        // Legacy Lightspeed frontend callback is deprecated in favor of the server-side OAuth flow.
        if (provider === 'lightspeed') {
          setStatus('error');
          setMessage('This Lightspeed callback path is no longer used. Please reconnect from POS settings to use the secure server-side flow.');
          return;
        }

        // Call the backend OAuth callback function to exchange code for tokens
        const projectId = 'stop-test-8025f';
        const region = 'us-central1';
        const fnBase = `https://${region}-${projectId}.cloudfunctions.net`;
        
        const callbackUrl = provider === 'gmail' 
          ? `${fnBase}/oauthCallbackGmail`
          : `${fnBase}/oauthCallbackOutlook`;
        
        // Add the OAuth parameters to the callback URL
        const callbackParams = new URLSearchParams({
          code: code,
          state: state,
          return_path: '/Bookings/Settings',
          company_id: companyId,
          site_id: siteId,
          subsite_id: subsiteId,
          user_id: userId
        });
        
        const fullCallbackUrl = `${callbackUrl}?${callbackParams.toString()}`;
        
        // Redirect to the backend callback function
        window.location.href = fullCallbackUrl;

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('Failed to process OAuth callback');
      }
    };

    handleOAuthCallback();
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      {status === 'processing' && (
        <>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Processing OAuth callback...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we complete the authentication.
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <Alert severity="success" sx={{ mb: 2, maxWidth: 400 }}>
            {message}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            This window will close automatically.
          </Typography>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert severity="error" sx={{ mb: 2, maxWidth: 400 }}>
            {message}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            You can close this window and try again.
          </Typography>
        </>
      )}
    </Box>
  );
};

export default OAuthCallback;
