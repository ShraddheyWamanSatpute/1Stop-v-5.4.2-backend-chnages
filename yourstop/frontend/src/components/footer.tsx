import React from "react"

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500">
        © {new Date().getFullYear()} YourStop
      </div>
    </footer>
  )
}

