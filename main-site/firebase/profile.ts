import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "./config"

export interface AdminProfile {
  uid: string
  name: string
  email: string
  position: string
  photoURL?: string
  phone?: string
  company?: string
  instagram?: string
  linkedin?: string
  twitter?: string
  createdAt: Date
  updatedAt: Date
}

// Get admin profile
export const getAdminProfile = async (uid: string): Promise<AdminProfile | null> => {
  try {
    const profileDoc = await getDoc(doc(db, "admin_profiles", uid))
    if (profileDoc.exists()) {
      const data = profileDoc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as AdminProfile
    }
    return null
  } catch (error) {
    console.error("Error fetching admin profile:", error)
    return null
  }
}

// Create admin profile
export const createAdminProfile = async (profile: Omit<AdminProfile, "createdAt" | "updatedAt">): Promise<boolean> => {
  try {
    await setDoc(doc(db, "admin_profiles", profile.uid), {
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return true
  } catch (error) {
    console.error("Error creating admin profile:", error)
    return false
  }
}

// Update admin profile
export const updateAdminProfile = async (uid: string, updates: Partial<AdminProfile>): Promise<boolean> => {
  try {
    await updateDoc(doc(db, "admin_profiles", uid), {
      ...updates,
      updatedAt: new Date(),
    })
    return true
  } catch (error) {
    console.error("Error updating admin profile:", error)
    return false
  }
}

// Upload profile photo
export const uploadProfilePhoto = async (uid: string, file: File): Promise<string | null> => {
  try {
    const storageRef = ref(storage, `admin_profiles/${uid}/photo.jpg`)
    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  } catch (error) {
    console.error("Error uploading profile photo:", error)
    return null
  }
}
