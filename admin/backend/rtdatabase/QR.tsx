// QR Code Realtime Database Operations
import { ref, set, update, push, rtdbQuery as query, orderByChild, equalTo, get } from "../../../app/backend/services/Firebase";
import type { PersonalQR, GenericQR, Lead } from "../interfaces/QR";
import { db } from "../../../app/backend/services/Firebase";

const PERSONAL_QRS_PATH = "admin/qr/personal";
const GENERIC_QRS_PATH = "admin/qr/generic";
const LEADS_PATH = "admin/leads";

/**
 * Add personal QR code to Realtime Database
 */
export const addPersonalQR = async (qrData: Omit<PersonalQR, "id" | "timestamp">): Promise<string> => {
  try {
    const qrsRef = ref(db, PERSONAL_QRS_PATH);
    const newQrRef = push(qrsRef);
    const qrId = newQrRef.key;
    
    if (!qrId) {
      throw new Error("Failed to generate QR ID");
    }
    
    await set(newQrRef, {
      ...qrData,
      id: qrId,
      timestamp: Date.now(),
    });
    
    return qrId;
  } catch (error) {
    console.error("Error adding personal QR:", error);
    throw error;
  }
};

/**
 * Get all personal QR codes for an admin
 */
export const getPersonalQRs = async (adminId: string): Promise<PersonalQR[]> => {
  try {
    const qrsRef = ref(db, PERSONAL_QRS_PATH);
    const q = query(qrsRef, orderByChild("adminId"), equalTo(adminId));
    const snapshot = await get(q);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as PersonalQR[];
    }
    return [];
  } catch (error) {
    console.error("Error getting personal QRs:", error);
    return [];
  }
};

/**
 * Get personal QR by URL
 */
export const getPersonalQRByUrl = async (url: string): Promise<PersonalQR | null> => {
  try {
    const baseUrl = url.split("?")[0];
    const qrsRef = ref(db, PERSONAL_QRS_PATH);
    const snapshot = await get(qrsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const [key, qr] of Object.entries(data)) {
        const qrData = qr as PersonalQR;
        // Check exact match or base URL match
        if (qrData.landingPageUrl === url || qrData.landingPageUrl === baseUrl) {
          return {
            id: key,
            ...qrData,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting personal QR by URL:", error);
    return null;
  }
};

/**
 * Update personal QR code
 */
export const updatePersonalQR = async (qrId: string, updates: Partial<PersonalQR>): Promise<boolean> => {
  try {
    const qrRef = ref(db, `${PERSONAL_QRS_PATH}/${qrId}`);
    await update(qrRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating personal QR:", error);
    return false;
  }
};

/**
 * Increment scan count for a QR code
 */
export const incrementQRScans = async (qrId: string, isPersonal: boolean = true): Promise<boolean> => {
  try {
    const path = isPersonal ? PERSONAL_QRS_PATH : GENERIC_QRS_PATH;
    const qrRef = ref(db, `${path}/${qrId}`);
    const snapshot = await get(qrRef);
    
    if (snapshot.exists()) {
      const currentScans = snapshot.val().scans || 0;
      await update(qrRef, { scans: currentScans + 1 });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error incrementing QR scans:", error);
    return false;
  }
};

/**
 * Add generic QR code
 */
export const addGenericQR = async (qrData: Omit<GenericQR, "id" | "timestamp">): Promise<string> => {
  try {
    const qrsRef = ref(db, GENERIC_QRS_PATH);
    const newQrRef = push(qrsRef);
    const qrId = newQrRef.key;
    
    if (!qrId) {
      throw new Error("Failed to generate QR ID");
    }
    
    await set(newQrRef, {
      ...qrData,
      id: qrId,
      timestamp: Date.now(),
    });
    
    return qrId;
  } catch (error) {
    console.error("Error adding generic QR:", error);
    throw error;
  }
};

/**
 * Get all generic QR codes for an admin
 */
export const getGenericQRs = async (adminId: string): Promise<GenericQR[]> => {
  try {
    const qrsRef = ref(db, GENERIC_QRS_PATH);
    const q = query(qrsRef, orderByChild("adminId"), equalTo(adminId));
    const snapshot = await get(q);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as GenericQR[];
    }
    return [];
  } catch (error) {
    console.error("Error getting generic QRs:", error);
    return [];
  }
};

/**
 * Add lead from QR form
 */
export const addLead = async (leadData: Omit<Lead, "id" | "timestamp">): Promise<string> => {
  try {
    const leadsRef = ref(db, LEADS_PATH);
    const newLeadRef = push(leadsRef);
    const leadId = newLeadRef.key;
    
    if (!leadId) {
      throw new Error("Failed to generate lead ID");
    }
    
    await set(newLeadRef, {
      ...leadData,
      id: leadId,
      timestamp: Date.now(),
    });
    
    return leadId;
  } catch (error) {
    console.error("Error adding lead:", error);
    throw error;
  }
};

/**
 * Get all leads for an admin
 */
export const getLeads = async (adminId?: string): Promise<Lead[]> => {
  try {
    const leadsRef = ref(db, LEADS_PATH);
    let snapshot;
    
    if (adminId) {
      const q = query(leadsRef, orderByChild("adminId"), equalTo(adminId));
      snapshot = await get(q);
    } else {
      snapshot = await get(leadsRef);
    }
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as Lead[];
    }
    return [];
  } catch (error) {
    console.error("Error getting leads:", error);
    return [];
  }
};
