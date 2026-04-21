import { uploadFile } from "../services/Firebase";
import { PersonalSettings, PreferencesSettings, BusinessSettings, UserProfile, UserCompany, Settings } from '../interfaces/Settings';
import {
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  sendPasswordReset,
  sendCustomVerificationEmail,
  sendCustomVerificationEmailToEmail,
  getCurrentFirebaseUser,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  createUserProfileInDb,
  updateAvatarInDb,
  updateThemeInDb,
  updateBusinessLogoInDb,
  getUserData,
  setCurrentCompany,
  fetchUserPersonalSettings,
  updatePersonalSettings as updatePersonalSettingsDb,
  fetchUserPreferencesSettings,
  updatePreferencesSettings as updatePreferencesSettingsDb,
  fetchCompanyBusinessSettings,
  updateBusinessSettings as updateBusinessSettingsDb,
  subscribeToSettings as subscribeToSettingsDb,
  checkSettingsPermission as checkSettingsPermissionDb,
  fetchUserProfileFromDb,
  updateUserProfileInDb,
  checkUserExists,
  initializeUserSettingsInDb,
} from '../data/Settings';

// ========== AUTHENTICATION FUNCTIONS ==========

/**
 * Sign in with email and password
 * @param email User email
 * @param password User password
 * @returns User ID and email
 */
export const signIn = async (email: string, password: string): Promise<{ uid: string; email: string }> => {
  return await signInWithEmail(email, password);
};

/**
 * Sign up with email and password
 * @param email User email
 * @param password User password
 * @returns User ID and email
 */
export const signUp = async (email: string, password: string): Promise<{ uid: string; email: string }> => {
  return await signUpWithEmail(email, password);
};

/**
 * Sign out current user
 */
export const logOut = async (): Promise<void> => {
  return await signOutUser();
};

// ========== USER FUNCTIONS ==========

/**
 * Get current user company
 * @param uid User ID
 * @returns Current company or undefined
 */
export const getCurrentCompany = async (uid: string): Promise<UserCompany | undefined> => {
  try {
    const userData = await getUserData(uid);
    if (!userData || !userData.currentCompanyID) return undefined;
    
    const company = userData.companies.find(c => c.companyID === userData.currentCompanyID);
    return company;
  } catch (error) {
    throw new Error(`Error getting current company: ${error}`);
  }
};

/**
 * Set current company for user
 * @param uid User ID
 * @param companyID Company ID
 */
export const setCurrentCompanyForUser = async (uid: string, companyID: string): Promise<void> => {
  try {
    await setCurrentCompany(uid, companyID);
  } catch (error) {
    throw new Error(`Error setting current company: ${error}`);
  }
};



// ========== PERSONAL SETTINGS FUNCTIONS ==========

/**
 * Fetch user's personal settings
 * @param uid User ID
 * @returns Personal settings object
 */
export const getUserPersonalSettings = async (uid: string): Promise<PersonalSettings> => {
  try {
    return await fetchUserPersonalSettings(uid);
  } catch (error) {
    throw new Error(`Error fetching personal settings: ${error}`);
  }
};

/**
 * Update user's personal settings
 * @param uid User ID
 * @param personalSettings Personal settings object
 */
export const updateUserPersonalSettings = async (uid: string, personalSettings: Partial<PersonalSettings>): Promise<void> => {
  try {
    await updatePersonalSettingsDb(uid, personalSettings);
  } catch (error) {
    throw new Error(`Error updating personal settings: ${error}`);
  }
};

/**
 * Update user's avatar with URL
 * @param uid User ID
 * @param avatarUrl URL of the avatar image
 */
export const updateUserAvatar = async (uid: string, avatarUrl: string): Promise<void> => {
  try {
    await updateAvatarInDb(uid, avatarUrl);
  } catch (error) {
    throw new Error(`Error updating avatar: ${error}`);
  }
};

/**
 * Update user's avatar with file
 * @param uid User ID
 * @param file Avatar image file
 * @returns URL of the uploaded avatar
 */
export const updateUserAvatarWithFile = async (uid: string, file: File): Promise<string> => {
  try {
    // Upload file to storage
    const avatarUrl = await uploadFile(file);
    // Update avatar URL in database
    await updateAvatarInDb(uid, avatarUrl);
    return avatarUrl;
  } catch (error) {
    throw new Error(`Error updating avatar with file: ${error}`);
  }
};

// ========== PREFERENCES SETTINGS FUNCTIONS ==========

/**
 * Fetch user's preferences settings
 * @param uid User ID
 * @returns Preferences settings object
 */
export const getUserPreferencesSettings = async (uid: string): Promise<PreferencesSettings> => {
  try {
    return await fetchUserPreferencesSettings(uid);
  } catch (error) {
    throw new Error(`Error fetching preferences settings: ${error}`);
  }
};

/**
 * Update user's preferences settings
 * @param uid User ID
 * @param preferencesSettings Preferences settings object
 */
export const updateUserPreferencesSettings = async (uid: string, preferencesSettings: Partial<PreferencesSettings>): Promise<void> => {
  try {
    await updatePreferencesSettingsDb(uid, preferencesSettings);
  } catch (error) {
    throw new Error(`Error updating preferences settings: ${error}`);
  }
};

/**
 * Update user's theme preference
 * @param uid User ID
 * @param theme Theme preference (light or dark)
 */
export const updateUserTheme = async (uid: string, theme: "light" | "dark"): Promise<void> => {
  try {
    await updateThemeInDb(uid, theme);
  } catch (error) {
    throw new Error(`Error updating theme: ${error}`);
  }
};

// ========== BUSINESS SETTINGS FUNCTIONS ==========

/**
 * Fetch user's business settings
 * @param companyId Company ID
 * @returns Business settings object
 */
export const getCompanyBusinessSettings = async (companyId: string): Promise<BusinessSettings> => {
  try {
    return await fetchCompanyBusinessSettings(companyId);
  } catch (error) {
    throw new Error(`Error fetching business settings: ${error}`);
  }
};

/**
 * Update company's business settings
 * @param companyId Company ID
 * @param businessSettings Business settings object
 */
export const updateCompanyBusinessSettings = async (companyId: string, businessSettings: Partial<BusinessSettings>): Promise<void> => {
  try {
    await updateBusinessSettingsDb(companyId, businessSettings);
  } catch (error) {
    throw new Error(`Error updating business settings: ${error}`);
  }
};

/**
 * Update company's business logo with URL
 * @param companyId Company ID
 * @param logoUrl URL of the business logo image
 */
export const updateCompanyLogo = async (companyId: string, logoUrl: string): Promise<void> => {
  try {
    await updateBusinessLogoInDb(companyId, logoUrl);
  } catch (error) {
    throw new Error(`Error updating business logo: ${error}`);
  }
};

/**
 * Update company's business logo with file
 * @param companyId Company ID
 * @param file Business logo image file
 * @returns URL of the uploaded logo
 */
export const updateCompanyLogoWithFile = async (companyId: string, file: File): Promise<string> => {
  try {
    // Upload file to storage
    const logoUrl = await uploadFile(file);
    // Update logo URL in database
    await updateBusinessLogoInDb(companyId, logoUrl);
    return logoUrl;
  } catch (error) {
    throw new Error(`Error updating business logo with file: ${error}`);
  }
};

// ========== COMBINED SETTINGS FUNCTIONS ==========

/**
 * Get all user settings
 * @param uid User ID
 * @param companyId Company ID
 * @returns Combined settings object
 */
export const getAllSettings = async (uid: string, companyId: string): Promise<Settings> => {
  try {
    // Combine all settings from different sources (PARALLEL for speed)
    const [personalSettings, preferencesSettings, businessSettings] = await Promise.all([
      fetchUserPersonalSettings(uid),
      fetchUserPreferencesSettings(uid),
      fetchCompanyBusinessSettings(companyId),
    ]);
    
    return {
      personal: personalSettings,
      preferences: preferencesSettings,
      business: businessSettings
    } as Settings;
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
export const subscribeToUserSettings = (
  uid: string, 
  companyId: string, 
  callback: (settings: Settings) => void
): (() => void) => {
  return subscribeToSettingsDb(uid, companyId, callback);
};

// ========== PERMISSION FUNCTIONS ==========

/**
 * Check if user has permission to access settings
 * @param uid User ID
 * @param companyId Company ID
 * @returns Boolean indicating if user has permission
 */
export const checkUserSettingsPermission = async (uid: string, companyId: string): Promise<boolean> => {
  try {
    return await checkSettingsPermissionDb(uid, companyId);
  } catch (error) {
    throw new Error(`Error checking settings permission: ${error}`);
  }
};

// ========== INITIALIZATION FUNCTIONS ==========

/**
 * Initialize user settings
 * @param uid User ID
 * @param email User email
 */
export const initializeUserSettings = async (uid: string, email: string): Promise<void> => {
  try {
    await initializeUserSettingsInDb(uid, email);
  } catch (error) {
    throw new Error(`Error initializing user settings: ${error}`);
  }
};



/**
 * Login user with email and password
 * @param email - User email
 * @param password - User password
 * @returns Promise<UserProfile | null>
 */
export async function login(email: string, password: string): Promise<UserProfile | null> {
  try {
    const { uid } = await loginWithEmailAndPassword(email, password);
    
    // Fetch user profile from database
    const userProfile = await fetchUserProfile(uid);
    return userProfile;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Register new user with email and password
 * @param email - User email
 * @param password - User password
 * @param displayName - User display name
 * @param additionalData - Additional user data
 * @returns Promise<UserProfile>
 */
export async function register(
  email: string, 
  password: string, 
  displayName?: string,
  additionalData?: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    const { uid } = await registerWithEmailAndPassword(email, password, displayName);

    // Create user profile in database
    const userProfile: UserProfile = {
      uid,
      email,
      displayName: displayName || "",
      role: additionalData?.role || "user",
      department: additionalData?.department || "",
      companyID: additionalData?.companyID || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...additionalData
    };

    await createUserProfileInDb(userProfile);
    return userProfile;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

/**
 * Send password reset email
 * @param email - User email
 * @returns Promise<void>
 */
export async function passwordReset(email: string): Promise<void> {
  try {
    await sendPasswordReset(email);
  } catch (error) {
    console.error("Password reset error:", error);
    throw error;
  }
}

/**
 * Resend verification to the currently signed-in user (custom template sender).
 */
export async function resendVerificationEmail(): Promise<void> {
  return sendCustomVerificationEmail()
}

/**
 * Resend verification to an email address (no-auth helper).
 * Server suppresses "user not found" to avoid enumeration.
 */
export async function resendVerificationEmailToEmail(email: string): Promise<void> {
  return sendCustomVerificationEmailToEmail(email)
}

/**
 * Logout current user
 * @returns Promise<void>
 */
export async function logout(): Promise<void> {
  try {
    await signOutUser();
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

/**
 * Fetch user profile from database
 * @param uid - User ID
 * @returns Promise<UserProfile | null>
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    return await fetchUserProfileFromDb(uid);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Update user profile in database
 * @param uid - User ID
 * @param updates - Profile updates
 * @returns Promise<void>
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    await updateUserProfileInDb(uid, updates);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Check if user exists in database
 * @param uid - User ID
 * @returns Promise<boolean>
 */
export async function userExists(uid: string): Promise<boolean> {
  try {
    return await checkUserExists(uid);
  } catch (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
}

/**
 * Get current Firebase user
 * @returns FirebaseUser | null
 */
export function getCurrentUser() {
  return getCurrentFirebaseUser();
}

/**
 * Check if user is authenticated
 * @returns boolean
 */
export function isAuthenticated(): boolean {
  return getCurrentFirebaseUser() !== null;
}

