import { onRequest } from "firebase-functions/v2/https";
import { firestore } from "./admin";
import { FUNCTION_KEYS } from "./keys";

function resolveProto(req: any): string {
  const xf = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  return xf || req.protocol || "https";
}

export const oauthGoogleCalendar = onRequest(async (req, res) => {
  try {
    // Lazy import to keep deploy-time export analysis fast.
    const { google } = await import("googleapis");
    const clientId = FUNCTION_KEYS.google.clientId;
    const clientSecret = FUNCTION_KEYS.google.clientSecret;
    const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackGoogleCalendar`;

    if (!clientId || !clientSecret) {
      res.status(500).send("Missing Google OAuth credentials (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).");
      return;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const companyId = (req.query.company_id as string) || "";
    const siteId = (req.query.site_id as string) || "default";
    const subsiteId = (req.query.subsite_id as string) || "default";
    const userId = (req.query.user_id as string) || "anonymous";
    const returnPath = (req.query.return_path as string) || "/Admin/Calendar";
    const state = Buffer.from(
      JSON.stringify({
        provider: "google_calendar",
        companyId,
        siteId,
        subsiteId,
        userId,
        returnPath,
        ts: Date.now(),
      }),
    ).toString("base64url");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "https://www.googleapis.com/auth/calendar"],
      state,
      prompt: "consent",
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error("Google Calendar OAuth init error:", error);
    res.status(500).send("OAuth initialization failed");
  }
});

export const oauthCallbackGoogleCalendar = onRequest(async (req, res) => {
  try {
    // Lazy import to keep deploy-time export analysis fast.
    const { google } = await import("googleapis");
    const { code, state, error } = req.query;
    let returnPath = (req.query.return_path as string) || "/Admin/Calendar";

    if (error) {
      console.error("Google Calendar OAuth error:", error);
      res.redirect(`${returnPath}?error=oauth_failed&message=${encodeURIComponent(error as string)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${returnPath}?error=missing_parameters`);
      return;
    }

    const clientId = FUNCTION_KEYS.google.clientId;
    const clientSecret = FUNCTION_KEYS.google.clientSecret;
    const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackGoogleCalendar`;

    if (!clientId || !clientSecret) {
      res.redirect(`${returnPath}?error=missing_oauth_credentials`);
      return;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

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

    if (!companyId) throw new Error("Company ID is required for OAuth token storage");

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || "";

    const tokenDocId = `${companyId}_${siteId || "default"}_${subsiteId || "default"}_google_calendar`;
    await firestore.collection("oauth_tokens").doc(tokenDocId).set({
      provider: "google_calendar",
      email,
      tokens,
      companyId,
      siteId: siteId || "default",
      subsiteId: subsiteId || "default",
      userId: userId || "anonymous",
      connectedAt: new Date(),
      lastUsed: new Date(),
    });

    res.redirect(`${returnPath}?success=true&provider=google_calendar&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error("Google Calendar OAuth callback error:", err);
    const returnPath = (req.query.return_path as string) || "/Admin/Calendar";
    res.redirect(`${returnPath}?error=oauth_callback_failed`);
  }
});

