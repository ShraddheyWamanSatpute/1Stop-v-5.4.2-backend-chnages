import { onRequest } from 'firebase-functions/v2/https';
import { firestore } from './admin';
import { FUNCTION_KEYS } from './keys';

async function getGoogle() {
  // Lazy import to keep deploy-time export analysis fast.
  const mod = await import("googleapis");
  return mod.google;
}

export const oauthGoogle = onRequest(async (req, res) => {
  try {
    // Get OAuth credentials from centralized keys
    const clientId = FUNCTION_KEYS.google.clientId;
    const clientSecret = FUNCTION_KEYS.google.clientSecret;
    const redirectUri = FUNCTION_KEYS.google.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackGmail`;
    
    if (!clientId || !clientSecret) {
      res.status(500).send('Missing Google OAuth credentials (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).');
      return;
    }

    console.log('OAuth Google function called with:', { hasClientId: !!clientId, redirectUri });

    const google = await getGoogle();
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const companyId = (req.query.company_id as string) || "";
    const siteId = (req.query.site_id as string) || "default";
    const subsiteId = (req.query.subsite_id as string) || "default";
    const userId = (req.query.user_id as string) || "anonymous";
    // Prefer return_url (full absolute URL) over return_path (relative, broken for cross-origin)
    const returnUrl = (req.query.return_url as string) || "";
    const returnPath = (req.query.return_path as string) || "/admin/email";
    const state = Buffer.from(
      JSON.stringify({ provider: "gmail", companyId, siteId, subsiteId, userId, returnUrl, returnPath, ts: Date.now() }),
    ).toString("base64url");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'openid',
        'email',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
      state,
      prompt: 'consent'
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Gmail OAuth error:', error);
    res.status(500).send('OAuth initialization failed');
  }
});

// Helper: build the final redirect URL from decoded state.
// Prefers returnUrl (full absolute URL) over returnPath (relative path, legacy).
function buildReturnRedirect(decoded: { returnUrl?: string; returnPath?: string } | null, fallback: string): string {
  if (decoded?.returnUrl) return decoded.returnUrl;
  if (decoded?.returnPath) return decoded.returnPath;
  return fallback;
}

export const oauthCallbackGmail = onRequest(async (req, res) => {
  // We'll determine the redirect target after decoding state.
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
      console.error('Gmail OAuth error:', error);
      res.redirect(`${redirectBase}?error=oauth_failed&message=${encodeURIComponent(error as string)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${redirectBase}?error=missing_parameters`);
      return;
    }

    // Get OAuth credentials
    const clientId = FUNCTION_KEYS.google.clientId;
    const clientSecret = FUNCTION_KEYS.google.clientSecret;
    const redirectUri = FUNCTION_KEYS.google.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackGmail`;

    if (!clientId || !clientSecret) {
      res.redirect(`${redirectBase}?error=missing_oauth_credentials`);
      return;
    }

    const google = await getGoogle();
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Extract context from state (already partially decoded above)
    const companyId: string = decoded?.companyId || (req.query.company_id as string) || '';
    const siteId: string = decoded?.siteId || (req.query.site_id as string) || 'default';
    const subsiteId: string = decoded?.subsiteId || (req.query.subsite_id as string) || 'default';
    const userId: string = decoded?.userId || (req.query.user_id as string) || 'anonymous';

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!companyId) {
      throw new Error('Company ID is required for OAuth token storage');
    }

    // Store tokens in Firestore with proper company/site/subsite association.
    // IMPORTANT: include userId so tokens are per-account (admin section should not share tokens).
    const tokenDocId = `${companyId}_${siteId}_${subsiteId}_${userId}_gmail`;
    
    await firestore.collection('oauth_tokens').doc(tokenDocId).set({
      provider: 'gmail',
      email: userInfo.data.email,
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
    res.redirect(`${redirectBase}${separator}success=true&provider=gmail&email=${encodeURIComponent(userInfo.data.email || '')}`);
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    const separator = redirectBase.includes('?') ? '&' : '?';
    res.redirect(`${redirectBase}${separator}error=oauth_callback_failed`);
  }
});
