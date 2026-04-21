import { onRequest } from "firebase-functions/v2/https";
import { firestore } from "./admin";
import { FUNCTION_KEYS } from "./keys";

function resolveProto(req: any): string {
  const xf = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  return xf || req.protocol || "https";
}

export const oauthOutlookCalendar = onRequest(async (req, res) => {
  try {
    const clientId = FUNCTION_KEYS.outlook.clientId;
    const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackOutlookCalendar`;

    if (!clientId) {
      res.status(500).send("Missing Outlook OAuth client id (OUTLOOK_CLIENT_ID or MICROSOFT_CLIENT_ID).");
      return;
    }

    const companyId = (req.query.company_id as string) || "";
    const siteId = (req.query.site_id as string) || "default";
    const subsiteId = (req.query.subsite_id as string) || "default";
    const userId = (req.query.user_id as string) || "anonymous";
    const returnPath = (req.query.return_path as string) || "/Admin/Calendar";
    const state = Buffer.from(
      JSON.stringify({
        provider: "outlook_calendar",
        companyId,
        siteId,
        subsiteId,
        userId,
        returnPath,
        ts: Date.now(),
      }),
    ).toString("base64url");

    const scope = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
    ].join(" ");

    const authUrl =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `response_mode=query&` +
      `state=${encodeURIComponent(state)}&` +
      `prompt=consent`;

    res.redirect(authUrl);
  } catch (error) {
    console.error("Outlook Calendar OAuth init error:", error);
    res.status(500).send("OAuth initialization failed");
  }
});

export const oauthCallbackOutlookCalendar = onRequest(async (req, res) => {
  try {
    const { code, state, error } = req.query;
    let returnPath = (req.query.return_path as string) || "/Admin/Calendar";

    if (error) {
      console.error("Outlook Calendar OAuth error:", error);
      res.redirect(`${returnPath}?error=oauth_failed&message=${encodeURIComponent(error as string)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${returnPath}?error=missing_parameters`);
      return;
    }

    let companyId: string | undefined;
    let siteId: string | undefined;
    let subsiteId: string | undefined;
    let userId: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"));
      companyId = decoded.companyId;
      siteId = decoded.siteId;
      subsiteId = decoded.subsiteId;
      userId = decoded.userId;
      if (decoded.returnPath) returnPath = decoded.returnPath;
    } catch {
      companyId = req.query.company_id as string;
      siteId = req.query.site_id as string;
      subsiteId = req.query.subsite_id as string;
      userId = req.query.user_id as string;
    }

    const clientId = FUNCTION_KEYS.outlook.clientId;
    const clientSecret = FUNCTION_KEYS.outlook.clientSecret;
    const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackOutlookCalendar`;

    if (!clientId || !clientSecret) {
      res.redirect(`${returnPath}?error=missing_oauth_credentials`);
      return;
    }

    const scope = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
    ].join(" ");

    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope,
      }),
    });

    if (!tokenResponse.ok) throw new Error("Failed to exchange code for tokens");
    const tokens = await tokenResponse.json();

    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userResponse.ok) throw new Error("Failed to get user info");
    const userInfo = await userResponse.json();

    if (!companyId) throw new Error("Company ID is required for OAuth token storage");

    const email = userInfo.mail || userInfo.userPrincipalName || "";
    const tokenDocId = `${companyId}_${siteId || "default"}_${subsiteId || "default"}_outlook_calendar`;

    await firestore.collection("oauth_tokens").doc(tokenDocId).set({
      provider: "outlook_calendar",
      email,
      tokens,
      companyId,
      siteId: siteId || "default",
      subsiteId: subsiteId || "default",
      userId: userId || "anonymous",
      connectedAt: new Date(),
      lastUsed: new Date(),
    });

    res.redirect(`${returnPath}?success=true&provider=outlook_calendar&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error("Outlook Calendar OAuth callback error:", err);
    const returnPath = (req.query.return_path as string) || "/Admin/Calendar";
    res.redirect(`${returnPath}?error=oauth_callback_failed`);
  }
});

