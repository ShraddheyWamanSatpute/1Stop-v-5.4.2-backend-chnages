import React from "react"

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>
}

export function CardHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`border-b border-gray-100 p-4 ${className}`}>{children}</div>
}

export function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-base font-semibold ${className}`}>{children}</h3>
}

export function CardDescription({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <p className={`mt-1 text-sm text-gray-600 ${className}`}>{children}</p>
}

export function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

