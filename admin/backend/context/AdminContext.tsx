// Admin Context for Authentication, User Data, and CRUD Operations
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db, ref, set } from "../../../app/backend/services/Firebase";
import { signInWithEmail, signOutUser, sendPasswordReset } from "../../../app/backend/data/Settings";
import { User, UserCompany } from "../../../app/backend/interfaces/Settings";
import { APP_KEYS } from "../config/keys";
import * as NotesFunctions from "../functions/Notes";
import * as MarketingFunctions from "../functions/Marketing";
import * as ContentFunctions from "../functions/Content";
import * as AnalyticsFunctions from "../functions/Analytics";
import * as QRFunctions from "../functions/QR";
import * as AdminProfileFunctions from "../functions/AdminProfile";
import type { Note } from "../interfaces/Notes";
import type { MarketingEvent } from "../interfaces/Marketing";
import type { ContentPost, PlatformSettings } from "../interfaces/Content";
import type { AnalyticsData } from "../interfaces/Analytics";
import type { PersonalQR, GenericQR, Lead } from "../interfaces/QR";
import type { AdminProfile } from "../interfaces/AdminProfile";

// Re-export createCompany from app for admin to use
export { createCompany } from "../../../app/backend/functions/Company";

interface AdminState {
  loading: boolean;
  isLoggedIn: boolean;
  user: (User & { isAdmin?: boolean; adminStaff?: { active: boolean; pages?: Record<string, boolean> } }) | null;
  adminProfile: AdminProfile | null;
  error: string | null;
}

interface AdminContextType {
  // Auth state
  state: AdminState;
  
  // Auth methods
  login: (email: string, password: string) => Promise<{ uid: string; email: string }>;
  logout: () => Promise<void>;
  passwordReset: (email: string) => Promise<void>;
  
  // Notes
  notes: Note[];
  loadingNotes: boolean;
  fetchNotes: () => Promise<void>;
  createNote: (noteData: Omit<Note, "id" | "timestamp">) => Promise<string>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;

  // Marketing
  marketingEvents: MarketingEvent[];
  loadingMarketing: boolean;
  fetchMarketingEvents: () => Promise<void>;
  createMarketingEvent: (eventData: Omit<MarketingEvent, "id" | "timestamp">) => Promise<string>;
  updateMarketingEvent: (eventId: string, updates: Partial<MarketingEvent>) => Promise<boolean>;
  deleteMarketingEvent: (eventId: string) => Promise<boolean>;

  // Content
  contentPosts: ContentPost[];
  platformSettings: PlatformSettings[];
  loadingContent: boolean;
  fetchContentSchedule: () => Promise<void>;
  fetchPlatformSettings: () => Promise<void>;
  createContentPost: (postData: Omit<ContentPost, "id" | "timestamp">) => Promise<string>;
  updateContentPost: (postId: string, updates: Partial<ContentPost>) => Promise<boolean>;
  publishPost: (postId: string, publishedDate?: number) => Promise<boolean>;
  deleteContentPost: (postId: string) => Promise<boolean>;
  createPlatformSettings: (settingsData: Omit<PlatformSettings, "id" | "timestamp">) => Promise<string>;
  updatePlatformSettings: (settingsId: string, updates: Partial<PlatformSettings>) => Promise<boolean>;

  // Analytics
  analyticsData: AnalyticsData | null;
  loadingAnalytics: boolean;
  fetchAnalyticsData: () => Promise<void>;

  // QR Codes
  personalQRs: PersonalQR[];
  genericQRs: GenericQR[];
  leads: Lead[];
  loadingQR: boolean;
  fetchPersonalQRs: () => Promise<void>;
  fetchGenericQRs: () => Promise<void>;
  fetchLeads: () => Promise<void>;
  createPersonalQR: (qrData: Omit<PersonalQR, "id" | "timestamp">) => Promise<string>;
  createGenericQR: (qrData: Omit<GenericQR, "id" | "timestamp">) => Promise<string>;
  submitLead: (leadData: Omit<Lead, "id" | "timestamp">) => Promise<string>;

  // Admin Profile
  fetchAdminProfile: () => Promise<void>;
  saveAdminProfile: (profile: AdminProfile) => Promise<boolean>;
  updateAdminProfile: (updates: Partial<AdminProfile>) => Promise<boolean>;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: any;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const fetchRtdbJson = async (path: string, token: string, ms: number) => {
  const base = String(APP_KEYS.firebase.databaseURL || "").replace(/\/+$/, "");
  if (!base) throw new Error("Firebase databaseURL is not configured");

  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timer = setTimeout(() => controller?.abort(), ms);
  try {
    const url = `${base}/${path.replace(/^\/+/, "")}.json?auth=${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal: controller?.signal as any });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const err = data?.error;
      if (res.status === 401 && (err === "invalid_token" || String(err || "").includes("invalid_token"))) {
        throw new Error(
          "Firebase auth token is invalid for this Realtime Database (invalid_token). " +
            "This typically means your Auth project and RTDB project don’t match, or you have a stale session from another Firebase project. " +
            "Try logging out, hard-refreshing, and logging in again. If it persists, verify the Firebase Web App config in `keys.ts` matches the stop-stock-a22f5 project exactly.",
        );
      }
      if (res.status === 403 && (err === "Permission denied" || String(err || "").toLowerCase().includes("permission"))) {
        throw new Error(
          "Permission denied reading /users/{uid} from Realtime Database. Check RTDB security rules for authenticated users/admins.",
        );
      }
      throw new Error(`RTDB request failed (${res.status}): ${typeof err === "string" ? err : JSON.stringify(err ?? data)}`);
    }
    return data;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error(`RTDB request timed out after ${ms}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [state, setState] = useState<AdminState>({
    loading: true,
    isLoggedIn: false,
    user: null,
    adminProfile: null,
    error: null,
  });

  const adminId = state.user?.uid;

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Marketing state
  const [marketingEvents, setMarketingEvents] = useState<MarketingEvent[]>([]);
  const [loadingMarketing, setLoadingMarketing] = useState(false);

  // Content state
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // QR state
  const [personalQRs, setPersonalQRs] = useState<PersonalQR[]>([]);
  const [genericQRs, setGenericQRs] = useState<GenericQR[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingQR, setLoadingQR] = useState(false);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const auth = getAuth();
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Ensure we show a deterministic loading state on every auth change.
          setState((prev) => ({ ...prev, loading: true, error: null }));
          try {
            // Read user data from /users/${uid}
            // Use a single RTDB REST read for bootstrap so we get concrete HTTP errors
            // (the SDK can retry indefinitely when auth is invalid, leading to "stuck loading").
            const token = await withTimeout(firebaseUser.getIdToken(true), 15000, "Refreshing auth token");
            let rawUserData: any;
            try {
              rawUserData = await fetchRtdbJson(`users/${firebaseUser.uid}`, token, 15000);
            } catch (e: any) {
              // If the token is invalid, force a clean re-auth to prevent infinite SDK retries.
              if (String(e?.message || "").includes("invalid_token")) {
                try {
                  await signOutUser();
                } catch {
                  // ignore
                }
              }
              throw e;
            }

            // Check admin access
            const isAdmin = Boolean(rawUserData?.isAdmin) || Boolean(rawUserData?.adminStaff?.active);
            const adminStaff = rawUserData?.adminStaff || null;

            // Read admin profile from /admin/users/${uid}
            let adminProfile: AdminProfile | null = null;
            if (isAdmin) {
              try {
                adminProfile = await AdminProfileFunctions.fetchAdminProfile(firebaseUser.uid);
              } catch (error) {
                console.error("Error fetching admin profile:", error);
              }
            }

            // Normalize companies data
            const normalizeUserCompanies = (companiesData: any): UserCompany[] => {
              if (!companiesData) return [];
              if (Array.isArray(companiesData)) return companiesData as UserCompany[];
              if (typeof companiesData === "object") {
                return Object.entries(companiesData).map(([companyID, v]) => {
                  const value = (v && typeof v === "object") ? v : {};
                  return {
                    ...(value as any),
                    companyID: String((value as any)?.companyID || (value as any)?.companyId || companyID),
                  } as UserCompany;
                });
              }
              return [];
            };

            // Build user object
            const user: User & { isAdmin?: boolean; adminStaff?: { active: boolean; pages?: Record<string, boolean> } } = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || rawUserData?.displayName || "",
              photoURL: firebaseUser.photoURL || rawUserData?.photoURL || "",
              companies: normalizeUserCompanies(rawUserData?.companies) || [],
              currentCompanyID: rawUserData?.currentCompanyID,
              accountStatus: rawUserData?.accountStatus || rawUserData?.status,
              terminatedAt: rawUserData?.terminatedAt,
              createdAt: rawUserData?.createdAt || Date.now(),
              lastLogin: rawUserData?.lastLogin || Date.now(),
              settings: rawUserData?.settings || { theme: "light", notifications: true, language: "en" },
              isAdmin,
              adminStaff: adminStaff?.active ? adminStaff : undefined,
            };

            setState({
              loading: false,
              isLoggedIn: true,
              user,
              adminProfile,
              error: null,
            });

            // Update lastLogin timestamp in background (non-blocking)
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              requestIdleCallback(() => {
                try {
                  set(ref(db, `users/${firebaseUser.uid}/lastLogin`), Date.now());
                } catch (error) {
                  console.error("Error updating last login:", error);
                }
              }, { timeout: 5000 });
            } else {
              setTimeout(() => {
                try {
                  set(ref(db, `users/${firebaseUser.uid}/lastLogin`), Date.now());
                } catch (error) {
                  console.error("Error updating last login:", error);
                }
              }, 0);
            }
          } catch (error: any) {
            console.error("Error fetching user data:", error);
            setState({
              loading: false,
              isLoggedIn: false,
              user: null,
              adminProfile: null,
              error: error?.message || "Failed to load user data",
            });
          }
        } else {
          // User is logged out
          setState({
            loading: false,
            isLoggedIn: false,
            user: null,
            adminProfile: null,
            error: null,
          });
        }
      });
    } catch (error: any) {
      console.error("Error setting up auth listener:", error);
      setState({
        loading: false,
        isLoggedIn: false,
        user: null,
        adminProfile: null,
        error: error.message || "Failed to initialize authentication",
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Auth methods
  const login = useCallback(async (email: string, password: string): Promise<{ uid: string; email: string }> => {
    try {
      const result = await signInWithEmail(email, password);
      return result;
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message || "Login failed" }));
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOutUser();
      setState({
        loading: false,
        isLoggedIn: false,
        user: null,
        adminProfile: null,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message || "Logout failed" }));
      throw error;
    }
  }, []);

  const passwordReset = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordReset(email);
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message || "Password reset failed" }));
      throw error;
    }
  }, []);

  // Notes functions
  const fetchNotes = useCallback(async () => {
    if (!adminId) return;
    setLoadingNotes(true);
    try {
      const data = await NotesFunctions.fetchNotes(adminId);
      setNotes(data);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  }, [adminId]);

  const createNote = useCallback(async (noteData: Omit<Note, "id" | "timestamp">) => {
    if (!adminId) throw new Error("User not authenticated");
    const noteId = await NotesFunctions.createNote({ ...noteData, createdBy: adminId });
    await fetchNotes();
    return noteId;
  }, [adminId, fetchNotes]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    const success = await NotesFunctions.updateNoteFields(noteId, updates);
    if (success) await fetchNotes();
    return success;
  }, [fetchNotes]);

  const deleteNote = useCallback(async (noteId: string) => {
    const success = await NotesFunctions.removeNote(noteId);
    if (success) await fetchNotes();
    return success;
  }, [fetchNotes]);

  // Marketing functions
  const fetchMarketingEvents = useCallback(async () => {
    if (!adminId) return;
    setLoadingMarketing(true);
    try {
      const data = await MarketingFunctions.fetchMarketingEvents(adminId);
      setMarketingEvents(data);
    } catch (error) {
      console.error("Error fetching marketing events:", error);
    } finally {
      setLoadingMarketing(false);
    }
  }, [adminId]);

  const createMarketingEvent = useCallback(async (eventData: Omit<MarketingEvent, "id" | "timestamp">) => {
    if (!adminId) throw new Error("User not authenticated");
    const eventId = await MarketingFunctions.createMarketingEvent({ ...eventData, createdBy: adminId });
    await fetchMarketingEvents();
    return eventId;
  }, [adminId, fetchMarketingEvents]);

  const updateMarketingEvent = useCallback(async (eventId: string, updates: Partial<MarketingEvent>) => {
    const success = await MarketingFunctions.updateMarketingEventFields(eventId, updates);
    if (success) await fetchMarketingEvents();
    return success;
  }, [fetchMarketingEvents]);

  const deleteMarketingEvent = useCallback(async (eventId: string) => {
    const success = await MarketingFunctions.removeMarketingEvent(eventId);
    if (success) await fetchMarketingEvents();
    return success;
  }, [fetchMarketingEvents]);

  // Content functions
  const fetchContentSchedule = useCallback(async () => {
    if (!adminId) return;
    setLoadingContent(true);
    try {
      const data = await ContentFunctions.fetchContentSchedule(adminId);
      setContentPosts(data);
    } catch (error) {
      console.error("Error fetching content schedule:", error);
    } finally {
      setLoadingContent(false);
    }
  }, [adminId]);

  const fetchPlatformSettings = useCallback(async () => {
    setLoadingContent(true);
    try {
      const data = await ContentFunctions.fetchPlatformSettings();
      setPlatformSettings(data);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const createContentPost = useCallback(async (postData: Omit<ContentPost, "id" | "timestamp">) => {
    if (!adminId) throw new Error("User not authenticated");
    const postId = await ContentFunctions.createContentPost({ ...postData, createdBy: adminId });
    await fetchContentSchedule();
    return postId;
  }, [adminId, fetchContentSchedule]);

  const updateContentPost = useCallback(async (postId: string, updates: Partial<ContentPost>) => {
    const success = await ContentFunctions.updateContentPostFields(postId, updates);
    if (success) await fetchContentSchedule();
    return success;
  }, [fetchContentSchedule]);

  const publishPost = useCallback(async (postId: string, publishedDate?: number) => {
    const success = await ContentFunctions.publishPost(postId, publishedDate);
    if (success) await fetchContentSchedule();
    return success;
  }, [fetchContentSchedule]);

  const deleteContentPost = useCallback(async (postId: string) => {
    const success = await ContentFunctions.removeContentPost(postId);
    if (success) await fetchContentSchedule();
    return success;
  }, [fetchContentSchedule]);

  const createPlatformSettings = useCallback(async (settingsData: Omit<PlatformSettings, "id" | "timestamp">) => {
    const settingsId = await ContentFunctions.createPlatformSettings(settingsData);
    await fetchPlatformSettings();
    return settingsId;
  }, [fetchPlatformSettings]);

  const updatePlatformSettings = useCallback(async (settingsId: string, updates: Partial<PlatformSettings>) => {
    const success = await ContentFunctions.updatePlatformSettingsFields(settingsId, updates);
    if (success) await fetchPlatformSettings();
    return success;
  }, [fetchPlatformSettings]);

  // Analytics functions
  const fetchAnalyticsData = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const data = await AnalyticsFunctions.fetchAnalyticsData();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // QR functions
  const fetchPersonalQRs = useCallback(async () => {
    if (!adminId) return;
    setLoadingQR(true);
    try {
      const data = await QRFunctions.fetchPersonalQRs(adminId);
      setPersonalQRs(data);
    } catch (error) {
      console.error("Error fetching personal QRs:", error);
    } finally {
      setLoadingQR(false);
    }
  }, [adminId]);

  const fetchGenericQRs = useCallback(async () => {
    if (!adminId) return;
    setLoadingQR(true);
    try {
      const data = await QRFunctions.fetchGenericQRs(adminId);
      setGenericQRs(data);
    } catch (error) {
      console.error("Error fetching generic QRs:", error);
    } finally {
      setLoadingQR(false);
    }
  }, [adminId]);

  const fetchLeads = useCallback(async () => {
    if (!adminId) return;
    setLoadingQR(true);
    try {
      const data = await QRFunctions.fetchLeads(adminId);
      setLeads(data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoadingQR(false);
    }
  }, [adminId]);

  const createPersonalQR = useCallback(async (qrData: Omit<PersonalQR, "id" | "timestamp">) => {
    if (!adminId) throw new Error("User not authenticated");
    const qrId = await QRFunctions.createPersonalQR(qrData);
    await fetchPersonalQRs();
    return qrId;
  }, [adminId, fetchPersonalQRs]);

  const createGenericQR = useCallback(async (qrData: Omit<GenericQR, "id" | "timestamp">) => {
    if (!adminId) throw new Error("User not authenticated");
    const qrId = await QRFunctions.createGenericQR(qrData);
    await fetchGenericQRs();
    return qrId;
  }, [adminId, fetchGenericQRs]);

  const submitLead = useCallback(async (leadData: Omit<Lead, "id" | "timestamp">) => {
    if (!adminId) throw new Error("User not authenticated");
    const leadId = await QRFunctions.submitLead({ ...leadData, adminId });
    await fetchLeads();
    return leadId;
  }, [adminId, fetchLeads]);

  // Admin Profile functions
  const fetchAdminProfile = useCallback(async () => {
    if (!adminId) return;
    try {
      const profile = await AdminProfileFunctions.fetchAdminProfile(adminId);
      setState((prev) => ({ ...prev, adminProfile: profile }));
    } catch (error) {
      console.error("Error fetching admin profile:", error);
    }
  }, [adminId]);

  const saveAdminProfile = useCallback(async (profile: AdminProfile): Promise<boolean> => {
    const success = await AdminProfileFunctions.saveAdminProfile(profile);
    if (success) await fetchAdminProfile();
    return success;
  }, [fetchAdminProfile]);

  const updateAdminProfile = useCallback(async (updates: Partial<AdminProfile>): Promise<boolean> => {
    if (!adminId) throw new Error("User not authenticated");
    const success = await AdminProfileFunctions.updateAdminProfileFields(adminId, updates);
    if (success) await fetchAdminProfile();
    return success;
  }, [adminId, fetchAdminProfile]);

  const value: AdminContextType = {
    // Auth state
    state,
    
    // Auth methods
    login,
    logout,
    passwordReset,
    
    // Notes
    notes,
    loadingNotes,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,

    // Marketing
    marketingEvents,
    loadingMarketing,
    fetchMarketingEvents,
    createMarketingEvent,
    updateMarketingEvent,
    deleteMarketingEvent,

    // Content
    contentPosts,
    platformSettings,
    loadingContent,
    fetchContentSchedule,
    fetchPlatformSettings,
    createContentPost,
    updateContentPost,
    publishPost,
    deleteContentPost,
    createPlatformSettings,
    updatePlatformSettings,

    // Analytics
    analyticsData,
    loadingAnalytics,
    fetchAnalyticsData,

    // QR
    personalQRs,
    genericQRs,
    leads,
    loadingQR,
    fetchPersonalQRs,
    fetchGenericQRs,
    fetchLeads,
    createPersonalQR,
    createGenericQR,
    submitLead,

    // Admin Profile
    fetchAdminProfile,
    saveAdminProfile,
    updateAdminProfile,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
