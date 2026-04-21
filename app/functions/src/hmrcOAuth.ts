import { onRequest } from 'firebase-functions/v2/https';
import { getAuth } from "firebase-admin/auth";
import { db } from "./admin";
import { decryptSecret, encryptSecret, findHMRCLevel, getHMRCEncryptionKey, getHMRCSecretsPath, getHMRCSettingsPath } from "./hmrcSecretsUtil";

interface HMRCTokenExchangeRequest {
  companyId: string;
  siteId?: string | null;
  subsiteId?: string | null;
  code: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
}

interface HMRCTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Exchange HMRC OAuth authorization code for tokens
 * This must be done server-side because HMRC's token endpoint doesn't support CORS
 */
export const exchangeHMRCToken = onRequest({ cors: true }, async (req, res) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

      const authHeader = String(req.headers.authorization || "");
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        res.status(401).json({ error: "Unauthorized", message: "Missing Authorization: Bearer <Firebase ID token>" });
        return;
      }

      const decoded = await getAuth().verifyIdToken(match[1]);
      const uid = decoded.uid;

      const {
        companyId,
        siteId = null,
        subsiteId = null,
        code,
        redirectUri,
        environment = 'sandbox'
      }: HMRCTokenExchangeRequest = req.body;

      // Debug logging (don't log actual secrets)
      console.log('Exchange request received:', {
        companyId,
        hasCode: !!code,
        hasRedirectUri: !!redirectUri,
        environment
      });

      // Validate required fields
      if (!companyId || !code || !redirectUri) {
        const missingFields = [];
        if (!companyId) missingFields.push('companyId');
        if (!code) missingFields.push('code');
        if (!redirectUri) missingFields.push('redirectUri');
        
        console.error('Missing required fields:', missingFields);
        res.status(400).json({ 
          error: 'Missing required fields',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          required: ['companyId', 'code', 'redirectUri'],
          missing: missingFields
        });
        return;
      }

      // Require company membership (owner/admin recommended for OAuth connect)
      const membershipSnap = await db.ref(`users/${uid}/companies/${companyId}`).once("value");
      const isMember = (membershipSnap as any).exists();
      if (!isMember) {
        res.status(403).json({ error: "Forbidden", message: "Not a member of this company" });
        return;
      }

      const foundAt = await findHMRCLevel(companyId, siteId, subsiteId);
      if (!foundAt) {
        res.status(400).json({ error: "HMRC settings not found", message: "Save HMRC settings first." });
        return;
      }

      const settingsPath = getHMRCSettingsPath({ companyId, siteId, subsiteId, level: foundAt });
      const settingsSnap = await db.ref(settingsPath).once("value");
      const settings = (settingsSnap as any).val() || {};
      const clientId = String(settings.hmrcClientId || "").trim() || String(process.env.HMRC_CLIENT_ID || "").trim();

      const encKey = getHMRCEncryptionKey();
      const secretsPath = getHMRCSecretsPath({ companyId, siteId, subsiteId, level: foundAt });
      const secretsSnap = await db.ref(secretsPath).once("value");
      const secrets = (secretsSnap as any).val() || {};
      const clientSecret = String(decryptSecret(secrets.hmrcClientSecret, encKey) || "").trim() || String(process.env.HMRC_CLIENT_SECRET || "").trim();

      if (!clientId || !clientSecret) {
        res.status(400).json({
          error: "HMRC OAuth credentials missing",
          message: "Set hmrcClientId in settings and store client secret via server-side method (or set HMRC_CLIENT_ID/HMRC_CLIENT_SECRET env)."
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
        } catch {
          errorData = { error: 'unknown_error', error_description: errorText || response.statusText };
        }

        console.error('HMRC token exchange error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          requestInfo: {
            hasCode: !!code,
            codeLength: code?.length || 0,
            redirectUri,
            environment,
            clientIdLength: clientId?.length || 0
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

      const tokenData: HMRCTokenResponse = await response.json();

      const expiryTime = Date.now() + (Number(tokenData.expires_in || 0) * 1000);
      await db.ref(secretsPath).update({
        hmrcAccessToken: encryptSecret(tokenData.access_token, encKey),
        hmrcRefreshToken: encryptSecret(tokenData.refresh_token, encKey),
        hmrcTokenExpiry: expiryTime,
        hmrcEnvironment: environment,
        lastHMRCAuthDate: Date.now(),
        updatedAt: Date.now()
      });

      // Do not return tokens to the browser
      res.status(200).json({ success: true, storedAt: foundAt, tokenExpiry: expiryTime });
    } catch (error: any) {
      console.error('Error in exchangeHMRCToken:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred'
      });
    }
});