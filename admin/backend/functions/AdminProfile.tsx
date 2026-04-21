// Admin Profile Functions
import { getAdminProfile, setAdminProfile, updateAdminProfile } from "../data/AdminProfile";
import type { AdminProfile } from "../interfaces/AdminProfile";

/**
 * Get admin profile (wrapper function)
 */
export const fetchAdminProfile = async (uid: string): Promise<AdminProfile | null> => {
  return await getAdminProfile(uid);
};

/**
 * Create or update admin profile (wrapper function)
 */
export const saveAdminProfile = async (profile: AdminProfile): Promise<boolean> => {
  return await setAdminProfile(profile);
};

/**
 * Update admin profile fields (wrapper function)
 */
export const updateAdminProfileFields = async (uid: string, updates: Partial<AdminProfile>): Promise<boolean> => {
  return await updateAdminProfile(uid, updates);
};
