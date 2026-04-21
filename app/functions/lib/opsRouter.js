"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opsRouter = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const admin_1 = require("./admin");
const crypto_1 = require("crypto");
const opsAuthEmails_1 = require("./opsAuthEmails");
const opsChangelog_1 = require("./opsChangelog");
const opsProviders_1 = require("./opsProviders");
const opsActions_1 = require("./opsActions");
const dataSupply_1 = require("./dataSupply");
const dataFinance_1 = require("./dataFinance");
const dataStock_1 = require("./dataStock");
const dataCompany_1 = require("./dataCompany");
const dataHR_1 = require("./dataHR");
const dataAdmin_1 = require("./dataAdmin");
const dataLocation_1 = require("./dataLocation");
const dataProduct_1 = require("./dataProduct");
const dataNotifications_1 = require("./dataNotifications");
const dataBookings_1 = require("./dataBookings");
const dataSettings_1 = require("./dataSettings");
const dataPOS_1 = require("./dataPOS");
const dataMessenger_1 = require("./dataMessenger");
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
function hasAdminPageAccessRecord(user, page) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (Boolean(user === null || user === void 0 ? void 0 : user.isAdmin))
        return true;
    if (!Boolean((_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.active))
        return false;
    if (page === "dashboard" || page === "profile")
        return true;
    const pages = (_h = (_f = (_c = (_b = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _b === void 0 ? void 0 : _b.pages) !== null && _c !== void 0 ? _c : (_e = (_d = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _d === void 0 ? void 0 : _d.permissions) === null || _e === void 0 ? void 0 : _e.pages) !== null && _f !== void 0 ? _f : (_g = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _g === void 0 ? void 0 : _g.permissions) !== null && _h !== void 0 ? _h : null;
    if (Array.isArray(pages))
        return pages.includes(page);
    if (pages && typeof pages === "object") {
        const v = pages[page];
        if (typeof v === "boolean")
            return v;
        if (v && typeof v === "object" && typeof v.view === "boolean")
            return Boolean(v.view);
    }
    return false;
}
function safeUrl(raw) {
    const s = String(raw || "").trim();
    if (!s)
        return null;
    try {
        const u = new URL(s);
        if (u.protocol !== "http:" && u.protocol !== "https:")
            return null;
        return u.toString().replace(/\/+$/, "");
    }
    catch (_a) {
        return null;
    }
}
async function readOpsConfig() {
    const snap = await admin_1.db.ref("admin/ops/config").get();
    const v = (snap.val() || {});
    return {
        devBaseUrl: safeUrl(v === null || v === void 0 ? void 0 : v.devBaseUrl) || undefined,
        prodBaseUrl: safeUrl(v === null || v === void 0 ? void 0 : v.prodBaseUrl) || undefined,
    };
}
async function writeOpsConfig(actor, body) {
    const next = {
        devBaseUrl: safeUrl(body === null || body === void 0 ? void 0 : body.devBaseUrl),
        prodBaseUrl: safeUrl(body === null || body === void 0 ? void 0 : body.prodBaseUrl),
        updatedAt: Date.now(),
        updatedBy: { uid: actor.uid, email: actor.email || null },
    };
    await admin_1.db.ref("admin/ops/config").set(next);
    return readOpsConfig();
}
function githubRepoConfig() {
    const owner = String(process.env.GITHUB_OWNER || process.env.GITHUB_CI_OWNER || "").trim();
    const repo = String(process.env.GITHUB_REPO || process.env.GITHUB_CI_REPO || "").trim();
    const token = String(process.env.GITHUB_TOKEN || process.env.GITHUB_CI_TOKEN || "").trim();
    const ref = String(process.env.GITHUB_CI_REF || process.env.GITHUB_DEFAULT_REF || "main").trim() || "main";
    return { owner, repo, token, ref };
}
function parseIntEnv(name, fallback) {
    const raw = String(process.env[name] || "").trim();
    if (!raw)
        return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
}
function joinUrl(base, suffix = "") {
    const root = safeUrl(base);
    if (!root)
        return null;
    const path = String(suffix || "").trim();
    if (!path)
        return root;
    return `${root}${path.startsWith("/") ? path : `/${path}`}`;
}
function firebaseDeployConfig() {
    return {
        dev: {
            projectId: String(process.env.OPS_FIREBASE_PROJECT_DEV || "stop-test-8025f").trim() || "stop-test-8025f",
            hostingTarget: String(process.env.OPS_FIREBASE_HOSTING_TARGET_DEV || "dev").trim() || "dev",
            sites: {
                mainSite: String(process.env.OPS_FIREBASE_SITE_DEV_MAIN_SITE || "stop-test-8025f").trim() || "stop-test-8025f",
                app: String(process.env.OPS_FIREBASE_SITE_DEV_APP || "").trim() || null,
                admin: String(process.env.OPS_FIREBASE_SITE_DEV_ADMIN || "").trim() || null,
                mobile: String(process.env.OPS_FIREBASE_SITE_DEV_MOBILE || "").trim() || null,
            },
        },
        prod: {
            projectId: String(process.env.OPS_FIREBASE_PROJECT_PROD || "stop-stock-a22f5").trim() || "stop-stock-a22f5",
            hostingTarget: String(process.env.OPS_FIREBASE_HOSTING_TARGET_PROD || "prod").trim() || "prod",
            sites: {
                mainSite: String(process.env.OPS_FIREBASE_SITE_PROD_MAIN_SITE || "onestop-f493a").trim() || "onestop-f493a",
                app: String(process.env.OPS_FIREBASE_SITE_PROD_APP || "").trim() || null,
                admin: String(process.env.OPS_FIREBASE_SITE_PROD_ADMIN || "").trim() || null,
                mobile: String(process.env.OPS_FIREBASE_SITE_PROD_MOBILE || "").trim() || null,
            },
        },
        functionsRegion: String(process.env.OPS_FIREBASE_FUNCTIONS_REGION || process.env.FUNCTIONS_REGION || "us-central1").trim() || "us-central1",
    };
}
function opsServiceCatalog() {
    return [
        { key: "main-site", label: "Main Site", buildCommand: "build:main-site", deployOnly: "hosting" },
        { key: "app", label: "App", buildCommand: "build:app", deployOnly: "hosting" },
        { key: "admin", label: "Admin", buildCommand: "build:admin", deployOnly: "hosting" },
        { key: "mobile", label: "Mobile", buildCommand: "build:mobile", deployOnly: "hosting" },
        { key: "api", label: "API", buildCommand: "app/functions build", deployOnly: "functions" },
        { key: "all", label: "All", buildCommand: "build:all + app/functions build", deployOnly: "hosting + functions" },
    ];
}
function buildOpsCatalog(config) {
    const gh = githubRepoConfig();
    const fb = firebaseDeployConfig();
    const dispatchToken = String(process.env.GITHUB_CI_TOKEN || "").trim();
    const dispatchWorkflow = String(process.env.GITHUB_CI_WORKFLOW || "").trim();
    const approvalsFallback = parseIntEnv("OPS_APPROVALS_REQUIRED", 1);
    return {
        services: opsServiceCatalog(),
        urls: {
            dev: {
                base: joinUrl(config.devBaseUrl),
                mainSite: joinUrl(config.devBaseUrl),
                app: joinUrl(config.devBaseUrl, "/App"),
                admin: joinUrl(config.devBaseUrl, "/Admin"),
                mobile: joinUrl(config.devBaseUrl, "/Mobile"),
                apiVersion: joinUrl(config.devBaseUrl, "/api/version"),
            },
            prod: {
                base: joinUrl(config.prodBaseUrl),
                mainSite: joinUrl(config.prodBaseUrl),
                app: joinUrl(config.prodBaseUrl, "/App"),
                admin: joinUrl(config.prodBaseUrl, "/Admin"),
                mobile: joinUrl(config.prodBaseUrl, "/Mobile"),
                apiVersion: joinUrl(config.prodBaseUrl, "/api/version"),
            },
        },
        firebase: fb,
        github: {
            owner: gh.owner || null,
            repo: gh.repo || null,
            ref: gh.ref || "main",
            workflow: dispatchWorkflow || null,
            downloadLatestConfigured: Boolean(gh.owner && gh.repo && gh.token),
            dispatchConfigured: Boolean(gh.owner && gh.repo && dispatchToken && dispatchWorkflow),
        },
        ops: {
            executionEnabled: String(process.env.OPS_ENABLE_EXECUTION || "").trim().toLowerCase() === "true",
            allowSelfApprove: String(process.env.OPS_ALLOW_SELF_APPROVE || "").trim().toLowerCase() === "true",
            approvalsRequired: {
                dev: parseIntEnv("OPS_APPROVALS_REQUIRED_DEV", approvalsFallback),
                prod: parseIntEnv("OPS_APPROVALS_REQUIRED_PROD", approvalsFallback),
            },
        },
    };
}
function safeArchiveName(s) {
    return String(s || "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "latest";
}
async function githubApiGetJson(pathAndQuery) {
    const cfg = githubRepoConfig();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
        throw Object.assign(new Error("GitHub is not configured (GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)"), { status: 500 });
    }
    const url = pathAndQuery.startsWith("http") ? pathAndQuery : `https://api.github.com${pathAndQuery}`;
    const upstream = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${cfg.token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "1stop-ops",
        },
    });
    const text = await upstream.text().catch(() => "");
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch (_a) {
        data = { message: text };
    }
    if (!upstream.ok) {
        const msg = typeof (data === null || data === void 0 ? void 0 : data.message) === "string" ? data.message : `GitHub API failed (${upstream.status})`;
        throw Object.assign(new Error(msg), { status: 502 });
    }
    return data;
}
async function downloadLatestCode(res, refOverride) {
    const cfg = githubRepoConfig();
    if (!cfg.owner || !cfg.repo || !cfg.token)
        throw Object.assign(new Error("GitHub code download is not configured"), { status: 500 });
    const refName = String(refOverride || cfg.ref || "main").trim() || "main";
    const upstream = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/zipball/${encodeURIComponent(refName)}`, {
        method: "GET",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${cfg.token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "1stop-ops",
        },
    });
    if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        throw Object.assign(new Error(text || `GitHub download failed (${upstream.status})`), { status: 502 });
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const filename = `${safeArchiveName(cfg.repo)}-${safeArchiveName(refName)}.zip`;
    res.set("Cache-Control", "no-store");
    res.set("Content-Type", upstream.headers.get("content-type") || "application/zip");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
}
async function requireAdmin(req) {
    var _a, _b, _c, _d, _e;
    const token = getBearerToken(req);
    if (!token)
        throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 });
    const decoded = await (0, auth_1.getAuth)().verifyIdToken(token).catch(() => null);
    if (!(decoded === null || decoded === void 0 ? void 0 : decoded.uid))
        throw Object.assign(new Error("Invalid token"), { status: 401 });
    // Verify user is allowed to use Admin Ops (super-admin or adminStaff.active).
    const snap = await admin_1.db.ref(`users/${decoded.uid}`).get();
    const user = (snap.val() || {});
    const isAdmin = Boolean(user === null || user === void 0 ? void 0 : user.isAdmin);
    const isAdminStaff = Boolean((_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.active);
    if (!isAdmin && !isAdminStaff)
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    if (!isAdmin && !hasAdminPageAccessRecord(user, "ops"))
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    const opsPerms = (((_c = (_b = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _b === void 0 ? void 0 : _b.permissions) === null || _c === void 0 ? void 0 : _c.ops) || ((_e = (_d = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _d === void 0 ? void 0 : _d.permissions) === null || _e === void 0 ? void 0 : _e.Ops) || null);
    return {
        uid: decoded.uid,
        email: decoded.email,
        isAdmin,
        isAdminStaff,
        opsPerms: opsPerms && typeof opsPerms === "object" ? opsPerms : undefined,
    };
}
async function requireAuthenticatedUser(req) {
    const token = getBearerToken(req);
    if (!token)
        throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 });
    const decoded = await (0, auth_1.getAuth)().verifyIdToken(token).catch(() => null);
    if (!(decoded === null || decoded === void 0 ? void 0 : decoded.uid))
        throw Object.assign(new Error("Invalid token"), { status: 401 });
    return {
        uid: decoded.uid,
        email: decoded.email,
    };
}
function can(user, perm) {
    var _a;
    if (user.isAdmin)
        return true;
    if (!user.isAdminStaff)
        return false;
    return Boolean((_a = user.opsPerms) === null || _a === void 0 ? void 0 : _a[perm]);
}
function isEnv(v) {
    return v === "dev" || v === "prod";
}
function computeHmacHex(secret, rawBody) {
    return (0, crypto_1.createHmac)("sha256", secret).update(rawBody).digest("hex");
}
function safeEqHex(a, b) {
    try {
        const aa = Buffer.from(String(a || ""), "hex");
        const bb = Buffer.from(String(b || ""), "hex");
        if (aa.length !== bb.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(aa, bb);
    }
    catch (_a) {
        return false;
    }
}
async function handleCiReport(req, res, body) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const secret = String(process.env.OPS_CI_HMAC_SECRET || "").trim();
    if (!secret)
        throw Object.assign(new Error("Missing env: OPS_CI_HMAC_SECRET"), { status: 500 });
    const sigRaw = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a["x-ops-signature"]) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b["x-ops-ci-signature"]) || ((_c = req.headers) === null || _c === void 0 ? void 0 : _c["X-Ops-Signature"]) || "").trim();
    const sig = sigRaw.startsWith("sha256=") ? sigRaw.slice("sha256=".length) : sigRaw;
    if (!sig)
        throw Object.assign(new Error("Missing signature"), { status: 401 });
    const raw = (req === null || req === void 0 ? void 0 : req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(body || {}), "utf8");
    const expected = computeHmacHex(secret, raw);
    if (!safeEqHex(String(sig).trim(), expected))
        throw Object.assign(new Error("Invalid signature"), { status: 403 });
    const id = String((body === null || body === void 0 ? void 0 : body.id) || (body === null || body === void 0 ? void 0 : body.actionId) || "").trim();
    const ok = Boolean(body === null || body === void 0 ? void 0 : body.ok);
    const message = typeof (body === null || body === void 0 ? void 0 : body.message) === "string" ? body.message.slice(0, 500) : "";
    const externalUrl = typeof (body === null || body === void 0 ? void 0 : body.externalUrl) === "string" ? body.externalUrl.slice(0, 500) : "";
    if (!id)
        throw Object.assign(new Error("Missing action id"), { status: 400 });
    const now = Date.now();
    const actionRef = admin_1.db.ref(`admin/ops/actions/${id}`);
    const result = await actionRef.transaction((cur) => {
        var _a;
        if (!cur)
            return cur;
        if (cur.status === "succeeded" || cur.status === "failed" || cur.status === "cancelled")
            return cur;
        if (cur.status !== "running" && cur.status !== "approved")
            return cur;
        const status = ok ? "succeeded" : "failed";
        return Object.assign(Object.assign({}, cur), { status, execution: Object.assign(Object.assign({}, (cur.execution || {})), { provider: "githubActions", finishedAt: now, ok, message: message || (ok ? "Deploy succeeded" : "Deploy failed"), externalUrl: externalUrl || ((_a = cur.execution) === null || _a === void 0 ? void 0 : _a.externalUrl) || undefined }) });
    });
    if (!result.committed)
        throw Object.assign(new Error("Not found"), { status: 404 });
    // Server-side audit (append-only, best-effort).
    try {
        await admin_1.db.ref("admin/ops/audit/events").push().set({
            at: now,
            action: "ci.report",
            ok,
            actor: { uid: "ci", email: "ci@github-actions" },
            targetId: id,
            meta: { externalUrl: externalUrl || null },
        });
    }
    catch (_j) {
        // ignore
    }
    // Auto-log deployment + Jira links on success (best-effort).
    try {
        if (ok) {
            const cur = ((_e = (_d = result === null || result === void 0 ? void 0 : result.snapshot) === null || _d === void 0 ? void 0 : _d.val) === null || _e === void 0 ? void 0 : _e.call(_d)) || null;
            const already = cur === null || cur === void 0 ? void 0 : cur.deploymentId;
            const env = cur === null || cur === void 0 ? void 0 : cur.environment;
            const svc = cur === null || cur === void 0 ? void 0 : cur.service;
            const version = (_f = cur === null || cur === void 0 ? void 0 : cur.desired) === null || _f === void 0 ? void 0 : _f.version;
            const gitSha = (_g = cur === null || cur === void 0 ? void 0 : cur.desired) === null || _g === void 0 ? void 0 : _g.gitSha;
            const actor = (cur === null || cur === void 0 ? void 0 : cur.requestedBy) || null;
            if (!already && (env === "dev" || env === "prod") && ["frontend", "app", "admin", "mobile", "main-site", "api", "all"].includes(String(svc || ""))) {
                const depRef = admin_1.db.ref("admin/ops/deployments").push();
                const depId = depRef.key || "";
                const notesParts = [];
                if ((_h = cur === null || cur === void 0 ? void 0 : cur.desired) === null || _h === void 0 ? void 0 : _h.notes)
                    notesParts.push(String(cur.desired.notes));
                if (message)
                    notesParts.push(String(message));
                if (externalUrl)
                    notesParts.push(`Link: ${externalUrl}`);
                const notes = notesParts.filter(Boolean).join(" • ").slice(0, 2000);
                await depRef.set({
                    environment: env,
                    service: svc,
                    version: version || null,
                    gitSha: gitSha || null,
                    deployTime: now,
                    createdAt: now,
                    source: "action",
                    actor: actor || null,
                    notes: notes || null,
                    actionId: id,
                    executionUrl: externalUrl || null,
                });
                // Link action -> deploymentId (don’t overwrite if some other worker already set it).
                await actionRef.child("deploymentId").transaction((v) => (v ? v : depId));
                // Attach Jira keys if the commit SHA is known and mapped.
                const sha = String(gitSha || "").trim();
                if (sha) {
                    const snap = await admin_1.db.ref(`admin/ops/providers/github/commitIssueKeys/${sha}`).get();
                    const keys = snap.val();
                    if (Array.isArray(keys) && keys.length) {
                        const clean = keys.map((k) => String(k || "").trim().toUpperCase()).filter(Boolean).slice(0, 25);
                        if (clean.length) {
                            const updates = {};
                            updates[`admin/ops/deployments/${depId}/jiraKeys`] = clean;
                            clean.forEach((k) => {
                                updates[`admin/ops/index/jira/${k}/deployments/${depId}`] = true;
                            });
                            await admin_1.db.ref().update(updates);
                        }
                    }
                }
                // On successful PROD deploy, create a Release + Jira-linked changelog (best-effort).
                if (env === "prod" && version && gitSha) {
                    await (0, opsChangelog_1.createProdReleaseAndChangelog)({
                        version: String(version),
                        gitSha: String(gitSha),
                        actionId: id,
                        deploymentId: depId,
                        executionUrl: externalUrl || undefined,
                        actor,
                    });
                }
            }
        }
    }
    catch (_k) {
        // ignore
    }
    json(res, 200, { ok: true });
}
function normalizePath(req) {
    let p = String(req.path || req.url || "").split("?")[0] || "/";
    // Full URL (some runtimes): take pathname only
    if (p.includes("://")) {
        try {
            p = new URL(p).pathname || "/";
        }
        catch (_a) {
            p = "/";
        }
    }
    // Support both:
    // - /api/ops/* via Firebase Hosting rewrites
    // - /* when calling the function directly
    if (p.startsWith("/api/ops")) {
        const rest = p.slice("/api/ops".length);
        p = rest || "/";
    }
    // HTTPS URL is .../opsRouter/config — Express often exposes path as /opsRouter/config
    if (p === "/opsRouter" || p.startsWith("/opsRouter/")) {
        const rest = p === "/opsRouter" ? "/" : p.slice("/opsRouter".length);
        p = rest || "/";
    }
    return p || "/";
}
exports.opsRouter = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e;
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    try {
        const p = normalizePath(req);
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
        // CI callback (no Firebase user token; HMAC-signed)
        if (req.method === "POST" && (p === "/actions/report" || p === "/actions/report/")) {
            await handleCiReport(req, res, body);
            return;
        }
        if (p.startsWith("/data/supply")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataSupply_1.handleSupplyDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/finance")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataFinance_1.handleFinanceDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/stock")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataStock_1.handleStockDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/company")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataCompany_1.handleCompanyDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/hr")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataHR_1.handleHRDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/location")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataLocation_1.handleLocationDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/product")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataProduct_1.handleProductDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/notifications")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataNotifications_1.handleNotificationsDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/bookings")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataBookings_1.handleBookingsDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/settings")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataSettings_1.handleSettingsDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/pos")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataPOS_1.handlePOSDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/messenger")) {
            const user = await requireAuthenticatedUser(req);
            await (0, dataMessenger_1.handleMessengerDataRequest)({ req, res, path: p, body, user });
            return;
        }
        if (p.startsWith("/data/admin")) {
            const user = await requireAdmin(req);
            await (0, dataAdmin_1.handleAdminDataRequest)({ req, res, path: p, body, user });
            return;
        }
        const user = await requireAdmin(req);
        // Health
        if (req.method === "GET" && (p === "/" || p === "")) {
            json(res, 200, { ok: true });
            return;
        }
        // Auth emails (custom Firebase Auth templates + sender)
        if (req.method === "GET" && (p === "/authEmails/templates" || p === "/authEmails/templates/")) {
            if (!user.isAdmin && !can(user, "manageAuthEmails"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, Object.assign({ ok: true }, (await (0, opsAuthEmails_1.opsAuthEmailsGetConfig)())));
            return;
        }
        if (req.method === "POST" && (p === "/authEmails/settings" || p === "/authEmails/settings/")) {
            if (!user.isAdmin && !can(user, "manageAuthEmails"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, { ok: true, settings: await (0, opsAuthEmails_1.opsAuthEmailsUpsertSettings)({ uid: user.uid, email: user.email }, body) });
            return;
        }
        if (req.method === "POST" && (p === "/authEmails/sender" || p === "/authEmails/sender/")) {
            if (!user.isAdmin && !can(user, "manageAuthEmails"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, Object.assign({ ok: true }, (await (0, opsAuthEmails_1.opsAuthEmailsUpsertSender)({ uid: user.uid, email: user.email }, body))));
            return;
        }
        if (req.method === "POST" && (p === "/authEmails/templates/upsert" || p === "/authEmails/templates/upsert/")) {
            if (!user.isAdmin && !can(user, "manageAuthEmails"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, Object.assign({ ok: true }, (await (0, opsAuthEmails_1.opsAuthEmailsUpsertTemplate)({ uid: user.uid, email: user.email }, body))));
            return;
        }
        if (req.method === "POST" && (p === "/authEmails/send" || p === "/authEmails/send/")) {
            if (!user.isAdmin && !can(user, "manageAuthEmails"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, await (0, opsAuthEmails_1.opsAuthEmailsSend)({ uid: user.uid, email: user.email }, body));
            return;
        }
        // Shared Ops config
        if (req.method === "GET" && (p === "/config" || p === "/config/")) {
            const config = await readOpsConfig();
            json(res, 200, { ok: true, config, catalog: buildOpsCatalog(config) });
            return;
        }
        if (req.method === "POST" && (p === "/config" || p === "/config/")) {
            if (!user.isAdmin)
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            const config = await writeOpsConfig({ uid: user.uid, email: user.email }, body);
            json(res, 200, { ok: true, config, catalog: buildOpsCatalog(config) });
            return;
        }
        // GitHub
        if (req.method === "GET" && (p === "/github/status" || p === "/github/status/")) {
            json(res, 200, await (0, opsProviders_1.githubStatus)());
            return;
        }
        if (req.method === "GET" && (p === "/github/branches" || p === "/github/branches/")) {
            try {
                const cfg = githubRepoConfig();
                if (!cfg.owner || !cfg.repo || !cfg.token) {
                    json(res, 200, { ok: true, configured: false, branches: [], defaultRef: cfg.ref || "main" });
                    return;
                }
                const rawPer = String(((_a = req.query) === null || _a === void 0 ? void 0 : _a.per_page) || "").trim();
                const perNum = rawPer ? Number.parseInt(rawPer, 10) : 40;
                const per = Math.min(100, Math.max(1, Number.isFinite(perNum) ? perNum : 40));
                const rows = await githubApiGetJson(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/branches?per_page=${per}`);
                const branches = (Array.isArray(rows) ? rows : []).map((b) => {
                    var _a, _b;
                    return ({
                        name: String((b === null || b === void 0 ? void 0 : b.name) || ""),
                        sha: ((_a = b === null || b === void 0 ? void 0 : b.commit) === null || _a === void 0 ? void 0 : _a.sha) ? String(b.commit.sha).slice(0, 7) : null,
                        fullSha: ((_b = b === null || b === void 0 ? void 0 : b.commit) === null || _b === void 0 ? void 0 : _b.sha) ? String(b.commit.sha) : null,
                    });
                });
                json(res, 200, { ok: true, configured: true, owner: cfg.owner, repo: cfg.repo, defaultRef: cfg.ref, branches });
            }
            catch (e) {
                json(res, Number((e === null || e === void 0 ? void 0 : e.status) || 500), { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed to list branches" });
            }
            return;
        }
        if (req.method === "GET" && (p === "/github/compare" || p === "/github/compare/")) {
            try {
                const base = String(((_b = req.query) === null || _b === void 0 ? void 0 : _b.base) || "").trim();
                const head = String(((_c = req.query) === null || _c === void 0 ? void 0 : _c.head) || "").trim();
                if (!base || !head)
                    throw Object.assign(new Error("Query params base and head are required"), { status: 400 });
                const cfg = githubRepoConfig();
                if (!cfg.owner || !cfg.repo || !cfg.token) {
                    throw Object.assign(new Error("GitHub is not configured"), { status: 500 });
                }
                const basehead = `${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
                const cmp = await githubApiGetJson(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/compare/${basehead}`);
                const files = Array.isArray(cmp === null || cmp === void 0 ? void 0 : cmp.files)
                    ? cmp.files.map((f) => ({
                        filename: String((f === null || f === void 0 ? void 0 : f.filename) || ""),
                        status: String((f === null || f === void 0 ? void 0 : f.status) || ""),
                        additions: Number((f === null || f === void 0 ? void 0 : f.additions) || 0),
                        deletions: Number((f === null || f === void 0 ? void 0 : f.deletions) || 0),
                    }))
                    : [];
                json(res, 200, {
                    ok: true,
                    html_url: (cmp === null || cmp === void 0 ? void 0 : cmp.html_url) ? String(cmp.html_url) : null,
                    status: (cmp === null || cmp === void 0 ? void 0 : cmp.status) ? String(cmp.status) : null,
                    ahead_by: Number((cmp === null || cmp === void 0 ? void 0 : cmp.ahead_by) || 0),
                    behind_by: Number((cmp === null || cmp === void 0 ? void 0 : cmp.behind_by) || 0),
                    total_commits: Array.isArray(cmp === null || cmp === void 0 ? void 0 : cmp.commits) ? cmp.commits.length : 0,
                    files,
                    owner: cfg.owner,
                    repo: cfg.repo,
                });
            }
            catch (e) {
                json(res, Number((e === null || e === void 0 ? void 0 : e.status) || 500), { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Compare failed" });
            }
            return;
        }
        if (req.method === "GET" && (p === "/github/downloadLatest" || p === "/github/downloadLatest/")) {
            const refOverride = typeof ((_d = req.query) === null || _d === void 0 ? void 0 : _d.ref) === "string" ? req.query.ref : undefined;
            await downloadLatestCode(res, refOverride);
            return;
        }
        if (req.method === "POST" && (p === "/github/sync" || p === "/github/sync/")) {
            if (!user.isAdmin && !can(user, "syncProviders"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, await (0, opsProviders_1.githubSync)({ uid: user.uid, email: user.email }));
            return;
        }
        // Jira
        if (req.method === "GET" && (p === "/jira/status" || p === "/jira/status/")) {
            json(res, 200, await (0, opsProviders_1.jiraStatus)());
            return;
        }
        if (req.method === "POST" && (p === "/jira/sync" || p === "/jira/sync/")) {
            if (!user.isAdmin && !can(user, "syncProviders"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, await (0, opsProviders_1.jiraSync)({ uid: user.uid, email: user.email }));
            return;
        }
        // Jenkins
        if (req.method === "GET" && (p === "/jenkins/status" || p === "/jenkins/status/")) {
            json(res, 200, await (0, opsProviders_1.jenkinsStatus)());
            return;
        }
        if (req.method === "POST" && (p === "/jenkins/sync" || p === "/jenkins/sync/")) {
            if (!user.isAdmin && !can(user, "syncProviders"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, await (0, opsProviders_1.jenkinsSync)({ uid: user.uid, email: user.email }));
            return;
        }
        // Linking/enrichment
        if (req.method === "POST" && (p === "/links/enrichDeployments" || p === "/links/enrichDeployments/")) {
            if (!user.isAdmin && !can(user, "syncProviders"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, await (0, opsProviders_1.enrichDeploymentsWithJiraKeys)(200, { uid: user.uid, email: user.email }));
            return;
        }
        // Actions (Update Manager foundation)
        if (req.method === "POST" && (p === "/actions/request" || p === "/actions/request/")) {
            if (!user.isAdmin && !can(user, "request"))
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            json(res, 200, await (0, opsActions_1.requestAction)({ uid: user.uid, email: user.email }, body));
            return;
        }
        if (req.method === "POST" && (p === "/actions/approve" || p === "/actions/approve/")) {
            const id = String((body === null || body === void 0 ? void 0 : body.id) || "").trim();
            if (!id)
                throw Object.assign(new Error("Missing id"), { status: 400 });
            if (!user.isAdmin) {
                const snap = await admin_1.db.ref(`admin/ops/actions/${id}`).get();
                const action = (snap.val() || null);
                if (!action)
                    throw Object.assign(new Error("Not found"), { status: 404 });
                const env = action === null || action === void 0 ? void 0 : action.environment;
                if (env === "dev") {
                    if (!can(user, "approveTest"))
                        throw Object.assign(new Error("Forbidden"), { status: 403 });
                }
                else if (env === "prod") {
                    if (!can(user, "approveProd"))
                        throw Object.assign(new Error("Forbidden"), { status: 403 });
                }
                else {
                    throw Object.assign(new Error("Invalid environment"), { status: 400 });
                }
            }
            json(res, 200, await (0, opsActions_1.approveAction)({ uid: user.uid, email: user.email }, id));
            return;
        }
        if (req.method === "POST" && (p === "/actions/cancel" || p === "/actions/cancel/")) {
            const id = String((body === null || body === void 0 ? void 0 : body.id) || "").trim();
            if (!id)
                throw Object.assign(new Error("Missing id"), { status: 400 });
            if (!user.isAdmin) {
                const snap = await admin_1.db.ref(`admin/ops/actions/${id}`).get();
                const action = (snap.val() || null);
                if (!action)
                    throw Object.assign(new Error("Not found"), { status: 404 });
                const isRequester = ((_e = action === null || action === void 0 ? void 0 : action.requestedBy) === null || _e === void 0 ? void 0 : _e.uid) && action.requestedBy.uid === user.uid;
                const canCancelEnv = (action === null || action === void 0 ? void 0 : action.environment) === "dev"
                    ? can(user, "approveTest") || can(user, "process")
                    : (action === null || action === void 0 ? void 0 : action.environment) === "prod"
                        ? can(user, "approveProd") || can(user, "process")
                        : false;
                if (!isRequester && !canCancelEnv)
                    throw Object.assign(new Error("Forbidden"), { status: 403 });
            }
            json(res, 200, await (0, opsActions_1.cancelAction)({ uid: user.uid, email: user.email }, id));
            return;
        }
        if (req.method === "POST" && (p === "/actions/process" || p === "/actions/process/")) {
            const env = body === null || body === void 0 ? void 0 : body.environment;
            if (!env) {
                if (!user.isAdmin)
                    throw Object.assign(new Error("Forbidden"), { status: 403 });
                json(res, 200, await (0, opsActions_1.processApprovedActions)(5));
                return;
            }
            if (!isEnv(env))
                throw Object.assign(new Error("Invalid environment"), { status: 400 });
            if (!user.isAdmin) {
                const ok = can(user, "process") && (env === "dev" ? can(user, "approveTest") : can(user, "approveProd"));
                if (!ok)
                    throw Object.assign(new Error("Forbidden"), { status: 403 });
            }
            json(res, 200, await (0, opsActions_1.processApprovedActions)(5, { environment: env }));
            return;
        }
        json(res, 404, { ok: false, error: "Not found" });
    }
    catch (e) {
        const status = Number((e === null || e === void 0 ? void 0 : e.status) || 500);
        json(res, status, { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
//# sourceMappingURL=opsRouter.js.map