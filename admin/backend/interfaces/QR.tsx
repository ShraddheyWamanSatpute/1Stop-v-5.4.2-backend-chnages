// QR Code Interfaces for Admin Backend
export interface PersonalQR {
  id?: string;
  adminId: string; // Admin user ID who created the QR
  contactId?: string; // Optional contact ID if linked to a contact
  name: string;
  photo?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  howWeMet?: string;
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  qrUrl: string; // Full URL with query params
  landingPageUrl: string; // Base URL for landing page
  scans?: number;
  isActive: boolean;
  timestamp?: number;
}

export interface GenericQR {
  id?: string;
  adminId: string;
  qrId: string; // Unique QR identifier
  qrUrl: string; // Full URL with query params
  formUrl: string; // URL to the form page
  scans?: number;
  isActive: boolean;
  timestamp?: number;
}

export interface Lead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  restaurantName?: string;
  message?: string;
  status: "new" | "contacted" | "qualified" | "demo_scheduled" | "proposal_sent" | "won" | "lost";
  source: "website" | "qr_code" | "google_ads" | "instagram" | "referral" | "cold_outreach" | "event";
  qrId?: string; // Link to QR code if from QR
  adminId?: string; // Admin who received the lead
  assignedTo?: string;
  lastContactDate?: number;
  nextFollowUp?: number;
  timestamp?: number;
  notes?: string[];
}
