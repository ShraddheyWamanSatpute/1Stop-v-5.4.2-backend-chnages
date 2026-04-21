import React from "react"

export function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ${className}`}
    >
      {children}
    </span>
  )
}

