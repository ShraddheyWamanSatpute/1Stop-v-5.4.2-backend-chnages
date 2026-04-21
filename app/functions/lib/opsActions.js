"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processApprovedActions = exports.cancelAction = exports.approveAction = exports.requestAction = void 0;
const admin_1 = require("./admin");
async function logAuditEvent(e) {
    try {
        await admin_1.db.ref("admin/ops/audit/events").push().set(e);
    }
    catch (_a) {
        // ignore
    }
}
// NOTE: deployment → Jira linking was removed from this file to keep
// the Functions build clean (noUnusedLocals). It’s still implemented
// in opsRouter’s CI report handler for successful deploys.
function safeString(v, max = 500) {
    const s = String(v !== null && v !== void 0 ? v : "").trim();
    return s.length > max ? s.slice(0, max) : s;
}
function isEnv(v) {
    return v === "dev" || v === "prod";
}
function isService(v) {
    return v === "frontend" || v === "app" || v === "admin" || v === "mobile" || v === "main-site" || v === "api" || v === "all";
}
function parseIntEnv(name, fallback) {
    const raw = String(process.env[name] || "").trim();
    if (!raw)
        return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
}
function approvalsRequired(env) {
    const fallback = parseIntEnv("OPS_APPROVALS_REQUIRED", 1);
    const n = env === "dev"
        ? parseIntEnv("OPS_APPROVALS_REQUIRED_DEV", fallback)
        : env === "prod"
            ? parseIntEnv("OPS_APPROVALS_REQUIRED_PROD", fallback)
            : fallback;
    if (n <= 1)
        return 1;
    if (n >= 3)
        return 3;
    return 2;
}
function allowSelfApprove() {
    return String(process.env.OPS_ALLOW_SELF_APPROVE || "")
        .trim()
        .toLowerCase() === "true";
}
function requireEnv(name) {
    const v = String(process.env[name] || "").trim();
    if (!v)
        throw new Error(`Missing env: ${name}`);
    return v;
}
async function githubDispatchDeploy(params) {
    const token = requireEnv("GITHUB_CI_TOKEN");
    const owner = requireEnv("GITHUB_CI_OWNER");
    const repo = requireEnv("GITHUB_CI_REPO");
    const workflow = requireEnv("GITHUB_CI_WORKFLOW"); // id or filename (e.g. deploy.yml)
    const ref = String(process.env.GITHUB_CI_REF || "main").trim() || "main";
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
        method: "POST",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "1stop-ops",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            ref,
            inputs: {
                actionId: params.actionId,
                environment: params.environment,
                service: params.service,
                version: params.version || "",
                gitSha: params.gitSha || "",
            },
        }),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`GitHub Actions dispatch failed (${res.status})${t ? `: ${t.slice(0, 200)}` : ""}`);
    }
    const workflowUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflow}`;
    return { ok: true, workflowUrl };
}
async function requestAction(actor, body) {
    var _a, _b, _c;
    const now = Date.now();
    const environment = body === null || body === void 0 ? void 0 : body.environment;
    const service = body === null || body === void 0 ? void 0 : body.service;
    if (!isEnv(environment))
        throw Object.assign(new Error("Invalid environment"), { status: 400 });
    if (!isService(service))
        throw Object.assign(new Error("Invalid service"), { status: 400 });
    const desired = {
        version: safeString(((_a = body === null || body === void 0 ? void 0 : body.desired) === null || _a === void 0 ? void 0 : _a.version) || (body === null || body === void 0 ? void 0 : body.version) || "", 80) || undefined,
        gitSha: safeString(((_b = body === null || body === void 0 ? void 0 : body.desired) === null || _b === void 0 ? void 0 : _b.gitSha) || (body === null || body === void 0 ? void 0 : body.gitSha) || "", 80) || undefined,
        notes: safeString(((_c = body === null || body === void 0 ? void 0 : body.desired) === null || _c === void 0 ? void 0 : _c.notes) || (body === null || body === void 0 ? void 0 : body.notes) || "", 1000) || undefined,
    };
    // Prod deploys must be deterministic (version + sha).
    if (environment === "prod") {
        if (!desired.version)
            throw Object.assign(new Error("Missing desired.version (required for prod)"), { status: 400 });
        if (!desired.gitSha)
            throw Object.assign(new Error("Missing desired.gitSha (required for prod)"), { status: 400 });
    }
    const ref = admin_1.db.ref("admin/ops/actions").push();
    const id = ref.key || "";
    const required = approvalsRequired(environment);
    const action = {
        id,
        kind: "deploy",
        status: "requested",
        environment,
        service,
        requiredApprovals: required,
        requestedAt: now,
        requestedBy: actor,
        desired,
    };
    await ref.set(action);
    await logAuditEvent({ at: now, action: "action.request", ok: true, actor, targetId: id, meta: { environment, service } });
    return { ok: true, id };
}
exports.requestAction = requestAction;
async function approveAction(actor, id) {
    var _a;
    const now = Date.now();
    const actionRef = admin_1.db.ref(`admin/ops/actions/${id}`);
    const snap = await actionRef.get();
    const curPre = snap.val();
    if (!curPre)
        throw Object.assign(new Error("Not found"), { status: 404 });
    if (curPre.status !== "requested")
        throw Object.assign(new Error("Not in requested state"), { status: 400 });
    if (!allowSelfApprove() && ((_a = curPre.requestedBy) === null || _a === void 0 ? void 0 : _a.uid) && actor.uid && curPre.requestedBy.uid === actor.uid) {
        throw Object.assign(new Error("Self-approve is disabled"), { status: 403 });
    }
    const required = Number(curPre.requiredApprovals || approvalsRequired(curPre.environment));
    const result = await actionRef.transaction((cur) => {
        if (!cur)
            return cur;
        if (cur.status !== "requested")
            return cur;
        const prev = Array.isArray(cur.approvals) ? cur.approvals : [];
        if (prev.some((a) => (a === null || a === void 0 ? void 0 : a.uid) && a.uid === actor.uid))
            return cur;
        const nextApprovals = [...prev, { uid: actor.uid, email: actor.email, at: now }];
        if (nextApprovals.length >= required) {
            return Object.assign(Object.assign({}, cur), { requiredApprovals: required, approvals: nextApprovals, status: "approved", approvedAt: now, approvedBy: actor });
        }
        return Object.assign(Object.assign({}, cur), { requiredApprovals: required, approvals: nextApprovals });
    });
    if (!result.committed)
        throw Object.assign(new Error("Not found or not in requested state"), { status: 400 });
    await logAuditEvent({ at: now, action: "action.approve", ok: true, actor, targetId: id });
    const post = result.snapshot.val();
    return { ok: true, status: post === null || post === void 0 ? void 0 : post.status, approvals: Array.isArray(post === null || post === void 0 ? void 0 : post.approvals) ? post.approvals.length : 0, required };
}
exports.approveAction = approveAction;
async function cancelAction(actor, id) {
    const now = Date.now();
    const actionRef = admin_1.db.ref(`admin/ops/actions/${id}`);
    const result = await actionRef.transaction((cur) => {
        if (!cur)
            return cur;
        if (cur.status === "succeeded" || cur.status === "failed" || cur.status === "cancelled")
            return cur;
        return Object.assign(Object.assign({}, cur), { status: "cancelled", cancelledAt: now, cancelledBy: actor });
    });
    if (!result.committed)
        throw Object.assign(new Error("Not found"), { status: 404 });
    await logAuditEvent({ at: now, action: "action.cancel", ok: true, actor, targetId: id });
    return { ok: true };
}
exports.cancelAction = cancelAction;
async function processApprovedActions(limit = 5, opts) {
    var _a, _b;
    const now = Date.now();
    const enableExec = String(process.env.OPS_ENABLE_EXECUTION || "").trim().toLowerCase() === "true";
    const snap = await admin_1.db
        .ref("admin/ops/actions")
        .orderByChild("status")
        .equalTo("approved")
        .limitToFirst(Math.max(limit * 10, 25))
        .get();
    const rows = snap.val() || {};
    const ids = Object.keys(rows).filter((id) => {
        var _a;
        if (!(opts === null || opts === void 0 ? void 0 : opts.environment))
            return true;
        const env = (_a = rows === null || rows === void 0 ? void 0 : rows[id]) === null || _a === void 0 ? void 0 : _a.environment;
        return env === opts.environment;
    });
    const processed = [];
    for (const id of ids.slice(0, limit)) {
        const actionRef = admin_1.db.ref(`admin/ops/actions/${id}`);
        const startedAt = Date.now();
        const systemActor = { uid: "system", email: "system@ops" };
        // Claim the action (approved -> running).
        const claim = await actionRef.transaction((cur) => {
            if (!cur)
                return cur;
            if (cur.status !== "approved")
                return cur;
            return Object.assign(Object.assign({}, cur), { status: "running", execution: Object.assign(Object.assign({}, (cur.execution || {})), { startedAt, provider: enableExec ? "githubActions" : "none" }) });
        });
        if (!claim.committed)
            continue;
        try {
            const cur = claim.snapshot.val();
            if (!enableExec) {
                const finishedAt = Date.now();
                await actionRef.update({
                    status: "failed",
                    execution: Object.assign(Object.assign({}, (cur.execution || {})), { finishedAt, updatedAt: finishedAt, ok: false, message: "Execution disabled (set OPS_ENABLE_EXECUTION=true to enable)", provider: "none" }),
                });
                await logAuditEvent({
                    at: finishedAt,
                    action: "action.run",
                    ok: false,
                    actor: systemActor,
                    targetId: id,
                    meta: { provider: "none" },
                });
                processed.push({ id, ok: false, message: "Execution disabled" });
                continue;
            }
            const dispatch = await githubDispatchDeploy({
                actionId: id,
                environment: cur.environment,
                service: cur.service,
                version: (_a = cur.desired) === null || _a === void 0 ? void 0 : _a.version,
                gitSha: (_b = cur.desired) === null || _b === void 0 ? void 0 : _b.gitSha,
            });
            const updatedAt = Date.now();
            await actionRef.update({
                execution: Object.assign(Object.assign({}, (cur.execution || {})), { provider: "githubActions", ok: true, message: "Dispatched GitHub Actions deploy workflow", externalUrl: dispatch.workflowUrl || undefined, updatedAt }),
            });
            await logAuditEvent({
                at: updatedAt,
                action: "action.run",
                ok: true,
                actor: systemActor,
                targetId: id,
                meta: { provider: "githubActions", workflowUrl: dispatch.workflowUrl || null },
            });
            // Action remains in `running` until CI reports success/failure.
            processed.push({ id, ok: true, message: "Dispatched GitHub Actions workflow" });
        }
        catch (e) {
            const finishedAt = Date.now();
            const msg = safeString((e === null || e === void 0 ? void 0 : e.message) || e || "Failed", 500);
            await actionRef.update({
                status: "failed",
                execution: { finishedAt, updatedAt: finishedAt, ok: false, message: msg, provider: enableExec ? "githubActions" : "none" },
            });
            await logAuditEvent({ at: finishedAt, action: "action.run", ok: false, actor: systemActor, targetId: id, error: msg });
            processed.push({ id, ok: false, message: msg });
        }
    }
    return { ok: true, at: now, processed };
}
exports.processApprovedActions = processApprovedActions;
//# sourceMappingURL=opsActions.js.map