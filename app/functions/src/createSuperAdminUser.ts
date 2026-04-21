import { onRequest } from "firebase-functions/v2/https";
import { db as adminDb } from "./admin";
import { getAuth } from "firebase-admin/auth";

function nowMs() {
  return Date.now();
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

export const createSuperAdminUser = onRequest({ cors: true }, async (req, res) => {
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
    const requesterUid = decoded.uid;
    const ok = await isSuperAdmin(requesterUid);
    if (!ok) {
      res.status(403).json({ success: false, error: "Not authorized" });
      return;
    }

    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim();
    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const addToAllCompanies = Boolean(req.body?.addToAllCompanies ?? true);

    if (!email || !password || !displayName) {
      res.status(400).json({ success: false, error: "email, password, and displayName are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
      return;
    }

    const auth = getAuth();
    const created = await auth.createUser({
      email,
      password,
      displayName,
    });

    const uid = created.uid;
    const now = nowMs();

    // Create user profile in RTDB
    await adminDb.ref(`users/${uid}`).set({
      uid,
      email,
      displayName,
      firstName,
      lastName,
      photoURL: "",
      createdAt: now,
      lastLogin: now,
      isAdmin: true,
      settings: {
        theme: "light",
        notifications: true,
        language: "en",
      },
    });

    if (addToAllCompanies) {
      const companiesSnap = await adminDb.ref("companies").get();
      const companies = companiesSnap.val() || {};
      const updates: Record<string, any> = {};
      let first = true;

      Object.keys(companies).forEach((companyId) => {
        const companyName = companies?.[companyId]?.companyName || "Unknown Company";
        const companyData = {
          companyID: companyId,
          companyName,
          role: "owner",
          department: "Management",
          joinedAt: now,
          isDefault: first,
        };
        first = false;
        updates[`users/${uid}/companies/${companyId}`] = companyData;
        updates[`companies/${companyId}/users/${uid}`] = {
          role: "owner",
          department: "Management",
          joinedAt: now,
          email,
          displayName,
        };
      });

      if (Object.keys(updates).length > 0) {
        await adminDb.ref().update(updates);
      }
    }

    res.json({ success: true, uid });
  } catch (e: any) {
    console.error("createSuperAdminUser error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

