export type TaskStatus = "todo" | "in_progress" | "blocked" | "done"
export type TaskPriority = "low" | "medium" | "high"

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
  order?: number
  createdAt: number
  updatedAt: number
}

