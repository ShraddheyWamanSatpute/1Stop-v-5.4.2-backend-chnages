import React from "react"

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost"
}

export function Button({ className = "", variant = "default", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
  const styles =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
      : variant === "ghost"
        ? "bg-transparent text-gray-900 hover:bg-gray-100"
        : "bg-blue-600 text-white hover:bg-blue-700"

  return <button className={`${base} ${styles} ${className}`} {...props} />
}

