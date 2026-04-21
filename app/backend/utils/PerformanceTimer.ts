/**
 * Performance Timer Utility
 * 
 * Measures and logs loading times for context data loading
 * Helps identify performance bottlenecks
 */

interface TimingResult {
  context: string
  operation: string
  duration: number
  timestamp: number
  dataCounts?: Record<string, number>
}

class PerformanceTimer {
  private timings: TimingResult[] = []
  private activeTimers: Map<string, number> = new Map()

  /**
   * Start timing an operation
   */
  start(context: string, operation: string): string {
    const timerId = `${context}:${operation}:${Date.now()}`
    this.activeTimers.set(timerId, performance.now())
    return timerId
  }

  /**
   * End timing and record the result
   */
  end(timerId: string, dataCounts?: Record<string, number>): number {
    const startTime = this.activeTimers.get(timerId)
    if (!startTime) {
      console.warn(`Timer ${timerId} not found`)
      return 0
    }

    const duration = performance.now() - startTime
    const [context, operation] = timerId.split(':').slice(0, 2)

    const result: TimingResult = {
      context,
      operation,
      duration,
      timestamp: Date.now(),
      dataCounts,
    }

    this.timings.push(result)
    this.activeTimers.delete(timerId)

    // Optional console logging (off by default for clean console).
    // Enable in console with: window.__PERF_TIMER_LOGS__ = true
    const shouldLog =
      typeof window !== 'undefined' && (window as any).__PERF_TIMER_LOGS__ === true

    if (shouldLog) {
      const durationStr = duration.toFixed(2)
      const emoji = duration < 500 ? '⚡' : duration < 1000 ? '✅' : duration < 2000 ? '⚠️' : '🐌'
      const color = duration < 500 ? 'green' : duration < 1000 ? 'orange' : 'red'

      console.log(
        `%c${emoji} [${context}] ${operation}: ${durationStr}ms`,
        `color: ${color}; font-weight: bold;`,
        dataCounts ? `| Data: ${JSON.stringify(dataCounts)}` : ''
      )
    }

    return duration
  }

  /**
   * Get all timings for a specific context
   */
  getTimings(context?: string): TimingResult[] {
    if (context) {
      return this.timings.filter(t => t.context === context)
    }
    return [...this.timings]
  }

  /**
   * Get average timing for an operation
   */
  getAverage(context: string, operation: string): number {
    const relevant = this.timings.filter(
      t => t.context === context && t.operation === operation
    )
    if (relevant.length === 0) return 0
    return relevant.reduce((sum, t) => sum + t.duration, 0) / relevant.length
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalOperations: number
    averageDuration: number
    slowestOperations: TimingResult[]
    fastestOperations: TimingResult[]
    byContext: Record<string, { count: number; average: number }>
  } {
    const total = this.timings.length
    const average = total > 0
      ? this.timings.reduce((sum, t) => sum + t.duration, 0) / total
      : 0

    const sorted = [...this.timings].sort((a, b) => b.duration - a.duration)
    const slowest = sorted.slice(0, 5)
    const fastest = sorted.slice(-5).reverse()

    const byContext: Record<string, { count: number; average: number }> = {}
    this.timings.forEach(t => {
      if (!byContext[t.context]) {
        byContext[t.context] = { count: 0, average: 0 }
      }
      byContext[t.context].count++
    })

    Object.keys(byContext).forEach(context => {
      const contextTimings = this.timings.filter(t => t.context === context)
      byContext[context].average = contextTimings.reduce((sum, t) => sum + t.duration, 0) / contextTimings.length
    })

    return {
      totalOperations: total,
      averageDuration: average,
      slowestOperations: slowest,
      fastestOperations: fastest,
      byContext,
    }
  }

  /**
   * Clear all timings
   */
  clear(): void {
    this.timings = []
    this.activeTimers.clear()
  }

  /**
   * Export timings as JSON
   */
  export(): string {
    return JSON.stringify({
      timings: this.timings,
      summary: this.getSummary(),
    }, null, 2)
  }

  /**
   * Log summary to console
   */
  logSummary(): void {
    const summary = this.getSummary()
    console.group('📊 Performance Summary')
    console.log(`Total Operations: ${summary.totalOperations}`)
    console.log(`Average Duration: ${summary.averageDuration.toFixed(2)}ms`)
    console.log('\nBy Context:')
    Object.entries(summary.byContext).forEach(([context, stats]) => {
      console.log(`  ${context}: ${stats.count} ops, avg ${stats.average.toFixed(2)}ms`)
    })
    console.log('\nSlowest Operations:')
    summary.slowestOperations.forEach(op => {
      console.log(`  ${op.context}.${op.operation}: ${op.duration.toFixed(2)}ms`)
    })
    console.groupEnd()
  }
}

// Export singleton instance
export const performanceTimer = new PerformanceTimer()

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).performanceTimer = performanceTimer
}

// Export helper function for easy use
export const measurePerformance = async <T,>(
  context: string,
  operation: string,
  fn: () => Promise<T>,
  dataCounts?: () => Record<string, number>
): Promise<T> => {
  const timerId = performanceTimer.start(context, operation)
  try {
    const result = await fn()
    const counts = dataCounts ? dataCounts() : undefined
    performanceTimer.end(timerId, counts)
    return result
  } catch (error) {
    performanceTimer.end(timerId)
    throw error
  }
}

