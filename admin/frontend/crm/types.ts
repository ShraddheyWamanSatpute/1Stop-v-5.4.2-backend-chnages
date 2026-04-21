export type CRMContactStatus = "lead" | "active" | "past" | "blocked"

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "email"
  | "phone"
  | "url"

export type CustomFieldDefinition = {
  id: string
  label: string
  type: CustomFieldType
  options?: string[]
  required?: boolean
  showInTable?: boolean
  appliesTo?: "contacts" | "clients" | "both"
  order?: number
  createdAt: number
  updatedAt: number
}

export type CRMView = {
  id: string
  name: string
  config: {
    search?: string
    statusFilter?: CRMContactStatus[]
    sortValue?: "updatedAt" | "name"
    sortDirection?: "asc" | "desc"
  }
  createdAt: number
  updatedAt: number
}

export type CRMClientStatus = "active" | "inactive" | "trial" | "suspended"

export type CRMClient = {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  industry?: string
  status?: CRMClientStatus
  address?: string
  tags?: string[]
  notes?: string
  custom?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export type CRMContact = {
  id: string
  name: string
  email?: string
  phone?: string
  status: CRMContactStatus
  clientId?: string
  tags?: string[]
  notes?: string
  custom?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export const DEFAULT_CRM_STATUS: CRMContactStatus = "lead"

