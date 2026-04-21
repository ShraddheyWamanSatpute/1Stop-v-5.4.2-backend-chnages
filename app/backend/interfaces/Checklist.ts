// Checklist interfaces

export interface ChecklistItem {
  id: string;
  text: string;
  title?: string; // Added to match the usage in the component
  description?: string;
  required: boolean;
  order: number;
  type: 'checkbox' | 'text' | 'number' | 'photo' | 'signature' | 'file'; // Added 'file' to match usage
  options?: string[];
  responseType?: string;
  validation?: { // Added validation field to match usage
    min?: number;
    max?: number;
    required?: boolean;
    pattern?: string;
    requireExplanationWhenOutOfRange?: boolean;
    requireExplanationWhenNo?: boolean;
  };
}

export interface ChecklistSection {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
  order: number;
  sectionType: string; // Required field that was missing
}

export interface ChecklistSchedule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | '4week' | 'once' | 'continuous';
  repeatDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  openingDay?: string;
  closingDay?: string;
  openingDate?: number;
  closingDate?: number;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
  startDate?: number; // Added this field
  expireTime?: number;
  dueTime?: number;
}

export interface ChecklistCompletion {
  id: string;
  checklistId: string;
  completedBy: string;
  completedByName: string;
  completedAt: number;
  siteId: string;
  subsiteId?: string;
  sections: {
    id: string;
    items: {
      id: string;
      value: boolean | string | number;
      notes?: string;
      attachments?: string[];
    }[];
  }[];
  status: 'complete' | 'incomplete' | 'overdue';
}

// CompanyChecklist interface to match how it's used in the Checklists.tsx component
export interface CompanyChecklist {
  id: string;
  title: string;
  description: string;
  sections?: ChecklistSection[];
  items?: ChecklistItem[];
  siteId: string;
  subsiteId?: string;
  isGlobalAccess: boolean;
  assignedSites?: string[];
  assignedSubsites?: string[];
  schedule: ChecklistSchedule;
  status: 'active' | 'archived' | 'draft';
  assignedTo: string[];
  assignedToTeams?: string[];
  category?: string;
  tracking?: {
    requireSignature: boolean;
    requirePhotos: boolean;
    requireNotes: boolean;
    requireLocation: boolean;
  };
  createdBy: string;
  createdAt?: number;
  updatedAt?: number;
}
