export type WorkspaceCrudMode = "create" | "edit" | "view"

export interface WorkspaceCrudSearchConfig {
  entity: string
  mode: WorkspaceCrudMode
  id?: string | null
  itemLabel?: string | null
}

const WORKSPACE_CRUD_KEYS = ["crudEntity", "crudMode", "id", "itemLabel"] as const

export function buildWorkspaceCrudSearch(
  current: URLSearchParams,
  config: WorkspaceCrudSearchConfig,
): URLSearchParams {
  const next = new URLSearchParams(current)

  clearWorkspaceCrudSearch(next)
  next.set("crudEntity", config.entity)
  next.set("crudMode", config.mode)

  if (config.id) {
    next.set("id", config.id)
  }

  if (config.itemLabel) {
    next.set("itemLabel", config.itemLabel)
  }

  return next
}

export function clearWorkspaceCrudSearch(current: URLSearchParams): URLSearchParams {
  const next = current instanceof URLSearchParams ? current : new URLSearchParams(current)

  WORKSPACE_CRUD_KEYS.forEach((key) => {
    next.delete(key)
  })

  return next
}
