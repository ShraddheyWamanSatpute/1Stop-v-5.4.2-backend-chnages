// Notes Interfaces for Admin Backend
export interface NoteBlock {
  id: string;
  type: "heading" | "text" | "checklist";
  text?: string;
  checked?: boolean;
}

export interface Note {
  id?: string;
  title: string;
  content: string;
  category: "meeting" | "lead" | "marketing" | "general" | "strategy";
  status?: "draft" | "active" | "archived";
  template?: "blank" | "meeting_notes" | "project_brief" | "retrospective" | "sop";
  tags?: string[];
  leadId?: string;
  eventId?: string;
  clientId?: string;
  projectId?: string;
  taskId?: string;
  blocks?: NoteBlock[];
  createdBy?: string;
  timestamp?: number;
}
