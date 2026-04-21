// Settings Realtime Database Operations
import { ref, get } from "../../../app/backend/services/Firebase";
import { db } from "../../../app/backend/services/Firebase";
import type { AppSettings } from "../interfaces/Settings";

const SETTINGS_PATH = "admin/settings";

/**
 * Get app settings from Realtime Database
 */
export const getSettings = async (): Promise<AppSettings | null> => {
  try {
    const settingsRef = ref(db, SETTINGS_PATH);
    const snapshot = await get(settingsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data as AppSettings;
    }
    return null;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
};
