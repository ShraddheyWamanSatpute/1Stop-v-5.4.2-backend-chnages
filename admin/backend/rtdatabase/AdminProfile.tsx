// Admin Profile Realtime Database Operations
import { ref, get, set, update, remove, db } from "../../../app/backend/services/Firebase";
import type { AdminProfile } from "../interfaces/AdminProfile";

const ADMIN_PROFILES_PATH = "admin/users";

/**
 * Get admin profile from Realtime Database
 */
export const getAdminProfile = async (uid: string): Promise<AdminProfile | null> => {
  try {
    const profileRef = ref(db, `${ADMIN_PROFILES_PATH}/${uid}`);
    const snapshot = await get(profileRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        ...data,
        uid,
      } as AdminProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return null;
  }
};

/**
 * Create or update admin profile in Realtime Database
 */
export const setAdminProfile = async (profile: AdminProfile): Promise<boolean> => {
  try {
    const profileRef = ref(db, `${ADMIN_PROFILES_PATH}/${profile.uid}`);
    const now = Date.now();
    
    await set(profileRef, {
      ...profile,
      updatedAt: now,
      createdAt: profile.createdAt || now,
    });
    
    return true;
  } catch (error) {
    console.error("Error setting admin profile:", error);
    return false;
  }
};

/**
 * Update admin profile in Realtime Database
 */
export const updateAdminProfile = async (uid: string, updates: Partial<AdminProfile>): Promise<boolean> => {
  try {
    const profileRef = ref(db, `${ADMIN_PROFILES_PATH}/${uid}`);
    
    await update(profileRef, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return true;
  } catch (error) {
    console.error("Error updating admin profile:", error);
    return false;
  }
};

/**
 * Delete admin profile from Realtime Database
 */
export const deleteAdminProfile = async (uid: string): Promise<boolean> => {
  try {
    const profileRef = ref(db, `${ADMIN_PROFILES_PATH}/${uid}`);
    await remove(profileRef);
    return true;
  } catch (error) {
    console.error("Error deleting admin profile:", error);
    return false;
  }
};
