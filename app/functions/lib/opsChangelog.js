"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProdReleaseAndChangelog = void 0;
const admin_1 = require("./admin");
function requireEnv(name) {
    const v = String(process.env[name] || "").trim();
    if (!v)
        throw new Error(`Missing env: ${name}`);
    return v;
}
function readEnv(name) {
    const v = String(process.env[name] || "").trim();
    return v ? v : undefined;
}
function extractJiraKeys(text) {
    const s = String(text || "");
    const matches = s.match(/\\b[A-Z][A-Z0-9]+-\\d+\\b/g) || [];
    const uniq = Array.from(new Set(matches.map((m) => m.toUpperCase())));
    return uniq.slice(0, 25);
}
async function githubRequest(path) {
    const token = readEnv("GITHUB_TOKEN") || readEnv("GITHUB_CI_TOKEN") || "";
    if (!token)
        throw new Error("Missing env: GITHUB_TOKEN (or GITHUB_CI_TOKEN)");
    const res = await fetch(`https://api.github.com${path}`, {
        method: "GET",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "1stop-ops",
        },
    });
    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch (_a) {
        data = text;
    }
    if (!res.ok) {
        const msg = typeof (data === null || data === void 0 ? void 0 : data.message) === "string" ? data.message : `GitHub request failed (${res.status})`;
        throw new Error(msg);
    }
    return data;
}
async function findPreviousProdSha(currentSha) {
    const snap = await admin_1.db.ref("admin/ops/deployments").orderByChild("deployTime").limitToLast(50).get();
    const v = snap.val() || {};
    const rows = Object.entries(v);
    rows.sort((a, b) => { var _a, _b, _c, _d; return Number(((_a = b[1]) === null || _a === void 0 ? void 0 : _a.deployTime) || ((_b = b[1]) === null || _b === void 0 ? void 0 : _b.createdAt) || 0) - Number(((_c = a[1]) === null || _c === void 0 ? void 0 : _c.deployTime) || ((_d = a[1]) === null || _d === void 0 ? void 0 : _d.createdAt) || 0); });
    for (const [_id, raw] of rows) {
        if (String((raw === null || raw === void 0 ? void 0 : raw.environment) || "") !== "prod")
            continue;
        const sha = String((raw === null || raw === void 0 ? void 0 : raw.gitSha) || "").trim();
        if (!sha)
            continue;
        if (sha === currentSha)
            continue;
        return sha;
    }
    return null;
}
async function createProdReleaseAndChangelog(params) {
    const version = String(params.version || "").trim();
    const gitSha = String(params.gitSha || "").trim();
    if (!version || !gitSha)
        return { ok: false, skipped: true };
    const owner = requireEnv("GITHUB_OWNER");
    const repo = requireEnv("GITHUB_REPO");
    const baseSha = await findPreviousProdSha(gitSha);
    let commits = [];
    if (baseSha) {
        const compare = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(baseSha)}...${encodeURIComponent(gitSha)}`);
        const arr = Array.isArray(compare === null || compare === void 0 ? void 0 : compare.commits) ? compare.commits : [];
        commits = arr.slice(0, 250).map((c) => {
            var _a;
            const sha = String((c === null || c === void 0 ? void 0 : c.sha) || "");
            const msg = String(((_a = c === null || c === void 0 ? void 0 : c.commit) === null || _a === void 0 ? void 0 : _a.message) || "").slice(0, 5000);
            return {
                sha,
                message: msg,
                url: (c === null || c === void 0 ? void 0 : c.html_url) ? String(c.html_url) : null,
                issueKeys: extractJiraKeys(msg),
            };
        });
    }
    else {
        // Fallback: use cached latest commits (best-effort)
        const snap = await admin_1.db.ref("admin/ops/providers/github/commits").get();
        const arr = snap.val();
        if (Array.isArray(arr)) {
            commits = arr.slice(0, 50).map((c) => {
                const sha = String((c === null || c === void 0 ? void 0 : c.sha) || "");
                const msg = String((c === null || c === void 0 ? void 0 : c.message) || "").slice(0, 5000);
                return { sha, message: msg, url: (c === null || c === void 0 ? void 0 : c.url) ? String(c.url) : null, issueKeys: extractJiraKeys(msg) };
            });
        }
    }
    const issueKeys = Array.from(new Set(commits
        .flatMap((c) => (Array.isArray(c.issueKeys) ? c.issueKeys : []))
        .map((k) => String(k || "").trim().toUpperCase())
        .filter(Boolean))).slice(0, 50);
    const issues = [];
    for (const k of issueKeys.slice(0, 50)) {
        const s = await admin_1.db.ref(`admin/ops/providers/jira/issuesByKey/${k}`).get();
        const row = s.val();
        if (row && typeof row === "object") {
            issues.push({
                key: String(row.key || k),
                id: row.id ? String(row.id) : null,
                summary: row.summary ? String(row.summary) : null,
                status: row.status ? String(row.status) : null,
                updated: row.updated ? String(row.updated) : null,
                url: row.url ? String(row.url) : null,
            });
        }
        else {
            issues.push({ key: k, id: null, summary: null, status: null, updated: null, url: null });
        }
    }
    const now = Date.now();
    const relRef = admin_1.db.ref("admin/ops/releases").push();
    const releaseId = relRef.key || "";
    await relRef.set({
        version,
        gitSha,
        notes: null,
        createdAt: now,
        actor: params.actor || null,
        deploymentId: params.deploymentId || null,
        actionId: params.actionId || null,
        executionUrl: params.executionUrl || null,
    });
    await admin_1.db.ref(`admin/ops/changelogs/${releaseId}`).set({
        version,
        gitSha,
        baseGitSha: baseSha || null,
        createdAt: now,
        actionId: params.actionId || null,
        deploymentId: params.deploymentId || null,
        executionUrl: params.executionUrl || null,
        issues,
        commits: commits.map((c) => ({
            sha: c.sha,
            message: c.message,
            url: c.url,
            issueKeys: Array.isArray(c.issueKeys) && c.issueKeys.length ? c.issueKeys : null,
        })),
    });
    return { ok: true, releaseId };
}
exports.createProdReleaseAndChangelog = createProdReleaseAndChangelog;
//# sourceMappingURL=opsChangelog.js.map