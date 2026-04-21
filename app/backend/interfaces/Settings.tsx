// Unified interfaces for User, Settings, and Authentication

/**
 * Interface for user profile data
 */
export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  firstName?: string
  lastName?: string
  role?: string
  department?: string
  companyID?: string | Record<string, boolean>
  photoURL?: string
  phoneNumber?: string
  createdAt?: number
  updatedAt?: number
  lastLogin?: number
  settings?: UserSettings
  preferences?: UserPreferences
}

/**
 * Interface for user settings
 */
export interface UserSettings {
  notifications: boolean
  theme: "light" | "dark" | "system"
  language: string
}

/**
 * Interface for user preferences
 */
export interface UserPreferences {
  dashboardLayout?: string
  favoriteModules?: string[]
  recentlyViewed?: string[]
  dashboardSettings?: {
    layouts: any[]
    activeLayout: string
    globalSettings: {
      refreshInterval: number
      autoRefresh: boolean
      theme: 'light' | 'dark' | 'auto'
      cardSpacing: number
      showGrid: boolean
      showCardBorders: boolean
    }
    moduleSettings: {
      [module: string]: {
        defaultLayout: string
        customCards: any[]
        filters: any
        groupBy?: any
      }
    }
    lastUpdated: number
  }
}


// User Company interface
export interface UserCompany {
  companyID: string;
  companyName: string;
  role: string;
  department: string;
  joinedAt: number;
  isDefault?: boolean;
  siteId?: string;
  siteName?: string;
  subsiteId?: string;
  subsiteName?: string;
  // Optional employee linkage (for employee invite onboarding)
  employeeId?: string;
  roleId?: string;
  accessLevel: "company" | "site" | "subsite";
}

// User interface
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  companies: UserCompany[];
  currentCompanyID?: string;
  /**
   * Account-level status. When set to "terminated", the user should not be able
   * to access any company data or select companies/sites.
   */
  accountStatus?: "active" | "terminated" | "suspended" | "inactive" | string;
  terminatedAt?: number;
  createdAt: number;
  lastLogin: number;
  settings?: {
    theme: "light" | "dark" | "system";
    notifications: boolean;
    language: string;
  };
}

// User invite interface
export interface UserInvite {
  inviteID: string;
  companyID: string;
  companyName: string;
  role: string;
  department: string;
  email: string;
  invitedBy: string;
  invitedAt: number;
  expiresAt: number;
  status: "pending" | "accepted" | "rejected" | "expired";
  code: string;
}

// Site invite interface
export interface SiteInvite {
  inviteID: string;
  companyID: string;
  companyName: string;
  siteID: string;
  siteName: string;
  subsiteID?: string;
  subsiteName?: string;
  role: string;
  department: string;
  email: string;
  invitedBy: string;
  invitedAt: number;
  expiresAt: number;
  status: "pending" | "accepted" | "rejected" | "expired";
  code: string;
}

// Personal profile settings
export interface PersonalSettings {
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  jobTitle?: string
  avatar: string
  // Address information
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  // Bank details for payments
  bankDetails?: {
    accountHolderName: string
    bankName: string
    accountNumber: string
    sortCode: string
    iban: string
  }
  // Tax and identification
  niNumber?: string
  taxCode?: string
  // Emergency contact
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
    email: string
  }
  /**
   * Preferred schema: multiple emergency contacts.
   * Keep `emergencyContact` for backward compatibility.
   */
  emergencyContacts?: Array<{
    name: string
    relationship: string
    phone: string
    email: string
  }>
}

// Preferences settings
export interface PreferencesSettings {
  theme: "light" | "dark";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  notificationPreferences?: {
    hr?: Record<string, { email?: boolean; push?: boolean; sms?: boolean }>;
    stock?: Record<string, { email?: boolean; push?: boolean; sms?: boolean }>;
    finance?: Record<string, { email?: boolean; push?: boolean; sms?: boolean }>;
    booking?: Record<string, { email?: boolean; push?: boolean; sms?: boolean }>;
    system?: Record<string, { email?: boolean; push?: boolean; sms?: boolean }>;
    marketing?: Record<string, { email?: boolean; push?: boolean; sms?: boolean }>;
  };
  emailPreferences: {
    lowStock: boolean;
    orderUpdates: boolean;
    systemNotifications: boolean;
    marketing: boolean;
  };
  language: string;
  sidebarSections?: {
    dashboard?: boolean;
    stock?: boolean;
    hr?: boolean;
    bookings?: boolean;
    pos?: boolean;
    finance?: boolean;
    supply?: boolean;
    messenger?: boolean;
    company?: boolean;
    settings?: boolean;
  };
  /**
   * Optional per-user dashboard customization (layouts/cards/settings).
   * Stored under `users/{uid}/settings/preferences/dashboardSettings`.
   */
  dashboardSettings?: {
    layouts: any[];
    activeLayout: string;
    globalSettings: {
      refreshInterval: number;
      autoRefresh: boolean;
      theme: 'light' | 'dark' | 'auto';
      cardSpacing: number;
      showGrid: boolean;
      showCardBorders: boolean;
    };
    moduleSettings: {
      [module: string]: {
        defaultLayout: string;
        customCards: any[];
        filters: any;
        groupBy?: any;
      };
    };
    lastUpdated: number;
  };
}

// Business profile settings
export interface BusinessSettings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  taxNumber: string;
  businessLogo: string;
  industry: string;
}

// Combined settings interface
export interface Settings {
  personal: PersonalSettings;
  preferences: PreferencesSettings;
  business: BusinessSettings;
}

// Authentication state interface
export interface AuthState {
  isLoggedIn: boolean;
  uid: string | null;
  email: string | null;
  displayName?: string | null;
}
