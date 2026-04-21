import { onRequest } from "firebase-functions/v2/https";
import { db as adminDb } from "./admin";
import { getAuth } from "firebase-admin/auth";

type AdminPageKey =
  | "dashboard"
  | "profile"
  | "viewer"
  | "calendar"
  | "integrations"
  | "crm"
  | "projects"
  | "tasks"
  | "social"
  | "content"
  | "marketing"
  | "email"
  | "referrals"
  | "analytics"
  | "notes"
  | "qr"
  | "contracts"
  | "clients"
  | "companyViewer"
  | "createCompany"
  | "createAdmin"
  | "staff"
  | "ops";

type OpsPerms = {
  request?: boolean;
  approveTest?: boolean;
  approveProd?: boolean;
  process?: boolean;
  syncProviders?: boolean;
  manageAuthEmails?: boolean;
};

function nowMs() {
  return Date.now();
}

function toBool(value: unknown): boolean {
  return Boolean(value);
}

function buildAllowedPages(pages: Record<string, boolean>): Record<AdminPageKey, boolean> {
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

async function requireUser(req: any) {
  const authHeader = String(req.headers?.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) throw new Error("Missing Authorization Bearer token");
  const decoded = await getAuth().verifyIdToken(token);
  return decoded;
}

async function isSuperAdmin(uid: string): Promise<boolean> {
  const snap = await adminDb.ref(`users/${uid}/isAdmin`).get();
  return Boolean(snap.val());
}

export const createAdminInvite = onRequest({ cors: true }, async (req, res) => {
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

    const email = String(req.body?.email || "").trim().toLowerCase();
    const pages = (req.body?.pages || {}) as Record<string, boolean>;
    const opsPerms = (req.body?.opsPerms || {}) as OpsPerms;
    const expiresInHours = Number(req.body?.expiresInHours || 168); // default 7 days
    const appOrigin = String(req.body?.appOrigin || req.headers.origin || "").trim();

    if (!email) {
      res.status(400).json({ success: false, error: "email is required" });
      return;
    }

    const allowedPages = buildAllowedPages(pages);

    const inviteRef = adminDb.ref("admin/staffInvites").push();
    const inviteId = inviteRef.key as string;
    const createdAt = nowMs();
    const expiresAt = createdAt + Math.max(1, expiresInHours) * 60 * 60 * 1000;

    await inviteRef.set({
      inviteId,
      email,
      pages: allowedPages,
      opsPerms: {
        request: Boolean((opsPerms as any)?.request),
        approveTest: Boolean((opsPerms as any)?.approveTest),
        approveProd: Boolean((opsPerms as any)?.approveProd),
        process: Boolean((opsPerms as any)?.process),
        syncProviders: Boolean((opsPerms as any)?.syncProviders),
        manageAuthEmails: Boolean((opsPerms as any)?.manageAuthEmails),
      },
      createdAt,
      createdBy: uid,
      expiresAt,
      claimed: false,
    });

    const link = appOrigin ? `${appOrigin.replace(/\/$/, "")}/AdminInvite/${inviteId}` : `/AdminInvite/${inviteId}`;
    res.json({ success: true, inviteId, link, expiresAt });
  } catch (e: any) {
    console.error("createAdminInvite error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

export const claimAdminInvite = onRequest({ cors: true }, async (req, res) => {
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

    const inviteId = String(req.body?.inviteId || "").trim();
    if (!inviteId) {
      res.status(400).json({ success: false, error: "inviteId is required" });
      return;
    }

    const inviteRef = adminDb.ref(`admin/staffInvites/${inviteId}`);
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

    await adminDb.ref(`users/${uid}/adminStaff`).set(adminStaff);
    await adminDb.ref(`admin/staff/${uid}`).set({
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
  } catch (e: any) {
    console.error("claimAdminInvite error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

