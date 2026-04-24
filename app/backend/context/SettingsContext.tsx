import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/Firebase";
import { fetchAllInvites, updateInviteInDb, fetchUserCompaniesRaw, fetchUserDataRaw, setUserLastLogin } from "../data/Settings";
import {
  User,
  UserCompany,
  PersonalSettings,
  PreferencesSettings,
  BusinessSettings,
  Settings,
  AuthState} from "../interfaces/Settings";
import {
  signIn,
  signUp,
  logOut,
  passwordReset as sendPasswordResetEmail,
  resendVerificationEmail,
  resendVerificationEmailToEmail,
  setCurrentCompanyForUser,
  updateUserPersonalSettings,
  updateUserAvatar,
  updateUserAvatarWithFile,
  updateUserPreferencesSettings,
  updateUserTheme,
  updateCompanyBusinessSettings,
  updateCompanyLogo,
  updateCompanyLogoWithFile,
  getAllSettings,
  checkUserSettingsPermission,
  initializeUserSettings
} from "../functions/Settings";
import { createNotification } from "../functions/Notifications"
import { SessionPersistence } from "../../frontend/utils/sessionPersistence";
import { performanceTimer } from "../utils/PerformanceTimer";
import { debugLog } from "../utils/debugLog"
import { dataCache } from "../utils/DataCache"

// Define the settings state interface
interface SettingsState {
  auth: AuthState;
  user: User | null;
  settings: {
    personal: PersonalSettings;
    preferences: PreferencesSettings;
    business: BusinessSettings;
  };
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
}

// Initial state
const initialState: SettingsState = {
  auth: {
    isLoggedIn: false,
    uid: null,
    email: null,
    displayName: null,
  },
  user: null,
  settings: {
    personal: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      avatar: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      bankDetails: {
        accountHolderName: "",
        bankName: "",
        accountNumber: "",
        sortCode: "",
        iban: "",
      },
      niNumber: "",
      taxCode: "",
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
        email: "",
      },
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
  },
  loading: true,
  error: null,
  hasPermission: false,
};

// Define action types
export type SettingsAction =
  // Auth actions
  | { type: "LOGIN"; payload: { uid: string; email: string; displayName?: string } }
  | { type: "LOGOUT" }
  // User actions
  | { type: "SET_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: Partial<User> }
  | { type: "SET_CURRENT_COMPANY"; payload: string }
  | { type: "ADD_COMPANY"; payload: UserCompany }
  | { type: "REMOVE_COMPANY"; payload: string }
  // Settings actions
  | { type: "SET_SETTINGS"; payload: Settings }
  | { type: "UPDATE_PERSONAL"; payload: Partial<PersonalSettings> }
  | { type: "UPDATE_PREFERENCES"; payload: Partial<PreferencesSettings> }
  | { type: "UPDATE_BUSINESS"; payload: Partial<BusinessSettings> }
  // UI state actions
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_PERMISSION"; payload: boolean }
  | { type: "CLEAR_ERROR" };

// Reducer function
const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        auth: {
          isLoggedIn: true,
          uid: action.payload.uid,
          email: action.payload.email,
          displayName: action.payload.displayName || null,
        },
        loading: false,
      };
    case "LOGOUT":
      return {
        ...initialState,
        loading: false,
      };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        loading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case "SET_CURRENT_COMPANY":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              currentCompanyID: action.payload,
              companies: state.user.companies.map((company) => ({
                ...company,
                isDefault: company.companyID === action.payload,
              })),
            }
          : null,
      };
    case "ADD_COMPANY":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              companies: [...state.user.companies, action.payload],
            }
          : null,
      };
    case "REMOVE_COMPANY":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              companies: state.user.companies.filter(
                (company) => company.companyID !== action.payload
              ),
              currentCompanyID:
                state.user.currentCompanyID === action.payload
                  ? state.user.companies.find(
                      (c) => c.companyID !== action.payload
                    )?.companyID || ""
                  : state.user.currentCompanyID,
            }
          : null,
      };
    case "SET_SETTINGS":
      return {
        ...state,
        settings: action.payload,
        loading: false,
      };
    case "UPDATE_PERSONAL":
      return {
        ...state,
        settings: {
          ...state.settings,
          personal: { ...state.settings.personal, ...action.payload },
        },
      };
    case "UPDATE_PREFERENCES":
      return {
        ...state,
        settings: {
          ...state.settings,
          preferences: { ...state.settings.preferences, ...action.payload },
        },
      };
    case "UPDATE_BUSINESS":
      return {
        ...state,
        settings: {
          ...state.settings,
          business: { ...state.settings.business, ...action.payload },
        },
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "SET_PERMISSION":
      return { ...state, hasPermission: action.payload };
    default:
      return state;
  }
};

// Define context type
interface SettingsContextType {
  state: SettingsState;
  dispatch: React.Dispatch<SettingsAction>;
  // Indicates SettingsContext has fully loaded (Firebase done)
  isFullyLoaded: boolean;
  // Auth methods
  login: (email: string, password: string) => Promise<{ uid: string; email: string }>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  passwordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  resendVerificationEmailToEmail: (email: string) => Promise<void>;
  // User methods
  setCurrentCompany: (companyID: string) => Promise<void>;
  removeCompany: (companyID: string) => Promise<void>;
  joinCompanyByCode: (code: string) => Promise<boolean>;
  getCurrentCompany: () => UserCompany | undefined;
  // Settings methods
  updatePersonal: (settings: Partial<PersonalSettings>) => Promise<void>;
  updatePreferences: (settings: Partial<PreferencesSettings>) => Promise<void>;
  updateBusiness: (settings: Partial<BusinessSettings>) => Promise<void>;
  setTheme: (theme: "light" | "dark") => Promise<void>;
  // File upload methods
  uploadAvatar: (avatarUrl: string) => Promise<void>;
  uploadBusinessLogo: (logoUrl: string) => Promise<void>;
  updateAvatar: (file: File) => Promise<string | undefined>;
  updateBusinessLogo: (file: File) => Promise<string | undefined>;
  // Utility methods
  refreshSettings: () => Promise<void>;
  clearError: () => void;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const [isFullyLoaded, setIsFullyLoaded] = React.useState(false);
  const coreTimerRef = React.useRef<string | null>(null);
  const allTimerRef = React.useRef<string | null>(null);
  const didFinishCoreLoadRef = React.useRef(false);
  const didFinishAllLoadRef = React.useRef(false);
  const didLogCacheHydrateRef = React.useRef(false);

  const getSettingsCacheKey = React.useCallback((uid: string, companyId: string) => {
    return `settingsCache:${uid}:${companyId}`
  }, [])

  const finishCoreLoad = React.useCallback((dataCounts?: Record<string, number>) => {
    if (didFinishCoreLoadRef.current) return;
    didFinishCoreLoadRef.current = true;
    setIsFullyLoaded(true);
    if (coreTimerRef.current) {
      const duration = performanceTimer.end(coreTimerRef.current, dataCounts);
      debugLog(`✅ SettingsContext: Core loaded (${duration.toFixed(2)}ms)`);
    }
  }, []);

  const finishAllLoad = React.useCallback((dataCounts?: Record<string, number>) => {
    if (didFinishAllLoadRef.current) return;
    didFinishAllLoadRef.current = true;
    if (allTimerRef.current) {
      const duration = performanceTimer.end(allTimerRef.current, dataCounts);
      debugLog(`✅ SettingsContext: All data loaded (${duration.toFixed(2)}ms)`);
    }
  }, []);

  // Get current company ID
  const getCurrentCompanyId = useCallback(() => {
    if (state.user?.currentCompanyID) {
      return state.user.currentCompanyID;
    }
    return localStorage.getItem("companyID") || "";
  }, [state.user?.currentCompanyID]);

  // Authentication methods
  // OPTIMIZED: Login now only verifies credentials - data loading happens in onAuthStateChanged
  // This allows immediate redirect while data loads in the background
  const login = async (email: string, password: string): Promise<{ uid: string; email: string }> => {
    try {
      // Only verify credentials - don't load user data here
      // onAuthStateChanged will handle all data loading asynchronously
      const { uid, email: userEmail } = await signIn(email, password);
      
      // Immediately dispatch login action for quick UI feedback
      // This allows the UI to show loading state while onAuthStateChanged loads data
      dispatch({
        type: "LOGIN",
        payload: { uid, email: userEmail },
      });
      
      // Return UID and email for immediate use (e.g., admin checks)
      return { uid, email: userEmail };
      
      // Don't set loading to false - let onAuthStateChanged handle it
      // This allows the app to show loading while data initializes
    } catch (error) {
      console.error("Login error:", error);
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({
        type: "SET_ERROR",
        payload: `Login failed: ${error}`,
      });
      // Re-throw the error so the calling component can handle it
      throw error;
    }
    // Note: Loading state is managed by onAuthStateChanged
    // This allows redirect while data loads in background
  };

  const register = async (email: string, password: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const { uid, email: userEmail } = await signUp(email, password);
      dispatch({
        type: "LOGIN",
        payload: { uid, email: userEmail },
      });
      // Initialize user settings
      await initializeUserSettings(uid, userEmail);
    } catch (error) {
      console.error("Registration error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Registration failed: ${error}`,
      });
      // Re-throw the error so the calling component can handle it
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const logout = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      
      await logOut();
      dispatch({ type: "LOGOUT" });
      
      // Clear session state (but keep settingsState cache for faster re-login)
      SessionPersistence.clearSessionState();
      // NOTE: Don't clear settingsState here - it will be cleared when a different user logs in
      // This allows the same user to log back in quickly using cached companies data
      // The onAuthStateChanged handler will clear it if a different user logs in
    } catch (error) {
      console.error("Logout error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Logout failed: ${error}`,
      });
    }
  };

  const passwordReset = async (email: string): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      // Use the renamed imported function to avoid naming conflict
      await sendPasswordResetEmail(email);
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      console.error("Password reset error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Password reset failed: ${error}`,
      });
      throw error;
    }
  };

  const resendVerification = async (): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await resendVerificationEmail();
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      console.error("Resend verification error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Resend verification failed: ${error}`,
      });
      throw error;
    }
  };

  const resendVerificationForEmail = async (email: string): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await resendVerificationEmailToEmail(email);
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      console.error("Resend verification (email) error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Resend verification failed: ${error}`,
      });
      throw error;
    }
  };

  // User methods
  const setCurrentCompany = async (companyID: string) => {
    if (!state.auth.uid) return;

    try {
      await setCurrentCompanyForUser(state.auth.uid, companyID);
      dispatch({ type: "SET_CURRENT_COMPANY", payload: companyID });
      localStorage.setItem("companyID", companyID);
      
      // Clear the loaded ref so settings reload for the new company
      settingsLoadedRef.current = "";
      
      // Refresh settings for the new company
      refreshSettings();
    } catch (error) {
      console.error("Error setting current company:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to set current company: ${error}`,
      });
    }
  };

  // Company management functions removed - these should be handled by Company context
  // const addCompany and removeCompany functions have been moved to Company context

  const removeCompany = async (companyID: string) => {
    if (!state.auth.uid) return;

    try {
      // Company removal should be handled by Company context
      dispatch({ type: "REMOVE_COMPANY", payload: companyID });
    } catch (error) {
      console.error("Error removing company:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to remove company: ${error}`,
      });
    }
  };

  const joinCompanyByCode = async (code: string): Promise<boolean> => {
    if (!state.auth.uid || !state.auth.email) return false;

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Look up the invite code
      const invites = await fetchAllInvites();

      if (invites) {
        const invite = Object.values(invites).find(
          (inv: any) => 
            inv.code === code && 
            inv.status === "pending" && 
            inv.email === state.auth.email
        ) as {
          inviteID: string;
          companyID: string;
          companyName: string;
          role: string;
          department: string;
          status: string;
          siteID?: string;
          siteName?: string;
          subsiteID?: string;
          subsiteName?: string;
        } | undefined;

        if (invite) {
          // Add company to user

          // Company addition should be handled by Company context
          // await addCompany(newCompany); // Moved to Company context

          // Update invite status
          await updateInviteInDb(invite.inviteID, { ...invite, status: "accepted" });

          dispatch({ type: "SET_LOADING", payload: false });
          return true;
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: "Invalid or expired invite code",
          });
          return false;
        }
      } else {
        dispatch({ type: "SET_ERROR", payload: "No invites found" });
        return false;
      }
    } catch (error: any) {
      // Check if error is due to database not being available
      const isDatabaseNotAvailable = 
        error?.message?.includes("Realtime Database is not available") ||
        error?.message?.includes("Service database is not available") ||
        error?.message?.includes("database is not available");
      
      if (isDatabaseNotAvailable) {
        console.warn("Realtime Database is not available. Cannot join company.");
        dispatch({
          type: "SET_ERROR",
          payload: "Database is not available. Please enable Realtime Database in Firebase Console.",
        });
      } else {
        console.error("Error joining company:", error);
        dispatch({
          type: "SET_ERROR",
          payload: `Failed to join company: ${error}`,
        });
      }
      return false;
    }
  };

  const getCurrentCompany = (): UserCompany | undefined => {
    if (!state.user) return undefined;
    return state.user.companies.find(
      (company) => company.companyID === state.user?.currentCompanyID
    );
  };

  // Settings methods
  const updatePersonal = async (settings: Partial<PersonalSettings>) => {
    if (!state.auth.uid) return;

    try {
      const companyId = getCurrentCompanyId()
      const before = state.settings.personal
      const after = { ...state.settings.personal, ...(settings || {}) }

      await updateUserPersonalSettings(state.auth.uid, settings);
      dispatch({ type: "UPDATE_PERSONAL", payload: settings });

      if (companyId) {
        createNotification(
          companyId,
          state.auth.uid,
          "user",
          "updated",
          "Personal Settings Updated",
          "Your personal settings were updated",
          {
            priority: "low",
            category: "info",
            details: {
              entityId: state.auth.uid,
              entityName: "Personal settings",
              oldValue: before,
              newValue: after,
              changes: { personal: { from: before, to: after } },
            },
            metadata: {
              section: "Settings/Personal",
              companyId,
              uid: state.auth.uid,
            },
          },
        ).catch(() => {})
      }
    } catch (error) {
      console.error("Error updating personal settings:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to update personal settings: ${error}`,
      });
    }
  };

  const updatePreferences = async (settings: Partial<PreferencesSettings>) => {
    if (!state.auth.uid) return;

    try {
      const companyId = getCurrentCompanyId()
      const before = state.settings.preferences
      const after = { ...state.settings.preferences, ...(settings || {}) }

      await updateUserPreferencesSettings(state.auth.uid, settings);
      dispatch({ type: "UPDATE_PREFERENCES", payload: settings });

      if (companyId) {
        createNotification(
          companyId,
          state.auth.uid,
          "user",
          "updated",
          "Preferences Updated",
          "Your preferences were updated",
          {
            priority: "low",
            category: "info",
            details: {
              entityId: state.auth.uid,
              entityName: "Preferences",
              oldValue: before,
              newValue: after,
              changes: { preferences: { from: before, to: after } },
            },
            metadata: {
              section: "Settings/Preferences",
              companyId,
              uid: state.auth.uid,
            },
          },
        ).catch(() => {})
      }
    } catch (error) {
      console.error("Error updating preferences settings:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to update preferences settings: ${error}`,
      });
    }
  };

  const updateBusiness = async (settings: Partial<BusinessSettings>) => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;

    try {
      const before = state.settings.business
      const after = { ...state.settings.business, ...(settings || {}) }

      await updateCompanyBusinessSettings(companyId, settings);
      dispatch({ type: "UPDATE_BUSINESS", payload: settings });

      createNotification(
        companyId,
        state.auth.uid || "system",
        "company",
        "updated",
        "Business Settings Updated",
        "Company business settings were updated",
        {
          priority: "low",
          category: "info",
          details: {
            entityId: companyId,
            entityName: "Business settings",
            oldValue: before,
            newValue: after,
            changes: { business: { from: before, to: after } },
          },
          metadata: {
            section: "Settings/Business",
            companyId,
            uid: state.auth.uid,
          },
        },
      ).catch(() => {})
    } catch (error) {
      console.error("Error updating business settings:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to update business settings: ${error}`,
      });
    }
  };

  const setTheme = async (theme: "light" | "dark") => {
    if (!state.auth.uid) return;

    try {
      const companyId = getCurrentCompanyId()
      const before = state.settings.preferences
      const after = { ...state.settings.preferences, theme }

      await updateUserTheme(state.auth.uid, theme);
      dispatch({
        type: "UPDATE_PREFERENCES",
        payload: { theme },
      });

      if (companyId) {
        createNotification(
          companyId,
          state.auth.uid,
          "user",
          "updated",
          "Theme Updated",
          `Theme set to "${theme}"`,
          {
            priority: "low",
            category: "info",
            details: {
              entityId: state.auth.uid,
              entityName: "Theme",
              oldValue: before,
              newValue: after,
              changes: { theme: { from: (before as any)?.theme, to: theme } },
            },
            metadata: {
              section: "Settings/Preferences",
              companyId,
              uid: state.auth.uid,
            },
          },
        ).catch(() => {})
      }
    } catch (error) {
      console.error("Error updating theme:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to update theme: ${error}`,
      });
    }
  };

  // File upload methods - Legacy URL-based methods
  const uploadAvatar = async (avatarUrl: string) => {
    if (!state.auth.uid) return;

    try {
      const companyId = getCurrentCompanyId()
      const before = state.settings.personal
      const after = { ...state.settings.personal, avatar: avatarUrl }

      await updateUserAvatar(state.auth.uid, avatarUrl);
      dispatch({
        type: "UPDATE_PERSONAL",
        payload: { avatar: avatarUrl },
      });

      if (companyId) {
        createNotification(
          companyId,
          state.auth.uid,
          "user",
          "updated",
          "Avatar Updated",
          "Your avatar was updated",
          {
            priority: "low",
            category: "info",
            details: {
              entityId: state.auth.uid,
              entityName: "Avatar",
              oldValue: before,
              newValue: after,
              changes: { avatar: { from: (before as any)?.avatar, to: avatarUrl } },
            },
            metadata: {
              section: "Settings/Personal",
              companyId,
              uid: state.auth.uid,
            },
          },
        ).catch(() => {})
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to upload avatar: ${error}`,
      });
    }
  };

  const uploadBusinessLogo = async (logoUrl: string) => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;

    try {
      const before = state.settings.business
      const after = { ...state.settings.business, businessLogo: logoUrl }

      await updateCompanyLogo(companyId, logoUrl);
      dispatch({
        type: "UPDATE_BUSINESS",
        payload: { businessLogo: logoUrl },
      });

      createNotification(
        companyId,
        state.auth.uid || "system",
        "company",
        "updated",
        "Company Logo Updated",
        "Company logo was updated",
        {
          priority: "low",
          category: "info",
          details: {
            entityId: companyId,
            entityName: "Company logo",
            oldValue: before,
            newValue: after,
            changes: { businessLogo: { from: (before as any)?.businessLogo, to: logoUrl } },
          },
          metadata: {
            section: "Settings/Business",
            companyId,
            uid: state.auth.uid,
          },
        },
      ).catch(() => {})
    } catch (error) {
      console.error("Error uploading business logo:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to upload business logo: ${error}`,
      });
    }
  };

  // File upload methods - File-based methods
  const updateAvatar = async (file: File): Promise<string | undefined> => {
    if (!state.auth.uid) return undefined;

    try {
      const companyId = getCurrentCompanyId()
      const before = state.settings.personal

      dispatch({ type: "SET_LOADING", payload: true });
      const avatarUrl = await updateUserAvatarWithFile(state.auth.uid, file);
      dispatch({
        type: "UPDATE_PERSONAL",
        payload: { avatar: avatarUrl },
      });
      dispatch({ type: "SET_LOADING", payload: false });

      if (companyId) {
        const after = { ...state.settings.personal, avatar: avatarUrl }
        createNotification(
          companyId,
          state.auth.uid,
          "user",
          "updated",
          "Avatar Updated",
          "Your avatar was updated",
          {
            priority: "low",
            category: "info",
            details: {
              entityId: state.auth.uid,
              entityName: "Avatar",
              oldValue: before,
              newValue: after,
              changes: { avatar: { from: (before as any)?.avatar, to: avatarUrl } },
            },
            metadata: {
              section: "Settings/Personal",
              companyId,
              uid: state.auth.uid,
            },
          },
        ).catch(() => {})
      }

      return avatarUrl;
    } catch (error) {
      console.error("Error updating avatar:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to update avatar: ${error}`,
      });
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const updateBusinessLogo = async (file: File): Promise<string | undefined> => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return undefined;

    try {
      const before = state.settings.business
      dispatch({ type: "SET_LOADING", payload: true });
      const logoUrl = await updateCompanyLogoWithFile(companyId, file);
      dispatch({
        type: "UPDATE_BUSINESS",
        payload: { businessLogo: logoUrl },
      });
      dispatch({ type: "SET_LOADING", payload: false });

      const after = { ...state.settings.business, businessLogo: logoUrl }
      createNotification(
        companyId,
        state.auth.uid || "system",
        "company",
        "updated",
        "Company Logo Updated",
        "Company logo was updated",
        {
          priority: "low",
          category: "info",
          details: {
            entityId: companyId,
            entityName: "Company logo",
            oldValue: before,
            newValue: after,
            changes: { businessLogo: { from: (before as any)?.businessLogo, to: logoUrl } },
          },
          metadata: {
            section: "Settings/Business",
            companyId,
            uid: state.auth.uid,
          },
        },
      ).catch(() => {})

      return logoUrl;
    } catch (error) {
      console.error("Error updating business logo:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to update business logo: ${error}`,
      });
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  // Utility methods
  // Track if settings have been loaded for current user/company to prevent unnecessary refreshes
  const settingsLoadedRef = React.useRef<string>("");
  // Mirror loading state in a ref so refreshSettings doesn't need state.loading in its dep array
  const loadingRef = React.useRef<boolean>(state.loading);
  React.useEffect(() => { loadingRef.current = state.loading; }, [state.loading]);

  const refreshSettings = useCallback(async () => {
    if (!state.auth.uid) return;

    const companyId = getCurrentCompanyId();
    if (!companyId) return;

    // Check if settings are already loaded for this user/company combination
    const loadKey = `${state.auth.uid}-${companyId}`;
    if (settingsLoadedRef.current === loadKey && !loadingRef.current) {
      // Settings already loaded, skip refresh to prevent flashing
      return;
    }

    // Don't set loading to true if we're already in the middle of loading
    // This prevents UI flashing from loading state changes
    if (!loadingRef.current) {
      dispatch({ type: "SET_LOADING", payload: true });
    }

    debugLog("⏳ SettingsContext: Starting load", { companyId });

    try {
      // Fetch all settings
      const settings = await getAllSettings(state.auth.uid, companyId);
      dispatch({ type: "SET_SETTINGS", payload: settings });

      // Check permission
      const hasPermission = await checkUserSettingsPermission(state.auth.uid, companyId);
      dispatch({ type: "SET_PERMISSION", payload: hasPermission });

      // Mark as loaded
      settingsLoadedRef.current = loadKey;
    } catch (error) {
      console.error("Error fetching settings:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to load settings: ${error}`,
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.auth.uid, getCurrentCompanyId]);

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  // Initialize state from Firebase Auth with priority loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Start performance timers
        didFinishCoreLoadRef.current = false;
        didFinishAllLoadRef.current = false;
        setIsFullyLoaded(false);
        coreTimerRef.current = performanceTimer.start('SettingsContext', 'coreLoad');
        allTimerRef.current = performanceTimer.start('SettingsContext', 'allLoad');
        debugLog("⏳ SettingsContext: Starting load", { uid: firebaseUser.uid });
        
        try {
          // Step 1: Immediate login action for quick UI feedback
          dispatch({
            type: "LOGIN",
            payload: {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || undefined,
            },
          });

          // Step 1.5: Load companies from cache FIRST for instant dropdown display
          // IMPORTANT: Only use cached data if it matches the current user to prevent data leakage
          try {
            const cachedState = localStorage.getItem('settingsState')
            if (cachedState) {
              const parsed = JSON.parse(cachedState)
              // Validate cached data belongs to current user
              if (parsed.auth?.uid === firebaseUser.uid && 
                  parsed.user?.companies && 
                  Array.isArray(parsed.user.companies)) {
                // Immediately set user with cached companies for instant dropdown
                const cachedUser: User = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  displayName: parsed.user.displayName || firebaseUser.displayName || "",
                  photoURL: parsed.user.photoURL || firebaseUser.photoURL || "",
                  companies: parsed.user.companies,
                  currentCompanyID: parsed.user.currentCompanyID || parsed.currentCompanyID,
                  createdAt: parsed.user.createdAt || Date.now(),
                  lastLogin: Date.now(),
                  settings: parsed.user.settings || { theme: "light", notifications: true, language: "en" },
                }
                dispatch({ type: "SET_USER", payload: cachedUser })
              } else if (parsed.auth?.uid && parsed.auth.uid !== firebaseUser.uid) {
                // Cached data belongs to different user - clear it to prevent data leakage
                localStorage.removeItem('settingsState')
                // Also clear any settings cache keys from previous user
                try {
                  const keysToRemove: string[] = []
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i)
                    if (key && key.startsWith(`settingsCache:${parsed.auth.uid}:`)) {
                      keysToRemove.push(key)
                    }
                  }
                  keysToRemove.forEach(key => localStorage.removeItem(key))
                } catch (clearError) {
                  // Silent fail
                }
                // Clear dataCache (IndexedDB) when different user logs in
                try {
                  dataCache.invalidateAll()
                } catch (cacheError) {
                  // Silent fail
                }
              }
            }
          } catch (cacheError) {
            // Silent fail - cache is optional
          }

          // Normalize companies stored as array OR map (Record<companyID, UserCompany>)
          const normalizeUserCompanies = (companiesData: any): UserCompany[] => {
            if (!companiesData) return []
            if (Array.isArray(companiesData)) return companiesData as UserCompany[]
            if (typeof companiesData === "object") {
              return Object.entries(companiesData).map(([companyID, v]) => {
                const value = (v && typeof v === "object") ? v : {}
                return {
                  ...(value as any),
                  companyID: String((value as any)?.companyID || (value as any)?.companyId || companyID),
                } as UserCompany
              })
            }
            return []
          }

          // Step 2 & 3: Load companies AND full user data in PARALLEL for maximum speed
          // OPTIMIZED: Use get() for one-time reads - Firebase SDK handles connection pooling
          try {
            const [companiesRaw, rawUserData] = await Promise.all([
              fetchUserCompaniesRaw(firebaseUser.uid),
              fetchUserDataRaw(firebaseUser.uid)
            ]);

            // Process companies first (for instant dropdown)
            let companies: UserCompany[] = [];
            if (companiesRaw) {
              companies = normalizeUserCompanies(companiesRaw)
            }

            // Determine account status early (prevents showing company/site selectors for terminated users)
            const accountStatus: string | undefined =
              rawUserData?.accountStatus || rawUserData?.status || undefined
            const terminatedAt: number | undefined = rawUserData?.terminatedAt || undefined
            const isTerminated = String(accountStatus || "").toLowerCase() === "terminated"
            if (isTerminated) {
              companies = []
            }
            
            // OPTIMIZED: Check if user is admin early (for faster admin page loading)
            const isAdminUser = Boolean(rawUserData?.isAdmin) || Boolean(rawUserData?.adminStaff?.active)
            if (isAdminUser) {
              // Store admin status for quick access
              try {
                localStorage.setItem("isAdminUser", "true")
              } catch {}
            }
            
            // IMMEDIATELY update user with companies for instant dropdown
            const sessionState = SessionPersistence.getSessionState();
            // Prefer the server-stored currentCompanyID (e.g. set during employee invite acceptance),
            // then fall back to session/local selection, then first company.
            const storedCurrentCompanyID =
              rawUserData ? (rawUserData?.currentCompanyID as string | undefined) : undefined
            const currentCompanyID = isTerminated
              ? undefined
              : (sessionState.companyID ||
                  storedCurrentCompanyID ||
                  (companies.length > 0 ? companies[0].companyID : undefined));
            
            const userWithCompanies: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              companies: companies,
              currentCompanyID,
              accountStatus,
              terminatedAt,
              createdAt: Date.now(),
              lastLogin: Date.now(),
              settings: { theme: "light", notifications: true, language: "en" },
            };
            
            dispatch({ type: "SET_USER", payload: userWithCompanies });
            // (silent) companies loaded from Firebase

            // If the account is terminated, immediately clear persisted selections so no company data is loaded.
            if (isTerminated) {
              try {
                SessionPersistence.clearSessionState()
              } catch {}
              try {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("selectedCompanyID")
                  localStorage.removeItem("selectedCompanyName")
                  localStorage.removeItem("companyID")
                  localStorage.removeItem("companyId")
                  localStorage.removeItem("selectedSiteID")
                  localStorage.removeItem("selectedSiteName")
                  localStorage.removeItem("selectedSubsiteID")
                  localStorage.removeItem("selectedSubsiteName")
                }
              } catch {}
            }

            // OPTIMIZED: For admin users, finish loading immediately to allow admin pages to render
            // Admin pages don't need company settings to render initially
            const isAdminPath = typeof window !== "undefined" && window.location.pathname.toLowerCase().startsWith("/admin")
            if (isAdminUser && isAdminPath) {
              // Admin user going to admin page - finish loading immediately
              // Settings can load in background
              finishCoreLoad({ companies: companies.length });
              finishAllLoad({ companies: companies.length });
              setIsFullyLoaded(true);
            }

            // FAST PATH: hydrate full settings from local cache (instant) if available
            if (currentCompanyID) {
              try {
                const cacheKey = getSettingsCacheKey(firebaseUser.uid, currentCompanyID)
                const cached = localStorage.getItem(cacheKey)
                if (cached) {
                  const parsed = JSON.parse(cached) as {
                    settings?: any
                    hasPermission?: boolean
                  }
                  if (parsed?.settings) {
                    dispatch({ type: "SET_SETTINGS", payload: parsed.settings });
                    if (typeof parsed.hasPermission === "boolean") {
                      dispatch({ type: "SET_PERMISSION", payload: parsed.hasPermission });
                    }
                    // Mark settings as loaded to prevent unnecessary refreshes
                    const loadKey = `${firebaseUser.uid}-${currentCompanyID}`;
                    settingsLoadedRef.current = loadKey;
                    // Allow UI to proceed from cache, but DO NOT log "loaded" from cache.
                    // Timers should reflect database load times.
                    if (!isAdminUser || !isAdminPath) {
                      setIsFullyLoaded(true)
                    }
                    if (!didLogCacheHydrateRef.current) {
                      didLogCacheHydrateRef.current = true
                      debugLog("✅ SettingsContext: Cache hydrated")
                    }
                  }
                }
              } catch {
                // Silent fail - UI can still render with defaults
              }
            }

            // BACKGROUND REFRESH: fetch latest settings from Firebase (parallel) and update cache
            // OPTIMIZED: For admin users on admin pages, this happens in background without blocking
            if (currentCompanyID) {
              Promise.resolve().then(async () => {
                try {
                  const [settings, hasPermission] = await Promise.all([
                    getAllSettings(firebaseUser.uid, currentCompanyID),
                    checkUserSettingsPermission(firebaseUser.uid, currentCompanyID),
                  ]);
                  dispatch({ type: "SET_SETTINGS", payload: settings });
                  dispatch({ type: "SET_PERMISSION", payload: hasPermission });
                  // Mark settings as loaded to prevent unnecessary refreshes
                  const loadKey = `${firebaseUser.uid}-${currentCompanyID}`;
                  settingsLoadedRef.current = loadKey;
                  try {
                    const cacheKey = getSettingsCacheKey(firebaseUser.uid, currentCompanyID)
                    localStorage.setItem(cacheKey, JSON.stringify({ settings, hasPermission }))
                  } catch {
                    // ignore cache write failures
                  }
                  // Persist a full snapshot to IndexedDB-backed cache (long-lived fallback).
                  try {
                    dataCache.set(`users/${firebaseUser.uid}/companies`, companies || [])
                    dataCache.set(`users/${firebaseUser.uid}`, userWithCompanies)
                    dataCache.set(`settings/${firebaseUser.uid}/${currentCompanyID}`, { settings, hasPermission })
                  } catch {
                    // ignore
                  }
                  // Core/all logs should reflect DATABASE completion
                  // Only finish if not already finished (for admin users)
                  if (!isAdminUser || !isAdminPath) {
                    finishCoreLoad({ companies: companies.length });
                    finishAllLoad({ companies: companies.length });
                  }
                } catch {
                  if (!isAdminUser || !isAdminPath) {
                    finishCoreLoad({ companies: companies.length });
                    finishAllLoad({ companies: companies.length });
                  }
                }
              })
            } else {
              // No company → still finish
              if (!isAdminUser || !isAdminPath) {
                finishCoreLoad({ companies: companies.length });
                finishAllLoad({ companies: companies.length });
              }
            }
            
            // Step 3: Process full user data (already loaded in parallel above)
            if (rawUserData) {
              // Process in background to not block UI
              Promise.resolve().then(async () => {
                try {
                  const userData = rawUserData;

                // Convert companies object to array if needed (use fresh data)
                let fullCompanies: UserCompany[] = [];
                if (userData.companies) {
                  fullCompanies = normalizeUserCompanies(userData.companies)
                }

                // Restore last selected company/site/subsite from session persistence
                const sessionState = SessionPersistence.getSessionState();
                const currentCompanyID = sessionState.companyID || userData.currentCompanyID || 
                  (fullCompanies.length > 0 ? fullCompanies[0].companyID : undefined);

                // Create user object with restored session data
                const accountStatus: string | undefined =
                  userData.accountStatus || userData.status || undefined
                const terminatedAt: number | undefined = userData.terminatedAt || undefined
                const isTerminated = String(accountStatus || "").toLowerCase() === "terminated"

                const user: User = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  displayName: firebaseUser.displayName || userData.displayName || "",
                  photoURL: firebaseUser.photoURL || userData.photoURL || "",
                  companies: isTerminated ? [] : fullCompanies,
                  currentCompanyID: isTerminated ? undefined : currentCompanyID,
                  accountStatus,
                  terminatedAt,
                  createdAt: userData.createdAt || Date.now(),
                  lastLogin: Date.now(),
                  settings: userData.settings || {
                    theme: "light",
                    notifications: true,
                    language: "en",
                  },
                };

                // Update user with full data (background update)
                dispatch({ type: "SET_USER", payload: user });
                // Persist user snapshot for cross-session hydration
                try {
                  dataCache.set(`users/${firebaseUser.uid}/companies`, fullCompanies || [])
                  dataCache.set(`users/${firebaseUser.uid}`, user)
                } catch {
                  // ignore
                }

                // Set personal settings from user data
                const personalSettings = {
                  firstName: userData.firstName || userData.personal?.firstName || "",
                  middleName: userData.middleName || userData.personal?.middleName || "",
                  lastName: userData.lastName || userData.personal?.lastName || "",
                  email: firebaseUser.email || "",
                  phone: userData.phone || userData.personal?.phone || "",
                  avatar: userData.photoURL || userData.personal?.avatar || "",
                  address: userData.address || userData.personal?.address || {
                    street: "",
                    city: "",
                    state: "",
                    zipCode: "",
                    country: "",
                  },
                  bankDetails: userData.bankDetails || userData.personal?.bankDetails || {
                    accountHolderName: "",
                    bankName: "",
                    accountNumber: "",
                    sortCode: "",
                    iban: "",
                  },
                  niNumber: userData.niNumber || userData.personal?.niNumber || "",
                  taxCode: userData.taxCode || userData.personal?.taxCode || "",
                  emergencyContact: userData.emergencyContact || userData.personal?.emergencyContact || {
                    name: "",
                    relationship: "",
                    phone: "",
                    email: "",
                  },
                  emergencyContacts:
                    (userData.emergencyContacts ||
                      userData.personal?.emergencyContacts ||
                      (userData.emergencyContact || userData.personal?.emergencyContact
                        ? [userData.emergencyContact || userData.personal?.emergencyContact]
                        : [])) ??
                    [],
                };

                dispatch({ type: "UPDATE_PERSONAL", payload: personalSettings });

                // Persist current session immediately using new session persistence
                if (!isTerminated && currentCompanyID) {
                  SessionPersistence.saveSessionState({
                    companyID: currentCompanyID,
                    userPreferences: {
                      theme: user.settings?.theme as 'light' | 'dark' || 'light',
                      language: user.settings?.language || 'en',
                    },
                  });
                }

                if (isTerminated) {
                  try {
                    SessionPersistence.clearSessionState()
                  } catch {}
                  try {
                    if (typeof window !== "undefined") {
                      localStorage.removeItem("selectedCompanyID")
                      localStorage.removeItem("selectedCompanyName")
                      localStorage.removeItem("companyID")
                      localStorage.removeItem("companyId")
                      localStorage.removeItem("selectedSiteID")
                      localStorage.removeItem("selectedSiteName")
                      localStorage.removeItem("selectedSubsiteID")
                      localStorage.removeItem("selectedSubsiteName")
                    }
                  } catch {}
                }

                // Update last login timestamp in background (non-blocking)
                // Skip if database is not available
                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                  requestIdleCallback(() => {
                    try {
                      setUserLastLogin(firebaseUser.uid, Date.now());
                    } catch (error: any) {
                      // Silently ignore database not available errors
                      const isDatabaseNotAvailable = 
                        error?.message?.includes("Realtime Database is not available") ||
                        error?.message?.includes("Service database is not available");
                      if (!isDatabaseNotAvailable) {
                        console.error("Error updating last login:", error);
                      }
                    }
                  }, { timeout: 5000 });
                } else {
                  setTimeout(() => {
                    try {
                      setUserLastLogin(firebaseUser.uid, Date.now());
                    } catch (error: any) {
                      // Silently ignore database not available errors
                      const isDatabaseNotAvailable = 
                        error?.message?.includes("Realtime Database is not available") ||
                        error?.message?.includes("Service database is not available");
                      if (!isDatabaseNotAvailable) {
                        console.error("Error updating last login:", error);
                      }
                    }
                  }, 0);
                }
                
                  // If anything above failed before settings finished, finish now.
                  finishCoreLoad({ companies: user.companies?.length || 0 })
                } catch (error) {
                  // Don't block UI if background update fails
                  finishCoreLoad()
                }
              }).catch(() => {
                finishCoreLoad()
              });
            } else {
              // Create new user if doesn't exist
              Promise.resolve().then(async () => {
                try {
                  await initializeUserSettings(firebaseUser.uid, firebaseUser.email || "");
                  finishCoreLoad({ companies: companies.length })
                  finishAllLoad({ companies: companies.length })
                } catch (error) {
                  finishCoreLoad()
                  finishAllLoad()
                }
              });
            }
          } catch (parallelError: any) {
            // Check if error is due to database not being available
            const isDatabaseNotAvailable = 
              parallelError?.message?.includes("Realtime Database is not available") ||
              parallelError?.message?.includes("Service database is not available") ||
              parallelError?.message?.includes("database is not available");
            
            if (isDatabaseNotAvailable) {
              // Database is not available - create user with empty companies
              console.warn("Realtime Database is not available. Using default user data.");
              const userWithCompanies: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                displayName: firebaseUser.displayName || "",
                photoURL: firebaseUser.photoURL || "",
                companies: [],
                currentCompanyID: undefined,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                settings: { theme: "light", notifications: true, language: "en" },
              };
              dispatch({ type: "SET_USER", payload: userWithCompanies });
              finishCoreLoad({ companies: 0 });
              finishAllLoad({ companies: 0 });
              return;
            }
            
            // Fallback: try loading companies separately
            try {
              const companiesData = await fetchUserCompaniesRaw(firebaseUser.uid);
              if (companiesData) {
                const companies = normalizeUserCompanies(companiesData);
                const sessionState = SessionPersistence.getSessionState();
                const currentCompanyID = sessionState.companyID || (companies.length > 0 ? companies[0].companyID : undefined);
                
                const userWithCompanies: User = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  displayName: firebaseUser.displayName || "",
                  photoURL: firebaseUser.photoURL || "",
                  companies: companies,
                  currentCompanyID,
                  createdAt: Date.now(),
                  lastLogin: Date.now(),
                  settings: { theme: "light", notifications: true, language: "en" },
                };
                
                dispatch({ type: "SET_USER", payload: userWithCompanies });
                // (silent) companies loaded from Firebase fallback
              }
            } catch (companiesError: any) {
              // Check if error is due to database not being available
              const isDatabaseNotAvailable = 
                companiesError?.message?.includes("Realtime Database is not available") ||
                companiesError?.message?.includes("Service database is not available") ||
                companiesError?.message?.includes("database is not available");
              
              if (isDatabaseNotAvailable) {
                // Database is not available - create user with empty companies
                console.warn("Realtime Database is not available. Using default user data.");
                const userWithCompanies: User = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  displayName: firebaseUser.displayName || "",
                  photoURL: firebaseUser.photoURL || "",
                  companies: [],
                  currentCompanyID: undefined,
                  createdAt: Date.now(),
                  lastLogin: Date.now(),
                  settings: { theme: "light", notifications: true, language: "en" },
                };
                dispatch({ type: "SET_USER", payload: userWithCompanies });
              }
              finishCoreLoad()
              finishAllLoad()
            }
          }
        } catch (error) {
          dispatch({ type: "LOGOUT" });
          finishCoreLoad()
          finishAllLoad()
        }
      } else {
        // User logged out - clear session state but keep settingsState cache for faster re-login
        dispatch({ type: "LOGOUT" });
        SessionPersistence.clearSessionState();
        // Clear the settings loaded ref to allow fresh load on next login
        settingsLoadedRef.current = "";
        // NOTE: Don't clear settingsState here - it will be cleared when a different user logs in
        // This allows the same user to log back in quickly using cached companies data
        // The cache is validated by UID before use (line 757), so it's safe
        
        // Logged out is considered "ready" for app boot
        didFinishCoreLoadRef.current = false;
        didFinishAllLoadRef.current = false;
        finishCoreLoad()
        finishAllLoad()
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [finishCoreLoad, finishAllLoad]);

  // Sync state with localStorage - OPTIMIZED: Cache companies for instant dropdown loading
  useEffect(() => {
    if (!state.loading) {
      if (state.auth.isLoggedIn && state.user) {
        // Cache full user data including companies for instant dropdown loading
        localStorage.setItem("settingsState", JSON.stringify({
          auth: state.auth,
          user: {
            uid: state.user.uid,
            email: state.user.email,
            displayName: state.user.displayName,
            companies: state.user.companies, // Cache companies for instant dropdown
            currentCompanyID: state.user.currentCompanyID
          },
          currentCompanyID: state.user.currentCompanyID
        }));

        // Cache settings per user+company for instant hydration on refresh.
        // Strip sensitive personal fields (bank, tax, NI) before writing to localStorage.
        if (state.auth.uid && state.user.currentCompanyID) {
          try {
            const cacheKey = `settingsCache:${state.auth.uid}:${state.user.currentCompanyID}`
            const safePersonal = state.settings?.personal
              ? (({ bankDetails: _b, niNumber: _n, taxCode: _t, ...rest }) => rest)(state.settings.personal as any)
              : state.settings?.personal
            localStorage.setItem(cacheKey, JSON.stringify({
              settings: state.settings ? { ...state.settings, personal: safePersonal } : state.settings,
              hasPermission: state.hasPermission,
            }))
          } catch {
            // ignore cache write failures
          }
        }
      } else {
        localStorage.removeItem("settingsState");
      }
    }
  }, [state.auth, state.user, state.loading]);

  // Context value
  const contextValue: SettingsContextType = {
    state,
    dispatch,
    isFullyLoaded,
    // Auth methods
    login,
    register,
    logout,
    passwordReset,
    resendVerificationEmail: resendVerification,
    resendVerificationEmailToEmail: resendVerificationForEmail,
    // User methods
    setCurrentCompany,
    removeCompany,
    joinCompanyByCode,
    getCurrentCompany,
    // Settings methods
    updatePersonal,
    updatePreferences,
    updateBusiness,
    setTheme,
    // File upload methods
    uploadAvatar,
    uploadBusinessLogo,
    updateAvatar,
    updateBusinessLogo,
    // Utility methods
    refreshSettings,
    clearError,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook to use the settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

// Export types for frontend consumption
export type { 
  User, 
  UserCompany, 
  PersonalSettings, 
  PreferencesSettings, 
  BusinessSettings, 
  Settings, 
  AuthState
} from "../interfaces/Settings"
