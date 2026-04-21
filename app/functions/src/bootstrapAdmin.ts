import { onRequest } from "firebase-functions/v2/https"
import { getAuth } from "firebase-admin/auth"
import { getDatabase } from "firebase-admin/database"
import { FUNCTION_KEYS } from "./keys"

type BootstrapMode = "create" | "promote"

function isEmulator(): boolean {
  return Boolean(process.env.FUNCTIONS_EMULATOR) || Boolean(process.env.FIREBASE_EMULATOR_HUB)
}

function json(res: any, status: number, body: any) {
  res.status(status).set("Content-Type", "application/json").send(JSON.stringify(body))
}

async function findUserByEmailInRtdb(db: ReturnType<typeof getDatabase>, email: string) {
  const normalized = String(email || "").trim().toLowerCase()
  if (!normalized) return null

  const usersRef = db.ref("users")
  // RTDB query: users ordered by email equals {email}
  const snap = await usersRef.orderByChild("email").equalTo(normalized).limitToFirst(1).get()
  if (!snap.exists()) return null

  const val = snap.val() || {}
  const key = Object.keys(val)[0]
  const userData = key ? val[key] : null
  if (!key || !userData) return null

  return { key, userData }
}

export const bootstrapAdmin = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("")
    return
  }
  if (req.method !== "POST") {
    json(res, 405, { success: false, error: "Method not allowed" })
    return
  }

  const body = (req.body || {}) as any
  const mode = String(body.mode || "") as BootstrapMode

  const enabledByKey = Boolean(FUNCTION_KEYS?.adminBootstrap?.enabled) &&
    String(body.bootstrapKey || "") === String(FUNCTION_KEYS?.adminBootstrap?.key || "")

  if (!isEmulator() && !enabledByKey) {
    json(res, 403, { success: false, error: "Admin bootstrap is disabled." })
    return
  }

  if (mode !== "create" && mode !== "promote") {
    json(res, 400, { success: false, error: "Invalid mode. Use 'create' or 'promote'." })
    return
  }

  try {
    const adminAuth = getAuth()
    const db = getDatabase()
    const now = Date.now()

    let userRecord: any
    let passwordEcho: string | undefined
    let promotedFrom: "auth" | "rtdb" = "auth"

    if (mode === "create") {
      const email = String(body.email || "").trim().toLowerCase()
      const password = String(body.password || "")
      const displayName = String(body.displayName || "Test Admin").trim()
      if (!email || !password) {
        json(res, 400, { success: false, error: "email and password are required for create." })
        return
      }

      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      })
      passwordEcho = password
    } else {
      const targetUid = String(body.uid || "").trim()
      const targetEmail = String(body.email || "").trim().toLowerCase()
      if (!targetUid && !targetEmail) {
        json(res, 400, { success: false, error: "uid or email is required for promote." })
        return
      }

      if (targetUid) {
        // Prefer Auth lookup by UID when provided (guarantees /users/{uid} is the correct key).
        userRecord = await adminAuth.getUser(targetUid)
      } else {
        // Promote by email: first try Auth (fast path). If that fails, fall back to RTDB /users lookup.
        try {
          userRecord = await adminAuth.getUserByEmail(targetEmail)
        } catch {
          const match = await findUserByEmailInRtdb(db, targetEmail)
          if (!match) {
            json(res, 404, { success: false, error: "No user found in /users for that email." })
            return
          }
          const inferredUid = String(match.userData?.uid || match.key || "").trim()
          if (!inferredUid) {
            json(res, 400, { success: false, error: "User record missing uid; cannot promote reliably." })
            return
          }

          promotedFrom = "rtdb"
          // Attempt to fetch Auth user by inferred uid (may not exist).
          try {
            userRecord = await adminAuth.getUser(inferredUid)
          } catch {
            userRecord = { uid: inferredUid, email: match.userData?.email || targetEmail, displayName: match.userData?.displayName || "" }
          }

          // Ensure canonical /users/{uid} exists (migrate if needed).
          if (match.key !== inferredUid) {
            await db.ref(`users/${inferredUid}`).update({
              ...(match.userData || {}),
              uid: inferredUid,
              email: String(match.userData?.email || targetEmail).trim().toLowerCase(),
              migratedAt: now,
              updatedAt: now,
            })
          }
        }
      }
    }

    const uid = userRecord.uid
    const email = userRecord.email || ""

    try {
      await adminAuth.setCustomUserClaims(uid, {
        ...(userRecord.customClaims || {}),
        isAdmin: true,
      })
    } catch {
      // Claims are optional for this app (we primarily use RTDB isAdmin).
    }

    // Ensure a usable user profile exists for SettingsContext login (expects companies array).
    const userRef = db.ref(`users/${uid}`)
    await userRef.update({
      uid,
      email: String(email || "").trim().toLowerCase(),
      displayName: userRecord.displayName || "",
      isAdmin: true,
      companies: [],
      updatedAt: now,
      ...(mode === "create" ? { createdAt: now } : {}),
    })

    json(res, 200, {
      success: true,
      mode,
      uid,
      email,
      password: passwordEcho, // only present for create
      emulator: isEmulator(),
      promotedFrom,
    })
  } catch (e: any) {
    json(res, 500, { success: false, error: e?.message || String(e) })
  }
})

