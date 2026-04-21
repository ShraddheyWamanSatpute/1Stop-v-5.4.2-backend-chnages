"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimAdminInvite = exports.createAdminInvite = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const auth_1 = require("firebase-admin/auth");
function nowMs() {
    return Date.now();
}
function toBool(value) {
    return Boolean(value);
}
function buildAllowedPages(pages) {
    const viewer = toBool(pages.viewer);
    const crm = toBool(pages.crm);
    const tasks = toBool(pages.tasks);
    return {
        dashboard: true,
        profile: true,
        viewer,
        companyViewer: viewer,
        calendar: toBool(pages.calendar),
        integrations: toBool(pages.integrations),
        crm,
        clients: crm || toBool(pages.clients),
        contracts: crm || toBool(pages.contracts),
        qr: crm || toBool(pages.qr),
        tasks,
        projects: tasks || toBool(pages.projects),
        notes: tasks || toBool(pages.notes),
        social: toBool(pages.social),
        content: toBool(pages.content),
        marketing: toBool(pages.marketing),
        email: toBool(pages.email),
        referrals: toBool(pages.referrals),
        analytics: toBool(pages.analytics),
        createCompany: toBool(pages.createCompany),
        createAdmin: toBool(pages.createAdmin),
        staff: toBool(pages.staff),
        ops: toBool(pages.ops),
    };
}
async function requireUser(req) {
    var _a;
    const authHeader = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!token)
        throw new Error("Missing Authorization Bearer token");
    const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
    return decoded;
}
async function isSuperAdmin(uid) {
    const snap = await admin_1.db.ref(`users/${uid}/isAdmin`).get();
    return Boolean(snap.val());
}
exports.createAdminInvite = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method not allowed" });
            return;
        }
        const decoded = await requireUser(req);
        const uid = decoded.uid;
        const ok = await isSuperAdmin(uid);
        if (!ok) {
            res.status(403).json({ success: false, error: "Not authorized" });
            return;
        }
        const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || "").trim().toLowerCase();
        const pages = (((_b = req.body) === null || _b === void 0 ? void 0 : _b.pages) || {});
        const opsPerms = (((_c = req.body) === null || _c === void 0 ? void 0 : _c.opsPerms) || {});
        const expiresInHours = Number(((_d = req.body) === null || _d === void 0 ? void 0 : _d.expiresInHours) || 168); // default 7 days
        const appOrigin = String(((_e = req.body) === null || _e === void 0 ? void 0 : _e.appOrigin) || req.headers.origin || "").trim();
        if (!email) {
            res.status(400).json({ success: false, error: "email is required" });
            return;
        }
        const allowedPages = buildAllowedPages(pages);
        const inviteRef = admin_1.db.ref("admin/staffInvites").push();
        const inviteId = inviteRef.key;
        const createdAt = nowMs();
        const expiresAt = createdAt + Math.max(1, expiresInHours) * 60 * 60 * 1000;
        await inviteRef.set({
            inviteId,
            email,
            pages: allowedPages,
            opsPerms: {
                request: Boolean(opsPerms === null || opsPerms === void 0 ? void 0 : opsPerms.request),
                approveTest: Boolean(opsPerms === null || opsPerms === void 0 ? void 0 : opsPerms.approveTest),
                approveProd: Boolean(opsPerms === null || opsPerms === void 0 ? void 0 : opsPerms.approveProd),
                process: Boolean(opsPerms === null || opsPerms === void 0 ? void 0 : opsPerms.process),
                syncProviders: Boolean(opsPerms === null || opsPerms === void 0 ? void 0 : opsPerms.syncProviders),
                manageAuthEmails: Boolean(opsPerms === null || opsPerms === void 0 ? void 0 : opsPerms.manageAuthEmails),
            },
            createdAt,
            createdBy: uid,
            expiresAt,
            claimed: false,
        });
        const link = appOrigin ? `${appOrigin.replace(/\/$/, "")}/AdminInvite/${inviteId}` : `/AdminInvite/${inviteId}`;
        res.json({ success: true, inviteId, link, expiresAt });
    }
    catch (e) {
        console.error("createAdminInvite error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
exports.claimAdminInvite = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a;
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method not allowed" });
            return;
        }
        const decoded = await requireUser(req);
        const uid = decoded.uid;
        const userEmail = String(decoded.email || "").toLowerCase();
        const inviteId = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.inviteId) || "").trim();
        if (!inviteId) {
            res.status(400).json({ success: false, error: "inviteId is required" });
            return;
        }
        const inviteRef = admin_1.db.ref(`admin/staffInvites/${inviteId}`);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists()) {
            res.status(404).json({ success: false, error: "Invite not found" });
            return;
        }
        const invite = inviteSnap.val() || {};
        if (invite.claimed) {
            res.status(409).json({ success: false, error: "Invite already claimed" });
            return;
        }
        if (invite.expiresAt && nowMs() > Number(invite.expiresAt)) {
            res.status(410).json({ success: false, error: "Invite expired" });
            return;
        }
        if (invite.email && userEmail && String(invite.email).toLowerCase() !== userEmail) {
            res.status(403).json({ success: false, error: "Invite email does not match signed-in user" });
            return;
        }
        const pages = invite.pages || {};
        const opsPerms = invite.opsPerms || {};
        const adminStaff = {
            active: true,
            pages,
            permissions: {
                ops: opsPerms,
            },
            joinedAt: nowMs(),
            inviteId,
        };
        await admin_1.db.ref(`users/${uid}/adminStaff`).set(adminStaff);
        await admin_1.db.ref(`admin/staff/${uid}`).set({
            uid,
            email: userEmail || invite.email || "",
            pages,
            permissions: {
                ops: opsPerms,
            },
            active: true,
            joinedAt: nowMs(),
        });
        await inviteRef.update({
            claimed: true,
            claimedAt: nowMs(),
            claimedBy: uid,
        });
        res.json({ success: true });
    }
    catch (e) {
        console.error("claimAdminInvite error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
//# sourceMappingURL=adminStaffInvites.js.map