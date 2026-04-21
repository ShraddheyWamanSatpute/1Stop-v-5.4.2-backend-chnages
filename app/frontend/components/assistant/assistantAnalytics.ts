export type AssistantDateRange = {
  startDate: string // yyyy-MM-dd
  endDate: string // yyyy-MM-dd
  label: string
  days: number
}

export type MetricEntry = {
  /** Canonical path-like name for the metric so the assistant can reference the *real* key */
  key: string
  /** Human-friendly label (derived from key, unless overridden) */
  label: string
  /** Current value */
  value: number | string | null
  /** Optional unit hint */
  unit?: '%' | 'currency' | 'count' | 'hours' | 'days' | 'time' | 'ratio' | 'unknown'
  /** Where the value came from */
  source?: 'raw' | 'derived'
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function clampRangeDays(start: Date, end: Date): number {
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

export function defaultAssistantRange(daysBack = 30): AssistantDateRange {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - Math.max(0, daysBack - 1))
  return {
    startDate: toYMD(start),
    endDate: toYMD(end),
    label: `Last ${daysBack} days`,
    days: clampRangeDays(start, end),
  }
}

function humanizeKey(s: string): string {
  // camelCase -> Title Case
  const spaced = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function guessUnit(metricKey: string): MetricEntry['unit'] {
  const k = metricKey.toLowerCase()
  if (k.includes('rate') || k.includes('percentage') || k.includes('margin')) return '%'
  if (
    k.includes('revenue') ||
    k.includes('sales') ||
    k.includes('profit') ||
    k.includes('balance') ||
    k.includes('expenses') ||
    k.includes('spend') ||
    k.includes('takings')
  )
    return 'currency'
  if (k.includes('hours')) return 'hours'
  if (k.includes('day') || k.includes('days')) return 'days'
  if (k.includes('time')) return 'time'
  if (k.includes('ratio')) return 'ratio'
  return 'count'
}

export function parseAssistantDateRange(input: string): AssistantDateRange | null {
  const q = input.toLowerCase()
  const today = new Date()

  const mk = (start: Date, end: Date, label: string): AssistantDateRange => ({
    startDate: toYMD(start),
    endDate: toYMD(end),
    label,
    days: clampRangeDays(start, end),
  })

  if (q.includes('today')) return mk(today, today, 'Today')
  if (q.includes('yesterday')) {
    const d = new Date(today)
    d.setDate(today.getDate() - 1)
    return mk(d, d, 'Yesterday')
  }

  if (q.includes('this week')) {
    const start = new Date(today)
    const day = start.getDay() // 0=Sun
    const diffToMon = (day + 6) % 7
    start.setDate(start.getDate() - diffToMon)
    return mk(start, today, 'This week')
  }

  if (q.includes('last week')) {
    const end = new Date(today)
    const day = end.getDay()
    const diffToSun = day // Sunday as end
    end.setDate(end.getDate() - diffToSun - 1)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    return mk(start, end, 'Last week')
  }

  if (q.includes('this month')) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return mk(start, today, 'This month')
  }

  if (q.includes('last month')) {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return mk(start, end, 'Last month')
  }

  const m = q.match(/\blast\s+(\d{1,3})\s*(day|days|week|weeks|month|months)\b/)
  if (m) {
    const n = Math.max(1, Math.min(366, Number(m[1])))
    const unit = m[2]
    const end = new Date(today)
    const start = new Date(end)
    const daysBack =
      unit.startsWith('week') ? n * 7 : unit.startsWith('month') ? n * 30 : n
    start.setDate(end.getDate() - Math.max(0, daysBack - 1))
    return mk(start, end, `Last ${n} ${unit}`)
  }

  return null
}

export function buildMetricDictionary(snapshot: any, derived?: Record<string, any>): MetricEntry[] {
  const entries: MetricEntry[] = []

  const pushKpis = (moduleKey: string, kpis: any, source: MetricEntry['source']) => {
    if (!kpis || typeof kpis !== 'object') return
    Object.entries(kpis).forEach(([k, v]) => {
      const key = `${moduleKey}.kpis.${k}`
      const value = typeof v === 'number' || typeof v === 'string' ? (v as any) : null
      entries.push({
        key,
        label: humanizeKey(k),
        value,
        unit: guessUnit(key),
        source,
      })
    })
  }

  if (snapshot?.bookings?.kpis) pushKpis('bookings', snapshot.bookings.kpis, 'raw')
  if (snapshot?.pos?.kpis) pushKpis('pos', snapshot.pos.kpis, 'raw')
  if (snapshot?.finance?.kpis) pushKpis('finance', snapshot.finance.kpis, 'raw')
  if (snapshot?.hr?.kpis) pushKpis('hr', snapshot.hr.kpis, 'raw')
  if (snapshot?.stock?.kpis) pushKpis('stock', snapshot.stock.kpis, 'raw')
  if (snapshot?.company?.kpis) pushKpis('company', snapshot.company.kpis, 'raw')

  if (derived) {
    Object.entries(derived).forEach(([k, v]) => {
      const key = `derived.${k}`
      entries.push({
        key,
        label: humanizeKey(k),
        value: typeof v === 'number' || typeof v === 'string' ? (v as any) : null,
        unit: guessUnit(key),
        source: 'derived',
      })
    })
  }

  return entries
}

export function calculateDerivedMetrics(snapshot: any, range?: AssistantDateRange): Record<string, number> {
  const d: Record<string, number> = {}
  const safe = (n: any) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

  const bookings = snapshot?.bookings?.kpis
  if (bookings) {
    const totalBookings = safe(bookings.totalBookings)
    const avgParty = safe(bookings.averagePartySize)
    const totalRevenue = safe(bookings.totalRevenue)
    const covers = totalBookings > 0 && avgParty > 0 ? totalBookings * avgParty : 0
    if (covers > 0) d.bookingsTotalCovers = covers
    if (covers > 0 && totalRevenue > 0) d.revenuePerCover = totalRevenue / covers
    if (totalRevenue > 0 && totalBookings > 0) d.revenuePerBooking = totalRevenue / totalBookings
    const noShows = safe(bookings.noShowBookings)
    const cancelled = safe(bookings.cancelledBookings)
    if (totalBookings > 0 && noShows >= 0) d.noShowRate = (noShows / totalBookings) * 100
    if (totalBookings > 0 && cancelled >= 0) d.cancellationRate = (cancelled / totalBookings) * 100
    if (range?.days && covers > 0) d.coversPerDay = covers / range.days
  }

  const pos = snapshot?.pos?.kpis
  if (pos) {
    const totalSales = safe(pos.totalSales)
    const tx = safe(pos.totalTransactions)
    if (totalSales > 0 && tx > 0) d.averageSpendPerTransaction = totalSales / tx
    if (range?.days && totalSales > 0) d.salesPerDay = totalSales / range.days
    const covers = safe(d.bookingsTotalCovers)
    if (totalSales > 0 && covers > 0) d.salesPerCover = totalSales / covers
  }

  const finance = snapshot?.finance?.kpis
  if (finance) {
    const revenue = safe(finance.revenue)
    const profit = safe(finance.profit)
    if (revenue > 0) d.profitMargin = (profit / revenue) * 100
  }

  return d
}

function formatGBP(n: number): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
  } catch {
    // Fallback (older envs)
    const rounded = Math.round(n * 100) / 100
    return `£${rounded}`
  }
}

type TakingsMode = 'gross' | 'net'

function takingsModeFromPreferences(preferencesText: string): TakingsMode {
  const t = preferencesText.toLowerCase()
  const hasTakings = /\btakings\b/.test(t)
  if (!hasTakings) return 'gross'

  // Explicit include wins over exclude if both exist.
  if (
    t.includes('include tips') ||
    t.includes('including tips') ||
    t.includes('include service') ||
    t.includes('including service') ||
    t.includes('include service charge') ||
    t.includes('including service charge')
  )
    return 'gross'

  if (
    t.includes('exclude tips') ||
    t.includes('excluding tips') ||
    t.includes('exclude service') ||
    t.includes('excluding service') ||
    t.includes('exclude service charge') ||
    t.includes('excluding service charge')
  )
    return 'net'

  return 'gross'
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter(Boolean))
}

function overlapScore(a: string, b: string): number {
  const A = tokenSet(a)
  const B = tokenSet(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / Math.max(A.size, B.size)
}

export function tryResolveMetricQuery(
  userMessage: string,
  dictionary: MetricEntry[],
  rangeLabel?: string,
  learnedPreferences?: Array<{ text: string }>,
): string | null {
  const q = normalize(userMessage)
  const looksLikeMetricQuery =
    /\b(kpi|metric|metrics|how many|what is|whats|show|give|total|rate|revenue|sales|profit|occup)\b/.test(q)
  if (!looksLikeMetricQuery) return null

  const prefsText = (learnedPreferences || [])
    .map(p => (p?.text || '').toLowerCase())
    .join('\n')

  const takingsMode = takingsModeFromPreferences(prefsText)

  // Hospitality-friendly synonym/alias mapping to canonical metric keys.
  // This is intentionally opinionated:
  // - "sales" => POS sales
  // - "revenue" => Finance revenue
  const aliases: Array<{ key: string; anyOf: Array<string | RegExp> }> = [
    // POS Sales
    { key: 'pos.kpis.totalSales', anyOf: ['sales', 'pos sales', 'till sales', 'till', 'takings', 'gross sales', 'net sales'] },
    { key: 'pos.kpis.totalTransactions', anyOf: ['transactions', 'tx', 'checks', 'bills'] },
    { key: 'pos.kpis.averageTransactionValue', anyOf: ['average transaction', 'avg transaction', 'avg check', 'average check'] },
    { key: 'derived.averageSpendPerTransaction', anyOf: ['avg spend', 'average spend'] },
    { key: 'pos.kpis.grossTakings', anyOf: ['gross takings', 'takings gross'] },
    { key: 'pos.kpis.netTakings', anyOf: ['net takings', 'takings net', 'takings excl tips', 'takings excluding tips'] },
    { key: 'pos.kpis.tipsTotal', anyOf: ['tips', 'tip', 'gratuity'] },
    { key: 'pos.kpis.serviceChargeTotal', anyOf: ['service charge', 'svc charge'] },

    // Finance Revenue/Profit/Expenses
    { key: 'finance.kpis.revenue', anyOf: ['revenue', 'turnover', 'income'] },
    { key: 'finance.kpis.expenses', anyOf: ['expenses', 'costs', 'spend'] },
    { key: 'finance.kpis.profit', anyOf: ['profit', 'net profit'] },
    { key: 'derived.profitMargin', anyOf: ['profit margin', 'margin'] },

    // Bookings / Hospitality
    { key: 'bookings.kpis.totalBookings', anyOf: ['bookings', 'reservations', 'resos'] },
    { key: 'bookings.kpis.noShowBookings', anyOf: ['no shows', 'noshow', 'no-show', 'no show'] },
    { key: 'bookings.kpis.cancelledBookings', anyOf: ['cancellations', 'cancelled', 'canceled'] },
    { key: 'bookings.kpis.occupancyRate', anyOf: ['occupancy', 'utilisation', 'utilization', 'seat utilisation', 'seat utilization'] },
    { key: 'derived.bookingsTotalCovers', anyOf: ['covers', 'pax', 'guests served', 'guests'] },
    { key: 'derived.revenuePerCover', anyOf: ['rev per cover', 'revenue per cover', 'rpc'] },
  ]

  const findByKey = (key: string) => dictionary.find(d => d.key.toLowerCase() === key.toLowerCase())

  const aliasMatch = (needle: string | RegExp) =>
    typeof needle === 'string' ? q.includes(normalize(needle)) : needle.test(q)

  // Special-case: "takings" should be brief but useful:
  // - default: gross takings with included tips/service if present
  // - if preference says exclude tips/service: show net takings and the excluded amount
  if (q.includes('takings') || q.includes('till')) {
    const gross = findByKey('pos.kpis.grossTakings') || findByKey('pos.kpis.totalSales')
    const net = findByKey('pos.kpis.netTakings')
    const tips = findByKey('pos.kpis.tipsTotal')
    const svc = findByKey('pos.kpis.serviceChargeTotal')

    const grossN = typeof gross?.value === 'number' ? gross.value : null
    const netN = typeof net?.value === 'number' ? net.value : null
    const tipsN = typeof tips?.value === 'number' ? tips.value : 0
    const svcN = typeof svc?.value === 'number' ? svc.value : 0
    const extra = Math.max(0, tipsN + svcN)

    if (takingsMode === 'net' && netN !== null) {
      const extraText = extra > 0 ? ` (excl ${formatGBP(extra)} tips/service)` : ''
      return `Takings: ${formatGBP(netN)}${rangeLabel ? ` (${rangeLabel})` : ''}${extraText}`
    }

    if (grossN !== null) {
      const extraText = extra > 0 ? ` (incl ${formatGBP(extra)} tips/service)` : ''
      return `Takings: ${formatGBP(grossN)}${rangeLabel ? ` (${rangeLabel})` : ''}${extraText}`
    }
  }

  for (const a of aliases) {
    if (a.anyOf.some(aliasMatch)) {
      const entry = findByKey(a.key)
      if (entry && entry.value !== null) {
        const valueText =
          typeof entry.value === 'number'
            ? entry.unit === 'currency'
              ? formatGBP(entry.value)
              : String(Math.round(entry.value * 100) / 100) + (entry.unit === '%' ? '%' : '')
            : String(entry.value)

        const sourceNote = entry.source === 'derived' ? ' (calculated)' : ''
        const rangeNote = rangeLabel ? ` (${rangeLabel})` : ''

        return `${entry.label}: ${valueText}${rangeNote}${sourceNote}`
      }
    }
  }

  let best: { entry: MetricEntry; score: number } | null = null
  for (const entry of dictionary) {
    const s1 = overlapScore(q, entry.key)
    const s2 = overlapScore(q, entry.label)
    const score = Math.max(s1, s2)
    if (!best || score > best.score) best = { entry, score }
  }

  if (!best || best.score < 0.45) return null

  const { entry } = best
  if (entry.value === null) return null

  const valueText =
    typeof entry.value === 'number'
      ? entry.unit === 'currency'
        ? formatGBP(entry.value)
        : String(Math.round(entry.value * 100) / 100) + (entry.unit === '%' ? '%' : '')
      : String(entry.value)

  const sourceNote = entry.source === 'derived' ? ' (calculated)' : ''
  const rangeNote = rangeLabel ? ` (${rangeLabel})` : ''

  return `${entry.label}: ${valueText}${rangeNote}${sourceNote}`
}

