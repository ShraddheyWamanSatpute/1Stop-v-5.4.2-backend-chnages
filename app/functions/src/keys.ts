/**
 * Server-side keys for Cloud Functions.
 *
 * IMPORTANT:
 * - Do NOT import app/frontend TS files here (firebase deploy loads this bundle in Node).
 * - Prefer environment variables or CLOUD_RUNTIME_CONFIG (from `firebase functions:config:set`).
 */

export type FunctionKeysShape = {
  stripe: {
    secret: string;
    webhookSecret: string;
  };
  adminBootstrap?: {
    enabled: boolean;
    key: string;
  };
  mail: {
    provider: string;
    from: string;
    user: string;
    pass: string;
    host: string;
    port: number;
    secure: boolean;
  };
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  outlook: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  lightspeedk: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
};

function safeJsonParse(raw: string | undefined): any {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function readBool(name: string): boolean | undefined {
  const v = readEnv(name);
  if (!v) return undefined;
  const s = v.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return undefined;
}

function readNumber(name: string): number | undefined {
  const v = readEnv(name);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const runtimeConfig = safeJsonParse(process.env.CLOUD_RUNTIME_CONFIG) || {};

// Back-compat with the repo's docs (`firebase functions:config:set oauth.google.client_id=...`).
const oauthCfg = runtimeConfig.oauth || {};
const mailCfg = runtimeConfig.mail || {};
const stripeCfg = runtimeConfig.stripe || {};
const adminBootstrapCfg = runtimeConfig.adminBootstrap || runtimeConfig.admin_bootstrap || {};

export const FUNCTION_KEYS: FunctionKeysShape = {
  stripe: {
    secret:
      readEnv("STRIPE_SECRET") ||
      stripeCfg.secret ||
      "",
    webhookSecret:
      readEnv("STRIPE_WEBHOOK_SECRET") ||
      stripeCfg.webhookSecret ||
      stripeCfg.webhook_secret ||
      "",
  },
  adminBootstrap: {
    enabled:
      readBool("ADMIN_BOOTSTRAP_ENABLED") ??
      Boolean(adminBootstrapCfg.enabled),
    key:
      readEnv("ADMIN_BOOTSTRAP_KEY") ||
      adminBootstrapCfg.key ||
      "",
  },
  mail: {
    provider:
      readEnv("MAIL_PROVIDER") ||
      mailCfg.provider ||
      "custom",
    from:
      readEnv("MAIL_FROM") ||
      mailCfg.from ||
      "",
    user:
      readEnv("MAIL_USER") ||
      mailCfg.user ||
      "",
    pass:
      readEnv("MAIL_PASS") ||
      mailCfg.pass ||
      "",
    host:
      readEnv("MAIL_HOST") ||
      mailCfg.host ||
      "",
    port:
      readNumber("MAIL_PORT") ??
      Number(mailCfg.port || 587),
    secure:
      readBool("MAIL_SECURE") ??
      Boolean(mailCfg.secure),
  },
  google: {
    clientId:
      readEnv("GOOGLE_CLIENT_ID") ||
      oauthCfg.google?.client_id ||
      "",
    clientSecret:
      readEnv("GOOGLE_CLIENT_SECRET") ||
      oauthCfg.google?.client_secret ||
      "",
    redirectUri:
      readEnv("GOOGLE_REDIRECT_URI") ||
      oauthCfg.google?.redirect_uri ||
      "",
  },
  outlook: {
    clientId:
      readEnv("OUTLOOK_CLIENT_ID") ||
      readEnv("MICROSOFT_CLIENT_ID") ||
      oauthCfg.microsoft?.client_id ||
      "",
    clientSecret:
      readEnv("OUTLOOK_CLIENT_SECRET") ||
      readEnv("MICROSOFT_CLIENT_SECRET") ||
      oauthCfg.microsoft?.client_secret ||
      "",
    redirectUri:
      readEnv("OUTLOOK_REDIRECT_URI") ||
      readEnv("MICROSOFT_REDIRECT_URI") ||
      oauthCfg.microsoft?.redirect_uri ||
      "",
  },
  lightspeedk: {
    clientId:
      readEnv("LIGHTSPEEDK_CLIENT_ID") ||
      oauthCfg.lightspeedk?.client_id ||
      oauthCfg.lightspeedK?.client_id ||
      "",
    clientSecret:
      readEnv("LIGHTSPEEDK_CLIENT_SECRET") ||
      oauthCfg.lightspeedk?.client_secret ||
      oauthCfg.lightspeedK?.client_secret ||
      "",
    redirectUri:
      readEnv("LIGHTSPEEDK_REDIRECT_URI") ||
      oauthCfg.lightspeedk?.redirect_uri ||
      oauthCfg.lightspeedK?.redirect_uri ||
      "",
  },
};

export default FUNCTION_KEYS;
