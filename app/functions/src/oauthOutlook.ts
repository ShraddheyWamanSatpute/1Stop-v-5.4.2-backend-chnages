import { onRequest } from 'firebase-functions/v2/https';
import { firestore } from './admin';
import { FUNCTION_KEYS } from './keys';

export const oauthOutlook = onRequest(async (req, res) => {
  try {
    // Get OAuth credentials from centralized keys
    const clientId = FUNCTION_KEYS.outlook.clientId;
    const redirectUri = FUNCTION_KEYS.outlook.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackOutlook`;

    if (!clientId) {
      res.status(500).send('Missing Outlook OAuth client id (OUTLOOK_CLIENT_ID or MICROSOFT_CLIENT_ID).');
      return;
    }
    
    const companyId = (req.query.company_id as string) || "";
    const siteId = (req.query.site_id as string) || "default";
    const subsiteId = (req.query.subsite_id as string) || "default";
    const userId = (req.query.user_id as string) || "anonymous";
    // Prefer return_url (full absolute URL) over return_path (relative, broken for cross-origin)
    const returnUrl = (req.query.return_url as string) || "";
    const returnPath = (req.query.return_path as string) || "/admin/email";
    const state = Buffer.from(
      JSON.stringify({ provider: "outlook", companyId, siteId, subsiteId, userId, returnUrl, returnPath, ts: Date.now() }),
    ).toString("base64url");

    const scope = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.Send",
    ].join(" ");

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `response_mode=query&` +
      `state=${encodeURIComponent(state)}&` +
      `prompt=consent`;

    res.redirect(authUrl);
  } catch (error) {
    console.error('Outlook OAuth error:', error);
    res.status(500).send('OAuth initialization failed');
  }
});

// Helper: build the final redirect URL from decoded state.
function buildReturnRedirect(decoded: { returnUrl?: string; returnPath?: string } | null, fallback: string): string {
  if (decoded?.returnUrl) return decoded.returnUrl;
  if (decoded?.returnPath) return decoded.returnPath;
  return fallback;
}

export const oauthCallbackOutlook = onRequest(async (req, res) => {
  let redirectBase = '/admin/email'; // ultimate fallback

  try {
    const { code, state, error } = req.query;

    // Attempt an early state decode so even error/missing-param redirects go to the right place.
    let decoded: any = null;
    if (state) {
      try {
        decoded = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"));
        redirectBase = buildReturnRedirect(decoded, redirectBase);
      } catch { /* keep default */ }
    }

    if (error) {
      console.error('Outlook OAuth error:', error);
      res.redirect(`${redirectBase}?error=oauth_failed&message=${encodeURIComponent(error as string)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${redirectBase}?error=missing_parameters`);
      return;
    }

    // Extract context from state (already partially decoded above)
    const companyId: string = decoded?.companyId || (req.query.company_id as string) || '';
    const siteId: string = decoded?.siteId || (req.query.site_id as string) || 'default';
    const subsiteId: string = decoded?.subsiteId || (req.query.subsite_id as string) || 'default';
    const userId: string = decoded?.userId || (req.query.user_id as string) || 'anonymous';

    // Get OAuth credentials
    const clientId = FUNCTION_KEYS.outlook.clientId;
    const clientSecret = FUNCTION_KEYS.outlook.clientSecret;
    const redirectUri = FUNCTION_KEYS.outlook.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackOutlook`;

    if (!clientId || !clientSecret) {
      res.redirect(`${redirectBase}?error=missing_oauth_credentials`);
      return;
    }

    const scope = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.Send",
    ].join(" ");

    // Exchange code for tokens using Microsoft Graph API
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userResponse.json();

    if (!companyId) {
      throw new Error('Company ID is required for OAuth token storage');
    }

    // Store tokens in Firestore with proper company/site/subsite association.
    // IMPORTANT: include userId so tokens are per-account (admin section should not share tokens).
    const tokenDocId = `${companyId}_${siteId}_${subsiteId}_${userId}_outlook`;
    
    await firestore.collection('oauth_tokens').doc(tokenDocId).set({
      provider: 'outlook',
      email: userInfo.mail || userInfo.userPrincipalName,
      tokens: tokens,
      companyId: companyId,
      siteId: siteId,
      subsiteId: subsiteId,
      userId: userId,
      connectedAt: new Date(),
      lastUsed: new Date()
    });

    // Redirect back to the app with success
    const separator = redirectBase.includes('?') ? '&' : '?';
    res.redirect(`${redirectBase}${separator}success=true&provider=outlook&email=${encodeURIComponent(userInfo.mail || userInfo.userPrincipalName || '')}`);
  } catch (error) {
    console.error('Outlook OAuth callback error:', error);
    const separator = redirectBase.includes('?') ? '&' : '?';
    res.redirect(`${redirectBase}${separator}error=oauth_callback_failed`);
  }
});
