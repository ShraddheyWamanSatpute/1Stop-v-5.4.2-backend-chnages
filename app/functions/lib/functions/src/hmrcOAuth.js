"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeHMRCToken = void 0;
const https_1 = require("firebase-functions/v2/https");
/**
 * Exchange HMRC OAuth authorization code for tokens
 * This must be done server-side because HMRC's token endpoint doesn't support CORS
 */
exports.exchangeHMRCToken = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        // Only allow POST requests
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed. Use POST.' });
            return;
        }
        const { code, clientId, clientSecret, redirectUri, environment = 'sandbox' } = req.body;
        // Debug logging (don't log actual secrets)
        console.log('Exchange request received:', {
            hasCode: !!code,
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasRedirectUri: !!redirectUri,
            clientIdLength: (clientId === null || clientId === void 0 ? void 0 : clientId.length) || 0,
            environment
        });
        // Validate required fields
        if (!code || !clientId || !clientSecret || !redirectUri) {
            const missingFields = [];
            if (!code)
                missingFields.push('code');
            if (!clientId)
                missingFields.push('clientId');
            if (!clientSecret)
                missingFields.push('clientSecret');
            if (!redirectUri)
                missingFields.push('redirectUri');
            console.error('Missing required fields:', missingFields);
            res.status(400).json({
                error: 'Missing required fields',
                message: `Missing required fields: ${missingFields.join(', ')}`,
                required: ['code', 'clientId', 'clientSecret', 'redirectUri'],
                missing: missingFields
            });
            return;
        }
        // Determine base URL based on environment
        const baseUrl = environment === 'sandbox'
            ? 'https://test-api.service.hmrc.gov.uk'
            : 'https://api.service.hmrc.gov.uk';
        const tokenUrl = `${baseUrl}/oauth/token`;
        // Exchange code for tokens
        // HMRC OAuth uses Basic Auth with client_id:client_secret encoded in base64
        // Some OAuth providers require both Basic Auth AND client credentials in the body
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri
            }).toString()
        });
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            }
            catch (_a) {
                errorData = { error: 'unknown_error', error_description: errorText || response.statusText };
            }
            console.error('HMRC token exchange error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                requestInfo: {
                    hasCode: !!code,
                    codeLength: (code === null || code === void 0 ? void 0 : code.length) || 0,
                    redirectUri,
                    environment,
                    clientIdLength: (clientId === null || clientId === void 0 ? void 0 : clientId.length) || 0
                }
            });
            // Provide more helpful error messages
            let errorMessage = errorData.error_description || errorData.error || response.statusText;
            if (errorData.error === 'invalid_grant' || errorMessage.includes('invalid') || errorMessage.includes('code')) {
                errorMessage = `Authorization code is invalid or expired. This usually happens if:
- The code was already used (codes can only be used once)
- The code expired (codes expire quickly, usually within 10 minutes)
- The redirect URI doesn't match exactly what's registered in HMRC Developer Hub
- There's a mismatch between sandbox and production environments

Please try connecting again. Make sure to complete the authorization flow without delay.`;
            }
            res.status(response.status).json({
                error: 'HMRC token exchange failed',
                message: errorMessage,
                details: errorData,
                hint: 'If this error persists, try disconnecting and reconnecting to HMRC.'
            });
            return;
        }
        const tokenData = await response.json();
        // Return tokens to client (client will store them)
        res.status(200).json({
            success: true,
            tokens: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type,
                scope: tokenData.scope
            }
        });
    }
    catch (error) {
        console.error('Error in exchangeHMRCToken:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error occurred'
        });
    }
});
//# sourceMappingURL=hmrcOAuth.js.map