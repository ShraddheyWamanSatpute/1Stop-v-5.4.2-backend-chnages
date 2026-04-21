import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore"
import { db } from "./config"

export interface Lead {
  id?: string
  name: string
  email: string
  phone: string
  restaurantName: string
  message: string
  timestamp?: any
  status: "new" | "contacted" | "converted" | "closed"
}

// Add a new lead
export const addLead = async (leadData: Omit<Lead, "id" | "timestamp" | "status">) => {
  try {
    const docRef = await addDoc(collection(db, "leads"), {
      ...leadData,
      timestamp: serverTimestamp(),
      status: "new",
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding lead:", error)
    throw error
  }
}

// Get all leads
export const getLeads = async (): Promise<Lead[]> => {
  try {
    const q = query(collection(db, "leads"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Lead,
    )
  } catch (error) {
    console.error("Error getting leads:", error)
    throw error
  }
}
