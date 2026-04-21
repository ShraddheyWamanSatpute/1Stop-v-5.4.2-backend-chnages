"use client"

import { useEffect, useState } from "react"

function readBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback

  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === "true"
  } catch {
    return fallback
  }
}

export default function usePersistentBoolean(key: string, fallback: boolean) {
  const [value, setValue] = useState<boolean>(() => readBoolean(key, fallback))

  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value))
    } catch {
      // Ignore storage errors and keep UI functional.
    }
  }, [key, value])

  return [value, setValue] as const
}
