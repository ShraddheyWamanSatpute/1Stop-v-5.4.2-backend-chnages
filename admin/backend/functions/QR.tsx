// QR Code Functions
import {
  addPersonalQR,
  getPersonalQRs,
  getPersonalQRByUrl,
  updatePersonalQR,
  incrementQRScans,
  addGenericQR,
  getGenericQRs,
  addLead,
  getLeads,
} from "../data/QR";
import type { PersonalQR, GenericQR, Lead } from "../interfaces/QR";

/**
 * Create a personal QR code
 */
export const createPersonalQR = async (qrData: Omit<PersonalQR, "id" | "timestamp">): Promise<string> => {
  return await addPersonalQR(qrData);
};

/**
 * Get all personal QR codes for an admin
 */
export const fetchPersonalQRs = async (adminId: string): Promise<PersonalQR[]> => {
  return await getPersonalQRs(adminId);
};

/**
 * Get personal QR by landing page URL
 */
export const fetchPersonalQRByUrl = async (url: string): Promise<PersonalQR | null> => {
  return await getPersonalQRByUrl(url);
};

/**
 * Update personal QR code
 */
export const updatePersonalQRCode = async (qrId: string, updates: Partial<PersonalQR>): Promise<boolean> => {
  return await updatePersonalQR(qrId, updates);
};

/**
 * Track QR code scan
 */
export const trackQRScan = async (qrId: string, isPersonal: boolean = true): Promise<boolean> => {
  return await incrementQRScans(qrId, isPersonal);
};

/**
 * Create a generic QR code
 */
export const createGenericQR = async (qrData: Omit<GenericQR, "id" | "timestamp">): Promise<string> => {
  return await addGenericQR(qrData);
};

/**
 * Get all generic QR codes for an admin
 */
export const fetchGenericQRs = async (adminId: string): Promise<GenericQR[]> => {
  return await getGenericQRs(adminId);
};

/**
 * Submit lead from QR form
 */
export const submitLead = async (leadData: Omit<Lead, "id" | "timestamp">): Promise<string> => {
  return await addLead(leadData);
};

/**
 * Get all leads for an admin
 */
export const fetchLeads = async (adminId?: string): Promise<Lead[]> => {
  return await getLeads(adminId);
};
