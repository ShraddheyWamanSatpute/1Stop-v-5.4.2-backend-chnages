"use strict";
/**
 * Server-side keys for Cloud Functions.
 *
 * IMPORTANT:
 * - Do NOT import app/frontend TS files here (firebase deploy loads this bundle in Node).
 * - Prefer environment variables or CLOUD_RUNTIME_CONFIG (from `firebase functions:config:set`).
 */
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FUNCTION_KEYS = void 0;
function safeJsonParse(raw) {
    if (!raw)
        return undefined;
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        return undefined;
    }
}
function readEnv(name) {
    const v = process.env[name];
    if (typeof v !== "string")
        return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
}
function readBool(name) {
    const v = readEnv(name);
    if (!v)
        return undefined;
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(s))
        return true;
    if (["0", "false", "no", "n", "off"].includes(s))
        return false;
    return undefined;
}
function readNumber(name) {
    const v = readEnv(name);
    if (!v)
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
const runtimeConfig = safeJsonParse(process.env.CLOUD_RUNTIME_CONFIG) || {};
// Back-compat with the repo's docs (`firebase functions:config:set oauth.google.client_id=...`).
const oauthCfg = runtimeConfig.oauth || {};
const mailCfg = runtimeConfig.mail || {};
const stripeCfg = runtimeConfig.stripe || {};
const adminBootstrapCfg = runtimeConfig.adminBootstrap || runtimeConfig.admin_bootstrap || {};
exports.FUNCTION_KEYS = {
    stripe: {
        secret: readEnv("STRIPE_SECRET") ||
            stripeCfg.secret ||
            "",
        webhookSecret: readEnv("STRIPE_WEBHOOK_SECRET") ||
            stripeCfg.webhookSecret ||
            stripeCfg.webhook_secret ||
            "",
    },
    adminBootstrap: {
        enabled: (_a = readBool("ADMIN_BOOTSTRAP_ENABLED")) !== null && _a !== void 0 ? _a : Boolean(adminBootstrapCfg.enabled),
        key: readEnv("ADMIN_BOOTSTRAP_KEY") ||
            adminBootstrapCfg.key ||
            "",
    },
    mail: {
        provider: readEnv("MAIL_PROVIDER") ||
            mailCfg.provider ||
            "custom",
        from: readEnv("MAIL_FROM") ||
            mailCfg.from ||
            "",
        user: readEnv("MAIL_USER") ||
            mailCfg.user ||
            "",
        pass: readEnv("MAIL_PASS") ||
            mailCfg.pass ||
            "",
        host: readEnv("MAIL_HOST") ||
            mailCfg.host ||
            "",
        port: (_b = readNumber("MAIL_PORT")) !== null && _b !== void 0 ? _b : Number(mailCfg.port || 587),
        secure: (_c = readBool("MAIL_SECURE")) !== null && _c !== void 0 ? _c : Boolean(mailCfg.secure),
    },
    google: {
        clientId: readEnv("GOOGLE_CLIENT_ID") ||
            ((_d = oauthCfg.google) === null || _d === void 0 ? void 0 : _d.client_id) ||
            "",
        clientSecret: readEnv("GOOGLE_CLIENT_SECRET") ||
            ((_e = oauthCfg.google) === null || _e === void 0 ? void 0 : _e.client_secret) ||
            "",
        redirectUri: readEnv("GOOGLE_REDIRECT_URI") ||
            ((_f = oauthCfg.google) === null || _f === void 0 ? void 0 : _f.redirect_uri) ||
            "",
    },
    outlook: {
        clientId: readEnv("OUTLOOK_CLIENT_ID") ||
            readEnv("MICROSOFT_CLIENT_ID") ||
            ((_g = oauthCfg.microsoft) === null || _g === void 0 ? void 0 : _g.client_id) ||
            "",
        clientSecret: readEnv("OUTLOOK_CLIENT_SECRET") ||
            readEnv("MICROSOFT_CLIENT_SECRET") ||
            ((_h = oauthCfg.microsoft) === null || _h === void 0 ? void 0 : _h.client_secret) ||
            "",
        redirectUri: readEnv("OUTLOOK_REDIRECT_URI") ||
            readEnv("MICROSOFT_REDIRECT_URI") ||
            ((_j = oauthCfg.microsoft) === null || _j === void 0 ? void 0 : _j.redirect_uri) ||
            "",
    },
    lightspeedk: {
        clientId: readEnv("LIGHTSPEEDK_CLIENT_ID") ||
            ((_k = oauthCfg.lightspeedk) === null || _k === void 0 ? void 0 : _k.client_id) ||
            ((_l = oauthCfg.lightspeedK) === null || _l === void 0 ? void 0 : _l.client_id) ||
            "",
        clientSecret: readEnv("LIGHTSPEEDK_CLIENT_SECRET") ||
            ((_m = oauthCfg.lightspeedk) === null || _m === void 0 ? void 0 : _m.client_secret) ||
            ((_o = oauthCfg.lightspeedK) === null || _o === void 0 ? void 0 : _o.client_secret) ||
            "",
        redirectUri: readEnv("LIGHTSPEEDK_REDIRECT_URI") ||
            ((_p = oauthCfg.lightspeedk) === null || _p === void 0 ? void 0 : _p.redirect_uri) ||
            ((_q = oauthCfg.lightspeedK) === null || _q === void 0 ? void 0 : _q.redirect_uri) ||
            "",
    },
};
exports.default = exports.FUNCTION_KEYS;
//# sourceMappingURL=keys.js.map