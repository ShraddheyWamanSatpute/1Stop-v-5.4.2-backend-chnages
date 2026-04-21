"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAuthEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const crypto = __importStar(require("crypto"));
const admin_1 = require("./admin");
const opsAuthEmails_1 = require("./opsAuthEmails");
function json(res, status, body) {
    res.set("Cache-Control", "no-store");
    res.status(status).json(body);
}
function getBearerToken(req) {
    var _a, _b;
    const h = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization) || "");
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
}
function clientIp(req) {
    var _a, _b, _c;
    const xff = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a["x-forwarded-for"]) || "");
    const first = (_b = xff.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim();
    return first || String(req.ip || ((_c = req.connection) === null || _c === void 0 ? void 0 : _c.remoteAddress) || "");
}
function normStr(v) {
    return String(v !== null && v !== void 0 ? v : "").trim();
}
function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function rateKey(s) {
    return crypto.createHash("sha256").update(s).digest("base64url");
}
async function enforceRateLimit(key, max, windowMs) {
    const ref = admin_1.db.ref(`admin/ops/authEmails/rateLimit/${key}`);
    const now = Date.now();
    const r = await ref.transaction((cur) => {
        const v = cur && typeof cur === "object" ? cur : {};
        const windowStart = typeof v.windowStart === "number" ? v.windowStart : now;
        const count = typeof v.count === "number" ? v.count : 0;
        const within = now - windowStart < windowMs;
        const nextCount = within ? count + 1 : 1;
        const nextStart = within ? windowStart : now;
        return { windowStart: nextStart, count: nextCount, updatedAt: now };
    });
    const val = r.snapshot.val() || {};
    const count = Number((val === null || val === void 0 ? void 0 : val.count) || 0);
    if (count > max) {
        throw Object.assign(new Error("Too many requests. Please try again later."), { status: 429 });
    }
}
exports.sendAuthEmail = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        json(res, 405, { ok: false, error: "Method not allowed" });
        return;
    }
    try {
        const body = req.body && typeof req.body === "object"
            ? req.body
            : (() => {
                try {
                    const raw = (req === null || req === void 0 ? void 0 : req.rawBody) ? String(req.rawBody) : "";
                    return raw ? JSON.parse(raw) : {};
                }
                catch (_a) {
                    return {};
                }
            })();
        const type = normStr(body === null || body === void 0 ? void 0 : body.type);
        if (type !== "verifyEmail" && type !== "passwordReset" && type !== "magicLink") {
            json(res, 400, { ok: false, error: "Invalid type" });
            return;
        }
        const continueUrl = normStr(body === null || body === void 0 ? void 0 : body.continueUrl);
        // Determine email:
        // - verifyEmail: prefer auth token, but allow unauth by email (rate-limited, no existence leak)
        // - passwordReset/magicLink: email in body (rate-limited, no existence leak)
        let email = "";
        const token = getBearerToken(req);
        if (type === "verifyEmail" && token) {
            const decoded = await (0, auth_1.getAuth)().verifyIdToken(token).catch(() => null);
            email = normStr(decoded === null || decoded === void 0 ? void 0 : decoded.email);
            if (!email)
                throw Object.assign(new Error("Missing user email"), { status: 400 });
        }
        else {
            email = normStr(body === null || body === void 0 ? void 0 : body.email);
            if (!email || !isValidEmail(email)) {
                // Do not leak existence; still return ok.
                json(res, 200, { ok: true });
                return;
            }
            const ip = clientIp(req);
            await enforceRateLimit(rateKey(`${type}:${email}:${ip}`), 5, 15 * 60000);
        }
        // Actor is "public"; keep minimal audit info.
        const actor = { uid: "", email: "public" };
        const r = await (0, opsAuthEmails_1.sendAuthEmailInternal)(actor, { type, email, continueUrl }, { suppressUserNotFound: !token });
        json(res, 200, { ok: true, messageId: r.messageId || null });
    }
    catch (e) {
        const status = Number((e === null || e === void 0 ? void 0 : e.status) || 500);
        // Password reset should not reveal user existence; suppress known errors.
        if (status === 400 && String((e === null || e === void 0 ? void 0 : e.message) || "").toLowerCase().includes("user")) {
            json(res, 200, { ok: true });
            return;
        }
        json(res, status, { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
//# sourceMappingURL=sendAuthEmail.js.map