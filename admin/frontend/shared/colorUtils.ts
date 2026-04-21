export function normalizeHexColor(input: string): string {
  const v = String(input || "").trim()
  if (!v) return ""
  const s = v.startsWith("#") ? v.slice(1) : v
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return ""
  return `#${s.toLowerCase()}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeHexColor(hex)
  if (!h) return null
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// WCAG-ish: return readable foreground for a background color.
export function contrastText(bg: string): string {
  const rgb = hexToRgb(bg)
  if (!rgb) return "#fff"
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
  // pick black for light backgrounds
  return L > 0.55 ? "#111" : "#fff"
}

export function chipSxFromBg(bg: string | undefined | null) {
  const c = normalizeHexColor(String(bg || ""))
  if (!c) return {}
  const fg = contrastText(c)
  return {
    bgcolor: c,
    color: fg,
    "& .MuiChip-icon": { color: fg },
  } as const
}

