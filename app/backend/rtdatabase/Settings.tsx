import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { ref, set, get, update, onValue, off, remove } from 'firebase/database';
import { db } from "../services/Firebase";
import { APP_KEYS, getFunctionsBaseUrl } from "../../backend/config/keys"
import {
  User,
  UserCompany,
  PersonalSettings,
  PreferencesSettings,
  BusinessSettings,
  Settings
} from "../interfaces/Settings";

const stripUndefinedDeep = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map((v) => (v === undefined ? null : stripUndefinedDeep(v)))
  if (typeof obj !== "object") return obj
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)])
  )
}

// ========== FIREBASE AUTHENTICATION FUNCTIONS ==========

function defaultContinueUrl(): string {
  if (typeof window === "undefined") return ""
  return String(window.location.origin || "").trim()
}

function functionsBaseUrl(): string {
  return getFunctionsBaseUrl({
    projectId: APP_KEYS.firebase.projectId,
    region: APP_KEYS.firebase.functionsRegion || "us-central1",
  })
}

async function sendCustomAuthEmail(params: { type: "verifyEmail" | "passwordReset" | "magicLink"; email?: string; continueUrl?: string; authToken?: string }) {
  const url = `${functionsBaseUrl()}/sendAuthEmail`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(params.authToken ? { Authorization: `Bearer ${params.authToken}` } : {}),
    },
    body: JSON.stringify({
      type: params.type,
      email: params.email,
      continueUrl: params.continueUrl || defaultContinueUrl(),
    }),
  })
  const text = await res.text().catch(() => "")
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(data?.error || `Failed to send email (${res.status})`)
  }
  return data
}

/**
 * Sign in with email and password
 * @param email User email
 * @param password User password
 * @returns User ID and email
 */
export const signInWithEmail = async (email: string, password: string): Promise<{ uid: string; email: string }> => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;
    
    // Enforce verification for login UX.
    // If unverified, sign out and throw a recognizable error so the UI can suggest "resend".
    // Note: `emailVerified` can be stale until we reload the user record.
    // Also, verification can take a moment to propagate right after the link is clicked.
    const tryReload = async () => {
      try {
        await userCredential.user.reload()
      } catch {
        // ignore - we'll fall back to the current flag
      }
    }
    await tryReload()
    if (!userCredential.user.emailVerified) {
      // Small grace period + second reload for propagation.
      await new Promise((r) => setTimeout(r, 1500))
      await tryReload()
    }

    if (!userCredential.user.emailVerified) {
      try {
        await signOut(auth)
      } catch {
        // ignore
      }
      const e: any = new Error("EMAIL_NOT_VERIFIED")
      e.code = "EMAIL_NOT_VERIFIED"
      // Help diagnose "verified in another project" issues.
      try {
        e.projectId = (auth as any)?.app?.options?.projectId
        e.authDomain = (auth as any)?.app?.options?.authDomain
        e.uid = uid
        e.email = userEmail || email
      } catch {
        // ignore
      }
      throw e
    }
    
    return { uid, email: userEmail || email };
  } catch (error: any) {
    // Provide more specific error messages
    let errorMessage = "Authentication failed";
    
    if (error?.code === "EMAIL_NOT_VERIFIED" || String(error?.message || "").includes("EMAIL_NOT_VERIFIED")) {
      // Keep this human-friendly; the UI will show the resend option.
      const projectSuffix =
        error?.projectId ? ` (project: ${String(error.projectId)})` : ""
      const userSuffix =
        error?.uid || error?.email ? ` (user: ${String(error?.email || "")} ${String(error?.uid || "")}`.trim() + `)` : ""
      errorMessage = "Your email isn’t verified yet. Please verify your email to continue." + projectSuffix + userSuffix
    } else
    if (error.code === "auth/user-not-found") {
      errorMessage = "No account found with this email address";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password";
    } else if (error.code === "auth/invalid-credential") {
      errorMessage = "Invalid email or password";
    } else if (error.code === "auth/user-disabled") {
      errorMessage = "This account has been disabled";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many failed attempts. Please try again later";
    } else if (error.code === "auth/network-request-failed") {
      errorMessage = "Network error. Please check your connection";
    }
    
    throw new Error(`${errorMessage}: ${error.message}`);
  }
};

/**
 * Sign up with email and password
 * @param email User email
 * @param password User password
 * @returns User ID and email
 */
export const signUpWithEmail = async (email: string, password: string): Promise<{ uid: string; email: string }> => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;

    // Send custom verification email (preferred)
    try {
      const token = await userCredential.user.getIdToken()
      await sendCustomAuthEmail({ type: "verifyEmail", authToken: token })
    } catch (e) {
      // Fallback to Firebase default template if custom sender isn't configured yet.
      try {
        await sendEmailVerification(userCredential.user)
      } catch {
        // ignore
      }
      console.warn("Custom verification email failed, fell back to Firebase template:", e)
    }
    
    return { uid, email: userEmail || email };
  } catch (error) {
    throw new Error(`Registration failed: ${error}`);
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    const auth = getAuth();
    await signOut(auth);
  } catch (error) {
    throw new Error(`Sign out failed: ${error}`);
  }
};

/**
 * Resend email verification
 * @param user Firebase user object
 */
export const resendEmailVerification = async (user: FirebaseUser): Promise<void> => {
  try {
    // Prefer custom template sender.
    const auth = getAuth()
    const current = auth.currentUser
    if (current) {
      const token = await current.getIdToken()
      await sendCustomAuthEmail({ type: "verifyEmail", authToken: token })
      return
    }
    // fallback
    await sendEmailVerification(user)
  } catch (error: any) {
    throw new Error(`Failed to resend verification email: ${error.message}`);
  }
};

/**
 * Send password reset email
 * @param email User email
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    // Prefer custom template sender.
    try {
      await sendCustomAuthEmail({ type: "passwordReset", email })
    } catch (e) {
      // fallback
      const auth = getAuth()
      await sendPasswordResetEmail(auth, email)
      console.warn("Custom password reset email failed, fell back to Firebase template:", e)
    }
  } catch (error) {
    throw new Error(`Password reset failed: ${error}`);
  }
};

/**
 * Preferred custom verification email sender.
 * Can be used by future UI actions (e.g. "Resend verification email").
 */
export const sendCustomVerificationEmail = async (): Promise<void> => {
  const auth = getAuth()
  const current = auth.currentUser
  if (!current) throw new Error("Not signed in")
  const token = await current.getIdToken()
  await sendCustomAuthEmail({ type: "verifyEmail", authToken: token })
}

/**
 * Resend verification without signing in (Login screen helper).
 * Server suppresses "user not found" to avoid account enumeration.
 */
export const sendCustomVerificationEmailToEmail = async (email: string): Promise<void> => {
  await sendCustomAuthEmail({ type: "verifyEmail", email })
}

/**
 * Update user profile
 * @param updates Profile updates
 */
export const updateUserFirebaseProfile = async (updates: { displayName?: string; photoURL?: string }): Promise<void> => {
  try {
    const auth = getAuth();
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, updates);
    } else {
      throw new Error('No authenticated user');
    }
  } catch (error) {
    throw new Error(`Profile update failed: ${error}`);
  }
};

/**
 * Get current authenticated user
 * @returns FirebaseUser or null
 */
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  const auth = getAuth();
  return auth.currentUser;
};

/**
 * Login user with email and password
 * @param email User email
 * @param password User password
 * @returns User credential with uid and email
 */
export const loginWithEmailAndPassword = async (email: string, password: string): Promise<{ uid: string; email: string }> => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;
    
    return { uid, email: userEmail || email };
  } catch (error) {
    throw new Error(`Login failed: ${error}`);
  }
};

/**
 * Register new user with email and password
 * @param email User email
 * @param password User password
 * @param displayName Optional display name
 * @returns User credential with uid and email
 */
export const registerWithEmailAndPassword = async (email: string, password: string, displayName?: string): Promise<{ uid: string; email: string }> => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;
    
    // Update Firebase Auth profile if displayName provided
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    // Send email verification
    try {
      const token = await userCredential.user.getIdToken()
      await sendCustomAuthEmail({ type: "verifyEmail", authToken: token })
    } catch (verificationError) {
      console.warn("Email verification could not be sent:", verificationError);
      // Don't fail registration if email verification fails
    }
    
    return { uid, email: userEmail || email };
  } catch (error: any) {
    // Provide more specific error messages for registration
    let errorMessage = "Registration failed";
    
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "An account with this email already exists";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password should be at least 6 characters";
    } else if (error.code === "auth/operation-not-allowed") {
      errorMessage = "Email/password accounts are not enabled";
    }
    
    throw new Error(`${errorMessage}: ${error.message}`);
  }
};

/**
 * Create user profile in database
 * @param userProfile User profile data
 */
export const createUserProfileInDb = async (userProfile: any): Promise<void> => {
  try {
    const userRef = ref(db, `users/${userProfile.uid}`);
    await set(userRef, userProfile);
  } catch (error) {
    throw new Error(`Error creating user profile: ${error}`);
  }
};

/**
 * Update user avatar
 * @param uid User ID
 * @param avatarUrl Avatar URL
 */
export const updateAvatarInDb = async (uid: string, avatarUrl: string): Promise<void> => {
  try {
    const avatarRef = ref(db, `users/${uid}/settings/personal/avatar`);
    await set(avatarRef, avatarUrl);
  } catch (error) {
    throw new Error(`Error updating avatar: ${error}`);
  }
};

/**
 * Update user theme
 * @param uid User ID
 * @param theme Theme setting
 */
export const updateThemeInDb = async (uid: string, theme: string): Promise<void> => {
  try {
    const themeRef = ref(db, `users/${uid}/settings/preferences/theme`);
    await set(themeRef, theme);
  } catch (error) {
    throw new Error(`Error updating theme: ${error}`);
  }
};

/**
 * Update business logo
 * @param companyId Company ID
 * @param logoUrl Logo URL
 */
export const updateBusinessLogoInDb = async (companyId: string, logoUrl: string): Promise<void> => {
  try {
    const logoRef = ref(db, `companies/${companyId}/businessInfo/logo`);
    await set(logoRef, logoUrl);
  } catch (error) {
    throw new Error(`Error updating business logo: ${error}`);
  }
};

// ========== USER AUTHENTICATION DATABASE FUNCTIONS ==========

/**
 * Get user data from database
 * @param uid User ID
 * @returns User object or null if not found
 */
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as User;
    }
    return null;
  } catch (error) {
    throw new Error(`Error fetching user data: ${error}`);
  }
};

/**
 * Update user data in database
 * @param uid User ID
 * @param userData Partial user data to update
 */
export const updateUserData = async (uid: string, userData: Partial<User>): Promise<void> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, { ...stripUndefinedDeep(userData), updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating user data: ${error}`);
  }
};

/**
 * Set current company for user
 * @param uid User ID
 * @param companyID Company ID
 */
export const setCurrentCompany = async (uid: string, companyID: string): Promise<void> => {
  try {
    const userRef = ref(db, `users/${uid}/currentCompanyID`);
    await set(userRef, companyID);
  } catch (error) {
    throw new Error(`Error setting current company: ${error}`);
  }
};

/**
 * Add company to user's companies list
 * @param uid User ID
 * @param company Company object
 */
export const addCompanyToUser = async (uid: string, company: UserCompany): Promise<void> => {
  try {
    const userCompaniesRef = ref(db, `users/${uid}/companies`);
    const snapshot = await get(userCompaniesRef);

    const raw = snapshot.exists() ? snapshot.val() : null;

    // Canonical storage is a map keyed by companyID because many parts of the app
    // read `users/{uid}/companies/{companyId}` directly.
    //
    // Back-compat: if companies is stored as an array (legacy), migrate to a map.
    const map: Record<string, any> = {};

    if (Array.isArray(raw)) {
      for (const entry of raw) {
        const id = String((entry as any)?.companyID || (entry as any)?.companyId || "").trim();
        if (id) map[id] = entry;
      }
    } else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) {
        const id = String((v as any)?.companyID || (v as any)?.companyId || k || "").trim();
        if (id) map[id] = v;
      }
    }

    const companyId = String((company as any)?.companyID || (company as any)?.companyId || "").trim();
    if (!companyId) {
      throw new Error("Company companyID is required");
    }

    map[companyId] = {
      ...(map[companyId] || {}),
      ...(company as any),
      companyID: companyId,
    };

    await set(userCompaniesRef, map);
  } catch (error) {
    throw new Error(`Error adding company to user: ${error}`);
  }
};

/**
 * Remove company from user's companies list
 * @param uid User ID
 * @param companyID Company ID
 */
export const removeCompanyFromUser = async (uid: string, companyID: string): Promise<void> => {
  try {
    const companyId = String(companyID || "").trim();
    if (!companyId) return;

    // Prefer removing the canonical keyed entry (map format).
    const keyedRef = ref(db, `users/${uid}/companies/${companyId}`);
    await remove(keyedRef).catch(() => {});

    // Back-compat cleanup: if stored as an array, migrate to a map and remove key.
    const userCompaniesRef = ref(db, `users/${uid}/companies`);
    const snapshot = await get(userCompaniesRef);
    if (!snapshot.exists()) return;

    const raw = snapshot.val();
    if (Array.isArray(raw)) {
      const map: Record<string, any> = {};
      for (const entry of raw) {
        const id = String((entry as any)?.companyID || (entry as any)?.companyId || "").trim();
        if (id && id !== companyId) map[id] = entry;
      }
      await set(userCompaniesRef, map);
    }
  } catch (error) {
    throw new Error(`Error removing company from user: ${error}`);
  }
};

// ========== PERSONAL SETTINGS DATABASE FUNCTIONS ==========

/**
 * Fetch user's personal settings from user root level
 * @param uid User ID
 * @returns Personal settings object
 */
export const fetchUserPersonalSettings = async (uid: string): Promise<PersonalSettings> => {
  try {
    // Primary source of truth: settings path (supports nested address/bank/emergency fields)
    const personalRef = ref(db, `users/${uid}/settings/personal`);
    const personalSnap = await get(personalRef);

    const defaults: PersonalSettings = {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      avatar: "",
      address: { street: "", city: "", state: "", zipCode: "", country: "" },
      bankDetails: { accountHolderName: "", bankName: "", accountNumber: "", sortCode: "", iban: "" },
      niNumber: "",
      taxCode: "",
      emergencyContact: { name: "", relationship: "", phone: "", email: "" },
      emergencyContacts: [],
    };

    if (personalSnap.exists()) {
      const p = personalSnap.val() as Partial<PersonalSettings>;
      const emergencyContacts =
        (Array.isArray((p as any).emergencyContacts) && (p as any).emergencyContacts) ||
        ((p as any).emergencyContact ? [(p as any).emergencyContact] : []) ||
        []
      return {
        ...defaults,
        ...p,
        address: { ...defaults.address, ...(p.address || {}) } as typeof defaults.address,
        bankDetails: { ...defaults.bankDetails, ...(p.bankDetails || {}) } as typeof defaults.bankDetails,
        emergencyContact: { ...defaults.emergencyContact, ...(p.emergencyContact || {}) } as typeof defaults.emergencyContact,
        emergencyContacts,
      };
    }

    // Fallback: legacy user root fields (older schema)
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const userData = snapshot.val() || {};
      const legacy: Partial<PersonalSettings> = {
        firstName: userData.firstName || "",
        middleName: userData.middleName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        phone: userData.phone || "",
        jobTitle: userData.jobTitle || "",
        avatar: userData.avatar || userData.photoURL || "",
        address: userData.address || userData.personal?.address,
        bankDetails: userData.bankDetails || userData.personal?.bankDetails,
        niNumber: userData.niNumber || userData.personal?.niNumber,
        taxCode: userData.taxCode || userData.personal?.taxCode,
        emergencyContact: userData.emergencyContact || userData.personal?.emergencyContact,
        emergencyContacts: userData.emergencyContacts || userData.personal?.emergencyContacts,
      };

      const legacyEmergencyContacts =
        (Array.isArray((legacy as any).emergencyContacts) && (legacy as any).emergencyContacts) ||
        ((legacy as any).emergencyContact ? [(legacy as any).emergencyContact] : []) ||
        []
      return {
        ...defaults,
        ...legacy,
        address: { ...defaults.address, ...((legacy.address as any) || {}) },
        bankDetails: { ...defaults.bankDetails, ...((legacy.bankDetails as any) || {}) },
        emergencyContact: { ...defaults.emergencyContact, ...((legacy.emergencyContact as any) || {}) },
        emergencyContacts: legacyEmergencyContacts,
      };
    }

    return defaults;
  } catch (error) {
    throw new Error(`Error fetching user personal settings: ${error}`);
  }
};

/**
 * Fetch user's personal settings from settings path
 * @param uid User ID
 * @returns Personal settings object
 */
export const fetchPersonalSettings = async (uid: string): Promise<PersonalSettings> => {
  return fetchUserPersonalSettings(uid);
};

/**
 * Update user's personal settings
 * @param uid User ID
 * @param personalSettings Personal settings object
 */
export const updatePersonalSettings = async (uid: string, personalSettings: Partial<PersonalSettings>): Promise<void> => {
  try {
    const personalRef = ref(db, `users/${uid}/settings/personal`);
    await update(personalRef, { ...stripUndefinedDeep(personalSettings), updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating personal settings: ${error}`);
  }
};

/**
 * Update user's avatar
 * @param uid User ID
 * @param avatarUrl URL of the avatar image
 */
export const updateAvatar = async (uid: string, avatarUrl: string): Promise<void> => {
  try {
    const avatarRef = ref(db, `users/${uid}/settings/personal/avatar`);
    await set(avatarRef, avatarUrl);
  } catch (error) {
    throw new Error(`Error updating avatar: ${error}`);
  }
};

// ========== PREFERENCES SETTINGS DATABASE FUNCTIONS ==========

/**
 * Fetch user's preferences settings from user settings path
 * @param uid User ID
 * @returns Preferences settings object
 */
export const fetchUserPreferencesSettings = async (uid: string): Promise<PreferencesSettings> => {
  try {
    // Primary (current): `users/{uid}/settings/preferences`
    // Legacy/compat: some installs stored preferences at `users/{uid}/settings`
    const [prefSnap, legacySnap] = await Promise.all([
      get(ref(db, `users/${uid}/settings/preferences`)),
      get(ref(db, `users/${uid}/settings`)),
    ]);

    const prefData = prefSnap.exists() ? prefSnap.val() : null;
    const legacyData = legacySnap.exists() ? legacySnap.val() : null;

    const source = prefData || legacyData || {};

    return {
      theme: source.theme || "light",
      notifications: {
        email: source.notifications?.email ?? true,
        push: source.notifications?.push ?? true,
        sms: source.notifications?.sms ?? false,
      },
      emailPreferences: {
        lowStock: source.emailPreferences?.lowStock ?? true,
        orderUpdates: source.emailPreferences?.orderUpdates ?? true,
        systemNotifications: source.emailPreferences?.systemNotifications ?? true,
        marketing: source.emailPreferences?.marketing ?? false,
      },
      language: source.language || "en",
      dashboardSettings: source.dashboardSettings ?? undefined,
    };
  } catch (error) {
    throw new Error(`Error fetching user preferences settings: ${error}`);
  }
};

/**
 * Fetch user's preferences settings from preferences path
 * @param uid User ID
 * @returns Preferences settings object
 */
export const fetchPreferencesSettings = async (uid: string): Promise<PreferencesSettings> => {
  try {
    const preferencesRef = ref(db, `users/${uid}/settings/preferences`);
    const snapshot = await get(preferencesRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as PreferencesSettings;
    }
    
    // Return default preferences settings if not found
    return {
      theme: "light",
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      notificationPreferences: {
        hr: {
          newEmployee: { email: true, push: true, sms: false },
          employeeUpdate: { email: true, push: false, sms: false },
          leaveRequest: { email: true, push: true, sms: false },
          shiftChange: { email: true, push: true, sms: false },
          payrollUpdate: { email: true, push: false, sms: false },
        },
        stock: {
          lowStock: { email: true, push: true, sms: false },
          stockUpdate: { email: true, push: false, sms: false },
          orderReceived: { email: true, push: true, sms: false },
          stockAlert: { email: true, push: true, sms: false },
        },
        finance: {
          invoiceCreated: { email: true, push: false, sms: false },
          paymentReceived: { email: true, push: true, sms: false },
          paymentDue: { email: true, push: true, sms: false },
          financialReport: { email: true, push: false, sms: false },
        },
        booking: {
          newBooking: { email: true, push: true, sms: false },
          bookingUpdate: { email: true, push: true, sms: false },
          bookingCancelled: { email: true, push: true, sms: false },
        },
        system: {
          systemNotifications: { email: true, push: false, sms: false },
          securityAlerts: { email: true, push: true, sms: true },
          maintenance: { email: true, push: false, sms: false },
        },
        marketing: {
          promotions: { email: false, push: false, sms: false },
        },
      },
      emailPreferences: {
        lowStock: true,
        orderUpdates: true,
        systemNotifications: true,
        marketing: false,
      },
      language: "en",
    };
  } catch (error) {
    throw new Error(`Error fetching preferences settings: ${error}`);
  }
};

/**
 * Update user's preferences settings
 * @param uid User ID
 * @param preferencesSettings Preferences settings object
 */
export const updatePreferencesSettings = async (uid: string, preferencesSettings: Partial<PreferencesSettings>): Promise<void> => {
  try {
    const preferencesRef = ref(db, `users/${uid}/settings/preferences`);
    await update(preferencesRef, { ...stripUndefinedDeep(preferencesSettings), updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating preferences settings: ${error}`);
  }
};

/**
 * Update user's theme preference
 * @param uid User ID
 * @param theme Theme preference (light or dark)
 */
export const updateTheme = async (uid: string, theme: "light" | "dark"): Promise<void> => {
  try {
    const themeRef = ref(db, `users/${uid}/settings/preferences/theme`);
    await set(themeRef, theme);
  } catch (error) {
    throw new Error(`Error updating theme: ${error}`);
  }
};

// ========== BUSINESS SETTINGS DATABASE FUNCTIONS ==========

/**
 * Fetch company's business settings from businessInfo path
 * @param companyId Company ID
 * @returns Business settings object
 */
export const fetchCompanyBusinessSettings = async (companyId: string): Promise<BusinessSettings> => {
  try {
    const empty: BusinessSettings = {
      businessName: "",
      businessAddress: "",
      businessPhone: "",
      businessEmail: "",
      taxNumber: "",
      businessLogo: "",
      industry: "",
    };

    // Primary: read from the path where updateBusinessSettings writes
    const newSnap = await get(ref(db, `companies/${companyId}/settings/business`));
    if (newSnap.exists()) {
      const d = newSnap.val();
      return {
        businessName: d.businessName || "",
        businessAddress: d.businessAddress || "",
        businessPhone: d.businessPhone || "",
        businessEmail: d.businessEmail || "",
        taxNumber: d.taxNumber || "",
        businessLogo: d.businessLogo || d.logo || "",
        industry: d.industry || "",
      };
    }

    // Fallback: legacy /businessInfo path (older data written before migration)
    const legacySnap = await get(ref(db, `companies/${companyId}/businessInfo`));
    if (legacySnap.exists()) {
      const d = legacySnap.val();
      return {
        businessName: d.businessName || "",
        businessAddress: d.businessAddress || "",
        businessPhone: d.businessPhone || "",
        businessEmail: d.businessEmail || "",
        taxNumber: d.taxNumber || "",
        businessLogo: d.businessLogo || d.logo || "",
        industry: d.industry || "",
      };
    }

    return empty;
  } catch (error) {
    throw new Error(`Error fetching company business settings: ${error}`);
  }
};

/**
 * Fetch user's business settings from business path
 * @param companyId Company ID
 * @returns Business settings object
 */
export const fetchBusinessSettings = async (companyId: string): Promise<BusinessSettings> => {
  try {
    const businessRef = ref(db, `companies/${companyId}/settings/business`);
    const snapshot = await get(businessRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as BusinessSettings;
    }
    
    // Return default business settings if not found
    return {
      businessName: "",
      businessAddress: "",
      businessPhone: "",
      businessEmail: "",
      taxNumber: "",
      businessLogo: "",
      industry: "",
    };
  } catch (error) {
    throw new Error(`Error fetching business settings: ${error}`);
  }
};

/**
 * Update company's business settings
 * @param companyId Company ID
 * @param businessSettings Business settings object
 */
export const updateBusinessSettings = async (companyId: string, businessSettings: Partial<BusinessSettings>): Promise<void> => {
  try {
    const businessRef = ref(db, `companies/${companyId}/settings/business`);
    await update(businessRef, { ...stripUndefinedDeep(businessSettings), updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating business settings: ${error}`);
  }
};

/**
 * Update company's business logo
 * @param companyId Company ID
 * @param logoUrl URL of the business logo image
 */
export const updateBusinessLogo = async (companyId: string, logoUrl: string): Promise<void> => {
  try {
    const logoRef = ref(db, `companies/${companyId}/settings/business/businessLogo`);
    await set(logoRef, logoUrl);
  } catch (error) {
    throw new Error(`Error updating business logo: ${error}`);
  }
};

// ========== COMBINED SETTINGS DATABASE FUNCTIONS ==========

/**
 * Fetch all user settings
 * @param uid User ID
 * @param companyId Company ID
 * @returns Combined settings object
 */
export const fetchAllSettings = async (uid: string, companyId: string): Promise<Settings> => {
  try {
    const personal = await fetchPersonalSettings(uid);
    const preferences = await fetchPreferencesSettings(uid);
    const business = await fetchBusinessSettings(companyId);
    
    return {
      personal,
      preferences,
      business,
    };
  } catch (error) {
    throw new Error(`Error fetching all settings: ${error}`);
  }
};

/**
 * Subscribe to settings changes
 * @param uid User ID
 * @param companyId Company ID
 * @param callback Callback function to handle settings changes
 * @returns Unsubscribe function
 */
export const subscribeToSettings = (
  uid: string, 
  companyId: string, 
  callback: (settings: Settings) => void
): (() => void) => {
  // Create refs for each settings section
  const personalRef = ref(db, `users/${uid}/settings/personal`);
  const preferencesRef = ref(db, `users/${uid}/settings/preferences`);
  const businessRef = ref(db, `companies/${companyId}/settings/business`);
  
  // Current state of settings
  let currentSettings: Settings = {
    personal: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      avatar: "",
      address: { street: "", city: "", state: "", zipCode: "", country: "" },
      bankDetails: { accountHolderName: "", bankName: "", accountNumber: "", sortCode: "", iban: "" },
      niNumber: "",
      taxCode: "",
      emergencyContact: { name: "", relationship: "", phone: "", email: "" },
      emergencyContacts: [],
    },
    preferences: {
      theme: "light",
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      emailPreferences: {
        lowStock: true,
        orderUpdates: true,
        systemNotifications: true,
        marketing: false,
      },
      language: "en",
    },
    business: {
      businessName: "",
      businessAddress: "",
      businessPhone: "",
      businessEmail: "",
      taxNumber: "",
      businessLogo: "",
      industry: "",
    },
  };
  
  // Set up listeners for each section
  const personalListener = onValue(personalRef, (snapshot) => {
    if (snapshot.exists()) {
      currentSettings.personal = snapshot.val() as PersonalSettings;
      callback(currentSettings);
    }
  });
  
  const preferencesListener = onValue(preferencesRef, (snapshot) => {
    if (snapshot.exists()) {
      currentSettings.preferences = snapshot.val() as PreferencesSettings;
      callback(currentSettings);
    }
  });
  
  const businessListener = onValue(businessRef, (snapshot) => {
    if (snapshot.exists()) {
      currentSettings.business = snapshot.val() as BusinessSettings;
      callback(currentSettings);
    }
  });
  
  // Return unsubscribe function
  return () => {
    off(personalRef, 'value', personalListener);
    off(preferencesRef, 'value', preferencesListener);
    off(businessRef, 'value', businessListener);
  };
};

// ========== USER PROFILE DATABASE FUNCTIONS ==========

/**
 * Fetch user profile from database
 * @param uid User ID
 * @returns UserProfile object or null if not found
 */
export const fetchUserProfileFromDb = async (uid: string): Promise<any | null> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    throw new Error(`Error fetching user profile: ${error}`);
  }
};

/**
 * Update user profile in database
 * @param uid User ID
 * @param updates Profile updates
 */
// ===== INVITES =====

export async function fetchAllInvites(): Promise<any> {
  const snap = await get(ref(db, "invites"))
  return snap.exists() ? snap.val() : null
}

export async function updateInviteInDb(inviteId: string, data: any): Promise<void> {
  await set(ref(db, `invites/${inviteId}`), data)
}

// ===== USER DATA =====

export async function fetchUserCompaniesRaw(uid: string): Promise<any> {
  const snap = await get(ref(db, `users/${uid}/companies`))
  return snap.exists() ? snap.val() : null
}

export async function fetchUserDataRaw(uid: string): Promise<any> {
  const snap = await get(ref(db, `users/${uid}`))
  return snap.exists() ? snap.val() : null
}

export async function setUserLastLogin(uid: string, timestamp: number): Promise<void> {
  await set(ref(db, `users/${uid}/lastLogin`), timestamp)
}

// ===== SUBSCRIBE ALL USERS =====

export function subscribeAllUsers(callback: (users: Record<string, any> | null) => void): () => void {
  const usersRef = ref(db, "users")
  const unsub = onValue(usersRef, (snapshot) => {
    callback(snapshot.val())
  })
  return unsub
}

// ===== GENERIC INTEGRATION CRUD =====

export async function fetchIntegrationsFromPath(path: string): Promise<any> {
  try {
    const snap = await get(ref(db, path))
    return snap.exists() ? snap.val() : null
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return null
  }
}

export async function saveIntegrationToPath(path: string, integrationId: string, data: any): Promise<void> {
  try {
    const fullPath = integrationId ? `${path}/${integrationId}` : path
    const stripUndefinedDeep = (value: any): any => {
      if (value === undefined) return undefined
      if (value === null) return null
      if (Array.isArray(value)) {
        // RTDB does not allow `undefined` inside arrays; use null to preserve indices.
        return value.map((v) => {
          const next = stripUndefinedDeep(v)
          return next === undefined ? null : next
        })
      }
      if (typeof value === "object") {
        const out: any = {}
        for (const [k, v] of Object.entries(value)) {
          const next = stripUndefinedDeep(v)
          if (next !== undefined) out[k] = next
        }
        return out
      }
      return value
    }

    await set(ref(db, fullPath), stripUndefinedDeep(data))
  } catch (error) {
    console.error("Error saving integration:", error)
    throw error
  }
}

export const updateUserProfileInDb = async (uid: string, updates: any): Promise<void> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, { ...stripUndefinedDeep(updates), updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating user profile: ${error}`);
  }
};

/**
 * Check if user exists in database
 * @param uid User ID
 * @returns Boolean indicating if user exists
 */
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.exists();
  } catch (error) {
    throw new Error(`Error checking user existence: ${error}`);
  }
};

/**
 * Initialize user settings in database
 * @param uid User ID
 * @param email User email
 */
export const initializeUserSettingsInDb = async (uid: string, email: string): Promise<void> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    const userData = {
      uid,
      email,
      firstName: "",
      lastName: "",
      phone: "",
      jobTitle: "",
      avatar: "",
      companies: [],
      currentCompanyID: "",
      settings: {
        personal: {
          firstName: "",
          lastName: "",
          email,
          phone: "",
          jobTitle: "",
          avatar: "",
          emergencyContacts: [],
        },
        preferences: {
          theme: "light",
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          emailPreferences: {
            lowStock: true,
            orderUpdates: true,
            systemNotifications: true,
            marketing: false,
          },
          language: "en",
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await set(userRef, userData);
  } catch (error) {
    throw new Error(`Error initializing user settings: ${error}`);
  }
};

// ========== PERMISSION FUNCTIONS ==========

/**
 * Check if user has permission to access settings
 * @param uid User ID
 * @param companyId Company ID
 * @returns Boolean indicating if user has permission
 */
export const checkSettingsPermission = async (uid: string, companyId: string): Promise<boolean> => {
  try {
    // Check if user is a member of the company
    const userCompaniesRef = ref(db, `users/${uid}/companies`);
    const snapshot = await get(userCompaniesRef);
    
    if (snapshot.exists()) {
      const raw = snapshot.val();
      const values: any[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
      const company = values.find((c) => String(c?.companyID || c?.companyId || "").trim() === companyId);
      
      if (company) {
        // All staff types (owner, admin, site, standard staff) can access their own settings
        // Personal settings are always accessible to the user themselves
        // Business settings may have additional restrictions, but personal/preferences are always accessible
        return true;
      }
    }
    
    return false;
  } catch (error) {
    throw new Error(`Error checking settings permission: ${error}`);
  }
};
