import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"
import { db } from "./config"

export interface SocialMediaSettings {
  facebook: string
  twitter: string
  linkedin: string
  instagram: string
}

export interface CompanySettings {
  email: string
  phone: string
  address: string
  companyName: string
  website: string
}

export interface AppSettings {
  socialMedia: SocialMediaSettings
  company: CompanySettings
  updatedAt: Date
}

const SETTINGS_DOC_ID = "app-settings"

const shouldUseDefaultSettings = (error: any) => {
  const errorMessage = String(error?.message || "").toLowerCase()
  const errorCode = String(error?.code || "").toLowerCase()
  return (
    errorMessage.includes("not available") ||
    errorMessage.includes("firestore") ||
    errorMessage.includes("insufficient permissions") ||
    errorMessage.includes("missing or insufficient permissions") ||
    errorCode.includes("permission-denied")
  )
}

// Get settings from database
export const getSettings = async (): Promise<AppSettings | null> => {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", SETTINGS_DOC_ID))
    if (settingsDoc.exists()) {
      const data = settingsDoc.data()
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as AppSettings
    }
    return null
  } catch (error: any) {
    // If Firestore is not available, return null to use default settings
    if (shouldUseDefaultSettings(error)) {
      console.warn("Firestore is not available, using default settings")
      return null
    }
    console.error("Error fetching settings:", error)
    return null
  }
}

// Save settings to database
export const saveSettings = async (settings: Partial<AppSettings>): Promise<boolean> => {
  try {
    await setDoc(
      doc(db, "settings", SETTINGS_DOC_ID),
      {
        ...settings,
        updatedAt: new Date(),
      },
      { merge: true },
    )
    return true
  } catch (error: any) {
    // If Firestore is not available, log warning and return false
    if (shouldUseDefaultSettings(error)) {
      console.warn("Firestore is not available, cannot save settings")
      return false
    }
    console.error("Error saving settings:", error)
    return false
  }
}

// Save social media settings
export const saveSocialMediaSettings = async (socialMedia: SocialMediaSettings): Promise<boolean> => {
  return saveSettings({ socialMedia })
}

// Save company settings
export const saveCompanySettings = async (company: CompanySettings): Promise<boolean> => {
  return saveSettings({ company })
}

// Listen to settings changes in real-time
export const subscribeToSettings = (callback: (settings: AppSettings | null) => void) => {
  try {
    return onSnapshot(
      doc(db, "settings", SETTINGS_DOC_ID),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          callback({
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as AppSettings)
        } else {
          callback(null)
        }
      },
      (error: any) => {
        // If Firestore is not available, use default settings
        if (shouldUseDefaultSettings(error)) {
          console.warn("Firestore is not available, using default settings")
          callback(null) // This will trigger default settings in the component
        } else {
          console.error("Error listening to settings:", error)
          callback(null)
        }
      },
    )
  } catch (error: any) {
    // If Firestore initialization fails, return a no-op unsubscribe function
    // and immediately call callback with null to use default settings
    if (shouldUseDefaultSettings(error)) {
      console.warn("Firestore is not available, using default settings")
      callback(null) // Immediately provide default settings
      return () => {} // Return no-op unsubscribe function
    }
    console.error("Error setting up settings subscription:", error)
    callback(null)
    return () => {} // Return no-op unsubscribe function
  }
}

// Default settings
export const getDefaultSettings = (): AppSettings => ({
  socialMedia: {
    facebook: "https://facebook.com/onestopsolutions",
    twitter: "https://twitter.com/onestopsolutions",
    linkedin: "https://linkedin.com/company/onestopsolutions",
    instagram: "https://instagram.com/onestopsolutions",
  },
  company: {
    email: "hello@1stop-solutions.com",
    phone: "+1 (555) 123-4567",
    address: "123 Business Ave, Suite 100, City, State 12345",
    companyName: "One-Stop Solutions",
    website: "https://1stop-solutions.com",
  },
  updatedAt: new Date(),
})
