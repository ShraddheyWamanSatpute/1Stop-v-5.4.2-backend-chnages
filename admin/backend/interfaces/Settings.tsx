// Simple Settings Interface for Admin QR Landing Pages
export interface CompanySettings {
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  website?: string;
}

export interface AppSettings {
  company: CompanySettings;
  updatedAt?: number;
}

export const getDefaultSettings = (): AppSettings => ({
  company: {
    companyName: "1Stop Solutions",
    email: "",
    phone: "",
    address: "",
    website: "",
  },
  updatedAt: Date.now(),
});
