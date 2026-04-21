import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { formShortcutCatalog, pageShortcutCatalog, parseWorkspaceRecent, type WorkspaceShortcut } from "../utils/workspaceShortcuts"

type WorkspacePanel = "recents" | "favorites" | null

interface WorkspaceNavigationContextValue {
  recents: WorkspaceShortcut[]
  favorites: WorkspaceShortcut[]
  pageShortcuts: WorkspaceShortcut[]
  formShortcuts: WorkspaceShortcut[]
  activePanel: WorkspacePanel
  setActivePanel: (panel: WorkspacePanel) => void
  togglePanel: (panel: Exclude<WorkspacePanel, null>) => void
  closePanel: () => void
  isFavorite: (shortcut: WorkspaceShortcut) => boolean
  toggleFavorite: (shortcut: WorkspaceShortcut) => void
  /** Register a form shortcut in Recents (e.g. when a CRUD modal is dismissed via backdrop). */
  addRecent: (shortcut: WorkspaceShortcut | null) => void
}

const RECENTS_STORAGE_KEY = "app_workspace_recents"
const FAVORITES_STORAGE_KEY = "app_workspace_favorites"
const MAX_RECENTS = 18

export const WorkspaceNavigationContext = createContext<WorkspaceNavigationContextValue | null>(null)

function readStoredShortcuts(storageKey: string): WorkspaceShortcut[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredShortcuts(storageKey: string, shortcuts: WorkspaceShortcut[]) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(storageKey, JSON.stringify(shortcuts))
  } catch {
    // Ignore storage failures and keep the UI usable.
  }
}

export const WorkspaceNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const [recents, setRecents] = useState<WorkspaceShortcut[]>(() => readStoredShortcuts(RECENTS_STORAGE_KEY))
  const [favorites, setFavorites] = useState<WorkspaceShortcut[]>(() => readStoredShortcuts(FAVORITES_STORAGE_KEY))
  const [activePanel, setActivePanel] = useState<WorkspacePanel>(null)
  const previousLocationRef = useRef(location)

  useEffect(() => {
    writeStoredShortcuts(RECENTS_STORAGE_KEY, recents)
  }, [recents])

  useEffect(() => {
    writeStoredShortcuts(FAVORITES_STORAGE_KEY, favorites)
  }, [favorites])

  const addRecent = useCallback((shortcut: WorkspaceShortcut | null) => {
    if (!shortcut) return

    setRecents((current) => {
      const nextEntry = { ...shortcut, recentAt: Date.now() }
      const deduped = current.filter((item) => item.key !== shortcut.key)
      return [nextEntry, ...deduped].slice(0, MAX_RECENTS)
    })
  }, [])

  useEffect(() => {
    const previousLocation = previousLocationRef.current

    if (previousLocation.pathname !== location.pathname) {
      addRecent(parseWorkspaceRecent(previousLocation.pathname, previousLocation.search))
    }

    previousLocationRef.current = location
  }, [addRecent, location])

  useEffect(() => {
    const handleBeforeUnload = () => {
      const activeShortcut = parseWorkspaceRecent(window.location.pathname, window.location.search)
      if (!activeShortcut) return

      const current = readStoredShortcuts(RECENTS_STORAGE_KEY)
      const nextEntry = { ...activeShortcut, recentAt: Date.now() }
      const deduped = current.filter((item) => item.key !== activeShortcut.key)
      writeStoredShortcuts(RECENTS_STORAGE_KEY, [nextEntry, ...deduped].slice(0, MAX_RECENTS))
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  const toggleFavorite = useCallback((shortcut: WorkspaceShortcut) => {
    setFavorites((current) => {
      const exists = current.some((item) => item.key === shortcut.key)
      if (exists) {
        return current.filter((item) => item.key !== shortcut.key)
      }

      return [...current, shortcut]
    })
  }, [])

  const isFavorite = useCallback(
    (shortcut: WorkspaceShortcut) => favorites.some((item) => item.key === shortcut.key),
    [favorites],
  )

  const togglePanel = useCallback((panel: Exclude<WorkspacePanel, null>) => {
    setActivePanel((current) => (current === panel ? null : panel))
  }, [])

  const closePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  const value = useMemo<WorkspaceNavigationContextValue>(
    () => ({
      recents,
      favorites,
      pageShortcuts: pageShortcutCatalog,
      formShortcuts: formShortcutCatalog,
      activePanel,
      setActivePanel,
      togglePanel,
      closePanel,
      isFavorite,
      toggleFavorite,
      addRecent,
    }),
    [activePanel, addRecent, closePanel, favorites, isFavorite, recents, toggleFavorite, togglePanel],
  )

  return <WorkspaceNavigationContext.Provider value={value}>{children}</WorkspaceNavigationContext.Provider>
}

export function useWorkspaceNavigation() {
  const context = useContext(WorkspaceNavigationContext)

  if (!context) {
    throw new Error("useWorkspaceNavigation must be used within WorkspaceNavigationProvider")
  }

  return context
}

/** For components (e.g. shared CRUDModal) that may render outside the main workspace shell. */
export function useWorkspaceNavigationOptional(): WorkspaceNavigationContextValue | null {
  return useContext(WorkspaceNavigationContext)
}
